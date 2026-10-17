// Baukasten (M9b, Schritt 3a): Figuren der Besetzung in Szenen, mit Gegenständen in der Hand (Haltepunkte), und Hände in Nahaufnahme.
// Eine Pose legt fest, wo ein Gegenstand vor der Figur liegt; die Hand wird mit dem Arm aus zwei Gliedern (`solveArm`) auf den Haltepunkt gerechnet.
// Die Szene nennt nur Figur, Pose und Gegenstand, nie Koordinaten. Reine Funktionen. Regeln: docs/bausteine/README.md, docs/design/FIGUREN.md.

import { cast } from '../figures/cast.ts';
import { add, capsule, fmt, length, rad, scale, sub, vec, type Vec } from '../figures/math.ts';
import { buildPet, petPosesOf, type PetPoseName } from '../figures/pets.ts';
import { poseNames, poseOf, trayCenter, type PoseName } from '../figures/poses.ts';
import { buildHuman, figureLine, legLength, type Circle, type HumanSpec, type Pose, type Tint } from '../figures/rig.ts';
import { toneOf } from '../figures/skin.ts';
import { contentFor, drawBlock, gripOf, toWorld, unionBox, type Pose2D } from './draw.ts';
import { estimateBox, type Box } from './geometry.ts';
import type { Catalog, GripName, Hands, HandsPoseName, HeldItem, HoldPoseName, LoadedBlock, Person, SceneItem, TintName } from './types.ts';

export const holdPoseNames: readonly HoldPoseName[] = ['hold-plate', 'carry-tray', 'point', 'pour', 'stir', 'cut-supervised', 'hand-over', 'write'];
export const handsPoseNames: readonly HandsPoseName[] = ['hold', 'stir', 'cut', 'write'];
// Posen des Rigs ohne Gegenstand, die eine Szene nutzen darf („hold“, „tray“, „take“ brauchen die Gegenstände der Figuren-Vorschau).
export const freePoseNames: readonly PoseName[] = poseNames.filter((name) => !['hold', 'tray', 'take'].includes(name));

export const holdPoseLabels: Record<HoldPoseName, { de: string; en: string }> = {
  'hold-plate': { de: 'hält (Teller, Schüssel, Korb)', en: 'holding (plate, bowl, basket)' },
  'carry-tray': { de: 'trägt Tablett (beide Hände)', en: 'carrying a tray (both hands)' },
  point: { de: 'zeigt', en: 'pointing' },
  pour: { de: 'gießt', en: 'pouring' },
  stir: { de: 'rührt', en: 'stirring' },
  'cut-supervised': { de: 'schneidet (nur Erwachsene, Kinder schauen zu)', en: 'cutting (adults only, children watch)' },
  'hand-over': { de: 'reicht', en: 'handing over' },
  write: { de: 'schreibt oder malt am Tisch', en: 'writing or drawing at the table' },
};

const heldSizes = [1, 0.75, 0.6];
const reachTolerance = 1.5; // so genau muss die Hand den Haltepunkt treffen

// Ein gezeichneter Gegenstand in der Hand oder unter der Hand (auf dem Tisch), für Zeichnung und Prüfung.
export type HeldRender = {
  block: LoadedBlock;
  content?: LoadedBlock;
  tint: TintName | undefined;
  hot: boolean;
  box: Box;
  held: boolean; // false: liegt nur unter der Hand auf dem Tisch (`surface`)
  svg: string;
};

export type FigureRender = {
  id: string;
  person?: Person; // Menschen
  animal: boolean;
  skin?: string; // Hautton als Farbe (Menschen)
  back: string; // Körper (hinter Gegenständen und Tisch)
  front: string; // Gegenstände, Hände, Kopf (vor dem Tisch)
  box: Box;
  head?: Circle;
  hands: Circle[];
  skinShapes: Box[]; // Kopf, Hände (und im Layout `hands` die Unterarme) als Rahmen, für die Petrol-Regel
  // Petrol-Flächen der Figur: `own` liegt an der eigenen Haut (Kapuze, Ärmel), sonst Kleidung am Körper (nur gegen andere Figuren geprüft)
  petrolShapes: { box: Box; own: boolean }[];
  mitts: boolean;
  outfit: boolean;
  held: HeldRender[];
  // Was oben an die Ecken der Pille reichen kann: Kopf mit Haaren oder Mütze, Hände, gehaltene Dinge (ein Rahmen um die ganze Figur wäre zu grob).
  cornerShapes: Box[];
  problems: string[];
};

