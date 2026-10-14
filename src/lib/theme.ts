// Zentrale Gestaltungswerte der App: Farben, Schriften, Abstände, Radien, Schatten.
// Bildschirme und Bausteine nehmen diese Werte NUR von hier, nie direkt im Style.
// `npx expo lint` meldet direkt eingetragene Werte in app/, src/components/ und src/features/.
//
// Design „Sonntagslicht“ (Miki), Quelle: docs/design/DESIGN.md und das PDF im selben Ordner.
// Herkunft der Werte (Details und offene Fragen: docs/theme.md):
//   DESIGN.md   = steht so in docs/design/DESIGN.md
//   PDF         = aus dem PDF gemessen (steht nicht in der DESIGN.md)
//   abgeleitet  = von uns ergänzt, weil es im Design fehlt (Ani bestätigt noch)
// Ändert sich hier ein Wert, ändert er sich überall in der App.

import { useColorScheme, type ViewStyle } from 'react-native';

import type { ActivityCategory } from '@/features/activities/activities';
import type { PlaceVisualKey } from '@/features/places/placeKinds';

// ---------------------------------------------------------------------------
// Farben
// ---------------------------------------------------------------------------

const light = {
  background: '#FAF6F0', // Papier: Grund der Bildschirme (DESIGN.md)
  card: '#FFFFFF', // Karten, Kacheln, nicht gewählte Chips: weiß (PDF gemessen, bestätigt mit Entscheidung 11). Text darauf: `text`
  surface: '#F0E6D8', // Sand: Flächen und Platzhalter, keine Karten (DESIGN.md, Entscheidung 11)
  text: '#2A211C', // Tinte: normaler Text, Überschriften (DESIGN.md)
  textMuted: '#6B5D53', // Nebentext, Hinweise (PDF)
  primary: '#B4532F', // Terrakotta: nur der Hauptknopf (DESIGN.md, Entscheidung 11). Als Textfarbe nur auf `background`.
  onPrimary: '#FFFFFF', // Text auf `primary` (DESIGN.md)
  selected: '#2A211C', // Tinte: gewählter Zustand von Chips und Kacheln (PDF, Entscheidung 11)
  onSelected: '#FAF6F0', // Text und Häkchen auf `selected` (Papier)
  secondary: '#5F7A5A', // Salbei: Zweitfarbe (DESIGN.md)
  onSecondary: '#FFFFFF', // Text auf `secondary` (DESIGN.md)
  accent: '#E8A94F', // Honig: nur Akzent, NIE für Text (DESIGN.md)
  border: '#CDBFAE', // Linien, Rahmen zum Gliedern (PDF). Kein Kontrast für Bedienelemente allein.
  danger: '#9A3B22', // Löschen, Fehlermeldungen, Sicherheit (PDF)
  dangerSurface: '#F7E4DE', // Hintergrund für Sicherheitsboxen (Text darauf: `text` oder `danger`) (PDF)
  warning: '#8A5300', // Hinweise zum Aufpassen, z. B. amtliche Wetterwarnung (bisheriger Wert)
  warningSurface: '#FCEBD0', // Hintergrund für Hinweisboxen, z. B. Allergene (Text darauf: `text` oder `warning`) (PDF)
  icon: '#7A6656', // Symbole, z. B. Kategorie einer Aktivität (PDF)
};

export type Colors = Record<keyof typeof light, string>;

export const lightColors: Colors = light;

// Dunkelmodus. Nur Hintergrund, Text und Hauptfarbe stehen in der DESIGN.md, der Rest ist abgeleitet:
// gleicher warmer Braunton, Kontraste per Test geprüft (src/lib/theme.test.ts).
export const darkColors: Colors = {
  background: '#1C1714', // DESIGN.md
  card: '#332A24', // abgeleitet: heller als `surface`, damit Karten im Dunkeln vom Grund abheben
  surface: '#2A221D', // abgeleitet
  text: '#F3EBE2', // DESIGN.md
  textMuted: '#B8A99B', // abgeleitet
  primary: '#E3825C', // DESIGN.md
  onPrimary: '#1C1714', // dunkle Schrift auf dem Knopf (DESIGN.md)
  selected: '#F3EBE2', // abgeleitet: heller Text-Ton als gewählter Zustand
  onSelected: '#1C1714', // abgeleitet
  secondary: '#8FA887', // abgeleitet
  onSecondary: '#1C1714', // abgeleitet
  accent: '#E8A94F', // unverändert, nur Akzent
  border: '#4A3F37', // abgeleitet
  danger: '#F2A892', // abgeleitet
  dangerSurface: '#3B2420', // abgeleitet
  warning: '#F2C27B', // abgeleitet
  warningSurface: '#3A2C1A', // abgeleitet
  icon: '#B8A99B', // abgeleitet
};

