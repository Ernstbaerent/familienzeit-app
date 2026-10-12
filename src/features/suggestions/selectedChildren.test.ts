import {
  parseStoredSelectedChildren,
  resolveSelectedChildren,
  restoreSelectedChildren,
  sameIds,
  toStoredSelectedChildren,
  toggleSelectedChild,
} from './selectedChildren';

const profiles = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('Gemerkte Kinder lesen', () => {
  it('liest, was gespeichert wurde', () => {
    expect(parseStoredSelectedChildren(toStoredSelectedChildren(['a', 'c']))).toEqual(['a', 'c']);
  });

  it('nichts Brauchbares ergibt null: fehlt, kaputt, falsche Version, falsche Form', () => {
    expect(parseStoredSelectedChildren(null)).toBeNull();
    expect(parseStoredSelectedChildren(undefined)).toBeNull();
    expect(parseStoredSelectedChildren('a,b')).toBeNull();
    expect(parseStoredSelectedChildren(['a'])).toBeNull();
    expect(parseStoredSelectedChildren({ version: 1 })).toBeNull();
    expect(parseStoredSelectedChildren({ version: 2, childIds: ['a'] })).toBeNull();
    expect(parseStoredSelectedChildren({ version: 1, childIds: 'a' })).toBeNull();
  });

  it('einzelne kaputte Einträge fallen weg, die brauchbaren bleiben', () => {
    expect(parseStoredSelectedChildren({ version: 1, childIds: ['a', 7, null, '', 'b', {}] })).toEqual([
      'a',
      'b',
    ]);
  });

  it('speichert nur die IDs und eine Version, sonst nichts', () => {
    expect(toStoredSelectedChildren(['a'])).toEqual({ version: 1, childIds: ['a'] });
  });
});

describe('Beim Öffnen wiederherstellen', () => {
  it('nichts gespeichert oder leer: alle Kinder (null)', () => {
    expect(restoreSelectedChildren(null)).toBeNull();
    expect(restoreSelectedChildren([])).toBeNull();
  });

  it('sonst die gemerkten Kinder', () => {
    expect(restoreSelectedChildren(['b'])).toEqual(['b']);
  });
});

describe('Die Kinder bereinigen, die wirklich gewählt sind', () => {
  it('„alle“ (null): alle Kinder, auch später angelegte', () => {
    expect(resolveSelectedChildren(null, profiles)).toEqual(['a', 'b', 'c']);
    expect(resolveSelectedChildren(null, [...profiles, { id: 'd' }])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('gelöschte Kinder fliegen raus', () => {
    expect(resolveSelectedChildren(['a', 'gone', 'c'], profiles)).toEqual(['a', 'c']);
  });

  it('doppelte fallen weg, die Reihenfolge ist die der Profile', () => {
    expect(resolveSelectedChildren(['c', 'a', 'c'], profiles)).toEqual(['a', 'c']);
  });

  it('waren alle gemerkten Kinder gelöscht, gelten wieder alle (der Start steht nie mit niemandem da)', () => {
    expect(resolveSelectedChildren(['gone', 'also-gone'], profiles)).toEqual(['a', 'b', 'c']);
  });

  it('eine leere Wahl bleibt leer: Wer alle abwählt, sieht sie nicht sofort wieder gewählt', () => {
    expect(resolveSelectedChildren([], profiles)).toEqual([]);
  });

  it('ohne Profile bleibt nichts übrig', () => {
    expect(resolveSelectedChildren(['a'], [])).toEqual([]);
    expect(resolveSelectedChildren(null, [])).toEqual([]);
  });
});

describe('Kind aus- oder abwählen', () => {
  it('wählt ab und wieder an, in der Reihenfolge der Profile', () => {
    const off = toggleSelectedChild(['a', 'b', 'c'], 'b', profiles);
    expect(off).toEqual(['a', 'c']);
    expect(toggleSelectedChild(off, 'b', profiles)).toEqual(['a', 'b', 'c']);
  });

  it('das letzte Kind darf abgewählt werden (dann ist der Hauptknopf gesperrt)', () => {
    expect(toggleSelectedChild(['a'], 'a', profiles)).toEqual([]);
  });

  it('eine unbekannte ID wird nicht gewählt', () => {
    expect(toggleSelectedChild(['a'], 'gone', profiles)).toEqual(['a']);
  });
});

describe('sameIds', () => {
  it('vergleicht Inhalt und Reihenfolge', () => {
    expect(sameIds(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameIds(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameIds(['a'], ['a', 'b'])).toBe(false);
  });
});
