import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChildForm } from '@/features/profiles/ChildForm';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import { closeScreen } from '@/lib/navigation';
import { colors } from '@/lib/theme';

export default function EditChildScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, profiles, updateChild, deleteChild } = useProfiles();
  // Während des Löschens ist das Profil schon weg. Dann nicht zum Start umleiten, sondern ganz normal schließen.
  const [deleting, setDeleting] = useState(false);

  if (status === 'loading' || deleting) return null;

  const profile = profiles.find((child) => child.id === id);
  // Unbekannte ID (z. B. alter Link): zurück zum Start.
  if (!profile) return <Redirect href="/" />;

  const profileId = profile.id;

  function confirmDelete() {
    Alert.alert(t('children.deleteTitle'), t('children.deleteMessage'), [
      { text: t('children.cancel'), style: 'cancel' },
      {
        text: t('children.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteChild(profileId);
            closeScreen(router);
          } catch {
            setDeleting(false);
            Alert.alert(t('children.deleteError'));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t('children.editTitle') }} />
      <ChildForm
        initial={profile}
        onSubmit={async (draft) => {
          await updateChild(profile.id, draft);
          closeScreen(router);
        }}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
