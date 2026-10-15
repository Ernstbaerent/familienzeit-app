// Figuren-Rig (M9b): Menschenfiguren aus getrennten Teilen (Kopf, Haar, Rumpf, Arme, Beine) mit Ankerpunkten und benannten Posen.
// Eine Pose ist nur Daten (Winkel oder Zielpunkte für die Hände); `buildHuman` rechnet sie in Gelenkpunkte um und zeichnet sie.
// Dieselben Daten tragen später auch eine Animation (siehe docs/design/FIGUREN.md, „Animation und Video“). Reine Funktionen.

import { add, capsule, fmt, fromAngles, Path, rotate, solveArm, sub, vec, type ElbowSide, type Vec } from './math.ts';

export type Tint = 'ink' | 'paper' | 'rose' | 'petrol' | 'honey' | 'brown';
export type LimbStyle = 'line' | 'capsule' | 'block';
export type TorsoStyle = 'bean' | 'box' | 'slim' | 'dress';
export type HairKind = 'none' | 'cap' | 'bob' | 'tuft' | 'bun' | 'beanie' | 'curls';

export type HumanSpec = {
  id: string;
  name: string;
  role: 'adult' | 'child' | 'toddler';
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
export type LegPose = { angle: number; bend: number };

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
  limbShadow?: boolean; // versetzte Farbfläche auch an Armen und Beinen (kostet etwa ein Drittel mehr Bytes)
};

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
export type Rendered = { svg: string; body: string; hands: string; head: string; anchors: Anchors };

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

function torsoPaths(s: HumanSpec, xf: (p: Vec) => Vec, pelvisY: number): string {
  const { torsoH: h, torsoW: w, shoulderW: sw, hipW } = s;
  const top = pelvisY - h;
  const bottom = s.torso === 'dress' ? pelvisY + 10 : pelvisY;
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

function hand(c: Vec, r: number, mitt: boolean): string {
  if (!mitt) return `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" fill="{{paper}}" stroke-width="4"/>`;
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

  const out: string[] = [];
  const hair = hairPaths(spec, world(headC), (lean + tilt) * flipX);
  out.push(hair.back);

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
    out.push(`<ellipse cx="${fmt(f.x)}" cy="${fmt(f.y)}" rx="${fmt(spec.footLen * 0.55)}" ry="${fmt(spec.footLen * 0.33)}" fill="${fill(spec.colors.shoes)}" stroke-width="4"/>`);
  }
  // Arme hinter dem Rumpf (der Rumpf überdeckt den Ansatz)
  for (const arm of arms) out.push(limbSvg(arm.s, arm.mid, spec.colors.top), limbSvg(arm.mid, arm.end, spec.colors.top));

  // Rumpf
  const torsoD = torsoPaths(spec, upper, pelvis.y);
  const torsoS = torsoPaths(spec, (p) => add(upper(p), vec(shadow, shadow)), pelvis.y);
  out.push(shape(torsoD, torsoS, spec.colors.top));
  if (spec.colors.accent && spec.torso !== 'bean') {
    const y = pelvis.y - spec.torsoH * 0.32;
    const a = upper(vec(-spec.torsoW * 0.36, y));
    const b = upper(vec(spec.torsoW * 0.36, y));
    out.push(`<path d="M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}" fill="none" stroke="${spec.colors.top === 'petrol' ? '{{paper}}' : '{{ink}}'}" stroke-width="2.5"/>`);
  }
  if (spec.scarf) {
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
  for (const arm of arms) out.push(hand(world(arm.end), spec.handR, opts.mitts === true));
  const handsEnd = out.length;

  // Kopf, Gesicht, Haare vorn
  const hw = world(headC);
  out.push(`<circle cx="${fmt(hw.x)}" cy="${fmt(hw.y)}" r="${fmt(spec.headR)}" fill="{{paper}}" stroke-width="4"/>`);
  out.push(hair.front);
  if (opts.eyes) {
    const er = Math.max(1.7, spec.headR * 0.14);
    for (const side of [-1, 1]) {
      const e = add(headC, rotate(vec(side * spec.headR * 0.38, spec.headR * 0.08), lean + tilt));
      const we = world(e);
      out.push(`<circle cx="${fmt(we.x)}" cy="${fmt(we.y)}" r="${fmt(er)}" fill="{{ink}}" stroke="none"/>`);
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
  return { svg: out.join(''), body: out.slice(0, bodyEnd).join(''), hands: out.slice(bodyEnd, handsEnd).join(''), head: out.slice(handsEnd).join(''), anchors };
}

