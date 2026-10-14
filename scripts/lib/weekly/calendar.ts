// KI-Wochenlauf (M9): Jahreszeit, Feiertage, Anlässe und ungefähre Ferienzeiten in Deutschland als Hinweis für die KI.
// Reine Funktionen. Alle Tage sind Kalendertage in Berliner Zeit, gerechnet wird mit Datum ohne Uhrzeit (UTC-Mitternacht).
// Ferien unterscheiden sich je Bundesland und Jahr: Wir geben bewusst nur ungefähre Zeiträume mit, keine genauen Daten.

export type PlainDate = { year: number; month: number; day: number }; // month 1–12

export type Occasion = { date: string; name: string }; // date: JJJJ-MM-TT

export type CalendarHints = {
  today: string; // JJJJ-MM-TT
  todayText: string; // z. B. „Sonntag, 18. Oktober 2026“
  season: string;
  monthsInWindow: number[]; // Monate, die das Fenster berührt (1–12)
  occasions: Occasion[];
  holidays: string[];
};

const dayMs = 24 * 60 * 60 * 1000;

export const monthNamesDe = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const weekdayNamesDe = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function toUtc(date: PlainDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function fromUtc(ms: number): PlainDate {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function addDays(date: PlainDate, days: number): PlainDate {
  return fromUtc(toUtc(date) + days * dayMs);
}

export function formatDate(date: PlainDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function weekday(date: PlainDate): number {
  return new Date(toUtc(date)).getUTCDay(); // 0 = Sonntag
}

// Heutiges Datum in Berliner Zeit.
export function berlinToday(now: Date): PlainDate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .split('-')
    .map(Number);
  return { year: parts[0], month: parts[1], day: parts[2] };
}

// Ostersonntag nach dem gregorianischen Kalender (Algorithmus von Meeus/Jones/Butcher).
export function easterSunday(year: number): PlainDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

// n-ter Sonntag eines Monats (n = 1, 2, …).
function nthSunday(year: number, month: number, n: number): PlainDate {
  const first = { year, month, day: 1 };
  const offset = (7 - weekday(first)) % 7;
  return addDays(first, offset + (n - 1) * 7);
}

// Alle Anlässe eines Jahres, sortiert.
export function occasionsOfYear(year: number): Occasion[] {
  const easter = easterSunday(year);
  const fromEaster = (days: number, name: string): Occasion => ({ date: formatDate(addDays(easter, days)), name });
  const fixed = (month: number, day: number, name: string): Occasion => ({ date: formatDate({ year, month, day }), name });

  // 4. Advent: der letzte Sonntag vor dem 25. Dezember (ist der 24. ein Sonntag, dann dieser).
  const christmas = { year, month: 12, day: 25 };
  const fourthAdvent = addDays(christmas, -(weekday(christmas) === 0 ? 7 : weekday(christmas)));
  // Buß- und Bettag (Feiertag in Sachsen): der Mittwoch vor dem 23. November.
  const nov23 = { year, month: 11, day: 23 };
  const bussUndBettag = addDays(nov23, -(((weekday(nov23) - 3 + 7) % 7) || 7));

  const list: Occasion[] = [
    fixed(1, 1, 'Neujahr'),
    fixed(1, 6, 'Heilige Drei Könige'),
    fixed(2, 14, 'Valentinstag'),
    fromEaster(-52, 'Weiberfastnacht (Fasching beginnt)'),
    fromEaster(-48, 'Rosenmontag (Fasching, Karneval)'),
    fromEaster(-47, 'Faschingsdienstag'),
    fromEaster(-2, 'Karfreitag (Feiertag)'),
    fromEaster(0, 'Ostersonntag'),
    fromEaster(1, 'Ostermontag (Feiertag)'),
    fixed(5, 1, 'Tag der Arbeit (Feiertag)'),
    { date: formatDate(nthSunday(year, 5, 2)), name: 'Muttertag' },
    fromEaster(39, 'Christi Himmelfahrt (Feiertag, Vatertag)'),
    fromEaster(49, 'Pfingstsonntag'),
    fromEaster(50, 'Pfingstmontag (Feiertag)'),
    fromEaster(60, 'Fronleichnam (Feiertag in einigen Ländern)'),
    fixed(6, 21, 'Sommeranfang, längster Tag'),
    fixed(9, 20, 'Weltkindertag (Feiertag in Thüringen)'),
    { date: formatDate(nthSunday(year, 10, 1)), name: 'Erntedankfest' },
    fixed(10, 3, 'Tag der Deutschen Einheit (Feiertag)'),
    fixed(10, 31, 'Halloween und Reformationstag (Feiertag in einigen Ländern, z. B. Thüringen und Sachsen)'),
    fixed(11, 1, 'Allerheiligen (Feiertag in einigen Ländern)'),
    fixed(11, 11, 'Martinstag (Laternenumzüge)'),
    { date: formatDate(bussUndBettag), name: 'Buß- und Bettag (Feiertag in Sachsen)' },
    { date: formatDate(addDays(fourthAdvent, -21)), name: '1. Advent' },
    { date: formatDate(addDays(fourthAdvent, -14)), name: '2. Advent' },
    fixed(12, 6, 'Nikolaustag'),
    { date: formatDate(addDays(fourthAdvent, -7)), name: '3. Advent' },
    { date: formatDate(fourthAdvent), name: '4. Advent' },
    fixed(12, 21, 'Winteranfang, kürzester Tag'),
    fixed(12, 24, 'Heiligabend'),
    fixed(12, 25, '1. Weihnachtstag (Feiertag)'),
    fixed(12, 26, '2. Weihnachtstag (Feiertag)'),
    fixed(12, 31, 'Silvester'),
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

// Anlässe von `start` (einschließlich) bis `start + days` (einschließlich).
export function occasionsInWindow(start: PlainDate, days: number): Occasion[] {
  const from = formatDate(start);
  const to = formatDate(addDays(start, days));
  return [...occasionsOfYear(start.year), ...occasionsOfYear(start.year + 1)].filter((o) => o.date >= from && o.date <= to);
}

export function seasonOf(month: number): string {
  if (month === 12 || month <= 2) return 'Winter';
  if (month <= 5) return 'Frühling';
  if (month <= 8) return 'Sommer';
  return 'Herbst';
}

// Ungefähre Ferienzeiten (je nach Bundesland verschieden). Liefert die, die das Fenster berühren.
export function holidayHints(start: PlainDate, days: number): string[] {
  const end = addDays(start, days);
  const hints: string[] = [];
  const overlaps = (from: PlainDate, to: PlainDate) => toUtc(from) <= toUtc(end) && toUtc(to) >= toUtc(start);
  for (const year of [start.year, start.year + 1]) {
    const easter = easterSunday(year);
    const ranges: [PlainDate, PlainDate, string][] = [
      [{ year: year - 1, month: 12, day: 21 }, { year, month: 1, day: 7 }, 'Weihnachtsferien (etwa 21. Dezember bis 6. Januar)'],
      [{ year, month: 2, day: 1 }, { year, month: 3, day: 7 }, 'Winterferien in einigen Ländern (Februar, z. B. Sachsen und Thüringen)'],
      [addDays(easter, -14), addDays(easter, 12), 'Osterferien (rund um Ostern)'],
      [addDays(easter, 46), addDays(easter, 60), 'Pfingstferien in einigen Ländern (kurz, rund um Pfingsten)'],
      [{ year, month: 6, day: 20 }, { year, month: 9, day: 15 }, 'Sommerferien (je nach Land zwischen Ende Juni und Mitte September, sechs Wochen)'],
      [{ year, month: 10, day: 1 }, { year, month: 11, day: 8 }, 'Herbstferien (meist im Oktober, je nach Land ein bis zwei Wochen)'],
      [{ year, month: 12, day: 21 }, { year: year + 1, month: 1, day: 7 }, 'Weihnachtsferien (etwa 21. Dezember bis 6. Januar)'],
    ];
    for (const [from, to, text] of ranges) if (overlaps(from, to) && !hints.includes(text)) hints.push(text);
  }
  return hints;
}

export function buildCalendarHints(now: Date, days = 42): CalendarHints {
  const today = berlinToday(now);
  const months: number[] = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const month = addDays(today, offset).month;
    if (!months.includes(month)) months.push(month);
  }
  return {
    today: formatDate(today),
    todayText: `${weekdayNamesDe[weekday(today)]}, ${today.day}. ${monthNamesDe[today.month - 1]} ${today.year}`,
    season: seasonOf(today.month),
    monthsInWindow: months,
    occasions: occasionsInWindow(today, days),
    holidays: holidayHints(today, days),
  };
}
