import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, lineHeight, opacity, radius, spacing } from '@/lib/theme';

import type { Rating } from './history';
import { RatingIcon } from './RatingIcon';

type RatingButtonProps = {
  rating: Rating;
  label: string; // wird auch vom Bildschirmleser vorgelesen
  onPress: () => void;
  // regular = nur das Symbol (Verlauf), large = Symbol mit Text darunter (Frage „Wie war’s?“)
  size?: 'regular' | 'large';
  selected?: boolean; // gewählte Bewertung, nochmal tippen entfernt sie (nur im Verlauf)
  disabled?: boolean;
};

// Daumen-Knopf. Gewählt = Hauptfarbe, sonst Kartenfarbe mit Rahmen (wie Chip).
export function RatingButton({
  rating,
  label,
  onPress,
  size = 'regular',
  selected = false,
  disabled = false,
}: RatingButtonProps) {
  const large = size === 'large';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={[
        styles.button,
        large ? styles.buttonLarge : styles.buttonRegular,
        selected && styles.buttonSelected,
        disabled && styles.buttonDisabled,
      ]}
    >
      <RatingIcon
        rating={rating}
        size={large ? 'lg' : 'md'}
        color={selected ? colors.onPrimary : colors.icon}
      />
      {large && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonRegular: {
    minWidth: 48, // Touch-Ziel mindestens 44
    minHeight: 48,
    borderRadius: radius.full,
  },
  buttonLarge: {
    flex: 1,
    minHeight: 80,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
  label: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
});
