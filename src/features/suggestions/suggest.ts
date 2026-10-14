// Vorschläge: aus allen Aktivitäten die passenden finden, sortieren und in Dreiergruppen aufteilen.
// Reine Funktionen ohne UI. Tests: suggest.test.ts.

import type { Activity } from '../activities/activities';
import { isExcluded } from './exclusions';
import { buildHistoryIndex } from './historyIndex';
import type { SuggestionRequest } from './request';
import { scoreActivity, weights } from './scoring';

// Immer genau 3 Vorschläge auf einmal (Produktprinzip „30 Sekunden“).
export const suggestionsPerPage = 3;

export type Suggestions = {
  // Dreiergruppen in der Reihenfolge, in der „Andere Vorschläge“ sie zeigt.
  // Jede Gruppe hat genau 3 Aktivitäten. Nur wenn insgesamt weniger als 3 passen,
  // gibt es eine einzige kürzere Gruppe (oder gar keine).
  pages: Activity[][];
  // Wie viele Aktivitäten überhaupt passen (nach den harten Ausschlüssen).
  matchCount: number;
};

export type ScoredActivity = { activity: Activity; score: number };

// Die passenden Aktivitäten (nach den harten Ausschlüssen), beste zuerst. Auch für die Mischung mit Orten (mix.ts).
export function rankActivities(activities: readonly Activity[], request: SuggestionRequest): ScoredActivity[] {
  // Der Verlauf kommt erst nach den harten Ausschlüssen ins Spiel und ändert nur die Punkte.
  // Deshalb bleibt die Menge der passenden Ideen (und die Garantie „3, wenn so viele passen“) gleich.
  const history =
    request.history && request.history.length > 0
      ? buildHistoryIndex(request.history, activities, request.now)
      : undefined;

  return (
    activities
      .filter((activity) => !isExcluded(activity, request))
      .map((activity) => ({ activity, score: scoreActivity(activity, request, history) }))
      // Bei gleicher Punktzahl bleibt die Reihenfolge aus den Daten (sort ist stabil).
      .sort((a, b) => b.score - a.score)
  );
}

export function suggest(activities: readonly Activity[], request: SuggestionRequest): Suggestions {
  const sorted = rankActivities(activities, request);
  return { pages: buildPages(sorted), matchCount: sorted.length };
}

// Die Gruppe, die nach `pageIndex`-mal „Andere Vorschläge“ erscheint.
// Nach der letzten Gruppe geht es wieder von vorn los (kein Endlos-Feed, nur eine Runde).
// Gilt für Gruppen aus Aktivitäten (suggest) wie für gemischte Gruppen mit Orten (mix.ts).
export function getPage<T>(suggestions: { pages: readonly T[][] }, pageIndex: number): T[] {
  if (suggestions.pages.length === 0) return [];
  return suggestions.pages[pageIndex % suggestions.pages.length];
}

// true, wenn alle Gruppen gezeigt wurden und jetzt wieder die erste kommt.
export function isStartingOver(suggestions: { pages: readonly unknown[] }, pageIndex: number): boolean {
  return pageIndex > 0 && pageIndex % Math.max(suggestions.pages.length, 1) === 0;
}

export type Tip = 'fewerChildren' | 'moreTime';

// Tipps für den Hinweis bei weniger als 3 Ideen: nur, was wirklich zu mehr passenden Ideen führt.
// Die Sicherheitsregeln bleiben dabei unverändert, es geht nur darum, was man an der Auswahl ändern kann.
// `longestMinutes` = längste wählbare Zeit (halber Tag).
export function getTips(
  activities: readonly Activity[],
  request: SuggestionRequest,
  longestMinutes: number,
): Tip[] {
  const countMatches = (changed: SuggestionRequest) =>
    activities.filter((activity) => !isExcluded(activity, changed)).length;
  const current = countMatches(request);
  const tips: Tip[] = [];

  // Mit nur einem der Kinder würde mehr passen (z. B. Baby und Teenager)?
  const oneChildHelps = request.children.some(
    (child) => countMatches({ ...request, children: [child] }) > current,
  );
  if (request.children.length > 1 && oneChildHelps) tips.push('fewerChildren');

  if (
    request.availableMinutes < longestMinutes &&
    countMatches({ ...request, availableMinutes: longestMinutes }) > current
  ) {
    tips.push('moreTime');
  }
  return tips;
}

// Teilt die sortierte Liste in Dreiergruppen. Jede Gruppe soll abwechslungsreich sein:
// Pro Platz gewinnt die Aktivität mit der höchsten Punktzahl, wobei jede schon gewählte
// Aktivität derselben Kategorie Abzug bringt (weights.sameCategory).
function buildPages(sorted: ScoredActivity[]): Activity[][] {
  const remaining = [...sorted];
  const pages: Activity[][] = [];
  while (remaining.length > 0) {
    const page: Activity[] = [];
    while (page.length < suggestionsPerPage && remaining.length > 0) {
      const [picked] = remaining.splice(pickBest(remaining, page), 1);
      page.push(picked.activity);
    }
    pages.push(page);
  }

  // Ist die letzte Gruppe nicht voll (z. B. 8 passende = 3 + 3 + 2), wird sie mit den besten
  // Ideen aus den anderen Gruppen aufgefüllt. So erscheinen immer genau 3 Vorschläge.
  const last = pages[pages.length - 1];
  if (pages.length > 1 && last.length < suggestionsPerPage) {
    const fillers = sorted.filter((candidate) => !last.includes(candidate.activity));
    while (last.length < suggestionsPerPage) {
      const [picked] = fillers.splice(pickBest(fillers, last), 1);
      last.push(picked.activity);
    }
  }
  return pages;
}

// Index der besten Aktivität in `pool` für eine Gruppe, in der `group` schon steht.
// Bei Gleichstand gewinnt die weiter vorn stehende.
export function pickBest(pool: ScoredActivity[], group: readonly Activity[]): number {
  let bestIndex = 0;
  let bestValue = -Infinity;
  pool.forEach((candidate, index) => {
    const repeats = group.filter((chosen) => chosen.category === candidate.activity.category).length;
    const value = candidate.score + repeats * weights.sameCategory;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  });
  return bestIndex;
}
