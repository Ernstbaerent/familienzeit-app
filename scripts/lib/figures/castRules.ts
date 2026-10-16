// Figuren (M9b): Regeln für die Besetzung, in Code, damit Tests und Szenenprüfer sie teilen (Text: docs/design/FIGUREN.md).

import type { HumanSpec } from './rig.ts';

// Welche Figur zu welcher Altersspanne einer Aktivität passt (Alter in vollen Jahren wie `ageMin`/`ageMax`).
// Eine Szene zeigt nur Figuren, die zur Spanne passen; mit mehreren Figuren gilt die jüngste als Maß. Erwachsene sind immer erlaubt.
export const figureAges: Record<string, { years: number; fits: readonly [number, number] }> = {
  nolli: { years: 3, fits: [0, 4] },
  jette: { years: 7, fits: [3, 9] },
  mats: { years: 11, fits: [8, 16] },
};

// Passt die Figur (Kind) zur Aktivität? Erwachsene und Tiere haben keine Altersgrenze.
export function figureFitsActivity(id: string, ageMin: number, ageMax: number): boolean {
  const entry = figureAges[id];
  if (entry === undefined) return true;
  const [lo, hi] = entry.fits;
  return ageMin <= hi && ageMax >= lo;
}

// Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung (und nie bei Feuer).
export const animalBannedHazards = ['sharp', 'heat', 'fire'] as const;

export const roleLabel: Record<HumanSpec['role'], string> = { adult: 'Erwachsene', teen: 'älteres Kind', child: 'größeres Kind', toddler: 'kleineres Kind' };
