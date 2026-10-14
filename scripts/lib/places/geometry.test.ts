import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { haversineMeters, isAreaGeometry, isInsidePoly, parsePoly, representativePoint } from './geometry.ts';

describe('representativePoint', () => {
  it('Punkt bleibt Punkt', () => {
    expect(representativePoint({ type: 'Point', coordinates: [12.2, 50.66] })).toEqual({ lon: 12.2, lat: 50.66 });
  });

  it('Fläche: Schwerpunkt der äußeren Umrandung', () => {
    const square = [[[12, 50], [12.2, 50], [12.2, 50.2], [12, 50.2], [12, 50]]];
    const point = representativePoint({ type: 'Polygon', coordinates: square });
    expect(point?.lon).toBeCloseTo(12.1, 9);
    expect(point?.lat).toBeCloseTo(50.1, 9);
  });

  it('mehrere Teilflächen: die größte zählt', () => {
    const small = [[[13, 51], [13.01, 51], [13.01, 51.01], [13, 51]]];
    const big = [[[12, 50], [12.2, 50], [12.2, 50.2], [12, 50.2], [12, 50]]];
    const point = representativePoint({ type: 'MultiPolygon', coordinates: [small, big] });
    expect(point?.lon).toBeCloseTo(12.1, 9);
  });

  it('Linie: mittlerer Punkt', () => {
    expect(representativePoint({ type: 'LineString', coordinates: [[1, 1], [2, 2], [3, 3]] })).toEqual({ lon: 2, lat: 2 });
  });

  it('Kaputtes ergibt null', () => {
    expect(representativePoint(null)).toBeNull();
    expect(representativePoint({ type: 'Point', coordinates: ['a', 1] })).toBeNull();
    expect(representativePoint({ type: 'GeometryCollection', geometries: [] })).toBeNull();
    expect(representativePoint({ type: 'LineString', coordinates: [] })).toBeNull();
  });

  it('isAreaGeometry', () => {
    expect(isAreaGeometry({ type: 'MultiPolygon', coordinates: [] })).toBe(true);
    expect(isAreaGeometry({ type: 'Point', coordinates: [0, 0] })).toBe(false);
  });
});

describe('haversineMeters', () => {
  it('Greiz – Reudnitz etwa 6 km (wie im Machbarkeitstest)', () => {
    expect(haversineMeters(50.6563, 12.2009, 50.6777, 12.2781) / 1000).toBeCloseTo(5.9, 0);
  });
});

describe('Umrisse (.poly)', () => {
  const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

  it('liest die Testdatei und erkennt innen und außen', () => {
    const poly = parsePoly(fixture('testland.poly'));
    expect(poly.name).toBe('testland');
    expect(isInsidePoly(poly, 50.66, 12.2)).toBe(true);
    expect(isInsidePoly(poly, 50.66, 13.0)).toBe(false);
  });

  it('Löcher (mit „!“) zählen als außen, wie Berlin im Umriss von Brandenburg', () => {
    const poly = parsePoly(
      ['land', '1', '0 0', '10 0', '10 10', '0 10', '0 0', 'END', '!loch', '4 4', '6 4', '6 6', '4 6', '4 4', 'END', 'END', ''].join('\n'),
    );
    expect(isInsidePoly(poly, 2, 2)).toBe(true);
    expect(isInsidePoly(poly, 5, 5)).toBe(false);
    expect(isInsidePoly(poly, 11, 5)).toBe(false);
  });

  it('wissenschaftliche Schreibweise wie bei Geofabrik (1.441545E+01)', () => {
    const poly = parsePoly(['x', '1', '1.0E+01 5.0E+01', '1.1E+01 5.0E+01', '1.1E+01 5.1E+01', 'END', 'END'].join('\n'));
    expect(isInsidePoly(poly, 50.1, 10.8)).toBe(true);
  });

  it('kaputte Dateien werden abgelehnt', () => {
    expect(() => parsePoly('x\n1\n1 2\n')).toThrow('ohne END');
    expect(() => parsePoly('x\nEND\n')).toThrow('keine Fläche');
    expect(() => parsePoly('x\n1\nabc def\nEND\nEND')).toThrow('ungültige Zeile');
  });
});
