// KI-Wochenlauf (M9): Prüft jeden Vorschlag der KI mit derselben Prüflogik wie `npm run activities:check`:
//   1. Form (parseActivity: Pflichtfelder, bekannte Schlüssel, nur Material aus materials.ts, de + en vollständig),
//   2. Sicherheits-Checkliste (checkSafety, Punkte 1 bis 7),
//   3. zusätzliche Regeln für KI-Aktivitäten (Länge, Zahl der Schritte, Dauer),
//   4. Dubletten (gleicher Titel auf Deutsch oder Englisch, gleiche ID; gegen Datenbank, data/ und den eigenen Lauf).
// Wer durchfällt, wird verworfen (mit Grund). Wer besteht, wird angenommen; Auffälligkeiten (flags.ts) und sehr ähnliche Titel
// verhindern nur die automatische Freigabe. Status, Quelle, Zeitpunkt und ID setzt das Skript, nie die KI. Reine Funktionen.

import { parseActivity, type Activity } from '../../../src/features/activities/activities.ts';
import { checkSafety, type AllergenNames } from '../../../src/features/activities/safetyCheck.ts';
import { detectFlags } from './flags.ts';
import type { ExistingTitle } from './prompt.ts';

export type Accepted = { activity: Activity; ideaId: number | null; flags: string[] };
export type Rejected = { title: string; reasons: string[] };

export type ReviewContext = {
  existing: readonly ExistingTitle[]; // Datenbank und data/
  allergenNames: AllergenNames;
  openIdeaIds: ReadonlySet<number>;
  createdAt: string; // ISO-Zeitpunkt für alle Aktivitäten des Laufs
};

const maxTitleLength = 60;
const minSteps = 2;
const maxSteps = 12;
const maxIdLength = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Für den Vergleich von Titeln: klein, ohne Akzente und Umlaut-Punkte, ß → ss, nur Buchstaben und Ziffern.
// So sind „Sockenpuppen-Theater“, „Sockenpuppentheater“ und „sockenpuppen theater“ gleich.
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const stopWords = new Set([
  'der', 'die', 'das', 'und', 'mit', 'aus', 'ein', 'eine', 'einem', 'einer', 'im', 'am', 'vom', 'zum', 'zur', 'fur', 'auf', 'den', 'dem',
  'the', 'and', 'with', 'from', 'for', 'your', 'own', 'make', 'a', 'an', 'of', 'in', 'on', 'at', 'to',
]);

function titleWords(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
  return new Set(words);
}

// Sehr ähnlich, aber nicht gleich: viele gemeinsame Wörter, oder ein Titel steckt ganz im anderen (z. B. „Vulkan“ in „Natron-Vulkan“).
export function areTitlesSimilar(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length >= 6 && longer.includes(shorter)) return true;
  const wa = titleWords(a);
  const wb = titleWords(b);
  const shared = [...wa].filter((word) => wb.has(word)).length;
  const union = new Set([...wa, ...wb]).size;
  return shared >= 2 && union > 0 && shared / union >= 0.6;
}

// Kennung aus dem englischen Titel: „Chestnut Hedgehogs“ → „chestnut-hedgehogs“.
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= maxIdLength) return slug;
  const cut = slug.slice(0, maxIdLength);
  return cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut;
}

function readTextBlock(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const safetyNote = trimText(raw.safetyNote);
  return {
    title: trimText(raw.title),
    summary: trimText(raw.summary),
    steps: Array.isArray(raw.steps) ? raw.steps.map(trimText) : raw.steps,
    ...(typeof safetyNote === 'string' && safetyNote !== '' ? { safetyNote } : {}),
  };
}

// Macht aus einem Vorschlag der KI den Rohwert einer Aktivität (Form wie in data/*.json). Geprüft wird danach mit parseActivity.
// Nur bekannte Felder werden übernommen; `image` gibt es nie (Bilder kommen mit M9b).
export function candidateToActivityInput(raw: Record<string, unknown>, meta: { id: string; createdAt: string }): Record<string, unknown> {
  const dayParts = Array.isArray(raw.dayParts) && raw.dayParts.length > 0 ? { dayParts: raw.dayParts } : {};
  const months = Array.isArray(raw.months) && raw.months.length > 0 ? { months: raw.months } : {};
  return {
    id: meta.id,
    status: 'draft',
    source: 'ai',
    createdAt: meta.createdAt,
    category: raw.category,
    topics: raw.topics,
    ageMin: raw.ageMin,
    ageMax: raw.ageMax,
    durationMin: raw.durationMin,
    durationMax: raw.durationMax,
    setting: raw.setting,
    weather: { needsDry: raw.needsDry, betterInSun: raw.betterInSun },
    ...dayParts,
    ...months,
    energy: raw.energy,
    cost: raw.cost,
    materials: raw.materials,
    siblingFriendly: raw.siblingFriendly,
    translations: { de: readTextBlock(raw.de), en: readTextBlock(raw.en) },
  };
}

