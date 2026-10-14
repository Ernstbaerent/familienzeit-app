// Orte (M10b, M10c): die Detailansicht eines Ortes (app/place/[id].tsx) mit „Route öffnen“, Website und Öffnungszeiten, und der Orte-Provider (PlacesContext).

import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { ActionSheetIOS, Alert, Linking, Platform, Text } from 'react-native';
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
    expect(root.findAllByProps({ accessibilityRole: 'header' }, { deep: false }).map((node) => texts(node)[0])).toEqual([
      'Kino am Markt',
      'Öffnungszeiten',
    ]);
  });

  it('keine Fahrzeit, kein „Das machen wir“; ohne Website keine Website-Zeile', () => {
    const root = render(<PlaceScreen />);
    expect(texts(root)).not.toContain('Das machen wir');
    expect(texts(root).join(' ')).not.toMatch(/Min\.|Fahrzeit|Website/);
    expect(root.findAllByProps({ accessibilityRole: 'link' }, { deep: false })).toHaveLength(1); // nur die Quellenangabe
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

describe('Route öffnen (M10c)', () => {
  const pool = makePlace({ subtype: 'indoorPool', name: 'Saline Bad & Sauna (Süd)', lat: 50.701234, lon: 12.198765 }); // etwa 4,6 km: Auto
  const nearby = makePlace({ subtype: 'playground', name: 'Spielplatz am Bach' }, 0.4);

  function show(place: ReturnType<typeof makePlace>) {
    mockState.params = { id: place.id };
    mockState.places = { status: 'ready', snapshot: { origin: fixtureOrigin, rows: [place], tileFetchedAt: {} } };
    return render(<PlaceScreen />);
  }

  function routeButton(root: ReactTestInstance) {
    const buttons = root.findAllByProps({ accessibilityRole: 'button' }, { deep: false }).filter((node) => !['Zurück zu den Ideen', 'Back to ideas'].includes(node.props.accessibilityLabel));
    expect(buttons).toHaveLength(1);
    return buttons[0];
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ein beschrifteter Hauptknopf „Route öffnen“ mit dem Namen für die Sprachausgabe', () => {
    const root = show(pool);
    const button = routeButton(root);
    expect(texts(button)).toEqual(['Route öffnen']);
    expect(button.props.accessibilityLabel).toBe('Route öffnen zu Saline Bad & Sauna (Süd)');
    expect(button.props.accessibilityHint).toBeTruthy();
    expect(texts(show(pool)).filter((text) => text === 'Route öffnen')).toHaveLength(1);
  });

  it('Englisch', () => {
    mockState.params = { id: pool.id };
    mockState.places = { status: 'ready', snapshot: { origin: fixtureOrigin, rows: [pool], tileFetchedAt: {} } };
    const button = routeButton(render(<PlaceScreen />, 'en'));
    expect(texts(button)).toEqual(['Open directions']);
    expect(button.props.accessibilityLabel).toBe('Open directions to Saline Bad & Sauna (Süd)');
  });

  it('Android: die geo-URI mit kodiertem Namen, ohne Menü und ohne Dialog vorher', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions');
    const alert = jest.spyOn(Alert, 'alert');
    const root = show(pool);
    await act(async () => routeButton(root).props.onPress());
    expect(open).toHaveBeenCalledWith('geo:0,0?q=50.701234,12.198765(Saline%20Bad%20%26%20Sauna%20%28S%C3%BCd%29)');
    expect(sheet).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it('Android ohne Karten-App: erst danach ein Hinweis', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No Activity found'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const root = show(pool);
    await act(async () => routeButton(root).props.onPress());
    expect(alert).toHaveBeenCalledWith('Es wurde keine Karten-App gefunden.');
  });

  it.each([
    [0, 'https://maps.apple.com/directions?destination=50.701234,12.198765&mode=driving'],
    [1, 'https://www.google.com/maps/dir/?api=1&destination=50.701234%2C12.198765&travelmode=driving'],
    [2, 'https://www.openstreetmap.org/?mlat=50.701234&mlon=12.198765#map=17/50.701234/12.198765'],
  ])('iPhone: Auswahlmenü, Eintrag %i öffnet den passenden Link (Auto ab 1 km)', async (index, url) => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(index));
    const root = show(pool);
    await act(async () => routeButton(root).props.onPress());
    expect(sheet.mock.calls[0][0]).toMatchObject({
      title: 'Öffnen mit',
      options: ['Apple Karten', 'Google Maps', 'OpenStreetMap (Karte)', 'Abbrechen'],
      cancelButtonIndex: 3,
    });
    expect(open).toHaveBeenCalledWith(url);
  });

  it('iPhone: unter 1 km zu Fuß; Abbrechen öffnet nichts', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    let pick = 0;
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(pick));
    const root = show(nearby);
    await act(async () => routeButton(root).props.onPress());
    expect(open).toHaveBeenLastCalledWith(expect.stringMatching(/^https:\/\/maps\.apple\.com\/directions\?destination=.*&mode=walking$/));
    pick = 3;
    await act(async () => routeButton(root).props.onPress());
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('iPhone, Englisch: Einträge im Menü', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(3));
    mockState.params = { id: pool.id };
    mockState.places = { status: 'ready', snapshot: { origin: fixtureOrigin, rows: [pool], tileFetchedAt: {} } };
    const root = render(<PlaceScreen />, 'en');
    await act(async () => routeButton(root).props.onPress());
    expect(sheet.mock.calls[0][0].options).toEqual(['Apple Maps', 'Google Maps', 'OpenStreetMap (map)', 'Cancel']);
  });
});

