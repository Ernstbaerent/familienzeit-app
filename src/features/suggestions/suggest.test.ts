import type { Activity, DayPart } from '../activities/activities';
import { dayPartKeys } from '../activities/activities';
import { getBundledActivities } from '../activities/bundledActivities';
import {
  longestMinutes,
  parentEnergyKeys,
  timeOptions,
  weatherKeys,
  type ParentEnergy,
} from './conditions';
import { getExclusionReason } from './exclusions';
import { getAgeInYears, getMonthNumber, type SuggestionChild } from './request';
import { scoreActivity } from './scoring';
import { getPage, getTips, isStartingOver, suggest, type Suggestions } from './suggest';
import { ids, makeActivity, makeChild, makeRequest } from './testHelpers';

// Alle Aktivitäten, die in irgendeiner Dreiergruppe vorkommen (ohne Doppelte).
function allSuggested(suggestions: Suggestions): Activity[] {
  return [...new Set(suggestions.pages.flat())];
}

describe('harte Ausschlüsse', () => {
  it('Alter: Die Aktivität muss für jedes ausgewählte Kind passen (Grenzen inklusive)', () => {
    const activity = makeActivity({ id: 'a', ageMin: 3, ageMax: 8 });
    const at = (...children: SuggestionChild[]) =>
      getExclusionReason(activity, makeRequest({ children }));

    expect(at(makeChild({ years: 3 }))).toBeNull();
    expect(at(makeChild({ years: 8, months: 11 }))).toBeNull(); // zählt als 8
    expect(at(makeChild({ years: 2, months: 11 }))).toBe('age'); // zählt als 2
    expect(at(makeChild({ years: 9 }))).toBe('age');
    expect(at(makeChild({ years: 4 }), makeChild({ years: 10 }))).toBe('age');
  });

  it('Zeit: Ausschluss nur, wenn schon die kürzeste Variante zu lang ist', () => {
    const activity = makeActivity({ id: 'a', durationMin: 30, durationMax: 60 });
    expect(getExclusionReason(activity, makeRequest({ availableMinutes: 30 }))).toBeNull();
    expect(getExclusionReason(activity, makeRequest({ availableMinutes: 29 }))).toBe('time');
  });

  it('Tageszeit: nur zu den angegebenen Tageszeiten, ohne Angabe immer', () => {
    const eveningOnly = makeActivity({ id: 'a', dayParts: ['evening'] });
    const anyTime = makeActivity({ id: 'b' });
    expect(getExclusionReason(eveningOnly, makeRequest({ dayPart: 'evening' }))).toBeNull();
    expect(getExclusionReason(eveningOnly, makeRequest({ dayPart: 'morning' }))).toBe('dayPart');
    for (const dayPart of dayPartKeys) {
      expect(getExclusionReason(anyTime, makeRequest({ dayPart }))).toBeNull();
    }
  });

  it('Monat: nur in den angegebenen Monaten, ohne Angabe das ganze Jahr', () => {
    const advent = makeActivity({ id: 'a', months: [11, 12] });
    const allYear = makeActivity({ id: 'b' });
    const inMonth = (month: number) => makeRequest({ now: new Date(2026, month - 1, 15, 15, 0) });
    expect(getExclusionReason(advent, inMonth(11))).toBeNull();
    expect(getExclusionReason(advent, inMonth(12))).toBeNull();
    expect(getExclusionReason(advent, inMonth(10))).toBe('month');
    expect(getExclusionReason(advent, inMonth(1))).toBe('month');
    for (let month = 1; month <= 12; month++) {
      expect(getExclusionReason(allYear, inMonth(month))).toBeNull();
    }
  });

  it('Monat: Grenzen am ersten und letzten Tag eines Monats', () => {
    const october = makeActivity({ id: 'a', months: [10] });
    const at = (date: Date) => getExclusionReason(october, makeRequest({ now: date }));
    expect(at(new Date(2026, 9, 1, 0, 0))).toBeNull(); // 1. Oktober, Mitternacht
    expect(at(new Date(2026, 9, 31, 23, 59))).toBeNull(); // 31. Oktober, kurz vor Mitternacht
    expect(at(new Date(2026, 8, 30, 23, 59))).toBe('month'); // 30. September
    expect(at(new Date(2026, 10, 1, 0, 0))).toBe('month'); // 1. November
  });

  it('Gewitter: nichts draußen, aber „drinnen oder draußen“ bleibt', () => {
    const request = makeRequest({ weather: 'thunderstorm' });
    expect(getExclusionReason(makeActivity({ id: 'a', setting: 'outdoor' }), request)).toBe('danger');
    expect(getExclusionReason(makeActivity({ id: 'b', setting: 'both' }), request)).toBeNull();
    expect(getExclusionReason(makeActivity({ id: 'c', setting: 'indoor' }), request)).toBeNull();
  });

  it('Amtliche Warnung (Gewitter, Sturm, Unwetter): nichts draußen, auch wenn es gerade ruhig ist', () => {
    const outdoor = makeActivity({ id: 'a', setting: 'outdoor' });
    const both = makeActivity({ id: 'b', setting: 'both' });
    const indoor = makeActivity({ id: 'c', setting: 'indoor' });
    const warned = makeRequest({ weather: 'cloudy', severeWarning: true });
    expect(getExclusionReason(outdoor, warned)).toBe('danger');
    expect(getExclusionReason(both, warned)).toBeNull();
    expect(getExclusionReason(indoor, warned)).toBeNull();
    // Ohne Warnung bleibt draußen möglich.
    expect(getExclusionReason(outdoor, makeRequest({ weather: 'cloudy' }))).toBeNull();
    expect(getExclusionReason(outdoor, makeRequest({ weather: 'cloudy', severeWarning: false }))).toBeNull();
  });

  it('needsDry: bei Regen, Gewitter und Schnee ausgeschlossen, bei Sonne und Wolken nicht', () => {
    const activity = makeActivity({
      id: 'a',
      setting: 'both',
      weather: { needsDry: true, betterInSun: false },
    });
    const at = (weather: (typeof weatherKeys)[number]) =>
      getExclusionReason(activity, makeRequest({ weather }));
    expect(at('rain')).toBe('notDry');
    expect(at('thunderstorm')).toBe('notDry');
    expect(at('snow')).toBe('notDry');
    expect(at('sunny')).toBeNull();
    expect(at('cloudy')).toBeNull();
  });

  it('Draußen ohne needsDry (z. B. Pfützen) geht auch bei Regen', () => {
    const puddles = makeActivity({ id: 'a', setting: 'outdoor' });
    expect(getExclusionReason(puddles, makeRequest({ weather: 'rain' }))).toBeNull();
  });

  it('nur freigegebene Aktivitäten (Sicherheitsnetz)', () => {
    expect(getExclusionReason(makeActivity({ id: 'a', status: 'draft' }), makeRequest())).toBe(
      'notApproved',
    );
  });
});

