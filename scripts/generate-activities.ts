// KI-Wochenlauf (M9): erzeugt neue Aktivitäten mit der Claude API, prüft sie und schreibt sie in die Supabase-Tabelle `activities`.
// Läuft jeden Sonntag als GitHub Action (.github/workflows/weekly-activities.yml), Anleitung: docs/wochenlauf.md.
//
//   npm run activities:generate -- --dry-run          # schreibt nichts, zeigt alles an
//   npm run activities:generate                        # schreibt Entwürfe (draft)
//   npm run activities:generate -- --auto-approve      # gibt frei, was alle Prüfungen ohne Auffälligkeit besteht
//
// Umgebung: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY (Pflicht im echten Lauf), dazu freiwillig ANTHROPIC_MODEL
// (Standard claude-haiku-5-5), AUTO_APPROVE=true, MAX_ACTIVITIES (Standard 1500), MAX_COST_USD (Standard 0.5).
// Das Skript liest keine .env. Kein Schlüssel erscheint in Ausgaben, Logs, Fehlermeldungen oder Dateien (scripts/lib/weekly/redact.ts).
// Braucht Node 22+ und keine zusätzlichen Pakete.

import { appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

import { loadActivityData, root } from './lib/activityData.ts';
import { loadCatalog } from './lib/weekly/catalog.ts';
import type { FetchLike } from './lib/weekly/http.ts';
import { createRedactor } from './lib/weekly/redact.ts';
import { runWeekly } from './lib/weekly/run.ts';

const redact = createRedactor([process.env.ANTHROPIC_API_KEY, process.env.SUPABASE_SECRET_KEY]);

async function main(): Promise<number> {
  // Die vorhandenen Aktivitäten aus data/ (gegen Dubletten). Ohne Bild-Prüfung, deshalb ohne .env (imagePrefix null).
  const { activities } = loadActivityData(null);
  const dataTitles = activities.map((a) => ({
    id: a.id,
    category: a.category,
    status: a.status,
    de: a.translations.de?.title ?? '',
    en: a.translations.en?.title ?? '',
  }));

  const result = await runWeekly({
    env: process.env,
    argv: process.argv.slice(2),
    now: new Date(),
    fetchImpl: fetch as unknown as FetchLike,
    log: (line) => console.log(line),
    catalog: loadCatalog(root),
    dataTitles,
    dataActiveCount: activities.filter((a) => a.status === 'approved' || a.status === 'draft').length,
    randomSuffix: () => randomBytes(3).toString('hex'),
  });

  console.log(`\n${result.summary}`);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) appendFileSync(summaryFile, `${result.summary}\n`);
  return result.exitCode;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Unerwarteter Fehler: nur die gefilterte Meldung, ohne Einzelheiten, in denen ein Schlüssel stecken könnte.
    console.log(redact(`::error title=Wochenlauf abgebrochen::Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}. Es wurde nichts geschrieben.`));
    process.exitCode = 1;
  },
);
