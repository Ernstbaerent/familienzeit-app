import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { fonts, fontSize, iconSize, lineHeight, size, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { useWeather } from './WeatherProvider';
import type { LocationAccess } from './weatherService';

type AllowLocationLinkProps = {
  access: LocationAccess;
  // Wurde noch nie gefragt (`ask`), soll erst die Erklärung kommen. Ohne diese Funktion fragt der Link gleich.
  onExplain?: () => void;
};

// Kleiner Link, um den Standort nachträglich zu erlauben.
// Hat das Handy die Erlaubnis dauerhaft abgelehnt (`blocked`), führt er in die Einstellungen.
// Tinte mit Unterstreichung (Terrakotta ist nur dem Hauptknopf vorbehalten, Entscheidung 11).
export function AllowLocationLink({ access, onExplain }: AllowLocationLinkProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  const { allowLocation } = useWeather();
  const blocked = access === 'blocked';

  function press() {
    if (blocked) void Linking.openSettings();
    else if (access === 'ask' && onExplain) onExplain();
    else void allowLocation();
  }

  return (
    <Pressable onPress={press} accessibilityRole="link" style={styles.link}>
      <Ionicons
        name="location-outline"
        size={iconSize.md}
        color={colors.icon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.text}>{t(blocked ? 'weather.openSettings' : 'weather.allowLocation')}</Text>
    </Pressable>
  );
}

const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    link: {
      minHeight: size.touch, // Touch-Ziel mindestens 44
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    text: {
      flexShrink: 1,
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
      textDecorationLine: 'underline',
    },
  }),
});
