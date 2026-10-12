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

import { fonts } from '@/lib/theme';

// So lange wartet die App höchstens auf die Schriften (Startbild bleibt stehen). Danach startet sie
// mit der Systemschrift, damit nie ein leerer Bildschirm bleibt. Die Dateien liegen in der App selbst,
// das Laden dauert normalerweise Millisekunden. Nur im Entwicklungsmodus (Expo Go) kommen sie über das
// Netzwerk. Begründung der 4 Sekunden und was danach gilt: docs/theme.md.
export const FONT_LOAD_TIMEOUT_MS = 4000;

const fontFiles = {
  [fonts.title]: Literata_600SemiBold,
  [fonts.number]: Literata_500Medium,
  [fonts.body]: Onest_400Regular,
  [fonts.bodyMedium]: Onest_500Medium,
  [fonts.bodyStrong]: Onest_600SemiBold,
};

// true, sobald die App starten darf: Schriften geladen, Ladefehler oder Zeitlimit erreicht.
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

  return loaded || error != null || timedOut;
}
