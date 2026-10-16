// Baukasten (M9b): Szene prüfen und zu einem SVG zusammensetzen (docs/bausteine/README.md).
// Eine Szene wählt ein Layout und setzt Bausteine in dessen feste Plätze; Koordinaten gibt es nicht.
// `renderSceneTemplate` liefert das SVG mit Farbplätzen `{{name}}` (wie die Vorlagen in assets/illustrations/src/),
// `renderSceneSvg` setzt die Palette ein. Reine Funktionen, ohne Dateizugriff.

import { backdrop, baseY, cornerZone, frame, layouts, margin, maxItems, maxOverlap, type Slot } from './layouts.ts';
import { renderTemplate } from '../illustrations.ts';
import { animalBannedHazards } from '../figures/castRules.ts';
import { getMaterialInfo, isMaterialKey } from '../../../src/features/activities/materials.ts';
import type { Block, Catalog, LoadedBlock, Person, Scene, SceneItem, TintName } from './types.ts';

// Maße der Linien in der fertigen Zeichnung (ILLUSTRATIONEN.md): 4 für Umrisse, 2,5 für Details, 3 Einheiten Versatz der Farbflächen.
const lineWidth = 4;
const fineWidth = 2.5;
const shiftWidth = 3;

export const maxSceneBytes = 10 * 1024; // wie jede Zeichnung (ILLUSTRATIONEN.md, „Format“)

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// Wo ein Baustein in der Szene steht: Standpunkt, Größe, Spiegelung und der Rahmen auf der Fläche.
export type Placement = {
  item: SceneItem;
  block: LoadedBlock;
  slot: Slot;
  x: number;
  y: number;
  size: number;
  flip: boolean;
  tint: TintName | undefined;
  box: { minX: number; maxX: number; minY: number; maxY: number };
};

export type ActivityContext = {
  materials: readonly string[];
  ageMin: number;
  ageMax: number;
  // Alle Texte der Aktivität je Sprache (Titel, Kurzbeschreibung, Schritte, Hinweis), kleingeschrieben, und nur der Sicherheitshinweis.
  text: Readonly<Record<string, string>>;
  safety: Readonly<Record<string, string>>;
};

export function surfaceY(catalog: Catalog): number | undefined {
  const table = catalog.get('table');
  return table?.surface === undefined ? undefined : baseY - table.surface;
}

// Setzt alle Elemente einer Szene auf ihre Plätze. `null`-Einträge gibt es nicht: Probleme meldet checkScene.
export function placeItems(scene: Scene, catalog: Catalog): Placement[] | null {
  const layout = layouts[scene.layout];
  if (layout === undefined) return null;
  const top = surfaceY(catalog);
  const placements: Placement[] = [];
  for (const item of scene.items) {
    const slot = layout.slots[item.slot];
    const block = catalog.get(item.block);
    if (slot === undefined || block === undefined) return null;
    const y = slot.y === 'surface' ? top : slot.y;
    if (y === undefined) return null;
    const size = item.size ?? slot.sizes[0];
    const flip = item.flip ?? slot.x > frame.w / 2;
    const left = flip ? -block.box.x1 : block.box.x0;
    const right = flip ? -block.box.x0 : block.box.x1;
    placements.push({
      item,
      block,
      slot,
      x: slot.x,
      y,
      size,
      flip,
      tint: item.tint ?? block.defaultTint,
      box: { minX: slot.x + left * size, maxX: slot.x + right * size, minY: y - block.box.h * size, maxY: y },
    });
  }
  return placements;
}

function area(box: Placement['box']): number {
  return Math.max(0, box.maxX - box.minX) * Math.max(0, box.maxY - box.minY);
}

function overlap(a: Placement['box'], b: Placement['box']): number {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  return w > 0 && h > 0 ? w * h : 0;
}

function persons(placements: readonly Placement[]): { person: Person; x: number }[] {
  return placements.flatMap((placement) => (placement.block.person === undefined ? [] : [{ person: placement.block.person, x: placement.x }]));
}

