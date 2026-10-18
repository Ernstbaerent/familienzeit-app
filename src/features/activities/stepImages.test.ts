// Schrittbilder (M9b, Spalte step_images, Migration 0006): Prüfung (activities.ts), Bereinigung beim Laden (activityLibrary.ts),
// Zeile ↔ Aktivität (activityRow.ts) und was die Detailansicht zeigt (stepImages.ts).

import { makeActivity } from '../suggestions/testHelpers';
import { minStepCount, parseActivity } from './activities';
import { prepareActivities } from './activityLibrary';
import { activityToRow, rowToActivityInput } from './activityRow';
import { getStepImageUris } from './stepImages';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
const uri = (n: number) => `${prefix}activity-images/activities/a/step-${n}-000000000000000${n}.svg`;
const threeSteps = {
  de: { title: 'Titel', summary: 'Kurz', steps: ['Eins', 'Zwei', 'Drei'] },
  en: { title: 'Title', summary: 'Short', steps: ['One', 'Two', 'Three'] },
};
const activity = (stepImages?: Record<string, string>) =>
  makeActivity({ id: 'a', translations: threeSteps, ...(stepImages !== undefined && { stepImages }) });

let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('Prüfung (parseActivity)', () => {
  it('Schrittbilder sind freiwillig', () => {
    expect(parseActivity(activity(), { imagePrefix: prefix }).ok).toBe(true);
  });

  it('erlaubt Schrittnummern, die es in jeder Sprache gibt, mit Adressen von unserem Speicher', () => {
    expect(parseActivity(activity({ 1: uri(1), 3: uri(3) }), { imagePrefix: prefix }).ok).toBe(true);
  });

  it.each([
    ['Schritt 0', { 0: uri(1) }, 'Schritt „0“'],
    ['Schritt 4 bei drei Schritten', { 4: uri(1) }, 'Schritt „4“'],
    ['führende Null', { '01': uri(1) }, 'Schritt „01“'],
    ['fremder Server', { 1: 'https://example.org/a.svg' }, 'eigenen Speicher'],
    ['kein Text', { 1: 5 as unknown as string }, 'eigenen Speicher'],
  ])('%s ist ein Fehler', (_name, stepImages, problem) => {
    const result = parseActivity(activity(stepImages as Record<string, string>), { imagePrefix: prefix });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problems.join(' ')).toContain(problem);
  });

  it('eine Liste statt eines Objekts ist ein Fehler', () => {
    const result = parseActivity({ ...activity(), stepImages: [uri(1)] }, { imagePrefix: prefix });
    expect(!result.ok && result.problems.join(' ')).toContain('Objekt Schrittnummer');
  });

  it('ohne Projekt-Adresse ist kein Schrittbild erlaubt', () => {
    expect(parseActivity(activity({ 1: uri(1) }), { imagePrefix: null }).ok).toBe(false);
  });

  it('die kleinste Zahl an Schritten über alle Sprachen zählt', () => {
    expect(minStepCount({ de: { steps: ['a', 'b', 'c'] }, en: { steps: ['a', 'b'] } })).toBe(2);
    expect(minStepCount(undefined)).toBeNull();
  });
});

describe('Bereinigung beim Laden (prepareActivities)', () => {
  it('ein falsches Schrittbild fällt allein weg, die Aktivität und die übrigen bleiben, mit Warnung', () => {
    const [result] = prepareActivities([activity({ 1: 'https://example.org/a.svg', 2: uri(2), 9: uri(9) })], prefix, 'Test');
    expect(result.id).toBe('a');
    expect(result.stepImages).toEqual({ 2: uri(2) });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 Schrittbild(er)'));
  });

  it('bleibt keines übrig, fällt das Feld weg; unlesbare Schrittbilder ebenso', () => {
    expect(prepareActivities([activity({ 1: 'https://example.org/a.svg' })], prefix, 'Test')[0].stepImages).toBeUndefined();
    expect(prepareActivities([{ ...activity(), stepImages: 'kaputt' }], prefix, 'Test')[0]).not.toHaveProperty('stepImages');
  });

  it('gültige Schrittbilder kommen unverändert und ohne Warnung durch', () => {
    const input = activity({ 1: uri(1), 3: uri(3) });
    expect(prepareActivities([input], prefix, 'Test')).toEqual([input]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('Zeile ↔ Aktivität', () => {
  it('step_images ↔ stepImages, NULL heißt „keine“', () => {
    const withImages = activity({ 2: uri(2) });
    expect(activityToRow(withImages).step_images).toEqual({ 2: uri(2) });
    expect(rowToActivityInput(activityToRow(withImages))).toMatchObject({ stepImages: { 2: uri(2) } });
    expect(activityToRow(activity()).step_images).toBeNull();
    expect(rowToActivityInput(activityToRow(activity()))).not.toHaveProperty('stepImages');
  });
});

describe('Anzeige (getStepImageUris)', () => {
  it('Schrittnummer als Zahl → Adresse, nur Schritte des angezeigten Texts', () => {
    expect(getStepImageUris(activity({ 1: uri(1), 3: uri(3) }), 2, prefix)).toEqual({ 1: uri(1) });
  });

  it('prüft die Allowlist beim Anzeigen noch einmal', () => {
    expect(getStepImageUris({ stepImages: { 1: 'https://example.org/a.svg' } }, 3, prefix)).toEqual({});
    expect(getStepImageUris(activity({ 1: uri(1) }), 3, null)).toEqual({});
  });

  it('ohne Schrittbilder: leer', () => {
    expect(getStepImageUris(activity(), 3, prefix)).toEqual({});
  });
});
