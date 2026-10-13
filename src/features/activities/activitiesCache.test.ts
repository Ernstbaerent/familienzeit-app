// Zwischenspeicher der Aktivitäten (M8): Format, Prüfung beim Lesen, Zeitabstand.

import { makeActivity } from '../suggestions/testHelpers';
import {
  defaultRefreshMinutes,
  getRefreshMinutes,
  parseStoredActivities,
  shouldRefresh,
  storageVersion,
  toStoredActivities,
} from './activitiesCache';
import { minUsableActivities } from './activityLibrary';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';

const valid = (count: number) => Array.from({ length: count }, (_, i) => makeActivity({ id: `a-${i}` }));
const stored = (activities: unknown, extra: object = {}) => ({ version: storageVersion, fetchedAt: 1_000, activities, ...extra });

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('Zeitabstand', () => {
  const minute = 60_000;

  it('der Standard ist 24 Stunden', () => {
    expect(defaultRefreshMinutes).toBe(24 * 60);
    expect(getRefreshMinutes(undefined)).toBe(1440);
  });

  it('noch nie geholt: sofort fragen', () => {
    expect(shouldRefresh(null, 5 * minute)).toBe(true);
  });

  it('kürzer als 24 Stunden her: nicht fragen, ab 24 Stunden: fragen', () => {
    const fetchedAt = 10 * minute;
    expect(shouldRefresh(fetchedAt, fetchedAt)).toBe(false);
    expect(shouldRefresh(fetchedAt, fetchedAt + 23 * 60 * minute + 59 * minute)).toBe(false);
    expect(shouldRefresh(fetchedAt, fetchedAt + 24 * 60 * minute - 1)).toBe(false);
    expect(shouldRefresh(fetchedAt, fetchedAt + 24 * 60 * minute)).toBe(true);
    expect(shouldRefresh(fetchedAt, fetchedAt + 5 * 24 * 60 * minute)).toBe(true);
  });

  it('Uhr zurückgestellt (gespeicherter Zeitpunkt in der Zukunft): lieber neu fragen', () => {
    expect(shouldRefresh(10 * minute, 5 * minute)).toBe(true);
  });

  it('der Abstand lässt sich einstellen (zum Testen)', () => {
    expect(shouldRefresh(0, 30 * minute, 60)).toBe(false);
    expect(shouldRefresh(0, 60 * minute, 60)).toBe(true);
    expect(shouldRefresh(0, minute, 1)).toBe(true);
  });

  it.each([
    ['5', 5],
    [' 1 ', 1],
    ['0.5', 0.5],
    ['1440', 1440],
    ['0', 1440],
    ['-3', 1440],
    ['', 1440],
    ['   ', 1440],
    ['bald', 1440],
    ['NaN', 1440],
    ['Infinity', 1440],
  ])('Wert aus der .env %p → %p Minuten', (value, expected) => {
    expect(getRefreshMinutes(value)).toBe(expected);
  });
});

describe('Speichern und Lesen', () => {
  it('hin und zurück ergibt dieselben Daten', () => {
    const activities = valid(5);
    const json = JSON.parse(JSON.stringify(toStoredActivities({ fetchedAt: 42, activities })));
    expect(json.version).toBe(storageVersion);
    expect(parseStoredActivities(json, prefix)).toEqual({ fetchedAt: 42, activities });
  });

  it.each([
    ['nichts', null],
    ['Text', 'hallo'],
    ['eine Liste', []],
    ['eine unbekannte Version', stored(valid(5), { version: 2 })],
    ['ohne Version', { fetchedAt: 1, activities: valid(5) }],
    ['ohne Zeitpunkt', { version: storageVersion, activities: valid(5) }],
    ['Zeitpunkt als Text', stored(valid(5), { fetchedAt: 'gestern' })],
    ['Zeitpunkt unendlich', stored(valid(5), { fetchedAt: Infinity })],
    ['Aktivitäten keine Liste', stored({ a: 1 })],
    ['Aktivitäten fehlen', { version: storageVersion, fetchedAt: 1 }],
  ])('%s ergibt einen leeren Zwischenspeicher', (_name, raw) => {
    expect(parseStoredActivities(raw, prefix)).toBeNull();
  });

  it('kaputte Einträge fliegen raus, der Rest bleibt', () => {
    const raw = stored([...valid(4), { id: 'kaputt' }, null, 'text']);
    expect(parseStoredActivities(raw, prefix)?.activities).toHaveLength(4);
  });

  it(`weniger als ${minUsableActivities} brauchbare Einträge: der Zwischenspeicher gilt als leer`, () => {
    expect(parseStoredActivities(stored(valid(minUsableActivities - 1)), prefix)).toBeNull();
    expect(parseStoredActivities(stored([...valid(2), { id: 'kaputt' }]), prefix)).toBeNull();
    expect(parseStoredActivities(stored(valid(minUsableActivities)), prefix)).not.toBeNull();
  });

  it('nicht freigegebene Einträge im Zwischenspeicher (von Hand verändert) werden nicht benutzt', () => {
    const raw = stored([...valid(4), makeActivity({ id: 'entwurf', status: 'draft' }), makeActivity({ id: 'abgelehnt', status: 'rejected' })]);
    const ids = parseStoredActivities(raw, prefix)?.activities.map((activity) => activity.id);
    expect(ids).toEqual(['a-0', 'a-1', 'a-2', 'a-3']);
  });

  it('doppelte IDs werden nur einmal übernommen', () => {
    const raw = stored([...valid(4), makeActivity({ id: 'a-0' })]);
    expect(parseStoredActivities(raw, prefix)?.activities).toHaveLength(4);
  });

  it('ein Bild von einem fremden Server fällt weg, die Aktivität bleibt; ein Bild von unserem Speicher bleibt', () => {
    const own = `${prefix}wald.svg`;
    const raw = stored([
      ...valid(3),
      makeActivity({ id: 'fremd', image: 'https://example.org/a.jpg' }),
      makeActivity({ id: 'eigen', image: own }),
    ]);
    const result = parseStoredActivities(raw, prefix)?.activities ?? [];
    expect(result.find((activity) => activity.id === 'fremd')?.image).toBeUndefined();
    expect(result.find((activity) => activity.id === 'eigen')?.image).toBe(own);
    expect(result).toHaveLength(5);
  });

  it('ohne festgelegten Speicher (kein Projekt eingerichtet) wird kein Bild übernommen', () => {
    const raw = stored([...valid(3), makeActivity({ id: 'eigen', image: `${prefix}wald.svg` })]);
    expect(parseStoredActivities(raw, null)?.activities.find((activity) => activity.id === 'eigen')?.image).toBeUndefined();
  });
});
