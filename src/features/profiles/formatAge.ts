import type { TFunction } from 'i18next';

import { describeAge, getAgeInMonths, type ChildProfile } from './profiles';

// Alter als Text in der App-Sprache. Unter 2 Jahren in Monaten ("8 Monate", "1 Jahr und 4 Monate"),
// ab 2 Jahren in Jahren ("5 Jahre").
export function formatAge(
  t: TFunction,
  child: Pick<ChildProfile, 'birthYear' | 'birthMonth'>,
  now: Date = new Date(),
): string {
  const age = describeAge(getAgeInMonths(child, now));
  switch (age.kind) {
    case 'months':
      return t('age.months', { count: age.months });
    case 'yearAndMonths':
      return t('age.yearAndMonths', { count: age.months });
    case 'years':
      return t('age.years', { count: age.years });
  }
}
