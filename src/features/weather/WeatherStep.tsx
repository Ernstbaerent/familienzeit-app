import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { fonts, fontSize, lineHeight, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { Weather } from '../suggestions/conditions';
import { AllowLocationLink } from './AllowLocationLink';
import { LocationExplainer } from './LocationExplainer';
import { WeatherCard } from './WeatherCard';
import { useWeather } from './WeatherProvider';
import { WeatherChips } from './WeatherChips';

type WeatherStepProps = {
  step: 'explain' | 'manual'; // welchen Schritt `getWeatherStep` verlangt (manualWeather.ts)
  onChooseWeather: (weather: Weather) => void;
};

// Der Wetter-Schritt vor den Vorschlägen (DESIGN.md, Entscheidung 7 und 22). Er erscheint erst nach dem Tipp auf den
// Hauptknopf, nie auf dem Start, und nur, wenn er nötig ist:
//  - Standort noch nie gefragt: kurze Erklärung mit „Standort erlauben“ / „Wetter selbst wählen“. Erst nach „Standort erlauben“
//    zeigt das Handy seinen Dialog. Erlaubt der Nutzer den Standort, kommt das Wetter automatisch und die Vorschläge folgen.
//  - Kein Wetter vom Deutschen Wetterdienst (Standort verweigert, „selbst wählen“, nicht abrufbar):
//    „Wie ist das Wetter?“. Ein Tipp wählt das Wetter und zeigt gleich die Vorschläge.
export function WeatherStep({ step, onChooseWeather }: WeatherStepProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { access, allowLocation, chooseManualWeather } = useWeather();

  if (step === 'explain') {
    return (
      <LocationExplainer
        onAllow={() => void allowLocation()}
        onDecline={() => void chooseManualWeather()}
      />
    );
  }

  return (
    <WeatherCard>
      <Text style={styles.title} accessibilityRole="header">
        {t('weather.manual.title')}
      </Text>
      <Text style={styles.hint}>
        {access === 'granted' ? t('weather.manual.hintUnavailable') : t('weather.manual.hint')}
      </Text>
      <WeatherChips value={null} onChange={onChooseWeather} />
      {access !== 'granted' && access !== 'checking' && <AllowLocationLink access={access} />}
    </WeatherCard>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.xl,
      lineHeight: lineHeight.xl,
      color: colors.text,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.textMuted,
    },
  });