describe('Gewichtung (nur Reihenfolge)', () => {
  it('Interessen nach vorn, Abneigungen nach hinten, aber nie ausgeschlossen', () => {
    const activities = [
      makeActivity({ id: 'disliked', category: 'craft', topics: ['gettingDirty'] }),
      makeActivity({ id: 'neutral', category: 'game' }),
      makeActivity({ id: 'liked', category: 'cooking', topics: ['cooking'] }),
    ];
    const child = makeChild({ years: 5 }, { interests: ['cooking'], dislikes: ['gettingDirty'] });
    const result = suggest(activities, makeRequest({ children: [child] }));
    expect(ids(getPage(result, 0))).toEqual(['liked', 'neutral', 'disliked']);
    expect(result.matchCount).toBe(3);
  });

  it('Mag ein Kind ein Thema und das andere nicht, zählt beides', () => {
    const activity = makeActivity({ id: 'a', topics: ['water'] });
    const likes = makeChild({ years: 5 }, { interests: ['water'] });
    const dislikes = makeChild({ years: 7 }, { dislikes: ['water'] });
    const both = scoreActivity(activity, makeRequest({ children: [likes, dislikes] }));
    const onlyLikes = scoreActivity(activity, makeRequest({ children: [likes] }));
    expect(both).toBeLessThan(onlyLikes);
  });

  it('Müde Eltern: wenig Aufwand nach vorn, viel Aufwand nach hinten', () => {
    const high = makeActivity({ id: 'high', energy: 'high' });
    const low = makeActivity({ id: 'low', energy: 'low' });
    const tired = makeRequest({ parentEnergy: 'tired' });
    expect(scoreActivity(low, tired)).toBeGreaterThan(scoreActivity(high, tired));
    // Ohne Angabe zur Energie ist es egal.
    expect(scoreActivity(low, makeRequest())).toBe(scoreActivity(high, makeRequest()));
  });

  it('Geschwistertauglich zählt nur, wenn mehrere Kinder dabei sind', () => {
    const sibling = makeActivity({ id: 'a', siblingFriendly: true });
    const other = makeActivity({ id: 'b', siblingFriendly: false });
    const one = makeRequest({ children: [makeChild({ years: 5 })] });
    const two = makeRequest({ children: [makeChild({ years: 5 }), makeChild({ years: 8 })] });
    expect(scoreActivity(sibling, one)).toBe(scoreActivity(other, one));
    expect(scoreActivity(sibling, two)).toBeGreaterThan(scoreActivity(other, two));
  });

  it('Sonne: Aktivitäten, die bei Sonne schöner sind, nach vorn', () => {
    const sunny = makeActivity({ id: 'a', weather: { needsDry: true, betterInSun: true } });
    expect(scoreActivity(sunny, makeRequest({ weather: 'sunny' }))).toBeGreaterThan(
      scoreActivity(sunny, makeRequest({ weather: 'cloudy' })),
    );
  });

  it('Kostenlos vor kostet etwas', () => {
    const free = makeActivity({ id: 'a', cost: 0 });
    const paid = makeActivity({ id: 'b', cost: 2 });
    expect(scoreActivity(free, makeRequest())).toBeGreaterThan(scoreActivity(paid, makeRequest()));
  });
});

