import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import type { Activity } from '@/features/activities/activities';
import { useActivities } from '@/features/activities/ActivitiesContext';
import type { HistoryEntry } from '@/features/history/history';
import { useHistory } from '@/features/history/HistoryContext';
import { staleDays } from '@/features/places/placeDisplay';
import { usePlaces, usePlacesRefresh } from '@/features/places/PlacesContext';
import { PlacesSourceLine } from '@/features/places/PlacesSourceLine';
import type { PlacesSnapshot } from '@/features/places/placesRefresh';
import type { ChildProfile } from '@/features/profiles/profiles';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { getCardImageChain } from '@/features/suggestions/cardImage';
import { getMinutes, longestMinutes, type Weather } from '@/features/suggestions/conditions';
import { suggestWithPlaces, widenedRadius, type PlaceSuggestion } from '@/features/suggestions/mix';
import { PlaceCard } from '@/features/suggestions/PlaceCard';
import { ResultsHeader } from '@/features/suggestions/ResultsHeader';
import {
  parseSelectionParams,
  toSuggestionRequest,
  type Selection,
} from '@/features/suggestions/selection';
import {
  getPage,
  getTips,
  isStartingOver,
  suggestionsPerPage,
  type Tip,
} from '@/features/suggestions/suggest';
import { SuggestionCard } from '@/features/suggestions/SuggestionCard';
import {
  assumedSituation,
  buildSituation,
  manualSituation,
  toConditions,
} from '@/features/weather/situation';
import { getWeatherStep } from '@/features/weather/manualWeather';
import { WeatherBar } from '@/features/weather/WeatherBar';
import { WeatherPanel, type WeatherPanelMode } from '@/features/weather/WeatherPanel';
import { useWeather, useWeatherRefresh } from '@/features/weather/WeatherProvider';
import { WeatherStep } from '@/features/weather/WeatherStep';
import { fonts, fontSize, lineHeight, radius, spacing, useTheme, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// So lange warten „Eure Ideen“ höchstens auf die Orte (gleichzeitig mit dem Wetter). Danach nur Aktivitäten (docs/orte.md).
export const placesWaitMs = 4000;

// Die Vorschläge (DESIGN.md, Bildschirm 02): genau 3 Karten, „Keine passt? Drei neue Ideen“ zeigt die nächsten 3.
// Seit M10b mischen sich Orte aus der Umgebung darunter (höchstens 2 je Gruppe, Regeln in src/features/suggestions/mix.ts).
export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const { status, profiles } = useProfiles();
  const { status: historyStatus, entries } = useHistory();
  if (status === 'loading' || historyStatus === 'loading') return null;

  // Unvollständige Auswahl oder kein ausgewähltes Kind mehr da: zurück zum Start (dort steht die Auswahl).
  const selection = parseSelectionParams(params);
  const hasChild = profiles.some((child) => selection?.childIds.includes(child.id));
  if (!selection || !hasChild) return <Redirect href="/" />;

  return <Results selection={selection} profiles={profiles} historyEntries={entries} />;
}

type ResultsProps = {
  selection: Selection;
  profiles: ChildProfile[];
  historyEntries: HistoryEntry[];
};

