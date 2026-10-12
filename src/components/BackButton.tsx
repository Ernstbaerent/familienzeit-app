import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { mirrorInRTL } from '@/lib/rtl';
import { iconSize, radius, size, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type BackButtonProps = {
  label: string; // für die Sprachausgabe, z. B. „Zurück zur Auswahl“ (nur der Pfeil ist zu sehen, der Knopf hat keinen sichtbaren Text)
  onPress: () => void;
};

// Der runde Zurück-Knopf im Kopf von „Eure Ideen“ und der Detailansicht (DESIGN.md, Entscheidung 9 und Bildschirm 03).
// Weiß mit feinem Rand, mindestens 44 pt breit und hoch (wächst mit der Systemschrift) und beschriftet.
export function BackButton({ label, onPress }: BackButtonProps) {
  const { styles, colors } = useThemedStyles(createStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.back}>
      {/* Der Pfeil zeigt zurück: bei rechts-nach-links wird er gespiegelt. */}
      <Ionicons name="chevron-back-outline" size={iconSize.md} color={colors.text} style={mirrorInRTL} />
    </Pressable>
  );
}

const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    // Rund (Pille mit gleicher Breite und Höhe).
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
  }),
});
