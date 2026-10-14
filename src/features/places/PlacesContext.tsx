import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { getSupabaseConfig } from '../activities/supabaseConfig';
import { getRoundedPlace, readPermission } from '../weather/getLocation';
import {
  defaultFetchTiles,
  resolvePlaces,
  type PlacesDeps,
  type PlacesSnapshot,
  type PlacesUnavailableReason,
} from './placesRefresh';
import { loadTile, loadTileIndex, removeTiles, saveTile, saveTileIndex } from './placesStorage';

type PlacesState = {
  // idle = noch nichts versucht, loading = läuft, ready = Orte da, unavailable = keine Orte (kein Standort, außerhalb, nichts geladen)
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  snapshot: PlacesSnapshot | null;
  reason: PlacesUnavailableReason | null; // nur bei `unavailable`
};

type PlacesContextValue = PlacesState & {
  // Besorgt die Orte, wenn der Standort schon erlaubt ist. Fragt NIE nach der Erlaubnis (das macht nur der Wetter-Schritt).
  refresh: () => Promise<void>;
};

const PlacesContext = createContext<PlacesContextValue | null>(null);

// Der Standort nur mit schon erteilter Erlaubnis, sofort gerundet (getRoundedPlace). Ohne Erlaubnis geht nichts nach außen.
async function placeIfAllowed() {
  return (await readPermission()) === 'granted' ? getRoundedPlace() : ('noPermission' as const);
}

function defaultDeps(): PlacesDeps {
  return {
    getPlace: placeIfAllowed,
    config: getSupabaseConfig(),
    fetchTiles: defaultFetchTiles,
    store: { loadTile, saveTile, removeTiles, loadIndex: loadTileIndex, saveIndex: saveTileIndex },
    warn: (text) => console.warn(text),
  };
}

// Hält die Orte der Umgebung für die Bildschirme (M10b, docs/orte.md, „Orte in der App“). Nichts wird beim App-Start geholt:
// Erst der Start (nur mit schon erteilter Erlaubnis) und „Eure Ideen“ rufen `refresh` auf (usePlacesRefresh).
// `deps` nur für Tests.
export function PlacesProvider({ children, deps }: { children: ReactNode; deps?: PlacesDeps }) {
  const [state, setState] = useState<PlacesState>({ status: 'idle', snapshot: null, reason: null });
  // Läuft schon ein Abruf, hängen sich weitere Aufrufer daran.
  const inFlight = useRef<Promise<void> | null>(null);
  const depsRef = useRef(deps);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    setState((current) => (current.snapshot ? current : { status: 'loading', snapshot: null, reason: null }));
    const run = resolvePlaces(depsRef.current ?? defaultDeps())
      .then((result) => {
        setState(
          result.kind === 'ready'
            ? { status: 'ready', snapshot: result.snapshot, reason: null }
            : { status: 'unavailable', snapshot: null, reason: result.reason },
        );
      })
      .catch(() => setState({ status: 'unavailable', snapshot: null, reason: 'noData' }))
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, []);

  return <PlacesContext.Provider value={{ ...state, refresh }}>{children}</PlacesContext.Provider>;
}

export function usePlaces(): PlacesContextValue {
  const value = useContext(PlacesContext);
  if (value === null) throw new Error('usePlaces muss innerhalb von PlacesProvider benutzt werden.');
  return value;
}

// Für Bildschirme, die Orte brauchen: beim Öffnen, wenn die App wieder in den Vordergrund kommt, und wenn sich die Erlaubnis
// für den Standort ändert (`trigger`, z. B. nach „Standort erlauben“). Frische Kacheln kosten keinen Abruf, nur einen Blick in den Speicher.
export function usePlacesRefresh(trigger?: unknown): void {
  const { refresh } = usePlaces();
  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh, trigger]);
}
