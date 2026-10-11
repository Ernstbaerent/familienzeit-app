import { createInstance } from 'i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

import { buildSituation, manualSituation, assumedSituation } from './situation';
import { describeWarning, describeWeather } from './weatherText';
import { makeAlert, makeData, makeRecord } from './testHelpers';

// Eine eigene i18next-Instanz mit den echten Texten. Die Zeit läuft in der Zeitzone des Rechners,
// deshalb werden die Uhrzeiten hier aus lokalen Zeiten gebaut statt aus festen UTC-Werten.
function translator(language: 'de' | 'en') {
  const i18n = createInstance();
  i18n.init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: language,
    interpolation: { escapeValue: false },
  });
  return i18n.t.bind(i18n);
}

const t = translator('de');
const tEn = translator('en');

const local = (hour: number, minute = 0) => new Date(2026, 9, 10, hour, minute).getTime();
const now = new Date(2026, 9, 10, 13, 30);

function situationWith(overrides: Parameters<typeof makeData>[0]) {
  const situation = buildSituation(
    makeData({ fetchedAt: now.getTime(), current: makeRecord({ time: now.getTime() }), ...overrides }),
    60,
    now,
  );
  if (!situation) throw new Error('keine Situation');
  return situation;
}

describe('Wettertext', () => {
  it('Regen kommt später: „Bewölkt, Regen ab 15 Uhr“, mit Temperatur', () => {
    const situation = situationWith({
      current: makeRecord({ time: now.getTime(), temperature: 11.2 }),
      forecast: [makeRecord({ time: local(15), condition: 'rain', precipitation: 1 })],
    });
    expect(describeWeather(t, situation)).toBe('Bewölkt, Regen ab 15 Uhr · 11 °C');
    expect(describeWeather(tEn, situation)).toBe('Cloudy, Rain from 15:00 · 11 °C');
  });

  it('keine Änderung: nur das Wetter', () => {
    const sunny = { cloudCover: 5, icon: 'clear-day', temperature: 24.6 };
    const situation = situationWith({ current: makeRecord({ time: now.getTime(), ...sunny }) });
    expect(describeWeather(t, situation)).toBe('Sonnig · 25 °C');
  });

  it('Zeit mit Minuten', () => {
    const situation = situationWith({
      forecast: [makeRecord({ time: local(15, 20), condition: 'thunderstorm', precipitation: 3 })],
    });
    expect(describeWeather(t, situation)).toBe('Bewölkt, Gewitter ab 15:20 Uhr · 12 °C');
  });

  it('Handwahl, auch mit Temperatur vom Wetterdienst', () => {
    expect(describeWeather(t, manualSituation('snow', null))).toBe('Eure Auswahl: Schnee');
    const base = situationWith({ current: makeRecord({ time: now.getTime(), temperature: -2 }) });
    expect(describeWeather(t, manualSituation('snow', base))).toBe('Eure Auswahl: Schnee · -2 °C');
  });

  it('nichts bekannt: sagt, dass wir bewölkt annehmen', () => {
    expect(describeWeather(t, assumedSituation())).toBe(
      'Wetter nicht abrufbar. Wir gehen von „Bewölkt“ aus.',
    );
    expect(describeWeather(tEn, assumedSituation())).toBe(
      'Weather unavailable. We assume “Cloudy”.',
    );
  });
});

describe('Warntext', () => {
  const warned = (onset: number, expires: number | null, kind: 'thunderstorm' | 'storm' | 'severe') =>
    situationWith({ alerts: [makeAlert({ kind, onset, expires })] });

  it('läuft schon, endet um 18 Uhr', () => {
    const situation = warned(local(12), local(18), 'thunderstorm');
    expect(describeWarning(t, situation, now)).toBe('Amtliche Gewitterwarnung bis 18 Uhr');
    expect(describeWarning(tEn, situation, now)).toBe('Official thunderstorm warning until 18:00');
  });

  it('beginnt später', () => {
    expect(describeWarning(t, warned(local(15), local(18), 'storm'), now)).toBe(
      'Amtliche Sturmwarnung von 15 Uhr bis 18 Uhr',
    );
    expect(describeWarning(t, warned(local(15), null, 'severe'), now)).toBe(
      'Amtliche Unwetterwarnung ab 15 Uhr',
    );
  });

  it('läuft schon und hat kein Ende', () => {
    expect(describeWarning(t, warned(local(12), null, 'thunderstorm'), now)).toBe('Amtliche Gewitterwarnung');
  });

  it('ohne Warnung leer', () => {
    expect(describeWarning(t, situationWith({}), now)).toBe('');
  });
});

describe('Texte sind in Deutsch und Englisch vollständig', () => {
  it('jeder Schlüssel im Bereich weather gibt es in beiden Sprachen', () => {
    const keys = (value: unknown, prefix = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`))
        : [prefix];
    expect(keys(en.weather)).toEqual(keys(de.weather));
  });
});
