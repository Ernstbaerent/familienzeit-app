// Regeln für Ziele mit Eintritt (quality.ts), dazu das Prüfskript mit den echten Namen aus Halle (fixtures/halle-museen.csv).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { placeSubtypes, type PlaceSubtype } from '../../../src/features/places/placeKinds.ts';
import { checkCsv, parseCsv, renderCheck } from './checkNames.ts';
import { assessPlace, visitRequiredSubtypes, type QualityResult } from './quality.ts';

const assess = (subtype: PlaceSubtype, name: string | null, hasWebsite: boolean, hasOpeningHours: boolean) =>
  assessPlace({ subtype, name, hasWebsite, hasOpeningHours });

// Kurzform für die Erwartung: 'weg' oder das neue Gewicht.
const outcome = (result: QualityResult) => (result.keep ? result.kidWeight : 'weg');

describe('die Tabelle der Regeln (Museum, Startwert 2)', () => {
  it.each([
    // Name, Website, Öffnungszeiten, Ergebnis
    ['Heimatmuseum', true, false, 2], // kein Signal, Infos da
    ['Heimatmuseum', false, true, 2],
    ['Heimatmuseum', false, false, 1], // kein Signal, keine Infos: −1
    ['Kindermuseum', true, true, 3], // aufwertend, Infos da: +1
    ['Kindermuseum', false, false, 2], // aufwertend, keine Infos: schützt nur
    ['Universitätsmuseum', true, false, 1], // abwertend, Infos da: −1
    ['Universitätsmuseum', false, false, 'weg'], // abwertend, keine Infos: weggelassen
    ['Naturkundliche Sammlung', true, true, 2], // beides, Infos da: unverändert
    ['Naturkundliche Sammlung', false, false, 'weg'], // beides, keine Infos: weggelassen
  ] as const)('„%s“, Website %s, Zeiten %s → %s', (name, website, hours, expected) => {
    expect(outcome(assess('museum', name, website, hours))).toBe(expected);
  });

  it('Museum ohne Namen: ohne Infos weggelassen, mit Website unverändert', () => {
    expect(assess('museum', null, false, false)).toMatchObject({ keep: false, drop: 'namelessMuseumWithoutInfo' });
    expect(outcome(assess('museum', null, true, false))).toBe(2);
  });

  it('nicht besuchbar: immer weggelassen, auch mit Website, Zeiten und aufwertendem Namen', () => {
    expect(assess('museum', 'Kindermuseum (geplant)', true, true)).toMatchObject({ keep: false, drop: 'notVisitable' });
    expect(assess('indoorPool', 'Stadtbad (wegen Sanierung)', true, true)).toMatchObject({ keep: false, drop: 'notVisitable' });
  });

  it('nie über 3 und nie unter 0', () => {
    expect(outcome(assess('indoorPlayground', 'Kinderland', true, true))).toBe(3); // Startwert 3
    expect(outcome(assess('outdoorPool', 'Freibad Nord', false, false))).toBe(2);
  });

  it('Bericht-Felder: Startwert, Richtung und Gründe', () => {
    expect(assess('museum', 'Heimatmuseum', false, false)).toEqual({
      base: 2,
      keep: true,
      kidWeight: 1,
      change: 'down',
      reasons: ['keine Website und keine Öffnungszeiten'],
    });
  });
});

