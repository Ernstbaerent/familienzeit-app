import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { fonts, fontSize, lineHeight, size, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// Die Seite mit Quellen und Lizenz von OpenStreetMap (Attribution Guidelines der OpenStreetMap Foundation, docs/supabase.md).
export const osmCopyrightUrl = 'https://www.openstreetmap.org/copyright';

type PlacesSourceLineProps = {
  staleDays?: number | null; // ältere Kacheln ohne Netz: „Stand: vor n Tagen“
};

// Quellenangabe der Orte (ODbL): „Orte: © OpenStreetMap-Mitwirkende“ und „Daten unter der Open Database License (ODbL)“,
// sichtbar ohne Zutun, wo Orte zu sehen sind (unter den Karten, in der Detailansicht eines Ortes). Ein Tipp öffnet
// openstreetmap.org/copyright im Browser (erst dann geht die IP-Adresse an openstreetmap.org).
export function PlacesSourceLine({ staleDays }: PlacesSourceLineProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={() => void Linking.openURL(osmCopyrightUrl).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityHint={t('places.sourceHint')}
      style={styles.line}
    >
      <Text style={styles.source}>{t('places.source')}</Text>
      <Text style={styles.meta}>{t('places.license')}</Text>
      {staleDays != null && <Text style={styles.meta}>{t('places.stale', { count: staleDays })}</Text>}
    </Pressable>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    line: {
      minHeight: size.touch, // Tippfläche mindestens 44
      justifyContent: 'center',
    },
    source: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.text,
      textDecorationLine: 'underline',
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: fontSize.xs,
      lineHeight: lineHeight.xs,
      color: colors.textMuted,
    },
  });
