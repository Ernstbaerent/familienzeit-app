// Figuren-Rig (M9b): Menschenfiguren aus getrennten Teilen (Kopf, Haar, Rumpf, Arme, Beine) mit Ankerpunkten und benannten Posen.
// Eine Pose ist nur Daten (Winkel oder Zielpunkte für die Hände); `buildHuman` rechnet sie in Gelenkpunkte um und zeichnet sie.
// Dieselben Daten tragen später auch eine Animation (siehe docs/design/FIGUREN.md, „Animation und Video“). Reine Funktionen.

import { add, capsule, fmt, fromAngles, Path, rotate, scale, solveArm, sub, vec, type ElbowSide, type Vec } from './math.ts';

export type Tint = 'ink' | 'paper' | 'rose' | 'petrol' | 'honey' | 'brown';
// Hautton-Platz einer Figur: `{{skin1}}` bis `{{skin8}}` für Kopf und Hände, `{{eye1}}` bis `{{eye8}}` für die Augenpunkte (siehe skin.ts).
export type { SkinSlot } from './skin.ts';
import type { SkinSlot } from './skin.ts';
export type LimbStyle = 'line' | 'capsule' | 'block';
export type TorsoStyle = 'bean' | 'box' | 'slim' | 'dress';
export type HairKind = 'none' | 'cap' | 'bob' | 'tuft' | 'bun' | 'beanie' | 'curls';

export type HumanSpec = {
  id: string;
  name: string;
  role: 'adult' | 'teen' | 'child' | 'toddler';
  skin: SkinSlot;
  // Maße in Einheiten der 400 × 200-Fläche (wie die Bausteine); Standhöhe = Beine + Rumpf + Hals + Kopf.
  headR: number;
  neck: number;
  torsoH: number;
  torsoW: number;
  shoulderW: number;
  hipW: number;
  upperArm: number;
  foreArm: number;
  upperLeg: number;
  lowerLeg: number;
  handR: number;
  footLen: number;
  limb: { style: LimbStyle; w: number }; // w = halbe Dicke bei Kapsel und Block, bei „line“ unbenutzt
  torso: TorsoStyle;
  colors: { top: Tint; bottom: Tint; shoes: Tint; hair: Tint; hat?: Tint; accent?: Tint };
  hair: HairKind;
  scarf?: boolean;
};

export type ArmPose = { angle: number; bend: number } | { to: Vec; elbow?: ElbowSide };
// Ein Bein aus Winkeln oder (Fahrrad, 2026-10-18) mit Zielpunkt für den Fuß; das Knie zeigt dann nach vorn (zur Bildmitte).
export type LegPose = { angle: number; bend: number } | { to: Vec };

export type Pose = {
  lean?: number; // Rumpf neigen, Grad, positiv = nach rechts im Bild
  tilt?: number; // Kopf neigen, Grad
  dy?: number; // Figur anheben (negativ = nach oben), z. B. beim Hüpfen
  armL: ArmPose; // linker Arm im Bild
  armR: ArmPose;
  legL: LegPose;
  legR: LegPose;
};

export type RenderOptions = {
  x: number; // Mitte der Füße
  y: number; // Standlinie
  eyes?: boolean; // zwei Punkte als Augen, sonst nichts
  mitts?: boolean; // Ofenhandschuhe an beiden Händen
  flip?: boolean; // spiegelt die Figur an ihrer Mitte
  line?: number; // Linienstärke der Figur (Standard `figureLine` = 5, Gegenstände bleiben 4); feine Linien bleiben 2,5
  limbShadow?: boolean; // versetzte Farbfläche auch an Armen und Beinen (kostet etwa ein Drittel mehr Bytes)
  outfit?: Outfit; // Regen-Kleidung: Regenjacke mit Kapuze und Gummistiefel statt der eigenen Kleidung
  helmet?: Tint; // Fahrradhelm in diesem Ton (statt Haaren und Mütze)
};

