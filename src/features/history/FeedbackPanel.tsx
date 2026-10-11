import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fontSize, lineHeight, spacing } from '@/lib/theme';

import type { Rating } from './history';
import { RatingButton } from './RatingButton';

type FeedbackPanelProps = {
  onRate: (rating: Rating) => void;
  onSkip: () => void;
  disabled?: boolean; // solange gespeichert wird (verhindert doppeltes Tippen)
};

// „Wie war’s?“ nach „Fertig“. Beides ist freiwillig: Überspringen ist gleichwertig und ohne Folgen.
// Keine Punkte, Abzeichen oder Serien (siehe Design-Leitlinien in der CLAUDE.md).
export function FeedbackPanel({ onRate, onSkip, disabled = false }: FeedbackPanelProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      <Text style={styles.title} accessibilityRole="header">
        {t('feedback.title')}
      </Text>
      <View style={styles.row}>
        <RatingButton
          rating="up"
          size="large"
          label={t('feedback.up')}
          onPress={() => onRate('up')}
          disabled={disabled}
        />
        <RatingButton
          rating="down"
          size="large"
          label={t('feedback.down')}
          onPress={() => onRate('down')}
          disabled={disabled}
        />
      </View>
      <Button label={t('feedback.skip')} variant="secondary" onPress={onSkip} disabled={disabled} />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
