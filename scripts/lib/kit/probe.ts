// Baukasten (M9b, Schritt 3b): die fünf Probebilder von Hand (assets/bausteine/probe/) und ihre Vorschauseite (docs/bausteine/PROBE.md).
// Jede Szene nennt ihre Aktivität und eine ehrliche Bewertung (was trägt, was fehlt, was ein Mensch noch prüfen muss).
// Aktivitäten, die nicht in data/ stehen (KI-Aktivitäten aus der Datenbank), liegen als Text in assets/bausteine/probe/aktivitaeten.json.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { kitDir } from './catalog.ts';
import { companion, figureLimit, matsPreferredFrom, maxShare, replayCasting } from './casting.ts';
import { checkScene, contextFromActivity, renderSceneSvg } from './scene.ts';
import { findTitleObjects, type MaterialLabels } from './titleObjects.ts';
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
// Reihenfolge der Probebilder: dieselbe wie die Standard-Liste des Bild-Tests (der Zähler der Figurenwahl läuft in dieser Reihenfolge).
export const probeOrder = ['baked-apples', 'banana-oat-balls', 'dance-freeze', 'secret-lemon-ink', 'puddle-explorers'] as const;

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

export function buildProbeFiles(catalog: Catalog, probe: { scenes: ReadonlyMap<string, ProbeScene> }, activities: ReadonlyMap<string, ProbeActivity>, labels?: MaterialLabels): ProbeFile[] {
  const files: ProbeFile[] = [];
  const lines: string[] = [];
  lines.push('# Probebilder: fünf Titelbilder von Hand (M9b, Schritt 3b)');
  lines.push('');
  lines.push('> **ERZEUGT** von `npm run kit:preview` aus `assets/bausteine/probe/`. Nicht von Hand ändern. Szenen und Bewertungen stehen in den `*.scene.json`, Regeln in [README.md](README.md).');
  lines.push('');
  lines.push('Die fünf Aktivitäten aus dem Modelltest (`docs/bilder-plan.md`), von Hand aus dem Baukasten gesetzt: Kartengröße und Daumennagel (96 × 48 und 64 × 32). Die Texte stammen aus `data/`, die Bratäpfel (KI-Aktivität, nicht in `data/`) aus `assets/bausteine/probe/aktivitaeten.json`. Geprüft mit allen Regeln des Szenenprüfers, auch Sicherheit, „nichts, was der Text nicht sagt“ und (seit dem ersten Bild-Test am 18. Oktober 2026) den Titelbild-Regeln: Figur und Gegenstand, kein `hands`, kein Messer und keine Schere, jeder Gegenstand aus dem Titel im Bild. Deshalb sind die Bananen-Haferkugeln jetzt eine ganze Figur statt einer Nahaufnahme.');
  lines.push('');
  for (const [name, scene] of probe.scenes) {
    const activity = activities.get(scene.activity);
    const path = `probe/${name}.svg`;
    const svg = renderSceneSvg(scene, catalog);
    files.push({ path: `${probeDir}/${path}`, content: svg });
    const problems = activity === undefined ? [`Aktivität „${scene.activity}“ fehlt.`] : checkScene(scene, catalog, contextFromActivity(activity, labels === undefined ? undefined : findTitleObjects(activity, labels, catalog)));
    const de = activity?.translations.de;
    lines.push(`## ${de?.title ?? scene.activity}`);
    lines.push('');
    lines.push(`${img(path, 312, de?.title ?? name)} ${img(path, 96, name)} ${img(path, 64, name)}`);
    lines.push('');
    lines.push(`- **Aktivität:** \`${scene.activity}\`, ${activity?.ageMin} bis ${activity?.ageMax} Jahre, Layout \`${scene.layout}\`, ${kb(svg)}`);
    lines.push(`- **Sicherheitshinweis:** ${de?.safetyNote ?? '–'}`);
    lines.push(`- **Prüfergebnis:** ${problems.length === 0 ? 'bestanden (Layout, Rand, Ecken, Überdeckung, Haltepunkte, 14 KB, Sicherheit, Textabgleich, Titelbild-Regeln)' : `**nicht bestanden:** ${problems.join(' ')}`}`);
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
  lines.push(`Mittlere Überschneidung: **${percent(pairs === 0 ? 0 : sum / pairs)}**. Gemeinsam sind fast nur die Figuren.`);
  lines.push('');
  lines.push(...castingSection(probe.scenes, activities));
  lines.push('## Alle fünf nebeneinander');
  lines.push('');
  lines.push('Im Daumennagel:');
  lines.push('');
  lines.push(entries.map(([name]) => img(`probe/${name}.svg`, 96, name)).join(' '));
  lines.push('');
  files.push({ path: `${probeDir}/PROBE.md`, content: `${lines.join('\n')}\n` });
  return files;
}

// Die Besetzung der fünf Bilder nach der Figurenwahl (casting.ts): Rat vor jedem Bild, gezeigte Figuren, Zähler danach.
function castingSection(scenes: ReadonlyMap<string, ProbeScene>, activities: ReadonlyMap<string, ProbeActivity>): string[] {
  const order = probeOrder.filter((name) => scenes.has(name) && activities.has((scenes.get(name) as ProbeScene).activity));
  const entries = order.map((name) => {
    const scene = scenes.get(name) as ProbeScene;
    return { activity: activities.get(scene.activity) as ProbeActivity, scene };
  });
  const replay = replayCasting(entries);
  const lines: string[] = [];
  lines.push('## Besetzung (Figurenwahl)');
  lines.push('');
  lines.push(`Passen mehrere Figuren, kommt die am seltensten benutzte zuerst; keine Figur in mehr als ${Math.round(maxShare * 100)} % der Bilder (bei ${entries.length} Bildern höchstens ${figureLimit(entries.length)}), Mats bevorzugt ab ${matsPreferredFrom} Jahren, Stups gelegentlich als Begleiter. Regeln: \`scripts/lib/kit/casting.ts\`, derselbe Code rät im Bild-Test.`);
  lines.push('');
  lines.push('| Bild | Rat: Kind | Rat: Erwachsene | Stups | gesperrt | gezeigt | Zähler danach |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  const pet = { suggested: 'vorgeschlagen', allowed: 'erlaubt', forbidden: 'nicht erlaubt' } as const;
  for (const [index, entry] of replay.entries()) {
    const counter = Object.entries(entry.counts).map(([id, value]) => `${id} ${value}`).join(', ');
    const blocked = entry.advice.blocked.filter((item) => item.id !== companion).map((item) => item.id).join(', ') || '–';
    const shown = `${entry.figures.join(', ')}${entry.problems.length > 0 ? ` (**Verstoß:** ${entry.problems.join(' ')})` : ''}`;
    lines.push(`| ${order[index]} | ${entry.advice.kids.join(' → ') || '–'} | ${entry.advice.adults.join(' → ')} | ${pet[entry.advice.pet]} | ${blocked} | ${shown} | ${counter} |`);
  }
  const final = replay.at(-1)?.counts ?? {};
  lines.push('');
  lines.push(`Am Ende: ${Object.entries(final).sort(([, a], [, b]) => b - a).map(([id, value]) => `**${id}** ${value} von ${entries.length} (${percent(value / entries.length)})`).join(', ')}. Vorher (Stand 3b) stand Jette in allen fünf Bildern.`);
  lines.push('');
  return lines;
}
