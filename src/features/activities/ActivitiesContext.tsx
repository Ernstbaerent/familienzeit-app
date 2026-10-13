import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getRefreshMinutes, shouldRefresh } from './activitiesCache';
import { loadStoredActivities } from './activitiesStorage';
import type { Activity } from './activities';
import { refreshActivities } from './activityRefresh';
import { getBundledActivities } from './bundledActivities';
import { getImagePrefix, getSupabaseConfig, readSupabaseEnv } from './supabaseConfig';

// Woher die Aktivitäten gerade kommen: mitgeliefert (data/), Zwischenspeicher auf dem Gerät oder frisch von Supabase.
export type ActivitiesSource = 'bundled' | 'cache' | 'remote';

type ActivitiesContextValue = {
  // Immer da und nie leer: Die App startet mit den mitgelieferten Aktivitäten, nichts wartet auf das Netz.
  activities: Activity[];
  source: ActivitiesSource;
};

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

// Die Aktivitäten für die ganze App (M8, docs/supabase.md).
// Beim Start sind sofort die mitgelieferten Aktivitäten da. Danach, im Hintergrund und ohne etwas zu blockieren:
//  1. den Zwischenspeicher vom Gerät lesen (wenn brauchbar, ersetzt er das Mitgelieferte),
//  2. höchstens einmal pro Tag bei Supabase nachfragen (wenn eingerichtet); klappt das, ersetzt der neue Bestand den bisherigen und wird gespeichert.
// Jeder Fehler (offline, pausiertes Projekt, Zeitüberschreitung, kaputte Daten) bleibt still: Die App bleibt beim bisherigen Bestand.
// Bildschirme, deren Karten sich nicht umsortieren sollen, frieren die Liste beim Öffnen ein (z. B. „Eure Ideen“).
export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ActivitiesContextValue>(() => ({
    activities: getBundledActivities(),
    source: 'bundled',
  }));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const env = readSupabaseEnv();
      const imagePrefix = getImagePrefix(env);
      const config = getSupabaseConfig(env);

      const stored = await loadStoredActivities(imagePrefix);
      if (cancelled) return;
      if (stored) setValue({ activities: stored.activities, source: 'cache' });

      if (!config) return; // Supabase nicht eingerichtet: es bleibt beim Zwischenspeicher oder Mitgelieferten
      if (!shouldRefresh(stored?.fetchedAt ?? null, Date.now(), getRefreshMinutes(env.refreshMinutes))) return;

      const fresh = await refreshActivities({ config, imagePrefix });
      if (cancelled || !fresh) return;
      setValue({ activities: fresh.activities, source: 'remote' });
    }
    load().catch((error: unknown) => {
      // Sollte nicht vorkommen (die Bausteine fangen ihre Fehler selbst), darf aber nie die App stören.
      console.warn(`Aktivitäten: Aktualisierung abgebrochen (${error instanceof Error ? error.message : 'unbekannter Fehler'}).`);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}

export function useActivities(): ActivitiesContextValue {
  const value = useContext(ActivitiesContext);
  if (value === null) {
    throw new Error('useActivities muss innerhalb von ActivitiesProvider benutzt werden.');
  }
  return value;
}
