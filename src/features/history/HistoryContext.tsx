import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { createSerialQueue } from '@/lib/serialQueue';

import {
  addToHistory,
  removeEntry,
  setRating,
  type HistoryDraft,
  type HistoryEntry,
  type Rating,
} from './history';
import { loadHistory, saveHistory } from './historyStorage';

type HistoryContextValue = {
  // 'loading' solange der Verlauf vom Gerät gelesen wird. Erst danach 'ready'.
  status: 'loading' | 'ready';
  entries: HistoryEntry[]; // neueste zuerst
  // Alle speichern zuerst auf dem Gerät. Schlägt das fehl, wird ein Fehler geworfen
  // und der Verlauf bleibt unverändert.
  // Doppeltippen auf „Fertig“ legt keinen zweiten Eintrag an: `addEntry` gibt dann den vorhandenen zurück.
  addEntry: (draft: HistoryDraft) => Promise<HistoryEntry>;
  setEntryRating: (id: string, rating: Rating | undefined) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<HistoryContextValue['status']>('loading');
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  // Immer der neueste Stand, damit Änderungen kurz hintereinander nichts überschreiben.
  const latestEntries = useRef<HistoryEntry[]>([]);
  // Änderungen laufen nacheinander: Die zweite sieht das Ergebnis der ersten (wichtig gegen Doppeltippen).
  const [enqueue] = useState(createSerialQueue);

  useEffect(() => {
    let cancelled = false;
    loadHistory().then((loaded) => {
      if (cancelled) return;
      latestEntries.current = loaded;
      setEntries(loaded);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function commit(next: HistoryEntry[]) {
    await saveHistory(next);
    latestEntries.current = next;
    setEntries(next);
  }

  function addEntry(draft: HistoryDraft) {
    return enqueue(async () => {
      const { entries: next, entry } = addToHistory(latestEntries.current, draft, new Date());
      await commit(next);
      return entry;
    });
  }

  function setEntryRating(id: string, rating: Rating | undefined) {
    return enqueue(() => commit(setRating(latestEntries.current, id, rating)));
  }

  function deleteEntry(id: string) {
    return enqueue(() => commit(removeEntry(latestEntries.current, id)));
  }

  function clearHistory() {
    return enqueue(() => commit([]));
  }

  return (
    <HistoryContext.Provider
      value={{ status, entries, addEntry, setEntryRating, deleteEntry, clearHistory }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const value = useContext(HistoryContext);
  if (value === null) {
    throw new Error('useHistory muss innerhalb von HistoryProvider benutzt werden.');
  }
  return value;
}
