// Abgleich (M8b) als reine Funktionen: Zeitstempel, Stand mit Überlappung, Zusammenführen, ID-Abgleich.

import { makeActivity } from '../suggestions/testHelpers';
import type { Activity } from './activities';
import { activityToRow } from './activityRow';
import {
  cursorOverlapMicros,
  formatTimestamp,
  idCheckDays,
  isCursorUsable,
  isIdCheckDue,
  mergeChanges,
  nextCursor,
  parseTimestamp,
  reconcileIds,
  sortById,
} from './activitySync';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
const minute = 60_000_000; // Mikrosekunden
const day = 24 * 60 * 60 * 1000; // Millisekunden

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('Zeitstempel', () => {
  it('liest das Format von Postgres mit Mikrosekunden', () => {
    const micros = parseTimestamp('2026-10-18T16:00:00.123456+00:00');
    expect(micros).toBe(Date.UTC(2026, 9, 18, 16) * 1000 + 123_456);
  });

  it('Nullen am Ende fehlen bei Postgres: .12 heißt 120 000 Mikrosekunden', () => {
    expect(parseTimestamp('2026-10-18T16:00:00.12+00:00')).toBe(Date.UTC(2026, 9, 18, 16) * 1000 + 120_000);
    expect(parseTimestamp('2026-10-18T16:00:00+00:00')).toBe(Date.UTC(2026, 9, 18, 16) * 1000);
  });

  it('rechnet Zeitzonen um', () => {
    expect(parseTimestamp('2026-10-18T18:00:00+02:00')).toBe(parseTimestamp('2026-10-18T16:00:00Z'));
    expect(parseTimestamp('2026-10-18T13:30:00-0230')).toBe(parseTimestamp('2026-10-18T16:00:00Z'));
    expect(parseTimestamp('2026-10-18 16:00:00+00')).toBe(parseTimestamp('2026-10-18T16:00:00Z'));
  });

  it.each([['gestern'], [''], ['2026-10-18T16:00:00'], ['2026-02-31T16:00:00Z'], ['2026-10-18T25:00:00Z'], [null], [12345]])(
    'unbrauchbar: %p',
    (value) => {
      expect(parseTimestamp(value)).toBeNull();
    },
  );

  it('schreibt immer gleich (UTC, sechs Stellen, Z) und hin und zurück ohne Verlust', () => {
    const micros = parseTimestamp('2026-10-18T18:00:00.000007+02:00') as number;
    expect(formatTimestamp(micros)).toBe('2026-10-18T16:00:00.000007Z');
    for (const text of ['2026-01-01T00:00:00.000000Z', '2026-12-31T23:59:59.999999Z', '2030-06-15T12:34:56.789012Z']) {
      expect(formatTimestamp(parseTimestamp(text) as number)).toBe(text);
    }
  });
});

describe('Stand mit Überlappung', () => {
  const server = parseTimestamp('2026-10-19T09:00:00Z') as number;

  it('der Stapel vom Sonntag ist fertig: Stand = größter Zeitstempel (wird nicht jeden Tag neu geladen)', () => {
    const sunday = parseTimestamp('2026-10-18T16:00:00Z') as number;
    expect(nextCursor(sunday, null, server)).toBe(sunday);
  });

  it('ein Schreibvorgang lief gerade: Stand höchstens Uhrzeit des Servers minus 15 Minuten', () => {
    expect(cursorOverlapMicros).toBe(15 * minute);
    expect(nextCursor(server - minute, null, server)).toBe(server - 15 * minute);
  });

  it('ohne Änderungen bleibt der Stand (aber nie nach Uhrzeit minus Überlappung)', () => {
    expect(nextCursor(null, server - 60 * minute, server)).toBe(server - 60 * minute);
    expect(nextCursor(null, server - minute, server)).toBe(server - 15 * minute);
    expect(nextCursor(null, null, server)).toBeNull();
  });

  it('ohne Uhrzeit des Servers: größter Zeitstempel minus Überlappung (sicher, lädt nur etwas doppelt)', () => {
    expect(nextCursor(server, null, null)).toBe(server - 15 * minute);
    expect(nextCursor(null, server, null)).toBe(server);
  });

  it('ein Stand in der Zukunft (z. B. Datenbank aus einer Sicherung) ist unbrauchbar', () => {
    expect(isCursorUsable(server, server)).toBe(true);
    expect(isCursorUsable(server + 15 * minute, server)).toBe(true);
    expect(isCursorUsable(server + 16 * minute, server)).toBe(false);
    expect(isCursorUsable(null, server)).toBe(false);
    expect(isCursorUsable(server + 1000 * minute, null)).toBe(true); // ohne Uhrzeit des Servers kein Vergleich möglich
  });
});

