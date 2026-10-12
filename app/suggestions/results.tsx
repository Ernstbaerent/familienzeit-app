import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import type { Activity } from '@/features/activities/activities';
import { loadActivities } from '@/features/activities/loadActivities';
import type { HistoryEntry } from '@/features/history/history';
import { useHistory } from '@/features/history/HistoryContext';
import type { ChildProfile } from '@/features/profiles/profiles';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { assignCardImages } from '@/features/suggestions/cardImage';
import { getMinutes, longestMinutes, type Weather } from '@/features/suggestions/conditions';
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
  suggest,
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
import { fonts, fontSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// Die Vorschläge (DESIGN.md, Bildschirm 02): genau 3 Karten, „Keine passt? Drei neue Ideen“ zeigt die nächsten 3.
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
  const scrollRef = useRef<ScrollView>(null);
  // „Jetzt“ einmal festhalten (für das Alter der Kinder, die Tageszeit und das Wetter-Fenster).
  const [now] = useState(() => new Date());
  // Der Verlauf beim Öffnen dieses Bildschirms. Er bleibt eingefroren, damit sich die Karten nicht umsortieren,
  // während man zwischen Details und Vorschlägen hin- und herwechselt. Beim nächsten Öffnen gilt der neue Stand.
  const [history] = useState(historyEntries);
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

  // Das Wetter für die gewählte Zeit. Eine Handwahl ersetzt nur die Wetterlage: Amtliche Warnungen bleiben.
  const automatic = data ? buildSituation(data, getMinutes(selection.time), now, { stale }) : null;
  const situation = manualWeather
    ? manualSituation(manualWeather, automatic)
    : (automatic ?? assumedSituation());

  const activities = loadActivities();
  const request = toSuggestionRequest(selection, profiles, now, toConditions(situation), history);
  const suggestions = suggest(activities, request);
  const page = getPage(suggestions, pageIndex);
  const tooFew = suggestions.matchCount < suggestionsPerPage;
  // Bild je Karte: Aktivität, Kategorie-Foto oder Farbfläche. Die Fotos werden für die ganze Gruppe zusammen verteilt,
  // damit möglichst nicht zwei Karten dasselbe zeigen.
  const imageChains = assignCardImages(page);

  function changeWeather(weather: Weather | null) {
    setManualWeather(weather);
    setPanel('closed');
    setPageIndex(0); // andere Wetterlage, andere Reihenfolge: wieder bei den ersten 3
  }

  function showOthers() {
    setPageIndex((current) => current + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
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
  if (status === 'loading' && data === null && manualWeather === null) {
    return (
      <Frame header={header} weather={<WeatherBar state="loading" />}>
        <View style={styles.waiting} />
      </Frame>
    );
  }

  return (
    <Frame
      header={header}
      weather={
        <WeatherBar
          state="ready"
          situation={situation}
          changeOpen={panel === 'change'}
          onToggleChange={() => setPanel((current) => (current === 'change' ? 'closed' : 'change'))}
        />
      }
    >
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

        {page.map((activity, index) => (
          <SuggestionCard
            key={activity.id}
            activity={activity}
            imageChain={imageChains[index]}
            onPress={() => openDetails(activity)}
          />
        ))}

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
