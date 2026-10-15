// „Hochladen“ mit einer nachgestellten Daten-Schnittstelle von Supabase: Trockenlauf schreibt nichts, Qualitätsbremse und
// Obergrenze je Land, Pakete à 1000 Zeilen, ein Land scheitert ohne die anderen aufzuhalten, kein Schlüssel in Meldungen,
// Ausschlussliste (place_overrides: hide, boost, zurückholen, nicht lesbar = nichts wird angefasst).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PlaceRow, RegionKey } from '../../../src/features/places/placeRow.ts';
import { tileKeyOf } from '../../../src/features/places/placeTiles.ts';
import type { FetchLike, HttpRequest } from '../weekly/http.ts';
import { createRedactor } from '../weekly/redact.ts';
import type { UploadConfig } from './config.ts';
import { encodeRegionFile, regionFileName, summaryFileName, type RegionResult, type Summary } from './files.ts';
import { renderUploadReport } from './report.ts';
import { uploadRegions } from './upload.ts';

const importId = 'orte-2026-10-15-42';
const secret = 'sb_secret_abcdefghijklmnop';

function row(region: RegionKey, n: number): PlaceRow {
  const lat = 50.6 + (n % 100) * 0.001;
  const lon = 12.2 + Math.floor(n / 100) * 0.001;
  return {
    region,
    id: `n${n + 1}`,
    name: null,
    category: 'playground',
    subtype: 'playground',
    lat,
    lon,
    tile: tileKeyOf(lat, lon),
    setting: 'outdoor',
    months: null,
    opening_hours: null,
    hours_kind: null,
    hours_plan: null,
    website: null,
    locality: 'Greiz',
    street: null,
    kid_weight: 3,
  };
}

const okResult = (region: RegionKey, rows: number): RegionResult =>
  ({ region, ok: true, rows, seconds: 1, downloadBytes: 1, sourceTimestamp: '2026-10-13T20:21:42Z', stats: {} }) as unknown as RegionResult;

let dir: string;
function writeOut(files: { region: RegionKey; rows: PlaceRow[]; held?: PlaceRow[] }[], extra: RegionResult[] = []) {
  for (const f of files) {
    writeFileSync(
      join(dir, regionFileName(f.region)),
      encodeRegionFile({ version: 1, region: f.region, importId, sourceTimestamp: '2026-10-13T20:21:42Z', sourceUrl: 'https://download.geofabrik.de/europe/germany/x.osm.pbf', rows: f.rows, held: f.held ?? [] }),
    );
  }
  const summary: Summary = { version: 1, importId, startedAt: '2026-10-15T00:00:00Z', regions: [...files.map((f) => okResult(f.region, f.rows.length)), ...extra] };
  writeFileSync(join(dir, summaryFileName), JSON.stringify(summary));
}

type Call = { method: string; path: string; body: unknown; headers: Record<string, string> };

// Nachgestellte Daten-Schnittstelle mit dem Stand je Land.
type FakeOptions = { failPublish?: string; staging400?: boolean; overrides?: unknown[]; overridesStatus?: number };
function fakeSupabase(states: Record<string, number>, options: FakeOptions = {}) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url: string, init: HttpRequest) => {
    const path = url.replace('https://abc.supabase.co/rest/v1/', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, path, body, headers: init.headers });
    const reply = (status: number, data: unknown) => ({
      ok: status < 300,
      status,
      headers: { get: () => null },
      text: async () => (data === undefined ? '' : JSON.stringify(data)),
    });
    if (path.startsWith('places_imports')) return reply(200, Object.entries(states).map(([region, rowCount]) => ({ region, row_count: rowCount, import_id: 'alt', imported_at: '2026-09-03' })));
    if (path.startsWith('place_overrides')) {
      return options.overridesStatus ? reply(options.overridesStatus, { code: 'PGRST205', message: 'Could not find the table' }) : reply(200, options.overrides ?? []);
    }
    if (path === 'rpc/begin_places_import') return reply(204, undefined);
    if (path === 'places_staging') return options.staging400 ? reply(400, { code: '23514', message: `kaputt ${secret}` }) : reply(201, undefined);
    if (path === 'rpc/publish_places_import') {
      if (options.failPublish === body.p_region) return reply(400, { code: 'P0001', message: 'Qualitätsbremse' });
      return reply(200, body.p_expected);
    }
    return reply(404, { message: 'unbekannt' });
  };
  return { fetch, calls };
}

