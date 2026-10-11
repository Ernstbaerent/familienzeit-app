import {
  assumedSituation,
  buildSituation,
  classifyRecord,
  getWindowMinutes,
  manualSituation,
  minLookaheadMinutes,
  rainMinMmPerHour,
  sunnyMaxCloudCover,
  toConditions,
} from './situation';
import { hourAt, makeAlert, makeData, makeRecord, testNow } from './testHelpers';
import type { WeatherRecord } from './types';

const rec = (overrides: Partial<WeatherRecord> = {}) => makeRecord({ time: hourAt(1), ...overrides });
const nowMs = testNow.getTime();

describe('Zeitfenster', () => {
  it('die gewählte Zeit, aber mindestens 2 Stunden', () => {
    expect(minLookaheadMinutes).toBe(120);
    expect(getWindowMinutes(30)).toBe(120);
    expect(getWindowMinutes(60)).toBe(120);
    expect(getWindowMinutes(120)).toBe(120);
    expect(getWindowMinutes(240)).toBe(240);
  });
});

describe('Regen erst ab einer Mindestmenge (Nieselregen blockiert nichts)', () => {
  it('Schwelle: 0,3 mm pro Stunde', () => {
    expect(rainMinMmPerHour).toBe(0.3);
  });

  it('Nieselregen unter der Schwelle zählt wie trocken', () => {
    expect(classifyRecord(rec({ condition: 'rain', precipitation: 0.1 }))).toBe('cloudy');
    expect(classifyRecord(rec({ condition: 'rain', precipitation: 0.29 }))).toBe('cloudy');
    expect(classifyRecord(rec({ condition: 'rain', precipitation: 0 }))).toBe('cloudy');
  });

  it('ab der Schwelle zählt es als Regen', () => {
    expect(classifyRecord(rec({ condition: 'rain', precipitation: 0.3 }))).toBe('rain');
    expect(classifyRecord(rec({ condition: 'rain', precipitation: 2.4 }))).toBe('rain');
  });

  it('ist die Menge unbekannt, glauben wir dem Wetterzustand', () => {
    expect(classifyRecord(rec({ condition: 'rain', precipitation: null }))).toBe('rain');
  });

  it('Schneeregen ist nass wie Regen, mit derselben Schwelle', () => {
    expect(classifyRecord(rec({ condition: 'sleet', precipitation: 0.5 }))).toBe('rain');
    expect(classifyRecord(rec({ condition: 'sleet', precipitation: 0.1 }))).toBe('cloudy');
  });

  it('Gewitter, Hagel und Schnee zählen immer, auch bei kleinster Menge', () => {
    expect(classifyRecord(rec({ condition: 'thunderstorm', precipitation: 0 }))).toBe('thunderstorm');
    expect(classifyRecord(rec({ condition: 'hail', precipitation: 0 }))).toBe('thunderstorm');
    expect(classifyRecord(rec({ condition: 'snow', precipitation: 0.1 }))).toBe('snow');
    expect(classifyRecord(rec({ condition: 'snow', precipitation: null }))).toBe('snow');
  });
});

describe('Sonne oder Wolken', () => {
  it('sonnig bis 50 % Bewölkung am Tag', () => {
    expect(sunnyMaxCloudCover).toBe(50);
    expect(classifyRecord(rec({ cloudCover: 10, icon: 'clear-day' }))).toBe('sunny');
    expect(classifyRecord(rec({ cloudCover: 50, icon: 'partly-cloudy-day' }))).toBe('sunny');
    expect(classifyRecord(rec({ cloudCover: 51, icon: 'partly-cloudy-day' }))).toBe('cloudy');
  });

  it('nachts und bei Nebel nie sonnig', () => {
    expect(classifyRecord(rec({ cloudCover: 0, icon: 'clear-night' }))).toBe('cloudy');
    expect(classifyRecord(rec({ cloudCover: 10, condition: 'fog', icon: 'fog' }))).toBe('cloudy');
  });

  it('ohne Bewölkung entscheidet das Symbol', () => {
    expect(classifyRecord(rec({ cloudCover: null, icon: 'clear-day' }))).toBe('sunny');
    expect(classifyRecord(rec({ cloudCover: null, icon: 'cloudy' }))).toBe('cloudy');
    expect(classifyRecord(rec({ cloudCover: null, icon: null }))).toBe('cloudy');
  });
});

