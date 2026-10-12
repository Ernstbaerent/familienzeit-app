import {
  darkColors,
  darkModeEnabled,
  darkTheme,
  fontSize,
  fonts,
  lightColors,
  lightTheme,
  lineHeight,
  radius,
  resolveTheme,
  size,
  spacing,
  type Colors,
} from './theme';

// Kontrast nach WCAG 2.x (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
function luminance(hex: string): number {
  const channel = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text muss auf dem Grund WCAG AA (4,5:1) schaffen. Honig (`accent`) steht bewusst nicht in der Liste:
// nur Akzent, nie für Text. Salbei (`secondary`) ist nur als Fläche mit `onSecondary` erlaubt.
const textPairs: [keyof Colors, keyof Colors][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'card'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'card'],
  ['onSelected', 'selected'], // gewählter Chip: Text auf Tinte
  ['onPrimary', 'primary'],
  ['onSecondary', 'secondary'],
  ['primary', 'background'], // Terrakotta als Textfarbe, z. B. „Ändern“: nur auf `background`
  ['danger', 'background'],
  ['danger', 'surface'],
  ['danger', 'dangerSurface'],
  ['text', 'dangerSurface'],
  ['warning', 'background'],
  ['warning', 'surface'],
  ['warning', 'warningSurface'],
  ['text', 'warningSurface'],
];

// Symbole und andere Bedienelemente: mindestens 3:1 (WCAG 1.4.11).
const graphicPairs: [keyof Colors, keyof Colors][] = [
  ['icon', 'background'],
  ['icon', 'surface'],
  ['icon', 'card'],
  ['selected', 'card'], // gewählt gegen nicht gewählt: Der Unterschied darf nicht nur an der Farbe hängen
];

describe.each([
  ['hell', lightColors],
  ['dunkel', darkColors],
])('Farben (%s)', (_name, palette) => {
  it.each(textPairs)('%s auf %s: mindestens 4,5:1', (foreground, background) => {
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(graphicPairs)('%s auf %s: mindestens 3:1', (foreground, background) => {
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(3);
  });

  it('alle Werte sind gültige Hex-Farben', () => {
    for (const value of Object.values(palette)) expect(value).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('Farben: Werte aus der DESIGN.md', () => {
  it('hell: Papier, Sand, Tinte, Terrakotta, Salbei, Honig', () => {
    expect(lightColors).toMatchObject({
      background: '#FAF6F0',
      surface: '#F0E6D8',
      text: '#2A211C',
      primary: '#B4532F',
      secondary: '#5F7A5A',
      accent: '#E8A94F',
    });
  });

  it('hell: Karten weiß, gewählt ist Tinte (Entscheidung 11)', () => {
    expect(lightColors).toMatchObject({ card: '#FFFFFF', selected: '#2A211C', onSelected: '#FAF6F0' });
  });

  it('gewählt ist nicht Terrakotta und Karten sind nicht Sand (Entscheidung 11)', () => {
    for (const palette of [lightColors, darkColors]) {
      expect(palette.selected).not.toBe(palette.primary);
      expect(palette.card).not.toBe(palette.surface);
    }
  });

  it('dunkel: Grund, Text, Hauptfarbe mit dunkler Schrift', () => {
    expect(darkColors).toMatchObject({
      background: '#1C1714',
      text: '#F3EBE2',
      primary: '#E3825C',
      onPrimary: '#1C1714',
    });
  });

  it('hell und dunkel haben dieselben Namen (Typ erzwingt das auch)', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});

describe('Größen aus der DESIGN.md', () => {
  it('Anleitungstext 20 px, Schritte mit 28 px Abstand', () => {
    expect(fontSize.reading).toBe(20);
    expect(spacing.stepGap).toBe(28);
  });

  it('Tippflächen mindestens 44, Abhak-Felder 56', () => {
    expect(size.touch).toBe(44);
    expect(size.checkbox).toBe(56);
  });

  it('Karte 22, Kachel 16, Knopf Pille', () => {
    expect(radius.card).toBe(22);
    expect(radius.tile).toBe(16);
    expect(radius.full).toBeGreaterThanOrEqual(1000);
  });

  it('jede Schriftgröße hat eine Zeilenhöhe, die größer ist als die Schrift', () => {
    expect(Object.keys(lineHeight).sort()).toEqual(Object.keys(fontSize).sort());
    for (const key of Object.keys(fontSize) as (keyof typeof fontSize)[]) {
      expect(lineHeight[key]).toBeGreaterThan(fontSize[key]);
    }
  });

  it('Schriftnamen: Literata für Titel und Zahlen, Onest für Text und Bedienung', () => {
    expect(fonts.title).toMatch(/^Literata_/);
    expect(fonts.number).toMatch(/^Literata_/);
    expect(fonts.body).toMatch(/^Onest_/);
    expect(fonts.bodyMedium).toMatch(/^Onest_/);
    expect(fonts.bodyStrong).toMatch(/^Onest_/);
  });
});

describe('resolveTheme', () => {
  it('bleibt hell, solange der Dunkelmodus aus ist, auch wenn das Handy dunkel ist', () => {
    expect(resolveTheme('dark', false)).toBe(lightTheme);
  });

  it('folgt der Handy-Einstellung, wenn der Dunkelmodus an ist', () => {
    expect(resolveTheme('dark', true)).toBe(darkTheme);
    expect(resolveTheme('light', true)).toBe(lightTheme);
  });

  it('nimmt hell, wenn das Handy nichts meldet', () => {
    expect(resolveTheme(null, true)).toBe(lightTheme);
    expect(resolveTheme(undefined, true)).toBe(lightTheme);
    expect(resolveTheme('unspecified', true)).toBe(lightTheme);
  });

  it('der Dunkelmodus ist bis D5 ausgeschaltet', () => {
    // Beim Einschalten in D5 diesen Test anpassen (Roadmap, docs/theme.md).
    expect(darkModeEnabled).toBe(false);
  });
});
