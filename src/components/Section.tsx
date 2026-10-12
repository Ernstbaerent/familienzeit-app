import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSize, lineHeight, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type SectionProps = {
  title: string;
  tag?: string; // z. B. „(Pflicht)“ oder „(freiwillig)“
  hint?: string;
  // Größere Überschrift und mehr Luft darunter (Detailansicht: „Das braucht ihr“, „So geht’s“).
  large?: boolean;
  children: ReactNode;
};

// Abschnitt in einem Formular: Überschrift, optional Zusatz und Hinweis, darunter der Inhalt.
export function Section({ title, tag, hint, large = false, children }: SectionProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.section, large && styles.sectionLarge]}>
      <Text style={[styles.title, large && styles.titleLarge]} accessibilityRole="header">
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
    sectionLarge: {
      gap: spacing.md,
    },
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    titleLarge: {
      fontSize: fontSize.xl,
      lineHeight: lineHeight.xl,
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
