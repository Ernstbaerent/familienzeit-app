// Zentrale Gestaltungswerte der App: Farben, Schriften, Abstände, Radien, Schatten.
// Bildschirme und Bausteine nehmen diese Werte NUR von hier, nie direkt im Style.
// `npx expo lint` meldet direkt eingetragene Werte in app/, src/components/ und src/features/.
//
// Design „Sonntagslicht“ (Miki), Quelle: docs/design/DESIGN.md und das PDF im selben Ordner.
// Seit Entscheidung 55 (DESIGN.md) gelten die Farben der Palette „C“ (Leinen, Rosé, Petrol, Tinte, src/lib/palette.ts);
// Aufbau, Layout und Schriften sind unverändert, die Namen der Farbrollen auch.
// Herkunft der Werte (Details und offene Fragen: docs/theme.md):
//   Clemens     = von Clemens festgelegt (Palette C, gemessene Kontraste)
//   abgeleitet  = aus der Palette gemischt oder von uns ergänzt, Kontraste per Test geprüft (src/lib/theme.test.ts)
// Ändert sich hier ein Wert, ändert er sich überall in der App.

import { useColorScheme, type ViewStyle } from 'react-native';

import type { ActivityCategory } from '@/features/activities/activities';
import type { PlaceVisualKey } from '@/features/places/placeKinds';

import { mixColors, palette } from './palette';

export { mixColors };

// ---------------------------------------------------------------------------
// Farben
// ---------------------------------------------------------------------------

const light = {
  background: palette.linen, // Leinen: Grund der Bildschirme (Clemens)
  card: palette.white, // Karten, Kacheln, nicht gewählte Chips: weiß, mit Schatten abgesetzt (Clemens, Entscheidung 55). Text darauf: `text`
  surface: mixColors(palette.linen, palette.rose, 0.3), // Rosé-Leinen: Flächen und Platzhalter, keine Karten, mit feinem Rand (abgeleitet)
  text: palette.ink, // Tinte: normaler Text, Überschriften (Clemens)
  textMuted: '#47636D', // Nebentext, Hinweise: Tinte-Petrol-Ton, 6,1:1 auf Leinen (abgeleitet)
  primary: palette.petrol, // Petrol: Hauptknopf, Links (Clemens). Als Textfarbe auf `background` und `card`.
  onPrimary: palette.white, // Text auf `primary` (Clemens, 7,3:1)
  selected: palette.ink, // Tinte: gewählter Zustand von Chips und Kacheln (Entscheidung 11 und 55)
  onSelected: palette.linen, // Text und Häkchen auf `selected` (Leinen)
  secondary: palette.rose, // Rosé: Pastellfläche, nur Fläche mit `onSecondary` (Clemens)
  onSecondary: palette.ink, // Text auf `secondary`: immer Tinte (8,4:1), Weiß schafft auf Rosé kein AA
  accent: palette.rose, // Rosé: nur kleine Formen, NIE für Text
  border: mixColors(palette.linen, palette.ink, 0.2), // Linien, Rahmen zum Gliedern. Kein Kontrast für Bedienelemente allein.
  danger: '#6B2F12', // Löschen, Fehlermeldungen, Sicherheit: dunkler Ton der warmen Warnfamilie (abgeleitet). Unterscheidung zu `warning` über Symbol und Titel
  dangerSurface: '#F5E0D3', // Hintergrund für Sicherheitsboxen (Text darauf: `text` oder `danger`), mit Rand in `danger`
  warning: '#7A4A12', // Hinweise zum Aufpassen, z. B. amtliche Wetterwarnung: warme Funktionsfarbe (Honig/Braun)
  warningSurface: '#F8E8CC', // Hintergrund für Hinweisboxen, z. B. Allergene (Text darauf: `text` oder `warning`), mit Rand in `warning`
  icon: mixColors(palette.petrol, palette.linen, 0.25), // Symbole, Rand der Abhak-Felder (4,1:1 auf Karte, abgeleitet)
};

export type Colors = Record<keyof typeof light, string>;

export const lightColors: Colors = light;

