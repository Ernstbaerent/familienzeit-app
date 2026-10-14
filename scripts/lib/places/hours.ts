// Orte-Import (M10a): Öffnungszeiten aus OSM (`opening_hours`) vereinfachen. Mischweg „A + C“ aus dem Plan zu M10:
// Die Bibliothek opening_hours (LGPL-3.0) läuft NUR HIER im Import (GitHub Action, Teil „Vorbereiten“) und wird nie mit
// der App ausgeliefert. Sie wandelt die Regel in einen einfachen Wochenplan um; die App prüft ab M10b nur noch diesen Plan
// mit eigenem, kleinem Code. Ein Test (hoursIsolation.test.ts) stellt sicher, dass app/ und src/ die Bibliothek nie laden.
//
// Vorgehen für eine Regel (docs/orte.md, „Öffnungszeiten“):
//   1. Lesen. Fehler → `invalid`.
//   2. Offene Zeiten für 52 Wochen ab dem Montag der Importwoche berechnen, mit den Feiertagen des Bundeslandes.
//   3. Monate mit offenen Zeiten = Saison (wenn nicht alle 12).
//   4. Wochen vergleichen, die ganz in der Saison liegen und keinen Feiertag haben. Sind alle gleich und nichts ist
//      „unbekannt“ (z. B. „nach Vereinbarung“) oder hängt an der Sonne („sunrise“), ist das der Wochenplan (`plan`). Sonst `complex`.
//   5. Nie offen und nichts unbekannt (z. B. `off`) → dauerhaft geschlossen: Der Ort wird nicht importiert.

import OpeningHours from 'opening_hours';

import type { DayInterval, HoursKind, HoursPlan } from '../../../src/features/places/placeRow.ts';

export type HoursResult =
  | { kind: 'closed'; months: null; plan: null }
  | { kind: HoursKind; months: number[] | null; plan: HoursPlan | null };

export type HoursContext = {
  start: Date; // Montag 0:00 Ortszeit der Importwoche (weekStartOf)
  state: string; // Bundesland für die Feiertage, z. B. „Thüringen“
  lat: number;
  lon: number;
};

const weeks = 52;
const days = weeks * 7;

// Montag 0:00 Ortszeit der Woche, in der `date` liegt. Die Action läuft mit TZ=Europe/Berlin, die Tests auch.
export function weekStartOf(date: Date): Date {
  const weekday = (date.getDay() + 6) % 7; // 0 = Montag
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday);
}

const dayStart = (start: Date, index: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

function nominatimOf(context: HoursContext) {
  return { lat: context.lat, lon: context.lon, address: { country_code: 'de', state: context.state } };
}

// Feiertage des Bundeslandes im Zeitraum, als Tagesnummern ab `start`. Einmal je Land und Lauf berechnen.
export function holidayDays(context: HoursContext): Set<number> {
  const evaluator = new OpeningHours('PH', nominatimOf(context));
  const result = new Set<number>();
  for (let i = 0; i < days; i += 1) {
    const day = dayStart(context.start, i);
    if (evaluator.getState(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12))) result.add(i);
  }
  return result;
}

type DayPlans = DayInterval[][]; // je Tag (0 … 363) die offenen Zeiträume

// Kalendertag von `date` als Nummer ab `start` (über UTC gerechnet, damit die Zeitumstellung nicht stört).
function dayIndexOf(start: Date, date: Date): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(date) - utc(start)) / 86_400_000);
}

function addInterval(plans: DayPlans, start: Date, from: Date, to: Date) {
  for (let i = Math.max(0, dayIndexOf(start, from)); i < days; i += 1) {
    const begin = dayStart(start, i);
    const end = dayStart(start, i + 1);
    if (begin >= to) break;
    const a = from > begin ? minutesOfDay(from) : 0;
    const b = to < end ? minutesOfDay(to) : 1440;
    if (b > a) plans[i].push([a, b]);
  }
}

// Zeiträume eines Tages sortieren und Überlappendes oder Aneinanderstoßendes zusammenlegen.
function normalizeDay(intervals: DayInterval[]): DayInterval[] {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of sorted) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}

export function normalizeOpeningHours(raw: string, context: HoursContext, holidays: Set<number>): HoursResult {
  let evaluator: InstanceType<typeof OpeningHours>;
  try {
    evaluator = new OpeningHours(raw, nominatimOf(context), { mode: 0, tag_key: 'opening_hours' } as never);
  } catch {
    return { kind: 'invalid', months: null, plan: null };
  }

  const end = dayStart(context.start, days);
  let intervals: [Date, Date, boolean, string | undefined][];
  try {
    intervals = evaluator.getOpenIntervals(context.start, end);
  } catch {
    return { kind: 'invalid', months: null, plan: null };
  }

  const plans: DayPlans = Array.from({ length: days }, () => []);
  let unknown = false;
  for (const [from, to, isUnknown] of intervals) {
    if (isUnknown) unknown = true;
    addInterval(plans, context.start, from, to);
  }

  // Saison: Monate, in denen an mindestens einem Tag offen (oder „unbekannt“) ist.
  const openMonths = new Set<number>();
  plans.forEach((plan, i) => {
    if (plan.length > 0) openMonths.add(dayStart(context.start, i).getMonth() + 1);
  });
  if (openMonths.size === 0) return unknown ? { kind: 'complex', months: null, plan: null } : { kind: 'closed', months: null, plan: null };
  const months = openMonths.size < 12 ? [...openMonths].sort((a, b) => a - b) : null;

  // Wochen zum Vergleichen: ganz in der Saison und ohne Feiertag.
  const signatures = new Set<string>();
  let reference: DayInterval[][] | null = null;
  for (let week = 0; week < weeks; week += 1) {
    const indexes = Array.from({ length: 7 }, (_, d) => week * 7 + d);
    if (indexes.some((i) => holidays.has(i) || !openMonths.has(dayStart(context.start, i).getMonth() + 1))) continue;
    const weekPlan = indexes.map((i) => normalizeDay(plans[i]));
    signatures.add(JSON.stringify(weekPlan));
    reference ??= weekPlan;
  }

  // Zeiten nach der Sonne („sunrise-sunset“) ändern sich jeden Tag. Die Bibliothek rechnet sie ohne genaue Sonnendaten
  // mit festen Zeiten (6 und 18 Uhr) aus; ein Plan daraus wäre falsch. Deshalb immer `complex`.
  const variableTimes = /\b(sunrise|sunset|dawn|dusk)\b/i.test(raw);
  if (unknown || variableTimes || reference === null || signatures.size !== 1) return { kind: 'complex', months, plan: null };
  return { kind: 'plan', months, plan: { days: reference, ph: /\bPH\b/.test(raw) } };
}

// Viele Orte haben dieselbe Regel (z. B. „Mo-Fr 09:00-17:00“). Ergebnisse je Text merken.
export function createHoursNormalizer(context: HoursContext): (raw: string) => HoursResult {
  const holidays = holidayDays(context);
  const cache = new Map<string, HoursResult>();
  return (raw: string) => {
    const key = raw.trim();
    let result = cache.get(key);
    if (!result) {
      result = normalizeOpeningHours(key, context, holidays);
      cache.set(key, result);
    }
    return result;
  };
}