describe('Gewichtung bei Hitze und Frost', () => {
  const outdoor = makeActivity({ id: 'outdoor', setting: 'outdoor' });
  const both = makeActivity({ id: 'both', setting: 'both' });
  const indoor = makeActivity({ id: 'indoor', setting: 'indoor' });
  const score = (activity: Activity, temperature?: { min: number; max: number }) =>
    scoreActivity(activity, makeRequest({ temperature }));

  it('ab 30 °C rutscht draußen nach hinten, „beides“ ein wenig, drinnen bleibt', () => {
    const hot = { min: 24, max: 30 };
    expect(score(outdoor, hot)).toBe(score(outdoor) - 4);
    expect(score(both, hot)).toBe(score(both) - 1);
    expect(score(indoor, hot)).toBe(score(indoor));
  });

  it('bei 0 °C und darunter ebenso', () => {
    const frost = { min: 0, max: 5 };
    expect(score(outdoor, frost)).toBe(score(outdoor) - 4);
    expect(score(both, frost)).toBe(score(both) - 1);
    expect(score(indoor, frost)).toBe(score(indoor));
  });

  it('Grenzen: 29,9 °C und 0,1 °C zählen noch nicht', () => {
    expect(score(outdoor, { min: 20, max: 29.9 })).toBe(score(outdoor));
    expect(score(outdoor, { min: 0.1, max: 8 })).toBe(score(outdoor));
  });

  it('ohne Temperatur (Wetter von Hand gewählt) wird nichts abgezogen', () => {
    expect(score(outdoor, undefined)).toBe(score(outdoor));
  });

  it('schließt nie aus, ändert nur die Reihenfolge', () => {
    const activities = [
      makeActivity({ id: 'outdoor', setting: 'outdoor', category: 'nature' }),
      makeActivity({ id: 'indoor', setting: 'indoor', category: 'craft' }),
    ];
    const hot = suggest(activities, makeRequest({ temperature: { min: 25, max: 35 } }));
    expect(hot.matchCount).toBe(2);
    expect(ids(getPage(hot, 0))).toEqual(['indoor', 'outdoor']);
    const mild = suggest(activities, makeRequest({ temperature: { min: 10, max: 18 } }));
    expect(ids(getPage(mild, 0))).toEqual(['outdoor', 'indoor']);
  });
});

