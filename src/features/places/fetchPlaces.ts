// Orte (M10b): Abruf ganzer Kacheln bei Supabase. Ein einfacher GET auf die REST-Schnittstelle (PostgREST), ohne supabase-js,
// gebaut wie der Abruf der Aktivitäten (src/features/activities/fetchActivities.ts) und mit demselben öffentlichen Schlüssel.
//
// Datenschutz (docs/supabase.md, „Was an Supabase geht“): In der Adresse stehen nur die Kachel-Schlüssel (z. B. 253_40),
// nie Koordinaten, nie der gerundete Standort. Keine Kinderdaten, keine Geräte-ID. Ohne UI.

import { buildHeaders, type FetchLike } from '../activities/fetchActivities';
import type { SupabaseConfig } from '../activities/supabaseConfig';
import { regionKeys } from './placeRow';
import { isTileKey } from './placeTiles';

// Alle Spalten von `places` (supabase/migrations/0003_places.sql). Auch `opening_hours` und `website`, damit M10c ohne neuen Abruf auskommt.
export const placeColumns = [
  'region',
  'id',
  'name',
  'category',
  'subtype',
  'lat',
  'lon',
  'tile',
  'setting',
  'months',
  'opening_hours',
  'hours_kind',
  'hours_plan',
  'website',
  'locality',
  'street',
  'kid_weight',
] as const;

// Höchstens so viele Zeilen je Seite (Supabase liefert standardmäßig höchstens 1000 pro Abruf).
export const placesPageSize = 1000;
// Mehr Seiten holen wir nie (Schutz vor einer Schleife): 40 × 1000 = 40 000 Orte, die dichteste Kachel hat etwa 5 000.
export const maxPlacesPages = 40;
// So lange darf der ganze Abruf dauern (alle Seiten und beide Abfragen der Import-Kennung).
export const placesTimeoutMs = 10_000;

export class PlacesFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlacesFetchError';
  }
}

// Kennung des gültigen Imports je Bundesland (aus `places_imports`), z. B. { TH: "2026-10-03-th" }.
export type ImportIds = Record<string, string>;

export function buildPlacesUrl(config: SupabaseConfig, tiles: readonly string[], offset: number, limit: number = placesPageSize): string {
  if (tiles.length === 0 || !tiles.every(isTileKey)) throw new PlacesFetchError('ungültige Kachel-Liste');
  const query = [
    `select=${placeColumns.join(',')}`,
    `tile=in.(${tiles.join(',')})`,
    'order=tile.asc,region.asc,id.asc', // feste Reihenfolge, damit die Seiten zusammenpassen
    `limit=${limit}`,
    `offset=${offset}`,
  ].join('&');
  return `${config.url}/rest/v1/places?${query}`;
}

export function buildImportsUrl(config: SupabaseConfig): string {
  return `${config.url}/rest/v1/places_imports?select=region,import_id&order=region.asc`;
}

// Liest die Antwort von `places_imports`. Unbekannte oder kaputte Zeilen fallen weg.
export function parseImportIds(body: unknown): ImportIds {
  if (!Array.isArray(body)) throw new PlacesFetchError('Antwort ist keine Liste');
  const ids: ImportIds = {};
  for (const row of body) {
    const { region, import_id: importId } = (row ?? {}) as Record<string, unknown>;
    if ((regionKeys as readonly unknown[]).includes(region) && typeof importId === 'string' && importId.length > 0 && importId.length <= 80) {
      ids[region as string] = importId;
    }
  }
  return ids;
}

export type PlacesFetchOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

export type FetchedTiles = {
  rows: unknown[]; // roh, ungeprüft (die Prüfung macht danach placesCache.ts mit checkPlaceRow)
  importIds: ImportIds;
};

// Holt alle Orte der Kacheln. Vorher und nachher wird die Import-Kennung gelesen: Lief genau in der Zwischenzeit ein Import,
// könnten die Seiten aus altem und neuem Stand gemischt sein. Dann wird der Abruf verworfen (Fehler), und der alte Stand bleibt.
// Wirft einen PlacesFetchError bei Netzfehler, HTTP-Fehler, Zeitüberschreitung, kaputter Antwort oder zu vielen Seiten.
export async function fetchPlaceTiles(
  config: SupabaseConfig,
  tiles: readonly string[],
  options: PlacesFetchOptions = {},
): Promise<FetchedTiles> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const timeoutMs = options.timeoutMs ?? placesTimeoutMs;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new PlacesFetchError(`Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} Sekunden`));
    }, timeoutMs);
  });

  async function getJson(url: string): Promise<unknown> {
    let response;
    try {
      response = await fetchImpl(url, { method: 'GET', headers: buildHeaders(config), signal: controller.signal });
    } catch (error) {
      throw new PlacesFetchError(error instanceof Error && error.message ? error.message : 'Netzwerkfehler');
    }
    if (!response.ok) throw new PlacesFetchError(`HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new PlacesFetchError('Antwort ist kein gültiges JSON');
    }
  }

  async function load(): Promise<FetchedTiles> {
    const importIds = parseImportIds(await getJson(buildImportsUrl(config)));
    const rows: unknown[] = [];
    let complete = false;
    for (let page = 0; page < maxPlacesPages; page += 1) {
      const body = await getJson(buildPlacesUrl(config, tiles, page * placesPageSize));
      if (!Array.isArray(body)) throw new PlacesFetchError('Antwort ist keine Liste');
      rows.push(...body);
      if (body.length < placesPageSize) {
        complete = true;
        break;
      }
    }
    if (!complete) throw new PlacesFetchError(`mehr als ${maxPlacesPages} Seiten`);
    const after = parseImportIds(await getJson(buildImportsUrl(config)));
    if (JSON.stringify(after) !== JSON.stringify(importIds)) throw new PlacesFetchError('Import lief während des Abrufs');
    return { rows, importIds };
  }

  try {
    return await Promise.race([load(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
