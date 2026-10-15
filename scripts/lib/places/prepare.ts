// Orte-Import (M10a), Teil „Vorbereiten“ (ohne Schlüssel): je Bundesland laden, filtern, umwandeln, Datei schreiben,
// große Dateien sofort wieder löschen. Ein Land, das scheitert, hält die anderen nicht auf; es behält bei Supabase
// einfach seinen bisherigen Stand, und der Lauf endet am Schluss rot.

import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import type { RegionKey } from '../../../src/features/places/placeRow.ts';
import type { PrepareConfig } from './config.ts';
import { downloadPbf, downloadText, type DownloadFetch } from './download.ts';
import { encodeRegionFile, regionFileName, summaryFileName, type RegionResult, type Summary } from './files.ts';
import { parsePoly, type Poly } from './geometry.ts';
import { createHoursNormalizer, weekStartOf } from './hours.ts';
import { placeLimits } from './limits.ts';
import { buildSteps, exportConfig, replicationTimestampArgs, type RunResult } from './osmium.ts';
import { pbfUrlOf, polyUrlOf, regions } from './regions.ts';
import { transformFeatures } from './transform.ts';

export type PrepareDeps = {
  fetch: DownloadFetch;
  osmium: (args: readonly string[], timeoutMs: number) => Promise<RunResult>;
  now: () => Date;
  log: (line: string) => void;
};

async function* readLines(path: string): AsyncGenerator<string> {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) yield line;
}

export async function prepareRegions(config: PrepareConfig, deps: PrepareDeps): Promise<Summary> {
  const startedAt = deps.now();
  await mkdir(config.workDir, { recursive: true });
  await mkdir(config.outDir, { recursive: true });
  const configPath = join(config.workDir, 'osmium-export.json');
  await writeFile(configPath, JSON.stringify(exportConfig, null, 2));

  const polyCache = new Map<RegionKey, Poly>();
  const polyOf = async (key: RegionKey): Promise<Poly> => {
    const cached = polyCache.get(key);
    if (cached) return cached;
    const text = await downloadText(deps.fetch, polyUrlOf(regions[key]), placeLimits.maxPolyBytes, placeLimits.smallDownloadTimeoutMs, `${key}: Umriss`);
    const poly = parsePoly(text);
    polyCache.set(key, poly);
    return poly;
  };

  const results: RegionResult[] = [];
  let downloadedBytes = 0;

  for (const key of config.regions) {
    const region = regions[key];
    const t0 = Date.now();
    const seconds = () => Math.round((Date.now() - t0) / 1000);
    const file = (name: string) => join(config.workDir, `${region.slug}${name}`);
    const paths = {
      input: file('.osm.pbf'),
      main: file('-main.osm.pbf'),
      water: file('-water.osm.pbf'),
      namedWater: file('-named-water.osm.pbf'),
      merged: file('-merged.osm.pbf'),
      config: configPath,
      output: file('.geojsonseq'),
    };
    const cleanup = () => Promise.all(Object.entries(paths).filter(([name]) => name !== 'config').map(([, path]) => rm(path, { force: true })));

    try {
      if (downloadedBytes >= placeLimits.maxTotalDownloadBytes) {
        throw new Error(`Gesamtgrenze von ${Math.round(placeLimits.maxTotalDownloadBytes / 1024 ** 3)} GB pro Lauf erreicht`);
      }
      deps.log(`${key} (${region.name}): Umriss laden …`);
      const ownPoly = await polyOf(key);
      const excludePolys = await Promise.all((region.excludeInside ?? []).map((other) => polyOf(other)));

      deps.log(`${key}: ${pbfUrlOf(region)} laden …`);
      const download = await downloadPbf(deps.fetch, {
        url: pbfUrlOf(region),
        path: paths.input,
        maxBytes: Math.min(placeLimits.maxDownloadBytes, placeLimits.maxTotalDownloadBytes - downloadedBytes),
        timeoutMs: placeLimits.downloadTimeoutMs,
        md5TimeoutMs: placeLimits.smallDownloadTimeoutMs,
        what: `${key}: Geofabrik-Datei`,
      });
      downloadedBytes += download.bytes;
      deps.log(`${key}: ${(download.bytes / 1024 / 1024).toFixed(0)} MB geladen, Prüfsumme stimmt (${seconds()} s)`);

      const stamp = (await deps.osmium(replicationTimestampArgs(paths.input), placeLimits.osmiumTimeoutMs)).stdout.trim();
      const sourceTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(stamp) ? stamp : null;

      for (const step of buildSteps(paths)) {
        await deps.osmium(step.args, placeLimits.osmiumTimeoutMs);
        deps.log(`${key}: osmium ${step.what} (${seconds()} s)`);
      }
      await Promise.all([paths.input, paths.main, paths.water, paths.namedWater, paths.merged].map((path) => rm(path, { force: true })));

      const normalizeHours = createHoursNormalizer({
        start: weekStartOf(startedAt),
        state: region.name,
        lat: region.center.lat,
        lon: region.center.lon,
      });
      const { rows, held, stats } = await transformFeatures(readLines(paths.output), { region: key, ownPoly, excludePolys, normalizeHours });
      await rm(paths.output, { force: true });

      if (rows.length === 0) throw new Error('keine Orte gefunden (Filter oder Datei kaputt?)');
      if (rows.length > placeLimits.maxPlacesPerRegion) {
        throw new Error(`${rows.length} Orte, mehr als die Grenze von ${placeLimits.maxPlacesPerRegion} je Land (Filter prüfen)`);
      }
      await writeFile(
        join(config.outDir, regionFileName(key)),
        encodeRegionFile({ version: 1, region: key, importId: config.importId, sourceTimestamp, sourceUrl: download.finalUrl, rows, held }),
      );
      deps.log(`${key}: ${rows.length} Orte fertig (${seconds()} s)`);
      results.push({ region: key, ok: true, rows: rows.length, seconds: seconds(), downloadBytes: download.bytes, sourceTimestamp, stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.log(`${key}: FEHLER ${message}`);
      results.push({ region: key, ok: false, error: message.slice(0, 400), seconds: seconds() });
    } finally {
      await cleanup();
    }
  }

  const summary: Summary = { version: 1, importId: config.importId, startedAt: startedAt.toISOString(), regions: results };
  await writeFile(join(config.outDir, summaryFileName), JSON.stringify(summary, null, 2));
  return summary;
}
