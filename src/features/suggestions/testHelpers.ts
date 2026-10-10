// Nur für die Tests (*.test.ts): baut Test-Aktivitäten, Test-Kinder und Anfragen
// mit sinnvollen Standardwerten. So steht in jedem Test nur das, worauf es ankommt.

import type { Activity } from '../activities/activities';
import type { SuggestionChild, SuggestionRequest } from './request';

// Fester „Jetzt“-Zeitpunkt, damit das Alter der Kinder in den Tests immer gleich ist.
export const testNow = new Date(2026, 9, 10, 15, 0); // 10. Oktober 2026, 15 Uhr

export function makeActivity(overrides: Partial<Activity> & Pick<Activity, 'id'>): Activity {
  return {
    category: 'game',
    topics: [],
    translations: {
      de: { title: `Titel ${overrides.id}`, summary: 'Kurz', steps: ['Schritt'] },
      en: { title: `Title ${overrides.id}`, summary: 'Short', steps: ['Step'] },
    },
    ageMin: 0,
    ageMax: 12,
    durationMin: 15,
    durationMax: 30,
    setting: 'indoor',
    weather: { needsDry: false, betterInSun: false },
    energy: 'medium',
    cost: 0,
    materials: [],
    siblingFriendly: false,
    status: 'approved',
    source: 'manual',
    createdAt: '2026-10-10T00:00:00.000Z',
    ...overrides,
  };
}

// Kind mit genau diesem Alter am Tag `testNow`. Beispiel: makeChild({ years: 1, months: 6 }).
export function makeChild(
  age: { years: number; months?: number },
  preferences: Partial<Pick<SuggestionChild, 'interests' | 'dislikes'>> = {},
): SuggestionChild {
  const totalMonths = age.years * 12 + (age.months ?? 0);
  const birth = new Date(testNow.getFullYear(), testNow.getMonth() - totalMonths, 1);
  return {
    birthYear: birth.getFullYear(),
    birthMonth: birth.getMonth() + 1,
    interests: preferences.interests ?? [],
    dislikes: preferences.dislikes ?? [],
  };
}

export function makeRequest(overrides: Partial<SuggestionRequest> = {}): SuggestionRequest {
  return {
    children: [makeChild({ years: 5 })],
    availableMinutes: 60,
    weather: 'cloudy',
    dayPart: 'afternoon',
    now: testNow,
    ...overrides,
  };
}

export function ids(activities: readonly Activity[]): string[] {
  return activities.map((activity) => activity.id);
}
