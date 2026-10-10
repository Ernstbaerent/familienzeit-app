import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { Activity } from '@/features/activities/activities';
import { getActivityText } from '@/features/activities/activityDisplay';
import { CategoryIcon } from '@/features/activities/CategoryIcon';
import { formatDuration } from '@/features/activities/formatDuration';
import { colors, fontSize, lineHeight, radius, spacing } from '@/lib/theme';

// Ein Vorschlag als Karte: Kategorie-Symbol, Titel, Dauer, Kurzbeschreibung.
// Antippen öffnet noch nichts, die Detailansicht kommt mit M7.
export function SuggestionCard({ activity }: { activity: Activity }) {
  const { t, i18n } = useTranslation();
  const text = getActivityText(activity, i18n.resolvedLanguage ?? i18n.language);

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <CategoryIcon category={activity.category} size="lg" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          {text.title}
        </Text>
        <Text style={styles.duration}>{formatDuration(t, activity)}</Text>
        <Text style={styles.summary}>{text.summary}</Text>
      </View>
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  iconCircle: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.text,
  },
  duration: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  summary: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.text,
  },
});
