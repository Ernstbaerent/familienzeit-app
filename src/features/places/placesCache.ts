// Orte (M10b): Zwischenspeicher der Kacheln auf dem Gerät. Reine Funktionen: Format, Prüfung, Alter, was herausfliegt.
// Lesen und Schreiben stehen in placesStorage.ts, den Ablauf steuert placesRefresh.ts. Es sind öffentliche Daten, keine Kinderdaten.
//
// Speicherplatz (docs/orte.md, „Speicher auf dem Gerät“): AsyncStorage erlaubt auf Android insgesamt etwa 6 MB und je Eintrag
// etwa 2 MB. Deshalb werden die Orte kompakt gespeichert (kurze Namen, keine leeren und keine ableitbaren Felder),
// höchstens 25 Kacheln und höchstens 2 MB für alle Kacheln zusammen.

import type { ImportIds } from './fetchPlaces';
import { checkPlaceRow, type PlaceRow } from './placeRow';
import { placeKinds, isPlaceSubtype } from './placeKinds';
import { tileKeyOf } from './placeTiles';

export const placesStorageVersion = 1;

const dayMs = 24 * 60 * 60 * 1000;

// Alle Grenzen an einer Stelle.
export const placesCacheRules = {
  freshDays: 30, // eine Kachel mit Orten wird nach 30 Tagen neu geholt
  freshEmptyDays: 7, // eine leere Kachel schon nach 7 Tagen (vielleicht kamen inzwischen Orte dazu)
  usableDays: 90, // ohne Netz bis 90 Tage weiter nutzen, danach weg
  staleHintAfterDays: 30, // ab hier der Hinweis „Stand: vor n Tagen“
  maxTiles: 25,
  maxBytes: 2 * 1024 * 1024, // 2 MB für alle Kacheln zusammen (Entscheidung von Clemens)
} as const;

// Eine Kachel, wie die App sie benutzt.
export type TileRecord = {
  key: string;
  fetchedAt: number; // Zeitpunkt des erfolgreichen Abrufs (Millisekunden)
  importIds: ImportIds; // Import-Kennung je Bundesland, aus dem die Orte dieser Kachel stammen
  rows: PlaceRow[];
};

// --- Kompakte Form ---------------------------------------------------------------------------------------------------

// Kurze Namen, leere Felder fallen weg. `category` und `tile` werden beim Lesen aus Unterart und Lage berechnet.
type CompactRow = {
  r: string; // region
  i: string; // id
  n?: string; // name
  s: string; // subtype
  a: number; // lat
  o: number; // lon
  e: string; // setting
  m?: number[]; // months
  h?: string; // opening_hours
  k?: string; // hours_kind
  p?: unknown; // hours_plan
  w?: string; // website
  l?: string; // locality
  t?: string; // street
  g: number; // kid_weight
};

export function toCompactRow(row: PlaceRow): CompactRow {
  const compact: CompactRow = { r: row.region, i: row.id, s: row.subtype, a: row.lat, o: row.lon, e: row.setting, g: row.kid_weight };
  if (row.name !== null) compact.n = row.name;
  if (row.months !== null) compact.m = row.months;
  if (row.opening_hours !== null) compact.h = row.opening_hours;
  if (row.hours_kind !== null) compact.k = row.hours_kind;
  if (row.hours_plan !== null) compact.p = row.hours_plan;
  if (row.website !== null) compact.w = row.website;
  if (row.locality !== null) compact.l = row.locality;
  if (row.street !== null) compact.t = row.street;
  return compact;
}

