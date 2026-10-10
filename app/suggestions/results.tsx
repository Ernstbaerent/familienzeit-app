import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { loadActivities } from '@/features/activities/loadActivities';
import type { ChildProfile } from '@/features/profiles/profiles';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { longestMinutes } from '@/features/suggestions/conditions';
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
import { colors, fontSize, lineHeight, radius, spacing } from '@/lib/theme';

// Die Vorschläge: genau 3 Karten, „Andere Vorschläge“ zeigt die nächsten 3.
export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const { status, profiles } = useProfiles();
  if (status === 'loading') return null;

  // Unvollständige Auswahl oder kein ausgewähltes Kind mehr da: zurück zur Auswahl.
  const selection = parseSelectionParams(params);
  const hasChild = profiles.some((child) => selection?.childIds.includes(child.id));
  if (!selection || !hasChild) return <Redirect href="/suggestions" />;

  return <Results selection={selection} profiles={profiles} />;
}

function Results({ selection, profiles }: { selection: Selection; profiles: ChildProfile[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  // „Jetzt“ einmal festhalten (für das Alter der Kinder).
  const [now] = useState(() => new Date());
  // Wie oft „Andere Vorschläge“ gedrückt wurde.
  const [pageIndex, setPageIndex] = useState(0);

  const activities = loadActivities();
  const request = toSuggestionRequest(selection, profiles, now);
  const suggestions = suggest(activities, request);
  const page = getPage(suggestions, pageIndex);
  const tooFew = suggestions.matchCount < suggestionsPerPage;

  function showOthers() {
    setPageIndex((current) => current + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function changeSelection() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/suggestions');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t('suggest.resultsTitle') }} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {isStartingOver(suggestions, pageIndex) && (
          <Text style={styles.hint} accessibilityLiveRegion="polite">
            {t('suggest.startingOver')}
          </Text>
        )}

        {page.map((activity) => (
          <SuggestionCard key={activity.id} activity={activity} />
        ))}

        {tooFew && (
          <FewMatchesNotice
            count={suggestions.matchCount}
            tips={getTips(activities, request, longestMinutes)}
          />
        )}

        <View style={styles.actions}>
          {suggestions.pages.length > 1 && (
            <Button label={t('suggest.more')} size="large" onPress={showOthers} />
          )}
          <Button
            label={t('suggest.changeSelection')}
            variant="secondary"
            onPress={changeSelection}
          />
        </View>
      </ScrollView>
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
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  hint: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.textMuted,
  },
  notice: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeTitle: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.text,
  },
  noticeText: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