describe('Wetterlage für die gewählte Zeit', () => {
  const build = (data = makeData(), minutes = 60) => {
    const situation = buildSituation(data, minutes, testNow);
    if (!situation) throw new Error('keine Situation');
    return situation;
  };

  it('trocken und sonnig jetzt und später: Sonne, keine Änderung', () => {
    const sunny = { cloudCover: 10, icon: 'clear-day' };
    const situation = build(
      makeData({
        current: makeRecord({ time: nowMs, ...sunny }),
        forecast: [rec(sunny), rec({ time: hourAt(2), ...sunny })],
      }),
    );
    expect(situation).toMatchObject({ weather: 'sunny', current: 'sunny', source: 'dwd', hasDwdData: true });
    expect(situation.change).toBeUndefined();
    expect(situation.warning).toBeUndefined();
  });

  it('Regen jetzt: Regen, ohne „ab“', () => {
    const situation = build(
      makeData({ current: makeRecord({ time: nowMs, condition: 'rain', precipitation: 1.2 }) }),
    );
    expect(situation).toMatchObject({ weather: 'rain', current: 'rain' });
    expect(situation.change).toBeUndefined();
  });

  it('jetzt trocken, aber Regen kommt im Fenster: zählt als Regen, mit Zeitpunkt', () => {
    const situation = build(
      makeData({ forecast: [rec({ time: hourAt(2), condition: 'rain', precipitation: 1 })] }),
      30, // 30 Minuten gewählt, das Fenster ist trotzdem 2 Stunden: bis 15:30 UTC
    );
    expect(situation.weather).toBe('rain');
    expect(situation.current).toBe('cloudy');
    expect(situation.change).toEqual({ weather: 'rain', from: new Date(hourAt(2)) });
  });

  it('Regen erst nach dem Fenster zählt nicht, bei längerer Zeit schon', () => {
    const data = makeData({ forecast: [rec({ time: hourAt(3), condition: 'rain', precipitation: 1 })] });
    expect(build(data, 30).weather).toBe('cloudy'); // Fenster bis 15:30, Regen um 16:00
    expect(build(data, 120).weather).toBe('cloudy');
    expect(build(data, 240).weather).toBe('rain'); // Fenster bis 17:30
  });

  it('Regen von vorhin (Stunden vor jetzt) zählt nicht', () => {
    const situation = build(
      makeData({ forecast: [makeRecord({ time: hourAt(-1), condition: 'rain', precipitation: 3 })] }),
    );
    expect(situation.weather).toBe('cloudy');
  });

  it('Nieselregen in der Vorhersage blockiert nichts', () => {
    const drizzle = [1, 2, 3].map((hour) =>
      rec({ time: hourAt(hour), condition: 'rain', precipitation: 0.1 }),
    );
    const situation = build(makeData({ forecast: drizzle }), 240);
    expect(situation.weather).toBe('cloudy');
    expect(situation.change).toBeUndefined();
  });

  it('Gewitter später: zählt als Gewitter', () => {
    const situation = build(makeData({ forecast: [rec({ condition: 'thunderstorm', precipitation: 4 })] }));
    expect(situation.weather).toBe('thunderstorm');
    expect(situation.change).toEqual({ weather: 'thunderstorm', from: new Date(hourAt(1)) });
  });

  it('Hagel zählt als Gewitter', () => {
    const situation = build(makeData({ forecast: [rec({ condition: 'hail', precipitation: 1 })] }));
    expect(situation.weather).toBe('thunderstorm');
  });

  it('erst Regen, dann Gewitter: Gewitter, mit dem Zeitpunkt des Gewitters', () => {
    const situation = build(
      makeData({
        current: makeRecord({ time: nowMs, condition: 'rain', precipitation: 1 }),
        forecast: [rec({ time: hourAt(1), condition: 'thunderstorm', precipitation: 3 })],
      }),
    );
    expect(situation).toMatchObject({ weather: 'thunderstorm', current: 'rain' });
    expect(situation.change).toEqual({ weather: 'thunderstorm', from: new Date(hourAt(1)) });
  });

  it('Regen und Schnee im selben Fenster: Regen ist schlimmer', () => {
    const situation = build(
      makeData({
        forecast: [
          rec({ time: hourAt(1), condition: 'snow', precipitation: 0.5 }),
          rec({ time: hourAt(2), condition: 'rain', precipitation: 1 }),
        ],
      }),
    );
    expect(situation.weather).toBe('rain');
  });

  it('Schnee', () => {
    const situation = build(
      makeData({ current: makeRecord({ time: nowMs, condition: 'snow', precipitation: 0.2, temperature: -1 }) }),
    );
    expect(situation).toMatchObject({ weather: 'snow', current: 'snow' });
  });

  it('Sonne oder Wolken entscheiden die meisten Stunden', () => {
    const clear = { cloudCover: 10, icon: 'clear-day' };
    const mostlySunny = build(
      makeData({
        current: makeRecord({ time: nowMs, ...clear }),
        forecast: [rec(clear), rec({ time: hourAt(2) })], // 2 von 3 sonnig
      }),
    );
    expect(mostlySunny.weather).toBe('sunny');

    const mostlyCloudy = build(
      makeData({
        current: makeRecord({ time: nowMs, ...clear }),
        forecast: [rec(), rec({ time: hourAt(2) })], // 1 von 3 sonnig
      }),
    );
    expect(mostlyCloudy.weather).toBe('cloudy');
  });

  it('ohne aktuellen Messwert zählt die letzte Stunde vor jetzt als „jetzt“', () => {
    const situation = build(
      makeData({
        current: null,
        forecast: [
          makeRecord({ time: hourAt(0), condition: 'rain', precipitation: 2 }), // 13:00, vor 13:30
          rec({ time: hourAt(1) }),
        ],
      }),
    );
    expect(situation.current).toBe('rain');
  });

  it('Daten ohne etwas für diese Zeit: null', () => {
    expect(buildSituation(makeData({ current: null, forecast: [] }), 60, testNow)).toBeNull();
  });

  it('Stand und veraltet', () => {
    const fresh = build(makeData({ fetchedAt: nowMs - 600_000 }));
    expect(fresh.asOf).toEqual(new Date(nowMs - 600_000));
    expect(fresh.stale).toBe(false);
    const old = buildSituation(makeData(), 60, testNow, { stale: true });
    expect(old?.stale).toBe(true);
  });
});

