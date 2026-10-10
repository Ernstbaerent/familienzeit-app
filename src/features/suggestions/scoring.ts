// Gewichtung: bestimmt nur die Reihenfolge, schließt nie etwas aus („Sortieren statt aussortieren“).
// Höhere Punktzahl = weiter vorn. Ausgeschlossen wird nur in exclusions.ts.

import type { Activity, ActivityEnergy } from '../activities/activities';
import type { ParentEnergy } from './conditions';
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
} as const;

export function scoreActivity(activity: Activity, request: SuggestionRequest): number {
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

  if (request.parentEnergy) {
    score += weights.parentEnergy[request.parentEnergy][activity.energy];
  }

  score += activity.cost * weights.costPerLevel;

  if (request.children.length > 1 && activity.siblingFriendly) {
    score += weights.siblingFriendly;
  }

  return score;
}
