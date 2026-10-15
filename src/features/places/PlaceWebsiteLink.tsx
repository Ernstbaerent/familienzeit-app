import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { mirrorInRTL } from '@/lib/rtl';
import { fonts, fontSize, iconSize, lineHeight, opacity, radius, size, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { WebsiteLink } from './website';

// Zeile „Website öffnen“ auf der Ortsseite (M10c): ein Link (mindestens 44 pt hoch), darunter klein die Adresse und „Öffnet im Browser“.
// Erst der Tipp öffnet den Browser; dann geht die IP-Adresse an diese Website (docs/supabase.md).
// Die Adresse ist vorher geprüft (`websiteLink`: nur http und https).
export function PlaceWebsiteLink({ link }: { link: WebsiteLink }) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);

  function open() {
    void Linking.openURL(link.url).catch(() => Alert.alert(t('places.website.error')));
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={t('places.website.label', { host: link.host })}
      accessibilityHint={t('places.website.browser')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name="globe-outline" size={iconSize.md} color={colors.icon} />
      <View style={styles.texts}>
        <Text style={styles.link}>{t('places.website.open')}</Text>
        <Text style={styles.meta}>{`${link.host} · ${t('places.website.browser')}`}</Text>
      </View>
      <Ionicons name="open-outline" size={iconSize.md} color={colors.icon} style={mirrorInRTL} />
    </Pressable>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links). Links sind Petrol mit Unterstreichung (DESIGN.md, Zusatz 31 und Entscheidung 55).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    row: {
      minHeight: size.touch, // Tippfläche mindestens 44
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.tile,
      backgroundColor: colors.card,
    },
    pressed: {
      opacity: opacity.pressed,
    },
    texts: {
      flex: 1,
      gap: spacing.xs,
    },
    link: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
  }),
});