describe('Temperatur', () => {
  it('kleinster und größter Wert im Fenster, dazu der Wert von jetzt', () => {
    const situation = buildSituation(
      makeData({
        current: makeRecord({ time: nowMs, temperature: 28 }),
        forecast: [
          rec({ time: hourAt(1), temperature: 31 }),
          rec({ time: hourAt(2), temperature: 29 }),
          rec({ time: hourAt(5), temperature: 40 }), // nach dem Fenster
        ],
      }),
      60,
      testNow,
    );
    expect(situation?.temperature).toEqual({ min: 28, max: 31, now: 28 });
  });

  it('ohne Temperaturwerte keine Temperatur', () => {
    const situation = buildSituation(
      makeData({ current: makeRecord({ time: nowMs, temperature: null }) }),
      60,
      testNow,
    );
    expect(situation?.temperature).toBeUndefined();
  });
});

describe('Amtliche Warnungen', () => {
  const build = (alerts: ReturnType<typeof makeAlert>[], minutes = 60) =>
    buildSituation(makeData({ alerts }), minutes, testNow);

  it('Warnung im Fenster: mit Beginn und Ende', () => {
    const situation = build([makeAlert({ kind: 'thunderstorm', onset: hourAt(1), expires: hourAt(4) })]);
    expect(situation?.warning).toEqual({
      kind: 'thunderstorm',
      from: new Date(hourAt(1)),
      until: new Date(hourAt(4)),
    });
  });

  it('Warnung ohne Ende zählt, solange sie begonnen hat', () => {
    expect(build([makeAlert({ onset: hourAt(-2), expires: null })])?.warning).toBeDefined();
  });

  it('Warnung, die erst nach dem Fenster beginnt, zählt nicht (bei längerer Zeit schon)', () => {
    const late = makeAlert({ onset: hourAt(3), expires: hourAt(6) }); // 16:00, Fenster bis 15:30
    expect(build([late], 60)?.warning).toBeUndefined();
    expect(build([late], 240)?.warning).toBeDefined(); // Fenster bis 17:30
  });

  it('Warnung, die schon vorbei ist, zählt nicht', () => {
    expect(build([makeAlert({ onset: hourAt(-5), expires: hourAt(-1) })])?.warning).toBeUndefined();
  });

  it('mehrere: Gewitter vor Sturm vor Unwetter', () => {
    const situation = build([
      makeAlert({ kind: 'severe' }),
      makeAlert({ kind: 'storm' }),
      makeAlert({ kind: 'thunderstorm' }),
    ]);
    expect(situation?.warning?.kind).toBe('thunderstorm');
    expect(build([makeAlert({ kind: 'severe' }), makeAlert({ kind: 'storm' })])?.warning?.kind).toBe('storm');
  });

  it('die Warnung ändert nicht die Wetterlage, nur die Sicherheitsregel in der Anfrage', () => {
    const situation = build([makeAlert()]);
    expect(situation?.weather).toBe('cloudy');
    expect(situation && toConditions(situation).severeWarning).toBe(true);
  });
});

