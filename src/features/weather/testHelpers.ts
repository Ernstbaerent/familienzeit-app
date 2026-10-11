// Nur für die Tests (*.test.ts): baut Wetterdaten mit sinnvollen Standardwerten.
// So steht in jedem Test nur das, worauf es ankommt.

import type { DangerAlert, WeatherData, WeatherRecord } from './types';

// Fester „Jetzt“-Zeitpunkt (UTC), damit die Tests immer gleich laufen. 13:30 Uhr UTC.
export const testNow = new Date(Date.UTC(2026, 9, 10, 13, 30));

const hourMs = 3_600_000;

// Eine volle Stunde relativ zu 13:00 UTC: hourAt(1) = 14:00, hourAt(-1) = 12:00.
export function hourAt(offsetHours: number): number {
  return Date.UTC(2026, 9, 10, 13) + offsetHours * hourMs;
}

// Ein Wert mit Standard „trocken, bewölkt, 12 °C“. `time` ist Pflicht.
export function makeRecord(overrides: Partial<WeatherRecord> & Pick<WeatherRecord, 'time'>): WeatherRecord {
  return {
    condition: 'dry',
    icon: 'cloudy',
    cloudCover: 90,
    precipitation: 0,
    temperature: 12,
    ...overrides,
  };
}

export function makeAlert(overrides: Partial<DangerAlert> = {}): DangerAlert {
  return { kind: 'thunderstorm', onset: hourAt(1), expires: hourAt(4), ...overrides };
}

// Wetterdaten, abgerufen um `testNow`. `current` ist standardmäßig ein trockener, bewölkter Messwert.
export function makeData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    fetchedAt: testNow.getTime(),
    place: { lat: 50.66, lon: 12.19 },
    current: makeRecord({ time: testNow.getTime() }),
    forecast: [],
    alerts: [],
    ...overrides,
  };
}
