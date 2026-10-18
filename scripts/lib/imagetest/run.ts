// Bild-Test (M9b, Schritt 3b): für jede Aktivität eine Szene von der Claude API wählen lassen, mechanisch prüfen und zeichnen.
// Höchstens zwei Aufrufe je Aktivität (der zweite bekommt die Meldungen der Prüfung). Kosten werden vor jedem Aufruf im schlimmsten Fall
// gegen die Obergrenze gerechnet und danach aus `usage` genau. Nichts wird in die Datenbank oder den Speicher geschrieben. Reine Funktion,
// das Internet kommt als Parameter herein (Tests: Attrappe).

import { callClaude, ClaudeApiError, type Usage } from '../weekly/anthropic.ts';
import { actualUsd, estimateTokens, priceOf, worstCaseUsd } from '../weekly/cost.ts';
import type { FetchLike } from '../weekly/http.ts';
import type { ProbeActivity } from '../kit/probe.ts';
import { addToCounts, adviseCasting, castingProblems, castingPrompt, figuresInScene, type CastingAdvice } from '../kit/casting.ts';
import { checkScene, contextFromActivity, renderSceneSvg } from '../kit/scene.ts';
import type { Catalog, Scene } from '../kit/types.ts';
import { schemaLimitProblems } from '../schemaLimits.ts';
import { buildSceneSchema, buildSystemPrompt, buildUserPrompt, toScene } from './prompt.ts';
import { findTitleObjects, missingTitleBlocks, type MaterialLabels } from '../kit/titleObjects.ts';

export const models = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' } as const;
export const maxAttempts = 2;
export const maxOutputTokens = 8_000;
export const defaultMaxCostUsd = 1;
// Fehlerarten, bei denen der ganze Lauf sofort aufhört (scripts/lib/weekly/anthropic.ts, classifyError).
export const stopKinds = ['billing', 'limit', 'auth', 'permission', 'model', 'request'] as const;

export type Attempt = { scene: Scene; noScene: boolean; reason: string; missingBlocks: string[]; problems: string[]; usage: Usage; costUsd: number };
// Fehlende Bausteine über den ganzen Lauf (Name → wie oft, bei welchen Aktivitäten, wer sie gemeldet hat).
// „Prüfer“: Der Titel nennt einen Gegenstand ohne Baustein (vor jedem Aufruf erkannt). „KI“: von der KI bei „keine Szene“ vorgeschlagen.
export type MissingBlocks = Record<string, { count: number; activities: string[]; sources: ('Prüfer' | 'KI')[] }>;
export type Drawn = {
  id: string;
  title: string;
  attempts: Attempt[];
  passed: boolean;
  svg: string | null;
  bytes: number | null; // Größe des SVG in Byte (nur bestanden)
  casting: CastingAdvice;
  figures: string[]; // Figuren im bestandenen Bild
  counts: Record<string, number>; // Zähler der Figuren nach diesem Bild
  skipped?: string; // keine Anfrage: Der Titel nennt einen Gegenstand ohne Baustein
  error?: string;
};
export type DrawReport = {
  model: string;
  results: Drawn[];
  totalUsd: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  counts: Record<string, number>;
  missingBlocks: MissingBlocks;
  stopped?: string;
};

// Normalisiert einen gemeldeten Namen („ Fahrrad “ → „fahrrad“).
const normalize = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Nimmt fehlende Bausteine in die Liste auf. Namen, die einen vorhandenen Baustein meinen (ID oder Name), zählen nicht:
// Die KI darf fehlende Bausteine vorschlagen, nie welche erfinden, die es schon gibt.
export function addMissing(list: MissingBlocks, names: readonly string[], source: 'Prüfer' | 'KI', activity: string, catalog: Catalog): MissingBlocks {
  const known = new Set([...catalog.values()].flatMap((block) => [block.id, block.label.de, block.label.en].map(normalize)));
  const next: MissingBlocks = { ...list };
  for (const name of new Set(names.map(normalize).filter((entry) => entry !== '' && !known.has(entry)))) {
    const entry = next[name] ?? { count: 0, activities: [], sources: [] };
    next[name] = {
      count: entry.count + (entry.activities.includes(activity) ? 0 : 1),
      activities: entry.activities.includes(activity) ? entry.activities : [...entry.activities, activity],
      sources: entry.sources.includes(source) ? entry.sources : [...entry.sources, source],
    };
  }
  return next;
}

