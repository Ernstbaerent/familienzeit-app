// Zwischenspeicher der Aktivitäten (M8, seit M8b in Teilen): Was gespeichert wird, wann es noch gilt und wann die App neu nachfragt.
// Reine Funktionen. Das Lesen und Schreiben auf dem Gerät steht in activitiesStorage.ts.
// Es sind öffentliche Daten, keine Kinderdaten. Im Zwischenspeicher stehen nur Aktivitäten aus Supabase, nie die mitgelieferten aus data/
// (sonst würde die Zählprobe jeden Tag abweichen, docs/supabase.md).

import type { Activity } from './activities';
import { minUsableActivities, prepareActivities } from './activityLibrary';
import { formatTimestamp, parseTimestamp } from './activitySync';

// Wie oft die App höchstens neu nachfragt: einmal pro Tag.
export const defaultRefreshMinutes = 24 * 60;

export type ActivitiesRecord = {
  fetchedAt: number; // Zeitpunkt des letzten erfolgreichen Abrufs (Millisekunden, Uhr des Handys)
  cursor: string | null; // Stand: bis zu diesem `updated_at` (Uhr des Servers) ist alles auf dem Gerät; `null` = beim nächsten Mal alles laden
  idCheckedAt: number | null; // letzter Abgleich mit der ID-Liste (Millisekunden, Uhr des Handys)
  activities: Activity[];
};

// ---- Format v2 (seit M8b): ein Eintrag mit den Angaben plus Teile mit je höchstens 200 Aktivitäten ----
// Android liest AsyncStorage-Einträge über etwa 2 MB nicht (docs/wochenlauf.md, „Wachstum“); 200 Aktivitäten sind etwa 400 KB.

export const storageVersion = 2;
export const activitiesPerPart = 200;

export type StoredMeta = {
  version: number;
  fetchedAt: number;
  cursor: string | null;
  idCheckedAt: number | null;
  generation: string; // Kennung dieser Fassung; die Teile tragen sie im Schlüssel
  parts: number;
  count: number; // Anzahl der Einträge in allen Teilen zusammen
};

export type StoredPart = { version: number; generation: string; index: number; activities: Activity[] };

export function toStoredParts(record: ActivitiesRecord, generation: string): { meta: StoredMeta; parts: StoredPart[] } {
  const parts: StoredPart[] = [];
  for (let start = 0; start < record.activities.length; start += activitiesPerPart) {
    parts.push({ version: storageVersion, generation, index: parts.length, activities: record.activities.slice(start, start + activitiesPerPart) });
  }
  return {
    meta: {
      version: storageVersion,
      fetchedAt: record.fetchedAt,
      cursor: record.cursor,
      idCheckedAt: record.idCheckedAt,
      generation,
      parts: parts.length,
      count: record.activities.length,
    },
    parts,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

// Prüft den Eintrag mit den Angaben. `null`, wenn er fehlt oder unbrauchbar ist.
export function parseStoredMeta(raw: unknown): StoredMeta | null {
  if (!isRecord(raw) || raw.version !== storageVersion) return null;
  if (!isFiniteNumber(raw.fetchedAt)) return null;
  if (typeof raw.generation !== 'string' || raw.generation === '') return null;
  if (!Number.isInteger(raw.parts) || (raw.parts as number) < 1 || (raw.parts as number) > 1000) return null;
  if (!Number.isInteger(raw.count) || (raw.count as number) < 0) return null;
  return {
    version: storageVersion,
    fetchedAt: raw.fetchedAt,
    cursor: typeof raw.cursor === 'string' ? raw.cursor : null,
    idCheckedAt: isFiniteNumber(raw.idCheckedAt) ? raw.idCheckedAt : null,
    generation: raw.generation,
    parts: raw.parts as number,
    count: raw.count as number,
  };
}

// Setzt die Teile wieder zusammen. Fehlt ein Teil, ist einer kaputt, von einer anderen Fassung oder stimmt die Anzahl nicht,
// gilt der ganze Zwischenspeicher als leer (`null`): dann Mitgeliefertes, und der nächste Abruf lädt alles.
// Jeder Eintrag wird wie neue Daten geprüft. Bleiben weniger als `minUsableActivities` übrig, gilt der Zwischenspeicher ebenfalls als leer.
// Ein kaputter Stand macht nur den Stand leer (nächster Abruf: alles), die Aktivitäten bleiben benutzbar.
export function parseStoredParts(meta: StoredMeta, rawParts: readonly unknown[], imagePrefix: string | null): ActivitiesRecord | null {
  if (rawParts.length !== meta.parts) return null;
  const items: unknown[] = [];
  for (const [index, part] of rawParts.entries()) {
    if (!isRecord(part) || part.version !== storageVersion || part.generation !== meta.generation || part.index !== index) return null;
    if (!Array.isArray(part.activities)) return null;
    items.push(...part.activities);
  }
  if (items.length !== meta.count) return null;
  const activities = prepareActivities(items, imagePrefix, 'Zwischenspeicher');
  if (activities.length < minUsableActivities) return null;
  const cursorMicros = parseTimestamp(meta.cursor);
  return {
    fetchedAt: meta.fetchedAt,
    cursor: cursorMicros === null ? null : formatTimestamp(cursorMicros),
    idCheckedAt: meta.idCheckedAt,
    activities,
  };
}

// ---- Format v1 (M8, ein einziger Eintrag `activities.v1`): wird nur noch gelesen, beim Umstieg auf v2 ----
// v1 kennt keinen Stand. Der nächste Abruf lädt deshalb einmal alles (wie früher an jedem Tag) und schreibt danach v2.

export const legacyStorageVersion = 1;

// Prüft, was vom Gerät gelesen wurde (kann von einer älteren App-Version stammen, kaputt oder von Hand verändert sein).
export function parseLegacyActivities(raw: unknown, imagePrefix: string | null): ActivitiesRecord | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== legacyStorageVersion) return null;
  if (!isFiniteNumber(raw.fetchedAt)) return null;
  const activities = prepareActivities(raw.activities, imagePrefix, 'Zwischenspeicher');
  if (activities.length < minUsableActivities) return null;
  // Ohne Stand und ohne ID-Abgleich: Der nächste Abruf holt alles neu. Den Zeitpunkt behalten wir, damit nicht sofort nachgefragt wird.
  return { fetchedAt: raw.fetchedAt, cursor: null, idCheckedAt: null, activities };
}

// Abstand in Minuten aus der .env (nur zum Testen gedacht, docs/supabase.md). Fehlt der Wert oder ist er unbrauchbar, gilt der Standard von 24 Stunden.
export function getRefreshMinutes(value: string | undefined): number {
  const minutes = Number(value?.trim());
  return Number.isFinite(minutes) && minutes > 0 ? minutes : defaultRefreshMinutes;
}

// Soll die App jetzt neu nachfragen? Ja, wenn es noch nie geklappt hat, wenn der letzte Abruf mindestens `minutes` her ist
// oder wenn die Uhr zurückgestellt wurde (der gespeicherte Zeitpunkt liegt in der Zukunft).
export function shouldRefresh(fetchedAt: number | null, now: number, minutes: number = defaultRefreshMinutes): boolean {
  if (fetchedAt === null) return true;
  const ageMinutes = (now - fetchedAt) / 60_000;
  return ageMinutes < 0 || ageMinutes >= minutes;
}
