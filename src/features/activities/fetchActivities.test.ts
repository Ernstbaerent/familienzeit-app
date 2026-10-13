// Abruf bei Supabase mit gemockten Antworten: Adresse, Kopfzeilen, Seiten, Fehler und Zeitüberschreitung (M8).

import { makeActivity } from '../suggestions/testHelpers';
import { activityColumns, activityToRow } from './activityRow';
import {
  ActivitiesFetchError,
  buildActivitiesUrl,
  buildHeaders,
  fetchApprovedRows,
  maxPages,
  pageSize,
  requestTimeoutMs,
  type FetchLike,
} from './fetchActivities';

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_abc123' };
const jwtConfig = { url: 'https://abc.supabase.co', anonKey: 'eyJhbGciOi.eyJyb2xlIjoiYW5vbiJ9.sig' };

function rows(count: number, from = 0) {
  return Array.from({ length: count }, (_, i) => activityToRow(makeActivity({ id: `a-${from + i}` })));
}

// Ein Ersatz für fetch, der der Reihe nach diese Antworten gibt.
function mockFetch(...answers: ({ ok?: boolean; status?: number; body?: unknown; json?: () => Promise<unknown> } | Error)[]) {
  const calls: Parameters<FetchLike>[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push([url, init]);
    const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (answer instanceof Error) throw answer;
    return {
      ok: answer.ok ?? true,
      status: answer.status ?? 200,
      json: answer.json ?? (async () => answer.body),
    };
  };
  return { fn, calls };
}

