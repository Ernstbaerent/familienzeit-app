import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    backgroundColor: '#FFF8F0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D2A26',
  },
  intro: {
    fontSize: 18,
    lineHeight: 26,
    color: '#5C5650',
  },
});
