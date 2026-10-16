// Figuren-Rig (M9b): Haustiere (Vogel Stups, Katze Tüpfel) aus getrennten Teilen, von der Seite gesehen, Blick nach rechts.
// Wie die Menschen im Stil von Satz C: lange dünne Linien, kleiner Kopf, leicht schiefe Haltung. Posen als Daten, Augen als zwei Punkte (freiwillig).
// Regel: Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung (castRules.ts, Szenenprüfer).

import { add, fmt, Path, rotate, vec, type Vec } from './math.ts';
import type { Tint } from './rig.ts';

export type PetSpec = {
  id: string;
  name: string;
  kind: 'bird' | 'cat';
  bodyRx: number;
  bodyRy: number;
  headR: number;
  legLen: number;
  tailLen: number;
  colors: { body: Tint; accent: Tint };
};

export type PetPoseName = 'stand' | 'sit' | 'hop' | 'shoulder' | 'point' | 'watch';
export const petPoseNames: readonly PetPoseName[] = ['stand', 'sit', 'hop', 'shoulder', 'point', 'watch'];
export const petPoseLabels: Record<PetPoseName, { de: string; en: string }> = {
  stand: { de: 'steht', en: 'standing' },
  sit: { de: 'sitzt', en: 'sitting' },
  hop: { de: 'hüpft', en: 'hopping' },
  shoulder: { de: 'sitzt auf der Schulter', en: 'sitting on a shoulder' },
  point: { de: 'zeigt', en: 'pointing' },
  watch: { de: 'schaut zu', en: 'watching' },
};

const fill = (t: Tint): string => `{{${t}}}`;
const line = (d: string, w = 4): string => `<path d="${d}" fill="none" stroke-width="${w}"/>`;

export function petHeight(s: PetSpec): number {
  return s.legLen + 2 * s.bodyRy + s.headR * 0.6;
}

type Layout = {
  dy: number;
  tilt: number; // Rumpf neigen (Grad, positiv = Nase nach unten)
  bodyY: number; // Höhe der Rumpfmitte über der Standlinie (negativ)
  headRot: number; // Kopf drehen
  headDrop: number;
  sit: boolean;
  hop: boolean;
  point: boolean;
};

function layoutOf(s: PetSpec, pose: PetPoseName): Layout {
  const stand = -(s.legLen + s.bodyRy * 0.9);
  const base: Layout = { dy: 0, tilt: s.kind === 'bird' ? -12 : 0, bodyY: stand, headRot: 0, headDrop: 0, sit: false, hop: false, point: false };
  switch (pose) {
    case 'stand':
      return base;
    case 'sit':
    case 'shoulder':
    case 'watch': {
      const bird = s.kind === 'bird';
      const tilt = bird ? -32 : -55;
      const bodyY = bird ? -(s.legLen * 0.85 + s.bodyRy * 0.9 + s.bodyRx * 0.25) : -(s.bodyRx * 0.82 + s.bodyRy * 0.6);
      return { ...base, tilt, bodyY, headRot: pose === 'watch' ? -16 : 0, sit: true };
    }
    case 'hop':
      return { ...base, dy: -13, tilt: s.kind === 'bird' ? -20 : -12, hop: true };
    case 'point':
      return { ...base, tilt: s.kind === 'bird' ? 8 : -6, headRot: s.kind === 'bird' ? 6 : -4, point: true };
  }
}

