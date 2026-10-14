// KI-Wochenlauf (M9): der ganze Ablauf eines Laufs. Alle Verbindungen nach außen (Internet, Uhr, Ausgabe) kommen als Parameter herein,
// damit die Tests ihn mit gemockten Antworten durchspielen können. Ablauf und Regeln: docs/wochenlauf.md.
//
//   1. Einstellungen und Schlüssel prüfen. Fehlt etwas: Abbruch, bevor irgendetwas abgefragt wird.
//   2. Vorhandene Titel und offene Stichwort-Ideen bei Supabase lesen (nur lesen).
//   3. Bis zu 3 Aufrufe der KI. Vor JEDEM Aufruf: Aktivitäten zählen (Obergrenze MAX_ACTIVITIES), Zeit und Kosten prüfen.
//   4. Jeden Vorschlag prüfen (review.ts). Durchgefallene werden verworfen.
//   5. Status festlegen: approved nur mit automatischer Freigabe, ohne Auffälligkeit und ohne Qualitätsbremse; sonst draft.
//   6. Schreiben mit einem einzigen Aufruf (alles oder nichts). Im Trockenlauf nicht.
// Jeder Fehler beendet den Lauf, und es ist nichts geschrieben. Alle Ausgaben laufen durch den Filter für Schlüssel (redact.ts).

import { activityToRow } from '../../../src/features/activities/activityRow.ts';
import { ClaudeApiError, callClaude, type Usage } from './anthropic.ts';
import type { Catalog } from './catalog.ts';
import { buildCalendarHints } from './calendar.ts';
import { readConfig, type Env } from './config.ts';
import { actualUsd, estimateTokens, formatUsd, priceOf, typicalUsd, worstCaseUsd } from './cost.ts';
import type { FetchLike } from './http.ts';
import { defaultModel, limits as defaultLimits } from './limits.ts';
import { buildResponseSchema, buildSystemPrompt, buildUserPrompt, type ExistingTitle, type Idea } from './prompt.ts';
import { createRedactor } from './redact.ts';
import { renderReport, type MaterialSuggestion, type RunReport } from './report.ts';
import { reviewCandidates, type Accepted, type Rejected } from './review.ts';
import { countActiveActivities, fetchExistingTitles, fetchOpenIdeas, insertGeneratedActivities } from './supabaseAdmin.ts';

export type Limits = { [K in keyof typeof defaultLimits]: number };

export type RunDeps = {
  env: Env;
  argv: readonly string[];
  now: Date;
  fetchImpl: FetchLike;
  log: (line: string) => void; // eine Zeile in die Konsole (wird vorher gefiltert)
  catalog: Catalog;
  dataTitles: readonly ExistingTitle[]; // Titel aus data/ (gegen Dubletten, auch wenn sie nicht in der Datenbank stehen)
  dataActiveCount: number; // Anzahl approved + draft in data/ (nur für den Trockenlauf ohne Supabase)
  randomSuffix: () => string;
  limits?: Partial<Limits>; // nur für Tests (z. B. ein kurzes Zeitlimit)
};

export type RunResult = { exitCode: number; summary: string; report: RunReport };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSuggestions(raw: unknown): MaterialSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((s) => ({
      key: String(s.key ?? '').trim().slice(0, 60),
      de: String(s.de ?? '').trim().slice(0, 80),
      en: String(s.en ?? '').trim().slice(0, 80),
      reason: String(s.reason ?? '').trim().slice(0, 200),
    }))
    .filter((s) => s.key !== '')
    .slice(0, 10);
}

