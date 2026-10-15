// Zwischenspeicher der Aktivitäten (M8, M8b): Format in Teilen, alter Eintrag v1, Prüfung beim Lesen, Zeitabstand.

import { makeActivity } from '../suggestions/testHelpers';
import {
  activitiesPerPart,
  defaultRefreshMinutes,
  getRefreshMinutes,
  legacyStorageVersion,
  parseLegacyActivities,
  parseStoredMeta,
  parseStoredParts,
  shouldRefresh,
  storageVersion,
  toStoredParts,
  type ActivitiesRecord,
} from './activitiesCache';
import { minUsableActivities } from './activityLibrary';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';

const valid = (count: number) => Array.from({ length: count }, (_, i) => makeActivity({ id: `a-${i}` }));
const legacy = (activities: unknown, extra: object = {}) => ({ version: legacyStorageVersion, fetchedAt: 1_000, activities, ...extra });
const record = (activities: ActivitiesRecord['activities'], extra: Partial<ActivitiesRecord> = {}): ActivitiesRecord => ({
  fetchedAt: 42,
  cursor: '2026-10-18T16:00:00.000000Z',
  idCheckedAt: 40,
  activities,
  ...extra,
});
// Speichern und wieder lesen, wie auf dem Gerät (über JSON).
function roundTrip(input: ActivitiesRecord, imagePrefix: string | null = prefix) {
  const { meta, parts } = JSON.parse(JSON.stringify(toStoredParts(input, 'g1')));
  const parsedMeta = parseStoredMeta(meta);
  return parsedMeta ? parseStoredParts(parsedMeta, parts, imagePrefix) : null;
}

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

