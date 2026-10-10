// Kinderprofile lokal speichern und laden. Nur auf dem Gerät, nie an einen Server.
import { loadJson, saveJson } from '@/lib/storage';

import { sanitizeChildren, type ChildProfile } from './profiles';

// Die Version steckt im Schlüssel und in den Daten, falls sich das Format später ändert.
const storageKey = 'profiles.v1';
const storageVersion = 1;

export async function loadChildren(): Promise<ChildProfile[]> {
  const stored = await loadJson(storageKey);
  if (typeof stored !== 'object' || stored === null) return [];
  const { version, children } = stored as { version?: unknown; children?: unknown };
  if (version !== storageVersion) return [];
  return sanitizeChildren(children);
}

export async function saveChildren(children: ChildProfile[]): Promise<void> {
  await saveJson(storageKey, { version: storageVersion, children });
}
