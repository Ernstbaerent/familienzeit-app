// Prüft die Qualitätsregeln der Orte (scripts/lib/places/quality.ts) mit echten Daten: Für jede Zeile einer CSV-Datei
// steht da, ob der Ort beim nächsten Import abgewertet, aufgewertet, weggelassen wird oder gleich bleibt, und warum.
// Anleitung und die passende SQL-Abfrage: docs/orte.md, „Regeln mit echten Daten prüfen“.
//
//   npm run places:check-names -- museen-halle.csv     # aus einer Datei
//   npm run places:check-names                         # Text einfügen, dann Strg+D
//
// Braucht Node 22+, keine Pakete, kein Netz, keinen Schlüssel.

import { readFileSync } from 'node:fs';

import { checkCsv, renderCheck } from './lib/places/checkNames.ts';

const path = process.argv[2];
if (!path && process.stdin.isTTY) console.log('CSV einfügen (mit Kopfzeile), danach Strg+D drücken:');

let content: string;
try {
  content = readFileSync(path ?? 0, 'utf8');
} catch (error) {
  console.log(`Datei nicht lesbar: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const { rows, problems } = checkCsv(content);
if (problems.length > 0) {
  for (const problem of problems) console.log(problem);
  process.exitCode = 1;
} else {
  console.log(renderCheck(rows));
}
