import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fontSize, iconSize, lineHeight, radius, spacing } from '@/lib/theme';

type LocationExplainerProps = {
  onAllow: () => void; // zeigt danach den Dialog des Handys
  onDecline: () => void; // „Wetter selbst wählen“
};

const points = ['pointWhen', 'pointRounded', 'pointPrivacy'] as const;

// Erklärt kurz, wofür die App den Standort braucht, BEVOR das Handy danach fragt.
export function LocationExplainer({ onAllow, onDecline }: LocationExplainerProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
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
      <Button label={t('weather.explain.allow')} onPress={onAllow} />
      <Button label={t('weather.explain.decline')} variant="secondary" onPress={onDecline} />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.text,
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.text,
  },
  points: {
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pointText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
});
