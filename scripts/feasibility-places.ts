/**
 * Machbarkeitstest M2a: Familientaugliche Orte aus OpenStreetMap (Overpass API).
 *
 * NUR EIN TEST, keine App-Funktion. Das Skript vergleicht zwei Orte (Greiz und Reudnitz bei
 * Mohlsdorf-Teichwolframsdorf) jeweils im Umkreis von 5, 15 und 30 km und fasst zusammen, wie viele Orte
 * es pro Kategorie gibt und wie viele davon Öffnungszeiten oder eine Website haben.
 *
 * Start (im Projektordner):
 *   npm run places:test                 # Abfragen + Auswertung (Node 22.18 oder neuer)
 *   npm run places:test -- --offline    # nur aus dem Zwischenspeicher auswerten, kein Netz
 *   npm run places:test -- --refresh    # Zwischenspeicher ignorieren und neu abfragen
 *   npm run places:test -- --selftest   # Rechenfunktionen prüfen, kein Netz
 *
 * Nutzungsregeln der Overpass API (https://wiki.openstreetmap.org/wiki/Overpass_API):
 * - Insgesamt nur 7 Abfragen (1x Ortsmitte, je Ort 3x Umkreis), nacheinander und mit Pause dazwischen.
 * - Vor jeder Abfrage wird /api/status geprüft; ist kein Platz frei, wird höchstens einmal gewartet.
 * - Bei Überlastung (429/502/503/504) gibt es genau einen weiteren Versuch, keine Schleifen.
 * - Antworten landen in scripts/.cache/ (steht in .gitignore). Ein zweiter Lauf fragt nichts mehr ab.
 * - Eigener User-Agent mit Projektbezug.
 *
 * Optional: OVERPASS_URL überschreibt den Server (Standard: https://overpass-api.de/api/interpreter).
 * Es darf eine kommagetrennte Liste sein: Der eine Wiederholungsversuch geht dann an den nächsten Server,
 * ohne Wartezeit. Beispiel:
 *   OVERPASS_URL=https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------------------------

const OVERPASS_URLS = (process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const statusUrl = (url: string) => url.replace(/interpreter\/?$/, 'status');
const hostOf = (url: string) => new URL(url).host;
const USER_AGENT =
  'familienzeit-app-feasibility-test/0.1 (https://github.com/Ernstbaerent/familienzeit-app; Machbarkeitstest, wenige Abfragen)';
const CACHE_DIR = 'scripts/.cache';
const MIN_GAP_MS = 10_000; // Pause zwischen zwei echten Abfragen
const RETRY_WAIT_MS = 60_000; // Wartezeit vor dem einen Wiederholungsversuch
const MAX_SLOT_WAIT_S = 60; // länger warten wir auf einen freien Slot nicht
const REQUEST_TIMEOUT_MS = 150_000;

const RADII = [5, 15, 30] as const;
type Radius = (typeof RADII)[number];

/** Gleiche Namen näher als 150 m gelten als derselbe Ort, namenlose gleicher Art näher als 40 m. */
const SAME_NAMED_KM = 0.15;
const SAME_UNNAMED_KM = 0.04;

type PlaceConfig = {
  id: string;
  label: string;
  nameRegex: string; // Suche nach dem place-Knoten in OSM
  bbox: [number, number, number, number]; // Süd, West, Nord, Ost (Suchfenster für die Ortsmitte)
};

const PLACES: PlaceConfig[] = [
  { id: 'greiz', label: 'Greiz', nameRegex: '^Greiz$', bbox: [50.4, 11.8, 51.0, 12.6] },
  {
    id: 'reudnitz',
    label: 'Reudnitz (Mohlsdorf-Teichwolframsdorf)',
    nameRegex: '^Reudnitz',
    bbox: [50.4, 11.8, 51.0, 12.6],
  },
];

// ---------------------------------------------------------------------------------------------
// Kategorien und OSM-Merkmale
// ---------------------------------------------------------------------------------------------

type CategoryId =
  | 'playground'
  | 'park'
  | 'pool'
  | 'funpark'
  | 'zoo'
  | 'museum'
  | 'sight'
  | 'nature'
  | 'indoor';

/** Ein Wert (genau) oder eine Liste (einer davon; in OSM können Werte mit ; getrennt sein). */
type TagCondition = string | string[];

