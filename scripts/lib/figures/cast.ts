// Figuren (M9b): die Besetzung im Stil von Satz C „schlank und verspielt“ (Entscheidung von Clemens, 2026-10-16):
// Mutter Ilka, Papa, Jette (≈7), Nolli (≈3), der ältere Junge (≈11), Katze Tüpfel, Vogel Stups. Alle gesichtslos (Augen sind eine freiwillige Fassung).
// Die Namen von Papa und dem Jungen sind Vorschläge, Clemens wählt (docs/design/FIGUREN.md, „Offene Entscheidungen“).

import type { PetSpec } from './pets.ts';
import type { Quirk } from './poses.ts';
import type { HumanSpec } from './rig.ts';

// Alle Maße einer Figur mit einem Faktor malen (Linien bleiben 4 und 2,5), damit die Köpfe unter den oberen Ecken der Karte bleiben.
function scaled(spec: HumanSpec, k: number): HumanSpec {
  const keys = ['headR', 'neck', 'torsoH', 'torsoW', 'shoulderW', 'hipW', 'upperArm', 'foreArm', 'upperLeg', 'lowerLeg', 'handR', 'footLen'] as const;
  const out: HumanSpec = { ...spec, limb: { ...spec.limb, w: spec.limb.w * k } };
  for (const key of keys) out[key] = Math.round(spec[key] * k * 10) / 10;
  return out;
}

function scaledPet(spec: PetSpec, k: number): PetSpec {
  const keys = ['bodyRx', 'bodyRy', 'headR', 'legLen', 'tailLen'] as const;
  const out: PetSpec = { ...spec };
  for (const key of keys) out[key] = Math.round(spec[key] * k * 10) / 10;
  return out;
}

export type CastHuman = { spec: HumanSpec; quirk?: Quirk; ageYears: number; blurb: string };
export type CastPet = { spec: PetSpec; blurb: string };

const k = 0.9;
const line = { style: 'line', w: 0 } as const;

const humans: CastHuman[] = [
  {
    ageYears: 3,
    blurb: 'das kleinste Kind (≈3): Dutt, Petrol-Kleidchen',
    spec: {
      id: 'nolli', name: 'Nolli', role: 'toddler', skin: 2, headR: 9.5, neck: 2, torsoH: 26, torsoW: 22, shoulderW: 17, hipW: 9,
      upperArm: 12, foreArm: 11, upperLeg: 14, lowerLeg: 13, handR: 3.8, footLen: 10, limb: line, torso: 'dress',
      colors: { top: 'petrol', bottom: 'ink', shoes: 'rose', hair: 'ink' }, hair: 'bun',
    },
    quirk: { tilt: -6 },
  },
  {
    ageYears: 7,
    blurb: 'das größere Kind (≈7): Haarbüschel, Rosé-Kleid',
    spec: {
      id: 'jette', name: 'Jette', role: 'child', skin: 7, headR: 10, neck: 3, torsoH: 36, torsoW: 28, shoulderW: 20, hipW: 10,
      upperArm: 17, foreArm: 16, upperLeg: 20, lowerLeg: 19, handR: 4, footLen: 11, limb: line, torso: 'dress',
      colors: { top: 'rose', bottom: 'ink', shoes: 'petrol', hair: 'ink' }, hair: 'tuft',
    },
    quirk: { tilt: 7 },
  },
  {
    ageYears: 11,
    blurb: 'der ältere Junge (≈11): Mütze, Rosé-Shirt, die Hand in der Hüfte',
    spec: {
      id: 'mats', name: 'Mats', role: 'teen', skin: 1, headR: 10.5, neck: 3, torsoH: 44, torsoW: 25, shoulderW: 22, hipW: 11,
      upperArm: 21, foreArm: 20, upperLeg: 25, lowerLeg: 24, handR: 4.2, footLen: 12, limb: line, torso: 'slim',
      colors: { top: 'rose', bottom: 'ink', shoes: 'petrol', hair: 'ink', hat: 'petrol', accent: 'paper' }, hair: 'beanie',
    },
    quirk: { tilt: 4, handOnHip: 'L' },
  },
  {
    ageYears: 38,
    blurb: 'die Mutter: groß und schlank, langer Mantel, Schal',
    spec: {
      id: 'ilka', name: 'Ilka', role: 'adult', skin: 3, headR: 11, neck: 4, torsoH: 52, torsoW: 32, shoulderW: 26, hipW: 12,
      upperArm: 24, foreArm: 23, upperLeg: 28, lowerLeg: 27, handR: 4.4, footLen: 12, limb: line, torso: 'dress',
      colors: { top: 'petrol', bottom: 'ink', shoes: 'ink', hair: 'ink', accent: 'rose' }, hair: 'bob', scarf: true,
    },
    quirk: { tilt: 6, handOnHip: 'R' },
  },
  {
    ageYears: 40,
    blurb: 'der Papa: noch etwas größer, Leinen-Pullover, kurze Haare',
    spec: {
      id: 'arne', name: 'Arne', role: 'adult', skin: 5, headR: 11, neck: 4, torsoH: 54, torsoW: 30, shoulderW: 28, hipW: 13,
      upperArm: 25, foreArm: 24, upperLeg: 29, lowerLeg: 28, handR: 4.6, footLen: 13, limb: line, torso: 'slim',
      colors: { top: 'paper', bottom: 'petrol', shoes: 'ink', hair: 'ink' }, hair: 'cap',
    },
    quirk: { tilt: -4 },
  },
];

const pets: CastPet[] = [
  {
    blurb: 'die Katze (Cameo): schlank, langer Schwanz, spitze Ohren',
    spec: { id: 'tuepfel', name: 'Tüpfel', kind: 'cat', bodyRx: 26, bodyRy: 10, headR: 10.5, legLen: 24, tailLen: 30, colors: { body: 'paper', accent: 'rose' } },
  },
  {
    blurb: 'der Vogel (Hauptfigur, Begleiter): dünne Beine, langer Schwanz, Haarschopf',
    spec: { id: 'stups', name: 'Stups', kind: 'bird', bodyRx: 18.1, bodyRy: 11.9, headR: 9.1, legLen: 15.3, tailLen: 17.4, colors: { body: 'honey', accent: 'rose' } },
  },
];

export const cast = {
  humans: humans.map((h) => ({ ...h, spec: scaled(h.spec, k) })),
  pets: pets.map((p) => ({ ...p, spec: scaledPet(p.spec, k) })),
};

export const human = (id: string): CastHuman => cast.humans.find((h) => h.spec.id === id)!;
export const pet = (id: string): CastPet => cast.pets.find((p) => p.spec.id === id)!;
