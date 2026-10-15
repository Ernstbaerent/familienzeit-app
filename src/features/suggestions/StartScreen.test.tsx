// Der Start mit Auswahl: Hauptknopf, Stift-Beschriftung, Verlauf, Platzhalter und Umbruch bei vielen Kindern,
// großer Systemschrift und Englisch. Ohne Handy: Die Bausteine werden mit echten Texten (de und en) gezeichnet.

import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

import type { ChildProfile } from '@/features/profiles/profiles';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import { iconSize, lightColors, size, spacing } from '@/lib/theme';

import { StartScreen } from './StartScreen';

// Ionicons lädt seine Schrift asynchron und meldet das im Test als Warnung. Hier genügt der Name des Symbols als Text.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text: NativeText } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { name: string }) => createElement(NativeText, props, props.name),
  };
});

// Fenster und Systemschrift, die der Start sieht. Jeder Test setzt sie neu.
const mockWindow = { width: 360, height: 800, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function translator(language: 'de' | 'en') {
  const i18n = createInstance();
  i18n.init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: language,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

// Ein Kind, das jetzt genau 4 Jahre alt ist (Geburtsmonat Januar liegt nie nach dem heutigen Monat).
function makeChild(id: string, nickname?: string): ChildProfile {
  return {
    id,
    nickname,
    birthYear: new Date().getFullYear() - 4,
    birthMonth: 1,
    interests: [],
    dislikes: [],
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

type Props = Partial<React.ComponentProps<typeof StartScreen>>;

function renderStart(props: Props = {}, language: 'de' | 'en' = 'de') {
  const handlers = {
    onToggleChild: jest.fn(),
    onEditChild: jest.fn(),
    onAddChild: jest.fn(),
    onSelectTime: jest.fn(),
    onSelectEnergy: jest.fn(),
    onStart: jest.fn(),
    onOpenHistory: jest.fn(),
  };
  const merged = {
    profiles: [makeChild('a', 'Mila'), makeChild('b', 'Jonas')],
    selectedChildIds: ['a', 'b'],
    time: null,
    parentEnergy: null,
    hasHistory: false,
    ...handlers,
    ...props,
  } as React.ComponentProps<typeof StartScreen>;
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <I18nextProvider i18n={translator(language)}>
        <StartScreen {...merged} />
      </I18nextProvider>,
    );
  });
  return { root: renderer.root, handlers };
}

const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style) ?? {};

function allTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(''))
    .filter((text) => text !== '');
}

function mainButton(root: ReactTestInstance) {
  const buttons = root
    .findAllByProps({ accessibilityRole: 'button' }, { deep: false })
    .filter((node) => allTexts(node).some((text) => text === 'Was machen wir?' || text === 'What shall we do?'));
  expect(buttons).toHaveLength(1);
  return buttons[0];
}

function buttonByLabel(root: ReactTestInstance, label: string) {
  return root.findByProps({ accessibilityLabel: label });
}

beforeEach(() => {
  Object.assign(mockWindow, { width: 360, height: 800, scale: 3, fontScale: 1 });
});

