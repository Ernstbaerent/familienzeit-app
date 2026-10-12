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

// ---------------------------------------------------------------------------
// Farben
// ---------------------------------------------------------------------------

const light = {
  background: '#FAF6F0', // Papier: Grund der Bildschirme (DESIGN.md)
  surface: '#F0E6D8', // Sand: Karten und Flächen (DESIGN.md)
  text: '#2A211C', // Tinte: normaler Text, Überschriften (DESIGN.md)
  textMuted: '#6B5D53', // Nebentext, Hinweise (PDF)
  primary: '#B4532F', // Terrakotta: Hauptknöpfe (DESIGN.md). Als Textfarbe nur auf `background`.
  onPrimary: '#FFFFFF', // Text auf `primary` (DESIGN.md)
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
  surface: '#2A221D', // abgeleitet
  text: '#F3EBE2', // DESIGN.md
  textMuted: '#B8A99B', // abgeleitet
  primary: '#E3825C', // DESIGN.md
  onPrimary: '#1C1714', // dunkle Schrift auf dem Knopf (DESIGN.md)
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
};

export const lightTheme: Theme = { scheme: 'light', colors: lightColors, shadow: lightShadow };
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors, shadow: darkShadow };

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

// Namen der geladenen Schriftschnitte (geladen in src/lib/fonts.ts). Literata für Titel und Zahlen,
// Onest für Text und Bedienung (DESIGN.md). Auf Android wählt `fontWeight` bei eigenen Schriften keinen
// Schnitt aus, sondern verfälscht ihn: immer den passenden Namen nehmen, nie `fontWeight`.
// Arabisch (Noto Naskh Arabic) kommt mit der arabischen Übersetzung.
export const fonts = {
  title: 'Literata_600SemiBold', // Titel und Überschriften
  number: 'Literata_500Medium', // Zahlen (Zeit, Alter, Schrittnummern)
  body: 'Onest_400Regular', // Fließtext
  bodyMedium: 'Onest_500Medium', // Bedienung, Chips, Knöpfe
  bodyStrong: 'Onest_600SemiBold', // betonter Text
} as const;

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
  md: 24,
  lg: 32,
} as const;
