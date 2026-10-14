// Orte (M10b): Entfernung, Anfahrt und die Kacheln um den Standort.

import { isInGermanyBounds, tileKeyOf, tilesAround } from './placeTiles';
import { distanceKm, travelFor } from './travel';

describe('Entfernung (Luftlinie)', () => {
  it('1 Grad Breite sind etwa 111 km, 0,01° (die Rundung des Standorts) etwa 1,1 km', () => {
    expect(distanceKm({ lat: 50, lon: 12 }, { lat: 51, lon: 12 })).toBeCloseTo(111.2, 0);
    expect(distanceKm({ lat: 50.66, lon: 12.2 }, { lat: 50.67, lon: 12.2 })).toBeCloseTo(1.11, 2);
  });

  it('Greiz – Gera etwa 26 km, Reihenfolge egal', () => {
    const greiz = { lat: 50.655, lon: 12.199 };
    const gera = { lat: 50.88, lon: 12.083 };
    expect(distanceKm(greiz, gera)).toBeGreaterThan(25);
    expect(distanceKm(greiz, gera)).toBeLessThan(27);
    expect(distanceKm(gera, greiz)).toBeCloseTo(distanceKm(greiz, gera), 10);
  });

  it('die Rundung auf 2 Nachkommastellen verschiebt den Standort um höchstens etwa 0,7 km', () => {
    // Ecke der Rundungszelle: je 0,005° in beide Richtungen.
    const worst = distanceKm({ lat: 50.66, lon: 12.2 }, { lat: 50.665, lon: 12.205 });
    expect(worst).toBeLessThan(0.7);
    expect(worst).toBeGreaterThan(0.6);
  });
});

describe('Anfahrt', () => {
  it('unter 1 km zu Fuß mit 5 km/h, ohne Aufschlag', () => {
    expect(travelFor(0.5)).toEqual({ mode: 'walk', oneWayMinutes: 6, roundTripMinutes: 12 });
    expect(travelFor(0.99).mode).toBe('walk');
    expect(travelFor(0).oneWayMinutes).toBe(0);
  });

  it('ab 1 km mit dem Auto: Luftlinie × 1,3 bei 45 km/h plus 5 Minuten je Strecke', () => {
    // 1 km: 1,3 / 45 × 60 = 1,73 + 5 = 6,73 → 7 Minuten
    expect(travelFor(1)).toEqual({ mode: 'car', oneWayMinutes: 7, roundTripMinutes: 14 });
    // 10 km: 13 / 45 × 60 = 17,3 + 5 = 22,3 → 23
    expect(travelFor(10).oneWayMinutes).toBe(23);
    // 30 km: 39 / 45 × 60 = 52 + 5 = 57
    expect(travelFor(30)).toEqual({ mode: 'car', oneWayMinutes: 57, roundTripMinutes: 114 });
  });

  it('hin und zurück ist immer das Doppelte einer Strecke', () => {
    for (const km of [0.2, 0.8, 1.5, 4, 12.3, 29.9]) {
      const travel = travelFor(km);
      expect(travel.roundTripMinutes).toBe(2 * travel.oneWayMinutes);
    }
  });
});

describe('Kacheln um den Standort', () => {
  it('die eigene Kachel ist immer dabei, für 30 km höchstens 4 × 5 Kacheln (im Norden ist eine Kachel schmaler)', () => {
    for (const [lat, lon] of [
      [50.66, 12.2],
      [47.4, 10.3],
      [54.9, 8.3],
      [52.52, 13.4],
      [50.6, 12.3], // genau auf einer Kachelecke
    ]) {
      const tiles = tilesAround(lat, lon, 30);
      expect(tiles).toContain(tileKeyOf(lat, lon));
      expect(tiles.length).toBeGreaterThanOrEqual(9);
      expect(tiles.length).toBeLessThanOrEqual(20);
      expect(new Set(tiles).size).toBe(tiles.length);
    }
  });

  it('jeder Punkt im Umkreis von 30 km liegt in einer der Kacheln', () => {
    const origin = { lat: 50.66, lon: 12.2 };
    const tiles = new Set(tilesAround(origin.lat, origin.lon, 30));
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const lat = origin.lat + (30 * Math.cos(rad)) / 111.2;
      const lon = origin.lon + (30 * Math.sin(rad)) / (111.32 * Math.cos((origin.lat * Math.PI) / 180));
      expect(tiles.has(tileKeyOf(lat, lon))).toBe(true);
    }
  });

  it('die Grenzen der Datenlage: Deutschland ja, Paris und Wien nein', () => {
    expect(isInGermanyBounds(50.66, 12.2)).toBe(true);
    expect(isInGermanyBounds(48.86, 2.35)).toBe(false);
    expect(isInGermanyBounds(56.1, 12.2)).toBe(false);
    expect(isInGermanyBounds(46.9, 10)).toBe(false);
  });
});