type LocalHeld = { item: HeldItem; block: LoadedBlock; content?: LoadedBlock; at: Pose2D; held: boolean };

const circleBox = (c: Circle, pad = figureLine / 2): Box => ({ minX: c.c.x - c.r - pad, maxX: c.c.x + c.r + pad, minY: c.c.y - c.r - pad, maxY: c.c.y + c.r + pad });
const deg = (radians: number): number => (radians * 180) / Math.PI;
const unit = (angle: number): Vec => vec(Math.cos(rad(angle)), Math.sin(rad(angle)));

function localAt(x: number, y: number, size: number, rot = 0, mirror = false): Pose2D {
  return { x, y, size, flip: false, rot, mirror };
}

// Setzt einen Baustein so, dass sein Haltepunkt `grip` auf `target` liegt.
function byGrip(block: LoadedBlock, grip: GripName, target: Vec, size: number, rot = 0, mirror = false): Pose2D {
  const g = gripOf(block, grip) ?? vec(0, 0);
  const offset = toWorld(g, localAt(0, 0, size, rot, mirror));
  return localAt(target.x - offset.x, target.y - offset.y, size, rot, mirror);
}

// Dreht ein Werkzeug (Griff und Spitze) so, dass es vom Griff aus in Richtung `dir` zeigt, und setzt den Griff auf `handle`.
function toolByHandle(block: LoadedBlock, handle: Vec, dir: Vec, size: number): Pose2D {
  const h = gripOf(block, 'handle') ?? vec(0, 0);
  const t = gripOf(block, 'tip') ?? vec(1, 0);
  const own = Math.atan2(t.y - h.y, t.x - h.x);
  const rot = deg(Math.atan2(dir.y, dir.x) - own);
  return byGrip(block, 'handle', handle, size, rot);
}

// Dreht ein Werkzeug so, dass seine Spitze auf `tip` liegt und der Griff in Richtung `toHandle` steht.
function toolByTip(block: LoadedBlock, tip: Vec, toHandle: Vec, size: number): Pose2D {
  const h = gripOf(block, 'handle') ?? vec(0, 0);
  const t = gripOf(block, 'tip') ?? vec(1, 0);
  const own = Math.atan2(h.y - t.y, h.x - t.x);
  const rot = deg(Math.atan2(toHandle.y, toHandle.x) - own);
  return byGrip(block, 'tip', tip, size, rot);
}

const isTool = (block: LoadedBlock): boolean => gripOf(block, 'handle') !== undefined && gripOf(block, 'tip') !== undefined;

type Resolved = { block: LoadedBlock; content?: LoadedBlock; item: HeldItem; size: number };

function resolveHeld(item: HeldItem | undefined, catalog: Catalog, problems: string[], role: string): Resolved | undefined {
  if (item === undefined) return undefined;
  const block = catalog.get(item.block);
  if (block === undefined || block.kind === 'content' || block.kind === 'ground') {
    problems.push(`${role}: Baustein „${item.block}“ gibt es nicht (oder er lässt sich nicht halten).`);
    return undefined;
  }
  const size = item.size ?? 1;
  if (!heldSizes.includes(size)) problems.push(`${role}: Größe ${size} für „${block.id}“ ist nicht erlaubt (${heldSizes.join(', ')}).`);
  if (item.tint !== undefined && !(block.tints ?? []).includes(item.tint)) problems.push(`„${block.id}“ gibt es nicht in „${item.tint}“.`);
  let content: LoadedBlock | undefined;
  if (item.content !== undefined) {
    const found = contentFor(catalog, block, item.content);
    if (typeof found === 'string') problems.push(found);
    else content = found;
  }
  return { block, content, item, size };
}

