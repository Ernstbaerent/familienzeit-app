// Der Ergebnis-Bildschirm „Eure Ideen“ (DESIGN.md, Bildschirm 02, Entscheidungen 8 und 9): Kopf mit rundem Zurück-Knopf,
// feste Wetterzeile, genau drei Karten, „Keine passt? Drei neue Ideen“, Hinweis bei weniger als drei, Wetter-Schritt.
// Ohne Handy: Der Bildschirm wird mit echten Texten gezeichnet, Navigation, Profile, Verlauf, Wetter und Aktivitäten sind ersetzt.

import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';

import type { Activity } from '@/features/activities/activities';
import type { ChildProfile } from '@/features/profiles/profiles';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import { mirrorInRTL } from '@/lib/rtl';
import { lightColors, radius, size } from '@/lib/theme';

import ResultsScreen from '../../../app/suggestions/results';
import { makeData, makeRecord, testNow } from '../weather/testHelpers';
import { makeActivity } from './testHelpers';

// --- Ersatz für alles, was nicht zum Bildschirm gehört ---------------------------------------------------------------

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
const mockScreenOptions: { current: unknown } = { current: undefined };
const mockState = {
  params: {} as Record<string, string>,
  profiles: [] as ChildProfile[],
  activities: [] as Activity[],
  weather: {} as Record<string, unknown>,
};

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { createElement } = jest.requireActual('react');
    const { Text: NativeText } = jest.requireActual('react-native');
    return createElement(NativeText, null, `redirect:${href}`);
  },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions.current = options;
      return null;
    },
  },
  useLocalSearchParams: () => mockState.params,
  useRouter: () => mockRouter,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('@/features/profiles/ProfilesContext', () => ({
  useProfiles: () => ({ status: 'ready', profiles: mockState.profiles }),
}));
jest.mock('@/features/history/HistoryContext', () => ({
  useHistory: () => ({ status: 'ready', entries: [] }),
}));
jest.mock('@/features/weather/WeatherProvider', () => ({
  useWeather: () => mockState.weather,
  useWeatherRefresh: () => undefined,
}));
jest.mock('@/features/activities/ActivitiesContext', () => ({
  useActivities: () => ({ activities: mockState.activities, source: 'bundled' }),
}));

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
  default: () => ({ width: 360, height: 800, scale: 3, fontScale: 1 }),
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

const child: ChildProfile = {
  id: 'a',
  nickname: 'Mila',
  birthYear: new Date().getFullYear() - 5,
  birthMonth: 1,
  interests: [],
  dislikes: [],
  createdAt: '2026-10-01T00:00:00.000Z',
};

const noop = jest.fn();
// Standort erlaubt, Wetter vom Deutschen Wetterdienst da: der Normalfall.
const weatherReady = () => ({
  access: 'granted',
  status: 'ready',
  data: makeData({ current: makeRecord({ time: testNow.getTime(), temperature: 11 }) }),
  stale: false,
  refresh: noop,
  allowLocation: noop,
  chooseManualWeather: noop,
});

// Aktivitäten mit eigenen IDs: gleiche Kategorie, damit die Reihenfolge nur an der Reihenfolge der Daten hängt.
function catalog(count: number, category: Activity['category'] = 'nature'): Activity[] {
  return Array.from({ length: count }, (_, i) =>
    makeActivity({ id: `idea-${i + 1}`, category, ageMin: 0, ageMax: 12 }),
  );
}

function renderResults(language: 'de' | 'en' = 'de') {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <I18nextProvider i18n={translator(language)}>
        <ResultsScreen />
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
    .filter((text) => text !== '' && !text.endsWith('-outline'));
}

function buttons(root: ReactTestInstance) {
  return root.findAllByProps({ accessibilityRole: 'button' }, { deep: false });
}

function cards(root: ReactTestInstance) {
  return buttons(root).filter((button) => button.props.accessibilityHint === 'Öffnet die Details');
}

function buttonWithText(root: ReactTestInstance, text: string) {
  const found = buttons(root).filter((button) => allTexts(button).includes(text));
  expect(found).toHaveLength(1);
  return found[0];
}

const cardTitles = (root: ReactTestInstance) =>
  cards(root).map((card) => /^[^.]+/.exec(card.props.accessibilityLabel)?.[0]);

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
  mockState.params = { children: 'a', time: 'hour1' };
  mockState.profiles = [child];
  mockState.activities = catalog(7);
  mockState.weather = weatherReady();
});

// --- Tests ----------------------------------------------------------------------------------------------------------

