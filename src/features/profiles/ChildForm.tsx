import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { colors, fontSize, lineHeight, radius, spacing } from '@/lib/theme';

import { dislikeKeys, interestKeys } from './preferences';
import {
  getBirthYearOptions,
  isBirthValid,
  maxNicknameLength,
  monthKeys,
  normalizeNickname,
  toggleDislike,
  toggleInterest,
  type ChildDraft,
  type ChildProfile,
  type Preferences,
} from './profiles';

type ChildFormProps = {
  // Beim Bearbeiten das bestehende Profil, beim Anlegen weglassen.
  initial?: ChildProfile;
  // Optionaler Block über dem Formular (z. B. Willkommenstext).
  header?: ReactNode;
  // Schlägt das Speichern fehl, einen Fehler werfen: das Formular zeigt dann eine Meldung.
  onSubmit: (draft: ChildDraft) => Promise<void>;
  // Nur beim Bearbeiten: zeigt den Löschen-Knopf.
  onDelete?: () => void;
};

// Pflicht sind nur Geburtsjahr und -monat. Spitzname, Interessen und Abneigungen sind freiwillig.
export function ChildForm({ initial, header, onSubmit, onDelete }: ChildFormProps) {
  const { t } = useTranslation();
  // „Jetzt“ einmal beim Öffnen festhalten, damit sich die Auswahl nicht während der Eingabe ändert.
  const [now] = useState(() => new Date());

  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [birthYear, setBirthYear] = useState<number | null>(initial?.birthYear ?? null);
  const [birthMonth, setBirthMonth] = useState<number | null>(initial?.birthMonth ?? null);
  const [preferences, setPreferences] = useState<Preferences>({
    interests: initial?.interests ?? [],
    dislikes: initial?.dislikes ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const yearOptions = getBirthYearOptions(now, initial?.birthYear);
  const birthValid = isBirthValid(birthYear, birthMonth, now);

  function selectYear(year: number) {
    setBirthYear(year);
    // Läge der gewählte Monat mit dem neuen Jahr in der Zukunft, muss er neu gewählt werden.
    if (birthMonth !== null && !isBirthValid(year, birthMonth, now)) {
      setBirthMonth(null);
    }
  }

  async function handleSubmit() {
    if (saving || birthYear === null || birthMonth === null || !birthValid) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await onSubmit({
        nickname: normalizeNickname(nickname),
        birthYear,
        birthMonth,
        interests: preferences.interests,
        dislikes: preferences.dislikes,
      });
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {header}

      <Section title={t('form.nickname')} tag={t('form.optional')} hint={t('form.nicknameHint')}>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          maxLength={maxNicknameLength}
          placeholder={t('form.nicknamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('form.nickname')}
          returnKeyType="done"
          style={styles.input}
        />
      </Section>

      <Section title={t('form.birth')} tag={t('form.required')} hint={t('form.birthHint')}>
        <Text style={styles.subTitle}>{t('form.year')}</Text>
        <View style={styles.chipRow}>
          {yearOptions.map((year) => (
            <Chip
              key={year}
              role="radio"
              label={String(year)}
              selected={birthYear === year}
              onPress={() => selectYear(year)}
            />
          ))}
        </View>
        <Text style={styles.subTitle}>{t('form.month')}</Text>
        <View style={styles.chipRow}>
          {monthKeys.map((monthKey, index) => {
            const month = index + 1;
            return (
              <Chip
                key={monthKey}
                role="radio"
                label={t(`months.${monthKey}`)}
                selected={birthMonth === month}
                // Im aktuellen Jahr sind spätere Monate noch nicht möglich.
                disabled={birthYear !== null && !isBirthValid(birthYear, month, now)}
                onPress={() => setBirthMonth(month)}
              />
            );
          })}
        </View>
      </Section>

      <Section
        title={t('form.interests')}
        tag={t('form.optional')}
        hint={t('form.interestsHint')}
      >
        <View style={styles.chipRow}>
          {interestKeys.map((key) => (
            <Chip
              key={key}
              label={t(`preferences.${key}`)}
              selected={preferences.interests.includes(key)}
              onPress={() => setPreferences((current) => toggleInterest(current, key))}
            />
          ))}
        </View>
      </Section>

      <Section title={t('form.dislikes')} tag={t('form.optional')} hint={t('form.dislikesHint')}>
        <View style={styles.chipRow}>
          {dislikeKeys.map((key) => (
            <Chip
              key={key}
              label={t(`preferences.${key}`)}
              selected={preferences.dislikes.includes(key)}
              onPress={() => setPreferences((current) => toggleDislike(current, key))}
            />
          ))}
        </View>
      </Section>

      <View style={styles.actions}>
        {!birthValid && <Text style={styles.hint}>{t('form.birthMissing')}</Text>}
        {saveFailed && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {t('form.saveError')}
          </Text>
        )}
        <Button label={t('form.save')} onPress={handleSubmit} disabled={!birthValid || saving} />
        {onDelete && <Button label={t('children.delete')} variant="danger" onPress={onDelete} />}
      </View>
    </ScrollView>
  );
}

type SectionProps = {
  title: string;
  tag: string; // „(Pflicht)“ oder „(freiwillig)“
  hint?: string;
  children: ReactNode;
};

function Section({ title, tag, hint, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
        {' '}
        <Text style={styles.tag}>{tag}</Text>
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '700',
    color: colors.text,
  },
  tag: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '400',
    color: colors.textMuted,
  },
  subTitle: {
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
    fontWeight: '600',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
  error: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.danger,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: fontSize.md,
    color: colors.text,
  },
  actions: {
    gap: spacing.sm,
  },
});