function needGrip(r: Resolved, grips: GripName[], pose: string, problems: string[]): boolean {
  const missing = grips.filter((grip) => gripOf(r.block, grip) === undefined);
  if (missing.length > 0) problems.push(`„${r.block.id}“ hat keinen Haltepunkt ${missing.map((g) => `„${g}“`).join(', ')} für die Pose „${pose}“.`);
  return missing.length === 0;
}

const restArm = { angle: 11, bend: 6 } as const;
const restLegs = { legL: { angle: 4, bend: 0 }, legR: { angle: 4, bend: 0 } };

type Layout = { pose: Pose; held: LocalHeld[]; targets: { left?: Vec; right?: Vec } };

// Rechnet eine Pose mit Gegenstand (Koordinaten der Figur: Mitte der Füße = (0 0), oben negativ, „rechts“ = zur Bildmitte hin).
// `surface`: Höhe der Tischplatte relativ zu den Füßen (nur am Tisch), für „write“ und „cut-supervised“.
export function holdLayout(spec: HumanSpec, name: HoldPoseName, holds: SceneItem['holds'], catalog: Catalog, surface: number | undefined, problems: string[]): Layout {
  const L = legLength(spec);
  const sy = -L - spec.torsoH * 0.9; // Schulterhöhe
  const sw = spec.shoulderW;
  const reach = spec.upperArm + spec.foreArm;
  const shoulderR = vec(sw / 2, sy);
  const shoulderL = vec(-sw / 2, sy);
  const held: LocalHeld[] = [];
  const targets: Layout['targets'] = {};
  const r = resolveHeld(holds?.right, catalog, problems, name);
  const l = resolveHeld(holds?.left, catalog, problems, name);
  const both = resolveHeld(holds?.both, catalog, problems, name);
  const under = resolveHeld(holds?.surface, catalog, problems, name);
  const allowed: Record<HoldPoseName, (keyof NonNullable<SceneItem['holds']>)[]> = {
    'hold-plate': ['right'],
    'carry-tray': ['both'],
    point: [],
    pour: ['right'],
    stir: ['left', 'right'],
    'cut-supervised': ['right', 'surface'],
    'hand-over': ['right'],
    write: ['right', 'surface'],
  };
  for (const key of Object.keys(holds ?? {}) as (keyof NonNullable<SceneItem['holds']>)[]) {
    if (!allowed[name].includes(key)) problems.push(`Die Pose „${name}“ hält nichts in „${key}“ (erlaubt: ${allowed[name].join(', ') || 'nichts'}).`);
  }
  const add2 = (res: Resolved, at: Pose2D, isHeld = true) => held.push({ item: res.item, block: res.block, content: res.content, at, held: isHeld });
  const grip = (res: Resolved, at: Pose2D, g: GripName): Vec => toWorld(gripOf(res.block, g) ?? vec(0, 0), at);
  let pose: Pose = { ...restLegs, armL: restArm, armR: restArm };

  // Ein Gegenstand in der rechten Hand: von unten getragen (Teller), am Griff mit Spitze nach vorn (Werkzeug) oder hängend (Korb, Eimer).
  const oneHand = (res: Resolved, palm: Vec, forward: number): Pose2D => {
    if (gripOf(res.block, 'under') !== undefined) return byGrip(res.block, 'under', palm, res.size);
    if (isTool(res.block)) return toolByHandle(res.block, palm, unit(forward), res.size);
    if (gripOf(res.block, 'handle') !== undefined) return byGrip(res.block, 'handle', palm, res.size);
    problems.push(`„${res.block.id}“ hat keinen Haltepunkt (handle, under) für die Pose „${name}“.`);
    return byGrip(res.block, 'handle', palm, res.size);
  };

  switch (name) {
    case 'hold-plate': {
      if (r === undefined) {
        problems.push('„hold-plate“ braucht einen Gegenstand in `holds.right`.');
        break;
      }
      const hanging = gripOf(r.block, 'under') === undefined && !isTool(r.block);
      const palm = hanging ? vec(sw / 2 + 6, -L - spec.torsoH * 0.05) : isTool(r.block) ? vec(sw / 2 + reach * 0.45, -L - spec.torsoH * 0.35) : vec(sw * 0.62, -L - spec.torsoH * 0.52 + 5);
      const at = oneHand(r, palm, 35);
      add2(r, at);
      targets.right = palm;
      pose = { ...pose, armR: { to: palm, elbow: hanging ? 'down' : 'out' } };
      break;
    }
    case 'carry-tray': {
      if (both === undefined || !needGrip(both, ['left', 'right'], name, problems)) break;
      const gl = gripOf(both.block, 'left') as Vec;
      const gr = gripOf(both.block, 'right') as Vec;
      const mid = scale(add(gl, gr), 0.5 * both.size);
      // vor dem Bauch, nicht vor der Brust (sonst verdecken Inhalt und Dampf das Gesicht); kurze Arme tragen etwas höher
      const c = vec(0, Math.max(trayCenter(spec).y + 2, -L - spec.torsoH * 0.2));
      const at = localAt(c.x - mid.x, c.y - mid.y, both.size);
      add2(both, at);
      targets.left = grip(both, at, 'left');
      targets.right = grip(both, at, 'right');
      pose = { ...pose, armL: { to: targets.left, elbow: 'out' }, armR: { to: targets.right, elbow: 'out' } };
      break;
    }
    case 'point':
      pose = { ...pose, tilt: 5, armR: { angle: 100, bend: 0 } };
      break;
    case 'pour': {
      if (r === undefined || !needGrip(r, ['handle'], name, problems)) break;
      const palm = vec(sw / 2 + reach * 0.45, sy + reach * 0.25);
      const at = byGrip(r.block, 'handle', palm, r.size, 50);
      add2(r, at);
      targets.right = palm;
      pose = { ...pose, armR: { to: palm, elbow: 'down' } };
      if (gripOf(r.block, 'under') !== undefined) {
        const support = grip(r, at, 'under');
        if (length(sub(support, shoulderL)) <= reach * 0.98) {
          targets.left = support;
          pose = { ...pose, armL: { to: support, elbow: 'down' } };
        }
      }
      break;
    }
    case 'stir': {
      if (l === undefined || r === undefined) {
        problems.push('„stir“ braucht eine Schüssel in `holds.left` und ein Werkzeug (Löffel, Kelle, Gabel) in `holds.right`.');
        break;
      }
      if (!needGrip(l, ['left'], name, problems) || !needGrip(r, ['handle', 'tip'], name, problems)) break;
      if (l.block.container?.kind !== 'deep') problems.push(`„stir“: „${l.block.id}“ ist keine Schüssel (kein tiefer Behälter).`);
      const bowl = localAt(sw * 0.55, -L - spec.torsoH * 0.12, l.size);
      add2(l, bowl);
      targets.left = grip(l, bowl, 'left');
      const rim = l.block.container?.kind === 'deep' ? l.block.container : { cx: 0, cy: -l.block.box.h, rx: 20, ry: 4 };
      const tip = toWorld(vec(rim.cx + rim.rx * 0.2, rim.cy), bowl);
      const toolAt = toolByTip(r.block, tip, unit(-62), r.size);
      add2(r, toolAt);
      targets.right = grip(r, toolAt, 'handle');
      pose = { ...pose, armL: { to: targets.left, elbow: 'down' }, armR: { to: targets.right, elbow: 'out' } };
      break;
    }
    case 'cut-supervised': {
      if (r === undefined || !needGrip(r, ['handle', 'tip'], name, problems)) break;
      const palm = vec(sw / 2 + reach * 0.55, surface === undefined ? -L - spec.torsoH * 0.4 : surface - 12);
      const at = toolByHandle(r.block, palm, unit(18), r.size);
      add2(r, at);
      targets.right = palm;
      pose = { ...pose, lean: surface === undefined ? 0 : 4, armR: { to: palm, elbow: 'down' } };
      if (under !== undefined) {
        if (surface === undefined) problems.push('„cut-supervised“ legt `holds.surface` nur am Tisch ab (Layout „table“, Platz links oder rechts).');
        else {
          const tip = grip(r, at, 'tip');
          add2(under, localAt(tip.x - 10 - under.block.box.x0 * under.size, surface, under.size), false);
        }
      }
      break;
    }
    case 'hand-over': {
      if (r === undefined) {
        problems.push('„hand-over“ braucht einen Gegenstand in `holds.right`.');
        break;
      }
      const palm = add(shoulderR, scale(unit(8), reach * 0.9));
      const at = oneHand(r, palm, 10);
      add2(r, at);
      targets.right = palm;
      pose = { ...pose, lean: 3, tilt: 4, armR: { to: palm, elbow: 'down' } };
      break;
    }
    case 'write': {
      if (surface === undefined) {
        problems.push('„write“ braucht einen Tisch (Layout „table“, Platz links oder rechts).');
        break;
      }
      if (r === undefined || !needGrip(r, ['handle', 'tip'], name, problems)) break;
      const tip = vec(sw / 2 + reach * 0.8, surface - 1);
      const at = toolByTip(r.block, tip, unit(-118), r.size);
      add2(r, at);
      targets.right = grip(r, at, 'handle');
      pose = { ...pose, lean: 6, tilt: 10, armR: { to: targets.right, elbow: 'down' } };
      if (under !== undefined) add2(under, localAt(tip.x - 6 - under.block.box.x0 * under.size, surface, under.size), false);
      break;
    }
  }
  return { pose, held, targets };
}

