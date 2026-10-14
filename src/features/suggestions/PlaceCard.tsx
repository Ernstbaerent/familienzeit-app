import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { placeKinds } from '@/features/places/placeKinds';
import { placeMetaLine, placeNotes, placeTitle, distanceText } from '@/features/places/placeDisplay';
import { fonts, fontSize, iconSize, lineHeight, opacity, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { CardMedia } from './CardMedia';
import type { PlaceSuggestion } from './mix';

type PlaceCardProps = {
  suggestion: PlaceSuggestion;
  onPress: () => void;
};

// Ein Ort als Karte (M10b), im selben Aussehen wie die Aktivitätskarte (SuggestionCard): Bildbereich mit Farbfläche, großem Symbol
// und Pille (die Unterart, z. B. „Hallenbad“), darunter Titel, „ca. 4 km · Pohlitz“ und, wenn nötig, Hinweise
// („Öffnungszeiten vorher prüfen“, bei Kinos „Programm und Altersfreigabe vorher prüfen“). Antippen öffnet die Detailansicht.
export function PlaceCard({ suggestion, onPress }: PlaceCardProps) {
  const { t } = useTranslation();
  const { styles, colors, cardShadow } = useThemedStyles(createStyles);
  const { place, km } = suggestion;
  const title = placeTitle(t, place);
  const subtype = t(`places.subtypes.${place.subtype}`);
  const notes = placeNotes(t, place);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('places.card.label', { title, subtype, distance: distanceText(t, km), notes: notes.join('. ') })}
      accessibilityHint={t('suggest.openDetails')}
      style={({ pressed }) => [styles.card, cardShadow, pressed && styles.cardPressed]}
    >
      <View style={styles.clip}>
        <CardMedia category={placeKinds[place.subtype].visual} pillLabel={subtype} chain={[{ kind: 'placeholder' }]} />
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.fact}>
            <Ionicons name="location-outline" size={iconSize.sm} color={colors.icon} />
            <Text style={styles.factLabel}>{placeMetaLine(t, place, km)}</Text>
          </View>
          {notes.map((note) => (
            <View key={note} style={styles.fact}>
              <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.icon} />
              <Text style={styles.note}>{note}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links). Werte wie bei SuggestionCard.
const createStyles = ({ colors, shadow }: Theme) => ({
  colors,
  cardShadow: shadow.card,
  styles: StyleSheet.create({
    card: {
      borderRadius: radius.card,
      backgroundColor: colors.card,
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
    fact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    factLabel: {
      flexShrink: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.text,
    },
    note: {
      flexShrink: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
  }),
});
