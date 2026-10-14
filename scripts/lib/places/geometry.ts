// Orte-Import (M10a): Mittelpunkte, Entfernungen und Umrisse (.poly von Geofabrik). Reine Funktionen.

export type LonLat = readonly [number, number]; // Reihenfolge wie in GeoJSON: Länge, Breite
export type Ring = readonly LonLat[];

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Flächenschwerpunkt eines Rings (Shoelace-Formel) und seine Fläche (in Grad², nur zum Vergleichen).
function ringCentroid(ring: Ring): { lon: number; lat: number; area: number } | null {
  if (ring.length < 3) return null;
  let area = 0;
  let cx = 0;
  let cy = 0;
  const [x0, y0] = ring[0];
  for (let i = 0; i < ring.length - 1; i += 1) {
    // Relativ zum ersten Punkt rechnen, das hält die Zahlen klein und genau.
    const xa = ring[i][0] - x0;
    const ya = ring[i][1] - y0;
    const xb = ring[i + 1][0] - x0;
    const yb = ring[i + 1][1] - y0;
    const cross = xa * yb - xb * ya;
    area += cross;
    cx += (xa + xb) * cross;
    cy += (ya + yb) * cross;
  }
  if (Math.abs(area) < 1e-14) {
    // Entartet (z. B. alle Punkte auf einer Linie): Mitte der Punkte.
    const mean = meanOf(ring);
    return mean ? { ...mean, area: 0 } : null;
  }
  return { lon: x0 + cx / (3 * area), lat: y0 + cy / (3 * area), area: Math.abs(area) / 2 };
}

function meanOf(points: readonly LonLat[]): { lon: number; lat: number } | null {
  if (points.length === 0) return null;
  let lon = 0;
  let lat = 0;
  for (const [x, y] of points) {
    lon += x;
    lat += y;
  }
  return { lon: lon / points.length, lat: lat / points.length };
}

type Geometry =
  | { type: 'Point'; coordinates: LonLat }
  | { type: 'LineString'; coordinates: readonly LonLat[] }
  | { type: 'Polygon'; coordinates: readonly Ring[] }
  | { type: 'MultiPolygon'; coordinates: readonly (readonly Ring[])[] };

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isLonLat = (value: unknown): value is LonLat =>
  Array.isArray(value) && value.length >= 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);
const isLine = (value: unknown): value is readonly LonLat[] => Array.isArray(value) && value.every(isLonLat);

// Ein repräsentativer Punkt: Punkt selbst, bei Flächen der Schwerpunkt der äußeren Umrandung
// (bei mehreren Teilflächen der größten), bei Linien der mittlere Punkt der Linie.
export function representativePoint(geometry: unknown): { lat: number; lon: number } | null {
  if (typeof geometry !== 'object' || geometry === null) return null;
  const g = geometry as Geometry;
  switch (g.type) {
    case 'Point':
      return isLonLat(g.coordinates) ? { lon: g.coordinates[0], lat: g.coordinates[1] } : null;
    case 'LineString': {
      if (!isLine(g.coordinates) || g.coordinates.length === 0) return null;
      const middle = g.coordinates[Math.floor(g.coordinates.length / 2)];
      return { lon: middle[0], lat: middle[1] };
    }
    case 'Polygon': {
      const outer = Array.isArray(g.coordinates) ? g.coordinates[0] : undefined;
      const c = isLine(outer) ? ringCentroid(outer) : null;
      return c ? { lon: c.lon, lat: c.lat } : null;
    }
    case 'MultiPolygon': {
      if (!Array.isArray(g.coordinates)) return null;
      let best: { lon: number; lat: number; area: number } | null = null;
      for (const polygon of g.coordinates) {
        const outer = Array.isArray(polygon) ? polygon[0] : undefined;
        const c = isLine(outer) ? ringCentroid(outer) : null;
        if (c && (!best || c.area > best.area)) best = c;
      }
      return best ? { lon: best.lon, lat: best.lat } : null;
    }
    default:
      return null;
  }
}

export function isAreaGeometry(geometry: unknown): boolean {
  const type = (geometry as { type?: unknown } | null)?.type;
  return type === 'Polygon' || type === 'MultiPolygon';
}

// ---------------------------------------------------------------------------------------------
// Umrisse im .poly-Format (Osmosis): Name, dann Abschnitte mit „Länge Breite“ je Zeile und END.
// Abschnitte mit „!“ vor dem Namen sind Löcher. Ein Punkt liegt im Umriss, wenn er in einer
// ungeraden Zahl von Ringen liegt (gerade-ungerade-Regel); so zählen Löcher richtig.
// ---------------------------------------------------------------------------------------------

export type Poly = { name: string; rings: Ring[]; bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number } };

export function parsePoly(text: string): Poly {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const name = lines[0] ?? '';
  const rings: Ring[] = [];
  let current: LonLat[] | null = null;
  for (const line of lines.slice(1)) {
    if (line === '') continue;
    if (current === null) {
      if (line === 'END') break; // Ende der Datei
      current = []; // Kopfzeile eines Abschnitts (Nummer oder Name, ggf. mit „!“)
      continue;
    }
    if (line === 'END') {
      if (current.length >= 3) rings.push(current);
      current = null;
      continue;
    }
    const parts = line.split(/\s+/).map(Number);
    if (parts.length < 2 || !parts.slice(0, 2).every(Number.isFinite)) throw new Error(`Umriss ${name}: ungültige Zeile „${line.slice(0, 40)}“`);
    current.push([parts[0], parts[1]]);
  }
  if (current !== null) throw new Error(`Umriss ${name}: Abschnitt ohne END`);
  if (rings.length === 0) throw new Error(`Umriss ${name}: keine Fläche`);
  const bbox = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      bbox.minLon = Math.min(bbox.minLon, lon);
      bbox.minLat = Math.min(bbox.minLat, lat);
      bbox.maxLon = Math.max(bbox.maxLon, lon);
      bbox.maxLat = Math.max(bbox.maxLat, lat);
    }
  }
  return { name, rings, bbox };
}

function insideRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isInsidePoly(poly: Poly, lat: number, lon: number): boolean {
  const { bbox } = poly;
  if (lon < bbox.minLon || lon > bbox.maxLon || lat < bbox.minLat || lat > bbox.maxLat) return false;
  let inside = false;
  for (const ring of poly.rings) if (insideRing(lon, lat, ring)) inside = !inside;
  return inside;
}
