// Die Aktivitäten der App (M8) mit echtem Provider, echtem Zwischenspeicher (AsyncStorage-Ersatz) und gemocktem fetch:
// Start sofort mit dem Mitgelieferten, Auffrischen im Hintergrund höchstens einmal pro Tag, stiller Rückfall bei jedem Fehler.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create } from 'react-test-renderer';

import { makeActivity } from '../suggestions/testHelpers';
import { ActivitiesProvider, useActivities } from './ActivitiesContext';
import { toStoredActivities } from './activitiesCache';
import { activityToRow } from './activityRow';
import { getBundledActivities } from './bundledActivities';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const envNames = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES'] as const;
const savedEnv = envNames.map((name) => process.env[name]);
const originalFetch = global.fetch;

const url = 'https://abc.supabase.co';
const key = 'sb_publishable_test';
const day = 24 * 60 * 60 * 1000;

const remote = (count: number, prefix = 'remote') => Array.from({ length: count }, (_, i) => makeActivity({ id: `${prefix}-${i}` }));
const rowsOf = (activities: ReturnType<typeof remote>) => activities.map(activityToRow);

function configure(minutes?: string) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = url;
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = key;
  if (minutes === undefined) delete process.env.EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES;
  else process.env.EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES = minutes;
}

const mockFetch = jest.fn();
function answer(rows: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValue({ ok, status, json: async () => rows });
}

async function storeCache(activities: ReturnType<typeof remote>, ageMs: number) {
  await AsyncStorage.setItem('activities.v1', JSON.stringify(toStoredActivities({ fetchedAt: Date.now() - ageMs, activities })));
}
async function storedIds(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem('activities.v1');
  return raw === null ? null : (JSON.parse(raw) as { activities: { id: string }[] }).activities.map((activity) => activity.id);
}

type Captured = ReturnType<typeof useActivities>;

async function mount() {
  const seen: Captured[] = [];
  function Probe() {
    seen.push(useActivities());
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <ActivitiesProvider>
        <Probe />
      </ActivitiesProvider>,
    );
  });
  return { seen, current: () => seen[seen.length - 1], unmount: () => act(() => renderer.unmount()) };
}

