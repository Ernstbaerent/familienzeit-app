// Bild-Test (M9b, Schritt 3b): für jede Aktivität eine Szene von der Claude API wählen lassen, mechanisch prüfen und zeichnen.
// Höchstens zwei Aufrufe je Aktivität (der zweite bekommt die Meldungen der Prüfung). Kosten werden vor jedem Aufruf im schlimmsten Fall
// gegen die Obergrenze gerechnet und danach aus `usage` genau. Nichts wird in die Datenbank oder den Speicher geschrieben. Reine Funktion,
// das Internet kommt als Parameter herein (Tests: Attrappe).

import { callClaude, ClaudeApiError, type Usage } from '../weekly/anthropic.ts';
import { actualUsd, estimateTokens, priceOf, worstCaseUsd } from '../weekly/cost.ts';
import type { FetchLike } from '../weekly/http.ts';
import type { ProbeActivity } from '../kit/probe.ts';
import { checkScene, contextFromActivity, renderSceneSvg } from '../kit/scene.ts';
import type { Catalog, Scene } from '../kit/types.ts';
import { buildSceneSchema, buildSystemPrompt, buildUserPrompt, toScene } from './prompt.ts';

export const models = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' } as const;
export const maxAttempts = 2;
export const maxOutputTokens = 8_000;
export const defaultMaxCostUsd = 1;

export type Attempt = { scene: Scene; noScene: boolean; reason: string; problems: string[]; usage: Usage; costUsd: number };
export type Drawn = { id: string; title: string; attempts: Attempt[]; passed: boolean; svg: string | null; error?: string };
export type DrawReport = { model: string; results: Drawn[]; totalUsd: number; tokens: { input: number; output: number }; stopped?: string };

export async function drawAll(options: {
  activities: readonly ProbeActivity[];
  catalog: Catalog;
  examples: readonly { name: string; scene: Scene }[];
  apiKey: string;
  model: string;
  fetchImpl: FetchLike;
  maxCostUsd?: number;
  timeoutMs?: number;
}): Promise<DrawReport> {
  const price = priceOf(options.model);
  if (price === null) throw new Error(`Für das Modell „${options.model}“ ist kein Preis hinterlegt (scripts/lib/weekly/cost.ts).`);
  const limit = options.maxCostUsd ?? defaultMaxCostUsd;
  const system = buildSystemPrompt(options.catalog, options.examples);
  const schema = buildSceneSchema(options.catalog);
  const report: DrawReport = { model: options.model, results: [], totalUsd: 0, tokens: { input: 0, output: 0 } };

  for (const activity of options.activities) {
    const drawn: Drawn = { id: activity.id, title: activity.translations.de.title, attempts: [], passed: false, svg: null };
    report.results.push(drawn);
    let problems: string[] = [];
    for (let attempt = 0; attempt < maxAttempts && report.stopped === undefined; attempt += 1) {
      const prompt = buildUserPrompt(activity, problems);
      const worst = worstCaseUsd(price, estimateTokens(system + prompt + JSON.stringify(schema)), maxOutputTokens);
      if (report.totalUsd + worst > limit) {
        report.stopped = `Kostengrenze ${limit} $ wäre im schlimmsten Fall überschritten (bisher ${report.totalUsd.toFixed(4)} $), weitere Aufrufe ausgelassen.`;
        break;
      }
      try {
        const result = await callClaude({ apiKey: options.apiKey, model: options.model, system, prompt, schema, maxTokens: maxOutputTokens }, options.fetchImpl, options.timeoutMs ?? 120_000);
        const costUsd = actualUsd(price, result.usage);
        report.totalUsd += costUsd;
        report.tokens.input += result.usage.input_tokens + result.usage.cache_creation_input_tokens + result.usage.cache_read_input_tokens;
        report.tokens.output += result.usage.output_tokens;
        const answer = toScene(result.data);
        problems = answer.noScene ? [] : checkScene(answer.scene, options.catalog, contextFromActivity(activity));
        drawn.attempts.push({ scene: answer.scene, noScene: answer.noScene, reason: answer.reason, problems, usage: result.usage, costUsd });
        if (answer.noScene) break; // Farbfläche: kein zweiter Versuch
        if (problems.length === 0) {
          drawn.passed = true;
          drawn.svg = renderSceneSvg(answer.scene, options.catalog);
          break;
        }
      } catch (error) {
        if (error instanceof ClaudeApiError && error.usage !== null) report.totalUsd += actualUsd(price, error.usage);
        drawn.error = error instanceof Error ? error.message : String(error);
        // Guthaben, Limit, Schlüssel oder Modell: Der ganze Test hört auf, ohne weitere Aufrufe.
        if (error instanceof ClaudeApiError && ['billing', 'limit', 'auth', 'permission', 'model'].includes(error.kind)) report.stopped = drawn.error;
        break;
      }
    }
  }
  return report;
}

