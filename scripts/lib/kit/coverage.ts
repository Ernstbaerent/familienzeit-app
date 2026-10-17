// Baukasten (M9b, Schritt 3a): Abdeckungsbericht über alle Aktivitäten (npm run kit:coverage).
// Welche Gegenstände kommen in den Aktivitäten vor (Material und Text: Titel, Kurzbeschreibung, Schritte), wie oft, und für welche gibt es einen Baustein?
// Reine Funktionen, ohne Dateizugriff. Die Erkennung im Text ist ein grobes Sieb (Wortstamm des Materialnamens, kleingeschrieben).

import type { Catalog, LoadedBlock } from './types.ts';

export type CoverageActivity = {
  id: string;
  materials: readonly string[];
  translations: Readonly<Record<string, { title: string; summary: string; steps: readonly string[]; safetyNote?: string }>>;
};

export type MaterialRow = {
  key: string;
  label: { de: string; en: string };
  inMaterials: number; // Aktivitäten mit diesem Material
  inTextOnly: number; // Aktivitäten, die es nur im Text nennen (nicht als Material)
  total: number;
  blocks: string[]; // Bausteine, die es zeigen
};

export type ActivityRow = { id: string; title: string; objects: number; withBlock: number; blocks: string[] };

export type Coverage = { materials: MaterialRow[]; activities: ActivityRow[] };

export const frequencyGroups = [
  { label: 'häufig (10 oder mehr Aktivitäten)', min: 10, max: Infinity },
  { label: 'mittel (3 bis 9)', min: 3, max: 9 },
  { label: 'selten (1 bis 2)', min: 1, max: 2 },
] as const;

