// Orte (M10b): Texte für Karte und Detailansicht. Reine Funktionen, die Übersetzung (`t`) kommt herein.

import type { TFunction } from 'i18next';

import type { PlaceRow } from './placeRow';
import { placesCacheRules, tileAgeDays } from './placesCache';

// Titel: der Name, sonst „Spielplatz in Pohlitz“, sonst „Spielplatz, Elsterstraße“, sonst nur „Spielplatz“ (Erkenntnis 3 aus M2a).
export function placeTitle(t: TFunction, row: PlaceRow): string {
  if (row.name) return row.name;
  const subtype = t(`places.subtypes.${row.subtype}`);
  if (row.locality) return t('places.titleIn', { subtype, locality: row.locality });
  if (row.street) return t('places.titleAt', { subtype, street: row.street });
  return subtype;
}

// „ca. 4 km“, unter 1 km „unter 1 km“. Ganze km reichen: Der Standort ist auf etwa 1 km gerundet.
export function distanceText(t: TFunction, km: number): string {
  return km < 1 ? t('places.distanceUnder1') : t('places.distance', { km: Math.round(km) });
}

// Zeile unter dem Titel: „ca. 4 km · Pohlitz“. Den Ortsteil nur, wenn er nicht schon im Titel steht.
export function placeMetaLine(t: TFunction, row: PlaceRow, km: number): string {
  const parts = [distanceText(t, km)];
  if (row.name && row.locality) parts.push(row.locality);
  return parts.join(' · ');
}

// „Öffnungszeiten vorher prüfen“: immer, außer bei einem festen Wochenplan ohne Feiertagsregel.
export function needsHoursCheck(row: PlaceRow): boolean {
  return !(row.hours_kind === 'plan' && row.hours_plan !== null && !row.hours_plan.ph);
}

// Kinos sind neutral gewichtet und bekommen den Hinweis „Programm und Altersfreigabe vorher prüfen“.
export function isCinema(row: PlaceRow): boolean {
  return row.subtype === 'cinema';
}

// Die Hinweise eines Ortes in fester Reihenfolge (Karte, Sprachausgabe, Detailansicht).
export function placeNotes(t: TFunction, row: PlaceRow): string[] {
  const notes: string[] = [];
  if (isCinema(row)) notes.push(t('places.cinemaHint'));
  if (needsHoursCheck(row)) notes.push(t('places.checkHours'));
  return notes;
}

// Hinweis „Stand: vor n Tagen“, wenn eine der Kacheln der gezeigten Orte älter als 30 Tage ist (ohne Netz weiter genutzt).
// `null` = alles frisch, kein Hinweis.
export function staleDays(rows: readonly PlaceRow[], tileFetchedAt: Record<string, number>, now: number): number | null {
  let oldest: number | null = null;
  for (const row of rows) {
    const fetchedAt = tileFetchedAt[row.tile];
    if (fetchedAt !== undefined && (oldest === null || fetchedAt < oldest)) oldest = fetchedAt;
  }
  if (oldest === null) return null;
  const days = tileAgeDays(oldest, now);
  return days > placesCacheRules.staleHintAfterDays ? days : null;
}