// Dunkelmodus: Grund sehr dunkles Petrol, Text Leinen, Hauptknopf Rosé mit dunkler Schrift. Alles abgeleitet,
// Kontraste per Test geprüft (src/lib/theme.test.ts). Eingeschaltet wird er erst in D5.
const darkBackground = '#0C2630';

export const darkColors: Colors = {
  background: darkBackground, // abgeleitet: sehr dunkles Petrol
  card: '#143642', // abgeleitet: heller als `surface`, damit Karten im Dunkeln vom Grund abheben
  surface: '#103039', // abgeleitet
  text: palette.linen, // Leinen (14,9:1 auf dem Grund)
  textMuted: '#A9BDC2', // abgeleitet
  primary: palette.rose, // Rosé als Hauptknopf im Dunkeln
  onPrimary: darkBackground, // dunkle Schrift auf dem Knopf (9,7:1)
  selected: palette.linen, // abgeleitet: heller Text-Ton als gewählter Zustand
  onSelected: darkBackground, // abgeleitet
  secondary: palette.rose, // abgeleitet
  onSecondary: darkBackground, // abgeleitet
  accent: palette.rose, // nur Akzent
  border: '#2E5360', // abgeleitet
  danger: '#EFA582', // abgeleitet: heller Ton der warmen Warnfamilie
  dangerSurface: '#3A2418', // abgeleitet
  warning: '#F2C27B', // abgeleitet
  warningSurface: '#3A2C1A', // abgeleitet
  icon: '#A9BDC2', // abgeleitet
};

// ---------------------------------------------------------------------------
// Kategorie-Farben (Karte ohne Bild, DESIGN.md Entscheidung 10 und 55)
// ---------------------------------------------------------------------------

// Jede Kategorie hat eine eigene Farbe für die Fläche, auf der die Karte ohne Bild ihr großes Symbol zeigt.
// Es gibt keine neuen Farbtöne: Jeder Ton wird aus den Farben der Palette gemischt (Leinen, Rosé, Petrol, Tinte).
// Drei Farbtöne reichen nicht für sieben klar verschiedene Flächen: Der Unterschied liegt in Symbol und Name (weiße Pille),
// die Farbe ist nie das einzige Merkmal (Entscheidung 55). Die berechneten Werte stehen in docs/theme.md, die Kontraste prüft src/lib/theme.test.ts.
//
// Auf der Fläche liegt nur das Symbol (mindestens 3:1). Der Name der Kategorie steht in einer weißen Pille (`card`), nicht auf der Fläche.
export type CategoryTone = {
  field: string; // Fläche der Karte (Rückfall ohne Bild)
  mark: string; // das große, dünne Symbol auf der Fläche
  shape: string; // der weiche große Kreis auf der Fläche, nur Dekoration
};

// Die vier Farben, aus denen ein Ton gemischt wird, im jeweiligen Modus (im Dunkeln ist `paper` der dunkle Grund und `ink` das helle Leinen).
type ToneBase = { paper: string; rose: string; petrol: string; ink: string; lighten: string };
type ColorName = Exclude<keyof ToneBase, 'lighten'>;

// Rezept für einen Ton: Die Fläche ist `from` mit dem Anteil `tint` von `hue` (und optional `blend` einer zweiten Farbe).
// Das Symbol ist `markFrom` mit dem Anteil `ink` Tinte darin. 0 heißt: die reine Palettenfarbe.
type ToneRecipe = {
  field: [from: ColorName, hue: ColorName, tint: number];
  blend?: [other: ColorName, share: number];
  mark: [markFrom: ColorName, ink: number];
};

function buildCategoryTones<Key extends string>(
  base: ToneBase,
  recipes: Record<Key, ToneRecipe>,
  shape: number, // der Kreis: Fläche, mit `lighten` aufgehellt
): Record<Key, CategoryTone> {
  const tone = ({ field: [from, hue, tint], blend, mark: [markFrom, ink] }: ToneRecipe): CategoryTone => {
    const mixed = mixColors(base[from], base[hue], tint);
    const field = blend ? mixColors(mixed, base[blend[0]], blend[1]) : mixed;
    return {
      field,
      mark: mixColors(base[markFrom], base.ink, ink),
      shape: mixColors(field, base.lighten, shape),
    };
  };
  return Object.fromEntries(
    Object.entries<ToneRecipe>(recipes).map(([category, recipe]) => [category, tone(recipe)]),
  ) as Record<Key, CategoryTone>;
}

