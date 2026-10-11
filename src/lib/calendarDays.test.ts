import { calendarDaysBetween } from './calendarDays';

// Alle Daten sind Ortszeit (Monat 0-basiert: 9 = Oktober). Die Tests laufen in Europe/Berlin (jest.global-setup.js).
const local = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month, day, hour, minute);

const hour = 60 * 60 * 1000;

describe('Testumgebung', () => {
  it('läuft in deutscher Ortszeit: Am 25.10.2026 hat der Tag 25 Stunden, am 29.3.2026 nur 23', () => {
    // Sonst wären die Zeitumstellungs-Tests unten wertlos (in UTC gibt es keine Umstellung).
    expect((local(2026, 9, 26, 0).getTime() - local(2026, 9, 25, 0).getTime()) / hour).toBe(25);
    expect((local(2026, 2, 30, 0).getTime() - local(2026, 2, 29, 0).getTime()) / hour).toBe(23);
  });
});

describe('calendarDaysBetween', () => {
  it('am selben Tag: 0, gestern: 1', () => {
    expect(calendarDaysBetween(local(2026, 9, 10, 8), local(2026, 9, 10, 20))).toBe(0);
    expect(calendarDaysBetween(local(2026, 9, 9, 20), local(2026, 9, 10, 8))).toBe(1);
    expect(calendarDaysBetween(local(2026, 9, 3), local(2026, 9, 10))).toBe(7);
  });

  it('kurz vor und kurz nach Mitternacht', () => {
    // Zwei Minuten dazwischen, aber ein Kalendertag.
    expect(calendarDaysBetween(local(2026, 9, 9, 23, 59), local(2026, 9, 10, 0, 1))).toBe(1);
    // Fast 24 Stunden dazwischen, aber noch derselbe Tag.
    expect(calendarDaysBetween(local(2026, 9, 10, 0, 1), local(2026, 9, 10, 23, 59))).toBe(0);
    // Genau Mitternacht gehört zum neuen Tag.
    expect(calendarDaysBetween(local(2026, 9, 9, 23, 59), local(2026, 9, 10, 0, 0))).toBe(1);
  });

  it('Monats- und Jahreswechsel', () => {
    expect(calendarDaysBetween(local(2026, 9, 31, 22), local(2026, 10, 1, 8))).toBe(1);
    expect(calendarDaysBetween(local(2025, 11, 31, 23, 30), local(2026, 0, 1, 0, 30))).toBe(1);
    expect(calendarDaysBetween(local(2026, 1, 28), local(2026, 2, 1))).toBe(1); // 2026 ist kein Schaltjahr
  });

  it('Zeitumstellung im Herbst (25.10.2026, der Tag hat 25 Stunden)', () => {
    // 25 Stunden und 59 Minuten später, aber derselbe Kalendertag: 24-Stunden-Blöcke würden 1 sagen.
    expect(calendarDaysBetween(local(2026, 9, 25, 0, 0), local(2026, 9, 25, 23, 59))).toBe(0);
    // Von Mitternacht zu Mitternacht sind es 25 Stunden, aber ein Tag.
    expect(calendarDaysBetween(local(2026, 9, 25, 0, 0), local(2026, 9, 26, 0, 0))).toBe(1);
    // Über die Umstellung hinweg: Freitag 23:30 bis Dienstag 00:30 sind vier Kalendertage,
    // aber nur 3 Tage und 2 Stunden vergangen (24-Stunden-Blöcke würden 3 sagen).
    expect(calendarDaysBetween(local(2026, 9, 23, 23, 30), local(2026, 9, 27, 0, 30))).toBe(4);
    // Mitten in der doppelten Stunde (2:30 Uhr gibt es zweimal).
    expect(calendarDaysBetween(local(2026, 9, 24, 23, 0), local(2026, 9, 25, 2, 30))).toBe(1);
  });

  it('Zeitumstellung im Frühling (29.3.2026, der Tag hat 23 Stunden)', () => {
    // Nur 23 Stunden vergangen, aber ein Kalendertag: 24-Stunden-Blöcke würden 0 sagen.
    expect(calendarDaysBetween(local(2026, 2, 29, 0, 0), local(2026, 2, 30, 0, 0))).toBe(1);
    expect(calendarDaysBetween(local(2026, 2, 28, 23, 30), local(2026, 2, 29, 23, 0))).toBe(1);
    expect(calendarDaysBetween(local(2026, 2, 29, 0, 0), local(2026, 2, 29, 23, 59))).toBe(0);
  });

  it('liegt der Zeitpunkt in der Zukunft (z. B. Uhr verstellt), zählt er als heute', () => {
    expect(calendarDaysBetween(local(2026, 9, 12), local(2026, 9, 10))).toBe(0);
  });
});
