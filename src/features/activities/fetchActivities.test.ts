// Abruf bei Supabase mit gemockten Antworten (M8, M8b): Adressen, Kopfzeilen, Seiten, Fehler und Zeitüberschreitung.

import { makeActivity } from '../suggestions/testHelpers';
import { activityColumns, activityToRow } from './activityRow';
import { parseTimestamp } from './activitySync';
import {
  ActivitiesFetchError,
  buildByIdsUrl,
  buildChangesUrl,
  buildCountUrl,
  buildHeaders,
  buildIdsUrl,
  idPageSize,
  idsPerRequest,
  maxPages,
  pageSize,
  readServerTime,
  readTotalCount,
  requestTimeoutMs,
  selectColumns,
  withActivitiesApi,
  type FetchLike,
} from './fetchActivities';

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_abc123' };
const jwtConfig = { url: 'https://abc.supabase.co', anonKey: 'eyJhbGciOi.eyJyb2xlIjoiYW5vbiJ9.sig' };

const t0 = parseTimestamp('2026-10-18T16:00:00Z') as number;

// Zeilen mit fortlaufendem Zeitstempel (eine Mikrosekunde Abstand), wie der Server sie nach (updated_at, id) sortiert liefert.
function rows(count: number, from = 0) {
  return Array.from({ length: count }, (_, i) => ({
    ...activityToRow(makeActivity({ id: `a-${String(from + i).padStart(5, '0')}` })),
    updated_at: new Date((t0 + from + i) / 1000).toISOString().replace('Z', `${String((from + i) % 1000).padStart(3, '0')}+00:00`),
  }));
}

function params(url: string): Map<string, string> {
  return new Map(
    url
      .split('?')[1]
      .split('&')
      .map((pair) => {
        const index = pair.indexOf('=');
        return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))] as [string, string];
      }),
  );
}

type Answer = { ok?: boolean; status?: number; body?: unknown; json?: () => Promise<unknown>; headers?: Record<string, string> } | Error;

// Ein Ersatz für fetch, der der Reihe nach diese Antworten gibt (die letzte wiederholt sich).
function mockFetch(...answers: Answer[]) {
  const calls: Parameters<FetchLike>[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push([url, init]);
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (answer instanceof Error) throw answer;
    const headers = answer.headers ?? {};
    return {
      ok: answer.ok ?? true,
      status: answer.status ?? 200,
      json: answer.json ?? (async () => answer.body),
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    };
  };
  return { fn, calls };
}