const lightToneBase: ToneBase = {
  paper: palette.linen,
  rose: palette.rose,
  petrol: palette.petrol,
  ink: palette.ink,
  lighten: palette.white,
};

const lightCategoryTones = buildCategoryTones<ActivityCategory>(
  lightToneBase,
  {
    craft: { field: ['paper', 'rose', 0.55], mark: ['petrol', 0.15] }, // Rosé, hell
    movement: { field: ['paper', 'rose', 1], mark: ['petrol', 0.35] }, // Rosé, voll
    game: { field: ['paper', 'petrol', 0.14], mark: ['petrol', 0] }, // Petrol, hell
    nature: { field: ['paper', 'petrol', 0.3], mark: ['petrol', 0.25] }, // Petrol, kräftiger
    outing: { field: ['paper', 'rose', 0.5], blend: ['petrol', 0.12], mark: ['petrol', 0] }, // Rosé mit Petrol
    experiment: { field: ['rose', 'petrol', 0.35], mark: ['petrol', 0.55] }, // Rosé-Petrol, dunkel
    cooking: { field: ['paper', 'petrol', 0.72], mark: ['paper', 0] }, // klares Petrol mit Leinen-Symbol (Entscheidung 55)
  },
  0.45,
);

// Dunkelmodus (D5): derselbe Aufbau, der Grund ist das dunkle Petrol, Tinte und Leinen tauschen die Rollen.
const darkToneBase: ToneBase = {
  paper: darkColors.background,
  rose: palette.rose,
  petrol: palette.petrol,
  ink: palette.linen,
  lighten: palette.linen,
};

const darkCategoryTones = buildCategoryTones<ActivityCategory>(
  darkToneBase,
  {
    craft: { field: ['paper', 'rose', 0.22], mark: ['rose', 0] },
    movement: { field: ['paper', 'rose', 0.4], mark: ['rose', 0.2] },
    game: { field: ['paper', 'petrol', 0.5], mark: ['petrol', 0.55] },
    nature: { field: ['paper', 'petrol', 0.8], mark: ['petrol', 0.6] },
    outing: { field: ['paper', 'rose', 0.3], blend: ['petrol', 0.3], mark: ['rose', 0.1] },
    experiment: { field: ['paper', 'petrol', 0.65], blend: ['rose', 0.15], mark: ['rose', 0] },
    cooking: { field: ['paper', 'petrol', 1], mark: ['ink', 0] },
  },
  0.08,
);

// Orte (M10b): Spielplatz, Bad, Museum, Zoo, Burg, Kino und Bibliothek haben seit Entscheidung 55 keine eigenen Farben mehr.
// Sie nehmen den Ton einer Aktivitäts-Kategorie; Symbol und Name in der Pille unterscheiden sie (Zuordnung hier, Werte in docs/theme.md).
const placeToneCategory: Record<PlaceVisualKey, ActivityCategory> = {
  playground: 'movement',
  pool: 'nature',
  museum: 'craft',
  zoo: 'outing',
  castle: 'experiment',
  cinema: 'game',
  library: 'cooking',
};

function placeTonesFrom(categoryTones: Record<ActivityCategory, CategoryTone>): Record<PlaceVisualKey, CategoryTone> {
  return Object.fromEntries(
    Object.entries(placeToneCategory).map(([key, category]) => [key, categoryTones[category]]),
  ) as Record<PlaceVisualKey, CategoryTone>;
}

const lightPlaceTones = placeTonesFrom(lightCategoryTones);
const darkPlaceTones = placeTonesFrom(darkCategoryTones);

