import type { TFunction } from 'i18next';

import { maxAge, type Activity } from './activities';

// Altersspanne einer Aktivität als Text in der App-Sprache, z. B. "3–8 Jahre", "5 Jahre" oder "Alle Alter" (0 bis 16).
export function formatAgeRange(t: TFunction, activity: Pick<Activity, 'ageMin' | 'ageMax'>): string {
  const { ageMin, ageMax } = activity;
  if (ageMin <= 0 && ageMax >= maxAge) return t('suggest.card.ageAll');
  if (ageMin === ageMax) return t('age.years', { count: ageMin });
  return t('suggest.card.ageRange', { min: ageMin, max: ageMax });
}