const toWorldFigure = (p: Vec, x: number, y: number, flip: boolean): Vec => vec(x + (flip ? -p.x : p.x), y + p.y);

// Eine Figur der Besetzung an ihrem Platz (Menschen mit Pose und Gegenständen, Tiere mit Pose).
// `surfaceY`: Höhe der Tischplatte im Bild, wenn die Figur an einem Tisch steht.
export function renderFigure(item: SceneItem, catalog: Catalog, x: number, y: number, flip: boolean, surfaceY: number | undefined): FigureRender {
  const problems: string[] = [];
  const id = item.figure ?? '';
  const petEntry = cast.pets.find((entry) => entry.spec.id === id);
  if (petEntry !== undefined) {
    const allowed: readonly PetPoseName[] = petPosesOf(petEntry.spec.kind).filter((pose) => pose !== 'shoulder');
    const pose = (item.pose ?? 'stand') as PetPoseName;
    if (!allowed.includes(pose)) problems.push(`${petEntry.spec.name} kennt die Pose „${item.pose}“ nicht (erlaubt: ${allowed.join(', ')}).`);
    if (item.holds !== undefined || item.mitts === true || item.outfit !== undefined) problems.push(`${petEntry.spec.name} ist ein Tier: hält nichts, trägt nichts (Tiere fassen nichts an).`);
    const svg = buildPet(petEntry.spec, allowed.includes(pose) ? pose : 'stand', { x, y, flip }).svg;
    const box = estimateBox(svg) ?? { minX: x, maxX: x, minY: y, maxY: y };
    return { id, animal: true, back: '', front: svg, box, hands: [], skinShapes: [], petrolShapes: [], mitts: false, outfit: false, held: [], cornerShapes: [box], problems };
  }
  const entry = cast.humans.find((h) => h.spec.id === id);
  if (entry === undefined) {
    const names = [...cast.humans, ...cast.pets].map((h) => h.spec.id).join(', ');
    return { id, animal: false, back: '', front: '', box: { minX: x, maxX: x, minY: y, maxY: y }, hands: [], skinShapes: [], petrolShapes: [], mitts: false, outfit: false, held: [], cornerShapes: [], problems: [`Figur „${id}“ gibt es nicht (erlaubt: ${names}).`] };
  }
  const { spec, quirk } = entry;
  const poseName = item.pose ?? 'stand';
  let layout: Layout = { pose: poseOf(spec, 'stand', quirk), held: [], targets: {} };
  if ((holdPoseNames as readonly string[]).includes(poseName)) {
    layout = holdLayout(spec, poseName as HoldPoseName, item.holds, catalog, surfaceY === undefined ? undefined : surfaceY - y, problems);
  } else if ((freePoseNames as readonly string[]).includes(poseName)) {
    layout.pose = poseOf(spec, poseName as PoseName, quirk);
    if (item.holds !== undefined) problems.push(`Die Pose „${poseName}“ hält nichts (Posen mit Gegenstand: ${holdPoseNames.join(', ')}).`);
  } else {
    problems.push(`Pose „${poseName}“ gibt es nicht (ohne Gegenstand: ${freePoseNames.join(', ')}; mit Gegenstand: ${holdPoseNames.join(', ')}).`);
  }
  const mitts = item.mitts === true;
  const rendered = buildHuman(spec, layout.pose, { x, y, flip, mitts, outfit: item.outfit });

  // Erreichen die Hände ihre Haltepunkte?
  for (const side of ['left', 'right'] as const) {
    const target = layout.targets[side];
    if (target === undefined) continue;
    const hand = side === 'left' ? rendered.anchors.handL : rendered.anchors.handR;
    if (length(sub(hand, toWorldFigure(target, x, y, flip))) > reachTolerance) {
      problems.push(`${spec.name} erreicht mit der ${side === 'left' ? 'linken' : 'rechten'} Hand den Haltepunkt nicht (Pose „${poseName}“; kleinere Größe wählen, z. B. "size": 0.75).`);
    }
  }

  const held: HeldRender[] = layout.held.map((entryHeld) => {
    const origin = toWorldFigure(vec(entryHeld.at.x, entryHeld.at.y), x, y, flip);
    const at: Pose2D = { ...entryHeld.at, x: origin.x, y: origin.y, flip };
    const drawn = drawBlock(entryHeld.block, at, { tint: entryHeld.item.tint, content: entryHeld.content, hot: entryHeld.item.hot });
    return { block: entryHeld.block, content: entryHeld.content, tint: entryHeld.item.tint ?? entryHeld.block.defaultTint, hot: entryHeld.item.hot === true, box: drawn.box, held: entryHeld.held, svg: drawn.svg };
  });
  const surfaceItems = held.filter((h) => !h.held).map((h) => h.svg).join('');
  const inHand = held.filter((h) => h.held).map((h) => h.svg).join('');
  const box = held.reduce((acc, h) => unionBox(acc, h.box), estimateBox(rendered.svg) ?? { minX: x, maxX: x, minY: y, maxY: y });
  const hood = rendered.geometry.hood;
  const head = rendered.geometry.head;
  const { neck, pelvis, footL, footR } = rendered.anchors;
  const half = spec.torsoW * 0.8;
  const torsoBox: Box = { minX: pelvis.x - half, maxX: pelvis.x + half, minY: neck.y, maxY: pelvis.y + 10 };
  const legsBox: Box = { minX: Math.min(footL.x, footR.x) - 6, maxX: Math.max(footL.x, footR.x) + 6, minY: pelvis.y, maxY: Math.max(footL.y, footR.y) };
  return {
    id,
    person: spec.role,
    animal: false,
    skin: toneOf(spec.skin),
    back: rendered.body,
    front: `${surfaceItems}${inHand}${rendered.hands}${rendered.head}`,
    box,
    head: rendered.geometry.head,
    hands: rendered.geometry.hands,
    skinShapes: [circleBox(rendered.geometry.head), ...(mitts ? [] : rendered.geometry.hands.map((c) => circleBox(c)))],
    petrolShapes: [
      ...(hood !== undefined && hood.tint === 'petrol' ? [{ box: circleBox(hood), own: true }] : []),
      ...(rendered.geometry.top === 'petrol' ? [{ box: torsoBox, own: false }] : []),
      ...(spec.colors.bottom === 'petrol' ? [{ box: legsBox, own: false }] : []),
    ],
    mitts,
    outfit: item.outfit !== undefined,
    held,
    cornerShapes: [
      { minX: head.c.x - head.r * 1.3, maxX: head.c.x + head.r * 1.3, minY: head.c.y - head.r * 2 - figureLine / 2, maxY: head.c.y + head.r },
      ...rendered.geometry.hands.map((c) => circleBox(c)),
      ...held.map((h) => h.box),
    ],
    problems,
  };
}

