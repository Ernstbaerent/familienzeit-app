import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ActivityDetails } from '@/features/activities/ActivityDetails';
import type { Activity } from '@/features/activities/activities';
import { loadActivities } from '@/features/activities/loadActivities';
import { FeedbackPanel } from '@/features/history/FeedbackPanel';
import type { Rating } from '@/features/history/history';
import { useHistory } from '@/features/history/HistoryContext';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { colors, fontSize, lineHeight, spacing } from '@/lib/theme';

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Details einer Idee: lesen, „Das machen wir“, nach der Anleitung „Fertig“, dann „Wie war’s?“.
export default function ActivityScreen() {
  const params = useLocalSearchParams();
  const { status: profilesStatus, profiles } = useProfiles();
  const { status: historyStatus } = useHistory();
  if (profilesStatus === 'loading' || historyStatus === 'loading') return null;

  // Unbekannte Idee (z. B. alter Link): zurück zum Start.
  const activity = loadActivities().find((item) => item.id === single(params.id));
  if (!activity) return <Redirect href="/" />;

  // Die Kinder der Auswahl, soweit es sie noch gibt. Sie kommen als Parameter von „Eure Ideen“ mit.
  const childIds = (single(params.children) ?? '')
    .split(',')
    .filter((id) => profiles.some((child) => child.id === id));

  return <ActivityContent activity={activity} childIds={childIds} />;
}

// Wo man im Ablauf steht. `saving` = „Fertig“ wurde getippt und der Eintrag wird gespeichert.
type Phase = 'viewing' | 'started' | 'saving' | 'feedback';

function ActivityContent({ activity, childIds }: { activity: Activity; childIds: string[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { addEntry, setEntryRating } = useHistory();
  const [phase, setPhase] = useState<Phase>('viewing');
  const [entryId, setEntryId] = useState<string | null>(null);
  // Sperre gegen Doppeltippen: Zwei Tipper im selben Augenblick sehen `phase` noch nicht verändert,
  // diese Markierung dagegen sofort. (Zusätzlich legt der Verlauf für dieselbe Aktivität
  // innerhalb weniger Minuten ohnehin nur einen Eintrag an.)
  const busy = useRef(false);

  // „Das machen wir“ speichert noch nichts. Erst „Fertig“ trägt die Idee in den Verlauf ein.
  function start() {
    setPhase('started');
  }

  async function finish() {
    if (busy.current) return;
    busy.current = true;
    setPhase('saving');
    try {
      const entry = await addEntry({ activityId: activity.id, childIds });
      setEntryId(entry.id);
      setPhase('feedback');
    } catch {
      setPhase('started');
      Alert.alert(t('detail.saveError'));
    } finally {
      busy.current = false;
    }
  }

  // Zurück zum Start. Die Bildschirme dazwischen (Ideen, Auswahl) werden geschlossen: Das Handy kann weg.
  function leave() {
    router.dismissTo('/');
  }

  async function rate(rating: Rating) {
    if (busy.current || entryId === null) return;
    busy.current = true;
    try {
      await setEntryRating(entryId, rating);
      leave(); // die Sperre bleibt, bis der Bildschirm geschlossen ist
    } catch {
      busy.current = false;
      Alert.alert(t('feedback.saveError'));
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t('detail.screenTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ActivityDetails activity={activity} />
      </ScrollView>

      {/* Fest am unteren Rand, damit der Hauptknopf immer erreichbar ist, auch mitten in der Anleitung. */}
      <View style={styles.bar}>
        {phase === 'feedback' ? (
          <FeedbackPanel onRate={rate} onSkip={leave} />
        ) : (
          <>
            {phase !== 'viewing' && (
              <Text style={styles.hint} accessibilityLiveRegion="polite">
                {t('detail.started')}
              </Text>
            )}
            <Button
              label={phase === 'viewing' ? t('detail.start') : t('detail.done')}
              size="large"
              onPress={phase === 'viewing' ? start : finish}
              disabled={phase === 'saving'}
            />
          </>
        )}
      </View>
    </SafeAreaView>
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
    paddingBottom: spacing.xl,
  },
  bar: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  hint: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