// ---------------------------------------------------------------------------
// Schatten (boxShadow gilt auf iOS und Android gleich)
// ---------------------------------------------------------------------------

export type Shadows = {
  card: ViewStyle; // Karten (PDF: weich und kurz, nach Augenmaß gemessen)
  primaryButton: ViewStyle; // Hauptknopf mit Petrol-Schein (nach Augenmaß)
};

const lightShadow: Shadows = {
  card: {
    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(18, 50, 61, 0.08)' }],
  },
  primaryButton: {
    boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 16, color: 'rgba(26, 93, 116, 0.25)' }],
  },
};

// Im Dunkeln fällt kaum Schatten auf: kräftiger, aber ohne Farbton.
const darkShadow: Shadows = {
  card: {
    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(0, 0, 0, 0.35)' }],
  },
  primaryButton: {
    boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 16, color: 'rgba(0, 0, 0, 0.35)' }],
  },
};

// ---------------------------------------------------------------------------
// Hell oder dunkel
// ---------------------------------------------------------------------------

export type Theme = {
  scheme: 'light' | 'dark';
  colors: Colors;
  shadow: Shadows;
  categoryTones: Record<ActivityCategory, CategoryTone>;
  placeTones: Record<PlaceVisualKey, CategoryTone>; // Orte (M10b)
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  shadow: lightShadow,
  categoryTones: lightCategoryTones,
  placeTones: lightPlaceTones,
};
export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  shadow: darkShadow,
  categoryTones: darkCategoryTones,
  placeTones: darkPlaceTones,
};

// Schalter für den Dunkelmodus. Bis D5 AUS: Die Bildschirme nutzen noch feste helle Farben,
// und `userInterfaceStyle: "light"` in app.json hält Android nicht zuverlässig hell (dafür bräuchte es
// `expo-system-ui`). Erst wenn alle Bildschirme `useTheme()` nutzen, hier auf true und in app.json
// `userInterfaceStyle` auf "automatic" stellen (Roadmap D5, Details in docs/theme.md).
export const darkModeEnabled = false;

// Reine Funktion hinter `useTheme()`, damit sich die Regel ohne Handy testen lässt.
export function resolveTheme(
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
  enabled: boolean,
): Theme {
  return enabled && systemScheme === 'dark' ? darkTheme : lightTheme;
}

// Der Dunkelmodus folgt der Handy-Einstellung (sobald `darkModeEnabled` an ist).
// Nutzung in Bausteinen: `const { colors } = useTheme();` und Styles über `useThemedStyles`.
export function useTheme(): Theme {
  return resolveTheme(useColorScheme(), darkModeEnabled);
}

// Helle Farben und Schatten als feste Werte. Nur für Bildschirme, die noch nicht auf `useTheme()`
// umgestellt sind (jede Design-Stufe D2 bis D5 stellt ihre Bildschirme um). Neue Bildschirme: `useTheme()`.
export const colors = lightColors;
export const shadow = lightShadow;

// ---------------------------------------------------------------------------
// Schrift
// ---------------------------------------------------------------------------

// Namen der eingebundenen Schriftschnitte (geladen in src/lib/fonts.ts). Literata für Titel und Zahlen,
// Onest für Text und Bedienung (DESIGN.md). Auf Android wählt `fontWeight` bei eigenen Schriften keinen
// Schnitt aus, sondern verfälscht ihn: immer den passenden Namen nehmen, nie `fontWeight`.
// Arabisch (Noto Naskh Arabic) kommt mit der arabischen Übersetzung.
export const fontFaces = {
  title: 'Literata_600SemiBold', // Titel und Überschriften
  number: 'Literata_500Medium', // Zahlen (Zeit, Alter, Schrittnummern)
  body: 'Onest_400Regular', // Fließtext
  bodyMedium: 'Onest_500Medium', // Bedienung, Chips, Knöpfe
  bodyStrong: 'Onest_600SemiBold', // betonter Text
} as const;

