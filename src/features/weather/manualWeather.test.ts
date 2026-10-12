import { getWeatherStep, needsManualWeather } from './manualWeather';

describe('Wann „Wie ist das Wetter?“ von Hand gefragt wird', () => {
  it('Standort verweigert oder „selbst wählen“: immer', () => {
    for (const access of ['declined', 'denied', 'blocked'] as const) {
      for (const status of ['loading', 'ready', 'unavailable'] as const) {
        expect(needsManualWeather(access, status)).toBe(true);
      }
    }
  });

  it('Standort erlaubt: nur, wenn das Wetter nicht zu bekommen ist', () => {
    expect(needsManualWeather('granted', 'unavailable')).toBe(true);
    expect(needsManualWeather('granted', 'loading')).toBe(false);
    expect(needsManualWeather('granted', 'ready')).toBe(false);
  });

  it('Noch nicht gefragt oder wird gelesen: die Erklär-Karte kommt zuerst, nicht beides', () => {
    expect(needsManualWeather('ask', 'unavailable')).toBe(false);
    expect(needsManualWeather('checking', 'loading')).toBe(false);
  });
});

describe('Wetter-Schritt nach dem Hauptknopf (Entscheidung 7)', () => {
  it('Standort noch nie gefragt: zuerst die Erklär-Karte', () => {
    expect(getWeatherStep('ask', 'unavailable', false)).toBe('explain');
  });

  it('Standort erlaubt und Wetter da (oder wird gerade geholt): kein Schritt, die Vorschläge kommen gleich', () => {
    expect(getWeatherStep('granted', 'ready', false)).toBeNull();
    expect(getWeatherStep('granted', 'loading', false)).toBeNull();
  });

  it('Kein Wetter und keine Handwahl: ein Tipp auf „Wie ist das Wetter?“', () => {
    expect(getWeatherStep('granted', 'unavailable', false)).toBe('manual');
    for (const access of ['declined', 'denied', 'blocked'] as const) {
      expect(getWeatherStep(access, 'unavailable', false)).toBe('manual');
    }
  });

  it('Wird noch gelesen: kein Schritt (die Vorschläge zeigen „Wetter wird geprüft“)', () => {
    expect(getWeatherStep('checking', 'loading', false)).toBeNull();
  });

  it('Nach der Handwahl wird nicht noch einmal gefragt, auch nicht mit der Erklär-Karte', () => {
    for (const access of ['ask', 'declined', 'denied', 'blocked', 'granted'] as const) {
      expect(getWeatherStep(access, 'unavailable', true)).toBeNull();
    }
  });
});
