// Orte (M10b): die einfache Detailansicht eines Ortes (app/place/[id].tsx) und der Orte-Provider (PlacesContext).

import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { Linking, Text } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

import PlaceScreen from '../../../app/place/[id]';
import { PlacesProvider, usePlaces } from './PlacesContext';
import type { PlacesDeps } from './placesRefresh';
import { everyDay, fixtureOrigin, fixtureRows, makePlace, withPlan } from './testHelpers';

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
const mockState = { params: {} as Record<string, string>, places: {} as Record<string, unknown> };

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { createElement } = jest.requireActual('react');
    const { Text: NativeText } = jest.requireActual('react-native');
    return createElement(NativeText, null, `redirect:${href}`);
  },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockState.params,
  useRouter: () => mockRouter,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('./PlacesContext', () => {
  const actual = jest.requireActual('./PlacesContext');
  return { ...actual, usePlaces: (...args: unknown[]) => (mockState.places.useReal ? actual.usePlaces(...args) : mockState.places) };
});
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text: NativeText } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { __esModule: true, default: (props: { name: string }) => createElement(NativeText, props, props.name) };
});
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 360, height: 800, scale: 3, fontScale: 1 }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function translator(language: 'de' | 'en') {
  const i18n = createInstance();
  i18n.init({ resources: { de: { translation: de }, en: { translation: en } }, lng: language, interpolation: { escapeValue: false } });
  return i18n;
}

function render(element: React.ReactElement, language: 'de' | 'en' = 'de') {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<I18nextProvider i18n={translator(language)}>{element}</I18nextProvider>);
  });
  return renderer.root;
}

const texts = (root: ReactTestInstance) =>
  root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(''))
    .filter((text) => text !== '' && !text.endsWith('-outline'));

const cinema = makePlace({ subtype: 'cinema', name: 'Kino am Markt', locality: 'Musterstadt' }, 4.2);

beforeEach(() => {
  jest.clearAllMocks();
  mockState.params = { id: cinema.id };
  mockState.places = { status: 'ready', snapshot: { origin: fixtureOrigin, rows: [cinema], tileFetchedAt: {} } };
});

describe('Detailansicht eines Ortes', () => {
  it('Name, Unterart, Entfernung, Ortsteil, Hinweise und Quellenangabe', () => {
    const root = render(<PlaceScreen />);
    expect(texts(root)).toEqual(
      expect.arrayContaining([
        'Kino',
        'Kino am Markt',
        'Entfernung',
        'ca. 4 km Luftlinie',
        'Ortsteil',
        'Musterstadt',
        'Programm und Altersfreigabe vorher prüfen',
        'Öffnungszeiten vorher prüfen',
        'Orte: © OpenStreetMap-Mitwirkende',
        'Daten unter der Open Database License (ODbL)',
      ]),
    );
    expect(root.findAllByProps({ accessibilityRole: 'header' }, { deep: false }).map((node) => texts(node)[0])).toEqual(['Kino am Markt']);
  });

  it('kein Hauptknopf, kein „Route öffnen“ und keine Website (kommen in M10c)', () => {
    const root = render(<PlaceScreen />);
    expect(texts(root)).not.toContain('Das machen wir');
    expect(root.findAllByProps({ accessibilityRole: 'button' }, { deep: false })).toHaveLength(1); // nur der Zurück-Knopf
  });

  it('fester Plan ohne Feiertagsregel: kein Hinweis zu den Öffnungszeiten', () => {
    const museum = withPlan(everyDay([[600, 1020]]), { subtype: 'museum', name: 'Heimatmuseum' });
    mockState.params = { id: museum.id };
    mockState.places = { status: 'ready', snapshot: { origin: fixtureOrigin, rows: [museum], tileFetchedAt: {} } };
    expect(texts(render(<PlaceScreen />))).not.toContain('Öffnungszeiten vorher prüfen');
  });

  it('die Quellenangabe öffnet openstreetmap.org/copyright', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const root = render(<PlaceScreen />);
    act(() => root.findAllByProps({ accessibilityRole: 'link' }, { deep: false })[0].props.onPress());
    expect(open).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');
    open.mockRestore();
  });

  it('Englisch', () => {
    expect(texts(render(<PlaceScreen />, 'en'))).toEqual(
      expect.arrayContaining(['Cinema', 'Distance', 'approx. 4 km as the crow flies', 'Places: © OpenStreetMap contributors']),
    );
  });

  it('unbekannter Ort oder keine Orte: zurück zum Start', () => {
    mockState.params = { id: 'n1' };
    expect(texts(render(<PlaceScreen />))).toEqual(['redirect:/']);
    mockState.places = { status: 'unavailable', snapshot: null };
    mockState.params = { id: cinema.id };
    expect(texts(render(<PlaceScreen />))).toEqual(['redirect:/']);
  });

  it('Zurück: eine Stufe zurück, sonst zum Start', () => {
    const root = render(<PlaceScreen />);
    const [back] = root.findAllByProps({ accessibilityLabel: 'Zurück zu den Ideen' }, { deep: false });
    act(() => back.props.onPress());
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    mockRouter.canGoBack.mockReturnValue(false);
    act(() => back.props.onPress());
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});

describe('PlacesProvider', () => {
  function Probe({ onValue }: { onValue: (value: ReturnType<typeof usePlaces>) => void }) {
    onValue(usePlaces());
    return null;
  }

  function deps(overrides: Partial<PlacesDeps> = {}): PlacesDeps {
    return {
      getPlace: async () => fixtureOrigin,
      config: { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_abc123' },
      fetchTiles: async () => ({ rows: fixtureRows, importIds: {} }),
      store: {
        loadTile: async () => null,
        saveTile: async () => undefined,
        removeTiles: async () => undefined,
        loadIndex: async () => ({}),
        saveIndex: async () => undefined,
      },
      warn: () => undefined,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockState.places = { useReal: true };
  });

  it('holt nichts von selbst; refresh lädt die Orte, gleichzeitige Aufrufe teilen sich einen Abruf', async () => {
    const fetchTiles = jest.fn(async () => ({ rows: fixtureRows, importIds: {} }));
    let value!: ReturnType<typeof usePlaces>;
    render(
      <PlacesProvider deps={deps({ fetchTiles })}>
        <Probe onValue={(v) => (value = v)} />
      </PlacesProvider>,
    );
    expect(value.status).toBe('idle');
    expect(fetchTiles).not.toHaveBeenCalled();
    await act(async () => {
      await Promise.all([value.refresh(), value.refresh()]);
    });
    expect(fetchTiles).toHaveBeenCalledTimes(1);
    expect(value.status).toBe('ready');
    expect(value.snapshot?.rows).toHaveLength(32);
  });

  it('ohne Erlaubnis: „keine Erlaubnis“, ohne Abruf', async () => {
    const fetchTiles = jest.fn();
    let value!: ReturnType<typeof usePlaces>;
    render(
      <PlacesProvider deps={deps({ getPlace: async () => 'noPermission', fetchTiles })}>
        <Probe onValue={(v) => (value = v)} />
      </PlacesProvider>,
    );
    await act(async () => {
      await value.refresh();
    });
    expect(value).toMatchObject({ status: 'unavailable', snapshot: null, reason: 'noPermission' });
    expect(fetchTiles).not.toHaveBeenCalled();
  });
});