const config = (overrides: Partial<UploadConfig> = {}): UploadConfig => ({
  dryRun: false,
  maxPlaces: 600_000,
  outDir: dir,
  supabase: { url: 'https://abc.supabase.co', key: secret },
  ...overrides,
});

const rows = (region: RegionKey, count: number) => Array.from({ length: count }, (_, i) => row(region, i));
const none = { hidden: 0, boosted: 0, restored: 0 };
const log = () => {};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'places-upload-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('uploadRegions', () => {
  it('Trockenlauf: liest nur den Stand, schreibt nichts', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 30) }]);
    const { fetch, calls } = fakeSupabase({ TH: 25 });
    const result = await uploadRegions(config({ dryRun: true }), { fetch, log });
    expect(result.outcomes).toEqual([{ region: 'TH', status: 'wouldPublish', rows: 30, previous: 25, overrides: none }]);
    expect(calls.map((c) => `${c.method} ${c.path.split('?')[0]}`)).toEqual(['GET places_imports', 'GET place_overrides']);
    expect(result.totalAfter).toBe(30);
  });

  it('echter Lauf: Zwischentabelle leeren, Pakete à 1000, austauschen; Schlüssel nur in apikey', async () => {
    writeOut([{ region: 'SN', rows: rows('SN', 2500) }]);
    const { fetch, calls } = fakeSupabase({});
    const result = await uploadRegions(config(), { fetch, log });
    expect(result.outcomes).toEqual([{ region: 'SN', status: 'published', rows: 2500, previous: 0, overrides: none }]);
    expect(calls.map((c) => c.path.split('?')[0])).toEqual([
      'places_imports',
      'place_overrides',
      'rpc/begin_places_import',
      'places_staging',
      'places_staging',
      'places_staging',
      'rpc/publish_places_import',
    ]);
    const staging = calls.filter((c) => c.path === 'places_staging');
    expect(staging.map((c) => (c.body as unknown[]).length)).toEqual([1000, 1000, 500]);
    expect((staging[0].body as Record<string, unknown>[])[0]).toMatchObject({ import_id: importId, region: 'SN', id: 'n1' });
    expect(staging[0].headers.Prefer).toBe('return=minimal');
    expect(calls.at(-1)?.body).toEqual({
      p_region: 'SN',
      p_import_id: importId,
      p_expected: 2500,
      p_max_total: 600_000,
      p_source_timestamp: '2026-10-13T20:21:42Z',
      p_source_url: 'https://download.geofabrik.de/europe/germany/x.osm.pbf',
    });
    for (const call of calls) {
      expect(call.headers.apikey).toBe(secret);
      expect(call.headers.Authorization).toBeUndefined(); // sb_secret_ nie als Bearer
    }
  });

  it('Qualitätsbremse je Land: unter 70 % des bisherigen Stands wird dieses Land nicht angefasst, die anderen schon', async () => {
    writeOut([
      { region: 'SN', rows: rows('SN', 69) },
      { region: 'TH', rows: rows('TH', 70) },
    ]);
    const { fetch, calls } = fakeSupabase({ SN: 100, TH: 100 });
    const result = await uploadRegions(config(), { fetch, log });
    expect(result.outcomes[0]).toMatchObject({ region: 'SN', status: 'failed', previous: 100 });
    expect((result.outcomes[0] as { error: string }).error).toContain('Qualitätsbremse');
    expect(result.outcomes[1]).toEqual({ region: 'TH', status: 'published', rows: 70, previous: 100, overrides: none });
    expect(calls.filter((c) => c.path === 'rpc/begin_places_import').map((c) => (c.body as { p_region: string }).p_region)).toEqual(['TH']);
  });

  it('Obergrenze MAX_PLACES über alle Länder', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 50) }]);
    const { fetch, calls } = fakeSupabase({ BY: 980, TH: 10 });
    const result = await uploadRegions(config({ maxPlaces: 1000 }), { fetch, log });
    expect((result.outcomes[0] as { error: string }).error).toContain('Obergrenze MAX_PLACES (1000)');
    expect(calls).toHaveLength(2); // nur lesen: Stand und Ausschlussliste
  });

  it('Fehler beim Vorbereiten oder in der Datenbank: dieses Land scheitert, die anderen laufen weiter', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 5) }, { region: 'SN', rows: rows('SN', 5) }], [{ region: 'BY', ok: false, error: 'HTTP 503', seconds: 1 }]);
    const { fetch } = fakeSupabase({}, { failPublish: 'TH' });
    const result = await uploadRegions(config(), { fetch, log });
    expect(result.outcomes.map((o) => `${o.region}:${o.status}`)).toEqual(['TH:failed', 'SN:published', 'BY:failed']);
    expect((result.outcomes[2] as { error: string }).error).toBe('Vorbereiten: HTTP 503');
  });

  it('ungültige Zeilen in der Datei: Land wird nicht hochgeladen', async () => {
    const broken = rows('TH', 3);
    (broken[1] as { kid_weight: number }).kid_weight = 7;
    writeOut([{ region: 'TH', rows: broken }]);
    const { fetch, calls } = fakeSupabase({});
    const result = await uploadRegions(config(), { fetch, log });
    expect((result.outcomes[0] as { error: string }).error).toContain('1 ungültige Zeilen');
    expect(calls).toHaveLength(2);
  });

  it('Datei eines anderen Laufs wird abgelehnt', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 3) }]);
    writeFileSync(join(dir, summaryFileName), JSON.stringify({ version: 1, importId: 'orte-2026-10-15-99', startedAt: '', regions: [okResult('TH', 3)] }));
    const { fetch } = fakeSupabase({});
    const result = await uploadRegions(config(), { fetch, log });
    expect((result.outcomes[0] as { error: string }).error).toContain('anderen Lauf');
  });

  it('der Bericht nennt den Schlüssel nie, auch wenn die Datenbank ihn zurückspiegelt', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 3) }]);
    const { fetch } = fakeSupabase({}, { staging400: true });
    const lines: string[] = [];
    const redact = createRedactor([secret]);
    const result = await uploadRegions(config(), { fetch, log: (line) => lines.push(redact(line)) });
    const report = redact(renderUploadReport(result, false, 600_000));
    expect(result.outcomes[0].status).toBe('failed');
    expect(`${report}\n${lines.join('\n')}`).not.toContain(secret);
    expect(report).toContain('[verborgen]');
  });
});

