// Ort für den Wetterabruf. Reine Funktionen, damit sich das Runden gut testen lässt.
//
// Datenschutz-Regel (CLAUDE.md): Koordinaten werden auf 2 Nachkommastellen (~1 km) gerundet,
// BEVOR sie an einen externen Dienst gehen oder gespeichert werden. Genauere Werte gibt es in dieser App
// nirgends außerhalb von `getRoundedPlace()` (getLocation.ts), das sie sofort rundet.

export type Place = { lat: number; lon: number };

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPlace(place: Place): Place {
  return { lat: roundCoordinate(place.lat), lon: roundCoordinate(place.lon) };
}

// Gültige Breite (−90 bis 90) und Länge (−180 bis 180)?
export function isValidPlace(place: Place): boolean {
  return (
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lon) &&
    Math.abs(place.lat) <= 90 &&
    Math.abs(place.lon) <= 180
  );
}

// Gleicher Ort, wenn die gerundeten Werte gleich sind (also etwa dieselben 1 km).
export function isSamePlace(a: Place, b: Place): boolean {
  const roundedA = roundPlace(a);
  const roundedB = roundPlace(b);
  return roundedA.lat === roundedB.lat && roundedA.lon === roundedB.lon;
}