// Liest eine kompakte Zeile wieder ein und prüft sie vollständig (checkPlaceRow). Kaputt → null.
export function fromCompactRow(raw: unknown): PlaceRow | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  if (!isPlaceSubtype(c.s) || typeof c.a !== 'number' || typeof c.o !== 'number') return null;
  const check = checkPlaceRow({
    region: c.r,
    id: c.i,
    name: c.n ?? null,
    category: placeKinds[c.s].category,
    subtype: c.s,
    lat: c.a,
    lon: c.o,
    tile: tileKeyOf(c.a, c.o),
    setting: c.e,
    months: c.m ?? null,
    opening_hours: c.h ?? null,
    hours_kind: c.k ?? null,
    hours_plan: c.p ?? null,
    website: c.w ?? null,
    locality: c.l ?? null,
    street: c.t ?? null,
    kid_weight: c.g,
  });
  return check.ok ? check.row : null;
}

// Was im Speicher unter `places.v1.tile.<key>` steht.
export function serializeTile(tile: TileRecord): string {
  return JSON.stringify({
    version: placesStorageVersion,
    fetchedAt: tile.fetchedAt,
    importIds: tile.importIds,
    rows: tile.rows.map(toCompactRow),
  });
}

// Prüft eine gespeicherte Kachel (kann von einer älteren App-Version stammen, kaputt oder von Hand verändert sein).
// Falsche Version oder Form → null. Einzelne kaputte Zeilen oder Zeilen aus einer anderen Kachel fallen weg.
export function parseStoredTile(raw: unknown, key: string): TileRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const stored = raw as Record<string, unknown>;
  if (stored.version !== placesStorageVersion) return null;
  if (typeof stored.fetchedAt !== 'number' || !Number.isFinite(stored.fetchedAt)) return null;
  if (!Array.isArray(stored.rows)) return null;
  const importIds = typeof stored.importIds === 'object' && stored.importIds !== null ? (stored.importIds as ImportIds) : {};
  const rows = stored.rows.map(fromCompactRow).filter((row): row is PlaceRow => row !== null && row.tile === key);
  return { key, fetchedAt: stored.fetchedAt, importIds, rows };
}

// Größe eines Textes in Byte (UTF-8), so wie SQLite ihn auf Android speichert.
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4; // Ersatzpaar (z. B. Emoji): zusammen 4 Byte
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}

// --- Frische Antwort von Supabase in Kacheln aufteilen -----------------------------------------------------------------

export type SplitResult = {
  tiles: TileRecord[]; // eine je angefragter Kachel, auch leere
  rejected: number; // kaputte Zeilen und Zeilen aus nicht angefragten Kacheln
};

// Prüft jede Zeile (checkPlaceRow) und verteilt sie auf die angefragten Kacheln. Jede angefragte Kachel bekommt einen Eintrag,
// auch ohne Orte (dann wird sie nach 7 statt 30 Tagen neu geholt). Die Import-Kennung je Kachel nur für ihre Bundesländer.
export function splitIntoTiles(rows: readonly unknown[], requested: readonly string[], importIds: ImportIds, fetchedAt: number): SplitResult {
  const byTile = new Map<string, PlaceRow[]>(requested.map((key) => [key, []]));
  let rejected = 0;
  for (const raw of rows) {
    const check = checkPlaceRow(raw);
    const list = check.ok ? byTile.get(check.row.tile) : undefined;
    if (!check.ok || !list) {
      rejected += 1;
      continue;
    }
    list.push(check.row);
  }
  const tiles = requested.map((key) => {
    const tileRows = byTile.get(key) ?? [];
    const regions = new Set(tileRows.map((row) => row.region));
    const ids: ImportIds = {};
    for (const region of regions) if (importIds[region] !== undefined) ids[region] = importIds[region];
    return { key, fetchedAt, importIds: ids, rows: tileRows };
  });
  return { tiles, rejected };
}

// --- Alter einer Kachel -----------------------------------------------------------------------------------------------

// fresh = gilt noch, kein Abruf nötig; usable = neu holen, bis dahin (oder ohne Netz) weiter nutzen; expired = nicht mehr nutzen.
export type TileState = 'fresh' | 'usable' | 'expired';

