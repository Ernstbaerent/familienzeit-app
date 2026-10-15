// Die Vorschlagskarte (DESIGN.md, Bildschirm 02): dieselbe Form und Höhe bei Web-Bild, Illustration und Farbfläche,
// Texte in de und en, Beschriftung für die Sprachausgabe. Ohne Handy: Die Bausteine werden mit echten Texten gezeichnet.

import { Image as ExpoImage } from 'expo-image';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

import type { Activity } from '@/features/activities/activities';
import { categoryIcons } from '@/features/activities/CategoryIcon';
import { getIllustration } from '@/features/activities/illustrations';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import { iconSize, lightTheme, radius } from '@/lib/theme';

import type { CardImageChain } from './cardImage';
import { SuggestionCard } from './SuggestionCard';

// Ionicons lädt seine Schrift asynchron und meldet das im Test als Warnung. Hier genügt der Name des Symbols als Text.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text: NativeText } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { name: string }) => createElement(NativeText, props, props.name),
  };
});

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

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'test-1',
    category: 'nature',
    topics: [],
    translations: {
      de: { title: 'Waldspaziergang', summary: 'Ein Spaziergang mit offenen Augen.', steps: ['Los'] },
      en: { title: 'Forest walk', summary: 'A walk with open eyes.', steps: ['Go'] },
    },
    ageMin: 3,
    ageMax: 8,
    durationMin: 30,
    durationMax: 60,
    setting: 'outdoor',
    weather: { needsDry: false, betterInSun: false },
    energy: 'low',
    cost: 0,
    materials: [],
    siblingFriendly: true,
    status: 'approved',
    source: 'manual',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

const chains: Record<string, CardImageChain> = {
  web: [{ kind: 'activity', uri: 'https://example.org/wald.jpg' }, { kind: 'placeholder' }],
  placeholder: [{ kind: 'placeholder' }],
};

function renderCard(
  chain: CardImageChain,
  activity: Activity = makeActivity(),
  language: 'de' | 'en' = 'de',
  onPress: () => void = jest.fn(),
) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <I18nextProvider i18n={translator(language)}>
        <SuggestionCard activity={activity} imageChain={chain} onPress={onPress} />
      </I18nextProvider>,
    );
  });
  return renderer.root;
}

const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style) ?? {};

function allTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(''))
    .filter((text) => text !== '');
}

// Der Bildbereich: das Element mit dem Seitenverhältnis der Karte (2:1).
function media(root: ReactTestInstance) {
  const found = root.findAll((node) => typeof node.type === 'string' && flat(node).aspectRatio === 2);
  expect(found).toHaveLength(1);
  return found[0];
}

// Das große Symbol der Farbfläche (nicht das kleine in der Pille).
function bigIcon(root: ReactTestInstance) {
  return root
    .findAllByType(Text)
    .filter((node) => typeof node.props.name === 'string' && node.props.size > iconSize.md);
}

function press(root: ReactTestInstance) {
  const [button] = root.findAllByProps({ accessibilityRole: 'button' }, { deep: false });
  return button;
}

beforeEach(() => {
  Object.assign(mockWindow, { width: 360, height: 800, scale: 3, fontScale: 1 });
});

describe('Form der Karte', () => {
  it.each(Object.keys(chains))('bei „%s“: weiß, Radius 22, Bildbereich 2:1, Bild-Ecken zugeschnitten', (name) => {
    const root = renderCard(chains[name]);
    const card = press(root);
    expect(card.props.accessibilityRole).toBe('button');
    expect(media(root)).toBeDefined();
    // Äußeres Element: Karte (weiß, Radius 22, mit Schatten). Inneres: schneidet die Ecken zu.
    const cardStyle = StyleSheet.flatten(card.props.style({ pressed: false }));
    expect(cardStyle).toMatchObject({
      borderRadius: radius.card,
      backgroundColor: lightTheme.colors.card,
    });
    expect(cardStyle.boxShadow).toEqual(lightTheme.shadow.card.boxShadow);
    const clip = root.find((node) => typeof node.type === 'string' && flat(node).overflow === 'hidden' && flat(node).borderRadius === radius.card);
    expect(clip).toBeDefined();
  });

  it('beide Fälle haben denselben Bildbereich (Form, Höhe) und denselben Text darunter', () => {
    const shapes = Object.keys(chains).map((name) => {
      const root = renderCard(chains[name]);
      const { aspectRatio, overflow } = flat(media(root));
      return { aspectRatio, overflow, texts: allTexts(root).filter((text) => !text.endsWith('-outline')) };
    });
    expect(shapes[1]).toEqual(shapes[0]);
  });

  it('die Karte wird nur bei Druck durchsichtig (Druck-Rückmeldung), sonst nicht', () => {
    const style = press(renderCard(chains.placeholder)).props.style;
    expect(StyleSheet.flatten(style({ pressed: false })).opacity).toBeUndefined();
    expect(StyleSheet.flatten(style({ pressed: true })).opacity).toBeLessThan(1);
  });
});

