import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/Section';
import { fonts, fontSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// „So geht’s“: die Schritte, nummeriert, in Lesegröße (`fontSize.reading`, 20 px) mit 28 px Abstand (`spacing.stepGap`),
// damit man sie in der Küche auch aus Armlänge lesen kann (DESIGN.md, Bildschirm 03). Keine Abhak-Felder bei den Schritten (Entscheidung 13),
// keine Hinweise je Schritt (Entscheidung 15). Für die Sprachausgabe ist jeder Schritt ein Satz („Schritt 1. …“).
export function StepList({ steps }: { steps: readonly string[] }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <Section title={t('detail.stepsTitle')} large>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View
            key={index}
            style={styles.step}
            accessible
            accessibilityLabel={`${t('detail.stepNumber', { number: index + 1 })}. ${step}`}
          >
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    steps: {
      gap: spacing.stepGap,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    // Sandfarbener Kreis mit der Nummer in Literata (Terrakotta ist nur dem Hauptknopf vorbehalten, Entscheidung 11).
    // Mindestgröße statt fester Größe: Bei großer Systemschrift wächst die Zahl mit.
    stepNumber: {
      minWidth: 40,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
      backgroundColor: colors.surface,
    },
    stepNumberText: {
      fontFamily: fonts.number,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    stepText: {
      flex: 1,
      paddingTop: spacing.xs, // erste Zeile auf Höhe der Nummer (Kreis 40, Zeile 30)
      fontFamily: fonts.body,
      fontSize: fontSize.reading,
      lineHeight: lineHeight.reading,
      color: colors.text,
    },
  });
