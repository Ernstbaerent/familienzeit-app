// Figurenwahl für Titelbilder (M9b, Entscheidung von Clemens, 2026-10-17): Damit nicht jede Karte dieselbe Figur zeigt.
//
// - Passen mehrere Kinder-Figuren zur Altersspanne, kommt die am seltensten benutzte zuerst.
// - Keine Figur steht in mehr als 40 % der Titelbilder eines Laufs (gerechnet auf die geplante Zahl der Bilder, mindestens 1).
// - Mats ist bevorzugt bei Aktivitäten ab 8 Jahren.
// - Stups kommt gelegentlich als Begleiter dazu (in etwa jedem fünften Bild), nie bei Hitze, Feuer oder Schärfe.
//
// Der Zähler zählt jede Figur einmal je Titelbild, auch als Hände in der Nahaufnahme (die Hautfarbe zeigt, wer es ist).
// Reine Funktionen: Der Bild-Test (scripts/lib/imagetest/run.ts) und die Probebilder (probe.ts) nutzen dieselben Regeln.

import { cast } from '../figures/cast.ts';
import { animalBannedHazards, figureAges, figureFitsActivity } from '../figures/castRules.ts';
import { getMaterialInfo, isMaterialKey } from '../../../src/features/activities/materials.ts';
import type { Scene } from './types.ts';

export const maxShare = 0.4;
export const petShare = 0.2;
export const matsPreferredFrom = 8;
export const companion = 'stups';

export type Counts = Readonly<Record<string, number>>;
export type CastingActivity = { ageMin: number; ageMax: number; materials: readonly string[] };
export type CastingAdvice = {
  kids: string[]; // passende Kinder-Figuren, die beste zuerst (ohne gesperrte)
  adults: string[]; // Erwachsene, die seltenste zuerst (ohne gesperrte)
  blocked: { id: string; reason: string }[];
  pet: 'suggested' | 'allowed' | 'forbidden'; // Stups
  limit: number; // höchstens so viele Titelbilder je Figur
};

// Höchstens so viele Titelbilder je Figur: 40 % der geplanten Bilder, abgerundet, mindestens 1 (5 Bilder: 2, 8 Bilder: 3).
export const figureLimit = (total: number): number => Math.max(1, Math.floor(total * maxShare + 1e-9));
const petLimit = (total: number): number => Math.max(1, Math.floor(total * petShare + 1e-9));

const count = (counts: Counts, id: string): number => counts[id] ?? 0;

// Verträgt die Aktivität ein Tier? Nie bei Hitze, Feuer oder Schärfe im Material (dieselbe Liste wie im Szenenprüfer).
export function petAllowed(activity: CastingActivity): boolean {
  return !activity.materials.some((key) => isMaterialKey(key) && (getMaterialInfo(key).hazards ?? []).some((hazard) => (animalBannedHazards as readonly string[]).includes(hazard)));
}

// Welche Kinder-Figuren zur Aktivität passen (wie im Szenenprüfer: Alter, Kleinkind nur bei Aktivitäten ab 2 Jahren oder jünger).
export function fittingKids(activity: CastingActivity): string[] {
  return cast.humans
    .filter((human) => human.spec.role !== 'adult')
    .filter((human) => figureFitsActivity(human.spec.id, activity.ageMin, activity.ageMax))
    .filter((human) => human.spec.role !== 'toddler' || activity.ageMin <= 2)
    .map((human) => human.spec.id);
}

