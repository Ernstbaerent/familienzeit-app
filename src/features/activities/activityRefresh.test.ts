// Neue Aktivitäten holen und speichern (M8) mit gemockten Antworten: Erfolg, Rückfall bei jedem Fehler, Nur-approved-Regel.

import { makeActivity } from '../suggestions/testHelpers';
import { activityToRow } from './activityRow';
import { refreshActivities } from './activityRefresh';
import { ActivitiesFetchError } from './fetchActivities';

// Der Zwischenspeicher (activitiesStorage) wird im Test nicht benutzt, ist aber eingebunden und braucht den Ersatz für das Handy.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_geheim123' };
const prefix = 'https://abc.supabase.co/storage/v1/object/public/';

const rowsOf = (count: number) => Array.from({ length: count }, (_, i) => activityToRow(makeActivity({ id: `a-${i}` })));

let warn: jest.SpyInstance;
let info: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  info = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function run(rows: unknown[] | Error, extra: { save?: jest.Mock; now?: number } = {}) {
  const save = extra.save ?? jest.fn().mockResolvedValue(undefined);
  const fetchRows = jest.fn(async () => {
    if (rows instanceof Error) throw rows;
    return rows;
  });
  const promise = refreshActivities({ config, imagePrefix: prefix, now: () => extra.now ?? 5_000, fetchRows, save });
  return { promise, save, fetchRows };
}

describe('Erfolg', () => {
  it('gibt den neuen Bestand zurück und speichert ihn mit dem Zeitpunkt des Abrufs', async () => {
    const { promise, save, fetchRows } = run(rowsOf(5), { now: 12_345 });
    const record = await promise;
    expect(record?.fetchedAt).toBe(12_345);
    expect(record?.activities.map((activity) => activity.id)).toEqual(['a-0', 'a-1', 'a-2', 'a-3', 'a-4']);
    expect(fetchRows).toHaveBeenCalledWith(config);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(record);
    expect(warn).not.toHaveBeenCalled();
  });

  it('genau drei gültige Aktivitäten genügen', async () => {
    expect(await run(rowsOf(3)).promise).not.toBeNull();
  });
});

describe('Nur-approved-Regel', () => {
  it('liefert der Server aus Versehen Entwürfe oder Abgelehnte, kommen sie nie in den Bestand und nie in den Speicher', async () => {
    const rows = [
      ...rowsOf(4),
      activityToRow(makeActivity({ id: 'entwurf', status: 'draft' })),
      activityToRow(makeActivity({ id: 'abgelehnt', status: 'rejected' })),
    ];
    const { promise, save } = run(rows);
    const record = await promise;
    expect(record?.activities.map((activity) => activity.id)).toEqual(['a-0', 'a-1', 'a-2', 'a-3']);
    expect(JSON.stringify(save.mock.calls[0][0])).not.toContain('entwurf');
    expect(JSON.stringify(save.mock.calls[0][0])).not.toContain('abgelehnt');
  });

  it('zählen Entwürfe nicht mit: zwei freigegebene plus viele Entwürfe sind zu wenig', async () => {
    const rows = [...rowsOf(2), ...Array.from({ length: 10 }, (_, i) => activityToRow(makeActivity({ id: `d-${i}`, status: 'draft' })))];
    const { promise, save } = run(rows);
    expect(await promise).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('kaputte Einträge', () => {
  it('werden verworfen, der Rest zählt', async () => {
    const rows = [...rowsOf(3), { id: 'kaputt', age_min: 'zwei' }, null, 'text'];
    const record = await run(rows).promise;
    expect(record?.activities).toHaveLength(3);
    expect(warn).toHaveBeenCalled();
  });

  it('sind es danach zu wenige, bleibt der bisherige Bestand (Ergebnis null, nichts gespeichert)', async () => {
    const { promise, save } = run([...rowsOf(2), { id: 'kaputt' }]);
    expect(await promise).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('ein Bild von einem fremden Server fällt weg, die Aktivität bleibt', async () => {
    const rows = [...rowsOf(3), { ...activityToRow(makeActivity({ id: 'fremd' })), image: 'https://example.org/a.jpg' }];
    const record = await run(rows).promise;
    const fremd = record?.activities.find((activity) => activity.id === 'fremd');
    expect(fremd).toBeDefined();
    expect(fremd?.image).toBeUndefined();
  });
});

describe('Rückfall: nichts davon wirft, nichts davon schreibt etwas', () => {
  it.each([
    ['kein Netz', new ActivitiesFetchError('Network request failed')],
    ['HTTP 503 (Projekt pausiert oder gestört)', new ActivitiesFetchError('HTTP 503')],
    ['HTTP 401 (falscher Schlüssel)', new ActivitiesFetchError('HTTP 401')],
    ['Zeitüberschreitung', new ActivitiesFetchError('Zeitüberschreitung nach 10 Sekunden')],
    ['ein unerwarteter Fehler', new Error('boom')],
  ])('%s: null und genau eine Warnung', async (_name, error) => {
    const { promise, save } = run(error);
    await expect(promise).resolves.toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain(error.message);
  });

  it.each([
    ['eine leere Liste', []],
    ['zwei Aktivitäten', rowsOf(2)],
    ['lauter kaputte Einträge', [{}, {}, {}, {}]],
    ['keine Zeilen, sondern Zahlen', [1, 2, 3, 4]],
  ])('%s: null, nichts gespeichert, eine Warnung zur Menge', async (_name, rows) => {
    const { promise, save } = run(rows);
    expect(await promise).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(warn.mock.calls.map((call) => String(call[0])).some((message) => message.includes('mindestens 3'))).toBe(true);
  });

  it('die Warnungen nennen weder Schlüssel noch Adresse', async () => {
    await run(new ActivitiesFetchError('HTTP 401')).promise;
    await run([]).promise;
    const logs = JSON.stringify([...warn.mock.calls, ...info.mock.calls]);
    expect(logs).not.toContain(config.anonKey);
    expect(logs).not.toContain(config.url);
    expect(logs).not.toContain('supabase.co');
  });

  it('Speichern auf dem Gerät schlägt fehl: der neue Bestand gilt trotzdem (bis zum Schließen der App), mit Warnung', async () => {
    const save = jest.fn().mockRejectedValue(new Error('Speicher voll'));
    const record = await run(rowsOf(4), { save }).promise;
    expect(record?.activities).toHaveLength(4);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('Speichern');
  });
});