describe('Adresse, Website und Öffnungszeiten (M10c)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function show(place: ReturnType<typeof makePlace>, language: 'de' | 'en' = 'de') {
    mockState.params = { id: place.id };
    mockState.places = { status: 'ready', snapshot: { origin: fixtureOrigin, rows: [place], tileFetchedAt: {} } };
    return render(<PlaceScreen />, language);
  }

  it('Adresse unter dem Titel nur mit Straße und Ort', () => {
    expect(texts(show(makePlace({ name: 'Heimatmuseum', street: 'Elsterstraße', locality: 'Pohlitz' })))).toContain('Elsterstraße, Pohlitz');
    expect(texts(show(makePlace({ name: 'Heimatmuseum', street: 'Elsterstraße', locality: null })))).not.toContain('Elsterstraße, Pohlitz');
  });

  it('Website: Link mit Adresse und „Öffnet im Browser“, öffnet den Browser', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const root = show(makePlace({ name: 'Heimatmuseum', website: 'https://www.heimatmuseum.example/' }));
    expect(texts(root)).toEqual(expect.arrayContaining(['Website öffnen', 'heimatmuseum.example · Öffnet im Browser']));
    const [link] = root.findAllByProps({ accessibilityLabel: 'Website öffnen: heimatmuseum.example' }, { deep: false });
    expect(link.props.accessibilityRole).toBe('link');
    expect(link.props.accessibilityHint).toBe('Öffnet im Browser');
    act(() => link.props.onPress());
    expect(open).toHaveBeenCalledWith('https://www.heimatmuseum.example/');
  });

  it('Website mit fremdem Schema wird nicht gezeigt (auch wenn sie an der Prüfung vorbeikäme)', () => {
    const root = show(makePlace({ name: 'Heimatmuseum', website: 'javascript:alert(1)' }));
    expect(texts(root)).not.toContain('Website öffnen');
  });

  it('fester Wochenplan: Liste Montag bis Sonntag, heute hervorgehoben', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 14, 10, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const plan = { days: [[[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [], []], ph: false } as const;
    const root = show(withPlan(plan as never, { subtype: 'museum', name: 'Heimatmuseum', opening_hours: 'Mo-Fr 09:00-17:00' }));
    const all = texts(root);
    expect(all).toEqual(expect.arrayContaining(['Montag', ' · heute', 'Sonntag', '9:00–17:00', 'geschlossen']));
    expect(all).not.toContain('Mo-Fr 09:00-17:00'); // kein Rohtext bei einem Plan
    expect(all).not.toContain('Öffnungszeiten vorher prüfen');
    expect(root.findAllByProps({ accessibilityLabel: 'Heute, Mittwoch: 9:00–17:00' }, { deep: false })).toHaveLength(1);
    expect(root.findAllByProps({ accessibilityLabel: 'Samstag: geschlossen' }, { deep: false })).toHaveLength(1);
  });

  it('Englisch: Wochentage in der App-Sprache', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 14, 10, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const root = show(withPlan(everyDay([[540, 1020]]), { subtype: 'museum', name: 'Heimatmuseum' }), 'en');
    expect(root.findAllByProps({ accessibilityLabel: 'Today, Wednesday: 9:00–17:00' }, { deep: false })).toHaveLength(1);
    expect(texts(root)).toContain('Opening hours');
  });

  it('komplexe Angabe: Hinweis und Rohtext; Saison', () => {
    const root = show(
      makePlace({ subtype: 'outdoorPool', name: 'Freibad', opening_hours: 'Jun-Aug 10:00-20:00; SH 09:00-20:00', hours_kind: 'complex', months: [6, 7, 8] }),
    );
    expect(texts(root)).toEqual(
      expect.arrayContaining(['Öffnungszeiten vorher prüfen', 'Angabe in OpenStreetMap', 'Jun-Aug 10:00-20:00; SH 09:00-20:00', 'Saison: Juni bis August']),
    );
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
