// Laden der Schriften Literata und Onest (Google Fonts, OFL). Die Namen stehen in `fonts` in theme.ts.
// Es werden nur die gebrauchten Schnitte eingebunden (Unterpfade), sonst landen alle Schnitte in der App.
// Latein erweitert (Türkisch, Rumänisch) und Kyrillisch (Ukrainisch) sind in allen Dateien enthalten.

import { Literata_500Medium } from '@expo-google-fonts/literata/500Medium';
import { Literata_600SemiBold } from '@expo-google-fonts/literata/600SemiBold';
import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { fontFaces, switchToSystemFontsForSession } from '@/lib/theme';

// So lange wartet die App höchstens auf die Schriften (Startbild bleibt stehen). Danach startet sie
// mit der Systemschrift, damit nie ein leerer Bildschirm bleibt. Die Dateien liegen in der App selbst,
// das Laden dauert normalerweise Millisekunden. Nur im Entwicklungsmodus (Expo Go) kommen sie über das
// Netzwerk. Begründung der 4 Sekunden und was danach gilt: docs/theme.md.
export const FONT_LOAD_TIMEOUT_MS = 4000;

const fontFiles = {
  [fontFaces.title]: Literata_600SemiBold,
  [fontFaces.number]: Literata_500Medium,
  [fontFaces.body]: Onest_400Regular,
  [fontFaces.bodyMedium]: Onest_500Medium,
  [fontFaces.bodyStrong]: Onest_600SemiBold,
};

// true, sobald die App starten darf: Schriften geladen, Ladefehler oder Zeitlimit erreicht.
// Startet sie ohne die Schriften, bleibt sie bis zum nächsten Start bei der Systemschrift, auch wenn die Schriften
// später doch noch ankommen (Grund: theme.ts bei `switchToSystemFontsForSession`).
export function useAppFonts(timeoutMs: number = FONT_LOAD_TIMEOUT_MS): boolean {
  const [loaded, error] = useFonts(fontFiles);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [loaded, timeoutMs]);

  useEffect(() => {
    if (error) console.warn('Schriften konnten nicht geladen werden, die App nutzt die Systemschrift.', error);
  }, [error]);

  const ready = loaded || error != null || timedOut;
  const withoutFonts = ready && !loaded;
  // Vor dem ersten Text umschalten: Bis `ready` zeigt die App nichts (app/_layout.tsx). Der Schalter bleibt für die Sitzung.
  if (withoutFonts) switchToSystemFontsForSession();

  useEffect(() => {
    if (withoutFonts && !error) {
      console.warn(`Schriften nicht innerhalb von ${timeoutMs / 1000} s geladen: Diese Sitzung nutzt die Systemschrift.`);
    }
  }, [withoutFonts, error, timeoutMs]);

  return ready;
}
