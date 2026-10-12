/**
 * Auswahlschritt: Kategorie-Fotos für die Karten suchen (Pixabay-Schnittstelle).
 *
 * KEINE App-Funktion und KEINE Pipeline. Ein einmaliger Schritt, den ein Mensch auslöst, um für die sieben
 * Kategorien (Basteln, Spiel, Bewegung, Experiment, Natur, Kochen, Ausflug) Kandidaten-Fotos zu holen. Danach
 * schaut ein Mensch die Bilder an und wählt aus. Regeln für die Fotos: docs/design/DESIGN.md, Abschnitt „Regeln für Fotos“.
 *
 * Die gewählten Fotos liegen dauerhaft unter assets/images/categories/ (Namensschema kategorie-nummer.jpg), ihre Quellen
 * stehen in docs/bildquellen.md. Die Kandidaten (assets/images/candidates/) und die Prüfseite (docs/bilder-pruefung.md) sind
 * nur Zwischenstufen einer Auswahlrunde: --publish legt sie an, nach der Auswahl werden sie wieder gelöscht.
 *
 * Start (im Projektordner, Node 22 oder neuer, ImageMagick `convert` zum Verkleinern):
 *   npm run photos:find                  # ein Lauf: Suchen, Vorauswahl, Download, Verkleinern
 *   npm run photos:find -- --plan        # nur zeigen, was gesucht würde (kein Netz, kein Schlüssel nötig)
 *   npm run photos:find -- --offline     # nur aus dem Zwischenspeicher auswerten, keine Anfragen, keine Downloads
 *   npm run photos:find -- --publish scripts/.cache/photos/verdicts.json
 *                                        # Befunde übernehmen: bestandene Bilder nach assets/images/candidates/, candidates.json
 *                                        # schreiben, Prüfseite docs/bilder-pruefung.md mit Tabellen anlegen (Zwischenstufe)
 *   npm run photos:find -- --selftest    # Rechenfunktionen prüfen, kein Netz
 *
 * Schlüssel: nur aus der Umgebungsvariable PIXABAY_API_KEY. Er wird nie ausgegeben, nie geloggt, nie
 * zwischengespeichert (der Cache-Schlüssel wird ohne ihn gebildet, Fehlertexte werden bereinigt).
 *
 * Regeln von Pixabay (https://pixabay.com/api/docs/, Nutzungsbedingungen § 8):
 * - 100 Anfragen pro 60 Sekunden; das Skript hält Pausen ein und STOPPT bei knappem X-RateLimit-Remaining.
 * - Antworten müssen 24 Stunden zwischengespeichert werden (scripts/.cache/photos/api/, steht in .gitignore).
 * - Bilder werden heruntergeladen statt dauerhaft verlinkt; frei verfügbar sind höchstens 1280 px (largeImageURL).
 * - Die Schnittstelle ist für menschliche Anfragen gedacht, „systematische Massen-Downloads“ und „Bulk, large-scale
 *   or systematic copying“ sind nicht erlaubt. Darum: genau EIN Lauf (zweiter Start wird verweigert), harte
 *   Obergrenzen (siehe unten) und eine Buchführung (ledger.json), die auch die Probeabfragen davor mitzählt.
 *   Vor einer automatischen Pipeline (M9b) beim Anbieter anfragen oder eine andere Quelle wählen. Sperre und Zähler
 *   liegen nur in scripts/.cache dieses Rechners: Wer neu klont, beginnt bei null und muss die Grenzen und die Regeln von
 *   Pixabay (keine automatisierten Massenabfragen) selbst einhalten.
 * - Pixabay bittet um einen Hinweis zur Herkunft der Bilder („Bilder: Pixabay“, siehe CLAUDE.md).
 *
 * Rahmen: höchstens 25 Suchen und 80 Downloads. Je Kategorie 2 Begriffe normal und 1 Begriff mit editors_choice
 * (21 Suchen); der dritte Begriff ist Reserve für höchstens 3 Kategorien mit zu wenigen Treffern. Bei Fehlern
 * (429, 5xx, Netz) gibt es genau einen weiteren Versuch nach einer Pause, keine Schleifen.
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------------------------

type Category = 'craft' | 'game' | 'movement' | 'experiment' | 'nature' | 'cooking' | 'outing';

const CATEGORY_ORDER: readonly Category[] = [
  'craft',
  'game',
  'movement',
  'experiment',
  'nature',
  'cooking',
  'outing',
];

/** Suchbegriffe: 1 und 2 laufen normal, 1 zusätzlich mit editors_choice, 3 ist Reserve. */
const CATEGORIES: Record<Category, { de: string; terms: readonly [string, string, string] }> = {
  craft: {
    de: 'Basteln',
    terms: ['hands crafting paper', 'watercolor painting hands', 'clay hands'],
  },
  game: {
    de: 'Spiel',
    terms: ['board game top view hands', 'playing cards close-up', 'wooden building blocks'],
  },
  movement: {
    de: 'Bewegung',
    terms: ['bare feet grass', 'jump rope close-up', 'hula hoop'],
  },
  experiment: {
    de: 'Experiment',
    terms: ['science experiment glass hands', 'magnifying glass leaf', 'colorful water glasses'],
  },
  nature: {
    de: 'Natur',
    terms: ['chestnuts autumn leaves hands', 'rubber boots puddle', 'forest path from behind'],
  },
  cooking: {
    de: 'Kochen',
    terms: ['hands kneading dough', 'baking cookies flour', 'cutting vegetables hands'],
  },
  outing: {
    de: 'Ausflug',
    terms: ['picnic blanket meadow', 'hiking boots trail', 'bicycle park path'],
  },
};