describe('Bild der Karte (Web-Adresse oder Farbfläche)', () => {
  it('1. Web-Adresse der Aktivität: ein Bild mit dieser Adresse, kein großes Symbol', () => {
    const root = renderCard(chains.web);
    const [image] = root.findAllByType(ExpoImage);
    expect(image.props.source).toEqual({ uri: 'https://example.org/wald.jpg' });
    expect(image.props.contentFit).toBe('cover');
    expect(image.props.cachePolicy).toBe('disk'); // Bild bleibt im Gerätespeicher (Adressen mit Prüfsumme ändern sich nie)
    expect(bigIcon(root)).toHaveLength(0);
  });

  it('das Bild füllt den Bereich ausdrücklich (nicht seine eigene Größe)', () => {
    // Ein Bild bringt seine eigene Größe mit; ohne Breite und Höhe 100 % wäre es so groß wie die Datei statt so breit wie die Karte.
    const root = renderCard(chains.web);
    const [image] = root.findAllByType(ExpoImage);
    expect(flat(image)).toMatchObject({ position: 'absolute', width: '100%', height: '100%' });
    expect(flat(media(root)).backgroundColor).toBe(lightTheme.colors.surface); // Sand, solange das Bild lädt
  });

  it('2. Farbfläche: kein Bild, die Fläche der Kategorie, das große Symbol in der Farbe der Kategorie', () => {
    const root = renderCard(chains.placeholder);
    expect(root.findAllByType(ExpoImage)).toHaveLength(0);
    const tone = lightTheme.categoryTones.nature;
    expect(flat(media(root)).backgroundColor).toBe(tone.field);
    const [icon] = bigIcon(root);
    expect(icon.props.name).toBe(categoryIcons.nature);
    expect(icon.props.color).toBe(tone.mark);
    expect(icon.props.size).toBe(iconSize.hero);
  });

  it('die Farbfläche nimmt je Kategorie ihre Fläche und ihr Symbol (alle sieben)', () => {
    for (const category of Object.keys(categoryIcons) as Activity['category'][]) {
      const root = renderCard(chains.placeholder, makeActivity({ category }));
      expect(flat(media(root)).backgroundColor).toBe(lightTheme.categoryTones[category].field);
      expect(bigIcon(root)[0].props.name).toBe(categoryIcons[category]);
    }
  });

  it('das große Symbol bleibt bei großer Systemschrift gleich groß (die Skalierung bleibt an)', () => {
    mockWindow.fontScale = 2;
    const root = renderCard(chains.placeholder);
    expect(bigIcon(root)[0].props.size).toBe(iconSize.hero / 2);
  });

  it('Web-Bild lädt nicht: die Farbfläche (Karte behält Form und Texte)', () => {
    const root = renderCard(chains.web);
    const before = allTexts(root);
    act(() => root.findAllByType(ExpoImage)[0].props.onError());
    expect(root.findAllByType(ExpoImage)).toHaveLength(0);
    expect(bigIcon(root)).toHaveLength(1);
    expect(flat(media(root)).backgroundColor).toBe(lightTheme.categoryTones.nature.field);
    expect(allTexts(root).filter((text) => !text.endsWith('-outline'))).toEqual(
      before.filter((text) => !text.endsWith('-outline')),
    );
  });
});

// PILOT Illustrationen (docs/design/ILLUSTRATIONEN.md): Vorrang image → Illustration → Farbfläche.
describe('Illustration (Pilot)', () => {
  const pizza = makeActivity({ id: 'homemade-pizza', category: 'cooking' });
  const illustration = getIllustration('homemade-pizza');

  it('ohne `image`: die Illustration statt der Farbfläche (kein großes Symbol, Sand als Grund), mit Pille', () => {
    const root = renderCard(chains.placeholder, pizza);
    const [image] = root.findAllByType(ExpoImage);
    expect(image.props.source).toBe(illustration?.source);
    expect(image.props.contentFit).toBe('cover');
    expect(flat(image)).toMatchObject({ position: 'absolute', width: '100%', height: '100%' });
    expect(bigIcon(root)).toHaveLength(0);
    expect(flat(media(root)).backgroundColor).toBe(lightTheme.colors.surface);
    expect(allTexts(root)).toContain(de.categories.cooking);
  });

  it('das `image` der Aktivität gewinnt vor der Illustration; lädt es nicht, kommt die Illustration', () => {
    const root = renderCard(chains.web, pizza);
    expect(root.findAllByType(ExpoImage)).toHaveLength(1);
    expect(root.findAllByType(ExpoImage)[0].props.source).toEqual({ uri: 'https://example.org/wald.jpg' });
    act(() => root.findAllByType(ExpoImage)[0].props.onError());
    expect(root.findAllByType(ExpoImage)).toHaveLength(1);
    expect(root.findAllByType(ExpoImage)[0].props.source).toBe(illustration?.source);
  });

  it('lädt die Illustration nicht, zeigt die Karte die Farbfläche', () => {
    const root = renderCard(chains.placeholder, pizza);
    act(() => root.findAllByType(ExpoImage)[0].props.onError());
    expect(root.findAllByType(ExpoImage)).toHaveLength(0);
    expect(bigIcon(root)).toHaveLength(1);
    expect(flat(media(root)).backgroundColor).toBe(lightTheme.categoryTones.cooking.field);
  });

  it('für die Sprachausgabe Dekoration, Form und Texte wie bei jeder Karte', () => {
    const root = renderCard(chains.placeholder, pizza);
    expect(media(root).props.accessibilityElementsHidden).toBe(true);
    expect(media(root).props.importantForAccessibility).toBe('no-hide-descendants');
    expect(flat(media(root)).aspectRatio).toBe(2);
  });

  it('Aktivitäten ohne Illustration bleiben unverändert bei der Farbfläche', () => {
    const root = renderCard(chains.placeholder);
    expect(root.findAllByType(ExpoImage)).toHaveLength(0);
    expect(bigIcon(root)).toHaveLength(1);
  });
});

