// Figuren-Rig (M9b): Vorschauseite der Besetzung (docs/design/figuren/VORSCHAU.md) und die Rig-Daten als JSON.
// Erzeugt alle Dateien als Text; geschrieben wird in scripts/figures-preview.ts. Reine Funktionen.

import { cast } from './cast.ts';
import { figureAges, roleLabel } from './castRules.ts';
import { nameChecks } from './names.ts';
import { petPoseLabels, petPosesOf, petPoseNames } from './pets.ts';
import { expressionNames, poseLabels, poseNames, poseOf } from './poses.ts';
import { figureLine, standHeight } from './rig.ts';
import { birdTriptych, childTriptych, expressionSheet, familyAtTable, humanSheet, lineup, petSheet } from './scenes.ts';
import { backgrounds, skinContrast, skinTones, toneOf, type BackgroundName } from './skin.ts';

export type PreviewFile = { path: string; content: string };

export const figuresDir = 'docs/design/figuren';
// Obergrenze für Titel- und Schrittbilder (Clemens, 2026-10-16); das Bucket erlaubt 20 KB (Migration 0005).
export const sizeLimit = 14 * 1024;

const bytes = (text: string): number => Buffer.byteLength(text);
const kb = (n: number): string => `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
const ratio = (n: number): string => `${n.toFixed(1).replace('.', ',')}:1`;
const img = (path: string, width: number, alt: string): string => `<img src="${path}" width="${width}" alt="${alt}">`;

// Linien für die Einheitlichkeitsprobe (Figurenlinie gegen Gegenstände mit 4): 4, 4,5 und 5.
export const legibilityLines = [4, 4.5, 5] as const;

export const bgLabels: Record<BackgroundName, string> = { leinen: 'Leinen', rose: 'Rosé', petrol: 'Petrol', ground: 'Bildgrund' };

export function rigData(): unknown {
  return {
    hinweis: 'ERZEUGT von npm run figures:preview. Maße in Einheiten der 400 × 200-Fläche, y nach unten, Standlinie = 0, Posen als Winkel (Grad) oder Zielpunkte für die Hände. Figurenlinie 5, Gegenstände 4, feine Linien 2,5.',
    figureLine,
    skinTones: [...skinTones],
    humans: cast.humans.map((h) => ({
      spec: h.spec,
      ageYears: h.ageYears,
      tone: toneOf(h.spec.skin),
      fitsAges: figureAges[h.spec.id]?.fits ?? null,
      quirk: h.quirk ?? null,
      poses: Object.fromEntries(poseNames.map((name) => [name, poseOf(h.spec, name, h.quirk)])),
    })),
    pets: cast.pets.map((p) => ({ spec: p.spec, poses: [...petPosesOf(p.spec.kind)] })),
  };
}

export function buildFigurePreview(): PreviewFile[] {
  const files: PreviewFile[] = [];
  const md: string[] = [];
  const sizes: { path: string; size: number }[] = [];
  const add = (path: string, content: string): string => {
    files.push({ path: `${figuresDir}/${path}`, content });
    sizes.push({ path, size: bytes(content) });
    return path;
  };
  const jette = cast.humans.find((h) => h.spec.id === 'jette')!;
  const mats = cast.humans.find((h) => h.spec.id === 'mats')!;
  const stups = cast.pets.find((p) => p.spec.id === 'stups')!;

  md.push('# Figuren: die Besetzung (festgeschrieben)');
  md.push('');
  md.push('> **ERZEUGT** von `npm run figures:preview` aus `scripts/lib/figures/`. Nicht von Hand ändern. Regeln und Entscheidungen: [`docs/design/FIGUREN.md`](../FIGUREN.md).');
  md.push('');
  md.push('Satz C „schlank und verspielt“ mit Hautton-Variante A, ohne Augenpunkte (Emotionen über Haltung und Bewegung), Papa Arne, Junge Mats. Figurenlinie 5, Gegenstände 4, feine Linien 2,5.');
  md.push('');

  // Besetzung
  md.push('## Besetzung');
  md.push('');
  md.push('| Name | Rolle in der App | Alter | passt zu Aktivitäten (Altersspanne) | Standhöhe | Hautton | Beschreibung |');
  md.push('| --- | --- | --- | --- | --- | --- | --- |');
  const roleOf: Record<string, string> = { jette: 'Hauptfigur', mats: 'Hauptfigur', ilka: 'Nebenfigur', arne: 'Nebenfigur', nolli: 'Nebenfigur' };
  for (const h of cast.humans) {
    const fits = figureAges[h.spec.id]?.fits;
    md.push(`| **${h.spec.name}** | ${roleOf[h.spec.id]} (${roleLabel[h.spec.role]}) | ${h.ageYears < 18 ? `≈ ${h.ageYears}` : 'Erwachsene'} | ${fits ? `${fits[0]} bis ${fits[1]} Jahre` : 'jede'} | ${Math.round(standHeight(h.spec))} | Platz ${h.spec.skin} \`${toneOf(h.spec.skin)}\` | ${h.blurb} |`);
  }
  md.push(`| **Stups** | Hauptfigur (Begleiter) | – | jede (nie bei Hitze, Feuer, Messer, Schere) | 50 | – | ${stups.blurb} |`);
  md.push(`| **Tüpfel** | Cameo-Figur | – | jede (nie bei Hitze, Feuer, Messer, Schere) | 55 | – | ${cast.pets.find((p) => p.spec.id === 'tuepfel')!.blurb} |`);
  md.push('');
  md.push(`Namensprüfung: ${[...nameChecks].map(([n, r]) => `${n} (${r})`).join('; ')}.`);
  md.push('');

  md.push('## Die Besetzung zusammen');
  md.push('');
  md.push('Von links nach rechts: Nolli, Jette, Mats, Ilka, Arne, Tüpfel, Stups. Karte, 96 × 48 und 64 × 32.');
  md.push('');
  const lineupPath = add('vorschau/besetzung.svg', lineup());
  md.push(`${img(lineupPath, 400, 'Besetzung')} ${img(lineupPath, 96, 'Besetzung klein')} ${img(lineupPath, 64, 'Besetzung kleiner')}`);
  md.push('');

  // Hauttöne
  md.push('## Hauttöne');
  md.push('');
  md.push('Acht Töne, Farbton 21° bis 26° (ohne Gelb- und ohne Rotstich). Regel: Ein Ton **trägt** auf einem Hintergrund, wenn die Haut gegen den Hintergrund mindestens 3:1 hat **oder** der Tinten-Umriss gegen die Haut mindestens 3:1 (bei gesichtslosen Köpfen trägt die Form der Haut oder der Umriss). WCAG-Kontrast, `src/lib/contrast.ts`.');
  md.push('');
  md.push('| Platz | Ton | Figur | Haut gegen Leinen | Rosé | Bildgrund | Petrol | Tinte gegen Haut | trägt auf Leinen / Rosé / Bildgrund / Petrol |');
  md.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  skinTones.forEach((tone, i) => {
    const c = skinContrast(tone);
    const who = cast.humans.filter((h) => h.spec.skin === i + 1).map((h) => h.spec.name).join(', ') || 'Reserve';
    const mark = (ok: boolean): string => (ok ? 'ja' : '**nein**');
    md.push(`| ${i + 1} | \`${tone}\` | ${who} | ${ratio(c.leinen)} | ${ratio(c.rose)} | ${ratio(c.ground)} | ${ratio(c.petrol)} | ${ratio(c.ink)} | ${mark(c.carries.leinen)} / ${mark(c.carries.rose)} / ${mark(c.carries.ground)} / ${mark(c.carries.petrol)} |`);
  });
  md.push('');
  md.push(`Hintergründe: ${(Object.keys(backgrounds) as BackgroundName[]).map((k) => `${bgLabels[k]} \`${backgrounds[k]}\``).join(', ')}.`);
  md.push('');

  // Figurenblätter
  md.push('## Figurenblätter');
  md.push('');
  md.push('Von links nach rechts: stehen, hält einen Teller mit Apfel, trägt ein Tablett (Erwachsene mit Ofenhandschuhen und heißen Äpfeln, Kinder mit kalten Keksen), jubelt.');
  md.push('');
  md.push('| Figur | Karte | 96 × 48 | 64 × 32 |');
  md.push('| --- | --- | --- | --- |');
  for (const h of cast.humans) {
    const p = add(`vorschau/${h.spec.id}.svg`, humanSheet(h));
    md.push(`| ${h.spec.name} | ${img(p, 312, h.spec.name)} | ${img(p, 96, h.spec.name)} | ${img(p, 64, h.spec.name)} |`);
  }
  md.push('');

  md.push('## Ausdrucksposen: Jette und Mats');
  md.push('');
  md.push(`Von links nach rechts: ${expressionNames.map((n) => poseLabels[n].de).join(', ')}. Emotionen über Haltung statt über Gesichtszüge. Die Posen sind Daten im Rig (\`poses.ts\`, \`rig-daten.json\`); es wird nichts animiert.`);
  md.push('');
  for (const h of [jette, mats]) {
    const p = add(`vorschau/${h.spec.id}-ausdruck.svg`, expressionSheet(h));
    md.push(`**${h.spec.name}**`);
    md.push('');
    md.push(`${img(p, 400, `${h.spec.name} Ausdrucksposen`)} ${img(p, 96, h.spec.name)}`);
    md.push('');
  }

  md.push('## Tiere');
  md.push('');
  md.push('**Stups** (Vogel, Hauptfigur, Begleiter) hat sechs Posen: ' + petPoseNames.map((n) => petPoseLabels[n].de).join(', ') + '. **Tüpfel** (Katze, Cameo) hat drei: ' + petPosesOf('cat').map((n) => petPoseLabels[n].de).join(', ') + '. **Regel:** Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung (auch nicht bei Feuer); sie steht im Szenenprüfer.');
  md.push('');
  md.push('| Tier | Bild | 96 × 48 | 64 × 32 |');
  md.push('| --- | --- | --- | --- |');
  for (const p of cast.pets) {
    const halves: (0 | 1)[] = p.spec.kind === 'bird' ? [0, 1] : [0];
    for (const half of halves) {
      const path = add(`vorschau/${p.spec.id}-${half + 1}.svg`, petSheet(p, half));
      md.push(`| ${p.spec.name} ${half + 1} | ${img(path, 312, p.spec.name)} | ${img(path, 96, p.spec.name)} | ${img(path, 64, p.spec.name)} |`);
    }
  }
  md.push('');

  md.push('## Familie am Tisch');
  md.push('');
  md.push('Mats, Jette, Nolli, Ilka und Arne stehen hinter dem gedeckten Tisch, Tüpfel sitzt davor. Zum Prüfen von Größenverhältnissen und Wiedererkennung. Auf dem Tisch nur ein Teller mit Apfel.');
  md.push('');
  const fam = add('vorschau/familie.svg', familyAtTable());
  md.push(`${img(fam, 400, 'Familie am Tisch')} ${img(fam, 96, 'Familie klein')}`);
  md.push('');

  md.push('## Triptychen');
  md.push('');
  md.push('Läuft herein, nimmt das Tablett (kalte Kekse), jubelt. **Stups fasst nichts an:** Er hüpft herein, zeigt auf das Tablett und hüpft vor Freude.');
  md.push('');
  const tri: { id: string; title: string; panels: { title: string; svg: string }[] }[] = [
    { id: 'jette', title: 'Jette', panels: childTriptych('jette') },
    { id: 'mats', title: 'Mats', panels: childTriptych('mats') },
    { id: 'stups', title: 'Stups', panels: birdTriptych() },
  ];
  for (const t of tri) {
    const paths = t.panels.map((panel, i) => add(`vorschau/${t.id}-tri${i + 1}.svg`, panel.svg));
    md.push(`**${t.title}**`);
    md.push('');
    md.push(`| 1. ${t.panels[0].title} | 2. ${t.panels[1].title} | 3. ${t.panels[2].title} |`);
    md.push('| --- | --- | --- |');
    md.push(`| ${paths.map((p) => img(p, 300, t.title)).join(' | ')} |`);
    md.push('');
  }

  md.push('## Einheitlichkeit der Linien');
  md.push('');
  md.push(`Figuren mit Linie 4, 4,5 und 5; die Gegenstände (Tablett, Teller, Tisch) bleiben 4, feine Linien 2,5. Entschieden: **${figureLine}**.`);
  md.push('');
  md.push('| Figurenlinie | Familie am Tisch | 96 × 48 | 64 × 32 |');
  md.push('| --- | --- | --- | --- |');
  for (const line of legibilityLines) {
    const p = add(`vorschau/linie-${String(line).replace('.', '-')}.svg`, familyAtTable(false, line));
    md.push(`| ${line} | ${img(p, 312, `Linie ${line}`)} | ${img(p, 96, `Linie ${line}`)} | ${img(p, 64, `Linie ${line}`)} |`);
  }
  md.push('');

  md.push('## Dateigrößen (gemessen, Figurenlinie 5)');
  md.push('');
  const worst = (re: RegExp): number => Math.max(...sizes.filter((s) => re.test(s.path)).map((s) => s.size));
  md.push(`Grenze für Titel- und Schrittbilder: ${sizeLimit / 1024} KB (das Bucket erlaubt 20 KB). Das größte Bild einer **Szene** (Besetzung, Familie, Triptychen) hat ${kb(worst(/besetzung|familie\.svg|tri\d/))}; ein **Figurenblatt** oder Ausdrucksblatt (mehrere Posen, kein Titelbild) höchstens ${kb(worst(/vorschau\/(?!besetzung|familie|linie|.*tri\d)/))}.`);
  md.push('');
  md.push('| Datei | Größe |');
  md.push('| --- | --- |');
  for (const s of sizes) md.push(`| \`${s.path}\` | ${kb(s.size)} |`);
  md.push('');

  files.push({ path: `${figuresDir}/VORSCHAU.md`, content: `${md.join('\n')}\n` });
  files.push({ path: `${figuresDir}/rig-daten.json`, content: `${JSON.stringify(rigData(), null, 1)}\n` });
  void petPoseNames;
  return files;
}
