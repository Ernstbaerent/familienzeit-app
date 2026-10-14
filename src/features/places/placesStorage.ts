// Orte (M10b): Kacheln lokal auf dem Gerät lesen und schreiben (AsyncStorage). Öffentliche Daten, nichts Persönliches.
// Je Kachel ein Eintrag `places.v1.tile.<key>`, dazu das kleine Verzeichnis `places.v1.index` (placesCache.ts).
// Fehler beim Lesen ergeben „nichts gespeichert“. Fehler beim Schreiben gibt `saveTile` weiter (der Aufrufer fängt sie).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadJson, saveJson } from '@/lib/storage';

import { parseStoredTile, parseTileIndex, serializeTileIndex, type TileIndex, type TileRecord } from './placesCache';

const tilePrefix = 'places.v1.tile.';
const indexKey = 'places.v1.index';

export function tileStorageKey(key: string): string {
  return `${tilePrefix}${key}`;
}

export async function loadTile(key: string): Promise<TileRecord | null> {
  return parseStoredTile(await loadJson(tileStorageKey(key)), key);
}

// `serialized` kommt aus serializeTile (die Größe wurde damit schon gemessen).
export async function saveTile(key: string, serialized: string): Promise<void> {
  await AsyncStorage.setItem(tileStorageKey(key), serialized);
}

export async function removeTiles(keys: readonly string[]): Promise<void> {
  if (keys.length > 0) await AsyncStorage.multiRemove(keys.map(tileStorageKey));
}

export async function loadTileIndex(): Promise<TileIndex> {
  return parseTileIndex(await loadJson(indexKey));
}

export async function saveTileIndex(index: TileIndex): Promise<void> {
  await saveJson(indexKey, serializeTileIndex(index));
}
