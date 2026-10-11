import { fetchWeatherData } from './fetchWeather';
import { testNow } from './testHelpers';

const currentJson = {
  weather: { timestamp: '2026-10-10T13:20:00+00:00', condition: 'dry', icon: 'cloudy', cloud_cover: 80, precipitation_60: 0, temperature: 12 },
};
const forecastJson = {
  weather: [{ timestamp: '2026-10-10T14:00:00+00:00', condition: 'dry', icon: 'cloudy', cloud_cover: 80, precipitation: 0, temperature: 12 }],
};
const alertsJson = { alerts: [] };

// Ein falsches `fetch`, das die Adressen mitschreibt und nach Adresse antwortet.
function fakeFetch(answers: { current?: unknown; forecast?: unknown; alerts?: unknown }) {
  const urls: string[] = [];
  const fetchFunction = (async (input: unknown) => {
    const url = String(input);
    urls.push(url);
    const key = url.includes('current_weather') ? 'current' : url.includes('/alerts') ? 'alerts' : 'forecast';
    const answer = answers[key];
    if (answer === undefined) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => answer };
  }) as unknown as typeof fetch;
  return { fetchFunction, urls };
}

describe('Wetter abrufen', () => {
  it('holt alles und gibt gerundeten Ort und Abrufzeit mit', async () => {
    const { fetchFunction, urls } = fakeFetch({ current: currentJson, forecast: forecastJson, alerts: alertsJson });
    const data = await fetchWeatherData({ lat: 50.66491, lon: 12.19449 }, testNow, fetchFunction);
    expect(urls).toHaveLength(3);
    expect(data.place).toEqual({ lat: 50.66, lon: 12.19 });
    expect(data.fetchedAt).toBe(testNow.getTime());
    expect(data.current?.temperature).toBe(12);
    expect(data.forecast).toHaveLength(1);
    expect(data.alerts).toEqual([]);
  });

  it('Datenschutz: in keiner Anfrage steht ein genauerer Ort als 2 Nachkommastellen', async () => {
    const { fetchFunction, urls } = fakeFetch({ current: currentJson, forecast: forecastJson, alerts: alertsJson });
    await fetchWeatherData({ lat: 50.664912345, lon: 12.194498765 }, testNow, fetchFunction);
    expect(urls).toHaveLength(3);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/api\.brightsky\.dev\//);
      const lat = /lat=(-?[\d.]+)/.exec(url)?.[1] ?? '';
      const lon = /lon=(-?[\d.]+)/.exec(url)?.[1] ?? '';
      expect(lat.split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
      expect(lon.split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
    }
  });

  it('Klappen nur die Warnungen nicht, geht es ohne sie weiter', async () => {
    const { fetchFunction } = fakeFetch({ current: currentJson, forecast: forecastJson });
    const data = await fetchWeatherData({ lat: 50.66, lon: 12.19 }, testNow, fetchFunction);
    expect(data.alerts).toEqual([]);
    expect(data.current).not.toBeNull();
  });

  it('Klappt nur die Vorhersage, reicht das auch', async () => {
    const { fetchFunction } = fakeFetch({ forecast: forecastJson });
    const data = await fetchWeatherData({ lat: 50.66, lon: 12.19 }, testNow, fetchFunction);
    expect(data.current).toBeNull();
    expect(data.forecast).toHaveLength(1);
  });

  it('Klappt nichts, gibt es einen Fehler (dann: Zwischenspeicher oder Handwahl)', async () => {
    const { fetchFunction } = fakeFetch({ alerts: alertsJson });
    await expect(fetchWeatherData({ lat: 50.66, lon: 12.19 }, testNow, fetchFunction)).rejects.toThrow();
  });

  it('Kein Internet (fetch wirft): Fehler', async () => {
    const offline = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(fetchWeatherData({ lat: 50.66, lon: 12.19 }, testNow, offline)).rejects.toThrow();
  });

  it('Antwort ohne brauchbare Daten (z. B. Ort außerhalb von Deutschland): Fehler', async () => {
    const { fetchFunction } = fakeFetch({ current: {}, forecast: { weather: [] }, alerts: alertsJson });
    await expect(fetchWeatherData({ lat: 50.66, lon: 12.19 }, testNow, fetchFunction)).rejects.toThrow();
  });
});
