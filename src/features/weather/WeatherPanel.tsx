import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/Section';
import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { Weather } from '../suggestions/conditions';
import { AllowLocationLink } from './AllowLocationLink';
import { LocationExplainer } from './LocationExplainer';
import type { WeatherSituation } from './situation';
import { WeatherCard } from './WeatherCard';
import { WeatherChips } from './WeatherChips';
import { useWeather } from './WeatherProvider';
import { describeWarning } from './weatherText';

// Was unter der festen Wetterzeile aufklappt. Immer nur eines: „Wetter ändern“ oder die Erklärung zum Standort.
export type WeatherPanelMode = 'closed' | 'change' | 'explain';

type WeatherPanelProps = {
  situation: WeatherSituation;
  now: Date;
  mode: WeatherPanelMode;
  manualWeather: Weather | null; // `null` = Wetter kommt automatisch
  hasAutomatic: boolean; // gibt es Wetter vom Deutschen Wetterdienst, das man wieder wählen kann?
  onChooseWeather: (weather: Weather | null) => void;
  onModeChange: (mode: WeatherPanelMode) => void;
};

// Der Teil des Wetters, der mit den Karten scrollt (die feste Zeile steht in WeatherBar):
//  - die amtliche Warnung (wenn es eine gibt) mit dem Hinweis, was sie für die Vorschläge heißt,
//  - „Standort erlauben“, solange der Standort nicht erlaubt ist,
//  - „Wetter ändern“ (Handwahl, auch wenn der Standort klappt) und die Erklär-Karte zum Standort.
export function WeatherPanel({
  situation,
  now,
  mode,
  manualWeather,
  hasAutomatic,
  onChooseWeather,
  onModeChange,
}: WeatherPanelProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  const { access, allowLocation, chooseManualWeather } = useWeather();

  const warning = describeWarning(t, situation, now);
  const canAllowLocation = access !== 'checking' && access !== 'granted';
  const showsLocationLink = canAllowLocation && mode !== 'explain';

  if (warning === '' && !showsLocationLink && mode === 'closed') return null;

  return (
    <View style={styles.panel}>
      {warning !== '' && (
        <View style={styles.warning} accessibilityRole="alert">
          <Ionicons
            name="warning-outline"
            size={iconSize.md}
            color={colors.warning}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.warningTexts}>
            <Text style={styles.warningText}>{warning}</Text>
            <Text style={styles.warningEffect}>{t('weather.warning.effect')}</Text>
          </View>
        </View>
      )}

      {mode === 'change' && (
        <WeatherCard>
          <Section title={t('weather.change')}>
            <WeatherChips
              value={manualWeather}
              onChange={onChooseWeather}
              onAutomatic={hasAutomatic ? () => onChooseWeather(null) : undefined}
            />
          </Section>
        </WeatherCard>
      )}

      {showsLocationLink && (
        <AllowLocationLink access={access} onExplain={() => onModeChange('explain')} />
      )}

      {mode === 'explain' && (
        <LocationExplainer
          onAllow={() => {
            onModeChange('closed');
            void allowLocation();
          }}
          onDecline={() => {
            onModeChange('closed');
            void chooseManualWeather();
          }}
        />
      )}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    panel: {
      gap: spacing.md,
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.tile,
      backgroundColor: colors.warningSurface,
    },
    warningTexts: {
      flex: 1,
      gap: spacing.xs,
    },
    warningText: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.warning,
    },
    warningEffect: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.text,
    },
  }),
});
