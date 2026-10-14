// Orte (M10): Kategorien und Unterarten mit ihren festen Eigenschaften.
// Die einzige Stelle mit dieser Tabelle. Der Import (scripts/lib/places/) liest sie in M10a,
// die App ab M10b (Vorschlagslogik, Karte, Detailansicht). Details: docs/orte.md.
//
// Kindertauglichkeit `kidWeight` (0 bis 3) legt Clemens fest (Startwerte aus dem Plan zu M10):
//   3 = sehr kindertauglich (Spielplatz, Zoo, Bad), 2 = gut (Museum, Burg, Park), 1 = neutral (Kino, Aussichtspunkt),
//   0 = selten ein Ziel für Kinder (Rastplatz, allgemeine „Sehenswürdigkeit“, Dorfteich).
// Die Werte landen beim Import in der Spalte `kid_weight`. Eine Änderung hier wirkt also erst mit dem nächsten Import.
//
// Mindestbesuch, Kosten, Energie, Themen, `needsDry` und Bildgruppe nutzt nur die App (M10b). Eine Änderung wirkt mit dem nächsten App-Update,
// ohne neuen Import. Wie viele Punkte das gibt, steht in src/features/suggestions/placeScoring.ts (`placeWeights`).

export const placeCategories = [
  'playground', // Spielplätze
  'park', // Parks
  'pool', // Schwimm- und Freibäder, Badestellen
  'funPark', // Freizeitparks und Minigolf
  'animals', // Zoos, Tierparks, Aquarien
  'museum', // Museen
  'sight', // Sehenswürdigkeiten (Burgen, Türme, Aussichtspunkte)
  'nature', // Naturerlebnisse (Seen, Naturschutzgebiete, Rastplätze)
  'indoor', // Angebote drinnen (Indoorspielplatz, Kletterhalle, Kino, Bibliothek …)
] as const;

export type PlaceCategory = (typeof placeCategories)[number];

// Wie bei den Aktivitäten: drinnen, draußen oder beides.
export type PlaceSetting = 'indoor' | 'outdoor' | 'both';

export type KidWeight = 0 | 1 | 2 | 3;

// Bildgruppe eines Ortes auf der Karte (Farbfläche und großes Symbol, M10b). Sieben eigene Gruppen für Orte,
// die übrigen Unterarten nehmen den Ton und das Symbol einer Aktivitäts-Kategorie (src/lib/theme.ts, `placeTones`).
export const placeVisualKeys = ['playground', 'pool', 'museum', 'zoo', 'castle', 'cinema', 'library'] as const;
export type PlaceVisualKey = (typeof placeVisualKeys)[number];
export type PlaceVisual = PlaceVisualKey | 'nature' | 'movement' | 'outing' | 'game';

// Themen wie bei Aktivitäten und Kinderprofilen (Interessen und Abneigungen, src/features/profiles/preferences.ts).
type PlaceTopic =
  | 'natureAnimals'
  | 'movement'
  | 'water'
  | 'games'
  | 'stories'
  | 'outings'
  | 'loudPlaces'
  | 'crowds';

export type PlaceKind = {
  category: PlaceCategory;
  setting: PlaceSetting; // Standard; bei Bädern bestimmt der Import drinnen/draußen aus den OSM-Merkmalen und dem Namen
  kidWeight: KidWeight;
  // Saison, wenn OSM nichts dazu sagt (nur wenn der Ort draußen ist): 1 = Januar … 12 = Dezember.
  defaultSeason?: readonly number[];
  // Ab hier nur für die App (M10b, Vorschlagslogik). Der Import liest diese Felder nicht. Startwerte von Clemens bestätigt.
  minVisitMinutes: number; // Mindestbesuch vor Ort; zählt mit der Anfahrt hin und zurück zur verfügbaren Zeit
  cost: 0 | 1 | 2; // wie bei Aktivitäten: 0 = kostenlos, 1 = wenig, 2 = mehr
  energy: 'low' | 'medium' | 'high'; // Energie, die Eltern brauchen (wie bei Aktivitäten)
  topics: readonly PlaceTopic[]; // passend zu Interessen und Abneigungen der Kinder
  needsDry?: true; // nur bei Trockenheit (bei Regen, Gewitter, Schnee ausgeschlossen)
  visual: PlaceVisual;
};

// Freibad-Saison, wenn weder `opening_hours` noch `seasonal` etwas sagen: Mai bis September.
export const outdoorBathingSeason = [5, 6, 7, 8, 9] as const;

