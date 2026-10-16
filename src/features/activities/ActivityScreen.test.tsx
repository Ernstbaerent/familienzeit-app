// Die Detailansicht (DESIGN.md, Bildschirm 03, Entscheidungen 13 bis 17, Zusätze 36 ff.): Kopf mit rundem Zurück-Knopf, Bildbereich,
// Titel, Eckdaten, Allergen- und Sicherheitsbox, Material zum Abhaken, nummerierte Schritte, fester Hauptknopf, „Wie war’s?“.
// Ohne Handy: Der Bildschirm wird mit echten Texten gezeichnet, Navigation, Profile, Verlauf und Aktivitäten sind ersetzt.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { Alert, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';

import type { Activity } from '@/features/activities/activities';
import { categoryIcons } from '@/features/activities/CategoryIcon';
import { getFactTileWidths } from '@/features/activities/detailLayout';
import { getIllustration, getStepIllustrations } from '@/features/activities/illustrations';
import { makeActivity } from '@/features/suggestions/testHelpers';
import { contrastRatio } from '@/lib/contrast';
import { mirrorInRTL } from '@/lib/rtl';
import { fonts, fontSize, iconSize, lightColors, lightTheme, lineHeight, radius, size, spacing } from '@/lib/theme';
import de from '@/locales/de.json';
import en from '@/locales/en.json';

import ActivityScreen from '../../../app/activity/[id]';

// --- Ersatz für alles, was nicht zum Bildschirm gehört ---------------------------------------------------------------

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};
const mockScreenOptions: { current: Record<string, unknown> | undefined } = { current: undefined };
const mockState = {
  params: {} as Record<string, string>,
  activities: [] as Activity[],
  addEntry: jest.fn(),
  setEntryRating: jest.fn(),
};
const mockWindow = { width: 360, height: 800, scale: 3, fontScale: 1 };

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { createElement } = jest.requireActual('react');
    const { Text: NativeText } = jest.requireActual('react-native');
    return createElement(NativeText, null, `redirect:${href}`);
  },
  Stack: {
    Screen: ({ options }: { options: Record<string, unknown> }) => {
      mockScreenOptions.current = options;
      return null;
    },
  },
  useLocalSearchParams: () => mockState.params,
  useRouter: () => mockRouter,
}));
jest.mock('react-native-safe-area-context', () => {
  // Wie ein SafeAreaView, nur ohne Ränder: Die Eigenschaft `edges` bleibt am Element sichtbar, damit der Test sie lesen kann.
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { SafeAreaView: (props: object) => createElement(View, props) };
});
jest.mock('@/features/profiles/ProfilesContext', () => ({
  useProfiles: () => ({
    status: 'ready',
    profiles: [
      { id: 'a', nickname: 'Mila' },
      { id: 'b', nickname: 'Jonas' },
    ],
  }),
}));
jest.mock('@/features/history/HistoryContext', () => ({
  useHistory: () => ({
    status: 'ready',
    entries: [],
    addEntry: (...args: unknown[]) => mockState.addEntry(...args),
    setEntryRating: (...args: unknown[]) => mockState.setEntryRating(...args),
  }),
}));
jest.mock('@/features/activities/ActivitiesContext', () => ({
  useActivities: () => ({ activities: mockState.activities, source: 'bundled' }),
}));
// Gespeichert wird in dieser Ansicht nichts außer dem Verlaufseintrag (der ist oben ersetzt). Der Mock zeigt, ob jemand `setItem` aufruft.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// Ionicons lädt seine Schrift asynchron und meldet das im Test als Warnung. Hier genügt der Name des Symbols als Text.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text: NativeText } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { name: string }) => createElement(NativeText, props, props.name),
  };
});
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Hilfen ---------------------------------------------------------------------------------------------------------

function translator(language: 'de' | 'en') {
  const i18n = createInstance();
  i18n.init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: language,
    interpolation: { escapeValue: false },
  });
  return i18n;
}

// Eine Aktivität mit allem, was die Ansicht zeigt. Überschreibbar je Test.
function makeIdea(overrides: Partial<Activity> = {}): Activity {
  return makeActivity({
    id: 'idea-1',
    category: 'nature',
    translations: {
      de: {
        title: 'Waldspaziergang',
        summary: 'Ein Spaziergang mit offenen Augen.',
        steps: ['Schuhe anziehen.', 'Zum Wald gehen.', 'Drei Dinge sammeln.'],
      },
      en: {
        title: 'Forest walk',
        summary: 'A walk with open eyes.',
        steps: ['Put on your shoes.', 'Walk to the forest.', 'Collect three things.'],
      },
    },
    ageMin: 3,
    ageMax: 8,
    durationMin: 30,
    durationMax: 60,
    setting: 'outdoor',
    energy: 'low',
    cost: 0,
    materials: ['paper', 'tape'],
    ...overrides,
  });
}

function withTexts(
  safetyNote?: string,
): Pick<Activity, 'translations'> {
  return {
    translations: {
      de: { title: 'Waldspaziergang', summary: 'Ein Spaziergang.', steps: ['Los.'], safetyNote },
      en: { title: 'Forest walk', summary: 'A walk.', steps: ['Go.'], safetyNote },
    },
  };
}

function setup(activity: Activity = makeIdea(), params: Record<string, string> = {}) {
  mockState.activities = [activity];
  mockState.params = { id: activity.id, children: 'a,b', ...params };
}

function renderScreen(language: 'de' | 'en' = 'de') {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <I18nextProvider i18n={translator(language)}>
        <ActivityScreen />
      </I18nextProvider>,
    );
  });
  return { root: renderer.root, renderer };
}

const flat = (node: ReactTestInstance) => StyleSheet.flatten(node.props.style) ?? {};
const textOf = (node: ReactTestInstance) => [node.props.children].flat().join('');

function allTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map(textOf)
    .filter((text) => text !== '' && !text.endsWith('-outline'));
}

// Alle echten Elemente (View, Text, …), ohne die Hüllen der Bausteine.
function hostNodes(root: ReactTestInstance) {
  return root.findAll((node) => typeof node.type === 'string');
}

function isInside(node: ReactTestInstance, ancestor: ReactTestInstance): boolean {
  for (let current = node.parent; current; current = current.parent) if (current === ancestor) return true;
  return false;
}

function textNode(root: ReactTestInstance, text: string) {
  const found = root.findAllByType(Text).filter((node) => textOf(node) === text);
  expect(found.length).toBeGreaterThan(0);
  return found[0];
}

// Der nächste Vorfahr (oder das Element selbst), dessen Style passt. So bleibt der Test unabhängig davon, wie viele Hüllen ein Baustein hat.
function closest(node: ReactTestInstance, matches: (style: Record<string, unknown>) => boolean) {
  for (let current: ReactTestInstance | null = node; current; current = current.parent) {
    if (typeof current.type === 'string' && matches(flat(current) as Record<string, unknown>)) return current;
  }
  throw new Error('Kein passender Vorfahr gefunden');
}

// Der nächste echte Vorfahr (View), über alle Hüllen der Bausteine hinweg.
function hostParent(node: ReactTestInstance) {
  for (let current = node.parent; current; current = current.parent) if (typeof current.type === 'string') return current;
  throw new Error('Kein Elternelement gefunden');
}

// Der feste untere Bereich: der Vorfahr des Hauptknopfs mit der Linie oben.
const barOf = (root: ReactTestInstance) =>
  closest(buttonWithText(root, 'Das machen wir'), (style) => style.borderTopWidth === 1);

