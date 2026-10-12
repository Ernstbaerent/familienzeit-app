import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import type { AllergenKey } from './materials';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Allergen-Box direkt unter den Eckdaten. Sie erscheint NUR, wenn aus dem Material Allergene erkannt wurden
// (`getAllergens`). Es gibt nie eine Aussage wie „frei von Allergenen“: Eine Liste, die nichts findet, beweist nichts.
// Unter der Box steht dauerhaft der Satz „Bei Allergien bitte die Zutatenlisten prüfen.“ (immer mit der Box, nie ohne).
export function AllergenNotice({ allergens }: { allergens: readonly AllergenKey[] }) {
  const { t } = useTranslation();
  const { styles } = useThemedStyles(createStyles);
  if (allergens.length === 0) return null;
  return (
    <View style={styles.group}>
      <NoticeBox icon="warning-outline" title={t('detail.allergensTitle')}>
        <Text style={styles.boxText}>
          {t('detail.allergensText', { list: allergens.map((allergen) => t(`allergens.${allergen}`)).join(', ') })}
        </Text>
      </NoticeBox>
      <Text style={styles.note}>{t('detail.allergensNote')}</Text>
    </View>
  );
}

type SafetyNoticeProps = {
  withAdults: boolean; // „Mit Erwachsenen“ (needsAdults, dieselbe Regel wie Punkt 2 der Sicherheits-Checkliste)
  note?: string; // der Sicherheitshinweis der Aktivität
};

// Sicherheitsbox vor Material und Anleitung (anders als im PDF, dort steht sie am Ende). Nur, wo nötig: mit „Mit Erwachsenen“
// und/oder dem Sicherheitshinweis der Aktivität.
export function SafetyNotice({ withAdults, note }: SafetyNoticeProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  if (!withAdults && !note) return null;
  return (
    <NoticeBox icon="shield-checkmark-outline" title={t('detail.safetyTitle')}>
      {withAdults && (
        <View style={styles.badge}>
          <Ionicons
            name="people-outline"
            size={iconSize.md}
            color={colors.warning}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.badgeText}>{t('detail.withAdults')}</Text>
        </View>
      )}
      {note ? <Text style={styles.boxText}>{note}</Text> : null}
    </NoticeBox>
  );
}

// Hervorgehobene Box: warme Fläche (Honig-Ton), Rahmen und Überschrift in der Warnfarbe. Deutlich, aber ohne Alarm-Rot
// (kein `danger`). Allergene und Sicherheit unterscheiden sich durch Symbol und Titel, nicht durch die Farbe.
function NoticeBox({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const { styles, colors } = useThemedStyles(createStyles);
  return (
    <View style={styles.box}>
      <View style={styles.boxHeader}>
        <Ionicons
          name={icon}
          size={iconSize.md}
          color={colors.warning}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.boxTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    group: {
      gap: spacing.sm,
    },
    box: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.tile,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.warningSurface,
    },
    boxHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    boxTitle: {
      flex: 1,
      fontFamily: fonts.title,
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      color: colors.warning,
    },
    // Text in der Box in Lesegröße: Das ist das, was man vor dem Anfangen lesen soll.
    boxText: {
      fontFamily: fonts.body,
      fontSize: fontSize.reading,
      lineHeight: lineHeight.reading,
      color: colors.text,
    },
    // Der dauerhafte Satz unter der Allergen-Box.
    note: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.textMuted,
    },
    badge: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.card,
    },
    badgeText: {
      flexShrink: 1,
      fontFamily: fonts.bodyStrong,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.warning,
    },
  }),
});
