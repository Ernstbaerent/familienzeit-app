// Orte (M10b): Kacheln auf dem Gerät (AsyncStorage, im Test nachgestellt). Schlüssel mit Version, Lesen, Schreiben, Löschen.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { serializeTile } from './placesCache';
import { loadTile, loadTileIndex, removeTiles, saveTile, saveTileIndex, tileStorageKey } from './placesStorage';
import { makePlace } from './testHelpers';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('placesStorage', () => {
  it('Schlüssel mit Version: places.v1.tile.<key>', () => {
    expect(tileStorageKey('253_40')).toBe('places.v1.tile.253_40');
  });

  it('schreibt und liest eine Kachel, löscht sie wieder', async () => {
    const row = makePlace();
    const tile = { key: row.tile, fetchedAt: 1_000, importIds: { TH: 'x' }, rows: [row] };
    await saveTile(row.tile, serializeTile(tile));
    expect(await loadTile(row.tile)).toEqual(tile);
    await removeTiles([row.tile]);
    expect(await loadTile(row.tile)).toBeNull();
  });

  it('kaputter Eintrag zählt als nicht gespeichert', async () => {
    await AsyncStorage.setItem(tileStorageKey('253_40'), '{kaputt');
    expect(await loadTile('253_40')).toBeNull();
  });

  it('Verzeichnis: schreibt und liest, ohne Eintrag leer', async () => {
    expect(await loadTileIndex()).toEqual({});
    await saveTileIndex({ '253_40': { bytes: 120, lastUsedAt: 5 } });
    expect(await loadTileIndex()).toEqual({ '253_40': { bytes: 120, lastUsedAt: 5 } });
    expect(await AsyncStorage.getItem('places.v1.index')).toContain('"version":1');
  });
});
