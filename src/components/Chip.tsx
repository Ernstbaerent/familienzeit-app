import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, lineHeight, opacity, radius, spacing } from '@/lib/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  // 'checkbox' = mehrere wählbar (Interessen), 'radio' = genau eine (Jahr, Monat)
  role?: 'checkbox' | 'radio';
  disabled?: boolean;
};

// Auswählbare Kachel in Pillenform. Gewählt = Hauptfarbe, sonst Kartenfarbe mit Rahmen.
export function Chip({ label, selected, onPress, role = 'checkbox', disabled = false }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, disabled }}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44, // Touch-Ziel mindestens 44
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipDisabled: {
    opacity: opacity.disabled,
  },
  label: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.text,
  },
  labelSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});
