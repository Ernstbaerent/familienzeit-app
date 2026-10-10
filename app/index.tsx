import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { formatAge } from '@/features/profiles/formatAge';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { colors, fontSize, lineHeight, radius, spacing } from '@/lib/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, profiles } = useProfiles();

  // Solange die Profile vom Gerät gelesen werden, bleibt der Bildschirm leer (dauert Millisekunden).
  if (status === 'loading') return <SafeAreaView style={styles.screen} />;

  // Ohne Kind gibt es kein Alter und damit keine Vorschläge: erst ein Kind anlegen.
  if (profiles.length === 0) return <Redirect href="/children/new" />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting} accessibilityRole="header">
          {t('home.greeting')}
        </Text>
        <Text style={styles.intro}>{t('home.intro')}</Text>

        <View style={styles.children}>
          <Text style={styles.childrenTitle} accessibilityRole="header">
            {t('home.childrenTitle')}
          </Text>
          {profiles.map((child, index) => {
            const name = child.nickname ?? t('children.defaultName', { number: index + 1 });
            const age = formatAge(t, child);
            return (
              <Pressable
                key={child.id}
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${age}. ${t('children.edit')}`}
                onPress={() =>
                  router.push({ pathname: '/children/[id]', params: { id: child.id } })
                }
                style={styles.card}
              >
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{name}</Text>
                  <Text style={styles.cardMeta}>{age}</Text>
                  {child.interests.length > 0 && (
                    <Text style={styles.cardMeta}>
                      {t('children.interestCount', { count: child.interests.length })}
                    </Text>
                  )}
                </View>
                <Text style={styles.cardEdit}>{t('children.edit')}</Text>
              </Pressable>
            );
          })}
          <Button
            label={t('children.add')}
            variant="secondary"
            onPress={() => router.push('/children/new')}
          />
        </View>
      </ScrollView>
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
    padding: spacing.lg,
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
  children: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  childrenTitle: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
  cardEdit: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.primary,
  },
});