describe('Hauptknopf „Was machen wir?“', () => {
  it('ist inaktiv, solange keine Zeit gewählt ist, und der Hinweis nennt die fehlende Zeit', () => {
    const { root } = renderStart({ time: null });
    const button = mainButton(root);
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(allTexts(root)).toContain('Bitte wähle, wie viel Zeit ihr habt.');
    expect(allTexts(root)).not.toContain('Bitte wähle mindestens ein Kind.');
    expect(button.props.accessibilityHint).toBe('Bitte wähle, wie viel Zeit ihr habt.');
  });

  it('ist inaktiv, solange kein Kind gewählt ist, und der Hinweis nennt das fehlende Kind', () => {
    const { root } = renderStart({ selectedChildIds: [], time: 'hour1' });
    const button = mainButton(root);
    expect(button.props.disabled).toBe(true);
    expect(allTexts(root)).toContain('Bitte wähle mindestens ein Kind.');
    expect(allTexts(root)).not.toContain('Bitte wähle, wie viel Zeit ihr habt.');
    expect(button.props.accessibilityHint).toBe('Bitte wähle mindestens ein Kind.');
  });

  it('fehlt beides, nennt der Hinweis beide Gründe', () => {
    const { root } = renderStart({ selectedChildIds: [], time: null });
    expect(mainButton(root).props.disabled).toBe(true);
    expect(allTexts(root)).toEqual(
      expect.arrayContaining(['Bitte wähle mindestens ein Kind.', 'Bitte wähle, wie viel Zeit ihr habt.']),
    );
  });

  it('ist aktiv mit mindestens einem Kind und gewählter Zeit, auch ohne Energie, und ruft onStart', () => {
    const { root, handlers } = renderStart({ selectedChildIds: ['a'], time: 'minutes30', parentEnergy: null });
    const button = mainButton(root);
    expect(button.props.disabled).toBe(false);
    expect(button.props.accessibilityHint).toBeUndefined();
    expect(allTexts(root)).not.toContain('Bitte wähle, wie viel Zeit ihr habt.');
    expect(allTexts(root)).not.toContain('Bitte wähle mindestens ein Kind.');
    act(() => button.props.onPress());
    expect(handlers.onStart).toHaveBeenCalledTimes(1);
  });

  it('hat einen Pfeil, dessen Richtung dem Layout folgt (bei rechts-nach-links gespiegelt), und die Größe eines Hauptknopfs', () => {
    const { root } = renderStart({ time: 'hour1' });
    const arrow = mainButton(root).findByProps({ accessibilityElementsHidden: true });
    expect(arrow.props.name).toBe('arrow-forward-outline');
    expect(arrow.props.style).toEqual({ transform: [{ scaleX: 1 }] }); // hier nicht gespiegelt (Layout links-nach-rechts)
    expect(flat(mainButton(root)).minHeight).toBeGreaterThanOrEqual(size.touch);
  });
});

describe('Zeit und Energie', () => {
  it('Zeit: vier Chips, keiner vorgewählt, ein Tipp meldet die Wahl', () => {
    const { root, handlers } = renderStart();
    const group = root.findAllByProps({ accessibilityRole: 'radiogroup' }, { deep: false })[0];
    const chips = group.findAllByProps({ accessibilityRole: 'radio' }, { deep: false });
    expect(chips).toHaveLength(4);
    expect(chips.map((chip) => allTexts(chip)[0])).toEqual(['30 Min.', '1 Std.', '2 Std.', 'Halber Tag']);
    expect(chips.every((chip) => chip.props.accessibilityState.checked === false)).toBe(true);
    act(() => chips[3].props.onPress());
    expect(handlers.onSelectTime).toHaveBeenCalledWith('halfDay');
  });

  it('Energie: freiwillig und ohne Vorbelegung, drei Kacheln mit Batterie-Symbol', () => {
    const { root } = renderStart();
    expect(allTexts(root)).toContain('(freiwillig)');
    const group = root.findAllByProps({ accessibilityRole: 'radiogroup' }, { deep: false })[1];
    const chips = group.findAllByProps({ accessibilityRole: 'radio' }, { deep: false });
    expect(chips.map((chip) => allTexts(chip).join('|'))).toEqual([
      'battery-dead-outline|Müde',
      'battery-half-outline|Normal',
      'battery-full-outline|Fit',
    ]);
    expect(chips.every((chip) => chip.props.accessibilityState.checked === false)).toBe(true);
  });

  it('Energie: Nochmal tippen hebt die Wahl auf (null), und der Hinweis dazu steht nur an der gewählten', () => {
    const { root, handlers } = renderStart({ parentEnergy: 'normal' });
    const group = root.findAllByProps({ accessibilityRole: 'radiogroup' }, { deep: false })[1];
    const [tired, normal] = group.findAllByProps({ accessibilityRole: 'radio' }, { deep: false });
    expect(tired.props.accessibilityHint).toBeUndefined();
    expect(normal.props.accessibilityHint).toBe('Nochmal tippen hebt die Auswahl auf.');
    act(() => normal.props.onPress());
    expect(handlers.onSelectEnergy).toHaveBeenLastCalledWith(null);
    act(() => tired.props.onPress());
    expect(handlers.onSelectEnergy).toHaveBeenLastCalledWith('tired');
  });
});