const API_URL = 'https://pixabay.com/api/';
const USER_AGENT =
  'familienzeit-app-photo-selection/0.1 (https://github.com/Ernstbaerent/familienzeit-app; einmaliger Auswahlschritt, wenige Anfragen)';

const CACHE_DIR = 'scripts/.cache/photos';
const API_CACHE_DIR = `${CACHE_DIR}/api`;
const RAW_DIR = `${CACHE_DIR}/raw`;
const LEDGER_FILE = `${CACHE_DIR}/ledger.json`;
const SHORTLIST_FILE = `${CACHE_DIR}/shortlist.json`;
const VERDICTS_TEMPLATE_FILE = `${CACHE_DIR}/verdicts.template.json`;
const CANDIDATES_DIR = 'assets/images/candidates';
const CANDIDATES_JSON = `${CANDIDATES_DIR}/candidates.json`;
const REVIEW_DOC = 'docs/bilder-pruefung.md';
const DOC_START = '<!-- tabellen:start -->';
const DOC_END = '<!-- tabellen:ende -->';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Pflicht laut Pixabay-Doku: 24 Stunden
const MAX_SEARCHES = 25; // inklusive der Probeabfrage davor
const MAX_DOWNLOADS = 80; // inklusive der Probe-Downloads davor
const PROBE_SEARCHES = 1; // vorab von Hand gestellt (Erreichbarkeit, Felder der Antwort)
const PROBE_DOWNLOADS = 2; // vorab von Hand geladen (Vorschau + großes Bild)
const RESERVE_SEARCHES = 3;
const SEARCH_GAP_MS = 2_000; // Pause zwischen zwei echten Suchen
const DOWNLOAD_GAP_MS = 1_500; // Pause zwischen zwei Downloads
const RETRY_WAIT_MS = 10_000; // Wartezeit vor dem einen Wiederholungsversuch
const MAX_RATE_WAIT_MS = 65_000; // bei 429 nie länger als ein Limit-Fenster warten
const MIN_RATE_REMAINING = 20; // darunter: Stopp
const MAX_DOWNLOAD_FAILURES_IN_A_ROW = 3;
const REQUEST_TIMEOUT_MS = 45_000;

const PER_PAGE = 40;
const MIN_WIDTH = 1200; // Original mindestens so breit (frei verfügbar sind höchstens 1280 px)
const MIN_RATIO = 1.3; // deutlich Querformat
const PER_CATEGORY = 10; // so viele Kandidaten je Kategorie werden geladen
const MAX_PER_PHOTOGRAPHER = 3; // je Kategorie
const FIRST_POSSIBLE_AI_YEAR = 2022; // Uploads davor können nicht KI-generiert sein (zusätzliche Sicherheit)

const TARGET_WIDTH = 1200;
const JPEG_QUALITIES = [82, 74, 66] as const; // höchstens drei Versuche, die erste Stufe unter dem Limit gewinnt
const MAX_BYTES = 250_000; // „deutlich unter 300 KB“

const LICENSE = 'Pixabay Content License';
const LICENSE_URL = 'https://pixabay.com/service/license-summary/';

/** Wörter in den Tags, die auf Personen hindeuten. Treffer werden ausgeschlossen (Regel: keine Gesichter). */
const PERSON_WORDS = new Set([
  'man', 'men', 'woman', 'women', 'girl', 'girls', 'boy', 'boys', 'child', 'children', 'kid', 'kids',
  'baby', 'babies', 'toddler', 'toddlers', 'people', 'person', 'persons', 'portrait', 'face', 'faces',
  'family', 'mother', 'father', 'mom', 'mum', 'dad', 'parents', 'couple', 'lady', 'female', 'male', 'guy',
  'teen', 'teenager', 'teenagers', 'student', 'students', 'selfie', 'smile', 'smiling', 'friends',
  'friend', 'bride', 'groom', 'adult', 'adults', 'daughter', 'son', 'grandmother', 'grandfather',
  'grandma', 'grandpa', 'senior', 'seniors', 'youth',
]);

/** Wörter in den Tags, die auf Marken, Logos, Verpackungen oder Text im Bild hindeuten. */
const BRAND_TEXT_WORDS = new Set([
  'logo', 'logos', 'brand', 'brands', 'trademark', 'label', 'labels', 'packaging', 'package', 'packet',
  'newspaper', 'poster', 'alphabet', 'letters', 'abc', 'typography', 'text', 'sign', 'signs', 'advertising',
  'lego', 'duplo', 'playmobil', 'monopoly', 'scrabble', 'uno', 'ravensburger', 'catan', 'barbie', 'nintendo',
  'minecraft', 'coca', 'cola', 'nutella',
]);

// ---------------------------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------------------------

type Hit = {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  user: string;
  user_id: number;
  userURL?: string;
  likes: number;
  downloads: number;
  isAiGenerated?: boolean;
  isLowQuality?: boolean;
  isGRated?: boolean;
};

type SearchSpec = { category: Category; term: string; editorsChoice: boolean; reserve: boolean };

type Candidate = { hit: Hit; category: Category; editorsChoice: boolean; terms: string[] };

type ApiCacheEntry = { fetchedAt: number; params: Record<string, string>; total: number; hits: Hit[] };

type Ledger = { searches: number; downloads: number };

type ShortItem = {
  key: string; // z. B. craft-2032813, zugleich Dateiname ohne Endung
  category: Category;
  id: number;
  file: string; // Pfad der verkleinerten Datei im Zwischenspeicher
  bytes: number;
  width: number;
  height: number;
  overSize: boolean;
  downloadedAt: string; // Datum, YYYY-MM-DD
  uploadYear: number | null;
  editorsChoice: boolean;
  terms: string[];
  pageUrl: string;
  photographer: string;
  photographerUrl: string | null;
  tags: string;
  isAiGenerated: boolean;
  isLowQuality: boolean;
  isGRated: boolean;
};

