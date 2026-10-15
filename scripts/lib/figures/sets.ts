// Figuren-Rig (M9b): drei Figurensätze zur Auswahl (Entwurf, noch nichts festgeschrieben, siehe docs/design/FIGUREN.md).
// Jeder Satz: ein größeres Kind, ein kleineres Kind, ein Erwachsener, ein Haustier. Alle gesichtslos (Augen sind eine freiwillige Fassung).

import type { PetSpec } from './pets.ts';
import type { Quirk } from './poses.ts';
import type { HumanSpec } from './rig.ts';

// Alle Maße einer Figur mit einem Faktor malen, damit die Sätze auf der Fläche etwa gleich groß wirken (Linien bleiben 4 und 2,5).
function scaled(spec: HumanSpec, k: number): HumanSpec {
  const keys = ['headR', 'neck', 'torsoH', 'torsoW', 'shoulderW', 'hipW', 'upperArm', 'foreArm', 'upperLeg', 'lowerLeg', 'handR', 'footLen'] as const;
  const out: HumanSpec = { ...spec, limb: { ...spec.limb, w: spec.limb.w * k } };
  for (const key of keys) out[key] = Math.round(spec[key] * k * 10) / 10;
  return out;
}

function scaledPet(spec: PetSpec, k: number): PetSpec {
  const keys = ['bodyRx', 'bodyRy', 'headR', 'legLen', 'legW', 'tailLen'] as const;
  const out: PetSpec = { ...spec };
  for (const key of keys) out[key] = Math.round(spec[key] * k * 10) / 10;
  return out;
}

export type FigureSet = {
  id: 'A' | 'B' | 'C';
  title: string;
  feel: string;
  humans: { spec: HumanSpec; quirk?: Quirk; blurb: string }[];
  pet: { spec: PetSpec; blurb: string };
};

// Satz A: rund und weich. Große Köpfe, kurze dicke Gliedmaßen, Rumpf wie ein Ei, runde Haare, viel Rosé und Leinen.
const A: FigureSet = {
  id: 'A',
  title: 'Satz A: rund und weich',
  feel: 'Knubbelig: große runde Köpfe, kurze dicke Arme und Beine, eiförmige Rümpfe, Locken und Mützchen. Wirkt wie ein Kuscheltier.',
  humans: [
    {
      blurb: 'das größere Kind: Locken, rosa Pulli',
      spec: {
        id: 'joni', name: 'Joni', role: 'child', headR: 14, neck: 2, torsoH: 26, torsoW: 38, shoulderW: 26, hipW: 12,
        upperArm: 12, foreArm: 11, upperLeg: 11, lowerLeg: 10, handR: 5, footLen: 13,
        limb: { style: 'capsule', w: 4.5 }, torso: 'bean',
        colors: { top: 'rose', bottom: 'petrol', shoes: 'ink', hair: 'ink' }, hair: 'curls',
      },
    },
    {
      blurb: 'das kleinere Kind: Mützchen, Petrol-Overall',
      spec: {
        id: 'fenn', name: 'Fenn', role: 'toddler', headR: 13, neck: 2, torsoH: 21, torsoW: 33, shoulderW: 22, hipW: 11,
        upperArm: 10, foreArm: 9, upperLeg: 8, lowerLeg: 7, handR: 4.6, footLen: 12,
        limb: { style: 'capsule', w: 4.2 }, torso: 'bean',
        colors: { top: 'petrol', bottom: 'petrol', shoes: 'rose', hair: 'ink', hat: 'rose', accent: 'paper' }, hair: 'beanie',
      },
    },
    {
      blurb: 'der Erwachsene: Dutt, Leinen-Pulli mit Petrol-Hose',
      spec: {
        id: 'sanne', name: 'Sanne', role: 'adult', headR: 15, neck: 2, torsoH: 34, torsoW: 46, shoulderW: 32, hipW: 14,
        upperArm: 15, foreArm: 14, upperLeg: 15, lowerLeg: 14, handR: 5.4, footLen: 15,
        limb: { style: 'capsule', w: 5 }, torso: 'bean',
        colors: { top: 'paper', bottom: 'petrol', shoes: 'ink', hair: 'ink' }, hair: 'bun',
      },
    },
  ],
  pet: {
    blurb: 'ein rundes Küken',
    spec: { id: 'stups', name: 'Stups', kind: 'chick', bodyRx: 17, bodyRy: 15, headR: 11, legLen: 9, legW: 0, tailLen: 8, colors: { body: 'honey', accent: 'rose' } },
  },
};