describe('Abwechslung und „Andere Vorschläge“', () => {
  it('Drei Vorschläge haben möglichst verschiedene Kategorien', () => {
    const child = makeChild({ years: 5 }, { interests: ['craft'] });
    const activities = [
      makeActivity({ id: 'craft-1', category: 'craft', topics: ['craft'] }),
      makeActivity({ id: 'craft-2', category: 'craft', topics: ['craft'] }),
      makeActivity({ id: 'craft-3', category: 'craft', topics: ['craft'] }),
      makeActivity({ id: 'game', category: 'game' }),
      makeActivity({ id: 'movement', category: 'movement' }),
    ];
    const first = getPage(suggest(activities, makeRequest({ children: [child] })), 0);
    expect(ids(first)).toEqual(['craft-1', 'game', 'movement']);
  });

  it('Gibt es nur eine Kategorie, kommt sie auch dreimal', () => {
    const activities = ['a', 'b', 'c'].map((id) => makeActivity({ id, category: 'craft' }));
    expect(ids(getPage(suggest(activities, makeRequest()), 0))).toEqual(['a', 'b', 'c']);
  });

  it('Abwechslung schlägt keine Abneigung', () => {
    const child = makeChild({ years: 5 }, { dislikes: ['gettingDirty', 'water'] });
    const activities = [
      makeActivity({ id: 'craft-1', category: 'craft' }),
      makeActivity({ id: 'craft-2', category: 'craft' }),
      makeActivity({ id: 'messy', category: 'nature', topics: ['gettingDirty', 'water'] }),
    ];
    const first = getPage(suggest(activities, makeRequest({ children: [child] })), 0);
    expect(ids(first)).toEqual(['craft-1', 'craft-2', 'messy']);
  });

  it('Immer genau 3: die letzte Gruppe wird aufgefüllt, jede Idee kommt vor', () => {
    const activities = Array.from({ length: 8 }, (_, index) =>
      makeActivity({ id: `a${index}`, category: index % 2 === 0 ? 'craft' : 'game' }),
    );
    const result = suggest(activities, makeRequest());
    expect(result.matchCount).toBe(8);
    expect(result.pages).toHaveLength(3);
    for (const page of result.pages) {
      expect(page).toHaveLength(3);
      expect(new Set(ids(page)).size).toBe(3); // keine Doppelten in einer Gruppe
    }
    expect(allSuggested(result)).toHaveLength(8);
  });

  it('Nach der letzten Gruppe geht es wieder von vorn los', () => {
    const activities = Array.from({ length: 6 }, (_, index) => makeActivity({ id: `a${index}` }));
    const result = suggest(activities, makeRequest());
    expect(getPage(result, 2)).toEqual(getPage(result, 0));
    expect(isStartingOver(result, 1)).toBe(false);
    expect(isStartingOver(result, 2)).toBe(true);
    expect(isStartingOver(result, 0)).toBe(false);
  });

  it('Weniger als 3 passende: nur die vorhandenen, nichts aufgefüllt', () => {
    const activities = [
      makeActivity({ id: 'fits' }),
      makeActivity({ id: 'too-long', durationMin: 120 }),
    ];
    const result = suggest(activities, makeRequest({ availableMinutes: 30 }));
    expect(result.matchCount).toBe(1);
    expect(ids(getPage(result, 0))).toEqual(['fits']);
    expect(ids(getPage(result, 1))).toEqual(['fits']);
  });
});

