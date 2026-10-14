// Orte (M10b): der Ablauf „Orte besorgen“. Standort → Kacheln → Zwischenspeicher → Abruf (nur, was fehlt oder alt ist) → speichern.
// Ohne UI (kein React). Alles, was nach außen geht (Standort, Netz, Speicher), kommt als Parameter herein, damit es sich testen lässt.
// Wirft nie: Jeder Fehler endet still mit dem, was gespeichert ist, oder ohne Orte (docs/orte.md, „Orte in der App“).

import type { SupabaseConfig } from '../activities/supabaseConfig';
import type { Place } from '../weather/location';
import { fetchPlaceTiles, type FetchedTiles } from './fetchPlaces';
import type { PlaceRow } from './placeRow';
import {
  getTileState,
  placesCacheRules,
  planTileStorage,
  serializeTile,
  splitIntoTiles,
  utf8Bytes,
  type TileIndex,
  type TileRecord,
} from './placesCache';
import { isInGermanyBounds, tileIndexOf, tilesAround, tileLatStep, tileLonStep } from './placeTiles';
import { distanceKm } from './travel';

// Die Kacheln werden immer für den größten Umkreis geholt, damit die Stufen 5, 15 und 30 km ohne neuen Abruf rechnen können.
export const maxRadiusKm = 30;

export type PlacesSnapshot = {
  origin: Place; // der gerundete Standort, von dem aus gerechnet wird (geht nie an Supabase)
  rows: PlaceRow[]; // alle Orte der Kacheln, nach `id` zusammengefasst
  tileFetchedAt: Record<string, number>; // Abrufzeit je benutzter Kachel (für „Stand: vor n Tagen“)
};

export type PlacesResult =
  | { kind: 'ready'; snapshot: PlacesSnapshot }
  // noPermission = Standort nicht erlaubt; noLocation = erlaubt, aber kein Standort (Ortung aus, kein Empfang);
  // outside = außerhalb Deutschlands; noData = nichts geladen und nichts gespeichert
  | { kind: 'unavailable'; reason: PlacesUnavailableReason };

export type PlacesUnavailableReason = 'noPermission' | 'noLocation' | 'outside' | 'noData';

export type PlacesStore = {
  loadTile: (key: string) => Promise<TileRecord | null>;
  saveTile: (key: string, serialized: string) => Promise<void>;
  removeTiles: (keys: readonly string[]) => Promise<void>;
  loadIndex: () => Promise<TileIndex>;
  saveIndex: (index: TileIndex) => Promise<void>;
};

export type PlacesDeps = {
  // Schon gerundet. 'noPermission' ohne Erlaubnis (dann wird gar nicht geortet), `null` ohne Ortung.
  getPlace: () => Promise<Place | 'noPermission' | null>;
  config: SupabaseConfig | null; // `null` = Supabase nicht eingerichtet: nur Gespeichertes
  fetchTiles: (config: SupabaseConfig, tiles: readonly string[]) => Promise<FetchedTiles>;
  store: PlacesStore;
  warn: (message: string) => void;
};

// Mitte einer Kachel, für die Reihenfolge „nächste zuerst“.
function tileCenter(key: string): Place {
  const [row, col] = key.split('_').map(Number);
  return { lat: (row + 0.5) * tileLatStep, lon: (col + 0.5) * tileLonStep };
}

// Die gebrauchten Kacheln, die nächste zuerst (die eigene immer vorn).
export function neededTiles(origin: Place): string[] {
  const own = tileIndexOf(origin.lat, origin.lon);
  const ownKey = `${own.row}_${own.col}`;
  return tilesAround(origin.lat, origin.lon, maxRadiusKm)
    .map((key) => ({ key, km: key === ownKey ? -1 : distanceKm(origin, tileCenter(key)) }))
    .sort((a, b) => a.km - b.km)
    .map((entry) => entry.key);
}