function Results({ selection, profiles, historyEntries }: ResultsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  // „Jetzt“ einmal festhalten (für das Alter der Kinder, die Tageszeit und das Wetter-Fenster).
  const [now] = useState(() => new Date());
  // Der Verlauf beim Öffnen dieses Bildschirms. Er bleibt eingefroren, damit sich die Karten nicht umsortieren,
  // während man zwischen Details und Vorschlägen hin- und herwechselt. Beim nächsten Öffnen gilt der neue Stand.
  const [history] = useState(historyEntries);
  // Ebenso die Aktivitäten: Kommt im Hintergrund ein neuer Bestand von Supabase, gilt er erst beim nächsten Öffnen (M8).
  const { activities: currentActivities } = useActivities();
  const [activities] = useState(currentActivities);
  // Wie oft „Keine passt? Drei neue Ideen“ gedrückt wurde.
  const [pageIndex, setPageIndex] = useState(0);
  // Wetter von Hand: aus der Auswahl („Wie ist das Wetter?“) oder hier mit „Wetter ändern“.
  // `null` heißt: Das Wetter kommt automatisch vom Deutschen Wetterdienst.
  const [manualWeather, setManualWeather] = useState<Weather | null>(selection.weather ?? null);
  // Was unter der festen Wetterzeile aufgeklappt ist („Wetter ändern“ oder die Erklärung zum Standort).
  const [panel, setPanel] = useState<WeatherPanelMode>('closed');
  const { access, status, data, stale } = useWeather();
  useWeatherRefresh();
  // Fehlt noch etwas zum Wetter, kommt vor den Vorschlägen ein Schritt (nur wenn nötig, siehe WeatherStep).
  const weatherStep = getWeatherStep(access, status, manualWeather !== null);

  // Orte (M10b): Sie werden besorgt, sobald der Standort erlaubt ist (auch direkt nach „Standort erlauben“ im Wetter-Schritt).
  // Die Frist von 4 Sekunden beginnt, wenn die Vorschläge gezeigt werden können (nach dem Wetter-Schritt), und läuft gleichzeitig
  // mit dem Laden des Wetters. Danach sind die Orte für diese Ansicht eingefroren, wie Aktivitäten und Verlauf.
  const places = usePlaces();
  usePlacesRefresh(access);
  const [placesDeadlinePassed, setPlacesDeadlinePassed] = useState(false);
  const readyForPlaces = weatherStep === null;
  useEffect(() => {
    if (!readyForPlaces) return;
    const timer = setTimeout(() => setPlacesDeadlinePassed(true), placesWaitMs);
    return () => clearTimeout(timer);
  }, [readyForPlaces]);
  // Ein altes „keine Erlaubnis“ zählt nicht, wenn der Standort inzwischen erlaubt ist: Dann läuft gleich ein neuer Versuch.
  const placesOutdated = places.reason === 'noPermission' && access === 'granted';
  const placesSettled =
    places.status === 'ready' || (places.status === 'unavailable' && !placesOutdated) || placesDeadlinePassed;
  // `undefined` = noch nicht eingefroren, `null` = ohne Orte.
  const [frozenPlaces, setFrozenPlaces] = useState<PlacesSnapshot | null | undefined>(undefined);
  const weatherSettled = !(status === 'loading' && data === null && manualWeather === null);
  if (frozenPlaces === undefined && readyForPlaces && weatherSettled && placesSettled) {
    setFrozenPlaces(places.status === 'ready' ? places.snapshot : null);
  }

  // Das Wetter für die gewählte Zeit. Eine Handwahl ersetzt nur die Wetterlage: Amtliche Warnungen bleiben.
  const automatic = data ? buildSituation(data, getMinutes(selection.time), now, { stale }) : null;
  const situation = manualWeather
    ? manualSituation(manualWeather, automatic)
    : (automatic ?? assumedSituation());

  const request = toSuggestionRequest(selection, profiles, now, toConditions(situation), history);
  const suggestions = suggestWithPlaces(
    activities,
    request,
    frozenPlaces ? { origin: frozenPlaces.origin, rows: frozenPlaces.rows } : undefined,
  );
  const page = getPage(suggestions, pageIndex);
  const tooFew = suggestions.matchCount < suggestionsPerPage;
  const pagePlaces = page.filter((item): item is PlaceSuggestion => item.kind === 'place');
  const radiusHint = widenedRadius(suggestions, page);
  const placesStale = frozenPlaces
    ? staleDays(pagePlaces.map((item) => item.place), frozenPlaces.tileFetchedAt, now.getTime())
    : null;

  function changeWeather(weather: Weather | null) {
    setManualWeather(weather);
    setPanel('closed');
    setPageIndex(0); // andere Wetterlage, andere Reihenfolge: wieder bei den ersten 3
  }

  function showOthers() {
    setPageIndex((current) => current + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function openPlace(item: PlaceSuggestion) {
    router.push({ pathname: '/place/[id]', params: { id: item.place.id } });
  }

  function openDetails(activity: Activity) {
    router.push({
      pathname: '/activity/[id]',
      params: { id: activity.id, children: selection.childIds.join(',') },
    });
  }

  // Zurück zur Auswahl auf dem Start (dort stehen Kinder, Zeit und Energie).
  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const header = <ResultsHeader title={t('suggest.resultsTitle')} onBack={goBack} />;

  // Vor den Vorschlägen: erst das Wetter klären (Erklär-Karte oder „Wie ist das Wetter?“).
  if (weatherStep !== null) {
    return (
      <Frame header={header}>
        <ScrollView contentContainerStyle={styles.content}>
          <WeatherStep step={weatherStep} onChooseWeather={changeWeather} />
        </ScrollView>
      </Frame>
    );
  }

  // Die Vorschläge hängen vom Wetter ab: Kurz warten, bis es da ist (der Abruf hat ein Zeitlimit).
  // Die Wetterzeile zeigt dabei den Ladezustand, der Kopf bleibt benutzbar.
  if (!weatherSettled) {
    return (
      <Frame header={header} weather={<WeatherBar state="loading" />}>
        <View style={styles.waiting} />
      </Frame>
    );
  }

  const weatherBar = (
    <WeatherBar
      state="ready"
      situation={situation}
      changeOpen={panel === 'change'}
      onToggleChange={() => setPanel((current) => (current === 'change' ? 'closed' : 'change'))}
    />
  );

  // Das Wetter ist da, die Orte noch nicht: höchstens 4 Sekunden ruhig warten (die Wetterzeile ist schon benutzbar).
  if (frozenPlaces === undefined) {
    return (
      <Frame header={header} weather={weatherBar}>
        <View style={styles.waitingPlaces} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} accessible>
          <ActivityIndicator color={theme.colors.icon} />
          <Text style={styles.hint}>{t('places.loading')}</Text>
        </View>
      </Frame>
    );
  }

  return (
    <Frame header={header} weather={weatherBar}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <WeatherPanel
          situation={situation}
          now={now}
          mode={panel}
          manualWeather={manualWeather}
          hasAutomatic={automatic !== null}
          onChooseWeather={changeWeather}
          onModeChange={setPanel}
        />

        {isStartingOver(suggestions, pageIndex) && (
          <Text style={styles.hint} accessibilityLiveRegion="polite">
            {t('suggest.startingOver')}
          </Text>
        )}

        {radiusHint !== null && (
          <Text style={styles.hint}>{t('places.radiusWidened', { km: radiusHint })}</Text>
        )}

        {page.map((item) =>
          item.kind === 'activity' ? (
            <SuggestionCard
              key={`activity:${item.activity.id}`}
              activity={item.activity}
              // Bild je Karte: `image` der Aktivität oder Farbfläche (die Illustration schiebt CardMedia dazwischen ein).
              imageChain={getCardImageChain(item.activity)}
              onPress={() => openDetails(item.activity)}
            />
          ) : (
            <PlaceCard key={`place:${item.place.id}`} suggestion={item} onPress={() => openPlace(item)} />
          ),
        )}

        {/* Quellenangabe der Orte (ODbL), nur wenn auf dieser Seite ein Ort zu sehen ist. */}
        {pagePlaces.length > 0 && <PlacesSourceLine staleDays={placesStale} />}

        {tooFew && (
          <FewMatchesNotice
            count={suggestions.matchCount}
            tips={getTips(activities, request, longestMinutes)}
          />
        )}

        {suggestions.pages.length > 1 && (
          <View style={styles.actions}>
            <Button
              label={t('suggest.more')}
              variant="secondary"
              icon="shuffle-outline"
              onPress={showOthers}
            />
          </View>
        )}
      </ScrollView>
    </Frame>
  );
}

type FrameProps = {
  header: ReactNode;
  weather?: ReactNode; // die feste Wetterzeile (fehlt im Wetter-Schritt, dort gibt es noch kein Wetter)
  children: ReactNode;
};

// Der Rahmen von „Eure Ideen“: eigener Kopf statt der Navigationsleiste, darunter die feste Wetterzeile,
// darunter der Bereich, der scrollt.
function Frame({ header, weather, children }: FrameProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      {weather}
      {children}
    </SafeAreaView>
  );
}

