// Die Umwandlung mit den Testdaten aus fixtures/: sample.osm (von Hand geschrieben, keine echten OSM-Daten) und
// sample.geojsonseq (= Ausgabe von osmium für sample.osm, mit den Befehlen aus osmium.ts; Vergleich in prepare.test.ts).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parsePoly } from './geometry.ts';
import { createHoursNormalizer, weekStartOf } from './hours.ts';
import { renderPrepareReport } from './report.ts';
import { transformFeatures } from './transform.ts';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

async function run(lines: string[]) {
  return transformFeatures(lines, {
    region: 'TH',
    ownPoly: parsePoly(fixture('testland.poly')),
    excludePolys: [parsePoly(fixture('exklave.poly'))],
    normalizeHours: createHoursNormalizer({ start: weekStartOf(new Date(2026, 9, 14)), state: 'Thüringen', lat: 50.86, lon: 11.05 }),
  });
}

describe('transformFeatures mit den Testdaten', () => {
  let result: Awaited<ReturnType<typeof run>>;
  const byId = (id: string) => result.rows.find((row) => row.id === id);

  beforeAll(async () => {
    result = await run(fixture('sample.geojsonseq').split('\n'));
  });

  it('übernimmt genau die erwarteten Orte', () => {
    expect(result.rows.map((row) => row.id).sort()).toEqual(
      ['n10', 'n13', 'n14', 'n15', 'n17', 'n20', 'n22', 'n36', 'n37', 'n38', 'n5', 'n9', 'r200', 'w100', 'w101', 'w104'].sort(),
    );
  });

  it('lässt weg: privat, ohne Pflicht-Namen, außerhalb des Landes, in der Exklave, dauerhaft geschlossen, Doppelte, Unpassendes', () => {
    const ids = result.rows.map((row) => row.id);
    expect(ids).not.toContain('n11'); // access=private
    expect(ids).not.toContain('n12'); // Aussichtspunkt ohne Namen
    expect(ids).not.toContain('n18'); // außerhalb des Umrisses
    expect(ids).not.toContain('n19'); // im Umriss eines anderen Landes (wie Berlin in Brandenburg)
    expect(ids).not.toContain('n21'); // opening_hours=off
    expect(ids).not.toContain('n8'); // Doppelter Spielplatz (namenlos, 25 m)
    expect(ids).not.toContain('n39'); // „Stadt-Park“ = Fläche „Stadtpark“ (65 m)
    expect(ids).not.toContain('n35'); // Sporthalle ohne Schwimmen oder Klettern
    expect(result.stats).toMatchObject({
      skipped: { notPublic: 1, disused: 0, nameMissing: 1 },
      outsideRegion: 2,
      duplicatesMerged: 2,
      closedForGood: 1,
      invalidRows: 0,
      localities: 2,
      rows: 16,
    });
  });

  it('Spielplatz ohne Namen bekommt den Ortsteil (Pohlitz)', () => {
    expect(byId('n5')).toMatchObject({ name: null, subtype: 'playground', locality: 'Pohlitz', kid_weight: 3, tile: '253_40' });
  });

  it('Fläche: Schwerpunkt, Kachel, Ort in der Nähe (Stadt Greiz)', () => {
    expect(byId('w100')).toMatchObject({ name: 'Stadtpark', category: 'park', lat: 50.6565, lon: 12.197, locality: 'Greiz', kid_weight: 2 });
  });

  it('Park ohne Namen (Linie): Kindertauglichkeit 1, ohne Ort in der Nähe kein Ortsteil', () => {
    expect(byId('w104')).toMatchObject({ name: null, kid_weight: 1, locality: null });
  });

  it('Museum: Wochenplan mit Feiertags-Hinweis und Website mit https', () => {
    expect(byId('n9')).toMatchObject({
      hours_kind: 'plan',
      hours_plan: { ph: true, days: [[], [[600, 1020]], [[600, 1020]], [[600, 1020]], [[600, 1020]], [[600, 1020]], [[600, 1020]]] },
      website: 'https://www.sommerpalais-beispiel.de/',
    });
  });

  it('Bäder: Waldbad draußen mit Saison aus den Öffnungszeiten, Sportzentrum mit Schwimmen drinnen ohne Saison', () => {
    expect(byId('n13')).toMatchObject({ subtype: 'waterPark', setting: 'outdoor', months: [5, 6, 7, 8, 9], hours_kind: 'plan' });
    expect(byId('n14')).toMatchObject({ subtype: 'indoorPool', setting: 'indoor', months: null });
    expect(byId('r200')).toMatchObject({ subtype: 'outdoorPool', months: [6, 7, 8] });
    expect(result.stats.bathSettingGuessed).toBe(1); // n14: nur aus der Art (Sportzentrum) geschlossen
  });

  it('unlesbare Öffnungszeiten bleiben als Rohtext mit hours_kind invalid', () => {
    expect(byId('n17')).toMatchObject({ opening_hours: 'kaputt xx', hours_kind: 'invalid', hours_plan: null });
  });

  it('Kino neutral, Rastplatz und allgemeine Sehenswürdigkeit niedrig, Talsperre als See', () => {
    expect(byId('n15')).toMatchObject({ subtype: 'cinema', kid_weight: 1 });
    expect(byId('n22')).toMatchObject({ subtype: 'picnicSite', kid_weight: 0 });
    expect(byId('n20')).toMatchObject({ subtype: 'attraction', kid_weight: 0 });
    expect(byId('w101')).toMatchObject({ subtype: 'lake', name: 'Talsperre Beispiel', tile: '253_41' });
  });

  it('Zählung für den Bericht', () => {
    expect(result.stats.hours).toEqual({ plan: 4, complex: 0, invalid: 1, none: 11 });
    expect(result.stats.withName).toBe(14);
    expect(result.stats.withSeason).toBe(2);
  });

  it('das Ergebnis hängt nicht von der Reihenfolge der Zeilen ab', async () => {
    const reversed = await run(fixture('sample.geojsonseq').split('\n').reverse());
    const sort = (rows: typeof result.rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
    expect(sort(reversed.rows)).toEqual(sort(result.rows));
  });
});

describe('transformFeatures: kaputte Zeilen', () => {
  it('zählt unlesbare Zeilen und macht weiter', async () => {
    const good = fixture('sample.geojsonseq').split('\n')[0];
    const { rows, stats } = await run(['{kaputt', '{"properties":{"@type":"node","@id":-1}}', '{"type":"Feature"}', '', good]);
    expect(stats.unreadable).toBe(3);
    expect(rows).toHaveLength(1);
  });

  it('Objekt ohne Lage wird gezählt, nicht übernommen', async () => {
    const line = JSON.stringify({ type: 'Feature', geometry: null, properties: { '@type': 'node', '@id': 7, leisure: 'playground' } });
    const { rows, stats } = await run([line]);
    expect(rows).toHaveLength(0);
    expect(stats.noGeometry).toBe(1);
  });
});

describe('transformFeatures: Regeln für Ziele mit Eintritt (quality.ts)', () => {
  let n = 0;
  const point = (tags: Record<string, string>) => {
    n += 1;
    return JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [12.15 + n * 0.005, 50.64] },
      properties: { '@type': 'node', '@id': 900 + n, ...tags },
    });
  };

  it('weggelassene Orte landen in held, die Zählung geht in den Bericht', async () => {
    n = 0;
    const lines = [
      point({ tourism: 'museum', name: 'Zoologische Sammlung der Universität' }), // n901: abwertend, keine Infos → weg
      point({ tourism: 'museum' }), // n902: ohne Namen, keine Infos → weg
      point({ tourism: 'museum', name: 'Heimatstube' }), // n903: keine Infos → 1
      point({ tourism: 'museum', name: 'Kindermuseum', website: 'https://kindermuseum.example.org' }), // n904: → 3
      point({ tourism: 'zoo' }), // n905: Gehege ohne Namen und Infos → bleibt 3
      point({ leisure: 'playground', name: 'Spielplatz an der Universität' }), // n906: Spielplatz → bleibt 3
      point({ tourism: 'museum', name: 'Bergbaumuseum (geplant)', opening_hours: 'Sa 10:00-16:00' }), // n907: nicht besuchbar → weg
    ];
    const { rows, held, stats } = await run(lines);
    const weight = (id: string) => rows.find((row) => row.id === id)?.kid_weight;
    expect(rows.map((row) => row.id).sort()).toEqual(['n903', 'n904', 'n905', 'n906']);
    expect(weight('n903')).toBe(1);
    expect(weight('n904')).toBe(3);
    expect(weight('n905')).toBe(3);
    expect(weight('n906')).toBe(3);
    // held: vollständige, gültige Zeilen mit dem Startwert (ein boost setzt beim Hochladen 3)
    expect(held.map((row) => [row.id, row.kid_weight])).toEqual([
      ['n901', 2],
      ['n902', 2],
      ['n907', 2],
    ]);
    expect(stats.quality).toEqual({
      down: 1,
      up: 1,
      dropped: 3,
      examples: [
        'Zoologische Sammlung der Universität (n901): abwertend: Universität, Sammlung; keine Website und keine Öffnungszeiten',
        'ohne Namen (n902): keine Website und keine Öffnungszeiten; Museum ohne Namen',
        'Bergbaumuseum (geplant) (n907): nicht besuchbar: geplant',
      ],
    });
    expect(stats.rows).toBe(4);

    const report = renderPrepareReport({
      version: 1,
      importId: 'orte-2026-10-15-ab',
      startedAt: '2026-10-15T00:00:00Z',
      regions: [{ region: 'TH', ok: true, rows: 4, seconds: 3, downloadBytes: 0, sourceTimestamp: null, stats }],
    });
    expect(report).toContain('Regeln: abgewertet / aufgewertet / weggelassen');
    expect(report).toMatch(/\| 1 \/ 1 \/ 3 \|/);
    expect(report).toContain('**TH:**');
    expect(report).toContain('- Bergbaumuseum (geplant) (n907): nicht besuchbar: geplant');
  });
});