export async function drawAll(options: {
  activities: readonly ProbeActivity[];
  catalog: Catalog;
  labels?: MaterialLabels; // Namen der Materialien (für die Gegenstände aus dem Titel); ohne sie prüft der Lauf das nicht
  apiKey: string;
  model: string;
  fetchImpl: FetchLike;
  maxCostUsd?: number;
  timeoutMs?: number;
  log?: (line: string) => void; // Protokoll (Zähler der Figuren je Bild)
}): Promise<DrawReport> {
  const price = priceOf(options.model);
  if (price === null) throw new Error(`Für das Modell „${options.model}“ ist kein Preis hinterlegt (scripts/lib/weekly/cost.ts).`);
  const limit = options.maxCostUsd ?? defaultMaxCostUsd;
  const system = buildSystemPrompt(options.catalog);
  const schema = buildSceneSchema(options.catalog, 'title');
  const report: DrawReport = { model: options.model, results: [], totalUsd: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, counts: {}, missingBlocks: {} };
  const total = options.activities.length;
  // Grenzen der strukturierten Ausgaben vor der ersten Anfrage prüfen (scripts/lib/schemaLimits.ts): kein Aufruf, der sicher scheitert.
  const limitProblems = schemaLimitProblems(schema);
  if (limitProblems.length > 0) {
    report.stopped = `Schema zu groß für die API, keine Anfrage gesendet. ${limitProblems.join(' ')}`;
    return report;
  }

  for (const activity of options.activities) {
    // Figurenwahl (casting.ts): Rat aus den bisher bestandenen Bildern, eine gesperrte Figur gilt wie eine Meldung der Prüfung.
    const casting = adviseCasting(activity, report.counts, total);
    const drawn: Drawn = { id: activity.id, title: activity.translations.de.title, attempts: [], passed: false, svg: null, bytes: null, casting, figures: [], counts: report.counts };
    report.results.push(drawn);
    // Gegenstände aus dem Titel: Fehlt für einen der Baustein, ist kein Titelbild möglich. Dann gibt es gar keine Anfrage (spart Kosten).
    const titleObjects = options.labels === undefined ? undefined : findTitleObjects(activity, options.labels, options.catalog);
    const context = contextFromActivity(activity, titleObjects);
    const missing = missingTitleBlocks(titleObjects ?? []);
    if (missing.length > 0) {
      drawn.skipped = `Der Titel nennt ${missing.map((name) => `„${name}“`).join(', ')}, dafür gibt es keinen Baustein.`;
      report.missingBlocks = addMissing(report.missingBlocks, missing, 'Prüfer', activity.id, options.catalog);
      options.log?.(`${activity.id}: keine Anfrage, ${drawn.skipped}`);
      continue;
    }
    let problems: string[] = [];
    for (let attempt = 0; attempt < maxAttempts && report.stopped === undefined; attempt += 1) {
      const prompt = buildUserPrompt(activity, problems, castingPrompt(casting));
      // schlimmster Fall: Der feste Teil wird in den Zwischenspeicher geschrieben (1,25-facher Preis), der Rest voll bezahlt
      const worst = worstCaseUsd(price, Math.ceil(estimateTokens(system) * 1.25) + estimateTokens(prompt + JSON.stringify(schema)), maxOutputTokens);
      if (report.totalUsd + worst > limit) {
        report.stopped = `Kostengrenze ${limit} $ wäre im schlimmsten Fall überschritten (bisher ${report.totalUsd.toFixed(4)} $), weitere Aufrufe ausgelassen.`;
        break;
      }
      try {
        const result = await callClaude({ apiKey: options.apiKey, model: options.model, system, prompt, schema, maxTokens: maxOutputTokens, cacheSystem: true }, options.fetchImpl, options.timeoutMs ?? 120_000);
        const costUsd = actualUsd(price, result.usage);
        report.totalUsd += costUsd;
        report.tokens.input += result.usage.input_tokens + result.usage.cache_creation_input_tokens + result.usage.cache_read_input_tokens;
        report.tokens.output += result.usage.output_tokens;
        report.tokens.cacheRead += result.usage.cache_read_input_tokens;
        report.tokens.cacheWrite += result.usage.cache_creation_input_tokens;
        const answer = toScene(result.data, 'title');
        problems = answer.noScene ? [] : [...answer.problems, ...checkScene(answer.scene, options.catalog, context), ...castingProblems(answer.scene, casting)];
        drawn.attempts.push({ scene: answer.scene, noScene: answer.noScene, reason: answer.reason, missingBlocks: answer.missingBlocks, problems, usage: result.usage, costUsd });
        if (answer.noScene) {
          report.missingBlocks = addMissing(report.missingBlocks, answer.missingBlocks, 'KI', activity.id, options.catalog);
          break; // Farbfläche: kein zweiter Versuch
        }
        if (problems.length === 0) {
          drawn.passed = true;
          drawn.svg = renderSceneSvg(answer.scene, options.catalog);
          drawn.bytes = Buffer.byteLength(drawn.svg);
          drawn.figures = figuresInScene(answer.scene);
          report.counts = addToCounts(report.counts, answer.scene);
          drawn.counts = report.counts;
          break;
        }
      } catch (error) {
        if (error instanceof ClaudeApiError && error.usage !== null) report.totalUsd += actualUsd(price, error.usage);
        drawn.error = error instanceof Error ? error.message : String(error);
        // Guthaben, Limit, Schlüssel, Modell oder eine abgelehnte Anfrage (400, z. B. invalid_request_error beim Schema):
        // Der ganze Test hört sofort auf, ohne weitere Aufrufe. Die nächste Anfrage wäre gleich gebaut und würde genauso scheitern.
        if (error instanceof ClaudeApiError && (stopKinds as readonly string[]).includes(error.kind)) report.stopped = drawn.error;
        break;
      }
    }
    options.log?.(`${activity.id}: ${drawn.passed ? `Figuren ${drawn.figures.join(', ') || 'keine'}` : 'kein Bild'}; Zähler ${counterText(report.counts, total)}`);
  }
  return report;
}

