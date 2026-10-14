import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { CardMedia } from '@/features/suggestions/CardMedia';
import { fonts, fontSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { distanceText, placeAddress, placeTitle } from './placeDisplay';
import { PlaceHours } from './PlaceHours';
import { placeKinds } from './placeKinds';
import type { PlaceRow } from './placeRow';
import { PlacesSourceLine } from './PlacesSourceLine';
import { PlaceWebsiteLink } from './PlaceWebsiteLink';
import { websiteLink } from './website';

type PlaceDetailsProps = {
  place: PlaceRow;
  km: number; // Luftlinie vom gerundeten Standort
  now: Date; // beim Öffnen eingefroren, bestimmt „heute“ bei den Öffnungszeiten
};

// Inhalt der Ortsseite (M10b, erweitert in M10c): Bildbereich wie auf der Karte (ohne Pille), Unterart, Titel, Adresse,
// Entfernung, Ortsteil, Öffnungszeiten (mit Saison und Hinweisen), Website und die Quellenangabe.
// Keine Fahrzeit: Die Karten-App hinter „Route öffnen“ weiß es besser (der Knopf liegt fest unten, app/place/[id].tsx).
export function PlaceDetails({ place, km, now }: PlaceDetailsProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const address = placeAddress(t, place);
  const website = websiteLink(place.website);

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
        {address && <Text style={styles.address}>{address}</Text>}
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

      <PlaceHours place={place} now={now} />

      {website && <PlaceWebsiteLink link={website} />}

      <Text style={styles.small}>{t('places.detail.distanceNote')}</Text>
      <PlacesSourceLine />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links). Werte wie ActivityDetails.
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
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
    address: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.textMuted,
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
    small: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
  });