type Tri = 'nein' | 'ja' | 'unklar';
type Verdict = { keep: boolean; recommend: boolean; faces: Tri; brands: Tri; text: Tri; note: string };

// ---------------------------------------------------------------------------------------------
// Kleine Hilfen
// ---------------------------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const sha1 = (text: string) => createHash('sha1').update(text).digest('hex');
const today = () => new Date().toISOString().slice(0, 10);

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Entfernt den Schlüssel aus Texten, bevor sie ausgegeben werden. */
function redact(text: string, apiKey: string | null = process.env.PIXABAY_API_KEY ?? null): string {
  let out = text.replace(/key=[^&\s"']+/gi, 'key=***');
  if (apiKey) out = out.split(apiKey).join('***');
  return out;
}

/** Cache-Schlüssel nur aus den Suchparametern, ohne den API-Schlüssel. */
function cacheKey(params: Record<string, string>): string {
  return sha1(JSON.stringify(Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1))));
}

/** Das Upload-Jahr steckt im CDN-Pfad: …/photo/2017/02/02/13/55/…; sonst null. */
function uploadYear(previewURL: string): number | null {
  const match = /\/photo\/(\d{4})\/\d{2}\/\d{2}\//.exec(previewURL);
  return match ? Number(match[1]) : null;
}

const words = (tags: string) => tags.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean);

function findWord(tags: string, list: Set<string>): string | null {
  return words(tags).find((word) => list.has(word)) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Vorauswahl und Rangfolge (reine Funktionen, mit --selftest geprüft)
// ---------------------------------------------------------------------------------------------

/** Gibt den Grund zurück, warum ein Treffer nicht in Frage kommt, oder null, wenn er passt. */
function rejectReason(hit: Hit): string | null {
  if (hit.type !== 'photo') return 'kein Foto';
  if (hit.isAiGenerated !== false) return 'KI-generiert oder Angabe fehlt';
  if (hit.isLowQuality !== false) return 'niedrige Qualität oder Angabe fehlt';
  if (hit.isGRated !== true) return 'nicht für alle Altersgruppen oder Angabe fehlt';
  if (hit.imageWidth < MIN_WIDTH) return 'zu klein';
  if (hit.imageWidth / hit.imageHeight < MIN_RATIO) return 'kein deutliches Querformat';
  const person = findWord(hit.tags, PERSON_WORDS);
  if (person) return `Personen-Tag (${person})`;
  const brand = findWord(hit.tags, BRAND_TEXT_WORDS);
  if (brand) return `Marken-/Text-Tag (${brand})`;
  return null;
}

/** Je höher, desto früher. Redaktionsempfehlung vor altem Upload vor Beliebtheit. */
function score(candidate: Candidate): number {
  const year = uploadYear(candidate.hit.previewURL);
  return (
    (candidate.editorsChoice ? 1000 : 0) +
    (year !== null && year < FIRST_POSSIBLE_AI_YEAR ? 500 : 0) +
    Math.log10(1 + candidate.hit.likes) * 20 +
    Math.log10(1 + candidate.hit.downloads) * 10
  );
}

/** Die besten n, höchstens `perUser` je Fotograf, ohne bereits vergebene IDs. */
function pickTop(candidates: Candidate[], n: number, perUser: number, taken: Set<number>): Candidate[] {
  const sorted = [...candidates].sort((a, b) => score(b) - score(a) || a.hit.id - b.hit.id);
  const perUserCount = new Map<string, number>();
  const picked: Candidate[] = [];
  for (const candidate of sorted) {
    if (picked.length >= n) break;
    if (taken.has(candidate.hit.id)) continue;
    const count = perUserCount.get(candidate.hit.user) ?? 0;
    if (count >= perUser) continue;
    perUserCount.set(candidate.hit.user, count + 1);
    picked.push(candidate);
  }
  return picked;
}

function buildPlan(): SearchSpec[] {
  const plan: SearchSpec[] = [];
  for (const category of CATEGORY_ORDER) {
    const [first, second] = CATEGORIES[category].terms;
    plan.push({ category, term: first, editorsChoice: false, reserve: false });
    plan.push({ category, term: second, editorsChoice: false, reserve: false });
    plan.push({ category, term: first, editorsChoice: true, reserve: false });
  }
  return plan;
}

function searchParams(spec: SearchSpec): Record<string, string> {
  const params: Record<string, string> = {
    q: spec.term,
    image_type: 'photo',
    orientation: 'horizontal',
    safesearch: 'true',
    min_width: String(MIN_WIDTH),
    order: 'popular',
    per_page: String(PER_PAGE),
  };
  if (spec.editorsChoice) params.editors_choice = 'true';
  return params;
}

const describe = (spec: SearchSpec) =>
  `${spec.category} „${spec.term}“${spec.editorsChoice ? ' [editors_choice]' : ''}${spec.reserve ? ' [Reserve]' : ''}`;

// ---------------------------------------------------------------------------------------------
// Buchführung und Netzwerk
// ---------------------------------------------------------------------------------------------

class Budget {
  private ledger: Ledger;
  constructor() {
    this.ledger = existsSync(LEDGER_FILE)
      ? readJson<Ledger>(LEDGER_FILE)
      : { searches: PROBE_SEARCHES, downloads: PROBE_DOWNLOADS };
  }
  spend(kind: 'search' | 'download') {
    const key = kind === 'search' ? 'searches' : 'downloads';
    const max = kind === 'search' ? MAX_SEARCHES : MAX_DOWNLOADS;
    if (this.ledger[key] >= max) {
      throw new Error(`Obergrenze erreicht: schon ${this.ledger[key]} von höchstens ${max} (${key}), Abbruch.`);
    }
    this.ledger[key] += 1;
    writeJson(LEDGER_FILE, this.ledger);
  }
  get left() {
    return {
      searches: MAX_SEARCHES - this.ledger.searches,
      downloads: MAX_DOWNLOADS - this.ledger.downloads,
    };
  }
  get used() {
    return { ...this.ledger };
  }
}

type Attempt =
  | { ok: true; res: Response }
  | { ok: false; retryable: boolean; waitMs: number; message: string };

class Net {
  rateRemaining: number | null = null;
  private readonly budget: Budget;
  private readonly apiKey: string;
  // Keine Kurzschreibweise im Konstruktor: --experimental-strip-types kennt sie nicht.
  constructor(budget: Budget, apiKey: string) {
    this.budget = budget;
    this.apiKey = apiKey;
  }

  /** Wirft, wenn X-RateLimit-Remaining zu knapp ist. */
  private guardRate() {
    if (this.rateRemaining !== null && this.rateRemaining < MIN_RATE_REMAINING) {
      throw new Error(
        `Stopp: X-RateLimit-Remaining ist nur noch ${this.rateRemaining} (Grenze ${MIN_RATE_REMAINING}). Nach etwa einer Minute erneut starten, der Zwischenspeicher spart die schon gemachten Suchen.`,
      );
    }
  }

  private async once(kind: 'search' | 'download', url: string, what: string): Promise<Attempt> {
    this.guardRate();
    this.budget.spend(kind);
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, retryable: true, waitMs: RETRY_WAIT_MS, message: `${what}: Netzwerkfehler (${redact(message, this.apiKey)})` };
    }
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining !== null && Number.isFinite(Number(remaining))) this.rateRemaining = Number(remaining);
    if (res.ok) return { ok: true, res };
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    const waitMs =
      res.status === 429 && Number.isFinite(reset) && reset > 0
        ? Math.min((reset + 1) * 1000, MAX_RATE_WAIT_MS)
        : RETRY_WAIT_MS;
    await res.body?.cancel();
    return {
      ok: false,
      retryable: res.status === 429 || res.status >= 500,
      waitMs,
      message: `${what}: HTTP ${res.status}`,
    };
  }

  /** Eine Anfrage, bei Bedarf genau ein Wiederholungsversuch nach einer Pause. */
  async request(kind: 'search' | 'download', url: string, what: string): Promise<Response> {
    const first = await this.once(kind, url, what);
    if (first.ok) return first.res;
    if (!first.retryable) throw new Error(first.message);
    console.log(`  ! ${first.message}, ein neuer Versuch in ${Math.round(first.waitMs / 1000)} s`);
    await sleep(first.waitMs);
    const second = await this.once(kind, url, what);
    if (second.ok) return second.res;
    throw new Error(`${second.message} (auch beim zweiten Versuch)`);
  }

  async search(spec: SearchSpec): Promise<ApiCacheEntry> {
    const params = searchParams(spec);
    const url = new URL(API_URL);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    url.searchParams.set('key', this.apiKey);
    const res = await this.request('search', url.toString(), describe(spec));
    const body = (await res.json()) as { total?: number; hits?: Hit[] };
    if (!Array.isArray(body.hits)) throw new Error(`${describe(spec)}: unerwartete Antwort (kein hits-Feld)`);
    return { fetchedAt: Date.now(), params, total: body.total ?? body.hits.length, hits: body.hits };
  }

  async download(hit: Hit, dest: string): Promise<void> {
    const res = await this.request('download', hit.largeImageURL, `Download ${hit.id}`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) {
      throw new Error(`Download ${hit.id}: kein Bild erhalten (${type || 'ohne Typ'}), vermutlich Cloudflare-Abfrage`);
    }
    ensureDir(dirname(dest));
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }
}