describe('Kinder-Kacheln', () => {
  it('ein Tipp auf die Kachel wählt aus oder ab und meldet den Zustand der Sprachausgabe', () => {
    const { root, handlers } = renderStart({ selectedChildIds: ['a'] });
    const mila = buttonByLabel(root, 'Mila, 4 Jahre');
    expect(mila.props.accessibilityRole).toBe('checkbox');
    expect(mila.props.accessibilityState).toMatchObject({ checked: true });
    const jonas = buttonByLabel(root, 'Jonas, 4 Jahre');
    expect(jonas.props.accessibilityState).toMatchObject({ checked: false });
    act(() => jonas.props.onPress());
    expect(handlers.onToggleChild).toHaveBeenCalledWith('b');
    expect(handlers.onEditChild).not.toHaveBeenCalled();
  });

  it('Stift mit Namen: „Mila bearbeiten“, mindestens 44 × 44 und getrennt von der Kachel', () => {
    const { root, handlers } = renderStart();
    const pencil = buttonByLabel(root, 'Mila bearbeiten');
    expect(pencil.props.accessibilityRole).toBe('button');
    expect(flat(pencil)).toMatchObject({ minWidth: size.touch, minHeight: size.touch });
    act(() => pencil.props.onPress());
    expect(handlers.onEditChild).toHaveBeenCalledWith('a');
    expect(handlers.onToggleChild).not.toHaveBeenCalled();
  });

  it('Stift ohne Spitzname: „Kind, 4 Jahre bearbeiten“', () => {
    const { root, handlers } = renderStart({
      profiles: [makeChild('x'), makeChild('y', 'Jonas')],
      selectedChildIds: ['x'],
    });
    const pencil = buttonByLabel(root, 'Kind, 4 Jahre bearbeiten');
    act(() => pencil.props.onPress());
    expect(handlers.onEditChild).toHaveBeenCalledWith('x');
    // Die Kachel selbst heißt weiter „Kind 1“, im Kreis steht die Nummer.
    expect(buttonByLabel(root, 'Kind 1, 4 Jahre').props.accessibilityState).toMatchObject({ checked: true });
    expect(allTexts(root)).toContain('Kind 1');
  });

  it('Englisch: „Edit Mila“ und „Edit child, 4 years“', () => {
    const { root } = renderStart({ profiles: [makeChild('x'), makeChild('a', 'Mila')] }, 'en');
    expect(buttonByLabel(root, 'Edit child, 4 years')).toBeDefined();
    expect(buttonByLabel(root, 'Edit Mila')).toBeDefined();
  });

  it('der Kreis zeigt den Anfangsbuchstaben in Großbuchstaben', () => {
    const { root } = renderStart({ profiles: [makeChild('a', 'mila')] });
    expect(allTexts(root)).toContain('M');
  });

  it('die Kachel „Kind hinzufügen“ ruft onAddChild, auch auf Englisch beschriftet', () => {
    const { root, handlers } = renderStart();
    const add = root
      .findAllByProps({ accessibilityRole: 'button' }, { deep: false })
      .find((node) => allTexts(node).includes('Kind hinzufügen'));
    expect(add).toBeDefined();
    act(() => add!.props.onPress());
    expect(handlers.onAddChild).toHaveBeenCalledTimes(1);
    expect(allTexts(renderStart({}, 'en').root)).toContain('Add a child');
  });
});