// ---- Hände in Nahaufnahme (Layout `hands`) ----

const handR = 10; // Hand in der Nahaufnahme
const armR = 7; // halbe Dicke des Unterarms
const sleeveR = 9.5;

function handSvg(c: Vec, skin: string, mitt: boolean): string {
  if (!mitt) return `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${handR}" fill="${skin}" stroke-width="${figureLine}"/>`;
  const big = handR * 1.6;
  return `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(big)}" fill="{{honey}}" stroke-width="${figureLine}"/><circle cx="${fmt(c.x + big * 0.6)}" cy="${fmt(c.y - big * 0.55)}" r="${fmt(big * 0.45)}" fill="{{honey}}" stroke-width="${figureLine}"/>`;
}

// Unterarm vom unteren Bildrand zur Hand, mit Ärmel am Rand. `side` +1 rechts, −1 links (der Arm kommt von außen unten).
function forearm(hand: Vec, side: 1 | -1, skin: string, sleeve: Tint): { svg: string; skinBox: Box; sleeveBox: Box } {
  const entry = vec(Math.min(392, Math.max(8, hand.x + side * 36)), 216);
  const cuff = add(entry, scale(sub(hand, entry), 0.42));
  const arm = `<path d="${capsule(entry, hand, armR)}" fill="${skin}" stroke-width="${figureLine}"/>`;
  const sl = `<path d="${capsule(entry, cuff, sleeveR)}" fill="{{${sleeve}}}" stroke-width="${figureLine}"/>`;
  const box = (a: Vec, b: Vec, r: number): Box => ({ minX: Math.min(a.x, b.x) - r, maxX: Math.max(a.x, b.x) + r, minY: Math.min(a.y, b.y) - r, maxY: Math.max(a.y, b.y) + r });
  return { svg: arm + sl, skinBox: box(cuff, hand, armR), sleeveBox: box(entry, cuff, sleeveR) };
}