// Die nächste Figur zu einem Platz, `undefined` bei Gleichstand oder ohne Figur.
function nearestPerson(x: number, placements: readonly Placement[]): Person | undefined {
  const all = persons(placements).map((entry) => ({ ...entry, distance: Math.abs(entry.x - x) }));
  if (all.length === 0) return undefined;
  const best = Math.min(...all.map((entry) => entry.distance));
  const winners = all.filter((entry) => entry.distance === best);
  return winners.length === 1 ? winners[0].person : undefined;
}

const hasTerm = (text: string, terms: readonly string[]) => terms.some((term) => text.includes(term.toLowerCase()));

// Die Sicherheitsregeln und der Abgleich mit dem Text einer Aktivität (docs/bausteine/README.md, „Sicherheit“).
// Das ist ein mechanisches Sieb wie checkSafety: Es findet Verstöße, versteht aber kein Bild.
export function checkAgainstActivity(placements: readonly Placement[], activity: ActivityContext): string[] {
  const problems: string[] = [];
  const present = persons(placements);
  const adultPresent = present.some((entry) => entry.person === 'adult');
  const blockIds = new Set(placements.map((placement) => placement.block.id));

  // Tiere nie bei Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung (und nie bei Feuer): weder im Bild noch im Material der Aktivität.
  if (placements.some((placement) => placement.block.animal === true)) {
    for (const placement of placements) {
      const bad = placement.block.hazards.filter((hazard) => (animalBannedHazards as readonly string[]).includes(hazard));
      if (bad.length > 0) problems.push(`Ein Tier im Bild, aber „${placement.block.id}“ (${bad.join(', ')}): Tiere nie bei Hitze, Feuer, Messer oder Schere.`);
    }
    for (const key of activity.materials) {
      if (!isMaterialKey(key)) continue;
      const bad = (getMaterialInfo(key).hazards ?? []).filter((hazard) => (animalBannedHazards as readonly string[]).includes(hazard));
      if (bad.length > 0) problems.push(`Ein Tier im Bild, aber die Aktivität nutzt „${key}“ (${bad.join(', ')}): Tiere nie bei Hitze, Feuer, Messer oder Schere.`);
    }
  }

  for (const placement of placements) {
    const { block } = placement;
    // Nichts im Bild, was der Text nicht sagt: jeder nicht neutrale Baustein muss über Material oder Begriff gedeckt sein.
    if (!block.neutral) {
      const byMaterial = block.materials.some((key) => activity.materials.includes(key));
      const byTerm = Object.entries(block.terms).some(([language, terms]) => hasTerm(activity.text[language] ?? '', terms));
      if (!byMaterial && !byTerm) problems.push(`„${block.id}“ ist im Text der Aktivität nicht gedeckt (weder Material noch Begriff): Ein Bild zeigt nichts, was der Text nicht sagt.`);
    }
    for (const hazard of block.hazards) {
      if (hazard === 'sharp' || hazard === 'heat') {
        // Schere, Messer, Hitze: nur in der Hand eines Erwachsenen, also ist die nächste Figur ein Erwachsener, und kein Kleinkind im Bild.
        if (nearestPerson(placement.x, placements) !== 'adult') problems.push(`„${block.id}“ (${hazard === 'sharp' ? 'scharf' : 'heiß'}) steht nicht eindeutig bei einem Erwachsenen.`);
        if (present.some((entry) => entry.person === 'toddler')) problems.push(`„${block.id}“ (${hazard === 'sharp' ? 'scharf' : 'heiß'}) und ein Kleinkind im selben Bild.`);
      }
      if (hazard === 'heat' && !blockIds.has('oven-mitt')) problems.push(`„${block.id}“ (heiß) ohne Ofenhandschuh im Bild.`);
      if (hazard === 'goggles' && !/brille|goggles|glasses/i.test(Object.values(activity.safety).join(' '))) {
        problems.push('Schutzbrille im Bild, aber der Sicherheitshinweis nennt sie nicht.');
      }
      if (hazard === 'smallParts' && activity.ageMin < 3) problems.push(`„${block.id}“ (Kleinteile) bei Kindern unter 3 Jahren.`);
      if (hazard === 'water' && activity.ageMin < 6 && !adultPresent) problems.push(`„${block.id}“ (Wasser) ohne Erwachsenen im Bild bei Kindern unter 6 Jahren.`);
    }
    if (block.person === 'toddler' && activity.ageMin > 2) problems.push('Ein Kleinkind im Bild, aber die Aktivität beginnt erst ab 3 Jahren.');
    if (block.person === 'child' && activity.ageMax < 3) problems.push('Ein Kind im Bild, aber die Aktivität ist nur für Kinder unter 3 Jahren (dann ein Kleinkind).');
    if (block.person === 'teen' && activity.ageMax < 12) problems.push('Ein Jugendlicher im Bild, aber die Aktivität ist nur für jüngere Kinder.');
  }
  return problems;
}

