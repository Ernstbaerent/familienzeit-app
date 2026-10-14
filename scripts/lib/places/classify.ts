// Orte-Import (M10a): Welche Unterart ist ein OSM-Objekt? Reine Funktion auf den Merkmalen (tags).
// Die Liste entspricht den Kategorien des Machbarkeitstests (docs/machbarkeit-orte.md) mit den Änderungen aus dem Plan zu M10:
// keine Escape Games (Buchung nötig, eher ab 12), keine Wanderwege (eine Route hat keinen einzelnen Ort, kommt später),
// Kinos ja (mit Hinweis in der App ab M10b).

import type { PlaceSetting, PlaceSubtype } from '../../../src/features/places/placeKinds.ts';

export type Tags = Readonly<Record<string, string>>;

export type SkipReason = 'notMatched' | 'notPublic' | 'disused' | 'nameMissing';

export type Classification = { ok: true; subtype: PlaceSubtype; setting: PlaceSetting } | { ok: false; reason: SkipReason };

// Nicht öffentlich: privat, verboten, nur für Kunden oder Mitglieder (z. B. Vereinsbad, Spielplatz eines Restaurants).
const notPublicAccess = ['private', 'no', 'customers', 'members'];

// Werte in OSM können mit „;“ getrennt sein (sport=swimming;diving).
function valuesOf(tags: Tags, key: string): string[] {
  const value = tags[key];
  return value ? value.split(';').map((part) => part.trim().toLowerCase()).filter(Boolean) : [];
}

const has = (tags: Tags, key: string, ...values: string[]) => valuesOf(tags, key).some((v) => values.includes(v));
const hasName = (tags: Tags) => (tags.name ?? '').trim() !== '';

// Hallen- oder Freibad? Erst die Merkmale, dann der Name, sonst `fallback`.
const indoorWords = ['hallenbad', 'schwimmhalle', 'erlebnisbad', 'spaßbad', 'spassbad', 'therme', 'thermalbad', 'badeland', 'badewelt'];
const outdoorWords = ['freibad', 'waldbad', 'naturbad', 'strandbad', 'sommerbad', 'flussbad', 'seebad', 'badesee', 'freiluftbad', 'bergbad'];

export function detectBathSetting(tags: Tags, fallback: PlaceSetting): PlaceSetting {
  if (has(tags, 'indoor', 'yes') || has(tags, 'covered', 'yes') || has(tags, 'location', 'indoor')) return 'indoor';
  if (tags.building && !has(tags, 'building', 'no')) return 'indoor';
  if (has(tags, 'indoor', 'no') || has(tags, 'covered', 'no') || has(tags, 'location', 'outdoor')) return 'outdoor';
  // „Naturerlebnisbad“ ist ein Freibad, obwohl „erlebnisbad“ darin steckt.
  const name = (tags.name ?? '').toLowerCase().replace(/naturerlebnisbad/g, 'naturbad');
  if (name.includes('kombibad')) return 'both';
  const indoor = indoorWords.some((word) => name.includes(word));
  const outdoor = outdoorWords.some((word) => name.includes(word));
  if (indoor && outdoor) return 'both';
  if (indoor) return 'indoor';
  if (outdoor) return 'outdoor';
  return fallback;
}

function poolSubtype(setting: PlaceSetting): PlaceSubtype {
  return setting === 'indoor' ? 'indoorPool' : setting === 'outdoor' ? 'outdoorPool' : 'pool';
}

type Rule = { subtype: PlaceSubtype; setting?: PlaceSetting; requireName?: boolean };

