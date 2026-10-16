// Figuren-Rig (M9b): Blätter und Szenen für die Vorschau der Besetzung (Figurenblatt, Besetzung, Familie am Tisch, Triptychon, Lesbarkeitsprobe).
// Gibt fertige SVG-Texte zurück (Palette und Hautton-Variante eingesetzt), 400 × 200 wie eine Karte. Reine Funktionen.

import { renderTemplate } from '../illustrations.ts';
import { vec } from './math.ts';
import { cast, human, pet, type CastHuman, type CastPet } from './cast.ts';
import { buildPet, type PetPoseName, type PetSpec } from './pets.ts';
import { plateCenter, poseOf, trayCenter, trayWidth, type PoseName, type Quirk } from './poses.ts';
import { fmt } from './math.ts';
import { plate, table, tray, type TrayContent } from './props.ts';
import { buildHuman, legLength, type HumanSpec, type Pose } from './rig.ts';
import { skinPalette, type SkinVariant } from './skin.ts';

export const baseY = 176;
const frame = { w: 400, h: 200 };

// Rahmen mit Grund, Standlinie und gemeinsamer Linienart.
export function frameSvg(inner: string, skin: SkinVariant, opts: { backdrop?: boolean } = {}): string {
  const circle = opts.backdrop ? `<circle cx="200" cy="108" r="90" fill="{{paper}}"/>` : '';
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.w * 3}" height="${frame.h * 3}" viewBox="0 0 ${frame.w} ${frame.h}">`,
    `<rect width="${frame.w}" height="${frame.h}" fill="{{ground}}"/>`,
    circle,
    `<g stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M24 ${baseY}H376" fill="none" stroke-width="4"/>`,
    inner,
    '</g>',
    '</svg>',
  ].join('');
  return renderTemplate(svg, skinPalette(skin));
}

type Held = { kind: 'plate' } | { kind: 'tray'; content: TrayContent; mitts: boolean; onTable?: boolean } | undefined;
type Opts = { eyes: boolean; held?: Held; y?: number; line?: number };

// Eine Figur in einer Pose, mit dem Gegenstand, den die Pose hält. Reihenfolge: Körper, Gegenstand, Hände, Kopf.
export function humanInPose(spec: HumanSpec, quirk: Quirk | undefined, pose: PoseName | Pose, x: number, opts: Opts): string {
  const y = opts.y ?? baseY;
  const p = typeof pose === 'string' ? poseOf(spec, pose, quirk) : pose;
  const mitts = opts.held?.kind === 'tray' && opts.held.mitts;
  const r = buildHuman(spec, p, { x, y, eyes: opts.eyes, mitts, line: opts.line });
  let prop = '';
  if (opts.held?.kind === 'plate') {
    const c = plateCenter(spec);
    prop = plate(vec(x + c.x, y + c.y + 2), spec.shoulderW * 0.55, true);
  } else if (opts.held?.kind === 'tray') {
    const c = trayCenter(spec, opts.held.onTable === true);
    prop = tray(vec(x + c.x, y + c.y), trayWidth(spec, opts.held.onTable === true), opts.held.content);
  }
  return `${r.body}${prop}${r.hands}${r.head}`;
}

export function petInPose(spec: PetSpec, pose: PetPoseName, x: number, eyes: boolean, opts: { flip?: boolean; y?: number; line?: number } = {}): string {
  return buildPet(spec, pose, { x, y: opts.y ?? baseY, eyes, flip: opts.flip, line: opts.line }).svg;
}

const cold = (spec: HumanSpec): TrayContent => (spec.role === 'adult' ? 'apples' : 'cookies');

// Figurenblatt eines Menschen: stehen, hält etwas, trägt Tablett, jubelt. Erwachsene tragen heiße Äpfel mit Ofenhandschuhen, Kinder kalte Kekse.
export function humanSheet(fig: CastHuman, eyes: boolean, skin: SkinVariant): string {
  const { spec, quirk } = fig;
  const mitts = spec.role === 'adult';
  const cells = [
    humanInPose(spec, quirk, 'stand', 52, { eyes }),
    humanInPose(spec, quirk, 'hold', 142, { eyes, held: { kind: 'plate' } }),
    humanInPose(spec, quirk, 'tray', 246, { eyes, held: { kind: 'tray', content: cold(spec), mitts } }),
    humanInPose(spec, quirk, 'cheer', 346, { eyes }),
  ];
  return frameSvg(cells.join(''), skin);
}

// Tierblatt: drei Posen pro Bild, zwei Bilder je Tier (Hälfte 0: steht, sitzt, hüpft; Hälfte 1: auf der Schulter, zeigt, schaut zu).
export function petSheet(p: CastPet, eyes: boolean, skin: SkinVariant, half: 0 | 1): string {
  const xs = [75, 205, 330];
  if (half === 0) return frameSvg((['stand', 'sit', 'hop'] as const).map((pose, i) => petInPose(p.spec, pose, xs[i], eyes)).join(''), skin);
  // Auf der Schulter: ein Mensch (Jette) steht, das Tier sitzt auf der rechten Schulter; daneben zeigt und schaut es vom Boden aus.
  const host = human('jette');
  const r = buildHuman(host.spec, poseOf(host.spec, 'stand', host.quirk), { x: xs[0], y: baseY, eyes });
  const s = r.anchors.shoulderR;
  const onShoulder = petInPose(p.spec, 'shoulder', s.x + 7, eyes, { y: s.y - 1 });
  return frameSvg(r.body + onShoulder + r.hands + r.head + petInPose(p.spec, 'point', xs[1], eyes) + petInPose(p.spec, 'watch', xs[2], eyes), skin);
}

