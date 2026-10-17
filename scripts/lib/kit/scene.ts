// Baukasten (M9b): Szene prüfen und zu einem SVG zusammensetzen (docs/bausteine/README.md).
// Eine Szene wählt ein Layout und setzt Bausteine und Figuren der Besetzung in dessen feste Plätze; Koordinaten gibt es nicht.
// Figuren halten Gegenstände an deren Haltepunkten (Schritt 3a, figureItems.ts), Behälter haben Inhalt (draw.ts).
// `renderSceneTemplate` liefert das SVG mit Farbplätzen `{{name}}` (wie die Vorlagen in assets/illustrations/src/),
// `renderSceneSvg` setzt die Palette ein. Reine Funktionen, ohne Dateizugriff.

import { backdrop, baseY, cornerZone, frame, layouts, margin, maxItems, maxOverlap, type Slot } from './layouts.ts';
import { renderTemplate } from '../illustrations.ts';
import { animalBannedHazards, figureFitsActivity } from '../figures/castRules.ts';
import { backgrounds, skinCarriesOn } from '../figures/skin.ts';
import { getMaterialInfo, isMaterialKey } from '../../../src/features/activities/materials.ts';
import { contentFor, drawBlock, drawLoose, fillBlock, type Pose2D } from './draw.ts';
import { renderFigure, renderHands, type FigureRender } from './figureItems.ts';
import type { Box } from './geometry.ts';
import type { Catalog, KitHazard, LoadedBlock, Person, Scene, SceneItem, TintName } from './types.ts';

export { fillBlock };

// Grenze für Titel- und Schrittbilder (Clemens, 16. Oktober 2026; ILLUSTRATIONEN.md, „Format“). Das Bucket erlaubt 20 KB (Migration 0005).
export const maxSceneBytes = 14 * 1024;
// Kinder halten mindestens so viel Abstand (Einheiten, waagerecht) zu heißen Dingen (ILLUSTRATIONEN.md, „Sicherheit“).
export const hotDistance = 20;

// Wo etwas in der Szene steht. Ein Platz trägt entweder einen Baustein (mit Inhalt, im Layout `hands` auch mit Händen) oder eine Figur.
export type Placement = {
  item: SceneItem;
  slot: Slot;
  x: number;
  y: number;
  size: number;
  flip: boolean;
  block?: LoadedBlock;
  tint?: TintName;
  content?: LoadedBlock;
  hot: boolean;
  figure?: FigureRender; // Figur der Besetzung oder Hände (Layout `hands`)
  box: Box; // für Rand, Ecken und Überdeckung (bei Händen nur der Gegenstand und das Werkzeug)
  back: string; // SVG hinter dem Tisch (Körper der Figuren)
  front: string; // SVG davor
  problems: string[];
};

// Ein Ding im Bild für die Sicherheitsregeln: ein Baustein auf einem Platz oder in der Hand, mit Inhalt.
export type Thing = {
  block: LoadedBlock;
  content?: LoadedBlock;
  hot: boolean;
  tint?: TintName;
  box: Box;
  holder?: FigureRender; // wer es hält (undefined: liegt oder steht frei)
};

export type ActivityContext = {
  materials: readonly string[];
  ageMin: number;
  ageMax: number;
  // Alle Texte der Aktivität je Sprache (Titel, Kurzbeschreibung, Schritte, Hinweis), kleingeschrieben, und nur der Sicherheitshinweis.
  text: Readonly<Record<string, string>>;
  safety: Readonly<Record<string, string>>;
};

// Regen-Kleidung der Figuren (Jacke und Gummistiefel) braucht wie jeder Gegenstand Deckung im Text.
export const rainOutfitCover = {
  materials: ['rainBoots', 'rainJacket'],
  terms: {
    de: ['regenjacke', 'regenmantel', 'gummistiefel', 'matschhose', 'regensachen', 'regenkleidung'],
    en: ['rain jacket', 'raincoat', 'rain boots', 'rubber boots', 'wellies', 'rain gear'],
  },
} as const;

export function surfaceY(catalog: Catalog): number | undefined {
  const table = catalog.get('table');
  return table?.surface === undefined ? undefined : baseY - table.surface;
}

