// Orte (M10b): Abruf ganzer Kacheln bei Supabase mit gemockten Antworten. Datenschutz der Adresse, Seiten, Import-Kennung, Fehler.

import type { FetchLike } from '../activities/fetchActivities';
import {
  buildImportsUrl,
  buildPlacesUrl,
  fetchPlaceTiles,
  maxPlacesPages,
  parseImportIds,
  placeColumns,
  PlacesFetchError,
  placesPageSize,
} from './fetchPlaces';
import { fixtureImports, fixtureRows } from './testHelpers';

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_abc123' };
const jwtConfig = { url: 'https://abc.supabase.co', anonKey: 'eyJhbGciOi.eyJyb2xlIjoiYW5vbiJ9.sig' };
const tiles = ['253_40', '253_41', '254_40'];

type Answer = { ok?: boolean; status?: number; body?: unknown; json?: () => Promise<unknown> } | Error;

// Ersatz für fetch: Antworten je nach Adresse (Import-Kennung oder Orte), der Reihe nach.
function mockFetch(imports: Answer[], places: Answer[]) {
  const calls: Parameters<FetchLike>[] = [];
  let importCalls = 0;
  let placeCalls = 0;
  const fn: FetchLike = async (url, init) => {
    calls.push([url, init]);
    const isImports = url.includes('/places_imports?');
    const list = isImports ? imports : places;
    const index = isImports ? importCalls++ : placeCalls++;
    const answer = list[Math.min(index, list.length - 1)];
    if (answer instanceof Error) throw answer;
    return { ok: answer.ok ?? true, status: answer.status ?? 200, json: answer.json ?? (async () => answer.body) };
  };
  return { fn, calls };
}

const params = (url: string) => new Map(url.split('?')[1].split('&').map((pair) => pair.split('=') as [string, string]));

describe('Adresse', () => {
  const url = buildPlacesUrl(config, tiles, 0);

  it('fragt nur nach den Kachel-Schlüsseln, mit fester Reihenfolge und allen Spalten', () => {
    expect(url.startsWith('https://abc.supabase.co/rest/v1/places?')).toBe(true);
    const p = params(url);
    expect(p.get('tile')).toBe('in.(253_40,253_41,254_40)');
    expect(p.get('order')).toBe('tile.asc,region.asc,id.asc');
    expect(p.get('limit')).toBe(String(placesPageSize));
    expect(p.get('offset')).toBe('0');
    expect(p.get('select')?.split(',')).toEqual([...placeColumns]);
    expect([...p.keys()].sort()).toEqual(['limit', 'offset', 'order', 'select', 'tile']);
  });

  it('Datenschutz: keine Koordinaten (keine Zahl mit Komma oder Punkt), kein Schlüssel in der Adresse', () => {
    expect(url).not.toMatch(/\d+\.\d+/);
    expect(url).not.toMatch(/[?&](lat|lon)=/); // die Spalten heißen so, aber es gibt keinen Filter darauf
    expect(url).not.toContain(config.anonKey);
    expect(buildImportsUrl(config)).not.toMatch(/\d+\.\d+/);
  });

  it('nimmt nur gültige Kachel-Schlüssel an (nichts anderes kann in die Adresse geraten)', () => {
    expect(() => buildPlacesUrl(config, [], 0)).toThrow(PlacesFetchError);
    expect(() => buildPlacesUrl(config, ['50.66_12.20'], 0)).toThrow(PlacesFetchError);
    expect(() => buildPlacesUrl(config, ['253_40)&select=*'], 0)).toThrow(PlacesFetchError);
  });

  it('Import-Kennung: nur Bundesland und Kennung', () => {
    expect(buildImportsUrl(config)).toBe('https://abc.supabase.co/rest/v1/places_imports?select=region,import_id&order=region.asc');
  });
});

describe('Import-Kennung lesen', () => {
  it('liest die Testdaten', () => {
    expect(parseImportIds(fixtureImports)).toEqual({ SN: '2026-10-03-sn-a1b2', TH: '2026-10-03-th-c3d4' });
  });

  it('unbekannte Länder und kaputte Zeilen fallen weg, keine Liste ist ein Fehler', () => {
    expect(parseImportIds([{ region: 'XX', import_id: 'a' }, { region: 'TH' }, null, { region: 'BY', import_id: 'b' }])).toEqual({ BY: 'b' });
    expect(() => parseImportIds({})).toThrow(PlacesFetchError);
  });
});

