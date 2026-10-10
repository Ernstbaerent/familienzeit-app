// Eingaben für die Vorschläge: verfügbare Zeit, Energie der Eltern, Wetter und Tageszeit.
// Nur Schlüssel und Zahlen. Die Texte stehen in den Übersetzungen (src/locales).

import type { DayPart } from '../activities/activities';

// Auswahl „Wie viel Zeit habt ihr?“. Ein halber Tag zählt als 4 Stunden.
export const timeOptions = [
  { key: 'minutes30', minutes: 30 },
  { key: 'hour1', minutes: 60 },
  { key: 'hours2', minutes: 120 },
  { key: 'halfDay', minutes: 240 },
] as const;

export type TimeKey = (typeof timeOptions)[number]['key'];

export const timeKeys = timeOptions.map((option) => option.key);

// Längste wählbare Zeit in Minuten (halber Tag).
export const longestMinutes = Math.max(...timeOptions.map((option) => option.minutes));

export function getMinutes(time: TimeKey): number {
  return timeOptions.find((option) => option.key === time)?.minutes ?? 0;
}

// Energie der Eltern (freiwillig). Nicht verwechseln mit `energy` einer Aktivität (low/medium/high),
// das ist die Energie, die eine Aktivität braucht.
export const parentEnergyKeys = ['tired', 'normal', 'fit'] as const;
export type ParentEnergy = (typeof parentEnergyKeys)[number];

// Wetter. In M5 aus der Test-Auswahl, ab M6 aus Bright Sky.
export const weatherKeys = ['sunny', 'cloudy', 'rain', 'thunderstorm'] as const;
export type Weather = (typeof weatherKeys)[number];

// Uhrzeit-Grenzen der Tageszeiten (`dayParts` einer Aktivität):
// Morgen 5:00–11:59, Nachmittag 12:00–16:59, Abend 17:00–4:59.
const morningStartHour = 5;
const afternoonStartHour = 12;
const eveningStartHour = 17;

export function getDayPart(date: Date): DayPart {
  const hour = date.getHours();
  if (hour >= morningStartHour && hour < afternoonStartHour) return 'morning';
  if (hour >= afternoonStartHour && hour < eveningStartHour) return 'afternoon';
  return 'evening';
}

export function isTimeKey(value: unknown): value is TimeKey {
  return (timeKeys as readonly unknown[]).includes(value);
}

export function isParentEnergy(value: unknown): value is ParentEnergy {
  return (parentEnergyKeys as readonly unknown[]).includes(value);
}

export function isWeather(value: unknown): value is Weather {
  return (weatherKeys as readonly unknown[]).includes(value);
}
