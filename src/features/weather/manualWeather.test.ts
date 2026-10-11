import { needsManualWeather } from './manualWeather';

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
