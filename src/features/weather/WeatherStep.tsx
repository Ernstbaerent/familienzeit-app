import { useTranslation } from 'react-i18next';

import { Section } from '@/components/Section';

import type { Weather } from '../suggestions/conditions';
import { AllowLocationLink } from './AllowLocationLink';
import { LocationExplainer } from './LocationExplainer';
import { useWeather } from './WeatherProvider';
import { WeatherChips } from './WeatherChips';

type WeatherStepProps = {
  step: 'explain' | 'manual'; // welchen Schritt `getWeatherStep` verlangt (manualWeather.ts)
  onChooseWeather: (weather: Weather) => void;
};

// Der Wetter-Schritt vor den Vorschlägen (DESIGN.md, Entscheidung 7 und 22). Er erscheint erst nach dem Tipp auf den
// Hauptknopf, nie auf dem Start, und nur, wenn er nötig ist:
//  - Standort noch nie gefragt: kurze Erklärung mit „Standort erlauben“ / „Wetter selbst wählen“. Erst nach „Standort erlauben“
//    zeigt das Handy seinen Dialog. Erlaubt der Nutzer den Standort, kommt das Wetter automatisch und die Vorschläge folgen.
//  - Kein Wetter vom Deutschen Wetterdienst (Standort verweigert, „selbst wählen“, nicht abrufbar):
//    „Wie ist das Wetter?“. Ein Tipp wählt das Wetter und zeigt gleich die Vorschläge.
export function WeatherStep({ step, onChooseWeather }: WeatherStepProps) {
  const { t } = useTranslation();
  const { access, allowLocation, chooseManualWeather } = useWeather();

  if (step === 'explain') {
    return (
      <LocationExplainer
        onAllow={() => void allowLocation()}
        onDecline={() => void chooseManualWeather()}
      />
    );
  }

  return (
    <Section
      title={t('weather.manual.title')}
      hint={access === 'granted' ? t('weather.manual.hintUnavailable') : t('weather.manual.hint')}
    >
      <WeatherChips value={null} onChange={onChooseWeather} />
      {access !== 'granted' && access !== 'checking' && <AllowLocationLink access={access} />}
    </Section>
  );
}