export function getTileState(tile: Pick<TileRecord, 'fetchedAt' | 'rows'>, now: number): TileState {
  const ageMs = now - tile.fetchedAt;
  if (ageMs < 0) return 'usable'; // Uhr zurückgestellt: neu holen, bis dahin nutzen
  const freshDays = tile.rows.length > 0 ? placesCacheRules.freshDays : placesCacheRules.freshEmptyDays;
  if (ageMs < freshDays * dayMs) return 'fresh';
  if (ageMs < placesCacheRules.usableDays * dayMs) return 'usable';
  return 'expired';
}

// Ganze Tage seit dem Abruf (für den Hinweis „Stand: vor n Tagen“).
export function tileAgeDays(fetchedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - fetchedAt) / dayMs));
}

// --- Verzeichnis und Herauswerfen -------------------------------------------------------------------------------------

// `places.v1.index`: je gespeicherter Kachel die Größe und wann sie zuletzt gebraucht wurde. Klein, damit beim Benutzen
// nicht die ganze Kachel neu geschrieben werden muss.
export type IndexEntry = { bytes: number; lastUsedAt: number };
export type TileIndex = Record<string, IndexEntry>;

export function parseTileIndex(raw: unknown): TileIndex {
  if (typeof raw !== 'object' || raw === null) return {};
  const stored = raw as Record<string, unknown>;
  if (stored.version !== placesStorageVersion || typeof stored.tiles !== 'object' || stored.tiles === null) return {};
  const index: TileIndex = {};
  for (const [key, value] of Object.entries(stored.tiles as Record<string, unknown>)) {
    const entry = value as Partial<IndexEntry> | null;
    if (typeof entry?.bytes === 'number' && typeof entry.lastUsedAt === 'number' && Number.isFinite(entry.bytes) && Number.isFinite(entry.lastUsedAt)) {
      index[key] = { bytes: entry.bytes, lastUsedAt: entry.lastUsedAt };
    }
  }
  return index;
}

export function serializeTileIndex(index: TileIndex): unknown {
  return { version: placesStorageVersion, tiles: index };
}

export type StoragePlan = {
  index: TileIndex; // das neue Verzeichnis
  write: string[]; // neu geholte Kacheln, die gespeichert werden
  remove: string[]; // gespeicherte Kacheln, die herausfliegen
};

// Entscheidet, was gespeichert bleibt. `needed` sind die Kacheln, die gerade gebraucht werden, die nächste zuerst.
// `written` sind neu geholte Kacheln mit ihrer Größe. Reihenfolge beim Herauswerfen:
//   1. gespeicherte, die gerade nicht gebraucht werden, die am längsten ungenutzte zuerst,
//   2. dann die gebrauchten, die am weitesten entfernte zuerst (sie gelten bis zum Schließen der App trotzdem, nur nicht offline).
export function planTileStorage(
  index: TileIndex,
  needed: readonly string[],
  written: readonly { key: string; bytes: number }[],
  now: number,
  rules: { maxTiles: number; maxBytes: number } = placesCacheRules,
): StoragePlan {
  const next: TileIndex = { ...index };
  for (const { key, bytes } of written) next[key] = { bytes, lastUsedAt: now };
  for (const key of needed) if (next[key]) next[key] = { ...next[key], lastUsedAt: now };

  const neededSet = new Set(needed);
  const order = [
    ...Object.keys(next)
      .filter((key) => !neededSet.has(key))
      .sort((a, b) => next[a].lastUsedAt - next[b].lastUsedAt),
    ...[...needed].reverse().filter((key) => next[key]),
  ];

  const dropped = new Set<string>();
  let count = Object.keys(next).length;
  let bytes = Object.values(next).reduce((sum, entry) => sum + entry.bytes, 0);
  for (const key of order) {
    if (count <= rules.maxTiles && bytes <= rules.maxBytes) break;
    dropped.add(key);
    count -= 1;
    bytes -= next[key].bytes;
    delete next[key];
  }

  return {
    index: next,
    write: written.map((tile) => tile.key).filter((key) => !dropped.has(key)),
    remove: Object.keys(index).filter((key) => dropped.has(key)),
  };
}
