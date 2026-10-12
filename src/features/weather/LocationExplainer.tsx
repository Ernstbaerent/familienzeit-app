import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { fonts, fontSize, iconSize, lineHeight, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { WeatherCard } from './WeatherCard';

type LocationExplainerProps = {
  onAllow: () => void; // zeigt danach den Dialog des Handys
  onDecline: () => void; // „Wetter selbst wählen“
};

const points = ['pointWhen', 'pointRounded', 'pointPrivacy'] as const;

// Erklärt kurz, wofür die App den Standort braucht, BEVOR das Handy danach fragt.
// „Standort erlauben“ ist hier der Hauptknopf (Terrakotta), „Wetter selbst wählen“ ein Nebenknopf.
export function LocationExplainer({ onAllow, onDecline }: LocationExplainerProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  return (
    <WeatherCard>
      <Text style={styles.title} accessibilityRole="header">
        {t('weather.explain.title')}
      </Text>
      <Text style={styles.text}>{t('weather.explain.text')}</Text>
      <View style={styles.points}>
        {points.map((key) => (
          <View key={key} style={styles.point}>
            <Ionicons
              name="checkmark-outline"
              size={iconSize.md}
              color={colors.icon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.pointText}>{t(`weather.explain.${key}`)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Button label={t('weather.explain.allow')} size="large" onPress={onAllow} />
        <Button label={t('weather.explain.decline')} variant="secondary" onPress={onDecline} />
      </View>
    </WeatherCard>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.xl,
      lineHeight: lineHeight.xl,
      color: colors.text,
    },
    text: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    points: {
      gap: spacing.sm,
    },
    point: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    pointText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
    actions: {
      gap: spacing.sm,
    },
  }),
});
