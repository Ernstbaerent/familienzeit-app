import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  fonts,
  fontSize,
  lineHeight,
  radius,
  size,
  spacing,
  type Theme,
} from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { formatClock } from './formatClock';
import type { WeatherSituation } from './situation';
import { WeatherIcon } from './WeatherIcon';
import { describeWeather } from './weatherText';

type WeatherBarProps =
  | { state: 'loading' }
  | {
      state: 'ready';
      situation: WeatherSituation;
      changeOpen: boolean; // ist „Wetter ändern“ gerade offen?
      onToggleChange: () => void;
    };

// Die feste Wetterzeile unter dem Kopf von „Eure Ideen“ (DESIGN.md, Bildschirm 02): Sand-Fläche mit Symbol, Wettertext
// („Bewölkt, Regen ab 15 Uhr · 11 °C“) und der Quelle. Sie bleibt beim Scrollen stehen. Dazu der Knopf „Ändern“, der „Wetter ändern“
// öffnet (Inhalt: WeatherPanel, im Scrollbereich, damit die feste Zeile auch bei großer Schrift klein bleibt).
// Solange das Wetter noch lädt, zeigt die Zeile einen Ladezustand (der Abruf hat ein Zeitlimit, siehe docs/weather.md).
export function WeatherBar(props: WeatherBarProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);

  if (props.state === 'loading') {
    return (
      <View style={styles.wrap}>
        <View style={styles.bar} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} accessible>
          <ActivityIndicator color={colors.icon} />
          <Text style={styles.line}>{t('weather.loading')}</Text>
        </View>
      </View>
    );
  }

  const { situation, changeOpen, onToggleChange } = props;
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <View style={styles.info} accessibilityLiveRegion="polite" accessible>
          <WeatherIcon weather={situation.weather} />
          <View style={styles.texts}>
            <Text style={styles.line}>{describeWeather(t, situation)}</Text>
            {situation.hasDwdData && <Text style={styles.meta}>{t('weather.source')}</Text>}
            {situation.stale && situation.asOf && (
              <Text style={styles.meta}>
                {t('weather.stale', { time: formatClock(t, situation.asOf) })}
              </Text>
            )}
          </View>
        </View>
        {/* Sichtbar „Ändern“, vorgelesen „Wetter ändern“ (enthält das sichtbare Wort). */}
        <Pressable
          onPress={onToggleChange}
          accessibilityRole="button"
          accessibilityLabel={t('weather.change')}
          accessibilityState={{ expanded: changeOpen }}
          style={styles.change}
        >
          <Text style={styles.changeLabel}>{t('weather.changeShort')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingStart: spacing.md,
      paddingEnd: spacing.sm,
      minHeight: size.touch,
      borderRadius: radius.tile,
      backgroundColor: colors.surface, // Sand: Flächen (Entscheidung 11)
    },
    info: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    texts: {
      flex: 1,
      gap: spacing.xs,
    },
    line: {
      flexShrink: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    meta: {
      fontFamily: fonts.body,
      fontSize: fontSize.xs,
      lineHeight: lineHeight.xs,
      color: colors.textMuted,
    },
    // Kleine weiße Pille auf der Sand-Fläche, mindestens 44 hoch.
    change: {
      minHeight: size.touch,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    changeLabel: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.text,
    },
  }),
});
