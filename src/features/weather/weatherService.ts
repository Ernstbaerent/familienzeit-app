// Der Ablauf „Wetter besorgen“: Erlaubnis lesen → Standort → Zwischenspeicher → Abruf → Ausweichen.
// Ohne UI (kein React), damit der Ablauf an einer Stelle steht. Die Teile darin sind einzeln getestet.

import { fetchWeatherData } from './fetchWeather';
import { getRoundedPlace, readPermission, type LocationPermission } from './getLocation';
import { getCacheState } from './weatherCache';
import { loadLocationDeclined, loadWeatherData, saveWeatherData } from './weatherStorage';
import type { WeatherData } from './types';

// Wie es um den Standort steht (für die Oberfläche):
// ask = noch nicht gefragt (Erklär-Karte zeigen), declined = „selbst wählen“ gewählt,
// denied = vom Handy abgelehnt, blocked = abgelehnt und nur über die Einstellungen änderbar, granted = erlaubt
export type LocationAccess = 'ask' | 'declined' | 'denied' | 'blocked' | 'granted';

export type WeatherResult =
  | { kind: 'ready'; access: 'granted'; data: WeatherData; stale: boolean }
  // Kein Wetter vom Deutschen Wetterdienst: Die App fragt dann „Wie ist das Wetter?“.
  | { kind: 'unavailable'; access: LocationAccess };

export async function readAccess(permission?: LocationPermission): Promise<LocationAccess> {
  const current = permission ?? (await readPermission());
  if (current === 'granted' || current === 'denied' || current === 'blocked') return current;
  return (await loadLocationDeclined()) ? 'declined' : 'ask';
}

// Besorgt das Wetter. Fragt NIE nach der Erlaubnis (das passiert nur nach der Erklärung, siehe
// WeatherProvider.allowLocation) und wirft nie einen Fehler.
//  1. Ohne Erlaubnis: nichts, und gespeicherte Daten werden gelöscht.
//  2. Gespeicherte Daten unter 30 Minuten (für denselben Ort): benutzen, kein Abruf.
//  3. Sonst abrufen und speichern.
//  4. Klappt der Abruf nicht: gespeicherte Daten bis 3 Stunden benutzen (`stale`), sonst nichts.
export async function resolveWeather(now: Date = new Date()): Promise<WeatherResult> {
  const access = await readAccess();
  if (access !== 'granted') {
    await saveWeatherData(null).catch(() => undefined);
    return { kind: 'unavailable', access };
  }

  const cached = await loadWeatherData();
  const place = await getRoundedPlace();
  const state = getCacheState(cached, place, now.getTime());
  if (cached && state === 'fresh') return { kind: 'ready', access, data: cached, stale: false };

  if (place) {
    try {
      const data = await fetchWeatherData(place, now);
      await saveWeatherData(data).catch(() => undefined); // Speichern ist nur ein Bonus
      return { kind: 'ready', access, data, stale: false };
    } catch {
      // Kein Internet, Server down oder Ort außerhalb von Deutschland: weiter mit dem Zwischenspeicher
    }
  }

  if (cached && state === 'stale') return { kind: 'ready', access, data: cached, stale: true };
  return { kind: 'unavailable', access };
}