const emptyBox = (x: number, y: number): Box => ({ minX: x, maxX: x, minY: y, maxY: y });

// Setzt alle Elemente einer Szene auf ihre Plätze. `null`, wenn Layout, Platz oder Baustein unbekannt ist (das meldet checkScene).
export function placeItems(scene: Scene, catalog: Catalog): Placement[] | null {
  const layout = layouts[scene.layout];
  if (layout === undefined) return null;
  const top = surfaceY(catalog);
  const hasTable = scene.layout === 'table' && scene.items.some((item) => item.slot === 'table' && item.block === 'table');
  const placements: Placement[] = [];
  for (const item of scene.items) {
    const slot = layout.slots[item.slot];
    if (slot === undefined) return null;
    const y = slot.y === 'surface' ? top : slot.y;
    if (y === undefined) return null;
    const flip = item.flip ?? slot.x > frame.w / 2;
    if (item.figure !== undefined) {
      const atTable = hasTable && (item.slot === 'left' || item.slot === 'right' || item.slot === 'back') ? top : undefined;
      const figure = renderFigure(item, catalog, slot.x, y, flip, atTable);
      placements.push({ item, slot, x: slot.x, y, size: 1, flip, hot: false, figure, box: figure.box, back: wrapFigure(figure.back), front: wrapFigure(figure.front), problems: figure.problems });
      continue;
    }
    const block = item.block === undefined ? undefined : catalog.get(item.block);
    if (block === undefined) return null;
    const size = item.size ?? slot.sizes[0];
    const problems: string[] = [];
    let content: LoadedBlock | undefined;
    if (item.content !== undefined) {
      const found = contentFor(catalog, block, item.content);
      if (typeof found === 'string') problems.push(found);
      else content = found;
    }
    const at: Pose2D = { x: slot.x, y, size, flip, rot: 0, mirror: false };
    const tint = item.tint ?? block.defaultTint;
    const drawn = block.kind === 'content' ? drawLoose(block, at) : drawBlock(block, at, { tint, content, hot: item.hot });
    let figure: FigureRender | undefined;
    let box = drawn.box;
    if (item.hands !== undefined) {
      figure = renderHands(item.hands, block, at, catalog);
      problems.push(...figure.problems);
      for (const held of figure.held) box = { minX: Math.min(box.minX, held.box.minX), maxX: Math.max(box.maxX, held.box.maxX), minY: Math.min(box.minY, held.box.minY), maxY: Math.max(box.maxY, held.box.maxY) };
    }
    placements.push({ item, slot, x: slot.x, y, size, flip, block, tint, content, hot: item.hot === true, figure, box, back: '', front: drawn.svg + wrapFigure(figure?.front ?? ''), problems });
  }
  return placements;
}

function area(box: Box): number {
  return Math.max(0, box.maxX - box.minX) * Math.max(0, box.maxY - box.minY);
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  return w > 0 && h > 0 ? w * h : 0;
}

const gapX = (a: Box, b: Box): number => Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));

// Alle Dinge im Bild: Bausteine auf Plätzen (im Layout `hands` von den Händen gehalten) und Gegenstände in den Händen der Figuren.
export function thingsOf(placements: readonly Placement[]): Thing[] {
  const things: Thing[] = [];
  for (const placement of placements) {
    if (placement.block !== undefined) {
      things.push({ block: placement.block, content: placement.content, hot: placement.hot, tint: placement.tint, box: placement.box, holder: placement.figure });
    }
    for (const held of placement.figure?.held ?? []) {
      things.push({ block: held.block, content: held.content, hot: held.hot, tint: held.tint, box: held.box, holder: held.held ? placement.figure : undefined });
    }
  }
  return things;
}

export function hazardsOf(thing: Thing): KitHazard[] {
  const all = new Set<KitHazard>([...thing.block.hazards, ...(thing.content?.hazards ?? [])]);
  if (thing.hot) all.add('heat');
  return [...all];
}

const isPetrol = (block: LoadedBlock, tint: TintName | undefined): boolean => tint === 'petrol' || block.svg.includes('{{petrol}}');

