// Orte (M10b): Umkreis und Mischung der Dreiergruppen. Ohne Orte bleibt alles wie bei suggest().
// Die Garantie „immer 3, wenn so viele passen“ wird mit ausgedachten Orten und den echten Aktivitäten geprüft.

import type { Activity } from '../activities/activities';
import { getBundledActivities } from '../activities/bundledActivities';
import type { PlaceRow } from '../places/placeRow';
import { fixtureOrigin, fixturePlaces, makePlace } from '../places/testHelpers';
import type { Weather } from './conditions';
import {
  maxPlacesPerPage,
  rankPlaces,
  suggestWithPlaces,
  widenedRadius,
  type MixedSuggestions,
  type Suggestion,
} from './mix';
import { suggest } from './suggest';
import { makeActivity, makeChild, makeRequest } from './testHelpers';

// Mittwoch, 14. Oktober 2026, 11 Uhr: hell genug, die meisten Testorte offen.
const now = new Date(2026, 9, 14, 11, 0);
const request = (overrides: Parameters<typeof makeRequest>[0] = {}) => makeRequest({ now, availableMinutes: 120, ...overrides });
const input = (rows: PlaceRow[]) => ({ origin: fixtureOrigin, rows });

function catalog(count: number): Activity[] {
  const categories = ['craft', 'game', 'movement', 'experiment', 'nature', 'cooking'] as const;
  return Array.from({ length: count }, (_, i) => makeActivity({ id: `idea-${i + 1}`, category: categories[i % categories.length] }));
}

const kinds = (page: Suggestion[]) => page.map((item) => item.kind);
const placeCount = (page: Suggestion[]) => page.filter((item) => item.kind === 'place').length;
const key = (item: Suggestion) => (item.kind === 'activity' ? `a:${item.activity.id}` : `p:${item.place.id}`);

describe('ohne Orte', () => {
  it('genau dieselben Gruppen wie suggest() (auch ohne Ortsbestand oder wenn kein Ort passt)', () => {
    const activities = catalog(11);
    const plain = suggest(activities, request());
    for (const places of [undefined, input([]), input([makePlace({}, 50)])]) {
      const mixed = suggestWithPlaces(activities, request(), places);
      expect(mixed.pages.map((page) => page.map(key))).toEqual(plain.pages.map((page) => page.map((a) => `a:${a.id}`)));
      expect(mixed.matchCount).toBe(plain.matchCount);
      expect(mixed.radiusKm).toBeNull();
    }
  });
});

describe('Umkreis 5 → 15 → 30 km', () => {
  it('5 km, wenn dort mindestens 2 gute Orte (Kindertauglichkeit ≥ 2) liegen; weiter entfernte zählen dann nicht', () => {
    const rows = [makePlace({}, 1), makePlace({ subtype: 'park', kid_weight: 2 }, 3), makePlace({ subtype: 'zoo' }, 10)];
    const { places, radiusKm } = rankPlaces(input(rows), request());
    expect(radiusKm).toBe(5);
    expect(places.map((p) => p.suggestion.place.id).sort()).toEqual([rows[0].id, rows[1].id].sort());
  });

  it('Orte mit Kindertauglichkeit 0 oder 1 zählen nicht für den Umkreis', () => {
    const rows = [makePlace({ subtype: 'pond', name: 'Teich' }, 1), makePlace({ subtype: 'picnicSite', name: 'Rast' }, 2), makePlace({}, 1), makePlace({ subtype: 'park', kid_weight: 2 }, 12)];
    expect(rankPlaces(input(rows), request()).radiusKm).toBe(15);
  });

  it('30 km, wenn auch 15 km nicht reichen; ausgeschlossene Orte zählen nicht', () => {
    const rows = [makePlace({}, 1), makePlace({ subtype: 'zoo' }, 25), makePlace({ subtype: 'outdoorPool', months: [6, 7] }, 3)];
    expect(rankPlaces(input(rows), request()).radiusKm).toBe(30);
  });

  it('über 30 km nie, ohne passende Orte kein Umkreis', () => {
    expect(rankPlaces(input([makePlace({}, 31)]), request())).toEqual({ places: [], radiusKm: null });
  });

  it('Hinweis „Umkreis erweitert“ nur über 5 km und nur, wenn auf der Seite ein Ort steht', () => {
    const result: MixedSuggestions = { pages: [], matchCount: 0, radiusKm: 15 };
    const placeItem = { kind: 'place' as const, place: makePlace(), km: 1, travel: { mode: 'walk' as const, oneWayMinutes: 1, roundTripMinutes: 2 } };
    const activityItem = { kind: 'activity' as const, activity: makeActivity({ id: 'x' }) };
    expect(widenedRadius(result, [placeItem, activityItem])).toBe(15);
    expect(widenedRadius(result, [activityItem])).toBeNull();
    expect(widenedRadius({ ...result, radiusKm: 5 }, [placeItem])).toBeNull();
  });

  it('mit den Testdaten: am Standort bei Greiz reicht 5 km', () => {
    expect(rankPlaces(input(fixturePlaces()), request()).radiusKm).toBe(5);
  });
});

