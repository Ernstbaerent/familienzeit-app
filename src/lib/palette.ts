// Die Palette „C“ (DESIGN.md, Entscheidung 55): Leinen, Rosé, Petrol, Tinte, dazu zwei warme Gegenstandsfarben für Zeichnungen.
// Reine Werte ohne React Native: Das Theme (theme.ts) und das Zeichnungs-Skript (scripts/build-illustrations.ts) lesen sie von hier.
// Kontraste und Herkunft: docs/theme.md. Alles andere im Theme (Flächen, Nebentext, Rahmen) wird aus diesen Farben abgeleitet.

export const palette = {
  linen: '#FCF8F2', // Leinen: Grund (von Clemens festgelegt)
  rose: '#F4BEBB', // Rosé: Pastellflächen (von Clemens festgelegt)
  petrol: '#1A5D74', // Petrol: Hauptfarbe, Knöpfe, Logo, Links (von Clemens festgelegt)
  ink: '#12323D', // Tinte: Text (von Clemens festgelegt)
  white: '#FFFFFF', // Karten und Text auf Petrol
  // Warme Gegenstandsfarben, nur in Zeichnungen für Essen, Pappe und Holz, nie für Flächen der App (ILLUSTRATIONEN.md).
  // Gleiche Familie wie die Warnfarben (Honig bis Braun).
  honey: '#E8A94F', // Honig: Teig, Käse, Licht (Tinte darauf 6,6:1)
  brown: '#B07A45', // Braun: Pappe, Holz (Tinte darauf 3,7:1)
} as const;

// Mischt zwei Farben: `share` ist der Anteil von `other` (0 = nur `base`, 1 = nur `other`).
export function mixColors(base: string, other: string, share: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16);
  const mixed = [1, 3, 5].map((start) =>
    Math.round(channel(base, start) + (channel(other, start) - channel(base, start)) * share),
  );
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// Die Farbplätze der Zeichnungen (docs/design/ILLUSTRATIONEN.md): Jede Farbe in einer Zeichnung ist ein Platzhalter
// `{{name}}` in der Vorlage (assets/illustrations/src/), das Skript `npm run illustrations:build` setzt diese Werte ein.
// Zeichnungen bleiben auch im Dunkelmodus hell, deshalb gibt es nur diese eine Belegung.
export const illustrationPalette = {
  paper: palette.linen, // Köpfe, Hände, helle Gegenstände, Schaum, großer Kreis hinter dem Motiv
  ground: mixColors(palette.linen, palette.rose, 0.3), // Grund des Bildes (gleich `surface` im Theme)
  ink: palette.ink, // alle Linien, kleine dunkle Punkte
  rose: palette.rose, // Kleidung, Sauce, Vorhänge: sparsam
  petrol: palette.petrol, // Kleidung, Socken
  honey: palette.honey, // Teig, Käse, Handschuh, Tube
  brown: palette.brown, // Pappe, Holz
  // Hauttöne der Figuren (docs/design/FIGUREN.md, Variante A, von Clemens gewählt): Kopf und Hände, von hell bis tief, Farbton 21° bis 26°.
  // Der Tinten-Umriss trägt auf den hellen, die Haut selbst auf den tiefen Tönen (Regel und Kontraste: FIGUREN.md).
  skin1: '#F1CDB3',
  skin2: '#DDAA85',
  skin3: '#C48A62',
  skin4: '#B07A52',
  skin5: '#A56B45',
  skin6: '#8C5C3E',
  skin7: '#76492F',
  skin8: '#613A25',
} as const;

export type IllustrationColorName = keyof typeof illustrationPalette;