const figuresOf = (placements: readonly Placement[]): FigureRender[] => placements.flatMap((placement) => (placement.figure === undefined ? [] : [placement.figure]));

const hasTerm = (text: string, terms: readonly string[]) => terms.some((term) => text.includes(term.toLowerCase()));
const covered = (cover: { materials: readonly string[]; terms: Readonly<Record<string, readonly string[]>> }, activity: ActivityContext): boolean =>
  cover.materials.some((key) => activity.materials.includes(key)) || Object.entries(cover.terms).some(([language, terms]) => hasTerm(activity.text[language] ?? '', terms));

const personLabel: Record<Person, string> = { adult: 'Erwachsene', teen: 'ältere Kind', child: 'Kind', toddler: 'Kleinkind' };

// Darf ein Kind dieses scharfe Ding halten? Nur eine Kinderschere (`kidSafe`), nur wenn die Aktivität es nach der Sicherheits-Checkliste erlaubt:
// Schere ab 3 Jahren (Punkt 5), „mit Erwachsenen“ (Punkt 2: ein Erwachsener im Bild), und der Text nennt die Kinderschere. Wo die Checkliste schweigt, gilt „nur Erwachsene“.
export function kidSharpProblems(thing: Thing, holder: FigureRender, activity: ActivityContext, adultPresent: boolean): string[] {
  const id = thing.block.id;
  if (thing.block.kidSafe !== true) return [`„${id}“ (scharf) hält das ${personLabel[holder.person ?? 'child']} „${holder.id}“: Scharfes nur in der Hand eines Erwachsenen.`];
  const problems: string[] = [];
  if (holder.person === 'toddler') problems.push(`„${id}“ in der Hand eines Kleinkinds: nie.`);
  if (activity.ageMin < 3) problems.push(`„${id}“ in Kinderhand, aber die Aktivität beginnt unter 3 Jahren (Checkliste, Punkt 5).`);
  if (!adultPresent) problems.push(`„${id}“ in Kinderhand ohne Erwachsenen im Bild (Checkliste, Punkt 2: mit Erwachsenen).`);
  if (thing.block.kidTerms === undefined || !covered({ materials: [], terms: thing.block.kidTerms }, activity)) {
    problems.push(`„${id}“ in Kinderhand, aber der Text nennt sie nicht (${[...(thing.block.kidTerms?.de ?? []), ...(thing.block.kidTerms?.en ?? [])].join(', ')}).`);
  }
  return problems;
}

