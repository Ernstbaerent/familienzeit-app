import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { iconSize, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// Stimmungsbild auf dem Start, solange es kein geprüftes Foto gibt (DESIGN.md, Entscheidung 6):
// sandfarbene Fläche mit großem, dünnem, angeschnittenem Sonnen-Symbol.
// Reine Dekoration, deshalb für die Sprachausgabe versteckt (sie liest hier nichts vor).
// Kommt ein Foto (Regeln: DESIGN.md, „Regeln für Fotos“), ersetzt es diese Fläche in gleicher Form.
export function MoodPlaceholder() {
  const { styles, colors } = useThemedStyles(createStyles);
  // Das Symbol ist ein Schrift-Zeichen und würde mit der Systemschrift mitwachsen. Als Dekoration soll es gleich groß bleiben,
  // ohne dass die Skalierung gesperrt wird: Die Größe wird durch den Faktor geteilt, den die Schrift dann wieder draufschlägt.
  const scale = Math.max(1, useWindowDimensions().fontScale);
  return (
    <View
      style={styles.band}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name="sunny-outline" size={iconSize.hero / scale} color={colors.border} style={styles.sun} />
    </View>
  );
}

const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    band: {
      aspectRatio: 3, // niedrig und breit, damit darunter noch viel vom Start zu sehen ist
      overflow: 'hidden', // schneidet die Sonne an
      borderRadius: radius.card,
      backgroundColor: colors.surface,
    },
    // Die Sonne geht am unteren Rand auf: Ein Drittel ragt über die Fläche hinaus und ist abgeschnitten.
    sun: {
      position: 'absolute',
      end: spacing.xl,
      bottom: -(iconSize.hero / 3),
    },
  }),
});
