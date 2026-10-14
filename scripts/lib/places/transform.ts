// Orte-Import (M10a): aus den Zeilen von `osmium export` (GeoJSON, eine Zeile je Objekt) die Zeilen für `places` machen.
// Reine Logik: Die Zeilen kommen als Liste oder Strom herein, die Öffnungszeiten-Auswertung wird hineingegeben.

import { kidWeightFor, placeKinds } from '../../../src/features/places/placeKinds.ts';
import { checkPlaceRow, placeTextLimits, type PlaceRow, type RegionKey } from '../../../src/features/places/placeRow.ts';
import { tileKeyOf } from '../../../src/features/places/placeTiles.ts';
import { classifyTags, localityRadiusMeters, localityTypeOf, type SkipReason, type Tags } from './classify.ts';
import { cleanText, cleanWebsite } from './clean.ts';
import { dedupePlaces, type DedupeItem } from './dedupe.ts';
import { haversineMeters, isAreaGeometry, isInsidePoly, representativePoint, type Poly } from './geometry.ts';
import type { HoursResult } from './hours.ts';
import { seasonOf } from './season.ts';

export type TransformInput = {
  region: RegionKey;
  ownPoly: Poly; // Umriss des Landes: Orte außerhalb (Rand des Auszugs) gehören zum Nachbarland
  excludePolys: readonly Poly[]; // z. B. Berlin im Auszug von Brandenburg
  normalizeHours: (raw: string) => HoursResult;
};

export type TransformStats = {
  features: number; // Zeilen aus osmium
  unreadable: number; // keine gültige Zeile (JSON, ID)
  matched: number; // passende Unterart gefunden
  skipped: Record<Exclude<SkipReason, 'notMatched'>, number>;
  noGeometry: number;
  outsideRegion: number;
  duplicatesMerged: number;
  closedForGood: number; // opening_hours sagt: nie offen (z. B. „off“)
  invalidRows: number; // sollte 0 sein: Zeile hat die Prüfung (checkPlaceRow) nicht bestanden
  invalidExamples: string[];
  localities: number; // Punkte mit place=… (für „Ortsteil oder Ort“)
  rows: number;
  bySubtype: Record<string, number>;
  withName: number;
  withLocality: number;
  withWebsite: number;
  hours: { plan: number; complex: number; invalid: number; none: number };
  withSeason: number;
  bathSettingGuessed: number; // Bäder, bei denen weder Merkmale noch Name drinnen/draußen verraten (Standard benutzt)
};

type Candidate = DedupeItem & {
  subtype: keyof typeof placeKinds;
  setting: 'indoor' | 'outdoor' | 'both';
  seasonal: string | undefined;
  suburb: string | null;
  city: string | null;
  bathGuessed: boolean;
};

type Locality = { name: string; lat: number; lon: number; radius: number };

const typePrefix: Record<string, string> = { node: 'n', way: 'w', relation: 'r' };

function readFeature(line: string): { id: string; isNode: boolean; tags: Tags; geometry: unknown } | null {
  let feature: unknown;
  try {
    feature = JSON.parse(line);
  } catch {
    return null;
  }
  const properties = (feature as { properties?: unknown } | null)?.properties;
  if (typeof properties !== 'object' || properties === null) return null;
  const { '@type': type, '@id': id, ...rest } = properties as Record<string, unknown>;
  const prefix = typeof type === 'string' ? typePrefix[type] : undefined;
  if (!prefix || typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return null;
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(rest)) if (typeof value === 'string') tags[key] = value;
  return { id: `${prefix}${id}`, isNode: prefix === 'n', tags, geometry: (feature as { geometry?: unknown }).geometry };
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

// Raster für die Ortsteile: Zellen von etwa 11 km, der größte Umkreis (Stadt) ist 8 km.
const localityCellLat = 0.1;
const localityCellLon = 0.15;
const localityCell = (lat: number, lon: number) => [Math.floor(lat / localityCellLat), Math.floor(lon / localityCellLon)] as const;

function nearestLocality(grid: Map<string, Locality[]>, lat: number, lon: number): string | null {
  const [row, col] = localityCell(lat, lon);
  let best: { name: string; score: number } | null = null;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      for (const locality of grid.get(`${row + dr}:${col + dc}`) ?? []) {
        // Je kleiner der Ort (Ortsteil statt Stadt), desto kleiner sein Umkreis. Gewinner ist der relativ nächste.
        const score = haversineMeters(lat, lon, locality.lat, locality.lon) / locality.radius;
        if (score <= 1 && (!best || score < best.score)) best = { name: locality.name, score };
      }
    }
  }
  return best?.name ?? null;
}

