// Orte (M10b): Zwischenspeicher der Kacheln. Kompakte Form, Prüfung, Alter, Herauswerfen und Größe.

import {
  fromCompactRow,
  getTileState,
  parseStoredTile,
  parseTileIndex,
  placesCacheRules,
  placesStorageVersion,
  planTileStorage,
  serializeTile,
  serializeTileIndex,
  splitIntoTiles,
  tileAgeDays,
  toCompactRow,
  utf8Bytes,
  type TileIndex,
} from './placesCache';
import { fixtureBrokenRows, fixturePlaces, fixtureRows, makePlace } from './testHelpers';

const day = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 14, 12).getTime();

describe('kompakte Form', () => {
  it('jede Zeile der Testdaten kommt unverändert zurück', () => {
    for (const row of fixturePlaces()) expect(fromCompactRow(JSON.parse(JSON.stringify(toCompactRow(row))))).toEqual(row);
  });

  it('leere Felder, `category` und `tile` werden nicht gespeichert', () => {
    const compact = toCompactRow(makePlace({ name: null, locality: null }));
    expect(Object.keys(compact).sort()).toEqual(['a', 'e', 'g', 'i', 'o', 'r', 's']);
  });

  it('ist deutlich kleiner als die Zeile von Supabase (weniger als die Hälfte)', () => {
    const full = JSON.stringify(fixtureRows);
    const compact = JSON.stringify(fixturePlaces().map(toCompactRow));
    expect(compact.length).toBeLessThan(full.length / 2);
  });

  it('kaputte gespeicherte Zeilen werden verworfen', () => {
    const good = toCompactRow(makePlace());
    expect(fromCompactRow({ ...good, s: 'escapeGame' })).toBeNull();
    expect(fromCompactRow({ ...good, g: 9 })).toBeNull();
    expect(fromCompactRow({ ...good, a: 'x' })).toBeNull();
    expect(fromCompactRow(null)).toBeNull();
  });
});

describe('gespeicherte Kachel lesen', () => {
  const rows = fixturePlaces().filter((row) => row.tile === '253_40');
  const stored = JSON.parse(serializeTile({ key: '253_40', fetchedAt: now, importIds: { TH: 'x' }, rows }));

  it('liest, was sie geschrieben hat', () => {
    expect(parseStoredTile(stored, '253_40')).toEqual({ key: '253_40', fetchedAt: now, importIds: { TH: 'x' }, rows });
    expect(stored.version).toBe(placesStorageVersion);
  });

  it('andere Version, kaputte Form → nichts', () => {
    expect(parseStoredTile({ ...stored, version: 2 }, '253_40')).toBeNull();
    expect(parseStoredTile({ ...stored, fetchedAt: 'gestern' }, '253_40')).toBeNull();
    expect(parseStoredTile({ ...stored, rows: {} }, '253_40')).toBeNull();
    expect(parseStoredTile('kaputt', '253_40')).toBeNull();
  });

  it('Zeilen, die nicht zur Kachel gehören, fallen weg', () => {
    expect(parseStoredTile(stored, '253_41')?.rows).toEqual([]);
  });
});

describe('Antwort von Supabase in Kacheln aufteilen', () => {
  it('jede angefragte Kachel bekommt einen Eintrag, auch leere; kaputte Zeilen werden gezählt und verworfen', () => {
    const requested = ['253_40', '253_41', '300_50'];
    const { tiles, rejected } = splitIntoTiles([...fixtureRows, ...fixtureBrokenRows], requested, { TH: 't', SN: 's', BY: 'b' }, now);
    expect(tiles.map((tile) => tile.key)).toEqual(requested);
    expect(tiles[2].rows).toEqual([]);
    expect(tiles[2].importIds).toEqual({});
    const fromRequested = fixtureRows.filter((row) => requested.includes((row as { tile: string }).tile)).length;
    expect(tiles.reduce((sum, tile) => sum + tile.rows.length, 0)).toBe(fromRequested);
    expect(rejected).toBe(fixtureRows.length - fromRequested + fixtureBrokenRows.length);
  });

  it('die Import-Kennung je Kachel nur für ihre Bundesländer', () => {
    const { tiles } = splitIntoTiles(fixtureRows, ['253_40'], { TH: 't', SN: 's', BY: 'b' }, now);
    expect(Object.keys(tiles[0].importIds).sort()).toEqual([...new Set(tiles[0].rows.map((row) => row.region))].sort());
  });
});

