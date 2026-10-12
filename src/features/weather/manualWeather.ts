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

// Der Wetter-Schritt zwischen dem Hauptknopf auf dem Start und den Vorschlägen (DESIGN.md, Entscheidung 7 und 22).
// Er kommt nur, wenn er nötig ist:
//  - 'explain': der Standort wurde noch nie gefragt, zuerst die Erklär-Karte („Standort erlauben“ / „Wetter selbst wählen“)
//  - 'manual': es gibt kein Wetter vom Deutschen Wetterdienst und noch keine Handwahl, ein Tipp auf „Wie ist das Wetter?“ genügt
//  - `null`: kein Schritt, die Vorschläge erscheinen gleich (oder „Wetter wird geprüft“, solange noch gelesen wird)
export type WeatherStep = 'explain' | 'manual' | null;

export function getWeatherStep(
  access: LocationAccess | 'checking',
  status: 'loading' | 'ready' | 'unavailable',
  hasManualChoice: boolean,
): WeatherStep {
  if (access === 'checking') return null;
  // Wer das Wetter schon gewählt hat, wird nicht noch einmal gefragt (der Standort lässt sich oben bei der Wetterzeile erlauben).
  if (hasManualChoice) return null;
  if (access === 'ask') return 'explain';
  return needsManualWeather(access, status) ? 'manual' : null;
}
