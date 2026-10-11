// Gewichtung: bestimmt nur die Reihenfolge, schließt nie etwas aus („Sortieren statt aussortieren“).
// Höhere Punktzahl = weiter vorn. Ausgeschlossen wird nur in exclusions.ts.

import type { Activity, ActivityEnergy } from '../activities/activities';
import type { ParentEnergy } from './conditions';
import type { HistoryIndex } from './historyIndex';
import type { SuggestionRequest } from './request';

// Alle Gewichte an einer Stelle, damit man sie leicht nachjustieren kann.
// Faustregel: Ein Punkt Unterschied entscheidet nur zwischen sonst gleich guten Ideen.
export const weights = {
  interest: 3, // je Thema der Aktivität, das mindestens ein Kind mag
  dislike: -4, // je Thema, das mindestens ein Kind nicht mag
  betterInSun: 2, // bei Sonne: Aktivität ist bei Sonne schöner
  siblingFriendly: 2, // mehrere Kinder dabei und Aktivität ist geschwistertauglich
  costPerLevel: -1, // je Kostenstufe (0 = kostenlos, 1 = wenig, 2 = mehr)
  // Energie der Eltern → Punkte je nach Energie, die die Aktivität braucht. Ohne Angabe: 0.
  parentEnergy: {
    tired: { low: 2, medium: 0, high: -4 },
    normal: { low: 0, medium: 0, high: -1 },
    fit: { low: 0, medium: 0, high: 1 },
  } satisfies Record<ParentEnergy, Record<ActivityEnergy, number>>,
  // Abwechslung in einer Dreiergruppe: Abzug je Aktivität derselben Kategorie, die schon in der Gruppe ist.
  // So hoch, dass Abwechslung meist gewinnt, aber eine Abneigung nicht überspielt (siehe suggest.ts).
  sameCategory: -5,
  // Große Hitze oder Frost in der Zeitspanne: Aktivitäten draußen rutschen nach hinten (kein Ausschluss).
  // `both` kann man drinnen machen, deshalb nur ein kleiner Abzug. Drinnen bleibt unverändert.
  extremeTemperature: { outdoor: -4, both: -1, indoor: 0 },
  // Verlauf (M7, siehe docs/history.md). Tage sind Kalendertage nach Ortszeit, 0 = heute, 1 = gestern.
  // Zählt je Aktivität nur der letzte Eintrag (kein Aufsummieren bei häufig Gemachtem).
  history: {
    // Kürzlich gemacht rutscht nach hinten: In den ersten Tagen voll, danach linear abklingend bis auf 0.
    recentlyDone: {
      penalty: -10, // Abzug in den ersten Tagen
      fullDays: 3, // bis einschließlich Tag 3 voller Abzug (Tag 0–3)
      fadeEndDay: 28, // ab Tag 28 kein Abzug mehr (Tag 7 ≈ −8, Tag 14 ≈ −6, Tag 21 ≈ −3)
    },
    // Daumen runter schiebt genau diese Aktivität deutlich nach hinten, für lange Zeit. Kein Ausschluss.
    thumbsDown: {
      penalty: -20,
      days: 90, // gilt an Tag 0 bis 89
    },
    // Daumen hoch: kleiner Bonus für diese Aktivität nach einer Wartezeit (vorher gilt „kürzlich gemacht“)
    // und für ihre Kategorie (sofort, auch für andere Aktivitäten dieser Kategorie, nicht aufsummiert).
    thumbsUp: {
      activityBonus: 3,
      waitDays: 14, // Bonus erst ab Tag 14
      categoryBonus: 1,
      days: 180, // beides gilt bis Tag 179
    },
  },
} as const;

// Grenzen für „große Hitze“ und „Frost“ in °C. Ab 30 °C heißt beim Deutschen Wetterdienst „Hitzetag“.
export const heatFromCelsius = 30;
export const frostUpToCelsius = 0;

// true, wenn es in der Zeitspanne mindestens 30 °C heiß wird oder friert.
export function hasExtremeTemperature(temperature: SuggestionRequest['temperature']): boolean {
  if (!temperature) return false;
  return temperature.max >= heatFromCelsius || temperature.min <= frostUpToCelsius;
}

// Abzug für „kürzlich gemacht“ je nach Anzahl Kalendertage seit dem letzten Mal.
export function recentlyDonePenalty(daysAgo: number): number {
  const { penalty, fullDays, fadeEndDay } = weights.history.recentlyDone;
  if (daysAgo <= fullDays) return penalty;
  if (daysAgo >= fadeEndDay) return 0;
  return (penalty * (fadeEndDay - daysAgo)) / (fadeEndDay - fullDays);
}

// Punkte aus dem Verlauf: kürzlich Gemachtes nach hinten, Daumen runter deutlich nach hinten,
// Daumen hoch (nach der Wartezeit) und seine Kategorie ein wenig nach vorn.
export function scoreHistory(activity: Activity, history: HistoryIndex): number {
  const { thumbsDown, thumbsUp } = weights.history;
  let score = 0;

  const lastDone = history.lastDoneDaysAgo.get(activity.id);
  if (lastDone !== undefined) score += recentlyDonePenalty(lastDone);

  const rated = history.rating.get(activity.id);
  if (rated?.rating === 'down' && rated.daysAgo < thumbsDown.days) {
    score += thumbsDown.penalty;
  }
  if (rated?.rating === 'up' && rated.daysAgo >= thumbsUp.waitDays && rated.daysAgo < thumbsUp.days) {
    score += thumbsUp.activityBonus;
  }

  const likedDaysAgo = history.likedCategoryDaysAgo.get(activity.category);
  if (likedDaysAgo !== undefined && likedDaysAgo < thumbsUp.days) {
    score += thumbsUp.categoryBonus;
  }

  return score;
}

// `history` kommt von suggest(), das den Verlauf einmal pro Anfrage auswertet (buildHistoryIndex).
export function scoreActivity(
  activity: Activity,
  request: SuggestionRequest,
  history?: HistoryIndex,
): number {
  let score = 0;

  // Interessen und Abneigungen aller ausgewählten Kinder.
  // Mag ein Kind ein Thema und ein anderes nicht, zählt beides.
  for (const topic of activity.topics) {
    if (request.children.some((child) => (child.interests as readonly string[]).includes(topic))) {
      score += weights.interest;
    }
    if (request.children.some((child) => child.dislikes.includes(topic))) {
      score += weights.dislike;
    }
  }

  // Wetter-Eignung. Regen und Gewitter schließen schon in exclusions.ts aus, was trocken sein muss.
  if (request.weather === 'sunny' && activity.weather.betterInSun) {
    score += weights.betterInSun;
  }

  if (hasExtremeTemperature(request.temperature)) {
    score += weights.extremeTemperature[activity.setting];
  }

  if (request.parentEnergy) {
    score += weights.parentEnergy[request.parentEnergy][activity.energy];
  }

  score += activity.cost * weights.costPerLevel;

  if (request.children.length > 1 && activity.siblingFriendly) {
    score += weights.siblingFriendly;
  }

  if (history) score += scoreHistory(activity, history);

  return score;
}
