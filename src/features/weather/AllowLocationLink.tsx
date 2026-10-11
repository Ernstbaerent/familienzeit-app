import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, lineHeight } from '@/lib/theme';

import { useWeather } from './WeatherProvider';
import type { LocationAccess } from './weatherService';

type AllowLocationLinkProps = {
  access: LocationAccess;
  // Wurde noch nie gefragt (`ask`), soll erst die Erklärung kommen. Ohne diese Funktion fragt der Link gleich.
  onExplain?: () => void;
};

// Kleiner Link, um den Standort nachträglich zu erlauben.
// Hat das Handy die Erlaubnis dauerhaft abgelehnt (`blocked`), führt er in die Einstellungen.
export function AllowLocationLink({ access, onExplain }: AllowLocationLinkProps) {
  const { t } = useTranslation();
  const { allowLocation } = useWeather();
  const blocked = access === 'blocked';

  function press() {
    if (blocked) void Linking.openSettings();
    else if (access === 'ask' && onExplain) onExplain();
    else void allowLocation();
  }

  return (
    <Pressable onPress={press} accessibilityRole="link" style={styles.link}>
      <Text style={styles.text}>{t(blocked ? 'weather.openSettings' : 'weather.allowLocation')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 44, // Touch-Ziel mindestens 44
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
