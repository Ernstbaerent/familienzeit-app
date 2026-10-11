import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/Section';
import { colors, fontSize, iconSize, lineHeight, radius, spacing } from '@/lib/theme';

import type { Activity } from './activities';
import { getActivityText } from './activityDisplay';
import { CategoryIcon } from './CategoryIcon';
import { formatDuration } from './formatDuration';
import { getAllergens, needsAdults } from './safetyCheck';

type IconName = ComponentProps<typeof Ionicons>['name'];

const costTextKeys = { 0: 'free', 1: 'low', 2: 'high' } as const;

// Die ganze Idee zum Lesen: Eckdaten, Allergene, Sicherheit, Material und nummerierte Anleitung.
// Nur Darstellung. Der Ablauf „Das machen wir“ → „Fertig“ steht im Bildschirm (app/activity/[id].tsx).
// Gut lesbar: große Schrift für die Schritte (`fontSize.reading`), viel Platz dazwischen.
export function ActivityDetails({ activity }: { activity: Activity }) {
  const { t, i18n } = useTranslation();
  const text = getActivityText(activity, i18n.resolvedLanguage ?? i18n.language);
  const allergens = getAllergens(activity);
  const withAdults = needsAdults(activity);
  const age =
    activity.ageMin === activity.ageMax
      ? t('detail.ageSingle', { count: activity.ageMin })
      : t('detail.age', { min: activity.ageMin, max: activity.ageMax });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <CategoryIcon category={activity.category} size="lg" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.category}>{t(`categories.${activity.category}`)}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {text.title}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>{text.summary}</Text>

      <View style={styles.facts}>
        <Fact icon="time-outline" text={t('detail.duration', { value: formatDuration(t, activity) })} />
        <Fact icon="people-outline" text={age} />
        <Fact icon="flash-outline" text={t(`detail.energy.${activity.energy}`)} />
        <Fact icon="cash-outline" text={t(`detail.cost.${costTextKeys[activity.cost]}`)} />
      </View>

      {allergens.length > 0 && (
        <InfoBox icon="warning-outline" title={t('detail.allergensTitle')}>
          <Text style={styles.boxText}>
            {t('detail.allergensText', {
              list: allergens.map((allergen) => t(`allergens.${allergen}`)).join(', '),
            })}
          </Text>
        </InfoBox>
      )}

      {(withAdults || text.safetyNote) && (
        <InfoBox icon="shield-checkmark-outline" title={t('detail.safetyTitle')}>
          {withAdults && (
            <View style={styles.badge}>
              <Ionicons
                name="people-outline"
                size={iconSize.md}
                color={colors.warning}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.badgeText}>{t('detail.withAdults')}</Text>
            </View>
          )}
          {text.safetyNote ? <Text style={styles.boxText}>{text.safetyNote}</Text> : null}
        </InfoBox>
      )}

      <Section title={t('detail.materialsTitle')}>
        {activity.materials.length === 0 ? (
          <Text style={styles.listText}>{t('detail.noMaterials')}</Text>
        ) : (
          <View style={styles.list}>
            {activity.materials.map((material) => (
              <View key={material} style={styles.listRow}>
                <Text style={styles.bullet} accessibilityElementsHidden importantForAccessibility="no">
                  •
                </Text>
                <Text style={styles.listText}>{t(`materials.${material}`)}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title={t('detail.stepsTitle')}>
        <View style={styles.steps}>
          {text.steps.map((step, index) => (
            <View
              key={index}
              style={styles.step}
              accessible
              accessibilityLabel={`${t('detail.stepNumber', { number: index + 1 })}. ${step}`}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons
        name={icon}
        size={iconSize.md}
        color={colors.icon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

// Hervorgehobene Box für Allergene und Sicherheit: warme Fläche, Rahmen und Überschrift in der Warnfarbe.
function InfoBox({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.box}>
      <View style={styles.boxHeader}>
        <Ionicons
          name={icon}
          size={iconSize.md}
          color={colors.warning}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.boxTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    padding: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  category: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  title: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: '700',
    color: colors.text,
  },
  summary: {
    fontSize: fontSize.reading,
    lineHeight: lineHeight.reading,
    color: colors.text,
  },
  facts: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  factText: {
    flex: 1,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    color: colors.text,
  },
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningSurface,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  boxTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.warning,
  },
  boxText: {
    fontSize: fontSize.reading,
    lineHeight: lineHeight.reading,
    color: colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.background,
  },
  badgeText: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '700',
    color: colors.warning,
  },
  list: {
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    color: colors.textMuted,
  },
  listText: {
    flex: 1,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    color: colors.text,
  },
  steps: {
    gap: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  stepNumberText: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  stepText: {
    flex: 1,
    paddingTop: spacing.xs, // erste Zeile auf Höhe der Nummer (Kreis 40, Zeile 32)
    fontSize: fontSize.reading,
    lineHeight: lineHeight.reading,
    color: colors.text,
  },
});
