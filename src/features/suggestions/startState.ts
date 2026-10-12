// Wann darf der Hauptknopf auf dem Start drücken, und was geht dann an die Vorschläge? (reine Funktionen, ohne UI)
// Pflicht sind mindestens ein Kind und die Zeit. Energie ist freiwillig (DESIGN.md, Entscheidung 3 und 27).

import type { ParentEnergy, TimeKey } from './conditions';
import type { Selection } from './selection';

// Was noch fehlt. Die Reihenfolge ist die der Fragen auf dem Start (erst Kinder, dann Zeit).
export type StartIssue = 'children' | 'time';

export type StartInput = {
  childIds: readonly string[];
  time: TimeKey | null;
  parentEnergy: ParentEnergy | null;
};

export function getStartIssues({ childIds, time }: Pick<StartInput, 'childIds' | 'time'>): StartIssue[] {
  const issues: StartIssue[] = [];
  if (childIds.length === 0) issues.push('children');
  if (time === null) issues.push('time');
  return issues;
}

export function canStart(input: Pick<StartInput, 'childIds' | 'time'>): boolean {
  return getStartIssues(input).length === 0;
}

// Baut die Auswahl für „Eure Ideen“. Kinder, die es nicht mehr gibt, fallen weg.
// `null`, wenn der Start gesperrt ist (kein Kind, keine Zeit).
export function buildStartSelection(
  input: StartInput,
  profiles: readonly { id: string }[],
): Selection | null {
  const childIds = input.childIds.filter((id) => profiles.some((child) => child.id === id));
  if (childIds.length === 0 || input.time === null) return null;
  return {
    childIds,
    time: input.time,
    ...(input.parentEnergy ? { parentEnergy: input.parentEnergy } : {}),
  };
}
