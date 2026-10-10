// Harte Ausschlüsse: Nur Sicherheit und Machbarkeit (siehe CLAUDE.md, „Vorschlagslogik“).
// Alles andere ändert nur die Reihenfolge (scoring.ts).
// Diese Regeln werden NIE aufgeweicht, auch wenn dadurch weniger als 3 Vorschläge übrig bleiben.

import type { Activity } from '../activities/activities';
import { getAgeInYears, getMonthNumber, type SuggestionRequest } from './request';

export type ExclusionReason =
  | 'notApproved' // Sicherheitsnetz: nur freigegebene Aktivitäten (loadActivities filtert schon)
  | 'age' // nicht altersgerecht für mindestens ein ausgewähltes Kind
  | 'time' // dauert länger als die verfügbare Zeit
  | 'dayPart' // passt nicht zur Tageszeit
  | 'month' // passt nicht zum Monat (z. B. Plätzchen nur im November und Dezember)
  | 'danger' // draußen bei Gewitter
  | 'notDry'; // braucht trockenes Wetter, es regnet oder gewittert

// Gibt den ersten Grund zurück, aus dem die Aktivität heute nicht in Frage kommt.
// `null` heißt: Sie kommt in Frage.
export function getExclusionReason(
  activity: Activity,
  request: SuggestionRequest,
): ExclusionReason | null {
  if (activity.status !== 'approved') return 'notApproved';

  // Alle ausgewählten Kinder müssen in die Altersspanne passen (Grenzen inklusive).
  const fitsEveryChild = request.children.every((child) => {
    const age = getAgeInYears(child, request.now);
    return age >= activity.ageMin && age <= activity.ageMax;
  });
  if (!fitsEveryChild) return 'age';

  // Maßgeblich ist die kürzeste Variante: Passt sie in die Zeit, ist die Aktivität machbar.
  // Anfahrt gibt es bei Aktivitäten für zu Hause nicht. Sie kommt mit Orten und Veranstaltungen dazu (M10, M11).
  if (activity.durationMin > request.availableMinutes) return 'time';

  // Ohne `dayParts` passt eine Aktivität zu jeder Tageszeit.
  if (activity.dayParts && !activity.dayParts.includes(request.dayPart)) return 'dayPart';

  // Ohne `months` passt eine Aktivität das ganze Jahr. Der Monat kommt aus dem heutigen Datum.
  if (activity.months && !activity.months.includes(getMonthNumber(request.now))) return 'month';

  // Bei Gewitter nichts draußen. `both` bleibt, weil man es drinnen machen kann.
  if (request.weather === 'thunderstorm' && activity.setting === 'outdoor') return 'danger';

  // `needsDry` heißt „nur bei Trockenheit“: bei Regen und Gewitter nicht machbar.
  const isWet = request.weather === 'rain' || request.weather === 'thunderstorm';
  if (isWet && activity.weather.needsDry) return 'notDry';

  return null;
}

export function isExcluded(activity: Activity, request: SuggestionRequest): boolean {
  return getExclusionReason(activity, request) !== null;
}