describe('Adresse', () => {
  const url = buildActivitiesUrl(config, 0);

  it('fragt nur freigegebene Aktivitäten ab, nach ID sortiert, mit festem Spaltenumfang', () => {
    expect(url.startsWith('https://abc.supabase.co/rest/v1/activities?')).toBe(true);
    const params = new Map(url.split('?')[1].split('&').map((pair) => pair.split('=') as [string, string]));
    expect(params.get('status')).toBe('eq.approved');
    expect(params.get('order')).toBe('id.asc');
    expect(params.get('limit')).toBe(String(pageSize));
    expect(params.get('offset')).toBe('0');
    expect(params.get('select')?.split(',')).toEqual([...activityColumns]);
    expect(params.get('select')).not.toContain('*');
  });

  it('die Seite bestimmt den Versatz', () => {
    expect(buildActivitiesUrl(config, 500)).toContain('offset=500');
    expect(buildActivitiesUrl(config, 500, 10)).toContain('limit=10');
  });

  it('enthält keinen Schlüssel und keine persönlichen Angaben', () => {
    expect(url).not.toContain(config.anonKey);
    // Genau diese fünf Parameter, sonst nichts (keine Orte, Kinder, Profile oder Verläufe).
    expect(url.split('?')[1].split('&').map((pair) => pair.split('=')[0])).toEqual(['select', 'status', 'order', 'limit', 'offset']);
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
});

describe('Abruf', () => {
  it('ein GET mit den Kopfzeilen, gibt die Zeilen unverändert zurück', async () => {
    const body = rows(3);
    const { fn, calls } = mockFetch({ body });
    await expect(fetchApprovedRows(config, { fetchImpl: fn })).resolves.toEqual(body);
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0];
    expect(url).toBe(buildActivitiesUrl(config, 0));
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual(buildHeaders(config));
    expect(Object.keys(init).sort()).toEqual(['headers', 'method', 'signal']); // kein Body, keine Cookies, nichts Weiteres
  });

  it('eine leere Liste ist eine gültige Antwort', async () => {
    await expect(fetchApprovedRows(config, { fetchImpl: mockFetch({ body: [] }).fn })).resolves.toEqual([]);
  });

  it('holt weitere Seiten, solange eine Seite voll ist', async () => {
    const { fn, calls } = mockFetch({ body: rows(pageSize) }, { body: rows(pageSize, pageSize) }, { body: rows(3, 2 * pageSize) });
    const result = await fetchApprovedRows(config, { fetchImpl: fn });
    expect(result).toHaveLength(2 * pageSize + 3);
    expect(calls.map(([url]) => url.match(/offset=(\d+)/)?.[1])).toEqual(['0', '500', '1000']);
  });

  it('genau eine volle Seite: noch ein Abruf, dann ist Schluss', async () => {
    const { fn, calls } = mockFetch({ body: rows(pageSize) }, { body: [] });
    expect(await fetchApprovedRows(config, { fetchImpl: fn })).toHaveLength(pageSize);
    expect(calls).toHaveLength(2);
  });

  it('hört nach der größten Seitenzahl auf, auch wenn der Server nie aufhört', async () => {
    const { fn, calls } = mockFetch({ body: rows(pageSize) });
    const result = await fetchApprovedRows(config, { fetchImpl: fn });
    expect(calls).toHaveLength(maxPages);
    expect(result).toHaveLength(maxPages * pageSize);
  });
});

describe('Fehler (alle werden zu einem ActivitiesFetchError)', () => {
  it.each([
    [401, 'HTTP 401'],
    [404, 'HTTP 404'],
    [500, 'HTTP 500'],
    [503, 'HTTP 503'],
  ])('HTTP %s', async (status, message) => {
    const promise = fetchApprovedRows(config, { fetchImpl: mockFetch({ ok: false, status, body: { message: 'x' } }).fn });
    await expect(promise).rejects.toBeInstanceOf(ActivitiesFetchError);
    await expect(promise).rejects.toThrow(message);
  });

  it('kein Netz', async () => {
    const promise = fetchApprovedRows(config, { fetchImpl: mockFetch(new TypeError('Network request failed')).fn });
    await expect(promise).rejects.toThrow('Network request failed');
    await expect(promise).rejects.toBeInstanceOf(ActivitiesFetchError);
  });

  it('kaputtes JSON', async () => {
    const json = async () => {
      throw new SyntaxError('Unexpected token');
    };
    await expect(fetchApprovedRows(config, { fetchImpl: mockFetch({ json }).fn })).rejects.toThrow('kein gültiges JSON');
  });

  it.each([
    ['ein Objekt (so sieht eine PostgREST-Fehlermeldung aus)', { code: 'PGRST301', message: 'JWT expired' }],
    ['Text', 'hallo'],
    ['nichts', null],
  ])('Antwort ist %s statt einer Liste', async (_name, body) => {
    await expect(fetchApprovedRows(config, { fetchImpl: mockFetch({ body }).fn })).rejects.toThrow('keine Liste');
  });

  it('ein Fehler auf einer späteren Seite verwirft alles (keine halbe Liste)', async () => {
    const { fn } = mockFetch({ body: rows(pageSize) }, { ok: false, status: 500 });
    await expect(fetchApprovedRows(config, { fetchImpl: fn })).rejects.toThrow('HTTP 500');
  });

  it('die Fehlermeldung enthält nie den Schlüssel', async () => {
    const promise = fetchApprovedRows(jwtConfig, { fetchImpl: mockFetch({ ok: false, status: 401 }).fn });
    await expect(promise).rejects.not.toThrow(jwtConfig.anonKey);
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
    const promise = fetchApprovedRows(config, { fetchImpl });
    const assertion = expect(promise).rejects.toThrow('Zeitüberschreitung nach 10 Sekunden');
    await jest.advanceTimersByTimeAsync(9_999);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it('die 10 Sekunden gelten für alle Seiten zusammen', async () => {
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls += 1;
      if (calls === 1) return { ok: true, status: 200, json: async () => rows(pageSize) };
      return new Promise(() => {}); // die zweite Seite hängt
    };
    const promise = fetchApprovedRows(config, { fetchImpl });
    const assertion = expect(promise).rejects.toThrow('Zeitüberschreitung');
    await jest.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(calls).toBe(2);
  });

  it('nach einem erfolgreichen Abruf bleibt kein Zeitgeber übrig', async () => {
    await fetchApprovedRows(config, { fetchImpl: mockFetch({ body: rows(2) }).fn });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('nach einem Fehler bleibt kein Zeitgeber übrig', async () => {
    await expect(fetchApprovedRows(config, { fetchImpl: mockFetch({ ok: false, status: 500 }).fn })).rejects.toThrow();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('die Zeit lässt sich einstellen', async () => {
    const promise = fetchApprovedRows(config, { fetchImpl: () => new Promise(() => {}), timeoutMs: 2_000 });
    const assertion = expect(promise).rejects.toThrow('Zeitüberschreitung nach 2 Sekunden');
    await jest.advanceTimersByTimeAsync(2_000);
    await assertion;
  });
});
