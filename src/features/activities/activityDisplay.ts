// Hilfen, um eine Aktivität anzuzeigen (ohne UI): Text in der App-Sprache und Dauer.

import type { Activity, ActivityText } from './activities';

// Text in der gewünschten Sprache. Fehlt sie, Englisch (Ausweichsprache der App), dann Deutsch.
// Deutsch und Englisch sind bei jeder Aktivität Pflicht (activities.ts), also gibt es immer einen Text.
export function getActivityText(activity: Activity, language: string): ActivityText {
  return activity.translations[language] ?? activity.translations.en ?? activity.translations.de;
}

export type DurationDisplay =
  | { unit: 'minutes'; min: number; max: number }
  | { unit: 'hours'; min: number; max: number };

// Ab dieser Länge zeigen wir Stunden statt Minuten („2–3 Std.“ statt „120–180 Min.“).
const hoursFromMinutes = 120;

// Dauer zum Anzeigen. Unter 2 Stunden in Minuten, sonst in Stunden (auf halbe Stunden gerundet).
// Sind beide Werte gleich, zeigt die Oberfläche nur einen.
export function getDurationDisplay(
  activity: Pick<Activity, 'durationMin' | 'durationMax'>,
): DurationDisplay {
  const { durationMin, durationMax } = activity;
  if (durationMax < hoursFromMinutes) {
    return { unit: 'minutes', min: durationMin, max: durationMax };
  }
  const toHalfHours = (minutes: number) => Math.max(0.5, Math.round(minutes / 30) / 2);
  return { unit: 'hours', min: toHalfHours(durationMin), max: toHalfHours(durationMax) };
}