// ---------------------------------------------------------------------------
// Kategorie-Farben (Karte ohne Bild, DESIGN.md Entscheidung 10)
// ---------------------------------------------------------------------------

// Jede Kategorie hat eine eigene Farbe für die Fläche, auf der die Karte ohne Bild ihr großes Symbol zeigt.
// Es gibt keine neuen Farbtöne: Jeder Ton wird aus den Farben der Palette gemischt (Papier, Sand, Terrakotta, Salbei, Honig, Tinte),
// im Dunkeln aus den Dunkelwerten. Vier Farbtöne für sieben Kategorien: Terrakotta, Salbei und Honig je zweimal
// (hell und kräftiger getönt), Sand einmal. Die berechneten Werte stehen in docs/theme.md, die Kontraste prüft src/lib/theme.test.ts.
//
// Auf der Fläche liegt nur das Symbol (mindestens 3:1) und, falls je Text darauf stehen soll, `text` (mindestens 4,5:1).
// Der Name der Kategorie steht in einer weißen Pille (`card`), nicht auf der Fläche.
export type CategoryTone = {
  field: string; // Fläche der Karte (Rückfall ohne Bild)
  mark: string; // das große, dünne Symbol auf der Fläche: Palettenfarbe, zur Tinte hin abgedunkelt
  shape: string; // der weiche große Kreis auf der Fläche, nur Dekoration
};

// Mischt zwei Farben: `share` ist der Anteil von `other` (0 = nur `base`, 1 = nur `other`).
export function mixColors(base: string, other: string, share: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16);
  const mixed = [1, 3, 5].map((start) =>
    Math.round(channel(base, start) + (channel(other, start) - channel(base, start)) * share),
  );
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

type ColorKey = keyof Colors;

// Rezept für einen Ton: Die Fläche ist `paper` mit dem Anteil `tint` der Farbe `hue`.
// Das Symbol ist `markFrom` mit dem Anteil `ink` Tinte (`text`) darin. 0 heißt: die reine Palettenfarbe.
// Orte (M10b) brauchen mehr Töne als es Palettenfarben gibt: Dort wird die Fläche zusätzlich mit einer zweiten
// Palettenfarbe gemischt (`blend`, Anteil `share`). Auch das sind keine neuen Farbtöne, nur Mischungen der Palette.
type ToneRecipe = {
  field: [paper: ColorKey, hue: ColorKey, tint: number];
  blend?: [other: ColorKey, share: number];
  mark: [markFrom: ColorKey, ink: number];
};

type ToneRecipes<Key extends string> = {
  recipes: Record<Key, ToneRecipe>;
  shape: [lighten: ColorKey, share: number]; // der Kreis: Fläche, mit `lighten` aufgehellt
};

function buildCategoryTones<Key extends string>(
  colors: Colors,
  { recipes, shape }: ToneRecipes<Key>,
): Record<Key, CategoryTone> {
  const tone = ({ field: [paper, hue, tint], blend, mark: [markFrom, ink] }: ToneRecipe): CategoryTone => {
    const base = mixColors(colors[paper], colors[hue], tint);
    const field = blend ? mixColors(base, colors[blend[0]], blend[1]) : base;
    return {
      field,
      mark: mixColors(colors[markFrom], colors.text, ink),
      shape: mixColors(field, colors[shape[0]], shape[1]),
    };
  };
  return Object.fromEntries(
    Object.entries<ToneRecipe>(recipes).map(([category, recipe]) => [category, tone(recipe)]),
  ) as Record<Key, CategoryTone>;
}

const lightCategoryTones = buildCategoryTones(lightColors, {
  recipes: {
    craft: { field: ['background', 'primary', 0.17], mark: ['primary', 0] }, // Terrakotta, hell
    movement: { field: ['background', 'primary', 0.36], mark: ['primary', 0.3] }, // Terrakotta, kräftiger
    game: { field: ['background', 'secondary', 0.17], mark: ['secondary', 0] }, // Salbei, hell (wie im PDF)
    nature: { field: ['background', 'secondary', 0.36], mark: ['secondary', 0.2] }, // Salbei, kräftiger
    outing: { field: ['background', 'accent', 0.28], mark: ['accent', 0.45] }, // Honig, hell
    experiment: { field: ['background', 'accent', 0.55], mark: ['accent', 0.55] }, // Honig, kräftiger
    cooking: { field: ['surface', 'text', 0.07], mark: ['surface', 0.62] }, // Sand, abgedunkelt (wie im PDF)
  },
  shape: ['card', 0.45],
});

