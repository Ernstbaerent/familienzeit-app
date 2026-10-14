import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { PlaceDetails } from '@/features/places/PlaceDetails';
import { usePlaces } from '@/features/places/PlacesContext';
import { distanceKm } from '@/features/places/travel';
import { spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Details eines Ortes (M10b): Name, Entfernung, Ortsteil, Hinweise und Quellenangabe. Ohne Hauptknopf und ohne Verlauf (M10e).
// Die Orte werden beim Öffnen eingefroren (wie die Aktivitäten in der Detailansicht einer Idee).
export default function PlaceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const styles = useThemedStyles(createStyles);
  const { snapshot: currentSnapshot } = usePlaces();
  const [snapshot] = useState(currentSnapshot);

  // Unbekannter Ort (z. B. alter Link oder die Orte wurden inzwischen neu geladen): zurück zum Start.
  const place = snapshot?.rows.find((row) => row.id === single(params.id));
  if (!snapshot || !place) return <Redirect href="/" />;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: t('detail.screenTitle'), headerShown: false }} />
      <View style={styles.header}>
        <BackButton label={t('detail.back')} onPress={goBack} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <PlaceDetails place={place} km={distanceKm(snapshot.origin, place)} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      alignItems: 'flex-start',
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
  });
