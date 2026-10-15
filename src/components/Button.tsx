import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { mirrorInRTL } from '@/lib/rtl';
import {
  fonts,
  fontSize,
  iconSize,
  lineHeight,
  opacity,
  radius,
  spacing,
  type Theme,
} from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  label: string;
  onPress: () => void;
  // primary = Hauptaktion, secondary = Nebenaktion, danger = Löschen
  variant?: 'primary' | 'secondary' | 'danger';
  // large = besonders auffällig, z. B. „Was machen wir?“ auf dem Start
  size?: 'regular' | 'large';
  disabled?: boolean;
  // Linien-Symbol hinter dem Text (Ionicons, nur „…-outline“), z. B. ein Pfeil. Dekoration: Die Sprachausgabe liest nur den Text.
  icon?: IconName;
  // true bei Symbolen mit Richtung (Pfeil „weiter“): spiegelt sie bei rechts-nach-links.
  iconFlipsInRTL?: boolean;
  // Wird nur vorgelesen, z. B. warum der Knopf gerade nicht geht.
  accessibilityHint?: string;
  // Freiwillig: ausführlicher als der sichtbare Text, z. B. „Route öffnen zu Saline Bad und Sauna“. Ohne liest die Sprachausgabe `label`.
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  icon,
  iconFlipsInRTL = false,
  accessibilityHint,
  accessibilityLabel,
}: ButtonProps) {
  const { styles, buttonStyles, labelStyles, iconColors, glow } = useThemedStyles(createStyles);
  // Der große Hauptknopf trägt den warmen Schein aus dem PDF. Ein gesperrter Knopf nicht.
  const hasGlow = variant === 'primary' && size === 'large' && !disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        size === 'large' && styles.buttonLarge,
        buttonStyles[variant],
        hasGlow && glow,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.label, size === 'large' && styles.labelLarge, labelStyles[variant]]}>
        {label}
      </Text>
      {icon ? (
        <Ionicons
          name={icon}
          size={iconSize.md}
          color={iconColors[variant]}
          style={iconFlipsInRTL ? mirrorInRTL : undefined}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
    </Pressable>
  );
}

const createStyles = ({ colors, shadow }: Theme) => ({
  glow: shadow.primaryButton,
  styles: StyleSheet.create({
    button: {
      minHeight: 48, // Touch-Ziel mindestens 44
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full, // Pille (Design Sonntagslicht, Farben Palette C)
      borderWidth: 1,
    },
    buttonLarge: {
      minHeight: 64,
      paddingVertical: spacing.md,
    },
    buttonDisabled: {
      opacity: opacity.disabled,
    },
    label: {
      // Bei großer Systemschrift darf der Text umbrechen, nie abgeschnitten werden.
      flexShrink: 1,
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      textAlign: 'center',
    },
    labelLarge: {
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
    },
  }),
  buttonStyles: StyleSheet.create({
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border },
    danger: { backgroundColor: colors.background, borderColor: colors.danger },
  }),
  labelStyles: StyleSheet.create({
    primary: { color: colors.onPrimary },
    secondary: { color: colors.text },
    danger: { color: colors.danger },
  }),
  iconColors: {
    primary: colors.onPrimary,
    secondary: colors.text,
    danger: colors.danger,
  },
});
