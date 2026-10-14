// Orte (M10): Kategorien und Unterarten mit ihren festen Eigenschaften.
// Die einzige Stelle mit dieser Tabelle. Der Import (scripts/lib/places/) liest sie in M10a,
// die App ab M10b (Vorschlagslogik, Karte, Detailansicht). Details: docs/orte.md.
//
// Kindertauglichkeit `kidWeight` (0 bis 3) legt Clemens fest (Startwerte aus dem Plan zu M10):
//   3 = sehr kindertauglich (Spielplatz, Zoo, Bad), 2 = gut (Museum, Burg, Park), 1 = neutral (Kino, Aussichtspunkt),
//   0 = selten ein Ziel für Kinder (Rastplatz, allgemeine „Sehenswürdigkeit“, Dorfteich).
// Die Werte landen beim Import in der Spalte `kid_weight`. Eine Änderung hier wirkt also erst mit dem nächsten Import.

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

export type PlaceKind = {
  category: PlaceCategory;
  setting: PlaceSetting; // Standard; bei Bädern bestimmt der Import drinnen/draußen aus den OSM-Merkmalen und dem Namen
  kidWeight: KidWeight;
  // Saison, wenn OSM nichts dazu sagt (nur wenn der Ort draußen ist): 1 = Januar … 12 = Dezember.
  defaultSeason?: readonly number[];
};

// Freibad-Saison, wenn weder `opening_hours` noch `seasonal` etwas sagen: Mai bis September.
export const outdoorBathingSeason = [5, 6, 7, 8, 9] as const;

export const placeKinds = {
  playground: { category: 'playground', setting: 'outdoor', kidWeight: 3 },
  indoorPlayground: { category: 'indoor', setting: 'indoor', kidWeight: 3 },
  trampolinePark: { category: 'indoor', setting: 'indoor', kidWeight: 3 },
  park: { category: 'park', setting: 'outdoor', kidWeight: 2 }, // ohne Namen 1 (siehe kidWeightFor)
  waterPark: { category: 'pool', setting: 'outdoor', kidWeight: 3, defaultSeason: outdoorBathingSeason },
  outdoorPool: { category: 'pool', setting: 'outdoor', kidWeight: 3, defaultSeason: outdoorBathingSeason },
  indoorPool: { category: 'pool', setting: 'indoor', kidWeight: 3 },
  pool: { category: 'pool', setting: 'both', kidWeight: 3 }, // Kombibad: drinnen und draußen
  bathingPlace: { category: 'pool', setting: 'outdoor', kidWeight: 2, defaultSeason: outdoorBathingSeason },
  themePark: { category: 'funPark', setting: 'outdoor', kidWeight: 3 },
  miniGolf: { category: 'funPark', setting: 'outdoor', kidWeight: 3 },
  zoo: { category: 'animals', setting: 'outdoor', kidWeight: 3 },
  aquarium: { category: 'animals', setting: 'indoor', kidWeight: 3 },
  museum: { category: 'museum', setting: 'indoor', kidWeight: 2 },
  castle: { category: 'sight', setting: 'both', kidWeight: 2 },
  observationTower: { category: 'sight', setting: 'outdoor', kidWeight: 2 },
  ruins: { category: 'sight', setting: 'outdoor', kidWeight: 1 },
  viewpoint: { category: 'sight', setting: 'outdoor', kidWeight: 1 },
  attraction: { category: 'sight', setting: 'outdoor', kidWeight: 0 },
  natureReserve: { category: 'nature', setting: 'outdoor', kidWeight: 1 },
  lake: { category: 'nature', setting: 'outdoor', kidWeight: 1 },
  pond: { category: 'nature', setting: 'outdoor', kidWeight: 0 },
  picnicSite: { category: 'nature', setting: 'outdoor', kidWeight: 0 },
  climbingHall: { category: 'indoor', setting: 'indoor', kidWeight: 2 },
  iceRink: { category: 'indoor', setting: 'both', kidWeight: 2 },
  bowling: { category: 'indoor', setting: 'indoor', kidWeight: 1 },
  cinema: { category: 'indoor', setting: 'indoor', kidWeight: 1 }, // neutral; Hinweis „Programm und Altersfreigabe vorher prüfen“ ab M10b
  library: { category: 'indoor', setting: 'indoor', kidWeight: 2 },
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
