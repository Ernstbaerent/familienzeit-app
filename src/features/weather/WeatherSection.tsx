import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { Section } from '@/components/Section';
import { colors, fontSize, lineHeight } from '@/lib/theme';

import type { Weather } from '../suggestions/conditions';
import { AllowLocationLink } from './AllowLocationLink';
import { LocationExplainer } from './LocationExplainer';
import { needsManualWeather } from './manualWeather';
import { useWeather } from './WeatherProvider';
import { WeatherChips } from './WeatherChips';

type WeatherSectionProps = {
  manualWeather: Weather;
  onManualWeatherChange: (weather: Weather) => void;
};

// Der Wetter-Teil auf „Was machen wir?“. Je nach Stand des Standorts:
//  - noch nicht gefragt: kurze Erklärung mit „Standort erlauben“ / „Wetter selbst wählen“
//  - erlaubt: nichts zu tun (das Wetter kommt automatisch, angezeigt wird es bei den Vorschlägen)
//  - verweigert, „selbst wählen“ oder Wetter nicht abrufbar: „Wie ist das Wetter?“ zum Auswählen
export function WeatherSection({ manualWeather, onManualWeatherChange }: WeatherSectionProps) {
  const { t } = useTranslation();
  const { access, status, allowLocation, chooseManualWeather } = useWeather();

  if (access === 'checking') return null;
  if (access === 'ask') {
    return (
      <LocationExplainer
        onAllow={() => void allowLocation()}
        onDecline={() => void chooseManualWeather()}
      />
    );
  }

  if (!needsManualWeather(access, status)) {
    return status === 'loading' ? (
      <Text style={styles.hint} accessibilityLiveRegion="polite">
        {t('weather.loading')}
      </Text>
    ) : null;
  }

  return (
    <Section
      title={t('weather.manual.title')}
      hint={access === 'granted' ? t('weather.manual.hintUnavailable') : t('weather.manual.hint')}
    >
      <WeatherChips value={manualWeather} onChange={onManualWeatherChange} />
      {access !== 'granted' && <AllowLocationLink access={access} />}
    </Section>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
});
