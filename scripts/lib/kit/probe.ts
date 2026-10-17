// Baukasten (M9b, Schritt 3b): die fünf Probebilder von Hand (assets/bausteine/probe/) und ihre Vorschauseite (docs/bausteine/PROBE.md).
// Jede Szene nennt ihre Aktivität und eine ehrliche Bewertung (was trägt, was fehlt, was ein Mensch noch prüfen muss).
// Aktivitäten, die nicht in data/ stehen (KI-Aktivitäten aus der Datenbank), liegen als Text in assets/bausteine/probe/aktivitaeten.json.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { kitDir } from './catalog.ts';
import { checkScene, contextFromActivity, renderSceneSvg } from './scene.ts';
import type { Catalog, Scene } from './types.ts';

export type ProbeActivity = {
  id: string;
  ageMin: number;
  ageMax: number;
  materials: string[];
  translations: Record<string, { title: string; summary: string; steps: string[]; safetyNote?: string }>;
};

export type Review = { carries: string[]; missing: string[]; check: string[] };
export type ProbeScene = Scene & { activity: string; review: Review };

export const probeDir = 'docs/bausteine';

export function loadProbe(root: string): { scenes: Map<string, ProbeScene>; extra: ProbeActivity[] } {
  const dir = join(root, kitDir, 'probe');
  const scenes = new Map<string, ProbeScene>();
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.scene.json')).sort()) {
    scenes.set(file.replace('.scene.json', ''), JSON.parse(readFileSync(join(dir, file), 'utf8')) as ProbeScene);
  }
  const extra = (JSON.parse(readFileSync(join(dir, 'aktivitaeten.json'), 'utf8')) as { activities: ProbeActivity[] }).activities;
  return { scenes, extra };
}

// Was ein Bild zeigt, als Menge: Bausteine, Inhalte und Figuren (für den Vergleich der Bilder untereinander).
export function elementsOf(scene: Scene): Set<string> {
  const out = new Set<string>();
  const held = (item: { block: string; content?: string } | undefined) => {
    if (item === undefined) return;
    out.add(item.block);
    if (item.content !== undefined) out.add(item.content);
  };
  for (const item of scene.items) {
    if (item.block !== undefined && item.block !== 'table') out.add(item.block);
    if (item.content !== undefined) out.add(item.content);
    if (item.figure !== undefined) out.add(item.figure);
    if (item.hands !== undefined) {
      out.add(item.hands.figure);
      held(item.hands.tool);
    }
    for (const entry of Object.values(item.holds ?? {})) held(entry);
  }
  return out;
}

// Überschneidung zweier Mengen (Jaccard): 0 = nichts gemeinsam, 1 = gleich.
export function similarity(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return [...a].filter((entry) => b.has(entry)).length / union.size;
}

export type ProbeFile = { path: string; content: string };

const kb = (svg: string): string => `${(Buffer.byteLength(svg) / 1024).toFixed(1).replace('.', ',')} KB`;
const img = (path: string, width: number, alt: string): string => `<img src="${path}" width="${width}" alt="${alt}">`;
const percent = (value: number): string => `${Math.round(value * 100)} %`;

export function buildProbeFiles(catalog: Catalog, probe: { scenes: ReadonlyMap<string, ProbeScene> }, activities: ReadonlyMap<string, ProbeActivity>): ProbeFile[] {
  const files: ProbeFile[] = [];
  const lines: string[] = [];
  lines.push('# Probebilder: fünf Titelbilder von Hand (M9b, Schritt 3b)');
  lines.push('');
  lines.push('> **ERZEUGT** von `npm run kit:preview` aus `assets/bausteine/probe/`. Nicht von Hand ändern. Szenen und Bewertungen stehen in den `*.scene.json`, Regeln in [README.md](README.md).');
  lines.push('');
  lines.push('Die fünf Aktivitäten aus dem Modelltest (`docs/bilder-plan.md`), von Hand aus dem Baukasten gesetzt: Kartengröße und Daumennagel (96 × 48 und 64 × 32). Die Texte stammen aus `data/`, die Bratäpfel (KI-Aktivität, nicht in `data/`) aus `assets/bausteine/probe/aktivitaeten.json`. Geprüft mit allen Regeln des Szenenprüfers, auch Sicherheit und „nichts, was der Text nicht sagt“.');
  lines.push('');
  for (const [name, scene] of probe.scenes) {
    const activity = activities.get(scene.activity);
    const path = `probe/${name}.svg`;
    const svg = renderSceneSvg(scene, catalog);
    files.push({ path: `${probeDir}/${path}`, content: svg });
    const problems = activity === undefined ? [`Aktivität „${scene.activity}“ fehlt.`] : checkScene(scene, catalog, contextFromActivity(activity));
    const de = activity?.translations.de;
    lines.push(`## ${de?.title ?? scene.activity}`);
    lines.push('');
    lines.push(`${img(path, 312, de?.title ?? name)} ${img(path, 96, name)} ${img(path, 64, name)}`);
    lines.push('');
    lines.push(`- **Aktivität:** \`${scene.activity}\`, ${activity?.ageMin} bis ${activity?.ageMax} Jahre, Layout \`${scene.layout}\`, ${kb(svg)}`);
    lines.push(`- **Sicherheitshinweis:** ${de?.safetyNote ?? '–'}`);
    lines.push(`- **Prüfergebnis:** ${problems.length === 0 ? 'bestanden (Layout, Rand, Ecken, Überdeckung, Haltepunkte, 14 KB, Sicherheit, Textabgleich)' : `**nicht bestanden:** ${problems.join(' ')}`}`);
    lines.push(`- **Trägt:** ${scene.review.carries.join(' ')}`);
    lines.push(`- **Fehlt:** ${scene.review.missing.join(' ')}`);
    lines.push(`- **Ein Mensch prüft noch:** ${scene.review.check.join(' ')}`);
    lines.push('');
  }

  lines.push('## Wie unterscheidbar sind die fünf Bilder?');
  lines.push('');
  const entries = [...probe.scenes.entries()];
  const layoutsUsed = new Set(entries.map(([, scene]) => scene.layout));
  lines.push(`Mechanisch: **${layoutsUsed.size} verschiedene Layouts** bei ${entries.length} Bildern (${[...layoutsUsed].join(', ')}). Überschneidung der gezeigten Dinge und Figuren je Paar (0 % = nichts gemeinsam):`);
  lines.push('');
  lines.push(`| | ${entries.map(([name]) => name).join(' | ')} |`);
  lines.push(`| --- | ${entries.map(() => '---').join(' | ')} |`);
  const sets = entries.map(([, scene]) => elementsOf(scene));
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const cells = entries.map((_, j) => {
      if (i === j) return '–';
      const value = similarity(sets[i], sets[j]);
      if (j > i) {
        sum += value;
        pairs += 1;
      }
      return percent(value);
    });
    lines.push(`| ${entries[i][0]} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push(`Mittlere Überschneidung: **${percent(pairs === 0 ? 0 : sum / pairs)}**. Gemeinsam sind fast nur die Figuren (Jette kommt in allen fünf vor, weil sie zu allen Altersspannen passt).`);
  lines.push('');
  lines.push('Alle fünf nebeneinander im Daumennagel:');
  lines.push('');
  lines.push(entries.map(([name]) => img(`probe/${name}.svg`, 96, name)).join(' '));
  lines.push('');
  files.push({ path: `${probeDir}/PROBE.md`, content: `${lines.join('\n')}\n` });
  return files;
}
