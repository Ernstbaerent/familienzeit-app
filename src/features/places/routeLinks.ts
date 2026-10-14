// Orte (M10c): Links für „Route öffnen“. Reine Funktionen, ohne UI und ohne Internet.
//
// Die App berechnet keine Route und bindet keine Karte ein: Sie übergibt nur das Ziel (Koordinaten, bei Android auch den Namen)
// an eine Karten-App. Nur dokumentierte Formate (docs/orte.md, „Route und Website (M10c)“, dort auch die Quellen):
//   Android: geo-URI aus „Common intents“ (Android-Doku), Android zeigt dazu „Öffnen mit …“.
//   Apple Karten: „Unified Maps URLs“ (Apple-Doku, ab iOS 18.4), Weg /directions mit `destination` und `mode`.
//   Google Maps: „Maps URLs“ (Google-Doku), /maps/dir/ mit `api=1`, `destination` und `travelmode`.
//     Ist die App installiert, öffnet sie sich, sonst der Browser.
//   OpenStreetMap: Markierung mit `mlat`/`mlon` und `#map=Zoom/Breite/Länge` (OSM-Wiki „Browsing“). Eine Adresse für Routen
//     ist bei OpenStreetMap nicht dokumentiert; der Eintrag heißt deshalb „OpenStreetMap (Karte)“ und verspricht keine Route.
// Für Routen kennen Apple und Google keinen Namen des Ziels: Dort gehen nur die Koordinaten mit (genauer als ein Name).

import { travelFor, type TravelMode } from './travel';

export type RouteTarget = {
  lat: number;
  lon: number;
  label: string; // Name des Ortes, sonst „Spielplatz in Pohlitz“ (wie der Titel)
  mode: TravelMode; // unter 1 km zu Fuß, sonst Auto (dieselbe Regel wie die Anfahrt, travel.ts)
};

// Die drei Dienste im Auswahlmenü auf dem iPhone, in dieser Reihenfolge.
export const mapServices = ['apple', 'google', 'osm'] as const;
export type MapService = (typeof mapServices)[number];

// Zoomstufe der OpenStreetMap-Karte (17 = einzelne Straßen und Gebäude).
const osmZoom = 17;

// Das Ziel eines Ortes: Luftlinie `km` vom gerundeten Standort entscheidet über zu Fuß oder Auto.
export function routeTargetFor(place: { lat: number; lon: number }, label: string, km: number): RouteTarget {
  return { lat: place.lat, lon: place.lon, label, mode: travelFor(km).mode };
}

// Koordinate mit höchstens 6 Nachkommastellen (etwa 10 cm), ohne Exponent und ohne Nullen am Ende: 50.660000 → „50.66“.
export function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Koordinate ist keine Zahl');
  const text = value.toFixed(6).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
}

// Text für eine Adresse: alles außer Buchstaben, Ziffern und - _ . ~ wird kodiert, auch ( ) ! ' *,
// die encodeURIComponent stehen lässt (in der geo-URI begrenzen die Klammern den Namen).
export function encodeText(text: string): string {
  return encodeURIComponent(text).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Android: „geo:0,0?q=lat,lng(label)“ zeigt den Ort mit Beschriftung. Ein Modus ist in der geo-URI nicht vorgesehen.
export function androidGeoUrl(target: RouteTarget): string {
  return `geo:0,0?q=${formatCoordinate(target.lat)},${formatCoordinate(target.lon)}(${encodeText(target.label)})`;
}

// Apple Karten: Route vom aktuellen Standort (ohne `source`) zum Ziel. Komma zwischen den Koordinaten wie in den Beispielen von Apple.
export function appleMapsUrl(target: RouteTarget): string {
  const mode = target.mode === 'walk' ? 'walking' : 'driving';
  return `https://maps.apple.com/directions?destination=${formatCoordinate(target.lat)},${formatCoordinate(target.lon)}&mode=${mode}`;
}

// Google Maps: Route vom aktuellen Standort (ohne `origin`) zum Ziel. Google verlangt das Komma kodiert (%2C).
export function googleMapsUrl(target: RouteTarget): string {
  const travelmode = target.mode === 'walk' ? 'walking' : 'driving';
  const destination = encodeText(`${formatCoordinate(target.lat)},${formatCoordinate(target.lon)}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelmode}`;
}

// OpenStreetMap im Browser: Karte mit roter Markierung am Ziel (keine Route, siehe oben).
export function osmMapUrl(target: RouteTarget): string {
  const lat = formatCoordinate(target.lat);
  const lon = formatCoordinate(target.lon);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${osmZoom}/${lat}/${lon}`;
}

export function mapServiceUrl(service: MapService, target: RouteTarget): string {
  switch (service) {
    case 'apple':
      return appleMapsUrl(target);
    case 'google':
      return googleMapsUrl(target);
    case 'osm':
      return osmMapUrl(target);
  }
}

export type RouteDeps = {
  os: string; // Platform.OS
  openURL: (url: string) => Promise<unknown>;
  // iPhone: Auswahlmenü; `null` = abgebrochen.
  chooseService: () => Promise<MapService | null>;
  // Öffnen ging nicht (z. B. keine Karten-App). Erst danach gibt es einen Hinweis, vorher nie.
  onError: () => void;
};

// „Route öffnen“: auf dem iPhone erst das Menü, sonst (Android) direkt die geo-URI, die Android an eine Karten-App gibt.
// Die App selbst sendet dabei nichts: Das Ziel geht nur an die gewählte Karten-App.
export async function openRoute(target: RouteTarget, deps: RouteDeps): Promise<void> {
  let url: string;
  if (deps.os === 'ios') {
    const service = await deps.chooseService();
    if (service === null) return;
    url = mapServiceUrl(service, target);
  } else {
    url = androidGeoUrl(target);
  }
  try {
    await deps.openURL(url);
  } catch {
    deps.onError();
  }
}
