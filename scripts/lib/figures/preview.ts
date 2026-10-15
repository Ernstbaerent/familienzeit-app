// Figuren-Rig (M9b): Vorschauseite der drei Figurensätze (docs/design/figuren/VORSCHAU.md) und die Rig-Daten als JSON.
// Erzeugt alle Dateien als Text; geschrieben wird in scripts/figures-preview.ts. Reine Funktionen.

import { poseNames, poseOf } from './poses.ts';
import { petPoseNames } from './pets.ts';
import { groupShot, humanSheet, petSheet, triptych } from './scenes.ts';
import type { FigureSet } from './sets.ts';

export type PreviewFile = { path: string; content: string };

export const figuresDir = 'docs/design/figuren';
export const sizeLimit = 10 * 1024; // Obergrenze für Titelbilder (docs/design/ILLUSTRATIONEN.md)
export const sizeLimitSteps = 14 * 1024; // für Schrittbilder, wenn die Messung es verlangt (Clemens, 2026-10-15)

const faces = [
  { id: 'ohne', title: 'ohne Gesichtszüge', eyes: false },
  { id: 'augen', title: 'mit Augenpunkten', eyes: true },
] as const;

const bytes = (text: string): number => Buffer.byteLength(text);
const kb = (n: number): string => `${(n / 1024).toFixed(1).replace('.', ',')} KB`;

function img(path: string, width: number, alt: string): string {
  return `<img src="${path}" width="${width}" alt="${alt}">`;
}

// Die Rig-Daten eines Satzes als JSON-fähiges Objekt: Maße, Besonderheiten und alle benannten Posen (aufgelöst für diese Maße).
export function rigData(sets: readonly FigureSet[]): unknown {
  return {
    hinweis: 'ERZEUGT von npm run figures:preview. Maße in Einheiten der 400 × 200-Fläche, y nach unten, Standlinie = 0, Posen als Winkel (Grad) oder Zielpunkte für die Hände.',
    sets: sets.map((set) => ({
      id: set.id,
      title: set.title,
      humans: set.humans.map((h) => ({
        spec: h.spec,
        quirk: h.quirk ?? null,
        poses: Object.fromEntries(poseNames.map((name) => [name, poseOf(h.spec, name, h.quirk)])),
      })),
      pet: { spec: set.pet.spec, poses: [...petPoseNames] },
    })),
  };
}

