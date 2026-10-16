// Figuren-Rig (M9b): Vorschauseite der Besetzung (docs/design/figuren/VORSCHAU.md) und die Rig-Daten als JSON.
// Erzeugt alle Dateien als Text; geschrieben wird in scripts/figures-preview.ts. Reine Funktionen.

import { cast, type CastHuman } from './cast.ts';
import { figureAges, roleLabel } from './castRules.ts';
import { nameChecks, nameProposals, weakerNames } from './names.ts';
import { petPoseLabels, petPoseNames } from './pets.ts';
import { poseNames, poseOf, poseLabels } from './poses.ts';
import { birdTriptych, childTriptych, familyAtTable, humanSheet, lineup, petSheet } from './scenes.ts';
import { skinContrast, skinVariants, type SkinVariant } from './skin.ts';
import { standHeight } from './rig.ts';

export type PreviewFile = { path: string; content: string };

export const figuresDir = 'docs/design/figuren';
export const sizeLimit = 10 * 1024; // Obergrenze für Titelbilder (docs/design/ILLUSTRATIONEN.md)
export const sizeLimitSteps = 14 * 1024; // für Schrittbilder und Mehrfachblätter (Clemens, 2026-10-15)

const faces = [
  { id: 'ohne', title: 'ohne Augenpunkte', eyes: false },
  { id: 'augen', title: 'mit Augenpunkten', eyes: true },
] as const;

const bytes = (text: string): number => Buffer.byteLength(text);
const kb = (n: number): string => `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
const ratio = (n: number): string => `${n.toFixed(1).replace('.', ',')}:1`;
const img = (path: string, width: number, alt: string): string => `<img src="${path}" width="${width}" alt="${alt}">`;

// Linienstärken für die Lesbarkeitsprobe: Ist 4 (Standard) bei 96 × 48 und 64 × 32 noch zu lesen, oder braucht es mehr?
export const legibilityLines = [4, 5, 6] as const;

// Die Rig-Daten: Maße, Besonderheiten, Alter und alle benannten Posen (aufgelöst für diese Maße), dazu die Hautton-Varianten.
export function rigData(): unknown {
  return {
    hinweis: 'ERZEUGT von npm run figures:preview. Maße in Einheiten der 400 × 200-Fläche, y nach unten, Standlinie = 0, Posen als Winkel (Grad) oder Zielpunkte für die Hände.',
    humans: cast.humans.map((h) => ({
      spec: h.spec,
      ageYears: h.ageYears,
      fitsAges: figureAges[h.spec.id]?.fits ?? null,
      quirk: h.quirk ?? null,
      poses: Object.fromEntries(poseNames.map((name) => [name, poseOf(h.spec, name, h.quirk)])),
    })),
    pets: cast.pets.map((p) => ({ spec: p.spec, poses: [...petPoseNames] })),
    skinVariants: skinVariants.map((v) => ({ id: v.id, title: v.title, tones: v.tones })),
  };
}

function swatch(tone: string): string {
  return `\`${tone}\``;
}

