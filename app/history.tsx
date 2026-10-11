import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { getActivityText } from '@/features/activities/activityDisplay';
import { loadActivities } from '@/features/activities/loadActivities';
import { formatHistoryDate } from '@/features/history/formatDate';
import { sortNewestFirst, type HistoryEntry, type Rating } from '@/features/history/history';
import { useHistory } from '@/features/history/HistoryContext';
import { RatingButton } from '@/features/history/RatingButton';
import { colors, fontSize, lineHeight, radius, spacing } from '@/lib/theme';

// „Was wir zusammen gemacht haben“: alle Einträge, neueste zuerst. Bewertung ändern oder entfernen,
// einzelne Einträge und den ganzen Verlauf löschen. Alles bleibt auf dem Gerät.
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const { status, entries, setEntryRating, deleteEntry, clearHistory } = useHistory();
  if (status === 'loading') return null;

  const language = i18n.resolvedLanguage ?? i18n.language;
  const activities = loadActivities();

  function titleOf(entry: HistoryEntry): string {
    const activity = activities.find((item) => item.id === entry.activityId);
    // Die Idee kann inzwischen aus dem Bestand verschwunden sein (ab M8 kommt er aus der Datenbank).
    return activity ? getActivityText(activity, language).title : t('history.unknownActivity');
  }

  // Tippen auf den gewählten Daumen entfernt die Bewertung, auf den anderen ändert sie.
  async function changeRating(entry: HistoryEntry, rating: Rating) {
    try {
      await setEntryRating(entry.id, entry.rating === rating ? undefined : rating);
    } catch {
      Alert.alert(t('history.ratingError'));
    }
  }

  function confirmDelete(entry: HistoryEntry) {
    Alert.alert(t('history.deleteTitle'), t('history.deleteMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id);
          } catch {
            Alert.alert(t('history.deleteError'));
          }
        },
      },
    ]);
  }

  function confirmClear() {
    Alert.alert(t('history.clearTitle'), t('history.clearMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.clearConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await clearHistory();
          } catch {
            Alert.alert(t('history.deleteError'));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t('history.title') }} />
      <FlatList
        data={sortNewestFirst(entries)}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.heading} accessibilityRole="header">
              {t('history.heading')}
            </Text>
            <Text style={styles.hint}>{t('history.privacy')}</Text>
            {entries.length > 0 && (
              <>
                <Text style={styles.hint}>{t('history.explain')}</Text>
                <Text style={styles.hint}>{t('history.ratingHint')}</Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{t('history.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{titleOf(item)}</Text>
              <Text style={styles.cardDate}>{formatHistoryDate(item.doneAt, language)}</Text>
            </View>
            <View style={styles.cardActions}>
              <View style={styles.ratings}>
                <RatingButton
                  rating="up"
                  label={t('history.rateUp')}
                  selected={item.rating === 'up'}
                  onPress={() => changeRating(item, 'up')}
                />
                <RatingButton
                  rating="down"
                  label={t('history.rateDown')}
                  selected={item.rating === 'down'}
                  onPress={() => changeRating(item, 'down')}
                />
              </View>
              <Button
                label={t('history.delete')}
                variant="danger"
                onPress={() => confirmDelete(item)}
              />
            </View>
          </View>
        )}
        ListFooterComponent={
          entries.length > 0 ? (
            <View style={styles.footer}>
              <Button label={t('history.clearAll')} variant="danger" onPress={confirmClear} />
            </View>
          ) : null
        }
      />
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  intro: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.textMuted,
  },
  empty: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    color: colors.text,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardText: {
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.text,
  },
  cardDate: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ratings: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