describe('Mischung der Dreiergruppen', () => {
  const places = () => [
    makePlace({}, 1),
    makePlace({ subtype: 'museum' }, 2),
    makePlace({ subtype: 'indoorPool' }, 2.5),
    makePlace({ subtype: 'park', kid_weight: 2 }, 3),
    makePlace({ subtype: 'library' }, 3.5),
  ];

  it('bis 1 Std. höchstens 1 Ort, ab 2 Std. bis zu 2, bei Nässe höchstens 1', () => {
    expect(maxPlacesPerPage(request({ availableMinutes: 30 }))).toBe(1);
    expect(maxPlacesPerPage(request({ availableMinutes: 60 }))).toBe(1);
    expect(maxPlacesPerPage(request({ availableMinutes: 120 }))).toBe(2);
    expect(maxPlacesPerPage(request({ availableMinutes: 240 }))).toBe(2);
    for (const weather of ['rain', 'thunderstorm', 'snow'] as Weather[]) {
      expect(maxPlacesPerPage(request({ availableMinutes: 240, weather }))).toBe(1);
    }
  });

  it('2 Std.: jede Gruppe 2 Orte und 1 Aktivität, solange Orte da sind, mit Ort – Aktivität – Ort', () => {
    const result = suggestWithPlaces(catalog(9), request(), input(places()));
    expect(kinds(result.pages[0])).toEqual(['place', 'activity', 'place']);
    for (const page of result.pages) {
      expect(page).toHaveLength(3);
      expect(placeCount(page)).toBeLessThanOrEqual(2);
      expect(page.some((item) => item.kind === 'activity')).toBe(true);
    }
  });

  it('1 Std.: Aktivität – Ort – Aktivität', () => {
    const result = suggestWithPlaces(catalog(9), request({ availableMinutes: 60 }), input(places()));
    expect(kinds(result.pages[0])).toEqual(['activity', 'place', 'activity']);
  });

  it('Regen: höchstens 1 Ort je Gruppe (auch mit halbem Tag)', () => {
    const result = suggestWithPlaces(catalog(9), request({ weather: 'rain', availableMinutes: 240 }), input(places()));
    for (const page of result.pages) expect(placeCount(page)).toBeLessThanOrEqual(1);
    expect(placeCount(result.pages[0])).toBe(1);
  });

  it('zwei Orte einer Gruppe sind aus verschiedenen Kategorien', () => {
    const playgrounds = [makePlace({}, 1), makePlace({}, 1.5), makePlace({}, 2), makePlace({ subtype: 'museum' }, 4)];
    const result = suggestWithPlaces(catalog(9), request(), input(playgrounds));
    for (const page of result.pages) {
      const categories = page.filter((item) => item.kind === 'place').map((item) => (item.kind === 'place' ? item.place.category : ''));
      expect(new Set(categories).size).toBe(categories.length);
    }
  });

  it('der zweite Ort nur mit Kindertauglichkeit 2 oder 3', () => {
    const rows = [makePlace({}, 1), makePlace({ subtype: 'park', kid_weight: 2 }, 1.5), makePlace({ subtype: 'pond', name: 'Teich' }, 0.5)];
    const result = suggestWithPlaces(catalog(12), request(), input(rows));
    for (const page of result.pages) {
      const kidWeights = page.filter((item) => item.kind === 'place').map((item) => (item.kind === 'place' ? item.place.kid_weight : 0));
      if (kidWeights.length === 2) expect(kidWeights[1]).toBeGreaterThanOrEqual(2);
    }
  });

  it('jeder Ort kommt in den Gruppen nur einmal vor (außer beim Auffüllen der letzten Gruppe)', () => {
    const result = suggestWithPlaces(catalog(15), request(), input(fixturePlaces()));
    const shown = result.pages.slice(0, -1).flat().filter((item) => item.kind === 'place').map(key);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('gehen die Orte aus, bestehen die weiteren Gruppen nur aus Aktivitäten', () => {
    const result = suggestWithPlaces(catalog(15), request(), input([makePlace({}, 1)]));
    expect(placeCount(result.pages[0])).toBe(1);
    expect(result.pages.slice(1).every((page) => placeCount(page) === 0)).toBe(true);
  });

  it('ein Kind mag Tiere: der Zoo kommt vor den Spielplatz', () => {
    const zoo = makePlace({ subtype: 'zoo' }, 3);
    const playground = makePlace({}, 3);
    const likesAnimals = request({ children: [makeChild({ years: 5 }, { interests: ['natureAnimals'] })] });
    const first = suggestWithPlaces(catalog(6), likesAnimals, input([playground, zoo])).pages[0];
    expect(first[0].kind === 'place' && first[0].place.id).toBe(zoo.id);
  });
});

describe('Garantie: immer 3, wenn so viele passen (Garantie vor Mischregeln)', () => {
  it('nur 1 Aktivität, aber Orte: die erste Gruppe wird mit Orten auf 3 aufgefüllt (auch bei Regen)', () => {
    const rows = [makePlace({ subtype: 'museum' }, 1), makePlace({ subtype: 'indoorPool' }, 2), makePlace({ subtype: 'library' }, 3)];
    const result = suggestWithPlaces(catalog(1), request({ weather: 'rain' }), input(rows));
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toHaveLength(3);
    expect(result.matchCount).toBe(4);
  });

  it('keine Aktivität passt, aber Orte: eine Gruppe mit 3 Orten', () => {
    const result = suggestWithPlaces([], request(), input(fixturePlaces()));
    expect(result.pages).toHaveLength(1);
    expect(kinds(result.pages[0])).toEqual(['place', 'place', 'place']);
  });

  it('insgesamt nur 2: eine Gruppe mit 2 (wie bisher, mit Hinweis)', () => {
    const result = suggestWithPlaces(catalog(1), request(), input([makePlace({}, 1)]));
    expect(result.pages).toEqual([[expect.objectContaining({ kind: 'activity' }), expect.objectContaining({ kind: 'place' })]]);
    expect(result.matchCount).toBe(2);
  });

  it('die letzte Gruppe wird aufgefüllt, zuerst mit Aktivitäten aus den anderen Gruppen (Regen: kein zweiter Ort)', () => {
    const rows = [makePlace({ subtype: 'museum' }, 1), makePlace({ subtype: 'indoorPool' }, 2), makePlace({ subtype: 'library' }, 3)];
    const result = suggestWithPlaces(catalog(5), request({ weather: 'rain' }), input(rows));
    for (const page of result.pages) {
      expect(page).toHaveLength(3);
      expect(placeCount(page)).toBeLessThanOrEqual(1);
    }
  });

  it('mit den echten Aktivitäten und den Testorten: bei jedem Wetter, jeder Zeit, jedem Monat und jeder Tageszeit genau 3 Karten, ohne Doppelte in einer Gruppe', () => {
    const activities = getBundledActivities(null);
    const rows = fixturePlaces();
    const weathers: Weather[] = ['sunny', 'cloudy', 'rain', 'thunderstorm', 'snow'];
    let checked = 0;
    for (const month of [0, 3, 6, 9, 11]) {
      for (const hour of [8, 14, 19]) {
        for (const weather of weathers) {
          for (const availableMinutes of [30, 60, 120, 240]) {
            for (const severeWarning of [false, true]) {
              const when = new Date(2026, month, 14, hour);
              const req = makeRequest({
                now: when,
                children: [makeChild({ years: 5 })],
                availableMinutes,
                weather,
                severeWarning,
                dayPart: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
              });
              for (const placesInput of [undefined, input([]), input(rows)]) {
                const result = suggestWithPlaces(activities, req, placesInput);
                const plain = suggest(activities, req);
                expect(result.matchCount).toBeGreaterThanOrEqual(plain.matchCount);
                if (result.matchCount >= 3) {
                  for (const page of result.pages) {
                    expect(page).toHaveLength(3);
                    expect(new Set(page.map(key)).size).toBe(3);
                  }
                }
                // Sicherheit wird nie aufgeweicht: bei Gefahr kein Ort draußen.
                if (weather === 'thunderstorm' || severeWarning) {
                  for (const page of result.pages) {
                    for (const item of page) if (item.kind === 'place') expect(item.place.setting).not.toBe('outdoor');
                  }
                }
                checked += 1;
              }
            }
          }
        }
      }
    }
    expect(checked).toBe(5 * 3 * 5 * 4 * 2 * 3);
  });
});