// Dunkelmodus (D5): derselbe Aufbau aus den Dunkelwerten. Die Tinte (`text`) ist hier hell, das Symbol wird also heller.
const darkCategoryTones = buildCategoryTones(darkColors, {
  recipes: {
    craft: { field: ['background', 'primary', 0.24], mark: ['primary', 0] },
    movement: { field: ['background', 'primary', 0.42], mark: ['primary', 0.25] },
    game: { field: ['background', 'secondary', 0.22], mark: ['secondary', 0] },
    nature: { field: ['background', 'secondary', 0.4], mark: ['secondary', 0.25] },
    outing: { field: ['background', 'accent', 0.24], mark: ['accent', 0] },
    experiment: { field: ['background', 'accent', 0.42], mark: ['accent', 0.25] },
    cooking: { field: ['surface', 'text', 0.12], mark: ['surface', 0.62] },
  },
  shape: ['text', 0.08],
});

// Orte (M10b): sieben eigene Bildgruppen (Spielplatz, Bad, Museum, Zoo, Burg, Kino, Bibliothek). Die übrigen Unterarten
// nehmen den Ton einer Aktivitäts-Kategorie (src/features/places/placeKinds.ts, `visual`). Werte in docs/theme.md, Kontraste im Test.
const lightPlaceTones = buildCategoryTones<PlaceVisualKey>(lightColors, {
  recipes: {
    playground: { field: ['background', 'accent', 0.3], blend: ['primary', 0.12], mark: ['primary', 0.25] }, // Honig mit Terrakotta
    pool: { field: ['background', 'secondary', 0.12], mark: ['secondary', 0.35] }, // Salbei, sehr hell
    museum: { field: ['surface', 'primary', 0.18], mark: ['primary', 0.35] }, // Sand mit Terrakotta
    zoo: { field: ['background', 'secondary', 0.26], blend: ['accent', 0.25], mark: ['secondary', 0.45] }, // Salbei mit Honig
    castle: { field: ['surface', 'text', 0.14], mark: ['surface', 0.7] }, // Sand, kräftiger abgedunkelt als Kochen
    cinema: { field: ['background', 'primary', 0.26], blend: ['text', 0.06], mark: ['primary', 0.45] }, // Terrakotta, gedeckt
    library: { field: ['surface', 'accent', 0.22], blend: ['secondary', 0.1], mark: ['accent', 0.6] }, // Sand mit Honig und etwas Salbei
  },
  shape: ['card', 0.45],
});

const darkPlaceTones = buildCategoryTones<PlaceVisualKey>(darkColors, {
  recipes: {
    playground: { field: ['background', 'accent', 0.3], blend: ['primary', 0.15], mark: ['accent', 0.1] },
    pool: { field: ['background', 'secondary', 0.3], mark: ['secondary', 0.4] },
    museum: { field: ['surface', 'primary', 0.3], mark: ['primary', 0.35] },
    zoo: { field: ['background', 'secondary', 0.3], blend: ['accent', 0.2], mark: ['secondary', 0.5] },
    castle: { field: ['surface', 'text', 0.2], mark: ['surface', 0.75] },
    cinema: { field: ['background', 'primary', 0.32], blend: ['text', 0.06], mark: ['primary', 0.45] },
    library: { field: ['surface', 'accent', 0.26], blend: ['secondary', 0.15], mark: ['accent', 0.35] },
  },
  shape: ['text', 0.08],
});

// ---------------------------------------------------------------------------
// Schatten (boxShadow gilt auf iOS und Android gleich)
// ---------------------------------------------------------------------------

export type Shadows = {
  card: ViewStyle; // Karten (PDF: weich und kurz, nach Augenmaß gemessen)
  primaryButton: ViewStyle; // Hauptknopf mit warmem Schein (nach Augenmaß)
};

const lightShadow: Shadows = {
  card: {
    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(42, 33, 28, 0.08)' }],
  },
  primaryButton: {
    boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 16, color: 'rgba(180, 83, 47, 0.25)' }],
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
