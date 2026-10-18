import { Image as ExpoImage } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/Section';
import { fonts, fontSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type StepListProps = {
  steps: readonly string[];
  // Schrittbilder nach Schrittnummer (ab 1): Web-Adressen aus Supabase (step_images, stepImages.ts). Fehlt ein Bild, steht nur der Text.
  stepImages?: Readonly<Record<number, string>>;
};

// „So geht’s“: die Schritte, nummeriert, in Lesegröße (`fontSize.reading`, 20 px) mit 28 px Abstand (`spacing.stepGap`),
// damit man sie in der Küche auch aus Armlänge lesen kann (DESIGN.md, Bildschirm 03). Keine Abhak-Felder bei den Schritten (Entscheidung 13),
// keine Hinweise je Schritt (Entscheidung 15). Für die Sprachausgabe ist jeder Schritt ein Satz („Schritt 1. …“).
// Ein Schrittbild steht unter dem Text seines Schritts, so breit wie der Text. Daneben wäre die Anleitung zu schmal.
// Nach dem Bild ist mehr Luft als zwischen Text und Bild, damit es nicht wie das Bild des nächsten Schritts wirkt.
// Es ist Dekoration: Die Sprachausgabe liest nur den Satz des Schritts. Lädt es nicht (Datei fehlt, kein Netz und nicht im Gerätespeicher),
// verschwindet es still, ohne Meldung: Der Schritt steht dann wie ohne Bild da.
export function StepList({ steps, stepImages }: StepListProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  // Schritte, deren Bild nicht geladen werden konnte (Schlüssel = Adresse, damit ein neues Bild es wieder versucht).
  const [failed, setFailed] = useState<readonly string[]>([]);
  return (
    <Section title={t('detail.stepsTitle')} large>
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const uri = stepImages?.[index + 1];
          const showImage = uri !== undefined && !failed.includes(uri);
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
                {showImage && (
                  <View
                    style={styles.stepImage}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    testID={`step-image-${index + 1}`}
                  >
                    {/* expo-image: zeigt SVG aus dem Netz und behält es im Gerätespeicher (die Datei ändert sich nie, neuer Inhalt = neue Adresse). */}
                    <ExpoImage
                      source={{ uri }}
                      style={styles.stepImageFill}
                      contentFit="cover"
                      cachePolicy="disk"
                      onError={() => setFailed((current) => [...current, uri])}
                    />
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
    // Text und Schrittbild in einer Spalte neben der Nummer.
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
