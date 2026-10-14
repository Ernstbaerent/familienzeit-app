// Orte-Import (M10a): Dateien von Geofabrik laden. Regeln (docs/orte.md, „Geofabrik“):
//   - nur von download.geofabrik.de (auch nach einer Weiterleitung; „latest“ leitet seit 2025 auf die Datei mit Datum weiter),
//   - jede Datei höchstens einmal pro Lauf, eigener User-Agent, Größenlimit, Zeitlimit,
//   - die große Datei wird beim Laden mit ihrer Prüfsumme (.md5) verglichen.
// Das Internet kommt als Parameter herein (Tests geben eine Attrappe).

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';

import { geofabrikHost } from './regions.ts';

export const userAgent = 'miki-places-import/1.0 (familienzeit-app; monatlicher Import, GitHub Actions)';

export type DownloadResponse = {
  ok: boolean;
  status: number;
  url: string; // Adresse nach Weiterleitungen
  headers: { get(name: string): string | null };
  body: AsyncIterable<Uint8Array> | null;
  text(): Promise<string>;
};

export type DownloadFetch = (url: string, init: { headers: Record<string, string>; signal: AbortSignal; redirect: 'follow' }) => Promise<DownloadResponse>;

export class DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadError';
  }
}

function checkHost(url: string, what: string) {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // unten
  }
  if (host !== geofabrikHost) throw new DownloadError(`${what}: unerwartete Adresse nach Weiterleitung (${host || 'ungültig'})`);
}

async function withAbort<T>(timeoutMs: number, what: string, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new DownloadError(`${what}: Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} Sekunden`);
    if (error instanceof DownloadError) throw error;
    throw new DownloadError(`${what}: ${error instanceof Error ? error.message.slice(0, 200) : 'Netzwerkfehler'}`);
  } finally {
    clearTimeout(timer);
  }
}

// Kleine Textdatei (.poly, .md5) laden.
export async function downloadText(fetchImpl: DownloadFetch, url: string, maxBytes: number, timeoutMs: number, what: string): Promise<string> {
  return withAbort(timeoutMs, what, async (signal) => {
    const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent }, signal, redirect: 'follow' });
    checkHost(response.url || url, what);
    if (!response.ok) throw new DownloadError(`${what}: HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > maxBytes) throw new DownloadError(`${what}: größer als erwartet`);
    return text;
  });
}

// Prüfsumme aus einer .md5-Datei („<32 Hex-Zeichen>  dateiname“).
export function parseMd5(text: string): string | null {
  const match = /^([0-9a-f]{32})\b/i.exec(text.trim());
  return match ? match[1].toLowerCase() : null;
}

export type PbfDownload = { path: string; bytes: number; finalUrl: string; md5: string };

// Lädt die .osm.pbf nach `path`, mit Größenlimit, und vergleicht danach die Prüfsumme.
// Die .md5 gehört zur Datei nach der Weiterleitung (mit Datum im Namen); gibt es sie nicht, die von „latest“.
export async function downloadPbf(
  fetchImpl: DownloadFetch,
  input: { url: string; path: string; maxBytes: number; timeoutMs: number; md5TimeoutMs: number; what: string },
): Promise<PbfDownload> {
  const { url, path, maxBytes, what } = input;
  const result = await withAbort(input.timeoutMs, what, async (signal) => {
    const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent }, signal, redirect: 'follow' });
    const finalUrl = response.url || url;
    checkHost(finalUrl, what);
    if (!response.ok || !response.body) throw new DownloadError(`${what}: HTTP ${response.status}`);
    const announced = Number(response.headers.get('content-length') ?? NaN);
    if (Number.isFinite(announced) && announced > maxBytes) {
      throw new DownloadError(`${what}: Datei ist ${Math.round(announced / 1024 / 1024)} MB groß, erlaubt sind ${Math.round(maxBytes / 1024 / 1024)} MB`);
    }
    const hash = createHash('md5');
    const file = createWriteStream(path);
    let bytes = 0;
    try {
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) throw new DownloadError(`${what}: größer als ${Math.round(maxBytes / 1024 / 1024)} MB, abgebrochen`);
        hash.update(chunk);
        if (!file.write(chunk)) await new Promise<void>((resolve) => file.once('drain', () => resolve()));
      }
    } finally {
      await new Promise<void>((resolve, reject) => file.end((error?: Error | null) => (error ? reject(error) : resolve())));
    }
    return { finalUrl, bytes, md5: hash.digest('hex') };
  }).catch(async (error: unknown) => {
    await rm(path, { force: true });
    throw error;
  });

  const candidates = result.finalUrl === url ? [`${url}.md5`] : [`${result.finalUrl}.md5`, `${url}.md5`];
  let expected: string | null = null;
  for (const md5Url of candidates) {
    try {
      expected = parseMd5(await downloadText(fetchImpl, md5Url, 4096, input.md5TimeoutMs, `${what} (Prüfsumme)`));
    } catch {
      expected = null;
    }
    if (expected) break;
  }
  if (!expected) {
    await rm(path, { force: true });
    throw new DownloadError(`${what}: keine Prüfsumme (.md5) bei Geofabrik gefunden`);
  }
  if (expected !== result.md5) {
    await rm(path, { force: true });
    throw new DownloadError(`${what}: Prüfsumme stimmt nicht (Datei unvollständig oder gerade erneuert)`);
  }
  return { path, ...result };
}