const tipTextKeys = {
  fewerChildren: 'suggest.tipFewerChildren',
  moreTime: 'suggest.tipMoreTime',
} as const satisfies Record<Tip, string>;

// Freundlicher Hinweis, wenn weniger als 3 Ideen passen. Die Sicherheitsregeln bleiben, wie sie sind;
// stattdessen ein Tipp, was man an der Auswahl ändern kann (nur, wenn es wirklich hilft).
function FewMatchesNotice({ count, tips }: { count: number; tips: Tip[] }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const texts = tips.map((tip) => t(tipTextKeys[tip]));
  if (texts.length === 0) texts.push(t('suggest.tipComingSoon'));

  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.noticeTitle}>{t('suggest.fewMatches', { count })}</Text>
      {texts.map((text) => (
        <Text key={text} style={styles.noticeText}>
          {text}
        </Text>
      ))}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    waiting: {
      flex: 1,
    },
    waitingPlaces: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.textMuted,
    },
    notice: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.tile,
      backgroundColor: colors.surface,
      borderWidth: 1, // Rosé auf Leinen hat nur 1,5:1: feiner Rand (Entscheidung 55)
      borderColor: colors.border,
    },
    noticeTitle: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    noticeText: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.textMuted,
    },
    actions: {
      marginTop: spacing.sm,
    },
  });
