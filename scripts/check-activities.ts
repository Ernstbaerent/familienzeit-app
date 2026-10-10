// Prüfskript für Aktivitäten: npm run activities:check
//
// Liest alle Dateien in data/*.json und prüft
//   1. die Form jeder Aktivität (Pflichtfelder, bekannte Schlüssel, de + en vollständig),
//   2. die Sicherheits-Checkliste (docs/sicherheits-checkliste.md),
//   3. ob zu jedem Material und Allergen ein Text in de.json und en.json steht.
// Danach zeigt es eine Übersicht zum Durchlesen und eine Zählung, was die Daten abdecken.
//
// Regeln: `approved` muss die Checkliste bestehen (sonst Fehler). `draft`, das nicht besteht,
// wird aufgelistet und bleibt `draft`. Das Skript ändert keine Dateien.
// Braucht Node 22+ (läuft ohne Zusatzprogramme, siehe package.json).

import { readdirSync, readFileSync } from 'node:fs';

import {
  categoryKeys,
  energyKeys,
  parseActivities,
  settingKeys,
  type Activity,
} from '../src/features/activities/activities.ts';
import { allergenKeys, materialKeys } from '../src/features/activities/materials.ts';
import {
  checkSafety,
  getAllergens,
  type AllergenNames,
} from '../src/features/activities/safetyCheck.ts';
import { interestKeys } from '../src/features/profiles/preferences.ts';

const root = new URL('../', import.meta.url);
const errors: string[] = [];

function readText(path: string): string {
  return readFileSync(new URL(path, root), 'utf8');
}

type Locale = { materials: Record<string, string>; allergens: Record<string, string> };

// --- 3. Texte für Material und Allergene -------------------------------------------------------
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

// --- 1. und 2. Dateien in data/ ----------------------------------------------------------------
const files = readdirSync(new URL('data/', root))
  .filter((name) => name.endsWith('.json'))
  .sort();
if (files.length === 0) errors.push('Keine Datei in data/ gefunden');

const loaderSource = readText('src/features/activities/loadActivities.ts');
const all: Activity[] = [];
const seenIds = new Map<string, string>(); // id -> Datei
const notPassed: { activity: Activity; problems: string[] }[] = [];
const passedDrafts: Activity[] = [];

for (const file of files) {
  if (!loaderSource.includes(file.replace(/\.json$/, ''))) {
    errors.push(`${file}: nicht in src/features/activities/loadActivities.ts eingetragen`);
  }

  const { activities, rejected } = parseActivities(JSON.parse(readText(`data/${file}`)));
  for (const item of rejected) {
    const name = item.id ?? `Nr. ${item.index + 1}`;
    errors.push(`${file}: ${name}: ${item.problems.join('; ')}`);
  }

  for (const activity of activities) {
    const otherFile = seenIds.get(activity.id);
    if (otherFile) {
      errors.push(`${file}: ${activity.id}: id gibt es schon in ${otherFile}`);
      continue;
    }
    seenIds.set(activity.id, file);
    all.push(activity);

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

// --- Ausgabe -----------------------------------------------------------------------------------
function title(activity: Activity): string {
  return activity.translations.de?.title ?? activity.id;
}

function range(min: number, max: number): string {
  return `${min}–${max}`;
}

const columns = [
  { head: 'Titel', width: 40 },
  { head: 'Kategorie', width: 10 },
  { head: 'Alter', width: 6 },
  { head: 'Minuten', width: 8 },
  { head: 'Ort', width: 8 },
  { head: 'Energie', width: 7 },
  { head: 'Tageszeit', width: 20 },
  { head: 'Status', width: 8 },
];

function printRow(cells: string[]): void {
  console.log(cells.map((cell, index) => cell.padEnd(columns[index].width)).join('  '));
}

console.log(`\nAktivitäten in ${files.length} Datei(en): ${all.length}\n`);
printRow(columns.map((column) => column.head));
printRow(columns.map((column) => '-'.repeat(column.width)));
for (const activity of all) {
  printRow([
    title(activity).slice(0, 40),
    activity.category,
    range(activity.ageMin, activity.ageMax),
    range(activity.durationMin, activity.durationMax),
    activity.setting,
    activity.energy,
    activity.dayParts?.join(', ') ?? 'jederzeit',
    activity.status,
  ]);
}

function count(label: string, keys: readonly string[], pick: (a: Activity) => string): void {
  console.log(`${label}: ${keys.map((key) => `${key} ${all.filter((a) => pick(a) === key).length}`).join(', ')}`);
}

console.log('\nWas die Daten abdecken');
count('  Kategorien', categoryKeys, (a) => a.category);
count('  Energie   ', energyKeys, (a) => a.energy);
count('  Ort       ', settingKeys, (a) => a.setting);
console.log(`  Wetterunabhängig (needsDry false): ${all.filter((a) => !a.weather.needsDry).length}`);
console.log(`  Mit Tageszeit: ${all.filter((a) => a.dayParts).length}`);
console.log(`  Für Geschwister (siblingFriendly): ${all.filter((a) => a.siblingFriendly).length}`);
if (all.length > 0) {
  const durations = all.flatMap((a) => [a.durationMin, a.durationMax]);
  console.log(`  Alter: ${Math.min(...all.map((a) => a.ageMin))}–${Math.max(...all.map((a) => a.ageMax))} Jahre`);
  console.log(`  Dauer: ${Math.min(...durations)}–${Math.max(...durations)} Minuten`);
}
const unusedInterests = interestKeys.filter((key) => !all.some((a) => a.topics.includes(key)));
console.log(`  Interessen ohne Aktivität: ${unusedInterests.length > 0 ? unusedInterests.join(', ') : 'keine'}`);

const withAllergens = all.filter((a) => getAllergens(a).length > 0);
if (withAllergens.length > 0) {
  console.log('\nAllergene (aus dem Material abgeleitet, zur Kontrolle)');
  for (const activity of withAllergens) {
    console.log(`  ${title(activity)}: ${getAllergens(activity).join(', ')}`);
  }
}

if (notPassed.length > 0) {
  console.log('\nBestehen die Checkliste nicht und bleiben draft');
  for (const { activity, problems } of notPassed) {
    console.log(`  ${activity.id}`);
    for (const problem of problems) console.log(`    - ${problem}`);
  }
}
if (passedDrafts.length > 0) {
  console.log('\nDraft, aber Checkliste bestanden (können auf approved gesetzt werden)');
  for (const activity of passedDrafts) console.log(`  ${activity.id}`);
}

if (errors.length > 0) {
  console.log('\nFEHLER');
  for (const error of errors) console.log(`  ${error}`);
  console.log(`\n${errors.length} Fehler gefunden.`);
  process.exitCode = 1;
} else {
  console.log('\nAlles in Ordnung: Form, Checkliste und Texte stimmen.');
}