type Filter = {
  label: string; // Unterart, z. B. "Zoo"
  tags: Record<string, TagCondition>; // alle Bedingungen müssen passen
  exclude?: Record<string, string[]>; // Ausschluss, z. B. access=private
  requireName?: boolean;
  elements?: 'nwr' | 'rel'; // nwr = Punkte, Linien/Flächen, Relationen
};

type Category = { id: CategoryId; label: string; filters: Filter[] };

const NOT_PUBLIC = ['private', 'no', 'customers'];

const CATEGORIES: Category[] = [
  {
    id: 'playground',
    label: 'Spielplätze',
    filters: [
      {
        label: 'Spielplatz',
        tags: { leisure: 'playground' },
        exclude: { access: NOT_PUBLIC, indoor: ['yes'] },
      },
    ],
  },
  {
    id: 'park',
    label: 'Parks',
    filters: [{ label: 'Park', tags: { leisure: 'park' }, exclude: { access: NOT_PUBLIC } }],
  },
  {
    id: 'pool',
    label: 'Schwimm- und Freibäder',
    filters: [
      { label: 'Freizeitbad', tags: { leisure: 'water_park' } },
      {
        label: 'Schwimmbecken (benannt)',
        tags: { leisure: 'swimming_pool' },
        exclude: { access: NOT_PUBLIC },
        requireName: true,
      },
      { label: 'Schwimmbad/Schwimmhalle', tags: { leisure: 'sports_centre', sport: ['swimming'] } },
    ],
  },
  {
    id: 'funpark',
    label: 'Freizeitparks',
    filters: [
      { label: 'Freizeitpark', tags: { tourism: 'theme_park' } },
      { label: 'Minigolf', tags: { leisure: 'miniature_golf' }, exclude: { access: NOT_PUBLIC } },
    ],
  },
  {
    id: 'zoo',
    label: 'Zoos und Tierparks',
    filters: [
      { label: 'Zoo/Tierpark', tags: { tourism: 'zoo' } },
      { label: 'Aquarium', tags: { tourism: 'aquarium' } },
    ],
  },
  {
    id: 'museum',
    label: 'Museen',
    filters: [{ label: 'Museum', tags: { tourism: 'museum' } }],
  },
  {
    id: 'sight',
    label: 'Sehenswürdigkeiten',
    filters: [
      { label: 'Sehenswürdigkeit', tags: { tourism: 'attraction' }, requireName: true },
      { label: 'Aussichtspunkt', tags: { tourism: 'viewpoint' }, requireName: true },
      { label: 'Aussichtsturm', tags: { man_made: 'tower', 'tower:type': 'observation' }, requireName: true },
      { label: 'Burg/Schloss', tags: { historic: 'castle' }, requireName: true },
      { label: 'Ruine', tags: { historic: 'ruins' }, requireName: true },
    ],
  },
  {
    id: 'nature',
    label: 'Naturerlebnisse',
    filters: [
      { label: 'Wanderweg (Route)', tags: { route: 'hiking' }, elements: 'rel' },
      { label: 'Naturschutzgebiet', tags: { leisure: 'nature_reserve' }, requireName: true },
      {
        label: 'See/Teich (benannt)',
        tags: { natural: 'water', water: ['lake', 'reservoir', 'pond'] },
        requireName: true,
      },
      { label: 'Badestelle', tags: { leisure: 'bathing_place' } },
      { label: 'Rastplatz', tags: { tourism: 'picnic_site' } },
    ],
  },
  {
    id: 'indoor',
    label: 'Indoor-Angebote',
    filters: [
      { label: 'Indoorspielplatz', tags: { leisure: 'indoor_play' } },
      { label: 'Spielplatz in der Halle', tags: { leisure: 'playground', indoor: 'yes' }, exclude: { access: NOT_PUBLIC } },
      { label: 'Trampolinhalle', tags: { leisure: 'trampoline_park' } },
      {
        label: 'Kletterhalle',
        tags: { leisure: ['sports_centre', 'sports_hall'], sport: ['climbing', 'bouldering'] },
      },
      { label: 'Bowling/Kegeln', tags: { leisure: 'bowling_alley' } },
      { label: 'Eisbahn', tags: { leisure: 'ice_rink' } },
      { label: 'Escape Game', tags: { leisure: 'escape_game' } },
      { label: 'Kino', tags: { amenity: 'cinema' } },
      { label: 'Bibliothek', tags: { amenity: 'library' } },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Overpass-Abfrage bauen und Treffer zuordnen
// ---------------------------------------------------------------------------------------------

function listRegex(values: string[]): string {
  return `(^|;)(${values.join('|')})(;|$)`;
}

/** Eine Zeile Overpass QL für einen Filter, z. B. nwr["leisure"="playground"](around:5000,50.66,12.20); */
function filterToQl(filter: Filter, radiusM: number, lat: number, lon: number): string {
  const parts: string[] = [];
  for (const [key, cond] of Object.entries(filter.tags)) {
    parts.push(Array.isArray(cond) ? `["${key}"~"${listRegex(cond)}"]` : `["${key}"="${cond}"]`);
  }
  for (const [key, values] of Object.entries(filter.exclude ?? {})) {
    parts.push(`["${key}"!~"${listRegex(values)}"]`);
  }
  if (filter.requireName) parts.push('["name"]');
  return `${filter.elements ?? 'nwr'}${parts.join('')}(around:${radiusM},${lat.toFixed(2)},${lon.toFixed(2)});`;
}

function buildAreaQuery(lat: number, lon: number, radiusKm: number, mode: 'tags' | 'ids'): string {
  const lines = CATEGORIES.flatMap((c) => c.filters.map((f) => `  ${filterToQl(f, radiusKm * 1000, lat, lon)}`));
  const out = mode === 'tags' ? 'out tags center;' : 'out ids;';
  return `[out:json][timeout:90];\n(\n${lines.join('\n')}\n);\n${out}`;
}

/** Eine Abfrage für die Ortsmitten aller Testorte. */
function buildCenterQuery(places: PlaceConfig[]): string {
  const lines = places.map((p) => {
    const [s, w, n, e] = p.bbox;
    return `  node["place"]["name"~"${p.nameRegex}"](${s},${w},${n},${e});`;
  });
  return `[out:json][timeout:30];\n(\n${lines.join('\n')}\n);\nout;`;
}

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OsmElement[];
  remark?: string;
  osm3s?: { timestamp_osm_base?: string }; // Datenstand von OpenStreetMap
  _server?: string; // von uns ergänzt: welcher Server hat geantwortet
};

function tagMatches(value: string | undefined, cond: TagCondition): boolean {
  if (value === undefined) return false;
  if (!Array.isArray(cond)) return value === cond;
  return value.split(';').some((part) => cond.includes(part.trim()));
}

function matchesFilter(tags: Record<string, string>, filter: Filter): boolean {
  for (const [key, cond] of Object.entries(filter.tags)) {
    if (!tagMatches(tags[key], cond)) return false;
  }
  for (const [key, values] of Object.entries(filter.exclude ?? {})) {
    if (tagMatches(tags[key], values)) return false;
  }
  if (filter.requireName && !tags.name?.trim()) return false;
  return true;
}

function hasWebsite(tags: Record<string, string>): boolean {
  return Boolean(tags.website || tags['contact:website'] || tags.url);
}

// ---------------------------------------------------------------------------------------------
// Entfernung, Zusammenfassen von Doppelten
// ---------------------------------------------------------------------------------------------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type Item = {
  key: string; // z. B. "node/123"
  subtype: string;
  name: string | null;
  lat: number | null; // null bei Relationen: der Mittelpunkt wäre irreführend
  lon: number | null;
  hasHours: boolean;
  hasWebsite: boolean;
};

type Cluster = {
  keys: string[];
  subtype: string;
  name: string | null;
  lat: number | null;
  lon: number | null;
  hasHours: boolean;
  hasWebsite: boolean;
};

function sameThing(a: Cluster, b: Item): boolean {
  const bothCoords = a.lat !== null && a.lon !== null && b.lat !== null && b.lon !== null;
  const km = bothCoords ? haversineKm(a.lat!, a.lon!, b.lat!, b.lon!) : null;
  if (a.name && b.name) {
    if (normalizeName(a.name) !== normalizeName(b.name)) return false;
    return km === null || km <= SAME_NAMED_KM;
  }
  if (!a.name && !b.name) {
    return a.subtype === b.subtype && km !== null && km <= SAME_UNNAMED_KM;
  }
  return false;
}

function dedupe(items: Item[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const item of items) {
    const found = clusters.find((c) => sameThing(c, item));
    if (found) {
      found.keys.push(item.key);
      found.hasHours ||= item.hasHours;
      found.hasWebsite ||= item.hasWebsite;
      if (found.lat === null && item.lat !== null) {
        found.lat = item.lat;
        found.lon = item.lon;
      }
    } else {
      clusters.push({
        keys: [item.key],
        subtype: item.subtype,
        name: item.name,
        lat: item.lat,
        lon: item.lon,
        hasHours: item.hasHours,
        hasWebsite: item.hasWebsite,
      });
    }
  }
  return clusters;
}

// ---------------------------------------------------------------------------------------------
// Netzwerk: Status, Zwischenspeicher, Abfrage
// ---------------------------------------------------------------------------------------------

const args = new Set(process.argv.slice(2));
const REFRESH = args.has('--refresh');
const OFFLINE = args.has('--offline');

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let lastRequestAt = 0;

function parseStatus(text: string): { slots: number; waitSeconds: number } {
  // "Rate limit: 0" heißt: keine Begrenzung (z. B. bei overpass.kumi.systems), es ist also immer Platz
  if (/Rate limit: 0\b/.test(text)) return { slots: Infinity, waitSeconds: 0 };
  const slots = Number(/(\d+) slots? available now/.exec(text)?.[1] ?? '0');
  const waitSeconds = Number(/in (\d+) seconds?/.exec(text)?.[1] ?? '0');
  return { slots, waitSeconds };
}

async function waitForFreeSlot(serverUrl: string): Promise<void> {
  let text: string;
  try {
    const res = await fetch(statusUrl(serverUrl), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    // Der Status ist nur ein Hinweis. Ist er nicht lesbar, versuchen wir die Abfrage trotzdem.
    console.log(`  Status nicht lesbar (${error instanceof Error ? error.message : String(error)}), weiter ohne Prüfung.`);
    return;
  }
  const { slots, waitSeconds } = parseStatus(text);
  if (slots > 0) return;
  if (waitSeconds === 0 || waitSeconds > MAX_SLOT_WAIT_S) {
    // zählt wie ein Problem des Servers: der eine Wiederholungsversuch geht dann an den nächsten Server
    throw new Error('Kein freier Platz auf dem Server.');
  }
  console.log(`  Kein Platz frei, warte ${waitSeconds + 1} s ...`);
  await sleep((waitSeconds + 1) * 1000); // einmal warten, dann einfach abfragen
}

/**
 * Genau zwei Versuche. Gibt es mehrere Server, geht der zweite Versuch an den nächsten Server (ohne Wartezeit),
 * sonst an denselben nach RETRY_WAIT_MS.
 */
async function postQuery(query: string): Promise<OverpassResponse> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const serverUrl = OVERPASS_URLS[(attempt - 1) % OVERPASS_URLS.length];
    let problem: string;
    const startedAt = Date.now();
    const after = () => `nach ${((Date.now() - startedAt) / 1000).toFixed(0)} s`;
    try {
      await waitForFreeSlot(serverUrl);
      const res = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const json = (await res.json()) as OverpassResponse;
        if (json.remark && /error|exceeded|timed out/i.test(json.remark)) {
          throw new Error(`Overpass meldet: ${json.remark}`);
        }
        return { ...json, _server: serverUrl };
      }
      const body = (await res.text()).slice(0, 300);
      // Überlastung und Serverfehler (429/500/502/503/504) dürfen einmal wiederholt werden, alles andere nicht
      if (![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`Overpass-Fehler ${res.status}: ${body}`);
      problem = `HTTP ${res.status} ${after()} (${body.replace(/\s+/g, ' ').slice(0, 80)})`;
    } catch (error) {
      if (error instanceof Error && /^Overpass/.test(error.message)) throw error;
      // Netzwerkfehler (Verbindung abgebrochen, Zeitüberschreitung) zählen wie Überlastung
      const text = error instanceof Error ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}` : String(error);
      problem = `${text.trim()} ${after()}`;
    }
    const failed = `${hostOf(serverUrl)}: ${problem}`;
    if (attempt === 2) throw new Error(`Overpass nicht erreichbar – ${failed}`);
    if (OVERPASS_URLS.length > 1) {
      console.log(`  Problem bei ${failed}. Weiter mit ${hostOf(OVERPASS_URLS[1])} ...`);
    } else {
      console.log(`  Problem bei ${failed}. Ein weiterer Versuch in ${RETRY_WAIT_MS / 1000} s ...`);
      await sleep(RETRY_WAIT_MS);
    }
  }
  throw new Error('unerreichbar'); // nur für TypeScript
}

async function runQuery(query: string, label: string): Promise<OverpassResponse> {
  const file = `${CACHE_DIR}/${createHash('sha1').update(query).digest('hex')}.json`;
  if (!REFRESH && existsSync(file)) {
    console.log(`  [Zwischenspeicher] ${label}`);
    return JSON.parse(readFileSync(file, 'utf8')) as OverpassResponse;
  }
  if (OFFLINE) throw new Error(`Offline-Modus, aber "${label}" ist nicht im Zwischenspeicher. Ohne --offline starten.`);

  const gap = lastRequestAt + MIN_GAP_MS - Date.now();
  if (lastRequestAt > 0 && gap > 0) await sleep(gap);
  console.log(`  [Overpass] ${label} ...`);
  const started = Date.now();
  const json = await postQuery(query);
  lastRequestAt = Date.now();
  console.log(`    ${json.elements.length} Elemente in ${((lastRequestAt - started) / 1000).toFixed(1)} s (${hostOf(json._server ?? OVERPASS_URLS[0])})`);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(json));
  return json;
}

// ---------------------------------------------------------------------------------------------
// Auswertung
// ---------------------------------------------------------------------------------------------

type Stats = { count: number; named: number; withHours: number; withWebsite: number; withHoursOrWebsite: number };
type Example = { name: string | null; subtype: string; distanceKm: number | null; hasHours: boolean; hasWebsite: boolean };

type CategoryResult = {
  id: CategoryId;
  label: string;
  stats: Record<Radius, Stats>;
  subtypes: Record<string, Record<Radius, number>>;
  examples: Example[];
};

type PlaceResult = {
  place: PlaceConfig;
  lat: number;
  lon: number;
  categories: CategoryResult[];
  total: Record<Radius, Stats>;
  uniqueTotal: Record<Radius, Stats>;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

function emptyStats(): Stats {
  return { count: 0, named: 0, withHours: 0, withWebsite: 0, withHoursOrWebsite: 0 };
}

function addToStats(s: Stats, c: Cluster): void {
  s.count++;
  if (c.name) s.named++;
  if (c.hasHours) s.withHours++;
  if (c.hasWebsite) s.withWebsite++;
  if (c.hasHours || c.hasWebsite) s.withHoursOrWebsite++;
}

function statsPerRadius(clusters: Cluster[], inRadius: Record<Radius, Set<string>>): Record<Radius, Stats> {
  const result = { 5: emptyStats(), 15: emptyStats(), 30: emptyStats() } as Record<Radius, Stats>;
  for (const c of clusters) {
    for (const r of RADII) {
      if (c.keys.some((k) => inRadius[r].has(k))) addToStats(result[r], c);
    }
  }
  return result;
}

function toItem(el: OsmElement, subtype: string): Item {
  const tags = el.tags ?? {};
  const isRelation = el.type === 'relation';
  const lat = isRelation ? null : (el.lat ?? el.center?.lat ?? null);
  const lon = isRelation ? null : (el.lon ?? el.center?.lon ?? null);
  return {
    key: `${el.type}/${el.id}`,
    subtype,
    name: tags.name?.trim() || null,
    lat,
    lon,
    hasHours: Boolean(tags.opening_hours),
    hasWebsite: hasWebsite(tags),
  };
}

function analyze(
  place: PlaceConfig,
  lat: number,
  lon: number,
  elements: OsmElement[],
  inRadius: Record<Radius, Set<string>>,
): PlaceResult {
  const perCategory = new Map<CategoryId, Item[]>(CATEGORIES.map((c) => [c.id, []]));
  const everything: Item[] = [];
  let unmatched = 0;

  for (const el of elements) {
    const tags = el.tags ?? {};
    let first = true;
    let matchedAny = false;
    for (const cat of CATEGORIES) {
      const filter = cat.filters.find((f) => (f.elements === 'rel' ? el.type === 'relation' : true) && matchesFilter(tags, f));
      if (!filter) continue;
      matchedAny = true;
      const item = toItem(el, filter.label);
      perCategory.get(cat.id)!.push(item);
      if (first) {
        everything.push(item);
        first = false;
      }
    }
    if (!matchedAny) unmatched++;
  }
  if (unmatched > 0) console.warn(`  Warnung: ${unmatched} Treffer passen zu keinem Filter (Abfrage und Zuordnung weichen ab).`);

  const distance = (c: Cluster) => (c.lat !== null && c.lon !== null ? haversineKm(lat, lon, c.lat, c.lon) : null);

  const categories: CategoryResult[] = CATEGORIES.map((cat) => {
    const clusters = dedupe(perCategory.get(cat.id)!);
    const subtypes: Record<string, Record<Radius, number>> = {};
    for (const f of cat.filters) subtypes[f.label] = { 5: 0, 15: 0, 30: 0 };
    for (const c of clusters) {
      for (const r of RADII) {
        if (c.keys.some((k) => inRadius[r].has(k))) subtypes[c.subtype][r]++;
      }
    }
    const examples = clusters
      .filter((c) => c.name)
      .map((c) => ({ c, d: distance(c) }))
      // erst die mit bekannter Entfernung (nächste zuerst), dann Routen ohne Entfernung
      .sort((x, y) => (x.d ?? Infinity) - (y.d ?? Infinity))
      .slice(0, 3)
      .map(({ c, d }) => ({
        name: c.name,
        subtype: c.subtype,
        distanceKm: d === null ? null : Math.round(d * 10) / 10,
        hasHours: c.hasHours,
        hasWebsite: c.hasWebsite,
      }));
    return { id: cat.id, label: cat.label, stats: statsPerRadius(clusters, inRadius), subtypes, examples };
  });

  const total = { 5: emptyStats(), 15: emptyStats(), 30: emptyStats() } as Record<Radius, Stats>;
  for (const cat of categories) {
    for (const r of RADII) {
      for (const k of Object.keys(total[r]) as (keyof Stats)[]) total[r][k] += cat.stats[r][k];
    }
  }
  const uniqueTotal = statsPerRadius(dedupe(everything), inRadius);

  return { place, lat, lon, categories, total, uniqueTotal };
}

// ---------------------------------------------------------------------------------------------
// Ausgabe als Markdown
// ---------------------------------------------------------------------------------------------

const pct = (part: number, whole: number) => (whole === 0 ? '–' : `${Math.round((part / whole) * 100)} %`);
const cell = (text: string) => text.replace(/\|/g, '/');

function renderPlace(r: PlaceResult): string {
  const lines: string[] = [];
  lines.push(`## ${r.place.label} (Mitte ${r.lat.toFixed(2)} / ${r.lon.toFixed(2)})`, '');

  lines.push('### Anzahl pro Kategorie und Umkreis', '');
  lines.push('| Kategorie | 5 km | 15 km | 30 km |', '|---|--:|--:|--:|');
  for (const c of r.categories) lines.push(`| ${c.label} | ${c.stats[5].count} | ${c.stats[15].count} | ${c.stats[30].count} |`);
  lines.push(`| **Summe** | ${r.total[5].count} | ${r.total[15].count} | ${r.total[30].count} |`);
  lines.push(`| Summe ohne Mehrfachzählung | ${r.uniqueTotal[5].count} | ${r.uniqueTotal[15].count} | ${r.uniqueTotal[30].count} |`, '');

  lines.push('### Öffnungszeiten und Website', '');
  lines.push('Anteil der Orte mit Name / mit `opening_hours` / mit Website / mit mindestens einem von beiden.', '');
  lines.push('| Kategorie | Umkreis | Orte | Name | Öffnungszeiten | Website | Zeiten oder Website |', '|---|--:|--:|--:|--:|--:|--:|');
  for (const c of [...r.categories, { label: '**Alle (ohne Mehrfachzählung)**', stats: r.uniqueTotal }]) {
    for (const rad of RADII) {
      const s = c.stats[rad];
      lines.push(
        `| ${rad === 5 ? c.label : ''} | ${rad} km | ${s.count} | ${pct(s.named, s.count)} | ${s.withHours} (${pct(s.withHours, s.count)}) | ${s.withWebsite} (${pct(s.withWebsite, s.count)}) | ${s.withHoursOrWebsite} (${pct(s.withHoursOrWebsite, s.count)}) |`,
      );
    }
  }
  lines.push('');

  lines.push('### Unterarten', '');
  lines.push('| Kategorie | Unterart | 5 km | 15 km | 30 km |', '|---|---|--:|--:|--:|');
  for (const c of r.categories) {
    let firstRow = true;
    for (const [sub, n] of Object.entries(c.subtypes)) {
      lines.push(`| ${firstRow ? c.label : ''} | ${sub} | ${n[5]} | ${n[15]} | ${n[30]} |`);
      firstRow = false;
    }
  }
  lines.push('');

  lines.push('### Beispiele (die 3 nächsten mit Namen)', '');
  lines.push('| Kategorie | Beispiel | Art | Entfernung | Zeiten | Website |', '|---|---|---|--:|:-:|:-:|');
  for (const c of r.categories) {
    if (c.examples.length === 0) lines.push(`| ${c.label} | – | | | | |`);
    c.examples.forEach((e, i) => {
      const dist = e.distanceKm === null ? 'Route' : `${e.distanceKm.toFixed(1)} km`;
      lines.push(
        `| ${i === 0 ? c.label : ''} | ${cell(e.name ?? '')} | ${e.subtype} | ${dist} | ${e.hasHours ? 'ja' : '–'} | ${e.hasWebsite ? 'ja' : '–'} |`,
      );
    });
  }
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------------------------

type Center = { lat: number; lon: number };

const PLACE_RANK = ['city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood', 'locality'];

async function findCenters(): Promise<Map<string, Center>> {
  const centers = new Map<string, Center>();
  const res = await runQuery(buildCenterQuery(PLACES), 'Ortsmitten aller Testorte');
  for (const place of PLACES) {
    const nameRegex = new RegExp(place.nameRegex);
    const nodes = res.elements.filter(
      (e) => e.type === 'node' && e.lat !== undefined && e.lon !== undefined && nameRegex.test(e.tags?.name ?? ''),
    );
    if (nodes.length === 0) throw new Error(`Kein Ort "${place.nameRegex}" in OpenStreetMap gefunden.`);
    const rank = (e: OsmElement) => {
      const i = PLACE_RANK.indexOf(e.tags?.place ?? '');
      return i === -1 ? PLACE_RANK.length : i;
    };
    nodes.sort((a, b) => rank(a) - rank(b));
    const describe = (e: OsmElement) => `${e.tags?.name} (${e.tags?.place}, ${e.lat?.toFixed(4)}/${e.lon?.toFixed(4)})`;
    if (nodes.length > 1 && rank(nodes[0]) === rank(nodes[1])) {
      throw new Error(`Mehrere gleichrangige Treffer für ${place.label}: ${nodes.map(describe).join('; ')}`);
    }
    const best = nodes[0];
    console.log(`  Gefunden: ${describe(best)}${nodes.length > 1 ? ` – weitere Treffer ignoriert: ${nodes.slice(1).map(describe).join('; ')}` : ''}`);
    // Wie später in der App: auf 2 Nachkommastellen (~1 km) runden
    centers.set(place.id, { lat: round2(best.lat!), lon: round2(best.lon!) });
  }
  return centers;
}

async function main(): Promise<void> {
  console.log(`Overpass: ${OVERPASS_URLS.join(', ')}${REFRESH ? ' (neu abfragen)' : ''}${OFFLINE ? ' (offline)' : ''}`);
  console.log('1) Ortsmitten');
  const centers = await findCenters();

  const results: PlaceResult[] = [];
  const servers = new Set<string>();
  const dataStates = new Set<string>();
  for (const place of PLACES) {
    const { lat, lon } = centers.get(place.id)!;
    console.log(`2) ${place.label} (${lat.toFixed(2)} / ${lon.toFixed(2)})`);
    // Kleine Abfragen zuerst: Sie zeigen früh, ob es klappt, und jede Antwort wird sofort zwischengespeichert.
    const ids5 = await runQuery(buildAreaQuery(lat, lon, 5, 'ids'), `${place.label}: 5 km (nur IDs)`);
    const ids15 = await runQuery(buildAreaQuery(lat, lon, 15, 'ids'), `${place.label}: 15 km (nur IDs)`);
    const full = await runQuery(buildAreaQuery(lat, lon, 30, 'tags'), `${place.label}: 30 km mit allen Angaben`);
    for (const res of [ids5, ids15, full]) {
      servers.add(hostOf(res._server ?? OVERPASS_URLS[0]));
      if (res.osm3s?.timestamp_osm_base) dataStates.add(res.osm3s.timestamp_osm_base);
    }
    const toSet = (res: OverpassResponse) => new Set(res.elements.map((e) => `${e.type}/${e.id}`));
    const inRadius: Record<Radius, Set<string>> = { 5: toSet(ids5), 15: toSet(ids15), 30: toSet(full) };
    results.push(analyze(place, lat, lon, full.elements, inRadius));
  }

  const date = new Date().toISOString().slice(0, 10);
  const header =
    `Server: ${[...servers].join(', ')}\n\n` +
    `Datenstand OpenStreetMap: ${[...dataStates].sort().join(', ') || 'unbekannt'}`;
  const report = `# Ergebnis Machbarkeitstest Orte (${date})\n\n${header}\n\n${results.map(renderPlace).join('\n')}`;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(`${CACHE_DIR}/report.md`, report);
  writeFileSync(`${CACHE_DIR}/summary.json`, JSON.stringify(results, null, 2));
  console.log(`\n${report}`);
  console.log(`\nGespeichert: ${CACHE_DIR}/report.md und ${CACHE_DIR}/summary.json`);
}

// ---------------------------------------------------------------------------------------------
// Selbsttest (kein Netz): npm run places:test -- --selftest
// ---------------------------------------------------------------------------------------------

function selftest(): void {
  // Entfernung: 0,1 Grad Länge bei 50,66 Grad Breite sind etwa 7,06 km
  const d = haversineKm(50.66, 12.2, 50.66, 12.3);
  assert.ok(d > 6.9 && d < 7.2, `haversine: ${d}`);
  assert.equal(haversineKm(50, 12, 50, 12), 0);

  // Abfrage-Text
  const ql = filterToQl(CATEGORIES[0].filters[0], 5000, 50.664, 12.201);
  assert.equal(
    ql,
    'nwr["leisure"="playground"]["access"!~"(^|;)(private|no|customers)(;|$)"]["indoor"!~"(^|;)(yes)(;|$)"](around:5000,50.66,12.20);',
  );
  assert.ok(buildAreaQuery(50.66, 12.2, 5, 'ids').endsWith('out ids;'));
  assert.ok(buildAreaQuery(50.66, 12.2, 30, 'tags').includes('rel["route"="hiking"](around:30000'));

  // Zuordnung der Tags
  const climbing = CATEGORIES.find((c) => c.id === 'indoor')!.filters.find((f) => f.label === 'Kletterhalle')!;
  assert.ok(matchesFilter({ leisure: 'sports_centre', sport: 'climbing;fitness' }, climbing));
  assert.ok(!matchesFilter({ leisure: 'sports_centre', sport: 'tennis' }, climbing));
  const pool = CATEGORIES.find((c) => c.id === 'pool')!.filters[1];
  assert.ok(matchesFilter({ leisure: 'swimming_pool', name: 'Freibad Greiz' }, pool));
  assert.ok(!matchesFilter({ leisure: 'swimming_pool' }, pool), 'Becken ohne Namen zählen nicht');
  assert.ok(!matchesFilter({ leisure: 'swimming_pool', name: 'Hotel', access: 'private' }, pool));
  assert.ok(hasWebsite({ 'contact:website': 'https://example.org' }) && !hasWebsite({ name: 'x' }));

  // Doppelte zusammenfassen
  const mk = (key: string, name: string | null, lat: number, lon: number, subtype = 'a', hasHours = false): Item => ({
    key, subtype, name, lat, lon, hasHours, hasWebsite: false,
  });
  const named = dedupe([mk('node/1', 'Freibad Greiz', 50.66, 12.2), mk('way/2', 'freibad  GREIZ', 50.6605, 12.2, 'b', true)]);
  assert.equal(named.length, 1);
  assert.ok(named[0].hasHours && named[0].keys.length === 2, 'Öffnungszeiten werden übernommen');
  assert.equal(dedupe([mk('node/1', 'Spielplatz', 50.66, 12.2), mk('node/2', 'Spielplatz', 50.67, 12.2)]).length, 2);
  assert.equal(dedupe([mk('node/1', null, 50.66, 12.2), mk('way/2', null, 50.6602, 12.2)]).length, 1);
  assert.equal(dedupe([mk('node/1', null, 50.66, 12.2), mk('way/2', null, 50.662, 12.2)]).length, 2);
  assert.equal(dedupe([mk('node/1', null, 50.66, 12.2), mk('way/2', 'Park', 50.66, 12.2)]).length, 2);

  // Status-Text von Overpass
  assert.deepEqual(parseStatus('Rate limit: 4\n4 slots available now.\n'), { slots: 4, waitSeconds: 0 });
  assert.equal(parseStatus('Rate limit: 0\nCurrently running queries (pid, space limit, time limit, start time):\n').slots, Infinity);
  assert.deepEqual(parseStatus('0 slots available now.\nSlot available after: 2026-10-10T12:00:00Z, in 12 seconds.'), {
    slots: 0,
    waitSeconds: 12,
  });

  console.log('Selbsttest bestanden.');
}

if (args.has('--selftest')) {
  selftest();
} else {
  main().catch((error: unknown) => {
    console.error(`\nFehler: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
