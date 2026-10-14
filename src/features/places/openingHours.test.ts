// Orte (M10b): den Wochenplan aus dem Import lesen (eigener kleiner Code statt Bibliothek). Die Tests laufen in Europe/Berlin.

import { isOpenAt, isOpenThrough } from './openingHours';
import type { HoursPlan } from './placeRow';

const plan = (days: [number, number][][], ph = false): HoursPlan => ({ days, ph });
// Mittwoch, 14. Oktober 2026
const wednesday = (hours: number, minutes = 0) => new Date(2026, 9, 14, hours, minutes);

describe('isOpenThrough', () => {
  const museum = plan([[], ...Array.from({ length: 6 }, () => [[600, 1020]] as [number, number][])]); // Di–So 10–17

  it('offen bei Ankunft und bis zum Ende des Besuchs', () => {
    expect(isOpenThrough(museum, wednesday(10), 60)).toBe(true);
    expect(isOpenThrough(museum, wednesday(16), 60)).toBe(true); // genau bis 17:00
  });

  it('schließt vor dem Ende des Besuchs', () => {
    expect(isOpenThrough(museum, wednesday(16, 1), 60)).toBe(false);
  });

  it('bei Ankunft noch zu, am Ruhetag zu', () => {
    expect(isOpenThrough(museum, wednesday(9, 59), 30)).toBe(false);
    expect(isOpenThrough(museum, new Date(2026, 9, 12, 12), 30)).toBe(false); // Montag
  });

  it('Montag ist der erste Tag im Plan, Sonntag der letzte', () => {
    const onlySunday = plan([[], [], [], [], [], [], [[0, 1440]]]);
    expect(isOpenAt(onlySunday, new Date(2026, 9, 18, 12))).toBe(true); // Sonntag
    expect(isOpenAt(onlySunday, new Date(2026, 9, 19, 12))).toBe(false); // Montag
  });

  it('über Mitternacht: der Plan hat zwei Teile, der Besuch läuft am nächsten Tag weiter', () => {
    const night = plan(Array.from({ length: 7 }, () => [[0, 120], [1260, 1440]] as [number, number][])); // 21–2 Uhr
    expect(isOpenThrough(night, wednesday(23, 30), 120)).toBe(true); // bis 1:30
    expect(isOpenThrough(night, wednesday(23, 30), 180)).toBe(false); // bis 2:30
  });

  it('zwei Zeiträume am Tag mit Mittagspause', () => {
    const lunchBreak = plan(Array.from({ length: 7 }, () => [[540, 720], [840, 1080]] as [number, number][]));
    expect(isOpenThrough(lunchBreak, wednesday(11), 60)).toBe(true);
    expect(isOpenThrough(lunchBreak, wednesday(11, 30), 60)).toBe(false);
    expect(isOpenAt(lunchBreak, wednesday(13))).toBe(false);
  });

  it('rund um die Uhr offen', () => {
    const always = plan(Array.from({ length: 7 }, () => [[0, 1440]] as [number, number][]));
    expect(isOpenThrough(always, wednesday(23, 59), 600)).toBe(true);
  });

  it('am Tag der Zeitumstellung (25.10.2026) gilt die Uhrzeit auf der Uhr', () => {
    const daytime = plan(Array.from({ length: 7 }, () => [[600, 1020]] as [number, number][]));
    expect(isOpenThrough(daytime, new Date(2026, 9, 25, 10), 60)).toBe(true);
    expect(isOpenThrough(daytime, new Date(2026, 2, 29, 16, 30), 60)).toBe(false);
  });
});
