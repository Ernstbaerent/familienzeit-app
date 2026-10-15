import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Section } from '@/components/Section';
import { formatAge } from '@/features/profiles/formatAge';
import type { ChildProfile } from '@/features/profiles/profiles';
import {
  fonts,
  fontSize,
  iconSize,
  lineHeight,
  radius,
  size,
  spacing,
  useTheme,
  type Theme,
} from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { ChildTile } from './ChildTile';
import {
  parentEnergyKeys,
  timeKeys,
  type ParentEnergy,
  type TimeKey,
} from './conditions';
import { MoodPlaceholder } from './MoodPlaceholder';
import {
  childTileMinWidth,
  energyTileMinWidth,
  getCellWidth,
  getColumns,
  timeChipMinWidth,
} from './startLayout';
import { getStartIssues, type StartIssue } from './startState';

type IconName = ComponentProps<typeof Ionicons>['name'];

const energyIcons: Record<ParentEnergy, IconName> = {
  tired: 'battery-dead-outline',
  normal: 'battery-half-outline',
  fit: 'battery-full-outline',
};

const issueTextKeys = {
  children: 'home.issueChildren',
  time: 'home.issueTime',
} as const satisfies Record<StartIssue, string>;

type StartScreenProps = {
  profiles: readonly ChildProfile[];
  selectedChildIds: readonly string[];
  time: TimeKey | null;
  parentEnergy: ParentEnergy | null; // freiwillig, nie vorbelegt
  hasHistory: boolean; // der Verlauf-Knopf erscheint erst, wenn es Einträge gibt
  onToggleChild: (id: string) => void;
  onEditChild: (id: string) => void;
  onAddChild: () => void;
  onSelectTime: (time: TimeKey) => void;
  onSelectEnergy: (energy: ParentEnergy | null) => void;
  onStart: () => void;
  onOpenHistory: () => void;
};

// Die Wortmarke: Petrol auf hellem Grund, Leinen auf dunklem (der Dunkelmodus ist bis D5 aus, die Datei ist schon vorbereitet).
const wordmarkSources = {
  light: require('../../../assets/logo/wordmark-petrol.png'),
  dark: require('../../../assets/logo/wordmark-linen.png'),
};

