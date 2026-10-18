import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { getCardImageChain } from '@/features/suggestions/cardImage';
import { CardMedia } from '@/features/suggestions/CardMedia';
import { fonts, fontSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { Activity } from './activities';
import { getActivityText } from './activityDisplay';
import { AllergenNotice, SafetyNotice } from './ActivityNotices';
import { FactTiles } from './FactTiles';
import { MaterialChecklist } from './MaterialChecklist';
import { getAllergens, needsAdults } from './safetyCheck';
import { getStepImageUris } from './stepImages';
import { StepList } from './StepList';

// Die ganze Idee zum Lesen (DESIGN.md, Bildschirm 03), von oben nach unten:
// Bildbereich (wie auf den Karten, ohne Pille), Kategorie, Titel, Kurzbeschreibung, Eckdaten, Allergen-Box, Sicherheitsbox,
// „Das braucht ihr“ zum Abhaken und „So geht’s“ mit den nummerierten Schritten.
// Nur Darstellung. Kopf, fester Hauptknopf und der Ablauf „Das machen wir“ → „Fertig“ stehen im Bildschirm (app/activity/[id].tsx).
export function ActivityDetails({ activity }: { activity: Activity }) {
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const text = getActivityText(activity, i18n.resolvedLanguage ?? i18n.language);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        {/* Derselbe Bildbereich wie auf der Karte: `image` der Aktivität (aus Supabase), sonst die Farbfläche mit großem Symbol. */}
        <View style={styles.media}>
          <CardMedia category={activity.category} chain={getCardImageChain(activity)} showPill={false} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.category}>{t(`categories.${activity.category}`)}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {text.title}
          </Text>
          <Text style={styles.summary}>{text.summary}</Text>
        </View>
      </View>

      <FactTiles activity={activity} />

      {/* Beide Boxen stehen vor Material und Anleitung: Sicherheit zuerst. */}
      <AllergenNotice allergens={getAllergens(activity)} />
      <SafetyNotice withAdults={needsAdults(activity)} note={text.safetyNote} />

      <MaterialChecklist materials={activity.materials} />
      <StepList steps={text.steps} stepImages={getStepImageUris(activity, text.steps.length)} />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: {
      gap: spacing.lg,
    },
    hero: {
      gap: spacing.lg,
    },
    // Dieselbe Rundung wie die Karten.
    media: {
      overflow: 'hidden',
      borderRadius: radius.card,
    },
    titleBlock: {
      gap: spacing.sm,
    },
    category: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.display,
      lineHeight: lineHeight.display,
      color: colors.text,
    },
    summary: {
      fontFamily: fonts.body,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.textMuted,
    },
  });