// Endet der Lauf rot? Ja, wenn er abgebrochen wurde (Guthaben, Schlüssel, abgelehnte Anfrage, Kostengrenze, Schema) oder wenn
// keine einzige Aktivität ein Bild bekam, obwohl es welche gab (dann ist eher der Test kaputt als die Szenen). So schickt GitHub eine E-Mail.
// Teilfehler (einige bestehen, andere nicht) bleiben grün: Das Ergebnis steht in der Zusammenfassung.
export function runFailure(report: DrawReport): string | null {
  if (report.stopped !== undefined) return `Abgebrochen: ${report.stopped}`;
  if (report.results.length > 0 && !report.results.some((entry) => entry.passed)) return `Keine der ${report.results.length} Aktivitäten hat ein Bild bekommen.`;
  return null;
}

// Zähler als Text: „jette 2/8, mats 1/8“ (meiste zuerst).
export function counterText(counts: Readonly<Record<string, number>>, total: number): string {
  const entries = Object.entries(counts).sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  return entries.length === 0 ? '–' : entries.map(([id, value]) => `${id} ${value}/${total}`).join(', ');
}

const usd = (value: number): string => `${value.toFixed(4).replace('.', ',')} $`;

// Eine Szene in einer Zeile: Layout, dann je Platz Figur mit Pose und Gehaltenem oder Baustein mit Inhalt.
export function describeScene(scene: Scene): string {
  const held = (item: { block: string; content?: string; hot?: boolean } | undefined): string => (item === undefined ? '' : `${item.block}${item.content === undefined ? '' : ` mit ${item.content}`}${item.hot === true ? ' (heiß)' : ''}`);
  const parts = scene.items.map((item) => {
    if (item.figure !== undefined) {
      const holds = Object.values(item.holds ?? {}).map(held).filter((text) => text !== '');
      const extra = [item.mitts === true ? 'Ofenhandschuhe' : '', item.outfit !== undefined ? 'Regenkleidung' : ''].filter((text) => text !== '');
      return `${item.slot}: ${item.figure}${item.pose === undefined ? '' : ` ${item.pose}`}${holds.length > 0 ? ` hält ${holds.join(' und ')}` : ''}${extra.length > 0 ? ` (${extra.join(', ')})` : ''}`;
    }
    const hands = item.hands === undefined ? '' : `, Hände von ${item.hands.figure} (${item.hands.pose}${item.hands.tool === undefined ? '' : ` mit ${held(item.hands.tool)}`})`;
    return `${item.slot}: ${held({ block: item.block ?? '?', content: item.content, hot: item.hot })}${hands}`;
  });
  return `${scene.layout}; ${parts.join('; ')}`;
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
const cell = (text: string): string => text.replace(/\|/g, '/').replace(/\n/g, ' ');

// Die Zusammenfassung des Laufs (Markdown für $GITHUB_STEP_SUMMARY). Bilder liegen im Artefakt „bild-test“ (PNG und SVG).
export function summaryMarkdown(report: DrawReport, rendered: ReadonlySet<string>): string {
  const lines: string[] = [];
  const total = report.results.length;
  lines.push(`## Bild-Test mit \`${report.model}\``);
  lines.push('');
  const passed = report.results.filter((entry) => entry.passed).length;
  const noScene = report.results.filter((entry) => entry.attempts.at(-1)?.noScene === true).length;
  const skipped = report.results.filter((entry) => entry.skipped !== undefined).length;
  lines.push(`**${passed} von ${total}** Szenen bestehen alle mechanischen Prüfungen${noScene + skipped > 0 ? `, ${noScene + skipped} ohne Szene (Farbfläche)` : ''}. Kosten **${usd(report.totalUsd)}**, Token: ${report.tokens.input} Anfrage (davon ${report.tokens.cacheRead} aus dem Zwischenspeicher gelesen, ${report.tokens.cacheWrite} hineingeschrieben), ${report.tokens.output} Antwort.`);
  if (report.stopped !== undefined) lines.push('', `> **Abgebrochen:** ${report.stopped}`);
  lines.push('');
  lines.push('Die Bilder liegen im Artefakt **bild-test** unten auf dieser Seite (PNG in Kartengröße 624 × 312 und als Daumennagel, dazu die SVG). Wie man es herunterlädt und ansieht: docs/bilder-plan.md, „Bilder ansehen“. „Tragfähig?“ entscheidet ein Mensch beim Ansehen.');
  lines.push('');
  lines.push('| Aktivität | Gewählte Szene | Prüfergebnis | Größe | Versuche | Token (Anfrage / Antwort) | Kosten | Figuren | Bild |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const entry of report.results) {
    const last = entry.attempts.at(-1);
    const result =
      entry.error !== undefined ? `Fehler: ${entry.error}`
      : entry.skipped !== undefined ? `keine Szene (ohne Anfrage): ${entry.skipped}`
      : entry.attempts.length === 0 ? 'nicht versucht (Lauf abgebrochen)'
      : entry.passed ? `bestanden${entry.attempts.length > 1 ? ` (im 2. Versuch; zuerst: ${(entry.attempts[0]?.problems ?? []).join(' ')})` : ''}`
      : last?.noScene ? `keine Szene: ${last.reason}${last.missingBlocks.length > 0 ? ` (fehlt: ${last.missingBlocks.join(', ')})` : ''}`
      : `nicht bestanden: ${(last?.problems ?? []).join(' ')}`;
    const scene = last === undefined || last.noScene ? '–' : describeScene(last.scene);
    const tokens = entry.attempts.map((a) => `${a.usage.input_tokens + a.usage.cache_creation_input_tokens + a.usage.cache_read_input_tokens} / ${a.usage.output_tokens}`).join(', ');
    const cost = entry.attempts.reduce((sum, a) => sum + a.costUsd, 0);
    const image = rendered.has(entry.id) ? `\`${entry.id}.png\`` : '–';
    lines.push(`| ${cell(entry.title)} (\`${entry.id}\`) | ${cell(scene)} | ${cell(result)} | ${entry.bytes === null ? '–' : kb(entry.bytes)} | ${entry.attempts.length} | ${tokens || '–'} | ${usd(cost)} | ${entry.figures.join(', ') || '–'} | ${image} |`);
  }
  lines.push('');
  lines.push('### Fehlende Bausteine (missingBlocks)');
  lines.push('');
  const missing = Object.entries(report.missingBlocks).sort(([a, x], [b, y]) => y.count - x.count || a.localeCompare(b));
  if (missing.length === 0) lines.push('Keine: Für jede Aktivität gab es die nötigen Bausteine (oder die KI hat keinen fehlenden genannt).');
  else {
    lines.push('Gezählt über den ganzen Lauf. „Prüfer“: Der Titel nennt den Gegenstand, es gibt keinen Baustein (vor dem Aufruf erkannt). „KI“: von der KI bei „keine Szene“ vorgeschlagen; Namen vorhandener Bausteine zählen nicht.');
    lines.push('');
    lines.push('| Baustein | Anzahl | Aktivitäten | gemeldet von |');
    lines.push('| --- | --- | --- | --- |');
    for (const [name, entry] of missing) lines.push(`| ${cell(name)} | ${entry.count} | ${entry.activities.map((id) => `\`${id}\``).join(', ')} | ${entry.sources.join(', ')} |`);
  }
  lines.push('');
  lines.push(`### Zähler der Figuren`);
  lines.push('');
  lines.push(`Keine Figur in mehr als 40 % der ${total} Bilder (höchstens ${report.results[0]?.casting.limit ?? '–'}). Rat und Zähler je Bild:`);
  lines.push('');
  lines.push('| Aktivität | Rat: Kind | gesperrt | gezeigt | Zähler danach |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const entry of report.results) {
    const blocked = entry.casting.blocked.map((item) => item.id).join(', ') || '–';
    lines.push(`| \`${entry.id}\` | ${entry.casting.kids.join(' → ') || '–'} | ${blocked} | ${entry.figures.join(', ') || '–'} | ${counterText(entry.counts, total)} |`);
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
