// Orte (M10b): Entfernung und Anfahrt. Reine Funktionen, ohne UI und ohne Internet.
//
// Gerechnet wird vom gerundeten Standort (2 Nachkommastellen, etwa 1 km, siehe src/features/weather/location.ts).
// Die Entfernung kann deshalb um bis zu etwa 0,7 km abweichen (docs/suggestions.md, „Entfernung und Rundung“).
// Es gibt keinen Routendienst: Die Anfahrt ist eine Schätzung aus der Luftlinie (Regeln aus dem Plan zu M10).

import type { Place } from '../weather/location';

const earthRadiusKm = 6371;

// Luftlinie zwischen zwei Punkten in km (Haversine-Formel).
export function distanceKm(a: Place, b: Place): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Alle Zahlen der Anfahrt an einer Stelle.
export const travelRules = {
  walkBelowKm: 1, // unter etwa 1 km zu Fuß
  walkKmh: 5, // zu Fuß mit 5 km/h, ohne Aufschlag
  roadFactor: 1.3, // Auto: Straße ist länger als die Luftlinie
  carKmh: 45, // Auto: Durchschnitt auf Landstraße und im Ort
  carExtraMinutes: 5, // Auto: Parken, Aussteigen, je Strecke
} as const;

export type TravelMode = 'walk' | 'car';

export type Travel = {
  mode: TravelMode;
  oneWayMinutes: number; // eine Strecke, aufgerundet auf ganze Minuten
  roundTripMinutes: number; // hin und zurück (zählt zur verfügbaren Zeit)
};

// Geschätzte Anfahrt für eine Luftlinie in km.
export function travelFor(km: number): Travel {
  const { walkBelowKm, walkKmh, roadFactor, carKmh, carExtraMinutes } = travelRules;
  const mode: TravelMode = km < walkBelowKm ? 'walk' : 'car';
  const exact = mode === 'walk' ? (km / walkKmh) * 60 : ((km * roadFactor) / carKmh) * 60 + carExtraMinutes;
  const oneWayMinutes = Math.ceil(exact);
  return { mode, oneWayMinutes, roundTripMinutes: 2 * oneWayMinutes };
}
