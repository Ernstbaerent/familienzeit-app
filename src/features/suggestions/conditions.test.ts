import { getDayPart, getMinutes, isWeather, timeOptions, weatherKeys } from './conditions';

describe('getDayPart (Uhrzeit-Grenzen der Tageszeiten)', () => {
  const at = (hour: number, minute = 0) => getDayPart(new Date(2026, 9, 10, hour, minute));

  it('Morgen von 5:00 bis 11:59', () => {
    expect(at(5)).toBe('morning');
    expect(at(11, 59)).toBe('morning');
  });

  it('Nachmittag von 12:00 bis 16:59', () => {
    expect(at(12)).toBe('afternoon');
    expect(at(16, 59)).toBe('afternoon');
  });

  it('Abend ab 17:00, auch spät in der Nacht', () => {
    expect(at(17)).toBe('evening');
    expect(at(23, 30)).toBe('evening');
    expect(at(4, 59)).toBe('evening');
  });
});

describe('Zeit-Auswahl', () => {
  it('ein halber Tag sind 4 Stunden', () => {
    expect(getMinutes('halfDay')).toBe(240);
  });

  it('die Auswahl ist von kurz nach lang sortiert', () => {
    const minutes = timeOptions.map((option) => option.minutes);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });
});

describe('Wetterlagen', () => {
  it('Schnee ist eine Wetterlage, in der Reihenfolge der Auswahl „Wie ist das Wetter?“', () => {
    expect(weatherKeys).toEqual(['sunny', 'cloudy', 'rain', 'thunderstorm', 'snow']);
    expect(isWeather('snow')).toBe(true);
    expect(isWeather('hail')).toBe(false);
  });
});
