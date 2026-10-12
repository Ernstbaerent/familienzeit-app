import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mirrorInRTL } from '@/lib/rtl';
import { fonts, fontSize, iconSize, lineHeight, radius, size, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type ResultsHeaderProps = {
  title: string;
  onBack: () => void;
};

// Der Kopf von „Eure Ideen“ (DESIGN.md, Bildschirm 02 und Entscheidung 9): runder Zurück-Knopf, Titel in der Mitte, kein Mischen-Symbol.
// Der Knopf ist mindestens 44 pt groß und für die Sprachausgabe beschriftet („Zurück zur Auswahl“).
export function ResultsHeader({ title, onBack }: ResultsHeaderProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('suggest.back')}
        style={styles.back}
      >
        {/* Der Pfeil zeigt zurück: bei rechts-nach-links wird er gespiegelt. */}
        <Ionicons name="chevron-back-outline" size={iconSize.md} color={colors.text} style={mirrorInRTL} />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {/* Gleich breit wie der Knopf, damit der Titel in der Mitte bleibt. */}
      <View style={styles.balance} />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    // Rund (Pille mit gleicher Breite und Höhe), weiß mit feinem Rand. Wächst mit der Systemschrift, nie unter 44.
    back: {
      minWidth: size.touch,
      minHeight: size.touch,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.title,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    balance: {
      minWidth: size.touch,
    },
  }),
});
