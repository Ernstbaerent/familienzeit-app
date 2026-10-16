// Erzeugt die Vorschau der Figurensätze (docs/design/figuren/VORSCHAU.md, vorschau/*.svg und rig-daten.json) mit `npm run figures:preview`.
// `--check` schreibt nichts und endet mit Fehler, wenn die Dateien nicht mehr zum Code passen. Anleitung: docs/design/FIGUREN.md.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { buildFigurePreview, figuresDir } from './lib/figures/preview.ts';

const root = join(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const files = buildFigurePreview();
const wanted = new Set(files.map((file) => file.path));
let outdated = 0;

for (const file of files) {
  const target = join(root, file.path);
  if (existsSync(target) && readFileSync(target, 'utf8') === file.content) continue;
  outdated += 1;
  if (check) console.error(`Veraltet: ${file.path} (npm run figures:preview ausführen)`);
  else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
}
const dir = join(root, figuresDir, 'vorschau');
if (existsSync(dir)) {
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith('.svg'))) {
    const path = `${figuresDir}/vorschau/${name}`;
    if (wanted.has(path)) continue;
    outdated += 1;
    if (check) console.error(`Überflüssig: ${path}`);
    else rmSync(join(root, path));
  }
}
if (check && outdated > 0) process.exit(1);
console.log(check ? `${files.length} Dateien aktuell.` : `${files.length} Dateien erzeugt, ${outdated} geändert.`);
