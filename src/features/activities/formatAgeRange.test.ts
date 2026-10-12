import { createInstance } from 'i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

import { maxAge } from './activities';
import { formatAgeRange } from './formatAgeRange';

function translator(language: 'de' | 'en') {
  const i18n = createInstance();
  i18n.init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: language,
    interpolation: { escapeValue: false },
  });
  return i18n.t.bind(i18n);
}

describe('formatAgeRange', () => {
  it('zeigt die Spanne, z. B. „3–8 Jahre“ / „3–8 years“', () => {
    expect(formatAgeRange(translator('de'), { ageMin: 3, ageMax: 8 })).toBe('3–8 Jahre');
    expect(formatAgeRange(translator('en'), { ageMin: 3, ageMax: 8 })).toBe('3–8 years');
  });

  it('zeigt bei einem einzigen Alter keine Spanne, mit richtiger Einzahl', () => {
    expect(formatAgeRange(translator('de'), { ageMin: 1, ageMax: 1 })).toBe('1 Jahr');
    expect(formatAgeRange(translator('de'), { ageMin: 5, ageMax: 5 })).toBe('5 Jahre');
    expect(formatAgeRange(translator('en'), { ageMin: 1, ageMax: 1 })).toBe('1 year');
  });

  it('0 bis 16 Jahre heißt „Alle Alter“ / „All ages“', () => {
    expect(formatAgeRange(translator('de'), { ageMin: 0, ageMax: maxAge })).toBe('Alle Alter');
    expect(formatAgeRange(translator('en'), { ageMin: 0, ageMax: maxAge })).toBe('All ages');
  });

  it('fast alle Alter ist noch eine Spanne (ab 1 oder bis 15)', () => {
    expect(formatAgeRange(translator('de'), { ageMin: 1, ageMax: maxAge })).toBe('1–16 Jahre');
    expect(formatAgeRange(translator('de'), { ageMin: 0, ageMax: maxAge - 1 })).toBe('0–15 Jahre');
  });
});
