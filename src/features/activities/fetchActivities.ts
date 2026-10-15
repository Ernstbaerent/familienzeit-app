// Abruf der freigegebenen Aktivitäten bei Supabase (M8, seit M8b nur die Änderungen). Ein einfacher GET auf die REST-Schnittstelle (PostgREST), ohne supabase-js.
// Gefragt wird nur nach `status = approved`; Row Level Security in der Datenbank erlaubt dem öffentlichen Schlüssel ohnehin nichts anderes
// (supabase/migrations/0001_activities.sql). Es gehen nur der öffentliche Schlüssel und die IP-Adresse mit: keine Kinderdaten,
// kein Standort, keine Geräte-ID (docs/supabase.md, „Datenschutz, vor M12“). Ohne UI.
//
// Vier Anfragen (M8b, docs/supabase.md „Was die App genau macht“):
//  - `count`:   Zählprobe, nur die Anzahl der freigegebenen Aktivitäten (Kopfzeile `content-range`, leerer Inhalt).
//  - `changes`: alle Zeilen mit `updated_at` nach dem letzten Stand, ohne Stand alle. Seiten über (updated_at, id), nicht über `offset`.
//  - `ids`:     nur die IDs aller freigegebenen Aktivitäten (bei Abweichung der Zählprobe, sonst alle 30 Tage).
//  - `byIds`:   einzelne Aktivitäten nachladen, die auf dem Gerät fehlen.

import { activityColumns } from './activityRow';
import { formatTimestamp, parseTimestamp } from './activitySync';
import type { SupabaseConfig } from './supabaseConfig';

// Eine Seite hat höchstens so viele Zeilen. Supabase liefert standardmäßig höchstens 1000 pro Abruf, ein Bestand darüber braucht mehrere Seiten.
export const pageSize = 500;
// Die ID-Liste ist klein (etwa 26 Byte je Aktivität), deshalb größere Seiten.
export const idPageSize = 1000;
// Mehr als diese Seiten holen wir nie (Schutz vor einer Schleife durch einen fehlerhaften Server): 20 × 500 = 10 000 Aktivitäten.
export const maxPages = 20;
// So viele IDs stehen höchstens in einer Anfrage `id=in.(…)` (die Adresse bleibt damit unter etwa 4 KB).
export const idsPerRequest = 40;
// So lange darf ein ganzer Abgleich dauern (alle Anfragen zusammen). Ist ein Projekt pausiert oder nicht erreichbar, geben wir nach 10 Sekunden auf.
export const requestTimeoutMs = 10_000;

// Spalten, die die App liest: alle Spalten der Aktivität plus `updated_at` (setzt die Datenbank selbst, nur für den Stand).
export const selectColumns = [...activityColumns, 'updated_at'] as const;

export class ActivitiesFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivitiesFetchError';
  }
}

// Wo die letzte Seite aufgehört hat: Die nächste Seite beginnt nach diesem Paar (Zeitstempel, ID).
export type PageStart = { updatedAt: number; id: string };

