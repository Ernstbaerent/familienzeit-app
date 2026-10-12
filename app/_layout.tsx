// Übersetzungen einmal beim App-Start laden, bevor ein Bildschirm erscheint.
import '@/lib/i18n';

import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { HistoryProvider } from '@/features/history/HistoryContext';
import { ProfilesProvider } from '@/features/profiles/ProfilesContext';
import { SelectedChildrenProvider } from '@/features/suggestions/SelectedChildrenContext';
import { WeatherProvider } from '@/features/weather/WeatherProvider';
import { useAppFonts } from '@/lib/fonts';
import { fonts, useTheme } from '@/lib/theme';

// Das Startbild bleibt stehen, bis die Schriften geladen sind (oder das Zeitlimit abläuft, siehe
// src/lib/fonts.ts). So springt nichts um und kein Bildschirm erscheint leer oder in der falschen Schrift.
// Ein Fehler hier darf den Start nie blockieren.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const { colors, scheme } = useTheme();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  // Bis dahin zeigt die App nichts: darüber liegt das Startbild.
  if (!fontsReady) return null;

  return (
    <ProfilesProvider>
      {/* Die zuletzt gewählten Kinder liegen wie die Profile nur auf dem Gerät (docs/suggestions.md). */}
      <SelectedChildrenProvider>
        {/* Der Verlauf liegt wie die Profile nur auf dem Gerät (docs/history.md). */}
        <HistoryProvider>
          {/* Holt nichts beim App-Start: Erst der Start (nur mit schon erteilter Erlaubnis) und die Vorschläge besorgen das Wetter. */}
          <WeatherProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontFamily: fonts.title },
                headerShadowVisible: false,
                // Beim Zurück-Pfeil nur den Pfeil zeigen, nicht den Namen des vorigen Bildschirms.
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              {/* Der Start hat eine eigene Überschrift im Bildschirm, keine Kopfzeile. */}
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          </WeatherProvider>
        </HistoryProvider>
      </SelectedChildrenProvider>
    </ProfilesProvider>
  );
}
