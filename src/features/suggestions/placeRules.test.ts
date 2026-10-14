// Orte (M10b): jeder harte Ausschluss einzeln und die Gewichtung. Ausgedachte Orte, Tests in Europe/Berlin.

import { everyDay, makePlace, withPlan } from '../places/testHelpers';
import { placeKinds } from '../places/placeKinds';
import type { PlaceRow } from '../places/placeRow';
import { travelFor } from '../places/travel';
import { getPlaceExclusionReason, hasReliablePlan, type PlaceCandidate } from './placeExclusions';
import { dailyJitter, placeWeights, scorePlace } from './placeScoring';
import { makeChild, makeRequest } from './testHelpers';

const candidate = (row: PlaceRow, km = 2): PlaceCandidate => ({ row, km, travel: travelFor(km) });
// Mittwoch, 14. Oktober 2026, 14 Uhr (Tageslicht laut Tabelle bis 16:15)
const afternoon = new Date(2026, 9, 14, 14, 0);
const request = (overrides: Parameters<typeof makeRequest>[0] = {}) => makeRequest({ now: afternoon, availableMinutes: 120, ...overrides });

describe('harte Ausschlüsse', () => {
  it('ein gewöhnlicher Spielplatz in der Nähe passt', () => {
    expect(getPlaceExclusionReason(candidate(makePlace()), request())).toBeNull();
  });

  describe('time: Anfahrt hin und zurück plus Mindestbesuch', () => {
    it('Spielplatz 2 km (2 × 9 Min.) + 30 Min. = 48 Min.: passt in 1 Std., nicht in 30 Min.', () => {
      const playground = candidate(makePlace(), 2);
      expect(playground.travel.roundTripMinutes).toBe(18);
      expect(getPlaceExclusionReason(playground, request({ availableMinutes: 60 }))).toBeNull();
      expect(getPlaceExclusionReason(playground, request({ availableMinutes: 30 }))).toBe('time');
    });

    it('zu Fuß unter 1 km: 0,8 km (2 × 10 Min.) + 30 Min. passt nicht in 30 Min., aber in 1 Std.', () => {
      const near = candidate(makePlace(), 0.8);
      expect(near.travel.mode).toBe('walk');
      expect(getPlaceExclusionReason(near, request({ availableMinutes: 30 }))).toBe('time');
      expect(getPlaceExclusionReason(near, request({ availableMinutes: 60 }))).toBeNull();
    });

    it('Freizeitpark (Mindestbesuch 3 Std.) 10 km (2 × 23 Min.): nur mit einem halben Tag; 20 km (2 × 40 Min.) nie', () => {
      const themePark = candidate(makePlace({ subtype: 'themePark', months: null }), 10);
      const april = new Date(2026, 3, 15, 10);
      expect(getPlaceExclusionReason(themePark, request({ availableMinutes: 120, now: april }))).toBe('time');
      expect(getPlaceExclusionReason(themePark, request({ availableMinutes: 240, now: april }))).toBeNull();
      const far = candidate(themePark.row, 20);
      expect(getPlaceExclusionReason(far, request({ availableMinutes: 240, now: april }))).toBe('time');
    });

    it('die Mindestdauer kommt aus der Tabelle je Unterart', () => {
      expect(placeKinds.cinema.minVisitMinutes).toBe(100);
      expect(placeKinds.playground.minVisitMinutes).toBe(30);
    });
  });

  it('season: Freibad (Mai bis September) im Oktober nicht, im Juli schon', () => {
    const pool = candidate(makePlace({ subtype: 'outdoorPool', months: [5, 6, 7, 8, 9] }));
    expect(getPlaceExclusionReason(pool, request())).toBe('season');
    expect(getPlaceExclusionReason(pool, request({ now: new Date(2026, 6, 14, 14) }))).toBeNull();
  });

  it('danger: draußen bei Gewitter oder Warnung nicht; drinnen und „beides“ bleiben', () => {
    const outdoor = candidate(makePlace());
    const both = candidate(makePlace({ subtype: 'castle', name: 'Burg' }));
    const indoor = candidate(makePlace({ subtype: 'museum' }));
    expect(getPlaceExclusionReason(outdoor, request({ weather: 'thunderstorm' }))).toBe('danger');
    expect(getPlaceExclusionReason(outdoor, request({ weather: 'sunny', severeWarning: true }))).toBe('danger');
    expect(getPlaceExclusionReason(both, request({ weather: 'thunderstorm' }))).toBeNull();
    expect(getPlaceExclusionReason(indoor, request({ weather: 'thunderstorm' }))).toBeNull();
  });

  it('notDry: Spielplatz und Minigolf nicht bei Regen oder Schnee; Park schon', () => {
    for (const weather of ['rain', 'snow'] as const) {
      expect(getPlaceExclusionReason(candidate(makePlace()), request({ weather }))).toBe('notDry');
      expect(getPlaceExclusionReason(candidate(makePlace({ subtype: 'miniGolf' })), request({ weather }))).toBe('notDry');
      expect(getPlaceExclusionReason(candidate(makePlace({ subtype: 'park' })), request({ weather }))).toBeNull();
    }
    expect(getPlaceExclusionReason(candidate(makePlace()), request({ weather: 'cloudy' }))).toBeNull();
  });

  describe('closed: nur mit festem Wochenplan', () => {
    const museum = (plan = everyDay([[600, 1020]])) => candidate(withPlan(plan, { subtype: 'museum', setting: 'indoor' }), 2);

    it('bei Ankunft offen und bis zum Ende des Mindestbesuchs: passt', () => {
      expect(getPlaceExclusionReason(museum(), request())).toBeNull();
    });

    it('schließt vor dem Ende des Mindestbesuchs (Ankunft 16:09, schließt 17:00, Besuch 60 Min.)', () => {
      expect(getPlaceExclusionReason(museum(), request({ now: new Date(2026, 9, 14, 16, 0) }))).toBe('closed');
    });

    it('bei Ankunft noch geschlossen', () => {
      expect(getPlaceExclusionReason(museum(), request({ now: new Date(2026, 9, 14, 8, 0) }))).toBe('closed');
    });

    it('unbekannte, komplexe oder unlesbare Öffnungszeiten schließen nie aus', () => {
      const late = request({ now: new Date(2026, 9, 14, 23, 0), availableMinutes: 240 });
      for (const hours of [
        { opening_hours: null, hours_kind: null },
        { opening_hours: 'Mo-Fr 10:00-17:00; PH off; SH off', hours_kind: 'complex' as const },
        { opening_hours: 'kaputt', hours_kind: 'invalid' as const },
      ]) {
        const row = makePlace({ subtype: 'museum', ...hours });
        expect(getPlaceExclusionReason(candidate(row), late)).toBeNull();
      }
    });

    it('Plan mit Feiertagsregel (`ph`) schließt nie aus (die App kennt keine Feiertage)', () => {
      const withHolidays = candidate(withPlan(everyDay([[600, 1020]], true), { subtype: 'museum' }));
      expect(hasReliablePlan(withHolidays.row)).toBe(false);
      expect(getPlaceExclusionReason(withHolidays, request({ now: new Date(2026, 9, 14, 8) }))).toBeNull();
    });
  });

  describe('dark: draußen und das Ende des Mindestbesuchs nach dem Tageslicht', () => {
    it('Oktober: Spielplatz um 15:30 (Ende 16:09) passt, um 15:40 nicht (Ende 16:19, Tabelle 16:15)', () => {
      expect(getPlaceExclusionReason(candidate(makePlace()), request({ now: new Date(2026, 9, 14, 15, 30) }))).toBeNull();
      expect(getPlaceExclusionReason(candidate(makePlace()), request({ now: new Date(2026, 9, 14, 15, 40) }))).toBe('dark');
    });

    it('drinnen und „beides“ gilt es nicht', () => {
      const evening = request({ now: new Date(2026, 11, 14, 18, 0) });
      expect(getPlaceExclusionReason(candidate(makePlace({ subtype: 'library' })), evening)).toBeNull();
      expect(getPlaceExclusionReason(candidate(makePlace({ subtype: 'castle', name: 'Burg' })), evening)).toBeNull();
    });
  });
});

