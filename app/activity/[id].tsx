import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ActivityDetails } from '@/features/activities/ActivityDetails';
import type { Activity } from '@/features/activities/activities';
import { loadActivities } from '@/features/activities/loadActivities';
import { FeedbackPanel } from '@/features/history/FeedbackPanel';
import type { Rating } from '@/features/history/history';
import { useHistory } from '@/features/history/HistoryContext';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { fonts, fontSize, lineHeight, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Details einer Idee (DESIGN.md, Bildschirm 03): lesen, „Das machen wir“, nach der Anleitung „Fertig“, dann „Wie war’s?“.
// Aufbau: runder Zurück-Knopf, scrollender Inhalt (`ActivityDetails`), darunter der feste untere Bereich mit dem Hauptknopf.
// Der feste Bereich ist ein Nachbar des Scrollbereichs, nicht darüber gelegt: Der Scrollbereich endet über ihm und wird nie verdeckt,
// auch nicht bei großer Schrift oder mit Sicherheitsbereich am unteren Rand (SafeAreaView). „Wie war’s?“ erscheint im selben festen Bereich,
// also nach „Fertig“ ohne Scrollen.
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
  const styles = useThemedStyles(createStyles);
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

  // Zurück zu den Ideen: eine Stufe zurück im Verlauf. Dasselbe tut die Zurück-Taste von Android (der Bildschirm fängt sie nicht ab).
  // Ohne Verlauf (z. B. direkt geöffnet) bleibt nur der Start.
  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Der Kopf ist eigener Inhalt (runder Zurück-Knopf), keine Navigationsleiste. Der Titel dient nur dem System. */}
      <Stack.Screen options={{ title: t('detail.screenTitle'), headerShown: false }} />
      <View style={styles.header}>
        <BackButton label={t('detail.back')} onPress={goBack} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ActivityDetails activity={activity} />
      </ScrollView>

      {/* Fest am unteren Rand (Entscheidung 14), damit der Hauptknopf immer erreichbar ist, auch mitten in der Anleitung. */}
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
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      alignItems: 'flex-start', // der Knopf am Anfang (bei rechts-nach-links am anderen Rand)
    },
    // Unten genug Luft, damit der letzte Schritt nicht am festen Bereich klebt.
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
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
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      textAlign: 'center',
      color: colors.textMuted,
    },
  });
