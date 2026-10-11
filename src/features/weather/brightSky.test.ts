import { buildUrls, forecastHours, parseAlerts, parseCurrent, parseForecast } from './brightSky';
import { buildSituation } from './situation';

// Gekürzte echte Antworten von api.brightsky.dev (11. Oktober 2026, Gegend um Greiz).
const currentResponse = {
  weather: {
    source_id: 9191,
    timestamp: '2026-10-11T11:30:00+00:00',
    cloud_cover: 88,
    condition: 'rain',
    precipitation_10: 0.0,
    precipitation_30: 0.15,
    precipitation_60: 0.84,
    temperature: 8.3,
    icon: 'cloudy',
  },
  sources: [{ id: 9191, station_name: 'Langenwetzendorf-Goe' }],
};

const forecastResponse = {
  weather: [
    { timestamp: '2026-10-11T11:00:00+00:00', condition: 'dry', icon: 'partly-cloudy-day', cloud_cover: 63, precipitation: 0.0, temperature: 8.2 },
    { timestamp: '2026-10-11T12:00:00+00:00', condition: 'rain', icon: 'cloudy', cloud_cover: 81, precipitation: 0.1, temperature: 11.0 },
    { timestamp: '2026-10-11T13:00:00+00:00', condition: 'rain', icon: 'cloudy', cloud_cover: 80, precipitation: 0.1, temperature: 10.8 },
    { timestamp: '2026-10-11T14:00:00+00:00', condition: 'rain', icon: 'partly-cloudy-day', cloud_cover: 72, precipitation: 0.1, temperature: 10.5 },
    { timestamp: '2026-10-11T15:00:00+00:00', condition: 'rain', icon: 'partly-cloudy-day', cloud_cover: 67, precipitation: 0.1, temperature: 10.0 },
    { timestamp: '2026-10-11T16:00:00+00:00', condition: 'rain', icon: 'partly-cloudy-day', cloud_cover: 62, precipitation: 0.1, temperature: 9.3 },
    { timestamp: '2026-10-11T17:00:00+00:00', condition: 'dry', icon: 'partly-cloudy-night', cloud_cover: 58, precipitation: 0.0, temperature: 8.9 },
  ],
  sources: [],
};

// Nach der Beschreibung der Schnittstelle (OpenAPI) aufgebaut: So sieht eine Warnung aus.
const alert = (overrides: Record<string, unknown> = {}) => ({
  id: 279977,
  alert_id: '2.49.0.0.276.0.DWD.PVW.1691344680000.2cf9fad6',
  status: 'actual',
  effective: '2026-10-11T08:00:00+00:00',
  onset: '2026-10-11T13:00:00+00:00',
  expires: '2026-10-11T19:00:00+00:00',
  category: 'met',
  response_type: 'prepare',
  urgency: 'immediate',
  severity: 'moderate',
  certainty: 'likely',
  event_code: 31,
  event_en: 'thunderstorm',
  event_de: 'GEWITTER',
  headline_en: 'Official WARNING of THUNDERSTORM',
  headline_de: 'Amtliche WARNUNG vor GEWITTER',
  ...overrides,
});

describe('Internet-Adressen (Datenschutz: nur gerundete Koordinaten)', () => {
  const now = new Date('2026-10-11T11:52:10Z');

  it('rundet die Koordinaten, auch wenn genauere hereinkommen', () => {
    const urls = buildUrls({ lat: 50.66491234, lon: 12.19449876 }, now);
    for (const url of Object.values(urls)) {
      expect(url).toContain('lat=50.66&lon=12.19');
      expect(url).not.toMatch(/50\.664|12\.194|12\.195/);
    }
  });

  it('baut die drei Adressen bei api.brightsky.dev', () => {
    const urls = buildUrls({ lat: 50.66, lon: 12.19 }, now);
    expect(urls.current).toBe('https://api.brightsky.dev/current_weather?lat=50.66&lon=12.19');
    expect(urls.alerts).toBe('https://api.brightsky.dev/alerts?lat=50.66&lon=12.19');
    // Vorhersage ab der vollen Stunde (11:00 UTC) für 8 Stunden
    expect(forecastHours).toBe(8);
    expect(urls.forecast).toBe(
      'https://api.brightsky.dev/weather?lat=50.66&lon=12.19' +
        '&date=2026-10-11T11%3A00%3A00.000Z&last_date=2026-10-11T19%3A00%3A00.000Z',
    );
  });

  it('negative Koordinaten bleiben korrekt', () => {
    expect(buildUrls({ lat: -33.8688, lon: -70.123 }, now).current).toContain('lat=-33.87&lon=-70.12');
  });
});

