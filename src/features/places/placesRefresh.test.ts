// Orte (M10b): der Ablauf „Orte besorgen“ mit nachgestelltem Supabase und einem Speicher im Arbeitsspeicher.
// Standort, Kacheln, Zwischenspeicher (30/7/90 Tage), Fehler bleiben still, Speichern ist nur ein Bonus.

import type { FetchedTiles } from './fetchPlaces';
import { serializeTile, type TileIndex, type TileRecord } from './placesCache';
import { mergeTiles, neededTiles, resolvePlaces, type PlacesDeps } from './placesRefresh';
import { parseStoredTile } from './placesCache';
import { tileKeyOf } from './placeTiles';
import { fixtureBrokenRows, fixtureOrigin, fixturePlaces, fixtureRows, makePlace } from './testHelpers';

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_abc123' };
const day = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 14, 12).getTime();

// Ein Speicher im Arbeitsspeicher, der sich wie placesStorage.ts verhält (Kacheln als Text).
function memoryStore() {
  const tiles = new Map<string, string>();
  let index: TileIndex = {};
  const failWrites = { value: false };
  return {
    tiles,
    failWrites,
    get index() {
      return index;
    },
    store: {
      loadTile: async (key: string) => (tiles.has(key) ? parseStoredTile(JSON.parse(tiles.get(key)!), key) : null),
      saveTile: async (key: string, serialized: string) => {
        if (failWrites.value) throw new Error('Speicher voll');
        tiles.set(key, serialized);
      },
      removeTiles: async (keys: readonly string[]) => keys.forEach((key) => tiles.delete(key)),
      loadIndex: async () => index,
      saveIndex: async (next: TileIndex) => {
        if (failWrites.value) throw new Error('Speicher voll');
        index = next;
      },
    },
  };
}

function setup(options: { fetchTiles?: PlacesDeps['fetchTiles']; getPlace?: PlacesDeps['getPlace']; withConfig?: boolean } = {}) {
  const memory = memoryStore();
  const warnings: string[] = [];
  const requested: string[][] = [];
  const fetchTiles =
    options.fetchTiles ??
    (async (_config, tiles): Promise<FetchedTiles> => {
      requested.push([...tiles]);
      return { rows: fixtureRows, importIds: { TH: 't1', SN: 's1' } };
    });
  const deps: PlacesDeps = {
    getPlace: options.getPlace ?? (async () => fixtureOrigin),
    config: options.withConfig === false ? null : config,
    fetchTiles,
    store: memory.store,
    warn: (text) => warnings.push(text),
  };
  return { deps, memory, warnings, requested };
}

describe('Kacheln um den Standort', () => {
  it('die eigene Kachel zuerst, dann nach Entfernung', () => {
    const tiles = neededTiles(fixtureOrigin);
    expect(tiles[0]).toBe(tileKeyOf(fixtureOrigin.lat, fixtureOrigin.lon));
    expect(tiles.length).toBeGreaterThanOrEqual(9);
  });

  it('ein Ort am Rand zweier Bundesländer (gleiche ID) zählt nur einmal', () => {
    const rows = fixturePlaces();
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length - 1); // die Testdaten enthalten genau einen doppelten Ort
    const merged = mergeTiles([{ key: 'x', fetchedAt: now, importIds: {}, rows }]);
    expect(merged).toHaveLength(rows.length - 1);
  });
});

