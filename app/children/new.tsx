import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChildForm } from '@/features/profiles/ChildForm';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { closeScreen } from '@/lib/navigation';
import { colors, fontSize, lineHeight, spacing } from '@/lib/theme';

export default function NewChildScreen() {
  const { status } = useProfiles();
  // Erst anzeigen, wenn die gespeicherten Profile gelesen sind (sonst stimmt „erstes Kind“ nicht).
  if (status === 'loading') return null;
  return <NewChildForm />;
}

function NewChildForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profiles, addChild } = useProfiles();
  // Nur beim Öffnen entscheiden: Der Willkommenstext soll beim Speichern nicht plötzlich verschwinden.
  const [isFirstChild] = useState(profiles.length === 0);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t('children.newTitle') }} />
      <ChildForm
        header={isFirstChild ? <Welcome /> : undefined}
        onSubmit={async (draft) => {
          await addChild(draft);
          closeScreen(router);
        }}
      />
    </SafeAreaView>
  );
}

function Welcome() {
  const { t } = useTranslation();
  return (
    <View style={styles.welcome}>
      <Text style={styles.welcomeTitle} accessibilityRole="header">
        {t('children.welcomeTitle')}
      </Text>
      <Text style={styles.welcomeText}>{t('children.welcomeText')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcome: {
    gap: spacing.sm,
  },
  welcomeTitle: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: '700',
    color: colors.text,
  },
  welcomeText: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    color: colors.textMuted,
  },
});