// Fasst die Orte mehrerer Kacheln zusammen. Ein Ort am Rand zweier Bundesländer steht zweimal in der Tabelle (gleiche `id`): einmal reicht.
export function mergeTiles(tiles: readonly TileRecord[]): PlaceRow[] {
  const seen = new Set<string>();
  const rows: PlaceRow[] = [];
  for (const tile of tiles) {
    for (const row of tile.rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  return rows;
}

function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'unbekannter Fehler';
}

export async function resolvePlaces(deps: PlacesDeps, now: number = Date.now()): Promise<PlacesResult> {
  let origin: Place | 'noPermission' | null;
  try {
    origin = await deps.getPlace();
  } catch {
    origin = null;
  }
  if (origin === 'noPermission') return { kind: 'unavailable', reason: 'noPermission' };
  if (!origin) return { kind: 'unavailable', reason: 'noLocation' };
  if (!isInGermanyBounds(origin.lat, origin.lon)) return { kind: 'unavailable', reason: 'outside' };

  const needed = neededTiles(origin);
  const index = await deps.store.loadIndex().catch((): TileIndex => ({}));
  const stored = await Promise.all(needed.map((key) => deps.store.loadTile(key).catch(() => null)));
  // Fehlt eine gespeicherte Kachel im Verzeichnis (z. B. weil es verloren ging), wird sie nachgetragen, damit sie mitzählt.
  stored.forEach((tile) => {
    if (tile && !index[tile.key]) index[tile.key] = { bytes: utf8Bytes(serializeTile(tile)), lastUsedAt: tile.fetchedAt };
  });

  const current = new Map<string, TileRecord>();
  const toFetch: string[] = [];
  const expired: string[] = [];
  needed.forEach((key, i) => {
    const tile = stored[i];
    const state = tile ? getTileState(tile, now) : 'expired';
    if (tile && state !== 'expired') current.set(key, tile);
    if (tile && state === 'expired') expired.push(key);
    if (state !== 'fresh') toFetch.push(key);
  });

  const written: { key: string; bytes: number; serialized: string }[] = [];
  if (toFetch.length > 0 && deps.config) {
    try {
      const fetched = await deps.fetchTiles(deps.config, toFetch);
      const { tiles, rejected } = splitIntoTiles(fetched.rows, toFetch, fetched.importIds, now);
      if (rejected > 0) deps.warn(`Orte: ${rejected} ungültige Zeilen verworfen.`);
      for (const tile of tiles) {
        current.set(tile.key, tile);
        const serialized = serializeTile(tile);
        written.push({ key: tile.key, bytes: utf8Bytes(serialized), serialized });
      }
    } catch (error) {
      // Kein Netz, Server-Fehler, pausiertes Projekt, Zeitüberschreitung, Import während des Abrufs: still weiter mit dem Gespeicherten.
      deps.warn(`Orte: Abruf bei Supabase fehlgeschlagen (${message(error)}). Es gelten die gespeicherten Kacheln.`);
    }
  }

  // Speichern ist nur ein Bonus: Klappt es nicht (Speicher voll), gelten die Orte trotzdem bis zum Schließen der App.
  try {
    const plan = planTileStorage(index, needed, written, now, placesCacheRules);
    for (const tile of written) {
      if (plan.write.includes(tile.key)) await deps.store.saveTile(tile.key, tile.serialized);
    }
    const removed = [...new Set([...plan.remove, ...expired.filter((key) => !plan.write.includes(key))])];
    await deps.store.removeTiles(removed);
    for (const key of expired) if (!plan.write.includes(key)) delete plan.index[key];
    await deps.store.saveIndex(plan.index);
  } catch (error) {
    deps.warn(`Orte: Speichern auf dem Gerät fehlgeschlagen (${message(error)}).`);
  }

  const used = needed.map((key) => current.get(key)).filter((tile): tile is TileRecord => tile !== undefined);
  if (used.length === 0) return { kind: 'unavailable', reason: 'noData' };
  return {
    kind: 'ready',
    snapshot: {
      origin,
      rows: mergeTiles(used),
      tileFetchedAt: Object.fromEntries(used.map((tile) => [tile.key, tile.fetchedAt])),
    },
  };
}

// Die Abfrage, wie sie die App benutzt (ohne Ersatzteile). Für Tests gibt es resolvePlaces mit eigenen `deps`.
export function defaultFetchTiles(config: SupabaseConfig, tiles: readonly string[]): Promise<FetchedTiles> {
  return fetchPlaceTiles(config, tiles);
}