// Die Hände einer Figur an einem Gegenstand im Layout `hands`. `at`: wo der Gegenstand liegt.
export function renderHands(hands: Hands, object: LoadedBlock, at: Pose2D, catalog: Catalog): FigureRender & { toolHeld?: HeldRender } {
  const problems: string[] = [];
  const entry = cast.humans.find((h) => h.spec.id === hands.figure);
  const empty: FigureRender = { id: hands.figure, animal: false, back: '', front: '', box: { minX: at.x, maxX: at.x, minY: at.y, maxY: at.y }, hands: [], skinShapes: [], petrolShapes: [], mitts: false, outfit: false, held: [], cornerShapes: [], problems };
  if (entry === undefined) {
    problems.push(`Hände: Figur „${hands.figure}“ gibt es nicht (nur Menschen: ${cast.humans.map((h) => h.spec.id).join(', ')}).`);
    return empty;
  }
  if (!handsPoseNames.includes(hands.pose)) {
    problems.push(`Hände: Pose „${hands.pose}“ gibt es nicht (erlaubt: ${handsPoseNames.join(', ')}).`);
    return empty;
  }
  const skin = `{{skin${entry.spec.skin}}}`;
  const sleeve: Tint = hands.sleeve ?? entry.spec.colors.top;
  const mitts = hands.mitts === true;
  const points: { side: 1 | -1; at: Vec }[] = [];
  const grip = (g: GripName): Vec | undefined => {
    const p = gripOf(object, g);
    return p === undefined ? undefined : toWorld(p, at);
  };
  let toolHeld: HeldRender | undefined;
  const tool = hands.pose === 'hold' ? undefined : resolveHeld(hands.tool, catalog, problems, `Hände „${hands.pose}“`);
  if (hands.pose !== 'hold' && (tool === undefined || !needGrip(tool, ['handle', 'tip'], hands.pose, problems))) {
    if (tool === undefined) problems.push(`Hände „${hands.pose}“ brauchen ein Werkzeug (\`tool\`).`);
  }
  if (hands.tool !== undefined && hands.pose === 'hold') problems.push('Hände „hold“ halten nur den Gegenstand, kein Werkzeug.');

  if (hands.pose === 'hold') {
    const left = grip('left');
    const right = grip('right');
    if (left !== undefined && right !== undefined) points.push({ side: -1, at: left }, { side: 1, at: right });
    else {
      const one = grip('under') ?? grip('handle');
      if (one === undefined) problems.push(`„${object.id}“ hat keinen Haltepunkt für die Hände.`);
      else points.push({ side: 1, at: one });
    }
  } else if (tool !== undefined && gripOf(tool.block, 'handle') !== undefined && gripOf(tool.block, 'tip') !== undefined) {
    const size = at.size * tool.size;
    let tip: Vec;
    let toHandle: Vec;
    if (hands.pose === 'stir') {
      const left = grip('left');
      if (left === undefined || object.container?.kind !== 'deep') problems.push(`Hände „stir“: „${object.id}“ ist keine Schüssel mit Rand (Haltepunkt „left“).`);
      else points.push({ side: -1, at: left });
      const rim = object.container?.kind === 'deep' ? object.container : { cx: 0, cy: -object.box.h, rx: 20, ry: 4 };
      tip = toWorld(vec(rim.cx + rim.rx * 0.2, rim.cy), at);
      toHandle = unit(-38);
    } else if (hands.pose === 'cut') {
      const left = grip('left') ?? grip('under');
      if (left !== undefined) points.push({ side: -1, at: left });
      tip = toWorld(vec((object.box.x0 + object.box.x1) / 2 + 6, -object.box.h * 0.75), at);
      toHandle = unit(-20);
    } else {
      tip = toWorld(vec((object.box.x0 + object.box.x1) / 2, -object.box.h * 0.5), at);
      toHandle = unit(-45);
    }
    const toolAt = toolByTip(tool.block, tip, toHandle, size);
    const drawn = drawBlock(tool.block, toolAt, { tint: tool.item.tint });
    toolHeld = { block: tool.block, tint: tool.item.tint ?? tool.block.defaultTint, hot: false, box: drawn.box, held: true, svg: drawn.svg };
    points.push({ side: 1, at: toWorld(gripOf(tool.block, 'handle') as Vec, toolAt) });
  }

  const arms = points.map((p) => forearm(p.at, p.side, skin, sleeve));
  const handCircles: Circle[] = points.map((p) => ({ c: p.at, r: mitts ? handR * 1.6 : handR }));
  const front = `${toolHeld?.svg ?? ''}${arms.map((a) => a.svg).join('')}${points.map((p) => handSvg(p.at, skin, mitts)).join('')}`;
  const skinShapes = [...arms.map((a) => a.skinBox), ...(mitts ? [] : handCircles.map((c) => circleBox(c)))];
  return {
    id: hands.figure,
    person: entry.spec.role,
    animal: false,
    skin: toneOf(entry.spec.skin),
    back: '',
    front,
    box: handCircles.reduce((acc, c) => unionBox(acc, circleBox(c)), toolHeld?.box ?? { minX: at.x, maxX: at.x, minY: at.y, maxY: at.y }),
    hands: handCircles,
    skinShapes,
    petrolShapes: sleeve === 'petrol' ? arms.map((a) => ({ box: a.sleeveBox, own: true })) : [],
    mitts,
    outfit: false,
    held: toolHeld === undefined ? [] : [toolHeld],
    cornerShapes: toolHeld === undefined ? [] : [toolHeld.box],
    problems,
    toolHeld,
  };
}