// Alle Probleme einer Szene als Sätze, leer = in Ordnung. Mit `activity` auch die Sicherheitsregeln und der Textabgleich.
export function checkScene(scene: Scene, catalog: Catalog, activity?: ActivityContext): string[] {
  const problems: string[] = [];
  const layout = layouts[scene.layout];
  if (layout === undefined) return [`Unbekanntes Layout „${String(scene.layout)}“ (erlaubt: ${Object.keys(layouts).join(', ')}).`];
  if (scene.items.length === 0) problems.push('Keine Bausteine.');
  if (scene.items.length > maxItems) problems.push(`Höchstens ${maxItems} Bausteine, hier ${scene.items.length}.`);
  const used = new Set<string>();
  for (const item of scene.items) {
    const slot = layout.slots[item.slot];
    const block = catalog.get(item.block);
    if (slot === undefined) problems.push(`Platz „${item.slot}“ gibt es im Layout „${layout.name}“ nicht (erlaubt: ${Object.keys(layout.slots).join(', ')}).`);
    else if (used.has(item.slot)) problems.push(`Platz „${item.slot}“ ist doppelt besetzt.`);
    used.add(item.slot);
    if (block === undefined) {
      problems.push(`Baustein „${item.block}“ gibt es nicht.`);
      continue;
    }
    if (block.id === 'ground-line') problems.push('Die Standlinie setzt der Zeichner selbst (`ground`), nicht als Baustein.');
    if (slot === undefined) continue;
    if (!slot.kinds.includes(block.kind)) problems.push(`„${block.id}“ (${block.kind}) passt nicht auf den Platz „${item.slot}“ (erlaubt: ${slot.kinds.join(', ')}).`);
    if (item.size !== undefined && !slot.sizes.includes(item.size)) problems.push(`Größe ${item.size} ist auf dem Platz „${item.slot}“ nicht erlaubt (${slot.sizes.join(', ')}).`);
    if (item.tint !== undefined && !(block.tints ?? []).includes(item.tint)) problems.push(`„${block.id}“ gibt es nicht in „${item.tint}“ (erlaubt: ${(block.tints ?? []).join(', ') || 'keine Wahl'}).`);
  }
  if (scene.layout === 'table' && !scene.items.some((item) => item.slot === 'table')) problems.push('Das Layout „table“ braucht einen Tisch auf dem Platz „table“.');
  if (scene.layout === 'table' && surfaceY(catalog) === undefined) problems.push('Der Tisch im Katalog hat keine Tischplatte (`surface`).');
  if (problems.length > 0) return problems;

  const placements = placeItems(scene, catalog);
  if (placements === null) return ['Szene nicht lesbar.'];

  // Maße: im Rand, nicht in den Ecken der Pille, nicht übereinander
  for (const placement of placements) {
    const { box, block } = placement;
    if (box.minX < margin || box.maxX > frame.w - margin || box.minY < margin || box.maxY > baseY + 5) {
      problems.push(`„${block.id}“ auf „${placement.item.slot}“ ragt aus dem Rand von ${margin} Einheiten (${Math.round(box.minX)}…${Math.round(box.maxX)} × ${Math.round(box.minY)}…${Math.round(box.maxY)}).`);
    }
    const inLeft = box.minX < cornerZone.w && box.minY < cornerZone.h;
    const inRight = box.maxX > frame.w - cornerZone.w && box.minY < cornerZone.h;
    if (inLeft || inRight) problems.push(`„${block.id}“ auf „${placement.item.slot}“ liegt in einer oberen Ecke (dort sitzt die Kategorie-Pille, ${cornerZone.w} × ${cornerZone.h}).`);
  }
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i];
      const b = placements[j];
      if (a.block.id === 'table' || b.block.id === 'table') continue; // Dinge stehen auf dem Tisch
      const share = overlap(a.box, b.box) / Math.min(area(a.box), area(b.box));
      if (share > maxOverlap) problems.push(`„${a.block.id}“ und „${b.block.id}“ überdecken sich zu ${Math.round(share * 100)} % (höchstens ${maxOverlap * 100} %).`);
    }
  }
  if (activity !== undefined) problems.push(...checkAgainstActivity(placements, activity));
  return problems;
}

