// Figuren-Rig (M9b): Blätter und Szenen für die Vorschau der Figurensätze (Figurenblatt, Gruppenbild, Triptychon).
// Gibt fertige SVG-Texte zurück (Palette eingesetzt), 400 × 200 wie eine Karte. Reine Funktionen.

import { renderTemplate } from '../illustrations.ts';
import { vec } from './math.ts';
import { buildPet, type PetPoseName } from './pets.ts';
import { plateCenter, poseOf, trayCenter, trayWidth, type PoseName, type Quirk } from './poses.ts';
import { plate, table, tray, type TrayContent } from './props.ts';
import { buildHuman, legLength, type HumanSpec, type Pose } from './rig.ts';
import type { PetSpec } from './pets.ts';
import type { FigureSet } from './sets.ts';

export const baseY = 176;
const frame = { w: 400, h: 200 };

// Rahmen mit Grund, Standlinie und gemeinsamer Linienart.
export function frameSvg(inner: string, opts: { backdrop?: boolean } = {}): string {
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
  return renderTemplate(svg);
}

type Held = { kind: 'plate' } | { kind: 'tray'; content: TrayContent; mitts: boolean; onTable?: boolean } | undefined;

// Eine Figur in einer Pose, mit dem Gegenstand, den die Pose hält. Reihenfolge: Körper, Gegenstand, Hände, Kopf.
export function humanInPose(spec: HumanSpec, quirk: Quirk | undefined, pose: PoseName | Pose, x: number, opts: { eyes: boolean; held?: Held; y?: number }): string {
  const y = opts.y ?? baseY;
  const p = typeof pose === 'string' ? poseOf(spec, pose, quirk) : pose;
  const mitts = opts.held?.kind === 'tray' && opts.held.mitts;
  const r = buildHuman(spec, p, { x, y, eyes: opts.eyes, mitts });
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

export function petInPose(spec: PetSpec, pose: PetPoseName, x: number, eyes: boolean, flip = false): string {
  return buildPet(spec, pose, { x, y: baseY, eyes, flip }).svg;
}

// Figurenblatt eines Menschen: stehen, hält etwas, trägt Tablett, jubelt.
export function humanSheet(fig: FigureSet['humans'][number], eyes: boolean): string {
  const { spec, quirk } = fig;
  const content: TrayContent = spec.role === 'adult' ? 'apples' : 'cookies';
  const mitts = spec.role === 'adult';
  const cells = [
    humanInPose(spec, quirk, 'stand', 52, { eyes }),
    humanInPose(spec, quirk, 'hold', 142, { eyes, held: { kind: 'plate' } }),
    humanInPose(spec, quirk, 'tray', 246, { eyes, held: { kind: 'tray', content, mitts } }),
    humanInPose(spec, quirk, 'cheer', 346, { eyes }),
  ];
  return frameSvg(cells.join(''));
}

export function petSheet(pet: FigureSet['pet'], eyes: boolean): string {
  const poses: PetPoseName[] = ['stand', 'walk', 'jump', 'sniff'];
  return frameSvg(poses.map((p, i) => petInPose(pet.spec, p, 55 + i * 96, eyes)).join(''));
}

// Gruppenbild: alle Figuren des Satzes nebeneinander, stehend.
export function groupShot(set: FigureSet, eyes: boolean): string {
  const xs = [58, 128, 200];
  const parts = set.humans.map((h, i) => humanInPose(h.spec, h.quirk, 'stand', xs[i], { eyes }));
  parts.push(petInPose(set.pet.spec, 'stand', 302, eyes));
  return frameSvg(parts.join(''), { backdrop: true });
}

export type TriptychPanel = { title: string; svg: string };

// Standbild-Triptychon: reinlaufen, Tablett nehmen, jubeln.
export function triptych(set: FigureSet, eyes: boolean): TriptychPanel[] {
  const [big, small, adult] = set.humans;
  const tableTop = (s: HumanSpec, onTable: boolean): number => baseY + trayCenter(s, onTable).y + 7;

  // 1. Das größere Kind läuft herein, rechts steht der Tisch mit dem Tablett.
  const topA = baseY - 58;
  const p1 =
    humanInPose(big.spec, big.quirk, 'walk', 105, { eyes }) +
    table(300, topA, 96, 58) +
    tray(vec(300, topA), 74, 'apples');

  // 2. Der Erwachsene nimmt das Tablett (Ofenhandschuhe), der Tisch steht davor.
  const topB = tableTop(adult.spec, true);
  const fig = buildHuman(adult.spec, poseOf(adult.spec, 'take', adult.quirk), { x: 200, y: baseY, eyes, mitts: true });
  const c = trayCenter(adult.spec, true);
  const p2 =
    fig.body +
    table(200, topB, trayWidth(adult.spec, true) + 36, baseY - topB) +
    tray(vec(200 + c.x, baseY + c.y), trayWidth(adult.spec, true), 'apples') +
    fig.hands +
    fig.head;

  // 3. Alle jubeln, der Tisch steht rechts.
  const topC = baseY - 50;
  const p3 =
    humanInPose(big.spec, big.quirk, 'cheer', 52, { eyes }) +
    humanInPose(small.spec, small.quirk, 'cheer', 112, { eyes }) +
    humanInPose(adult.spec, adult.quirk, 'cheer', 184, { eyes }) +
    petInPose(set.pet.spec, 'jump', 262, eyes) +
    table(346, topC, 62, 50) +
    tray(vec(346, topC), 50, 'apples');

  return [
    { title: 'läuft herein', svg: frameSvg(p1) },
    { title: 'nimmt das Tablett', svg: frameSvg(p2) },
    { title: 'jubelt', svg: frameSvg(p3) },
  ];
}

export const sizeOfHuman = (s: HumanSpec): number => legLength(s) + s.torsoH + s.neck + 2 * s.headR;
