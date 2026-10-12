import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { createSerialQueue } from '@/lib/serialQueue';

import { useProfiles } from '../profiles/ProfilesContext';
import {
  resolveSelectedChildren,
  restoreSelectedChildren,
  toggleSelectedChild,
} from './selectedChildren';
import { loadSelectedChildren, saveSelectedChildren } from './selectedChildrenStorage';

type SelectedChildrenContextValue = {
  // 'loading' solange Profile und gemerkte Auswahl vom Gerät gelesen werden. Erst danach 'ready'.
  status: 'loading' | 'ready';
  // Die gewählten Kinder, die es gibt (Reihenfolge der Profile). Darf leer sein.
  childIds: string[];
  toggleChild: (id: string) => void;
  // Wählt ein Kind zusätzlich. Gedacht für ein gerade angelegtes Kind: Es soll gleich mitzählen.
  selectChild: (id: string) => void;
};

const SelectedChildrenContext = createContext<SelectedChildrenContextValue | null>(null);

// Hält die gewählten Kinder für den Start und merkt sie auf dem Gerät (`selectedChildren.v1`, nur die Kinder,
// nicht Zeit und Energie). Muss innerhalb von ProfilesProvider stehen.
export function SelectedChildrenProvider({ children }: { children: ReactNode }) {
  const { status: profilesStatus, profiles } = useProfiles();
  // Was auf dem Gerät stand. `undefined` solange es gelesen wird, `null` wenn nichts Brauchbares da war.
  const [stored, setStored] = useState<string[] | null | undefined>(undefined);
  // Die Wahl nach dem ersten Antippen. `undefined` = noch nichts angetippt, dann gilt das Gespeicherte.
  // `null` heißt „alle Kinder“ (auch die, die später dazukommen).
  const [override, setOverride] = useState<string[] | null | undefined>(undefined);
  // Gespeicherte Änderungen laufen nacheinander, damit die letzte gewinnt.
  const [enqueue] = useState(createSerialQueue);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSelectedChildren().then((ids) => {
      if (cancelled) return;
      lastSaved.current = ids === null ? null : ids.join(',');
      setStored(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = stored !== undefined && profilesStatus === 'ready';
  const choice = useMemo(() => {
    if (!ready) return null;
    return override !== undefined ? override : restoreSelectedChildren(stored);
  }, [ready, override, stored]);
  const childIds = useMemo(
    () => (ready ? resolveSelectedChildren(choice, profiles) : []),
    [ready, choice, profiles],
  );

  // Die bereinigte Wahl merken (auch nach dem Löschen eines Kindes: Es fliegt dann aus dem Speicher).
  // „Alle“ (`null`) wird nicht gemerkt: Dann gibt es nichts, was von „alle“ abweicht.
  useEffect(() => {
    if (!ready || choice === null) return;
    const key = childIds.join(',');
    if (key === lastSaved.current) return;
    lastSaved.current = key;
    // Merken ist nur eine Bequemlichkeit: Schlägt es fehl, bleibt die Wahl für diese Sitzung bestehen.
    enqueue(() => saveSelectedChildren(childIds)).catch(() => undefined);
  }, [ready, choice, childIds, enqueue]);

  function toggleChild(id: string) {
    setOverride(toggleSelectedChild(childIds, id, profiles));
  }

  function selectChild(id: string) {
    // Bei „alle“ zählt das neue Kind ohnehin mit. Sonst kommt es zur Wahl dazu. Ob es das Profil schon gibt, ist
    // egal: `resolveSelectedChildren` nimmt es mit, sobald es da ist.
    setOverride((current) => {
      const base = current !== undefined ? current : restoreSelectedChildren(stored ?? null);
      return base === null ? null : [...base, id];
    });
  }

  return (
    <SelectedChildrenContext.Provider
      value={{ status: ready ? 'ready' : 'loading', childIds, toggleChild, selectChild }}
    >
      {children}
    </SelectedChildrenContext.Provider>
  );
}

export function useSelectedChildren(): SelectedChildrenContextValue {
  const value = useContext(SelectedChildrenContext);
  if (value === null) {
    throw new Error('useSelectedChildren muss innerhalb von SelectedChildrenProvider benutzt werden.');
  }
  return value;
}