// Die Sicherheitsregeln und der Abgleich mit dem Text einer Aktivität (docs/bausteine/README.md, „Sicherheit“).
// Das ist ein mechanisches Sieb wie checkSafety: Es findet Verstöße, versteht aber kein Bild.
export function checkAgainstActivity(placements: readonly Placement[], activity: ActivityContext, catalog?: Catalog): string[] {
  const problems: string[] = [];
  const figures = figuresOf(placements);
  const humans = figures.filter((figure) => figure.person !== undefined);
  const adultPresent = humans.some((figure) => figure.person === 'adult');
  const toddlerPresent = humans.some((figure) => figure.person === 'toddler');
  const animalPresent = figures.some((figure) => figure.animal);
  const things = thingsOf(placements);

  // Hautton und Petrol: Trägt ein Hautton auf Petrol nicht (Haut gegen Petrol unter 3:1 und Umriss gegen Haut unter 3:1),
  // liegt hinter oder unter Kopf und Händen der Figur nichts Petrolfarbenes: kein Baustein, kein Inhalt (Wasser), keine Kapuze, kein Ärmel, keine Kleidung einer anderen Figur.
  for (const figure of humans) {
    if (figure.skin === undefined || skinCarriesOn(figure.skin, backgrounds.petrol)) continue;
    const petrol: { box: Box; label: string }[] = [];
    for (const thing of things) {
      if (isPetrol(thing.block, thing.tint)) petrol.push({ box: thing.box, label: `„${thing.block.id}“ (Petrol)` });
      if (thing.content !== undefined && isPetrol(thing.content, thing.content.defaultTint)) petrol.push({ box: thing.box, label: `Inhalt „${thing.content.id}“ (Petrol)` });
    }
    for (const other of figures) {
      for (const shape of other.petrolShapes) {
        if (other === figure && !shape.own) continue;
        if (other !== figure && shape.own === false) petrol.push({ box: shape.box, label: `die Petrol-Kleidung von „${other.id}“` });
        else if (other === figure) petrol.push({ box: shape.box, label: 'die eigene Petrol-Kapuze oder der Petrol-Ärmel' });
        else petrol.push({ box: shape.box, label: `Petrol an „${other.id}“` });
      }
    }
    const reported = new Set<string>();
    for (const skin of figure.skinShapes) {
      for (const entry of petrol) {
        if (overlap(skin, entry.box) <= 0 || reported.has(entry.label)) continue;
        reported.add(entry.label);
        problems.push(`Der Hautton von „${figure.id}“ (${figure.skin}) trägt auf Petrol nicht, aber ${entry.label} liegt an Kopf oder Händen.`);
      }
    }
  }

  // Tiere nie bei Backofen, Herd, heißen Gegenständen, Messer oder Schere (und nie bei Feuer): weder im Bild noch im Material der Aktivität.
  if (animalPresent) {
    for (const thing of things) {
      const bad = hazardsOf(thing).filter((hazard) => (animalBannedHazards as readonly string[]).includes(hazard));
      if (bad.length > 0) problems.push(`Ein Tier im Bild, aber „${thing.block.id}“ (${bad.join(', ')}): Tiere nie bei Hitze, Feuer, Messer oder Schere.`);
    }
    for (const key of activity.materials) {
      if (!isMaterialKey(key)) continue;
      const bad = (getMaterialInfo(key).hazards ?? []).filter((hazard) => (animalBannedHazards as readonly string[]).includes(hazard));
      if (bad.length > 0) problems.push(`Ein Tier im Bild, aber die Aktivität nutzt „${key}“ (${bad.join(', ')}): Tiere nie bei Hitze, Feuer, Messer oder Schere.`);
    }
  }

  const notCovered = (id: string) => `„${id}“ ist im Text der Aktivität nicht gedeckt (weder Material noch Begriff): Ein Bild zeigt nichts, was der Text nicht sagt.`;
  for (const thing of things) {
    const { block } = thing;
    // Nichts im Bild, was der Text nicht sagt: jeder nicht neutrale Baustein und jeder Inhalt muss über Material oder Begriff gedeckt sein.
    if (!block.neutral && !covered(block, activity)) problems.push(notCovered(block.id));
    if (thing.content !== undefined && !covered(thing.content, activity)) problems.push(notCovered(thing.content.id));
    const hazards = hazardsOf(thing);
    for (const hazard of hazards) {
      if (hazard === 'sharp') {
        // Scharfes nur in der Hand eines Erwachsenen (Ausnahme: Kinderschere, siehe kidSharpProblems).
        if (thing.holder === undefined) problems.push(`„${block.id}“ (scharf) liegt frei im Bild: Scharfes nur in der Hand eines Erwachsenen.`);
        else if (thing.holder.person !== 'adult') problems.push(...kidSharpProblems(thing, thing.holder, activity, adultPresent));
        if (toddlerPresent) problems.push(`„${block.id}“ (scharf) und ein Kleinkind im selben Bild.`);
      }
      if (hazard === 'heat') {
        // Heißes nur in der Hand eines Erwachsenen mit Ofenhandschuhen, kein Kleinkind im Bild, andere Kinder mit Abstand.
        if (thing.holder === undefined || thing.holder.person !== 'adult') problems.push(`„${block.id}“ (heiß) ist nicht in der Hand eines Erwachsenen.`);
        else if (!thing.holder.mitts) problems.push(`„${block.id}“ (heiß) ohne Ofenhandschuhe an den Händen.`);
        if (toddlerPresent) problems.push(`„${block.id}“ (heiß) und ein Kleinkind im selben Bild.`);
        for (const child of humans) {
          if (child === thing.holder || child.person === 'adult' || child.person === 'toddler') continue;
          if (gapX(child.box, thing.box) < hotDistance) problems.push(`„${child.id}“ steht zu nah an „${block.id}“ (heiß): mindestens ${hotDistance} Einheiten Abstand.`);
        }
      }
      if (hazard === 'goggles' && !/brille|goggles|glasses/i.test(Object.values(activity.safety).join(' '))) {
        problems.push('Schutzbrille im Bild, aber der Sicherheitshinweis nennt sie nicht.');
      }
      if (hazard === 'smallParts' && activity.ageMin < 3) problems.push(`„${thing.content?.id ?? block.id}“ (Kleinteile) bei Kindern unter 3 Jahren.`);
      if (hazard === 'water' && activity.ageMin < 6 && !adultPresent) problems.push(`„${thing.content?.id ?? block.id}“ (Wasser) ohne Erwachsenen im Bild bei Kindern unter 6 Jahren.`);
    }
  }

  // Kleidung und Handschuhe der Figuren: auch sie zeigen nur, was der Text sagt.
  if (figures.some((figure) => figure.outfit) && !covered(rainOutfitCover, activity)) problems.push('Regen-Kleidung (Jacke, Gummistiefel) ist im Text der Aktivität nicht gedeckt.');
  const mitt = catalog?.get('oven-mitt');
  if (figures.some((figure) => figure.mitts) && mitt !== undefined && !covered(mitt, activity)) problems.push(notCovered('oven-mitt'));

  // Alter der Figuren (docs/design/FIGUREN.md): Kinder-Figuren nur zur Altersspanne der Aktivität, ein Kleinkind nur bei Aktivitäten ab 2 Jahren oder jünger.
  for (const figure of humans) {
    if (!figureFitsActivity(figure.id, activity.ageMin, activity.ageMax)) problems.push(`„${figure.id}“ passt nicht zur Altersspanne der Aktivität (${activity.ageMin} bis ${activity.ageMax} Jahre).`);
    if (figure.person === 'toddler' && activity.ageMin > 2) problems.push('Ein Kleinkind im Bild, aber die Aktivität beginnt erst ab 3 Jahren.');
  }
  return [...new Set(problems)];
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
    if (slot === undefined) problems.push(`Platz „${item.slot}“ gibt es im Layout „${layout.name}“ nicht (erlaubt: ${Object.keys(layout.slots).join(', ')}).`);
    else if (used.has(item.slot)) problems.push(`Platz „${item.slot}“ ist doppelt besetzt.`);
    used.add(item.slot);
    if ((item.block === undefined) === (item.figure === undefined)) {
      problems.push(`Platz „${item.slot}“: entweder ein Baustein (\`block\`) oder eine Figur (\`figure\`).`);
      continue;
    }
    if (item.figure !== undefined) {
      if (slot !== undefined && !slot.kinds.includes('figure')) problems.push(`Eine Figur passt nicht auf den Platz „${item.slot}“ (erlaubt: ${slot.kinds.join(', ')}).`);
      if (item.size !== undefined && item.size !== 1) problems.push('Figuren haben immer Größe 1 (ihre Maße stehen in der Besetzung).');
      if (item.tint !== undefined || item.content !== undefined || item.hands !== undefined) problems.push(`Figur „${item.figure}“: \`tint\`, \`content\` und \`hands\` gibt es nur bei Bausteinen.`);
      continue;
    }
    const block = catalog.get(item.block as string);
    if (block === undefined) {
      problems.push(`Baustein „${item.block}“ gibt es nicht.`);
      continue;
    }
    if (block.id === 'ground-line') problems.push('Die Standlinie setzt der Zeichner selbst (`ground`), nicht als Baustein.');
    // lose auf der Tischplatte (`on1` bis `on3`) oder neben dem Gegenstand der Nahaufnahme (Layout `hands`, links und rechts)
    const looseOnTable = block.kind === 'content' && block.loose === true && (slot?.y === 'surface' || (scene.layout === 'hands' && item.slot !== 'object'));
    if (block.kind === 'content' && !looseOnTable) problems.push(`„${block.id}“ ist ein Inhalt und steht nur in einem Behälter (\`content\`)${block.loose === true ? ' oder lose auf der Tischplatte (`on1` bis `on3`, im Layout `hands` links und rechts)' : ''}.`);
    if (looseOnTable && (item.content !== undefined || item.hot !== undefined || item.hands !== undefined)) problems.push(`„${block.id}“ liegt lose: \`content\`, \`hot\` und \`hands\` gibt es dafür nicht.`);
    if (item.holds !== undefined || item.pose !== undefined || item.mitts !== undefined || item.outfit !== undefined) problems.push(`Baustein „${block.id}“: \`pose\`, \`holds\`, \`mitts\` und \`outfit\` gibt es nur bei Figuren.`);
    if (item.hands !== undefined && scene.layout !== 'hands') problems.push('Hände (`hands`) gibt es nur im Layout „hands“.');
    if (slot === undefined) continue;
    if (block.kind !== 'content' && block.kind !== 'ground' && !slot.kinds.includes(block.kind)) problems.push(`„${block.id}“ (${block.kind}) passt nicht auf den Platz „${item.slot}“ (erlaubt: ${slot.kinds.join(', ')}).`);
    if (item.size !== undefined && !slot.sizes.includes(item.size)) problems.push(`Größe ${item.size} ist auf dem Platz „${item.slot}“ nicht erlaubt (${slot.sizes.join(', ')}).`);
    if (item.tint !== undefined && !(block.tints ?? []).includes(item.tint)) problems.push(`„${block.id}“ gibt es nicht in „${item.tint}“ (erlaubt: ${(block.tints ?? []).join(', ') || 'keine Wahl'}).`);
  }
  if (scene.layout === 'table' && !scene.items.some((item) => item.slot === 'table')) problems.push('Das Layout „table“ braucht einen Tisch auf dem Platz „table“.');
  if (scene.layout === 'table' && surfaceY(catalog) === undefined) problems.push('Der Tisch im Katalog hat keine Tischplatte (`surface`).');
  if (scene.layout === 'hands' && !scene.items.some((item) => item.hands !== undefined)) problems.push('Das Layout „hands“ braucht Hände (`hands`) an einem Gegenstand.');
  if (problems.length > 0) return problems;

  const placements = placeItems(scene, catalog);
  if (placements === null) return ['Szene nicht lesbar.'];
  for (const placement of placements) problems.push(...placement.problems);

  // Maße: im Rand, nicht in den Ecken der Pille, nicht übereinander
  const ground = layout.groundY ?? baseY;
  const inCorner = (box: Box): boolean => box.minY < cornerZone.h && (box.minX < cornerZone.w || box.maxX > frame.w - cornerZone.w);
  for (const placement of placements) {
    const { box } = placement;
    const name = placement.block?.id ?? placement.item.figure ?? '?';
    // Füße und Schuhe der Figuren stehen auf der Standlinie und reichen etwas darunter (Linie 5, Schuhsohle)
    const bottom = ground + (placement.figure !== undefined && placement.block === undefined ? 8 : 5);
    if (box.minX < margin || box.maxX > frame.w - margin || box.minY < margin || box.maxY > bottom) {
      problems.push(`„${name}“ auf „${placement.item.slot}“ ragt aus dem Rand von ${margin} Einheiten (${Math.round(box.minX)}…${Math.round(box.maxX)} × ${Math.round(box.minY)}…${Math.round(box.maxY)}).`);
    }
    // Ecken der Pille: bei Figuren Kopf, Hände und gehaltene Dinge (der Rahmen um die ganze Figur wäre zu grob), sonst der Rahmen
    const shapes = placement.figure !== undefined && placement.block === undefined ? placement.figure.cornerShapes : [box, ...(placement.figure?.cornerShapes ?? [])];
    if (shapes.some(inCorner)) {
      const hint = placement.figure?.person === 'adult' ? ' Erwachsene passen nur in die Mitte (Plätze „middle“, „mid“, „back“).' : '';
      problems.push(`„${name}“ auf „${placement.item.slot}“ liegt in einer oberen Ecke (dort sitzt die Kategorie-Pille, ${cornerZone.w} × ${cornerZone.h}).${hint}`);
    }
  }
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const a = placements[i];
      const b = placements[j];
      if (a.block?.id === 'table' || b.block?.id === 'table') continue; // Dinge stehen auf dem Tisch
      // Dinge auf dem Tisch stehen vor einer Figur hinter dem Tisch
      const behind = (p: Placement, q: Placement) => p.figure !== undefined && p.block === undefined && p.slot.z < 1 && q.slot.y === 'surface';
      if (behind(a, b) || behind(b, a)) continue;
      // Bei Figuren zählt nur der Körper: Was sie halten (Stock, Tablett), darf an andere Dinge reichen (der Stock in der Pfütze).
      const own = (p: Placement): Box => (p.figure !== undefined && p.block === undefined ? p.figure.bodyBox : p.box);
      const share = overlap(own(a), own(b)) / Math.max(1, Math.min(area(own(a)), area(own(b))));
      const name = (p: Placement) => p.block?.id ?? p.item.figure ?? '?';
      if (share > maxOverlap) problems.push(`„${name(a)}“ und „${name(b)}“ überdecken sich zu ${Math.round(share * 100)} % (höchstens ${maxOverlap * 100} %).`);
    }
  }
  if (activity !== undefined) problems.push(...checkAgainstActivity(placements, activity, catalog));
  if (problems.length === 0) {
    const bytes = Buffer.byteLength(renderSceneSvg(scene, catalog));
    if (bytes > maxSceneBytes) problems.push(`Das Bild hat ${(bytes / 1024).toFixed(1)} KB, erlaubt sind höchstens ${maxSceneBytes / 1024} KB. Bitte melden, nichts still weglassen.`);
  }
  return problems;
}