export async function transformFeatures(
  lines: AsyncIterable<string> | Iterable<string>,
  input: TransformInput,
): Promise<{ rows: PlaceRow[]; stats: TransformStats }> {
  const stats: TransformStats = {
    features: 0,
    unreadable: 0,
    matched: 0,
    skipped: { notPublic: 0, disused: 0, nameMissing: 0 },
    noGeometry: 0,
    outsideRegion: 0,
    duplicatesMerged: 0,
    closedForGood: 0,
    invalidRows: 0,
    invalidExamples: [],
    localities: 0,
    rows: 0,
    bySubtype: {},
    withName: 0,
    withLocality: 0,
    withWebsite: 0,
    hours: { plan: 0, complex: 0, invalid: 0, none: 0 },
    withSeason: 0,
    bathSettingGuessed: 0,
  };
  const candidates: Candidate[] = [];
  const localityGrid = new Map<string, Locality[]>();

  for await (const line of lines) {
    if (line.trim() === '') continue;
    stats.features += 1;
    const feature = readFeature(line.replace(/^\u001e/, ''));
    if (!feature) {
      stats.unreadable += 1;
      continue;
    }

    // Ortsnamen sammeln (place=suburb, village …). Sie können zugleich selbst kein Ziel sein.
    const localityType = feature.isNode ? localityTypeOf(feature.tags) : null;
    if (localityType) {
      const point = representativePoint(feature.geometry);
      const name = cleanText(feature.tags.name, placeTextLimits.locality);
      if (point && name) {
        stats.localities += 1;
        const [row, col] = localityCell(point.lat, point.lon);
        const key = `${row}:${col}`;
        const entry = { name, lat: point.lat, lon: point.lon, radius: localityRadiusMeters[localityType] };
        const list = localityGrid.get(key);
        if (list) list.push(entry);
        else localityGrid.set(key, [entry]);
      }
    }

    const classification = classifyTags(feature.tags, (subtype) => placeKinds[subtype].setting);
    if (!classification.ok) {
      if (classification.reason !== 'notMatched') stats.skipped[classification.reason] += 1;
      continue;
    }
    stats.matched += 1;
    const point = representativePoint(feature.geometry);
    if (!point) {
      stats.noGeometry += 1;
      continue;
    }
    if (!isInsidePoly(input.ownPoly, point.lat, point.lon) || input.excludePolys.some((poly) => isInsidePoly(poly, point.lat, point.lon))) {
      stats.outsideRegion += 1;
      continue;
    }
    const { subtype, setting } = classification;
    const isBath = subtype === 'indoorPool' || subtype === 'outdoorPool' || subtype === 'pool' || subtype === 'waterPark';
    const tags = feature.tags;
    candidates.push({
      id: feature.id,
      name: cleanText(tags.name, placeTextLimits.name),
      category: placeKinds[subtype].category,
      subtype,
      setting,
      lat: round(point.lat, 6),
      lon: round(point.lon, 6),
      isArea: isAreaGeometry(feature.geometry),
      openingHours: cleanText(tags.opening_hours, placeTextLimits.openingHours),
      website: cleanWebsite(tags),
      street: cleanText(tags['addr:street'], placeTextLimits.street),
      seasonal: tags.seasonal,
      suburb: cleanText(tags['addr:suburb'], placeTextLimits.locality),
      city: cleanText(tags['addr:city'], placeTextLimits.locality),
      bathGuessed: isBath && !hasBathEvidence(tags),
    });
  }

  const { kept, merged } = dedupePlaces(candidates);
  stats.duplicatesMerged = merged;

  const rows: PlaceRow[] = [];
  for (const candidate of kept) {
    let hours: HoursResult | null = null;
    if (candidate.openingHours) {
      hours = input.normalizeHours(candidate.openingHours);
      if (hours.kind === 'closed') {
        stats.closedForGood += 1;
        continue;
      }
    }
    const months = seasonOf({
      subtype: candidate.subtype,
      setting: candidate.setting,
      hoursMonths: hours?.months ?? null,
      seasonal: candidate.seasonal,
    });
    const row = {
      region: input.region,
      id: candidate.id,
      name: candidate.name,
      category: candidate.category,
      subtype: candidate.subtype,
      lat: candidate.lat,
      lon: candidate.lon,
      tile: tileKeyOf(candidate.lat, candidate.lon),
      setting: candidate.setting,
      months,
      opening_hours: candidate.openingHours,
      hours_kind: hours ? hours.kind : null,
      hours_plan: hours?.kind === 'plan' ? hours.plan : null,
      website: candidate.website,
      locality: candidate.suburb ?? nearestLocality(localityGrid, candidate.lat, candidate.lon) ?? candidate.city,
      street: candidate.street,
      kid_weight: kidWeightFor(candidate.subtype, candidate.name !== null),
    };
    const check = checkPlaceRow(row);
    if (!check.ok) {
      stats.invalidRows += 1;
      if (stats.invalidExamples.length < 10) stats.invalidExamples.push(check.reason);
      continue;
    }
    rows.push(check.row);
    stats.bySubtype[candidate.subtype] = (stats.bySubtype[candidate.subtype] ?? 0) + 1;
    if (row.name) stats.withName += 1;
    if (row.locality) stats.withLocality += 1;
    if (row.website) stats.withWebsite += 1;
    if (row.months) stats.withSeason += 1;
    if (candidate.bathGuessed) stats.bathSettingGuessed += 1;
    stats.hours[row.hours_kind ?? 'none'] += 1;
  }
  stats.rows = rows.length;
  return { rows, stats };
}

// Verraten Merkmale oder Name, ob ein Bad drinnen oder draußen ist? (Für den Bericht: Wie oft wurde geraten?)
function hasBathEvidence(tags: Tags): boolean {
  if (tags.indoor || tags.covered || tags.location || tags.building) return true;
  return /hallenbad|schwimmhalle|erlebnisbad|spa(ß|ss)bad|therme|thermalbad|badeland|badewelt|freibad|waldbad|naturbad|strandbad|sommerbad|flussbad|seebad|badesee|freiluftbad|bergbad|kombibad/i.test(
    tags.name ?? '',
  );
}
