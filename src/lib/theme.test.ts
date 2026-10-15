import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { categoryKeys } from '@/features/activities/activities';
import { placeVisualKeys } from '@/features/places/placeKinds';
import { contrastRatio as contrast } from './contrast';
import { palette } from './palette';

import {
  darkColors,
  darkModeEnabled,
  darkTheme,
  fontSize,
  fonts,
  lightColors,
  lightTheme,
  lineHeight,
  mixColors,
  radius,
  resolveTheme,
  size,
  spacing,
  type Colors,
} from './theme';

// Text muss auf dem Grund WCAG AA (4,5:1) schaffen. Rosé (`accent`) steht bewusst nicht in der Liste:
// nur Akzent, nie für Text. Rosé (`secondary`) ist nur als Fläche mit `onSecondary` (Tinte) erlaubt.
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
  ['primary', 'background'], // Petrol als Textfarbe und Link (unterstrichen), z. B. „Ändern“
  ['primary', 'card'],
  ['primary', 'surface'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['danger', 'card'],
  ['danger', 'dangerSurface'],
  ['text', 'dangerSurface'],
  ['warning', 'background'],
  ['warning', 'surface'],
  ['warning', 'warningSurface'],
  ['text', 'warningSurface'],
  ['warning', 'card'], // „Mit Erwachsenen“ in der Sicherheitsbox (weiße Pille)
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

// Abhak-Felder beim Material der Detailansicht (D4, Entscheidung 13 und 17): Der Rand kommt aus der Palette (`icon`) und hat mindestens 3:1
// zum Grund (WCAG 1.4.11). Abgehakt ist Tinte (`selected`) mit Häkchen (`onSelected`). Gerendert wird das in ActivityScreen.test.tsx.
describe.each([
  ['hell', lightColors],
  ['dunkel', darkColors],
])('Abhak-Felder (%s, Entscheidung 17)', (_name, palette) => {
  it('der Rand (`icon`) hat mindestens 3:1 zur weißen Karte, auf der die Liste steht, und zum Papier', () => {
    expect(contrast(palette.icon, palette.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.icon, palette.background)).toBeGreaterThanOrEqual(3);
  });

  it('der Rand ist nicht `border` (nur 1,7:1, gliedert nur die Zeilen)', () => {
    expect(palette.icon).not.toBe(palette.border);
    expect(contrast(palette.border, palette.card)).toBeLessThan(3);
  });

  it('abgehakt: Tinte gegen die Karte mindestens 3:1, das Häkchen darauf mindestens 4,5:1', () => {
    expect(contrast(palette.selected, palette.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.onSelected, palette.selected)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Farben: Palette C (Entscheidung 55)', () => {
  it('hell: Leinen, Rosé, Petrol, Tinte', () => {
    expect(lightColors).toMatchObject({
      background: '#FCF8F2',
      secondary: '#F4BEBB',
      primary: '#1A5D74',
      text: '#12323D',
    });
  });

  it('hell: Karten weiß, gewählt ist Tinte, Weiß auf Petrol, Tinte auf Rosé', () => {
    expect(lightColors).toMatchObject({
      card: '#FFFFFF',
      selected: '#12323D',
      onSelected: '#FCF8F2',
      onPrimary: '#FFFFFF',
      onSecondary: '#12323D',
    });
  });

  it('die von Clemens gemessenen Kontraste stimmen (Rundung auf eine Stelle)', () => {
    const round = (value: number) => Math.round(value * 10) / 10;
    expect(round(contrast(palette.petrol, palette.linen))).toBe(6.9);
    expect(round(contrast(palette.white, palette.petrol))).toBe(7.3);
    expect(round(contrast(palette.ink, palette.linen))).toBe(12.8);
    expect(round(contrast(palette.ink, palette.rose))).toBe(8.3); // Clemens maß 8,4:1, die Rechnung nach WCAG ergibt 8,3:1
    expect(round(contrast(palette.petrol, palette.rose))).toBe(4.5);
    // Rosé auf Leinen reicht nicht zum Abgrenzen (1,5:1): Rosé-Flächen brauchen Rand oder genug Fläche.
    expect(round(contrast(palette.rose, palette.linen))).toBe(1.5);
  });

  it('auf Rosé steht immer Tinte, nie gedämpfter Text (3,6:1) oder Weiß', () => {
    expect(lightColors.onSecondary).toBe(lightColors.text);
    expect(contrast(lightColors.textMuted, lightColors.secondary)).toBeLessThan(4.5);
    expect(contrast(palette.white, lightColors.secondary)).toBeLessThan(4.5);
  });

  it('gewählt ist nicht der Hauptknopf (Tinte, nicht Petrol) und Karten sind nicht `surface` (Entscheidung 11)', () => {
    for (const palette of [lightColors, darkColors]) {
      expect(palette.selected).not.toBe(palette.primary);
      expect(palette.card).not.toBe(palette.surface);
    }
  });

  it('dunkel: sehr dunkles Petrol als Grund, Leinen als Text, Rosé als Hauptknopf mit dunkler Schrift', () => {
    expect(darkColors).toMatchObject({
      background: '#0C2630',
      text: '#FCF8F2',
      primary: '#F4BEBB',
      onPrimary: '#0C2630',
    });
  });

  it('hell und dunkel haben dieselben Namen (Typ erzwingt das auch)', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('warme Warnfarben: Gefahr ist dunkler als Hinweis (gleiche Familie), im Dunkeln heller', () => {
    expect(contrast(lightColors.danger, lightColors.background)).toBeGreaterThan(contrast(lightColors.warning, lightColors.background));
    expect(lightColors.danger).not.toBe(lightColors.warning);
  });

  it('die zwei warmen Gegenstandsfarben der Zeichnungen sind nur Zeichnungen, keine Farbrolle der App', () => {
    for (const colors of [lightColors, darkColors]) {
      expect(Object.values(colors)).not.toContain(palette.honey);
      expect(Object.values(colors)).not.toContain(palette.brown);
    }
  });
});

// Kategorie-Farben (Entscheidung 10): sieben Töne, abgetönt aus der Palette. Symbol und Text gegen die Fläche geprüft.
describe.each([
  ['hell', lightTheme],
  ['dunkel', darkTheme],
])('Kategorie-Farben (%s)', (_name, theme) => {
  const tones = theme.categoryTones;
  const colors = theme.colors;

  it('es gibt für jede der sieben Kategorien einen Ton', () => {
    expect(categoryKeys).toHaveLength(7);
    expect(Object.keys(tones).sort()).toEqual([...categoryKeys].sort());
  });

  it.each(categoryKeys)('%s: Symbol auf der Fläche mindestens 3:1', (category) => {
    expect(contrast(tones[category].mark, tones[category].field)).toBeGreaterThanOrEqual(3);
  });

  // Kochen ist im Hellen die tiefe Petrol-Fläche mit Leinen-Symbol (Entscheidung 55): Dort kann weder Tinte (4,3:1 oder weniger) noch Leinen
  // Text mit 4,5:1 tragen, und es steht kein Text auf der Fläche (der Name steht in der weißen Pille). Dort gilt für die Fläche 3:1.
  it.each(categoryKeys)('%s: Tinte (`text`) auf der Fläche mindestens 4,5:1 (tiefe Fläche: 3:1, kein Text darauf)', (category) => {
    const minimum = theme.scheme === 'light' && category === 'cooking' ? 3 : 4.5;
    expect(contrast(colors.text, tones[category].field)).toBeGreaterThanOrEqual(minimum);
  });

  it('die weiße Pille mit dem Namen der Kategorie ist lesbar (Tinte auf `card`, mindestens 4,5:1)', () => {
    expect(contrast(colors.text, colors.card)).toBeGreaterThanOrEqual(4.5);
  });

  // Drei Farbtöne reichen nicht für sieben klar verschiedene Flächen (Entscheidung 55). Der Test hält fest, dass die Flächen verschieden sind
  // und die Kreise sich abheben; den Rest tragen Symbol und Name in der Pille.
  it('die sieben Flächen sind verschieden, und der Kreis hebt sich von der Fläche ab', () => {
    const fields = categoryKeys.map((category) => tones[category].field);
    expect(new Set(fields).size).toBe(7);
    for (const category of categoryKeys) expect(tones[category].shape).not.toBe(tones[category].field);
  });

  it('alle Werte sind gültige Hex-Farben', () => {
    for (const category of categoryKeys) {
      for (const value of Object.values(tones[category])) expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('alle Werte stehen in docs/theme.md (Tabelle „Kategorie-Farben“), damit die Doku nicht abweicht', () => {
    const docs = readFileSync(join(__dirname, '../../docs/theme.md'), 'utf8').toUpperCase();
    const missing = categoryKeys.flatMap((category) =>
      Object.values(tones[category]).filter((value) => !docs.includes(value)),
    );
    expect(missing).toEqual([]);
  });
});

// Orte (M10b): Spielplatz, Bad, Museum, Zoo, Burg, Kino, Bibliothek haben seit Entscheidung 55 keine eigenen Farben mehr.
// Sie nehmen den Ton einer Aktivitäts-Kategorie, Symbol und Name in der Pille unterscheiden sie.
const placeToneCategories: Record<(typeof placeVisualKeys)[number], (typeof categoryKeys)[number]> = {
  playground: 'movement',
  pool: 'nature',
  museum: 'craft',
  zoo: 'outing',
  castle: 'experiment',
  cinema: 'game',
  library: 'cooking',
};

describe.each([
  ['hell', lightTheme],
  ['dunkel', darkTheme],
])('Farben der Orte (%s)', (_name, theme) => {
  it('je ein Ton für die sieben Bildgruppen der Orte', () => {
    expect(Object.keys(theme.placeTones).sort()).toEqual([...placeVisualKeys].sort());
  });

  it.each(placeVisualKeys)('%s: derselbe Ton wie die Kategorie aus der Zuordnung, Symbol mindestens 3:1', (key) => {
    const tone = theme.categoryTones[placeToneCategories[key]];
    expect(theme.placeTones[key]).toEqual(tone);
    expect(contrast(tone.mark, tone.field)).toBeGreaterThanOrEqual(3);
  });

  it('alle Zuordnungen stehen in docs/theme.md (Tabelle „Farben und Symbole der Orte“)', () => {
    const docs = readFileSync(join(__dirname, '../../docs/theme.md'), 'utf8');
    const missing = placeVisualKeys.filter((key) => !docs.includes(`\`${key}\` → \`${placeToneCategories[key]}\``));
    expect(missing).toEqual([]);
  });
});

describe('mixColors', () => {
  it('0 ist die erste Farbe, 1 die zweite, dazwischen die Mischung', () => {
    expect(mixColors('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixColors('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mixColors('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mixColors('#FF0000', '#0000FF', 0.5)).toBe('#800080');
  });

  it('liefert immer sechs Zeichen in Großbuchstaben (auch bei kleinen Werten)', () => {
    expect(mixColors('#000000', '#0A0A0A', 0.5)).toBe('#050505');
    expect(mixColors('#abcdef', '#abcdef', 0.3)).toBe('#ABCDEF');
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

  it('liefert die Kategorie-Farben zum jeweiligen Theme', () => {
    expect(resolveTheme('light', true).categoryTones).toBe(lightTheme.categoryTones);
    expect(resolveTheme('dark', true).categoryTones).toBe(darkTheme.categoryTones);
    expect(lightTheme.categoryTones).not.toEqual(darkTheme.categoryTones);
  });

  it('der Dunkelmodus ist bis D5 ausgeschaltet', () => {
    // Beim Einschalten in D5 diesen Test anpassen (Roadmap, docs/theme.md).
    expect(darkModeEnabled).toBe(false);
  });
});
