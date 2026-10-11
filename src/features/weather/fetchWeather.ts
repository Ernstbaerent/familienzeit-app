// Der Abruf bei Bright Sky. Das ist die einzige Stelle in der App, die Wetterdaten aus dem Internet holt.
// Geht etwas schief (kein Internet, Server down, Ort außerhalb von Deutschland), wird ein Fehler geworfen;
// der Aufrufer weicht dann auf den Zwischenspeicher oder die Auswahl von Hand aus.

import { buildUrls, parseAlerts, parseCurrent, parseForecast } from './brightSky';
import { roundPlace, type Place } from './location';
import type { WeatherData } from './types';

// So lange warten wir höchstens auf eine Antwort. Danach gilt: nicht verfügbar.
export const requestTimeoutMs = 8000;

type FetchFunction = typeof fetch;

async function getJson(url: string, fetchFunction: FetchFunction): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetchFunction(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Bright Sky antwortet mit ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Holt aktuelles Wetter, Vorhersage und Warnungen gleichzeitig.
// Mindestens Wetter oder Vorhersage muss klappen. Fehlen nur die Warnungen, geht es ohne sie weiter:
// Dann gilt wie sonst auch, dass nur die Wetterlage entscheidet.
export async function fetchWeatherData(
  place: Place,
  now: Date,
  fetchFunction: FetchFunction = fetch,
): Promise<WeatherData> {
  const urls = buildUrls(place, now);
  const [current, forecast, alerts] = await Promise.allSettled([
    getJson(urls.current, fetchFunction),
    getJson(urls.forecast, fetchFunction),
    getJson(urls.alerts, fetchFunction),
  ]);

  const data: WeatherData = {
    fetchedAt: now.getTime(),
    place: roundPlace(place), // nur der gerundete Ort wird gespeichert
    current: current.status === 'fulfilled' ? parseCurrent(current.value) : null,
    forecast: forecast.status === 'fulfilled' ? parseForecast(forecast.value) : [],
    alerts: alerts.status === 'fulfilled' ? parseAlerts(alerts.value) : [],
  };

  if (data.current === null && data.forecast.length === 0) {
    throw new Error('Bright Sky hat keine Wetterdaten geliefert.');
  }
  return data;
}
