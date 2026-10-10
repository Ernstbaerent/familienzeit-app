// Aktivitäten: Datentyp und Prüfung (ohne UI, ohne Laden).
// Reine Funktionen, damit sie später mit Jest getestet werden können (M5).
//
// Hinweis zu den Imports: Sie enden auf ".ts", weil das Prüfskript (scripts/check-activities.ts)
// diese Dateien direkt mit Node liest. Die App (Metro) kommt damit genauso zurecht.

import { isDislikeKey, type DislikeKey } from '../profiles/preferences.ts';
import { isMaterialKey, type MaterialKey } from './materials.ts';

export const categoryKeys = [
  'craft',
  'game',
  'movement',
  'experiment',
  'nature',
  'cooking',
  'outing',
] as const;
export const settingKeys = ['indoor', 'outdoor', 'both'] as const;
export const energyKeys = ['low', 'medium', 'high'] as const; // Energie, die Eltern brauchen
export const dayPartKeys = ['morning', 'afternoon', 'evening'] as const;
// Monate als Zahlen: 1 = Januar … 12 = Dezember (Nordhalbkugel, die App startet in Deutschland).
export const monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const costValues = [0, 1, 2] as const; // 0 = kostenlos, 1 = wenig, 2 = mehr
export const statusKeys = ['draft', 'approved', 'rejected'] as const;
export const sourceKeys = ['ai', 'manual'] as const;

// Sprachen, die jede Aktivität mindestens haben muss.
export const requiredLanguages = ['de', 'en'] as const;

// Die App richtet sich an Kinder von 0 bis 16 Jahren.
export const maxAge = 16;
// Längste erlaubte Dauer: 12 Stunden (ein halber Tag sind ca. 4 Stunden).
const maxDurationMinutes = 720;

export type ActivityCategory = (typeof categoryKeys)[number];
export type ActivitySetting = (typeof settingKeys)[number];
export type ActivityEnergy = (typeof energyKeys)[number];
export type DayPart = (typeof dayPartKeys)[number];
export type MonthNumber = (typeof monthNumbers)[number];
export type ActivityCost = (typeof costValues)[number];
export type ActivityStatus = (typeof statusKeys)[number];
export type ActivitySource = (typeof sourceKeys)[number];

// Themen einer Aktivität: dieselben Schlüssel wie bei Interessen und Abneigungen der Kinderprofile
// (profiles/preferences.ts). So lässt sich eine Aktivität ohne Umweg den Profilen zuordnen.
export type TopicKey = DislikeKey;

export type ActivityText = {
  title: string;
  summary: string;
  steps: string[];
  safetyNote?: string; // nur, wo nötig (siehe docs/sicherheits-checkliste.md)
};

export type Activity = {
  id: string;
  category: ActivityCategory;
  topics: TopicKey[]; // darf leer sein
  translations: Record<string, ActivityText>; // mindestens "de" und "en"
  ageMin: number; // Jahre, ganze Zahl, inklusive
  ageMax: number; // Jahre, ganze Zahl, inklusive
  durationMin: number; // Minuten
  durationMax: number;
  setting: ActivitySetting;
  weather: { needsDry: boolean; betterInSun: boolean };
  dayParts?: DayPart[]; // freiwillig: nur zu diesen Tageszeiten. Fehlt es, passt die Aktivität immer.
  months?: MonthNumber[]; // freiwillig: nur in diesen Monaten (z. B. Plätzchen [11, 12]). Fehlt es, passt sie das ganze Jahr.
  energy: ActivityEnergy;
  cost: ActivityCost;
  materials: MaterialKey[]; // Schlüssel, Texte unter "materials" in den Übersetzungen
  siblingFriendly: boolean;
  status: ActivityStatus; // nur "approved" erscheint in der App
  source: ActivitySource;
  createdAt: string; // ISO-Zeitpunkt
  image?: string; // freiwillig: Web-Adresse. Ohne Bild zeigt die App das Symbol der Kategorie.
  isSample?: true; // Beispieldaten, werden später durch die echte Datenbank ersetzt
};