export const placeKinds = {
  playground: { category: 'playground', setting: 'outdoor', kidWeight: 3, minVisitMinutes: 30, cost: 0, energy: 'low', topics: ['movement'], needsDry: true, visual: 'playground' },
  indoorPlayground: { category: 'indoor', setting: 'indoor', kidWeight: 3, minVisitMinutes: 90, cost: 2, energy: 'low', topics: ['movement', 'loudPlaces', 'crowds'], visual: 'movement' },
  trampolinePark: { category: 'indoor', setting: 'indoor', kidWeight: 3, minVisitMinutes: 60, cost: 2, energy: 'medium', topics: ['movement', 'loudPlaces'], visual: 'movement' },
  park: { category: 'park', setting: 'outdoor', kidWeight: 2, minVisitMinutes: 30, cost: 0, energy: 'low', topics: ['natureAnimals'], visual: 'nature' }, // ohne Namen 1 (siehe kidWeightFor)
  waterPark: { category: 'pool', setting: 'outdoor', kidWeight: 3, defaultSeason: outdoorBathingSeason, minVisitMinutes: 120, cost: 2, energy: 'high', topics: ['water', 'movement'], visual: 'pool' },
  outdoorPool: { category: 'pool', setting: 'outdoor', kidWeight: 3, defaultSeason: outdoorBathingSeason, minVisitMinutes: 90, cost: 1, energy: 'high', topics: ['water', 'movement'], visual: 'pool' },
  indoorPool: { category: 'pool', setting: 'indoor', kidWeight: 3, minVisitMinutes: 90, cost: 1, energy: 'high', topics: ['water', 'movement'], visual: 'pool' },
  pool: { category: 'pool', setting: 'both', kidWeight: 3, minVisitMinutes: 90, cost: 1, energy: 'high', topics: ['water', 'movement'], visual: 'pool' }, // Kombibad: drinnen und draußen
  bathingPlace: { category: 'pool', setting: 'outdoor', kidWeight: 2, defaultSeason: outdoorBathingSeason, minVisitMinutes: 60, cost: 0, energy: 'high', topics: ['water', 'natureAnimals'], visual: 'pool' },
  themePark: { category: 'funPark', setting: 'outdoor', kidWeight: 3, minVisitMinutes: 180, cost: 2, energy: 'high', topics: ['outings', 'loudPlaces', 'crowds'], needsDry: true, visual: 'outing' },
  miniGolf: { category: 'funPark', setting: 'outdoor', kidWeight: 3, minVisitMinutes: 45, cost: 1, energy: 'medium', topics: ['games'], needsDry: true, visual: 'game' },
  zoo: { category: 'animals', setting: 'outdoor', kidWeight: 3, minVisitMinutes: 90, cost: 2, energy: 'medium', topics: ['natureAnimals'], visual: 'zoo' },
  aquarium: { category: 'animals', setting: 'indoor', kidWeight: 3, minVisitMinutes: 60, cost: 2, energy: 'medium', topics: ['natureAnimals'], visual: 'zoo' },
  museum: { category: 'museum', setting: 'indoor', kidWeight: 2, minVisitMinutes: 60, cost: 1, energy: 'medium', topics: ['outings'], visual: 'museum' },
  castle: { category: 'sight', setting: 'both', kidWeight: 2, minVisitMinutes: 60, cost: 1, energy: 'medium', topics: ['stories', 'outings'], visual: 'castle' },
  observationTower: { category: 'sight', setting: 'outdoor', kidWeight: 2, minVisitMinutes: 30, cost: 1, energy: 'medium', topics: ['outings'], needsDry: true, visual: 'outing' },
  ruins: { category: 'sight', setting: 'outdoor', kidWeight: 1, minVisitMinutes: 30, cost: 0, energy: 'low', topics: ['outings'], visual: 'castle' },
  viewpoint: { category: 'sight', setting: 'outdoor', kidWeight: 1, minVisitMinutes: 20, cost: 0, energy: 'low', topics: ['outings'], needsDry: true, visual: 'outing' },
  attraction: { category: 'sight', setting: 'outdoor', kidWeight: 0, minVisitMinutes: 20, cost: 0, energy: 'low', topics: ['outings'], visual: 'outing' },
  natureReserve: { category: 'nature', setting: 'outdoor', kidWeight: 1, minVisitMinutes: 45, cost: 0, energy: 'medium', topics: ['natureAnimals'], visual: 'nature' },
  lake: { category: 'nature', setting: 'outdoor', kidWeight: 1, minVisitMinutes: 45, cost: 0, energy: 'medium', topics: ['natureAnimals'], visual: 'nature' },
  pond: { category: 'nature', setting: 'outdoor', kidWeight: 0, minVisitMinutes: 20, cost: 0, energy: 'low', topics: ['natureAnimals'], visual: 'nature' },
  picnicSite: { category: 'nature', setting: 'outdoor', kidWeight: 0, minVisitMinutes: 30, cost: 0, energy: 'low', topics: ['natureAnimals'], needsDry: true, visual: 'nature' },
  climbingHall: { category: 'indoor', setting: 'indoor', kidWeight: 2, minVisitMinutes: 60, cost: 2, energy: 'high', topics: ['movement'], visual: 'movement' },
  iceRink: { category: 'indoor', setting: 'both', kidWeight: 2, minVisitMinutes: 60, cost: 1, energy: 'high', topics: ['movement'], visual: 'movement' },
  bowling: { category: 'indoor', setting: 'indoor', kidWeight: 1, minVisitMinutes: 60, cost: 2, energy: 'low', topics: ['games', 'loudPlaces'], visual: 'game' },
  // Kino: neutral (keine Themen), dazu der Hinweis „Programm und Altersfreigabe vorher prüfen“ auf Karte und Detailansicht.
  cinema: { category: 'indoor', setting: 'indoor', kidWeight: 1, minVisitMinutes: 100, cost: 2, energy: 'low', topics: [], visual: 'cinema' },
  library: { category: 'indoor', setting: 'indoor', kidWeight: 2, minVisitMinutes: 30, cost: 0, energy: 'low', topics: ['stories'], visual: 'library' },
} as const satisfies Record<string, PlaceKind>;

export type PlaceSubtype = keyof typeof placeKinds;

export const placeSubtypes = Object.keys(placeKinds) as PlaceSubtype[];

export function isPlaceSubtype(value: unknown): value is PlaceSubtype {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(placeKinds, value);
}

// Kindertauglichkeit eines einzelnen Ortes: der Wert der Unterart, bei Parks ohne Namen eine Stufe weniger
// (namenlose „Parks“ sind in OSM oft nur Grünflächen).
export function kidWeightFor(subtype: PlaceSubtype, hasName: boolean): KidWeight {
  const base: KidWeight = placeKinds[subtype].kidWeight;
  if (subtype === 'park' && !hasName) return 1;
  return base;
}