// Kleiner fester Katalog, ähnlich den Beispiel-Aktivitäten, damit die typischen Fälle
// nicht davon abhängen, welche Aktivitäten gerade in data/ liegen.
const catalog: Activity[] = [
  makeActivity({ id: 'treasure-basket', category: 'game', ageMin: 0, ageMax: 2, energy: 'low' }),
  makeActivity({
    id: 'finger-paint',
    category: 'craft',
    ageMin: 1,
    ageMax: 5,
    durationMin: 20,
    durationMax: 40,
    topics: ['craft', 'gettingDirty'],
  }),
  makeActivity({
    id: 'dance',
    category: 'movement',
    ageMin: 1,
    ageMax: 12,
    durationMin: 15,
    durationMax: 20,
    energy: 'low',
    siblingFriendly: true,
    topics: ['music', 'movement'],
  }),
  makeActivity({
    id: 'puddles',
    category: 'nature',
    setting: 'outdoor',
    ageMin: 2,
    ageMax: 10,
    durationMin: 30,
    durationMax: 60,
    siblingFriendly: true,
    topics: ['natureAnimals', 'water', 'gettingDirty'],
  }),
  makeActivity({
    id: 'picnic',
    category: 'nature',
    setting: 'outdoor',
    weather: { needsDry: true, betterInSun: true },
    ageMin: 3,
    ageMax: 14,
    durationMin: 180,
    durationMax: 240,
    dayParts: ['morning', 'afternoon'],
    energy: 'high',
    siblingFriendly: true,
  }),
  makeActivity({
    id: 'stargazing',
    category: 'nature',
    setting: 'outdoor',
    weather: { needsDry: true, betterInSun: false },
    ageMin: 6,
    ageMax: 16,
    durationMin: 45,
    durationMax: 90,
    dayParts: ['evening'],
    energy: 'low',
    siblingFriendly: true,
  }),
  makeActivity({
    id: 'pillow-fort',
    category: 'game',
    ageMin: 3,
    ageMax: 9,
    durationMin: 45,
    durationMax: 90,
    dayParts: ['afternoon', 'evening'],
    energy: 'low',
    siblingFriendly: true,
    topics: ['building', 'roleplay'],
  }),
  makeActivity({
    id: 'obstacle-course',
    category: 'movement',
    ageMin: 2,
    ageMax: 8,
    durationMin: 20,
    durationMax: 40,
    energy: 'high',
    topics: ['movement', 'games'],
  }),
  makeActivity({
    id: 'volcano',
    category: 'experiment',
    setting: 'both',
    ageMin: 5,
    ageMax: 12,
    durationMin: 30,
    durationMax: 45,
    topics: ['experiments', 'gettingDirty'],
  }),
  makeActivity({
    id: 'garden-olympics',
    category: 'movement',
    setting: 'outdoor',
    weather: { needsDry: true, betterInSun: true },
    ageMin: 5,
    ageMax: 16,
    durationMin: 60,
    durationMax: 120,
    energy: 'high',
    siblingFriendly: true,
    topics: ['movement', 'games'],
  }),
  makeActivity({
    id: 'pancakes',
    category: 'cooking',
    ageMin: 3,
    ageMax: 10,
    durationMin: 30,
    durationMax: 40,
    siblingFriendly: true,
    topics: ['cooking'],
  }),
  makeActivity({
    id: 'who-am-i',
    category: 'game',
    ageMin: 7,
    ageMax: 16,
    durationMin: 20,
    durationMax: 45,
    energy: 'low',
    siblingFriendly: true,
    topics: ['games', 'roleplay'],
  }),
  makeActivity({ id: 'tshirt-bag', category: 'craft', ageMin: 13, ageMax: 16, durationMin: 45 }),
];

