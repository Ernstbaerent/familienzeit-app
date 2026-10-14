import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/Section';
import { fonts, fontSize, iconSize, lineHeight, radius, spacing, type Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

import { hoursView } from './hoursDisplay';
import type { PlaceRow } from './placeRow';

type PlaceHoursProps = {
  place: PlaceRow;
  now: Date; // beim Öffnen der Ortsseite eingefroren, bestimmt „heute“
};

// Abschnitt „Öffnungszeiten“ der Ortsseite (M10c): fester Wochenplan als Liste Montag bis Sonntag mit „heute“,
// sonst der Rohtext aus OpenStreetMap; dazu Saison und Hinweise („Öffnungszeiten vorher prüfen“, beim Kino Programm und Altersfreigabe).
// Ohne Bibliothek: Den Wochenplan hat der Import vorbereitet (docs/orte.md, „Öffnungszeiten“).
export function PlaceHours({ place, now }: PlaceHoursProps) {
  const { t } = useTranslation();
  const { styles, colors } = useThemedStyles(createStyles);
  const view = hoursView(t, place, now);

  return (
    <Section title={t('places.detail.hoursTitle')}>
      {view.week && (
        <View style={styles.card}>
          {view.week.map((row) => (
            <View
              key={row.day}
              style={[styles.dayRow, row.isToday && styles.dayRowToday]}
              accessible
              accessibilityLabel={t(row.isToday ? 'places.detail.todayLabel' : 'places.detail.dayLabel', {
                day: row.dayName,
                value: row.value,
              })}
            >
              <Text style={[styles.dayName, row.isToday && styles.strong]}>
                {row.dayName}
                {row.isToday ? <Text style={styles.todayTag}>{` · ${t('places.detail.today')}`}</Text> : null}
              </Text>
              <Text style={[styles.dayValue, row.closed && styles.muted, row.isToday && styles.strong]}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}

      {view.raw && (
        <View style={styles.card}>
          <Text style={styles.rawLabel}>{t('places.detail.rawLabel')}</Text>
          <Text style={styles.rawText} selectable>
            {view.raw}
          </Text>
        </View>
      )}

      {view.season && <Text style={styles.season}>{view.season}</Text>}

      {view.notes.length > 0 && (
        <View style={styles.notice}>
          {view.notes.map((note) => (
            <View key={note} style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={iconSize.md} color={colors.icon} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
// Heute: Sand-Fläche, fette Schrift und das Wort „heute“ (die Farbe ist nie das einzige Merkmal).
const createStyles = ({ colors }: Theme) => ({
  colors,
  styles: StyleSheet.create({
    card: {
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.tile,
      backgroundColor: colors.card,
    },
    dayRow: {
      flexDirection: 'row',
      flexWrap: 'wrap', // bei großer Schrift steht die Zeit unter dem Tag, nichts wird abgeschnitten
      justifyContent: 'space-between',
      columnGap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    dayRowToday: {
      backgroundColor: colors.surface,
    },
    dayName: {
      flexShrink: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    dayValue: {
      flexShrink: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    strong: {
      fontFamily: fonts.bodyStrong,
    },
    muted: {
      color: colors.textMuted,
    },
    todayTag: {
      fontFamily: fonts.bodyStrong,
      color: colors.text,
    },
    rawLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.sm,
      lineHeight: lineHeight.sm,
      color: colors.textMuted,
      paddingHorizontal: spacing.sm,
    },
    rawText: {
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.xs,
    },
    season: {
      fontFamily: fonts.bodyMedium,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
    notice: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.tile,
      backgroundColor: colors.surface,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    noteText: {
      flexShrink: 1,
      fontFamily: fonts.body,
      fontSize: fontSize.md,
      lineHeight: lineHeight.md,
      color: colors.text,
    },
  }),
});
