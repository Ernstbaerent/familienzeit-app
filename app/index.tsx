import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontSize, lineHeight, spacing } from '@/lib/theme';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.greeting} accessibilityRole="header">
          {t('home.greeting')}
        </Text>
        <Text style={styles.intro}>{t('home.intro')}</Text>
      </View>
    </SafeAreaView>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xxl,
    lineHeight: lineHeight.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  intro: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    color: colors.textMuted,
  },
});
