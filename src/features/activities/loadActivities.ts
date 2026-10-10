// Lädt die Aktivitäten lokal aus den Dateien in data/ (kein Netz, kein Konto).
// Später (M8) kommen sie aus Supabase mit Offline-Cache; die App ruft dann weiter loadActivities() auf.

import activitiesM4 from '../../../data/activities-m4.json';
import activitiesM5b1 from '../../../data/activities-m5b-1.json';
import { parseActivities, type Activity } from './activities.ts';

// Alle Datenquellen. Neue Datei in data/: hier eintragen.
// `npm run activities:check` prüft alle Dateien in data/ und erinnert daran, falls eine fehlt.
const rawActivities: unknown[] = [...activitiesM4, ...activitiesM5b1];

let cache: Activity[] | null = null;

// Gibt alle Aktivitäten mit Status `approved` zurück. Kaputte Einträge werden übersprungen
// und mit Grund gemeldet, damit die App trotzdem startet.
export function loadActivities(): Activity[] {
  if (cache) return cache;

  const { activities, rejected } = parseActivities(rawActivities);
  for (const item of rejected) {
    console.warn(`Aktivität ${item.id ?? `Nr. ${item.index + 1}`} übersprungen: ${item.problems.join('; ')}`);
  }
  cache = activities.filter((activity) => activity.status === 'approved');
  return cache;
}