export function buildPet(spec: PetSpec, pose: PetPoseName, opts: { x: number; y: number; eyes?: boolean; flip?: boolean; line?: number }): { svg: string } {
  const f = opts.flip ? -1 : 1;
  const L = layoutOf(spec, pose);
  const w = (p: Vec): Vec => vec(opts.x + p.x * f, opts.y + L.dy + p.y);
  const body = vec(0, L.bodyY);
  const bodyXf = (p: Vec): Vec => w(rotate(p, L.tilt, body));
  const out: string[] = [];
  const rx = spec.bodyRx;
  const ry = spec.bodyRy;
  const bird = spec.kind === 'bird';

  // Schwanz (hinten, von Rumpfhöhe aus)
  const t = spec.tailLen;
  if (bird) {
    const tail = new Path(bodyXf).M(-rx * 0.8, body.y).L(-rx - t, body.y + t * 0.35).M(-rx * 0.75, body.y + 3).L(-rx - t * 0.8, body.y + t * 0.75).toString();
    out.push(line(tail));
  } else if (L.sit) {
    // Katze sitzt: Schwanz liegt vorn am Boden
    const base = bodyXf(vec(-rx * 0.6, body.y + ry * 0.7));
    const tail = `M${fmt(base.x)} ${fmt(base.y)}C${fmt(base.x - t * 0.2)} ${fmt(opts.y + L.dy + 2)} ${fmt(base.x + t * 0.5)} ${fmt(opts.y + L.dy + 2)} ${fmt(base.x + t * 0.95)} ${fmt(opts.y + L.dy - 3)}`;
    out.push(line(tail));
  } else {
    const tail = new Path(bodyXf).M(-rx * 0.9, body.y).C(-rx - t * 0.6, body.y + 4, -rx - t, body.y - t * 0.8, -rx - t * 0.45, body.y - t * 1.15).toString();
    out.push(line(tail));
  }

  // Beine
  const ground = (x: number, lift = 0): Vec => w(vec(x, -lift));
  const hipFront = bodyXf(vec(rx * 0.5, body.y + ry * 0.6));
  const hipBack = bodyXf(vec(-rx * 0.45, body.y + ry * 0.6));
  const seg = (a: Vec, b: Vec): string => line(`M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`);
  const foot = (b: Vec, dir: number): string => line(`M${fmt(b.x - 1 * f)} ${fmt(b.y)}L${fmt(b.x + dir * 5 * f)} ${fmt(b.y)}`);
  if (bird) {
    const legs = L.hop ? [{ a: hipFront, b: add(hipFront, vec(4 * f, 6)) }, { a: hipBack, b: add(hipBack, vec(-3 * f, 7)) }] : [{ a: hipBack, b: ground(hipBack.x === 0 ? 0 : (hipBack.x - opts.x) * f - 1) }, { a: hipFront, b: ground((hipFront.x - opts.x) * f - 4) }];
    for (const leg of legs) out.push(seg(leg.a, leg.b), L.hop ? '' : foot(leg.b, 1));
  } else if (L.sit) {
    const front = ground((hipFront.x - opts.x) * f + 1);
    out.push(seg(hipFront, front), foot(front, 1));
    const hind = ground((hipBack.x - opts.x) * f + 3);
    out.push(`<ellipse cx="${fmt(hind.x - 3 * f)}" cy="${fmt(hind.y - 4)}" rx="9" ry="4.5" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
  } else {
    const hop = L.hop;
    const fx = [rx * 0.55, rx * 0.4];
    const bx = [-rx * 0.55, -rx * 0.4];
    const feet = [
      { a: hipBack, b: hop ? w(vec(bx[0] - 14, -4)) : ground(bx[0]) },
      { a: hipBack, b: hop ? w(vec(bx[1] - 8, -2)) : ground(bx[1] + 8) },
      { a: hipFront, b: hop ? w(vec(fx[0] + 15, -8)) : ground(fx[0] - 4) },
      { a: hipFront, b: hop ? w(vec(fx[1] + 10, -5)) : ground(fx[1] + 6) },
    ];
    for (const leg of feet) out.push(seg(leg.a, leg.b));
  }

  // Körper
  const k = 0.5523;
  const bodyPath = new Path(bodyXf).M(0, body.y - ry).C(rx * k, body.y - ry, rx, body.y - ry * k, rx, body.y).C(rx, body.y + ry * k, rx * k, body.y + ry, 0, body.y + ry).C(-rx * k, body.y + ry, -rx, body.y + ry * k, -rx, body.y).C(-rx, body.y - ry * k, -rx * k, body.y - ry, 0, body.y - ry).Z().toString();
  const shadowPath = new Path((p) => add(bodyXf(p), vec(3, 3))).M(0, body.y - ry).C(rx * k, body.y - ry, rx, body.y - ry * k, rx, body.y).C(rx, body.y + ry * k, rx * k, body.y + ry, 0, body.y + ry).C(-rx * k, body.y + ry, -rx, body.y + ry * k, -rx, body.y).C(-rx, body.y - ry * k, -rx * k, body.y - ry, 0, body.y - ry).Z().toString();
  out.push(`<path d="${shadowPath}" fill="${fill(spec.colors.body)}" stroke="none"/><path d="${bodyPath}" fill="none" stroke-width="4"/>`);

  // Flügel (Vogel) bzw. gehobene Pfote beim Zeigen
  if (bird) {
    const wingBase = bodyXf(vec(-rx * 0.1, body.y - ry * 0.1));
    if (L.point) {
      const tip = w(vec(rx * 0.3 + 30, L.bodyY - 20));
      out.push(line(`M${fmt(wingBase.x)} ${fmt(wingBase.y)}L${fmt(tip.x)} ${fmt(tip.y)}`), `<circle cx="${fmt(tip.x)}" cy="${fmt(tip.y)}" r="3" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
    } else if (L.hop) {
      const tip = bodyXf(vec(-rx * 0.5, body.y - ry - 16));
      out.push(line(`M${fmt(wingBase.x)} ${fmt(wingBase.y)}Q${fmt(wingBase.x - 4 * f)} ${fmt(wingBase.y - 10)} ${fmt(tip.x)} ${fmt(tip.y)}`));
    } else {
      const tip = bodyXf(vec(-rx * 0.75, body.y + ry * 0.25));
      out.push(line(`M${fmt(wingBase.x)} ${fmt(wingBase.y)}Q${fmt(wingBase.x - 6 * f)} ${fmt(wingBase.y + 6)} ${fmt(tip.x)} ${fmt(tip.y)}`, 2.5));
    }
  } else if (L.point) {
    const a = bodyXf(vec(rx * 0.55, body.y + ry * 0.2));
    const b = w(vec(rx * 0.55 + 24, L.bodyY - 22));
    out.push(line(`M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}`), `<circle cx="${fmt(b.x)}" cy="${fmt(b.y)}" r="3.4" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
  }

  // Kopf
  const hr = spec.headR;
  const headLocal = bird ? vec(rx * 0.62, body.y - ry * 0.95) : vec(rx * 0.85, body.y - ry * 0.75 + L.headDrop);
  const hc = bodyXf(headLocal);
  const hxf = (p: Vec): Vec => add(hc, vec(rotate(p, L.headRot).x * f, rotate(p, L.headRot).y));
  if (!bird) {
    for (const dx of [-0.5, 0.45]) {
      const e = new Path(hxf).M(dx * hr - 4, -hr * 0.7).L(dx * hr + 1, -hr * 1.65).L(dx * hr + 7, -hr * 0.65).Z().toString();
      out.push(`<path d="${e}" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
    }
  }
  out.push(`<circle cx="${fmt(hc.x)}" cy="${fmt(hc.y)}" r="${fmt(hr)}" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
  if (bird) {
    const beak = new Path(hxf).M(hr * 0.85, -hr * 0.3).L(hr * 1.75, hr * 0.05).L(hr * 0.85, hr * 0.35).Z().toString();
    out.push(`<path d="${beak}" fill="${fill(spec.colors.accent)}" stroke-width="4"/>`);
    out.push(line(new Path(hxf).M(-1, -hr).L(-4, -hr - 7).M(3, -hr).L(5, -hr - 7).toString()));
  } else {
    out.push(`<circle cx="${fmt(hxf(vec(hr * 1.02, hr * 0.15)).x)}" cy="${fmt(hxf(vec(hr * 1.02, hr * 0.15)).y)}" r="2.2" fill="{{${spec.colors.accent}}}" stroke="none"/>`);
  }
  if (opts.eyes) {
    const er = Math.max(1.7, hr * 0.15);
    for (const [ex, ey] of [[0.12, -0.1], [0.62, -0.1]] as const) {
      const e = hxf(vec(hr * ex, hr * ey));
      out.push(`<circle cx="${fmt(e.x)}" cy="${fmt(e.y)}" r="${fmt(er)}" fill="{{ink}}" stroke="none"/>`);
    }
  }
  const svg = out.join('');
  return { svg: opts.line === undefined ? svg : svg.replaceAll('stroke-width="4"', `stroke-width="${opts.line}"`) };
}
