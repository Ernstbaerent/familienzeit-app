// Bild-Test (M9b, Schritt 3b, manueller Workflow .github/workflows/image-test.yml): die Claude API wählt für einige Aktivitäten je eine Szene
// aus dem Baukasten, das Skript prüft und zeichnet sie. Drei Teile, je in einem eigenen Job, jeder nur mit dem Schlüssel, den er braucht:
//   list     liest die Aktivitäten aus Supabase (nur SUPABASE_URL und der öffentliche SUPABASE_ANON_KEY, nur lesen)
//   draw     fragt die Claude API (nur ANTHROPIC_API_KEY), prüft und zeichnet (SVG)
//   summary  schreibt die Zusammenfassung (ohne Schlüssel; die PNG macht vorher rsvg-convert im Workflow)
// Es wird nichts in die Datenbank geschrieben und kein Bucket angefasst. Braucht keine npm-Pakete, nur Node 22. Anleitung: docs/bilder-plan.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadCatalog, loadExampleScenes } from './lib/kit/catalog.ts';
import { fetchTestActivities, parseIds, parseKi } from './lib/imagetest/activities.ts';
import { loadProbe } from './lib/kit/probe.ts';
import { drawAll, models, summaryMarkdown, type DrawReport } from './lib/imagetest/run.ts';
import { createRedactor } from './lib/weekly/redact.ts';
import type { FetchLike } from './lib/weekly/http.ts';
import type { ProbeActivity } from './lib/kit/probe.ts';

const root = join(import.meta.dirname, '..');
const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const index = rest.indexOf(`--${name}`);
  return index === -1 ? undefined : rest[index + 1];
};
const out = option('out') ?? 'image-test-out';
mkdirSync(out, { recursive: true });
// Alles, was ausgegeben wird, läuft durch den Schwärzer des Wochenlaufs (bekannte Schlüssel und alles, was wie ein Schlüssel aussieht).
const redact = createRedactor([process.env.ANTHROPIC_API_KEY, process.env.SUPABASE_ANON_KEY]);
const fail = (message: string): never => {
  console.error(redact(message));
  process.exit(1);
};

async function main(): Promise<void> {
  if (command === 'list') {
    const ids = parseIds(option('ids'));
    const ki = parseKi(option('ki'));
    const { activities, missing, fromFile, ki: kiIds } = await fetchTestActivities({
      url: process.env.SUPABASE_URL ?? '',
      key: process.env.SUPABASE_ANON_KEY ?? '',
      ids,
      ki,
      fallback: loadProbe(root).extra,
      fetchImpl: fetch as unknown as FetchLike,
    });
    writeFileSync(join(out, 'activities.json'), `${JSON.stringify(activities, null, 1)}\n`);
    console.log(`${activities.length} Aktivitäten gelesen: ${activities.map((activity) => activity.id).join(', ')}.`);
    if (fromFile.length > 0) console.log(`Nicht in Supabase, Text aus assets/bausteine/probe/aktivitaeten.json: ${fromFile.join(', ')}.`);
    if (missing.length > 0) console.log(`Nicht gefunden oder nicht freigegeben: ${missing.join(', ')}.`);
    console.log(`Aus dem KI-Wochenlauf (batch_id gesetzt, die neuesten): ${kiIds.length === 0 ? 'keine' : kiIds.join(', ')}${kiIds.length < ki ? ` (gewünscht ${ki})` : ''}.`);
    if (activities.length === 0) fail('Keine Aktivität gefunden, nichts zu zeichnen.');
    return;
  }
  if (command === 'draw') {
    const choice = option('model') ?? 'haiku';
    const model = choice in models ? models[choice as keyof typeof models] : fail(`Modell „${choice}“ unbekannt (haiku oder sonnet).`);
    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    if (apiKey === '') fail('ANTHROPIC_API_KEY fehlt.');
    const activities = JSON.parse(readFileSync(join(out, 'activities.json'), 'utf8')) as ProbeActivity[];
    const catalog = loadCatalog(root);
    const examples = [...loadExampleScenes(root).entries()].slice(0, 4).map(([name, scene]) => ({ name, scene }));
    const maxCost = Number(process.env.MAX_COST_USD ?? '');
    const report = await drawAll({ activities, catalog, examples, apiKey, model, fetchImpl: fetch as unknown as FetchLike, maxCostUsd: Number.isFinite(maxCost) && maxCost > 0 ? maxCost : undefined, log: (line) => console.log(redact(line)) });
    for (const entry of report.results) if (entry.svg !== null) writeFileSync(join(out, `${entry.id}.svg`), entry.svg);
    writeFileSync(join(out, 'report.json'), `${redact(JSON.stringify({ ...report, results: report.results.map(({ svg, ...entry }) => ({ ...entry, hasSvg: svg !== null })) }, null, 1))}\n`);
    console.log(`${report.results.filter((entry) => entry.passed).length} von ${report.results.length} bestanden, ${report.totalUsd.toFixed(4)} $.`);
    if (report.stopped !== undefined) fail(`Abgebrochen: ${report.stopped}`);
    return;
  }
  if (command === 'summary') {
    const report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')) as DrawReport & { results: (DrawReport['results'][number] & { hasSvg: boolean })[] };
    const rendered = new Set(report.results.filter((entry) => existsSync(join(out, `${entry.id}.png`))).map((entry) => entry.id));
    process.stdout.write(summaryMarkdown(report, rendered));
    return;
  }
  fail('Aufruf: image-test.ts list|draw|summary [--ids a,b] [--ki 3] [--model haiku|sonnet] [--out ordner]');
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
