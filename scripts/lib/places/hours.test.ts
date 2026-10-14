// Öffnungszeiten vereinfachen (Mischweg A + C). Die Tests laufen in Berliner Zeit (jest.global-setup.js),
// der Zeitraum enthält beide Zeitumstellungen (25.10.2026 und 28.03.2027) und die Feiertage in Thüringen.

import { createHoursNormalizer, holidayDays, normalizeOpeningHours, weekStartOf, type HoursContext } from './hours.ts';

const context: HoursContext = { start: weekStartOf(new Date(2026, 9, 14, 15)), state: 'Thüringen', lat: 50.86, lon: 11.05 };
const holidays = holidayDays(context);
const normalize = (raw: string) => normalizeOpeningHours(raw, context, holidays);
const everyDay = (...intervals: [number, number][]) => Array.from({ length: 7 }, () => intervals);

describe('weekStartOf', () => {
  it('Montag 0:00 der Woche', () => {
    expect(weekStartOf(new Date(2026, 9, 14, 15))).toEqual(new Date(2026, 9, 12));
    expect(weekStartOf(new Date(2026, 9, 18, 23, 59))).toEqual(new Date(2026, 9, 12)); // Sonntag
    expect(weekStartOf(new Date(2026, 9, 19, 0, 1))).toEqual(new Date(2026, 9, 19));
  });
});

describe('Feiertage des Bundeslandes', () => {
  it('Thüringen: Reformationstag und Weltkindertag sind dabei', () => {
    const day = (date: Date) => Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2026, 9, 12)) / 86_400_000);
    expect(holidays.has(day(new Date(2026, 9, 31)))).toBe(true); // Reformationstag
    expect(holidays.has(day(new Date(2026, 11, 25)))).toBe(true);
    expect(holidays.has(day(new Date(2027, 8, 20)))).toBe(true); // Weltkindertag, nur in Thüringen
    expect(holidays.has(day(new Date(2026, 10, 2)))).toBe(false);
  });
});

describe('normalizeOpeningHours', () => {
  it('fester Wochenplan (Minuten ab Mitternacht, Montag zuerst)', () => {
    expect(normalize('Mo-Fr 09:00-17:00; Sa 10:00-14:00')).toEqual({
      kind: 'plan',
      months: null,
      plan: { days: [[[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[600, 840]], []], ph: false },
    });
  });

  it('„PH off“: Wochen mit Feiertag zählen nicht, der Plan merkt sich, dass Feiertage anders sind', () => {
    const result = normalize('Tu-Su 10:00-17:00; PH off');
    expect(result.kind).toBe('plan');
    expect(result.plan?.ph).toBe(true);
    expect(result.plan?.days[0]).toEqual([]);
    expect(result.plan?.days[1]).toEqual([[600, 1020]]);
  });

  it('24/7 ist jeden Tag ganz offen', () => {
    expect(normalize('24/7')).toEqual({ kind: 'plan', months: null, plan: { days: everyDay([0, 1440]), ph: false } });
  });

  it('über Mitternacht wird auf zwei Tage geteilt', () => {
    const result = normalize('Fr 22:00-02:00');
    expect(result.plan?.days[4]).toEqual([[1320, 1440]]);
    expect(result.plan?.days[5]).toEqual([[0, 120]]);
  });

  it('Saison: nur Mai bis September, in der Saison ein fester Plan', () => {
    expect(normalize('May-Sep: Mo-Su 10:00-20:00')).toEqual({ kind: 'plan', months: [5, 6, 7, 8, 9], plan: { days: everyDay([600, 1200]), ph: false } });
  });

  it('Saison mit „off“ für den Rest des Jahres', () => {
    const result = normalize('Apr-Oct Sa,Su 13:00-18:00; Nov-Mar off');
    expect(result.kind).toBe('plan');
    expect(result.months).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(result.plan?.days).toEqual([[], [], [], [], [], [[780, 1080]], [[780, 1080]]]);
  });

  it('„off“ ohne offene Zeiten: dauerhaft geschlossen', () => {
    expect(normalize('off')).toEqual({ kind: 'closed', months: null, plan: null });
    expect(normalize('closed').kind).toBe('closed');
  });

  it.each([
    ['Ferien', 'Mo-Su 10:00-18:00; SH off'],
    ['Sonnenaufgang', 'sunrise-sunset'],
    ['nach Vereinbarung (unbekannt)', 'Tu-Su 10:00-17:00 "nach Vereinbarung"'],
    ['unterschiedliche Saisons', 'May-Sep Mo-Su 10:00-20:00; Oct-Apr Sa,Su 12:00-16:00'],
  ])('%s → complex', (_, raw) => {
    expect(normalize(raw).kind).toBe('complex');
  });

  it('Saison bleibt auch bei complex erhalten', () => {
    expect(normalize('Jun-Aug: sunrise-sunset')).toMatchObject({ kind: 'complex', months: [6, 7, 8] });
  });

  it('Unlesbares → invalid', () => {
    expect(normalize('kaputt xx')).toEqual({ kind: 'invalid', months: null, plan: null });
  });

  it('Zeitumstellung ändert den Plan nicht (Wochen mit 25 und 23 Stunden sind gleich)', () => {
    expect(normalize('Mo-Su 08:00-20:00').kind).toBe('plan');
  });

  it('merkt sich Ergebnisse je Text', () => {
    const cached = createHoursNormalizer(context);
    const first = cached('Mo-Fr 09:00-17:00');
    expect(cached(' Mo-Fr 09:00-17:00 ')).toBe(first);
  });
});
