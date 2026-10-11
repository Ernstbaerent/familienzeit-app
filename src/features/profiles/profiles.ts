// Kinderprofile: Datentyp und reine Funktionen (ohne UI, ohne Speicher).
// Profile liegen nur auf dem Gerät (siehe profileStorage.ts). Es gibt keinen echten Namen,
// nur einen freiwilligen Spitzname sowie Geburtsjahr und -monat.

import { createId } from '@/lib/id';

import {
  isDislikeKey,
  isInterestKey,
  type DislikeKey,
  type InterestKey,
} from './preferences';

export type ChildProfile = {
  id: string;
  nickname?: string; // freiwillig
  birthYear: number;
  birthMonth: number; // 1 = Januar … 12 = Dezember
  interests: InterestKey[]; // freiwillig, darf leer sein
  dislikes: DislikeKey[]; // freiwillig, darf leer sein
  createdAt: string; // ISO-Zeitpunkt
};

// Was das Formular liefert. id und createdAt vergibt createChild.
export type ChildDraft = Omit<ChildProfile, 'id' | 'createdAt'>;

export type Preferences = Pick<ChildProfile, 'interests' | 'dislikes'>;

export const maxNicknameLength = 30;

// Schlüssel für die Monatsnamen in den Übersetzungen (Index 0 = Januar).
export const monthKeys = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

// Auswählbar sind die Geburtsjahre der letzten 18 Jahre (Kinder von 0 bis 16 Jahren, mit Spielraum).
const birthYearCount = 18;

// Ältere gespeicherte Einträge werden nicht gleich verworfen, nur offensichtlicher Unsinn.
const minStoredBirthYear = 1900;

export function createChild(draft: ChildDraft, now: Date = new Date()): ChildProfile {
  return { ...draft, id: createId(), createdAt: now.toISOString() };
}

// Leerer Spitzname wird zu `undefined`, zu langer wird gekürzt.
export function normalizeNickname(input: string): string | undefined {
  const nickname = input.trim().slice(0, maxNicknameLength).trim();
  return nickname === '' ? undefined : nickname;
}

// Geburtsjahre zum Auswählen, neueste zuerst. `keepYear` ist das Jahr eines bestehenden Profils:
// Es bleibt wählbar, auch wenn das Kind inzwischen aus der Spanne herausgewachsen ist.
export function getBirthYearOptions(now: Date = new Date(), keepYear?: number): number[] {
  const currentYear = now.getFullYear();
  const years = Array.from({ length: birthYearCount }, (_, index) => currentYear - index);
  if (keepYear !== undefined && !years.includes(keepYear)) {
    years.push(keepYear);
  }
  return years.sort((a, b) => b - a);
}

// true, wenn Jahr und Monat gewählt sind und nicht in der Zukunft liegen.
export function isBirthValid(
  year: number | null,
  month: number | null,
  now: Date = new Date(),
): boolean {
  if (year === null || month === null) return false;
  if (!Number.isInteger(year) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12) return false;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year < currentYear || (year === currentYear && month <= currentMonth);
}

// Alter in vollen Monaten. Wir kennen nur Jahr und Monat, im Geburtsmonat ist das Kind also 0 Monate alt.
export function getAgeInMonths(
  child: Pick<ChildProfile, 'birthYear' | 'birthMonth'>,
  now: Date = new Date(),
): number {
  const months =
    (now.getFullYear() - child.birthYear) * 12 + (now.getMonth() + 1 - child.birthMonth);
  return Math.max(0, months);
}

export type AgeDescription =
  | { kind: 'months'; months: number } // unter 1 Jahr: "8 Monate"
  | { kind: 'yearAndMonths'; months: number } // 1 Jahr bis unter 2 Jahre: "1 Jahr und 4 Monate"
  | { kind: 'years'; years: number }; // ab 2 Jahren: "5 Jahre" (genau 12 Monate: "1 Jahr")

// Unter 2 Jahren zeigen wir das Alter in Monaten, ab 2 Jahren in Jahren.
export function describeAge(totalMonths: number): AgeDescription {
  if (totalMonths < 12) {
    return { kind: 'months', months: totalMonths };
  }
  if (totalMonths < 24) {
    const months = totalMonths - 12;
    return months === 0 ? { kind: 'years', years: 1 } : { kind: 'yearAndMonths', months };
  }
  return { kind: 'years', years: Math.floor(totalMonths / 12) };
}

// Ein Thema als Interesse an- oder abwählen. Steht es bei den Abneigungen, wird es dort entfernt.
export function toggleInterest(preferences: Preferences, key: InterestKey): Preferences {
  if (preferences.interests.includes(key)) {
    return { ...preferences, interests: preferences.interests.filter((item) => item !== key) };
  }
  return {
    interests: [...preferences.interests, key],
    dislikes: preferences.dislikes.filter((item) => item !== key),
  };
}

// Ein Thema als Abneigung an- oder abwählen. Steht es bei den Interessen, wird es dort entfernt.
export function toggleDislike(preferences: Preferences, key: DislikeKey): Preferences {
  if (preferences.dislikes.includes(key)) {
    return { ...preferences, dislikes: preferences.dislikes.filter((item) => item !== key) };
  }
  return {
    interests: preferences.interests.filter((item) => item !== key),
    dislikes: [...preferences.dislikes, key],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickKeys<T extends string>(raw: unknown, isKey: (value: unknown) => value is T): T[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isKey))];
}

function sanitizeChild(raw: unknown): ChildProfile | null {
  if (!isRecord(raw)) return null;
  const { id, nickname, birthYear, birthMonth, createdAt } = raw;

  if (typeof id !== 'string' || id === '') return null;
  if (typeof birthYear !== 'number' || !Number.isInteger(birthYear)) return null;
  if (birthYear < minStoredBirthYear) return null;
  if (typeof birthMonth !== 'number' || !Number.isInteger(birthMonth)) return null;
  if (birthMonth < 1 || birthMonth > 12) return null;

  // Unbekannte Themen (z. B. aus der Liste entfernt) fallen weg. Doppelte ebenso.
  const interests = pickKeys(raw.interests, isInterestKey);
  const interestSet = new Set<string>(interests);
  const dislikes = pickKeys(raw.dislikes, isDislikeKey).filter((key) => !interestSet.has(key));

  return {
    id,
    nickname: typeof nickname === 'string' ? normalizeNickname(nickname) : undefined,
    birthYear,
    birthMonth,
    interests,
    dislikes,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(0).toISOString(),
  };
}

// Räumt gespeicherte Daten auf: kaputte Einträge, doppelte IDs und unbekannte Themen fliegen raus.
export function sanitizeChildren(raw: unknown): ChildProfile[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const children: ChildProfile[] = [];
  for (const item of raw) {
    const child = sanitizeChild(item);
    if (child && !seenIds.has(child.id)) {
      seenIds.add(child.id);
      children.push(child);
    }
  }
  return children;
}
