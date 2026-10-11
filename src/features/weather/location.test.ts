import { isSamePlace, isValidPlace, roundCoordinate, roundPlace } from './location';

describe('Koordinaten runden (Datenschutz: 2 Nachkommastellen, ca. 1 km)', () => {
  it('rundet auf 2 Nachkommastellen', () => {
    expect(roundCoordinate(50.6649)).toBe(50.66);
    expect(roundCoordinate(50.6651)).toBe(50.67);
    expect(roundCoordinate(12.19449)).toBe(12.19);
    expect(roundCoordinate(12.195)).toBe(12.2);
  });

  it('rundet auch negative Werte (Westen, Süden)', () => {
    expect(roundCoordinate(-0.12776)).toBe(-0.13);
    expect(roundCoordinate(-33.8688)).toBe(-33.87);
  });

  it('hat danach nie mehr als 2 Nachkommastellen', () => {
    for (const value of [50.123456789, 12.987654321, -3.14159265, 0.005, 179.99999]) {
      const text = String(roundCoordinate(value));
      const decimals = text.includes('.') ? text.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });

  it('rundet Breite und Länge zusammen', () => {
    expect(roundPlace({ lat: 50.66491, lon: 12.19449 })).toEqual({ lat: 50.66, lon: 12.19 });
  });
});

describe('Ort prüfen und vergleichen', () => {
  it('erkennt gültige und ungültige Orte', () => {
    expect(isValidPlace({ lat: 50.66, lon: 12.19 })).toBe(true);
    expect(isValidPlace({ lat: -90, lon: 180 })).toBe(true);
    expect(isValidPlace({ lat: 91, lon: 12 })).toBe(false);
    expect(isValidPlace({ lat: 50, lon: -181 })).toBe(false);
    expect(isValidPlace({ lat: Number.NaN, lon: 12 })).toBe(false);
  });

  it('gleicher Ort heißt: gleiche gerundete Werte', () => {
    expect(isSamePlace({ lat: 50.661, lon: 12.191 }, { lat: 50.664, lon: 12.194 })).toBe(true);
    expect(isSamePlace({ lat: 50.66, lon: 12.19 }, { lat: 50.67, lon: 12.19 })).toBe(false);
  });
});