// Der Start mit Auswahl (DESIGN.md, Bildschirm 01): Kinder, Zeit, Energie und der Hauptknopf auf einem Bildschirm.
// Nur Anzeige: Der Zustand (Auswahl, Navigation) liegt in app/index.tsx, damit sich das hier ohne Handy testen lässt.
export function StartScreen({
  profiles,
  selectedChildIds,
  time,
  parentEnergy,
  hasHistory,
  onToggleChild,
  onEditChild,
  onAddChild,
  onSelectTime,
  onSelectEnergy,
  onStart,
  onOpenHistory,
}: StartScreenProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const { styles, colors } = useThemedStyles(createStyles);
  const { width, fontScale } = useWindowDimensions();

  // Raster: Aus Fensterbreite und Systemschrift ergibt sich, wie viele Zellen nebeneinander passen.
  // Mehr Kinder brechen in die nächste Zeile um, große Schrift gibt weniger Spalten. Nichts wird abgeschnitten.
  const contentWidth = width - 2 * spacing.lg;
  const grid = (minWidth: number, maxColumns: number) => {
    const columns = getColumns({
      containerWidth: contentWidth,
      gap: spacing.sm,
      minWidth,
      maxColumns,
      fontScale,
    });
    return getCellWidth(contentWidth, columns, spacing.sm);
  };
  const tileWidth = grid(childTileMinWidth, 3);
  const timeWidth = grid(timeChipMinWidth, 2);
  const energyWidth = grid(energyTileMinWidth, 3);

  const issues = getStartIssues({ childIds: selectedChildIds, time });
  const canStart = issues.length === 0;
  const issueTexts = issues.map((issue) => t(issueTextKeys[issue]));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {/* Die Wortmarke „miki“ (assets/logo/, DESIGN.md Entscheidung 55). Für die Sprachausgabe heißt sie wie die App („Miki“, aus app.name in de/en). */}
        <ExpoImage
          source={wordmarkSources[scheme]}
          style={styles.wordmark}
          contentFit="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('app.name')}
        />
        {hasHistory && (
          <Pressable
            onPress={onOpenHistory}
            accessibilityRole="button"
            accessibilityLabel={t('home.history')}
            style={styles.historyButton}
          >
            <Ionicons name="time-outline" size={iconSize.md} color={colors.text} />
            <Text style={styles.historyLabel}>{t('home.history')}</Text>
          </Pressable>
        )}
      </View>

      <MoodPlaceholder />

      <Text style={styles.title} accessibilityRole="header">
        {t('home.title')}
      </Text>

      <View style={styles.row}>
        {profiles.map((child, index) => {
          const name = child.nickname ?? t('children.defaultName', { number: index + 1 });
          const age = formatAge(t, child);
          return (
            <ChildTile
              key={child.id}
              name={name}
              age={age}
              // Ohne Spitzname steht die Nummer im Kreis (dieselbe wie im Namen „Kind 1“).
              initial={
                child.nickname
                  ? (Array.from(child.nickname)[0] ?? '').toLocaleUpperCase()
                  : String(index + 1)
              }
              selected={selectedChildIds.includes(child.id)}
              label={t('home.childLabel', { name, age })}
              editLabel={
                child.nickname
                  ? t('home.editChild', { name })
                  : t('home.editChildUnnamed', { age })
              }
              onToggle={() => onToggleChild(child.id)}
              onEdit={() => onEditChild(child.id)}
              width={tileWidth}
            />
          );
        })}
        <Pressable
          onPress={onAddChild}
          accessibilityRole="button"
          style={[styles.addTile, { width: tileWidth }]}
        >
          <Ionicons name="add-outline" size={iconSize.md} color={colors.icon} />
          <Text style={styles.addLabel}>{t('children.add')}</Text>
        </Pressable>
      </View>

      <Section title={t('home.timeTitle')}>
        <View style={styles.row} accessibilityRole="radiogroup">
          {timeKeys.map((key) => (
            <Chip
              key={key}
              role="radio"
              label={t(`time.${key}`)}
              selected={time === key}
              onPress={() => onSelectTime(key)}
              style={{ width: timeWidth }}
            />
          ))}
        </View>
      </Section>

      <Section title={t('home.energyTitle')} tag={t('form.optional')}>
        <View style={styles.row} accessibilityRole="radiogroup">
          {parentEnergyKeys.map((key) => (
            <Chip
              key={key}
              role="radio"
              stacked
              icon={energyIcons[key]}
              label={t(`parentEnergy.${key}`)}
              selected={parentEnergy === key}
              // Nochmal tippen hebt die Auswahl auf (Energie ist freiwillig).
              accessibilityHint={parentEnergy === key ? t('home.energyClear') : undefined}
              onPress={() => onSelectEnergy(parentEnergy === key ? null : key)}
              style={{ width: energyWidth }}
            />
          ))}
        </View>
      </Section>

      <View style={styles.actions}>
        <Button
          label={t('home.start')}
          size="large"
          icon="arrow-forward-outline"
          iconFlipsInRTL
          disabled={!canStart}
          accessibilityHint={canStart ? undefined : issueTexts.join(' ')}
          onPress={onStart}
        />
        {/* Solange der Knopf gesperrt ist, steht hier, was fehlt (jeder fehlende Grund eine Zeile). */}
        {issueTexts.map((text) => (
          <Text key={text} style={styles.issue} accessibilityLiveRegion="polite">
            {text}
          </Text>
        ))}
        <Text style={styles.privacy}>{t('home.privacy')}</Text>
      </View>
    </ScrollView>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    // Breite und Höhe der Wortmarke (Seitenverhältnis 2398 : 1267 der Datei), nicht im Theme. Wächst nicht mit der Systemschrift: Es ist ein Bild.
    wordmark: {
      width: 76,
      height: 40,
    },
    historyButton: {
      minHeight: size.touch,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
    },
    historyLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    title: {
      fontFamily: fonts.title,
      fontSize: fontSize.xxl,
      lineHeight: lineHeight.xxl,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    addTile: {
      minHeight: size.touch,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.tile,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    addLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      textAlign: 'center',
      color: colors.text,
    },
    actions: {
      gap: spacing.sm,
    },
    issue: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      textAlign: 'center',
      color: colors.textMuted,
    },
    privacy: {
      fontFamily: fonts.body,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      textAlign: 'center',
      color: colors.textMuted,
    },
  }),
});
