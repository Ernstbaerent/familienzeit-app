// Aus dem Verlauf werden einmal pro Anfrage die Fakten herausgesucht, die die Gewichtung braucht
// (wann zuletzt gemacht, welche Bewertung gilt, welche Kategorie wurde gemocht).
// Reine Funktionen ohne UI. Wie diese Fakten die Reihenfolge ändern, steht in scoring.ts (`weights.history`).
// Der Verlauf ändert nur die Reihenfolge, nie die Auswahl.

import { calendarDaysBetween } from '@/lib/calendarDays';

import type { Activity, ActivityCategory } from '../activities/activities';
import type { HistoryEntry, Rating } from '../history/history';

export type HistoryIndex = {
  // Aktivität → vor wie vielen Kalendertagen sie zuletzt gemacht wurde (0 = heute).
  lastDoneDaysAgo: ReadonlyMap<string, number>;
  // Aktivität → die letzte Bewertung (die neueste mit Daumen) und wie viele Kalendertage sie her ist.
  // Eine neuere Bewertung überschreibt ältere. Ein neuerer Eintrag ohne Bewertung ändert daran nichts.
  rating: ReadonlyMap<string, { rating: Rating; daysAgo: number }>;
  // Kategorie → vor wie vielen Kalendertagen zuletzt eine Aktivität dieser Kategorie Daumen hoch bekam.
  // Es zählt nur die gültige Bewertung je Aktivität (ein späteres Daumen runter hebt ein früheres hoch auf).
  likedCategoryDaysAgo: ReadonlyMap<ActivityCategory, number>;
};

export function buildHistoryIndex(
  history: readonly HistoryEntry[],
  activities: readonly Activity[],
  now: Date,
): HistoryIndex {
  const categoryOf = new Map(activities.map((activity) => [activity.id, activity.category]));

  const latest = new Map<string, number>(); // Aktivität → Zeitpunkt des letzten Mals
  const latestRated = new Map<string, { time: number; rating: Rating }>();
  for (const entry of history) {
    const time = Date.parse(entry.doneAt);
    if (Number.isNaN(time)) continue; // kaputte Einträge räumt schon das Laden auf, das ist nur ein Sicherheitsnetz

    if (time >= (latest.get(entry.activityId) ?? -Infinity)) latest.set(entry.activityId, time);
    if (entry.rating && time >= (latestRated.get(entry.activityId)?.time ?? -Infinity)) {
      latestRated.set(entry.activityId, { time, rating: entry.rating });
    }
  }

  const daysAgo = (time: number) => calendarDaysBetween(new Date(time), now);

  const lastDoneDaysAgo = new Map<string, number>();
  for (const [activityId, time] of latest) lastDoneDaysAgo.set(activityId, daysAgo(time));

  const rating = new Map<string, { rating: Rating; daysAgo: number }>();
  const likedCategoryDaysAgo = new Map<ActivityCategory, number>();
  for (const [activityId, rated] of latestRated) {
    const days = daysAgo(rated.time);
    rating.set(activityId, { rating: rated.rating, daysAgo: days });

    const category = categoryOf.get(activityId);
    if (rated.rating === 'up' && category) {
      likedCategoryDaysAgo.set(category, Math.min(days, likedCategoryDaysAgo.get(category) ?? Infinity));
    }
  }

  return { lastDoneDaysAgo, rating, likedCategoryDaysAgo };
}