export function buildFigurePreview(): PreviewFile[] {
  const files: PreviewFile[] = [];
  const md: string[] = [];
  const sizes: { path: string; size: number; kind: 'sheet' | 'scene' | 'family' }[] = [];
  const add = (path: string, content: string, kind: 'sheet' | 'scene' | 'family'): string => {
    files.push({ path: `${figuresDir}/${path}`, content });
    sizes.push({ path, size: bytes(content), kind });
    return path;
  };
  const skinName = (v: SkinVariant): string => v.id;

  md.push('# Figuren: die Besetzung in Satz C (Entwurf zur Wahl)');
  md.push('');
  md.push('> **ERZEUGT** von `npm run figures:preview` aus `scripts/lib/figures/`. Nicht von Hand ändern. Hintergrund, Regeln und offene Entscheidungen: [`docs/design/FIGUREN.md`](../FIGUREN.md).');
  md.push('');
  md.push('Satz C „schlank und verspielt“ ist von Clemens gewählt. Hier die Besetzung aus sieben Figuren, **drei Hautton-Varianten** und **zwei Fassungen** (ohne und mit Augenpunkten), alle aus demselben Rig.');
  md.push('Noch offen und von Clemens zu wählen: **Hautton (A, B oder C), Augenpunkte (ja oder nein) und die Namen von Papa und Junge.**');
  md.push('');

  // Besetzung
  md.push('## Besetzung');
  md.push('');
  md.push('| Name | Rolle | Alter | passt zu Aktivitäten (Altersspanne) | Standhöhe | Beschreibung | Namenscheck (Kinderfiguren, Websuche) |');
  md.push('| --- | --- | --- | --- | --- | --- | --- |');
  const rows = cast.humans.map((h) => {
    const fits = figureAges[h.spec.id]?.fits;
    return `| **${h.spec.name}** | ${roleLabel[h.spec.role]} | ${h.ageYears < 18 ? `≈ ${h.ageYears}` : 'Erwachsene'} | ${fits ? `${fits[0]} bis ${fits[1]} Jahre` : 'jede'} | ${Math.round(standHeight(h.spec))} | ${h.blurb} | ${nameChecks.get(h.spec.name) ?? '–'} |`;
  });
  md.push(...rows);
  for (const p of cast.pets) md.push(`| **${p.spec.name}** | Haustier | – | nie bei Hitze, Feuer, Messer, Schere | ${Math.round(p.spec.legLen + 2 * p.spec.bodyRy)} | ${p.blurb} | ${nameChecks.get(p.spec.name) ?? '–'} |`);
  md.push('');
  md.push(`**Namensvorschläge:** Papa **${nameProposals.papa[0]}** (Alternative ${nameProposals.papa[1]}), Junge **${nameProposals.boy[0]}** (Alternative ${nameProposals.boy[1]}). Schwächer: ${weakerNames.map((n) => `${n.name} (${n.reason})`).join('; ')}.`);
  md.push('');

  // Hautton
  md.push('## Hautton: drei Varianten');
  md.push('');
  for (const v of skinVariants) {
    md.push(`**${v.title}.** ${v.idea}`);
    md.push('');
  }
  md.push('Von links nach rechts: Nolli, Jette, Mats, Ilka, Arne, Tüpfel, Stups.');
  md.push('');
  md.push('| Variante | ohne Augenpunkte | mit Augenpunkten |');
  md.push('| --- | --- | --- |');
  for (const v of skinVariants) {
    const cells = faces.map((f) => img(add(`vorschau/${skinName(v)}-${f.id}-besetzung.svg`, lineup(f.eyes, v), 'scene'), 312, `${v.title}, ${f.title}`));
    md.push(`| **${v.title}** | ${cells[0]} | ${cells[1]} |`);
  }
  md.push('');

  md.push('### Kontrast der Töne');
  md.push('');
  md.push('WCAG-Kontrast (`src/lib/contrast.ts`). **Gegen Leinen, Rosé, Grund und Petrol** zeigt, wie sich die Haut vom Hintergrund absetzt (für Flächen sind 3:1 das Ziel, für „Haut“ nicht erreichbar, weil helle Töne nie 3:1 gegen helle Hintergründe haben). Die Figur wird über den **Tinten-Umriss** gelesen: Tinte gegen den Hintergrund (Grund) 11:1. Wichtig ist deshalb **Tinte gegen die Haut** (Lesbarkeit der Linie auf dem Gesicht und den Händen) und der **Augenpunkt** gegen die Haut (Tinte oder Leinen, je nachdem, was besser ist).');
  md.push('');
  md.push('| Variante / Platz | Ton | gegen Leinen | gegen Rosé | gegen Grund | gegen Petrol | Tinte auf Haut | Augenpunkt (Farbe, Kontrast) |');
  md.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const v of skinVariants) {
    const seen = new Set<string>();
    v.tones.forEach((tone, i) => {
      if (seen.has(tone)) return;
      seen.add(tone);
      const c = skinContrast(tone);
      const who = v.id === 'A' ? cast.humans.filter((h) => h.spec.skin === i + 1).map((h) => h.spec.name).join(', ') : 'alle';
      md.push(`| ${v.id}: ${who} | ${swatch(tone)} | ${ratio(c.leinen)} | ${ratio(c.rose)} | ${ratio(c.ground)} | ${ratio(c.petrol)} | **${ratio(c.ink)}** | ${c.eye === '#12323D' ? 'Tinte' : 'Leinen'}, ${ratio(c.eyeContrast)} |`);
    });
  }
  md.push('');

  // Figurenblätter
  md.push('## Figurenblätter');
  md.push('');
  md.push('Von links nach rechts: stehen, hält einen Teller mit Apfel, trägt ein Tablett (Erwachsene mit Ofenhandschuhen und heißen Äpfeln, Kinder mit kalten Keksen), jubelt. Menschen von vorn.');
  md.push('');
  for (const h of cast.humans) {
    md.push(`### ${h.spec.name}`);
    md.push('');
    md.push('| Variante | Fassung | Karte | 96 × 48 | 64 × 32 |');
    md.push('| --- | --- | --- | --- | --- |');
    for (const v of skinVariants) {
      for (const f of faces) {
        const p = add(`vorschau/${skinName(v)}-${f.id}-${h.spec.id}.svg`, humanSheet(h, f.eyes, v), 'sheet');
        md.push(`| ${v.id} | ${f.title} | ${img(p, 312, h.spec.name)} | ${img(p, 96, h.spec.name)} | ${img(p, 64, h.spec.name)} |`);
      }
    }
    md.push('');
  }

  md.push('## Tiere: Posen');
  md.push('');
  md.push(`Posen: ${petPoseNames.map((n) => petPoseLabels[n].de).join(', ')}. Je zwei Bilder: erst steht, sitzt, hüpft; dann sitzt auf der Schulter (bei Jette), zeigt, schaut zu. **Regel:** Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung (auch nicht bei Feuer). Sie ist im Szenenprüfer (\`checkAgainstActivity\`) und in FIGUREN.md festgeschrieben.`);
  md.push('');
  for (const p of cast.pets) {
    md.push(`### ${p.spec.name}`);
    md.push('');
    md.push('| Variante | Fassung | steht, sitzt, hüpft | Schulter, zeigt, schaut zu |');
    md.push('| --- | --- | --- | --- |');
    for (const v of skinVariants) {
      for (const f of faces) {
        const a = add(`vorschau/${skinName(v)}-${f.id}-${p.spec.id}-1.svg`, petSheet(p, f.eyes, v, 0), 'sheet');
        const b = add(`vorschau/${skinName(v)}-${f.id}-${p.spec.id}-2.svg`, petSheet(p, f.eyes, v, 1), 'sheet');
        md.push(`| ${v.id} | ${f.title} | ${img(a, 280, `${p.spec.name} 1`)} | ${img(b, 280, `${p.spec.name} 2`)} |`);
      }
    }
    md.push('');
  }

  md.push('## Familie am Tisch');
  md.push('');
  md.push('Mats, Jette, Nolli, Ilka und Arne stehen hinter dem gedeckten Tisch, Tüpfel sitzt davor. Zum Prüfen von Größenverhältnissen und Wiedererkennung. Auf dem Tisch nur ein Teller mit Apfel.');
  md.push('');
  md.push('| Variante | ohne Augenpunkte | mit Augenpunkten |');
  md.push('| --- | --- | --- |');
  for (const v of skinVariants) {
    const cells = faces.map((f) => img(add(`vorschau/${skinName(v)}-${f.id}-familie.svg`, familyAtTable(f.eyes, v), 'family'), 312, 'Familie am Tisch'));
    md.push(`| **${v.title}** | ${cells[0]} | ${cells[1]} |`);
  }
  md.push('');

  md.push('## Triptychen');
  md.push('');
  md.push('Läuft herein, nimmt das Tablett, jubelt. Für die Kinder liegen **kalte** Kekse auf dem Tablett (kein Ofen, keine heißen Dinge im Bild). **Stups fasst nichts an:** Er hüpft herein, zeigt auf das Tablett und hüpft vor Freude.');
  md.push('');
  const tri: { id: string; title: string; build: (eyes: boolean, v: SkinVariant) => { title: string; svg: string }[] }[] = [
    { id: 'jette', title: 'Jette', build: (e, v) => childTriptych('jette', e, v) },
    { id: 'mats', title: 'Mats', build: (e, v) => childTriptych('mats', e, v) },
    { id: 'stups', title: 'Stups', build: (e, v) => birdTriptych(e, v) },
  ];
  for (const t of tri) {
    md.push(`### ${t.title}`);
    md.push('');
    for (const v of skinVariants) {
      for (const f of faces) {
        const panels = t.build(f.eyes, v);
        const paths = panels.map((panel, i) => add(`vorschau/${skinName(v)}-${f.id}-${t.id}-tri${i + 1}.svg`, panel.svg, 'scene'));
        md.push(`**Variante ${v.id}, ${f.title}**`);
        md.push('');
        md.push(`| 1. ${panels[0].title} | 2. ${panels[1].title} | 3. ${panels[2].title} |`);
        md.push('| --- | --- | --- |');
        md.push(`| ${paths.map((p) => img(p, 300, t.title)).join(' | ')} |`);
        md.push('');
      }
    }
  }

  // Lesbarkeit
  md.push('## Lesbarkeit bei kleiner Größe');
  md.push('');
  md.push('Die Besetzung (Variante A, ohne Augenpunkte) mit Figurenlinie 4 (heute), 5 und 6. Die Linie 4 einer 400-breiten Fläche ist bei 96 px Breite 0,96 px dick, bei 64 px 0,64 px (mal Pixeldichte 2 oder 3 des Handys: 1,9 und 1,3 px bzw. 2,9 und 1,9 px). Die feinen Linien (2,5) bleiben unverändert.');
  md.push('');
  md.push('| Figurenlinie | Karte 312 | 96 × 48 | 64 × 32 | Linie bei 96 / 64 px |');
  md.push('| --- | --- | --- | --- | --- |');
  const va = skinVariants[0];
  for (const line of legibilityLines) {
    const p = add(`vorschau/lesbar-${line}.svg`, lineup(false, va, { line }), 'scene');
    md.push(`| ${line} | ${img(p, 312, `Linie ${line}`)} | ${img(p, 96, `Linie ${line}`)} | ${img(p, 64, `Linie ${line}`)} | ${((line * 96) / 400).toFixed(2).replace('.', ',')} px / ${((line * 64) / 400).toFixed(2).replace('.', ',')} px |`);
  }
  md.push('');

  // Dateigrößen
  md.push('## Dateigrößen (gemessen)');
  md.push('');
  const worst = (kind: 'sheet' | 'scene' | 'family'): number => Math.max(...sizes.filter((s) => s.kind === kind).map((s) => s.size));
  const fam = worst('family');
  md.push(`Szenen (Besetzung mit sieben Figuren, Triptychon, Lesbarkeit) bleiben unter ${sizeLimit / 1024} KB, der Grenze für Titelbilder: das größte ist ${kb(worst('scene'))} (die Besetzung mit Augenpunkten, knapp darunter). **Familie am Tisch** (fünf Menschen, ein Tier, ein Tisch) kommt auf ${kb(fam)} und ${fam < sizeLimit ? 'bleibt ebenfalls darunter, aber nur knapp: mehr Figuren oder Gegenstände passen in ein Titelbild nicht' : `liegt über der Grenze für Titelbilder und unter den ${sizeLimitSteps / 1024} KB für Schrittbilder`}. Ein **Figurenblatt** zeigt mehrere Posen und ist kein Titelbild (das größte ${kb(worst('sheet'))}).`);
  md.push('');
  md.push('| Datei | Größe | Art |');
  md.push('| --- | --- | --- |');
  for (const s of sizes) md.push(`| \`${s.path}\` | ${kb(s.size)} | ${s.kind === 'sheet' ? 'Blatt' : s.kind === 'family' ? 'Familie' : 'Szene'} |`);
  md.push('');

  files.push({ path: `${figuresDir}/VORSCHAU.md`, content: `${md.join('\n')}\n` });
  files.push({ path: `${figuresDir}/rig-daten.json`, content: `${JSON.stringify(rigData(), null, 1)}\n` });
  return files;
}

export const poseLabelsDe = poseLabels;
export type { CastHuman };
