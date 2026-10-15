// Figuren-Rig (M9b): Haustiere aus getrennten Teilen (Körper, Kopf, Ohren, Beine, Schwanz), von der Seite gesehen, Blick nach rechts.
// Wie die Menschen: Maße, Posen als Daten, Augen als zwei Punkte (freiwillig).

import { add, capsule, fmt, Path, rotate, vec, type Vec } from './math.ts';
import type { Tint } from './rig.ts';

export type PetSpec = {
  id: string;
  name: string;
  kind: 'chick' | 'dog' | 'cat';
  bodyRx: number;
  bodyRy: number;
  headR: number;
  legLen: number;
  legW: number; // halbe Dicke der Beine, 0 = Linie
  tailLen: number;
  colors: { body: Tint; patch?: Tint; accent: Tint };
};

export type PetPoseName = 'stand' | 'walk' | 'jump' | 'sniff';
export const petPoseNames: readonly PetPoseName[] = ['stand', 'walk', 'jump', 'sniff'];
export const petPoseLabels: Record<PetPoseName, { de: string; en: string }> = {
  stand: { de: 'steht', en: 'standing' },
  walk: { de: 'läuft', en: 'walking' },
  jump: { de: 'hüpft', en: 'jumping' },
  sniff: { de: 'schnuppert', en: 'sniffing' },
};

const fill = (t: Tint): string => `{{${t}}}`;

export function petHeight(s: PetSpec): number {
  return s.legLen + 2 * s.bodyRy + s.headR * 0.6;
}

