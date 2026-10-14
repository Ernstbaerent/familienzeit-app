// Orte-Import (M10a), Teil „Hochladen“: nimmt die Dateien aus „Vorbereiten“ und tauscht je Bundesland die Orte in der
// Supabase-Tabelle `places` aus (Zwischentabelle + Datenbank-Funktion, alles oder nichts je Land). Anleitung: docs/orte.md.
//
//   npm run places:upload -- --dry-run     # liest nur den Stand bei Supabase und zeigt, was passieren würde
//   npm run places:upload                  # schreibt
//
// Umgebung: SUPABASE_URL, SUPABASE_SECRET_KEY (Pflicht), freiwillig MAX_PLACES (Standard 600000), DRY_RUN=true, PLACES_OUT_DIR.
// Braucht Node 22+ und KEINE Pakete (in der Action läuft hier bewusst kein npm, damit kein fremder Code neben dem Schlüssel läuft).
// Kein Schlüssel erscheint in Ausgaben (scripts/lib/weekly/redact.ts).

import { appendFileSync } from 'node:fs';

import { readUploadConfig } from './lib/places/config.ts';
import { renderUploadReport } from './lib/places/report.ts';
import { uploadRegions } from './lib/places/upload.ts';
import type { FetchLike } from './lib/weekly/http.ts';
import { createRedactor } from './lib/weekly/redact.ts';

const redact = createRedactor([process.env.SUPABASE_SECRET_KEY]);
const log = (line: string) => console.log(redact(line));

async function main(): Promise<number> {
  const read = readUploadConfig(process.env, process.argv.slice(2));
  if (!read.ok) {
    for (const problem of read.problems) log(`::error title=Orte hochladen::${problem}`);
    return 1;
  }
  const { config } = read;
  const result = await uploadRegions(config, { fetch: fetch as unknown as FetchLike, log });
  const report = redact(renderUploadReport(result, config.dryRun, config.maxPlaces));
  console.log(`\n${report}`);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) appendFileSync(summaryFile, `${report}\n`);

  const failed = result.outcomes.filter((outcome) => outcome.status === 'failed');
  for (const outcome of failed) if (outcome.status === 'failed') log(`::error title=Orte ${outcome.region}::${outcome.error}`);
  return failed.length > 0 ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    log(`::error title=Orte hochladen abgebrochen::${error instanceof Error ? error.message : String(error)}. Kein Land wurde halb geschrieben.`);
    process.exitCode = 1;
  },
);
