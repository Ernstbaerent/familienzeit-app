// Texte zum Wetter in der App-Sprache, z. B. „Bewölkt, Regen ab 15 Uhr · 11 °C“.
// Hier steht nur das Zusammensetzen; die Wörter stehen in src/locales (Bereich `weather`).

import type { TFunction } from 'i18next';

import type { Weather } from '../suggestions/conditions';
import { formatClock } from './formatClock';
import type { WeatherSituation } from './situation';

function weatherName(t: TFunction, weather: Weather): string {
  return t(`weather.names.${weather}`);
}

// Die Hauptzeile: welches Wetter die App angenommen hat.
export function describeWeather(t: TFunction, situation: WeatherSituation): string {
  const name = weatherName(t, situation.weather);
  let text: string;
  if (situation.source === 'assumed') {
    text = t('weather.line.assumed', { weather: name });
  } else if (situation.source === 'manual') {
    text = t('weather.line.manual', { weather: name });
  } else if (situation.change) {
    // Wird es später schlimmer: „Bewölkt, Regen ab 15 Uhr“
    text = t('weather.line.withChange', {
      now: weatherName(t, situation.current),
      change: weatherName(t, situation.change.weather),
      time: formatClock(t, situation.change.from),
    });
  } else {
    text = name;
  }

  if (situation.temperature && situation.source !== 'assumed') {
    const temperature = t('weather.temperature', { value: Math.round(situation.temperature.now) });
    text = t('weather.line.withTemperature', { text, temperature });
  }
  return text;
}

// Die Warnung, z. B. „Amtliche Gewitterwarnung bis 18 Uhr“. Leer, wenn es keine gibt.
export function describeWarning(t: TFunction, situation: WeatherSituation, now: Date): string {
  const warning = situation.warning;
  if (!warning) return '';
  const title = t(`weather.warning.${warning.kind}`);
  const hasStarted = warning.from.getTime() <= now.getTime();
  const from = formatClock(t, warning.from);
  const until = warning.until ? formatClock(t, warning.until) : null;

  let timing = '';
  if (!hasStarted && until) timing = t('weather.warning.fromUntil', { from, until });
  else if (!hasStarted) timing = t('weather.warning.from', { time: from });
  else if (until) timing = t('weather.warning.until', { time: until });
  return `${title} ${timing}`.trim();
}
