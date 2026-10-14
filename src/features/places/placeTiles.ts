// Orte (M10): festes Raster aus Kacheln. Die App fragt Supabase ab M10b nur nach ganzen Kacheln,
// nie nach ihrem Standort. Eine Kachel ist 0,2° Breite × 0,3° Länge, in Deutschland etwa 22 × 19–23 km.
// Begründung (docs/orte.md, „Kacheln“): grob genug, dass eine Anfrage nur die Gegend verrät, und ein Umkreis von 30 km
// braucht höchstens 4 × 4 Kacheln.
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