// Wortstamm eines Materialnamens: kleingeschrieben, ohne Klammern, ohne häufige Endungen („Kastanien“ → „kastanie“, „Stifte“ → „stift“).
export function stem(label: string): string {
  const word = label.toLowerCase().replace(/\(.*?\)/g, '').trim();
  if (word.length <= 4) return word;
  return word.replace(/[nes]$/u, '');
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Kommt der Wortstamm im Text vor? Englisch und kurze deutsche Stämme nur am Wortanfang („pot“ nicht in „spot“),
// längere deutsche Stämme auch mitten im Wort (zusammengesetzte Wörter wie „Filzstifte“).
export function mentions(text: string, wordStem: string, language: string): boolean {
  if (wordStem.length <= 2) return false;
  if (language === 'de' && wordStem.length >= 5) return text.includes(wordStem);
  return new RegExp(`(^|[^\\p{L}])${escape(wordStem)}`, 'u').test(text);
}

// Was die Figuren selbst zeigen (keine Bausteine): Regen-Kleidung des Rigs.
export const figureCover: Readonly<Record<string, string>> = { rainBoots: 'Regen-Kleidung (Figur)', rainJacket: 'Regen-Kleidung (Figur)' };

const textOf = (activity: CoverageActivity, language: string): string => {
  const entry = activity.translations[language];
  return entry === undefined ? '' : [entry.title, entry.summary, ...entry.steps].join(' ').toLowerCase();
};

// Bausteine, die ein Material zeigen: nur über ihre `materials` im Katalog (Begriffe wären hier zu ungenau, „sheet“ steckt in „baking sheet“).
export function blocksForMaterial(catalog: Catalog, key: string): string[] {
  return [...catalog.values()].filter((block: LoadedBlock) => block.materials.includes(key)).map((block) => block.id);
}

export function buildCoverage(activities: readonly CoverageActivity[], catalog: Catalog, labels: Readonly<Record<string, { de: string; en: string }>>): Coverage {
  const rows: MaterialRow[] = [];
  const mentioned = new Map<string, Set<string>>(); // Material → Aktivitäten
  for (const [key, label] of Object.entries(labels)) {
    const stems = { de: stem(label.de), en: stem(label.en) };
    let inMaterials = 0;
    let inTextOnly = 0;
    const ids = new Set<string>();
    for (const activity of activities) {
      if (activity.materials.includes(key)) {
        inMaterials += 1;
        ids.add(activity.id);
      } else if (mentions(textOf(activity, 'de'), stems.de, 'de') || mentions(textOf(activity, 'en'), stems.en, 'en')) {
        inTextOnly += 1;
        ids.add(activity.id);
      }
    }
    mentioned.set(key, ids);
    if (inMaterials + inTextOnly === 0) continue;
    const cover = figureCover[key] === undefined ? [] : [figureCover[key]];
    rows.push({ key, label, inMaterials, inTextOnly, total: inMaterials + inTextOnly, blocks: [...blocksForMaterial(catalog, key), ...cover] });
  }
  rows.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const activityRows: ActivityRow[] = activities.map((activity) => {
    const keys = rows.filter((row) => mentioned.get(row.key)?.has(activity.id)).map((row) => row.key);
    const blocks = [...new Set(keys.flatMap((key) => byKey.get(key)?.blocks ?? []))];
    return {
      id: activity.id,
      title: activity.translations.de?.title ?? activity.id,
      objects: keys.length,
      withBlock: keys.filter((key) => (byKey.get(key)?.blocks.length ?? 0) > 0).length,
      blocks,
    };
  });
  return { materials: rows, activities: activityRows };
}

const code = (id: string): string => (id.includes(' ') ? id : `\`${id}\``);

// Der Bericht als Markdown (docs/bausteine/ABDECKUNG.md).
export function coverageMarkdown(coverage: Coverage, catalogSize: number, extra: number): string {
  const lines: string[] = [];
  const { materials, activities } = coverage;
  const missing = materials.filter((row) => row.blocks.length === 0);
  lines.push('# Baukasten: Abdeckung der Aktivitäten');
  lines.push('');
  lines.push('> **ERZEUGT** von `npm run kit:coverage` aus `data/` und `assets/bausteine/katalog.json`. Nicht von Hand ändern. Anleitung: [README.md](README.md).');
  lines.push('');
  lines.push(
    `${activities.length} Aktivitäten${extra > 0 ? ` (davon ${extra} aus einer Zusatzdatei)` : ' aus `data/` (die KI-Aktivitäten aus der Datenbank fehlen; sie lassen sich mit `-- --extra datei.json` dazunehmen)'}, ${catalogSize} Bausteine. ` +
      `Ein Gegenstand zählt, wenn er als Material eingetragen ist oder sein Name im Text (Titel, Kurzbeschreibung, Schritte) steht. Die Suche im Text ist grob (Wortstamm des Namens), sie findet auch zufällige Treffer und übersieht Umschreibungen.`,
  );
  lines.push('');
  lines.push('## Überblick');
  lines.push('');
  const withAny = activities.filter((row) => row.withBlock > 0).length;
  const full = activities.filter((row) => row.objects > 0 && row.withBlock === row.objects).length;
  lines.push(`- **${materials.length}** verschiedene Gegenstände kommen vor, **${materials.length - missing.length}** davon haben einen Baustein, **${missing.length}** keinen.`);
  lines.push(`- **${withAny}** von ${activities.length} Aktivitäten haben mindestens einen Gegenstand mit Baustein, **${full}** haben für alle ihre Gegenstände einen.`);
  const avg = activities.reduce((sum, row) => sum + row.objects, 0) / Math.max(1, activities.length);
  lines.push(`- Im Mittel nennt eine Aktivität **${avg.toFixed(1).replace('.', ',')}** Gegenstände.`);
  lines.push('');
  lines.push('## Gegenstände nach Häufigkeit');
  lines.push('');
  for (const group of frequencyGroups) {
    const rows = materials.filter((row) => row.total >= group.min && row.total <= group.max);
    if (rows.length === 0) continue;
    lines.push(`### ${group.label}: ${rows.length}`);
    lines.push('');
    lines.push('| Gegenstand | Schlüssel | Aktivitäten (als Material + nur im Text) | Baustein |');
    lines.push('| --- | --- | --- | --- |');
    for (const row of rows) {
      lines.push(`| ${row.label.de} | \`${row.key}\` | ${row.total} (${row.inMaterials} + ${row.inTextOnly}) | ${row.blocks.length === 0 ? '**fehlt**' : row.blocks.map(code).join(', ')} |`);
    }
    lines.push('');
  }
  lines.push('## Materialien ohne Baustein');
  lines.push('');
  lines.push('Nach Häufigkeit. Ein neuer Baustein lohnt sich vor allem oben in dieser Liste (Regeln: [README.md](README.md), „Neue Bausteine“).');
  lines.push('');
  lines.push(missing.map((row) => `${row.label.de} (\`${row.key}\`, ${row.total})`).join(', ') || 'keine');
  lines.push('');
  lines.push('## Je Aktivität');
  lines.push('');
  lines.push('| Aktivität | Gegenstände | davon mit Baustein | Bausteine |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of [...activities].sort((a, b) => a.withBlock - b.withBlock || a.id.localeCompare(b.id))) {
    lines.push(`| ${row.title} (\`${row.id}\`) | ${row.objects} | ${row.withBlock} | ${row.blocks.map(code).join(', ') || '–'} |`);
  }
  lines.push('');
  return lines.join('\n');
}
