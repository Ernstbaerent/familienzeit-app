import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/Section';
import { fonts, fontSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { Illustration } from './illustrations';

type StepListProps = {
  steps: readonly string[];
  // PILOT Illustrationen: Schrittbilder nach Schrittnummer (ab 1), aus illustrations.ts. Fehlt ein Bild, steht nur der Text.
  illustrations?: Readonly<Record<number, Illustration>>;
};

// „So geht’s“: die Schritte, nummeriert, in Lesegröße (`fontSize.reading`, 20 px) mit 28 px Abstand (`spacing.stepGap`),
// damit man sie in der Küche auch aus Armlänge lesen kann (DESIGN.md, Bildschirm 03). Keine Abhak-Felder bei den Schritten (Entscheidung 13),
// keine Hinweise je Schritt (Entscheidung 15). Für die Sprachausgabe ist jeder Schritt ein Satz („Schritt 1. …“).
// Ein Schrittbild (Pilot) steht unter dem Text seines Schritts, so breit wie der Text. Daneben wäre die Anleitung zu schmal.
// Nach dem Bild ist mehr Luft als zwischen Text und Bild, damit es nicht wie das Bild des nächsten Schritts wirkt.
// Es ist Dekoration: Die Sprachausgabe liest nur den Satz des Schritts.
export function StepList({ steps, illustrations }: StepListProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <Section title={t('detail.stepsTitle')} large>
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const illustration = illustrations?.[index + 1];
          return (
            <View
              key={index}
              style={styles.step}
              accessible
              accessibilityLabel={`${t('detail.stepNumber', { number: index + 1 })}. ${step}`}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepText}>{step}</Text>
                {illustration && (
                  <View
                    style={styles.stepImage}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <ExpoImage source={illustration.source} style={styles.stepImageFill} contentFit="cover" />
                  </View>
                )}
              </View>
            </View>
          );
        })}
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
    // Kreis in `surface` mit der Nummer in Literata (Petrol ist nur dem Hauptknopf und Links vorbehalten, Entscheidung 11 und 55).
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
    // Text und (Pilot) Schrittbild in einer Spalte neben der Nummer.
    stepBody: {
      flex: 1,
      gap: spacing.md,
      paddingTop: spacing.xs, // erste Zeile auf Höhe der Nummer (Kreis 40, Zeile 30)
    },
    stepText: {
      fontFamily: fonts.body,
      fontSize: fontSize.reading,
      lineHeight: lineHeight.reading,
      color: colors.text,
    },
    // Schrittbild: 2:1 wie der Bildbereich der Karten, Ecken wie Kacheln. Unten zusätzlich Luft: Zum eigenen Text sind es 16 px,
    // zum nächsten Schritt 28 + 16 = 44 px. So ist klar, zu welchem Schritt das Bild gehört.
    stepImage: {
      marginBottom: spacing.md,
      width: '100%',
      aspectRatio: 2,
      overflow: 'hidden',
      borderRadius: radius.tile,
      backgroundColor: colors.surface, // Sand, solange das Bild lädt
    },
    stepImageFill: {
      width: '100%',
      height: '100%',
    },
  });