// Satz B: eckig und kräftig. Kästchen-Rümpfe, dicke eckige Gliedmaßen, Stiefel, Mützen und Kappen, viel Petrol und Tinte.
const B: FigureSet = {
  id: 'B',
  title: 'Satz B: eckig und kräftig',
  feel: 'Handfest: Kasten-Rümpfe, breite Schultern, dicke Glieder mit kleinen Ecken, Stiefel, Mützen. Wirkt wie Spielzeug aus Holz.',
  humans: [
    {
      blurb: 'das größere Kind: Bob-Haar, Petrol-Jacke mit Gürtel',
      spec: {
        id: 'bent', name: 'Bent', role: 'child', headR: 12, neck: 1, torsoH: 30, torsoW: 38, shoulderW: 34, hipW: 18,
        upperArm: 14, foreArm: 13, upperLeg: 14, lowerLeg: 13, handR: 5, footLen: 15,
        limb: { style: 'block', w: 5.5 }, torso: 'box',
        colors: { top: 'petrol', bottom: 'ink', shoes: 'rose', hair: 'ink', accent: 'paper' }, hair: 'bob',
      },
    },
    {
      blurb: 'das kleinere Kind: Beanie mit Bommel, Rosé-Pullover',
      spec: {
        id: 'fidi', name: 'Fidi', role: 'toddler', headR: 11, neck: 1, torsoH: 24, torsoW: 32, shoulderW: 28, hipW: 15,
        upperArm: 10, foreArm: 9, upperLeg: 10, lowerLeg: 9, handR: 4.6, footLen: 13,
        limb: { style: 'block', w: 5 }, torso: 'box',
        colors: { top: 'rose', bottom: 'petrol', shoes: 'ink', hair: 'ink', hat: 'petrol', accent: 'paper' }, hair: 'beanie',
      },
    },
    {
      blurb: 'der Erwachsene: breit und stark, Leinen-Pulli, Gürtel',
      spec: {
        id: 'hanne', name: 'Hanne', role: 'adult', headR: 13, neck: 1, torsoH: 42, torsoW: 46, shoulderW: 42, hipW: 22,
        upperArm: 20, foreArm: 19, upperLeg: 22, lowerLeg: 21, handR: 5.6, footLen: 17,
        limb: { style: 'block', w: 6.5 }, torso: 'box',
        colors: { top: 'paper', bottom: 'petrol', shoes: 'ink', hair: 'ink', accent: 'ink' }, hair: 'cap',
      },
    },
  ],
  pet: {
    blurb: 'ein kräftiger Hund mit Fleck',
    spec: { id: 'mutz', name: 'Mutz', kind: 'dog', bodyRx: 24, bodyRy: 13, headR: 11, legLen: 15, legW: 4, tailLen: 8, colors: { body: 'paper', patch: 'honey', accent: 'honey' } },
  },
};

// Satz C: schlank und verspielt. Lange dünne Glieder, kleine Köpfe, Kleid und Schal, Haarbüschel, leicht schiefe Haltung.
const C: FigureSet = {
  id: 'C',
  title: 'Satz C: schlank und verspielt',
  feel: 'Luftig: lange dünne Linien-Glieder, kleine Köpfe, Kleid, Schal, Haarbüschel, schiefer Kopf. Wirkt wie eine Zeichnung im Skizzenbuch.',
  humans: [
    {
      blurb: 'das größere Kind: Haarbüschel, Rosé-Kleid',
      spec: {
        id: 'jette', name: 'Jette', role: 'child', headR: 10, neck: 3, torsoH: 36, torsoW: 28, shoulderW: 20, hipW: 10,
        upperArm: 17, foreArm: 16, upperLeg: 20, lowerLeg: 19, handR: 4, footLen: 11,
        limb: { style: 'line', w: 0 }, torso: 'dress',
        colors: { top: 'rose', bottom: 'ink', shoes: 'petrol', hair: 'ink' }, hair: 'tuft',
      },
      quirk: { tilt: 7 },
    },
    {
      blurb: 'das kleinere Kind: Dutt, Petrol-Kleidchen',
      spec: {
        id: 'nolli', name: 'Nolli', role: 'toddler', headR: 9.5, neck: 2, torsoH: 26, torsoW: 22, shoulderW: 17, hipW: 9,
        upperArm: 12, foreArm: 11, upperLeg: 14, lowerLeg: 13, handR: 3.8, footLen: 10,
        limb: { style: 'line', w: 0 }, torso: 'dress',
        colors: { top: 'petrol', bottom: 'ink', shoes: 'rose', hair: 'ink' }, hair: 'bun',
      },
      quirk: { tilt: -6 },
    },
    {
      blurb: 'der Erwachsene: groß und schlank, langer Mantel, Schal',
      spec: {
        id: 'ilka', name: 'Ilka', role: 'adult', headR: 11, neck: 4, torsoH: 52, torsoW: 32, shoulderW: 26, hipW: 12,
        upperArm: 24, foreArm: 23, upperLeg: 28, lowerLeg: 27, handR: 4.4, footLen: 12,
        limb: { style: 'line', w: 0 }, torso: 'dress',
        colors: { top: 'petrol', bottom: 'ink', shoes: 'ink', hair: 'ink', accent: 'rose' }, hair: 'bob', scarf: true,
      },
      quirk: { tilt: 6, handOnHip: 'R' },
    },
  ],
  pet: {
    blurb: 'eine schlanke Katze mit langem Schwanz',
    spec: { id: 'tuepfel', name: 'Tüpfel', kind: 'cat', bodyRx: 22, bodyRy: 8.5, headR: 9, legLen: 20, legW: 0, tailLen: 26, colors: { body: 'paper', accent: 'rose' } },
  },
};

const factors: Record<FigureSet['id'], number> = { A: 1.25, B: 1.05, C: 0.9 };

function apply(set: FigureSet): FigureSet {
  const k = factors[set.id];
  return {
    ...set,
    humans: set.humans.map((h) => ({ ...h, spec: scaled(h.spec, k) })),
    pet: { ...set.pet, spec: scaledPet(set.pet.spec, k) },
  };
}

export const figureSets: readonly FigureSet[] = [apply(A), apply(B), apply(C)];
