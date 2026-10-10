import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, lineHeight, spacing } from '@/lib/theme';

type SectionProps = {
  title: string;
  tag?: string; // z. B. „(Pflicht)“ oder „(freiwillig)“
  hint?: string;
  children: ReactNode;
};

// Abschnitt in einem Formular: Überschrift, optional Zusatz und Hinweis, darunter der Inhalt.
export function Section({ title, tag, hint, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
        {tag ? (
          <>
            {' '}
            <Text style={styles.tag}>{tag}</Text>
          </>
        ) : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.text,
  },
  tag: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '400',
    color: colors.textMuted,
  },
  hint: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
});
