// KI-Wochenlauf (M9): Lesen und Schreiben bei Supabase über die REST-Schnittstelle (PostgREST), ohne supabase-js.
// Benutzt den GEHEIMEN Schlüssel aus SUPABASE_SECRET_KEY (nur in GitHub Secrets, nie in der App).
//
// Kopfzeilen laut Supabase-Doku zu den API-Schlüsseln: Ein neuer Schlüssel (sb_secret_…) gehört nur in `apikey`.
// Als `Authorization: Bearer` wird er abgelehnt, weil er kein JWT ist. Ein alter service_role-Schlüssel (JWT, „eyJ…“)
// geht zusätzlich als Bearer mit, wie beim öffentlichen Schlüssel in der App (fetchActivities.ts).

import type { SupabaseAdminConfig } from './config.ts';
import { readJson, shorten, withTimeout, type FetchLike, type HttpResponse } from './http.ts';
import { limits } from './limits.ts';
import type { ExistingTitle, Idea } from './prompt.ts';

export class SupabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export function buildAdminHeaders(config: SupabaseAdminConfig, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { apikey: config.key, Accept: 'application/json', ...extra };
  if (config.key.startsWith('eyJ')) headers.Authorization = `Bearer ${config.key}`;
  return headers;
}

type Request = { what: string; path: string; method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> };

async function send(config: SupabaseAdminConfig, fetchImpl: FetchLike, request: Request): Promise<{ response: HttpResponse; body: unknown }> {
  let result;
  try {
    result = await withTimeout(limits.supabaseTimeoutMs, `Supabase (${request.what})`, async (signal) => {
      const response = await fetchImpl(`${config.url}/rest/v1/${request.path}`, {
        method: request.method ?? 'GET',
        headers: buildAdminHeaders(config, {
          ...(request.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...request.headers,
        }),
        ...(request.body !== undefined ? { body: JSON.stringify(request.body) } : {}),
        signal,
      });
      return { response, body: await readJson(response) };
    });
  } catch (error) {
    throw new SupabaseError(`Supabase (${request.what}): ${error instanceof Error ? shorten(error.message, 200) : 'Netzwerkfehler'}`);
  }
  if (!result.response.ok) {
    const info = (result.body ?? {}) as { message?: unknown; code?: unknown; hint?: unknown };
    const message = [info.code, info.message, info.hint].filter((part) => typeof part === 'string' && part).join(' ');
    throw new SupabaseError(`Supabase (${request.what}): HTTP ${result.response.status}${message ? ` ${shorten(message)}` : ''}`);
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Alle vorhandenen Aktivitäten, aber nur Kennung, Kategorie, Status und die beiden Titel (für Dubletten und die Titelliste im Prompt).
// Auch Entwürfe und abgelehnte, damit nichts doppelt oder Abgelehntes wieder entsteht.
export async function fetchExistingTitles(config: SupabaseAdminConfig, fetchImpl: FetchLike): Promise<ExistingTitle[]> {
  const rows: ExistingTitle[] = [];
  for (let page = 0; page < limits.maxTitlePages; page += 1) {
    const query = [
      'select=id,category,status,de:translations->de->>title,en:translations->en->>title',
      'order=id.asc',
      `limit=${limits.titlePageSize}`,
      `offset=${page * limits.titlePageSize}`,
    ].join('&');
    const { body } = await send(config, fetchImpl, { what: 'vorhandene Titel lesen', path: `activities?${query}` });
    if (!Array.isArray(body)) throw new SupabaseError('Supabase (vorhandene Titel lesen): Antwort ist keine Liste');
    for (const row of body) {
      if (!isRecord(row) || typeof row.id !== 'string') continue;
      rows.push({
        id: row.id,
        category: typeof row.category === 'string' ? row.category : '',
        status: typeof row.status === 'string' ? row.status : '',
        de: typeof row.de === 'string' ? row.de : '',
        en: typeof row.en === 'string' ? row.en : '',
      });
    }
    if (body.length < limits.titlePageSize) return rows;
  }
  return rows;
}

// Anzahl der Aktivitäten mit Status approved oder draft (für die Obergrenze MAX_ACTIVITIES). Abgelehnte zählen nicht.
// PostgREST liefert die Zahl in der Kopfzeile Content-Range („0-0/1234“ oder „*/0“).
export async function countActiveActivities(config: SupabaseAdminConfig, fetchImpl: FetchLike): Promise<number> {
  const { response } = await send(config, fetchImpl, {
    what: 'Aktivitäten zählen',
    path: 'activities?select=id&status=in.(approved,draft)&limit=1',
    headers: { Prefer: 'count=exact' },
  });
  const match = /\/(\d+)\s*$/.exec(response.headers.get('content-range') ?? '');
  if (!match) throw new SupabaseError('Supabase (Aktivitäten zählen): keine Anzahl in der Antwort (Content-Range fehlt)');
  return Number(match[1]);
}

// Offene Stichwort-Ideen, die ältesten zuerst.
export async function fetchOpenIdeas(config: SupabaseAdminConfig, fetchImpl: FetchLike, max: number = limits.maxIdeasPerCall): Promise<Idea[]> {
  const { body } = await send(config, fetchImpl, {
    what: 'Stichwort-Ideen lesen',
    path: `activity_ideas?select=id,keyword,note&status=eq.open&order=created_at.asc,id.asc&limit=${max}`,
  });
  if (!Array.isArray(body)) throw new SupabaseError('Supabase (Stichwort-Ideen lesen): Antwort ist keine Liste');
  return body
    .filter((row): row is Record<string, unknown> => isRecord(row) && Number.isInteger(row.id) && typeof row.keyword === 'string')
    .map((row) => ({ id: row.id as number, keyword: row.keyword as string, note: typeof row.note === 'string' ? row.note : null }));
}

// Schreibt den ganzen Lauf mit einem einzigen Aufruf der Datenbank-Funktion (supabase/migrations/0002_activity_runs.sql):
// Aktivitäten einfügen und benutzte Ideen markieren in einer Transaktion. Scheitert etwas, ist nichts geschrieben.
export async function insertGeneratedActivities(
  config: SupabaseAdminConfig,
  fetchImpl: FetchLike,
  input: { rows: unknown[]; ideaIds: number[]; batchId: string; maxTotal: number },
): Promise<number> {
  const { body } = await send(config, fetchImpl, {
    what: 'Aktivitäten schreiben',
    path: 'rpc/insert_generated_activities',
    method: 'POST',
    body: { p_rows: input.rows, p_idea_ids: input.ideaIds, p_batch_id: input.batchId, p_max_total: input.maxTotal },
  });
  if (typeof body !== 'number') throw new SupabaseError('Supabase (Aktivitäten schreiben): unerwartete Antwort');
  return body;
}
