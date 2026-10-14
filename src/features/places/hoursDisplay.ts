// Orte (M10c): Öffnungszeiten und Saison für die Ortsseite. Reine Funktionen, die Übersetzung (`t`) kommt herein.
//
// Ein fester Wochenplan (`hours_kind = plan`) wird zur Liste Montag bis Sonntag, der heutige Tag ist markiert.
// Alles andere (komplex, unlesbar, keine Angabe) zeigt „Öffnungszeiten vorher prüfen“ und, falls vorhanden, den Rohtext aus OpenStreetMap.
// Die Wochentage kommen aus der App-Sprache (de/en), der heutige Tag aus der Uhr des Handys.

import type { TFunction } from 'i18next';

import { weekdayIndex } from './openingHours';
import { isCinema, needsHoursCheck } from './placeDisplay';
import type { DayInterval, HoursPlan, PlaceRow } from './placeRow';

const minutesPerDay = 1440;

// Schlüssel der Wochentage in den Übersetzungen, Montag zuerst (wie `hours_plan.days`).
export const dayKeys = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const;

// Schlüssel der Monate in den Übersetzungen (1 = Januar … 12 = Dezember, wie `months` der Orte).
const monthKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;

// Die Zeiträume je Tag zum Anzeigen. Der Import teilt Zeiten über Mitternacht in zwei Teile (bis 1440 und ab 0 am nächsten Tag);
// hier werden sie wieder verbunden: Freitag 18:00–2:00 statt Freitag 18:00–24:00 und Samstag 0:00–2:00.
// Ein ganzer Tag (0 bis 1440) bleibt ein ganzer Tag. Das Ende kann danach über 1440 liegen (am nächsten Morgen).
export function displayIntervals(plan: HoursPlan): DayInterval[][] {
  const days: DayInterval[][] = plan.days.map((day) => [...day]);
  const consumed = Array.from({ length: 7 }, () => false);
  for (let day = 0; day < 7; day += 1) {
    const last = plan.days[day][plan.days[day].length - 1];
    if (!last || last[1] !== minutesPerDay || last[0] === 0) continue;
    const next = (day + 1) % 7;
    const first = plan.days[next][0];
    if (!first || first[0] !== 0 || first[1] >= minutesPerDay) continue;
    days[day][days[day].length - 1] = [last[0], minutesPerDay + first[1]];
    consumed[next] = true;
  }
  return days.map((intervals, day) => (consumed[day] ? intervals.slice(1) : intervals));
}

// „9:00“, „17:30“; das Ende um Mitternacht heißt „24:00“, nach Mitternacht zählt die Uhr wieder ab 0 („2:00“).
export function formatClock(minutes: number): string {
  if (minutes === minutesPerDay) return '24:00';
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  return `${hours}:${String(rest).padStart(2, '0')}`;
}

export type HoursRow = {
  day: number; // 0 = Montag … 6 = Sonntag
  dayName: string; // „Montag“
  value: string; // „9:00–12:00, 14:00–18:00“, „geschlossen“, „rund um die Uhr“
  closed: boolean;
  isToday: boolean;
};

// Die Liste Montag bis Sonntag für einen festen Wochenplan.
export function weekRows(t: TFunction, plan: HoursPlan, now: Date): HoursRow[] {
  const today = weekdayIndex(now);
  return displayIntervals(plan).map((intervals, day) => {
    const closed = intervals.length === 0;
    let value: string;
    if (closed) value = t('places.hours.closed');
    else if (intervals.length === 1 && intervals[0][0] === 0 && intervals[0][1] === minutesPerDay) value = t('places.hours.allDay');
    else value = intervals.map(([from, to]) => t('places.hours.range', { from: formatClock(from), to: formatClock(to) })).join(', ');
    return { day, dayName: t(`places.hours.days.${dayKeys[day]}`), value, closed, isToday: day === today };
  });
}

// Saison als Text: [5, 6, 7, 8, 9] → „Mai bis September“, [12, 1, 2] → „Dezember bis Februar“, [7] → „Juli“,
// Lücken ergeben mehrere Teile: [4, 5, 9, 10] → „April bis Mai, September bis Oktober“.
export function seasonText(t: TFunction, months: readonly number[]): string {
  const sorted = [...new Set(months)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const month of sorted) {
    const last = runs[runs.length - 1];
    if (last && month === last[1] + 1) last[1] = month;
    else runs.push([month, month]);
  }
  // Über den Jahreswechsel: Dezember und Januar gehören zusammen.
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) {
    const first = runs.shift() as [number, number];
    runs[runs.length - 1][1] = first[1];
  }
  const name = (month: number) => t(`places.hours.months.${monthKeys[month - 1]}`);
  return runs
    .map(([from, to]) => (from === to ? name(from) : t('places.hours.monthRange', { from: name(from), to: name(to) })))
    .join(', ');
}

export type HoursView = {
  week: HoursRow[] | null; // nur bei festem Wochenplan
  raw: string | null; // Rohtext aus OpenStreetMap, nur wenn er sich nicht in einen Plan umsetzen ließ
  season: string | null; // „Saison: Mai bis September“
  notes: string[]; // Hinweise in fester Reihenfolge
};

// Alles für den Abschnitt „Öffnungszeiten“ der Ortsseite.
export function hoursView(t: TFunction, row: PlaceRow, now: Date): HoursView {
  const plan = row.hours_kind === 'plan' ? row.hours_plan : null;
  const notes: string[] = [];
  if (plan?.ph) notes.push(t('places.hours.holidays'));
  if (needsHoursCheck(row)) notes.push(t('places.checkHours'));
  if (isCinema(row)) notes.push(t('places.cinemaHint'));
  return {
    week: plan ? weekRows(t, plan, now) : null,
    raw: plan ? null : row.opening_hours,
    season: row.months && row.months.length > 0 ? t('places.hours.season', { months: seasonText(t, row.months) }) : null,
    notes,
  };
}
