// Orte (M10b): Die Tabelle „Tageslicht bis“ je Monat muss immer vor dem echten Sonnenuntergang liegen, überall in Deutschland.
// Nachgerechnet mit der Näherungsformel der NOAA (nur hier im Test, nicht in der App). Die Tests laufen in Europe/Berlin.

import { isAfterDaylight, outdoorDaylightEnd } from './sunset';

// Sonnenuntergang (Sonne 0,833° unter dem Horizont) in Minuten nach Mitternacht, Ortszeit des Tages `date`.
function sunsetMinutes(date: Date, lat: number, lon: number): number {
  const rad = Math.PI / 180;
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(start.getFullYear(), 0, 1)) / 864e5) + 1;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + 0.25);
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const hourAngle =
    Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  const utcMinutes = 720 - 4 * (lon - hourAngle) - eqTime;
  const offset = -new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTimezoneOffset();
  return utcMinutes + offset;
}

// Punkte an den Rändern Deutschlands (Norden, Osten, Süden, Westen). Der früheste Sonnenuntergang liegt immer am Rand.
const border: [number, number][] = [
  [55.06, 8.41], [54.79, 9.43], [54.47, 11.1], [54.68, 13.43], [53.94, 14.21], [53.06, 14.28], [52.34, 14.55],
  [51.15, 15.04], [50.9, 14.8], [50.28, 12.23], [48.57, 13.47], [47.6, 13.0], [47.27, 10.22], [47.55, 9.68],
  [47.6, 7.6], [50.77, 6.08], [51.05, 5.87], [53.37, 7.2], [53.59, 6.66],
];

describe('Tageslicht-Tabelle (sunset.ts)', () => {
  it('12 Werte, einer je Monat, alle zwischen 15 und 21 Uhr', () => {
    expect(outdoorDaylightEnd).toHaveLength(12);
    for (const value of outdoorDaylightEnd) {
      expect(value).toBeGreaterThanOrEqual(15 * 60);
      expect(value).toBeLessThanOrEqual(21 * 60);
    }
  });

  it.each([2026, 2027, 2028, 2029, 2030])('%i: die Tabelle liegt jeden Tag mindestens 10 Minuten vor dem Sonnenuntergang', (year) => {
    for (let month = 0; month < 12; month += 1) {
      for (let day = 1; day <= 31; day += 1) {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) continue;
        const earliest = Math.min(...border.map(([lat, lon]) => sunsetMinutes(date, lat, lon)));
        expect(outdoorDaylightEnd[month]).toBeLessThanOrEqual(earliest - 10);
      }
    }
  });

  it('die Reserve ist nicht übertrieben: höchstens 35 Minuten vor dem frühesten Sonnenuntergang des Monats', () => {
    for (let month = 0; month < 12; month += 1) {
      let earliest = Infinity;
      for (let day = 1; day <= 31; day += 1) {
        const date = new Date(2026, month, day);
        if (date.getMonth() !== month) continue;
        earliest = Math.min(earliest, ...border.map(([lat, lon]) => sunsetMinutes(date, lat, lon)));
      }
      expect(earliest - outdoorDaylightEnd[month]).toBeLessThanOrEqual(35);
    }
  });
});

describe('isAfterDaylight', () => {
  it('Dezember: 15:20 noch hell, 15:30 schon zu spät (Tabelle 15:25)', () => {
    const start = new Date(2026, 11, 5, 14, 0);
    expect(isAfterDaylight(start, new Date(2026, 11, 5, 15, 20))).toBe(false);
    expect(isAfterDaylight(start, new Date(2026, 11, 5, 15, 30))).toBe(true);
  });

  it('Juni: 20:30 noch hell', () => {
    expect(isAfterDaylight(new Date(2026, 5, 20, 19), new Date(2026, 5, 20, 20, 30))).toBe(false);
  });

  it('endet der Besuch erst am nächsten Tag, ist es immer dunkel', () => {
    expect(isAfterDaylight(new Date(2026, 5, 20, 23), new Date(2026, 5, 21, 1))).toBe(true);
  });
});
