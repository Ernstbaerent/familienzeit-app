// Verlauf: Was die Familie gemacht hat. Datentyp und reine Funktionen (ohne UI, ohne Speicher).
// Der Verlauf liegt nur auf dem Gerät (siehe historyStorage.ts). Details: docs/history.md.

import { createId } from '@/lib/id';

// Höchstens so viele Einträge bleiben erhalten, die ältesten fallen zuerst weg.
export const maxHistoryEntries = 500;

// Zwei Einträge für dieselbe Aktivität in dieser Zeit sind ein Doppeltipp auf „Fertig“ und zählen als einer.
export const mergeWindowMinutes = 5;

export const ratingKeys = ['up', 'down'] as const; // Daumen hoch, Daumen runter
export type Rating = (typeof ratingKeys)[number];

export type HistoryEntry = {
  id: string;
  activityId: string;
  doneAt: string; // ISO-Zeitpunkt, wann auf „Fertig“ getippt wurde
  childIds: string[]; // IDs der Kinder, die dabei waren (Kinder können inzwischen gelöscht sein)
  rating?: Rating; // freiwillig
};

// Was beim Tippen auf „Fertig“ bekannt ist.
export type HistoryDraft = Pick<HistoryEntry, 'activityId' | 'childIds'>;

export function isRating(value: unknown): value is Rating {
  return (ratingKeys as readonly unknown[]).includes(value);
}

function getTime(entry: Pick<HistoryEntry, 'doneAt'>): number {
  return Date.parse(entry.doneAt);
}

// Neueste zuerst. Bei gleicher Zeit bleibt die bisherige Reihenfolge (sort ist stabil).
export function sortNewestFirst(entries: readonly HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => getTime(b) - getTime(a));
}

// Die neuesten `maxHistoryEntries` Einträge, neueste zuerst.
export function limitEntries(entries: readonly HistoryEntry[]): HistoryEntry[] {
  return sortNewestFirst(entries).slice(0, maxHistoryEntries);
}

export type AddResult = {
  entries: HistoryEntry[]; // der neue Stand
  entry: HistoryEntry; // der angelegte (oder bei einem Doppeltipp: der schon vorhandene) Eintrag
};

// Legt einen Eintrag für „Fertig“ an. Gibt es für dieselbe Aktivität schon einen aus den letzten
// `mergeWindowMinutes` Minuten, wird nichts doppelt angelegt: Der vorhandene bleibt (mit seiner Bewertung),
// nur die Kinder werden ergänzt.
export function addToHistory(
  entries: readonly HistoryEntry[],
  draft: HistoryDraft,
  now: Date,
): AddResult {
  const windowMs = mergeWindowMinutes * 60 * 1000;
  const duplicate = entries.find(
    (entry) =>
      entry.activityId === draft.activityId && Math.abs(now.getTime() - getTime(entry)) <= windowMs,
  );

  if (duplicate) {
    const childIds = [...new Set([...duplicate.childIds, ...draft.childIds])];
    const merged = { ...duplicate, childIds };
    return {
      entries: entries.map((entry) => (entry.id === duplicate.id ? merged : entry)),
      entry: merged,
    };
  }

  const entry: HistoryEntry = {
    id: createId(),
    activityId: draft.activityId,
    doneAt: now.toISOString(),
    childIds: [...new Set(draft.childIds)],
  };
  return { entries: limitEntries([entry, ...entries]), entry };
}

// Bewertung setzen, ändern oder (mit `undefined`) entfernen.
export function setRating(
  entries: readonly HistoryEntry[],
  id: string,
  rating: Rating | undefined,
): HistoryEntry[] {
  return entries.map((entry) => {
    if (entry.id !== id) return entry;
    const changed = { ...entry };
    if (rating) changed.rating = rating;
    else delete changed.rating;
    return changed;
  });
}

export function removeEntry(entries: readonly HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeEntry(raw: unknown): HistoryEntry | null {
  if (!isRecord(raw)) return null;
  const { id, activityId, doneAt, childIds, rating } = raw;

  if (typeof id !== 'string' || id === '') return null;
  if (typeof activityId !== 'string' || activityId === '') return null;
  if (typeof doneAt !== 'string' || Number.isNaN(Date.parse(doneAt))) return null;

  // Kaputte Kinder-IDs und eine unbekannte Bewertung fallen weg, der Eintrag selbst bleibt.
  const kids = Array.isArray(childIds)
    ? [...new Set(childIds.filter((item): item is string => typeof item === 'string' && item !== ''))]
    : [];

  return { id, activityId, doneAt, childIds: kids, ...(isRating(rating) ? { rating } : {}) };
}

// Räumt gespeicherte Daten auf: kaputte Einträge und doppelte IDs fliegen raus, es bleiben höchstens
// die neuesten `maxHistoryEntries`.
export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const entries: HistoryEntry[] = [];
  for (const item of raw) {
    const entry = sanitizeEntry(item);
    if (entry && !seenIds.has(entry.id)) {
      seenIds.add(entry.id);
      entries.push(entry);
    }
  }
  return limitEntries(entries);
}

// Die Version steckt im Schlüssel (historyStorage.ts) und in den Daten, falls sich das Format später ändert.
export const historyStorageVersion = 1;

export function toStoredHistory(entries: readonly HistoryEntry[]) {
  return { version: historyStorageVersion, entries };
}

// Liest, was auf dem Gerät liegt. Fehlt es oder hat es eine unbekannte Version, ist der Verlauf leer.
export function parseStoredHistory(stored: unknown): HistoryEntry[] {
  if (!isRecord(stored)) return [];
  if (stored.version !== historyStorageVersion) return [];
  return sanitizeHistory(stored.entries);
}
