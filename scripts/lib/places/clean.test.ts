import { cleanText, cleanWebsite, normalizeName } from './clean.ts';
import { dedupePlaces, type DedupeItem } from './dedupe.ts';
import { monthsFromSeasonal, seasonOf } from './season.ts';

describe('cleanText', () => {
  it('Leerraum und Steuerzeichen', () => {
    expect(cleanText('  Stadt\tpark \n Greiz ', 80)).toBe('Stadt park Greiz');
    expect(cleanText('a\u0000b', 80)).toBe('a b');
    expect(cleanText('   ', 80)).toBeNull();
    expect(cleanText(undefined, 80)).toBeNull();
  });

  it('kürzt zu Langes an einer Wortgrenze', () => {
    const result = cleanText('Freizeit- und Erlebnisbad am Stadtrand von Beispielhausen', 30);
    expect(result).toBe('Freizeit- und Erlebnisbad am…');
    expect((result ?? '').length).toBeLessThanOrEqual(30);
  });
});

describe('cleanWebsite', () => {
  it.each([
    [{ website: 'https://www.museum.de' }, 'https://www.museum.de/'],
    [{ website: 'www.museum.de' }, 'https://www.museum.de/'],
    [{ 'contact:website': 'http://bad.de/x' }, 'http://bad.de/x'],
    [{ url: 'https://zoo.de;https://andere.de' }, 'https://zoo.de/'],
    [{ website: 'javascript:alert(1)' }, null],
    [{ website: 'mailto:info@bad.de' }, null],
    [{ website: 'https://localhost' }, null],
    [{ website: 'https://user:pass@bad.de' }, null],
    [{ website: 'kein link' }, null],
    [{}, null],
  ])('%o → %s', (tags, expected) => {
    expect(cleanWebsite(tags)).toBe(expected);
  });
});

describe('normalizeName', () => {
  it('Schreibweisen gelten als gleich', () => {
    expect(normalizeName('Stadt-Park')).toBe(normalizeName('Stadtpark'));
    expect(normalizeName('Bäderkomplex')).toBe('baderkomplex');
    expect(normalizeName('Straße')).toBe('strasse');
  });
});

describe('Saison', () => {
  it('seasonal-Merkmal', () => {
    expect(monthsFromSeasonal('summer')).toEqual([6, 7, 8]);
    expect(monthsFromSeasonal('spring;summer')).toEqual([3, 4, 5, 6, 7, 8]);
    expect(monthsFromSeasonal('yes')).toBeNull();
    expect(monthsFromSeasonal('spring;summer;autumn;winter')).toBeNull(); // ganzes Jahr
    expect(monthsFromSeasonal(undefined)).toBeNull();
  });

  it('Reihenfolge: Öffnungszeiten, dann seasonal, dann Standard der Unterart (nur draußen)', () => {
    expect(seasonOf({ subtype: 'outdoorPool', setting: 'outdoor', hoursMonths: [6, 7, 8], seasonal: 'spring' })).toEqual([6, 7, 8]);
    expect(seasonOf({ subtype: 'outdoorPool', setting: 'outdoor', hoursMonths: null, seasonal: 'summer' })).toEqual([6, 7, 8]);
    expect(seasonOf({ subtype: 'outdoorPool', setting: 'outdoor', hoursMonths: null, seasonal: undefined })).toEqual([5, 6, 7, 8, 9]);
    expect(seasonOf({ subtype: 'waterPark', setting: 'indoor', hoursMonths: null, seasonal: undefined })).toBeNull();
    expect(seasonOf({ subtype: 'playground', setting: 'outdoor', hoursMonths: null, seasonal: undefined })).toBeNull();
  });
});

describe('dedupePlaces', () => {
  const item = (id: string, name: string | null, lat: number, lon: number, extra: Partial<DedupeItem> = {}): DedupeItem => ({
    id,
    name,
    category: 'pool',
    subtype: 'outdoorPool',
    lat,
    lon,
    openingHours: null,
    website: null,
    street: null,
    isArea: false,
    ...extra,
  });

  it('gleicher Name, gleiche Kategorie, < 150 m: einer bleibt (die Fläche) und übernimmt fehlende Angaben', () => {
    const { kept, merged } = dedupePlaces([
      item('n5', 'Freibad Netzschkau', 50.6, 12.2, { website: 'https://bad.de/' }),
      item('w9', 'Freibad-Netzschkau', 50.6008, 12.2005, { isArea: true }),
    ]);
    expect(merged).toBe(1);
    expect(kept.map((k) => k.id)).toEqual(['w9']);
    expect(kept[0].website).toBe('https://bad.de/');
  });

  it('gleicher Name, aber weiter als 150 m oder andere Kategorie: beide bleiben', () => {
    expect(dedupePlaces([item('n1', 'Spielplatz', 50.6, 12.2), item('n2', 'Spielplatz', 50.6020, 12.2)]).kept).toHaveLength(2);
    expect(dedupePlaces([item('n1', 'Burg', 50.6, 12.2), item('n2', 'Burg', 50.6, 12.2, { category: 'museum' })]).kept).toHaveLength(2);
  });

  it('ohne Namen: gleiche Unterart näher als 40 m', () => {
    expect(dedupePlaces([item('n1', null, 50.6, 12.2), item('n2', null, 50.6002, 12.2)]).kept).toHaveLength(1); // 22 m
    expect(dedupePlaces([item('n1', null, 50.6, 12.2), item('n2', null, 50.6005, 12.2)]).kept).toHaveLength(2); // 56 m
    expect(dedupePlaces([item('n1', null, 50.6, 12.2), item('n2', 'Freibad', 50.6, 12.2)]).kept).toHaveLength(2);
  });

  it('über Zellgrenzen hinweg und unabhängig von der Reihenfolge', () => {
    const a = item('n1', 'Bad', 50.59999, 12.19999);
    const b = item('n2', 'Bad', 50.60001, 12.20001);
    expect(dedupePlaces([a, b]).kept.map((k) => k.id)).toEqual(['n1']);
    expect(dedupePlaces([{ ...b }, { ...a }]).kept.map((k) => k.id)).toEqual(['n1']);
  });

  it('Namen nur aus Zeichen ohne lateinische Entsprechung werden nicht alle gleich', () => {
    expect(dedupePlaces([item('n1', 'Парк', 50.6, 12.2), item('n2', 'Сад', 50.6, 12.2)]).kept).toHaveLength(2);
  });
});
