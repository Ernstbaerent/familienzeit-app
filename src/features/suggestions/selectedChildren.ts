// Welche Kinder auf dem Start gewählt sind, und was davon gemerkt wird (reine Funktionen, ohne UI und ohne Speicher).
// Gemerkt werden NUR die gewählten Kinder (DESIGN.md, Entscheidung 4), nur auf dem Gerät.
// Zeit und Energie werden nicht gemerkt.

type WithId = { id: string };

// Die Version steckt im Schlüssel (selectedChildrenStorage.ts) und in den Daten, falls sich das Format später ändert.
export const selectedChildrenVersion = 1;

export type StoredSelectedChildren = {
  version: typeof selectedChildrenVersion;
  childIds: string[];
};

export function toStoredSelectedChildren(childIds: readonly string[]): StoredSelectedChildren {
  return { version: selectedChildrenVersion, childIds: [...childIds] };
}

// Liest, was auf dem Gerät steht. Nichts Brauchbares (fehlt, kaputt, andere Version) ergibt `null`.
// Einzelne kaputte Einträge (keine Texte) fallen weg, die brauchbaren bleiben.
export function parseStoredSelectedChildren(raw: unknown): string[] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { version, childIds } = raw as { version?: unknown; childIds?: unknown };
  if (version !== selectedChildrenVersion || !Array.isArray(childIds)) return null;
  return childIds.filter((id): id is string => typeof id === 'string' && id !== '');
}

// Aus dem Gespeicherten die Wahl für den Start machen. `null` heißt „alle Kinder“: Das gilt, wenn nichts
// gespeichert ist oder die Liste leer war (wer vor dem Beenden alle abgewählt hatte, startet nicht mit niemandem).
// Als „alle“ zählt später angelegte Kinder von selbst mit.
export function restoreSelectedChildren(stored: readonly string[] | null): string[] | null {
  return stored === null || stored.length === 0 ? null : [...stored];
}

// Die Kinder, die jetzt wirklich gewählt sind, aus der Wahl und den Profilen, die es gibt.
//  - `null` („alle“): alle Kinder.
//  - Gelöschte Kinder fliegen raus, doppelte fallen weg. Die Reihenfolge ist die der Profile.
//  - Waren alle gewählten Kinder gelöscht, gelten wieder alle (sonst stünde der Start mit niemandem da).
//  - Eine leere Wahl bleibt leer: Wer alle Kinder abwählt, soll sie nicht sofort wieder gewählt sehen.
//    Der Hauptknopf bleibt dann gesperrt (startState.ts).
export function resolveSelectedChildren(
  choice: readonly string[] | null,
  profiles: readonly WithId[],
): string[] {
  if (choice === null) return profiles.map((child) => child.id);
  const wanted = new Set(choice);
  const kept = profiles.filter((child) => wanted.has(child.id)).map((child) => child.id);
  if (choice.length > 0 && kept.length === 0) return profiles.map((child) => child.id);
  return kept;
}

// Wählt ein Kind aus oder ab, ausgehend von den jetzt gewählten Kindern. Reihenfolge wie bei den Profilen.
export function toggleSelectedChild(
  current: readonly string[],
  id: string,
  profiles: readonly WithId[],
): string[] {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return profiles.filter((child) => next.has(child.id)).map((child) => child.id);
}

export function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
