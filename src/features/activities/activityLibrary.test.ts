// Rohdaten → benutzbare Aktivitäten (M8): kaputte Einträge, Nur-approved-Regel, Bilder von fremden Servern.

import { makeActivity } from '../suggestions/testHelpers';
import { minUsableActivities, prepareActivities } from './activityLibrary';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('prepareActivities', () => {
  it('die Mindestzahl ist 3 (die drei Vorschläge)', () => {
    expect(minUsableActivities).toBe(3);
  });

  it('gültige freigegebene Aktivitäten kommen unverändert durch', () => {
    const input = [makeActivity({ id: 'a' }), makeActivity({ id: 'b' })];
    expect(prepareActivities(input, prefix, 'Test')).toEqual(input);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([null, undefined, 'text', 42, { a: 1 }])('%p ist keine Liste und ergibt nichts', (raw) => {
    expect(prepareActivities(raw, prefix, 'Test')).toEqual([]);
  });

  describe('Nur-approved-Regel', () => {
    it('Entwürfe und abgelehnte Aktivitäten kommen nie durch, auch wenn die Quelle sie liefert', () => {
      const input = [
        makeActivity({ id: 'ok' }),
        makeActivity({ id: 'entwurf', status: 'draft' }),
        makeActivity({ id: 'abgelehnt', status: 'rejected' }),
      ];
      expect(prepareActivities(input, prefix, 'Test').map((activity) => activity.id)).toEqual(['ok']);
    });
  });

  describe('kaputte Einträge', () => {
    it('werden verworfen und mit Grund und Herkunft gemeldet, der Rest bleibt', () => {
      const input = [makeActivity({ id: 'a' }), { id: 'kaputt', category: 'unbekannt' }, null, makeActivity({ id: 'b' }), 'text'];
      expect(prepareActivities(input, prefix, 'Supabase').map((activity) => activity.id)).toEqual(['a', 'b']);
      const messages = warn.mock.calls.map((call) => String(call[0]));
      expect(messages).toHaveLength(3);
      expect(messages[0]).toContain('kaputt');
      expect(messages[0]).toContain('(Supabase)');
      expect(messages[0]).toContain('category');
      expect(messages[1]).toContain('Nr. 3');
    });

    it('doppelte IDs: nur die erste zählt', () => {
      const first = makeActivity({ id: 'a', ageMax: 5 });
      const result = prepareActivities([first, makeActivity({ id: 'a', ageMax: 9 })], prefix, 'Test');
      expect(result).toEqual([first]);
    });

    it('ein Eintrag ohne eine der Pflichtsprachen wird verworfen', () => {
      const noEnglish = { ...makeActivity({ id: 'x' }), translations: { de: makeActivity({ id: 'x' }).translations.de } };
      expect(prepareActivities([noEnglish], prefix, 'Test')).toEqual([]);
    });
  });

  describe('Bild nur von unserem eigenen Speicher', () => {
    it('ein fremdes Bild fällt weg, die Aktivität bleibt (mit Warnung)', () => {
      const [activity] = prepareActivities([makeActivity({ id: 'a', image: 'https://example.org/a.jpg' })], prefix, 'Supabase');
      expect(activity.id).toBe('a');
      expect(activity.image).toBeUndefined();
      expect(String(warn.mock.calls[0][0])).toContain('Bild nicht von unserem Speicher');
    });

    it('ein Bild von unserem Speicher bleibt', () => {
      const image = `${prefix}wald.svg`;
      expect(prepareActivities([makeActivity({ id: 'a', image })], prefix, 'Test')[0].image).toBe(image);
    });

    it('ohne festgelegten Speicher bleibt kein Bild', () => {
      expect(prepareActivities([makeActivity({ id: 'a', image: `${prefix}wald.svg` })], null, 'Test')[0].image).toBeUndefined();
    });

    it('ein Bild mit null (so kommt es aus der Datenbank) zählt als kein Bild und ist keine Warnung wert', () => {
      const [activity] = prepareActivities([{ ...makeActivity({ id: 'a' }), image: null }], prefix, 'Test');
      expect(activity.id).toBe('a');
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