describe('ID-Liste fällig?', () => {
  const now = 100 * day;
  it(`nie geprüft, nach ${idCheckDays} Tagen oder Uhr verstellt: ja`, () => {
    expect(isIdCheckDue(null, now)).toBe(true);
    expect(isIdCheckDue(now - idCheckDays * day, now)).toBe(true);
    expect(isIdCheckDue(now + day, now)).toBe(true);
  });
  it('vor weniger als 30 Tagen: nein', () => {
    expect(isIdCheckDue(now - idCheckDays * day + 1, now)).toBe(false);
    expect(isIdCheckDue(now, now)).toBe(false);
  });
});

const byId = (activities: Activity[]) => new Map(activities.map((activity) => [activity.id, activity]));

describe('Zusammenführen', () => {
  const base = byId(['a', 'b', 'c'].map((id) => makeActivity({ id })));

  it('neue kommen dazu, geänderte ersetzen die alte Fassung, der alte Bestand bleibt unverändert', () => {
    const changed = makeActivity({ id: 'b', ageMin: 7 });
    const result = mergeChanges(base, [activityToRow(changed), activityToRow(makeActivity({ id: 'd' }))], prefix);
    expect([...result.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(result.get('b')?.ageMin).toBe(7);
    expect(base.get('b')?.ageMin).not.toBe(7);
  });

  it('eine geänderte, aber kaputte Zeile entfernt die Aktivität (keine veraltete Fassung behalten)', () => {
    const result = mergeChanges(base, [{ ...activityToRow(makeActivity({ id: 'b' })), age_min: 'zwei' }], prefix);
    expect([...result.keys()].sort()).toEqual(['a', 'c']);
  });

  it('eine nicht freigegebene Zeile (sollte der Server nie liefern) entfernt die Aktivität', () => {
    const result = mergeChanges(base, [activityToRow(makeActivity({ id: 'c', status: 'draft' }))], prefix);
    expect([...result.keys()].sort()).toEqual(['a', 'b']);
  });

  it('Zeilen ohne ID werden ignoriert', () => {
    expect(mergeChanges(base, [null, 'text', { foo: 1 }], prefix).size).toBe(3);
  });
});

describe('ID-Abgleich', () => {
  const current = byId(['a', 'b', 'c'].map((id) => makeActivity({ id })));

  it('Zurückgezogenes fliegt raus, Fehlendes wird gemeldet', () => {
    const { kept, missing, removed } = reconcileIds(current, ['a', 'c', 'd']);
    expect([...kept.keys()]).toEqual(['a', 'c']);
    expect(removed).toEqual(['b']);
    expect(missing).toEqual(['d']);
  });

  it('gleiche Listen ändern nichts', () => {
    const { kept, missing, removed } = reconcileIds(current, ['c', 'b', 'a']);
    expect(kept.size).toBe(3);
    expect(missing).toEqual([]);
    expect(removed).toEqual([]);
  });
});

it('sortById: feste Reihenfolge nach ID', () => {
  expect(sortById(['c', 'a', 'b'].map((id) => makeActivity({ id }))).map((activity) => activity.id)).toEqual(['a', 'b', 'c']);
});
