// Baukasten (M9b): Layouts und ihre festen Plätze. Das Modell (oder ich) setzt nie Koordinaten, sondern wählt einen Platz.
// Alle Maße in Einheiten der 400×200-Fläche (docs/design/ILLUSTRATIONEN.md). Reine Daten, ohne UI.

import type { BlockKind, LayoutName } from './types.ts';

// Was auf einem Platz stehen darf: Arten von Bausteinen oder eine Figur der Besetzung.
export type SlotKind = Exclude<BlockKind, 'content' | 'ground'> | 'figure';

export const frame = { w: 400, h: 200 } as const;
export const baseY = 176; // Standlinie: Hier stehen Figuren und Gegenstände (24 Einheiten Rand nach unten)
export const handsY = 160; // Tischkante im Layout `hands`: Darunter kommen die Unterarme vom Bildrand (seit 2026-10-18 tiefer, damit die Unterarme kürzer sind; vorher 150)
export const margin = 24; // alles bleibt innerhalb dieses Rands
// Grund: ein weicher großer Kreis hinter dem Motiv (ILLUSTRATIONEN.md, „Grund“).
export const backdrop = { cx: 200, cy: 108, r: 90 } as const;
// Auf Titelbildern liegt oben in den Ecken die Kategorie-Pille (links, bei Rechts-nach-links rechts): Dort bleibt nichts Wichtiges (etwa 180 × 56).
export const cornerZone = { w: 180, h: 56 } as const;

export const maxItems = 6;
export const maxOverlap = 0.35; // Anteil der kleineren Fläche, den sich zwei Bausteine überdecken dürfen

export type Slot = {
  x: number;
  y: number | 'surface'; // `surface`: auf der Tischplatte
  z: number; // Zeichenreihenfolge, kleiner = weiter hinten
  kinds: readonly SlotKind[];
  sizes: readonly number[]; // erlaubte Größen, die erste ist die Vorgabe
};

// `groundY`: Höhe der Standlinie, wenn sie nicht `baseY` ist (Layout `hands`: die Tischkante der Nahaufnahme).
export type Layout = { name: LayoutName; description: string; groundY?: number; slots: Readonly<Record<string, Slot>> };

const everything: readonly SlotKind[] = ['figure', 'object', 'furniture', 'nature'];
const things: readonly SlotKind[] = ['object', 'furniture', 'nature'];

export const layouts: Readonly<Record<LayoutName, Layout>> = {
  hero: {
    name: 'hero',
    description: 'Ein großer Gegenstand in der Mitte, daneben bis zu zwei kleine (Nahaufnahme).',
    slots: {
      main: { x: 200, y: baseY, z: 2, kinds: everything, sizes: [1.5, 1] },
      left: { x: 100, y: baseY, z: 1, kinds: ['figure', 'object', 'nature'], sizes: [1, 0.6] },
      right: { x: 300, y: baseY, z: 1, kinds: ['figure', 'object', 'nature'], sizes: [1, 0.6] },
    },
  },
  table: {
    name: 'table',
    description: 'Ein Tisch mit bis zu drei Dingen, daneben bis zu zwei Figuren.',
    slots: {
      table: { x: 200, y: baseY, z: 1, kinds: ['furniture'], sizes: [1] },
      on1: { x: 150, y: 'surface', z: 2, kinds: ['object'], sizes: [1, 0.6] },
      on2: { x: 200, y: 'surface', z: 2, kinds: ['object'], sizes: [1, 0.6] },
      on3: { x: 250, y: 'surface', z: 2, kinds: ['object'], sizes: [1, 0.6] },
      left: { x: 70, y: baseY, z: 0, kinds: ['figure', 'object', 'nature'], sizes: [1] },
      right: { x: 330, y: baseY, z: 0, kinds: ['figure', 'object', 'nature'], sizes: [1] },
      // hinter dem Tisch in der Mitte: der einzige Platz, auf dem ein Erwachsener unter den Ecken der Pille bleibt (Schritt 3a)
      back: { x: 200, y: baseY, z: 0.5, kinds: ['figure'], sizes: [1] },
    },
  },
  pair: {
    name: 'pair',
    description: 'Ein Erwachsener und/oder ein Kind mit einem Gegenstand dazwischen.',
    slots: {
      left: { x: 105, y: baseY, z: 1, kinds: everything, sizes: [1, 0.6] },
      right: { x: 295, y: baseY, z: 1, kinds: everything, sizes: [1, 0.6] },
      middle: { x: 200, y: baseY, z: 2, kinds: everything, sizes: [1, 1.5, 0.6] },
    },
  },
  outdoor: {
    name: 'outdoor',
    description: 'Standlinie mit Natur und Figuren, draußen.',
    slots: {
      s1: { x: 80, y: baseY, z: 1, kinds: everything, sizes: [1, 0.6] },
      s2: { x: 150, y: baseY, z: 1, kinds: everything, sizes: [1, 0.6] },
      s3: { x: 250, y: baseY, z: 1, kinds: everything, sizes: [1, 0.6] },
      s4: { x: 320, y: baseY, z: 1, kinds: everything, sizes: [1, 0.6] },
      mid: { x: 200, y: baseY, z: 1, kinds: ['figure'], sizes: [1] }, // Mitte: Platz für einen Erwachsenen (Ecken der Pille)
      front: { x: 200, y: baseY, z: 2, kinds: things, sizes: [1, 0.6] },
    },
  },
  hands: {
    name: 'hands',
    description: 'Nahaufnahme für Schrittbilder: ein großer Gegenstand auf der Tischkante, Hände kommen vom unteren Rand und halten ihn.',
    groundY: handsY,
    slots: {
      object: { x: 200, y: handsY, z: 2, kinds: ['object'], sizes: [2, 1.5] },
      left: { x: 84, y: handsY, z: 1, kinds: ['object', 'nature'], sizes: [1.5, 1] },
      right: { x: 316, y: handsY, z: 1, kinds: ['object', 'nature'], sizes: [1.5, 1] },
    },
  },
};

export const layoutNames = Object.keys(layouts) as LayoutName[];
