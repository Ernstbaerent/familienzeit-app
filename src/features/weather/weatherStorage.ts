// Wetterdaten und Standort-Entscheidung auf dem Gerät (AsyncStorage). Nichts davon verlässt das Handy.
// Gespeichert wird nur der auf ~1 km gerundete Ort.

import { loadJson, saveJson } from '@/lib/storage';

import { parseStoredWeatherData } from './weatherCache';
import type { WeatherData } from './types';

const weatherKey = 'weather.v1';
const declinedKey = 'weather.locationDeclined.v1';

// Gibt `null` zurück, wenn nichts oder etwas Kaputtes gespeichert ist.
export async function loadWeatherData(): Promise<WeatherData | null> {
  return parseStoredWeatherData(await loadJson(weatherKey));
}

export async function saveWeatherData(data: WeatherData | null): Promise<void> {
  await saveJson(weatherKey, data);
}

// „Wetter selbst wählen“ auf der Erklär-Karte: Dann fragt die App nicht bei jedem Besuch wieder nach dem Standort.
export async function loadLocationDeclined(): Promise<boolean> {
  return (await loadJson(declinedKey)) === true;
}

export async function saveLocationDeclined(declined: boolean): Promise<void> {
  await saveJson(declinedKey, declined);
}