describe('Wetter von Hand, Annahme und Anfrage', () => {
  const dwd = buildSituation(
    makeData({
      current: makeRecord({ time: nowMs, temperature: 33 }),
      forecast: [rec({ time: hourAt(1), condition: 'rain', precipitation: 2, temperature: 31 })],
      alerts: [makeAlert({ kind: 'storm' })],
    }),
    60,
    testNow,
  );

  it('Handwahl ersetzt das Wetter, nicht aber Warnung und Temperatur', () => {
    const manual = manualSituation('sunny', dwd);
    expect(manual).toMatchObject({ weather: 'sunny', current: 'sunny', source: 'manual', hasDwdData: true });
    expect(manual.change).toBeUndefined();
    expect(manual.warning?.kind).toBe('storm'); // Sicherheit wird nie aufgeweicht
    expect(manual.temperature).toEqual(dwd?.temperature);
  });

  it('Handwahl ohne Daten: nur das gewählte Wetter', () => {
    const manual = manualSituation('rain', null);
    expect(manual).toMatchObject({ weather: 'rain', source: 'manual', hasDwdData: false });
    expect(manual.warning).toBeUndefined();
    expect(manual.temperature).toBeUndefined();
    expect(toConditions(manual)).toEqual({ weather: 'rain', temperature: undefined, severeWarning: false });
  });

  it('Annahme ohne Wissen: neutral bewölkt', () => {
    expect(assumedSituation()).toMatchObject({ weather: 'cloudy', source: 'assumed', hasDwdData: false });
  });

  it('die Anfrage bekommt Wetter, Temperatur (min/max) und Warnung', () => {
    expect(dwd && toConditions(dwd)).toEqual({
      weather: 'rain',
      temperature: { min: 31, max: 33 },
      severeWarning: true,
    });
  });
});
