// Kalender-Hinweise (M9): Ostern und die davon abhängigen Feiertage, Advent, Anlässe im Fenster, Ferien, Jahreszeit.

import { berlinToday, buildCalendarHints, easterSunday, formatDate, holidayHints, occasionsInWindow, occasionsOfYear, seasonOf } from './calendar';

const dateOf = (year: number, name: string) => occasionsOfYear(year).find((o) => o.name.startsWith(name))?.date;

describe('Ostern', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('%s: Ostersonntag %s', (year, expected) => {
    expect(formatDate(easterSunday(year))).toBe(expected);
  });

  it('Feiertage ab Ostern 2026: Rosenmontag, Karfreitag, Himmelfahrt, Pfingsten, Fronleichnam', () => {
    expect(dateOf(2026, 'Rosenmontag')).toBe('2026-02-16');
    expect(dateOf(2026, 'Karfreitag')).toBe('2026-04-03');
    expect(dateOf(2026, 'Christi Himmelfahrt')).toBe('2026-05-14');
    expect(dateOf(2026, 'Pfingstmontag')).toBe('2026-05-25');
    expect(dateOf(2026, 'Fronleichnam')).toBe('2026-06-04');
  });
});

describe('weitere Anlässe', () => {
  it('Muttertag, Erntedank, Buß- und Bettag und Advent 2026', () => {
    expect(dateOf(2026, 'Muttertag')).toBe('2026-05-10');
    expect(dateOf(2026, 'Erntedankfest')).toBe('2026-10-04');
    expect(dateOf(2026, 'Buß- und Bettag')).toBe('2026-11-18');
    expect(dateOf(2026, '1. Advent')).toBe('2026-11-29');
    expect(dateOf(2026, '4. Advent')).toBe('2026-12-20');
  });

  it('4. Advent, wenn Heiligabend ein Sonntag ist (2023): der 24. Dezember', () => {
    expect(dateOf(2023, '4. Advent')).toBe('2023-12-24');
    expect(dateOf(2023, '1. Advent')).toBe('2023-12-03');
  });

  it('das Fenster reicht über den Jahreswechsel', () => {
    const names = occasionsInWindow({ year: 2026, month: 12, day: 20 }, 20).map((o) => o.name);
    expect(names).toEqual(expect.arrayContaining(['4. Advent', 'Silvester', 'Neujahr', 'Heilige Drei Könige']));
  });
});

describe('Ferien und Jahreszeit', () => {
  it('Mitte Oktober: Herbstferien, Ende Dezember: Weihnachtsferien, im Juli: Sommerferien', () => {
    expect(holidayHints({ year: 2026, month: 10, day: 18 }, 42).join(' ')).toContain('Herbstferien');
    expect(holidayHints({ year: 2026, month: 12, day: 20 }, 7).join(' ')).toContain('Weihnachtsferien');
    expect(holidayHints({ year: 2026, month: 7, day: 5 }, 14).join(' ')).toContain('Sommerferien');
    expect(holidayHints({ year: 2026, month: 3, day: 22 }, 14).join(' ')).toContain('Osterferien');
  });

  it('Jahreszeiten', () => {
    expect([1, 4, 7, 10, 12].map(seasonOf)).toEqual(['Winter', 'Frühling', 'Sommer', 'Herbst', 'Winter']);
  });
});

describe('Hinweise für einen Lauf', () => {
  it('Sonntag, 18. Oktober 2026, 18 Uhr Berliner Zeit', () => {
    const hints = buildCalendarHints(new Date('2026-10-18T16:00:00Z'));
    expect(hints.todayText).toBe('Sonntag, 18. Oktober 2026');
    expect(hints.season).toBe('Herbst');
    expect(hints.monthsInWindow).toEqual([10, 11]);
    expect(hints.occasions.map((o) => o.name)).toEqual(
      expect.arrayContaining(['Martinstag (Laternenumzüge)', '1. Advent', expect.stringContaining('Halloween')]),
    );
  });

  it('das Datum zählt in Berliner Zeit (kurz vor Mitternacht UTC ist in Berlin schon der nächste Tag)', () => {
    expect(formatDate(berlinToday(new Date('2026-12-31T23:30:00Z')))).toBe('2027-01-01');
  });
});
