// Baukasten (M9b): Vorschau-Zeichnungen für Bausteine, damit man sie in der Palette ansehen kann (npm run kit:preview).
// Ein Baustein steht allein auf der Standlinie, auf dem Grund der Karte, in der größten Größe, die noch gut hineinpasst.

import { backdrop, baseY, frame } from './layouts.ts';
import { renderSceneSvg } from './scene.ts';
import { renderTemplate } from '../illustrations.ts';
import type { Catalog, LoadedBlock, Scene, TintName } from './types.ts';

// Größe der Vorschau: kleine Dinge groß (1,5 wie in der Mitte von „hero“), Figuren und Möbel in Normalgröße.
export function previewSize(block: LoadedBlock): number {
  const width = block.box.x1 - block.box.x0;
  return block.kind === 'object' || block.kind === 'nature' ? (width <= 100 && block.box.h <= 80 ? 1.5 : 1) : 1;
}

// Das SVG mit Farbplätzen. `tint` setzt einen anderen Ton als den Standardton.
export function previewBlockTemplate(block: LoadedBlock, tint?: TintName): string {
  const size = previewSize(block);
  const chosen = tint ?? block.defaultTint;
  const fill = (text: string) =>
    text
      .replace(/\{\{line\}\}/g, String(4 / size))
      .replace(/\{\{fine\}\}/g, String(2.5 / size))
      .replace(/\{\{shift\}\}/g, String(3 / size))
      .replace(/\{\{tint\}\}/g, chosen === undefined ? '{{paper}}' : `{{${chosen}}}`)
      .split('\n')
      .map((line) => line.trim())
      .join('');
  const style = 'stroke="{{ink}}" stroke-linecap="round" stroke-linejoin="round"';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.w * 3}" height="${frame.h * 3}" viewBox="0 0 ${frame.w} ${frame.h}">`,
    `<rect width="${frame.w}" height="${frame.h}" fill="{{ground}}"/>`,
    `<circle cx="${backdrop.cx}" cy="${backdrop.cy}" r="${backdrop.r}" fill="{{paper}}"/>`,
    `<path d="M56 ${baseY}H344" fill="none" stroke-width="4" ${style}/>`,
    `<g transform="translate(${frame.w / 2} ${baseY}) scale(${size})" ${style}>${fill(block.svg)}</g>`,
    '</svg>',
  ].join('\n');
}

export function previewBlockSvg(block: LoadedBlock, tint?: TintName): string {
  return renderTemplate(previewBlockTemplate(block, tint));
}

export function previewSceneSvg(scene: Scene, catalog: Catalog): string {
  return renderSceneSvg(scene, catalog);
}

// ---- Vorschauseite (docs/bausteine/VORSCHAU.md) ----

export type PreviewFile = { path: string; content: string };

export const previewDir = 'docs/bausteine';

const groupTitles: Record<string, string> = {
  figuren: 'Figuren',
  moebel: 'Möbel und Fläche',
  kueche: 'Küche',
  basteln: 'Basteln',
  experiment: 'Experiment',
  natur: 'Natur',
};

const hazardLabels: Record<string, string> = { sharp: 'scharf', heat: 'heiß', goggles: 'Schutzbrille', smallParts: 'Kleinteile', water: 'Wasser' };

function image(path: string, width: number, alt: string): string {
  return `<img src="${path}" width="${width}" alt="${alt}">`;
}

// Alle Dateien der Vorschau: je Baustein ein SVG (Standardton), je weiterem Ton ein SVG, je Beispielszene ein SVG, und die Seite VORSCHAU.md.
// `scenes`: Beispielszenen mit Namen (ohne Endung).
export function buildPreviewFiles(catalog: Catalog, scenes: ReadonlyMap<string, Scene>): PreviewFile[] {
  const files: PreviewFile[] = [];
  const lines: string[] = [];
  lines.push('# Baukasten: Vorschau aller Bausteine');
  lines.push('');
  lines.push('> **ERZEUGT** von `npm run kit:preview` aus `assets/bausteine/`. Nicht von Hand ändern. Regeln und Ablauf: [README.md](README.md).');
  lines.push('');
  lines.push(
    `Alle Bausteine in der Zeichnungs-Palette, so wie sie auf einer Karte aussehen (Format 2:1, ${frame.w} × ${frame.h} Einheiten). Die kleinen Bilder daneben zeigen sie in Daumennagelgröße (96 × 48 und 64 × 32): Dort muss man das Motiv an seinen großen Flächen erkennen.`,
  );
  lines.push('');

  if (scenes.size > 0) {
    lines.push('## Beispielszenen');
    lines.push('');
    lines.push('Szenen aus den Bausteinen, geprüft mit den Regeln (Layout, Plätze, Rand, Ecken, Überdeckung, bei Aktivitäten auch Sicherheit und Textabgleich). Sie zeigen, dass die Bausteine zusammenpassen; es sind keine endgültigen Titelbilder.');
    lines.push('');
    lines.push('| Szene | Karte | 96 × 48 | 64 × 32 |');
    lines.push('| --- | --- | --- | --- |');
    for (const [name, scene] of scenes) {
      const path = `vorschau/beispiele/${name}.svg`;
      files.push({ path: `${previewDir}/${path}`, content: renderSceneSvg(scene, catalog) });
      lines.push(`| \`${name}\` (${scene.layout}) | ${image(path, 312, name)} | ${image(path, 96, name)} | ${image(path, 64, name)} |`);
    }
    lines.push('');
  }

  const groups = [...new Set([...catalog.values()].map((block) => block.group))];
  for (const group of groups) {
    lines.push(`## ${groupTitles[group] ?? group}`);
    lines.push('');
    lines.push('| Baustein | Karte | 96 × 48 | 64 × 32 | Töne | Merkmale |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const block of [...catalog.values()].filter((entry) => entry.group === group)) {
      const path = `vorschau/${block.id}.svg`;
      files.push({ path: `${previewDir}/${path}`, content: previewBlockSvg(block) });
      const variants = (block.tints ?? []).filter((tint) => tint !== block.defaultTint);
      for (const tint of variants) files.push({ path: `${previewDir}/vorschau/${block.id}--${tint}.svg`, content: previewBlockSvg(block, tint) });
      const tintCell =
        (block.tints ?? []).length === 0
          ? 'fest'
          : [block.defaultTint as TintName, ...variants]
              .map((tint) => (tint === block.defaultTint ? `**${tint}**` : tint))
              .join(', ');
      const variantImages = variants.map((tint) => image(`vorschau/${block.id}--${tint}.svg`, 96, `${block.label.de} in ${tint}`)).join(' ');
      const hazards = block.hazards.map((hazard) => hazardLabels[hazard] ?? hazard).join(', ');
      lines.push(
        `| \`${block.id}\`<br>${block.label.de} / ${block.label.en}<br>Fläche ${block.box.x1 - block.box.x0} × ${block.box.h} | ${image(path, 312, block.label.de)} | ${image(path, 96, block.label.de)} | ${image(path, 64, block.label.de)} | ${tintCell}${variantImages === '' ? '' : `<br>${variantImages}`} | ${hazards === '' ? (block.neutral ? 'neutral' : '–') : hazards} |`,
      );
    }
    lines.push('');
  }
  files.push({ path: `${previewDir}/VORSCHAU.md`, content: `${lines.join('\n')}\n` });
  return files;
}