async function settle() {
  for (let round = 0; round < 5; round += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

let warn: jest.SpyInstance;
beforeEach(async () => {
  await AsyncStorage.clear();
  for (const name of envNames) delete process.env[name];
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
  envNames.forEach((name, index) => {
    if (savedEnv[index] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[index];
  });
});

describe('Start', () => {
  it('ist sofort fertig mit den mitgelieferten Aktivitäten (nichts wartet auf Speicher oder Netz)', async () => {
    configure();
    mockFetch.mockReturnValue(new Promise(() => {})); // das Netz antwortet nie
    const first: Captured[] = [];
    function Probe() {
      first.push(useActivities());
      return null;
    }
    // Ohne `await act`: nur der erste Zeichnen-Durchlauf.
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ActivitiesProvider>
          <Probe />
        </ActivitiesProvider>,
      );
    });
    expect(first[0].source).toBe('bundled');
    expect(first[0].activities).toBe(getBundledActivities());
    expect(first[0].activities.length).toBeGreaterThan(100);
    act(() => renderer.unmount());
  });

  it('ohne Einrichtung (keine .env): bleibt beim Mitgelieferten, fragt nie nach und meldet nichts', async () => {
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('bundled');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('außerhalb des Providers gibt es einen klaren Fehler', () => {
    function Lonely() {
      useActivities();
      return null;
    }
    expect(() => act(() => void create(<Lonely />))).toThrow('ActivitiesProvider');
  });
});

describe('Erster Start mit Netz', () => {
  it('holt die freigegebenen Aktivitäten, nimmt sie in Gebrauch und speichert sie', async () => {
    configure();
    answer(rowsOf(remote(6)));
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('remote');
    expect(current().activities.map((activity) => activity.id)).toEqual(remote(6).map((activity) => activity.id));
    expect(await storedIds()).toEqual(remote(6).map((activity) => activity.id));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('die Anfrage ist ein GET mit status=eq.approved und dem öffentlichen Schlüssel, sonst nichts', async () => {
    configure();
    answer(rowsOf(remote(4)));
    await mount();
    await settle();
    const [requestUrl, init] = mockFetch.mock.calls[0];
    expect(requestUrl).toContain('https://abc.supabase.co/rest/v1/activities?');
    expect(requestUrl).toContain('status=eq.approved');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ apikey: key, Accept: 'application/json' });
    expect(init.body).toBeUndefined();
  });

  it('liefert der Server Entwürfe mit, zeigt die App sie nicht', async () => {
    configure();
    answer([...rowsOf(remote(4)), activityToRow(makeActivity({ id: 'geheimer-entwurf', status: 'draft' }))]);
    const { current } = await mount();
    await settle();
    expect(current().activities.map((activity) => activity.id)).not.toContain('geheimer-entwurf');
    expect(await storedIds()).not.toContain('geheimer-entwurf');
  });
});

describe('Höchstens einmal pro Tag', () => {
  it('frischer Zwischenspeicher (1 Stunde alt): wird benutzt, es wird nicht nachgefragt', async () => {
    configure();
    await storeCache(remote(5, 'cache'), 60 * 60 * 1000);
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('cache');
    expect(current().activities.map((activity) => activity.id)).toEqual(remote(5, 'cache').map((activity) => activity.id));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('knapp unter 24 Stunden: noch nicht; ab 24 Stunden: Zwischenspeicher zuerst, dann der neue Bestand', async () => {
    configure();
    await storeCache(remote(5, 'cache'), day - 60_000);
    const young = await mount();
    await settle();
    expect(mockFetch).not.toHaveBeenCalled();
    await young.unmount();

    await AsyncStorage.clear();
    await storeCache(remote(5, 'cache'), day + 60_000);
    let deliver!: (value: unknown) => void;
    mockFetch.mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    const old = await mount();
    await settle();
    // Solange das Netz noch nicht geantwortet hat, arbeitet die App schon mit dem alten Bestand (nichts wartet).
    expect(old.current().source).toBe('cache');
    expect(old.current().activities).toHaveLength(5);
    await act(async () => {
      deliver({ ok: true, status: 200, json: async () => rowsOf(remote(7, 'neu')) });
    });
    await settle();
    expect(old.current().source).toBe('remote');
    expect(old.current().activities).toHaveLength(7);
    expect(await storedIds()).toEqual(remote(7, 'neu').map((activity) => activity.id));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('nur zum Testen: EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES verkürzt den Abstand', async () => {
    configure('1');
    await storeCache(remote(5, 'cache'), 2 * 60_000);
    answer(rowsOf(remote(4, 'neu')));
    const { current } = await mount();
    await settle();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(current().source).toBe('remote');
  });

  it('ein ungültiger Wert dort ändert nichts: es gilt der Tag', async () => {
    configure('bald');
    await storeCache(remote(5, 'cache'), 2 * 60 * 60 * 1000);
    await mount();
    await settle();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('pro Start höchstens ein Abruf', async () => {
    configure();
    answer(rowsOf(remote(4)));
    await mount();
    await settle();
    await settle();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('Rückfall: still, ohne Fehler in der Oberfläche', () => {
  it('kein Netz, erster Start: es bleibt beim Mitgelieferten (Warnung nur in der Konsole)', async () => {
    configure();
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('bundled');
    expect(current().activities).toBe(getBundledActivities());
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('Network request failed');
    expect(await storedIds()).toBeNull();
  });

  it('kein Netz, alter Zwischenspeicher: es bleibt beim Zwischenspeicher, der Zeitpunkt wird nicht erneuert', async () => {
    configure();
    await storeCache(remote(5, 'cache'), 3 * day);
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('cache');
    const stored = JSON.parse((await AsyncStorage.getItem('activities.v1')) as string) as { fetchedAt: number };
    expect(Date.now() - stored.fetchedAt).toBeGreaterThan(2 * day); // beim nächsten Start wird es wieder versucht
  });

  it.each([
    ['HTTP 503 (Projekt pausiert)', () => answer({ message: 'Service Unavailable' }, false, 503)],
    ['HTTP 401 (falscher Schlüssel)', () => answer({ message: 'Invalid API key' }, false, 401)],
    ['eine Fehlermeldung statt einer Liste', () => answer({ code: 'PGRST301', message: 'JWT expired' })],
    ['eine leere Liste (leere Datenbank)', () => answer([])],
    ['nur zwei Aktivitäten (halb eingespielt)', () => answer(rowsOf(remote(2)))],
    ['lauter kaputte Zeilen', () => answer([{ id: 'x' }, { id: 'y' }, { id: 'z' }, {}])],
  ])('%s: bleibt beim Mitgelieferten', async (_name, setUp) => {
    configure();
    setUp();
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('bundled');
    expect(current().activities.length).toBeGreaterThan(100);
    expect(await storedIds()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('antwortet der Server nach 10 Sekunden nicht (Zeitüberschreitung), bleibt es still beim bisherigen Bestand', async () => {
    jest.useFakeTimers();
    try {
      configure();
      mockFetch.mockReturnValue(new Promise(() => {}));
      const { current } = await mount();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10_000);
      });
      await settle();
      expect(current().source).toBe('bundled');
      expect(String(warn.mock.calls[0][0])).toContain('Zeitüberschreitung');
    } finally {
      jest.useRealTimers();
    }
  });

  it('ein kaputter Zwischenspeicher wird ignoriert (und durch neue Daten ersetzt, falls das Netz geht)', async () => {
    configure();
    await AsyncStorage.setItem('activities.v1', '{kaputt');
    answer(rowsOf(remote(4, 'neu')));
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('remote');
    expect(await storedIds()).toEqual(remote(4, 'neu').map((activity) => activity.id));
  });

  it('ein Zwischenspeicher mit zu wenigen brauchbaren Einträgen zählt als leer: Mitgeliefertes, dann neu fragen', async () => {
    configure();
    await AsyncStorage.setItem('activities.v1', JSON.stringify({ version: 1, fetchedAt: Date.now(), activities: [makeActivity({ id: 'allein' })] }));
    mockFetch.mockRejectedValue(new TypeError('offline'));
    const { current } = await mount();
    await settle();
    expect(current().source).toBe('bundled');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('der Provider bricht nie ab: kein Fehler fliegt bis zur Oberfläche', async () => {
    configure();
    mockFetch.mockImplementation(() => {
      throw new Error('synchron kaputt');
    });
    const { current } = await mount();
    await settle();
    expect(current().activities.length).toBeGreaterThan(100);
  });
});

describe('Nach dem Schließen', () => {
  it('eine Antwort, die erst nach dem Schließen kommt, ändert nichts mehr und macht keinen Lärm', async () => {
    configure();
    let resolve!: (value: unknown) => void;
    mockFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = await mount();
    await unmount();
    await act(async () => {
      resolve({ ok: true, status: 200, json: async () => rowsOf(remote(5)) });
      await Promise.resolve();
    });
    await settle();
    // Nichts zu prüfen außer: kein Fehler, keine Warnung wegen eines Updates nach dem Schließen.
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('unmounted'))).toHaveLength(0);
  });
});
