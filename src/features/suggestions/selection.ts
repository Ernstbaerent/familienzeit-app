// Die Auswahl auf „Was machen wir?“ und ihre Übergabe an den Ergebnis-Bildschirm.
// Die Auswahl reist als Parameter in der Bildschirm-Adresse mit. Das bleibt alles auf dem Gerät.

import {
  getDayPart,
  getMinutes,
  isParentEnergy,
  isTimeKey,
  isWeather,
  type ParentEnergy,
  type TimeKey,
  type Weather,
} from './conditions';
import type { SuggestionChild, SuggestionRequest, WeatherConditions } from './request';

export type Selection = {
  childIds: string[]; // mindestens ein Kind
  time: TimeKey;
  parentEnergy?: ParentEnergy;
  // Wetter von Hand gewählt („Wie ist das Wetter?“). Fehlt es, gilt das Wetter vom Deutschen Wetterdienst.
  weather?: Weather;
};

export type SelectionParams = {
  children: string; // IDs mit Komma getrennt
  time: string;
  energy?: string;
  weather?: string;
};

export function toSelectionParams(selection: Selection): SelectionParams {
  return {
    children: selection.childIds.join(','),
    time: selection.time,
    ...(selection.parentEnergy ? { energy: selection.parentEnergy } : {}),
    ...(selection.weather ? { weather: selection.weather } : {}),
  };
}

type RawParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Liest die Parameter wieder ein. Fehlt etwas oder ist es unbekannt (z. B. alter Link), kommt `null`.
export function parseSelectionParams(raw: RawParams): Selection | null {
  const childIds = (single(raw.children) ?? '').split(',').filter((id) => id !== '');
  const time = single(raw.time);
  const energy = single(raw.energy);
  const weather = single(raw.weather);

  if (childIds.length === 0 || !isTimeKey(time)) return null;
  if (energy !== undefined && !isParentEnergy(energy)) return null;
  if (weather !== undefined && !isWeather(weather)) return null;

  return { childIds, time, parentEnergy: energy, weather };
}

// Baut aus der Auswahl die Anfrage für suggest(). Kinder, die es nicht mehr gibt, fallen weg.
// Das Wetter kommt getrennt herein (siehe src/features/weather), die Tageszeit aus der Uhrzeit.
// Der Verlauf (freiwillig) ändert nur die Reihenfolge (siehe docs/history.md).
export function toSuggestionRequest(
  selection: Selection,
  profiles: readonly (SuggestionChild & { id: string })[],
  now: Date,
  conditions: WeatherConditions,
  history?: SuggestionRequest['history'],
): SuggestionRequest {
  return {
    children: profiles.filter((child) => selection.childIds.includes(child.id)),
    availableMinutes: getMinutes(selection.time),
    parentEnergy: selection.parentEnergy,
    weather: conditions.weather,
    temperature: conditions.temperature,
    severeWarning: conditions.severeWarning,
    dayPart: getDayPart(now),
    now,
    history,
  };
}
