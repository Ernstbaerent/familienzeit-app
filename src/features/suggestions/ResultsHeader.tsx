import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { fonts, fontSize, lineHeight, size, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

type ResultsHeaderProps = {
  title: string;
  onBack: () => void;
};

// Der Kopf von „Eure Ideen“ (DESIGN.md, Bildschirm 02 und Entscheidung 9): runder Zurück-Knopf, Titel in der Mitte, kein Mischen-Symbol.
// Der Knopf (`BackButton`) ist mindestens 44 pt groß und für die Sprachausgabe beschriftet („Zurück zur Auswahl“).
export function ResultsHeader({ title, onBack }: ResultsHeaderProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <BackButton label={t('suggest.back')} onPress={onBack} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {/* Gleich breit wie der Knopf, damit der Titel in der Mitte bleibt. */}
      <View style={styles.balance} />
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.title,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.text,
    },
    balance: {
      minWidth: size.touch,
    },
  });
