// Baukasten (M9b, Schritt 3a): Bausteine zeichnen, auch gedreht, gespiegelt und mit Inhalt; Haltepunkte in Bildkoordinaten.
// Reine Funktionen, ohne Dateizugriff. Alle Maße in Einheiten der 400 × 200-Fläche.

import { add, rotate, vec, type Vec } from '../figures/math.ts';
import type { Box } from './geometry.ts';
import type { Catalog, GripName, LoadedBlock, TintName } from './types.ts';

// Maße der Linien in der fertigen Zeichnung (ILLUSTRATIONEN.md): 4 für Umrisse, 2,5 für Details, 3 Einheiten Versatz der Farbflächen.
export const lineWidth = 4;
export const fineWidth = 2.5;
export const shiftWidth = 3;

export function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// Setzt Maß- und Tonplätze eines Bausteins für eine Größe ein: Die sichtbare Linienstärke bleibt 4 bzw. 2,5, auch wenn der Baustein verkleinert wird.
export function fillBlock(block: LoadedBlock, size: number, tint: TintName | undefined): string {
  return block.svg
    .replace(/\{\{line\}\}/g, round(lineWidth / size))
    .replace(/\{\{fine\}\}/g, round(fineWidth / size))
    .replace(/\{\{shift\}\}/g, round(shiftWidth / size))
    .replace(/\{\{tint\}\}/g, tint === undefined ? '{{paper}}' : `{{${tint}}}`)
    .split('\n')
    .map((line) => line.trim())
    .join('');
}

const groupStyle = 'stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round"';

// Wo und wie ein Baustein liegt: Standpunkt (Ursprung des Bausteins), Größe, Spiegelung (Bild), Drehung im Uhrzeigersinn (Grad).
// `mirror` spiegelt nur den Baustein (vor der Drehung), `flip` das ganze Bild an der Senkrechten durch `x` (Figuren auf der rechten Seite).
export type Pose2D = { x: number; y: number; size: number; flip: boolean; rot: number; mirror: boolean };

// Ein Punkt des Bausteins (in seinen Koordinaten, Größe 1) in Bildkoordinaten.
export function toWorld(p: Vec, at: Pose2D): Vec {
  const local = rotate(vec((at.mirror ? -p.x : p.x) * at.size, p.y * at.size), at.rot);
  return vec(at.x + (at.flip ? -local.x : local.x), at.y + local.y);
}

export function gripOf(block: LoadedBlock, name: GripName): Vec | undefined {
  const grip = block.grips?.[name];
  return grip === undefined ? undefined : vec(grip[0], grip[1]);
}

