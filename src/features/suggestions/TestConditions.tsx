// TEST (M6): Vorübergehende Test-Auswahl für Wetter und Tageszeit.
// Mit M6 kommen echtes Wetter (Bright Sky) und die Uhrzeit. Dann diese Datei löschen,
// den Bereich "testConditions" in de.json und en.json löschen und alle Stellen mit
// „TEST (M6)“ anpassen (Suche im Projekt). Anleitung: docs/suggestions.md.

import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { dayPartKeys, type DayPart } from '@/features/activities/activities';
import { colors, fontSize, lineHeight, radius, spacing } from '@/lib/theme';

import { weatherKeys, type Weather } from './conditions';

type TestConditionsProps = {
  weather: Weather;
  dayPart: DayPart;
  onWeatherChange: (weather: Weather) => void;
  onDayPartChange: (dayPart: DayPart) => void;
};

export function TestConditions({
  weather,
  dayPart,
  onWeatherChange,
  onDayPartChange,
}: TestConditionsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.box}>
      <Text style={styles.badge}>{t('testConditions.badge')}</Text>
      <Text style={styles.hint}>{t('testConditions.hint')}</Text>

      <Text style={styles.subTitle}>{t('testConditions.weatherTitle')}</Text>
      <View style={styles.chipRow}>
        {weatherKeys.map((key) => (
          <Chip
            key={key}
            role="radio"
            label={t(`testConditions.weather.${key}`)}
            selected={weather === key}
            onPress={() => onWeatherChange(key)}
          />
        ))}
      </View>

      <Text style={styles.subTitle}>{t('testConditions.dayPartTitle')}</Text>
      <View style={styles.chipRow}>
        {dayPartKeys.map((key) => (
          <Chip
            key={key}
            role="radio"
            label={t(`testConditions.dayPart.${key}`)}
            selected={dayPart === key}
            onPress={() => onDayPartChange(key)}
          />
        ))}
      </View>
    </View>
  );
}

// Gestrichelter Rahmen in Warnfarbe, damit man sofort sieht: Das gehört nicht zur fertigen App.
const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.warning,
    borderRadius: radius.md,
  },
  badge: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.warning,
  },
  hint: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
  subTitle: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