// Die ganze Besetzung nebeneinander, stehend (nach Größe sortiert), mit den Tieren.
export function lineup(eyes: boolean, skin: SkinVariant, opts: { line?: number } = {}): string {
  const order = ['nolli', 'jette', 'mats', 'ilka', 'arne'].map((id) => human(id));
  const xs = [36, 94, 150, 208, 266];
  const parts = order.map((h, i) => humanInPose(h.spec, h.quirk, 'stand', xs[i], { eyes, line: opts.line }));
  parts.push(petInPose(pet('tuepfel').spec, 'sit', 330, eyes, { line: opts.line }), petInPose(pet('stups').spec, 'stand', 366, eyes, { line: opts.line }));
  return frameSvg(parts.join(''), skin);
}

// „Familie am Tisch“: Mats, Jette, Nolli, Ilka und Arne stehen hinter dem gedeckten Tisch, Tüpfel sitzt davor auf dem Boden.
// Zum Prüfen von Größenverhältnissen und Wiedererkennung. Auf dem Tisch nur ein Teller mit Apfel, keine heißen Dinge.
export function familyAtTable(eyes: boolean, skin: SkinVariant): string {
  const order = ['mats', 'jette', 'nolli', 'ilka', 'arne'].map((id) => human(id));
  const xs = [58, 112, 163, 222, 280];
  const people = order.map((h, i) => humanInPose(h.spec, h.quirk, 'stand', xs[i], { eyes })).join('');
  const topY = baseY - 50;
  // Tisch mit Decke (Leinen) vor den Beinen der Figuren
  const cloth = `<path d="M26 ${topY}H318V${baseY + 5}H26Z" fill="{{paper}}" stroke-width="4"/>`;
  const slab = `<path d="M20 ${topY - 7}H324V${topY}H20Z" fill="{{brown}}" stroke-width="4"/>`;
  const dish = plate(vec(172, topY - 11), 15, true);
  const cat = petInPose(pet('tuepfel').spec, 'sit', 346, eyes);
  const floor = `<path d="M24 ${baseY}H376" fill="none" stroke-width="4"/>`;
  return frameSvg(people + cloth + floor + slab + dish + cat, skin);
}

export type TriptychPanel = { title: string; svg: string };

// Standbild-Triptychon für ein Kind: läuft herein, nimmt das Tablett (kalte Kekse), jubelt.
export function childTriptych(id: 'jette' | 'mats', eyes: boolean, skin: SkinVariant): TriptychPanel[] {
  const fig = human(id);
  const { spec, quirk } = fig;
  const content: TrayContent = 'cookies';
  const topA = baseY - 58;
  const p1 = humanInPose(spec, quirk, 'walk', 105, { eyes }) + table(300, topA, 96, 58) + tray(vec(300, topA), 74, content);

  const topB = baseY + trayCenter(spec, true).y + 7;
  const r = buildHuman(spec, poseOf(spec, 'take', quirk), { x: 200, y: baseY, eyes });
  const c = trayCenter(spec, true);
  const p2 = r.body + table(200, topB, trayWidth(spec, true) + 36, baseY - topB) + tray(vec(200 + c.x, baseY + c.y), trayWidth(spec, true), content) + r.hands + r.head;

  const topC = baseY - 50;
  const p3 = humanInPose(spec, quirk, 'cheer', 150, { eyes }) + table(300, topC, 80, 50) + tray(vec(300, topC), 56, content);
  return [
    { title: 'läuft herein', svg: frameSvg(p1, skin) },
    { title: 'nimmt das Tablett', svg: frameSvg(p2, skin) },
    { title: 'jubelt', svg: frameSvg(p3, skin) },
  ];
}

// Standbild-Triptychon für Stups: hüpft herein, zeigt auf das Tablett (Tiere fassen nichts an), jubelt. Auf dem Tisch nur kalte Kekse.
export function birdTriptych(eyes: boolean, skin: SkinVariant): TriptychPanel[] {
  const stups = pet('stups').spec;
  const topA = baseY - 58;
  const tbl = (x: number, top: number, w: number): string => table(x, top, w, baseY - top) + tray(vec(x, top), w - 20, 'cookies');
  const p1 = petInPose(stups, 'hop', 110, eyes) + tbl(300, topA, 96);
  const p2 = petInPose(stups, 'point', 150, eyes) + tbl(290, topA, 96);
  const p3 = petInPose(stups, 'hop', 200, eyes) + tbl(320, baseY - 50, 80);
  return [
    { title: 'hüpft herein', svg: frameSvg(p1, skin) },
    { title: 'zeigt auf das Tablett', svg: frameSvg(p2, skin) },
    { title: 'jubelt', svg: frameSvg(p3, skin) },
  ];
}

export const sizeOfHuman = (s: HumanSpec): number => legLength(s) + s.torsoH + s.neck + 2 * s.headR;
export { cast, fmt };