describe('Alter einer Kachel', () => {
  const withRows = (age: number) => ({ fetchedAt: now - age * day, rows: [makePlace()] });
  const empty = (age: number) => ({ fetchedAt: now - age * day, rows: [] });

  it('mit Orten: bis 30 Tage frisch, bis 90 Tage nutzbar, danach weg', () => {
    expect(getTileState(withRows(29.9), now)).toBe('fresh');
    expect(getTileState(withRows(30), now)).toBe('usable');
    expect(getTileState(withRows(89.9), now)).toBe('usable');
    expect(getTileState(withRows(90), now)).toBe('expired');
  });

  it('leere Kacheln: schon nach 7 Tagen neu holen', () => {
    expect(getTileState(empty(6.9), now)).toBe('fresh');
    expect(getTileState(empty(7), now)).toBe('usable');
  });

  it('Uhr zurückgestellt (Abruf in der Zukunft): neu holen, bis dahin nutzen', () => {
    expect(getTileState(withRows(-1), now)).toBe('usable');
  });

  it('Tage für den Hinweis „Stand: vor n Tagen“', () => {
    expect(tileAgeDays(now - 42.5 * day, now)).toBe(42);
    expect(tileAgeDays(now + day, now)).toBe(0);
  });
});

describe('Herauswerfen (höchstens 25 Kacheln und 2 MB)', () => {
  const entries = (count: number, bytes: number): TileIndex =>
    Object.fromEntries(Array.from({ length: count }, (_, i) => [`old_${i}`, { bytes, lastUsedAt: now - (count - i) * day }]));

  it('Grenzen wie entschieden', () => {
    expect(placesCacheRules.maxTiles).toBe(25);
    expect(placesCacheRules.maxBytes).toBe(2 * 1024 * 1024);
  });

  it('nichts zu tun, wenn alles passt', () => {
    const plan = planTileStorage(entries(3, 1000), ['a'], [{ key: 'a', bytes: 1000 }], now);
    expect(plan.write).toEqual(['a']);
    expect(plan.remove).toEqual([]);
    expect(Object.keys(plan.index)).toHaveLength(4);
  });

  it('zu viele Kacheln: die am längsten ungenutzten fliegen zuerst', () => {
    const plan = planTileStorage(entries(25, 1000), ['a', 'b'], [{ key: 'a', bytes: 1000 }, { key: 'b', bytes: 1000 }], now);
    expect(plan.remove).toEqual(['old_0', 'old_1']);
    expect(plan.write).toEqual(['a', 'b']);
    expect(Object.keys(plan.index)).toHaveLength(25);
  });

  it('zu groß: alte zuerst, dann die gebrauchten von der entferntesten an (die gelten trotzdem bis zum Schließen der App)', () => {
    const mb = 1024 * 1024;
    const plan = planTileStorage(
      entries(2, 0.4 * mb),
      ['near', 'mid', 'far'],
      [
        { key: 'near', bytes: 0.9 * mb },
        { key: 'mid', bytes: 0.6 * mb },
        { key: 'far', bytes: 0.6 * mb },
      ],
      now,
    );
    expect(plan.remove.sort()).toEqual(['old_0', 'old_1']);
    expect(plan.write).toEqual(['near', 'mid']);
    const total = Object.values(plan.index).reduce((sum, entry) => sum + entry.bytes, 0);
    expect(total).toBeLessThanOrEqual(placesCacheRules.maxBytes);
  });

  it('eine einzelne Kachel über 2 MB wird nie gespeichert', () => {
    const plan = planTileStorage({}, ['huge'], [{ key: 'huge', bytes: 2.1 * 1024 * 1024 }], now);
    expect(plan.write).toEqual([]);
    expect(plan.index).toEqual({});
  });

  it('gebrauchte Kacheln gelten als gerade benutzt', () => {
    const plan = planTileStorage({ a: { bytes: 10, lastUsedAt: 1 } }, ['a'], [], now);
    expect(plan.index.a.lastUsedAt).toBe(now);
  });

  it('Verzeichnis: liest, was es schreibt, und verwirft Kaputtes', () => {
    const index = { a: { bytes: 10, lastUsedAt: 5 } };
    expect(parseTileIndex(JSON.parse(JSON.stringify(serializeTileIndex(index))))).toEqual(index);
    expect(parseTileIndex({ version: 1, tiles: { a: { bytes: 'x', lastUsedAt: 5 }, b: null } })).toEqual({});
    expect(parseTileIndex({ version: 9, tiles: index })).toEqual({});
    expect(parseTileIndex(null)).toEqual({});
  });
});

describe('Größe in Byte (UTF-8)', () => {
  it('Umlaute zählen doppelt, Emoji vierfach', () => {
    expect(utf8Bytes('abc')).toBe(3);
    expect(utf8Bytes('ä')).toBe(2);
    expect(utf8Bytes('€')).toBe(3);
    expect(utf8Bytes('🙂')).toBe(4);
  });

  it('Schätzung der dichtesten Kachel (5 149 Orte, Berlin-Mitte): unter 1 MB gespeichert', () => {
    const rows = fixturePlaces();
    const perRow = utf8Bytes(JSON.stringify(rows.map(toCompactRow))) / rows.length;
    expect(perRow * 5149).toBeLessThan(1024 * 1024);
  });
});
