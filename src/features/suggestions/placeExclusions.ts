// Harte Ausschlüsse für Orte (M10b): nur Sicherheit und Machbarkeit, wie bei Aktivitäten (exclusions.ts).
// Alles andere ändert nur die Reihenfolge (placeScoring.ts). Diese Regeln werden NIE aufgeweicht.
// Reine Funktionen. Regeln und Zahlen: docs/suggestions.md, „Orte in den Vorschlägen“.

import { isOpenThrough } from '../places/openingHours';
import { placeKinds } from '../places/placeKinds';
import type { PlaceRow } from '../places/placeRow';
import { isAfterDaylight } from '../places/sunset';
import type { Travel } from '../places/travel';
import { getMonthNumber, type SuggestionRequest } from './request';

export type PlaceExclusionReason =
  | 'time' // Anfahrt hin und zurück plus Mindestbesuch passt nicht in die verfügbare Zeit
  | 'season' // außerhalb der Saison (z. B. Freibad im Winter)
  | 'danger' // draußen bei Gewitter oder amtlicher Warnung
  | 'notDry' // Unterart braucht Trockenheit, es regnet, gewittert oder schneit
  | 'closed' // laut festem Wochenplan bei Ankunft geschlossen oder schließt vor dem Ende des Mindestbesuchs
  | 'dark'; // draußen und der Mindestbesuch endet nach dem Tageslicht (Tabelle in sunset.ts)

// Ein Ort mit allem, was die Logik über ihn wissen muss (Entfernung und Anfahrt vom gerundeten Standort, travel.ts).
export type PlaceCandidate = {
  row: PlaceRow;
  km: number; // Luftlinie
  travel: Travel;
};

// Ist der Wochenplan verlässlich genug, um auszuschließen? Nur ein fester Plan ohne Feiertagsregel:
// Die App kennt keine Feiertage, an einem Feiertag könnte ein solcher Ort anders offen haben (Entscheidung von Clemens).
// Unbekannte Öffnungszeiten (`complex`, `invalid`, keine Angabe) schließen nie aus (Erkenntnis 1 aus M2a).
export function hasReliablePlan(row: PlaceRow): boolean {
  return row.hours_kind === 'plan' && row.hours_plan !== null && !row.hours_plan.ph;
}

const minuteMs = 60_000;

export function getPlaceExclusionReason(candidate: PlaceCandidate, request: SuggestionRequest): PlaceExclusionReason | null {
  const { row, travel } = candidate;
  const kind = placeKinds[row.subtype];
  const visit = kind.minVisitMinutes;

  if (travel.roundTripMinutes + visit > request.availableMinutes) return 'time';

  if (row.months && !row.months.includes(getMonthNumber(request.now))) return 'season';

  // Wie bei Aktivitäten: Bei Gewitter oder Warnung nichts draußen. `both` bleibt (z. B. Burg mit Innenräumen, Kombibad).
  const isDangerous = request.weather === 'thunderstorm' || request.severeWarning === true;
  if (isDangerous && row.setting === 'outdoor') return 'danger';

  const isWet = request.weather === 'rain' || request.weather === 'thunderstorm' || request.weather === 'snow';
  if (isWet && 'needsDry' in kind && kind.needsDry) return 'notDry';

  const arrival = new Date(request.now.getTime() + travel.oneWayMinutes * minuteMs);
  if (hasReliablePlan(row) && row.hours_plan && !isOpenThrough(row.hours_plan, arrival, visit)) return 'closed';

  const visitEnd = new Date(arrival.getTime() + visit * minuteMs);
  if (row.setting === 'outdoor' && isAfterDaylight(request.now, visitEnd)) return 'dark';

  return null;
}

export function isPlaceExcluded(candidate: PlaceCandidate, request: SuggestionRequest): boolean {
  return getPlaceExclusionReason(candidate, request) !== null;
}