describe('Inhalt und Texte', () => {
  it('Deutsch: Kategorie in der Pille, Titel, Kurzbeschreibung, Dauer, Altersspanne', () => {
    const texts = allTexts(renderCard(chains.placeholder));
    expect(texts).toEqual(
      expect.arrayContaining(['Natur', 'Waldspaziergang', 'Ein Spaziergang mit offenen Augen.', '30–60 Min.', '3–8 Jahre']),
    );
  });

  it('Englisch: dieselben Angaben in der App-Sprache', () => {
    const texts = allTexts(renderCard(chains.placeholder, makeActivity(), 'en'));
    expect(texts).toEqual(
      expect.arrayContaining(['Nature', 'Forest walk', 'A walk with open eyes.', '30–60 min', '3–8 years']),
    );
  });

  it('Dauer in Stunden bei langen Aktivitäten und genau ein Alter ohne Spanne', () => {
    const texts = allTexts(
      renderCard(chains.placeholder, makeActivity({ durationMin: 120, durationMax: 180, ageMin: 5, ageMax: 5 })),
    );
    expect(texts).toEqual(expect.arrayContaining(['2–3 Std.', '5 Jahre']));
  });

  it('Alter von 0 bis 16 heißt „Alle Alter“ / „All ages“', () => {
    const all = makeActivity({ ageMin: 0, ageMax: 16 });
    expect(allTexts(renderCard(chains.placeholder, all))).toContain('Alle Alter');
    expect(allTexts(renderCard(chains.placeholder, all, 'en'))).toContain('All ages');
  });

  it('die Pille zeigt das Symbol der Kategorie (klein) und ist weiß, mit Tinte als Schrift', () => {
    const root = renderCard(chains.placeholder);
    const pill = root.find(
      (node) => typeof node.type === 'string' && flat(node).backgroundColor === lightTheme.colors.card && flat(node).position === 'absolute',
    );
    const icon = pill.findAllByType(Text).find((node) => node.props.name === categoryIcons.nature)!;
    expect(icon.props.size).toBe(iconSize.sm);
    const label = pill.findAllByType(Text).find((node) => node.props.children === 'Natur')!;
    expect(flat(label).color).toBe(lightTheme.colors.text);
  });

  it('Titel und Beschreibung sind nie abgeschnitten (kein numberOfLines)', () => {
    const root = renderCard(chains.placeholder);
    for (const node of root.findAllByType(Text)) expect(node.props.numberOfLines).toBeUndefined();
  });
});

describe('Sprachausgabe', () => {
  it('die ganze Karte ist ein Knopf mit einer Beschriftung, die mit dem Titel beginnt, plus Hinweis', () => {
    const button = press(renderCard(chains.web));
    expect(button.props.accessibilityLabel).toBe(
      'Waldspaziergang. Natur, 30–60 Min., 3–8 Jahre. Ein Spaziergang mit offenen Augen.',
    );
    expect(button.props.accessibilityHint).toBe('Öffnet die Details');
  });

  it('Englisch: Beschriftung und Hinweis in der App-Sprache', () => {
    const button = press(renderCard(chains.web, makeActivity(), 'en'));
    expect(button.props.accessibilityLabel).toBe(
      'Forest walk. Nature, 30–60 min, 3–8 years. A walk with open eyes.',
    );
    expect(button.props.accessibilityHint).toBe('Opens the details');
  });

  it.each(Object.keys(chains))('bei „%s“: Der Bildbereich (Bild, Fläche, Pille) ist für die Sprachausgabe Dekoration', (name) => {
    const area = media(renderCard(chains[name]));
    expect(area.props.accessibilityElementsHidden).toBe(true);
    expect(area.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('Antippen', () => {
  it('öffnet die Details, bei jedem Bild', () => {
    for (const name of Object.keys(chains)) {
      const onPress = jest.fn();
      const root = renderCard(chains[name], makeActivity(), 'de', onPress);
      act(() => press(root).props.onPress());
      expect(onPress).toHaveBeenCalledTimes(1);
    }
  });
});