// Der Knopf (Pressable) mit diesem Text.
function buttonWithText(root: ReactTestInstance, text: string) {
  const found = root
    .findAllByProps({ accessibilityRole: 'button' }, { deep: false })
    .filter((node) => node.findAllByType(Text).some((label) => textOf(label) === text));
  expect(found).toHaveLength(1);
  return found[0];
}

function backButton(root: ReactTestInstance, label = 'Zurück zu den Ideen') {
  const [button] = root.findAllByProps({ accessibilityLabel: label }, { deep: false });
  return button;
}

const checkboxes = (root: ReactTestInstance) => root.findAllByProps({ accessibilityRole: 'checkbox' }, { deep: false });
const isChecked = (row: ReactTestInstance) => row.props.accessibilityState.checked;
// Das sichtbare Kästchen in einer Zeile (das erste Element mit Rand und Breite 32).
const boxOf = (row: ReactTestInstance) =>
  row.find((node) => typeof node.type === 'string' && flat(node).width === 32 && flat(node).borderWidth === 2);

// Die Texte, in der Reihenfolge, wie sie auf dem Bildschirm stehen (von oben nach unten).
const position = (texts: string[], text: string) => {
  const index = texts.indexOf(text);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
  mockScreenOptions.current = undefined;
  mockState.addEntry.mockResolvedValue({ id: 'entry-1' });
  mockState.setEntryRating.mockResolvedValue(undefined);
  Object.assign(mockWindow, { width: 360, height: 800, scale: 3, fontScale: 1 });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  setup();
});

// --- Kopf und Zurück --------------------------------------------------------------------------------------------------