describe('typische Fälle', () => {
  it('Regen + Kleinkind: altersgerecht, nichts, was trocken sein muss, Pfützen gehen', () => {
    const result = suggest(
      catalog,
      makeRequest({ children: [makeChild({ years: 2 })], weather: 'rain', availableMinutes: 60 }),
    );
    const suggested = allSuggested(result);
    expect(ids(suggested).sort()).toEqual(
      ['dance', 'finger-paint', 'obstacle-course', 'puddles', 'treasure-basket'].sort(),
    );
    expect(suggested.every((activity) => !activity.weather.needsDry)).toBe(true);
    const categories = getPage(result, 0).map((activity) => activity.category);
    expect(new Set(categories).size).toBe(3);
  });

  it('Gewitter: nichts draußen, nichts, was trocken sein muss', () => {
    const result = suggest(
      catalog,
      makeRequest({
        children: [makeChild({ years: 8 })],
        weather: 'thunderstorm',
        availableMinutes: 240,
      }),
    );
    const suggested = allSuggested(result);
    expect(suggested.length).toBeGreaterThanOrEqual(3);
    expect(suggested.some((activity) => activity.setting === 'outdoor')).toBe(false);
    expect(suggested.some((activity) => activity.weather.needsDry)).toBe(false);
    expect(ids(suggested)).toContain('volcano'); // drinnen oder draußen: bleibt
  });

  it('30 Minuten + müde: alles passt in 30 Minuten, wenig Aufwand zuerst', () => {
    const result = suggest(
      catalog,
      makeRequest({
        children: [makeChild({ years: 5 })],
        availableMinutes: 30,
        parentEnergy: 'tired',
      }),
    );
    const suggested = allSuggested(result);
    expect(suggested.every((activity) => activity.durationMin <= 30)).toBe(true);
    expect(getPage(result, 0)[0].id).toBe('dance');
    // Viel Aufwand fällt nicht weg, kommt aber erst in der letzten Gruppe.
    const lastPage = result.pages[result.pages.length - 1];
    expect(ids(lastPage)).toContain('obstacle-course');
    expect(ids(getPage(result, 0))).not.toContain('obstacle-course');
  });

  it('Baby und Teenager zusammen: nichts passt für beide, also keine Vorschläge', () => {
    const result = suggest(
      catalog,
      makeRequest({
        children: [makeChild({ years: 0, months: 6 }), makeChild({ years: 14 })],
        availableMinutes: 240,
      }),
    );
    expect(result.matchCount).toBe(0);
    expect(result.pages).toEqual([]);
    expect(getPage(result, 0)).toEqual([]);
  });

  it('Baby und Teenager: Was für beide passt, wird gefunden', () => {
    const forEveryone = makeActivity({ id: 'for-everyone', ageMin: 0, ageMax: 16 });
    const result = suggest(
      [...catalog, forEveryone],
      makeRequest({
        children: [makeChild({ years: 0, months: 6 }), makeChild({ years: 14 })],
        availableMinutes: 240,
      }),
    );
    expect(ids(allSuggested(result))).toEqual(['for-everyone']);
  });

  it('Abend: Sterne beobachten ja, Picknick nein; morgens umgekehrt', () => {
    const at = (dayPart: DayPart) =>
      ids(
        allSuggested(
          suggest(
            catalog,
            makeRequest({ children: [makeChild({ years: 8 })], availableMinutes: 240, dayPart }),
          ),
        ),
      );
    const evening = at('evening');
    expect(evening).toContain('stargazing');
    expect(evening).toContain('pillow-fort');
    expect(evening).not.toContain('picnic');

    const morning = at('morning');
    expect(morning).toContain('picnic');
    expect(morning).not.toContain('stargazing');
    expect(morning).not.toContain('pillow-fort');
  });

  it('Interessen und Abneigungen: Lieblingsthema zuerst, Abneigung hinten, aber dabei', () => {
    const child = makeChild({ years: 6 }, { interests: ['cooking'], dislikes: ['gettingDirty'] });
    const result = suggest(catalog, makeRequest({ children: [child], availableMinutes: 60 }));
    const first = getPage(result, 0);
    expect(first[0].id).toBe('pancakes');
    expect(ids(first)).not.toContain('puddles');
    expect(ids(first)).not.toContain('volcano');
    expect(ids(allSuggested(result))).toEqual(expect.arrayContaining(['puddles', 'volcano']));
  });
});

describe('Tipps bei weniger als 3 Ideen (nur, wenn sie wirklich helfen)', () => {
  const tipsFor = (overrides: Parameters<typeof makeRequest>[0]) =>
    getTips(catalog, makeRequest(overrides), longestMinutes);

  it('Baby und Teenager: weniger Kinder hilft', () => {
    const children = [makeChild({ years: 0, months: 6 }), makeChild({ years: 14 })];
    expect(tipsFor({ children, availableMinutes: longestMinutes })).toEqual(['fewerChildren']);
  });

  it('Teenager mit 30 Minuten: mehr Zeit hilft', () => {
    expect(tipsFor({ children: [makeChild({ years: 14 })], availableMinutes: 30 })).toEqual([
      'moreTime',
    ]);
  });

  it('Baby allein: mehr Zeit hilft nicht, also kein Tipp', () => {
    expect(tipsFor({ children: [makeChild({ years: 0, months: 6 })], availableMinutes: 30 })).toEqual(
      [],
    );
  });
});

