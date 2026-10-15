// Aktivitäten bei Supabase abgleichen und speichern (M8, seit M8b nur die Änderungen). Ohne UI.
// Schlägt etwas fehl, bleibt es still: nur eine Warnung in der Konsole, keine Meldung in der Oberfläche. Die App nutzt dann weiter
// den Zwischenspeicher oder die mitgelieferten Aktivitäten. Diese Funktion wirft nie.
//
// Ablauf eines Abgleichs (alle Anfragen zusammen höchstens 10 Sekunden, alles oder nichts):
//  1. Zählprobe: Anzahl der freigegebenen Aktivitäten und die Uhrzeit des Servers.
//  2. Änderungen seit dem gespeicherten Stand (ohne brauchbaren Stand: alles) und in den bisherigen Bestand einführen.
//  3. Weicht die Anzahl auf dem Gerät von der Zählprobe ab (etwas wurde zurückgezogen) oder ist der letzte Abgleich 30 Tage her:
//     ID-Liste holen, Zurückgezogenes löschen, Fehlendes einzeln nachladen (mehr als 100: alles neu).
//  4. Mindestens 3 gültige Aktivitäten, sonst bleibt alles beim Alten. Dann speichern.

import type { Activity } from './activities';
import type { ActivitiesRecord } from './activitiesCache';
import { saveStoredActivities } from './activitiesStorage';
import { minUsableActivities } from './activityLibrary';
import {
  formatTimestamp,
  isCursorUsable,
  isIdCheckDue,
  maxTargetedFetch,
  mergeChanges,
  nextCursor,
  parseTimestamp,
  reconcileIds,
  sortById,
} from './activitySync';
import { withActivitiesApi, type ActivitiesApi, type FetchLike } from './fetchActivities';
import type { SupabaseConfig } from './supabaseConfig';

export type RefreshDeps = {
  config: SupabaseConfig;
  imagePrefix: string | null;
  previous?: ActivitiesRecord | null; // bisheriger Bestand aus Supabase (Zwischenspeicher), nie die mitgelieferten Aktivitäten
  now?: () => number;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  save?: (record: ActivitiesRecord) => Promise<void>;
};

class TooFewError extends Error {}

function describeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'unbekannter Fehler';
}

type SyncOutcome = { activities: Map<string, Activity>; cursor: number | null; idChecked: boolean; mode: 'full' | 'changes'; changed: number; removed: number };

async function synchronize(api: ActivitiesApi, previous: ActivitiesRecord | null, imagePrefix: string | null, now: number): Promise<SyncOutcome> {
  // 1. Zählprobe
  const probe = await api.count();
  if (probe.count !== null && probe.count < minUsableActivities) {
    throw new TooFewError(`Supabase meldet nur ${probe.count} freigegebene Aktivität(en)`);
  }

  // 2. Änderungen (oder alles)
  const storedCursor = previous ? parseTimestamp(previous.cursor) : null;
  const usable = previous !== null && isCursorUsable(storedCursor, probe.serverTime);
  if (previous && previous.cursor !== null && !usable) {
    console.warn('Aktivitäten: Der gespeicherte Stand ist unbrauchbar (nicht lesbar oder in der Zukunft). Die App lädt einmal alles neu.');
  }
  const cursor = usable ? storedCursor : null;
  const changes = await api.changes(cursor === null ? null : formatTimestamp(cursor));
  const serverTime = probe.serverTime ?? changes.serverTime;
  const base = new Map(cursor === null ? [] : (previous?.activities ?? []).map((activity) => [activity.id, activity] as const));
  let activities = mergeChanges(base, changes.rows, imagePrefix);
  let maxSeen = changes.maxUpdatedAt;
  let mode: SyncOutcome['mode'] = cursor === null ? 'full' : 'changes';
  let removed = 0;

  // 3. Zurückgezogenes finden. Verglichen wird nur, was aus Supabase stammt (der Zwischenspeicher enthält nie das Mitgelieferte).
  // Nach einem vollen Abruf ist der Bestand ohnehin vollständig.
  const countDiffers = probe.count !== null && probe.count !== activities.size;
  const idCheck = mode === 'changes' && (countDiffers || isIdCheckDue(previous?.idCheckedAt ?? null, now));
  if (idCheck) {
    const reconciled = reconcileIds(activities, await api.ids());
    removed = reconciled.removed.length;
    if (reconciled.missing.length > maxTargetedFetch) {
      // Zu viel fehlt (z. B. ein kaputter Zwischenspeicher): einmal alles neu, das ist einfacher und genauso groß.
      const full = await api.changes(null);
      activities = mergeChanges(new Map(), full.rows, imagePrefix);
      maxSeen = full.maxUpdatedAt;
      mode = 'full';
    } else {
      activities = reconciled.kept;
      if (reconciled.missing.length > 0) activities = mergeChanges(activities, await api.byIds(reconciled.missing), imagePrefix);
    }
  }

  return {
    activities,
    cursor: nextCursor(maxSeen, mode === 'full' ? null : cursor, serverTime),
    idChecked: idCheck || mode === 'full',
    mode,
    changed: changes.rows.length,
    removed,
  };
}

// Gibt den neuen Bestand zurück oder `null`, wenn es nichts Brauchbares gab (Fehler, Zeitüberschreitung, zu wenige gültige Aktivitäten).
// In Warnungen steht nie der Schlüssel und nie die Adresse.
export async function refreshActivities(deps: RefreshDeps): Promise<ActivitiesRecord | null> {
  const { config, imagePrefix, previous = null, now = Date.now, save = saveStoredActivities } = deps;
  const startedAt = now();

  let outcome: SyncOutcome;
  try {
    outcome = await withActivitiesApi(config, { fetchImpl: deps.fetchImpl, timeoutMs: deps.timeoutMs }, (api) =>
      synchronize(api, previous, imagePrefix, startedAt),
    );
  } catch (error) {
    const reason = error instanceof TooFewError ? `${error.message}, gebraucht werden mindestens ${minUsableActivities}` : `Abruf bei Supabase fehlgeschlagen (${describeError(error)})`;
    console.warn(`Aktivitäten: ${reason}. Die App nutzt gespeicherte oder mitgelieferte Aktivitäten.`);
    return null;
  }

  if (outcome.activities.size < minUsableActivities) {
    console.warn(
      `Aktivitäten: Supabase lieferte nur ${outcome.activities.size} gültige Aktivität(en), gebraucht werden mindestens ${minUsableActivities}. Die App nutzt gespeicherte oder mitgelieferte Aktivitäten.`,
    );
    return null;
  }

  const record: ActivitiesRecord = {
    fetchedAt: startedAt,
    cursor: outcome.cursor === null ? null : formatTimestamp(outcome.cursor),
    idCheckedAt: outcome.idChecked ? startedAt : (previous?.idCheckedAt ?? null),
    activities: sortById(outcome.activities.values()),
  };
  try {
    await save(record);
  } catch (error) {
    console.warn(`Aktivitäten: Speichern auf dem Gerät fehlgeschlagen (${describeError(error)}). Der neue Bestand gilt nur bis zum Schließen der App.`);
  }
  if (outcome.mode === 'full') {
    console.info(`Aktivitäten: ${record.activities.length} von Supabase geladen.`);
  } else {
    console.info(
      `Aktivitäten: ${outcome.changed} Änderung(en)${outcome.removed > 0 ? `, ${outcome.removed} zurückgezogen` : ''}, jetzt ${record.activities.length} von Supabase.`,
    );
  }
  return record;
}