// Der Rat für ein Titelbild, aus den bisher gezählten Bildern (`counts`) und der geplanten Zahl (`total`).
export function adviseCasting(activity: CastingActivity, counts: Counts, total: number): CastingAdvice {
  const limit = figureLimit(total);
  const blocked: CastingAdvice['blocked'] = [];
  const atLimit = (id: string): boolean => {
    if (count(counts, id) < limit) return false;
    blocked.push({ id, reason: `steht schon in ${count(counts, id)} von ${total} Titelbildern (Grenze ${Math.round(maxShare * 100)} %, also ${limit})` });
    return true;
  };
  const middle = (activity.ageMin + activity.ageMax) / 2;
  const matsFirst = activity.ageMin >= matsPreferredFrom;
  const kids = fittingKids(activity)
    .filter((id) => !atLimit(id))
    .sort((a, b) => {
      if (matsFirst && (a === 'mats') !== (b === 'mats')) return a === 'mats' ? -1 : 1;
      if (count(counts, a) !== count(counts, b)) return count(counts, a) - count(counts, b);
      // gleich oft benutzt: die Figur, deren Alter näher an der Mitte der Altersspanne liegt
      const distance = (id: string) => Math.abs((figureAges[id]?.years ?? middle) - middle);
      return distance(a) - distance(b) || a.localeCompare(b);
    });
  const adults = cast.humans
    .filter((human) => human.spec.role === 'adult')
    .map((human) => human.spec.id)
    .filter((id) => !atLimit(id))
    .sort((a, b) => count(counts, a) - count(counts, b) || a.localeCompare(b));
  let pet: CastingAdvice['pet'] = 'allowed';
  if (!petAllowed(activity)) {
    pet = 'forbidden';
    blocked.push({ id: companion, reason: 'nie bei Hitze, Feuer, Messer oder Schere' });
  } else if (atLimit(companion)) pet = 'forbidden';
  else if (count(counts, companion) < petLimit(total)) pet = 'suggested';
  // Tüpfel ist ein Cameo: höchstens selten, dieselbe Grenze wie alle.
  atLimit('tuepfel');
  return { kids, adults, blocked, pet, limit };
}

// Welche Figuren ein Titelbild zeigt (jede einmal), auch die Hände der Nahaufnahme.
export function figuresInScene(scene: Scene): string[] {
  const ids = scene.items.flatMap((item) => [item.figure, item.hands?.figure]).filter((id): id is string => id !== undefined);
  return [...new Set(ids)];
}

// Verstöße gegen den Rat: eine gesperrte Figur im Bild. Das ist wie eine Meldung des Szenenprüfers (zweiter Versuch).
export function castingProblems(scene: Scene, advice: CastingAdvice): string[] {
  return figuresInScene(scene).flatMap((id) => {
    const entry = advice.blocked.find((blocked) => blocked.id === id);
    return entry === undefined ? [] : [`„${id}“ ${entry.reason}: Nimm eine andere Figur${advice.kids.length > 0 ? ` (bevorzugt ${advice.kids[0]})` : ''} oder keine.`];
  });
}

export function addToCounts(counts: Counts, scene: Scene): Record<string, number> {
  const next: Record<string, number> = { ...counts };
  for (const id of figuresInScene(scene)) next[id] = (next[id] ?? 0) + 1;
  return next;
}

// Der Rat als Text für die Anfrage an die KI.
export function castingPrompt(advice: CastingAdvice): string {
  const lines = ['Besetzung für dieses Bild (damit nicht jede Karte dieselbe Figur zeigt):'];
  lines.push(advice.kids.length > 0 ? `- Kind-Figur: bevorzugt ${advice.kids[0]}${advice.kids.length > 1 ? `, sonst ${advice.kids.slice(1).join(', ')}` : ''}.` : '- Keine Kind-Figur frei: zeige einen Erwachsenen, Hände oder nur Gegenstände.');
  if (advice.adults.length > 0) lines.push(`- Falls ein Erwachsener ins Bild gehört: bevorzugt ${advice.adults[0]}.`);
  if (advice.pet === 'suggested') lines.push(`- ${companion} darf als Begleiter dazukommen (sitzt, hüpft, schaut zu), wenn ein Platz frei ist.`);
  if (advice.pet === 'forbidden') lines.push(`- ${companion} und tuepfel nicht in diesem Bild.`);
  for (const entry of advice.blocked.filter((blocked) => blocked.id !== companion)) lines.push(`- NICHT ${entry.id}: ${entry.reason}.`);
  return lines.join('\n');
}

// Die Besetzung einer ganzen Reihe von Bildern nachrechnen (in der Reihenfolge des Laufs), mit Zähler nach jedem Bild.
export function replayCasting(entries: readonly { activity: CastingActivity; scene: Scene }[]): { advice: CastingAdvice; figures: string[]; problems: string[]; counts: Record<string, number> }[] {
  let counts: Record<string, number> = {};
  return entries.map(({ activity, scene }) => {
    const advice = adviseCasting(activity, counts, entries.length);
    const problems = castingProblems(scene, advice);
    counts = addToCounts(counts, scene);
    return { advice, figures: figuresInScene(scene), problems, counts };
  });
}