describe('welche Unterarten', () => {
  it('besuchspflichtig: Museum, Aquarium, Freizeitpark, Bäder, Hallen, Eisbahn; ohne Zoo und Badestelle', () => {
    expect([...visitRequiredSubtypes].sort()).toEqual(
      ['aquarium', 'climbingHall', 'iceRink', 'indoorPlayground', 'indoorPool', 'museum', 'outdoorPool', 'pool', 'themePark', 'trampolinePark', 'waterPark'].sort(),
    );
    expect(visitRequiredSubtypes).not.toContain('zoo');
    expect(visitRequiredSubtypes).not.toContain('bathingPlace');
  });

  it('alle anderen Unterarten bleiben unverändert, auch mit abwertendem oder „geplant“ im Namen', () => {
    const others = placeSubtypes.filter((s) => s !== 'zoo' && !(visitRequiredSubtypes as readonly string[]).includes(s));
    expect(others).toEqual(expect.arrayContaining(['playground', 'park', 'bathingPlace', 'natureReserve', 'viewpoint', 'picnicSite', 'castle', 'cinema', 'library']));
    for (const subtype of others) {
      for (const name of ['Spielplatz an der Universität', 'Kinder-Naturpark', 'Rastplatz (geplant)', null]) {
        const result = assess(subtype, name, false, false);
        expect(result).toMatchObject({ keep: true, change: null, reasons: [] });
        expect(outcome(result)).toBe(result.base);
      }
    }
  });

  it('Aquarium bleibt besuchspflichtig (Uni-Aquarium ohne Infos fällt weg)', () => {
    expect(outcome(assess('aquarium', 'Aquarium des Zoologischen Instituts', false, false))).toBe('weg');
    expect(outcome(assess('aquarium', 'Meeresaquarium', true, false))).toBe(3);
  });
});

describe('Zoos, Tierparks und Tiergehege', () => {
  it('Tiergehege Greiz (Öffnungszeiten, keine Website): unverändert', () => {
    expect(assess('zoo', 'Tiergehege Greiz', false, true)).toMatchObject({ keep: true, kidWeight: 3, change: null });
  });

  it('namenloses Gehege ohne jede Angabe: unverändert, nicht weggelassen', () => {
    expect(assess('zoo', null, false, false)).toMatchObject({ keep: true, kidWeight: 3, change: null, reasons: [] });
  });

  it('Tierpark mit abwertendem Wort im Namen (ohne Infos): unverändert, das Wort zählt nicht', () => {
    expect(assess('zoo', 'Tierpark der Universität', false, false)).toMatchObject({ keep: true, kidWeight: 3, change: null });
    expect(assess('zoo', 'Lehrgehege der Hochschule', false, false)).toMatchObject({ keep: true, kidWeight: 3, change: null, reasons: [] });
  });

  it('Zoo „in Planung“: weggelassen', () => {
    expect(assess('zoo', 'Zoo Musterstadt (in Planung)', true, true)).toMatchObject({ keep: false, drop: 'notVisitable' });
  });

  it('aufwertende Wörter dürfen wirken (höchstens 3)', () => {
    expect(assess('zoo', 'Kinder-Tierpark', false, false)).toMatchObject({ keep: true, kidWeight: 3, reasons: ['aufwertend: Kinder, Tier'] });
  });
});

describe('„Erlebnis“ und Wellness', () => {
  it('Erlebnisbad ohne Infos wird wie jedes Bad abgewertet (Erlebnis schützt nicht)', () => {
    expect(assess('outdoorPool', 'Erlebnisbad Waldhaus', false, false)).toMatchObject({ kidWeight: 2, change: 'down' });
  });

  it('Therme mit „Erlebnis“ ohne Infos: abgewertet', () => {
    expect(assess('indoorPool', 'Therme Erlebniswelt', false, false)).toMatchObject({ kidWeight: 2, change: 'down' });
  });

  it('Sauna-Erlebniswelt als Eisbahn mit Website: nicht aufgewertet; Kletter-Erlebnis schon', () => {
    expect(assess('iceRink', 'Eis- und Sauna-Erlebniswelt', true, false)).toMatchObject({ kidWeight: 2, change: null });
    expect(assess('climbingHall', 'Kletter-Erlebnis', true, false)).toMatchObject({ kidWeight: 3, change: 'up' });
  });
});

