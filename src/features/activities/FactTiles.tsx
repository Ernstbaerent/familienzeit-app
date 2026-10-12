import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { Activity, ActivitySetting } from './activities';
import { getFactTileWidths } from './detailLayout';
import { formatAgeRange } from './formatAgeRange';
import { formatDuration } from './formatDuration';

type IconName = ComponentProps<typeof Ionicons>['name'];

const costTextKeys = { 0: 'free', 1: 'low', 2: 'high' } as const;

// Symbole für drinnen, draußen und beides (nur Linien-Varianten, wie überall).
const settingIcons: Record<ActivitySetting, IconName> = {
  indoor: 'home-outline',
  outdoor: 'sunny-outline',
  both: 'partly-sunny-outline',
};

type Fact = { key: string; icon: IconName; label: string; value: string };

// Die Eckdaten als weiße Kacheln (DESIGN.md, Bildschirm 03): Dauer, Alter, Energie der Eltern, Kosten, drinnen/draußen.
// Zwei Spalten, bei großer Systemschrift eine; steht die letzte Kachel allein, füllt sie die Zeile (Raster: detailLayout.ts).
// Für die Sprachausgabe ist jede Kachel ein Satz („Dauer: 30–60 Min.“), das Symbol ist Dekoration.
// Nicht gebaut (Entscheidung 15): „davon 15 aktiv“ und Untertitel mit Namen der Kinder.
export function FactTiles({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  const { width, fontScale } = useWindowDimensions();

  const facts: Fact[] = [
    { key: 'duration', icon: 'time-outline', label: t('detail.facts.duration'), value: formatDuration(t, activity) },
    { key: 'age', icon: 'person-outline', label: t('detail.facts.age'), value: formatAgeRange(t, activity) },
    {
      key: 'energy',
      icon: 'flash-outline',
      label: t('detail.facts.energy'),
      value: t(`detail.energyValue.${activity.energy}`),
    },
    {
      key: 'cost',
      icon: 'cash-outline',
      label: t('detail.facts.cost'),
      value: t(`detail.costValue.${costTextKeys[activity.cost]}`),
    },
    {
      key: 'setting',
      icon: settingIcons[activity.setting],
      label: t('detail.facts.setting'),
      value: t(`detail.settingValue.${activity.setting}`),
    },
  ];

  // Inhaltsbreite: Fenster minus der Rand links und rechts (wie auf dem Start).
  const widths = getFactTileWidths({
    count: facts.length,
    containerWidth: width - 2 * spacing.lg,
    gap: spacing.md,
    fontScale,
  });

  return (
    <View style={styles.grid}>
      {facts.map((fact, index) => (
        <View
          key={fact.key}
          style={[styles.tile, { width: widths[index] }]}
          accessible
          accessibilityLabel={`${fact.label}: ${fact.value}`}
        >
          <Ionicons
            name={fact.icon}
            size={iconSize.md}
            color={colors.icon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.value}>{fact.value}</Text>
          <Text style={styles.label}>{fact.label}</Text>
        </View>
      ))}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    tile: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.tile,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    value: {
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
    },
  }),
});
