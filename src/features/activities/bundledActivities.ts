// Die mitgelieferten Aktivitäten aus den Dateien in data/ (kein Netz, kein Konto).
// Sie sind der letzte Rückfall der App (M8): Sind keine anderen Daten ladbar (offline, Fehler, erster Start ohne Netz), gibt es trotzdem Vorschläge.
// Die Bildschirme benutzen sie nicht direkt, sondern `useActivities()` (ActivitiesContext.tsx). Direkt gebraucht werden sie nur dort und in Tests.

import activitiesM4 from '../../../data/activities-m4.json';
import activitiesM5b1 from '../../../data/activities-m5b-1.json';
import activitiesM5b2 from '../../../data/activities-m5b-2.json';
import activitiesM5b3 from '../../../data/activities-m5b-3.json';
import activitiesM5b4 from '../../../data/activities-m5b-4.json';
import type { Activity } from './activities';
import { prepareActivities } from './activityLibrary';
import { getImagePrefix } from './supabaseConfig';

// Alle Datenquellen. Neue Datei in data/: hier eintragen.
// `npm run activities:check` prüft alle Dateien in data/ und erinnert daran, falls eine fehlt.
const rawActivities: unknown[] = [
  ...activitiesM4,
  ...activitiesM5b1,
  ...activitiesM5b2,
  ...activitiesM5b3,
  ...activitiesM5b4,
];

let cache: { imagePrefix: string | null; activities: Activity[] } | null = null;

// Gibt alle Aktivitäten mit Status `approved` zurück. Kaputte Einträge werden übersprungen
// und mit Grund gemeldet, damit die App trotzdem startet.
export function getBundledActivities(imagePrefix: string | null = getImagePrefix()): Activity[] {
  if (cache && cache.imagePrefix === imagePrefix) return cache.activities;
  const activities = prepareActivities(rawActivities, imagePrefix, 'mitgeliefert');
  cache = { imagePrefix, activities };
  return activities;
}
