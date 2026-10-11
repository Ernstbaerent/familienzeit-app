// Aus den Wetterdaten (Bright Sky) wird die Wetterlage für die Vorschläge.
// Reine Funktionen ohne Internet und ohne UI. Tests: situation.test.ts.
//
// Die Regeln stehen in docs/weather.md. Alle Zahlen dazu sind hier oben als Konstanten,
// damit man sie leicht nachjustieren kann.

import type { Weather } from '../suggestions/conditions';
import type { WeatherConditions } from '../suggestions/request';
import type { DangerAlert, WarningKind, WeatherData, WeatherRecord } from './types';

// Das Fenster, in dem das Wetter zählt: die gewählte Zeit, aber mindestens 2 Stunden.
// So zählt auch Regen, der kurz nach einer kurzen Aktivität kommt (Vorlauf, Rückweg, Vorhersage-Unsicherheit).
export const minLookaheadMinutes = 120;

// Regen (und Schneeregen) zählt erst ab dieser Menge pro Stunde. Darunter ist es Nieselregen,
// und der soll nicht alles blockieren, was trocken sein muss. 0,3 mm/h = „wenige Zehntel Millimeter“.
// Gewitter, Hagel und Schnee zählen immer, egal wie wenig.
export const rainMinMmPerHour = 0.3;

// Bis zu dieser Bewölkung (Prozent) gilt ein Tag als sonnig.
export const sunnyMaxCloudCover = 50;

export function getWindowMinutes(availableMinutes: number): number {
  return Math.max(availableMinutes, minLookaheadMinutes);
}

// Was die Anzeige und die Vorschläge über das Wetter wissen müssen.
export type WeatherSituation = {
  weather: Weather; // zählt für die Vorschläge: der schlimmste Wert im Fenster
  current: Weather; // wie es jetzt ist (für die Anzeige)
  // Wird es im Fenster schlimmer als jetzt, ab wann (z. B. „Regen ab 15 Uhr“).
  change?: { weather: Weather; from: Date };
  temperature?: { min: number; max: number; now: number }; // °C im Fenster
  // Amtliche Warnung im Fenster, die draußen ausschließt.
  warning?: { kind: WarningKind; from: Date; until: Date | null };
  // dwd = Bright Sky, manual = von Hand gewählt, assumed = nichts bekannt (neutral bewölkt)
  source: 'dwd' | 'manual' | 'assumed';
  // true, wenn Daten vom Deutschen Wetterdienst in der Situation stecken (auch bei Handwahl:
  // Warnung und Temperatur gelten dann weiter). Dann steht dort die Quellenangabe.
  hasDwdData: boolean;
  asOf?: Date; // Stand der Daten
  stale: boolean; // Daten älter als 30 Minuten, weil sie sich gerade nicht aktualisieren lassen
};

// Wie schlimm eine Wetterlage für draußen ist. Sonne und Wolken sind beide „in Ordnung“.
const trouble: Record<Weather, number> = { sunny: 0, cloudy: 0, snow: 2, rain: 3, thunderstorm: 4 };

// --- Ein Messwert oder eine Stunde einordnen ---

function sky(record: WeatherRecord): 'sunny' | 'cloudy' {
  if (record.condition === 'fog') return 'cloudy';
  if (record.icon?.endsWith('-night')) return 'cloudy'; // nachts gibt es keine Sonne
  if (record.cloudCover !== null) return record.cloudCover <= sunnyMaxCloudCover ? 'sunny' : 'cloudy';
  return record.icon === 'clear-day' || record.icon === 'partly-cloudy-day' ? 'sunny' : 'cloudy';
}

// Weiß man die Menge nicht, glauben wir dem Wetterzustand.
function countsAsRain(record: WeatherRecord): boolean {
  return record.precipitation === null || record.precipitation >= rainMinMmPerHour;
}

export function classifyRecord(record: WeatherRecord): Weather {
  switch (record.condition) {
    case 'thunderstorm':
    case 'hail': // Hagel ist gefährlich draußen, deshalb wie Gewitter
      return 'thunderstorm';
    case 'snow':
      return 'snow';
    case 'rain':
    case 'sleet': // Schneeregen ist nass wie Regen
      if (countsAsRain(record)) return 'rain';
      break; // zu wenig: Nieselregen, zählt wie trocken
  }
  return sky(record);
}

// --- Die Situation für ein Fenster ---

const warningRank: Record<WarningKind, number> = { thunderstorm: 3, storm: 2, severe: 1 };

