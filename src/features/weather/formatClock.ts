import type { TFunction } from 'i18next';

// Uhrzeit als Text in der App-Sprache: volle Stunde „15 Uhr“ (Englisch „15:00“), sonst „15:20 Uhr“ („15:20“).
export function formatClock(t: TFunction, date: Date): string {
  const hour = date.getHours();
  const minute = date.getMinutes();
  return minute === 0
    ? t('weather.clock.fullHour', { hour })
    : t('weather.clock.withMinutes', { hour, minute: String(minute).padStart(2, '0') });
}