describe('uploadRegions: Ausschlussliste (place_overrides)', () => {
  const named = (region: RegionKey, n: number, kidWeight: 0 | 1 | 2 | 3): PlaceRow => ({ ...row(region, n), name: `Ort ${n + 1}`, kid_weight: kidWeight });

  it('hide lässt den Ort weg, boost setzt 3 und holt einen weggelassenen Ort zurück; Bericht zählt je Land', async () => {
    const thRows = [named('TH', 0, 2), named('TH', 1, 1), named('TH', 2, 3)];
    const thHeld = [named('TH', 10, 2), named('TH', 11, 2)];
    writeOut([
      { region: 'TH', rows: thRows, held: thHeld },
      { region: 'SN', rows: rows('SN', 3) },
    ]);
    const { fetch, calls } = fakeSupabase(
      { TH: 3, SN: 2 },
      {
        overrides: [
          { id: 'n1', action: 'hide' }, // TH Ort 1 (in SN gibt es auch n1: dort auch versteckt, die Kennung gilt für alle Länder)
          { id: 'n2', action: 'boost' }, // TH Ort 2: 1 → 3 (in SN ebenfalls)
          { id: 'n11', action: 'boost' }, // von den Regeln weggelassen: zurückgeholt
          { id: 'n12', action: 'hide' }, // weggelassen und versteckt: bleibt weg, zählt nicht doppelt
          { id: 'w999', action: 'hide' }, // in keinem Land dieses Laufs
          { id: 'kaputt', action: 'hide' }, // ungültige Kennung wird übergangen
        ],
      },
    );
    const result = await uploadRegions(config(), { fetch, log });
    expect(result.outcomes).toEqual([
      { region: 'TH', status: 'published', rows: 3, previous: 3, overrides: { hidden: 1, boosted: 1, restored: 1 } },
      { region: 'SN', status: 'published', rows: 2, previous: 2, overrides: { hidden: 1, boosted: 1, restored: 0 } },
    ]);
    const staged = calls.filter((c) => c.path === 'places_staging').flatMap((c) => c.body as PlaceRow[]);
    const th = staged.filter((r) => r.region === 'TH');
    expect(th.map((r) => [r.id, r.kid_weight])).toEqual([
      ['n2', 3],
      ['n3', 3],
      ['n11', 3],
    ]);
    expect(result.overrides).toEqual({ hide: 3, boost: 2, notFound: ['w999'] });

    const report = renderUploadReport(result, false, 600_000);
    expect(report).toContain('| TH | übernommen | 3 | 3 | +0 % | 1 / 1 / 1 |');
    expect(report).toContain('3 × hide, 2 × boost');
    expect(report).toContain('nicht gefunden (anderes Land oder nicht mehr in OpenStreetMap): w999');
  });

  it('Trockenlauf wendet die Liste auch an (nur zum Anzeigen)', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 5) }]);
    const { fetch } = fakeSupabase({ TH: 5 }, { overrides: [{ id: 'n1', action: 'hide' }] });
    const result = await uploadRegions(config({ dryRun: true }), { fetch, log });
    expect(result.outcomes).toEqual([{ region: 'TH', status: 'wouldPublish', rows: 4, previous: 5, overrides: { hidden: 1, boosted: 0, restored: 0 } }]);
  });

  it('Liste nicht lesbar (Migration 0004 fehlt): Abbruch, bevor ein Land angefasst wird', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 5) }]);
    const { fetch, calls } = fakeSupabase({}, { overridesStatus: 404 });
    await expect(uploadRegions(config(), { fetch, log })).rejects.toThrow(/Ausschlussliste lesen\): HTTP 404.*0004_place_overrides\.sql/);
    expect(calls.map((c) => c.path.split('?')[0])).toEqual(['places_imports', 'place_overrides']);
  });

  it('mehr Einträge als die Grenze: Abbruch statt still nur einen Teil zu lesen', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 5) }]);
    const many = Array.from({ length: 901 }, (_, i) => ({ id: `n${i + 1}`, action: 'hide' }));
    const { fetch } = fakeSupabase({}, { overrides: many });
    await expect(uploadRegions(config(), { fetch, log })).rejects.toThrow('mehr als 900 Einträge');
  });

  it('ohne Ausschlussliste und ohne Regeln bleibt alles wie bisher, weggelassene Orte werden nie hochgeladen', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 4), held: [named('TH', 50, 2)] }]);
    const { fetch, calls } = fakeSupabase({});
    await uploadRegions(config(), { fetch, log });
    const staged = calls.filter((c) => c.path === 'places_staging').flatMap((c) => c.body as PlaceRow[]);
    expect(staged.map((r) => r.id)).toEqual(['n1', 'n2', 'n3', 'n4']);
  });
});

describe('Datei: weggelassene Orte', () => {
  it('eine ID darf nicht in rows und held zugleich stehen', async () => {
    writeOut([{ region: 'TH', rows: rows('TH', 3), held: [row('TH', 1)] }]);
    const { fetch } = fakeSupabase({});
    const result = await uploadRegions(config(), { fetch, log });
    expect((result.outcomes[0] as { error: string }).error).toContain('n2: doppelt');
  });
});