describe('fetchPlaceTiles', () => {
  it('holt Import-Kennung, Orte, Import-Kennung: nur GET, mit dem öffentlichen Schlüssel', async () => {
    const { fn, calls } = mockFetch([{ body: fixtureImports }], [{ body: fixtureRows }]);
    const result = await fetchPlaceTiles(config, tiles, { fetchImpl: fn });
    expect(result.rows).toHaveLength(fixtureRows.length);
    expect(result.importIds.TH).toBe('2026-10-03-th-c3d4');
    expect(calls.map(([url]) => url.split('?')[0].split('/').pop())).toEqual(['places_imports', 'places', 'places_imports']);
    for (const [, init] of calls) {
      expect(init.method).toBe('GET');
      expect(init.headers).toEqual({ apikey: config.anonKey, Accept: 'application/json' });
    }
  });

  it('ein Schlüssel im JWT-Format geht zusätzlich als Bearer mit (wie bei den Aktivitäten)', async () => {
    const { fn, calls } = mockFetch([{ body: [] }], [{ body: [] }]);
    await fetchPlaceTiles(jwtConfig, tiles, { fetchImpl: fn });
    expect(calls[1][1].headers.Authorization).toBe(`Bearer ${jwtConfig.anonKey}`);
  });

  it('holt weitere Seiten, solange eine Seite voll ist', async () => {
    const full = Array.from({ length: placesPageSize }, (_, i) => ({ id: `n${i + 1}` }));
    const { fn, calls } = mockFetch([{ body: [] }], [{ body: full }, { body: full }, { body: [{ id: 'n9' }] }]);
    const result = await fetchPlaceTiles(config, tiles, { fetchImpl: fn });
    expect(result.rows).toHaveLength(2 * placesPageSize + 1);
    const offsets = calls.filter(([url]) => url.includes('/places?')).map(([url]) => params(url).get('offset'));
    expect(offsets).toEqual(['0', '1000', '2000']);
  });

  it('bricht nach höchstens 40 vollen Seiten ab (Schutz vor einer Schleife)', async () => {
    const full = Array.from({ length: placesPageSize }, () => ({}));
    const { fn, calls } = mockFetch([{ body: [] }], [{ body: full }]);
    await expect(fetchPlaceTiles(config, tiles, { fetchImpl: fn })).rejects.toThrow(`mehr als ${maxPlacesPages} Seiten`);
    expect(calls.filter(([url]) => url.includes('/places?'))).toHaveLength(maxPlacesPages);
  });

  it('verwirft den Abruf, wenn genau währenddessen ein Import lief (Kennung vorher und nachher verschieden)', async () => {
    const { fn } = mockFetch(
      [{ body: [{ region: 'TH', import_id: 'alt' }] }, { body: [{ region: 'TH', import_id: 'neu' }] }],
      [{ body: fixtureRows }],
    );
    await expect(fetchPlaceTiles(config, tiles, { fetchImpl: fn })).rejects.toThrow('Import lief während des Abrufs');
  });

  it.each([
    ['HTTP 401 (falscher Schlüssel)', [{ ok: false, status: 401 }], [{ body: [] }], 'HTTP 401'],
    ['HTTP 404 (Migration fehlt)', [{ body: [] }], [{ ok: false, status: 404 }], 'HTTP 404'],
    ['HTTP 503 (pausiert)', [{ ok: false, status: 503 }], [{ body: [] }], 'HTTP 503'],
    ['kein Netz', [new TypeError('Network request failed')], [{ body: [] }], 'Network request failed'],
    ['kein JSON', [{ body: [] }], [{ json: async () => Promise.reject(new SyntaxError('x')) }], 'kein gültiges JSON'],
    ['keine Liste', [{ body: [] }], [{ body: { message: 'x' } }], 'keine Liste'],
  ] as [string, Answer[], Answer[], string][])('Fehler: %s', async (_, imports, places, text) => {
    const { fn } = mockFetch(imports, places);
    await expect(fetchPlaceTiles(config, tiles, { fetchImpl: fn })).rejects.toThrow(text);
  });

  it('Zeitüberschreitung: bricht ab und meldet es', async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      const fn: FetchLike = (_url, init) =>
        new Promise((_, reject) => {
          init.signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          });
        });
      const promise = fetchPlaceTiles(config, tiles, { fetchImpl: fn, timeoutMs: 10_000 });
      jest.advanceTimersByTime(10_000);
      await expect(promise).rejects.toThrow('Zeitüberschreitung nach 10 Sekunden');
      expect(aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
