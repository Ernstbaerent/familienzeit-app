import type { TFunction } from 'i18next';

import type { Activity } from './activities';
import { getDurationDisplay } from './activityDisplay';

// Dauer als Text in der App-Sprache, z. B. "20–40 Min." oder "1,5–2,5 Std."
export function formatDuration(
  t: TFunction,
  activity: Pick<Activity, 'durationMin' | 'durationMax'>,
): string {
  const { unit, min, max } = getDurationDisplay(activity);
  if (unit === 'minutes') {
    return min === max
      ? t('duration.minutesSingle', { value: min })
      : t('duration.minutes', { min, max });
  }
  return min === max ? t('duration.hoursSingle', { value: min }) : t('duration.hours', { min, max });
}
