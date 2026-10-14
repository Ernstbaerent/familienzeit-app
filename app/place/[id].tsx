import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Alert, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { PlaceDetails } from '@/features/places/PlaceDetails';
import { placeTitle } from '@/features/places/placeDisplay';
import { usePlaces } from '@/features/places/PlacesContext';
import { mapServices, openRoute, routeTargetFor, type MapService } from '@/features/places/routeLinks';
import { distanceKm } from '@/features/places/travel';
import { spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Details eines Ortes (M10b, „Route öffnen“, Website und Öffnungszeiten seit M10c). Aufbau wie die Detailansicht einer Idee:
// runder Zurück-Knopf, scrollender Inhalt (`PlaceDetails`), darunter der feste Bereich mit dem Hauptknopf „Route öffnen“.
// Der feste Bereich ist ein Nachbar des Scrollbereichs, nicht darüber gelegt (DESIGN.md, Zusatz 43). Kein Verlauf für Orte (M10e).
// Die Orte und die Uhrzeit werden beim Öffnen eingefroren (wie die Aktivitäten in der Detailansicht einer Idee).
export default function PlaceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const styles = useThemedStyles(createStyles);
  const { snapshot: currentSnapshot } = usePlaces();
  const [snapshot] = useState(currentSnapshot);
  const [now] = useState(() => new Date());

  // Unbekannter Ort (z. B. alter Link oder die Orte wurden inzwischen neu geladen): zurück zum Start.
  const place = snapshot?.rows.find((row) => row.id === single(params.id));
  if (!snapshot || !place) return <Redirect href="/" />;

  const km = distanceKm(snapshot.origin, place);
  const title = placeTitle(t, place);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  // iPhone: kleines Auswahlmenü des Systems (Apple Karten, Google Maps, OpenStreetMap). Vorher kein weiterer Dialog.
  function chooseService(): Promise<MapService | null> {
    const options = [...mapServices.map((service) => t(`places.route.${service}`)), t('places.route.cancel')];
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: t('places.route.menuTitle'), options, cancelButtonIndex: mapServices.length },
        (index) => resolve(mapServices[index] ?? null),
      );
    });
  }

  // Die App sendet dabei nichts: Das Ziel (Koordinaten, auf Android auch der Name) geht nur an die gewählte Karten-App.
  const target = routeTargetFor(place, title, km);
  function startRoute() {
    void openRoute(target, {
      os: Platform.OS,
      openURL: (url) => Linking.openURL(url),
      chooseService,
      onError: () => Alert.alert(t('places.route.error')),
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: t('detail.screenTitle'), headerShown: false }} />
      <View style={styles.header}>
        <BackButton label={t('detail.back')} onPress={goBack} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <PlaceDetails place={place} km={km} now={now} />
      </ScrollView>

      {/* Fest am unteren Rand wie „Das machen wir“ bei den Ideen. */}
      <View style={styles.bar}>
        <Button
          label={t('places.route.open')}
          accessibilityLabel={t('places.route.label', { title })}
          accessibilityHint={t(Platform.OS === 'ios' ? 'places.route.hintIos' : 'places.route.hintAndroid')}
          size="large"
          onPress={startRoute}
        />
      </View>
    </SafeAreaView>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links). Werte wie app/activity/[id].tsx.
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
    // Unten genug Luft, damit die Quellenzeile nicht am festen Bereich klebt.
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    bar: {
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
  });
