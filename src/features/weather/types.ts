// Die Wetterdaten, wie die App sie aufbewahrt: bewusst klein, nur was wir brauchen.
// Alle Zeiten sind Millisekunden seit 1970 (`Date.getTime()`), damit sie sich einfach speichern lassen.

import type { Place } from './location';

// Wetterzustand laut Bright Sky. `null` = keine Angabe.
export const brightSkyConditions = [
  'dry',
  'fog',
  'rain',
  'sleet',
  'snow',
  'hail',
  'thunderstorm',
] as const;
export type BrightSkyCondition = (typeof brightSkyConditions)[number];

// Ein Messwert (jetzt) oder eine Stunde der Vorhersage.
export type WeatherRecord = {
  time: number;
  condition: BrightSkyCondition | null;
  icon: string | null; // z. B. 'clear-day', 'partly-cloudy-night', 'cloudy'
  cloudCover: number | null; // Prozent
  precipitation: number | null; // Niederschlag in Millimetern pro Stunde
  temperature: number | null; // °C
};

// Art einer amtlichen Warnung, die draußen ausschließt.
export type WarningKind = 'thunderstorm' | 'storm' | 'severe';

export type DangerAlert = {
  kind: WarningKind;
  onset: number; // erwarteter Beginn
  expires: number | null; // erwartetes Ende, `null` = offen
};

// Alles, was ein Abruf bei Bright Sky ergibt. Das wird 30 Minuten zwischengespeichert.
export type WeatherData = {
  fetchedAt: number;
  place: Place; // schon gerundet
  current: WeatherRecord | null;
  forecast: WeatherRecord[]; // stündlich, nach Zeit sortiert
  alerts: DangerAlert[];
};