describe('Kopf', () => {
  it('hat einen runden Zurück-Knopf (mindestens 44 pt, beschriftet) und den Titel, aber kein Mischen-Symbol', () => {
    const root = renderResults();
    const [back] = root.findAllByProps({ accessibilityLabel: 'Zurück zur Auswahl' }, { deep: false });
    expect(back.props.accessibilityRole).toBe('button');
    expect(flat(back)).toMatchObject({ minWidth: size.touch, minHeight: size.touch });
    expect(allTexts(root)).toContain('Eure Ideen');
    // Das Mischen-Symbol gibt es nur im Knopf „Keine passt?“, nicht im Kopf (Entscheidung 9).
    const shuffles = root.findAllByType(Text).filter((node) => node.props.name === 'shuffle-outline');
    expect(shuffles).toHaveLength(1);
  });

  it('der Pfeil im Zurück-Knopf zeigt zurück und folgt der Schreibrichtung (bei rechts-nach-links gespiegelt)', () => {
    const root = renderResults();
    const [back] = root.findAllByProps({ accessibilityLabel: 'Zurück zur Auswahl' }, { deep: false });
    const arrow = back.findAllByType(Text).find((node) => node.props.name === 'chevron-back-outline')!;
    expect(arrow.props.style).toEqual(mirrorInRTL);
  });

  it('der Zurück-Knopf führt zur Auswahl (Zurück, sonst direkt zum Start)', () => {
    const root = renderResults();
    const [back] = root.findAllByProps({ accessibilityLabel: 'Zurück zur Auswahl' }, { deep: false });
    act(() => back.props.onPress());
    expect(mockRouter.back).toHaveBeenCalledTimes(1);

    mockRouter.canGoBack.mockReturnValue(false);
    act(() => back.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('Englisch: Beschriftung und Titel in der App-Sprache', () => {
    const root = renderResults('en');
    expect(root.findAllByProps({ accessibilityLabel: 'Back to selection' }, { deep: false })).toHaveLength(1);
    expect(allTexts(root)).toContain('Your ideas');
  });

  it('die Navigationsleiste des Systems ist aus: Der Bildschirm hat seinen eigenen Kopf', () => {
    mockScreenOptions.current = undefined;
    renderResults();
    expect(mockScreenOptions.current).toEqual({ headerShown: false });
  });

  it('„Auswahl ändern“ unten gibt es nicht mehr, der Zurück-Knopf übernimmt das', () => {
    expect(allTexts(renderResults())).not.toContain('Auswahl ändern');
  });
});

describe('Wetterzeile', () => {
  it('steht fest über dem Scrollbereich: Wetter, Temperatur und Quelle „Deutscher Wetterdienst“', () => {
    const root = renderResults();
    const texts = allTexts(root);
    expect(texts).toContain('Bewölkt · 11 °C');
    expect(texts).toContain('Quelle: Deutscher Wetterdienst');
    // Nicht im Scrollbereich: Beim Scrollen bleibt die Zeile stehen.
    const scroll = root.findByType(ScrollView);
    expect(allTexts(scroll)).not.toContain('Quelle: Deutscher Wetterdienst');
    expect(allTexts(scroll)).not.toContain('Bewölkt · 11 °C');
  });

  it('zeigt beim Laden einen Ladezustand (für die Sprachausgabe „beschäftigt“) und noch keine Karten', () => {
    mockState.weather = { ...weatherReady(), status: 'loading', data: null };
    const root = renderResults();
    expect(allTexts(root)).toContain('Wetter wird geprüft …');
    const loading = root.find((node) => node.props.accessibilityState?.busy === true && typeof node.type === 'string');
    expect(loading.props.accessibilityLiveRegion).toBe('polite');
    expect(cards(root)).toHaveLength(0);
    // Der Kopf bleibt benutzbar.
    expect(root.findAllByProps({ accessibilityLabel: 'Zurück zur Auswahl' }, { deep: false })).toHaveLength(1);
  });

  it('bei Handwahl (aus der Auswahl): „Eure Auswahl: Regen“, ohne Quelle, solange es keine Daten vom Wetterdienst gibt', () => {
    mockState.params = { children: 'a', time: 'hour1', weather: 'rain' };
    mockState.weather = { ...weatherReady(), access: 'declined', status: 'unavailable', data: null };
    const texts = allTexts(renderResults());
    expect(texts).toContain('Eure Auswahl: Regen');
    expect(texts).not.toContain('Quelle: Deutscher Wetterdienst');
  });

  it('„Ändern“ öffnet „Wetter ändern“ (sichtbar „Ändern“, vorgelesen „Wetter ändern“), eine Wahl schließt es wieder', () => {
    const root = renderResults();
    const change = buttonWithText(root, 'Ändern');
    expect(change.props.accessibilityLabel).toBe('Wetter ändern');
    expect(change.props.accessibilityState).toMatchObject({ expanded: false });
    expect(flat(change).minHeight).toBeGreaterThanOrEqual(size.touch);

    act(() => change.props.onPress());
    expect(buttonWithText(root, 'Ändern').props.accessibilityState).toMatchObject({ expanded: true });
    const radios = root.findAllByProps({ accessibilityRole: 'radio' }, { deep: false });
    expect(radios.map((radio) => allTexts(radio)[0])).toEqual([
      'Automatisch',
      'Sonne',
      'Bewölkt',
      'Regen',
      'Gewitter',
      'Schnee',
    ]);
    expect(radios[0].props.accessibilityState.checked).toBe(true); // „Automatisch“ ist gewählt

    act(() => radios[3].props.onPress()); // Regen
    expect(root.findAllByProps({ accessibilityRole: 'radio' }, { deep: false })).toHaveLength(0);
    // Die Handwahl ersetzt nur die Wetterlage, die Temperatur vom Wetterdienst bleibt.
    expect(allTexts(root)).toContain('Eure Auswahl: Regen · 11 °C');
  });

  it('eine amtliche Warnung steht im Scrollbereich, mit dem Hinweis, was sie für die Vorschläge heißt', () => {
    const now = Date.now();
    mockState.weather = {
      ...weatherReady(),
      data: makeData({
        current: makeRecord({ time: now }),
        alerts: [{ kind: 'thunderstorm', onset: now, expires: now + 3 * 3_600_000 }],
      }),
    };
    const root = renderResults();
    const scroll = root.findByType(ScrollView);
    const texts = allTexts(scroll);
    expect(texts.some((text) => text.startsWith('Amtliche Gewitterwarnung'))).toBe(true);
    expect(texts).toContain('Deshalb schlagen wir nichts draußen vor.');
    const alert = scroll.findAllByProps({ accessibilityRole: 'alert' })[0];
    expect(alert).toBeDefined();
  });

  it('„Standort erlauben“ erscheint, solange der Standort nicht erlaubt ist, und öffnet erst die Erklärung', () => {
    const allowLocation = jest.fn();
    mockState.params = { children: 'a', time: 'hour1', weather: 'cloudy' };
    mockState.weather = { ...weatherReady(), access: 'ask', status: 'unavailable', data: null, allowLocation };
    const root = renderResults();
    // Mit Handwahl und noch nie gefragtem Standort: Vorschläge, dazu der Link unter der Wetterzeile.
    expect(cards(root)).toHaveLength(3);
    const link = root.findAllByProps({ accessibilityRole: 'link' }, { deep: false })[0];
    expect(allTexts(link)).toEqual(['Standort erlauben']);
    expect(flat(link).minHeight).toBeGreaterThanOrEqual(size.touch);

    act(() => link.props.onPress());
    // Erst die Erklärung (das Handy fragt noch nicht), der Link verschwindet.
    expect(allowLocation).not.toHaveBeenCalled();
    expect(allTexts(root)).toContain('Wetter bei euch');
    expect(root.findAllByProps({ accessibilityRole: 'link' })).toHaveLength(0);

    // Danach löst „Standort erlauben“ den Dialog aus, und die Erklärung schließt sich.
    act(() => buttonWithText(root, 'Standort erlauben').props.onPress());
    expect(allowLocation).toHaveBeenCalledTimes(1);
    expect(allTexts(root)).not.toContain('Wetter bei euch');
  });

  it('der Link führt bei dauerhaft abgelehnter Erlaubnis in die Einstellungen (Beschriftung)', () => {
    mockState.params = { children: 'a', time: 'hour1', weather: 'cloudy' };
    mockState.weather = { ...weatherReady(), access: 'blocked', status: 'unavailable', data: null };
    const [link] = renderResults().findAllByProps({ accessibilityRole: 'link' }, { deep: false });
    expect(allTexts(link)).toEqual(['Standort in den Einstellungen erlauben']);
  });

  it('bei erlaubtem Standort gibt es keinen „Standort erlauben“-Link', () => {
    expect(renderResults().findAllByProps({ accessibilityRole: 'link' })).toHaveLength(0);
  });
});

describe('Karten', () => {
  it('genau drei Karten, jede mit dem Titel zuerst in der Beschriftung', () => {
    const root = renderResults();
    expect(cards(root)).toHaveLength(3);
    expect(cardTitles(root)).toEqual(['Titel idea-1', 'Titel idea-2', 'Titel idea-3']);
  });

  it('ein Tipp auf eine Karte öffnet die Details mit den gewählten Kindern', () => {
    const root = renderResults();
    act(() => cards(root)[1].props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/activity/[id]',
      params: { id: 'idea-2', children: 'a' },
    });
  });

  it('ohne `image` und ohne Illustration (Zusatz 45): die Farbfläche mit großem Symbol, keine Fotos', () => {
    const root = renderResults(); // drei Natur-Aktivitäten ohne Bild
    expect(cards(root)).toHaveLength(3);
    expect(root.findAllByType(Image)).toHaveLength(0);
    const marks = root.findAllByType(Text).filter((node) => node.props.name === 'leaf-outline' && node.props.size > 24);
    expect(marks).toHaveLength(3);
  });

  it('in jeder Kategorie zeigen die Karten die Farbfläche mit großem Symbol, in gleicher Form', () => {
    mockState.activities = catalog(7, 'outing');
    const root = renderResults();
    expect(cards(root)).toHaveLength(3);
    expect(root.findAllByType(Image)).toHaveLength(0);
    const marks = root.findAllByType(Text).filter((node) => node.props.name === 'map-outline' && node.props.size > 24);
    expect(marks).toHaveLength(3);
  });
});

describe('Aktivitäten aus dem Hintergrund (M8)', () => {
  it('friert die Aktivitäten beim Öffnen ein: Ein neuer Bestand ändert die Karten nicht, erst das nächste Öffnen nimmt ihn', () => {
    let renderer!: ReturnType<typeof create>;
    const screen = (
      <I18nextProvider i18n={translator('de')}>
        <ResultsScreen />
      </I18nextProvider>
    );
    act(() => {
      renderer = create(screen);
    });
    const before = cardTitles(renderer.root);
    expect(before).toEqual(['Titel idea-1', 'Titel idea-2', 'Titel idea-3']);

    // Im Hintergrund kommt ein anderer Bestand an (Provider liefert eine neue Liste).
    mockState.activities = Array.from({ length: 7 }, (_, i) => makeActivity({ id: `neu-${i + 1}`, category: 'nature', ageMin: 0, ageMax: 12 }));
    act(() => renderer.update(screen));
    expect(cardTitles(renderer.root)).toEqual(before);

    // „Keine passt?“ blättert weiter, aber weiter im eingefrorenen Bestand.
    act(() => buttonWithText(renderer.root, 'Keine passt? Drei neue Ideen').props.onPress());
    expect(cardTitles(renderer.root)).toEqual(['Titel idea-4', 'Titel idea-5', 'Titel idea-6']);

    // Das nächste Öffnen sieht den neuen Bestand.
    expect(cardTitles(renderResults())).toEqual(['Titel neu-1', 'Titel neu-2', 'Titel neu-3']);
  });
});

describe('„Keine passt? Drei neue Ideen“', () => {
  it('der Knopf ist ein Nebenknopf (nicht Terrakotta) und zeigt die nächsten drei Ideen', () => {
    const root = renderResults();
    const more = buttonWithText(root, 'Keine passt? Drei neue Ideen');
    expect(flat(more).backgroundColor).not.toBe(lightColors.primary);
    act(() => more.props.onPress());
    expect(cardTitles(root)).toEqual(['Titel idea-4', 'Titel idea-5', 'Titel idea-6']);
  });

  it('Englisch: „None of these? Three new ideas“', () => {
    const root = renderResults('en');
    expect(allTexts(root)).toContain('None of these? Three new ideas');
  });

  it('immer genau drei, auch bei der letzten Gruppe (aufgefüllt), danach der Hinweis „von vorn“', () => {
    const root = renderResults();
    const press = () => act(() => buttonWithText(root, 'Keine passt? Drei neue Ideen').props.onPress());
    press();
    press();
    expect(cards(root)).toHaveLength(3); // 7 Ideen: die dritte Gruppe wird aufgefüllt
    expect(allTexts(root)).not.toContain(
      'Das waren alle Ideen, die gerade passen. Hier sind sie noch einmal von vorn.',
    );
    press(); // jetzt wieder die erste Gruppe, mit Hinweis
    expect(cardTitles(root)).toEqual(['Titel idea-1', 'Titel idea-2', 'Titel idea-3']);
    expect(allTexts(root)).toContain(
      'Das waren alle Ideen, die gerade passen. Hier sind sie noch einmal von vorn.',
    );
  });

  it('bei genau drei passenden Ideen gibt es keinen Knopf (es gibt keine anderen)', () => {
    mockState.activities = catalog(3);
    const root = renderResults();
    expect(cards(root)).toHaveLength(3);
    expect(allTexts(root)).not.toContain('Keine passt? Drei neue Ideen');
  });
});

describe('Weniger als drei Vorschläge', () => {
  it('zeigt die vorhandenen mit freundlichem Hinweis (ohne den Knopf)', () => {
    mockState.activities = catalog(2);
    const root = renderResults();
    expect(cards(root)).toHaveLength(2);
    const texts = allTexts(root);
    expect(texts).toContain('Zu eurer Auswahl passen gerade nur 2 Ideen.');
    expect(texts).toContain('Wir sammeln laufend neue Ideen. Schau gern bald wieder vorbei.');
    expect(texts).not.toContain('Keine passt? Drei neue Ideen');
  });

  it('keine passt: Hinweis statt Karten, der Kopf mit Zurück-Knopf bleibt', () => {
    mockState.activities = [];
    const root = renderResults();
    expect(cards(root)).toHaveLength(0);
    expect(allTexts(root)).toContain('Zu eurer Auswahl passt gerade keine Idee.');
    expect(root.findAllByProps({ accessibilityLabel: 'Zurück zur Auswahl' }, { deep: false })).toHaveLength(1);
  });
});

describe('Wetter-Schritt vor den Vorschlägen (behält seine Funktion)', () => {
  it('Standort noch nie gefragt: die Erklär-Karte mit „Standort erlauben“ und „Wetter selbst wählen“, ohne Wetterzeile', () => {
    const allowLocation = jest.fn();
    const chooseManualWeather = jest.fn();
    mockState.weather = { ...weatherReady(), access: 'ask', status: 'unavailable', data: null, allowLocation, chooseManualWeather };
    const root = renderResults();
    expect(allTexts(root)).toEqual(expect.arrayContaining(['Wetter bei euch', 'Standort erlauben', 'Wetter selbst wählen']));
    expect(cards(root)).toHaveLength(0);
    expect(allTexts(root)).not.toContain('Ändern');
    act(() => buttonWithText(root, 'Standort erlauben').props.onPress());
    expect(allowLocation).toHaveBeenCalledTimes(1);
    act(() => buttonWithText(root, 'Wetter selbst wählen').props.onPress());
    expect(chooseManualWeather).toHaveBeenCalledTimes(1);
    // Der Kopf mit Zurück-Knopf steht auch hier.
    expect(root.findAllByProps({ accessibilityLabel: 'Zurück zur Auswahl' }, { deep: false })).toHaveLength(1);
  });

  it('Kein Wetter und keine Handwahl: „Wie ist das Wetter?“, ein Tipp zeigt gleich die Vorschläge', () => {
    mockState.weather = { ...weatherReady(), access: 'declined', status: 'unavailable', data: null };
    const root = renderResults();
    expect(allTexts(root)).toContain('Wie ist das Wetter?');
    expect(cards(root)).toHaveLength(0);
    const rain = root.findAllByProps({ accessibilityRole: 'radio' }, { deep: false })[2]; // Sonne, Bewölkt, Regen, …
    expect(allTexts(rain)).toEqual(['Regen']);
    act(() => rain.props.onPress());
    expect(cards(root)).toHaveLength(3);
    expect(allTexts(root)).toContain('Eure Auswahl: Regen');
  });

  it('die Erklär-Karte hat weiße Kartenform (Radius 22) und den Hauptknopf in Terrakotta', () => {
    mockState.weather = { ...weatherReady(), access: 'ask', status: 'unavailable', data: null };
    const root = renderResults();
    const card = root.find(
      (node) =>
        typeof node.type === 'string' &&
        flat(node).backgroundColor === lightColors.card &&
        flat(node).borderRadius === radius.card,
    );
    expect(card).toBeDefined();
    expect(flat(buttonWithText(root, 'Standort erlauben')).backgroundColor).toBe(lightColors.primary);
    expect(flat(buttonWithText(root, 'Wetter selbst wählen')).backgroundColor).not.toBe(lightColors.primary);
  });
});

describe('Unvollständige Auswahl', () => {
  it('führt zurück zum Start', () => {
    mockState.params = {};
    expect(allTexts(renderResults())).toEqual(['redirect:/']);
  });
});
