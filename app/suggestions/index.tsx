import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Section } from '@/components/Section';
import { formatAge } from '@/features/profiles/formatAge';
import type { ChildProfile } from '@/features/profiles/profiles';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import {
  parentEnergyKeys,
  timeKeys,
  type ParentEnergy,
  type TimeKey,
  type Weather,
} from '@/features/suggestions/conditions';
import { toSelectionParams } from '@/features/suggestions/selection';
import { needsManualWeather } from '@/features/weather/manualWeather';
import { useWeather, useWeatherRefresh } from '@/features/weather/WeatherProvider';
import { WeatherSection } from '@/features/weather/WeatherSection';
import { colors, fontSize, lineHeight, spacing } from '@/lib/theme';

// „Was machen wir?“: Kinder, Zeit und (freiwillig) Energie wählen, dann zu den Vorschlägen.
export default function SuggestionsScreen() {
  const { status, profiles } = useProfiles();
  if (status === 'loading') return null;
  // Ohne Kind gibt es kein Alter und damit keine Vorschläge.
  if (profiles.length === 0) return <Redirect href="/children/new" />;
  return <SelectionForm profiles={profiles} />;
}

function SelectionForm({ profiles }: { profiles: ChildProfile[] }) {
  const { t } = useTranslation();
  const router = useRouter();

  // Vorausgewählt: alle Kinder.
  const [childIds, setChildIds] = useState(() => profiles.map((child) => child.id));
  const [time, setTime] = useState<TimeKey | null>(null);
  const [parentEnergy, setParentEnergy] = useState<ParentEnergy | null>(null);
  // Wetter von Hand („Wie ist das Wetter?“). Gilt nur, wenn die App das Wetter nicht selbst holen kann
  // (Standort verweigert oder Wetter nicht abrufbar). „Bewölkt“ ist die neutrale Vorauswahl.
  const [manualWeather, setManualWeather] = useState<Weather>('cloudy');
  const { access, status } = useWeather();
  // Holt das Wetter schon jetzt, damit es bei den Vorschlägen bereitliegt (dank Zwischenspeicher meist ohne Abruf).
  useWeatherRefresh();

  // Nur Kinder, die es noch gibt (falls zwischendurch eins gelöscht wurde).
  const selectedIds = childIds.filter((id) => profiles.some((child) => child.id === id));
  const childrenMissing = selectedIds.length === 0;
  const canSubmit = !childrenMissing && time !== null;

  function toggleChild(id: string) {
    setChildIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function showSuggestions() {
    if (childrenMissing || time === null) return;
    router.push({
      pathname: '/suggestions/results',
      params: toSelectionParams({
        childIds: selectedIds,
        time,
        parentEnergy: parentEnergy ?? undefined,
        weather: needsManualWeather(access, status) ? manualWeather : undefined,
      }),
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t('suggest.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={t('suggest.childrenTitle')}>
          <View style={styles.chipRow}>
            {profiles.map((child, index) => (
              <Chip
                key={child.id}
                label={t('suggest.childLabel', {
                  name: child.nickname ?? t('children.defaultName', { number: index + 1 }),
                  age: formatAge(t, child),
                })}
                selected={selectedIds.includes(child.id)}
                onPress={() => toggleChild(child.id)}
              />
            ))}
          </View>
        </Section>

        <Section title={t('suggest.timeTitle')} tag={t('form.required')}>
          <View style={styles.chipRow}>
            {timeKeys.map((key) => (
              <Chip
                key={key}
                role="radio"
                label={t(`time.${key}`)}
                selected={time === key}
                onPress={() => setTime(key)}
              />
            ))}
          </View>
        </Section>

        <Section
          title={t('suggest.energyTitle')}
          tag={t('form.optional')}
          hint={t('suggest.energyHint')}
        >
          <View style={styles.chipRow}>
            {parentEnergyKeys.map((key) => (
              <Chip
                key={key}
                role="radio"
                label={t(`parentEnergy.${key}`)}
                selected={parentEnergy === key}
                // Nochmal tippen hebt die Auswahl auf (Energie ist freiwillig).
                onPress={() => setParentEnergy((current) => (current === key ? null : key))}
              />
            ))}
          </View>
        </Section>

        <WeatherSection manualWeather={manualWeather} onManualWeatherChange={setManualWeather} />

        <View style={styles.actions}>
          {childrenMissing && <Text style={styles.hint}>{t('suggest.childrenMissing')}</Text>}
          {time === null && <Text style={styles.hint}>{t('suggest.timeMissing')}</Text>}
          <Button
            label={t('suggest.show')}
            size="large"
            onPress={showSuggestions}
            disabled={!canSubmit}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Abstände nur mit Horizontal/Vertical oder Start/End, nie Left/Right (wegen rechts-nach-links).
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.textMuted,
  },
});