// Ein Wert in einer PostgREST-Liste (`or=(…)`, `in.(…)`) steht in doppelten Anführungszeichen; `"` und `\` werden mit `\` geschützt.
function quote(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`;
}

function buildUrl(config: SupabaseConfig, params: [string, string][]): string {
  return `${config.url}/rest/v1/activities?${params.map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('&')}`;
}

// Adresse einer Seite der Änderungen: nur freigegebene Aktivitäten, geändert nach `cursor` (ohne Stand: alle), sortiert nach (updated_at, id).
// Die Seiten hängen über das letzte Paar zusammen (`after`), nicht über `offset`: So geht keine Zeile verloren, auch nicht bei vielen Zeilen
// mit gleichem Zeitstempel (ein Stapel wird in einem Schreibvorgang geschrieben) oder wenn sich während des Abrufs eine Zeile ändert.
export function buildChangesUrl(config: SupabaseConfig, cursor: string | null, after: PageStart | null = null, limit: number = pageSize): string {
  const params: [string, string][] = [
    ['select', selectColumns.join(',')],
    ['status', 'eq.approved'],
  ];
  if (cursor !== null) params.push(['updated_at', `gt.${cursor}`]);
  if (after !== null) {
    const at = formatTimestamp(after.updatedAt);
    params.push(['or', `(updated_at.gt.${at},and(updated_at.eq.${at},id.gt.${quote(after.id)}))`]);
  }
  params.push(['order', 'updated_at.asc,id.asc'], ['limit', String(limit)]);
  return buildUrl(config, params);
}

// Zählprobe: keine Zeile (`limit=0`), die Anzahl steht in der Kopfzeile `content-range` (dafür `Prefer: count=exact`).
export function buildCountUrl(config: SupabaseConfig): string {
  return buildUrl(config, [
    ['select', 'id'],
    ['status', 'eq.approved'],
    ['limit', '0'],
  ]);
}

// Seite der ID-Liste, sortiert nach ID, ab der ID nach `afterId`.
export function buildIdsUrl(config: SupabaseConfig, afterId: string | null, limit: number = idPageSize): string {
  const params: [string, string][] = [
    ['select', 'id'],
    ['status', 'eq.approved'],
  ];
  if (afterId !== null) params.push(['id', `gt.${quote(afterId)}`]);
  params.push(['order', 'id.asc'], ['limit', String(limit)]);
  return buildUrl(config, params);
}

// Einzelne Aktivitäten nach ID (höchstens `idsPerRequest`).
export function buildByIdsUrl(config: SupabaseConfig, ids: readonly string[]): string {
  return buildUrl(config, [
    ['select', selectColumns.join(',')],
    ['status', 'eq.approved'],
    ['id', `in.(${ids.map(quote).join(',')})`],
    ['order', 'id.asc'],
  ]);
}

// Ein Schlüssel im JWT-Format wird zusätzlich als Bearer-Token gesendet. Die neuen Schlüssel (sb_publishable_…) sind keine JWTs
// und gehören nur in den Kopf `apikey`.
// Bewusst **kein** `Accept-Encoding`: React Native fordert gepackte Antworten selbst an (Android über OkHttp `gzip`, iOS über NSURLSession)
// und entpackt sie selbst. Setzt die App den Kopf von Hand, entpackt Android nicht mehr (docs/supabase.md, „Datenverkehr“).
export function buildHeaders(config: SupabaseConfig, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { apikey: config.anonKey, Accept: 'application/json', ...extra };
  if (config.anonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${config.anonKey}`;
  return headers;
}

export type HeadersLike = { get: (name: string) => string | null };

