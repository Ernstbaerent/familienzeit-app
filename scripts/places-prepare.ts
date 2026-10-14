// Orte-Import (M10a), Teil „Vorbereiten“: lädt die Geofabrik-Auszüge der gewählten Bundesländer, filtert sie mit osmium
// und schreibt je Land eine Datei mit den fertigen Zeilen für die Supabase-Tabelle `places`. Braucht KEINEN Schlüssel.
// Läuft monatlich als GitHub Action (.github/workflows/places-import.yml), Anleitung: docs/orte.md.
//
//   PLACES_REGIONS=TH,SN npm run places:prepare     # Pilot (Standard)
//   PLACES_REGIONS=all   npm run places:prepare     # alle 16 Länder
//
// Braucht Node 22+, osmium-tool (Ubuntu: sudo apt-get install osmium-tool) und die Pakete aus package.json
// (für die Öffnungszeiten: opening_hours, läuft nur hier im Import und kommt nie in die App).
// Zeitzone: TZ=Europe/Berlin (die Öffnungszeiten werden in Berliner Zeit ausgewertet).

import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';

import { readPrepareConfig } from './lib/places/config.ts';
import type { DownloadFetch } from './lib/places/download.ts';
import { runOsmium } from './lib/places/osmium.ts';
import { prepareRegions } from './lib/places/prepare.ts';
import { renderPrepareReport } from './lib/places/report.ts';

async function main(): Promise<number> {
  if (process.env.TZ !== 'Europe/Berlin') {
    console.log('::error title=Orte vorbereiten::Bitte mit TZ=Europe/Berlin starten (die Öffnungszeiten gelten in Berliner Zeit).');
    return 1;
  }
  const read = readPrepareConfig(process.env, new Date(), () => randomBytes(3).toString('hex'));
  if (!read.ok) {
    for (const problem of read.problems) console.log(`::error title=Orte vorbereiten::${problem}`);
    return 1;
  }
  const { config } = read;
  console.log(`Lauf ${config.importId}: ${config.regions.join(', ')}`);

  const summary = await prepareRegions(config, {
    fetch: fetch as unknown as DownloadFetch,
    osmium: runOsmium,
    now: () => new Date(),
    log: (line) => console.log(line),
  });

  const report = renderPrepareReport(summary);
  console.log(`\n${report}`);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) appendFileSync(summaryFile, `${report}\n\n`);

  // Rot nur, wenn gar kein Land fertig wurde (dann gibt es nichts hochzuladen). Einzelne Fehler meldet „Hochladen“ am Ende.
  return summary.regions.some((region) => region.ok) ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.log(`::error title=Orte vorbereiten abgebrochen::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  },
);
