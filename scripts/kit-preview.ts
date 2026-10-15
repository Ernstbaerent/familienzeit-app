// Erzeugt die Vorschau des Baukastens (docs/bausteine/VORSCHAU.md und vorschau/*.svg) aus assets/bausteine/ (npm run kit:preview).
// `--check` schreibt nichts und endet mit Fehler, wenn die Vorschau nicht mehr zu den Bausteinen passt.
// Anleitung: docs/bausteine/README.md.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { checkCatalog, loadCatalog, loadExampleScenes } from './lib/kit/catalog.ts';
import { buildPreviewFiles, previewDir } from './lib/kit/preview.ts';

const root = join(import.meta.dirname, '..');
const check = process.argv.includes('--check');

const catalog = loadCatalog(root);
const problems = checkCatalog(catalog);
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const files = buildPreviewFiles(catalog, loadExampleScenes(root));
const wanted = new Set(files.map((file) => file.path));
let outdated = 0;

for (const file of files) {
  const target = join(root, file.path);
  if (existsSync(target) && readFileSync(target, 'utf8') === file.content) continue;
  outdated += 1;
  if (check) console.error(`Veraltet: ${file.path} (npm run kit:preview ausführen)`);
  else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
}

// Dateien in vorschau/, die es nicht mehr geben soll (gelöschter Baustein, anderer Ton), entfernen.
for (const folder of ['vorschau', 'vorschau/beispiele']) {
  const dir = join(root, previewDir, folder);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith('.svg'))) {
    const path = `${previewDir}/${folder}/${name}`;
    if (wanted.has(path)) continue;
    outdated += 1;
    if (check) console.error(`Überflüssig: ${path}`);
    else rmSync(join(root, path));
  }
}

if (check && outdated > 0) process.exit(1);
console.log(check ? `${files.length} Dateien der Vorschau aktuell.` : `${files.length} Dateien der Vorschau erzeugt, ${outdated} geändert.`);
