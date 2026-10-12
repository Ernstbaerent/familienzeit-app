import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import {
  fonts,
  fontSize,
  iconSize,
  lineHeight,
  opacity,
  radius,
  size,
  spacing,
  type Theme,
} from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  // 'checkbox' = mehrere wählbar (Interessen), 'radio' = genau eine (Jahr, Monat)
  role?: 'checkbox' | 'radio';
  disabled?: boolean;
  // Linien-Symbol vor dem Text (Ionicons, nur „…-outline“). Es ist Dekoration: Die Sprachausgabe liest nur den Text.
  icon?: IconName;
  // true: Symbol über dem Text, als Kachel (Radius `tile`) statt als Pille. Für schmale, gleich breite Reihen,
  // in die ein Symbol neben dem Text nicht passt (z. B. Energie auf dem Start, auch auf Englisch und bei großer Schrift).
  stacked?: boolean;
  // Wird nur vorgelesen, z. B. „Nochmal tippen hebt die Auswahl auf.“
  accessibilityHint?: string;
  // Für Raster mit gleich breiten Chips (z. B. Zeit auf dem Start).
  style?: StyleProp<ViewStyle>;
};

// Auswählbare Kachel in Pillenform. Nicht gewählt = weiß mit feinem Rand, gewählt = Tinte (Entscheidung 11:
// Terrakotta ist nur dem Hauptknopf vorbehalten).
export function Chip({
  label,
  selected,
  onPress,
  role = 'checkbox',
  disabled = false,
  icon,
  stacked = false,
  accessibilityHint,
  style,
}: ChipProps) {
  const { styles, colors } = useThemedStyles(createStyles);
  const textColor = selected ? colors.onSelected : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityHint={accessibilityHint}
      style={[
        styles.chip,
        stacked && styles.chipStacked,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize.md}
          color={textColor}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
      <Text style={[styles.label, stacked && styles.labelStacked, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    chip: {
      minHeight: size.touch,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    // Schmal und gleich breit: weniger Rand und kleinere Schrift, damit auch das längste Wort („Energetic“) ganz hineinpasst.
    chipStacked: {
      flexDirection: 'column',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.tile,
    },
    chipSelected: {
      borderColor: colors.selected,
      backgroundColor: colors.selected,
    },
    chipDisabled: {
      opacity: opacity.disabled,
    },
    label: {
      // Bei großer Systemschrift darf der Text umbrechen, nie abgeschnitten werden.
      flexShrink: 1,
      textAlign: 'center',
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    labelStacked: {
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
    },
    labelSelected: {
      color: colors.onSelected,
    },
  }),
});
