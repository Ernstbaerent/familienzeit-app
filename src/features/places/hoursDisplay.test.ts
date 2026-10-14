// Orte (M10c): Öffnungszeiten und Saison auf der Ortsseite, in der App-Sprache (de/en).

import { createInstance, type TFunction } from 'i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';

import { displayIntervals, formatClock, hoursView, seasonText, weekRows } from './hoursDisplay';
import type { HoursPlan } from './placeRow';
import { everyDay, makePlace, withPlan } from './testHelpers';

function translator(language: 'de' | 'en'): TFunction {
  const i18n = createInstance();
  i18n.init({ resources: { de: { translation: de }, en: { translation: en } }, lng: language, interpolation: { escapeValue: false } });
  return i18n.t;
}

const tDe = translator('de');
const tEn = translator('en');

// Mittwoch, 14.10.2026, 10 Uhr (Berliner Zeit, wie alle Tests).
const wednesday = new Date(2026, 9, 14, 10, 0);

// Montag bis Freitag 9 bis 17 Uhr, Samstag und Sonntag zu.
const weekdays: HoursPlan = {
  days: [[[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [[540, 1020]], [], []],
  ph: false,
};

describe('Uhrzeit', () => {
  it('Stunden ohne führende Null, Minuten zweistellig, Mitternacht als 24:00, danach wieder ab 0', () => {
    expect(formatClock(540)).toBe('9:00');
    expect(formatClock(1050)).toBe('17:30');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(1440)).toBe('24:00');
    expect(formatClock(1440 + 120)).toBe('2:00');
  });
});

describe('Wochenplan als Liste', () => {
  it('„Montag bis Freitag 9 bis 17 Uhr“: sieben Zeilen, heute markiert', () => {
    expect(weekRows(tDe, weekdays, wednesday)).toEqual([
      { day: 0, dayName: 'Montag', value: '9:00–17:00', closed: false, isToday: false },
      { day: 1, dayName: 'Dienstag', value: '9:00–17:00', closed: false, isToday: false },
      { day: 2, dayName: 'Mittwoch', value: '9:00–17:00', closed: false, isToday: true },
      { day: 3, dayName: 'Donnerstag', value: '9:00–17:00', closed: false, isToday: false },
      { day: 4, dayName: 'Freitag', value: '9:00–17:00', closed: false, isToday: false },
      { day: 5, dayName: 'Samstag', value: 'geschlossen', closed: true, isToday: false },
      { day: 6, dayName: 'Sonntag', value: 'geschlossen', closed: true, isToday: false },
    ]);
  });

  it('Englisch: Wochentage in der App-Sprache', () => {
    const rows = weekRows(tEn, weekdays, wednesday);
    expect(rows.map((row) => row.dayName)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(rows[6].value).toBe('closed');
  });

  it('heute folgt der Uhr: Sonntag ist der letzte Tag, Montag der erste', () => {
    expect(weekRows(tDe, weekdays, new Date(2026, 9, 18, 23, 59)).find((row) => row.isToday)?.dayName).toBe('Sonntag');
    expect(weekRows(tDe, weekdays, new Date(2026, 9, 19, 0, 0)).find((row) => row.isToday)?.dayName).toBe('Montag');
  });

  it('mehrere Zeiträume an einem Tag', () => {
    const rows = weekRows(tDe, everyDay([[600, 720], [840, 1080]]), wednesday);
    expect(rows[0].value).toBe('10:00–12:00, 14:00–18:00');
  });

  it('rund um die Uhr', () => {
    expect(weekRows(tDe, everyDay([[0, 1440]]), wednesday)[0].value).toBe('rund um die Uhr');
    expect(weekRows(tEn, everyDay([[0, 1440]]), wednesday)[0].value).toBe('open 24 hours');
  });

  it('über Mitternacht: Freitag 18:00–2:00 statt zwei Teile', () => {
    const plan: HoursPlan = { days: [[], [], [], [], [[1080, 1440]], [[0, 120], [1080, 1440]], [[0, 120]]], ph: false };
    expect(displayIntervals(plan)).toEqual([[], [], [], [], [[1080, 1560]], [[1080, 1560]], []]);
    const rows = weekRows(tDe, plan, wednesday);
    expect(rows.map((row) => row.value)).toEqual([
      'geschlossen',
      'geschlossen',
      'geschlossen',
      'geschlossen',
      '18:00–2:00',
      '18:00–2:00',
      'geschlossen',
    ]);
  });

  it('Sonntag bis in den Montag hinein', () => {
    const plan: HoursPlan = { days: [[[0, 60], [600, 1020]], [], [], [], [], [], [[1200, 1440]]], ph: false };
    expect(weekRows(tDe, plan, wednesday).map((row) => row.value)).toEqual([
      '10:00–17:00',
      'geschlossen',
      'geschlossen',
      'geschlossen',
      'geschlossen',
      'geschlossen',
      '20:00–1:00',
    ]);
  });

  it('bis Mitternacht ohne Fortsetzung bleibt 24:00; ein ganzer Folgetag wird nicht angehängt', () => {
    const plan: HoursPlan = { days: [[[1080, 1440]], [[0, 1440]], [], [], [], [], []], ph: false };
    expect(weekRows(tDe, plan, wednesday).slice(0, 2).map((row) => row.value)).toEqual(['18:00–24:00', 'rund um die Uhr']);
  });
});

describe('Saison', () => {
  it('Monate in der App-Sprache, auch über den Jahreswechsel und mit Lücken', () => {
    expect(seasonText(tDe, [5, 6, 7, 8, 9])).toBe('Mai bis September');
    expect(seasonText(tEn, [5, 6, 7, 8, 9])).toBe('May to September');
    expect(seasonText(tDe, [1, 2, 12])).toBe('Dezember bis Februar');
    expect(seasonText(tDe, [7])).toBe('Juli');
    expect(seasonText(tDe, [4, 5, 9, 10])).toBe('April bis Mai, September bis Oktober');
    expect(seasonText(tDe, [1, 3, 12])).toBe('März, Dezember bis Januar');
  });
});

describe('hoursView', () => {
  it('fester Plan ohne Feiertagsregel: Liste, kein Rohtext, kein Hinweis', () => {
    const view = hoursView(tDe, withPlan(weekdays, { opening_hours: 'Mo-Fr 09:00-17:00' }), wednesday);
    expect(view.week).toHaveLength(7);
    expect(view.raw).toBeNull();
    expect(view.notes).toEqual([]);
    expect(view.season).toBeNull();
  });

  it('fester Plan mit Feiertagsregel: Liste und Hinweise', () => {
    const view = hoursView(tDe, withPlan({ ...weekdays, ph: true }), wednesday);
    expect(view.week).toHaveLength(7);
    expect(view.notes).toEqual(['An Feiertagen können die Zeiten abweichen.', 'Öffnungszeiten vorher prüfen']);
  });

  it('komplex oder unlesbar: Hinweis und Rohtext', () => {
    const complex = makePlace({ opening_hours: 'Mo-Fr 09:00-17:00; SH off', hours_kind: 'complex' });
    expect(hoursView(tDe, complex, wednesday)).toEqual({
      week: null,
      raw: 'Mo-Fr 09:00-17:00; SH off',
      season: null,
      notes: ['Öffnungszeiten vorher prüfen'],
    });
    const invalid = makePlace({ opening_hours: 'nach Absprache', hours_kind: 'invalid' });
    expect(hoursView(tDe, invalid, wednesday).raw).toBe('nach Absprache');
  });

  it('unbekannt: nur der Hinweis', () => {
    expect(hoursView(tDe, makePlace(), wednesday)).toEqual({ week: null, raw: null, season: null, notes: ['Öffnungszeiten vorher prüfen'] });
  });

  it('Kino: zusätzlich Programm und Altersfreigabe; Saison als eigene Zeile', () => {
    const view = hoursView(tDe, makePlace({ subtype: 'cinema' }), wednesday);
    expect(view.notes).toEqual(['Öffnungszeiten vorher prüfen', 'Programm und Altersfreigabe vorher prüfen']);
    const pool = withPlan(everyDay([[600, 1200]]), { subtype: 'outdoorPool', months: [5, 6, 7, 8, 9] });
    expect(hoursView(tDe, pool, wednesday).season).toBe('Saison: Mai bis September');
    expect(hoursView(tEn, pool, wednesday).season).toBe('Season: May to September');
  });
});
