import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, iconSize, lineHeight, radius, spacing } from '@/lib/theme';

import type { Weather } from '../suggestions/conditions';
import { AllowLocationLink } from './AllowLocationLink';
import { formatClock } from './formatClock';
import { LocationExplainer } from './LocationExplainer';
import type { WeatherSituation } from './situation';
import { WeatherChips } from './WeatherChips';
import { WeatherIcon } from './WeatherIcon';
import { useWeather } from './WeatherProvider';
import { describeWarning, describeWeather } from './weatherText';

type WeatherSummaryProps = {
  situation: WeatherSituation;
  now: Date;
  manualWeather: Weather | null; // `null` = Wetter kommt automatisch
  hasAutomatic: boolean; // gibt es Wetter vom Deutschen Wetterdienst, das man wieder wählen kann?
  onManualWeatherChange: (weather: Weather | null) => void;
};

// Zeigt auf dem Ergebnis-Bildschirm, welches Wetter die App angenommen hat (z. B. „Bewölkt, Regen ab 15 Uhr“),
// mit Quelle. Dazu: Wetter von Hand ändern (auch wenn der Standort klappt) und Standort nachträglich erlauben.
export function WeatherSummary({
  situation,
  now,
  manualWeather,
  hasAutomatic,
  onManualWeatherChange,
}: WeatherSummaryProps) {
  const { t } = useTranslation();
  const { access, allowLocation, chooseManualWeather } = useWeather();
  const [editing, setEditing] = useState(false);
  const [explaining, setExplaining] = useState(false);

  function choose(weather: Weather | null) {
    onManualWeatherChange(weather);
    setEditing(false);
  }

  const warning = describeWarning(t, situation, now);
  const canAllowLocation = access !== 'checking' && access !== 'granted';

  return (
    <View style={styles.card}>
      <View style={styles.row} accessibilityLiveRegion="polite">
        <WeatherIcon weather={situation.weather} size="lg" />
        <View style={styles.body}>
          <Text style={styles.line}>{describeWeather(t, situation)}</Text>
          {situation.hasDwdData && <Text style={styles.meta}>{t('weather.source')}</Text>}
          {situation.stale && situation.asOf && (
            <Text style={styles.meta}>
              {t('weather.stale', { time: formatClock(t, situation.asOf) })}
            </Text>
          )}
        </View>
      </View>

      {warning !== '' && (
        <View style={styles.warning}>
          <Ionicons
            name="warning-outline"
            size={iconSize.md}
            color={colors.warning}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.body}>
            <Text style={styles.warningText}>{warning}</Text>
            <Text style={styles.meta}>{t('weather.warning.effect')}</Text>
          </View>
        </View>
      )}

      <View style={styles.links}>
        <Pressable
          onPress={() => setEditing((current) => !current)}
          accessibilityRole="button"
          accessibilityState={{ expanded: editing }}
          style={styles.link}
        >
          <Text style={styles.linkText}>{t('weather.change')}</Text>
        </Pressable>
        {canAllowLocation && !explaining && (
          <AllowLocationLink access={access} onExplain={() => setExplaining(true)} />
        )}
      </View>

      {editing && (
        <WeatherChips
          value={manualWeather}
          onChange={choose}
          onAutomatic={hasAutomatic ? () => choose(null) : undefined}
        />
      )}

      {explaining && (
        <LocationExplainer
          onAllow={() => {
            setExplaining(false);
            void allowLocation();
          }}
          onDecline={() => {
            setExplaining(false);
            void chooseManualWeather();
          }}
        />
      )}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningText: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.warning,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
  },
  link: {
    minHeight: 44, // Touch-Ziel mindestens 44
    justifyContent: 'center',
  },
  linkText: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