export type ParseResult =
  | { ok: true; activity: Activity }
  | { ok: false; id?: string; problems: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function readOneOf<T extends string | number>(
  raw: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  problems: string[],
): T | null {
  const value = raw[key];
  if ((allowed as readonly unknown[]).includes(value)) return value as T;
  problems.push(`${key}: erlaubt sind ${allowed.join(', ')}`);
  return null;
}

function readInteger(
  raw: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  problems: string[],
): number | null {
  const value = raw[key];
  if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
    return value;
  }
  problems.push(`${key}: ganze Zahl von ${min} bis ${max} erwartet`);
  return null;
}

function readBoolean(raw: Record<string, unknown>, key: string, problems: string[]): boolean | null {
  const value = raw[key];
  if (typeof value === 'boolean') return value;
  problems.push(`${key}: true oder false erwartet`);
  return null;
}

export function isDayPart(value: unknown): value is DayPart {
  return (dayPartKeys as readonly unknown[]).includes(value);
}

export function isMonthNumber(value: unknown): value is MonthNumber {
  return (monthNumbers as readonly unknown[]).includes(value);
}

// Liste von bekannten Schlüsseln ohne Doppelte.
function readKeyList<T extends string | number>(
  value: unknown,
  key: string,
  isKey: (item: unknown) => item is T,
  problems: string[],
  options: { requireNonEmpty?: boolean } = {},
): T[] | null {
  if (!Array.isArray(value)) {
    problems.push(`${key}: Liste erwartet`);
    return null;
  }
  const unknownKeys = value.filter((item) => !isKey(item));
  if (unknownKeys.length > 0) {
    problems.push(`${key}: unbekannter Schlüssel ${unknownKeys.map(String).join(', ')}`);
    return null;
  }
  if (new Set(value).size !== value.length) {
    problems.push(`${key}: Schlüssel doppelt`);
    return null;
  }
  if (options.requireNonEmpty && value.length === 0) {
    problems.push(`${key}: darf nicht leer sein`);
    return null;
  }
  return value as T[];
}

function readText(raw: unknown, language: string, problems: string[]): ActivityText | null {
  const where = `translations.${language}`;
  if (!isRecord(raw)) {
    problems.push(`${where}: fehlt`);
    return null;
  }
  const { title, summary, steps, safetyNote } = raw;
  let valid = true;
  if (!isNonEmptyString(title)) {
    problems.push(`${where}.title: Text fehlt`);
    valid = false;
  }
  if (!isNonEmptyString(summary)) {
    problems.push(`${where}.summary: Text fehlt`);
    valid = false;
  }
  if (!Array.isArray(steps) || steps.length === 0 || !steps.every(isNonEmptyString)) {
    problems.push(`${where}.steps: mindestens ein Schritt, alle mit Text`);
    valid = false;
  }
  if (safetyNote !== undefined && !isNonEmptyString(safetyNote)) {
    problems.push(`${where}.safetyNote: leer (dann besser weglassen)`);
    valid = false;
  }
  return valid ? (raw as ActivityText) : null;
}

function readTranslations(raw: unknown, problems: string[]): Record<string, ActivityText> | null {
  if (!isRecord(raw)) {
    problems.push('translations: Objekt erwartet');
    return null;
  }
  let valid = true;
  for (const language of requiredLanguages) {
    if (!(language in raw)) {
      problems.push(`translations.${language}: fehlt`);
      valid = false;
    }
  }
  // Jede vorhandene Sprache (auch spätere wie "tr") muss vollständig sein.
  for (const [language, text] of Object.entries(raw)) {
    if (readText(text, language, problems) === null) valid = false;
  }
  return valid ? (raw as Record<string, ActivityText>) : null;
}

