// „Vorbereiten“ als Ganzes: Download (Attrappe), osmium (Attrappe oder, wenn installiert, echt), Umwandlung, Dateien,
// Aufräumen. Ein Land, das scheitert, hält die anderen nicht auf.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DownloadFetch, DownloadResponse } from './download.ts';
import { decodeRegionFile, parseSummary, regionFileName, summaryFileName } from './files.ts';
import { buildSteps, exportConfig, mainFilterExpressions, runOsmium } from './osmium.ts';
import { prepareRegions } from './prepare.ts';

const fixtures = join(__dirname, 'fixtures');
const base = 'https://download.geofabrik.de/europe/germany/';
const hasOsmium = spawnSync('osmium', ['--version']).status === 0;

function response(status: number, body: Buffer | null, url: string): DownloadResponse {
  return {
    ok: status === 200,
    status,
    url,
    headers: { get: (name) => (name === 'content-length' && body ? String(body.length) : null) },
    body: body ? (async function* () { yield new Uint8Array(body); })() : null,
    text: async () => (body ? body.toString('utf8') : ''),
  };
}

function geofabrik(pbf: Buffer, options: { sachsen404?: boolean } = {}) {
  const md5 = createHash('md5').update(pbf).digest('hex');
  const poly = readFileSync(join(fixtures, 'testland.poly'));
  const calls: string[] = [];
  const fetch: DownloadFetch = async (url) => {
    calls.push(url);
    if (url.endsWith('.poly')) return response(200, poly, url);
    if (url === `${base}sachsen-latest.osm.pbf` && options.sachsen404) return response(404, null, url);
    if (url.endsWith('-latest.osm.pbf')) return response(200, pbf, url.replace('-latest', '-261013'));
    if (url.endsWith('-261013.osm.pbf.md5')) return response(200, Buffer.from(`${md5}  x.osm.pbf`), url);
    return response(404, null, url);
  };
  return { fetch, calls };
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'places-prepare-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('prepareRegions mit nachgestelltem osmium', () => {
  // Attrappe: Statt osmium zu rechnen, legt sie beim letzten Schritt (export) die fertige Testausgabe hin.
  const fakeOsmium = async (args: readonly string[]) => {
    const output = args[args.indexOf('-o') + 1];
    if (args[0] === 'fileinfo') return { stdout: '2026-10-13T20:21:42Z\n' };
    if (args[0] === 'export') copyFileSync(join(fixtures, 'sample.geojsonseq'), output);
    else writeFileSync(output, 'zwischenstand');
    return { stdout: '' };
  };

  it('schreibt je Land eine Datei und summary.json, räumt große Dateien weg, ein Fehler hält die anderen nicht auf', async () => {
    const { fetch, calls } = geofabrik(Buffer.from('pbf'), { sachsen404: true });
    const work = join(dir, 'work');
    const out = join(dir, 'out');
    const lines: string[] = [];
    const summary = await prepareRegions(
      { regions: ['SN', 'TH'], importId: 'orte-2026-10-15-7', workDir: work, outDir: out },
      { fetch, osmium: fakeOsmium, now: () => new Date(2026, 9, 15, 4), log: (line) => lines.push(line) },
    );

    expect(summary.regions.map((r) => `${r.region}:${r.ok}`)).toEqual(['SN:false', 'TH:true']);
    expect(summary.regions[0]).toMatchObject({ ok: false, error: 'SN: Geofabrik-Datei: HTTP 404' });
    expect(summary.regions[1]).toMatchObject({ ok: true, rows: 17, sourceTimestamp: '2026-10-13T20:21:42Z' });

    // Nur Ergebnis-Dateien bleiben, keine .pbf und kein GeoJSON.
    expect(readdirSync(out).sort()).toEqual([regionFileName('TH'), summaryFileName].sort());
    expect(readdirSync(work)).toEqual(['osmium-export.json']);

    const saved = parseSummary(readFileSync(join(out, summaryFileName), 'utf8'));
    expect(saved.importId).toBe('orte-2026-10-15-7');
    const { file, invalid } = decodeRegionFile(readFileSync(join(out, regionFileName('TH'))), 'TH', 'orte-2026-10-15-7');
    expect(invalid).toEqual([]);
    expect(file.rows).toHaveLength(17); // Thüringen hat keine Exklave, deshalb ein Museum mehr als in transform.test.ts
    expect(file.sourceUrl).toBe(`${base}thueringen-261013.osm.pbf`);

    // Jede Datei einmal, Umrisse vor der großen Datei.
    expect(calls).toEqual([
      `${base}sachsen.poly`,
      `${base}sachsen-latest.osm.pbf`,
      `${base}thueringen.poly`,
      `${base}thueringen-latest.osm.pbf`,
      `${base}thueringen-261013.osm.pbf.md5`,
    ]);
  });

  it('Brandenburg lädt zusätzlich den Umriss von Berlin (Orte darin gehören zum Berliner Import)', async () => {
    const { fetch, calls } = geofabrik(Buffer.from('pbf'));
    await prepareRegions(
      { regions: ['BB'], importId: 'orte-2026-10-15-8', workDir: join(dir, 'w'), outDir: join(dir, 'o') },
      { fetch, osmium: fakeOsmium, now: () => new Date(2026, 9, 15), log: () => {} },
    );
    expect(calls.slice(0, 2)).toEqual([`${base}brandenburg.poly`, `${base}berlin.poly`]);
  });

  it('osmium-Fehler: Land scheitert mit Meldung, Arbeitsdateien werden trotzdem gelöscht', async () => {
    const { fetch } = geofabrik(Buffer.from('pbf'));
    const work = join(dir, 'w');
    const summary = await prepareRegions(
      { regions: ['TH'], importId: 'orte-2026-10-15-9', workDir: work, outDir: join(dir, 'o') },
      {
        fetch,
        osmium: async (args) => {
          if (args[0] === 'merge') throw new Error('osmium merge: Exit-Code 1.');
          return fakeOsmium(args);
        },
        now: () => new Date(2026, 9, 15),
        log: () => {},
      },
    );
    expect(summary.regions[0]).toMatchObject({ ok: false, error: 'osmium merge: Exit-Code 1.' });
    expect(readdirSync(work)).toEqual(['osmium-export.json']);
  });
});

