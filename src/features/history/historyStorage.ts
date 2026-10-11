// Verlauf lokal speichern und laden. Nur auf dem Gerät, nie an einen Server.
import { loadJson, saveJson } from '@/lib/storage';

import { parseStoredHistory, toStoredHistory, type HistoryEntry } from './history';

const storageKey = 'history.v1';

export async function loadHistory(): Promise<HistoryEntry[]> {
  return parseStoredHistory(await loadJson(storageKey));
}

export async function saveHistory(entries: readonly HistoryEntry[]): Promise<void> {
  await saveJson(storageKey, toStoredHistory(entries));
}