// Sind die Schriften beim Start nicht rechtzeitig da (Zeitlimit) oder fehlerhaft, nutzt die App bis zum nächsten Start
// die Systemschrift (docs/theme.md, „Laden und Zeitlimit“). Das muss für die ganze Sitzung gelten: iOS merkt sich die
// gemessene Größe eines Textes unter dem Schriftnamen. Kommt die Schrift später doch noch, würde ein Text, der mit der
// Systemschrift gemessen wurde, mit der breiteren Schrift gezeichnet und unten abgeschnitten (die letzte Zeile läuft
// dann rechts aus dem Rand). Umgeschaltet wird nur in src/lib/fonts.ts, bevor der erste Text erscheint.
let systemFontsForSession = false;

export function switchToSystemFontsForSession(): void {
  systemFontsForSession = true;
}

// Die Namen für `fontFamily`. Sie lesen den Schalter oben: `undefined` heißt Systemschrift.
export const fonts: { readonly [Role in keyof typeof fontFaces]: (typeof fontFaces)[Role] | undefined } = {
  get title() {
    return systemFontsForSession ? undefined : fontFaces.title;
  },
  get number() {
    return systemFontsForSession ? undefined : fontFaces.number;
  },
  get body() {
    return systemFontsForSession ? undefined : fontFaces.body;
  },
  get bodyMedium() {
    return systemFontsForSession ? undefined : fontFaces.bodyMedium;
  },
  get bodyStrong() {
    return systemFontsForSession ? undefined : fontFaces.bodyStrong;
  },
};

// Größen in px, aus dem PDF gemessen (pt ÷ 0,75) und auf diese Stufen zusammengefasst.
// Die Systemschrift-Skalierung bleibt an: nie `allowFontScaling={false}` setzen.
export const fontSize = {
  xs: 12, // kleine Beschriftungen
  sm: 14, // Nebentext, Chips
  md: 16, // normaler Text, Knöpfe
  lg: 18, // Text in Karten, Abschnittstitel
  reading: 20, // Anleitungstext (DESIGN.md: 20 px), liest man beim Machen mit etwas Abstand zum Handy
  xl: 22, // Kartentitel
  xxl: 28, // Bildschirmtitel
  display: 34, // großer Titel, z. B. in der Detailansicht
} as const;

// Zeilenhöhe passend zur Schriftgröße mit demselben Namen (z. B. fontSize.lg + lineHeight.lg).
export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  reading: 30, // im PDF gemessen: 1,5 × 20
  xl: 28,
  xxl: 36,
  display: 42,
} as const;

// ---------------------------------------------------------------------------
// Abstände, Radien, Größen
// ---------------------------------------------------------------------------

// Für margin, padding und gap.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  stepGap: 28, // Abstand zwischen den Schritten der Anleitung (DESIGN.md)
} as const;

// Für borderRadius (auch borderTopStartRadius usw.).
export const radius = {
  sm: 4,
  md: 8,
  tile: 16, // Kacheln (DESIGN.md)
  card: 22, // Karten (DESIGN.md)
  full: 9999, // Pille, ganz rund: Knöpfe und Chips (DESIGN.md)
} as const;

// Mindestgrößen aus dem Design. Sonst stehen Breiten und Höhen nicht im Theme.
export const size = {
  touch: 44, // Tippflächen mindestens 44 pt (DESIGN.md)
  checkbox: 56, // Abhak-Felder 56 px hoch (DESIGN.md)
} as const;

// Durchsichtigkeit (0 = unsichtbar, 1 = voll sichtbar).
export const opacity = {
  disabled: 0.4, // nicht auswählbare Knöpfe und Chips
  pressed: 0.7, // antippbare Karten, solange der Finger darauf liegt
} as const;

// Größe von Symbolen (Icons), z. B. <CategoryIcon size="lg" />.
export const iconSize = {
  sm: 14, // kleine Symbole: Häkchen im Kreis (Kinder-Kachel), Kategorie-Pille und Eckdaten auf der Karte
  md: 24,
  lg: 32,
  hero: 160, // großes, angeschnittenes Symbol auf Platzhalter-Flächen (DESIGN.md: „großes dünnes Kategorie-Symbol“)
} as const;
