// Standort des Handys, nur im Vordergrund und nur auf Anfrage.
// Hier (und nur hier) berührt die App echte Koordinaten. Sie werden SOFORT auf 2 Nachkommastellen
// gerundet (~1 km, siehe location.ts); alles andere in der App sieht nur den gerundeten Ort.
// Hintergrund-Standort gibt es nicht: weder im Code noch in app.json (Plugin expo-location).

import * as Location from 'expo-location';

import { isValidPlace, roundPlace, type Place } from './location';

// undetermined = noch nie gefragt, denied = abgelehnt (man kann nochmal fragen),
// blocked = abgelehnt und das System fragt nicht mehr (nur noch über die Einstellungen)
export type LocationPermission = 'granted' | 'undetermined' | 'denied' | 'blocked';

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  if (response.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

// Fragt NICHT nach, liest nur den aktuellen Stand.
export async function readPermission(): Promise<LocationPermission> {
  try {
    return toPermission(await Location.getForegroundPermissionsAsync());
  } catch {
    return 'denied';
  }
}

// Zeigt den Dialog des Handys. Vorher soll die App erklärt haben, wofür (LocationExplainer).
export async function askPermission(): Promise<LocationPermission> {
  try {
    return toPermission(await Location.requestForegroundPermissionsAsync());
  } catch {
    return 'denied';
  }
}

// Ein Standort, der höchstens 30 Minuten alt ist, genügt: Das spart Akku und geht schnell.
const lastKnownMaxAgeMs = 30 * 60 * 1000;
// So lange warten wir höchstens auf eine neue Ortung.
const positionTimeoutMs = 6000;

// Gibt `null` zurück, wenn `promise` nicht rechtzeitig fertig wird. Der Zeitgeber wird immer aufgeräumt.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Der gerundete Ort, oder `null`, wenn er sich gerade nicht bestimmen lässt
// (Ortung aus, kein Empfang, keine Erlaubnis). Dann nutzt die App die Auswahl von Hand.
export async function getRoundedPlace(): Promise<Place | null> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return null;
    const known = await Location.getLastKnownPositionAsync({ maxAge: lastKnownMaxAgeMs });
    const position =
      known ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        positionTimeoutMs,
      ));
    if (!position) return null;
    const place = roundPlace({ lat: position.coords.latitude, lon: position.coords.longitude });
    return isValidPlace(place) ? place : null;
  } catch {
    return null;
  }
}