describe('Adressen', () => {
  it('Änderungen ohne Stand: alle freigegebenen, sortiert nach (updated_at, id), mit festem Spaltenumfang', () => {
    const url = buildChangesUrl(config, null);
    expect(url.startsWith('https://abc.supabase.co/rest/v1/activities?')).toBe(true);
    const p = params(url);
    expect([...p.keys()]).toEqual(['select', 'status', 'order', 'limit']);
    expect(p.get('status')).toBe('eq.approved');
    expect(p.get('order')).toBe('updated_at.asc,id.asc');
    expect(p.get('limit')).toBe(String(pageSize));
    expect(p.get('select')?.split(',')).toEqual([...activityColumns, 'updated_at']);
    expect(p.get('select')).not.toContain('*');
  });

  it('mit Stand: nur Zeilen danach; nächste Seite über das letzte Paar (Zeitstempel, ID), nie über offset', () => {
    const url = buildChangesUrl(config, '2026-10-18T16:00:00.123456Z', { updatedAt: t0 + 7, id: 'kerzen-"ziehen"' });
    const p = params(url);
    expect(p.get('updated_at')).toBe('gt.2026-10-18T16:00:00.123456Z');
    expect(p.get('or')).toBe(
      '(updated_at.gt.2026-10-18T16:00:00.000007Z,and(updated_at.eq.2026-10-18T16:00:00.000007Z,id.gt."kerzen-\\"ziehen\\""))',
    );
    expect(url).not.toContain('offset');
    // Kein „+“ (würde als Leerzeichen gelesen), keine Anführungszeichen und Leerzeichen ungeschützt in der Adresse.
    expect(url.split('?')[1]).not.toMatch(/[+" ]/);
  });

  it('Zählprobe: keine Zeile, nur die Anzahl', () => {
    expect([...params(buildCountUrl(config)).entries()]).toEqual([
      ['select', 'id'],
      ['status', 'eq.approved'],
      ['limit', '0'],
    ]);
  });

  it('ID-Liste: nur die Spalte id, sortiert, Seiten über die letzte ID', () => {
    expect([...params(buildIdsUrl(config, null)).entries()]).toEqual([
      ['select', 'id'],
      ['status', 'eq.approved'],
      ['order', 'id.asc'],
      ['limit', String(idPageSize)],
    ]);
    expect(params(buildIdsUrl(config, 'zoo')).get('id')).toBe('gt."zoo"');
  });

  it('einzelne Aktivitäten nach ID', () => {
    expect(params(buildByIdsUrl(config, ['a', 'b,c'])).get('id')).toBe('in.("a","b,c")');
  });

  it('enthält keinen Schlüssel und keine persönlichen Angaben', () => {
    for (const url of [buildChangesUrl(config, null), buildCountUrl(config), buildIdsUrl(config, null), buildByIdsUrl(config, ['a'])]) {
      expect(url).not.toContain(config.anonKey);
      expect([...params(url).keys()].every((name) => ['select', 'status', 'updated_at', 'or', 'order', 'limit', 'id'].includes(name))).toBe(true);
    }
  });
});

describe('Kopfzeilen', () => {
  it('neuer Schlüssel (sb_publishable_…): nur apikey und Accept, kein Bearer', () => {
    expect(buildHeaders(config)).toEqual({ apikey: config.anonKey, Accept: 'application/json' });
  });

  it('Schlüssel im JWT-Format: zusätzlich als Bearer', () => {
    expect(buildHeaders(jwtConfig)).toEqual({
      apikey: jwtConfig.anonKey,
      Accept: 'application/json',
      Authorization: `Bearer ${jwtConfig.anonKey}`,
    });
  });

  it('nie Accept-Encoding: React Native fordert gepackte Antworten selbst an und entpackt sie nur dann selbst (Android/OkHttp)', () => {
    for (const headers of [buildHeaders(config), buildHeaders(jwtConfig), buildHeaders(config, { Prefer: 'count=exact' })]) {
      expect(Object.keys(headers).map((name) => name.toLowerCase())).not.toContain('accept-encoding');
    }
  });

  it('Uhrzeit des Servers und Anzahl werden aus den Kopfzeilen gelesen', () => {
    const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
    expect(readServerTime(headers({ date: 'Sun, 18 Oct 2026 16:00:00 GMT' }))).toBe(t0);
    expect(readServerTime(headers({ date: 'gestern' }))).toBeNull();
    expect(readServerTime(undefined)).toBeNull();
    expect(readTotalCount(headers({ 'content-range': '*/1500' }))).toBe(1500);
    expect(readTotalCount(headers({ 'content-range': '0-0/119' }))).toBe(119);
    expect(readTotalCount(headers({ 'content-range': '0-0/*' }))).toBeNull();
    expect(readTotalCount(headers({}))).toBeNull();
  });
});

describe('Anfragen', () => {
  it('Änderungen: ein GET mit den Kopfzeilen, gibt die Zeilen und den größten Zeitstempel zurück', async () => {
    const body = rows(3);
    const { fn, calls } = mockFetch({ body, headers: { date: 'Sun, 18 Oct 2026 16:00:00 GMT' } });
    const result = await withActivitiesApi(config, { fetchImpl: fn }, (api) => api.changes(null));
    expect(result.rows).toEqual(body);
    expect(result.maxUpdatedAt).toBe(t0 + 2);
    expect(result.serverTime).toBe(t0);
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0];
    expect(url).toBe(buildChangesUrl(config, null));
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual(buildHeaders(config));
    expect(Object.keys(init).sort()).toEqual(['headers', 'method', 'signal']); // kein Body, keine Cookies, nichts Weiteres
  });

  it('eine leere Liste ist eine gültige Antwort (nichts geändert)', async () => {
    const result = await withActivitiesApi(config, { fetchImpl: mockFetch({ body: [] }).fn }, (api) => api.changes('2026-10-18T16:00:00.000000Z'));
    expect(result).toEqual({ rows: [], maxUpdatedAt: null, serverTime: null });
  });

  it('holt weitere Seiten, solange eine Seite voll ist; jede Seite schließt an das letzte Paar an', async () => {
    const { fn, calls } = mockFetch({ body: rows(pageSize) }, { body: rows(pageSize, pageSize) }, { body: rows(3, 2 * pageSize) });
    const result = await withActivitiesApi(config, { fetchImpl: fn }, (api) => api.changes(null));
    expect(result.rows).toHaveLength(2 * pageSize + 3);
    expect(calls.map(([url]) => params(url).get('or') ?? null)).toEqual([
      null,
      expect.stringContaining('id.gt."a-00499"'),
      expect.stringContaining('id.gt."a-00999"'),
    ]);
  });

  it('hört nach der größten Seitenzahl auf und übernimmt dann nichts (eine halbe Liste würde den Stand verfälschen)', async () => {
    const { fn, calls } = mockFetch({ body: rows(pageSize) });
    await expect(withActivitiesApi(config, { fetchImpl: fn }, (api) => api.changes(null))).rejects.toThrow('mehr als');
    expect(calls).toHaveLength(maxPages);
  });

  it('eine Zeile ohne gültiges updated_at: nichts übernehmen', async () => {
    const body = [{ ...rows(1)[0], updated_at: 'gestern' }];
    await expect(withActivitiesApi(config, { fetchImpl: mockFetch({ body }).fn }, (api) => api.changes(null))).rejects.toThrow('updated_at');
  });

  it('Zählprobe: sendet Prefer: count=exact und liest die Anzahl aus content-range', async () => {
    const { fn, calls } = mockFetch({ body: [], headers: { 'content-range': '*/119', date: 'Sun, 18 Oct 2026 16:00:00 GMT' } });
    await expect(withActivitiesApi(config, { fetchImpl: fn }, (api) => api.count())).resolves.toEqual({ count: 119, serverTime: t0 });
    expect(calls[0][1].headers.Prefer).toBe('count=exact');
  });

  it('Zählprobe ohne content-range: Anzahl unbekannt (kein Fehler)', async () => {
    await expect(withActivitiesApi(config, { fetchImpl: mockFetch({ body: [] }).fn }, (api) => api.count())).resolves.toEqual({
      count: null,
      serverTime: null,
    });
  });

  it('ID-Liste über mehrere Seiten', async () => {
    const ids = (count: number, from: number) => Array.from({ length: count }, (_, i) => ({ id: `id-${String(from + i).padStart(5, '0')}` }));
    const { fn, calls } = mockFetch({ body: ids(idPageSize, 0) }, { body: ids(2, idPageSize) });
    const result = await withActivitiesApi(config, { fetchImpl: fn }, (api) => api.ids());
    expect(result).toHaveLength(idPageSize + 2);
    expect(params(calls[1][0]).get('id')).toBe(`gt."id-00999"`);
  });

  it('ID-Liste mit ungültigem Eintrag: Fehler', async () => {
    await expect(withActivitiesApi(config, { fetchImpl: mockFetch({ body: [{ id: 5 }] }).fn }, (api) => api.ids())).rejects.toThrow('ID-Liste');
  });

  it(`einzelne Aktivitäten in Gruppen zu höchstens ${idsPerRequest}`, async () => {
    const { fn, calls } = mockFetch({ body: [] });
    const wanted = Array.from({ length: idsPerRequest + 1 }, (_, i) => `x-${i}`);
    await withActivitiesApi(config, { fetchImpl: fn }, (api) => api.byIds(wanted));
    expect(calls).toHaveLength(2);
    expect(params(calls[1][0]).get('id')).toBe(`in.("x-${idsPerRequest}")`);
  });
});

describe('Fehler (alle werden zu einem ActivitiesFetchError)', () => {
  const run = (fn: FetchLike, key = config) => withActivitiesApi(key, { fetchImpl: fn }, (api) => api.changes(null));

  it.each([
    [401, 'HTTP 401'],
    [404, 'HTTP 404'],
    [500, 'HTTP 500'],
    [503, 'HTTP 503'],
  ])('HTTP %s', async (status, message) => {
    const promise = run(mockFetch({ ok: false, status, body: { message: 'x' } }).fn);
    await expect(promise).rejects.toBeInstanceOf(ActivitiesFetchError);
    await expect(promise).rejects.toThrow(message);
  });

  it('kein Netz', async () => {
    const promise = run(mockFetch(new TypeError('Network request failed')).fn);
    await expect(promise).rejects.toThrow('Network request failed');
    await expect(promise).rejects.toBeInstanceOf(ActivitiesFetchError);
  });

  it('kaputtes JSON', async () => {
    const json = async () => {
      throw new SyntaxError('Unexpected token');
    };
    await expect(run(mockFetch({ json }).fn)).rejects.toThrow('kein gültiges JSON');
  });

  it.each([
    ['ein Objekt (so sieht eine PostgREST-Fehlermeldung aus)', { code: 'PGRST301', message: 'JWT expired' }],
    ['Text', 'hallo'],
    ['nichts', null],
  ])('Antwort ist %s statt einer Liste', async (_name, body) => {
    await expect(run(mockFetch({ body }).fn)).rejects.toThrow('keine Liste');
  });

  it('ein Fehler auf einer späteren Seite verwirft alles (keine halbe Liste)', async () => {
    await expect(run(mockFetch({ body: rows(pageSize) }, { ok: false, status: 500 }).fn)).rejects.toThrow('HTTP 500');
  });

  it('die Fehlermeldung enthält nie den Schlüssel', async () => {
    await expect(run(mockFetch({ ok: false, status: 401 }).fn, jwtConfig)).rejects.not.toThrow(jwtConfig.anonKey);
  });
});

describe('Zeitüberschreitung', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('der Standard sind 10 Sekunden', () => {
    expect(requestTimeoutMs).toBe(10_000);
  });

  it('antwortet der Server nicht (pausiertes Projekt), gibt der Abruf nach 10 Sekunden auf und bricht die Anfrage ab', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl: FetchLike = (_url, init) => {
      signal = init.signal;
      return new Promise(() => {}); // antwortet nie, auch nicht auf den Abbruch
    };
    const promise = withActivitiesApi(config, { fetchImpl }, (api) => api.count());
    const assertion = expect(promise).rejects.toThrow('Zeitüberschreitung nach 10 Sekunden');
    await jest.advanceTimersByTimeAsync(9_999);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it('die 10 Sekunden gelten für den ganzen Abgleich (alle Anfragen zusammen)', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      if (calls === 1) return { ok: true, status: 200, json: async () => [] };
      return new Promise(() => {}); // die zweite Anfrage hängt
    };
    const promise = withActivitiesApi(config, { fetchImpl }, async (api) => {
      await api.count();
      return api.changes(null);
    });
    const assertion = expect(promise).rejects.toThrow('Zeitüberschreitung');
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(calls).toBe(2);
  });

  it('nach einem erfolgreichen Abgleich bleibt kein Zeitgeber übrig', async () => {
    await withActivitiesApi(config, { fetchImpl: mockFetch({ body: rows(2) }).fn }, (api) => api.changes(null));
    expect(jest.getTimerCount()).toBe(0);
  });

  it('nach einem Fehler bleibt kein Zeitgeber übrig', async () => {
    await expect(withActivitiesApi(config, { fetchImpl: mockFetch({ ok: false, status: 500 }).fn }, (api) => api.count())).rejects.toThrow();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('die Zeit lässt sich einstellen', async () => {
    const promise = withActivitiesApi(config, { fetchImpl: () => new Promise(() => {}), timeoutMs: 2_000 }, (api) => api.count());
    const assertion = expect(promise).rejects.toThrow('Zeitüberschreitung nach 2 Sekunden');
    await jest.advanceTimersByTimeAsync(2_000);
    await assertion;
  });
});

it('selectColumns ist activityColumns plus updated_at (das Seed-Skript schreibt updated_at nie)', () => {
  expect(selectColumns).toEqual([...activityColumns, 'updated_at']);
  expect(activityColumns).not.toContain('updated_at' as never);
});