// Setzt Maß- und Tonplätze eines Bausteins für eine Größe ein: Die sichtbare Linienstärke bleibt 4 bzw. 2,5, auch wenn der Baustein verkleinert wird.
function fillBlock(block: Block & { svg: string }, size: number, tint: TintName | undefined): string {
  return block.svg
    .replace(/\{\{line\}\}/g, round(lineWidth / size))
    .replace(/\{\{fine\}\}/g, round(fineWidth / size))
    .replace(/\{\{shift\}\}/g, round(shiftWidth / size))
    .replace(/\{\{tint\}\}/g, tint === undefined ? '{{paper}}' : `{{${tint}}}`)
    .split('\n')
    .map((line) => line.trim())
    .join('');
}

function transformOf(placement: Placement): string {
  const { x, y, size, flip } = placement;
  return `translate(${round(x)} ${round(y)}) scale(${round(flip ? -size : size)} ${round(size)})`;
}

// Das SVG der Szene mit Farbplätzen. Wirft bei einer Szene mit Problemen (dann vorher checkScene aufrufen).
export function renderSceneTemplate(scene: Scene, catalog: Catalog): string {
  const placements = placeItems(scene, catalog);
  if (placements === null) throw new Error('Szene nicht lesbar (Layout, Platz oder Baustein unbekannt).');
  const ordered = [...placements].sort((a, b) => a.slot.z - b.slot.z);
  const parts: string[] = [];
  const ground = catalog.get('ground-line');
  if (scene.ground !== false && ground !== undefined) {
    parts.push(`<g transform="translate(${frame.w / 2} ${baseY})" stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round">${fillBlock(ground, 1, undefined)}</g>`);
  }
  for (const placement of ordered) {
    parts.push(
      `<g transform="${transformOf(placement)}" stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round">${fillBlock(placement.block, placement.size, placement.tint)}</g>`,
    );
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.w * 3}" height="${frame.h * 3}" viewBox="0 0 ${frame.w} ${frame.h}">`,
    `<rect width="${frame.w}" height="${frame.h}" fill="{{ground}}"/>`,
    `<circle cx="${backdrop.cx}" cy="${backdrop.cy}" r="${backdrop.r}" fill="{{paper}}"/>`,
    ...parts,
    '</svg>',
  ].join('\n');
}

export function renderSceneSvg(scene: Scene, catalog: Catalog): string {
  return renderTemplate(renderSceneTemplate(scene, catalog));
}

// Aus einer Aktivität den Kontext für den Abgleich machen (alle Texte kleingeschrieben).
export function contextFromActivity(activity: {
  materials: readonly string[];
  ageMin: number;
  ageMax: number;
  translations: Readonly<Record<string, { title: string; summary: string; steps: readonly string[]; safetyNote?: string }>>;
}): ActivityContext {
  const text: Record<string, string> = {};
  const safety: Record<string, string> = {};
  for (const [language, entry] of Object.entries(activity.translations)) {
    text[language] = [entry.title, entry.summary, ...entry.steps, entry.safetyNote ?? ''].join(' ').toLowerCase();
    safety[language] = entry.safetyNote ?? '';
  }
  return { materials: activity.materials, ageMin: activity.ageMin, ageMax: activity.ageMax, text, safety };
}