// Regen-Kleidung (M9b, Schritt 3a): Jacke mit Kapuze (ohne Mütze) und Gummistiefel, beides in einem Ton der Kleidung (Petrol oder Rosé).
export type Outfit = { kind: 'rain'; tint: 'rose' | 'petrol' };

export type Circle = { c: Vec; r: number };

// Wo Haut und Kleidung liegen, für den Szenenprüfer (Petrol hinter tiefen Hauttönen): Kopf, Hände, Kapuze, Farbe des Oberteils.
export type Geometry = { head: Circle; hands: [Circle, Circle]; hood?: Circle & { tint: Tint }; top: Tint };

export type Anchors = {
  pelvis: Vec;
  neck: Vec;
  head: Vec;
  shoulderL: Vec;
  shoulderR: Vec;
  handL: Vec;
  handR: Vec;
  footL: Vec;
  footR: Vec;
};

// `body` (hinter Gegenständen), `hands` (über Gegenständen, damit sie am Rand sitzen), `head`; `svg` ist alles in der richtigen Reihenfolge.
export type Rendered = { svg: string; body: string; hands: string; head: string; anchors: Anchors; geometry: Geometry };

// Umrisslinie der Figuren (Clemens, 2026-10-16): 5, Gegenstände 4, feine Linien 2,5 (docs/design/ILLUSTRATIONEN.md).
export const figureLine = 5;

export const legLength = (s: HumanSpec): number => s.upperLeg + s.lowerLeg;
export const standHeight = (s: HumanSpec): number => legLength(s) + s.torsoH + s.neck + 2 * s.headR;

const shadow = 3; // Versatz der Farbflächen wie bei den Bausteinen

function fill(tint: Tint): string {
  return `{{${tint}}}`;
}

// Eine Fläche mit versetztem Farbschatten und Umriss: zwei Elemente wie bei den Bausteinen.
function shape(dPath: string, dShadow: string, tint: Tint): string {
  return `<path d="${dShadow}" fill="${fill(tint)}" stroke="none"/><path d="${dPath}" fill="none" stroke-width="4"/>`;
}

// `drop` verlängert den Rumpf nach unten (Regenjacke über die Hüfte), die Schultern bleiben.
function torsoPaths(s: HumanSpec, xf: (p: Vec) => Vec, pelvisY: number, drop = 0): string {
  const { torsoH: h, torsoW: w, shoulderW: sw, hipW } = s;
  const top = pelvisY - h;
  const bottom = (s.torso === 'dress' ? pelvisY + 10 : pelvisY) + drop;
  const p = new Path(xf);
  switch (s.torso) {
    case 'bean': {
      const cw = w * 0.667;
      p.M(0, top).C(cw, top + h * 0.05, cw, bottom, 0, bottom).C(-cw, bottom, -cw, top + h * 0.05, 0, top).Z();
      break;
    }
    case 'box': {
      const r = Math.min(8, w * 0.2);
      const hw = w / 2;
      p.M(-hw + r, top).L(hw - r, top).Q(hw, top, hw, top + r).L(hw, bottom - r).Q(hw, bottom, hw - r, bottom).L(-hw + r, bottom).Q(-hw, bottom, -hw, bottom - r).L(-hw, top + r).Q(-hw, top, -hw + r, top).Z();
      break;
    }
    case 'slim': {
      const hw = (hipW + 8) / 2;
      p.M(-sw / 2, top + 4).Q(-sw / 2, top, -sw / 2 + 4, top).L(sw / 2 - 4, top).Q(sw / 2, top, sw / 2, top + 4).L(hw, bottom).L(-hw, bottom).Z();
      break;
    }
    case 'dress': {
      const hw = w * 0.78;
      p.M(-sw / 2, top + 4).Q(-sw / 2, top, -sw / 2 + 4, top).L(sw / 2 - 4, top).Q(sw / 2, top, sw / 2, top + 4).L(hw, bottom).Q(0, bottom + 5, -hw, bottom).Z();
      break;
    }
  }
  return p.toString();
}

