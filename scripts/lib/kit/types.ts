// Baukasten für Zeichnungen (M9b, docs/bausteine/README.md): Typen.
// Ein Baustein ist ein SVG-Schnipsel mit Farbplätzen, eine Szene setzt Bausteine in feste Plätze eines Layouts.
// Reine Typen, ohne Code.

// Rollen der Zeichnungs-Palette (src/lib/palette.ts), die ein Baustein als Farbplatz `{{name}}` nutzen darf.
export type TintName = 'paper' | 'rose' | 'petrol' | 'honey' | 'brown';

export type BlockKind = 'figure' | 'object' | 'furniture' | 'nature' | 'ground';

// Merkmale für die Sicherheitsregeln (docs/bausteine/README.md, „Sicherheit“). Feuer gibt es im Baukasten nicht.
export type KitHazard = 'sharp' | 'heat' | 'goggles' | 'smallParts' | 'water';

export type Person = 'adult' | 'teen' | 'child' | 'toddler';

export type Block = {
  id: string;
  group: string; // Ordner unter assets/bausteine/
  kind: BlockKind;
  label: { de: string; en: string };
  // Zeichenfläche des Bausteins in Einheiten der 400×200-Fläche bei Größe 1. Ursprung (0 0) = Mitte der Standlinie.
  // x0 und x1 sind die linke und rechte Grenze (x0 < 0 < x1), h die Höhe über der Standlinie.
  box: { x0: number; x1: number; h: number };
  surface?: number; // nur Tisch: Höhe der Tischplatte über der Standlinie, dort stehen die Dinge
  tints?: TintName[]; // erlaubte Töne für den Platz `{{tint}}` (Figuren: Kleidung, nur Petrol oder Rosé)
  defaultTint?: TintName;
  hazards: KitHazard[];
  person?: Person; // nur Figuren
  animal?: boolean; // Haustier (Stups, Tüpfel): erscheint nie bei Hitze, Feuer, Messer oder Schere (checkAgainstActivity, docs/design/FIGUREN.md)
  materials: string[]; // Material-Schlüssel (src/features/activities/materials.ts), die dieses Bild „deckt“
  terms: { de: string[]; en: string[] }; // Wörter im Text der Aktivität, die dieses Bild „decken“ (ohne Beachtung der Groß-/Kleinschreibung)
  // Neutral = braucht keine Deckung im Text (Figuren, Standlinie, Tisch).
  neutral: boolean;
};

export type LoadedBlock = Block & { svg: string };

export type Catalog = ReadonlyMap<string, LoadedBlock>;

export type LayoutName = 'hero' | 'table' | 'pair' | 'outdoor';

export type SceneItem = {
  slot: string;
  block: string;
  tint?: TintName;
  size?: number; // nur eine der Größen, die der Platz erlaubt
  flip?: boolean; // Vorgabe: Bausteine auf der rechten Hälfte schauen zur Mitte
};

export type Scene = {
  layout: LayoutName;
  items: SceneItem[];
  ground?: boolean; // Standlinie, Vorgabe: ja
};
