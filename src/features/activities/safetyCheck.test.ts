import { makeActivity } from '../suggestions/testHelpers';
import type { Activity, ActivityText } from './activities';
import { checkSafety, getAllergens, needsAdults, type AllergenNames } from './safetyCheck';

const allergenNames: AllergenNames = { de: { milk: 'Milch' }, en: { milk: 'milk' } };

// Test-Aktivität mit Material und Sicherheitshinweis in beiden Sprachen.
function withNote(
  overrides: Partial<Activity> & Pick<Activity, 'id'>,
  note?: { de: string; en: string },
): Activity {
  const text = (language: 'de' | 'en'): ActivityText => ({
    title: `Titel ${overrides.id}`,
    summary: 'Kurz',
    steps: ['Schritt'],
    ...(note ? { safetyNote: note[language] } : {}),
  });
  return makeActivity({ ageMin: 4, translations: { de: text('de'), en: text('en') }, ...overrides });
}

// Nur die Nummern der Punkte, an denen eine Aktivität scheitert, z. B. ['Punkt 2'].
function failedPoints(activity: Activity): string[] {
  return [...new Set(checkSafety(activity, allergenNames).map((problem) => problem.split(':')[0]))];
}

describe('Sicherheits-Checkliste', () => {
  it('ohne Gefahren und Allergene: bestanden', () => {
    expect(checkSafety(withNote({ id: 'a', materials: ['paper', 'pencils'] }))).toEqual([]);
  });

  it('Punkt 1: Kleinteile erst ab 3 Jahren', () => {
    expect(failedPoints(withNote({ id: 'a', materials: ['buttons'], ageMin: 2 }))).toEqual(['Punkt 1']);
    expect(failedPoints(withNote({ id: 'b', materials: ['buttons'], ageMin: 3 }))).toEqual([]);
  });

  it('Punkt 2: Schere nur mit Hinweis auf Erwachsene', () => {
    expect(failedPoints(withNote({ id: 'a', materials: ['scissors'] }))).toEqual(['Punkt 2']);
    const note = { de: 'Schneidet nur mit Erwachsenen.', en: 'Only cut together with adults.' };
    expect(failedPoints(withNote({ id: 'b', materials: ['scissors'] }, note))).toEqual([]);
  });

  it('Punkt 2: Kerzen und offenes Feuer immer mit Erwachsenen', () => {
    expect(failedPoints(withNote({ id: 'a', materials: ['candle'] }))).toEqual(['Punkt 2']);
    const note = { de: 'Kerze nur mit Erwachsenen anzünden.', en: 'Only light the candle with adults.' };
    expect(failedPoints(withNote({ id: 'b', materials: ['candle'] }, note))).toEqual([]);
  });

  it('Punkt 4: Allergene im Hinweis nennen', () => {
    const missing = { de: 'Guten Appetit.', en: 'Enjoy.' };
    expect(failedPoints(withNote({ id: 'a', materials: ['cream'] }, missing))).toEqual(['Punkt 4']);
    const named = { de: 'Enthält Milch.', en: 'Contains milk.' };
    expect(failedPoints(withNote({ id: 'b', materials: ['cream'] }, named))).toEqual([]);
  });

  describe('Punkt 6: Elektrogeräte aufschrauben', () => {
    const adultsOnly = { de: 'Nur mit Erwachsenen.', en: 'Only together with adults.' };
    const fullNote = {
      de: 'Nur mit Erwachsenen. Nur kleine batteriebetriebene Geräte, Batterien vorher heraus. Nie Geräte mit Netzstecker.',
      en: 'Only together with adults. Only small battery-powered devices, take the batteries out first. Never devices with a plug.',
    };

    it('braucht Erwachsene, Batterien heraus und „nie mit Netzstecker“', () => {
      const bare = withNote({ id: 'a', materials: ['oldDevice'], ageMin: 10 });
      expect(failedPoints(bare)).toEqual(['Punkt 2', 'Punkt 6']);
      const onlyAdults = withNote({ id: 'b', materials: ['oldDevice'], ageMin: 10 }, adultsOnly);
      expect(failedPoints(onlyAdults)).toEqual(['Punkt 6']);
    });

    it('mit vollständigem Hinweis: bestanden', () => {
      const activity = withNote({ id: 'a', materials: ['oldDevice', 'screwdriver'], ageMin: 10 }, fullNote);
      expect(checkSafety(activity, allergenNames)).toEqual([]);
    });
  });

  describe('Punkt 7: Licht in Papier nur mit LED', () => {
    const adults = { de: 'Nur mit Erwachsenen.', en: 'Only together with adults.' };
    const ledNote = {
      de: 'Nur mit Erwachsenen schneiden. Nur ein LED-Licht, nie eine Kerze.',
      en: 'Only cut together with adults. Only an LED light, never a candle.',
    };

    it('Kerze und Papier zusammen fällt immer durch', () => {
      const lantern = withNote({ id: 'a', materials: ['paperBag', 'candle'] }, adults);
      expect(failedPoints(lantern)).toEqual(['Punkt 7']);
    });

    it('mit LED-Licht muss der Hinweis „nur LED, keine Kerze“ sagen', () => {
      const withoutHint = withNote({ id: 'a', materials: ['paperBag', 'ledLight', 'scissors'] }, adults);
      expect(failedPoints(withoutHint)).toEqual(['Punkt 7']);
      const withHint = withNote({ id: 'b', materials: ['paperBag', 'ledLight', 'scissors'] }, ledNote);
      expect(checkSafety(withHint, allergenNames)).toEqual([]);
    });
  });
});

describe('Anzeige in der Detailansicht', () => {
  it('„Mit Erwachsenen“ genau bei Schere, Messer, Hitze, Feuer, Wasser und Elektrogeräten', () => {
    for (const material of ['scissors', 'knife', 'oven', 'candle', 'water', 'oldDevice'] as const) {
      expect(needsAdults({ materials: [material] })).toBe(true);
    }
  });

  it('nicht bei harmlosem Material, Kleinteilen oder Zutaten', () => {
    expect(needsAdults({ materials: [] })).toBe(false);
    expect(needsAdults({ materials: ['paper', 'pencils', 'glue'] })).toBe(false);
    expect(needsAdults({ materials: ['buttons'] })).toBe(false); // Kleinteile: Altersgrenze statt Erwachsene
    expect(needsAdults({ materials: ['cream', 'tapWater'] })).toBe(false);
  });

  it('ein einziges Material mit Gefahr genügt', () => {
    expect(needsAdults({ materials: ['paper', 'pencils', 'scissors'] })).toBe(true);
  });

  it('Allergene kommen aus dem Material, ohne Doppelte', () => {
    expect(getAllergens({ materials: ['cream', 'butter', 'paper'] })).toEqual(['milk']);
    expect(getAllergens({ materials: ['paper'] })).toEqual([]);
  });
});