function limbPath(a: Vec, b: Vec, s: HumanSpec): string {
  return capsule(a, b, s.limb.w, s.limb.style === 'block' ? 0.35 : 1);
}

function hairPaths(s: HumanSpec, head: Vec, rot: number): { back: string; front: string; extra: string } {
  const R = s.headR;
  const xf = (p: Vec): Vec => add(head, rotate(p, rot));
  const hair = fill(s.colors.hair);
  let back = '';
  let front = '';
  let extra = '';
  const cap = (extend: number): string =>
    new Path(xf)
      .M(-R * 1.04, -R * 0.1)
      .C(-R * 1.12, -R * 1.3, R * 1.12, -R * 1.3, R * 1.04, -R * 0.1)
      .L(R * 0.78, -R * 0.42 + extend)
      .Q(0, -R * 0.95 + extend, -R * 0.78, -R * 0.42 + extend)
      .Z()
      .toString();
  switch (s.hair) {
    case 'cap':
      front = `<path d="${cap(0)}" fill="${hair}" stroke-width="4"/>`;
      break;
    case 'bob': {
      const side = new Path(xf)
        .M(-R * 1.06, -R * 0.2)
        .L(-R * 1.12, R * 0.75)
        .Q(-R * 0.9, R * 0.95, -R * 0.62, R * 0.7)
        .L(-R * 0.7, -R * 0.2)
        .Z()
        .M(R * 1.06, -R * 0.2)
        .L(R * 1.12, R * 0.75)
        .Q(R * 0.9, R * 0.95, R * 0.62, R * 0.7)
        .L(R * 0.7, -R * 0.2)
        .Z()
        .toString();
      back = `<path d="${side}" fill="${hair}" stroke-width="4"/>`;
      front = `<path d="${cap(0)}" fill="${hair}" stroke-width="4"/>`;
      break;
    }
    case 'tuft': {
      const t = new Path(xf).M(-R * 0.35, -R * 0.95).L(-R * 0.55, -R * 1.6).M(0, -R).L(0, -R * 1.7).M(R * 0.35, -R * 0.95).L(R * 0.58, -R * 1.55).toString();
      front = `<path d="${t}" fill="none" stroke-width="4"/>`;
      break;
    }
    case 'bun': {
      const bunC = xf(vec(0, -R * 1.45));
      back = `<circle cx="${fmt(bunC.x)}" cy="${fmt(bunC.y)}" r="${fmt(R * 0.5)}" fill="${hair}" stroke-width="4"/>`;
      front = `<path d="${cap(0)}" fill="${hair}" stroke-width="4"/>`;
      break;
    }
    case 'beanie': {
      const hat = fill(s.colors.hat ?? 'petrol');
      const dome = new Path(xf)
        .M(-R * 1.08, -R * 0.2)
        .C(-R * 1.15, -R * 1.9, R * 1.15, -R * 1.9, R * 1.08, -R * 0.2)
        .Z()
        .toString();
      const band = new Path(xf).M(-R * 1.1, -R * 0.45).L(R * 1.1, -R * 0.45).L(R * 1.08, -R * 0.1).L(-R * 1.08, -R * 0.1).Z().toString();
      const pom = xf(vec(0, -R * 1.62));
      front = `<path d="${dome}" fill="${hat}" stroke-width="4"/><path d="${band}" fill="${fill(s.colors.accent ?? 'paper')}" stroke-width="4"/>`;
      extra = `<circle cx="${fmt(pom.x)}" cy="${fmt(pom.y)}" r="${fmt(R * 0.32)}" fill="${fill('honey')}" stroke-width="4"/>`;
      break;
    }
    case 'curls': {
      const parts: string[] = [];
      for (const [ax, ay] of [[-0.95, -0.15], [-0.78, -0.62], [-0.38, -0.95], [0.38, -0.95], [0.78, -0.62], [0.95, -0.15]] as const) {
        const c = xf(vec(ax * R, ay * R));
        parts.push(`<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(R * 0.42)}" fill="${hair}" stroke-width="4"/>`);
      }
      back = parts.join('');
      break;
    }
    case 'none':
      break;
  }
  return { back, front, extra };
}