describe('osmium-Befehle', () => {
  it('Reihenfolge und Ausgabeformat', () => {
    const steps = buildSteps({ input: 'in.pbf', main: 'm', water: 'w', namedWater: 'nw', merged: 'mg', config: 'c.json', output: 'o' });
    expect(steps.map((s) => s.args[0])).toEqual(['tags-filter', 'tags-filter', 'tags-filter', 'merge', 'export']);
    expect(steps[4].args).toEqual(expect.arrayContaining(['-f', 'geojsonseq', '-x', 'print_record_separator=false']));
    expect(mainFilterExpressions.join(' ')).not.toContain('escape_game');
    expect(exportConfig).toMatchObject({ attributes: { type: true, id: true }, linear_tags: false, area_tags: true });
  });

  (hasOsmium ? it : it.skip)('mit echtem osmium: Ausgabe für sample.osm entspricht fixtures/sample.geojsonseq', async () => {
    const config = join(dir, 'c.json');
    writeFileSync(config, JSON.stringify(exportConfig));
    const p = (name: string) => join(dir, name);
    const steps = buildSteps({ input: join(fixtures, 'sample.osm'), main: p('m.osm.pbf'), water: p('w.osm.pbf'), namedWater: p('nw.osm.pbf'), merged: p('mg.osm.pbf'), config, output: p('out.geojsonseq') });
    for (const step of steps) await runOsmium(step.args, 60_000);
    expect(existsSync(p('out.geojsonseq'))).toBe(true);
    expect(readFileSync(p('out.geojsonseq'), 'utf8')).toBe(readFileSync(join(fixtures, 'sample.geojsonseq'), 'utf8'));
  });
});
