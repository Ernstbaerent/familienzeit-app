// Der Ablauf „Wetter besorgen“ mit falschem Standort, falschem Speicher und falschem Internet.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeData, testNow } from './testHelpers';
import { readAccess, resolveWeather } from './weatherService';
import { saveLocationDeclined } from './weatherStorage';

const mockLocation = {
  permission: { granted: true, status: 'granted', canAskAgain: true } as Record<string, unknown>,
  servicesEnabled: true,
  // Absichtlich sehr genau: Die App darf davon nur den gerundeten Wert weitergeben oder speichern.
  position: { coords: { latitude: 50.664912345, longitude: 12.194498765 } } as unknown,
  // Wie oft die App das Handy aufgefordert hat, den Erlaubnis-Dialog zu zeigen.
  dialogRequests: 0,
};

jest.mock('expo-location', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined', GRANTED: 'granted', DENIED: 'denied' },
  Accuracy: { Low: 2 },
  getForegroundPermissionsAsync: async () => mockLocation.permission,
  requestForegroundPermissionsAsync: async () => {
    mockLocation.dialogRequests += 1;
    return mockLocation.permission;
  },
  hasServicesEnabledAsync: async () => mockLocation.servicesEnabled,
  getLastKnownPositionAsync: async () => mockLocation.position,
  getCurrentPositionAsync: async () => mockLocation.position,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const urls: string[] = [];

function stubInternet(works: boolean) {
  (globalThis as { fetch: unknown }).fetch = async (url: string) => {
    urls.push(url);
    if (!works) throw new TypeError('Network request failed');
    if (url.includes('current_weather')) {
      return {
        ok: true,
        json: async () => ({
          weather: {
            timestamp: testNow.toISOString(),
            condition: 'dry',
            icon: 'cloudy',
            cloud_cover: 90,
            precipitation_60: 0,
            temperature: 14,
          },
        }),
      };
    }
    if (url.includes('/alerts')) return { ok: true, json: async () => ({ alerts: [] }) };
    return { ok: true, json: async () => ({ weather: [] }) };
  };
}

async function storedWeather() {
  return JSON.parse((await AsyncStorage.getItem('weather.v1')) ?? 'null');
}

const minutesLater = (minutes: number) => new Date(testNow.getTime() + minutes * 60_000);

beforeEach(async () => {
  await AsyncStorage.clear();
  urls.length = 0;
  mockLocation.permission = { granted: true, status: 'granted', canAskAgain: true };
  mockLocation.servicesEnabled = true;
  mockLocation.dialogRequests = 0;
  stubInternet(true);
});

describe('Standort erlaubt', () => {
  it('holt das Wetter nur mit gerundeten Koordinaten und speichert nur den gerundeten Ort', async () => {
    const result = await resolveWeather(testNow);
    expect(result.kind).toBe('ready');
    expect(urls).toHaveLength(3);
    for (const url of urls) expect(url).toContain('lat=50.66&lon=12.19');

    const stored = await storedWeather();
    expect(stored.place).toEqual({ lat: 50.66, lon: 12.19 });
    expect(JSON.stringify(stored)).not.toMatch(/50\.664|12\.194/);
  });

  it('innerhalb von 30 Minuten kommt es aus dem Zwischenspeicher, ohne neuen Abruf', async () => {
    await resolveWeather(testNow);
    urls.length = 0;
    const again = await resolveWeather(minutesLater(29));
    expect(again).toMatchObject({ kind: 'ready', stale: false });
    expect(urls).toHaveLength(0);
  });

  it('nach 30 Minuten wird neu abgerufen', async () => {
    await resolveWeather(testNow);
    urls.length = 0;
    await resolveWeather(minutesLater(31));
    expect(urls).toHaveLength(3);
  });

  it('an einem anderen Ort wird neu abgerufen', async () => {
    await AsyncStorage.setItem(
      'weather.v1',
      JSON.stringify(makeData({ place: { lat: 48.14, lon: 11.58 } })),
    );
    await resolveWeather(minutesLater(5));
    expect(urls).toHaveLength(3);
  });

  it('ohne Internet: Zwischenspeicher bis 3 Stunden, als veraltet gekennzeichnet', async () => {
    await resolveWeather(testNow);
    stubInternet(false);
    const result = await resolveWeather(minutesLater(60));
    expect(result).toMatchObject({ kind: 'ready', stale: true });
    const atLimit = await resolveWeather(minutesLater(180));
    expect(atLimit).toMatchObject({ kind: 'ready', stale: true });
  });

  it('ohne Internet und älter als 3 Stunden: nicht verfügbar (dann die Auswahl von Hand)', async () => {
    await resolveWeather(testNow);
    stubInternet(false);
    expect(await resolveWeather(minutesLater(181))).toEqual({ kind: 'unavailable', access: 'granted' });
  });

  it('ohne Internet und ohne Zwischenspeicher: nicht verfügbar', async () => {
    stubInternet(false);
    expect(await resolveWeather(testNow)).toEqual({ kind: 'unavailable', access: 'granted' });
  });

  it('Ortung aus: der Zwischenspeicher gilt weiter, sonst nicht verfügbar', async () => {
    await resolveWeather(testNow);
    urls.length = 0;
    mockLocation.servicesEnabled = false;
    expect(await resolveWeather(minutesLater(10))).toMatchObject({ kind: 'ready', stale: false });
    expect(await resolveWeather(minutesLater(90))).toMatchObject({ kind: 'ready', stale: true });
    expect(urls).toHaveLength(0);
    expect(await resolveWeather(minutesLater(200))).toMatchObject({ kind: 'unavailable' });
  });
});

describe('Standort nicht erlaubt', () => {
  it('noch nie gefragt: kein Abruf, die Erklär-Karte kommt', async () => {
    mockLocation.permission = { granted: false, status: 'undetermined', canAskAgain: true };
    expect(await resolveWeather(testNow)).toEqual({ kind: 'unavailable', access: 'ask' });
    expect(urls).toHaveLength(0);
  });

  it('„Wetter selbst wählen“ wird gemerkt', async () => {
    mockLocation.permission = { granted: false, status: 'undetermined', canAskAgain: true };
    await saveLocationDeclined(true);
    expect(await readAccess()).toBe('declined');
    await saveLocationDeclined(false);
    expect(await readAccess()).toBe('ask');
  });

  it('abgelehnt (man kann nochmal fragen) und dauerhaft abgelehnt', async () => {
    mockLocation.permission = { granted: false, status: 'denied', canAskAgain: true };
    expect(await resolveWeather(testNow)).toEqual({ kind: 'unavailable', access: 'denied' });
    mockLocation.permission = { granted: false, status: 'denied', canAskAgain: false };
    expect(await resolveWeather(testNow)).toEqual({ kind: 'unavailable', access: 'blocked' });
    expect(urls).toHaveLength(0);
  });

  it('Vorladen beim Öffnen des Starts fragt nie nach der Erlaubnis (DESIGN.md, Entscheidung 7)', async () => {
    // `resolveWeather` ist das, was der Start beim Öffnen aufruft. Es darf den Dialog des Handys nie auslösen,
    // egal in welchem Zustand die Erlaubnis ist.
    const states = [
      { granted: false, status: 'undetermined', canAskAgain: true },
      { granted: false, status: 'denied', canAskAgain: true },
      { granted: false, status: 'denied', canAskAgain: false },
      { granted: true, status: 'granted', canAskAgain: true },
    ];
    for (const permission of states) {
      mockLocation.permission = permission;
      await resolveWeather(testNow);
      await readAccess();
    }
    expect(mockLocation.dialogRequests).toBe(0);
  });

  it('ohne Erlaubnis geht beim Vorladen weder Standort noch Anfrage nach außen', async () => {
    mockLocation.permission = { granted: false, status: 'undetermined', canAskAgain: true };
    await resolveWeather(testNow);
    expect(urls).toHaveLength(0);
    mockLocation.permission = { granted: false, status: 'denied', canAskAgain: false };
    await resolveWeather(testNow);
    expect(urls).toHaveLength(0);
  });

  it('wird die Erlaubnis zurückgenommen, werden die gespeicherten Wetterdaten gelöscht', async () => {
    await resolveWeather(testNow);
    expect(await storedWeather()).not.toBeNull();
    mockLocation.permission = { granted: false, status: 'denied', canAskAgain: false };
    await resolveWeather(minutesLater(5));
    expect(await storedWeather()).toBeNull();
  });
});
