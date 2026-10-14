import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { ActivityCategory } from '@/features/activities/activities';
import { cardVisualIcon, isPlaceVisualKey, type CardVisual } from '@/features/activities/CategoryIcon';
import type { Illustration } from '@/features/activities/illustrations';
import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { CardImageChain, CardImageSource } from './cardImage';

type CardMediaProps = {
  // Kategorie der Aktivität oder Bildgruppe eines Ortes (M10b): bestimmt Farbfläche und Symbol.
  category: CardVisual;
  // Text der Pille. Fehlt er, steht dort der Name der Aktivitäts-Kategorie (Orte geben ihre Unterart mit, z. B. „Hallenbad“).
  pillLabel?: string;
  chain: CardImageChain; // die Bild-Stufen dieser Karte (cardImage.ts): `image` der Aktivität, zuletzt die Farbfläche
  // Die weiße Pille mit Kategorie-Symbol und Name. In der Detailansicht aus: Dort steht die Kategorie über dem Titel.
  showPill?: boolean;
  // Die Illustration dieser Aktivität (illustrations.ts). Sie steht nach dem `image` der Aktivität und vor der Farbfläche.
  illustration?: Illustration;
};

// Der Bildbereich oben auf der Vorschlagskarte (DESIGN.md, Zusatz 45). Immer dieselbe Form und Höhe (Seitenverhältnis 2:1):
//  1. das `image` der Aktivität (Web-Adresse), 2. die Illustration der Aktivität (illustrations.ts, gezeichnet, gebündelt),
//  3. die Farbfläche der Kategorie mit großem, dünnem, angeschnittenem Symbol. Lädt eine Stufe nicht, zeigt der Bereich die nächste.
//  Die Bildkette aus cardImage.ts kennt `image` und die Farbfläche, die Illustration wird nur hier dazwischen eingeschoben.
// Dazu die weiße Pille mit Kategorie-Symbol und Name (bei Bild, Illustration und Fläche gleich), auf Wunsch (`showPill`) auch ohne.
// Die Detailansicht (D4) nutzt denselben Bildbereich, ohne Pille.
// Für die Sprachausgabe ist der Bereich Dekoration: Titel und Kategorie stehen in der Beschriftung der Karte.
export function CardMedia({ category, pillLabel, chain, showPill = true, illustration }: CardMediaProps) {
  const { t } = useTranslation();
  const { styles, categoryTones, placeTones, colors } = useThemedStyles(createStyles);
  // Das Symbol ist ein Schrift-Zeichen und würde mit der Systemschrift mitwachsen. Als Dekoration soll es gleich groß bleiben,
  // ohne dass die Skalierung gesperrt wird (wie beim Stimmungsbild auf dem Start).
  const scale = Math.max(1, useWindowDimensions().fontScale);
  // Stufen, die nicht geladen werden konnten (Schlüssel = Web-Adresse). Die letzte Stufe, die Farbfläche, kann nicht fehlschlagen.
  const [failed, setFailed] = useState<readonly string[]>([]);

  // Lädt die Illustration nicht (sollte bei einer gebündelten Datei nicht vorkommen), zeigt der Bereich die Kette ohne sie.
  const [illustrationFailed, setIllustrationFailed] = useState(false);

  const step: CardImageSource =
    chain.find((entry) => entry.kind === 'placeholder' || !failed.includes(stepKey(entry))) ?? { kind: 'placeholder' };
  const showIllustration = illustration !== undefined && !illustrationFailed && step.kind !== 'activity';
  const tone = isPlaceVisualKey(category) ? placeTones[category] : categoryTones[category];
  const icon = cardVisualIcon(category);
  const label = pillLabel ?? t(`categories.${category as ActivityCategory}`);

  return (
    <View
      style={[styles.media, step.kind === 'placeholder' && !showIllustration && { backgroundColor: tone.field }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showIllustration ? (
        <ExpoImage
          source={illustration.source}
          style={styles.image}
          contentFit="cover"
          onError={() => setIllustrationFailed(true)}
        />
      ) : step.kind === 'placeholder' ? (
        <>
          <View style={[styles.shape, { backgroundColor: tone.shape }]} />
          <Ionicons
            name={icon}
            size={iconSize.hero / scale}
            color={tone.mark}
            style={styles.mark}
          />
        </>
      ) : (
        <Image
          source={{ uri: step.uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed((current) => [...current, stepKey(step)])}
        />
      )}
      {showPill && (
        <View style={styles.pill}>
          <Ionicons name={icon} size={iconSize.sm} color={colors.text} />
          <Text style={styles.pillLabel}>{label}</Text>
        </View>
      )}
    </View>
  );
}

function stepKey(step: CardImageSource): string {
  return step.kind === 'activity' ? step.uri : 'placeholder';
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors, categoryTones, placeTones }: Theme) => ({
  colors,
  categoryTones,
  placeTones,
  styles: StyleSheet.create({
    media: {
      aspectRatio: 2, // gleiche Form und Höhe bei Bild, Illustration und Farbfläche
      overflow: 'hidden', // schneidet Bild, Kreis und Symbol an
      backgroundColor: colors.surface, // Sand, solange ein Bild lädt
    },
    // Breite und Höhe ausdrücklich: Ein Bild bringt seine eigene Größe mit (z. B. 1200 × 795),
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
