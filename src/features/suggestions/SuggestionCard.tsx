import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Activity } from '@/features/activities/activities';
import { getActivityText } from '@/features/activities/activityDisplay';
import { formatAgeRange } from '@/features/activities/formatAgeRange';
import { formatDuration } from '@/features/activities/formatDuration';
import {
  fonts,
  fontSize,
  iconSize,
  lineHeight,
  opacity,
  radius,
  spacing,
  type Theme,
} from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { CardImageChain } from './cardImage';
import { CardMedia } from './CardMedia';

type SuggestionCardProps = {
  activity: Activity;
  imageChain: CardImageChain; // Bild-Stufen dieser Karte (getCardImageChain)
  onPress: () => void;
};

// Ein Vorschlag als Karte (DESIGN.md, Bildschirm 02): Bildbereich mit Kategorie-Pille (Bild oder Farbfläche mit Symbol),
// Titel, Kurzbeschreibung, Dauer und Altersspanne. Antippen öffnet die Details (app/activity/[id].tsx).
export function SuggestionCard({ activity, imageChain, onPress }: SuggestionCardProps) {
  const { t, i18n } = useTranslation();
  const { styles, colors, cardShadow } = useThemedStyles(createStyles);
  const text = getActivityText(activity, i18n.resolvedLanguage ?? i18n.language);
  const duration = formatDuration(t, activity);
  const age = formatAgeRange(t, activity);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Eine Beschriftung für die ganze Karte, mit dem Titel zuerst. Der Bildbereich ist für die Sprachausgabe Dekoration.
      accessibilityLabel={t('suggest.card.label', {
        title: text.title,
        category: t(`categories.${activity.category}`),
        duration,
        age,
        summary: text.summary,
      })}
      accessibilityHint={t('suggest.openDetails')}
      // Der Schatten liegt außen, das Zuschneiden der Ecken innen: Mit `overflow: hidden` am selben Element ginge der Schatten verloren.
      style={({ pressed }) => [styles.card, cardShadow, pressed && styles.cardPressed]}
    >
      <View style={styles.clip}>
        <CardMedia category={activity.category} chain={imageChain} />
        <View style={styles.body}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.summary}>{text.summary}</Text>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Ionicons name="time-outline" size={iconSize.sm} color={colors.icon} />
              <Text style={styles.factLabel}>{duration}</Text>
            </View>
            <View style={styles.fact}>
              <Ionicons name="person-outline" size={iconSize.sm} color={colors.icon} />
              <Text style={styles.factLabel}>{age}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors, shadow }: Theme) => ({
  colors,
  cardShadow: shadow.card,
  styles: StyleSheet.create({
    card: {
      borderRadius: radius.card,
      backgroundColor: colors.card, // Karten sind weiß (Entscheidung 11)
    },
    cardPressed: {
      opacity: opacity.pressed,
    },
    clip: {
      overflow: 'hidden',
      borderRadius: radius.card,
    },
    body: {
      gap: spacing.sm,
      padding: spacing.md,
    },
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.xl,
      lineHeight: lineHeight.xl,
      color: colors.text,
    },
    summary: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.textMuted,
    },
    facts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: spacing.md,
      rowGap: spacing.xs,
      marginTop: spacing.xs,
    },
    fact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    factLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.text,
    },
  }),
});
