// Zwischenspeicher der Aktivitäten (M8): Was gespeichert wird, wann es noch gilt und wann die App neu nachfragt.
// Reine Funktionen. Das Lesen und Schreiben auf dem Gerät steht in activitiesStorage.ts.
// Es sind öffentliche Daten, keine Kinderdaten.

import type { Activity } from './activities';
import { minUsableActivities, prepareActivities } from './activityLibrary';

// Wie oft die App höchstens neu nachfragt: einmal pro Tag.
export const defaultRefreshMinutes = 24 * 60;

export type ActivitiesRecord = {
  fetchedAt: number; // Zeitpunkt des letzten erfolgreichen Abrufs (Millisekunden)
  activities: Activity[];
};

// Gespeichert wird versioniert, wie bei den Profilen: `{ version: 1, fetchedAt, activities }`.
export const storageVersion = 1;

export function toStoredActivities(record: ActivitiesRecord): { version: number; fetchedAt: number; activities: Activity[] } {
  return { version: storageVersion, fetchedAt: record.fetchedAt, activities: record.activities };
}

// Prüft, was vom Gerät gelesen wurde (kann von einer älteren App-Version stammen, kaputt oder von Hand verändert sein).
// Jeder Eintrag wird wie neue Daten geprüft. Bleiben weniger als `minUsableActivities` übrig, gilt der Zwischenspeicher als leer (`null`).
export function parseStoredActivities(raw: unknown, imagePrefix: string | null): ActivitiesRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const stored = raw as Record<string, unknown>;
  if (stored.version !== storageVersion) return null;
  if (typeof stored.fetchedAt !== 'number' || !Number.isFinite(stored.fetchedAt)) return null;
  const activities = prepareActivities(stored.activities, imagePrefix, 'Zwischenspeicher');
  if (activities.length < minUsableActivities) return null;
  return { fetchedAt: stored.fetchedAt, activities };
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
