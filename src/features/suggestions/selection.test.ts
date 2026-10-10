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
  dayPart: 'evening',
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

  it('unvollständige oder unbekannte Werte ergeben null', () => {
    const params = toSelectionParams(selection);
    expect(parseSelectionParams({ ...params, children: '' })).toBeNull();
    expect(parseSelectionParams({ ...params, time: 'week' })).toBeNull();
    expect(parseSelectionParams({ ...params, energy: 'sleepy' })).toBeNull();
    expect(parseSelectionParams({ ...params, weather: 'snow' })).toBeNull();
    expect(parseSelectionParams({ ...params, dayPart: undefined })).toBeNull();
  });

  it('macht daraus eine Anfrage nur mit den ausgewählten Kindern, die es noch gibt', () => {
    const profiles = [
      { ...makeChild({ years: 4 }), id: 'kid-1' },
      { ...makeChild({ years: 9 }), id: 'kid-3' },
    ];
    const request = toSuggestionRequest(selection, profiles, testNow);
    expect(request.children).toEqual([profiles[0]]);
    expect(request.availableMinutes).toBe(60);
    expect(request.parentEnergy).toBe('tired');
    expect(request.weather).toBe('rain');
    expect(request.dayPart).toBe('evening');
  });
});
