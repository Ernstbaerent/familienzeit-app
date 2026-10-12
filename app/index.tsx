import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHistory } from '@/features/history/HistoryContext';
import { useProfiles } from '@/features/profiles/ProfilesContext';
import type { ParentEnergy, TimeKey } from '@/features/suggestions/conditions';
import { toSelectionParams } from '@/features/suggestions/selection';
import { useSelectedChildren } from '@/features/suggestions/SelectedChildrenContext';
import { StartScreen } from '@/features/suggestions/StartScreen';
import { buildStartSelection } from '@/features/suggestions/startState';
import { useWeatherRefresh } from '@/features/weather/WeatherProvider';
import type { Theme } from '@/lib/theme';
import { useThemedStyles } from '@/lib/useThemedStyles';

// Der Start mit Auswahl (DESIGN.md, Entscheidung 1): Kinder, Zeit, Energie, ein Tipp bis zu den Vorschlägen.
export default function HomeScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { status: profilesStatus, profiles } = useProfiles();
  const { status: selectionStatus, childIds, toggleChild } = useSelectedChildren();
  const { entries: historyEntries } = useHistory();

  // Zeit und Energie werden nicht gemerkt (Entscheidung 4). Sie bleiben nur stehen, solange dieser Bildschirm
  // offen ist: Der Start bleibt beim Öffnen der Vorschläge im Hintergrund und kommt beim Zurück unverändert wieder.
  const [time, setTime] = useState<TimeKey | null>(null);
  const [parentEnergy, setParentEnergy] = useState<ParentEnergy | null>(null);

  // Wetter schon jetzt vorladen, damit es bei den Vorschlägen bereitliegt. Das geschieht nur, wenn die Erlaubnis für
  // den Standort schon da ist: Beim Öffnen wird nie nach ihr gefragt (Entscheidung 7, Details: docs/weather.md).
  useWeatherRefresh();

  // Solange Profile und gemerkte Auswahl vom Gerät gelesen werden, bleibt der Bildschirm leer (dauert Millisekunden).
  if (profilesStatus === 'loading' || selectionStatus === 'loading') {
    return <SafeAreaView style={styles.screen} />;
  }

  // Ohne Kind gibt es kein Alter und damit keine Vorschläge: erst ein Kind anlegen.
  if (profiles.length === 0) return <Redirect href="/children/new" />;

  function showSuggestions() {
    // `null`, wenn der Knopf eigentlich gesperrt ist (kein Kind, keine Zeit).
    const selection = buildStartSelection({ childIds, time, parentEnergy }, profiles);
    if (!selection) return;
    router.push({ pathname: '/suggestions/results', params: toSelectionParams(selection) });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StartScreen
        profiles={profiles}
        selectedChildIds={childIds}
        time={time}
        parentEnergy={parentEnergy}
        hasHistory={historyEntries.length > 0}
        onToggleChild={toggleChild}
        onEditChild={(id) => router.push({ pathname: '/children/[id]', params: { id } })}
        onAddChild={() => router.push('/children/new')}
        onSelectTime={setTime}
        onSelectEnergy={setParentEnergy}
        onStart={showSuggestions}
        onOpenHistory={() => router.push('/history')}
      />
    </SafeAreaView>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