const usd = (value: number): string => `${value.toFixed(4).replace('.', ',')} $`;

// Die Zusammenfassung des Laufs (Markdown für $GITHUB_STEP_SUMMARY). Bilder liegen im Artefakt „bild-test“ (PNG und SVG).
export function summaryMarkdown(report: DrawReport, rendered: ReadonlySet<string>): string {
  const lines: string[] = [];
  lines.push(`## Bild-Test mit \`${report.model}\``);
  lines.push('');
  const passed = report.results.filter((entry) => entry.passed).length;
  const noScene = report.results.filter((entry) => entry.attempts.at(-1)?.noScene === true).length;
  lines.push(`**${passed} von ${report.results.length}** Szenen bestehen alle mechanischen Prüfungen${noScene > 0 ? `, ${noScene} ohne Szene (Farbfläche)` : ''}. Kosten **${usd(report.totalUsd)}**, Token: ${report.tokens.input} Anfrage, ${report.tokens.output} Antwort.`);
  if (report.stopped !== undefined) lines.push('', `> **Abgebrochen:** ${report.stopped}`);
  lines.push('');
  lines.push('Die Bilder (PNG in Karten- und Daumennagelgröße, dazu die SVG) liegen im Artefakt **bild-test** unten auf dieser Seite. „Tragfähig?“ entscheidet ein Mensch beim Ansehen (docs/bilder-plan.md, „Modelltest“).');
  lines.push('');
  lines.push('| Aktivität | Ergebnis | Versuche | Token (Anfrage / Antwort) | Kosten | Bild |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const entry of report.results) {
    const last = entry.attempts.at(-1);
    const result = entry.error !== undefined ? `Fehler: ${entry.error}` : entry.attempts.length === 0 ? 'nicht versucht (Lauf abgebrochen)' : entry.passed ? 'bestanden' : last?.noScene ? `keine Szene: ${last.reason}` : `nicht bestanden: ${(last?.problems ?? []).join(' ')}`;
    const tokens = entry.attempts.map((a) => `${a.usage.input_tokens + a.usage.cache_creation_input_tokens + a.usage.cache_read_input_tokens} / ${a.usage.output_tokens}`).join(', ');
    const cost = entry.attempts.reduce((sum, a) => sum + a.costUsd, 0);
    lines.push(`| ${entry.title} (\`${entry.id}\`) | ${result.replace(/\|/g, '/')} | ${entry.attempts.length} | ${tokens || '–'} | ${usd(cost)} | ${rendered.has(entry.id) ? `\`${entry.id}.png\`` : '–'} |`);
  }
  lines.push('');
  lines.push('<details><summary>Szenen als JSON</summary>');
  lines.push('');
  for (const entry of report.results) {
    for (const [index, attempt] of entry.attempts.entries()) {
      lines.push(`**${entry.id}**, Versuch ${index + 1}${attempt.reason === '' ? '' : ` (Begründung: ${attempt.reason})`}`);
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(attempt.scene));
      lines.push('```');
      lines.push('');
    }
  }
  lines.push('</details>');
  return `${lines.join('\n')}\n`;
}
