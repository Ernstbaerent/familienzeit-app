// SQL-Dateien zum Einspielen der Aktivitäten in Supabase erzeugen: npm run db:seed-sql
//
// Prüft zuerst alle Dateien in data/ mit derselben Prüfung wie `npm run activities:check` (Form, Sicherheits-Checkliste, Texte).
// Gibt es Fehler, wird nichts geschrieben. Sonst entstehen in supabase/seed/ die Dateien activities-part-N-of-M.sql
// (je höchstens 25 Aktivitäten), die du im SQL-Editor von Supabase einfügst (Anleitung: docs/supabase.md).
// Das Skript spricht nie mit Supabase und braucht keinen Schlüssel. Braucht Node 22+.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

import { renderSeedFiles, seedDir } from '../src/features/activities/activitySql.ts';
import { loadActivityData, root } from './lib/activityData.ts';

const { files, activities, errors } = loadActivityData();

if (errors.length > 0) {
  console.log('Die Daten in data/ haben Fehler, es wurde nichts geschrieben:\n');
  for (const error of errors) console.log(`  ${error}`);
  console.log('\nRepariere die Fehler (Übersicht: npm run activities:check) und starte dann noch einmal.');
  process.exit(1);
}

const seedFiles = renderSeedFiles(activities);
const dir = new URL(`${seedDir}/`, root);
mkdirSync(dir, { recursive: true });

// Alte Teile löschen, die es nicht mehr gibt (z. B. wenn es weniger Aktivitäten geworden sind).
for (const name of readdirSync(dir)) {
  if (/^activities-part-\d+-of-\d+\.sql$/.test(name) && !seedFiles.some((file) => file.fileName === name)) {
    rmSync(new URL(name, dir));
  }
}
for (const file of seedFiles) writeFileSync(new URL(file.fileName, dir), file.content);

const drafts = activities.filter((activity) => activity.status !== 'approved').length;
console.log(`Geprüft: ${activities.length} Aktivitäten aus ${files.length} Dateien in data/.`);
console.log(`Geschrieben: ${seedFiles.length} Dateien in ${seedDir}/`);
for (const file of seedFiles) {
  console.log(`  ${file.fileName}  (${Math.round(file.content.length / 1024)} KB)`);
}
if (drafts > 0) {
  console.log(`\nHinweis: ${drafts} Aktivität(en) sind nicht „approved“. Sie kommen in die Datenbank, die App zeigt sie aber nicht.`);
}
console.log('\nNächster Schritt: Die Dateien nacheinander im SQL-Editor von Supabase einfügen und ausführen (docs/supabase.md).');
