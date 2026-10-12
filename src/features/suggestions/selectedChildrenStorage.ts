// Die zuletzt gewählten Kinder lokal speichern und laden. Nur auf dem Gerät, nie an einen Server.
import { loadJson, saveJson } from '@/lib/storage';

import { parseStoredSelectedChildren, toStoredSelectedChildren } from './selectedChildren';

const storageKey = 'selectedChildren.v1';

// `null`, wenn nichts oder nichts Brauchbares gespeichert ist.
export async function loadSelectedChildren(): Promise<string[] | null> {
  return parseStoredSelectedChildren(await loadJson(storageKey));
}

export async function saveSelectedChildren(childIds: readonly string[]): Promise<void> {
  await saveJson(storageKey, toStoredSelectedChildren(childIds));
}
