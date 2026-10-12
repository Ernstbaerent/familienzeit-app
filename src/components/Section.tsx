import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSize, lineHeight, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type SectionProps = {
  title: string;
  tag?: string; // z. B. „(Pflicht)“ oder „(freiwillig)“
  hint?: string;
  children: ReactNode;
};

// Abschnitt in einem Formular: Überschrift, optional Zusatz und Hinweis, darunter der Inhalt.
export function Section({ title, tag, hint, children }: SectionProps) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    section: {
      gap: spacing.sm,
    },
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    tag: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
  });
