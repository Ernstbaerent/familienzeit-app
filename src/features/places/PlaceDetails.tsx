import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { CardMedia } from '@/features/suggestions/CardMedia';
import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { distanceText, placeNotes, placeTitle } from './placeDisplay';
import { placeKinds } from './placeKinds';
import type { PlaceRow } from './placeRow';
import { PlacesSourceLine } from './PlacesSourceLine';

type PlaceDetailsProps = {
  place: PlaceRow;
  km: number; // Luftlinie vom gerundeten Standort
};

// Einfache Detailansicht eines Ortes (M10b): Bildbereich wie auf der Karte (ohne Pille), Unterart, Titel, Entfernung, Ortsteil,
// Hinweise (Öffnungszeiten, Kino) und die Quellenangabe. „Route öffnen“, Website und Öffnungszeiten im Wortlaut kommen mit M10c.
export function PlaceDetails({ place, km }: PlaceDetailsProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  const notes = placeNotes(t, place);

  return (
    <View style={styles.root}>
      <View style={styles.media}>
        <CardMedia category={placeKinds[place.subtype].visual} chain={[{ kind: 'placeholder' }]} showPill={false} />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.category}>{t(`places.subtypes.${place.subtype}`)}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {placeTitle(t, place)}
        </Text>
      </View>

      <View style={styles.facts}>
        <View style={styles.fact} accessible>
          <Text style={styles.factLabel}>{t('places.detail.facts.distance')}</Text>
          <Text style={styles.factValue}>{t('places.detail.distanceValue', { distance: distanceText(t, km) })}</Text>
        </View>
        {place.locality && (
          <View style={styles.fact} accessible>
            <Text style={styles.factLabel}>{t('places.detail.facts.locality')}</Text>
            <Text style={styles.factValue}>{place.locality}</Text>
          </View>
        )}
      </View>

      {notes.length > 0 && (
        <View style={styles.notice}>
          {notes.map((note) => (
            <View key={note} style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={iconSize.md} color={colors.icon} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.small}>{t('places.detail.distanceNote')}</Text>
      <PlacesSourceLine />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links). Werte wie ActivityDetails.
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    root: {
      gap: spacing.lg,
    },
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
    facts: {
      gap: spacing.sm,
    },
    fact: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.tile,
      backgroundColor: colors.card,
    },
    factLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
    factValue: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    notice: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.tile,
      backgroundColor: colors.surface,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    noteText: {
      flexShrink: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    small: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
  }),
});