// Prüft einen Eintrag aus den Daten (JSON). Gibt entweder die fertige Aktivität zurück
// oder eine Liste verständlicher Probleme.
// Geprüft wird die Form. Ob eine Aktivität sicher ist, prüft safetyCheck.ts.
export function parseActivity(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, problems: ['Eintrag ist kein Objekt'] };

  const problems: string[] = [];
  const id = isNonEmptyString(raw.id) ? raw.id : undefined;
  if (id === undefined) problems.push('id: Text erwartet');

  readOneOf(raw, 'category', categoryKeys, problems);
  readOneOf(raw, 'setting', settingKeys, problems);
  readOneOf(raw, 'energy', energyKeys, problems);
  readOneOf(raw, 'cost', costValues, problems);
  readOneOf(raw, 'status', statusKeys, problems);
  readOneOf(raw, 'source', sourceKeys, problems);

  const ageMin = readInteger(raw, 'ageMin', 0, maxAge, problems);
  const ageMax = readInteger(raw, 'ageMax', 0, maxAge, problems);
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    problems.push('ageMin darf nicht größer sein als ageMax');
  }
  const durationMin = readInteger(raw, 'durationMin', 1, maxDurationMinutes, problems);
  const durationMax = readInteger(raw, 'durationMax', 1, maxDurationMinutes, problems);
  if (durationMin !== null && durationMax !== null && durationMin > durationMax) {
    problems.push('durationMin darf nicht größer sein als durationMax');
  }

  readBoolean(raw, 'siblingFriendly', problems);
  if (isRecord(raw.weather)) {
    readBoolean(raw.weather, 'needsDry', problems);
    readBoolean(raw.weather, 'betterInSun', problems);
  } else {
    problems.push('weather: Objekt mit needsDry und betterInSun erwartet');
  }

  readKeyList(raw.topics, 'topics', isDislikeKey, problems);
  readKeyList(raw.materials, 'materials', isMaterialKey, problems);
  if (raw.dayParts !== undefined) {
    readKeyList(raw.dayParts, 'dayParts', isDayPart, problems, { requireNonEmpty: true });
  }
  if (raw.months !== undefined) {
    const months = readKeyList(raw.months, 'months', isMonthNumber, problems, {
      requireNonEmpty: true,
    });
    if (months && months.length === monthNumbers.length) {
      problems.push('months: alle 12 Monate, dann besser weglassen');
    }
  }
  readTranslations(raw.translations, problems);

  if (!isNonEmptyString(raw.createdAt) || Number.isNaN(Date.parse(raw.createdAt))) {
    problems.push('createdAt: ISO-Zeitpunkt erwartet');
  }
  if (raw.image !== undefined && !(isNonEmptyString(raw.image) && raw.image.startsWith('https://'))) {
    problems.push('image: Web-Adresse mit https:// erwartet (oder weglassen)');
  }
  if (raw.isSample !== undefined && raw.isSample !== true) {
    problems.push('isSample: nur true oder weglassen');
  }

  if (problems.length > 0) return { ok: false, id, problems };
  // Alle Felder sind oben geprüft, deshalb ist diese Umwandlung hier sicher.
  return { ok: true, activity: raw as unknown as Activity };
}

export type RejectedActivity = { index: number; id?: string; problems: string[] };

// Prüft eine ganze Liste (z. B. den Inhalt einer Datei aus data/).
// Kaputte Einträge und doppelte IDs werden aussortiert und mit Grund zurückgegeben.
export function parseActivities(raw: unknown): {
  activities: Activity[];
  rejected: RejectedActivity[];
} {
  if (!Array.isArray(raw)) {
    return { activities: [], rejected: [{ index: -1, problems: ['Datei enthält keine Liste'] }] };
  }
  const seenIds = new Set<string>();
  const activities: Activity[] = [];
  const rejected: RejectedActivity[] = [];
  raw.forEach((item, index) => {
    const result = parseActivity(item);
    if (!result.ok) {
      rejected.push({ index, id: result.id, problems: result.problems });
    } else if (seenIds.has(result.activity.id)) {
      rejected.push({ index, id: result.activity.id, problems: ['id kommt doppelt vor'] });
    } else {
      seenIds.add(result.activity.id);
      activities.push(result.activity);
    }
  });
  return { activities, rejected };
}
