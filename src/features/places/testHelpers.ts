// Nur für die Tests: ausgedachte Orte (keine OpenStreetMap-Daten). Die Testdaten in echter Zeilenform liegen in scripts/fixtures/.

import brokenRows from '../../../scripts/fixtures/places-broken.json';
import greizRows from '../../../scripts/fixtures/places-greiz.json';
import importRows from '../../../scripts/fixtures/places-imports.json';
import { placeKinds, type PlaceSubtype } from './placeKinds';
import { checkPlaceRow, type HoursPlan, type PlaceRow } from './placeRow';
import { tileKeyOf } from './placeTiles';

// Der ausgedachte Standort der Testdaten (gerundet wie in der App).
export const fixtureOrigin = { lat: 50.66, lon: 12.2 };

export const fixtureRows: unknown[] = greizRows;
export const fixtureBrokenRows: unknown[] = brokenRows;
export const fixtureImports: unknown[] = importRows;

// Die gültigen Zeilen der Testdaten, geprüft wie in der App.
export function fixturePlaces(): PlaceRow[] {
  return fixtureRows.map((raw) => {
    const check = checkPlaceRow(raw);
    if (!check.ok) throw new Error(`Testdaten kaputt: ${check.reason}`);
    return check.row;
  });
}

let counter = 0;

// Ein Ort mit sinnvollen Standardwerten, `km` nördlich des Standorts. Beispiel: makePlace({ subtype: 'zoo' }, 3).
export function makePlace(overrides: Partial<PlaceRow> & { subtype?: PlaceSubtype } = {}, northKm = 2): PlaceRow {
  counter += 1;
  const subtype = overrides.subtype ?? 'playground';
  const kind = placeKinds[subtype];
  const lat = overrides.lat ?? Math.round((fixtureOrigin.lat + northKm / 111.2) * 1e6) / 1e6;
  const lon = overrides.lon ?? fixtureOrigin.lon;
  return {
    region: 'TH',
    id: `n${8000 + counter}`,
    name: null,
    category: kind.category,
    subtype,
    lat,
    lon,
    tile: tileKeyOf(lat, lon),
    setting: kind.setting,
    months: null,
    opening_hours: null,
    hours_kind: null,
    hours_plan: null,
    website: null,
    locality: 'Musterstadt',
    street: null,
    kid_weight: kind.kidWeight,
    ...overrides,
  };
}

// Wochenplan: jeden Tag dieselben Zeiten.
export function everyDay(intervals: [number, number][], ph = false): HoursPlan {
  return { days: Array.from({ length: 7 }, () => intervals), ph };
}

// Ein Ort mit festem Wochenplan.
export function withPlan(plan: HoursPlan, overrides: Partial<PlaceRow> = {}, northKm = 2): PlaceRow {
  return makePlace({ opening_hours: 'Mo-Su (Test)', hours_kind: 'plan', hours_plan: plan, ...overrides }, northKm);
}
