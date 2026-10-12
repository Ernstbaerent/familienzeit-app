import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { ActivityCategory } from '@/features/activities/activities';
import { categoryIcons } from '@/features/activities/CategoryIcon';
import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { CardImageChain, CardImageSource } from './cardImage';

type CardMediaProps = {
  category: ActivityCategory;
  chain: CardImageChain; // die Bild-Stufen dieser Karte (cardImage.ts), bestes zuerst, zuletzt die Farbfläche
  // Die weiße Pille mit Kategorie-Symbol und Name. In der Detailansicht aus: Dort steht die Kategorie über dem Titel.
  showPill?: boolean;
};

// Der Bildbereich oben auf der Vorschlagskarte (DESIGN.md, Entscheidung 21). Immer dieselbe Form und Höhe (Seitenverhältnis 2:1):
//  1. das `image` der Aktivität (Web-Adresse), 2. ein gebündeltes Kategorie-Foto, 3. die Farbfläche der Kategorie mit großem,
//  dünnem, angeschnittenem Symbol. Lädt eine Web-Adresse nicht, zeigt der Bereich die nächste Stufe.
// Dazu die weiße Pille mit Kategorie-Symbol und Name (Fläche und Foto gleich), auf Wunsch (`showPill`) auch ohne.
// Die Detailansicht (D4) nutzt denselben Bildbereich, ohne Pille.
// Für die Sprachausgabe ist der Bereich Dekoration: Titel und Kategorie stehen in der Beschriftung der Karte.
export function CardMedia({ category, chain, showPill = true }: CardMediaProps) {
  const { t } = useTranslation();
  const { styles, categoryTones, colors } = useThemedStyles(createStyles);
  // Das Symbol ist ein Schrift-Zeichen und würde mit der Systemschrift mitwachsen. Als Dekoration soll es gleich groß bleiben,
  // ohne dass die Skalierung gesperrt wird (wie beim Stimmungsbild auf dem Start).
  const scale = Math.max(1, useWindowDimensions().fontScale);
  // Stufen, die nicht geladen werden konnten (Schlüssel = Web-Adresse). Die letzte Stufe, die Farbfläche, kann nicht fehlschlagen.
  const [failed, setFailed] = useState<readonly string[]>([]);

  const step: CardImageSource =
    chain.find((entry) => entry.kind === 'placeholder' || !failed.includes(stepKey(entry))) ?? { kind: 'placeholder' };
  const tone = categoryTones[category];

  return (
    <View
      style={[styles.media, step.kind === 'placeholder' && { backgroundColor: tone.field }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {step.kind === 'placeholder' ? (
        <>
          <View style={[styles.shape, { backgroundColor: tone.shape }]} />
          <Ionicons
            name={categoryIcons[category]}
            size={iconSize.hero / scale}
            color={tone.mark}
            style={styles.mark}
          />
        </>
      ) : (
        <Image
          source={step.kind === 'activity' ? { uri: step.uri } : step.photo.source}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed((current) => [...current, stepKey(step)])}
        />
      )}
      {showPill && (
        <View style={styles.pill}>
          <Ionicons name={categoryIcons[category]} size={iconSize.sm} color={colors.text} />
          <Text style={styles.pillLabel}>{t(`categories.${category}`)}</Text>
        </View>
      )}
    </View>
  );
}

function stepKey(step: CardImageSource): string {
  if (step.kind === 'activity') return step.uri;
  if (step.kind === 'category') return step.photo.file;
  return 'placeholder';
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors, categoryTones }: Theme) => ({
  colors,
  categoryTones,
  styles: StyleSheet.create({
    media: {
      aspectRatio: 2, // gleiche Form und Höhe bei Foto und Farbfläche
      overflow: 'hidden', // schneidet Foto, Kreis und Symbol an
      backgroundColor: colors.surface, // Sand, solange ein Bild lädt
    },
    // Breite und Höhe ausdrücklich: Ein gebündeltes Foto bringt seine eigene Größe mit (z. B. 1200 × 795),
    // und die würde sonst stärker gelten als `absoluteFill` und den Zuschnitt zerstören.
    image: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: '100%',
    },
    // Weicher großer Kreis, oben am Ende angeschnitten. Prozentwerte, damit er mit der Kartenbreite wächst.
    shape: {
      position: 'absolute',
      top: '-30%',
      end: '-6%',
      width: '55%',
      aspectRatio: 1,
      borderRadius: radius.full,
    },
    // Das Symbol geht unten über den Rand hinaus: Ein Viertel ist abgeschnitten.
    mark: {
      position: 'absolute',
      end: spacing.lg,
      bottom: -(iconSize.hero / 4),
    },
    pill: {
      position: 'absolute',
      top: spacing.md,
      start: spacing.md,
      maxWidth: '85%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.card,
    },
    pillLabel: {
      flexShrink: 1,
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.text,
    },
  }),
});
