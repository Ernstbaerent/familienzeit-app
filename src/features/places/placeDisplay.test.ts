// Orte (M10b): Titel, Entfernung, Hinweise und „Stand: vor n Tagen“ in beiden Sprachen.

import { createInstance, type TFunction } from 'i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

import { distanceText, isCinema, needsHoursCheck, placeMetaLine, placeNotes, placeTitle, staleDays } from './placeDisplay';
import { placeSubtypes } from './placeKinds';
import { everyDay, makePlace, withPlan } from './testHelpers';

function translator(language: 'de' | 'en'): TFunction {
  const i18n = createInstance();
  i18n.init({ resources: { de: { translation: de }, en: { translation: en } }, lng: language, interpolation: { escapeValue: false } });
  return i18n.t;
}

const tDe = translator('de');
const tEn = translator('en');

describe('Titel (Erkenntnis 3 aus M2a: namenlose Orte über Ortsteil oder Straße)', () => {
  it('der Name, wenn es einen gibt', () => {
    expect(placeTitle(tDe, makePlace({ name: 'Waldbad Erlengrund', subtype: 'outdoorPool' }))).toBe('Waldbad Erlengrund');
  });

  it('sonst „Spielplatz in Pohlitz“ / „Playground in Pohlitz“', () => {
    const row = makePlace({ locality: 'Pohlitz' });
    expect(placeTitle(tDe, row)).toBe('Spielplatz in Pohlitz');
    expect(placeTitle(tEn, row)).toBe('Playground in Pohlitz');
  });

  it('sonst mit Straße, sonst nur die Unterart', () => {
    expect(placeTitle(tDe, makePlace({ locality: null, street: 'Erlenweg' }))).toBe('Spielplatz, Erlenweg');
    expect(placeTitle(tDe, makePlace({ locality: null }))).toBe('Spielplatz');
    expect(placeTitle(tEn, makePlace({ subtype: 'park', locality: null }))).toBe('Park');
  });
});

describe('Entfernung und Zeile unter dem Titel', () => {
  it('„ca. 4 km“, unter 1 km „unter 1 km“, ganze km', () => {
    expect(distanceText(tDe, 4.4)).toBe('ca. 4 km');
    expect(distanceText(tDe, 0.6)).toBe('unter 1 km');
    expect(distanceText(tEn, 12.6)).toBe('approx. 13 km');
    expect(distanceText(tEn, 0.2)).toBe('under 1 km');
  });

  it('„ca. 4 km · Pohlitz“; steht der Ortsteil schon im Titel, nur die Entfernung', () => {
    expect(placeMetaLine(tDe, makePlace({ name: 'Tiergehege', locality: 'Pohlitz' }), 4)).toBe('ca. 4 km · Pohlitz');
    expect(placeMetaLine(tDe, makePlace({ locality: 'Pohlitz' }), 4)).toBe('ca. 4 km');
  });
});

describe('Hinweise', () => {
  it('„Öffnungszeiten vorher prüfen“ außer bei festem Plan ohne Feiertagsregel', () => {
    expect(needsHoursCheck(makePlace())).toBe(true);
    expect(needsHoursCheck(makePlace({ opening_hours: 'x', hours_kind: 'complex' }))).toBe(true);
    expect(needsHoursCheck(makePlace({ opening_hours: 'x', hours_kind: 'invalid' }))).toBe(true);
    expect(needsHoursCheck(withPlan(everyDay([[600, 1020]], true)))).toBe(true);
    expect(needsHoursCheck(withPlan(everyDay([[600, 1020]])))).toBe(false);
  });

  it('Kino: „Programm und Altersfreigabe vorher prüfen“ zuerst', () => {
    const cinema = makePlace({ subtype: 'cinema', name: 'Kino am Markt' });
    expect(isCinema(cinema)).toBe(true);
    expect(placeNotes(tDe, cinema)).toEqual(['Programm und Altersfreigabe vorher prüfen', 'Öffnungszeiten vorher prüfen']);
    expect(placeNotes(tEn, cinema)).toEqual(['Check the programme and age rating before you go', 'Check opening hours before you go']);
    expect(placeNotes(tDe, withPlan(everyDay([[0, 1440]])))).toEqual([]);
  });
});

describe('Stand: vor n Tagen', () => {
  const now = new Date(2026, 9, 14).getTime();
  const day = 24 * 60 * 60 * 1000;

  it('nur, wenn eine Kachel der gezeigten Orte älter als 30 Tage ist; es zählt die älteste', () => {
    const a = makePlace({}, 1);
    const b = makePlace({ lat: 50.9, lon: 12.5 });
    expect(staleDays([a], { [a.tile]: now - 30 * day }, now)).toBeNull();
    expect(staleDays([a, b], { [a.tile]: now - 10 * day, [b.tile]: now - 42 * day }, now)).toBe(42);
    expect(staleDays([], {}, now)).toBeNull();
  });

  it('Text in beiden Sprachen', () => {
    expect(tDe('places.stale', { count: 42 })).toBe('Stand: vor 42 Tagen');
    expect(tEn('places.stale', { count: 42 })).toBe('Data from 42 days ago');
  });
});

describe('Übersetzungen', () => {
  it('jede Unterart hat einen Namen in de und en', () => {
    for (const subtype of placeSubtypes) {
      expect(de.places.subtypes[subtype]).toBeTruthy();
      expect(en.places.subtypes[subtype]).toBeTruthy();
    }
  });

  it('de und en haben für Orte genau dieselben Schlüssel', () => {
    const keys = (value: unknown, prefix = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
        : [prefix];
    expect(keys(en.places).sort()).toEqual(keys(de.places).sort());
  });

  it('Quellenangabe nach den Attribution Guidelines', () => {
    expect(de.places.source).toBe('Orte: © OpenStreetMap-Mitwirkende');
    expect(en.places.source).toBe('Places: © OpenStreetMap contributors');
    expect(de.places.license).toContain('ODbL');
    expect(en.places.license).toContain('ODbL');
  });
});