describe('Kopf mit rundem Zurück-Knopf', () => {
  it('der Knopf ist rund, mindestens 44 pt groß und beschriftet (Sprachausgabe)', () => {
    const { root } = renderScreen();
    const button = backButton(root);
    expect(button.props.accessibilityRole).toBe('button');
    expect(flat(button)).toMatchObject({
      minWidth: size.touch,
      minHeight: size.touch,
      borderRadius: radius.full,
      backgroundColor: lightColors.card,
    });
    expect(size.touch).toBeGreaterThanOrEqual(44);
  });

  it('Englisch: Beschriftung in der App-Sprache', () => {
    const { root } = renderScreen('en');
    expect(backButton(root, 'Back to ideas')).toBeDefined();
  });

  it('der Pfeil zeigt zurück und wird bei rechts-nach-links gespiegelt', () => {
    const arrow = backButton(renderScreen().root)
      .findAllByType(Text)
      .find((node) => node.props.name === 'chevron-back-outline')!;
    expect(flat(arrow)).toMatchObject(StyleSheet.flatten(mirrorInRTL));
  });

  it('es gibt keine Navigationsleiste, nur den eigenen Kopf', () => {
    renderScreen();
    expect(mockScreenOptions.current).toMatchObject({ headerShown: false });
  });

  it('der Knopf geht eine Stufe zurück, also zu den Ideen', () => {
    const { root } = renderScreen();
    act(() => backButton(root).props.onPress());
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('ohne Verlauf (direkt geöffnet) führt er zum Start', () => {
    mockRouter.canGoBack.mockReturnValue(false);
    const { root } = renderScreen();
    act(() => backButton(root).props.onPress());
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('die Zurück-Taste von Android bleibt unberührt: nichts fängt sie ab, nichts schaltet die Geste ab', () => {
    // Android macht dann, was der Stapel vorsieht: eine Stufe zurück zu den Ideen. Dorthin führt „Eure Ideen“ per `push`
    // (geprüft in ResultsScreen.test.tsx, „ein Tipp auf eine Karte öffnet die Details“), die Ideen bleiben also darunter im Stapel.
    const listener = jest.spyOn(BackHandler, 'addEventListener');
    renderScreen();
    expect(listener).not.toHaveBeenCalled();
    expect(mockScreenOptions.current).not.toHaveProperty('gestureEnabled');
    expect(mockScreenOptions.current).not.toHaveProperty('headerBackVisible');
    expect(mockScreenOptions.current).not.toHaveProperty('headerBackButtonMenuEnabled');
  });

  it('eine unbekannte Idee (alter Link) führt zum Start', () => {
    mockState.params = { id: 'gibt-es-nicht' };
    const { root } = renderScreen();
    expect(allTexts(root)).toEqual(['redirect:/']);
  });
});

// --- Bildbereich, Titel -----------------------------------------------------------------------------------------------

describe('Bildbereich wie auf den Karten', () => {
  const bigIcons = (root: ReactTestInstance) =>
    root.findAllByType(Text).filter((node) => typeof node.props.name === 'string' && node.props.size > iconSize.md);

  it('ohne Bild der Aktivität: die Farbfläche der Kategorie mit großem Symbol, 2:1, mit der Rundung der Karten', () => {
    const { root } = renderScreen();
    expect(root.findAllByType(ExpoImage)).toHaveLength(0);
    const tone = lightTheme.categoryTones.nature;
    const [mark] = bigIcons(root);
    expect(mark.props.name).toBe(categoryIcons.nature);
    expect(mark.props.color).toBe(tone.mark);
    expect(mark.props.size).toBe(iconSize.hero);
    const media = root.find((node) => typeof node.type === 'string' && flat(node).aspectRatio === 2);
    expect(flat(media).backgroundColor).toBe(tone.field);
    const clip = root.find(
      (node) => typeof node.type === 'string' && flat(node).overflow === 'hidden' && flat(node).borderRadius === radius.card,
    );
    expect(isInside(media, clip)).toBe(true);
  });

  it('Zusatz 45: auch Kochen und Natur (früher mit Kategorie-Fotos) zeigen die Farbfläche', () => {
    for (const category of ['cooking', 'nature'] as const) {
      setup(makeIdea({ category }));
      const { root } = renderScreen();
      expect(root.findAllByType(ExpoImage)).toHaveLength(0);
      expect(bigIcons(root)).toHaveLength(1);
    }
  });

  describe('`image` der Aktivität (nur von unserem eigenen Speicher, Zusatz 35)', () => {
    const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    beforeEach(() => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
    });
    afterEach(() => {
      if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('mit Bild von unserem Speicher: dieses Bild, und lädt es nicht, die Farbfläche', () => {
      const uri = 'https://abc.supabase.co/storage/v1/object/public/bilder/wald.svg';
      setup(makeIdea({ image: uri }));
      const { root } = renderScreen();
      const [image] = root.findAllByType(ExpoImage);
      expect(image.props.source).toEqual({ uri });
      expect(bigIcons(root)).toHaveLength(0);
      act(() => image.props.onError());
      expect(root.findAllByType(ExpoImage)).toHaveLength(0);
      expect(bigIcons(root)).toHaveLength(1);
    });

    it('mit Bild von einem fremden Server: wird nicht geladen, die Farbfläche (keine IP-Adresse an Fremde)', () => {
      setup(makeIdea({ image: 'https://example.org/wald.jpg' }));
      const { root } = renderScreen();
      expect(root.findAllByType(ExpoImage)).toHaveLength(0);
      expect(bigIcons(root)).toHaveLength(1);
    });
  });

  it('der Bildbereich ist für die Sprachausgabe Dekoration, und die Kategorie steht nur einmal da (über dem Titel, keine Pille)', () => {
    const { root } = renderScreen();
    const media = root.find((node) => typeof node.type === 'string' && flat(node).aspectRatio === 2);
    expect(media.props.accessibilityElementsHidden).toBe(true);
    expect(media.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(allTexts(root).filter((text) => text === 'Natur')).toHaveLength(1);
  });
});

describe('Aktivitäten aus dem Hintergrund (M8)', () => {
  it('friert die Aktivitäten beim Öffnen ein: Verschwindet die Idee im Hintergrund aus dem Bestand, bleibt sie beim Lesen stehen', () => {
    setup();
    const { root, renderer } = renderScreen();
    expect(allTexts(root)).toContain('Waldspaziergang');
    mockState.activities = [makeIdea({ id: 'andere-idee' })]; // neuer Bestand ohne diese Idee
    act(() =>
      renderer.update(
        <I18nextProvider i18n={translator('de')}>
          <ActivityScreen />
        </I18nextProvider>,
      ),
    );
    expect(allTexts(renderer.root)).toContain('Waldspaziergang');
    expect(allTexts(renderer.root).some((text) => text.startsWith('redirect:'))).toBe(false);
  });

  it('eine Idee, die es beim Öffnen nicht gibt, führt zurück zum Start', () => {
    setup();
    mockState.params = { id: 'gibt-es-nicht', children: 'a' };
    const { root } = renderScreen();
    expect(allTexts(root)).toEqual(['redirect:/']);
  });
});

describe('Titel', () => {
  it('Titel in Literata als Überschrift, mit der Kategorie darüber und der Kurzbeschreibung darunter', () => {
    const { root } = renderScreen();
    const title = textNode(root, 'Waldspaziergang');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title)).toMatchObject({ fontFamily: fonts.title, fontSize: fontSize.display, lineHeight: lineHeight.display });
    const texts = allTexts(root);
    expect(position(texts, 'Natur')).toBeLessThan(position(texts, 'Waldspaziergang'));
    expect(position(texts, 'Waldspaziergang')).toBeLessThan(position(texts, 'Ein Spaziergang mit offenen Augen.'));
  });

  it('Englisch', () => {
    const texts = allTexts(renderScreen('en').root);
    expect(texts).toEqual(expect.arrayContaining(['Nature', 'Forest walk', 'A walk with open eyes.']));
  });
});

// --- Eckdaten ---------------------------------------------------------------------------------------------------------

describe('Eckdaten als Kacheln', () => {
  const tiles = (root: ReactTestInstance) =>
    root.findAll((node) => typeof node.type === 'string' && /: /.test(node.props.accessibilityLabel ?? '') && node.props.accessible === true)
      .filter((node) => !node.props.accessibilityLabel.startsWith('Schritt') && !node.props.accessibilityLabel.startsWith('Step'));

  it('fünf Kacheln: Dauer, Alter, Energie, Kosten, drinnen/draußen (Deutsch)', () => {
    const { root } = renderScreen();
    expect(tiles(root).map((tile) => tile.props.accessibilityLabel)).toEqual([
      'Dauer: 30–60 Min.',
      'Alter: 3–8 Jahre',
      'Energie von dir: Wenig',
      'Kosten: Kostenlos',
      'Ort: Draußen',
    ]);
  });

  it('fünf Kacheln (Englisch)', () => {
    const { root } = renderScreen('en');
    expect(tiles(root).map((tile) => tile.props.accessibilityLabel)).toEqual([
      'Duration: 30–60 min',
      'Age: 3–8 years',
      'Energy from you: Low',
      'Cost: Free',
      'Place: Outdoors',
    ]);
  });

  it.each([
    ['indoor', 'Drinnen', 'Indoors'],
    ['outdoor', 'Draußen', 'Outdoors'],
    ['both', 'Drinnen oder draußen', 'Indoors or outdoors'],
  ] as const)('Ort „%s“ heißt „%s“ / „%s“ (beides = „Drinnen oder draußen“)', (setting, german, english) => {
    setup(makeIdea({ setting }));
    expect(allTexts(renderScreen('de').root)).toContain(german);
    expect(allTexts(renderScreen('en').root)).toContain(english);
  });

  it('Energie und Kosten in allen Stufen, Alter „Alle Alter“ und Dauer in Stunden', () => {
    setup(makeIdea({ energy: 'high', cost: 2, ageMin: 0, ageMax: 16, durationMin: 120, durationMax: 180 }));
    expect(allTexts(renderScreen().root)).toEqual(expect.arrayContaining(['Viel', 'Etwas mehr', 'Alle Alter', '2–3 Std.']));
    setup(makeIdea({ energy: 'medium', cost: 1, ageMin: 5, ageMax: 5 }));
    expect(allTexts(renderScreen().root)).toEqual(expect.arrayContaining(['Mittel', 'Wenig', '5 Jahre']));
  });

  it('die Kacheln sind weiß mit Radius 16 und feinem Rand, Wert und Beschriftung stehen als ein Satz in der Sprachausgabe', () => {
    const { root } = renderScreen();
    for (const tile of tiles(root)) {
      expect(flat(tile)).toMatchObject({ backgroundColor: lightColors.card, borderRadius: radius.tile });
      expect(tile.props.accessible).toBe(true);
    }
  });

  it('nicht gebaut (Entscheidung 15): kein „davon … aktiv“, kein „ergibt … Stück“, kein Untertitel mit Namen der Kinder', () => {
    const joined = allTexts(renderScreen().root).join(' | ');
    expect(joined).not.toMatch(/davon|aktiv|ergibt|Stück|Mila|Jonas/);
  });

  it('normale Schrift: zwei Spalten, die letzte Kachel füllt die Zeile', () => {
    const widths = tiles(renderScreen().root).map((tile) => flat(tile).width);
    const content = mockWindow.width - 2 * spacing.lg;
    expect(widths.slice(0, 4)).toEqual(Array(4).fill((content - spacing.md) / 2));
    expect(widths[4]).toBe(content);
  });

  it('große Systemschrift: eine Spalte, kein Text wird abgeschnitten', () => {
    mockWindow.fontScale = 2;
    const { root } = renderScreen();
    const content = mockWindow.width - 2 * spacing.lg;
    expect(tiles(root).map((tile) => flat(tile).width)).toEqual(Array(5).fill(content));
    for (const node of root.findAllByType(Text)) expect(node.props.numberOfLines).toBeUndefined();
  });
});

// --- Allergen-Box -----------------------------------------------------------------------------------------------------

describe('Allergen-Box', () => {
  const noteDe = 'Bei Allergien bitte die Zutatenlisten prüfen.';
  const noteEn = 'If you have allergies, please check the ingredient lists.';
  // Aussagen, die es nie geben darf: Die Liste erkennt nur, was sie kennt, und beweist keine Freiheit von Allergenen.
  const claimsFree = /frei von|allergenfrei|ohne Allergene|keine Allergene|free of|free from|allergen-free|no allergens|without allergens/i;

  it('ohne erkannte Allergene: keine Box, keine Aussage über Allergene, auch nicht der Satz zu den Zutatenlisten', () => {
    for (const language of ['de', 'en'] as const) {
      setup(makeIdea({ materials: ['paper', 'tape'] }));
      const { root } = renderScreen(language);
      const joined = [...allTexts(root), ...hostNodes(root).map((node) => node.props.accessibilityLabel ?? '')].join(' | ');
      expect(joined).not.toMatch(/Allergen|allergen|Allergie|allerg|Zutatenliste|ingredient/);
      expect(joined).not.toMatch(claimsFree);
    }
  });

  it('auch ganz ohne Material: keine Box und keine Aussage', () => {
    setup(makeIdea({ materials: [] }));
    const joined = allTexts(renderScreen().root).join(' | ');
    expect(joined).not.toMatch(/Allergen|Allergie|Zutatenliste/);
    expect(joined).not.toMatch(claimsFree);
  });

  it('mit erkannten Allergenen: Box mit Titel und Liste, direkt darunter der dauerhafte Satz (Deutsch)', () => {
    setup(makeIdea({ materials: ['flour', 'milk', 'paper'] }));
    const { root } = renderScreen();
    const texts = allTexts(root);
    expect(texts).toContain('Achtung, Allergene');
    expect(texts).toContain('Enthält möglicherweise: Gluten, Milch.');
    expect(texts).toContain(noteDe);
    // Reihenfolge: Titel, Liste, dann der Satz, ohne einen anderen Text dazwischen.
    const title = position(texts, 'Achtung, Allergene');
    expect(position(texts, 'Enthält möglicherweise: Gluten, Milch.')).toBe(title + 1);
    expect(position(texts, noteDe)).toBe(title + 2);
    expect(texts.join(' | ')).not.toMatch(claimsFree);
  });

  it('mit erkannten Allergenen (Englisch)', () => {
    setup(makeIdea({ materials: ['pasta'] }));
    const texts = allTexts(renderScreen('en').root);
    const title = position(texts, 'Watch out, allergens');
    expect(position(texts, 'May contain: Gluten, Egg.')).toBe(title + 1);
    expect(position(texts, noteEn)).toBe(title + 2);
  });

  it('der Satz steht unter der Box (nicht in ihr) und ist weder antippbar noch wegklickbar', () => {
    setup(makeIdea({ materials: ['flour'] }));
    const { root } = renderScreen();
    const title = textNode(root, 'Achtung, Allergene');
    const note = textNode(root, noteDe);
    const box = closest(title, (style) => style.backgroundColor === lightColors.warningSurface);
    expect(isInside(note, box)).toBe(false);
    expect(isInside(note, hostParent(box))).toBe(true); // Box und Satz liegen in derselben Gruppe, der Satz darunter
    for (let node: ReactTestInstance | null = note; node; node = node.parent) expect(node.props.onPress).toBeUndefined();
  });

  it('die Box steht direkt unter den Eckdaten und vor Material und Anleitung', () => {
    setup(makeIdea({ materials: ['flour', 'scissors'], ...withTexts('Schere nur mit Erwachsenen.') }));
    const texts = allTexts(renderScreen().root);
    expect(position(texts, 'Draußen')).toBeLessThan(position(texts, 'Achtung, Allergene')); // „Draußen“ ist die letzte Eckdaten-Kachel
    expect(position(texts, 'Achtung, Allergene')).toBeLessThan(position(texts, 'Das braucht ihr'));
    expect(position(texts, 'Achtung, Allergene')).toBeLessThan(position(texts, 'So geht’s'));
  });
});

// --- Sicherheitsbox ---------------------------------------------------------------------------------------------------

describe('Sicherheitsbox', () => {
  it('mit Schere (Gefahr „scharf“): „Mit Erwachsenen“ und der Hinweis der Aktivität', () => {
    setup(makeIdea({ materials: ['scissors'], ...withTexts('Die Schere nur mit Erwachsenen benutzen.') }));
    const texts = allTexts(renderScreen().root);
    expect(texts).toEqual(expect.arrayContaining(['Sicherheit', 'Mit Erwachsenen', 'Die Schere nur mit Erwachsenen benutzen.']));
  });

  it('nur mit Hinweis, ohne Gefahr: Box ohne „Mit Erwachsenen“', () => {
    setup(makeIdea({ materials: ['paper'], ...withTexts('Auf glatten Böden vorsichtig sein.') }));
    const texts = allTexts(renderScreen().root);
    expect(texts).toContain('Sicherheit');
    expect(texts).toContain('Auf glatten Böden vorsichtig sein.');
    expect(texts).not.toContain('Mit Erwachsenen');
  });

  it('nur mit Gefahr, ohne Hinweis: Box mit „Mit Erwachsenen“', () => {
    setup(makeIdea({ materials: ['knife'] }));
    const texts = allTexts(renderScreen().root);
    expect(texts).toEqual(expect.arrayContaining(['Sicherheit', 'Mit Erwachsenen']));
  });

  it('weder Gefahr noch Hinweis: keine Box', () => {
    setup(makeIdea({ materials: ['paper'] }));
    const texts = allTexts(renderScreen().root);
    expect(texts).not.toContain('Sicherheit');
    expect(texts).not.toContain('Mit Erwachsenen');
  });

  it('Englisch', () => {
    setup(makeIdea({ materials: ['scissors'], ...withTexts('Use scissors only with adults.') }));
    expect(allTexts(renderScreen('en').root)).toEqual(
      expect.arrayContaining(['Safety', 'With adults', 'Use scissors only with adults.']),
    );
  });

  it('beide Boxen stehen vor Material und Anleitung, die Sicherheitsbox nach der Allergen-Box', () => {
    setup(makeIdea({ materials: ['flour', 'scissors'], ...withTexts('Nur mit Erwachsenen schneiden.') }));
    const texts = allTexts(renderScreen().root);
    const allergens = position(texts, 'Achtung, Allergene');
    const safety = position(texts, 'Sicherheit');
    const materials = position(texts, 'Das braucht ihr');
    const steps = position(texts, 'So geht’s');
    expect(allergens).toBeLessThan(safety);
    expect(safety).toBeLessThan(materials);
    expect(materials).toBeLessThan(steps);
  });

  it('deutlich, aber ohne Alarm-Rot: nur Warnfarben, nie `danger`', () => {
    setup(makeIdea({ materials: ['flour', 'scissors'], ...withTexts('Nur mit Erwachsenen schneiden.') }));
    const { root } = renderScreen();
    const used = new Set<string>();
    for (const node of hostNodes(root)) {
      const style = flat(node);
      for (const key of ['color', 'backgroundColor', 'borderColor'] as const) {
        if (typeof style[key] === 'string') used.add(style[key]);
      }
    }
    for (const palette of [lightTheme.colors]) {
      expect(used).not.toContain(palette.danger);
      expect(used).not.toContain(palette.dangerSurface);
    }
    // und die Boxen selbst sind warm (Honig-Ton) mit Rahmen in der Warnfarbe
    const box = closest(textNode(root, 'Sicherheit'), (style) => style.backgroundColor === lightColors.warningSurface);
    expect(flat(box)).toMatchObject({ backgroundColor: lightColors.warningSurface, borderColor: lightColors.warning });
    expect(contrastRatio(lightColors.text, lightColors.warningSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(lightColors.warning, lightColors.warningSurface)).toBeGreaterThanOrEqual(4.5);
  });
});

// --- Material zum Abhaken ---------------------------------------------------------------------------------------------

describe('„Das braucht ihr“ zum Abhaken (Entscheidung 13 und 17)', () => {
  beforeEach(() => setup(makeIdea({ materials: ['paper', 'scissors', 'tape'] })));

  it('jede Zeile ist ein Abhak-Feld (Rolle „checkbox“), anfangs nicht abgehakt, mit dem Namen als Beschriftung', () => {
    const rows = checkboxes(renderScreen().root);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([de.materials.paper, de.materials.scissors, de.materials.tape]);
    for (const row of rows) expect(isChecked(row)).toBe(false);
  });

  it('jede Zeile ist 56 px hoch (`size.checkbox`) und damit weit über 44 pt', () => {
    expect(size.checkbox).toBe(56);
    for (const row of checkboxes(renderScreen().root)) expect(flat(row).minHeight).toBe(size.checkbox);
  });

  it('Tippen hakt ab, nochmal Tippen nimmt den Haken zurück; die anderen Zeilen bleiben, wie sie sind', () => {
    const { root } = renderScreen();
    act(() => checkboxes(root)[1].props.onPress());
    expect(checkboxes(root).map(isChecked)).toEqual([false, true, false]);
    act(() => checkboxes(root)[0].props.onPress());
    expect(checkboxes(root).map(isChecked)).toEqual([true, true, false]);
    act(() => checkboxes(root)[1].props.onPress());
    expect(checkboxes(root).map(isChecked)).toEqual([true, false, false]);
  });

  it('abgehakt: Tinte mit Häkchen (nicht Terrakotta), nicht abgehakt: leeres Kästchen mit kräftigem Rand', () => {
    const { root } = renderScreen();
    const [first, second] = checkboxes(root);
    act(() => first.props.onPress());
    const checkedBox = flat(boxOf(checkboxes(root)[0]));
    expect(checkedBox).toMatchObject({ backgroundColor: lightColors.selected, borderColor: lightColors.selected });
    expect(checkedBox.backgroundColor).not.toBe(lightColors.primary);
    const mark = checkboxes(root)[0].findAllByType(Text).find((node) => node.props.name === 'checkmark-outline')!;
    expect(mark.props.color).toBe(lightColors.onSelected);
    expect(contrastRatio(lightColors.onSelected, lightColors.selected)).toBeGreaterThanOrEqual(4.5);

    const emptyBox = flat(boxOf(second));
    expect(emptyBox).toMatchObject({ backgroundColor: lightColors.card, borderColor: lightColors.icon });
    expect(second.findAllByType(Text).some((node) => node.props.name === 'checkmark-outline')).toBe(false);
  });

  it('der Rand kommt aus der Palette und hat mindestens 3:1 zur Karte und zum Papier (WCAG 1.4.11, Entscheidung 17)', () => {
    const border = flat(boxOf(checkboxes(renderScreen().root)[0])).borderColor as string;
    expect(Object.values(lightColors)).toContain(border);
    expect(contrastRatio(border, lightColors.card)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(border, lightColors.background)).toBeGreaterThanOrEqual(3);
    // Die Trennlinien zwischen den Zeilen (`border`, 1,7:1) gliedern nur, der Rand des Kästchens ist nicht diese Farbe.
    expect(border).not.toBe(lightColors.border);
  });

  it('der Zustand bleibt im Speicher des Bildschirms: Es wird nichts gespeichert, kein Verlaufseintrag angelegt', () => {
    const { root } = renderScreen();
    for (const row of checkboxes(root)) act(() => row.props.onPress());
    expect(checkboxes(root).map(isChecked)).toEqual([true, true, true]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(mockState.addEntry).not.toHaveBeenCalled();
    expect(mockState.setEntryRating).not.toHaveBeenCalled();
  });

  it('beim nächsten Öffnen ist alles wieder leer (neuer Aufbau des Bildschirms)', () => {
    const first = renderScreen();
    for (const row of checkboxes(first.root)) act(() => row.props.onPress());
    act(() => first.renderer.unmount());
    const second = renderScreen();
    expect(checkboxes(second.root).map(isChecked)).toEqual([false, false, false]);
  });

  it('„Das machen wir“ und „Fertig“ ändern die Haken nicht', () => {
    const { root } = renderScreen();
    act(() => checkboxes(root)[0].props.onPress());
    act(() => buttonWithText(root, 'Das machen wir').props.onPress());
    expect(checkboxes(root).map(isChecked)).toEqual([true, false, false]);
  });

  it('ohne Material: ein freundlicher Satz statt einer Liste', () => {
    setup(makeIdea({ materials: [] }));
    const { root } = renderScreen();
    expect(checkboxes(root)).toHaveLength(0);
    expect(allTexts(root)).toContain('Ihr braucht kein besonderes Material.');
  });

  it('nur das Material hat Abhak-Felder, die Schritte nicht', () => {
    expect(checkboxes(renderScreen().root)).toHaveLength(3);
  });

  it('bei großer Systemschrift bleibt die Zeile mindestens 56 hoch, der Text bricht um', () => {
    mockWindow.fontScale = 2;
    const { root } = renderScreen();
    for (const row of checkboxes(root)) {
      expect(flat(row).minHeight).toBe(size.checkbox);
      // der Name nimmt den restlichen Platz der Zeile und bricht um (flex: 1), statt abgeschnitten zu werden
      const name = row.findAllByType(Text).find((node) => textOf(node) !== '' && !node.props.name)!;
      expect(flat(name).flex).toBe(1);
    }
    for (const node of root.findAllByType(Text)) expect(node.props.numberOfLines).toBeUndefined();
    // das Häkchen bleibt gleich groß (die Skalierung bleibt an)
    act(() => checkboxes(root)[0].props.onPress());
    const mark = checkboxes(root)[0].findAllByType(Text).find((node) => node.props.name === 'checkmark-outline')!;
    expect(mark.props.size).toBe(iconSize.md / 2);
  });

  it('Englisch', () => {
    const rows = checkboxes(renderScreen('en').root);
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([en.materials.paper, en.materials.scissors, en.materials.tape]);
    expect(allTexts(renderScreen('en').root)).toContain('What you need');
  });
});

// --- Schritte ---------------------------------------------------------------------------------------------------------

describe('„So geht’s“', () => {
  it('Schritte nummeriert, 20 px mit Zeilenhöhe 30 und 28 px Abstand', () => {
    const { root } = renderScreen();
    const step = textNode(root, 'Zum Wald gehen.');
    expect(flat(step)).toMatchObject({
      fontFamily: fonts.body,
      fontSize: fontSize.reading,
      lineHeight: lineHeight.reading,
      color: lightColors.text,
    });
    expect(fontSize.reading).toBe(20);
    expect(spacing.stepGap).toBe(28);
    const list = closest(step, (style) => style.gap === spacing.stepGap);
    expect(list.findAll((node) => typeof node.type === 'string' && node.props.accessible === true)).toHaveLength(3);
  });

  it('die Nummern 1, 2, 3 stehen in Literata im sandfarbenen Kreis (nicht Terrakotta)', () => {
    const { root } = renderScreen();
    for (const number of ['1', '2', '3']) {
      const label = textNode(root, number);
      expect(flat(label)).toMatchObject({ fontFamily: fonts.number, color: lightColors.text });
      const circle = closest(label, (style) => style.backgroundColor === lightColors.surface);
      expect(flat(circle)).toMatchObject({ borderRadius: radius.full });
    }
  });

  it('für die Sprachausgabe ist jeder Schritt ein Satz („Schritt 1. …“)', () => {
    const labels = renderScreen().root.findAll(
      (node) => typeof node.type === 'string' && /^Schritt \d\./.test(node.props.accessibilityLabel ?? ''),
    );
    expect(labels.map((node) => node.props.accessibilityLabel)).toEqual([
      'Schritt 1. Schuhe anziehen.',
      'Schritt 2. Zum Wald gehen.',
      'Schritt 3. Drei Dinge sammeln.',
    ]);
    const english = renderScreen('en').root.findAll(
      (node) => typeof node.type === 'string' && /^Step \d\./.test(node.props.accessibilityLabel ?? ''),
    );
    expect(english[0].props.accessibilityLabel).toBe('Step 1. Put on your shoes.');
  });

  it('die Schritte stehen nach dem Material', () => {
    const texts = allTexts(renderScreen().root);
    expect(position(texts, 'Das braucht ihr')).toBeLessThan(position(texts, 'So geht’s'));
    expect(position(texts, 'So geht’s')).toBeLessThan(position(texts, 'Schuhe anziehen.'));
  });

  it('bei großer Systemschrift: nichts abgeschnitten, Lesegröße und Abstand bleiben', () => {
    mockWindow.fontScale = 2;
    const { root } = renderScreen();
    expect(flat(textNode(root, 'Zum Wald gehen.')).fontSize).toBe(fontSize.reading);
    expect(closest(textNode(root, 'Zum Wald gehen.'), (style) => style.gap === spacing.stepGap)).toBeDefined();
    for (const node of root.findAllByType(Text)) expect(node.props.numberOfLines).toBeUndefined();
  });
});

// --- Illustrationen (Pilot, docs/design/ILLUSTRATIONEN.md) ----------------------------------------------------------

describe('Illustrationen (Pilot)', () => {
  const puppetSteps = {
    de: ['Socke aussuchen.', 'Augen ankleben.', 'Bühne bauen.', 'Geschichte ausdenken.', 'Vorspielen.'],
    en: ['Pick a sock.', 'Glue on eyes.', 'Build the stage.', 'Make up a story.', 'Perform.'],
  };
  const puppetIdea = () =>
    makeIdea({
      id: 'sock-puppet-theater',
      category: 'craft',
      translations: {
        de: { title: 'Sockenpuppen-Theater', summary: 'Puppen aus Socken.', steps: puppetSteps.de },
        en: { title: 'Sock Puppet Theater', summary: 'Puppets from socks.', steps: puppetSteps.en },
      },
    });
  const stepRow = (root: ReactTestInstance, number: number, language: 'de' | 'en' = 'de') =>
    root.find(
      (node) =>
        typeof node.type === 'string' &&
        node.props.accessibilityLabel === `${language === 'de' ? 'Schritt' : 'Step'} ${number}. ${puppetSteps[language][number - 1]}`,
    );

  it('der Bildbereich zeigt das Titelbild statt der Farbfläche (ohne Pille)', () => {
    setup(puppetIdea());
    const { root } = renderScreen();
    const [hero] = root.findAll((node) => typeof node.type === 'string' && flat(node).aspectRatio === 2);
    const [image] = hero.findAllByType(ExpoImage);
    expect(image.props.source).toBe(getIllustration('sock-puppet-theater')?.source);
    expect(hero.findAll((node) => typeof node.props.name === 'string' && node.props.size === iconSize.hero)).toHaveLength(0);
    expect(hero.props.accessibilityElementsHidden).toBe(true);
    expect(allTexts(hero)).toHaveLength(0);
  });

  it('Schrittbilder stehen unter dem Text der Schritte 1 bis 3, die Schritte 4 und 5 haben keins', () => {
    setup(puppetIdea());
    const { root } = renderScreen();
    const steps = getStepIllustrations('sock-puppet-theater') ?? {};
    for (const number of [1, 2, 3]) {
      const row = stepRow(root, number);
      const images = row.findAllByType(ExpoImage);
      expect(images).toHaveLength(1);
      expect(images[0].props.source).toBe(steps[number].source);
      // Unter dem Text: Text und Bild sind Geschwister in derselben Spalte, der Text zuerst.
      const text = textNode(row, puppetSteps.de[number - 1]);
      const column = hostParent(text);
      const children = column.children.filter((child): child is ReactTestInstance => typeof child !== 'string');
      const imageIndex = children.findIndex((child) => child.findAllByType(ExpoImage).length > 0);
      expect(children.indexOf(text)).toBeLessThan(imageIndex);
    }
    for (const number of [4, 5]) expect(stepRow(root, number).findAllByType(ExpoImage)).toHaveLength(0);
  });

  it('Schrittbild: 2:1, so breit wie der Text, Ecken wie Kacheln, für die Sprachausgabe Dekoration', () => {
    setup(puppetIdea());
    const { root } = renderScreen();
    const row = stepRow(root, 1);
    const frame = closest(row.findAllByType(ExpoImage)[0], (style) => style.aspectRatio === 2);
    expect(flat(frame)).toMatchObject({ width: '100%', aspectRatio: 2, borderRadius: radius.tile, overflow: 'hidden' });
    // Zum eigenen Text 16 px, zum nächsten Schritt deutlich mehr (28 + 16): So gehört das Bild sichtbar zu seinem Schritt.
    const textToImage = flat(hostParent(frame)).gap as number;
    const imageToNextStep = (flat(frame).marginBottom as number) + spacing.stepGap;
    expect(textToImage).toBe(spacing.md);
    expect(imageToNextStep).toBe(spacing.md + spacing.stepGap);
    expect(imageToNextStep).toBeGreaterThan(2 * textToImage);
    expect(frame.props.accessibilityElementsHidden).toBe(true);
    expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
    // Die Sprachausgabe liest weiter nur den Satz, der Text bleibt in Lesegröße.
    expect(row.props.accessible).toBe(true);
    expect(flat(textNode(row, 'Socke aussuchen.'))).toMatchObject({ fontSize: fontSize.reading, lineHeight: lineHeight.reading });
  });

  it('Englisch: dieselben Bilder bei denselben Schritten', () => {
    setup(puppetIdea());
    const { root } = renderScreen('en');
    expect(stepRow(root, 2, 'en').findAllByType(ExpoImage)).toHaveLength(1);
    expect(stepRow(root, 4, 'en').findAllByType(ExpoImage)).toHaveLength(0);
  });

  it('Aktivitäten ohne Illustration: Farbfläche oben, keine Bilder bei den Schritten', () => {
    setup();
    const { root } = renderScreen();
    expect(root.findAllByType(ExpoImage)).toHaveLength(0);
  });

  it('Titelbild ohne Schrittbilder (Pizza): nur oben ein Bild', () => {
    setup(makeIdea({ id: 'homemade-pizza', category: 'cooking' }));
    const { root } = renderScreen();
    const images = root.findAllByType(ExpoImage);
    expect(images).toHaveLength(1);
    expect(images[0].props.source).toBe(getIllustration('homemade-pizza')?.source);
  });
});

// --- Kein Text wird abgeschnitten (alle Aktivitäten) ---------------------------------------------------------------

// Auf iOS schneidet ein zu niedriger Textrahmen die letzte Zeile rechts ab, statt umzubrechen (gesehen im Pilot bei Schritt 2 des
// Sockenpuppen-Theaters). Feste Maße oder eine Zeilenbegrenzung an einem Text oder an einem Element darüber machen das wahrscheinlich.
// Dieser Block zeichnet die Detailansicht aller echten Aktivitäten und meldet jede solche Stelle, mit Aktivität und Text.
describe('Kein Text wird abgeschnitten (alle 104 Aktivitäten)', () => {
  const { getBundledActivities } = jest.requireActual<typeof import('./bundledActivities')>('./bundledActivities');
  const realActivities = getBundledActivities();
  // Maße, die ein Element unabhängig von seinem Inhalt festlegen (Mindestmaße wie `minHeight` sind erlaubt: Sie wachsen mit).
  const fixedSizeKeys = ['width', 'height', 'maxWidth', 'maxHeight', 'aspectRatio'] as const;
  // Einzige Ausnahme: die Breiten des Rasters der Eckdaten-Kacheln (detailLayout.ts). Sie kommen aus der Bildschirmbreite und der
  // Systemschrift, die Höhe wächst mit, die Texte brechen darin um. Dass dort jedes Wort hineinpasst, prüft die Webprüfung (docs/detail.md).
  const factTileWidths = () =>
    new Set<unknown>(
      getFactTileWidths({ count: 5, containerWidth: mockWindow.width - 2 * spacing.lg, gap: spacing.md, fontScale: mockWindow.fontScale }),
    );

  // Alle Stellen eines Bildschirms, an denen Text abgeschnitten werden könnte. Symbole (Ionicons) zählen nicht: Sie sind ein Zeichen und brechen nicht um.
  function clippingRisks(root: ReactTestInstance): string[] {
    const risks: string[] = [];
    const allowedWidths = factTileWidths();
    for (const node of root.findAllByType(Text)) {
      if (typeof node.props.name === 'string') continue;
      const label = `„${textOf(node).slice(0, 40)}“`;
      for (const prop of ['numberOfLines', 'ellipsizeMode', 'adjustsFontSizeToFit', 'maxFontSizeMultiplier'] as const) {
        if (node.props[prop] !== undefined && node.props[prop] !== false) risks.push(`${label}: ${prop}`);
      }
      if (node.props.allowFontScaling === false) risks.push(`${label}: allowFontScaling={false}`);
      const style = flat(node) as Record<string, unknown>;
      if (typeof style.lineHeight === 'number' && typeof style.fontSize === 'number' && style.lineHeight < style.fontSize) {
        risks.push(`${label}: Zeilenhöhe ${style.lineHeight} kleiner als Schrift ${style.fontSize}`);
      }
      // Der Text selbst und jedes Element darüber: keine festen Maße.
      for (let current: ReactTestInstance | null = node; current; current = current.parent) {
        if (typeof current.type !== 'string' && current !== node) continue;
        const own = flat(current) as Record<string, unknown>;
        for (const key of fixedSizeKeys) {
          const value = own[key];
          // 100 % heißt „so breit wie der Platz“ und hängt nicht am Inhalt fest.
          if (key === 'width' && allowedWidths.has(value)) continue;
          if (value !== undefined && value !== '100%') risks.push(`${label}: ${current === node ? 'Text' : 'Element darüber'} hat ${key} ${String(value)}`);
        }
        if (current === node && own.overflow === 'hidden') risks.push(`${label}: overflow hidden`);
      }
    }
    return risks;
  }

  it('es sind wirklich alle Aktivitäten (mindestens 100)', () => {
    expect(realActivities.length).toBeGreaterThanOrEqual(100);
  });

  it.each(['de', 'en'] as const)('%s: kein Text hat eine Zeilenbegrenzung oder feste Maße, auch nicht darüber', (language) => {
    const risks: string[] = [];
    for (const activity of realActivities) {
      setup(activity);
      const { root, renderer } = renderScreen(language);
      for (const risk of clippingRisks(root)) risks.push(`${activity.id}: ${risk}`);
      act(() => renderer.unmount());
    }
    expect(risks).toEqual([]);
  });

  it('auch bei doppelter Systemschrift (andere Spalten bei den Kacheln)', () => {
    mockWindow.fontScale = 2;
    const risks: string[] = [];
    for (const activity of realActivities) {
      setup(activity);
      const { root, renderer } = renderScreen();
      for (const risk of clippingRisks(root)) risks.push(`${activity.id}: ${risk}`);
      act(() => renderer.unmount());
    }
    expect(risks).toEqual([]);
  });

  it('der Prüfer findet eine Zeilenbegrenzung und feste Maße (Gegenprobe)', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <View style={{ height: 60 }}>
          <Text numberOfLines={2} style={{ fontSize: fontSize.reading, lineHeight: lineHeight.xs }}>
            Langer Text
          </Text>
        </View>,
      );
    });
    expect(clippingRisks(renderer.root)).toEqual([
      '„Langer Text“: numberOfLines',
      `„Langer Text“: Zeilenhöhe ${lineHeight.xs} kleiner als Schrift ${fontSize.reading}`,
      '„Langer Text“: Element darüber hat height 60',
    ]);
    act(() => renderer.unmount());
  });
});

// --- Fester Hauptknopf, Scrollbereich ---------------------------------------------------------------------------------

describe('Fester Hauptknopf unten (Entscheidung 14)', () => {
  it('der Hauptknopf „Das machen wir“ steht nicht im Scrollbereich, sondern daneben (Nachbar), und scrollt deshalb nie weg', () => {
    const { root } = renderScreen();
    const scroll = root.findByType(ScrollView);
    const button = buttonWithText(root, 'Das machen wir');
    expect(isInside(button, scroll)).toBe(false);
    // Der Inhalt steht im Scrollbereich, der feste Bereich ist ein Nachbar mit demselben Elternelement.
    const bar = barOf(root);
    expect(isInside(bar, scroll)).toBe(false);
    expect(flat(bar)).toMatchObject({ borderTopWidth: 1, backgroundColor: lightColors.background });
    expect(isInside(textNode(root, 'So geht’s'), scroll)).toBe(true);
    // Scrollbereich und fester Bereich sind Nachbarn im selben Rahmen: Der Scrollbereich endet über dem festen Bereich.
    expect(hostParent(scroll)).toBe(hostParent(bar));
  });

  it('der Knopf ist der große Hauptknopf (Terrakotta), mit Beschriftung „Das machen wir“, nicht „Anleitung starten“', () => {
    const { root } = renderScreen();
    const button = buttonWithText(root, 'Das machen wir');
    expect(flat(button).backgroundColor).toBe(lightColors.primary);
    expect(allTexts(root)).not.toContain('Anleitung starten');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('Englisch: „We’ll do this“', () => {
    const { root } = renderScreen('en');
    expect(buttonWithText(root, 'We’ll do this')).toBeDefined();
  });

  it('der Scrollbereich hat unten Luft, damit der letzte Schritt nicht am festen Bereich klebt', () => {
    const scroll = renderScreen().root.findByType(ScrollView);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBeGreaterThanOrEqual(spacing.xl);
  });

  it('der Rahmen berücksichtigt oben und unten den Sicherheitsbereich (Statusleiste, Wischleiste)', () => {
    const { root } = renderScreen();
    const [screen] = root.findAll((node) => Array.isArray(node.props.edges));
    expect([...screen.props.edges].sort()).toEqual(['bottom', 'top']);
  });

  it.each([1, 1.5, 2, 3])('bei Systemschrift %s× bleibt die Anordnung gleich: Kopf, Scrollbereich, fester Bereich untereinander', (fontScale) => {
    mockWindow.fontScale = fontScale;
    const { root } = renderScreen();
    const scroll = root.findByType(ScrollView);
    const bar = barOf(root);
    const header = closest(backButton(root), () => true);
    const all = root.findAll(() => true);
    // Von oben nach unten: Kopf, Scrollbereich, fester Bereich, alle im selben Rahmen.
    expect(all.indexOf(header)).toBeLessThan(all.indexOf(scroll));
    expect(all.indexOf(scroll)).toBeLessThan(all.indexOf(bar));
    expect(isInside(header, scroll)).toBe(false);
    expect(isInside(bar, scroll)).toBe(false);
    expect(hostParent(scroll)).toBe(hostParent(bar));
    expect(flat(bar).padding).toBe(spacing.md);
  });

  it('„Das machen wir“ speichert noch nichts und zeigt „Fertig“ mit dem Hinweis', () => {
    const { root } = renderScreen();
    act(() => buttonWithText(root, 'Das machen wir').props.onPress());
    expect(mockState.addEntry).not.toHaveBeenCalled();
    expect(allTexts(root)).toContain('Viel Spaß! Tippe auf „Fertig“, wenn ihr durch seid.');
    expect(buttonWithText(root, 'Fertig')).toBeDefined();
    expect(allTexts(root)).not.toContain('Das machen wir');
  });
});

// --- Fertig und „Wie war’s?“ ------------------------------------------------------------------------------------------

describe('„Fertig“ und „Wie war’s?“ (Funktion unverändert)', () => {
  async function finish(root: ReactTestInstance) {
    act(() => buttonWithText(root, 'Das machen wir').props.onPress());
    await act(async () => {
      buttonWithText(root, 'Fertig').props.onPress();
    });
  }

  it('„Fertig“ legt einen Verlaufseintrag mit der Idee und den Kindern an', async () => {
    const { root } = renderScreen();
    await finish(root);
    expect(mockState.addEntry).toHaveBeenCalledTimes(1);
    expect(mockState.addEntry).toHaveBeenCalledWith({ activityId: 'idea-1', childIds: ['a', 'b'] });
  });

  it('gelöschte Kinder in der Adresse werden übergangen', async () => {
    setup(makeIdea(), { children: 'a,gelöscht' });
    const { root } = renderScreen();
    await finish(root);
    expect(mockState.addEntry).toHaveBeenCalledWith({ activityId: 'idea-1', childIds: ['a'] });
  });

  it('nach „Fertig“ ist „Wie war’s?“ sofort zu sehen, ohne Scrollen: im festen Bereich, nicht im Scrollbereich', async () => {
    const { root } = renderScreen();
    await finish(root);
    const scroll = root.findByType(ScrollView);
    for (const label of ['Wie war’s?', 'Hat gefallen', 'Hat nicht gefallen', 'Überspringen']) {
      const node = textNode(root, label);
      expect(isInside(node, scroll)).toBe(false);
    }
    // der Hauptknopf ist weg, „Wie war’s?“ steht an seiner Stelle
    expect(allTexts(root)).not.toContain('Fertig');
    expect(allTexts(root)).not.toContain('Das machen wir');
    // und der Scrollbereich bleibt unverändert benutzbar: Er enthält weiter die Anleitung
    expect(isInside(textNode(root, 'Zum Wald gehen.'), scroll)).toBe(true);
  });

  it('„Wie war’s?“ bleibt auch bei großer Systemschrift im festen Bereich (nichts schiebt es in den Scrollbereich)', async () => {
    mockWindow.fontScale = 2;
    const { root } = renderScreen();
    await finish(root);
    const scroll = root.findByType(ScrollView);
    expect(isInside(textNode(root, 'Wie war’s?'), scroll)).toBe(false);
    expect(isInside(textNode(root, 'Überspringen'), scroll)).toBe(false);
  });

  it('Daumen hoch speichert die Bewertung am Eintrag und führt zum Start', async () => {
    const { root } = renderScreen();
    await finish(root);
    await act(async () => {
      buttonWithText(root, 'Hat gefallen').props.onPress();
    });
    expect(mockState.setEntryRating).toHaveBeenCalledWith('entry-1', 'up');
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('Überspringen führt zum Start, ohne etwas zu bewerten', async () => {
    const { root } = renderScreen();
    await finish(root);
    act(() => buttonWithText(root, 'Überspringen').props.onPress());
    expect(mockState.setEntryRating).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('Doppeltippen auf „Fertig“ ergibt einen Eintrag', async () => {
    const { root } = renderScreen();
    act(() => buttonWithText(root, 'Das machen wir').props.onPress());
    await act(async () => {
      const done = buttonWithText(root, 'Fertig');
      done.props.onPress();
      done.props.onPress();
    });
    expect(mockState.addEntry).toHaveBeenCalledTimes(1);
  });

  it('klappt das Speichern nicht, bleibt „Fertig“ da und eine Meldung erscheint', async () => {
    mockState.addEntry.mockRejectedValue(new Error('kaputt'));
    const { root } = renderScreen();
    await finish(root);
    expect(Alert.alert).toHaveBeenCalledWith('Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.');
    expect(buttonWithText(root, 'Fertig')).toBeDefined();
  });
});

// --- Allgemeine Regeln: Texte, Werte aus dem Theme, Schrift, Rechts-nach-links ----------------------------------------

describe('Allgemeine Regeln', () => {
  beforeEach(() => setup(makeIdea({ materials: ['flour', 'scissors'], ...withTexts('Nur mit Erwachsenen schneiden.') })));

  it('jeder Text kommt aus den Übersetzungen: Deutsch und Englisch zeigen verschiedene feste Texte', () => {
    const german = allTexts(renderScreen('de').root);
    const english = allTexts(renderScreen('en').root);
    for (const key of ['Das braucht ihr', 'So geht’s', 'Sicherheit', 'Achtung, Allergene', 'Das machen wir']) {
      expect(german).toContain(key);
    }
    for (const key of ['What you need', 'How it works', 'Safety', 'Watch out, allergens', 'We’ll do this']) {
      expect(english).toContain(key);
    }
  });

  it('Überschriften haben die Rolle „header“ (Titel, Boxen, Abschnitte)', () => {
    const { root } = renderScreen();
    for (const title of ['Waldspaziergang', 'Achtung, Allergene', 'Sicherheit', 'Das braucht ihr', 'So geht’s']) {
      expect(textNode(root, title).props.accessibilityRole).toBe('header');
    }
  });

  it('jeder Text hat eine Schrift aus dem Theme, nie `fontWeight`, und die Systemschrift-Skalierung bleibt an', () => {
    const { root } = renderScreen();
    const families = Object.values(fonts) as string[];
    for (const node of root.findAllByType(Text)) {
      if (typeof node.props.name === 'string') continue; // Symbole
      const style = flat(node);
      expect(families).toContain(style.fontFamily);
      expect(style.fontWeight).toBeUndefined();
      expect(node.props.allowFontScaling).not.toBe(false);
      expect(node.props.maxFontSizeMultiplier).toBeUndefined();
    }
    for (const node of hostNodes(root)) expect(flat(node).fontWeight).toBeUndefined();
  });

  it('Rechts-nach-links vorbereitet: keine festen linken oder rechten Abstände, Ränder oder Ausrichtungen', () => {
    const { root } = renderScreen();
    const physical = /^(left|right|(margin|padding)(Left|Right)|border(Left|Right)(Width|Color|Radius)|border(Top|Bottom)(Left|Right)Radius)$/;
    for (const node of hostNodes(root)) {
      const style = flat(node) as Record<string, unknown>;
      for (const key of Object.keys(style)) expect(key).not.toMatch(physical);
      expect(style.textAlign === 'left' || style.textAlign === 'right').toBe(false);
    }
  });

  it('keine festen Farben: Jede Farbe auf dem Bildschirm steht in der Palette oder den Kategorie-Farben', () => {
    const allowed = new Set<string>([
      ...Object.values(lightTheme.colors),
      ...Object.values(lightTheme.categoryTones).flatMap((tone) => Object.values(tone)),
    ]);
    const { root } = renderScreen();
    for (const node of hostNodes(root)) {
      const style = flat(node);
      for (const key of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor'] as const) {
        const value = style[key];
        if (typeof value === 'string' && !value.startsWith('rgba')) expect(allowed).toContain(value);
      }
    }
  });
});
