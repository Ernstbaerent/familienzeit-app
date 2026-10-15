// Zwischenspeicher auf dem Gerät (M8b) mit dem AsyncStorage-Ersatz: Teile, Umstieg von v1, abgebrochenes Schreiben, Aufräumen.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeActivity } from '../suggestions/testHelpers';
import { legacyStorageVersion, type ActivitiesRecord } from './activitiesCache';
import { legacyStorageKey, loadStoredActivities, metaStorageKey, saveStoredActivities } from './activitiesStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
const valid = (count: number, name = 'a') => Array.from({ length: count }, (_, i) => makeActivity({ id: `${name}-${String(i).padStart(4, '0')}` }));
const record = (activities: ActivitiesRecord['activities']): ActivitiesRecord => ({
  fetchedAt: 1_000,
  cursor: '2026-10-18T16:00:00.000000Z',
  idCheckedAt: 900,
  activities,
});

async function keys(): Promise<string[]> {
  return [...(await AsyncStorage.getAllKeys())].sort();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('nichts gespeichert: null', async () => {
  await expect(loadStoredActivities(prefix)).resolves.toBeNull();
});

it('speichert in Teilen zu höchstens 200 und liest alles wieder', async () => {
  const input = record(valid(1001));
  await saveStoredActivities(input);
  const stored = await keys();
  expect(stored.filter((key) => key.startsWith('activities.v2.part.'))).toHaveLength(6);
  expect(stored).toContain(metaStorageKey);
  await expect(loadStoredActivities(prefix)).resolves.toEqual(input);
});

it('bei 1500 Aktivitäten ist jeder Eintrag weit unter 2 MB', async () => {
  await saveStoredActivities(record(valid(1500)));
  for (const key of await keys()) expect((await AsyncStorage.getItem(key))?.length ?? 0).toBeLessThan(1_000_000);
});

it('ein neues Speichern ersetzt die alte Fassung und räumt ihre Teile weg', async () => {
  await saveStoredActivities(record(valid(450)));
  await saveStoredActivities(record(valid(5, 'b')));
  const stored = await keys();
  expect(stored.filter((key) => key.startsWith('activities.v2.part.'))).toHaveLength(1);
  expect((await loadStoredActivities(prefix))?.activities.map((activity) => activity.id)).toEqual(valid(5, 'b').map((activity) => activity.id));
});

describe('Umstieg von v1 (niemand verliert etwas)', () => {
  async function storeLegacy(count: number) {
    await AsyncStorage.setItem(legacyStorageKey, JSON.stringify({ version: legacyStorageVersion, fetchedAt: 500, activities: valid(count, 'alt') }));
  }

  it('ohne v2 wird v1 gelesen, ohne Stand (der nächste Abruf lädt einmal alles)', async () => {
    await storeLegacy(104);
    const loaded = await loadStoredActivities(prefix);
    expect(loaded?.activities).toHaveLength(104);
    expect(loaded?.cursor).toBeNull();
    expect(loaded?.fetchedAt).toBe(500);
  });

  it('v1 wird erst gelöscht, wenn v2 geschrieben ist', async () => {
    await storeLegacy(104);
    await saveStoredActivities(record(valid(110)));
    expect(await keys()).not.toContain(legacyStorageKey);
    expect((await loadStoredActivities(prefix))?.activities).toHaveLength(110);
  });

  it('scheitert das Schreiben von v2, bleibt v1 erhalten und lesbar', async () => {
    await storeLegacy(104);
    jest.spyOn(AsyncStorage, 'multiSet').mockRejectedValueOnce(new Error('Speicher voll'));
    await expect(saveStoredActivities(record(valid(110)))).rejects.toThrow('Speicher voll');
    expect(await keys()).toContain(legacyStorageKey);
    expect((await loadStoredActivities(prefix))?.activities).toHaveLength(104);
  });

  it('ist v2 kaputt und v1 noch da, gilt v1', async () => {
    await storeLegacy(104);
    await AsyncStorage.setItem(metaStorageKey, '{kaputt');
    expect((await loadStoredActivities(prefix))?.activities).toHaveLength(104);
  });
});

describe('abgebrochenes Schreiben', () => {
  it('Teile geschrieben, Angaben nicht: die alte Fassung gilt weiter; die Reste räumt das nächste Speichern weg', async () => {
    await saveStoredActivities(record(valid(5, 'alt')));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('App geschlossen'));
    await expect(saveStoredActivities(record(valid(300, 'neu')))).rejects.toThrow('App geschlossen');
    expect((await loadStoredActivities(prefix))?.activities.map((activity) => activity.id)).toEqual(valid(5, 'alt').map((activity) => activity.id));
    expect((await keys()).filter((key) => key.startsWith('activities.v2.part.'))).toHaveLength(3); // 1 alt + 2 Reste

    await saveStoredActivities(record(valid(7, 'b')));
    expect((await keys()).filter((key) => key.startsWith('activities.v2.part.'))).toHaveLength(1);
  });

  it('ein fehlender Teil: ganzer Zwischenspeicher leer (Mitgeliefertes, der nächste Abruf lädt alles)', async () => {
    await saveStoredActivities(record(valid(450)));
    const part = (await keys()).find((key) => key.endsWith('.1'));
    await AsyncStorage.removeItem(part!);
    await expect(loadStoredActivities(prefix)).resolves.toBeNull();
  });

  it('Aufräumen scheitert: kein Fehler, die neue Fassung gilt', async () => {
    jest.spyOn(AsyncStorage, 'getAllKeys').mockRejectedValueOnce(new Error('kaputt'));
    await expect(saveStoredActivities(record(valid(5)))).resolves.toBeUndefined();
    expect((await loadStoredActivities(prefix))?.activities).toHaveLength(5);
  });

  it('ein Lesefehler des Speichers (z. B. Eintrag zu groß für Android) wirft nie', async () => {
    await saveStoredActivities(record(valid(5)));
    jest.spyOn(AsyncStorage, 'multiGet').mockRejectedValueOnce(new Error('Row too big to fit into CursorWindow'));
    await expect(loadStoredActivities(prefix)).resolves.toBeNull();
  });
});