describe('Verlauf, Datenschutz-Text und Platzhalter', () => {
  it('„Verlauf“ erscheint nur, wenn es Einträge gibt', () => {
    expect(allTexts(renderStart({ hasHistory: false }).root)).not.toContain('Verlauf');
    const { root, handlers } = renderStart({ hasHistory: true });
    expect(allTexts(root)).toContain('Verlauf');
    const history = buttonByLabel(root, 'Verlauf');
    expect(flat(history).minHeight).toBeGreaterThanOrEqual(size.touch);
    act(() => history.props.onPress());
    expect(handlers.onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('zeigt unter dem Knopf den Datenschutz-Text, de und en, nicht „Ohne Tracking“', () => {
    const german = allTexts(renderStart().root);
    expect(german).toContain('Kein Konto nötig. Deine Daten bleiben auf deinem Handy.');
    const english = allTexts(renderStart({}, 'en').root);
    expect(english).toContain('No account needed. Your data stays on your phone.');
    for (const text of [...german, ...english]) expect(text).not.toMatch(/Tracking/i);
  });

  it('der Start zeigt kein Wetter und fragt nicht nach dem Standort (Entscheidung 7)', () => {
    for (const language of ['de', 'en'] as const) {
      const texts = allTexts(renderStart({ time: 'hour1', hasHistory: true }, language).root);
      for (const text of texts) expect(text).not.toMatch(/Standort|Wetter|location|weather/i);
    }
  });

  it('der Stimmungsbild-Platzhalter ist Sand mit Sonne und für die Sprachausgabe versteckt', () => {
    const { root } = renderStart();
    const band = root.findByProps({ importantForAccessibility: 'no-hide-descendants' });
    expect(band.props.accessibilityElementsHidden).toBe(true);
    expect(flat(band)).toMatchObject({ backgroundColor: lightColors.surface });
    expect(band.findByProps({ name: 'sunny-outline' })).toBeDefined();
  });

  it('die Wortmarke ist das Logo (Bild) und heißt für die Sprachausgabe „Miki“, nicht mehr ein Platzhalter-Text', () => {
    const { root } = renderStart();
    const logo = root.findByProps({ accessibilityLabel: 'Miki' });
    expect(logo.props.accessibilityRole).toBe('image');
    expect(logo.props.accessible).toBe(true);
    expect(allTexts(root)).not.toContain('miki');
  });

  it('die Überschrift ist eine Überschrift für die Sprachausgabe', () => {
    const { root } = renderStart();
    const headers = root.findAllByProps({ accessibilityRole: 'header' }, { deep: false });
    expect(headers.some((node) => allTexts(node).includes('Wer ist heute dabei?'))).toBe(true);
  });
});

describe('Viele Kinder, große Systemschrift, Englisch: nichts wird abgeschnitten', () => {
  const sevenChildren = Array.from({ length: 7 }, (_, index) => makeChild(`c${index}`, `Kind-${index}`));

  function tileWidths(root: ReactTestInstance) {
    return sevenChildren.map((child) => {
      const tile = root.findByProps({ accessibilityLabel: `${child.nickname}, 4 Jahre` });
      // Die Kachel ist der Elternknoten der antippbaren Fläche.
      return flat(tile.parent!.parent!).width as number;
    });
  }

  it('alle Kinder sind da, die Reihe bricht um (kein seitliches Verstecken)', () => {
    const { root } = renderStart({ profiles: sevenChildren, selectedChildIds: ['c0'] });
    expect(sevenChildren.every((child) => root.findAllByProps({ accessibilityLabel: `${child.nickname}, 4 Jahre` }).length > 0)).toBe(true);
    const rows = root.findAll((node) => flat(node).flexWrap === 'wrap');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Kein Raster außer dem von ScrollView mit horizontalem Scrollen
    expect(root.findAll((node) => node.props.horizontal === true)).toHaveLength(0);
  });

  it('normale Schrift: drei Kacheln nebeneinander, die in eine Zeile passen', () => {
    const { root } = renderStart({ profiles: sevenChildren, selectedChildIds: ['c0'] });
    const widths = tileWidths(root);
    const contentWidth = mockWindow.width - 2 * spacing.lg;
    expect(new Set(widths).size).toBe(1);
    expect(widths[0] * 3 + 2 * spacing.sm).toBeLessThanOrEqual(contentWidth);
    expect(widths[0] * 4 + 3 * spacing.sm).toBeGreaterThan(contentWidth);
  });

  it('sehr große Systemschrift: eine Kachel pro Zeile über die ganze Breite', () => {
    mockWindow.fontScale = 3;
    const { root } = renderStart({ profiles: sevenChildren, selectedChildIds: ['c0'] });
    const contentWidth = mockWindow.width - 2 * spacing.lg;
    expect(new Set(tileWidths(root))).toEqual(new Set([contentWidth]));
  });

  it('große Systemschrift: weniger Spalten als bei normaler Schrift', () => {
    const normal = tileWidths(renderStart({ profiles: sevenChildren }).root)[0];
    mockWindow.fontScale = 1.5;
    const large = tileWidths(renderStart({ profiles: sevenChildren }).root)[0];
    expect(large).toBeGreaterThan(normal);
  });

  it('kein Text begrenzt seine Zeilen: Auch lange Namen und englische Texte brechen um statt abgeschnitten zu werden', () => {
    mockWindow.fontScale = 2;
    const { root } = renderStart(
      {
        profiles: [makeChild('a', 'Maximilian-Alexander'), ...sevenChildren.slice(0, 2)],
        selectedChildIds: ['a'],
        time: 'halfDay',
        parentEnergy: 'fit',
        hasHistory: true,
      },
      'en',
    );
    for (const node of root.findAllByType(Text)) {
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.ellipsizeMode).toBeUndefined();
    }
    expect(allTexts(root)).toEqual(expect.arrayContaining(['Maximilian-Alexander', 'Energetic', 'Half a day']));
  });

  it('Englisch bei normaler Schrift: die drei Energie-Kacheln stehen in einer Reihe, das längste Wort „Energetic“ passt', () => {
    const { root } = renderStart({}, 'en');
    const group = root.findAllByProps({ accessibilityRole: 'radiogroup' }, { deep: false })[1];
    const tiles = group.findAllByProps({ accessibilityRole: 'radio' }, { deep: false });
    const widths = tiles.map((tile) => flat(tile).width as number);
    const contentWidth = mockWindow.width - 2 * spacing.lg;
    expect(widths.reduce((sum, width) => sum + width, 0) + 2 * spacing.sm).toBeLessThanOrEqual(contentWidth);
    expect(tiles.map((tile) => allTexts(tile).at(-1))).toEqual(['Tired', 'Okay', 'Energetic']);
  });

  it('Kreis und Häkchen-Punkt wachsen mit der Systemschrift mit, damit ihre Zeichen nicht herausragen', () => {
    const avatarOf = (root: ReactTestInstance) =>
      root.findAllByType(Text).find((node) => node.props.children === 'M')!.parent!;
    const normal = flat(avatarOf(renderStart({ selectedChildIds: ['a'] }).root)).width as number;
    mockWindow.fontScale = 2;
    const { root } = renderStart({ selectedChildIds: ['a'] });
    expect(flat(avatarOf(root)).width).toBe(normal * 2);
    const badge = root.findByProps({ name: 'checkmark' }).parent!;
    expect(flat(badge).width).toBe(flat(badge).height);
  });

  it('das Sonnen-Symbol bleibt bei jeder Systemschrift gleich groß, ohne die Skalierung zu sperren', () => {
    for (const fontScale of [1, 1.5, 3]) {
      mockWindow.fontScale = fontScale;
      const { root } = renderStart();
      const sun = root.findByProps({ name: 'sunny-outline' });
      // Die Schrift schlägt `fontScale` wieder drauf: Größe × Faktor ergibt die feste Größe.
      expect(sun.props.size * fontScale).toBeCloseTo(iconSize.hero);
      expect(sun.props.allowFontScaling).toBeUndefined();
    }
  });

  it('Zeit-Chips und Energie-Kacheln brechen bei sehr großer Schrift in eine Spalte um', () => {
    mockWindow.fontScale = 3;
    const { root } = renderStart();
    const contentWidth = mockWindow.width - 2 * spacing.lg;
    for (const index of [0, 1]) {
      const group = root.findAllByProps({ accessibilityRole: 'radiogroup' }, { deep: false })[index];
      for (const chip of group.findAllByProps({ accessibilityRole: 'radio' }, { deep: false })) {
        expect(flat(chip).width).toBe(contentWidth);
      }
    }
  });
});