export function buildPet(spec: PetSpec, pose: PetPoseName, opts: { x: number; y: number; eyes?: boolean; flip?: boolean }): { svg: string } {
  const f = opts.flip ? -1 : 1;
  const dy = pose === 'jump' ? -14 : 0;
  const w = (p: Vec): Vec => vec(opts.x + p.x * f, opts.y + dy + p.y);
  const body = vec(0, -(spec.legLen + spec.bodyRy * 0.9));
  const tilt = pose === 'jump' ? -10 : pose === 'sniff' ? 8 : 0;
  const bodyXf = (p: Vec): Vec => w(rotate(p, tilt, body));
  const out: string[] = [];

  // Beine: vorn und hinten je zwei (nah/fern)
  const legs: { x: number; lift: number; spread: number }[] = [];
  const front = spec.bodyRx * 0.55;
  const back = -spec.bodyRx * 0.55;
  if (spec.kind === 'chick') {
    legs.push({ x: -spec.bodyRx * 0.18, lift: 0, spread: 0 }, { x: spec.bodyRx * 0.2, lift: pose === 'walk' ? 6 : 0, spread: 0 });
  } else {
    legs.push(
      { x: back - 4, lift: pose === 'walk' ? 7 : 0, spread: pose === 'jump' ? -16 : 0 },
      { x: back + 6, lift: 0, spread: pose === 'jump' ? -12 : pose === 'walk' ? -4 : 0 },
      { x: front - 6, lift: 0, spread: pose === 'jump' ? 14 : pose === 'walk' ? 4 : 0 },
      { x: front + 4, lift: pose === 'walk' ? 7 : 0, spread: pose === 'jump' ? 18 : 0 },
    );
  }
  const hipY = body.y + spec.bodyRy * 0.55;
  for (const leg of legs) {
    const a = bodyXf(vec(leg.x, hipY));
    const b = w(vec(leg.x + leg.spread, -leg.lift * (pose === 'jump' ? 0 : 1) + (pose === 'jump' ? -spec.legLen * 0.05 : 0)));
    const foot = spec.kind === 'chick' ? `<path d="M${fmt(b.x - 5 * f)} ${fmt(b.y)}H${fmt(b.x + 6 * f)}" fill="none" stroke-width="4"/>` : '';
    if (spec.legW > 0) out.push(`<path d="${capsule(a, b, spec.legW, 0.5)}" fill="${fill(spec.colors.patch ?? spec.colors.body)}" stroke-width="4"/>`);
    else out.push(`<path d="M${fmt(a.x)} ${fmt(a.y)}L${fmt(b.x)} ${fmt(b.y)}" fill="none" stroke-width="4"/>`);
    out.push(foot);
  }

  // Schwanz
  const t = spec.tailLen;
  if (spec.kind === 'cat') {
    const tailP = new Path(bodyXf).M(-spec.bodyRx * 0.9, body.y).C(-spec.bodyRx - t * 0.6, body.y + 4, -spec.bodyRx - t, body.y - t * 0.8, -spec.bodyRx - t * 0.45, body.y - t * 1.15).toString();
    out.push(`<path d="${tailP}" fill="none" stroke-width="4"/>`);
  } else if (spec.kind === 'dog') {
    const tailP = new Path(bodyXf).M(-spec.bodyRx * 0.92, body.y - 3).L(-spec.bodyRx - t, body.y - t * 0.9).toString();
    out.push(`<path d="${tailP}" fill="none" stroke-width="4"/>`);
  } else {
    const tailP = new Path(bodyXf).M(-spec.bodyRx * 0.85, body.y - 2).L(-spec.bodyRx - t, body.y - t * 0.6).M(-spec.bodyRx * 0.8, body.y + 2).L(-spec.bodyRx - t * 0.8, body.y + 1).toString();
    out.push(`<path d="${tailP}" fill="none" stroke-width="4"/>`);
  }

  // Körper mit Schatten
  const bodyShape = (xf: (p: Vec) => Vec): string => {
    const p = new Path(xf);
    const rx = spec.bodyRx;
    const ry = spec.bodyRy;
    if (spec.kind === 'dog') {
      const r = Math.min(9, ry * 0.7);
      p.M(-rx + r, body.y - ry).L(rx - r, body.y - ry).Q(rx, body.y - ry, rx, body.y - ry + r).L(rx, body.y + ry - r).Q(rx, body.y + ry, rx - r, body.y + ry).L(-rx + r, body.y + ry).Q(-rx, body.y + ry, -rx, body.y + ry - r).L(-rx, body.y - ry + r).Q(-rx, body.y - ry, -rx + r, body.y - ry).Z();
    } else {
      const k = 0.5523;
      p.M(0, body.y - ry).C(rx * k, body.y - ry, rx, body.y - ry * k, rx, body.y).C(rx, body.y + ry * k, rx * k, body.y + ry, 0, body.y + ry).C(-rx * k, body.y + ry, -rx, body.y + ry * k, -rx, body.y).C(-rx, body.y - ry * k, -rx * k, body.y - ry, 0, body.y - ry).Z();
    }
    return p.toString();
  };
  out.push(`<path d="${bodyShape((p) => add(bodyXf(p), vec(3, 3)))}" fill="${fill(spec.colors.body)}" stroke="none"/><path d="${bodyShape(bodyXf)}" fill="none" stroke-width="4"/>`);
  if (spec.colors.patch && spec.kind === 'dog') {
    const r = spec.bodyRy * 0.55;
    const c = bodyXf(vec(-spec.bodyRx * 0.2, body.y - spec.bodyRy * 0.15));
    out.push(`<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" fill="${fill(spec.colors.patch)}" stroke-width="4"/>`);
  }
  if (spec.kind === 'chick') {
    const wing = bodyXf(vec(-spec.bodyRx * 0.15, body.y + spec.bodyRy * 0.1));
    out.push(`<ellipse cx="${fmt(wing.x)}" cy="${fmt(wing.y)}" rx="${fmt(spec.bodyRx * 0.5)}" ry="${fmt(spec.bodyRy * 0.38)}" fill="${fill('paper')}" stroke-width="4"/>`);
  }

  // Kopf
  const headDrop = pose === 'sniff' ? spec.headR * 0.9 : 0;
  const headLocal = vec(spec.bodyRx * (spec.kind === 'chick' ? 0.55 : 0.82), body.y - spec.bodyRy * (spec.kind === 'chick' ? 0.8 : 0.7) + headDrop);
  const hc = bodyXf(headLocal);
  const hxf = (p: Vec): Vec => add(hc, vec(p.x * f, p.y));
  // Ohren
  if (spec.kind === 'cat') {
    for (const dx of [-0.5, 0.45]) {
      const e = new Path(hxf).M(dx * spec.headR - 4, -spec.headR * 0.7).L(dx * spec.headR + 1, -spec.headR * 1.6).L(dx * spec.headR + 7, -spec.headR * 0.65).Z().toString();
      out.push(`<path d="${e}" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
    }
  } else if (spec.kind === 'dog') {
    const e = new Path(hxf).M(-spec.headR * 0.55, -spec.headR * 0.7).Q(-spec.headR * 1.35, -spec.headR * 0.2, -spec.headR * 1.1, spec.headR * 0.9).Q(-spec.headR * 0.5, spec.headR * 0.8, -spec.headR * 0.2, -spec.headR * 0.5).Z().toString();
    out.push(`<path d="${e}" fill="${fill(spec.colors.patch ?? spec.colors.accent)}" stroke-width="4"/>`);
  }
  if (spec.kind === 'dog') {
    const r = spec.headR * 0.4;
    const hr = spec.headR;
    const head = new Path(hxf).M(-hr + 4, -hr).L(hr - 4, -hr).Q(hr, -hr, hr, -hr + 4).L(hr, hr - 4).Q(hr, hr, hr - 4, hr).L(-hr + 4, hr).Q(-hr, hr, -hr, hr - 4).L(-hr, -hr + 4).Q(-hr, -hr, -hr + 4, -hr).Z().toString();
    out.push(`<path d="${head}" fill="${fill(spec.colors.body)}" stroke-width="4"/>`);
    const nose = hxf(vec(hr * 1.05, -r * 0.1));
    out.push(`<circle cx="${fmt(nose.x)}" cy="${fmt(nose.y)}" r="${fmt(Math.max(2.6, r * 0.4))}" fill="{{ink}}" stroke="none"/>`);
  } else {
    out.push(`<circle cx="${fmt(hc.x)}" cy="${fmt(hc.y)}" r="${fmt(spec.headR)}" fill="${fill(spec.kind === 'chick' ? spec.colors.body : spec.colors.body)}" stroke-width="4"/>`);
  }
  if (spec.kind === 'chick') {
    const beak = new Path(hxf).M(spec.headR * 0.85, -spec.headR * 0.25).L(spec.headR * 1.6, spec.headR * 0.05).L(spec.headR * 0.85, spec.headR * 0.35).Z().toString();
    out.push(`<path d="${beak}" fill="${fill('honey')}" stroke-width="4"/>`);
    const tuft = new Path(hxf).M(-2, -spec.headR).L(-5, -spec.headR - 7).M(2, -spec.headR).L(4, -spec.headR - 8).toString();
    out.push(`<path d="${tuft}" fill="none" stroke-width="4"/>`);
  }
  if (opts.eyes) {
    const er = Math.max(1.7, spec.headR * 0.15);
    for (const [ex, ey] of [[0.12, -0.1], [0.62, -0.1]] as const) {
      const e = hxf(vec(spec.headR * ex, spec.headR * ey));
      out.push(`<circle cx="${fmt(e.x)}" cy="${fmt(e.y)}" r="${fmt(er)}" fill="{{ink}}" stroke="none"/>`);
    }
  }
  return { svg: out.join('') };
}