// Alle Dateien: je Satz und Fassung die Blätter, das Gruppenbild und das Triptychon als SVG, dazu VORSCHAU.md und rig-daten.json.
export function buildFigurePreview(sets: readonly FigureSet[], names: ReadonlyMap<string, string>): PreviewFile[] {
  const files: PreviewFile[] = [];
  const md: string[] = [];
  const sizes: { path: string; size: number; kind: 'sheet' | 'scene' }[] = [];
  const add = (path: string, content: string, kind: 'sheet' | 'scene'): string => {
    files.push({ path: `${figuresDir}/${path}`, content });
    sizes.push({ path, size: bytes(content), kind });
    return path;
  };

  md.push('# Figuren: drei Sätze zur Auswahl (Entwurf)');
  md.push('');
  md.push('> **ERZEUGT** von `npm run figures:preview` aus `scripts/lib/figures/`. Nicht von Hand ändern. Hintergrund, Regeln und offene Entscheidungen: [`docs/design/FIGUREN.md`](../FIGUREN.md).');
  md.push('');
  md.push(
    'Drei Figurensätze mit deutlich anderer Anmutung, je ein größeres Kind, ein kleineres Kind, ein Erwachsener und ein Haustier. Jeder Satz in **zwei Fassungen aus demselben Rig**: ohne Gesichtszüge (wie bisher) und mit zwei Punkten als Augen (sonst nichts).',
  );
  md.push('Karten sind 2:1 (Kartengröße 312 px breit gezeigt), daneben die Daumennägel 96 × 48 und 64 × 32. **Prüfung für ein Maskottchen:** Kannst du dir Name und Figur auf einem T-Shirt oder in einem 5-Sekunden-Clip vorstellen?');
  md.push('');

  // Überblick: alle drei Gruppenbilder untereinander
  md.push('## Überblick');
  md.push('');
  md.push('| Satz | ohne Gesichtszüge | mit Augenpunkten |');
  md.push('| --- | --- | --- |');
  for (const set of sets) {
    const cells = faces.map((face) => img(add(`vorschau/${set.id}-${face.id}-gruppe.svg`, groupShot(set, face.eyes), 'scene'), 312, `${set.title}, ${face.title}`));
    md.push(`| **${set.title}** | ${cells[0]} | ${cells[1]} |`);
  }
  md.push('');

  for (const set of sets) {
    md.push(`## ${set.title}`);
    md.push('');
    md.push(set.feel);
    md.push('');
    md.push('| Name | Rolle | Beschreibung | Namenscheck (Kinderfiguren, Websuche) |');
    md.push('| --- | --- | --- | --- |');
    const roleLabel = { adult: 'Erwachsener', child: 'größeres Kind', toddler: 'kleineres Kind' } as const;
    for (const h of set.humans) md.push(`| **${h.spec.name}** | ${roleLabel[h.spec.role]} | ${h.blurb} | ${names.get(h.spec.name) ?? '–'} |`);
    md.push(`| **${set.pet.spec.name}** | Haustier | ${set.pet.blurb} | ${names.get(set.pet.spec.name) ?? '–'} |`);
    md.push('');

    md.push('### Figurenblätter: stehen, hält etwas, trägt Tablett, jubelt');
    md.push('');
    md.push('Von links nach rechts: stehen, hält einen Teller mit Apfel, trägt ein Tablett (der Erwachsene mit Ofenhandschuhen und Äpfeln, die Kinder mit Keksen), jubelt (Haustier: steht, läuft, hüpft, schnuppert). Menschen von vorn, Haustier von der Seite.');
    md.push('');
    md.push('| Figur | Karte | 96 × 48 | 64 × 32 |');
    md.push('| --- | --- | --- | --- |');
    for (const face of faces) {
      for (const h of set.humans) {
        const p = add(`vorschau/${set.id}-${face.id}-${h.spec.id}.svg`, humanSheet(h, face.eyes), 'sheet');
        md.push(`| ${h.spec.name} (${face.id === 'ohne' ? 'ohne' : 'mit Augen'}) | ${img(p, 312, h.spec.name)} | ${img(p, 96, h.spec.name)} | ${img(p, 64, h.spec.name)} |`);
      }
      const p = add(`vorschau/${set.id}-${face.id}-${set.pet.spec.id}.svg`, petSheet(set.pet, face.eyes), 'sheet');
      md.push(`| ${set.pet.spec.name} (${face.id === 'ohne' ? 'ohne' : 'mit Augen'}) | ${img(p, 312, set.pet.spec.name)} | ${img(p, 96, set.pet.spec.name)} | ${img(p, 64, set.pet.spec.name)} |`);
    }
    md.push('');

    md.push('### Triptychon: läuft herein, nimmt das Tablett, alle jubeln');
    md.push('');
    for (const face of faces) {
      const panels = triptych(set, face.eyes);
      const paths = panels.map((panel, i) => add(`vorschau/${set.id}-${face.id}-tri${i + 1}.svg`, panel.svg, 'scene'));
      md.push(`**${face.title}**`);
      md.push('');
      md.push('| 1. läuft herein | 2. nimmt das Tablett | 3. jubeln |');
      md.push('| --- | --- | --- |');
      md.push(`| ${paths.map((p) => img(p, 300, 'Triptychon')).join(' | ')} |`);
      md.push(`| ${paths.map((p) => `${img(p, 96, 'Triptychon')} ${img(p, 64, 'Triptychon')}`).join(' | ')} |`);
      md.push('');
    }
  }

  // Dateigrößen
  md.push('## Dateigrößen (gemessen)');
  md.push('');
  const worstScene = Math.max(...sizes.filter((s) => s.kind === 'scene').map((s) => s.size));
  const worstSheet = Math.max(...sizes.filter((s) => s.kind === 'sheet').map((s) => s.size));
  md.push(`**Szenenbilder** (Gruppenbild, Triptychon) bleiben unter ${sizeLimit / 1024} KB, der Grenze für Titelbilder (die 14 KB für Schrittbilder werden nicht gebraucht): das größte ist ${kb(worstScene)}. Ein **Figurenblatt** zeigt vier Posen einer Figur in einem Bild und ist deshalb größer (das größte ${kb(worstSheet)}); es ist kein Titelbild.`);
  md.push('');
  md.push('| Datei | Größe | Art |');
  md.push('| --- | --- | --- |');
  for (const s of sizes) md.push(`| \`${s.path}\` | ${kb(s.size)} | ${s.kind === 'sheet' ? 'Figurenblatt' : 'Szene'} |`);
  md.push('');

  files.push({ path: `${figuresDir}/VORSCHAU.md`, content: `${md.join('\n')}\n` });
  files.push({ path: `${figuresDir}/rig-daten.json`, content: `${JSON.stringify(rigData(sets), null, 1)}\n` });
  return files;
}

