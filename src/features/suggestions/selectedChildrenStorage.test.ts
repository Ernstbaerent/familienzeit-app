import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSelectedChildren, saveSelectedChildren } from './selectedChildrenStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Gewählte Kinder speichern und laden (nur auf dem Gerät)', () => {
  it('nichts gespeichert: null', async () => {
    expect(await loadSelectedChildren()).toBeNull();
  });

  it('speichern und wieder laden, in derselben Reihenfolge', async () => {
    await saveSelectedChildren(['kid-2', 'kid-1']);
    expect(await loadSelectedChildren()).toEqual(['kid-2', 'kid-1']);
  });

  it('überschreibt den alten Stand', async () => {
    await saveSelectedChildren(['a', 'b']);
    await saveSelectedChildren(['b']);
    expect(await loadSelectedChildren()).toEqual(['b']);
  });

  it('die Wahl „niemand“ wird als leere Liste gemerkt', async () => {
    await saveSelectedChildren([]);
    expect(await loadSelectedChildren()).toEqual([]);
  });

  it('liegt versioniert unter selectedChildren.v1 und enthält nur die IDs, keine Zeit und keine Energie', async () => {
    await saveSelectedChildren(['a']);
    const raw = await AsyncStorage.getItem('selectedChildren.v1');
    expect(JSON.parse(raw ?? 'null')).toEqual({ version: 1, childIds: ['a'] });
    expect(await AsyncStorage.getAllKeys()).toEqual(['selectedChildren.v1']);
  });

  it('kaputte Daten (kein JSON) und eine andere Version ergeben null statt eines Fehlers', async () => {
    await AsyncStorage.setItem('selectedChildren.v1', '{kaputt');
    expect(await loadSelectedChildren()).toBeNull();
    await AsyncStorage.setItem('selectedChildren.v1', JSON.stringify({ version: 99, childIds: ['a'] }));
    expect(await loadSelectedChildren()).toBeNull();
  });

  it('Schlägt das Speichern fehl, wird der Fehler weitergegeben (der Aufrufer entscheidet)', async () => {
    const failing = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('voll'));
    await expect(saveSelectedChildren(['a'])).rejects.toThrow('voll');
    failing.mockRestore();
  });
});
