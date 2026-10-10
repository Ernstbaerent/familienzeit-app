import { makeActivity } from '../suggestions/testHelpers';
import { getActivityText, getDurationDisplay } from './activityDisplay';

describe('getDurationDisplay', () => {
  it('unter 2 Stunden in Minuten', () => {
    expect(getDurationDisplay({ durationMin: 20, durationMax: 40 })).toEqual({
      unit: 'minutes',
      min: 20,
      max: 40,
    });
    expect(getDurationDisplay({ durationMin: 45, durationMax: 90 })).toEqual({
      unit: 'minutes',
      min: 45,
      max: 90,
    });
  });

  it('ab 2 Stunden in Stunden, auf halbe Stunden gerundet', () => {
    expect(getDurationDisplay({ durationMin: 180, durationMax: 240 })).toEqual({
      unit: 'hours',
      min: 3,
      max: 4,
    });
    expect(getDurationDisplay({ durationMin: 90, durationMax: 150 })).toEqual({
      unit: 'hours',
      min: 1.5,
      max: 2.5,
    });
  });
});

describe('getActivityText', () => {
  const activity = makeActivity({ id: 'a' });

  it('nimmt die gewünschte Sprache', () => {
    expect(getActivityText(activity, 'de').title).toBe('Titel a');
  });

  it('nimmt Englisch, wenn die Sprache fehlt', () => {
    expect(getActivityText(activity, 'tr').title).toBe('Title a');
  });
});