describe('Aktuelles Wetter lesen', () => {
  it('liest eine echte Antwort', () => {
    expect(parseCurrent(currentResponse)).toEqual({
      time: Date.parse('2026-10-11T11:30:00+00:00'),
      condition: 'rain',
      icon: 'cloudy',
      cloudCover: 88,
      precipitation: 0.84, // Niederschlag der letzten Stunde
      temperature: 8.3,
    });
  });

  it('rechnet die Menge hoch, wenn die letzte Stunde fehlt', () => {
    const base = currentResponse.weather;
    const last30 = parseCurrent({ weather: { ...base, precipitation_60: null } });
    expect(last30?.precipitation).toBeCloseTo(0.3);
    const last10 = parseCurrent({ weather: { ...base, precipitation_60: null, precipitation_30: null } });
    expect(last10?.precipitation).toBe(0);
    const none = parseCurrent({
      weather: { ...base, precipitation_60: null, precipitation_30: null, precipitation_10: null },
    });
    expect(none?.precipitation).toBeNull();
  });

  it('unbekannter Zustand wird zu null, kaputte Antworten zu null', () => {
    expect(parseCurrent({ weather: { ...currentResponse.weather, condition: 'ash-rain' } })?.condition).toBeNull();
    expect(parseCurrent(null)).toBeNull();
    expect(parseCurrent({})).toBeNull();
    expect(parseCurrent({ weather: { condition: 'rain' } })).toBeNull(); // ohne Zeit
    expect(parseCurrent({ weather: { ...currentResponse.weather, timestamp: 'gestern' } })).toBeNull();
  });
});

describe('Vorhersage lesen', () => {
  it('liest eine echte Antwort, nach Zeit sortiert', () => {
    const records = parseForecast({ weather: [...forecastResponse.weather].reverse() });
    expect(records).toHaveLength(7);
    expect(records[0]).toEqual({
      time: Date.parse('2026-10-11T11:00:00+00:00'),
      condition: 'dry',
      icon: 'partly-cloudy-day',
      cloudCover: 63,
      precipitation: 0,
      temperature: 8.2,
    });
    expect(records.map((record) => record.time)).toEqual(
      [...records.map((record) => record.time)].sort((a, b) => a - b),
    );
  });

  it('kaputte Einträge fallen weg, der Rest bleibt', () => {
    const records = parseForecast({ weather: [null, 5, { condition: 'rain' }, forecastResponse.weather[0]] });
    expect(records).toHaveLength(1);
  });

  it('keine Liste: leer', () => {
    expect(parseForecast(null)).toEqual([]);
    expect(parseForecast({ weather: 'x' })).toEqual([]);
  });
});

