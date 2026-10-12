import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// Weißer Kasten in Kartenform (Radius 22, weich schattiert) für die Wetter-Schritte: Erklär-Karte, „Wie ist das Wetter?“, „Wetter ändern“.
export function WeatherCard({ children }: { children: ReactNode }) {
  const { styles, cardShadow } = useThemedStyles(createStyles);
  return <View style={[styles.card, cardShadow]}>{children}</View>;
}

const createStyles = ({ colors, shadow }: Theme) => ({
  cardShadow: shadow.card,
  styles: StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.card,
      backgroundColor: colors.card, // Karten sind weiß (Entscheidung 11)
    },
  }),
});