function candidateTitle(raw: unknown): string {
  if (!isRecord(raw)) return '(kein Objekt)';
  const de = isRecord(raw.de) && typeof raw.de.title === 'string' ? raw.de.title.trim() : '';
  const en = isRecord(raw.en) && typeof raw.en.title === 'string' ? raw.en.title.trim() : '';
  return de || en || '(ohne Titel)';
}

// Zusätzliche Regeln nur für KI-Aktivitäten (über die Form hinaus).
function extraRules(activity: Activity): string[] {
  const problems: string[] = [];
  for (const [language, text] of Object.entries(activity.translations)) {
    if (text.title.length > maxTitleLength) problems.push(`Titel (${language}) länger als ${maxTitleLength} Zeichen`);
    if (text.steps.length < minSteps || text.steps.length > maxSteps) {
      problems.push(`Schritte (${language}): ${minSteps} bis ${maxSteps} erwartet, sind ${text.steps.length}`);
    }
  }
  if (activity.translations.de.steps.length !== activity.translations.en.steps.length) {
    problems.push('Deutsch und Englisch haben verschieden viele Schritte');
  }
  if (activity.topics.length === 0) problems.push('topics: mindestens ein Thema erwartet');
  return problems;
}

export type ReviewResult = { accepted: Accepted[]; rejected: Rejected[] };

// Prüft die Vorschläge eines Aufrufs. `already` sind die in diesem Lauf schon angenommenen (für Dubletten im Lauf).
export function reviewCandidates(candidates: readonly unknown[], context: ReviewContext, already: readonly Accepted[]): ReviewResult {
  const accepted: Accepted[] = [];
  const rejected: Rejected[] = [];

  const knownIds = new Set(context.existing.map((t) => t.id));
  const knownTitles = new Map<string, string>(); // normalisierter Titel → Original
  for (const t of context.existing) {
    for (const title of [t.de, t.en]) if (title && normalizeTitle(title)) knownTitles.set(normalizeTitle(title), title);
  }
  const runSoFar = () => [...already, ...accepted];

  for (const raw of candidates) {
    const title = candidateTitle(raw);
    if (!isRecord(raw)) {
      rejected.push({ title, reasons: ['Eintrag ist kein Objekt'] });
      continue;
    }
    const enTitle = isRecord(raw.en) && typeof raw.en.title === 'string' ? raw.en.title : '';
    const id = slugify(enTitle || title);
    if (!id) {
      rejected.push({ title, reasons: ['Kein Titel, aus dem sich eine ID bilden lässt'] });
      continue;
    }

    // 1. Form, mit derselben Prüfung wie data/ (imagePrefix null: kein Bild erlaubt)
    const parsed = parseActivity(candidateToActivityInput(raw, { id, createdAt: context.createdAt }), { imagePrefix: null });
    if (!parsed.ok) {
      rejected.push({ title, reasons: parsed.problems.map((p) => `Form: ${p}`) });
      continue;
    }
    const activity = parsed.activity;

    // 2. Sicherheits-Checkliste, 3. Zusatzregeln
    const problems = [...checkSafety(activity, context.allergenNames).map((p) => `Checkliste ${p}`), ...extraRules(activity)];

    // 4. Dubletten
    const inRun = runSoFar();
    if (knownIds.has(id) || inRun.some((a) => a.activity.id === id)) problems.push(`Dublette: die ID „${id}“ gibt es schon`);
    for (const language of ['de', 'en']) {
      const key = normalizeTitle(activity.translations[language].title);
      const known = knownTitles.get(key);
      const sameRun = inRun.find((a) => normalizeTitle(a.activity.translations[language].title) === key);
      if (known) problems.push(`Dublette: Titel (${language}) gibt es schon („${known}“)`);
      else if (sameRun) problems.push(`Dublette: Titel (${language}) steht schon in diesem Lauf`);
    }

    if (problems.length > 0) {
      rejected.push({ title, reasons: [...new Set(problems)] });
      continue;
    }

    // Auffälligkeiten: angenommen, aber nie automatisch freigegeben
    const flags = detectFlags(activity);
    const comparable = [
      ...context.existing.map((t) => ({ de: t.de, en: t.en })),
      ...inRun.map((a) => ({ de: a.activity.translations.de.title, en: a.activity.translations.en.title })),
    ];
    const similar = comparable.find(
      (other) => areTitlesSimilar(activity.translations.de.title, other.de) || areTitlesSimilar(activity.translations.en.title, other.en),
    );
    if (similar) flags.push(`Titel sehr ähnlich wie „${similar.de || similar.en}“ (mögliche Dublette)`);

    const ideaId = typeof raw.ideaId === 'number' && context.openIdeaIds.has(raw.ideaId) ? raw.ideaId : null;
    accepted.push({ activity, ideaId, flags });
  }
  return { accepted, rejected };
}