// Die wichtigste Warnung, die sich mit dem Fenster überschneidet (Gewitter vor Sturm vor Unwetter).
function pickWarning(alerts: DangerAlert[], start: number, end: number): WeatherSituation['warning'] {
  const active = alerts
    .filter((alert) => alert.onset <= end && (alert.expires === null || alert.expires >= start))
    .sort((a, b) => warningRank[b.kind] - warningRank[a.kind] || a.onset - b.onset);
  const first = active[0];
  if (!first) return undefined;
  return {
    kind: first.kind,
    from: new Date(first.onset),
    until: first.expires === null ? null : new Date(first.expires),
  };
}

// Baut die Wetterlage für „jetzt bis jetzt + Fenster“ (siehe getWindowMinutes).
// Betrachtet werden das aktuelle Wetter und die Stundenwerte nach jetzt bis zum Ende des Fensters.
// Gibt `null` zurück, wenn die Daten gar nichts für diese Zeit enthalten.
export function buildSituation(
  data: WeatherData,
  availableMinutes: number,
  now: Date,
  options: { stale?: boolean } = {},
): WeatherSituation | null {
  const start = now.getTime();
  const end = start + getWindowMinutes(availableMinutes) * 60_000;

  const future = data.forecast.filter((record) => record.time > start && record.time <= end);
  // „Jetzt“: der Messwert, sonst die letzte Stunde der Vorhersage vor jetzt.
  const past = data.forecast.filter((record) => record.time <= start);
  const nowRecord = data.current ?? past[past.length - 1] ?? null;
  const records = nowRecord ? [nowRecord, ...future] : future;
  if (records.length === 0) return null;

  const classes = records.map(classifyRecord);
  const current = classes[0];

  // Regen, Gewitter und Schnee: der schlimmste Wert gewinnt. Sonst entscheidet, ob es überwiegend sonnig ist.
  const worstTrouble = Math.max(...classes.map((weather) => trouble[weather]));
  let weather: Weather;
  if (worstTrouble >= trouble.snow) {
    weather = classes.find((candidate) => trouble[candidate] === worstTrouble) ?? current;
  } else {
    const sunnyCount = classes.filter((candidate) => candidate === 'sunny').length;
    weather = sunnyCount > classes.length / 2 ? 'sunny' : 'cloudy';
  }

  // Wird es später schlimmer als jetzt? Dann merken, ab wann.
  let change: WeatherSituation['change'];
  if (trouble[weather] > trouble[current]) {
    const index = classes.findIndex((candidate, i) => i > 0 && candidate === weather);
    if (index > 0) change = { weather, from: new Date(records[index].time) };
  }

  const temperatures = records
    .map((record) => record.temperature)
    .filter((value): value is number => value !== null);
  const nowTemperature = nowRecord?.temperature ?? temperatures[0];
  const temperature =
    temperatures.length > 0 && nowTemperature !== undefined
      ? { min: Math.min(...temperatures), max: Math.max(...temperatures), now: nowTemperature }
      : undefined;

  return {
    weather,
    current,
    change,
    temperature,
    warning: pickWarning(data.alerts, start, end),
    source: 'dwd',
    hasDwdData: true,
    asOf: new Date(data.fetchedAt),
    stale: options.stale ?? false,
  };
}

// Wetter von Hand überschreiben (Auswahl „Wie ist das Wetter?“).
// Amtliche Warnungen und die Temperatur bleiben, wenn es sie gibt: Sicherheit wird nie aufgeweicht.
export function manualSituation(weather: Weather, base: WeatherSituation | null): WeatherSituation {
  return {
    weather,
    current: weather,
    temperature: base?.temperature,
    warning: base?.warning,
    source: 'manual',
    hasDwdData: base?.hasDwdData ?? false,
    asOf: base?.asOf,
    stale: base?.stale ?? false,
  };
}

// Nichts bekannt (kein Standort, kein Internet, keine Handwahl): neutral „bewölkt“ annehmen.
export function assumedSituation(): WeatherSituation {
  return { weather: 'cloudy', current: 'cloudy', source: 'assumed', hasDwdData: false, stale: false };
}

// Der Teil, den die Vorschlagslogik braucht (siehe SuggestionRequest).
export function toConditions(situation: WeatherSituation): WeatherConditions {
  return {
    weather: situation.weather,
    temperature: situation.temperature && {
      min: situation.temperature.min,
      max: situation.temperature.max,
    },
    severeWarning: situation.warning !== undefined,
  };
}