function hand(c: Vec, r: number, mitt: boolean, skin: SkinSlot): string {
  if (!mitt) return `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" fill="{{skin${skin}}}" stroke-width="4"/>`;
  const big = r * 2;
  return `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(big)}" fill="{{honey}}" stroke-width="4"/><circle cx="${fmt(c.x + big * 0.55)}" cy="${fmt(c.y - big * 0.5)}" r="${fmt(big * 0.45)}" fill="{{honey}}" stroke-width="4"/>`;
}

// Zeichnet eine Figur in einer Pose. Rückgabe: SVG-Elemente (mit Farbplätzen) und die Ankerpunkte in Bildkoordinaten.
export function buildHuman(spec: HumanSpec, pose: Pose, opts: RenderOptions): Rendered {
  const flipX = opts.flip ? -1 : 1;
  const origin = vec(opts.x, opts.y + (pose.dy ?? 0));
  const world = (p: Vec): Vec => vec(origin.x + p.x * flipX, origin.y + p.y);
  const lean = pose.lean ?? 0;
  const tilt = pose.tilt ?? 0;
  const legLen = legLength(spec);
  const pelvis = vec(0, -legLen);
  const upper = (p: Vec): Vec => world(rotate(p, lean, pelvis));
  const neckBase = rotate(vec(0, pelvis.y - spec.torsoH), lean, pelvis);
  const headC = add(neckBase, rotate(vec(0, -(spec.neck + spec.headR)), lean + tilt));
  const shoulder = (side: 1 | -1): Vec => rotate(vec(side * spec.shoulderW / 2, pelvis.y - spec.torsoH * 0.9), lean, pelvis);

  // Beine
  const legs = ([[-1, pose.legL], [1, pose.legR]] as const).map(([side, lp]) => {
    const hip = vec(side * spec.hipW / 2, pelvis.y);
    if ('to' in lp) {
      const { elbow, hand: foot } = solveArm(hip, lp.to, spec.upperLeg, spec.lowerLeg, 1, 'out');
      return { side, hip, mid: elbow, end: foot };
    }
    const { mid, end } = fromAngles(hip, lp.angle, lp.bend, spec.upperLeg, spec.lowerLeg, side);
    return { side, hip, mid, end };
  });
  // Arme
  const arms = ([[-1, pose.armL], [1, pose.armR]] as const).map(([side, ap]) => {
    const s = shoulder(side);
    if ('angle' in ap) {
      const { mid, end } = fromAngles(s, ap.angle, ap.bend, spec.upperArm, spec.foreArm, side);
      return { side, s, mid: rotate(mid, lean, s), end: rotate(end, lean, s) };
    }
    const target = vec(ap.to.x, ap.to.y);
    const { elbow, hand: h } = solveArm(s, target, spec.upperArm, spec.foreArm, side, ap.elbow ?? 'down');
    return { side, s, mid: elbow, end: h };
  });

  const rain = opts.outfit?.kind === 'rain' ? opts.outfit : undefined;
  // Mit Regenjacke: schlanke Jacke bis über die Hüfte in ihrem Ton, Kapuze statt Haaren (eine Mütze bleibt, dann ohne Kapuze).
  const hooded = rain !== undefined && spec.hair !== 'beanie';
  const dressed: HumanSpec = rain === undefined ? spec : { ...spec, torso: 'slim', colors: { ...spec.colors, top: rain.tint, accent: undefined }, scarf: false };
  const out: string[] = [];
  const hair = hooded || opts.helmet !== undefined ? { back: '', front: '', extra: '' } : hairPaths(spec, world(headC), (lean + tilt) * flipX);
  out.push(hair.back);
  let hood: Geometry['hood'];
  if (opts.helmet !== undefined) {
    // Helm: Kuppel über dem Kopf mit kurzem Schirm vorn (wird nach dem Kopf gezeichnet, siehe unten)
    const R = spec.headR;
    const hx = (p: Vec): Vec => world(add(headC, rotate(p, lean + tilt)));
    const dome = new Path(hx).M(-R * 1.15, -R * 0.1).C(-R * 1.25, -R * 1.85, R * 1.25, -R * 1.85, R * 1.15, -R * 0.1).L(R * 1.5, -R * 0.15).L(R * 1.12, -R * 0.38).Q(0, -R * 0.75, -R * 1.15, -R * 0.1).Z().toString();
    hair.front = `<path d="${dome}" fill="${fill(opts.helmet)}" stroke-width="4"/>`;
    hood = { c: hx(vec(0, -R * 0.5)), r: R * 1.3, tint: opts.helmet };
  }
  if (hooded) {
    const hc = world(add(headC, rotate(vec(0, -spec.headR * 0.12), lean + tilt)));
    hood = { c: hc, r: spec.headR * 1.4, tint: rain.tint };
    out.push(`<circle cx="${fmt(hc.x)}" cy="${fmt(hc.y)}" r="${fmt(hood.r)}" fill="${fill(rain.tint)}" stroke-width="4"/>`);
  }

  const limbSvg = (a: Vec, b: Vec, tint: Tint): string => {
    const wa = world(a);
    const wb = world(b);
    if (spec.limb.style === 'line') return `<path d="M${fmt(wa.x)} ${fmt(wa.y)}L${fmt(wb.x)} ${fmt(wb.y)}" fill="none" stroke-width="4"/>`;
    const d = limbPath(wa, wb, spec);
    if (!opts.limbShadow) return `<path d="${d}" fill="${fill(tint)}" stroke-width="4"/>`;
    const ds = limbPath(add(wa, vec(shadow, shadow)), add(wb, vec(shadow, shadow)), spec);
    return shape(d, ds, tint);
  };

  // Beine und Schuhe
  for (const leg of legs) {
    out.push(limbSvg(leg.hip, leg.mid, spec.colors.bottom), limbSvg(leg.mid, leg.end, spec.colors.bottom));
    const f = world(add(leg.end, vec(leg.side * spec.footLen * 0.28, 1)));
    if (rain !== undefined) {
      // Gummistiefel: Schaft über das untere Drittel des Unterschenkels, vorn die Spitze
      const top = world(add(leg.end, scale(sub(leg.mid, leg.end), 0.55)));
      out.push(`<path d="${capsule(top, world(leg.end), spec.footLen * 0.42)}" fill="${fill(rain.tint)}" stroke-width="4"/>`);
      out.push(`<ellipse cx="${fmt(f.x)}" cy="${fmt(f.y)}" rx="${fmt(spec.footLen * 0.6)}" ry="${fmt(spec.footLen * 0.36)}" fill="${fill(rain.tint)}" stroke-width="4"/>`);
      continue;
    }
    out.push(`<ellipse cx="${fmt(f.x)}" cy="${fmt(f.y)}" rx="${fmt(spec.footLen * 0.55)}" ry="${fmt(spec.footLen * 0.33)}" fill="${fill(spec.colors.shoes)}" stroke-width="4"/>`);
  }
  // Arme hinter dem Rumpf (der Rumpf überdeckt den Ansatz)
  for (const arm of arms) out.push(limbSvg(arm.s, arm.mid, dressed.colors.top), limbSvg(arm.mid, arm.end, dressed.colors.top));

  // Rumpf (mit Regenjacke: schlank, etwas länger, Reißverschluss als feine Linie)
  const jacketDrop = rain === undefined ? 0 : 8;
  const torsoD = torsoPaths(dressed, upper, pelvis.y, jacketDrop);
  const torsoS = torsoPaths(dressed, (p) => add(upper(p), vec(shadow, shadow)), pelvis.y, jacketDrop);
  out.push(shape(torsoD, torsoS, dressed.colors.top));
  if (rain !== undefined) {
    const a = upper(vec(0, pelvis.y - spec.torsoH + 4));
    const b = upper(vec(0, pelvis.y + jacketDrop - 3));
    out.push(`<path d="M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}" fill="none" stroke="${rain.tint === 'petrol' ? '{{paper}}' : '{{ink}}'}" stroke-width="2.5"/>`);
  }
  if (spec.colors.accent && spec.torso !== 'bean' && rain === undefined) {
    const y = pelvis.y - spec.torsoH * 0.32;
    const a = upper(vec(-spec.torsoW * 0.36, y));
    const b = upper(vec(spec.torsoW * 0.36, y));
    out.push(`<path d="M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}" fill="none" stroke="${spec.colors.top === 'petrol' ? '{{paper}}' : '{{ink}}'}" stroke-width="2.5"/>`);
  }
  if (dressed.scarf === true) {
    const n = neckBase;
    const q = (x: number, y: number): string => {
      const p = upper(vec(x, n.y + y));
      return `${fmt(p.x)} ${fmt(p.y)}`;
    };
    const band = `M${q(-spec.shoulderW * 0.42, 0)}Q${q(0, 9)} ${q(spec.shoulderW * 0.42, 0)}L${q(spec.shoulderW * 0.4, 6)}Q${q(0, 15)} ${q(-spec.shoulderW * 0.4, 6)}Z`;
    const tail = `M${q(spec.shoulderW * 0.2, 9)}L${q(spec.shoulderW * 0.5, 34)}L${q(spec.shoulderW * 0.3, 38)}L${q(spec.shoulderW * 0.05, 13)}Z`;
    out.push(`<path d="${tail}" fill="${fill(spec.colors.accent ?? 'rose')}" stroke-width="4"/><path d="${band}" fill="${fill(spec.colors.accent ?? 'rose')}" stroke-width="4"/>`);
  }

  const bodyEnd = out.length;
  // Hände (über den Armen, damit sie an Gegenständen sitzen)
  for (const arm of arms) out.push(hand(world(arm.end), spec.handR, opts.mitts === true, spec.skin));
  const handsEnd = out.length;

  // Kopf, Gesicht, Haare vorn
  const hw = world(headC);
  out.push(`<circle cx="${fmt(hw.x)}" cy="${fmt(hw.y)}" r="${fmt(spec.headR)}" fill="{{skin${spec.skin}}}" stroke-width="4"/>`);
  out.push(hair.front);
  if (opts.eyes) {
    const er = Math.max(1.7, spec.headR * 0.14);
    for (const side of [-1, 1]) {
      const e = add(headC, rotate(vec(side * spec.headR * 0.38, spec.headR * 0.08), lean + tilt));
      const we = world(e);
      out.push(`<circle cx="${fmt(we.x)}" cy="${fmt(we.y)}" r="${fmt(er)}" fill="{{eye${spec.skin}}}" stroke="none"/>`);
    }
  }
  out.push(hair.extra);

  const anchors: Anchors = {
    pelvis: world(pelvis),
    neck: world(neckBase),
    head: hw,
    shoulderL: world(shoulder(-1)),
    shoulderR: world(shoulder(1)),
    handL: world(arms[0].end),
    handR: world(arms[1].end),
    footL: world(legs[0].end),
    footR: world(legs[1].end),
  };
  const lw = opts.line ?? figureLine;
  const thick = (text: string): string => text.replaceAll('stroke-width="4"', `stroke-width="${lw}"`);
  const handR = opts.mitts === true ? spec.handR * 2 : spec.handR;
  const geometry: Geometry = {
    head: { c: hw, r: spec.headR },
    hands: [{ c: anchors.handL, r: handR }, { c: anchors.handR, r: handR }],
    hood,
    top: dressed.colors.top,
  };
  return { svg: thick(out.join('')), body: thick(out.slice(0, bodyEnd).join('')), hands: thick(out.slice(bodyEnd, handsEnd).join('')), head: thick(out.slice(handsEnd).join('')), anchors, geometry };
}

