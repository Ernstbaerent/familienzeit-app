// Zwischenspeicher für die Wetterdaten: Regeln, wann gespeicherte Daten noch gelten.
// Reine Funktionen. Das Lesen und Schreiben auf dem Gerät steht in weatherStorage.ts.

import { isSamePlace, type Place } from './location';
import type { DangerAlert, WeatherData, WeatherRecord } from './types';
import { brightSkyConditions } from './types';

// So lange gelten Daten ohne neuen Abruf: Bei jedem Antippen neu abzufragen wäre unnötig.
export const freshMinutes = 30;

// So alt dürfen Daten höchstens sein, wenn sich gerade nichts Neues holen lässt (kein Internet).
// Danach fragt die App das Wetter lieber von Hand ab, als mit einer alten Wetterlage zu raten.
export const offlineMaxMinutes = 180;

// fresh = ohne Abruf benutzen, stale = nur benutzen, wenn ein Abruf nicht klappt, unusable = nicht benutzen
export type CacheState = 'fresh' | 'stale' | 'unusable';

// Ist `place` bekannt, muss der Zwischenspeicher zum selben (gerundeten) Ort gehören.
// Ist er unbekannt (Standort gerade nicht bestimmbar), gilt der gespeicherte Ort weiter.
export function getCacheState(data: WeatherData | null, place: Place | null, now: number): CacheState {
  if (!data) return 'unusable';
  if (place && !isSamePlace(place, data.place)) return 'unusable';
  const ageMinutes = (now - data.fetchedAt) / 60_000;
  if (ageMinutes < 0) return 'unusable'; // Uhr des Handys wurde zurückgestellt: lieber neu holen
  if (ageMinutes < freshMinutes) return 'fresh';
  if (ageMinutes <= offlineMaxMinutes) return 'stale';
  return 'unusable';
}

// --- Prüfen, was vom Gerät gelesen wurde (kann alt, kaputt oder von Hand verändert sein) ---

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isRecord(value: unknown): value is WeatherRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.time === 'number' &&
    Number.isFinite(record.time) &&
    (record.condition === null ||
      (brightSkyConditions as readonly unknown[]).includes(record.condition)) &&
    (record.icon === null || typeof record.icon === 'string') &&
    isNumberOrNull(record.cloudCover) &&
    isNumberOrNull(record.precipitation) &&
    isNumberOrNull(record.temperature)
  );
}

function isAlert(value: unknown): value is DangerAlert {
  if (typeof value !== 'object' || value === null) return false;
  const alert = value as Record<string, unknown>;
  return (
    (alert.kind === 'thunderstorm' || alert.kind === 'storm' || alert.kind === 'severe') &&
    typeof alert.onset === 'number' &&
    Number.isFinite(alert.onset) &&
    isNumberOrNull(alert.expires)
  );
}

// Gibt die Daten zurück, wenn alles stimmt, sonst `null` (dann wird neu abgefragt).
export function parseStoredWeatherData(raw: unknown): WeatherData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const place = data.place as Record<string, unknown> | null;
  if (
    typeof data.fetchedAt !== 'number' ||
    !Number.isFinite(data.fetchedAt) ||
    typeof place !== 'object' ||
    place === null ||
    typeof place.lat !== 'number' ||
    typeof place.lon !== 'number' ||
    !(data.current === null || isRecord(data.current)) ||
    !Array.isArray(data.forecast) ||
    !data.forecast.every(isRecord) ||
    !Array.isArray(data.alerts) ||
    !data.alerts.every(isAlert)
  ) {
    return null;
  }
  return data as unknown as WeatherData;
}
