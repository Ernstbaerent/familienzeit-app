// Orte-Import (M10a), Teil „Hochladen“ (mit dem geheimen Schlüssel, ohne npm und ohne fremde Pakete):
// je Bundesland die Datei aus „Vorbereiten“ prüfen und über Zwischentabelle + publish_places_import austauschen.
// Qualitätsbremse (70 %) und Obergrenze prüft das Skript vorher (für eine klare Meldung) und die Datenbank selbst noch einmal.
// Ein Land, das scheitert, behält seinen bisherigen Stand; die anderen laufen weiter.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RegionKey } from '../../../src/features/places/placeRow.ts';
import type { FetchLike } from '../weekly/http.ts';
import type { UploadConfig } from './config.ts';
import { decodeRegionFile, parseSummary, regionFileName, summaryFileName, type Summary } from './files.ts';
import { placeLimits } from './limits.ts';
import { beginImport, fetchImportStates, insertStaging, publishImport } from './placesAdmin.ts';

export type UploadOutcome =
  | { region: RegionKey; status: 'published'; rows: number; previous: number }
  | { region: RegionKey; status: 'wouldPublish'; rows: number; previous: number } // Trockenlauf
  | { region: RegionKey; status: 'failed'; error: string; previous: number | null };

export type UploadResult = { summary: Summary; outcomes: UploadOutcome[]; totalBefore: number; totalAfter: number };

export async function uploadRegions(
  config: UploadConfig,
  deps: { fetch: FetchLike; log: (line: string) => void },
): Promise<UploadResult> {
  const summary = parseSummary(await readFile(join(config.outDir, summaryFileName), 'utf8'));
  const states = await fetchImportStates(config.supabase, deps.fetch);
  const countOf = new Map(states.map((state) => [state.region, state.rowCount]));
  let total = states.reduce((sum, state) => sum + state.rowCount, 0);
  const totalBefore = total;
  const outcomes: UploadOutcome[] = [];

  for (const prepared of summary.regions) {
    const region = prepared.region;
    const previous = countOf.get(region) ?? 0;
    if (!prepared.ok) {
      outcomes.push({ region, status: 'failed', error: `Vorbereiten: ${prepared.error}`, previous });
      continue;
    }
    try {
      const { file, invalid } = decodeRegionFile(await readFile(join(config.outDir, regionFileName(region))), region, summary.importId);
      if (invalid.length > 0) throw new Error(`${invalid.length} ungültige Zeilen, z. B. ${invalid.slice(0, 3).join('; ')}`);
      const rows = file.rows;
      if (rows.length === 0) throw new Error('keine Orte');
      if (rows.length > placeLimits.maxPlacesPerRegion) throw new Error(`${rows.length} Orte, mehr als ${placeLimits.maxPlacesPerRegion} je Land`);
      if (previous > 0 && rows.length < Math.ceil(previous * placeLimits.minRatio)) {
        throw new Error(
          `Qualitätsbremse: ${rows.length} Orte, bisher ${previous}, mindestens ${Math.round(placeLimits.minRatio * 100)} % (${Math.ceil(previous * placeLimits.minRatio)}) nötig. Bisheriger Stand bleibt.`,
        );
      }
      if (total - previous + rows.length > config.maxPlaces) {
        throw new Error(`Obergrenze MAX_PLACES (${config.maxPlaces}) würde überschritten: ${total} - ${previous} + ${rows.length}`);
      }
      if (config.dryRun) {
        total = total - previous + rows.length;
        deps.log(`${region}: Trockenlauf, würde ${rows.length} Orte übernehmen (bisher ${previous})`);
        outcomes.push({ region, status: 'wouldPublish', rows: rows.length, previous });
        continue;
      }

      await beginImport(config.supabase, deps.fetch, region, summary.importId);
      const chunks = Math.ceil(rows.length / placeLimits.uploadChunkRows);
      if (chunks > placeLimits.maxUploadChunks) throw new Error(`${chunks} Pakete, mehr als ${placeLimits.maxUploadChunks}`);
      for (let i = 0; i < chunks; i += 1) {
        const chunk = rows.slice(i * placeLimits.uploadChunkRows, (i + 1) * placeLimits.uploadChunkRows);
        await insertStaging(config.supabase, deps.fetch, summary.importId, chunk, `${region}: Paket ${i + 1} von ${chunks} hochladen`);
      }
      const inserted = await publishImport(config.supabase, deps.fetch, {
        region,
        importId: summary.importId,
        expected: rows.length,
        maxTotal: config.maxPlaces,
        sourceTimestamp: file.sourceTimestamp,
        sourceUrl: file.sourceUrl,
      });
      total = total - previous + inserted;
      deps.log(`${region}: ${inserted} Orte übernommen (bisher ${previous})`);
      outcomes.push({ region, status: 'published', rows: inserted, previous });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deps.log(`${region}: FEHLER ${message}`);
      outcomes.push({ region, status: 'failed', error: message.slice(0, 400), previous });
    }
  }
  return { summary, outcomes, totalBefore, totalAfter: total };
}
