import {
  parseSelectionParams,
  toSelectionParams,
  toSuggestionRequest,
  type Selection,
} from './selection';
import { makeChild, testNow } from './testHelpers';

const selection: Selection = {
  childIds: ['kid-1', 'kid-2'],
  time: 'hour1',
  parentEnergy: 'tired',
  weather: 'rain',
};

describe('Auswahl an den Ergebnis-Bildschirm übergeben', () => {
  it('kommt unverändert wieder an', () => {
    expect(parseSelectionParams(toSelectionParams(selection))).toEqual(selection);
  });

  it('Energie ist freiwillig', () => {
    const withoutEnergy = { ...selection, parentEnergy: undefined };
    expect(toSelectionParams(withoutEnergy)).not.toHaveProperty('energy');
    expect(parseSelectionParams(toSelectionParams(withoutEnergy))).toEqual(withoutEnergy);
  });

  it('Wetter ist freiwillig: ohne Handwahl gilt das Wetter vom Deutschen Wetterdienst', () => {
    const automatic = { ...selection, weather: undefined };
    expect(toSelectionParams(automatic)).not.toHaveProperty('weather');
    expect(parseSelectionParams(toSelectionParams(automatic))).toEqual(automatic);
  });

  it('Schnee ist ein gültiges Wetter', () => {
    const snowy = { ...selection, weather: 'snow' as const };
    expect(parseSelectionParams(toSelectionParams(snowy))).toEqual(snowy);
  });

  it('unvollständige oder unbekannte Werte ergeben null', () => {
    const params = toSelectionParams(selection);
    expect(parseSelectionParams({ ...params, children: '' })).toBeNull();
    expect(parseSelectionParams({ ...params, time: 'week' })).toBeNull();
    expect(parseSelectionParams({ ...params, energy: 'sleepy' })).toBeNull();
    expect(parseSelectionParams({ ...params, weather: 'hail' })).toBeNull();
  });

  it('macht daraus eine Anfrage nur mit den ausgewählten Kindern, die es noch gibt', () => {
    const profiles = [
      { ...makeChild({ years: 4 }), id: 'kid-1' },
      { ...makeChild({ years: 9 }), id: 'kid-3' },
    ];
    const request = toSuggestionRequest(selection, profiles, testNow, { weather: 'rain' });
    expect(request.children).toEqual([profiles[0]]);
    expect(request.availableMinutes).toBe(60);
    expect(request.parentEnergy).toBe('tired');
    expect(request.weather).toBe('rain');
  });

  it('übernimmt Temperatur und Warnung aus dem Wetter', () => {
    const profiles = [{ ...makeChild({ years: 4 }), id: 'kid-1' }];
    const request = toSuggestionRequest(selection, profiles, testNow, {
      weather: 'cloudy',
      temperature: { min: 31, max: 34 },
      severeWarning: true,
    });
    expect(request.temperature).toEqual({ min: 31, max: 34 });
    expect(request.severeWarning).toBe(true);
  });

  it('die Tageszeit kommt aus der Uhrzeit', () => {
    const profiles = [{ ...makeChild({ years: 4 }), id: 'kid-1' }];
    const at = (hour: number) =>
      toSuggestionRequest(selection, profiles, new Date(2026, 9, 10, hour, 0), {
        weather: 'cloudy',
      }).dayPart;
    expect(at(9)).toBe('morning');
    expect(at(15)).toBe('afternoon');
    expect(at(19)).toBe('evening');
  });
});
