// Orte (M10c): Links für „Route öffnen“ (Android, iPhone mit drei Diensten) und das Öffnen selbst.

import {
  androidGeoUrl,
  appleMapsUrl,
  encodeText,
  formatCoordinate,
  googleMapsUrl,
  mapServiceUrl,
  openRoute,
  osmMapUrl,
  routeTargetFor,
  type MapService,
  type RouteDeps,
  type RouteTarget,
} from './routeLinks';

const car: RouteTarget = { lat: 50.659123, lon: 12.198765, label: 'Saline Bad und Sauna', mode: 'car' };
const walk: RouteTarget = { ...car, mode: 'walk' };

describe('Koordinaten', () => {
  it('höchstens 6 Nachkommastellen, ohne Nullen am Ende und ohne Exponent', () => {
    expect(formatCoordinate(50.659123)).toBe('50.659123');
    expect(formatCoordinate(50.6591234567)).toBe('50.659123');
    expect(formatCoordinate(50.66)).toBe('50.66');
    expect(formatCoordinate(12)).toBe('12');
    expect(formatCoordinate(10)).toBe('10');
    expect(formatCoordinate(10.5)).toBe('10.5');
    expect(formatCoordinate(12.0000004)).toBe('12');
    expect(formatCoordinate(-0.0000001)).toBe('0');
    expect(formatCoordinate(-3.5)).toBe('-3.5');
    expect(formatCoordinate(0.0000012)).toBe('0.000001');
    expect(() => formatCoordinate(Number.NaN)).toThrow();
  });
});

describe('Namen sauber kodiert', () => {
  it('Leerzeichen, Umlaute, & , ( ) ! * \' # ? / werden kodiert', () => {
    expect(encodeText('Café & Bad (Süd)')).toBe('Caf%C3%A9%20%26%20Bad%20%28S%C3%BCd%29');
    expect(encodeText("Kinder's Spaß! * #1? a/b, c")).toBe('Kinder%27s%20Spa%C3%9F%21%20%2A%20%231%3F%20a%2Fb%2C%20c');
    expect(encodeText('Spielplatz in Pohlitz')).toBe('Spielplatz%20in%20Pohlitz');
  });
});

describe('Android: geo-URI', () => {
  it('Koordinaten und Name als Beschriftung, kein Modus', () => {
    expect(androidGeoUrl(car)).toBe('geo:0,0?q=50.659123,12.198765(Saline%20Bad%20und%20Sauna)');
    expect(androidGeoUrl(walk)).toBe(androidGeoUrl(car));
  });

  it('Klammern im Namen brechen die Beschriftung nicht', () => {
    const url = androidGeoUrl({ ...car, label: 'Freibad (Nord) & Café)' });
    expect(url).toBe('geo:0,0?q=50.659123,12.198765(Freibad%20%28Nord%29%20%26%20Caf%C3%A9%29)');
    expect(url.match(/[()]/g)).toEqual(['(', ')']);
  });
});

describe('iPhone: drei Dienste', () => {
  it('Apple Karten: /directions mit Ziel und Modus, kein Name', () => {
    expect(appleMapsUrl(car)).toBe('https://maps.apple.com/directions?destination=50.659123,12.198765&mode=driving');
    expect(appleMapsUrl(walk)).toBe('https://maps.apple.com/directions?destination=50.659123,12.198765&mode=walking');
  });

  it('Google Maps: api=1, Ziel mit kodiertem Komma, travelmode', () => {
    expect(googleMapsUrl(car)).toBe('https://www.google.com/maps/dir/?api=1&destination=50.659123%2C12.198765&travelmode=driving');
    expect(googleMapsUrl(walk)).toBe('https://www.google.com/maps/dir/?api=1&destination=50.659123%2C12.198765&travelmode=walking');
  });

  it('OpenStreetMap: Karte mit Markierung (keine Route, kein Modus)', () => {
    expect(osmMapUrl(car)).toBe('https://www.openstreetmap.org/?mlat=50.659123&mlon=12.198765#map=17/50.659123/12.198765');
    expect(osmMapUrl(walk)).toBe(osmMapUrl(car));
  });

  it('kein Dienst bekommt den Namen oder den Standort', () => {
    for (const service of ['apple', 'google', 'osm'] as MapService[]) {
      const url = mapServiceUrl(service, { ...car, label: 'Geheimer Name' });
      expect(url).not.toMatch(/Geheimer|source|origin|saddr/);
      expect(url.startsWith('https://')).toBe(true);
    }
  });
});

describe('zu Fuß oder Auto', () => {
  it('unter 1 km zu Fuß, sonst Auto (wie die Anfahrt)', () => {
    const place = { lat: 50.66, lon: 12.2 };
    expect(routeTargetFor(place, 'Spielplatz', 0.4).mode).toBe('walk');
    expect(routeTargetFor(place, 'Spielplatz', 0.99).mode).toBe('walk');
    expect(routeTargetFor(place, 'Spielplatz', 1).mode).toBe('car');
    expect(routeTargetFor(place, 'Spielplatz', 12).mode).toBe('car');
    expect(routeTargetFor(place, 'Spielplatz', 0.4)).toEqual({ lat: 50.66, lon: 12.2, label: 'Spielplatz', mode: 'walk' });
  });
});

describe('openRoute', () => {
  function deps(overrides: Partial<RouteDeps> = {}): RouteDeps & { openURL: jest.Mock; chooseService: jest.Mock; onError: jest.Mock } {
    return {
      os: 'android',
      openURL: jest.fn(async () => true),
      chooseService: jest.fn(async () => 'apple' as MapService),
      onError: jest.fn(),
      ...overrides,
    } as RouteDeps & { openURL: jest.Mock; chooseService: jest.Mock; onError: jest.Mock };
  }

  it('Android: sofort die geo-URI, ohne Menü', async () => {
    const d = deps();
    await openRoute(car, d);
    expect(d.chooseService).not.toHaveBeenCalled();
    expect(d.openURL).toHaveBeenCalledWith('geo:0,0?q=50.659123,12.198765(Saline%20Bad%20und%20Sauna)');
    expect(d.onError).not.toHaveBeenCalled();
  });

  it.each([
    ['apple', 'https://maps.apple.com/directions?destination=50.659123,12.198765&mode=walking'],
    ['google', 'https://www.google.com/maps/dir/?api=1&destination=50.659123%2C12.198765&travelmode=walking'],
    ['osm', 'https://www.openstreetmap.org/?mlat=50.659123&mlon=12.198765#map=17/50.659123/12.198765'],
  ] as const)('iPhone: erst das Menü, dann %s', async (service, url) => {
    const d = deps({ os: 'ios', chooseService: jest.fn(async () => service) });
    await openRoute(walk, d);
    expect(d.chooseService).toHaveBeenCalledTimes(1);
    expect(d.openURL).toHaveBeenCalledWith(url);
  });

  it('iPhone: abgebrochen öffnet nichts', async () => {
    const d = deps({ os: 'ios', chooseService: jest.fn(async () => null) });
    await openRoute(car, d);
    expect(d.openURL).not.toHaveBeenCalled();
    expect(d.onError).not.toHaveBeenCalled();
  });

  it('Öffnen scheitert (keine Karten-App): erst danach ein Hinweis', async () => {
    const d = deps({ openURL: jest.fn(async () => Promise.reject(new Error('No activity found'))) });
    await openRoute(car, d);
    expect(d.onError).toHaveBeenCalledTimes(1);
  });
});
