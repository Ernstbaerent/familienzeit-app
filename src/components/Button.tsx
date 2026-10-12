import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, fontSize, lineHeight, opacity, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type ButtonProps = {
  label: string;
  onPress: () => void;
  // primary = Hauptaktion, secondary = Nebenaktion, danger = Löschen
  variant?: 'primary' | 'secondary' | 'danger';
  // large = besonders auffällig, z. B. „Was machen wir?“ auf dem Start
  size?: 'regular' | 'large';
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled = false,
}: ButtonProps) {
  const { styles, buttonStyles, labelStyles } = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        size === 'large' && styles.buttonLarge,
        buttonStyles[variant],
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.label, size === 'large' && styles.labelLarge, labelStyles[variant]]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = ({ colors }: Theme) => ({
  styles: StyleSheet.create({
    button: {
      minHeight: 48, // Touch-Ziel mindestens 44
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full, // Pille (Design Sonntagslicht)
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
});
