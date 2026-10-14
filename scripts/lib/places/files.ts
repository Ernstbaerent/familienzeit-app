// Orte-Import (M10a): Dateien zwischen den beiden Teilen der Action („Vorbereiten“ → „Hochladen“).
// Je Bundesland eine gepackte JSON-Datei mit den fertigen Zeilen, dazu summary.json mit dem Ergebnis aller Länder.
// „Hochladen“ prüft jede Zeile beim Lesen noch einmal (checkPlaceRow), bevor etwas zu Supabase geht.

import { gunzipSync, gzipSync } from 'node:zlib';

import { checkPlaceRow, isRegionKey, type PlaceRow, type RegionKey } from '../../../src/features/places/placeRow.ts';
import type { TransformStats } from './transform.ts';

export const summaryFileName = 'summary.json';
export const regionFileName = (region: RegionKey) => `places-${region}.json.gz`;

export type RegionFile = {
  version: 1;
  region: RegionKey;
  importId: string;
  sourceTimestamp: string | null; // Stand der OSM-Daten laut Geofabrik
  sourceUrl: string | null; // Datei nach der Weiterleitung, z. B. …/thueringen-261013.osm.pbf
  rows: PlaceRow[];
};

export type RegionResult =
  | {
      region: RegionKey;
      ok: true;
      rows: number;
      seconds: number;
      downloadBytes: number;
      sourceTimestamp: string | null;
      stats: TransformStats;
    }
  | { region: RegionKey; ok: false; error: string; seconds: number };

export type Summary = { version: 1; importId: string; startedAt: string; regions: RegionResult[] };

export function encodeRegionFile(file: RegionFile): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(file), 'utf8'));
}

export type DecodedRegionFile = { file: RegionFile; invalid: string[] };

// Liest eine Datei und prüft alles: Form, Bundesland, jede Zeile (auch: gehört sie zu diesem Land, ist die ID doppelt).
export function decodeRegionFile(buffer: Buffer, expectedRegion: RegionKey, expectedImportId: string): DecodedRegionFile {
  let data: unknown;
  try {
    data = JSON.parse(gunzipSync(buffer).toString('utf8'));
  } catch {
    throw new Error(`${expectedRegion}: Datei ist kein gepacktes JSON`);
  }
  const d = data as Partial<RegionFile> | null;
  if (!d || d.version !== 1 || !Array.isArray(d.rows)) throw new Error(`${expectedRegion}: unbekanntes Dateiformat`);
  if (!isRegionKey(d.region) || d.region !== expectedRegion) throw new Error(`${expectedRegion}: Datei gehört zu einem anderen Land`);
  if (d.importId !== expectedImportId) throw new Error(`${expectedRegion}: Datei gehört zu einem anderen Lauf`);
  const sourceTimestamp = typeof d.sourceTimestamp === 'string' && !Number.isNaN(Date.parse(d.sourceTimestamp)) ? d.sourceTimestamp : null;
  const sourceUrl = typeof d.sourceUrl === 'string' && d.sourceUrl.startsWith('https://download.geofabrik.de/') ? d.sourceUrl : null;

  const rows: PlaceRow[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const value of d.rows) {
    const check = checkPlaceRow(value);
    if (!check.ok) invalid.push(check.reason);
    else if (check.row.region !== expectedRegion) invalid.push(`${check.row.id}: falsches Bundesland`);
    else if (seen.has(check.row.id)) invalid.push(`${check.row.id}: doppelt`);
    else {
      seen.add(check.row.id);
      rows.push(check.row);
    }
  }
  return { file: { version: 1, region: expectedRegion, importId: expectedImportId, sourceTimestamp, sourceUrl, rows }, invalid };
}

export function parseSummary(text: string): Summary {
  const data = JSON.parse(text) as Partial<Summary> | null;
  if (!data || data.version !== 1 || typeof data.importId !== 'string' || !Array.isArray(data.regions)) {
    throw new Error('summary.json: unbekanntes Format');
  }
  if (!/^orte-\d{4}-\d{2}-\d{2}-[a-z0-9]{1,20}$/.test(data.importId)) throw new Error('summary.json: ungültige Kennung des Laufs');
  for (const result of data.regions) {
    if (!result || !isRegionKey(result.region) || typeof result.ok !== 'boolean') throw new Error('summary.json: ungültiges Land');
  }
  return data as Summary;
}
