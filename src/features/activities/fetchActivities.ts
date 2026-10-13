// Abruf der freigegebenen Aktivitäten bei Supabase (M8). Ein einfacher GET auf die REST-Schnittstelle (PostgREST), ohne supabase-js.
// Gefragt wird nur nach `status = approved`; Row Level Security in der Datenbank erlaubt dem öffentlichen Schlüssel ohnehin nichts anderes
// (supabase/migrations/0001_activities.sql). Es gehen nur der öffentliche Schlüssel und die IP-Adresse mit: keine Kinderdaten,
// kein Standort, keine Geräte-ID (docs/supabase.md, „Datenschutz, vor M12“). Ohne UI.

import { activityColumns } from './activityRow';
import type { SupabaseConfig } from './supabaseConfig';

// Eine Seite hat höchstens so viele Zeilen. Supabase liefert standardmäßig höchstens 1000 pro Abruf, ein Bestand darüber braucht mehrere Seiten.
export const pageSize = 500;
// Mehr als diese Seiten holen wir nie (Schutz vor einer Schleife durch einen fehlerhaften Server): 20 × 500 = 10 000 Aktivitäten.
export const maxPages = 20;
// So lange darf der ganze Abruf dauern (alle Seiten zusammen). Ist ein Projekt pausiert oder nicht erreichbar, geben wir nach 10 Sekunden auf.
export const requestTimeoutMs = 10_000;

export class ActivitiesFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivitiesFetchError';
  }
}

// Adresse einer Seite: nur freigegebene Aktivitäten, nach ID sortiert (damit die Seiten zusammenpassen).
export function buildActivitiesUrl(config: SupabaseConfig, offset: number, limit: number = pageSize): string {
  const query = [
    `select=${activityColumns.join(',')}`,
    'status=eq.approved',
    'order=id.asc',
    `limit=${limit}`,
    `offset=${offset}`,
  ].join('&');
  return `${config.url}/rest/v1/activities?${query}`;
}

// Ein Schlüssel im JWT-Format wird zusätzlich als Bearer-Token gesendet. Die neuen Schlüssel (sb_publishable_…) sind keine JWTs
// und gehören nur in den Kopf `apikey`.
export function buildHeaders(config: SupabaseConfig): Record<string, string> {
  const headers: Record<string, string> = { apikey: config.anonKey, Accept: 'application/json' };
  if (config.anonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${config.anonKey}`;
  return headers;
}

export type FetchLike = (url: string, init: { method: 'GET'; headers: Record<string, string>; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type FetchOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

// Holt alle freigegebenen Zeilen (roh, ungeprüft). Wirft einen ActivitiesFetchError bei Netzfehler, HTTP-Fehler, Zeitüberschreitung
// oder einer Antwort, die keine Liste ist. Die Zeilen prüft danach `prepareActivities`.
export async function fetchApprovedRows(config: SupabaseConfig, options: FetchOptions = {}): Promise<unknown[]> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ActivitiesFetchError(`Zeitüberschreitung nach ${Math.round((options.timeoutMs ?? requestTimeoutMs) / 1000)} Sekunden`));
    }, options.timeoutMs ?? requestTimeoutMs);
  });

  async function load(): Promise<unknown[]> {
    const rows: unknown[] = [];
    for (let page = 0; page < maxPages; page += 1) {
      let response;
      try {
        response = await fetchImpl(buildActivitiesUrl(config, page * pageSize), {
          method: 'GET',
          headers: buildHeaders(config),
          signal: controller.signal,
        });
      } catch (error) {
        throw new ActivitiesFetchError(error instanceof Error && error.message ? error.message : 'Netzwerkfehler');
      }
      if (!response.ok) throw new ActivitiesFetchError(`HTTP ${response.status}`);
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ActivitiesFetchError('Antwort ist kein gültiges JSON');
      }
      if (!Array.isArray(body)) throw new ActivitiesFetchError('Antwort ist keine Liste');
      rows.push(...body);
      if (body.length < pageSize) return rows;
    }
    return rows;
  }

  try {
    return await Promise.race([load(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
