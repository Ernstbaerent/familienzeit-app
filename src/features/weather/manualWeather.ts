// Wann fragt die App „Wie ist das Wetter?“ von Hand? Reine Funktion, damit sich die Regel testen lässt.
// `access`: wie es um den Standort steht (siehe weatherService.ts), `checking` = wird gerade gelesen.
// `status`: ob schon Wetterdaten da sind.

import type { LocationAccess } from './weatherService';

export function needsManualWeather(
  access: LocationAccess | 'checking',
  status: 'loading' | 'ready' | 'unavailable',
): boolean {
  // Noch unklar (wird gelesen) oder die Erklär-Karte wartet auf eine Entscheidung: nicht gleichzeitig fragen.
  if (access === 'checking' || access === 'ask') return false;
  // Standort erlaubt: Nur wenn das Wetter nicht zu bekommen ist (kein Internet, außerhalb von Deutschland).
  if (access === 'granted') return status === 'unavailable';
  // „Selbst wählen“ gewählt oder vom Handy abgelehnt.
  return true;
}