function match(tags: Tags): Rule | null {
  const leisure = (...values: string[]) => has(tags, 'leisure', ...values);
  const tourism = (...values: string[]) => has(tags, 'tourism', ...values);
  const sportsCentre = leisure('sports_centre', 'sports_hall');

  if (leisure('playground')) return { subtype: has(tags, 'indoor', 'yes') ? 'indoorPlayground' : 'playground' };
  if (leisure('indoor_play')) return { subtype: 'indoorPlayground' };
  if (leisure('trampoline_park')) return { subtype: 'trampolinePark' };
  if (leisure('water_park')) return { subtype: 'waterPark', setting: detectBathSetting(tags, 'outdoor') };
  if (sportsCentre && has(tags, 'sport', 'swimming')) return { subtype: poolSubtype(detectBathSetting(tags, 'indoor')) };
  if (leisure('swimming_pool')) return { subtype: poolSubtype(detectBathSetting(tags, 'outdoor')), requireName: true };
  if (sportsCentre && has(tags, 'sport', 'climbing', 'bouldering')) return { subtype: 'climbingHall' };
  if (leisure('bathing_place')) return { subtype: 'bathingPlace' };
  if (leisure('miniature_golf')) return { subtype: 'miniGolf' };
  if (leisure('bowling_alley')) return { subtype: 'bowling' };
  if (leisure('ice_rink')) return { subtype: 'iceRink', setting: detectBathSetting(tags, 'both') };
  if (leisure('park')) return { subtype: 'park' };
  if (leisure('nature_reserve')) return { subtype: 'natureReserve', requireName: true };
  if (tourism('theme_park')) return { subtype: 'themePark' };
  if (tourism('zoo')) return { subtype: 'zoo' };
  if (tourism('aquarium')) return { subtype: 'aquarium' };
  if (tourism('museum')) return { subtype: 'museum' };
  if (has(tags, 'historic', 'castle')) return { subtype: 'castle', requireName: true };
  if (has(tags, 'man_made', 'tower') && has(tags, 'tower:type', 'observation')) return { subtype: 'observationTower' };
  if (has(tags, 'historic', 'ruins')) return { subtype: 'ruins', requireName: true };
  if (tourism('viewpoint')) return { subtype: 'viewpoint', requireName: true };
  if (tourism('attraction')) return { subtype: 'attraction', requireName: true };
  if (tourism('picnic_site')) return { subtype: 'picnicSite', requireName: true };
  if (has(tags, 'natural', 'water') && has(tags, 'water', 'lake', 'reservoir')) return { subtype: 'lake', requireName: true };
  if (has(tags, 'natural', 'water') && has(tags, 'water', 'pond')) return { subtype: 'pond', requireName: true };
  if (has(tags, 'amenity', 'cinema')) return { subtype: 'cinema' };
  if (has(tags, 'amenity', 'library')) return { subtype: 'library' };
  return null;
}

export function classifyTags(tags: Tags, defaultSettingOf: (subtype: PlaceSubtype) => PlaceSetting): Classification {
  const rule = match(tags);
  if (!rule) return { ok: false, reason: 'notMatched' };
  if (has(tags, 'access', ...notPublicAccess)) return { ok: false, reason: 'notPublic' };
  if (has(tags, 'disused', 'yes') || has(tags, 'abandoned', 'yes')) return { ok: false, reason: 'disused' };
  if (rule.requireName && !hasName(tags)) return { ok: false, reason: 'nameMissing' };
  return { ok: true, subtype: rule.subtype, setting: rule.setting ?? defaultSettingOf(rule.subtype) };
}

// Orte für „Ortsteil oder Ort“: Punkte mit place=… und Namen. Je Art ein Umkreis, in dem der Name noch passt.
export const localityRadiusMeters = {
  neighbourhood: 1000,
  hamlet: 1500,
  quarter: 2500,
  suburb: 3000,
  village: 3000,
  town: 5000,
  city: 8000,
} as const;

export type LocalityType = keyof typeof localityRadiusMeters;

export function localityTypeOf(tags: Tags): LocalityType | null {
  const place = (tags.place ?? '').trim().toLowerCase();
  if (!hasName(tags) || !Object.prototype.hasOwnProperty.call(localityRadiusMeters, place)) return null;
  return place as LocalityType;
}
