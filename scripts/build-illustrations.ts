// Erzeugt die Zeichnungen in assets/illustrations/ aus den Vorlagen in assets/illustrations/src/ (npm run illustrations:build).
// Die Farben kommen aus der Zeichnungs-Palette (src/lib/palette.ts). Ändert sich die Palette, einmal ausführen und die Dateien einchecken.
// `--check` schreibt nichts und endet mit Fehler, wenn eine erzeugte Datei nicht zur Vorlage und Palette passt.
// Anleitung: docs/design/ILLUSTRATIONEN.md, Abschnitt „Farbplätze und Erzeugen“.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderTemplate } from './lib/illustrations.ts';

const root = join(import.meta.dirname, '..');
const templateDir = join(root, 'assets/illustrations/src');
const outputDir = join(root, 'assets/illustrations');
const check = process.argv.includes('--check');

const templates = readdirSync(templateDir).filter((name) => name.endsWith('.svg'));
let outdated = 0;

for (const name of templates) {
  const svg = renderTemplate(readFileSync(join(templateDir, name), 'utf8'));
  const target = join(outputDir, name);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : undefined;
  if (current === svg) continue;
  outdated += 1;
  if (check) console.error(`Veraltet: assets/illustrations/${name} (npm run illustrations:build ausführen)`);
  else writeFileSync(target, svg);
}

if (check && outdated > 0) process.exit(1);
console.log(check ? `${templates.length} Zeichnungen aktuell.` : `${templates.length} Zeichnungen erzeugt, ${outdated} geändert.`);