// Prüft die Sicherheitsregeln mit den echten Aktivitäten aus data/ für sehr viele Kombinationen.
// Diese Tests hängen nicht davon ab, welche Aktivitäten es gibt, nur davon, dass die Regeln halten.
describe('Regeln mit den echten Aktivitäten aus data/', () => {
  const activities = getBundledActivities();
  const childGroups: SuggestionChild[][] = [
    [makeChild({ years: 0, months: 6 })],
    [makeChild({ years: 2 })],
    [makeChild({ years: 5 })],
    [makeChild({ years: 9 })],
    [makeChild({ years: 14 })],
    [makeChild({ years: 2 }), makeChild({ years: 8 })],
    [makeChild({ years: 0, months: 6 }), makeChild({ years: 14 })],
    [makeChild({ years: 4 }), makeChild({ years: 7 }), makeChild({ years: 12 })],
  ];
  const energies: (ParentEnergy | undefined)[] = [undefined, ...parentEnergyKeys];
  // Jede Energie mit und ohne amtliche Warnung.
  const energiesAndWarnings = energies.flatMap((energy) =>
    [false, true].map((warning) => [energy, warning] as const),
  );

  it('hat Aktivitäten zum Prüfen', () => {
    expect(activities.length).toBeGreaterThan(0);
  });

  it('kein Vorschlag verletzt einen harten Ausschluss, und es sind immer genau 3 (wenn möglich)', () => {
    // Verstöße werden gesammelt und am Ende einmal geprüft. Das ist bei über tausend Kombinationen
    // viel schneller als einzelne expect-Aufrufe und zeigt im Fehlerfall gleich Aktivität und Situation.
    const violations: string[] = [];
    for (const children of childGroups) {
      for (const { minutes } of timeOptions) {
        for (const weather of weatherKeys) {
          for (const dayPart of dayPartKeys) {
            for (const [parentEnergy, severeWarning] of energiesAndWarnings) {
              // Die Temperatur ändert nur die Reihenfolge, nie die Auswahl (Hitze mit, Frost ohne Warnung).
              const request = makeRequest({
                children,
                availableMinutes: minutes,
                weather,
                dayPart,
                parentEnergy,
                severeWarning,
                temperature: severeWarning ? { min: 31, max: 35 } : { min: -3, max: 2 },
              });
              const result = suggest(activities, request);
              const suggested = allSuggested(result);
              const where = `${minutes} Min., ${weather}, ${dayPart}, Warnung ${severeWarning}`;
              const fail = (activity: Activity, rule: string) =>
                violations.push(`${activity.id}: ${rule} (${where})`);

              for (const activity of suggested) {
                if (activity.status !== 'approved') fail(activity, 'nicht approved');
                for (const child of children) {
                  const age = getAgeInYears(child, request.now);
                  if (age < activity.ageMin || age > activity.ageMax) fail(activity, `Alter ${age}`);
                }
                if (activity.durationMin > minutes) fail(activity, 'zu lang');
                if (activity.dayParts && !activity.dayParts.includes(dayPart)) fail(activity, 'Tageszeit');
                if (activity.months && !activity.months.includes(getMonthNumber(request.now))) {
                  fail(activity, 'Monat');
                }
                if (weather === 'thunderstorm' && activity.setting === 'outdoor') fail(activity, 'Gewitter');
                if (severeWarning && activity.setting === 'outdoor') fail(activity, 'Warnung');
                const isWet = weather === 'rain' || weather === 'thunderstorm' || weather === 'snow';
                if (isWet && activity.weather.needsDry) fail(activity, 'braucht Trockenheit');
              }

              if (suggested.length !== result.matchCount) {
                violations.push(`nicht alle passenden Ideen in den Gruppen (${where})`);
              }
              const expectedSize = Math.min(result.matchCount, 3);
              if (result.pages.some((page) => page.length !== expectedSize)) {
                violations.push(`Gruppe nicht genau ${expectedSize} groß (${where})`);
              }
            }
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('jeder Monat: kein Vorschlag außerhalb seiner Monate, und es gibt immer Vorschläge', () => {
    for (let month = 1; month <= 12; month++) {
      const now = new Date(2026, month - 1, 15, 15, 0);
      for (const weather of weatherKeys) {
        for (const dayPart of dayPartKeys) {
          for (const severeWarning of [false, true]) {
            // Ein Kind mit 5 Jahren und eine Stunde Zeit: Dafür muss es immer genug Ideen geben,
            // auch bei Schnee und bei amtlicher Warnung (dann nur drinnen oder „beides“).
            const request = makeRequest({
              now,
              weather,
              dayPart,
              severeWarning,
              availableMinutes: 60,
            });
            const result = suggest(activities, request);
            for (const activity of allSuggested(result)) {
              if (activity.months) expect(activity.months).toContain(month);
            }
            expect(result.matchCount).toBeGreaterThanOrEqual(3);
          }
        }
      }
    }
  });
});
