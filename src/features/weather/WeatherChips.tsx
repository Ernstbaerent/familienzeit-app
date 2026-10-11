import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { spacing } from '@/lib/theme';

import { weatherKeys, type Weather } from '../suggestions/conditions';

type WeatherChipsProps = {
  value: Weather | null; // `null` = „Automatisch“ (Wetter vom Deutschen Wetterdienst)
  onChange: (weather: Weather) => void;
  // Mit dieser Funktion gibt es zusätzlich „Automatisch“, um eine Handwahl wieder aufzuheben.
  onAutomatic?: () => void;
};

// Die Auswahl „Wie ist das Wetter?“: Sonne, bewölkt, Regen, Gewitter, Schnee.
export function WeatherChips({ value, onChange, onAutomatic }: WeatherChipsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {onAutomatic && (
        <Chip
          role="radio"
          label={t('weather.automatic')}
          selected={value === null}
          onPress={onAutomatic}
        />
      )}
      {weatherKeys.map((key) => (
        <Chip
          key={key}
          role="radio"
          label={t(`weather.options.${key}`)}
          selected={value === key}
          onPress={() => onChange(key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
