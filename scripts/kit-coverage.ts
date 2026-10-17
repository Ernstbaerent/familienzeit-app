// Abdeckungsbericht des Baukastens (npm run kit:coverage): welche Gegenstände in allen Aktivitäten vorkommen, wie oft, und welche einen Baustein haben.
// Schreibt docs/bausteine/ABDECKUNG.md; `-- --check` prüft nur, ob der Bericht noch passt. `-- --extra datei.json` nimmt weitere Aktivitäten dazu
// (zum Beispiel KI-Aktivitäten aus der Datenbank, als JSON-Liste); dann wird nichts geschrieben, nur ausgegeben. Anleitung: docs/bausteine/README.md.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadActivityData } from './lib/activityData.ts';
import { loadCatalog } from './lib/kit/catalog.ts';
import { buildCoverage, coverageMarkdown, frequencyGroups, type CoverageActivity } from './lib/kit/coverage.ts';

const root = join(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const extraIndex = process.argv.indexOf('--extra');
const extraPath = extraIndex === -1 ? undefined : process.argv[extraIndex + 1];

const catalog = loadCatalog(root);
const de = JSON.parse(readFileSync(join(root, 'src/locales/de.json'), 'utf8')) as { materials: Record<string, string> };
const en = JSON.parse(readFileSync(join(root, 'src/locales/en.json'), 'utf8')) as { materials: Record<string, string> };
const labels = Object.fromEntries(Object.keys(de.materials).map((key) => [key, { de: de.materials[key], en: en.materials[key] ?? key }]));

const activities: CoverageActivity[] = [...loadActivityData().activities];
let extra = 0;
if (extraPath !== undefined) {
  const raw = JSON.parse(readFileSync(extraPath, 'utf8')) as CoverageActivity | CoverageActivity[];
  const list = Array.isArray(raw) ? raw : [raw];
  extra = list.length;
  activities.push(...list.map((entry) => ({ id: entry.id, materials: entry.materials ?? [], translations: entry.translations })));
}

const coverage = buildCoverage(activities, catalog, labels);
const markdown = coverageMarkdown(coverage, catalog.size, extra);
const target = join(root, 'docs/bausteine/ABDECKUNG.md');

for (const group of frequencyGroups) {
  const rows = coverage.materials.filter((row) => row.total >= group.min && row.total <= group.max);
  console.log(`${group.label}: ${rows.length} Gegenstände, ${rows.filter((row) => row.blocks.length === 0).length} ohne Baustein`);
}
const missing = coverage.materials.filter((row) => row.blocks.length === 0);
console.log(`Ohne Baustein (${missing.length}): ${missing.map((row) => `${row.key} (${row.total})`).join(', ')}`);

if (extra > 0) {
  console.log(`(${extra} Aktivitäten aus ${extraPath} dazugenommen; ABDECKUNG.md bleibt unverändert.)`);
} else if (check) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== markdown) {
    console.error('Veraltet: docs/bausteine/ABDECKUNG.md (npm run kit:coverage ausführen)');
    process.exit(1);
  }
  console.log('ABDECKUNG.md ist aktuell.');
} else {
  writeFileSync(target, markdown);
  console.log('docs/bausteine/ABDECKUNG.md geschrieben.');
}
