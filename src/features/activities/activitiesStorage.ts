// Zwischenspeicher der Aktivitäten lokal auf dem Gerät. Öffentliche Daten, nichts Persönliches.
import { loadJson, saveJson } from '@/lib/storage';

import { parseStoredActivities, toStoredActivities, type ActivitiesRecord } from './activitiesCache';

const storageKey = 'activities.v1';

// `null`, wenn nichts oder nichts Brauchbares gespeichert ist. Wirft nie.
export async function loadStoredActivities(imagePrefix: string | null): Promise<ActivitiesRecord | null> {
  return parseStoredActivities(await loadJson(storageKey), imagePrefix);
}

export async function saveStoredActivities(record: ActivitiesRecord): Promise<void> {
  await saveJson(storageKey, toStoredActivities(record));
}
