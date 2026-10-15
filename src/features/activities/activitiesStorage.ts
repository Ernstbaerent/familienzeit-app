// Zwischenspeicher der Aktivitäten lokal auf dem Gerät. Öffentliche Daten, nichts Persönliches.
// Seit M8b in Teilen (`activities.v2.meta` plus `activities.v2.part.<Fassung>.<n>`, je höchstens 200 Aktivitäten), Regeln in activitiesCache.ts.
//
// Schreiben ohne Datenverlust: erst die neuen Teile unter einer neuen Fassung, dann der Eintrag mit den Angaben, erst danach die alten Teile
// und der alte Eintrag `activities.v1` löschen. Bricht das Schreiben ab (App geschlossen, Speicher voll), gilt die alte Fassung weiter.
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseLegacyActivities,
  parseStoredMeta,
  parseStoredParts,
  toStoredParts,
  type ActivitiesRecord,
} from './activitiesCache';

export const legacyStorageKey = 'activities.v1';
export const metaStorageKey = 'activities.v2.meta';
const partPrefix = 'activities.v2.part.';

export function partStorageKey(generation: string, index: number): string {
  return `${partPrefix}${generation}.${index}`;
}

function parseJson(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadV2(imagePrefix: string | null): Promise<ActivitiesRecord | null> {
  const meta = parseStoredMeta(parseJson(await AsyncStorage.getItem(metaStorageKey)));
  if (!meta) return null;
  const keys = Array.from({ length: meta.parts }, (_, index) => partStorageKey(meta.generation, index));
  const entries = await AsyncStorage.multiGet(keys);
  return parseStoredParts(meta, entries.map(([, value]) => parseJson(value)), imagePrefix);
}

// `null`, wenn nichts oder nichts Brauchbares gespeichert ist. Liest zuerst v2, sonst (Umstieg von M8) den alten Eintrag v1. Wirft nie.
export async function loadStoredActivities(imagePrefix: string | null): Promise<ActivitiesRecord | null> {
  try {
    const record = await loadV2(imagePrefix);
    if (record) return record;
  } catch {
    // Lesefehler des Speichers (z. B. ein zu großer Eintrag auf Android): wie leer behandeln, v1 versuchen.
  }
  try {
    return parseLegacyActivities(parseJson(await AsyncStorage.getItem(legacyStorageKey)), imagePrefix);
  } catch {
    return null;
  }
}

let generationCounter = 0;
function newGeneration(): string {
  generationCounter += 1;
  return `${Date.now().toString(36)}${generationCounter.toString(36)}${Math.floor(Math.random() * 36 ** 4).toString(36)}`;
}

// Schreibt den Bestand. Schlägt das Speichern fehl, wird der Fehler weitergegeben (der Aufrufer warnt nur, der Bestand gilt trotzdem bis zum Schließen).
export async function saveStoredActivities(record: ActivitiesRecord): Promise<void> {
  const generation = newGeneration();
  const { meta, parts } = toStoredParts(record, generation);
  await AsyncStorage.multiSet(parts.map((part) => [partStorageKey(generation, part.index), JSON.stringify(part)]));
  await AsyncStorage.setItem(metaStorageKey, JSON.stringify(meta));
  await removeStaleEntries(generation);
}

// Räumt alte Teile (andere Fassung, auch Reste eines abgebrochenen Schreibens) und den alten Eintrag v1 weg.
// Ein Fehler hier schadet nicht: Die Reste werden beim nächsten Speichern weggeräumt.
async function removeStaleEntries(current: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter(
      (key) => key === legacyStorageKey || (key.startsWith(partPrefix) && !key.startsWith(`${partPrefix}${current}.`)),
    );
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    // still: nichts zu tun
  }
}
