import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  fonts,
  fontSize,
  iconSize,
  lineHeight,
  radius,
  size,
  spacing,
  type Theme,
} from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// Breiten und Höhen stehen nicht im Theme (CLAUDE.md), nur die Mindestgrößen `size.touch` und `size.checkbox`.
const avatarSize = 40;
const badgeSize = 20;
const tileBorderWidth = 1;

type ChildTileProps = {
  name: string;
  age: string;
  // Anfangsbuchstabe (oder Nummer) im Kreis. Dekoration.
  initial: string;
  selected: boolean;
  // Text für die Sprachausgabe, z. B. „Mila, 4 Jahre“
  label: string;
  // Text für das Stift-Symbol, z. B. „Mila bearbeiten“ oder „Kind, 4 Jahre bearbeiten“
  editLabel: string;
  onToggle: () => void;
  onEdit: () => void;
  // Breite der Kachel (das Raster rechnet sie aus, siehe startLayout.ts)
  width: number;
};

// Kachel eines Kindes auf dem Start. Ein Tipp wählt aus oder ab, das Stift-Symbol bearbeitet das Kind
// (Entscheidung 2). Gewählt = Tinte statt Petrol (Entscheidung 11 und 23).
// Zwei getrennte Tippflächen nebeneinander, nicht ineinander: So erreicht die Sprachausgabe beide.
export function ChildTile({
  name,
  age,
  initial,
  selected,
  label,
  editLabel,
  onToggle,
  onEdit,
  width,
}: ChildTileProps) {
  const { styles, colors } = useThemedStyles(createStyles);
  // Symbole und Buchstaben wachsen mit der Systemschrift (die Skalierung bleibt an). Damit sie nicht aus ihren Kreisen
  // herausragen, wachsen Kreis und Häkchen-Punkt mit.
  const scale = Math.max(1, useWindowDimensions().fontScale);
  return (
    <View style={[styles.tile, { width }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
        style={styles.body}
      >
        <View style={[styles.avatar, { width: avatarSize * scale, height: avatarSize * scale }]}>
          <Text style={styles.initial}>{initial}</Text>
          {selected && (
            <View style={[styles.badge, { width: badgeSize * scale, height: badgeSize * scale }]}>
              <Ionicons name="checkmark" size={iconSize.sm} color={colors.onSelected} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.age}>{age}</Text>
      </Pressable>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={editLabel}
        style={styles.edit}
      >
        <Ionicons name="pencil-outline" size={iconSize.md} color={colors.icon} />
      </Pressable>
      {/* Der Ring zeigt „gewählt“, ohne dass sich die Kachel verschiebt. Für die Sprachausgabe steckt der Zustand im Kästchen. */}
      {selected && <View pointerEvents="none" style={styles.ring} />}
    </View>
  );
}

const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    tile: {
      borderRadius: radius.tile,
      borderWidth: tileBorderWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    body: {
      flexGrow: 1,
      gap: spacing.xs,
      padding: spacing.sm,
    },
    avatar: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      backgroundColor: colors.surface,
    },
    initial: {
      fontFamily: fonts.title,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    // Häkchen unten am Kreis, am Ende der Zeile (spiegelt bei rechts-nach-links).
    badge: {
      position: 'absolute',
      end: -spacing.xs,
      bottom: -spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      backgroundColor: colors.selected,
      borderWidth: 2,
      borderColor: colors.card,
    },
    name: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    age: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
    // Stift oben am Ende der Kachel, mindestens 44 × 44 (DESIGN.md).
    edit: {
      position: 'absolute',
      top: 0,
      end: 0,
      minWidth: size.touch,
      minHeight: size.touch,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Liegt über dem feinen Rand der Kachel (daher der negative Abstand), damit kein doppelter Rand zu sehen ist.
    ring: {
      position: 'absolute',
      top: -tileBorderWidth,
      bottom: -tileBorderWidth,
      start: -tileBorderWidth,
      end: -tileBorderWidth,
      borderRadius: radius.tile,
      borderWidth: 2,
      borderColor: colors.selected,
    },
  }),
});
