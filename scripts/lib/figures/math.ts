// Figuren-Rig (M9b): Vektorrechnung, Pfade und der Arm mit zwei Gliedern (docs/design/FIGUREN.md).
// Reine Funktionen, ohne Dateizugriff. Koordinaten wie im Baukasten: y nach unten, die Standlinie liegt bei y = 0 der Figur, oben ist negativ.

export type Vec = { x: number; y: number };

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const length = (a: Vec): number => Math.hypot(a.x, a.y);
export const rad = (deg: number): number => (deg * Math.PI) / 180;

// Dreht `p` um `deg` Grad (im Uhrzeigersinn auf dem Bildschirm, weil y nach unten zeigt) um `around`.
export function rotate(p: Vec, deg: number, around: Vec = vec(0, 0)): Vec {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  const d = sub(p, around);
  return { x: around.x + d.x * c - d.y * s, y: around.y + d.x * s + d.y * c };
}

// Zahl mit höchstens einer Nachkommastelle, ohne unnötige „.0“ (hält die Dateien klein).
export function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
}

export type Transform = (p: Vec) => Vec;

// Baut einen Pfad aus lokalen Punkten; jeder Punkt geht durch `xf` (Drehung und Verschiebung der Figur). Nur absolute Befehle.
export class Path {
  private parts: string[] = [];
  private readonly xf: Transform;
  constructor(xf: Transform = (p) => p) {
    this.xf = xf;
  }
  private pt(x: number, y: number): string {
    const p = this.xf(vec(x, y));
    return `${fmt(p.x)} ${fmt(p.y)}`;
  }
  M(x: number, y: number): this {
    this.parts.push(`M${this.pt(x, y)}`);
    return this;
  }
  L(x: number, y: number): this {
    this.parts.push(`L${this.pt(x, y)}`);
    return this;
  }
  Q(cx: number, cy: number, x: number, y: number): this {
    this.parts.push(`Q${this.pt(cx, cy)} ${this.pt(x, y)}`);
    return this;
  }
  C(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    this.parts.push(`C${this.pt(c1x, c1y)} ${this.pt(c2x, c2y)} ${this.pt(x, y)}`);
    return this;
  }
  Z(): this {
    this.parts.push('Z');
    return this;
  }
  toString(): string {
    return this.parts.join('');
  }
}

// Kapsel (Glied mit runden Enden) von a nach b mit Radius r, als Pfad in Weltkoordinaten. Die Kappen sind je eine kubische Kurve.
export function capsule(a: Vec, b: Vec, r: number, corner = 1): string {
  const d = sub(b, a);
  const l = length(d) || 1;
  const u = scale(d, 1 / l);
  const n = vec(-u.y, u.x);
  const k = (4 / 3) * r * corner;
  const a1 = add(a, scale(n, r));
  const a2 = add(b, scale(n, r));
  const b2 = sub(b, scale(n, r));
  const b1 = sub(a, scale(n, r));
  const q = (p: Vec) => `${fmt(p.x)} ${fmt(p.y)}`;
  const e1 = add(a2, scale(u, k));
  const e2 = add(b2, scale(u, k));
  const f1 = sub(b1, scale(u, k));
  const f2 = sub(a1, scale(u, k));
  return `M${q(a1)}L${q(a2)}C${q(e1)} ${q(e2)} ${q(b2)}L${q(b1)}C${q(f1)} ${q(f2)} ${q(a1)}Z`;
}

export type ElbowSide = 'down' | 'out' | 'up';

// Arm mit zwei Gliedern: Schulter `s`, Ziel `t` für die Hand, Längen u (Oberarm) und f (Unterarm).
// Liefert Ellbogen und Hand. Ist das Ziel zu weit weg, streckt sich der Arm in Richtung Ziel (die Hand erreicht es dann nicht ganz).
// `side` ist +1 für den Arm rechts im Bild, −1 für den linken; `elbow` sagt, wohin der Ellbogen zeigt.
export function solveArm(s: Vec, t: Vec, u: number, f: number, side: 1 | -1, elbow: ElbowSide): { elbow: Vec; hand: Vec } {
  const to = sub(t, s);
  const dist = length(to);
  const reach = u + f - 0.01;
  const min = Math.abs(u - f) + 0.01;
  const d = Math.min(Math.max(dist, min), reach);
  const dir = dist === 0 ? vec(0, 1) : scale(to, 1 / dist);
  const base = Math.atan2(dir.y, dir.x);
  const cosA = (u * u + d * d - f * f) / (2 * u * d);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const candidates = [base + alpha, base - alpha].map((angle) => add(s, vec(Math.cos(angle) * u, Math.sin(angle) * u)));
  const score = (e: Vec) => (elbow === 'down' ? e.y : elbow === 'up' ? -e.y : e.x * side);
  const e = score(candidates[0]) >= score(candidates[1]) ? candidates[0] : candidates[1];
  const hand = add(s, scale(dir, d));
  return { elbow: e, hand };
}

// Zwei Glieder aus Winkeln: Winkel `a` des ersten Gliedes von „gerade nach unten“, nach außen positiv (side bestimmt, was außen ist),
// `b` ist die Beugung des zweiten Gliedes nach innen (positiv = zum Körper hin bzw. nach oben).
export function fromAngles(s: Vec, a: number, b: number, l1: number, l2: number, side: 1 | -1): { mid: Vec; end: Vec } {
  const d1 = vec(side * Math.sin(rad(a)), Math.cos(rad(a)));
  const a2 = a - b;
  const d2 = vec(side * Math.sin(rad(a2)), Math.cos(rad(a2)));
  const mid = add(s, scale(d1, l1));
  return { mid, end: add(mid, scale(d2, l2)) };
}
