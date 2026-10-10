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
  'electric', // Elektrogerät zum Aufschrauben (Punkt 6 der Checkliste)
] as const;

// Häufige Allergene. Neues Allergen: Schlüssel hier + Text unter "allergens" in de.json und en.json.
export const allergenKeys = ['milk', 'egg', 'gluten', 'nuts', 'peanut', 'soy', 'sesame'] as const;

export type HazardKey = (typeof hazardKeys)[number];
export type AllergenKey = (typeof allergenKeys)[number];

type MaterialInfo = {
  hazards?: readonly HazardKey[];
  allergens?: readonly AllergenKey[];
  // Brennt leicht (Papier, Pappe, Tücher). Darf nie mit Feuer zusammen vorkommen (Punkt 7 der Checkliste):
  // Licht in Papier, z. B. in einer Laterne, nur mit LED.
  flammable?: true;
};

export const materials = {
  // Papier und Basteln
  paper: { flammable: true },
  cardboardBox: { flammable: true },
  cardboardTubes: { flammable: true },
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
  scarf: { flammable: true },
  watercolors: {},
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
  plate: {},
  paperTowels: { flammable: true },
  // Draußen und Spielen
  ball: {},
  rope: {},
  musicPlayer: {},
  flashlight: {},
  backpack: {},
  drinkBottle: {},
  paperBag: { flammable: true },
  magnifier: {},
  rainBoots: {},
  rainJacket: {},
  warmClothes: {},
  stick: {},
  water: { hazards: ['water'] }, // zum Spielen: Schüssel, Eimer, Wanne (Punkt 2 und 3 der Checkliste)
  puddles: { hazards: ['water'] },
  ice: {},
  ledLight: {}, // LED-Licht oder Laternenstab: das einzige Licht für Laternen und alles aus Papier (Punkt 7)
  playingCards: {},
  balloon: { hazards: ['smallParts'] },
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
  milk: { allergens: ['milk'] },
  oats: { allergens: ['gluten'] },
  raisins: { hazards: ['smallParts'] },
  lemon: {},
  pepper: {},
  sparklingWater: {},
  cressSeeds: {},
  // Nur kleine Mengen zum Anrühren, Trinken oder Pinselauswaschen (Glas, Becher, Teller).
  // Alles, worin ein Kind planschen kann, ist `water`.
  tapWater: {},
  // Küchengeräte mit Hitze
  stove: { hazards: ['heat'] },
  oven: { hazards: ['heat'] },
  // Feuer
  candle: { hazards: ['fire'] },
  // Werkzeug und Technik
  screwdriver: { hazards: ['sharp'] },
  blender: { hazards: ['sharp'] },
  // Nur kleine batteriebetriebene Geräte, Batterien vorher heraus. Nie mit Netzstecker (Punkt 6).
  oldDevice: { hazards: ['electric'] },
} as const satisfies Record<string, MaterialInfo>;

export type MaterialKey = keyof typeof materials;

export const materialKeys = Object.keys(materials) as MaterialKey[];

export function isMaterialKey(value: unknown): value is MaterialKey {
  return typeof value === 'string' && Object.hasOwn(materials, value);
}

export function getMaterialInfo(key: MaterialKey): MaterialInfo {
  return materials[key];
}
