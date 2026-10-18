// Gemeinsamer Teil der Skripte `npm run activities:check` und `npm run db:seed-sql`: liest alle Dateien in data/
// und prüft sie (Form, Sicherheits-Checkliste, Texte für Material und Allergene, doppelte IDs und Titel).
// Gibt nur Ergebnisse zurück und schreibt nichts. Braucht Node 22+ (läuft ohne Zusatzprogramme, siehe package.json).

import { readdirSync, readFileSync } from 'node:fs';

import { parseActivities, type Activity } from '../../src/features/activities/activities.ts';
import { storageImagePrefix } from '../../src/features/activities/imageAllowlist.ts';
import { allergenKeys, materialKeys } from '../../src/features/activities/materials.ts';
import { checkSafety, type AllergenNames } from '../../src/features/activities/safetyCheck.ts';

// Projektordner (zwei Ebenen über dieser Datei).
export const root = new URL('../../', import.meta.url);

export function readText(path: string): string {
  return readFileSync(new URL(path, root), 'utf8');
}

// Der erlaubte Anfang für `image` (Allowlist, DESIGN.md Zusatz 35) aus EXPO_PUBLIC_SUPABASE_URL, falls es eine .env gibt.
// `null` heißt: keine Projekt-Adresse, also ist in den Daten kein `image` erlaubt.
export function readImagePrefix(): string | null {
  try {
    process.loadEnvFile(new URL('.env', root));
  } catch {
    // keine .env: ist in Ordnung, dann gilt eine vorhandene Umgebungsvariable oder eben keine
  }
  return storageImagePrefix(process.env.EXPO_PUBLIC_SUPABASE_URL);
}

type Locale = { materials: Record<string, string>; allergens: Record<string, string> };

export type ActivityData = {
  files: string[]; // Dateinamen in data/, sortiert
  activities: Activity[]; // alle gültigen Aktivitäten (ohne doppelte IDs), in der Reihenfolge der Dateien
  errors: string[]; // alles, was nicht stimmt: Wenn nicht leer, soll nichts weiterverarbeitet werden
  notPassed: { activity: Activity; problems: string[] }[]; // draft, besteht die Checkliste nicht
  passedDrafts: Activity[]; // draft, besteht die Checkliste (kann approved werden)
  allergenNames: AllergenNames;
};

export function loadActivityData(imagePrefix: string | null = readImagePrefix()): ActivityData {
  const errors: string[] = [];

  // --- 3. Texte für Material und Allergene ---------------------------------------------------------------------------
  const locales: Record<string, Locale> = {
    de: JSON.parse(readText('src/locales/de.json')),
    en: JSON.parse(readText('src/locales/en.json')),
  };
  for (const [language, locale] of Object.entries(locales)) {
    for (const key of materialKeys) {
      if (!locale.materials[key]) errors.push(`Text fehlt: materials.${key} in ${language}.json`);
    }
    for (const key of allergenKeys) {
      if (!locale.allergens[key]) errors.push(`Text fehlt: allergens.${key} in ${language}.json`);
    }
  }
  const allergenNames: AllergenNames = {
    de: locales.de.allergens,
    en: locales.en.allergens,
  };

  // --- 1. und 2. Dateien in data/ ------------------------------------------------------------------------------------
  const files = readdirSync(new URL('data/', root))
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (files.length === 0) errors.push('Keine Datei in data/ gefunden');

  const loaderSource = readText('src/features/activities/bundledActivities.ts');
  const activities: Activity[] = [];
  const seenIds = new Map<string, string>(); // id -> Datei
  const notPassed: ActivityData['notPassed'] = [];
  const passedDrafts: Activity[] = [];

  for (const file of files) {
    if (!loaderSource.includes(file.replace(/\.json$/, ''))) {
      errors.push(`${file}: nicht in src/features/activities/bundledActivities.ts eingetragen`);
    }

    const parsed = parseActivities(JSON.parse(readText(`data/${file}`)), { imagePrefix });
    for (const item of parsed.rejected) {
      const name = item.id ?? `Nr. ${item.index + 1}`;
      errors.push(`${file}: ${name}: ${item.problems.join('; ')}`);
    }

    for (const activity of parsed.activities) {
      const otherFile = seenIds.get(activity.id);
      if (otherFile) {
        errors.push(`${file}: ${activity.id}: id gibt es schon in ${otherFile}`);
        continue;
      }
      seenIds.set(activity.id, file);
      activities.push(activity);
      // Schrittbilder setzt nur set_activity_images in der Datenbank (Migration 0006); der Seed schreibt sie nicht, sie gingen hier still verloren.
      if (activity.stepImages !== undefined) errors.push(`${file}: ${activity.id}: stepImages gehören nicht in data/ (Schrittbilder kommen nur aus Supabase, docs/supabase.md)`);

      const problems = checkSafety(activity, allergenNames);
      if (activity.status === 'approved' && problems.length > 0) {
        errors.push(`${file}: ${activity.id} ist approved, besteht aber die Checkliste nicht:`);
        for (const problem of problems) errors.push(`    - ${problem}`);
      } else if (activity.status === 'draft') {
        if (problems.length > 0) notPassed.push({ activity, problems });
        else passedDrafts.push(activity);
      }
    }
  }

  // Keine doppelten Ideen: Gleicher Titel in derselben Sprache ist ein Fehler.
  for (const language of ['de', 'en']) {
    const seenTitles = new Map<string, string>(); // Titel (klein geschrieben) -> id
    for (const activity of activities) {
      const key = activity.translations[language]?.title.trim().toLowerCase();
      if (!key) continue;
      const other = seenTitles.get(key);
      if (other) errors.push(`${activity.id}: Titel (${language}) gibt es schon bei ${other}`);
      else seenTitles.set(key, activity.id);
    }
  }

  return { files, activities, errors, notPassed, passedDrafts, allergenNames };
}
