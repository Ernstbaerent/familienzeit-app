// Alles, was die Vorschlagslogik über die heutige Situation wissen muss.

import type { DayPart } from '../activities/activities';
import { getAgeInMonths, type ChildProfile } from '../profiles/profiles';
import type { ParentEnergy, Weather } from './conditions';

// Von einem Kind braucht die Logik nur Alter, Interessen und Abneigungen (kein Spitzname).
export type SuggestionChild = Pick<
  ChildProfile,
  'birthYear' | 'birthMonth' | 'interests' | 'dislikes'
>;

export type SuggestionRequest = {
  children: SuggestionChild[]; // die Kinder, die heute dabei sind
  availableMinutes: number;
  parentEnergy?: ParentEnergy; // freiwillig, fehlt = neutral
  weather: Weather; // M5: Test-Auswahl, ab M6 echtes Wetter
  dayPart: DayPart; // M5: Test-Auswahl, ab M6 aus der Uhrzeit
  now: Date; // für das Alter der Kinder
};

// Alter in vollen Jahren, so wie `ageMin` und `ageMax` einer Aktivität gemeint sind:
// Ein Kind mit 2 Jahren und 11 Monaten zählt als 2.
export function getAgeInYears(child: SuggestionChild, now: Date): number {
  return Math.floor(getAgeInMonths(child, now) / 12);
}