describe('Prüfskript mit den echten Namen aus Halle (Abfrage von Clemens)', () => {
  const csv = readFileSync(join(__dirname, 'fixtures', 'halle-museen.csv'), 'utf8');
  const { rows, problems } = checkCsv(csv);
  const byName = (name: string | null) => rows.find((row) => row.name === name);
  const result = (name: string) => {
    const r = byName(name)?.result;
    return r?.kind === 'kept' ? r.kidWeight : r?.kind;
  };

  it('liest alle 22 Zeilen', () => {
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(22);
  });

  it('weggelassen: Leopoldina-Kabinett, das geplante Naturkundemuseum der Universität, zwei Museen ohne Namen', () => {
    expect(rows.filter((r) => r.result.kind === 'dropped').map((r) => `${r.name ?? 'ohne Namen'} (${r.locality})`)).toEqual([
      'Ausstellungskabinett der Leopoldina (Halle (Saale))',
      'Naturkundliches Museum der Martin-Luther-Universität Halle-Wittenberg (geplant) (Halle (Saale))',
      'ohne Namen (Holleben)',
      'ohne Namen (Halle (Saale))',
    ]);
  });

  it('abgewertet: Friedemann-Bach-Haus (keine Website, keine Zeiten)', () => {
    expect(rows.filter((r) => r.result.kind === 'kept' && r.result.change === 'down').map((r) => r.name)).toEqual(['Friedemann-Bach-Haus']);
    expect(result('Friedemann-Bach-Haus')).toBe(1);
  });

  it('aufgewertet: Experimente-Werkstatt, Schokoladenmuseum, Naturalienkammer, Haustierkunde', () => {
    expect(rows.filter((r) => r.result.kind === 'kept' && r.result.change === 'up').map((r) => r.name)).toEqual([
      'Experimente-Werkstatt Mathematik',
      'Halloren Schokoladenmuseum',
      'Kunst- und Naturalienkammer',
      'Museum für Haustierkunde „Julius Kühn“',
    ]);
  });

  it('unverändert, weil Website oder Öffnungszeiten da sind: Robertinum, Händel-Haus, Roter Ochse …', () => {
    for (const name of ['Robertinum', 'Händel-Haus', 'Roter Ochse', 'Beatles Museum', 'Stadtmuseum Halle', 'Stadtmuseum Halle (Saale)']) {
      expect(result(name)).toBe(2);
    }
  });

  it('Zusammenfassung', () => {
    expect(renderCheck(rows)).toContain('22 Orte: 4 weggelassen, 1 abgewertet, 4 aufgewertet, 13 unverändert');
  });
});

describe('Prüfskript: Eingabe', () => {
  it('gibt die ID aus, wenn sie in der Datei steht (vorne, zum Kopieren)', () => {
    const { rows } = checkCsv('id,name,subtype,hat_website,hat_zeiten,kid_weight,locality\nw123,Münzkabinett,museum,false,false,2,Halle\n');
    expect(rows[0]).toMatchObject({ id: 'w123', result: { kind: 'dropped' } });
    expect(renderCheck(rows)).toContain('| w123 | Münzkabinett | Halle | museum | 2 | **weggelassen** |');
  });

  it('Anführungszeichen, Kommas im Namen, Semikolon als Trenner, Windows-Zeilenenden', () => {
    expect(parseCsv('a,b\r\n"Kunst, Natur","sagt ""hallo"""\r\n')).toEqual([
      ['a', 'b'],
      ['Kunst, Natur', 'sagt "hallo"'],
    ]);
    const { rows } = checkCsv('name;subtype;hat_website;hat_zeiten\nKindermuseum;museum;t;f\n');
    expect(rows[0]).toMatchObject({ before: 2, result: { kind: 'kept', kidWeight: 3, change: 'up' } });
  });

  it('Rohspalten website und opening_hours statt hat_website und hat_zeiten', () => {
    const { rows } = checkCsv('name,subtype,website,opening_hours\nHeimatmuseum,museum,,\nHeimatstube,museum,https://x.de,\n');
    expect(rows.map((r) => r.result)).toEqual([
      { kind: 'kept', kidWeight: 1, change: 'down' },
      { kind: 'kept', kidWeight: 2, change: null },
    ]);
  });

  it('fehlende Spalten und unbekannte Unterart werden gemeldet', () => {
    expect(checkCsv('name,subtype\nX,museum\n').problems[0]).toContain('hat_website');
    const { rows } = checkCsv('name,subtype,hat_website,hat_zeiten\nX,schwimmbad,true,true\n');
    expect(rows[0].result).toEqual({ kind: 'error', message: 'unbekannte Unterart „schwimmbad“' });
  });
});