export type FetchLike = (url: string, init: { method: 'GET'; headers: Record<string, string>; signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  headers?: HeadersLike;
}>;

export type FetchOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

// Uhrzeit des Servers aus der Kopfzeile `Date` (sekundengenau), in Mikrosekunden. `null`, wenn sie fehlt oder unlesbar ist.
export function readServerTime(headers: HeadersLike | undefined): number | null {
  const ms = Date.parse(headers?.get('date') ?? '');
  return Number.isFinite(ms) ? ms * 1000 : null;
}

// Anzahl aus `content-range` (z. B. `*/1500` oder `0-0/1500`). `null`, wenn sie fehlt oder unlesbar ist.
export function readTotalCount(headers: HeadersLike | undefined): number | null {
  const match = /\/(\d+)\s*$/.exec(headers?.get('content-range') ?? '');
  return match ? Number(match[1]) : null;
}

export type ChangesResult = {
  rows: unknown[];
  maxUpdatedAt: number | null; // größter gesehener Zeitstempel (Mikrosekunden), `null` ohne Zeilen
  serverTime: number | null;
};

export type ActivitiesApi = {
  count: () => Promise<{ count: number | null; serverTime: number | null }>;
  changes: (cursor: string | null) => Promise<ChangesResult>;
  ids: () => Promise<string[]>;
  byIds: (ids: readonly string[]) => Promise<unknown[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Führt einen ganzen Abgleich aus. Alle Anfragen darin teilen sich ein Zeitlimit (Standard 10 Sekunden); danach wird abgebrochen.
// Wirft einen ActivitiesFetchError bei Netzfehler, HTTP-Fehler, Zeitüberschreitung oder einer Antwort, die keine Liste ist.
// Die Zeilen sind roh und ungeprüft, sie prüft danach `prepareActivities`.
export async function withActivitiesApi<T>(config: SupabaseConfig, options: FetchOptions, work: (api: ActivitiesApi) => Promise<T>): Promise<T> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const timeoutMs = options.timeoutMs ?? requestTimeoutMs;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ActivitiesFetchError(`Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} Sekunden`));
    }, timeoutMs);
  });

  async function get(url: string, extraHeaders?: Record<string, string>): Promise<{ body: unknown[]; headers?: HeadersLike }> {
    if (controller.signal.aborted) throw new ActivitiesFetchError('abgebrochen');
    let response;
    try {
      response = await fetchImpl(url, { method: 'GET', headers: buildHeaders(config, extraHeaders), signal: controller.signal });
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
    return { body, headers: response.headers };
  }

  const api: ActivitiesApi = {
    async count() {
      const { headers } = await get(buildCountUrl(config), { Prefer: 'count=exact' });
      return { count: readTotalCount(headers), serverTime: readServerTime(headers) };
    },

    async changes(cursor) {
      const rows: unknown[] = [];
      let after: PageStart | null = null;
      let serverTime: number | null = null;
      for (let page = 0; page < maxPages; page += 1) {
        const { body, headers } = await get(buildChangesUrl(config, cursor, after));
        if (page === 0) serverTime = readServerTime(headers);
        for (const row of body) {
          // Ohne gültige ID und Zeitstempel lässt sich die nächste Seite nicht sicher anschließen: dann lieber gar nichts übernehmen.
          const updatedAt = isRecord(row) ? parseTimestamp(row.updated_at) : null;
          if (!isRecord(row) || typeof row.id !== 'string' || updatedAt === null) {
            throw new ActivitiesFetchError('Zeile ohne gültige ID oder updated_at');
          }
          after = { updatedAt, id: row.id };
        }
        rows.push(...body);
        if (body.length < pageSize) return { rows, maxUpdatedAt: after?.updatedAt ?? null, serverTime };
      }
      // Eine halbe Liste würde den Stand verfälschen (es fehlten Zeilen mit gleichem Zeitstempel): dann gar nichts übernehmen.
      throw new ActivitiesFetchError(`mehr als ${maxPages * pageSize} geänderte Aktivitäten`);
    },

    async ids() {
      const ids: string[] = [];
      let afterId: string | null = null;
      for (let page = 0; page < maxPages; page += 1) {
        const { body } = await get(buildIdsUrl(config, afterId));
        for (const row of body) {
          if (!isRecord(row) || typeof row.id !== 'string') throw new ActivitiesFetchError('ID-Liste mit ungültigem Eintrag');
          ids.push(row.id);
          afterId = row.id;
        }
        if (body.length < idPageSize) return ids;
      }
      throw new ActivitiesFetchError(`mehr als ${maxPages * idPageSize} IDs`);
    },

    async byIds(ids) {
      const rows: unknown[] = [];
      for (let start = 0; start < ids.length; start += idsPerRequest) {
        const { body } = await get(buildByIdsUrl(config, ids.slice(start, start + idsPerRequest)));
        rows.push(...body);
      }
      return rows;
    },
  };

  try {
    return await Promise.race([work(api), timeout]);
  } finally {
    clearTimeout(timer);
    // Läuft nach einem Fehler noch eine Anfrage, wird sie abgebrochen (nichts soll nach dem Ende des Abgleichs weiterlaufen).
    controller.abort();
  }
}
