import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { downloadPbf, downloadText, parseMd5, userAgent, type DownloadFetch, type DownloadResponse } from './download.ts';

const base = 'https://download.geofabrik.de/europe/germany/';
const content = Buffer.from('nicht wirklich eine pbf-Datei, aber Bytes');
const md5 = createHash('md5').update(content).digest('hex');

function response(status: number, body: Buffer | null, url: string, headers: Record<string, string> = {}): DownloadResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    body: body
      ? (async function* () {
          // in zwei Stücken, wie aus dem Netz
          yield new Uint8Array(body.subarray(0, 10));
          yield new Uint8Array(body.subarray(10));
        })()
      : null,
    text: async () => (body ? body.toString('utf8') : ''),
  };
}

type Route = (url: string) => DownloadResponse;

function fakeFetch(routes: Record<string, Route>) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetch: DownloadFetch = async (url, init) => {
    calls.push({ url, headers: init.headers });
    const route = routes[url];
    return route ? route(url) : response(404, null, url);
  };
  return { fetch, calls };
}

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'places-download-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const input = (path: string, maxBytes = 1000) => ({
  url: `${base}thueringen-latest.osm.pbf`,
  path,
  maxBytes,
  timeoutMs: 5000,
  md5TimeoutMs: 5000,
  what: 'TH',
});

describe('downloadPbf', () => {
  it('folgt der Weiterleitung, prüft die Prüfsumme der Datei mit Datum und schickt den eigenen User-Agent', async () => {
    const { fetch, calls } = fakeFetch({
      [`${base}thueringen-latest.osm.pbf`]: () => response(200, content, `${base}thueringen-261013.osm.pbf`),
      [`${base}thueringen-261013.osm.pbf.md5`]: (u) => response(200, Buffer.from(`${md5}  thueringen-261013.osm.pbf\n`), u),
    });
    const path = join(dir, 'th.osm.pbf');
    const result = await downloadPbf(fetch, input(path));
    expect(result).toMatchObject({ bytes: content.length, finalUrl: `${base}thueringen-261013.osm.pbf`, md5 });
    expect(readFileSync(path)).toEqual(content);
    expect(calls.every((c) => c.headers['User-Agent'] === userAgent)).toBe(true);
    expect(calls).toHaveLength(2); // jede Datei genau einmal
  });

  it('ohne .md5 der Datei mit Datum: die von „latest“', async () => {
    const { fetch } = fakeFetch({
      [`${base}thueringen-latest.osm.pbf`]: () => response(200, content, `${base}thueringen-261013.osm.pbf`),
      [`${base}thueringen-latest.osm.pbf.md5`]: (u) => response(200, Buffer.from(`${md5}  thueringen-latest.osm.pbf`), u),
    });
    await expect(downloadPbf(fetch, input(join(dir, 'a.pbf')))).resolves.toMatchObject({ md5 });
  });

  it('falsche Prüfsumme: Fehler, Datei wird gelöscht', async () => {
    const path = join(dir, 'b.pbf');
    const { fetch } = fakeFetch({
      [`${base}thueringen-latest.osm.pbf`]: (u) => response(200, content, u),
      [`${base}thueringen-latest.osm.pbf.md5`]: (u) => response(200, Buffer.from(`${'0'.repeat(32)}  x`), u),
    });
    await expect(downloadPbf(fetch, input(path))).rejects.toThrow('Prüfsumme stimmt nicht');
    expect(existsSync(path)).toBe(false);
  });

  it('keine Prüfsumme zu finden: Fehler', async () => {
    const { fetch } = fakeFetch({ [`${base}thueringen-latest.osm.pbf`]: (u) => response(200, content, u) });
    await expect(downloadPbf(fetch, input(join(dir, 'c.pbf')))).rejects.toThrow('keine Prüfsumme');
  });

  it('zu groß laut Kopfzeile: bricht vor dem Laden ab', async () => {
    const { fetch } = fakeFetch({
      [`${base}thueringen-latest.osm.pbf`]: (u) => response(200, content, u, { 'content-length': String(5 * 1024 * 1024 * 1024) }),
    });
    await expect(downloadPbf(fetch, input(join(dir, 'd.pbf')))).rejects.toThrow('Datei ist 5120 MB groß');
  });

  it('zu groß beim Laden (Kopfzeile fehlt): bricht ab und löscht', async () => {
    const path = join(dir, 'e.pbf');
    const { fetch } = fakeFetch({ [`${base}thueringen-latest.osm.pbf`]: (u) => response(200, content, u) });
    await expect(downloadPbf(fetch, input(path, 20))).rejects.toThrow('abgebrochen');
    expect(existsSync(path)).toBe(false);
  });

  it('Weiterleitung auf einen fremden Server wird abgelehnt', async () => {
    const { fetch } = fakeFetch({ [`${base}thueringen-latest.osm.pbf`]: () => response(200, content, 'https://example.com/x.pbf') });
    await expect(downloadPbf(fetch, input(join(dir, 'f.pbf')))).rejects.toThrow('unerwartete Adresse');
  });

  it('HTTP-Fehler', async () => {
    const { fetch } = fakeFetch({ [`${base}thueringen-latest.osm.pbf`]: (u) => response(503, null, u) });
    await expect(downloadPbf(fetch, input(join(dir, 'g.pbf')))).rejects.toThrow('HTTP 503');
  });
});

describe('downloadText und parseMd5', () => {
  it('lädt kleine Dateien und lehnt zu große ab', async () => {
    const { fetch } = fakeFetch({ [`${base}thueringen.poly`]: (u) => response(200, Buffer.from('thueringen\n1\nEND\nEND'), u) });
    await expect(downloadText(fetch, `${base}thueringen.poly`, 1000, 5000, 'Umriss')).resolves.toContain('thueringen');
    await expect(downloadText(fetch, `${base}thueringen.poly`, 5, 5000, 'Umriss')).rejects.toThrow('größer als erwartet');
  });

  it('parseMd5', () => {
    expect(parseMd5(`${md5.toUpperCase()}  datei`)).toBe(md5);
    expect(parseMd5('kaputt')).toBeNull();
  });
});
