// Orte (M10): festes Raster aus Kacheln. Die App fragt Supabase ab M10b nur nach ganzen Kacheln,
// nie nach ihrem Standort. Eine Kachel ist 0,2° Breite × 0,3° Länge, in Deutschland etwa 22 × 19–23 km.
// Begründung (docs/orte.md, „Kacheln“): grob genug, dass eine Anfrage nur die Gegend verrät, und ein Umkreis von 30 km
// braucht meist 12 bis 16 Kacheln (im Norden bis 20).
//
// Gerechnet wird in ganzen Zehnmillionstel Grad, damit Rundungsfehler eine Kachelgrenze nicht verschieben
// (50,6 / 0,2 ergibt als Kommazahl 252,99999…).

const scale = 10_000_000; // 1e-7 Grad, etwa 1 cm
export const tileLatStep = 0.2;
export const tileLonStep = 0.3;
const latStepUnits = 2_000_000; // tileLatStep * scale
const lonStepUnits = 3_000_000; // tileLonStep * scale

export type TileIndex = { row: number; col: number };

export function tileIndexOf(lat: number, lon: number): TileIndex {
  return {
    row: Math.floor(Math.round(lat * scale) / latStepUnits),
    col: Math.floor(Math.round(lon * scale) / lonStepUnits),
  };
}

// Schlüssel wie in der Spalte `tile`, z. B. "253_40" (Greiz).
export function tileKeyOf(lat: number, lon: number): string {
  const { row, col } = tileIndexOf(lat, lon);
  return `${row}_${col}`;
}

export function isTileKey(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d{1,4}_-?\d{1,4}$/.test(value);
}

// Grenzen der Datenlage: Orte gibt es nur in Deutschland (gleiche Grenzen wie die Prüfung einer Zeile in placeRow.ts).
export const germanyBounds = { latMin: 47, latMax: 55.2, lonMin: 5.5, lonMax: 15.3 } as const;

export function isInGermanyBounds(lat: number, lon: number): boolean {
  const { latMin, latMax, lonMin, lonMax } = germanyBounds;
  return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;
}

// Alle Kacheln, die das Rechteck „Standort ± radiusKm“ berühren (M10b). Für 30 km sind das meist 12 bis 16, im Norden bis 4 × 5 = 20 (dort ist eine Kachel schmaler).
// Nur diese Schlüssel gehen an Supabase, nie der Standort selbst (docs/supabase.md, „Was an Supabase geht“).
export function tilesAround(lat: number, lon: number, radiusKm: number): string[] {
  const dLat = radiusKm / 111.2;
  const dLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const low = tileIndexOf(lat - dLat, lon - dLon);
  const high = tileIndexOf(lat + dLat, lon + dLon);
  const keys: string[] = [];
  for (let row = low.row; row <= high.row; row += 1) {
    for (let col = low.col; col <= high.col; col += 1) keys.push(`${row}_${col}`);
  }
  return keys;
}
