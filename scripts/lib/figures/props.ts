// Figuren-Rig (M9b): einfache Gegenstände für die Figurenblätter (Tablett mit Inhalt, Teller, Tisch). Nur für die Vorschau der Figuren;
// die Gegenstände des Baukastens (assets/bausteine/) bekommen später dieselben Haltepunkte (`grip`).

import { fmt, type Vec } from './math.ts';

export type TrayContent = 'apples' | 'cookies' | 'none';

const circle = (c: Vec, r: number, tint: string, w = 4): string => `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" fill="{{${tint}}}" stroke-width="${w}"/>`;

// Ein Bratapfel: runde Frucht, Stiel (feine Linie), Rosé.
export function apple(c: Vec, r = 7): string {
  return `${circle(c, r, 'rose')}<path d="M${fmt(c.x)} ${fmt(c.y - r)}L${fmt(c.x + 1.5)} ${fmt(c.y - r - 4)}" fill="none" stroke-width="2.5"/>`;
}

function cookie(c: Vec, r = 6): string {
  return circle(c, r, 'honey');
}

// Tablett, Mitte der Oberkante bei `c`: schmale Oberfläche, vordere Kante, Inhalt darauf. Die Hände greifen an den Enden.
export function tray(c: Vec, w: number, content: TrayContent): string {
  const top = c.y;
  const hw = w / 2;
  const inset = 9;
  const surf = `<path d="M${fmt(c.x - hw + inset)} ${fmt(top - 7)}H${fmt(c.x + hw - inset)}L${fmt(c.x + hw)} ${fmt(top + 2)}H${fmt(c.x - hw)}Z" fill="{{honey}}" stroke-width="4"/>`;
  const lip = `<path d="M${fmt(c.x - hw)} ${fmt(top + 2)}H${fmt(c.x + hw)}V${fmt(top + 7)}H${fmt(c.x - hw)}Z" fill="{{paper}}" stroke-width="4"/>`;
  let items = '';
  const y = top - 7 - 6;
  if (content === 'apples') {
    for (const dx of [-0.3, 0, 0.3]) items += apple({ x: c.x + dx * hw, y }, 7);
  } else if (content === 'cookies') {
    for (const dx of [-0.32, -0.05, 0.22]) items += cookie({ x: c.x + dx * hw, y: y + 1 }, 6);
  }
  return `${surf}${lip}${items}`;
}

// Teller mit einem Apfel, Mitte der Tellerfläche bei `c`.
export function plate(c: Vec, r = 16, withApple = true): string {
  const disc = `<ellipse cx="${fmt(c.x)}" cy="${fmt(c.y)}" rx="${fmt(r)}" ry="${fmt(r * 0.3)}" fill="{{paper}}" stroke-width="4"/>`;
  return `${disc}${withApple ? apple({ x: c.x, y: c.y - 8 }, 7) : ''}`;
}

// Tisch: Platte mit zwei Beinen, Oberkante bei `topY`, Mitte `x`.
export function table(x: number, topY: number, w: number, legH: number): string {
  const hw = w / 2;
  const legs = `<path d="M${fmt(x - hw + 12)} ${fmt(topY + 8)}L${fmt(x - hw + 10)} ${fmt(topY + legH)}M${fmt(x + hw - 12)} ${fmt(topY + 8)}L${fmt(x + hw - 10)} ${fmt(topY + legH)}" fill="none" stroke-width="4"/>`;
  const slab = `<path d="M${fmt(x - hw)} ${fmt(topY)}H${fmt(x + hw)}V${fmt(topY + 8)}H${fmt(x - hw)}Z" fill="{{brown}}" stroke-width="4"/>`;
  return `${legs}${slab}`;
}
