// Feste Liste aller Materialien (Haushaltsdinge und Zutaten) für Aktivitäten.
//
// Neues Material ergänzen:
//   1. Schlüssel hier eintragen (Englisch, camelCase), mit Merkmalen, falls zutreffend.
//   2. Den Text unter "materials" in src/locales/de.json UND en.json ergänzen.
// `npm run activities:check` meldet einen fehlenden Text.
// Einen Schlüssel nie umbenennen (Aktivitäten verweisen darauf), sondern nur dazunehmen.
//
// Die Merkmale (hazards, allergens) sind die Grundlage der Sicherheits-Checkliste
// (docs/sicherheits-checkliste.md): Aus dem Material einer Aktivität ergibt sich,
// welche Hinweise sie braucht. Deshalb gehört ein Merkmal immer ans Material, nicht an die Aktivität.
//
// Diese Datei importiert nichts aus der App, damit auch das Prüfskript sie lesen kann.

// Gefahren, auf die die Sicherheits-Checkliste achtet.
export const hazardKeys = [
  'smallParts', // Kleinteile (verschluckbar)
  'sharp', // Schere, Messer
  'heat', // Herd, Ofen, heiße Dinge
  'fire', // Feuer, Kerzen, Streichhölzer
  'water', // Wasser zum Spielen, Pfützen, Gewässer
] as const;

// Häufige Allergene. Neues Allergen: Schlüssel hier + Text unter "allergens" in de.json und en.json.
export const allergenKeys = ['milk', 'egg', 'gluten', 'nuts', 'peanut', 'soy', 'sesame'] as const;

export type HazardKey = (typeof hazardKeys)[number];
export type AllergenKey = (typeof allergenKeys)[number];

type MaterialInfo = {
  hazards?: readonly HazardKey[];
  allergens?: readonly AllergenKey[];
};

export const materials = {
  // Papier und Basteln
  paper: {},
  cardboardBox: {},
  cardboardTubes: {},
  tape: {},
  glue: {},
  scissors: { hazards: ['sharp'] },
  markers: {},
  pencils: {},
  chalk: {},
  wool: {},
  socks: {},
  buttons: { hazards: ['smallParts'] },
  marbles: { hazards: ['smallParts'] },
  oldShirt: {},
  scarf: {},
  // Haushalt
  towel: {},
  blanket: {},
  cushions: {},
  chairs: {},
  basket: {},
  tray: {},
  bucket: {},
  jar: {},
  plasticCup: {},
  bowl: {},
  woodenSpoon: {},
  whisk: {},
  fork: {},
  rollingPin: {},
  knife: { hazards: ['sharp'] },
  sponge: {},
  dishSoap: {},
  stone: {},
  freezerBags: {},
  // Draußen und Spielen
  ball: {},
  rope: {},
  musicPlayer: {},
  flashlight: {},
  backpack: {},
  drinkBottle: {},
  paperBag: {},
  magnifier: {},
  rainBoots: {},
  rainJacket: {},
  warmClothes: {},
  stick: {},
  water: { hazards: ['water'] },
  puddles: { hazards: ['water'] },
  ice: {},
  // Zutaten
  yogurt: { allergens: ['milk'] },
  cream: { allergens: ['milk'] },
  cheese: { allergens: ['milk'] },
  egg: { allergens: ['egg'] },
  flour: { allergens: ['gluten'] },
  bread: { allergens: ['gluten'] },
  yeast: {},
  banana: {},
  apple: {},
  vegetables: {},
  tomatoSauce: {},
  oil: {},
  salt: {},
  sugar: {},
  turmeric: {},
  cocoa: {},
  bakingSoda: {},
  vinegar: {},
  // Küchengeräte mit Hitze
  stove: { hazards: ['heat'] },
  oven: { hazards: ['heat'] },
} as const satisfies Record<string, MaterialInfo>;

export type MaterialKey = keyof typeof materials;

export const materialKeys = Object.keys(materials) as MaterialKey[];

export function isMaterialKey(value: unknown): value is MaterialKey {
  return typeof value === 'string' && Object.hasOwn(materials, value);
}

export function getMaterialInfo(key: MaterialKey): MaterialInfo {
  return materials[key];
}
