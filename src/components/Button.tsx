import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, lineHeight, opacity, radius, spacing } from '@/lib/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  // primary = Hauptaktion, secondary = Nebenaktion, danger = Löschen
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.button, buttonStyles[variant], disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, // Touch-Ziel mindestens 44
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
  label: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  danger: { backgroundColor: colors.background, borderColor: colors.danger },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.text },
  danger: { color: colors.danger },
});