describe('resolvePlaces', () => {
  it('ohne Erlaubnis: keine Ortung, kein Abruf, nichts gespeichert', async () => {
    const { deps, requested, memory } = setup({ getPlace: async () => 'noPermission' });
    expect(await resolvePlaces(deps, now)).toEqual({ kind: 'unavailable', reason: 'noPermission' });
    expect(requested).toEqual([]);
    expect(memory.tiles.size).toBe(0);
  });

  it('Ortung aus: keine Orte', async () => {
    const { deps } = setup({ getPlace: async () => null });
    expect(await resolvePlaces(deps, now)).toEqual({ kind: 'unavailable', reason: 'noLocation' });
  });

  it('außerhalb Deutschlands (Urlaub in Österreich): kein Abruf', async () => {
    const { deps, requested } = setup({ getPlace: async () => ({ lat: 47.07, lon: 15.44 }) });
    expect(await resolvePlaces(deps, now)).toEqual({ kind: 'unavailable', reason: 'outside' });
    expect(requested).toEqual([]);
  });

  it('erster Abruf: alle Kacheln um den Standort, geprüft, gespeichert, nach ID zusammengefasst', async () => {
    const { deps, requested, memory, warnings } = setup();
    const result = await resolvePlaces(deps, now);
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(requested).toEqual([neededTiles(fixtureOrigin)]);
    expect(result.snapshot.origin).toEqual(fixtureOrigin);
    // 33 Zeilen, eine doppelt, alle in den angefragten Kacheln.
    expect(result.snapshot.rows).toHaveLength(32);
    expect(memory.tiles.size).toBe(neededTiles(fixtureOrigin).length);
    expect(Object.keys(memory.index).sort()).toEqual([...neededTiles(fixtureOrigin)].sort());
    expect(warnings).toEqual([]);
  });

  it('frische Kacheln: kein zweiter Abruf (nur ein Blick in den Speicher)', async () => {
    const { deps, requested } = setup();
    await resolvePlaces(deps, now);
    await resolvePlaces(deps, now + 6 * day); // auch die leeren Kacheln sind noch frisch
    expect(requested).toHaveLength(1);
  });

  it('leere Kacheln nach 7 Tagen, Kacheln mit Orten nach 30 Tagen neu holen', async () => {
    const { deps, requested } = setup();
    await resolvePlaces(deps, now);
    const withRows = new Set(fixturePlaces().map((row) => row.tile));
    await resolvePlaces(deps, now + 8 * day);
    expect(requested[1].every((key) => !withRows.has(key))).toBe(true);
    expect(requested[1].length).toBeGreaterThan(0);
    await resolvePlaces(deps, now + 31 * day);
    expect(requested[2].sort()).toEqual([...neededTiles(fixtureOrigin)].sort());
  });

  it('ohne Netz: gespeicherte Kacheln bis 90 Tage weiter nutzen (mit Alter für den Hinweis), danach keine Orte mehr', async () => {
    let online = true;
    const { deps, warnings, memory } = setup({
      fetchTiles: async () => {
        if (!online) throw new Error('Network request failed');
        return { rows: fixtureRows, importIds: {} };
      },
    });
    await resolvePlaces(deps, now);
    online = false;

    const later = await resolvePlaces(deps, now + 60 * day);
    expect(later.kind).toBe('ready');
    if (later.kind === 'ready') {
      expect(later.snapshot.rows).toHaveLength(32);
      expect(Object.values(later.snapshot.tileFetchedAt)).toContain(now);
    }
    expect(warnings.some((text) => text.includes('Abruf bei Supabase fehlgeschlagen (Network request failed)'))).toBe(true);

    expect(await resolvePlaces(deps, now + 91 * day)).toEqual({ kind: 'unavailable', reason: 'noData' });
    expect(memory.tiles.size).toBe(0); // abgelaufene Kacheln werden auch vom Gerät gelöscht
  });

  it('jeder Fehler beim Abruf bleibt still: ohne Gespeichertes einfach keine Orte', async () => {
    const { deps, warnings } = setup({
      fetchTiles: async () => {
        throw new Error('HTTP 401');
      },
    });
    expect(await resolvePlaces(deps, now)).toEqual({ kind: 'unavailable', reason: 'noData' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).not.toContain(config.anonKey);
    expect(warnings[0]).not.toContain(config.url);
  });

  it('Supabase nicht eingerichtet (oder geheimer Schlüssel abgelehnt): nur Gespeichertes, kein Abruf', async () => {
    const { deps, requested } = setup({ withConfig: false });
    expect(await resolvePlaces(deps, now)).toEqual({ kind: 'unavailable', reason: 'noData' });
    expect(requested).toEqual([]);
  });

  it('kaputte Zeilen werden verworfen und gezählt, die anderen bleiben', async () => {
    const { deps, warnings } = setup({
      fetchTiles: async () => ({ rows: [...fixtureRows, ...fixtureBrokenRows], importIds: {} }),
    });
    const result = await resolvePlaces(deps, now);
    expect(result.kind === 'ready' && result.snapshot.rows.length).toBe(32);
    expect(warnings).toEqual([`Orte: ${fixtureBrokenRows.length} ungültige Zeilen verworfen.`]);
  });

  it('Speichern scheitert (Speicher voll): Die Orte gelten trotzdem, nur mit Warnung', async () => {
    const { deps, memory, warnings } = setup();
    memory.failWrites.value = true;
    const result = await resolvePlaces(deps, now);
    expect(result.kind).toBe('ready');
    expect(warnings.some((text) => text.includes('Speichern auf dem Gerät fehlgeschlagen'))).toBe(true);
  });

  it('ein verlorenes Verzeichnis wird aus den gespeicherten Kacheln nachgetragen', async () => {
    const { deps, memory } = setup();
    const row = makePlace({}, 0.5);
    const tile: TileRecord = { key: row.tile, fetchedAt: now, importIds: {}, rows: [row] };
    memory.tiles.set(row.tile, serializeTile(tile));
    await resolvePlaces(deps, now);
    expect(memory.index[row.tile]).toBeDefined();
  });
});
