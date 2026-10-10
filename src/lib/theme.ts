// Zentrale Gestaltungswerte der App: Farben, Schriftgrößen, Abstände und Eckenradien.
// Bildschirme und Bausteine nehmen diese Werte NUR von hier, nie direkt im Style.
// `npx expo lint` meldet direkt eingetragene Werte in app/, src/components/ und src/features/.
//
// Die Werte sind neutrale Platzhalter, bis Ani das Design festlegt.
// Ändert sich hier ein Wert, ändert er sich überall in der App.

export const colors = {
  background: '#FFFFFF', // Hintergrund der Bildschirme
  surface: '#F2F2F2', // Karten, Eingabefelder
  text: '#1A1A1A', // normaler Text, Überschriften
  textMuted: '#666666', // Nebentext, Hinweise
  primary: '#333333', // Hauptknöpfe, Hervorhebungen
  onPrimary: '#FFFFFF', // Text auf `primary`
  border: '#D9D9D9', // Linien, Rahmen
  danger: '#B3261E', // Löschen, Fehlermeldungen
} as const;

export const fontSize = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

// Zeilenhöhe passend zur Schriftgröße mit demselben Namen (z. B. fontSize.lg + lineHeight.lg).
export const lineHeight = {
  sm: 20,
  md: 24,
  lg: 26,
  xl: 32,
  xxl: 40,
} as const;

// Für margin, padding und gap.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Durchsichtigkeit (0 = unsichtbar, 1 = voll sichtbar).
export const opacity = {
  disabled: 0.4, // nicht auswählbare Knöpfe und Chips
} as const;

// Für borderRadius (auch borderTopStartRadius usw.).
export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999, // ganz rund, z. B. für runde Knöpfe
} as const;