// Titel aus der Datenbank und aus data/ zusammen, jede ID einmal (die Datenbank gewinnt).
function mergeTitles(fromDb: readonly ExistingTitle[], fromData: readonly ExistingTitle[]): ExistingTitle[] {
  const ids = new Set(fromDb.map((t) => t.id));
  return [...fromDb, ...fromData.filter((t) => !ids.has(t.id))];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runWeekly(deps: RunDeps): Promise<RunResult> {
  const lim: Limits = { ...defaultLimits, ...deps.limits };
  const redact = createRedactor([deps.env.ANTHROPIC_API_KEY, deps.env.SUPABASE_SECRET_KEY]);
  const log = (line: string) => deps.log(redact(line));
  const startedAt = Date.now();
  const remainingMs = () => lim.runTimeoutMs - (Date.now() - startedAt);

  const configResult = readConfig(deps.env, deps.argv, deps.now, deps.randomSuffix);
  const report: RunReport = {
    outcome: 'aborted',
    reason: null,
    dryRun: deps.argv.includes('--dry-run'),
    autoApprove: false,
    model: configResult.ok ? configResult.config.model : deps.env.ANTHROPIC_MODEL?.trim() || defaultModel,
    batchId: configResult.ok ? configResult.config.batchId : '-',
    approved: [],
    drafts: [],
    rejected: [],
    generated: 0,
    qualityBrake: false,
    materialSuggestions: [],
    ideasUsed: [],
    db: { count: null, max: configResult.ok ? configResult.config.maxActivities : defaultLimits.defaultMaxActivities, source: 'Supabase' },
    cost: { calls: 0, inputTokens: 0, outputTokens: 0, actualUsd: 0, typicalUsd: null, worstUsd: null },
    warnings: [],
    notes: [],
  };

  const finish = (exitCode: number): RunResult => {
    const summary = redact(renderReport(report));
    return { exitCode, summary, report };
  };
  const abort = (reason: string): RunResult => {
    report.outcome = 'aborted';
    report.reason = `${reason} Es wurde nichts in die Datenbank geschrieben.`;
    log(`::error title=Wochenlauf abgebrochen::${report.reason}`);
    return finish(1);
  };

  // 1. Einstellungen und Schlüssel
  if (!configResult.ok) return abort(`Einstellungen fehlen oder sind falsch: ${configResult.problems.join(' · ')}.`);
  const { config } = configResult;
  report.autoApprove = config.autoApprove;
  report.notes.push(...configResult.notes);
  for (const note of configResult.notes) log(note);

  const price = priceOf(config.model);
  if (!price) return abort(`Für das Modell „${config.model}“ ist kein Preis hinterlegt (scripts/lib/weekly/cost.ts). Ohne Preis greift die Kosten-Obergrenze nicht.`);

  log(`Lauf ${config.batchId}: ${config.dryRun ? 'Trockenlauf' : 'echter Lauf'}, automatische Freigabe ${config.autoApprove ? 'an' : 'aus'}, Modell ${config.model}.`);

  // 2. Vorhandene Titel und Stichwort-Ideen
  let existing: ExistingTitle[] = [...deps.dataTitles];
  let ideas: Idea[] = [];
  if (config.supabase) {
    try {
      existing = mergeTitles(await fetchExistingTitles(config.supabase, deps.fetchImpl), deps.dataTitles);
      ideas = await fetchOpenIdeas(config.supabase, deps.fetchImpl, lim.maxIdeasPerCall);
    } catch (error) {
      return abort(errorText(error));
    }
  } else {
    report.db.source = 'data/';
  }
  log(`Vorhandene Titel: ${existing.length}, offene Stichwort-Ideen: ${ideas.length}.`);

  const calendar = buildCalendarHints(deps.now);
  const system = buildSystemPrompt(deps.catalog);
  const schema = buildResponseSchema(deps.catalog);
  const schemaText = JSON.stringify(schema);
  const countNow = async () => (config.supabase ? countActiveActivities(config.supabase, deps.fetchImpl) : deps.dataActiveCount);

  const accepted: Accepted[] = [];
  const rejected: Rejected[] = [];
  const addUsage = (usage: Usage) => {
    report.cost.actualUsd += actualUsd(price, usage);
    report.cost.inputTokens += usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
    report.cost.outputTokens += usage.output_tokens;
  };

  // 3. und 4. Höchstens lim.maxApiCalls Aufrufe, fest gezählt
  for (let call = 1; call <= lim.maxApiCalls; call += 1) {
    if (remainingMs() <= 0) return abort(`Zeitlimit von ${Math.round(lim.runTimeoutMs / 60_000)} Minuten erreicht.`);

    let count: number;
    try {
      count = await countNow();
    } catch (error) {
      return abort(errorText(error));
    }
    report.db.count = count;
    const room = config.maxActivities - count - accepted.length;
    if (room <= 0) {
      if (call === 1) {
        report.outcome = 'capReached';
        report.reason =
          `In der Datenbank stehen ${count.toLocaleString('de-DE')} Aktivitäten mit Status approved oder draft, die Obergrenze MAX_ACTIVITIES ist ${config.maxActivities.toLocaleString('de-DE')}. ` +
          'Die KI wurde nicht aufgerufen, es wurde nichts geschrieben. Entweder Aktivitäten auf rejected setzen oder die Obergrenze bewusst anheben (docs/wochenlauf.md).';
        log(`::error title=Obergrenze erreicht::${report.reason}`);
        return finish(1);
      }
      report.warnings.push('Die Obergrenze MAX_ACTIVITIES ist mit diesem Lauf erreicht, deshalb kein weiterer Aufruf der KI.');
      break;
    }

    const want = Math.min(lim.targetPerRun - accepted.length, room, lim.maxActivitiesPerRun - report.generated);
    if (want <= 0) break;
    if (room < lim.targetPerRun - accepted.length) {
      report.warnings.push(`Die Obergrenze MAX_ACTIVITIES ist fast erreicht: höchstens ${room} neue Aktivität(en) passen noch hinein, deshalb nur so viele angefragt.`);
    }

    const prompt = buildUserPrompt({
      count: want,
      calendar,
      ideas,
      existing,
      categories: deps.catalog.categories,
      soFar: { acceptedTitles: accepted.map((a) => a.activity.translations.de.title), rejected },
    });
    const promptTokens = estimateTokens(system + prompt + schemaText);
    const worst = worstCaseUsd(price, promptTokens, lim.maxOutputTokens);
    if (call === 1) {
      report.cost.typicalUsd = typicalUsd(price, promptTokens, want);
      report.cost.worstUsd = worst;
      log(
        `Kostenschätzung: üblich etwa ${formatUsd(report.cost.typicalUsd)} pro Aufruf, schlimmster Fall ${formatUsd(worst)} pro Aufruf, ` +
          `höchstens ${lim.maxApiCalls} Aufrufe (Obergrenze MAX_COST_USD ${formatUsd(config.maxCostUsd)}).`,
      );
    }
    if (report.cost.actualUsd + worst > config.maxCostUsd) {
      const text = `Der schlimmste Fall des nächsten Aufrufs (${formatUsd(worst)}) würde die Kosten-Obergrenze MAX_COST_USD (${formatUsd(config.maxCostUsd)}) überschreiten.`;
      if (call === 1) return abort(`${text} Die KI wurde nicht aufgerufen.`);
      report.warnings.push(`${text} Kein weiterer Aufruf.`);
      break;
    }

    report.cost.calls += 1;
    log(`Aufruf ${call} von höchstens ${lim.maxApiCalls}: bitte um ${want} Aktivität(en) …`);
    let result;
    try {
      result = await callClaude(
        { apiKey: config.anthropicKey, model: config.model, system, prompt, schema, maxTokens: lim.maxOutputTokens },
        deps.fetchImpl,
        remainingMs(),
      );
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        if (error.usage) addUsage(error.usage);
        if (error.kind === 'billing') return abort(`Lauf gestoppt, weil das Guthaben bei Anthropic leer ist: ${error.message}. Bitte Guthaben aufladen (docs/wochenlauf.md, „Wenn etwas schiefgeht“).`);
        if (error.kind === 'limit') return abort(`Lauf gestoppt, weil ein Limit bei Anthropic erreicht ist: ${error.message}. Später erneut starten oder das Limit in der Anthropic Console prüfen.`);
      }
      return abort(`Claude API, Aufruf ${call}: ${errorText(error)}.`);
    }
    addUsage(result.usage);

    const data = isRecord(result.data) ? result.data : {};
    const items = Array.isArray(data.activities) ? data.activities : [];
    if (items.length > want) {
      report.warnings.push(`Aufruf ${call}: Die KI hat ${items.length} statt ${want} Aktivitäten geliefert, die übrigen ${items.length - want} wurden nicht beachtet.`);
    }
    const batch = items.slice(0, want);
    report.generated += batch.length;
    report.materialSuggestions.push(...readSuggestions(data.newMaterialSuggestions));

    const reviewed = reviewCandidates(
      batch,
      { existing, allergenNames: deps.catalog.allergenNames, openIdeaIds: new Set(ideas.map((i) => i.id)), createdAt: deps.now.toISOString() },
      accepted,
    );
    accepted.push(...reviewed.accepted);
    rejected.push(...reviewed.rejected);
    log(`Aufruf ${call}: ${batch.length} erhalten, ${reviewed.accepted.length} bestanden, ${reviewed.rejected.length} verworfen.`);

    if (accepted.length >= lim.minWantedPerRun) break;
  }

  // 5. Status: approved nur mit automatischer Freigabe, ohne Auffälligkeit und ohne Qualitätsbremse
  report.rejected = rejected;
  report.qualityBrake = report.generated > 0 && accepted.length * 2 < report.generated;
  if (report.qualityBrake) {
    const text =
      `Qualitätsbremse: Nur ${accepted.length} von ${report.generated} Vorschlägen haben die Prüfungen bestanden (weniger als die Hälfte). ` +
      'Der ganze Lauf bleibt Entwurf (draft), nichts wird automatisch freigegeben. Bitte die Gründe unten ansehen.';
    report.warnings.unshift(text);
    log(`::warning title=Qualitätsbremse::${text}`);
  }
  const mayApprove = config.autoApprove && !report.qualityBrake;
  for (const item of accepted) {
    const approve = mayApprove && item.flags.length === 0;
    const final: Accepted = { ...item, activity: { ...item.activity, status: approve ? 'approved' : 'draft' } };
    (approve ? report.approved : report.drafts).push(final);
  }
  const all = [...report.approved, ...report.drafts];
  report.ideasUsed = [...new Set(all.map((a) => a.ideaId).filter((id): id is number => id !== null))];
  const rows = all.map((a) => activityToRow(a.activity));

  if (config.dryRun) {
    report.outcome = 'dryRun';
    log(`Trockenlauf: ${all.length} Aktivität(en) würden geschrieben. Vollständige Daten:`);
    log(JSON.stringify(all.map((a) => ({ ...a.activity, flags: a.flags, ideaId: a.ideaId })), null, 2));
    return finish(0);
  }

  if (all.length === 0) {
    report.outcome = 'nothingToWrite';
    report.warnings.push('Keine Aktivität hat die Prüfungen bestanden, es wurde nichts geschrieben.');
    log('::warning title=Wochenlauf::Keine Aktivität hat die Prüfungen bestanden, es wurde nichts geschrieben.');
    return finish(0);
  }

  // 6. Schreiben, alles oder nichts
  if (!config.supabase) return abort('Kein Supabase-Zugang.');
  if (remainingMs() <= 0) return abort(`Zeitlimit von ${Math.round(lim.runTimeoutMs / 60_000)} Minuten erreicht.`);
  try {
    const written = await insertGeneratedActivities(config.supabase, deps.fetchImpl, {
      rows,
      ideaIds: report.ideasUsed,
      batchId: config.batchId,
      maxTotal: config.maxActivities,
    });
    report.db.count = (report.db.count ?? 0) + written;
    report.outcome = 'written';
    log(`Geschrieben: ${written} Aktivität(en) im Lauf ${config.batchId}.`);
  } catch (error) {
    return abort(`Schreiben fehlgeschlagen, die Datenbank hat den ganzen Lauf abgelehnt: ${errorText(error)}.`);
  }
  return finish(0);
}
