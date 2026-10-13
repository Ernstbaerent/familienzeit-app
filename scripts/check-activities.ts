// Prüfskript für Aktivitäten: npm run activities:check
//
// Liest alle Dateien in data/*.json und prüft
//   1. die Form jeder Aktivität (Pflichtfelder, bekannte Schlüssel, de + en vollständig, `image` nur von unserem eigenen Speicher),
//   2. die Sicherheits-Checkliste (docs/sicherheits-checkliste.md),
//   3. ob zu jedem Material und Allergen ein Text in de.json und en.json steht.
// Danach zeigt es eine Übersicht zum Durchlesen und eine Zählung, was die Daten abdecken.
//
// Regeln: `approved` muss die Checkliste bestehen (sonst Fehler). `draft`, das nicht besteht,
// wird aufgelistet und bleibt `draft`. Das Skript ändert keine Dateien.
// Braucht Node 22+ (läuft ohne Zusatzprogramme, siehe package.json).

import {
  categoryKeys,
  energyKeys,
  settingKeys,
  type Activity,
} from '../src/features/activities/activities.ts';
import { getAllergens } from '../src/features/activities/safetyCheck.ts';
import { dislikeKeys, interestKeys } from '../src/features/profiles/preferences.ts';
import { loadActivityData } from './lib/activityData.ts';

// Das Lesen und Prüfen der Dateien steht in scripts/lib/activityData.ts (gemeinsam mit `npm run db:seed-sql`).
const { files, activities: all, errors, notPassed, passedDrafts } = loadActivityData();

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
  { head: 'Monate', width: 14 },
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
    activity.months?.join(', ') ?? 'ganzjährig',
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
console.log(`  Mit Monaten (saisonal): ${all.filter((a) => a.months).length}`);
console.log(`  Für Geschwister (siblingFriendly): ${all.filter((a) => a.siblingFriendly).length}`);
// Geschwister mit großem Altersabstand: geschwistertauglich und mindestens 10 Jahre Spanne (z. B. 3–14).
const wideSiblings = all.filter((a) => a.siblingFriendly && a.ageMax - a.ageMin >= 10);
console.log(`    davon mit 10+ Jahren Altersspanne: ${wideSiblings.length}`);
const howMany = (test: (a: Activity) => boolean) => all.filter(test).length;
console.log(`  Drinnen oder beides: ${howMany((a) => a.setting !== 'outdoor')}`);
console.log(`  Wenig Elternenergie: ${howMany((a) => a.energy === 'low')}`);
console.log(
  `  Kurz: passt in 30 Min. ${howMany((a) => a.durationMin <= 30)}, ganz fertig in 30 Min. ${howMany((a) => a.durationMax <= 30)}`,
);
console.log(
  `  Kleinkinder: ab 0 Jahren ${howMany((a) => a.ageMin === 0)}, für 1-Jährige ${howMany((a) => a.ageMin <= 1)}, für 2-Jährige ${howMany((a) => a.ageMin <= 2)}`,
);
console.log(
  `  Jugendliche: für 14-Jährige ${howMany((a) => a.ageMax >= 14)}, für 16-Jährige ${howMany((a) => a.ageMax >= 16)}`,
);
if (all.length > 0) {
  const durations = all.flatMap((a) => [a.durationMin, a.durationMax]);
  console.log(`  Alter: ${Math.min(...all.map((a) => a.ageMin))}–${Math.max(...all.map((a) => a.ageMax))} Jahre`);
  console.log(`  Dauer: ${Math.min(...durations)}–${Math.max(...durations)} Minuten`);
}
const topicCount = (key: string) => all.filter((a) => (a.topics as string[]).includes(key)).length;
console.log(`  Themen: ${dislikeKeys.map((key) => `${key} ${topicCount(key)}`).join(', ')}`);
const unusedInterests = interestKeys.filter((key) => topicCount(key) === 0);
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
