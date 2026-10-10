import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { loadChildren, saveChildren } from './profileStorage';
import { createChild, type ChildDraft, type ChildProfile } from './profiles';

type ProfilesContextValue = {
  // 'loading' solange die Profile vom Gerät gelesen werden. Erst danach 'ready'.
  status: 'loading' | 'ready';
  profiles: ChildProfile[];
  // Alle drei speichern zuerst auf dem Gerät. Schlägt das fehl, wird ein Fehler geworfen
  // und die Liste bleibt unverändert.
  addChild: (draft: ChildDraft) => Promise<ChildProfile>;
  updateChild: (id: string, draft: ChildDraft) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProfilesContextValue['status']>('loading');
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  // Immer der neueste Stand, damit zwei Änderungen kurz hintereinander nichts überschreiben.
  const latestProfiles = useRef<ChildProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadChildren().then((loaded) => {
      if (cancelled) return;
      latestProfiles.current = loaded;
      setProfiles(loaded);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function commit(next: ChildProfile[]) {
    await saveChildren(next);
    latestProfiles.current = next;
    setProfiles(next);
  }

  async function addChild(draft: ChildDraft) {
    const child = createChild(draft);
    await commit([...latestProfiles.current, child]);
    return child;
  }

  async function updateChild(id: string, draft: ChildDraft) {
    await commit(
      latestProfiles.current.map((child) => (child.id === id ? { ...child, ...draft } : child)),
    );
  }

  async function deleteChild(id: string) {
    await commit(latestProfiles.current.filter((child) => child.id !== id));
  }

  return (
    <ProfilesContext.Provider value={{ status, profiles, addChild, updateChild, deleteChild }}>
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfiles(): ProfilesContextValue {
  const value = useContext(ProfilesContext);
  if (value === null) {
    throw new Error('useProfiles muss innerhalb von ProfilesProvider benutzt werden.');
  }
  return value;
}