describe('Gewichtung', () => {
  // Ohne die tägliche Streuung, damit die Zahlen genau sind.
  const score = (row: PlaceRow, req = request(), km = 0) => {
    const c = candidate(row, km);
    return scorePlace(c, req) - dailyJitter(row.id, req.now) * placeWeights.dailyJitter;
  };

  it('Kindertauglichkeit 3/2/1/0 ergibt +4/+2/0/−3', () => {
    const base = (kid: 0 | 1 | 2 | 3) => score(makePlace({ subtype: 'park', kid_weight: kid }));
    expect(base(3) - base(2)).toBe(2);
    expect(base(2) - base(1)).toBe(2);
    expect(base(1) - base(0)).toBe(3);
  });

  it('Entfernung −0,25 je km, doppelt, wenn ein Kind lange Fahrten nicht mag', () => {
    const row = makePlace({ subtype: 'park' });
    expect(score(row, request(), 0) - score(row, request(), 10)).toBeCloseTo(2.5);
    const longTrips = request({ children: [makeChild({ years: 5 }, { dislikes: ['longTrips'] })] });
    expect(score(row, longTrips, 0) - score(row, longTrips, 10)).toBeCloseTo(5);
  });

  it('Wetter: Sonne und draußen +2, Regen oder Schnee und drinnen +3, Regen und draußen −4', () => {
    const park = makePlace({ subtype: 'park' });
    const museum = makePlace({ subtype: 'museum' });
    expect(score(park, request({ weather: 'sunny' })) - score(park, request({ weather: 'cloudy' }))).toBe(2);
    expect(score(museum, request({ weather: 'rain' })) - score(museum, request({ weather: 'cloudy' }))).toBe(3);
    expect(score(museum, request({ weather: 'snow' })) - score(museum, request({ weather: 'cloudy' }))).toBe(3);
    expect(score(park, request({ weather: 'rain' })) - score(park, request({ weather: 'cloudy' }))).toBe(-4);
  });

  it('Hitze: draußen −4, Bad und Badestelle +3 (statt −4); Frost: draußen −4', () => {
    const hot = request({ temperature: { min: 22, max: 33 } });
    const cold = request({ temperature: { min: -3, max: 2 } });
    const park = makePlace({ subtype: 'park' });
    const pool = makePlace({ subtype: 'outdoorPool' });
    const lake = makePlace({ subtype: 'bathingPlace' });
    expect(score(park, hot) - score(park)).toBe(-4);
    expect(score(pool, hot) - score(pool)).toBe(3);
    expect(score(lake, hot) - score(lake)).toBe(3);
    expect(score(park, cold) - score(park)).toBe(-4);
    expect(score(makePlace({ subtype: 'museum' }), cold) - score(makePlace({ subtype: 'museum' }))).toBe(0);
  });

  it('fester Wochenplan und bei Ankunft offen: +1; unbekannt: 0', () => {
    const open = withPlan(everyDay([[0, 1440]]), { subtype: 'museum' });
    const unknown = makePlace({ subtype: 'museum' });
    expect(score(open) - score(unknown)).toBe(1);
  });

  it('Interessen und Abneigungen über die Unterart: Zoo über Natur und Tiere +3, Freizeitpark bei Abneigung gegen viele Menschen und Lärm −8', () => {
    const zoo = makePlace({ subtype: 'zoo' });
    const likesAnimals = request({ children: [makeChild({ years: 5 }, { interests: ['natureAnimals'] })] });
    expect(score(zoo, likesAnimals) - score(zoo)).toBe(3);
    const themePark = makePlace({ subtype: 'themePark' });
    const dislikes = request({ children: [makeChild({ years: 5 }, { dislikes: ['crowds', 'loudPlaces'] })] });
    expect(score(themePark, dislikes) - score(themePark)).toBe(-8);
    const water = request({ children: [makeChild({ years: 5 }, { interests: ['water'] })] });
    expect(score(makePlace({ subtype: 'indoorPool' }), water) - score(makePlace({ subtype: 'indoorPool' }))).toBe(3);
  });

  it('Kosten und Energie der Eltern je Unterart wie bei Aktivitäten', () => {
    // Spielplatz (kostenlos, wenig Energie) und Indoorspielplatz (Kosten 2, wenig Energie), sonst gleich: 2 Punkte Unterschied.
    const free = makePlace({ subtype: 'playground', setting: 'indoor' });
    const paid = makePlace({ subtype: 'indoorPlayground' });
    expect(score(free) - score(paid)).toBe(2);
    // Eltern müde, Hallenbad braucht viel Energie: −4.
    const pool = makePlace({ subtype: 'indoorPool' });
    expect(score(pool, request({ parentEnergy: 'tired' })) - score(pool)).toBe(-4);
  });

  it('Kino ist neutral: keine Themen, Kindertauglichkeit 1', () => {
    expect(placeKinds.cinema.topics).toEqual([]);
    const everything = request({
      children: [makeChild({ years: 8 }, { interests: ['stories', 'games', 'outings'], dislikes: ['loudPlaces', 'crowds'] })],
    });
    const cinema = makePlace({ subtype: 'cinema' });
    expect(score(cinema, everything)).toBe(score(cinema));
  });

  it('tägliche Streuung: 0 bis unter 1, gleich am selben Tag, anders an einem anderen Tag', () => {
    const values = Array.from({ length: 50 }, (_, i) => dailyJitter(`n${i}`, afternoon));
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(dailyJitter('n1', afternoon)).toBe(dailyJitter('n1', new Date(2026, 9, 14, 23, 59)));
    expect(dailyJitter('n1', afternoon)).not.toBe(dailyJitter('n1', new Date(2026, 9, 15, 9)));
    expect(new Set(values.map((v) => v.toFixed(3))).size).toBeGreaterThan(40);
  });
});
