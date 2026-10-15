// Orte-Import (M10a): Lesen und Schreiben bei Supabase über die REST-Schnittstelle (PostgREST), ohne supabase-js.
// Benutzt den GEHEIMEN Schlüssel (SUPABASE_SECRET_KEY, nur in GitHub Secrets). Kopfzeilen wie beim Wochenlauf.
// Geschrieben wird nur über die Zwischentabelle und die beiden Funktionen aus 0003_places.sql.

import type { PlaceRow, RegionKey } from '../../../src/features/places/placeRow.ts';
import type { SupabaseAdminConfig } from '../weekly/config.ts';
import { readJson, shorten, withTimeout, type FetchLike, type HttpResponse } from '../weekly/http.ts';
import { SupabaseError, buildAdminHeaders } from '../weekly/supabaseAdmin.ts';
import { placeLimits } from './limits.ts';

type Request = { what: string; path: string; method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>; timeoutMs?: number };

async function send(config: SupabaseAdminConfig, fetchImpl: FetchLike, request: Request): Promise<{ response: HttpResponse; body: unknown }> {
  let result;
  try {
    result = await withTimeout(request.timeoutMs ?? placeLimits.supabaseTimeoutMs, `Supabase (${request.what})`, async (signal) => {
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

export type ImportState = { region: string; rowCount: number; importId: string; importedAt: string };

// Stand aller Länder (für Qualitätsbremse, Obergrenze und Bericht).
export async function fetchImportStates(config: SupabaseAdminConfig, fetchImpl: FetchLike): Promise<ImportState[]> {
  const { body } = await send(config, fetchImpl, {
    what: 'Stand der Orte lesen',
    path: 'places_imports?select=region,row_count,import_id,imported_at&order=region.asc',
  });
  if (!Array.isArray(body)) throw new SupabaseError('Supabase (Stand der Orte lesen): Antwort ist keine Liste');
  return body.flatMap((row: unknown) => {
    const r = row as Record<string, unknown> | null;
    if (!r || typeof r.region !== 'string' || !Number.isInteger(r.row_count)) return [];
    return [{ region: r.region, rowCount: r.row_count as number, importId: String(r.import_id ?? ''), importedAt: String(r.imported_at ?? '') }];
  });
}

export async function beginImport(config: SupabaseAdminConfig, fetchImpl: FetchLike, region: RegionKey, importId: string): Promise<void> {
  await send(config, fetchImpl, {
    what: `${region}: Zwischentabelle leeren`,
    path: 'rpc/begin_places_import',
    method: 'POST',
    body: { p_region: region, p_import_id: importId },
  });
}

export async function insertStaging(
  config: SupabaseAdminConfig,
  fetchImpl: FetchLike,
  importId: string,
  rows: readonly PlaceRow[],
  what: string,
): Promise<void> {
  await send(config, fetchImpl, {
    what,
    path: 'places_staging',
    method: 'POST',
    body: rows.map((row) => ({ import_id: importId, ...row })),
    headers: { Prefer: 'return=minimal' },
  });
}

export async function publishImport(
  config: SupabaseAdminConfig,
  fetchImpl: FetchLike,
  input: { region: RegionKey; importId: string; expected: number; maxTotal: number; sourceTimestamp: string | null; sourceUrl: string | null },
): Promise<number> {
  const { body } = await send(config, fetchImpl, {
    what: `${input.region}: austauschen`,
    path: 'rpc/publish_places_import',
    method: 'POST',
    body: {
      p_region: input.region,
      p_import_id: input.importId,
      p_expected: input.expected,
      p_max_total: input.maxTotal,
      p_source_timestamp: input.sourceTimestamp,
      p_source_url: input.sourceUrl,
    },
    timeoutMs: placeLimits.publishTimeoutMs,
  });
  if (typeof body !== 'number') throw new SupabaseError(`Supabase (${input.region}: austauschen): unerwartete Antwort`);
  return body;
}

export type PlaceOverrideAction = 'hide' | 'boost';
export type PlaceOverride = { id: string; action: PlaceOverrideAction };

// Ausschlussliste (0004_place_overrides.sql): je OSM-Kennung `hide` (nicht importieren) oder `boost` (Kindertauglichkeit 3).
// Nur der geheime Schlüssel darf sie lesen. Ist sie nicht lesbar (z. B. Migration 0004 fehlt), bricht das Hochladen ab, bevor
// ein Land angefasst wird: Sonst kämen versteckte Orte still zurück.
export async function fetchPlaceOverrides(config: SupabaseAdminConfig, fetchImpl: FetchLike): Promise<PlaceOverride[]> {
  let body: unknown;
  try {
    ({ body } = await send(config, fetchImpl, {
      what: 'Ausschlussliste lesen',
      path: `place_overrides?select=id,action&order=id.asc&limit=${placeLimits.maxOverrides + 1}`,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SupabaseError(`${message}. Ist die Migration 0004_place_overrides.sql eingespielt? Kein Land wurde angefasst.`);
  }
  if (!Array.isArray(body)) throw new SupabaseError('Supabase (Ausschlussliste lesen): Antwort ist keine Liste');
  if (body.length > placeLimits.maxOverrides) {
    throw new SupabaseError(`Ausschlussliste hat mehr als ${placeLimits.maxOverrides} Einträge (Grenze in limits.ts)`);
  }
  return body.flatMap((row: unknown) => {
    const r = row as Record<string, unknown> | null;
    if (!r || typeof r.id !== 'string' || !/^[nwr][1-9][0-9]{0,14}$/.test(r.id)) return [];
    if (r.action !== 'hide' && r.action !== 'boost') return [];
    return [{ id: r.id, action: r.action }];
  });
}
