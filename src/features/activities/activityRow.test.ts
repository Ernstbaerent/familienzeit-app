// Zeile der Tabelle `activities` ↔ Aktivität (M8).

import { makeActivity } from '../suggestions/testHelpers';
import { parseActivity, type Activity } from './activities';
import { activityColumns, activityToRow, rowToActivityInput } from './activityRow';
import { getBundledActivities } from './bundledActivities';

describe('Zeile → Aktivität', () => {
  it('snake_case wird camelCase, das Wetter wird wieder ein Objekt', () => {
    const activity = makeActivity({
      id: 'a',
      ageMin: 2,
      ageMax: 9,
      durationMin: 10,
      durationMax: 40,
      weather: { needsDry: true, betterInSun: true },
      siblingFriendly: true,
      dayParts: ['morning'],
      months: [4, 5],
    });
    const input = rowToActivityInput(activityToRow(activity)) as Record<string, unknown>;
    expect(input).toMatchObject({
      id: 'a',
      ageMin: 2,
      ageMax: 9,
      durationMin: 10,
      durationMax: 40,
      weather: { needsDry: true, betterInSun: true },
      siblingFriendly: true,
      dayParts: ['morning'],
      months: [4, 5],
      createdAt: activity.createdAt,
    });
  });

  it('freiwillige Felder mit NULL fehlen danach ganz („jederzeit“, „ganzes Jahr“, „kein Bild“)', () => {
    const input = rowToActivityInput(activityToRow(makeActivity({ id: 'a' }))) as Record<string, unknown>;
    expect('dayParts' in input).toBe(false);
    expect('months' in input).toBe(false);
    expect('image' in input).toBe(false);
  });

  it('ein Eintrag, der keine Zeile ist, geht unverändert weiter und fällt dann bei der Prüfung auf', () => {
    for (const value of [null, 42, 'text', [1, 2]]) {
      expect(rowToActivityInput(value)).toBe(value);
      expect(parseActivity(rowToActivityInput(value)).ok).toBe(false);
    }
  });

  it('eine Zeile mit fehlenden oder falschen Feldern wird bei der Prüfung abgelehnt', () => {
    const row = activityToRow(makeActivity({ id: 'a' })) as unknown as Record<string, unknown>;
    for (const broken of [{ ...row, age_min: null }, { ...row, status: 'foo' }, { ...row, translations: null }, { ...row, needs_dry: 'ja' }]) {
      expect(parseActivity(rowToActivityInput(broken)).ok).toBe(false);
    }
  });

  it('Hin und zurück ergibt für alle mitgelieferten Aktivitäten dieselbe Aktivität', () => {
    const all = getBundledActivities();
    expect(all.length).toBeGreaterThan(100);
    for (const activity of all) {
      const result = parseActivity(JSON.parse(JSON.stringify(rowToActivityInput(activityToRow(activity)))));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.activity).toEqual(activity);
    }
  });

  it('mit Bild und allen freiwilligen Feldern geht ebenfalls nichts verloren', () => {
    const activity: Activity = makeActivity({ id: 'a', image: 'https://abc.supabase.co/storage/v1/object/public/a.svg', dayParts: ['evening'], months: [12] });
    const result = parseActivity(rowToActivityInput(activityToRow(activity)));
    expect(result.ok && result.activity).toEqual(activity);
  });
});

describe('Spalten', () => {
  it('die Liste der Spalten stimmt mit den Feldern einer Zeile überein', () => {
    expect([...activityColumns].sort()).toEqual(Object.keys(activityToRow(makeActivity({ id: 'a' }))).sort());
  });

  it('jede Spalte kommt nur einmal vor, `updated_at` setzt die Datenbank selbst', () => {
    expect(new Set(activityColumns).size).toBe(activityColumns.length);
    expect(activityColumns as readonly string[]).not.toContain('updated_at');
  });
});
