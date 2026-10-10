// Übersetzungen einmal beim App-Start laden, bevor ein Bildschirm erscheint.
import '@/lib/i18n';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProfilesProvider } from '@/features/profiles/ProfilesContext';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <ProfilesProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          // Beim Zurück-Pfeil nur den Pfeil zeigen, nicht den Namen des vorigen Bildschirms.
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Der Start hat eine eigene Überschrift im Bildschirm, keine Kopfzeile. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </ProfilesProvider>
  );
}