describe('Warnungen lesen', () => {
  const kinds = (alerts: unknown[]) => parseAlerts({ alerts }).map((entry) => entry.kind);

  it('keine Warnungen: leere Liste (echte Antwort für Greiz)', () => {
    expect(parseAlerts({ alerts: [], location: { name: 'Stadt Greiz' } })).toEqual([]);
  });

  it('Gewitter, jede Stufe', () => {
    expect(kinds([alert({ severity: 'minor' })])).toEqual(['thunderstorm']);
    expect(kinds([alert({ event_de: 'STARKES GEWITTER', event_en: 'severe thunderstorm' })])).toEqual(['thunderstorm']);
  });

  it('Sturm und Orkan, jede Stufe', () => {
    expect(kinds([alert({ event_de: 'STURMBÖEN', event_en: 'storm gusts', severity: 'moderate' })])).toEqual(['storm']);
    expect(kinds([alert({ event_de: 'ORKANARTIGE BÖEN', event_en: 'hurricane-force gusts' })])).toEqual(['storm']);
    expect(kinds([alert({ event_de: 'SCHWERE STURMBÖEN', event_en: 'severe storm gusts' })])).toEqual(['storm']);
  });

  it('Windböen (Stufe 1) schließen nicht aus', () => {
    expect(kinds([alert({ event_de: 'WINDBÖEN', event_en: 'wind gusts', severity: 'minor', event_code: 51 })])).toEqual([]);
  });

  it('jede andere Warnung ab Stufe 3 (severe, extreme) schließt aus, darunter nicht', () => {
    const rain = { event_de: 'STARKREGEN', event_en: 'heavy rain' };
    expect(kinds([alert({ ...rain, severity: 'severe' })])).toEqual(['severe']);
    expect(kinds([alert({ ...rain, severity: 'extreme' })])).toEqual(['severe']);
    expect(kinds([alert({ ...rain, severity: 'moderate' })])).toEqual([]);
    expect(kinds([alert({ ...rain, severity: 'minor' })])).toEqual([]);
    expect(kinds([alert({ ...rain, severity: null })])).toEqual([]);
  });

  it('Testmeldungen, Entwarnungen und Gesundheitswarnungen zählen nicht', () => {
    expect(kinds([alert({ status: 'test' })])).toEqual([]);
    expect(kinds([alert({ response_type: 'allclear' })])).toEqual([]);
    expect(kinds([alert({ category: 'health', event_de: 'EXTREME HITZE', event_en: 'extreme heat', severity: 'severe' })])).toEqual([]);
  });

  it('ohne Namen hilft die Überschrift', () => {
    expect(kinds([alert({ event_de: null, event_en: null })])).toEqual(['thunderstorm']);
  });

  it('Beginn und Ende werden gelesen; ohne Ende bleibt es offen; ohne Beginn gilt die Ausgabezeit', () => {
    const [entry] = parseAlerts({ alerts: [alert({ expires: null })] });
    expect(entry).toEqual({ kind: 'thunderstorm', onset: Date.parse('2026-10-11T13:00:00+00:00'), expires: null });
    const [noOnset] = parseAlerts({ alerts: [alert({ onset: null })] });
    expect(noOnset.onset).toBe(Date.parse('2026-10-11T08:00:00+00:00'));
    expect(parseAlerts({ alerts: [alert({ onset: null, effective: null })] })).toEqual([]);
  });

  it('kaputte Antworten: leere Liste', () => {
    expect(parseAlerts(null)).toEqual([]);
    expect(parseAlerts({ alerts: 'x' })).toEqual([]);
    expect(parseAlerts({ alerts: [null, 3] })).toEqual([]);
  });
});

describe('Mit einer echten Antwort: Nieselregen blockiert nichts', () => {
  // Der Vormittag, an dem die Schnittstelle getestet wurde: Stunde für Stunde „rain“ mit 0,1 mm.
  const data = {
    fetchedAt: Date.parse('2026-10-11T11:52:00Z'),
    place: { lat: 50.66, lon: 12.19 },
    current: parseCurrent(currentResponse),
    forecast: parseForecast(forecastResponse),
    alerts: parseAlerts({ alerts: [] }),
  };

  it('Der Messwert „rain“ mit 0,84 mm in der letzten Stunde zählt als Regen', () => {
    const situation = buildSituation(data, 60, new Date('2026-10-11T11:52:00Z'));
    expect(situation?.current).toBe('rain');
    expect(situation?.weather).toBe('rain');
  });

  it('Ohne den Messwert sind die Stundenwerte mit je 0,1 mm nur Nieselregen: bewölkt statt Regen', () => {
    const situation = buildSituation({ ...data, current: null }, 240, new Date('2026-10-11T12:10:00Z'));
    expect(situation?.weather).toBe('cloudy');
    expect(situation?.change).toBeUndefined();
  });
});
