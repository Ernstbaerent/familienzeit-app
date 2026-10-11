// Alles, was die Vorschlagslogik über die heutige Situation wissen muss.

import type { DayPart, MonthNumber } from '../activities/activities';
import type { HistoryEntry } from '../history/history';
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
  weather: Weather; // Wetterlage in der gewählten Zeitspanne (schlimmster Wert)
  // Temperatur in °C in der Zeitspanne. Fehlt sie (z. B. Wetter von Hand gewählt), wird sie nicht gewichtet.
  temperature?: { min: number; max: number };
  // Amtliche Warnung vor Gewitter, Sturm oder Unwetter gilt in der Zeitspanne: draußen ist dann ausgeschlossen.
  severeWarning?: boolean;
  dayPart: DayPart; // kommt aus der Uhrzeit (`getDayPart`)
  now: Date; // für das Alter der Kinder, den Monat (`months` einer Aktivität) und die Tage im Verlauf
  // Was die Familie schon gemacht hat (freiwillig, fehlt = nichts bekannt). Ändert nur die Reihenfolge:
  // Der Verlauf schließt nie eine Aktivität aus (siehe scoring.ts, `weights.history`).
  history?: readonly HistoryEntry[];
};

// Der Teil der Anfrage, den die Wetter-Funktionen (src/features/weather) liefern.
export type WeatherConditions = Pick<SuggestionRequest, 'weather' | 'temperature' | 'severeWarning'>;

// Alter in vollen Jahren, so wie `ageMin` und `ageMax` einer Aktivität gemeint sind:
// Ein Kind mit 2 Jahren und 11 Monaten zählt als 2.
export function getAgeInYears(child: SuggestionChild, now: Date): number {
  return Math.floor(getAgeInMonths(child, now) / 12);
}

// Monat als Zahl wie bei `months` einer Aktivität: 1 = Januar … 12 = Dezember.
export function getMonthNumber(date: Date): MonthNumber {
  return (date.getMonth() + 1) as MonthNumber;
}
