// Neue Aktivitäten bei Supabase holen und speichern (M8). Ohne UI.
// Schlägt etwas fehl, bleibt es still: nur eine Warnung in der Konsole, keine Meldung in der Oberfläche. Die App nutzt dann weiter
// den Zwischenspeicher oder die mitgelieferten Aktivitäten. Diese Funktion wirft nie.

import type { ActivitiesRecord } from './activitiesCache';
import { saveStoredActivities } from './activitiesStorage';
import { minUsableActivities, prepareActivities } from './activityLibrary';
import { rowToActivityInput } from './activityRow';
import { fetchApprovedRows } from './fetchActivities';
import type { SupabaseConfig } from './supabaseConfig';

export type RefreshDeps = {
  config: SupabaseConfig;
  imagePrefix: string | null;
  now?: () => number;
  fetchRows?: (config: SupabaseConfig) => Promise<unknown[]>;
  save?: (record: ActivitiesRecord) => Promise<void>;
};

function describeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'unbekannter Fehler';
}

// Gibt den neuen Bestand zurück oder `null`, wenn es nichts Brauchbares gab (Fehler, Zeitüberschreitung, zu wenige gültige Aktivitäten).
// In Warnungen steht nie der Schlüssel und nie die Adresse.
export async function refreshActivities(deps: RefreshDeps): Promise<ActivitiesRecord | null> {
  const { config, imagePrefix, now = Date.now, fetchRows = fetchApprovedRows, save = saveStoredActivities } = deps;

  let rows: unknown[];
  try {
    rows = await fetchRows(config);
  } catch (error) {
    console.warn(
      `Aktivitäten: Abruf bei Supabase fehlgeschlagen (${describeError(error)}). Die App nutzt gespeicherte oder mitgelieferte Aktivitäten.`,
    );
    return null;
  }

  const activities = prepareActivities(rows.map(rowToActivityInput), imagePrefix, 'Supabase');
  if (activities.length < minUsableActivities) {
    console.warn(
      `Aktivitäten: Supabase lieferte nur ${activities.length} gültige Aktivität(en), gebraucht werden mindestens ${minUsableActivities}. Die App nutzt gespeicherte oder mitgelieferte Aktivitäten.`,
    );
    return null;
  }

  const record: ActivitiesRecord = { fetchedAt: now(), activities };
  try {
    await save(record);
  } catch (error) {
    console.warn(`Aktivitäten: Speichern auf dem Gerät fehlgeschlagen (${describeError(error)}). Der neue Bestand gilt nur bis zum Schließen der App.`);
  }
  console.info(`Aktivitäten: ${activities.length} von Supabase geladen.`);
  return record;
}