describe('Format v2 in Teilen', () => {
  it(`höchstens ${activitiesPerPart} Aktivitäten pro Teil`, () => {
    expect(activitiesPerPart).toBe(200);
    const { meta, parts } = toStoredParts(record(valid(401)), 'g1');
    expect(parts.map((part) => part.activities.length)).toEqual([200, 200, 1]);
    expect(parts.map((part) => part.index)).toEqual([0, 1, 2]);
    expect(meta).toMatchObject({ version: storageVersion, generation: 'g1', parts: 3, count: 401 });
  });

  it('ein Teil mit 200 echten Aktivitäten bleibt weit unter 2 MB (Android-Grenze)', () => {
    const big = Array.from({ length: activitiesPerPart }, (_, i) =>
      makeActivity({ id: `a-${i}`, translations: { de: { title: 'T'.repeat(60), summary: 'S'.repeat(300), steps: Array(12).fill('x'.repeat(200)) }, en: { title: 'T'.repeat(60), summary: 'S'.repeat(300), steps: Array(12).fill('x'.repeat(200)) } } }),
    );
    const { parts } = toStoredParts(record(big), 'g1');
    expect(JSON.stringify(parts[0]).length).toBeLessThan(1_500_000);
  });

  it('hin und zurück ergibt dieselben Daten, mit Stand und Zeitpunkt des ID-Abgleichs', () => {
    const input = record(valid(450));
    expect(roundTrip(input)).toEqual(input);
  });

  it('ohne Stand und ohne ID-Abgleich (nach dem Umstieg)', () => {
    const input = record(valid(5), { cursor: null, idCheckedAt: null });
    expect(roundTrip(input)).toEqual(input);
  });

  it('ein unlesbarer Stand macht nur den Stand leer, die Aktivitäten bleiben', () => {
    const result = roundTrip(record(valid(5), { cursor: 'gestern' }));
    expect(result?.cursor).toBeNull();
    expect(result?.activities).toHaveLength(5);
  });

  it.each([
    ['nichts', null],
    ['Text', 'hallo'],
    ['Version 1', { ...toStoredParts(record(valid(5)), 'g').meta, version: 1 }],
    ['ohne Fassung', { ...toStoredParts(record(valid(5)), 'g').meta, generation: '' }],
    ['ohne Teile', { ...toStoredParts(record(valid(5)), 'g').meta, parts: 0 }],
    ['Zeitpunkt als Text', { ...toStoredParts(record(valid(5)), 'g').meta, fetchedAt: 'gestern' }],
  ])('Angaben unbrauchbar: %s', (_name, raw) => {
    expect(parseStoredMeta(raw)).toBeNull();
  });

  describe('ein fehlender oder kaputter Teil macht den ganzen Zwischenspeicher ungültig', () => {
    const { meta, parts } = JSON.parse(JSON.stringify(toStoredParts(record(valid(450)), 'g1')));
    const parsedMeta = parseStoredMeta(meta)!;

    it.each([
      ['ein Teil fehlt', [parts[0], parts[1]]],
      ['ein Teil ist null', [parts[0], null, parts[2]]],
      ['ein Teil von einer anderen Fassung', [parts[0], { ...parts[1], generation: 'g0' }, parts[2]]],
      ['Teile vertauscht', [parts[1], parts[0], parts[2]]],
      ['ein Teil ohne Liste', [parts[0], { ...parts[1], activities: 'x' }, parts[2]]],
      ['ein Teil mit weniger Einträgen', [parts[0], { ...parts[1], activities: parts[1].activities.slice(1) }, parts[2]]],
    ])('%s', (_name, rawParts) => {
      expect(parseStoredParts(parsedMeta, rawParts, prefix)).toBeNull();
    });

    it('alle Teile da: gültig', () => {
      expect(parseStoredParts(parsedMeta, parts, prefix)?.activities).toHaveLength(450);
    });
  });

  it('kaputte Einträge fliegen raus, der Rest bleibt', () => {
    const { meta, parts } = JSON.parse(JSON.stringify(toStoredParts(record(valid(4)), 'g1')));
    parts[0].activities.push({ id: 'kaputt' });
    const result = parseStoredParts(parseStoredMeta({ ...meta, count: 5 })!, parts, prefix);
    expect(result?.activities).toHaveLength(4);
  });

  it(`weniger als ${minUsableActivities} brauchbare Einträge: der Zwischenspeicher gilt als leer`, () => {
    expect(roundTrip(record(valid(minUsableActivities - 1)))).toBeNull();
    expect(roundTrip(record(valid(minUsableActivities)))).not.toBeNull();
  });

  it('nicht freigegebene Einträge (von Hand verändert) werden nicht benutzt', () => {
    const result = roundTrip(record([...valid(4), makeActivity({ id: 'entwurf', status: 'draft' })]));
    expect(result?.activities.map((activity) => activity.id)).toEqual(['a-0', 'a-1', 'a-2', 'a-3']);
  });

  it('ein Bild von einem fremden Server fällt weg, ein Bild von unserem Speicher bleibt; ohne Projekt kein Bild', () => {
    const own = `${prefix}wald.svg`;
    const input = record([...valid(3), makeActivity({ id: 'fremd', image: 'https://example.org/a.jpg' }), makeActivity({ id: 'eigen', image: own })]);
    const result = roundTrip(input)?.activities ?? [];
    expect(result.find((activity) => activity.id === 'fremd')?.image).toBeUndefined();
    expect(result.find((activity) => activity.id === 'eigen')?.image).toBe(own);
    expect(roundTrip(input, null)?.activities.find((activity) => activity.id === 'eigen')?.image).toBeUndefined();
  });
});

describe('alter Eintrag v1 (Umstieg von M8)', () => {
  it('wird gelesen, aber ohne Stand und ohne ID-Abgleich (der nächste Abruf lädt einmal alles)', () => {
    const activities = valid(5);
    expect(parseLegacyActivities(JSON.parse(JSON.stringify(legacy(activities))), prefix)).toEqual({
      fetchedAt: 1_000,
      cursor: null,
      idCheckedAt: null,
      activities,
    });
  });

  it.each([
    ['nichts', null],
    ['eine Liste', []],
    ['eine unbekannte Version', legacy(valid(5), { version: 3 })],
    ['ohne Zeitpunkt', { version: legacyStorageVersion, activities: valid(5) }],
    ['Zeitpunkt unendlich', legacy(valid(5), { fetchedAt: Infinity })],
    ['Aktivitäten keine Liste', legacy({ a: 1 })],
    ['zu wenige', legacy(valid(2))],
  ])('%s ergibt einen leeren Zwischenspeicher', (_name, raw) => {
    expect(parseLegacyActivities(raw, prefix)).toBeNull();
  });

  it('doppelte IDs werden nur einmal übernommen', () => {
    expect(parseLegacyActivities(legacy([...valid(4), makeActivity({ id: 'a-0' })]), prefix)?.activities).toHaveLength(4);
  });
});
