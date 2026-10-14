// Orte (M10a): Kacheln, Unterarten und die Prüfung einer Zeile. Diese Dateien nutzt ab M10b auch die App.

import { isPlaceSubtype, kidWeightFor, placeCategories, placeKinds, placeSubtypes } from './placeKinds';
import { checkPlaceRow, isHoursPlan, regionKeys } from './placeRow';
import { isTileKey, tileIndexOf, tileKeyOf } from './placeTiles';

describe('Kacheln (0,2° × 0,3°)', () => {
  it('Greiz liegt in Kachel 253_40', () => {
    expect(tileKeyOf(50.66, 12.2)).toBe('253_40');
  });

  it('Grenzen sind genau, auch wo Kommazahlen ungenau wären (50,6 / 0,2 = 252,999…)', () => {
    expect(tileIndexOf(50.6, 12.3)).toEqual({ row: 253, col: 41 });
    expect(tileIndexOf(50.5999999, 12.2999999)).toEqual({ row: 252, col: 40 });
    expect(tileIndexOf(0.9, 2.1)).toEqual({ row: 4, col: 7 });
  });

  it('erkennt gültige Schlüssel', () => {
    expect(isTileKey('253_40')).toBe(true);
    expect(isTileKey('-5_-3')).toBe(true);
    expect(isTileKey('253:40')).toBe(false);
    expect(isTileKey('')).toBe(false);
  });

  it('eine Kachel ist in Deutschland etwa 20 km breit und 22 km hoch', () => {
    const kmPerDegreeLat = 111.2;
    const kmPerDegreeLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);
    expect(0.2 * kmPerDegreeLat).toBeCloseTo(22.2, 0);
    for (const lat of [47.3, 50.7, 54.9]) {
      const width = 0.3 * kmPerDegreeLon(lat);
      expect(width).toBeGreaterThan(19);
      expect(width).toBeLessThan(23);
    }
  });
});

describe('Unterarten', () => {
  it('jede Unterart hat eine bekannte Kategorie und eine Kindertauglichkeit von 0 bis 3', () => {
    for (const subtype of placeSubtypes) {
      const kind = placeKinds[subtype];
      expect(placeCategories).toContain(kind.category);
      expect([0, 1, 2, 3]).toContain(kind.kidWeight);
    }
  });

  it('Startwerte aus dem Plan: Rastplatz und allgemeine Sehenswürdigkeit niedrig, Kino neutral, Spielplatz hoch', () => {
    expect(placeKinds.picnicSite.kidWeight).toBe(0);
    expect(placeKinds.attraction.kidWeight).toBe(0);
    expect(placeKinds.cinema.kidWeight).toBe(1);
    expect(placeKinds.playground.kidWeight).toBe(3);
  });

  it('Parks ohne Namen eine Stufe niedriger, sonst gilt der Wert der Unterart', () => {
    expect(kidWeightFor('park', true)).toBe(2);
    expect(kidWeightFor('park', false)).toBe(1);
    expect(kidWeightFor('playground', false)).toBe(3);
  });

  it('nur Bäder und Badestellen draußen haben eine Standard-Saison', () => {
    const withSeason = placeSubtypes.filter((s) => 'defaultSeason' in placeKinds[s]);
    expect(withSeason.sort()).toEqual(['bathingPlace', 'outdoorPool', 'waterPark']);
  });

  it('isPlaceSubtype kennt nur die Liste', () => {
    expect(isPlaceSubtype('zoo')).toBe(true);
    expect(isPlaceSubtype('toString')).toBe(false);
    expect(isPlaceSubtype('escapeGame')).toBe(false);
  });
});

const validRow = {
  region: 'TH',
  id: 'n123',
  name: 'Tiergehege',
  category: 'animals',
  subtype: 'zoo',
  lat: 50.64,
  lon: 12.23,
  tile: '253_40',
  setting: 'outdoor',
  months: null,
  opening_hours: 'Mo-Su 09:00-18:00',
  hours_kind: 'plan',
  hours_plan: { days: Array.from({ length: 7 }, () => [[540, 1080]]), ph: false },
  website: null,
  locality: 'Greiz',
  street: null,
  kid_weight: 3,
};

describe('checkPlaceRow', () => {
  it('nimmt eine gültige Zeile an', () => {
    expect(checkPlaceRow(validRow)).toEqual({ ok: true, row: validRow });
  });

  it('16 Bundesländer', () => {
    expect(regionKeys).toHaveLength(16);
    expect(new Set(regionKeys).size).toBe(16);
  });

  it.each([
    ['unbekanntes Land', { region: 'XX' }],
    ['ID ohne Typ', { id: '123' }],
    ['ID mit 0', { id: 'n0' }],
    ['Kategorie passt nicht', { category: 'museum' }],
    ['unbekannte Unterart', { subtype: 'escapeGame' }],
    ['Lage im Meer', { lat: 56, tile: tileKeyOf(56, 12.23) }],
    ['falsche Kachel', { tile: '253_41' }],
    ['Saison mit allen 12 Monaten', { months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }],
    ['Saison unsortiert', { months: [9, 5] }],
    ['Website ohne http', { website: 'javascript:alert(1)' }],
    ['Name zu lang', { name: 'x'.repeat(121) }],
    ['Name mit Steuerzeichen', { name: 'a\u0000b' }],
    ['Plan ohne opening_hours', { opening_hours: null }],
    ['Plan mit 6 Tagen', { hours_plan: { days: [[], [], [], [], [], []], ph: false } }],
    ['komplex mit Plan', { hours_kind: 'complex' }],
    ['Kindertauglichkeit 4', { kid_weight: 4 }],
  ])('lehnt ab: %s', (_, change) => {
    expect(checkPlaceRow({ ...validRow, ...change }).ok).toBe(false);
  });

  it('isHoursPlan: Zeiträume sortiert, ohne Überschneidung, 0 bis 1440', () => {
    const week = (day: unknown) => ({ days: Array.from({ length: 7 }, () => day), ph: false });
    expect(isHoursPlan(week([[0, 600], [700, 1440]]))).toBe(true);
    expect(isHoursPlan(week([]))).toBe(true);
    expect(isHoursPlan(week([[700, 800], [600, 650]]))).toBe(false);
    expect(isHoursPlan(week([[600, 600]]))).toBe(false);
    expect(isHoursPlan(week([[0, 1441]]))).toBe(false);
    expect(isHoursPlan(week([[0.5, 10]]))).toBe(false);
  });
});
