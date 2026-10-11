import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { askPermission } from './getLocation';
import type { WeatherData } from './types';
import { saveLocationDeclined } from './weatherStorage';
import { resolveWeather, type LocationAccess } from './weatherService';

type WeatherState = {
  // checking = wird noch gelesen, sonst wie es um den Standort steht
  access: LocationAccess | 'checking';
  // loading = Abruf läuft und es gibt noch nichts, ready = Daten da, unavailable = kein Wetter vom DWD
  status: 'loading' | 'ready' | 'unavailable';
  data: WeatherData | null;
  stale: boolean; // Daten älter als 30 Minuten, weil sie sich gerade nicht aktualisieren lassen
};

type WeatherContextValue = WeatherState & {
  // Besorgt das Wetter, wenn der Standort erlaubt ist (Zwischenspeicher, sonst Abruf). Fragt nie nach der Erlaubnis.
  refresh: () => Promise<void>;
  // Zeigt den Dialog des Handys. Nur aufrufen, nachdem die App erklärt hat, wofür (LocationExplainer).
  allowLocation: () => Promise<void>;
  // „Wetter selbst wählen“: merkt sich die Entscheidung, damit die Erklär-Karte nicht ständig wiederkommt.
  chooseManualWeather: () => Promise<void>;
};

const WeatherContext = createContext<WeatherContextValue | null>(null);

// Hält den Wetterstand für die Bildschirme. Nichts wird beim App-Start geholt: Erst der Bildschirm
// „Was machen wir?“ ruft `refresh` auf (useWeatherRefresh). Standort nur im Vordergrund.
export function WeatherProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WeatherState>({
    access: 'checking',
    status: 'loading',
    data: null,
    stale: false,
  });
  // Läuft schon ein Abruf, hängen sich weitere Aufrufer daran, statt einen zweiten zu starten.
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    setState((current) => (current.data ? current : { ...current, status: 'loading' }));
    const run = resolveWeather()
      .then((result) => {
        setState(
          result.kind === 'ready'
            ? { access: result.access, status: 'ready', data: result.data, stale: result.stale }
            : { access: result.access, status: 'unavailable', data: null, stale: false },
        );
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, []);

  const allowLocation = useCallback(async () => {
    const permission = await askPermission();
    if (permission === 'granted') await saveLocationDeclined(false).catch(() => undefined);
    // Lief gerade schon ein Abruf (z. B. weil die App nach dem Dialog wieder aktiv wurde), erst dessen Ende abwarten,
    // damit der neue Stand der Erlaubnis sicher gelesen wird.
    if (inFlight.current) await inFlight.current;
    await refresh(); // liest den neuen Stand der Erlaubnis und holt das Wetter
  }, [refresh]);

  const chooseManualWeather = useCallback(async () => {
    await saveLocationDeclined(true).catch(() => undefined);
    setState({ access: 'declined', status: 'unavailable', data: null, stale: false });
  }, []);

  return (
    <WeatherContext.Provider value={{ ...state, refresh, allowLocation, chooseManualWeather }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather(): WeatherContextValue {
  const value = useContext(WeatherContext);
  if (value === null) {
    throw new Error('useWeather muss innerhalb von WeatherProvider benutzt werden.');
  }
  return value;
}

// Für Bildschirme, die das Wetter brauchen: beim Öffnen und wenn die App wieder in den Vordergrund kommt
// (z. B. nach den Einstellungen) das Wetter besorgen. Dank Zwischenspeicher kostet das meist keinen Abruf.
export function useWeatherRefresh(): void {
  const { refresh } = useWeather();
  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
}