// Das SVG der Szene mit Farbplätzen. Wirft bei einer Szene, die sich nicht setzen lässt (dann vorher checkScene aufrufen).
// Reihenfolge: nach der `z`-Zahl der Plätze; von Figuren steht der Körper an ihrem Platz, Gegenstände, Hände und Kopf davor (so liegen sie auch über dem Tisch).
export function renderSceneTemplate(scene: Scene, catalog: Catalog): string {
  const placements = placeItems(scene, catalog);
  if (placements === null) throw new Error('Szene nicht lesbar (Layout, Platz oder Baustein unbekannt).');
  const layout = layouts[scene.layout];
  const layers: { z: number; order: number; svg: string }[] = [];
  placements.forEach((placement, order) => {
    if (placement.back !== '') layers.push({ z: placement.slot.z, order, svg: placement.back });
    // Gegenstände, Hände und Kopf einer Figur liegen vor dem Tisch (z + 1,5), Bausteine an ihrem Platz
    layers.push({ z: placement.slot.z + (placement.block === undefined ? 1.5 : 0), order, svg: placement.front });
  });
  layers.sort((a, b) => a.z - b.z || a.order - b.order);
  const parts: string[] = [];
  const ground = catalog.get('ground-line');
  if (scene.ground !== false && ground !== undefined) {
    parts.push(`<g transform="translate(${frame.w / 2} ${layout.groundY ?? baseY})" stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round">${fillBlock(ground, 1, undefined)}</g>`);
  }
  parts.push(...layers.map((layer) => layer.svg).filter((svg) => svg !== ''));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.w * 3}" height="${frame.h * 3}" viewBox="0 0 ${frame.w} ${frame.h}">`,
    `<rect width="${frame.w}" height="${frame.h}" fill="{{ground}}"/>`,
    `<circle cx="${backdrop.cx}" cy="${backdrop.cy}" r="${backdrop.r}" fill="{{paper}}"/>`,
    ...parts,
    '</svg>',
  ].join('\n');
}

// Figuren-Teile tragen ihre Linienstärke selbst (5); die Gruppe setzt Tinte und runde Enden.
function wrapFigure(svg: string): string {
  return svg === '' ? '' : `<g stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round">${svg}</g>`;
}

// Hauttöne (`{{skin1}}` …) sind Teil der Zeichnungs-Palette (src/lib/palette.ts).
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
