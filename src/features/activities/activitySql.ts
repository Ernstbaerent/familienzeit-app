// Aus den Aktivitäten in data/ werden SQL-Dateien zum Einfügen in den SQL-Editor von Supabase (M8, `npm run db:seed-sql`).
// Reine Funktionen, ohne Dateizugriff: Das Schreiben macht scripts/seed-sql.ts, geprüft wird in activitySql.test.ts,
// dass die Dateien in supabase/seed/ zu den Daten passen.
//
// Hinweis zu den Imports: Sie enden auf ".ts", weil das Skript diese Datei direkt mit Node liest.

import type { Activity } from './activities.ts';
import { activityColumns, activityToRow, type ActivityColumn, type ActivityRow } from './activityRow.ts';

// So viele Aktivitäten stehen höchstens in einer Datei (der SQL-Editor wird bei sehr langen Texten träge).
// Die Teile sind gleichmäßig verteilt (104 Aktivitäten → 5 Teile à 21 oder 20).
export const maxActivitiesPerPart = 25;

// Ordner der erzeugten Dateien, vom Projektordner aus.
export const seedDir = 'supabase/seed';

// Text als SQL-Zeichenkette: Hochkommas werden verdoppelt. Backslashes bleiben, was sie sind (Standard in PostgreSQL).
// Das Zeichen mit dem Code 0 kann PostgreSQL nicht speichern, das wäre ein Fehler in den Daten.
export function sqlString(value: string): string {
  if (value.includes('\u0000')) throw new Error('Ein Text enthält das Zeichen mit dem Code 0, das PostgreSQL nicht speichern kann.');
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlTextArray(values: readonly string[] | null): string {
  if (values === null) return 'null';
  return values.length === 0 ? 'array[]::text[]' : `array[${values.map(sqlString).join(', ')}]::text[]`;
}

function sqlNumberArray(values: readonly number[] | null): string {
  if (values === null) return 'null';
  if (!values.every(Number.isInteger)) throw new Error('Eine Liste von Zahlen enthält eine Zahl, die nicht ganz ist.');
  return `array[${values.join(', ')}]::smallint[]`;
}

function sqlNumber(value: number): string {
  if (!Number.isInteger(value)) throw new Error(`Erwartet wurde eine ganze Zahl, nicht ${String(value)}.`);
  return String(value);
}

function sqlValue(row: ActivityRow, column: ActivityColumn): string {
  switch (column) {
    case 'topics':
    case 'materials':
    case 'day_parts':
      return sqlTextArray(row[column]);
    case 'months':
      return sqlNumberArray(row.months);
    case 'translations':
      return `${sqlString(JSON.stringify(row.translations))}::jsonb`;
    case 'age_min':
    case 'age_max':
    case 'duration_min':
    case 'duration_max':
    case 'cost':
      return sqlNumber(row[column]);
    case 'needs_dry':
    case 'better_in_sun':
    case 'sibling_friendly':
      return row[column] ? 'true' : 'false';
    case 'image':
      return row.image === null ? 'null' : sqlString(row.image);
    case 'created_at':
      return `${sqlString(row.created_at)}::timestamptz`;
    default:
      return sqlString(row[column]);
  }
}

function sqlRow(activity: Activity): string {
  const row = activityToRow(activity);
  return `  (${activityColumns.map((column) => sqlValue(row, column)).join(', ')})`;
}

// Ein Teil: einfügen oder, wenn es die Aktivität schon gibt, aktualisieren (so lässt sich jede Datei gefahrlos wiederholen).
export function renderSeedPart(activities: readonly Activity[], part: number, parts: number): string {
  // `image` bleibt beim Aktualisieren stehen (M9b): Die Bild-Adressen setzt der Bilder-Lauf bzw. man von Hand in der Datenbank,
  // die Dateien in data/ kennen sie nicht. Ein erneutes Einspielen darf sie nie auf `null` zurücksetzen. Beim ersten Einfügen steht `image` weiter in der Liste.
  const columns = activityColumns.filter((column) => column !== 'id' && column !== 'image');
  const update = columns.map((column) => `${column} = excluded.${column}`).join(',\n  ');
  // Nur bei echter Änderung schreiben (M8b): Sonst setzt jedes erneute Einspielen `updated_at` neu, und jedes Gerät lädt alles noch einmal.
  // `updated_at` selbst steht nicht in der Liste (setzt die Datenbank), zählt also nicht als Änderung.
  const changed = `(${columns.map((column) => `activities.${column}`).join(', ')})\n  is distinct from (${columns.map((column) => `excluded.${column}`).join(', ')})`;
  return `-- Miki: Aktivitäten einspielen, Teil ${part} von ${parts} (${activities.length} Aktivitäten)
-- ERZEUGT von \`npm run db:seed-sql\` aus den Dateien in data/. Nicht von Hand ändern.
-- Einfügen im SQL-Editor von Supabase (Anleitung: docs/supabase.md). Zuerst supabase/migrations/0001_activities.sql ausführen,
-- danach alle ${parts} Teile (die Reihenfolge ist egal). Jeden Teil gefahrlos wiederholbar: Vorhandene Aktivitäten werden aktualisiert,
-- aber nur, wenn sich etwas geändert hat (sonst bliebe updated_at nicht stehen, und jedes Handy lüde sie neu).

insert into public.activities (${activityColumns.join(', ')})
values
${activities.map(sqlRow).join(',\n')}
on conflict (id) do update set
  ${update}
where ${changed};

-- Zur Kontrolle: Nach dem letzten Teil steht hier die Gesamtzahl.
select count(*) as aktivitaeten_insgesamt from public.activities;
`;
}

export type SeedFile = { fileName: string; content: string };

// Alle Dateien für diese Aktivitäten, in der Reihenfolge der Daten. Gleiche Daten ergeben immer dieselben Dateien.
export function renderSeedFiles(activities: readonly Activity[], maxPerPart: number = maxActivitiesPerPart): SeedFile[] {
  if (activities.length === 0) return [];
  const parts = Math.ceil(activities.length / maxPerPart);
  const perPart = Math.ceil(activities.length / parts);
  return Array.from({ length: parts }, (_, index) => ({
    fileName: `activities-part-${index + 1}-of-${parts}.sql`,
    content: renderSeedPart(activities.slice(index * perPart, (index + 1) * perPart), index + 1, parts),
  }));
}
