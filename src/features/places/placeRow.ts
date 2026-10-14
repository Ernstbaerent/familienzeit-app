// Orte (M10): eine Zeile der Supabase-Tabelle `places` (supabase/migrations/0003_places.sql) und ihre Prüfung.
// Der Import prüft jede Zeile hiermit, bevor er sie hochlädt; die App ab M10b, bevor sie sie benutzt.
// Kaputte Zeilen werden nie „repariert“, sondern verworfen (wie bei den Aktivitäten).

import { isPlaceSubtype, placeKinds, type KidWeight, type PlaceCategory, type PlaceSetting, type PlaceSubtype } from './placeKinds.ts';
import { isTileKey, tileKeyOf } from './placeTiles.ts';

// Die 16 Bundesländer, Kürzel nach ISO 3166-2:DE (ohne „DE-“).
export const regionKeys = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'] as const;
export type RegionKey = (typeof regionKeys)[number];

export function isRegionKey(value: unknown): value is RegionKey {
  return typeof value === 'string' && (regionKeys as readonly string[]).includes(value);
}

// Öffnungszeiten, vom Import vereinfacht (docs/orte.md, „Öffnungszeiten“):
//   plan    = ein fester Wochenplan, der das ganze Jahr gilt (ggf. nur in `months`); `hours_plan` ist gesetzt.
//   complex = gültig, aber nicht als fester Wochenplan darstellbar (Ferien, Sonnenaufgang, „nach Vereinbarung“ …).
//   invalid = `opening_hours` ließ sich nicht lesen.
// Fehlt `opening_hours`, ist `hours_kind` leer (null). In allen Fällen außer `plan` zeigt die App „Öffnungszeiten vorher prüfen“.
export type HoursKind = 'plan' | 'complex' | 'invalid';

// Ein Zeitraum an einem Tag in Minuten ab Mitternacht, Ende ausschließlich (1440 = bis Mitternacht).
export type DayInterval = readonly [number, number];

export type HoursPlan = {
  days: readonly (readonly DayInterval[])[]; // genau 7 Einträge: Montag bis Sonntag
  ph: boolean; // `opening_hours` nennt Feiertage (PH): an Feiertagen gilt der Plan nicht sicher
};

export type PlaceRow = {
  region: RegionKey;
  id: string; // OSM-Typ und Nummer: n123 (Punkt), w456 (Linie/Fläche), r789 (Relation)
  name: string | null;
  category: PlaceCategory;
  subtype: PlaceSubtype;
  lat: number;
  lon: number;
  tile: string;
  setting: PlaceSetting;
  months: number[] | null; // Saison (1–12), null = ganzes Jahr
  opening_hours: string | null; // Rohtext aus OSM
  hours_kind: HoursKind | null;
  hours_plan: HoursPlan | null;
  website: string | null;
  locality: string | null; // Ortsteil oder Ort, damit namenlose Orte beschreibbar sind („Spielplatz in Pohlitz“)
  street: string | null;
  kid_weight: KidWeight;
};

export const placeTextLimits = { name: 120, openingHours: 255, website: 300, locality: 80, street: 80 } as const;

export type PlaceRowCheck = { ok: true; row: PlaceRow } | { ok: false; reason: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text === '' || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) return undefined;
  return text;
}

export function isHoursPlan(value: unknown): value is HoursPlan {
  if (!isObject(value) || typeof value.ph !== 'boolean' || !Array.isArray(value.days) || value.days.length !== 7) return false;
  return value.days.every((day) => {
    if (!Array.isArray(day) || day.length > 6) return false;
    let previousEnd = -1;
    return day.every((interval) => {
      if (!Array.isArray(interval) || interval.length !== 2) return false;
      const [start, end] = interval;
      const valid = Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end <= 1440 && start < end && start > previousEnd;
      previousEnd = end;
      return valid;
    });
  });
}

function isWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

// Prüft eine Zeile vollständig (Form, Grenzen, Kachel passt zur Lage, Kategorie passt zur Unterart).
export function checkPlaceRow(value: unknown): PlaceRowCheck {
  if (!isObject(value)) return { ok: false, reason: 'keine Zeile' };
  const fail = (reason: string): PlaceRowCheck => ({ ok: false, reason: `${String(value.id ?? '?')}: ${reason}` });

  if (!isRegionKey(value.region)) return fail('unbekanntes Bundesland');
  if (typeof value.id !== 'string' || !/^[nwr][1-9]\d{0,14}$/.test(value.id)) return fail('ID nicht in der Form n123/w123/r123');
  if (!isPlaceSubtype(value.subtype)) return fail('unbekannte Unterart');
  const kind = placeKinds[value.subtype];
  if (value.category !== kind.category) return fail('Kategorie passt nicht zur Unterart');

  const lat = value.lat;
  const lon = value.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return fail('Lage fehlt');
  if (lat < 47 || lat > 55.2 || lon < 5.5 || lon > 15.3) return fail('Lage außerhalb Deutschlands');
  if (!isTileKey(value.tile) || value.tile !== tileKeyOf(lat, lon)) return fail('Kachel passt nicht zur Lage');
  if (value.setting !== 'indoor' && value.setting !== 'outdoor' && value.setting !== 'both') return fail('drinnen/draußen fehlt');

  let months: number[] | null = null;
  if (value.months !== null && value.months !== undefined) {
    if (
      !Array.isArray(value.months) ||
      value.months.length < 1 ||
      value.months.length > 11 ||
      !value.months.every((m, i, all) => Number.isInteger(m) && m >= 1 && m <= 12 && (i === 0 || m > all[i - 1]))
    ) {
      return fail('Saison ungültig (1 bis 11 Monate, aufsteigend)');
    }
    months = value.months as number[];
  }

  const name = optionalText(value.name, placeTextLimits.name);
  const openingHours = optionalText(value.opening_hours, placeTextLimits.openingHours);
  const website = optionalText(value.website, placeTextLimits.website);
  const locality = optionalText(value.locality, placeTextLimits.locality);
  const street = optionalText(value.street, placeTextLimits.street);
  if (name === undefined) return fail('Name ungültig');
  if (openingHours === undefined) return fail('opening_hours ungültig');
  if (website === undefined || (website !== null && !isWebsite(website))) return fail('Website ungültig');
  if (locality === undefined) return fail('Ortsteil ungültig');
  if (street === undefined) return fail('Straße ungültig');

  const hoursKind = value.hours_kind ?? null;
  if (hoursKind !== null && hoursKind !== 'plan' && hoursKind !== 'complex' && hoursKind !== 'invalid') return fail('hours_kind ungültig');
  if ((hoursKind === null) !== (openingHours === null)) return fail('hours_kind passt nicht zu opening_hours');
  const hoursPlan = value.hours_plan ?? null;
  if (hoursKind === 'plan' ? !isHoursPlan(hoursPlan) : hoursPlan !== null) return fail('hours_plan passt nicht zu hours_kind');

  const kidWeight = value.kid_weight;
  if (kidWeight !== 0 && kidWeight !== 1 && kidWeight !== 2 && kidWeight !== 3) return fail('kid_weight muss 0 bis 3 sein');

  return {
    ok: true,
    row: {
      region: value.region,
      id: value.id,
      name,
      category: kind.category,
      subtype: value.subtype,
      lat,
      lon,
      tile: value.tile,
      setting: value.setting,
      months,
      opening_hours: openingHours,
      hours_kind: hoursKind,
      hours_plan: hoursKind === 'plan' ? (hoursPlan as HoursPlan) : null,
      website,
      locality,
      street,
      kid_weight: kidWeight,
    },
  };
}
