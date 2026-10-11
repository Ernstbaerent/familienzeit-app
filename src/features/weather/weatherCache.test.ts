import {
  freshMinutes,
  getCacheState,
  offlineMaxMinutes,
  parseStoredWeatherData,
} from './weatherCache';
import { hourAt, makeAlert, makeData, makeRecord, testNow } from './testHelpers';

const minutesLater = (minutes: number) => testNow.getTime() + minutes * 60_000;
const place = { lat: 50.66, lon: 12.19 };

describe('Zwischenspeicher: 30 Minuten gültig, offline bis 3 Stunden', () => {
  it('Die Zeiten sind 30 Minuten und 3 Stunden', () => {
    expect(freshMinutes).toBe(30);
    expect(offlineMaxMinutes).toBe(180);
  });

  it('bis 30 Minuten: frisch, kein neuer Abruf', () => {
    const data = makeData();
    expect(getCacheState(data, place, minutesLater(0))).toBe('fresh');
    expect(getCacheState(data, place, minutesLater(29))).toBe('fresh');
  });

  it('ab 30 Minuten: nur noch brauchbar, wenn ein Abruf nicht klappt', () => {
    const data = makeData();
    expect(getCacheState(data, place, minutesLater(30))).toBe('stale');
    expect(getCacheState(data, place, minutesLater(180))).toBe('stale');
  });

  it('älter als 3 Stunden: nicht mehr benutzen', () => {
    expect(getCacheState(makeData(), place, minutesLater(181))).toBe('unusable');
  });

  it('nichts gespeichert: nicht benutzbar', () => {
    expect(getCacheState(null, place, minutesLater(0))).toBe('unusable');
  });

  it('anderer Ort: nicht benutzen. Etwa derselbe Ort (gleiche gerundete Werte): schon', () => {
    const data = makeData();
    expect(getCacheState(data, { lat: 51.34, lon: 12.37 }, minutesLater(5))).toBe('unusable');
    expect(getCacheState(data, { lat: 50.664, lon: 12.194 }, minutesLater(5))).toBe('fresh');
  });

  it('Ort gerade unbekannt (Standort klappt nicht): der gespeicherte Ort gilt weiter', () => {
    expect(getCacheState(makeData(), null, minutesLater(10))).toBe('fresh');
    expect(getCacheState(makeData(), null, minutesLater(60))).toBe('stale');
  });

  it('Uhr zurückgestellt (Abruf liegt in der Zukunft): nicht benutzen', () => {
    expect(getCacheState(makeData(), place, minutesLater(-5))).toBe('unusable');
  });
});

describe('Gespeicherte Daten prüfen', () => {
  it('gültige Daten kommen unverändert zurück (auch nach JSON)', () => {
    const data = makeData({
      forecast: [makeRecord({ time: hourAt(1), condition: 'rain', precipitation: 0.8 })],
      alerts: [makeAlert()],
    });
    expect(parseStoredWeatherData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it('ohne aktuellen Messwert ist auch gültig', () => {
    expect(parseStoredWeatherData(makeData({ current: null }))).not.toBeNull();
  });

  it('kaputte oder fremde Daten ergeben null', () => {
    expect(parseStoredWeatherData(null)).toBeNull();
    expect(parseStoredWeatherData('text')).toBeNull();
    expect(parseStoredWeatherData({})).toBeNull();
    expect(parseStoredWeatherData({ ...makeData(), fetchedAt: 'gestern' })).toBeNull();
    expect(parseStoredWeatherData({ ...makeData(), place: null })).toBeNull();
    expect(parseStoredWeatherData({ ...makeData(), forecast: [{ time: 'x' }] })).toBeNull();
    expect(parseStoredWeatherData({ ...makeData(), alerts: [{ kind: 'ufo', onset: 1, expires: null }] })).toBeNull();
    expect(
      parseStoredWeatherData({ ...makeData(), current: { ...makeRecord({ time: 1 }), condition: 'ufo' } }),
    ).toBeNull();
  });
});
