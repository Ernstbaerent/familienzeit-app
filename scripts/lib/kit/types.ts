// Baukasten für Zeichnungen (M9b, docs/bausteine/README.md): Typen.
// Ein Baustein ist ein SVG-Schnipsel mit Farbplätzen, eine Szene setzt Bausteine und Figuren in feste Plätze eines Layouts.
// Reine Typen, ohne Code.

// Rollen der Zeichnungs-Palette (src/lib/palette.ts), die ein Baustein als Farbplatz `{{name}}` nutzen darf.
export type TintName = 'paper' | 'rose' | 'petrol' | 'honey' | 'brown';

// `content` ist ein Inhalt für Behälter (Bratäpfel, Teig, Wasser …): Er steht nie allein auf einem Platz.
export type BlockKind = 'object' | 'furniture' | 'nature' | 'ground' | 'content';

// Merkmale für die Sicherheitsregeln (docs/bausteine/README.md, „Sicherheit“). Feuer gibt es im Baukasten nicht.
export type KitHazard = 'sharp' | 'heat' | 'goggles' | 'smallParts' | 'water';

export type Person = 'adult' | 'teen' | 'child' | 'toddler';

// Haltepunkte eines Gegenstands (Schritt 3a): Dort sitzt die Hand einer Figur.
// `handle` Griff oder Henkel, `tip` das arbeitende Ende (Löffelkopf, Spitze), `left`/`right` die Ränder (Tablett, Schüssel), `under` von unten getragen (Teller).
export type GripName = 'handle' | 'tip' | 'left' | 'right' | 'under';

// Inhaltsfläche eines Behälters in seinen eigenen Koordinaten (Größe 1):
// `flat` (Tablett, Teller): Die Stücke stehen in einer Reihe auf der Höhe `y` zwischen `x0` und `x1`.
// `deep` (Schüssel, Korb, Eimer): eine Öffnung als Ellipse; Stücke liegen als kleiner Haufen darin, Flächen (Wasser, Teig) füllen sie.
export type Container =
  | { kind: 'flat'; x0: number; x1: number; y: number }
  | { kind: 'deep'; cx: number; cy: number; rx: number; ry: number };

export type Block = {
  id: string;
  group: string; // Ordner unter assets/bausteine/
  kind: BlockKind;
  label: { de: string; en: string };
  // Zeichenfläche des Bausteins in Einheiten der 400×200-Fläche bei Größe 1. Ursprung (0 0) = Mitte der Standlinie.
  // x0 und x1 sind die linke und rechte Grenze (x0 < 0 < x1), h die Höhe über der Standlinie.
  box: { x0: number; x1: number; h: number };
  surface?: number; // nur Tisch: Höhe der Tischplatte über der Standlinie, dort stehen die Dinge
  tints?: TintName[]; // erlaubte Töne für den Platz `{{tint}}`
  defaultTint?: TintName;
  hazards: KitHazard[];
  materials: string[]; // Material-Schlüssel (src/features/activities/materials.ts), die dieses Bild „deckt“
  terms: { de: string[]; en: string[] }; // Wörter im Text der Aktivität, die dieses Bild „decken“ (ohne Beachtung der Groß-/Kleinschreibung)
  // Neutral = braucht keine Deckung im Text (Tisch, Standlinie).
  neutral: boolean;
  grips?: Partial<Record<GripName, [number, number]>>; // Haltepunkte (Schritt 3a)
  container?: Container; // Behälter: hier liegt der Inhalt
  // Nur Inhalte: in welche Behälter (IDs) sie passen und ob sie Stücke sind (wiederholt) oder eine Fläche (`fill`, für die Öffnung eines tiefen Behälters gezeichnet).
  fits?: string[];
  fill?: boolean;
  // Nur scharfe Dinge: Ein Kind darf es halten (Kinderschere), wenn die Aktivität es nach der Sicherheits-Checkliste erlaubt (scene.ts, `kidSharpProblems`).
  kidSafe?: boolean;
  // Wörter, die ein Kind mit diesem scharfen Ding in der Hand erlauben (zum Beispiel „Kinderschere“). Fehlen sie im Text, hält es nur ein Erwachsener.
  kidTerms?: { de: string[]; en: string[] };
};

export type LoadedBlock = Block & { svg: string };

export type Catalog = ReadonlyMap<string, LoadedBlock>;

export type LayoutName = 'hero' | 'table' | 'pair' | 'outdoor' | 'hands';

// Ein gehaltener Gegenstand (in der Hand einer Figur oder im Layout `hands`).
export type HeldItem = {
  block: string;
  tint?: TintName;
  content?: string; // Inhalt eines Behälters
  hot?: boolean; // frisch aus dem Ofen: Dampf darüber, zählt als heiß
  size?: number; // 1 (Vorgabe), 0.75 oder 0.6 (für kleinere Figuren)
};

// Benannte Posen mit Gegenstand (Schritt 3a). Dazu kommen die Posen des Rigs ohne Gegenstand (`stand`, `walk`, `cheer`, `dance`, …).
export type HoldPoseName = 'hold-plate' | 'carry-tray' | 'point' | 'pour' | 'stir' | 'cut-supervised' | 'hand-over' | 'write';

// Hände in Nahaufnahme (Layout `hands`): Unterarme kommen vom unteren Rand, die Hände sitzen an den Haltepunkten.
export type HandsPoseName = 'hold' | 'stir' | 'cut' | 'write';
export type Hands = {
  figure: string; // wessen Hände (Hautton und Alter)
  pose: HandsPoseName;
  tool?: HeldItem; // das Werkzeug der rechten Hand bei `stir`, `cut`, `write`
  mitts?: boolean;
  sleeve?: 'rose' | 'petrol';
};

export type SceneItem = {
  slot: string;
  // ein Baustein …
  block?: string;
  tint?: TintName;
  content?: string;
  hot?: boolean;
  size?: number; // nur eine der Größen, die der Platz erlaubt
  flip?: boolean; // Vorgabe: Dinge und Figuren auf der rechten Hälfte schauen zur Mitte
  hands?: Hands; // nur im Layout `hands`
  // … oder eine Figur der Besetzung (scripts/lib/figures/cast.ts)
  figure?: string;
  pose?: string;
  holds?: { left?: HeldItem; right?: HeldItem; both?: HeldItem; surface?: HeldItem };
  mitts?: boolean; // Ofenhandschuhe an beiden Händen
  outfit?: { kind: 'rain'; tint: 'rose' | 'petrol' };
};

export type Scene = {
  layout: LayoutName;
  items: SceneItem[];
  ground?: boolean; // Standlinie, Vorgabe: ja
};