// Der Rahmen eines Bausteins in Bildkoordinaten (die Ecken seiner Fläche gedreht, mit halber Linie).
export function boxOf(block: LoadedBlock, at: Pose2D): Box {
  const { x0, x1, h } = block.box;
  const corners = [vec(x0, -h), vec(x1, -h), vec(x1, 0), vec(x0, 0)].map((p) => toWorld(p, at));
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// SVG wendet die Liste von rechts an: erst spiegeln und vergrößern, dann drehen, dann verschieben. Das Spiegeln des Bildes (`flip`)
// vor der Drehung entspricht einer Drehung in die Gegenrichtung (F·R(r) = R(−r)·F), so stimmt die Zeichnung mit `toWorld` überein.
function transform(at: Pose2D): string {
  const sx = (at.flip ? -1 : 1) * (at.mirror ? -1 : 1) * at.size;
  const parts = [`translate(${round(at.x)} ${round(at.y)})`];
  if (at.rot !== 0) parts.push(`rotate(${round(at.flip ? -at.rot : at.rot)})`);
  parts.push(`scale(${round(sx)} ${round(at.size)})`);
  return parts.join(' ');
}

// ---- Inhalte ----

// Wie viele Stücke in einer Reihe Platz haben (höchstens 3).
function countFor(width: number, item: LoadedBlock): number {
  const w = item.box.x1 - item.box.x0;
  return Math.max(1, Math.min(3, Math.floor((width + 4) / (w + 3))));
}

function itemAt(item: LoadedBlock, x: number, y: number, size: number): string {
  return `<g transform="translate(${round(x)} ${round(y)})">${fillBlock(item, size, item.defaultTint)}</g>`;
}

// Dampf über einem heißen Inhalt: drei geschwungene feine Linien (ohne Zahlen, ohne Pfeile).
function steam(cx: number, top: number, size: number): string {
  const w = round(fineWidth / size);
  const d = [-10, 0, 10]
    .map((dx) => `M${round(cx + dx)} ${round(top)}C${round(cx + dx - 4)} ${round(top - 3)} ${round(cx + dx + 4)} ${round(top - 6)} ${round(cx + dx)} ${round(top - 10)}`)
    .join('');
  return `<path d="${d}" fill="none" stroke-width="${w}"/>`;
}

// Der Inhalt eines Behälters in dessen Koordinaten (wird in seine Gruppe gesetzt). `size` ist die Größe des Behälters (für die Linienstärke).
export function contentSvg(container: LoadedBlock, content: LoadedBlock, size: number, hot: boolean): { svg: string; top: number } {
  const spec = container.container;
  if (spec === undefined) return { svg: '', top: 0 };
  const h = content.box.h;
  const parts: string[] = [];
  let cx = 0;
  let top = 0;
  if (spec.kind === 'flat') {
    const n = countFor(spec.x1 - spec.x0, content);
    const step = (spec.x1 - spec.x0) / n;
    for (let i = 0; i < n; i += 1) parts.push(itemAt(content, spec.x0 + step * (i + 0.5), spec.y, size));
    cx = (spec.x0 + spec.x1) / 2;
    top = spec.y - h;
  } else if (content.fill === true) {
    // Fläche für eine Öffnung mit rx = 28 gezeichnet, auf die Öffnung dieses Behälters gebracht
    const k = spec.rx / 28;
    parts.push(`<g transform="translate(${round(spec.cx)} ${round(spec.cy)}) scale(${round(k)})">${fillBlock(content, size * k, content.defaultTint)}</g>`);
    cx = spec.cx;
    top = spec.cy - content.box.h * k;
  } else {
    // kleiner Haufen: hinten eins in der Mitte, vorn eine Reihe
    const n = countFor(spec.rx * 1.6, content);
    const base = spec.cy + spec.ry * 0.35;
    if (n >= 2) parts.push(itemAt(content, spec.cx, base - h * 0.55, size));
    const step = (spec.rx * 1.6) / n;
    for (let i = 0; i < n; i += 1) parts.push(itemAt(content, spec.cx - spec.rx * 0.8 + step * (i + 0.5), base, size));
    cx = spec.cx;
    top = base - h * (n >= 2 ? 1.55 : 1);
  }
  if (hot) parts.push(steam(cx, top - 4, size));
  return { svg: parts.join(''), top: hot ? top - 15 : top };
}

// Ein Baustein an seinem Ort, mit Inhalt (in derselben Gruppe, damit er mitgedreht wird). Gibt das SVG und den Rahmen zurück.
export function drawBlock(
  block: LoadedBlock,
  at: Pose2D,
  options: { tint?: TintName; content?: LoadedBlock; hot?: boolean } = {},
): { svg: string; box: Box } {
  const tint = options.tint ?? block.defaultTint;
  const inner = options.content === undefined ? { svg: '', top: 0 } : contentSvg(block, options.content, at.size, options.hot === true);
  // Heiß ohne Inhalt (z. B. ein leeres Backblech): Dampf über der Mitte
  const extra = options.hot === true && options.content === undefined ? steam(0, -block.box.h - 4, at.size) : '';
  const box = boxOf(block, at);
  if (options.content !== undefined || extra !== '') {
    const top = options.content === undefined ? -block.box.h - 15 : Math.min(inner.top, -block.box.h);
    const contentBox = boxOf({ ...block, box: { ...block.box, h: -top } }, at);
    box.minY = Math.min(box.minY, contentBox.minY);
    box.maxY = Math.max(box.maxY, contentBox.maxY);
    box.minX = Math.min(box.minX, contentBox.minX);
    box.maxX = Math.max(box.maxX, contentBox.maxX);
  }
  return { svg: `<g transform="${transform(at)}" ${groupStyle}>${fillBlock(block, at.size, tint)}${inner.svg}${extra}</g>`, box };
}

// Ein Inhalt lose auf dem Tisch (`loose`): drei kleine oder zwei große Stücke nebeneinander, Ursprung in der Mitte der Reihe auf der Tischplatte.
export function drawLoose(content: LoadedBlock, at: Pose2D): { svg: string; box: Box } {
  const w = content.box.x1 - content.box.x0;
  const step = w + 3;
  const offsets = w > 30 ? [-0.5, 0.5] : [-1, 0, 1];
  const items = offsets.map((i) => itemAt(content, i * step, 0, at.size)).join('');
  const reach = offsets[offsets.length - 1] * step;
  const box = boxOf({ ...content, box: { x0: -reach + content.box.x0, x1: reach + content.box.x1, h: content.box.h } }, at);
  return { svg: `<g transform="${transform(at)}" ${groupStyle}>${items}</g>`, box };
}

// Gibt den Inhalt zu einer ID zurück, wenn er in diesen Behälter passt; sonst eine Fehlermeldung.
export function contentFor(catalog: Catalog, container: LoadedBlock, id: string): LoadedBlock | string {
  const content = catalog.get(id);
  if (content === undefined || content.kind !== 'content') return `Inhalt „${id}“ gibt es nicht.`;
  if (container.container === undefined) return `„${container.id}“ ist kein Behälter, „${id}“ passt nicht hinein.`;
  if (!(content.fits ?? []).includes(container.id)) return `„${id}“ passt nicht in „${container.id}“ (passt in: ${(content.fits ?? []).join(', ')}).`;
  if (content.fill === true && container.container.kind !== 'deep') return `„${id}“ (Fläche) braucht einen tiefen Behälter.`;
  return content;
}

export const unionBox = (a: Box, b: Box): Box => ({
  minX: Math.min(a.minX, b.minX),
  maxX: Math.max(a.maxX, b.maxX),
  minY: Math.min(a.minY, b.minY),
  maxY: Math.max(a.maxY, b.maxY),
});

export { add, vec };
