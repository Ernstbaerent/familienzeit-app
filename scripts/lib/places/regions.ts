// Orte-Import (M10a): die 16 Bundesländer als einzelne Geofabrik-Auszüge.
// Ein Lauf bearbeitet sie nacheinander (docs/orte.md). Der Pilot sind Thüringen und Sachsen.

import { isRegionKey, regionKeys, type RegionKey } from '../../../src/features/places/placeRow.ts';

export type Region = {
  key: RegionKey;
  slug: string; // Dateiname bei Geofabrik: europe/germany/<slug>-latest.osm.pbf und <slug>.poly
  name: string; // Name des Landes, auch für die Feiertage in opening_hours (PH)
  center: { lat: number; lon: number }; // ungefähre Mitte, nur für die Auswertung der Öffnungszeiten (Sonnenaufgang)
  // Geofabrik liefert Niedersachsen mit Bremen (und nach unserem Stand Brandenburg mit Berlin). Orte, die im Umriss
  // eines dieser Länder liegen, gehören zu dessen eigenem Import und werden hier weggelassen. Liefert Geofabrik
  // die Länder doch getrennt, schadet die Regel nicht (dann liegt dort einfach nichts).
  excludeInside?: readonly RegionKey[];
};

export const regions: Readonly<Record<RegionKey, Region>> = {
  BW: { key: 'BW', slug: 'baden-wuerttemberg', name: 'Baden-Württemberg', center: { lat: 48.66, lon: 9.35 } },
  BY: { key: 'BY', slug: 'bayern', name: 'Bayern', center: { lat: 48.95, lon: 11.4 } },
  BE: { key: 'BE', slug: 'berlin', name: 'Berlin', center: { lat: 52.52, lon: 13.4 } },
  BB: { key: 'BB', slug: 'brandenburg', name: 'Brandenburg', center: { lat: 52.41, lon: 12.53 }, excludeInside: ['BE'] },
  HB: { key: 'HB', slug: 'bremen', name: 'Bremen', center: { lat: 53.08, lon: 8.8 } },
  HH: { key: 'HH', slug: 'hamburg', name: 'Hamburg', center: { lat: 53.55, lon: 10.0 } },
  HE: { key: 'HE', slug: 'hessen', name: 'Hessen', center: { lat: 50.65, lon: 9.16 } },
  MV: { key: 'MV', slug: 'mecklenburg-vorpommern', name: 'Mecklenburg-Vorpommern', center: { lat: 53.61, lon: 12.43 } },
  NI: { key: 'NI', slug: 'niedersachsen', name: 'Niedersachsen', center: { lat: 52.64, lon: 9.85 }, excludeInside: ['HB'] },
  NW: { key: 'NW', slug: 'nordrhein-westfalen', name: 'Nordrhein-Westfalen', center: { lat: 51.43, lon: 7.66 } },
  RP: { key: 'RP', slug: 'rheinland-pfalz', name: 'Rheinland-Pfalz', center: { lat: 49.91, lon: 7.45 } },
  SL: { key: 'SL', slug: 'saarland', name: 'Saarland', center: { lat: 49.4, lon: 6.96 } },
  SN: { key: 'SN', slug: 'sachsen', name: 'Sachsen', center: { lat: 51.05, lon: 13.34 } },
  ST: { key: 'ST', slug: 'sachsen-anhalt', name: 'Sachsen-Anhalt', center: { lat: 51.95, lon: 11.69 } },
  SH: { key: 'SH', slug: 'schleswig-holstein', name: 'Schleswig-Holstein', center: { lat: 54.22, lon: 9.7 } },
  TH: { key: 'TH', slug: 'thueringen', name: 'Thüringen', center: { lat: 50.86, lon: 11.05 } },
};

// Der Pilot (M10a): erst Thüringen und Sachsen, danach schaltet die Eingabe `all` auf alle Länder.
export const pilotRegions: readonly RegionKey[] = ['TH', 'SN'];

export const geofabrikBase = 'https://download.geofabrik.de/europe/germany';
export const geofabrikHost = 'download.geofabrik.de';

export const pbfUrlOf = (region: Region) => `${geofabrikBase}/${region.slug}-latest.osm.pbf`;
export const polyUrlOf = (region: Region) => `${geofabrikBase}/${region.slug}.poly`;

export type RegionSelection = { ok: true; regions: RegionKey[] } | { ok: false; problem: string };

// Liest die Auswahl wie „TH,SN“, „th sn“ oder „all“ (alle 16). Leer = der Pilot.
// Die Reihenfolge folgt immer der festen Liste, Doppelte fallen weg.
export function parseRegionSelection(input: string | undefined): RegionSelection {
  const text = (input ?? '').trim();
  if (text === '') return { ok: true, regions: [...pilotRegions] };
  if (/^(all|alle)$/i.test(text)) return { ok: true, regions: [...regionKeys] };
  const parts = text.split(/[\s,;]+/).filter(Boolean).map((part) => part.toUpperCase());
  const unknown = parts.filter((part) => !isRegionKey(part));
  if (unknown.length > 0) {
    return {
      ok: false,
      problem: `Unbekannte Bundesländer: ${unknown.join(', ')}. Erlaubt: ${regionKeys.join(', ')} oder all`,
    };
  }
  return { ok: true, regions: regionKeys.filter((key) => parts.includes(key)) };
}