function readApiCache(spec: SearchSpec, allowExpired: boolean): ApiCacheEntry | null {
  const file = `${API_CACHE_DIR}/${cacheKey(searchParams(spec))}.json`;
  if (!existsSync(file)) return null;
  const entry = readJson<ApiCacheEntry>(file);
  return allowExpired || Date.now() - entry.fetchedAt < CACHE_TTL_MS ? entry : null;
}

function writeApiCache(spec: SearchSpec, entry: ApiCacheEntry) {
  writeJson(`${API_CACHE_DIR}/${cacheKey(searchParams(spec))}.json`, entry);
}

// ---------------------------------------------------------------------------------------------
// Bilder verkleinern (ImageMagick)
// ---------------------------------------------------------------------------------------------

function hasConvert(): boolean {
  try {
    execFileSync('convert', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Verkleinert auf 1200 px Breite, entfernt Metadaten, probiert höchstens drei Qualitätsstufen. */
function shrink(src: string, dest: string, convertAvailable: boolean) {
  ensureDir(dirname(dest));
  if (!convertAvailable) {
    copyFileSync(src, dest);
  } else {
    const tmp = `${dest}.tmp.jpg`;
    for (const quality of JPEG_QUALITIES) {
      execFileSync('convert', [
        src, '-auto-orient', '-resize', `${TARGET_WIDTH}x>`, '-strip',
        '-sampling-factor', '4:2:0', '-interlace', 'Plane', '-quality', String(quality), tmp,
      ]);
      if (statSync(tmp).size <= MAX_BYTES) break;
    }
    renameSync(tmp, dest);
  }
  const bytes = statSync(dest).size;
  let width = 0;
  let height = 0;
  if (convertAvailable) {
    const [w, h] = execFileSync('convert', [dest, '-format', '%w %h', 'info:']).toString().split(' ').map(Number);
    width = w;
    height = h;
  }
  return { bytes, width, height, overSize: bytes > MAX_BYTES };
}

// ---------------------------------------------------------------------------------------------
// Lauf: Suchen, Vorauswahl, Download
// ---------------------------------------------------------------------------------------------

function addHits(pool: Map<Category, Map<number, Candidate>>, spec: SearchSpec, hits: Hit[]) {
  const map = pool.get(spec.category) ?? new Map<number, Candidate>();
  pool.set(spec.category, map);
  for (const hit of hits) {
    const existing = map.get(hit.id);
    if (existing) {
      existing.editorsChoice ||= spec.editorsChoice;
      if (!existing.terms.includes(spec.term)) existing.terms.push(spec.term);
    } else {
      map.set(hit.id, { hit, category: spec.category, editorsChoice: spec.editorsChoice, terms: [spec.term] });
    }
  }
}

function eligible(map: Map<number, Candidate> | undefined) {
  const passed: Candidate[] = [];
  const reasons = new Map<string, number>();
  for (const candidate of map?.values() ?? []) {
    const reason = rejectReason(candidate.hit);
    if (reason === null) {
      passed.push(candidate);
    } else {
      const group = reason.replace(/ \(.*\)$/, ''); // „Personen-Tag (girl)“ zählt als „Personen-Tag“
      reasons.set(group, (reasons.get(group) ?? 0) + 1);
    }
  }
  return { passed, reasons };
}

async function run(options: { offline: boolean }) {
  if (!options.offline && existsSync(SHORTLIST_FILE)) {
    throw new Error(
      `Es gab schon einen Lauf (${SHORTLIST_FILE}). Vorgabe: genau ein Lauf. Zum bewussten Wiederholen die Datei von Hand löschen.`,
    );
  }
  const apiKey = process.env.PIXABAY_API_KEY ?? '';
  if (!options.offline && !apiKey) throw new Error('PIXABAY_API_KEY ist nicht gesetzt.');
  const convertAvailable = hasConvert();
  if (!convertAvailable) console.log('Hinweis: ImageMagick (`convert`) fehlt, die Bilder werden NICHT verkleinert.');

  const budget = new Budget();
  const net = new Net(budget, apiKey);
  const pool = new Map<Category, Map<number, Candidate>>();
  let networkSearches = 0;

  const searchOne = async (spec: SearchSpec) => {
    const cached = readApiCache(spec, options.offline);
    if (cached) {
      console.log(`  Zwischenspeicher: ${describe(spec)} (${cached.hits.length} Treffer)`);
      addHits(pool, spec, cached.hits);
      return;
    }
    if (options.offline) {
      console.log(`  fehlt im Zwischenspeicher: ${describe(spec)}`);
      return;
    }
    if (networkSearches > 0) await sleep(SEARCH_GAP_MS);
    networkSearches += 1;
    const entry = await net.search(spec);
    writeApiCache(spec, entry);
    console.log(`  Suche: ${describe(spec)} (${entry.hits.length} von ${entry.total} Treffern, Limit übrig: ${net.rateRemaining ?? '?'})`);
    addHits(pool, spec, entry.hits);
  };

  console.log(`Suchen (geplant: ${buildPlan().length}, Reserve bis ${RESERVE_SEARCHES}, noch frei: ${budget.left.searches})`);
  for (const spec of buildPlan()) await searchOne(spec);

  // Reserve: dritter Begriff, höchstens für die RESERVE_SEARCHES Kategorien mit den wenigsten passenden Treffern
  const thin = CATEGORY_ORDER.map((category) => ({ category, n: eligible(pool.get(category)).passed.length }))
    .filter(({ n }) => n < PER_CATEGORY)
    .sort((a, b) => a.n - b.n)
    .slice(0, RESERVE_SEARCHES);
  for (const { category } of thin) {
    await searchOne({ category, term: CATEGORIES[category].terms[2], editorsChoice: false, reserve: true });
  }

  // Vorauswahl und Auswahl der Kandidaten
  console.log('\nVorauswahl nach Angaben (Treffer → passend):');
  const taken = new Set<number>();
  const picks: Candidate[] = [];
  for (const category of CATEGORY_ORDER) {
    const { passed, reasons } = eligible(pool.get(category));
    const total = pool.get(category)?.size ?? 0;
    const chosen = pickTop(passed, PER_CATEGORY, MAX_PER_PHOTOGRAPHER, taken);
    for (const candidate of chosen) taken.add(candidate.hit.id);
    picks.push(...chosen);
    const why = [...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${reason}: ${n}`).join(', ');
    console.log(`  ${CATEGORIES[category].de.padEnd(10)} ${total} → ${passed.length}, gewählt ${chosen.length}  (aussortiert: ${why || '–'})`);
  }

  if (options.offline) {
    console.log('\n--offline: keine Downloads.');
    return;
  }
  if (picks.length > budget.left.downloads) {
    throw new Error(`Zu viele Downloads geplant (${picks.length}), frei sind ${budget.left.downloads}. Abbruch vor dem ersten Download.`);
  }

  // Downloads, nacheinander und mit Pause
  console.log(`\nDownloads (${picks.length}, frei: ${budget.left.downloads}, Pause ${DOWNLOAD_GAP_MS / 1000} s)`);
  const items: ShortItem[] = [];
  let failuresInARow = 0;
  for (const [index, candidate] of picks.entries()) {
    const { hit, category } = candidate;
    const key = `${category}-${hit.id}`;
    const dest = `${RAW_DIR}/${category}/${key}.jpg`;
    const original = `${dest}.original`;
    if (index > 0) await sleep(DOWNLOAD_GAP_MS);
    try {
      await net.download(hit, original);
      const result = shrink(original, dest, convertAvailable);
      rmSync(original, { force: true });
      failuresInARow = 0;
      items.push({
        key, category, id: hit.id, file: dest, ...result, downloadedAt: today(),
        uploadYear: uploadYear(hit.previewURL), editorsChoice: candidate.editorsChoice, terms: candidate.terms,
        pageUrl: hit.pageURL, photographer: hit.user, photographerUrl: hit.userURL ?? null, tags: hit.tags,
        isAiGenerated: hit.isAiGenerated === true, isLowQuality: hit.isLowQuality === true, isGRated: hit.isGRated === true,
      });
      console.log(`  ✓ ${key}  ${result.width}×${result.height}, ${Math.round(result.bytes / 1024)} KB${result.overSize ? '  (ÜBER dem Limit)' : ''}`);
    } catch (error) {
      rmSync(original, { force: true });
      failuresInARow += 1;
      console.log(`  ✗ ${key}: ${redact(error instanceof Error ? error.message : String(error), apiKey)}`);
      if (failuresInARow >= MAX_DOWNLOAD_FAILURES_IN_A_ROW) {
        throw new Error('Stopp: drei Downloads hintereinander fehlgeschlagen, vermutlich gesperrt. Schon geladene Bilder bleiben im Zwischenspeicher.');
      }
    }
  }

  writeJson(SHORTLIST_FILE, items);
  const template: Record<string, Verdict> = {};
  for (const item of items) {
    template[item.key] = { keep: false, recommend: false, faces: 'unklar', brands: 'unklar', text: 'unklar', note: '' };
  }
  writeJson(VERDICTS_TEMPLATE_FILE, template);
  console.log(`\nFertig: ${items.length} Bilder in ${RAW_DIR}/, Liste in ${SHORTLIST_FILE}.`);
  console.log(`Verbraucht insgesamt (mit Probe): ${budget.used.searches} von ${MAX_SEARCHES} Suchen, ${budget.used.downloads} von ${MAX_DOWNLOADS} Downloads.`);
}

// ---------------------------------------------------------------------------------------------
// Befunde übernehmen (--publish)
// ---------------------------------------------------------------------------------------------

function validateVerdicts(items: ShortItem[], verdicts: Record<string, Verdict>): string[] {
  const errors: string[] = [];
  const keys = new Set(items.map((item) => item.key));
  for (const key of Object.keys(verdicts)) if (!keys.has(key)) errors.push(`Befund ohne Bild: ${key}`);
  const keepCount = new Map<Category, number>();
  const recommendCount = new Map<Category, number>();
  for (const item of items) {
    const verdict = verdicts[item.key];
    if (!verdict) {
      errors.push(`Kein Befund für ${item.key}`);
      continue;
    }
    if (!verdict.note.trim()) errors.push(`${item.key}: note fehlt`);
    if (verdict.keep) {
      for (const field of ['faces', 'brands', 'text'] as const) {
        if (verdict[field] !== 'nein') errors.push(`${item.key}: ${field} ist „${verdict[field]}“, dann gilt raus (keep muss false sein)`);
      }
      keepCount.set(item.category, (keepCount.get(item.category) ?? 0) + 1);
    }
    if (verdict.recommend && !verdict.keep) errors.push(`${item.key}: empfohlen, aber nicht behalten`);
    if (verdict.recommend) recommendCount.set(item.category, (recommendCount.get(item.category) ?? 0) + 1);
  }
  for (const [category, n] of keepCount) if (n > PER_CATEGORY) errors.push(`${category}: ${n} behalten, erlaubt sind ${PER_CATEGORY}`);
  for (const [category, n] of recommendCount) if (n > 4) errors.push(`${category}: ${n} empfohlen, erlaubt sind 4`);
  return errors;
}

const cell = (text: string) => text.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

function buildTables(items: ShortItem[], verdicts: Record<string, Verdict>): string {
  const lines: string[] = [];
  for (const category of CATEGORY_ORDER) {
    const own = items.filter((item) => item.category === category);
    const kept = own.filter((item) => verdicts[item.key].keep);
    const rejected = own.filter((item) => !verdicts[item.key].keep);
    const recommended = kept.filter((item) => verdicts[item.key].recommend).length;
    kept.sort((a, b) => Number(verdicts[b.key].recommend) - Number(verdicts[a.key].recommend) || a.id - b.id);
    lines.push(`### ${CATEGORIES[category].de} (\`${category}\`)`, '');
    lines.push(`Geladen: ${own.length} · bestanden: ${kept.length} · empfohlen: ${recommended} · aussortiert: ${rejected.length}`, '');
    if (kept.length === 0) {
      lines.push('_Kein Bild hat die Regeln bestanden._', '');
    } else {
      lines.push('| Vorschau | Datei | Fotograf | Foto-Seite | Befund | Empfehlung |', '| --- | --- | --- | --- | --- | --- |');
      for (const item of kept) {
        const verdict = verdicts[item.key];
        const path = `../${CANDIDATES_DIR}/${category}/${item.key}.jpg`;
        const finding = `Gesichter: ${verdict.faces} · Marken: ${verdict.brands} · Text: ${verdict.text}. ${cell(verdict.note)}`;
        lines.push(
          `| <img src="${path}" width="240" alt="${cell(CATEGORIES[category].de)} ${item.id}"> | \`${item.key}.jpg\` | [${cell(item.photographer)}](${item.photographerUrl ?? item.pageUrl}) | [Pixabay ${item.id}](${item.pageUrl}) | ${finding} | ${verdict.recommend ? '**empfohlen**' : '–'} |`,
        );
      }
      lines.push('');
    }
    if (rejected.length > 0) {
      lines.push(`<details><summary>Aussortiert (${rejected.length})</summary>`, '');
      for (const item of rejected) lines.push(`- [${item.id}](${item.pageUrl}): ${cell(verdicts[item.key].note)}`);
      lines.push('', '</details>', '');
    }
  }
  return lines.join('\n');
}

/** Rumpf der Prüfseite, falls es sie nicht (mehr) gibt: nur Titel und Marker, die Tabellen setzt --publish ein. */
function reviewDocSkeleton(): string {
  return [
    '# Foto-Auswahl für die Kategorie-Karten (Prüfseite)',
    '',
    'Zwischenstufe einer Auswahlrunde: Kandidaten unter `assets/images/candidates/`. Nach der Auswahl gehören die gewählten Fotos',
    'nach `assets/images/categories/` (Namen `kategorie-nummer.jpg`) und ihre Quellen nach `docs/bildquellen.md`. Danach werden diese',
    'Seite und der Ordner `candidates` wieder gelöscht.',
    '',
    DOC_START,
    DOC_END,
    '',
  ].join('\n');
}

function publish(verdictsPath: string) {
  const items = readJson<ShortItem[]>(SHORTLIST_FILE);
  const verdicts = readJson<Record<string, Verdict>>(verdictsPath);
  const errors = validateVerdicts(items, verdicts);
  if (errors.length > 0) throw new Error(`Befunde unvollständig oder widersprüchlich:\n  - ${errors.join('\n  - ')}`);

  const candidates = [];
  for (const item of items) {
    const verdict = verdicts[item.key];
    if (!verdict.keep) continue;
    const dest = `${CANDIDATES_DIR}/${item.category}/${item.key}.jpg`;
    ensureDir(dirname(dest));
    copyFileSync(item.file, dest);
    candidates.push({
      file: dest, category: item.category, pixabayId: item.id, pageUrl: item.pageUrl,
      photographer: item.photographer, photographerUrl: item.photographerUrl, platform: 'Pixabay',
      license: LICENSE, licenseUrl: LICENSE_URL, retrievedAt: item.downloadedAt, uploadYear: item.uploadYear,
      width: item.width, height: item.height, bytes: item.bytes, tags: item.tags, recommended: verdict.recommend,
      findings: { faces: verdict.faces, brands: verdict.brands, text: verdict.text, note: verdict.note },
    });
  }
  writeJson(CANDIDATES_JSON, candidates);

  if (!existsSync(REVIEW_DOC)) {
    ensureDir(dirname(REVIEW_DOC));
    writeFileSync(REVIEW_DOC, reviewDocSkeleton());
  }
  const doc = readFileSync(REVIEW_DOC, 'utf8');
  const start = doc.indexOf(DOC_START);
  const end = doc.indexOf(DOC_END);
  if (start < 0 || end < start) throw new Error(`${REVIEW_DOC}: Marker ${DOC_START} und ${DOC_END} fehlen.`);
  writeFileSync(REVIEW_DOC, `${doc.slice(0, start + DOC_START.length)}\n\n${buildTables(items, verdicts)}\n${doc.slice(end)}`);
  console.log(`${candidates.length} Bilder nach ${CANDIDATES_DIR}/, ${CANDIDATES_JSON} und Tabellen in ${REVIEW_DOC} geschrieben.`);
}

// ---------------------------------------------------------------------------------------------
// Selbsttest (kein Netz)
// ---------------------------------------------------------------------------------------------

function selftest() {
  const base: Hit = {
    id: 1, pageURL: 'https://pixabay.com/photos/x-1/', type: 'photo', tags: 'hands, dough, kitchen',
    previewURL: 'https://cdn.pixabay.com/photo/2017/02/02/13/55/x-1_150.jpg',
    largeImageURL: 'https://pixabay.com/get/x_1280.jpg', imageWidth: 4000, imageHeight: 2667, imageSize: 1,
    user: 'a', user_id: 1, likes: 10, downloads: 1000, isAiGenerated: false, isLowQuality: false, isGRated: true,
  };
  assert.equal(rejectReason(base), null);
  assert.match(rejectReason({ ...base, isAiGenerated: true }) ?? '', /KI/);
  assert.match(rejectReason({ ...base, isAiGenerated: undefined }) ?? '', /KI/, 'fehlende Angabe zählt als unsicher');
  assert.match(rejectReason({ ...base, isLowQuality: true }) ?? '', /Qualität/);
  assert.match(rejectReason({ ...base, isGRated: false }) ?? '', /Altersgruppen/);
  assert.match(rejectReason({ ...base, type: 'illustration' }) ?? '', /Foto/);
  assert.match(rejectReason({ ...base, imageWidth: 1000, imageHeight: 600 }) ?? '', /klein/);
  assert.match(rejectReason({ ...base, imageWidth: 1300, imageHeight: 1200 }) ?? '', /Querformat/);
  assert.match(rejectReason({ ...base, tags: 'hands, little Girl' }) ?? '', /Personen-Tag \(girl\)/);
  assert.equal(rejectReason({ ...base, tags: 'human hand, handmade, manual' }), null, 'Wortgrenzen: „man“ steckt in „manual“');
  assert.match(rejectReason({ ...base, tags: 'lego, bricks' }) ?? '', /Marken/);

  assert.equal(uploadYear(base.previewURL), 2017);
  assert.equal(uploadYear('https://cdn.pixabay.com/foo.jpg'), null);

  const mk = (id: number, user: string, over: Partial<Candidate> = {}, hit: Partial<Hit> = {}): Candidate => ({
    hit: { ...base, id, user, ...hit }, category: 'craft', editorsChoice: false, terms: ['t'], ...over,
  });
  const picked = pickTop(
    [mk(1, 'a'), mk(2, 'a'), mk(3, 'a'), mk(4, 'a'), mk(5, 'b', { editorsChoice: true }), mk(6, 'c')],
    4, 3, new Set([6]),
  );
  assert.equal(picked[0].hit.id, 5, 'Redaktionsempfehlung zuerst');
  assert.equal(picked.filter((c) => c.hit.user === 'a').length, 3, 'höchstens 3 je Fotograf');
  assert.ok(!picked.some((c) => c.hit.id === 6), 'bereits vergebene ID wird übersprungen');
  const newer = mk(7, 'd', {}, { previewURL: 'https://cdn.pixabay.com/photo/2024/01/01/00/00/x_150.jpg' });
  assert.ok(score(mk(8, 'e')) > score(newer), 'Upload vor 2022 wird bevorzugt');

  const plan = buildPlan();
  assert.equal(plan.length, 21);
  assert.equal(plan.filter((spec) => spec.editorsChoice).length, 7);
  assert.ok(plan.every((spec) => !spec.reserve));
  assert.ok(plan.length + RESERVE_SEARCHES + PROBE_SEARCHES <= MAX_SEARCHES);
  assert.ok(CATEGORY_ORDER.length * PER_CATEGORY + PROBE_DOWNLOADS <= MAX_DOWNLOADS);

  const a = searchParams(plan[0]);
  assert.ok(!('key' in a), 'Suchparameter enthalten keinen Schlüssel');
  assert.equal(cacheKey(a), cacheKey({ ...a }), 'Cache-Schlüssel ist stabil');
  assert.notEqual(cacheKey(a), cacheKey(searchParams(plan[2])), 'editors_choice ändert den Cache-Schlüssel');
  assert.equal(a.image_type, 'photo');
  assert.equal(a.orientation, 'horizontal');
  assert.equal(a.safesearch, 'true');

  assert.equal(redact('GET https://pixabay.com/api/?key=SECRET123&q=x', 'SECRET123'), 'GET https://pixabay.com/api/?key=***&q=x');
  assert.equal(redact('Fehler SECRET123 im Text', 'SECRET123'), 'Fehler *** im Text');

  const item = (key: string, category: Category, id: number): ShortItem => ({
    key, category, id, file: 'x', bytes: 1, width: 1200, height: 800, overSize: false, downloadedAt: '2026-10-12',
    uploadYear: 2017, editorsChoice: false, terms: [], pageUrl: `https://pixabay.com/photos/x-${id}/`, photographer: 'a|b',
    photographerUrl: null, tags: '', isAiGenerated: false, isLowQuality: false, isGRated: true,
  });
  const items = [item('craft-1', 'craft', 1), item('craft-2', 'craft', 2)];
  const good: Verdict = { keep: true, recommend: true, faces: 'nein', brands: 'nein', text: 'nein', note: 'Hände, warmes Licht' };
  assert.deepEqual(validateVerdicts(items, { 'craft-1': good, 'craft-2': { ...good, keep: false, recommend: false, note: 'Gesicht' } }), []);
  assert.ok(validateVerdicts(items, { 'craft-1': good }).some((e) => e.includes('Kein Befund')));
  assert.ok(validateVerdicts(items, { 'craft-1': { ...good, faces: 'unklar' }, 'craft-2': good }).some((e) => e.includes('dann gilt raus')));
  assert.ok(validateVerdicts(items, { 'craft-1': { ...good, keep: false }, 'craft-2': good }).some((e) => e.includes('empfohlen, aber nicht behalten')));
  const tables = buildTables(items, { 'craft-1': good, 'craft-2': { ...good, keep: false, recommend: false, note: 'Gesicht im Hintergrund' } });
  assert.match(tables, /craft-1\.jpg/);
  assert.match(tables, /\*\*empfohlen\*\*/);
  assert.match(tables, /Aussortiert \(1\)/);
  assert.match(tables, /Gesicht im Hintergrund/);
  assert.ok(!tables.includes('a|b'), 'Pipe im Namen würde die Tabelle zerreißen');
  const skeleton = reviewDocSkeleton();
  assert.ok(
    skeleton.indexOf(DOC_START) >= 0 && skeleton.indexOf(DOC_START) < skeleton.indexOf(DOC_END),
    'Rumpf der Prüfseite enthält beide Marker in der richtigen Reihenfolge',
  );

  console.log('Selbsttest bestanden.');
}

// ---------------------------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) return selftest();
  if (args.includes('--plan')) {
    console.log('Geplante Suchen (je Kategorie 2 Begriffe normal, 1 mit editors_choice; Reserve: dritter Begriff):');
    for (const spec of buildPlan()) console.log(`  ${describe(spec)}`);
    for (const category of CATEGORY_ORDER) console.log(`  Reserve möglich: ${category} „${CATEGORIES[category].terms[2]}“`);
    console.log(`Rahmen: höchstens ${MAX_SEARCHES} Suchen und ${MAX_DOWNLOADS} Downloads (mit Probe), je Kategorie ${PER_CATEGORY} Kandidaten.`);
    console.log(`PIXABAY_API_KEY: ${process.env.PIXABAY_API_KEY ? 'gesetzt' : 'nicht gesetzt'}`);
    return;
  }
  const publishAt = args.indexOf('--publish');
  if (publishAt >= 0) {
    const path = args[publishAt + 1];
    if (!path) throw new Error('--publish braucht den Pfad zur Befund-Datei.');
    return publish(path);
  }
  return run({ offline: args.includes('--offline') });
}

main().catch((error) => {
  console.error(`\nFehler: ${redact(error instanceof Error ? error.message : String(error))}`);
  process.exit(1);
});
