// Eine Zeile der Tabelle `activities` (supabase/migrations/0001_activities.sql) ↔ eine Aktivität.
// Die Tabelle nutzt snake_case, die App camelCase. Reine Funktionen, ohne UI.
//
// Hinweis zu den Imports: Sie enden auf ".ts", weil das Seed-Skript (scripts/seed-sql.ts) diese Datei direkt mit Node liest.

import type { Activity } from './activities.ts';

// Alle Spalten, die die App liest (und das Seed-Skript schreibt, außer `step_images`). `updated_at` setzt die Datenbank selbst.
// `step_images` gibt es erst mit Migration 0006: Fehlt sie in der Datenbank, scheitert der Abgleich, und die App bleibt still beim Zwischenspeicher.
export const activityColumns = [
  'id',
  'status',
  'category',
  'topics',
  'translations',
  'age_min',
  'age_max',
  'duration_min',
  'duration_max',
  'setting',
  'needs_dry',
  'better_in_sun',
  'day_parts',
  'months',
  'energy',
  'cost',
  'materials',
  'sibling_friendly',
  'source',
  'image',
  'step_images',
  'created_at',
] as const;

export type ActivityColumn = (typeof activityColumns)[number];

export type ActivityRow = {
  id: string;
  status: string;
  category: string;
  topics: string[];
  translations: Activity['translations'];
  age_min: number;
  age_max: number;
  duration_min: number;
  duration_max: number;
  setting: string;
  needs_dry: boolean;
  better_in_sun: boolean;
  day_parts: string[] | null; // null = jederzeit
  months: number[] | null; // null = ganzes Jahr
  energy: string;
  cost: number;
  materials: string[];
  sibling_friendly: boolean;
  source: string;
  image: string | null;
  step_images: Record<string, string> | null; // Schrittnummer (ab 1) → Adresse; null = keine (M9b, Migration 0006)
  created_at: string;
};

export function activityToRow(activity: Activity): ActivityRow {
  return {
    id: activity.id,
    status: activity.status,
    category: activity.category,
    topics: activity.topics,
    translations: activity.translations,
    age_min: activity.ageMin,
    age_max: activity.ageMax,
    duration_min: activity.durationMin,
    duration_max: activity.durationMax,
    setting: activity.setting,
    needs_dry: activity.weather.needsDry,
    better_in_sun: activity.weather.betterInSun,
    day_parts: activity.dayParts ?? null,
    months: activity.months ?? null,
    energy: activity.energy,
    cost: activity.cost,
    materials: activity.materials,
    sibling_friendly: activity.siblingFriendly,
    source: activity.source,
    image: activity.image ?? null,
    step_images: activity.stepImages ?? null,
    created_at: activity.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Macht aus einer Zeile (so, wie Supabase sie liefert) den Rohwert einer Aktivität. Geprüft wird hier nichts:
// Das übernimmt danach `parseActivities` (fehlende oder falsche Felder fallen dort auf, und der Eintrag wird verworfen).
// `null` bei freiwilligen Feldern heißt „nicht vorhanden“.
export function rowToActivityInput(row: unknown): unknown {
  if (!isRecord(row)) return row;
  return {
    id: row.id,
    category: row.category,
    topics: row.topics,
    translations: row.translations,
    ageMin: row.age_min,
    ageMax: row.age_max,
    durationMin: row.duration_min,
    durationMax: row.duration_max,
    setting: row.setting,
    weather: { needsDry: row.needs_dry, betterInSun: row.better_in_sun },
    ...(row.day_parts != null && { dayParts: row.day_parts }),
    ...(row.months != null && { months: row.months }),
    energy: row.energy,
    cost: row.cost,
    materials: row.materials,
    siblingFriendly: row.sibling_friendly,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    ...(row.image != null && { image: row.image }),
    ...(row.step_images != null && { stepImages: row.step_images }),
  };
}
