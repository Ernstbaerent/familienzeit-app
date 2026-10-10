// Die Auswahl auf „Was machen wir?“ und ihre Übergabe an den Ergebnis-Bildschirm.
// Die Auswahl reist als Parameter in der Bildschirm-Adresse mit. Das bleibt alles auf dem Gerät.

import { isDayPart, type DayPart } from '../activities/activities';
import {
  getMinutes,
  isParentEnergy,
  isTimeKey,
  isWeather,
  type ParentEnergy,
  type TimeKey,
  type Weather,
} from './conditions';
import type { SuggestionChild, SuggestionRequest } from './request';

export type Selection = {
  childIds: string[]; // mindestens ein Kind
  time: TimeKey;
  parentEnergy?: ParentEnergy;
  weather: Weather; // TEST (M6): kommt dann vom echten Wetter
  dayPart: DayPart; // TEST (M6): kommt dann aus der Uhrzeit
};

export type SelectionParams = {
  children: string; // IDs mit Komma getrennt
  time: string;
  energy?: string;
  weather: string; // TEST (M6)
  dayPart: string; // TEST (M6)
};

export function toSelectionParams(selection: Selection): SelectionParams {
  return {
    children: selection.childIds.join(','),
    time: selection.time,
    ...(selection.parentEnergy ? { energy: selection.parentEnergy } : {}),
    weather: selection.weather,
    dayPart: selection.dayPart,
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
  const dayPart = single(raw.dayPart);

  if (childIds.length === 0 || !isTimeKey(time) || !isWeather(weather) || !isDayPart(dayPart)) {
    return null;
  }
  if (energy !== undefined && !isParentEnergy(energy)) return null;

  return { childIds, time, parentEnergy: energy, weather, dayPart };
}

// Baut aus der Auswahl die Anfrage für suggest(). Kinder, die es nicht mehr gibt, fallen weg.
export function toSuggestionRequest(
  selection: Selection,
  profiles: readonly (SuggestionChild & { id: string })[],
  now: Date,
): SuggestionRequest {
  return {
    children: profiles.filter((child) => selection.childIds.includes(child.id)),
    availableMinutes: getMinutes(selection.time),
    parentEnergy: selection.parentEnergy,
    weather: selection.weather,
    dayPart: selection.dayPart,
    now,
  };
}
