// Tests für den Verlauf in der Vorschlagslogik: kürzlich Gemachtes, Daumen runter, Daumen hoch.
// Der Verlauf ändert nur die Reihenfolge. Die Garantie „mindestens 3, wenn so viele passen“ gilt weiter.

import type { Activity, ActivityCategory } from '../activities/activities';
import { dayPartKeys } from '../activities/activities';
import { getBundledActivities } from '../activities/bundledActivities';
import { maxHistoryEntries, type HistoryEntry, type Rating } from '../history/history';
import { timeOptions, weatherKeys } from './conditions';
import { buildHistoryIndex } from './historyIndex';
import { recentlyDonePenalty, scoreHistory, weights } from './scoring';
import { suggest, type Suggestions } from './suggest';
import { ids, makeActivity, makeChild, makeRequest, testNow } from './testHelpers';

// --- Hilfen ------------------------------------------------------------------------------------

let counter = 0;

// Eintrag, der `daysAgo` Kalendertage vor `testNow` (10.10.2026) um 12 Uhr gemacht wurde.
function entryDaysAgo(
  activityId: string,
  daysAgo: number,
  rating?: Rating,
  base: Date = testNow,
): HistoryEntry {
  counter += 1;
  const doneAt = new Date(base.getFullYear(), base.getMonth(), base.getDate() - daysAgo, 12, 0);
  return {
    id: `entry-${counter}`,
    activityId,
    doneAt: doneAt.toISOString(),
    childIds: [],
    ...(rating ? { rating } : {}),
  };
}

// Ergebnis von scoreHistory für eine Aktivität bei diesem Verlauf.
function historyScore(
  activity: Activity,
  history: HistoryEntry[],
  activities: Activity[],
  now: Date = testNow,
): number {
  return scoreHistory(activity, buildHistoryIndex(history, activities, now));
}

function suggestedIds(suggestions: Suggestions): Set<string> {
  return new Set(suggestions.pages.flat().map((activity) => activity.id));
}

// Zwei Aktivitäten aus „Basteln“ und eine aus „Spiel“, sonst alle gleich.
const craftA = makeActivity({ id: 'craft-a', category: 'craft' });
const craftB = makeActivity({ id: 'craft-b', category: 'craft' });
const gameC = makeActivity({ id: 'game-c', category: 'game' });
const catalog = [craftA, craftB, gameC];

// --- Gewichtung --------------------------------------------------------------------------------

describe('Abzug für kürzlich Gemachtes', () => {
  it('in den ersten Tagen voll, danach linear abklingend, ab Tag 28 nichts mehr', () => {
    for (const day of [0, 1, 2, 3]) expect(recentlyDonePenalty(day)).toBe(-10);
    expect(recentlyDonePenalty(7)).toBeCloseTo(-8.4);
    expect(recentlyDonePenalty(14)).toBeCloseTo(-5.6);
    expect(recentlyDonePenalty(21)).toBeCloseTo(-2.8);
    expect(recentlyDonePenalty(27)).toBeCloseTo(-0.4);
    expect(recentlyDonePenalty(28)).toBe(0);
    expect(recentlyDonePenalty(29)).toBe(0);
    expect(recentlyDonePenalty(365)).toBe(0);
  });

  it('wird mit jedem Tag nie stärker, sondern nur schwächer', () => {
    for (let day = 0; day < 60; day++) {
      expect(recentlyDonePenalty(day + 1)).toBeGreaterThanOrEqual(recentlyDonePenalty(day));
    }
  });

  it('die Zahlen kommen aus der Gewichtungstabelle', () => {
    expect(weights.history.recentlyDone.penalty).toBe(-10);
    expect(weights.history.thumbsDown).toEqual({ penalty: -20, days: 90 });
    expect(weights.history.thumbsUp).toEqual({
      activityBonus: 3,
      waitDays: 14,
      categoryBonus: 1,
      days: 180,
    });
  });

  it('ohne Verlauf gibt es keine Punkte', () => {
    expect(historyScore(craftA, [], catalog)).toBe(0);
  });

  it('zählt je Aktivität nur das letzte Mal, nicht jedes Mal (kein Aufsummieren)', () => {
    const history = [1, 1, 1, 2, 5, 9].map((daysAgo) => entryDaysAgo('craft-a', daysAgo));
    expect(historyScore(craftA, history, catalog)).toBe(-10);
  });

  it('andere Aktivitäten bleiben unberührt', () => {
    const history = [entryDaysAgo('craft-a', 1)];
    expect(historyScore(craftB, history, catalog)).toBe(0);
    expect(historyScore(gameC, history, catalog)).toBe(0);
  });

  it('ein Eintrag für eine Aktivität, die es nicht mehr gibt, stört nicht', () => {
    const history = [entryDaysAgo('gibt-es-nicht', 1, 'up')];
    expect(catalog.map((activity) => historyScore(activity, history, catalog))).toEqual([0, 0, 0]);
  });
});

describe('Daumen runter', () => {
  it('schiebt genau diese Aktivität deutlich nach hinten (zusätzlich zu „kürzlich gemacht“)', () => {
    const history = [entryDaysAgo('craft-a', 1, 'down')];
    expect(historyScore(craftA, history, catalog)).toBe(-10 + -20);
    expect(historyScore(craftB, history, catalog)).toBe(0);
  });

  it('gilt 90 Tage lang: Tag 89 ja, Tag 90 nicht mehr', () => {
    expect(historyScore(craftA, [entryDaysAgo('craft-a', 29, 'down')], catalog)).toBe(-20);
    expect(historyScore(craftA, [entryDaysAgo('craft-a', 89, 'down')], catalog)).toBe(-20);
    expect(historyScore(craftA, [entryDaysAgo('craft-a', 90, 'down')], catalog)).toBe(0);
  });

  it('gibt keinen Bonus für die Kategorie', () => {
    expect(historyScore(craftB, [entryDaysAgo('craft-a', 60, 'down')], catalog)).toBe(0);
  });
});

describe('Daumen hoch', () => {
  it('für die Aktivität erst nach der Wartezeit von 14 Tagen', () => {
    // Davor zählt noch „kürzlich gemacht“ (und die Kategorie mit +1).
    const day13 = historyScore(craftA, [entryDaysAgo('craft-a', 13, 'up')], catalog);
    expect(day13).toBeCloseTo(recentlyDonePenalty(13) + 1);
    const day14 = historyScore(craftA, [entryDaysAgo('craft-a', 14, 'up')], catalog);
    expect(day14).toBeCloseTo(recentlyDonePenalty(14) + 3 + 1);
    // Ab Tag 28 bleibt nur der Bonus.
    expect(historyScore(craftA, [entryDaysAgo('craft-a', 28, 'up')], catalog)).toBe(3 + 1);
  });

  it('gilt bis Tag 179, ab Tag 180 nicht mehr', () => {
    expect(historyScore(craftA, [entryDaysAgo('craft-a', 179, 'up')], catalog)).toBe(4);
    expect(historyScore(craftA, [entryDaysAgo('craft-a', 180, 'up')], catalog)).toBe(0);
  });

  it('die Kategorie bekommt sofort einen kleinen Bonus, andere Kategorien nicht', () => {
    const history = [entryDaysAgo('craft-a', 2, 'up')];
    expect(historyScore(craftB, history, catalog)).toBe(1);
    expect(historyScore(gameC, history, catalog)).toBe(0);
  });

  it('der Kategorie-Bonus wird nicht aufsummiert, auch bei mehreren Daumen hoch', () => {
    const history = [entryDaysAgo('craft-a', 40, 'up'), entryDaysAgo('craft-b', 50, 'up')];
    const other = makeActivity({ id: 'craft-c', category: 'craft' });
    expect(historyScore(other, history, [...catalog, other])).toBe(1);
  });

  it('der Bonus ist klein: kleiner als ein Interesse und weit unter dem Abzug von Daumen runter', () => {
    const { activityBonus, categoryBonus } = weights.history.thumbsUp;
    expect(activityBonus + categoryBonus).toBeLessThan(
      Math.abs(weights.history.thumbsDown.penalty),
    );
  });
});

describe('Die neueste Bewertung gilt', () => {
  it('später Daumen hoch hebt früher Daumen runter auf', () => {
    const history = [entryDaysAgo('craft-a', 40, 'down'), entryDaysAgo('craft-a', 20, 'up')];
    expect(historyScore(craftA, history, catalog)).toBeCloseTo(recentlyDonePenalty(20) + 3 + 1);
  });

  it('später Daumen runter hebt früher Daumen hoch auf, auch beim Kategorie-Bonus', () => {
    const history = [entryDaysAgo('craft-a', 40, 'up'), entryDaysAgo('craft-a', 20, 'down')];
    expect(historyScore(craftA, history, catalog)).toBeCloseTo(recentlyDonePenalty(20) - 20);
    expect(historyScore(craftB, history, catalog)).toBe(0);
  });

  it('ein neuerer Eintrag ohne Bewertung (übersprungen) ändert die Bewertung nicht', () => {
    const history = [entryDaysAgo('craft-a', 60, 'down'), entryDaysAgo('craft-a', 35)];
    expect(historyScore(craftA, history, catalog)).toBe(-20);
  });

  it('am selben Tag entscheidet die Uhrzeit', () => {
    const morning = { ...entryDaysAgo('craft-a', 40, 'down'), doneAt: new Date(2026, 7, 31, 9, 0).toISOString() };
    const evening = { ...entryDaysAgo('craft-a', 40, 'up'), doneAt: new Date(2026, 7, 31, 18, 0).toISOString() };
    expect(historyScore(craftA, [evening, morning], catalog)).toBe(4);
    expect(historyScore(craftA, [morning, evening], catalog)).toBe(4);
  });
});

describe('Tage zählen als Kalendertage nach Ortszeit', () => {
  const lastDone = (history: HistoryEntry[], now: Date) =>
    buildHistoryIndex(history, catalog, now).lastDoneDaysAgo.get('craft-a');
  const at = (day: number, hour: number, minute: number, month = 9) =>
    new Date(2026, month, day, hour, minute).toISOString();
  const done = (doneAt: string): HistoryEntry => ({ ...entryDaysAgo('craft-a', 0), doneAt });

  it('kurz vor Mitternacht gemacht, kurz nach Mitternacht gefragt: gestern', () => {
    expect(lastDone([done(at(9, 23, 59))], new Date(2026, 9, 10, 0, 1))).toBe(1);
  });

  it('kurz nach Mitternacht gemacht, kurz vor Mitternacht gefragt: noch heute', () => {
    expect(lastDone([done(at(10, 0, 1))], new Date(2026, 9, 10, 23, 59))).toBe(0);
  });

  it('Zeitumstellung am 25.10.2026 (25 Stunden): derselbe Tag bleibt derselbe Tag', () => {
    expect(lastDone([done(at(25, 0, 0))], new Date(2026, 9, 25, 23, 59))).toBe(0);
    expect(lastDone([done(at(25, 0, 30))], new Date(2026, 9, 26, 0, 10))).toBe(1);
  });

  it('Zeitumstellung am 25.10.2026: Freitagabend bis Dienstag nach Mitternacht sind 4 Tage, nicht 3', () => {
    const history = [done(at(23, 23, 30))];
    const now = new Date(2026, 9, 27, 0, 30);
    expect(lastDone(history, now)).toBe(4);
    // Und damit der Abzug von Tag 4, nicht der volle von Tag 3.
    expect(historyScore(craftA, history, catalog, now)).toBeCloseTo(recentlyDonePenalty(4));
    expect(recentlyDonePenalty(4)).toBeGreaterThan(-10);
  });

  it('der Wechsel von Tag 27 auf Tag 28 über die Umstellung hinweg', () => {
    // Gemacht am Sonntag, 27.9.2026 abends. Am 24.10. um 0:30 sind es 27 Tage, am 25.10. 28 (Umstellung nachts).
    const history = [done(at(27, 22, 0, 8))];
    expect(lastDone(history, new Date(2026, 9, 24, 0, 30))).toBe(27);
    expect(lastDone(history, new Date(2026, 9, 25, 0, 30))).toBe(28);
    expect(historyScore(craftA, history, catalog, new Date(2026, 9, 25, 0, 30))).toBe(0);
  });
});

// --- Reihenfolge -------------------------------------------------------------------------------

describe('Reihenfolge der Vorschläge', () => {
  // Vier gleiche Aktivitäten: ohne Verlauf bleibt die Reihenfolge aus den Daten.
  const four = ['a', 'b', 'c', 'd'].map((id) => makeActivity({ id }));
  const firstPage = (history?: HistoryEntry[]) =>
    ids(suggest(four, makeRequest({ history })).pages[0]);

  it('ohne Verlauf bleibt die Reihenfolge aus den Daten', () => {
    expect(firstPage()).toEqual(['a', 'b', 'c']);
    expect(firstPage([])).toEqual(['a', 'b', 'c']);
  });

  it('gestern Gemachtes rutscht nach hinten', () => {
    expect(firstPage([entryDaysAgo('a', 1)])).toEqual(['b', 'c', 'd']);
  });

  it('nach vier Wochen ist es wieder vorn', () => {
    // Tag 27 hat noch einen Rest-Abzug von −0,4 und steht deshalb noch hinter den gleich guten.
    expect(firstPage([entryDaysAgo('a', 27)])).toEqual(['b', 'c', 'd']);
    expect(firstPage([entryDaysAgo('a', 28)])).toEqual(['a', 'b', 'c']);
  });

  it('Daumen runter: noch nach Wochen hinten, aber auf einer späteren Seite weiter dabei', () => {
    const result = suggest(four, makeRequest({ history: [entryDaysAgo('a', 60, 'down')] }));
    expect(ids(result.pages[0])).toEqual(['b', 'c', 'd']);
    expect(suggestedIds(result).has('a')).toBe(true);
    expect(result.matchCount).toBe(4);
  });

  it('Daumen hoch nach der Wartezeit: nach vorn', () => {
    expect(firstPage([entryDaysAgo('c', 30, 'up')])).toEqual(['c', 'a', 'b']);
    // Noch in der Wartezeit zählt „kürzlich gemacht“ mehr.
    expect(firstPage([entryDaysAgo('c', 5, 'up')])).not.toContain('c');
  });

  it('Daumen runter schlägt Interessen (Abneigung und Verlauf wirken zusammen)', () => {
    const liked = makeActivity({ id: 'liked', topics: ['craft', 'music'] });
    const plain = ['p1', 'p2', 'p3'].map((id) => makeActivity({ id }));
    const child = makeChild({ years: 5 }, { interests: ['craft', 'music'] });
    const withoutHistory = suggest([liked, ...plain], makeRequest({ children: [child] }));
    expect(ids(withoutHistory.pages[0])).toContain('liked');
    const withDown = suggest(
      [liked, ...plain],
      makeRequest({ children: [child], history: [entryDaysAgo('liked', 45, 'down')] }),
    );
    expect(ids(withDown.pages[0])).not.toContain('liked');
  });
});

// --- Garantie: der Verlauf schließt nie etwas aus ------------------------------------------------

describe('Garantie „mindestens 3, wenn überhaupt so viele passen“ mit Verlauf', () => {
  // Ein voller Verlauf: 500 Einträge, alle Aktivitäten, gestern, alle mit Daumen runter.
  function fullHistory(activities: readonly Activity[], rating: Rating | undefined, daysAgo: number) {
    return Array.from({ length: maxHistoryEntries }, (_, index) =>
      entryDaysAgo(activities[index % activities.length].id, daysAgo + (index % 3), rating),
    );
  }

  const miniCatalog = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, index) =>
    makeActivity({ id, category: (['craft', 'game', 'movement'] as ActivityCategory[])[index % 3] }),
  );

  it('der Verlauf ist wirklich voll', () => {
    expect(fullHistory(miniCatalog, 'down', 1)).toHaveLength(500);
  });

  it('voller Verlauf mit lauter Daumen runter: weiter genau 3 pro Gruppe, nichts fehlt', () => {
    const baseline = suggest(miniCatalog, makeRequest());
    const result = suggest(miniCatalog, makeRequest({ history: fullHistory(miniCatalog, 'down', 1) }));

    expect(result.matchCount).toBe(baseline.matchCount);
    expect(suggestedIds(result)).toEqual(suggestedIds(baseline));
    expect(result.pages.length).toBe(baseline.pages.length);
    expect(result.pages.every((page) => page.length === 3)).toBe(true);
  });

  it('voller Verlauf mit lauter Daumen hoch: ebenso', () => {
    const baseline = suggest(miniCatalog, makeRequest());
    const result = suggest(miniCatalog, makeRequest({ history: fullHistory(miniCatalog, 'up', 20) }));

    expect(result.matchCount).toBe(baseline.matchCount);
    expect(suggestedIds(result)).toEqual(suggestedIds(baseline));
    expect(result.pages.every((page) => page.length === 3)).toBe(true);
  });

  it('passen nur 3, bekommt man diese 3 – auch wenn alle gestern Daumen runter hatten', () => {
    const three = miniCatalog.slice(0, 3);
    const result = suggest(three, makeRequest({ history: fullHistory(three, 'down', 1) }));
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]).toHaveLength(3);
  });

  it('passen weniger als 3, werden nur die vorhandenen gezeigt (nichts aufgefüllt, nichts ausgeschlossen)', () => {
    const two = miniCatalog.slice(0, 2);
    const result = suggest(two, makeRequest({ history: fullHistory(two, 'down', 1) }));
    expect(result.matchCount).toBe(2);
    expect(result.pages).toHaveLength(1);
    expect(ids(result.pages[0]).sort()).toEqual(['a', 'b']);
  });

  it('passt nichts, bleibt es leer – der Verlauf holt nichts herein', () => {
    const tooOld = makeActivity({ id: 'teenager', ageMin: 12, ageMax: 16 });
    const history = [entryDaysAgo('teenager', 60, 'up'), entryDaysAgo('teenager', 20, 'up')];
    const result = suggest([tooOld], makeRequest({ history })); // Kind mit 5 Jahren
    expect(result.matchCount).toBe(0);
    expect(result.pages).toEqual([]);
  });

  it('Daumen hoch holt eine ausgeschlossene Aktivität nicht zurück, Daumen runter schließt keine aus', () => {
    const wet = makeActivity({ id: 'wet', setting: 'outdoor', weather: { needsDry: true, betterInSun: false } });
    const dry = ['x', 'y', 'z'].map((id) => makeActivity({ id }));
    const history = [entryDaysAgo('wet', 50, 'up'), entryDaysAgo('x', 50, 'down'), entryDaysAgo('y', 2)];
    const result = suggest([wet, ...dry], makeRequest({ weather: 'rain', history }));
    expect(suggestedIds(result)).toEqual(new Set(['x', 'y', 'z']));
    expect(result.matchCount).toBe(3);
  });

  describe('mit den echten Aktivitäten aus data/', () => {
    const activities = getBundledActivities();
    const childGroups = [
      [makeChild({ years: 0, months: 6 })],
      [makeChild({ years: 5 })],
      [makeChild({ years: 14 })],
      [makeChild({ years: 2 }), makeChild({ years: 8 })],
    ];
    // Drei volle Verläufe: alles gestern Daumen runter, alles vor 20 Tagen Daumen hoch, alles gestern ohne Bewertung.
    const histories = [
      fullHistory(activities, 'down', 1),
      fullHistory(activities, 'up', 20),
      fullHistory(activities, undefined, 1),
    ];

    it('hat Aktivitäten und volle Verläufe zum Prüfen', () => {
      expect(activities.length).toBeGreaterThan(3);
      for (const history of histories) expect(history).toHaveLength(500);
    });

    it('bei jeder Auswahl dieselben passenden Ideen wie ohne Verlauf, und es sind genau 3 (wenn möglich)', () => {
      const problems: string[] = [];
      for (const children of childGroups) {
        for (const { minutes } of timeOptions) {
          for (const weather of weatherKeys) {
            for (const dayPart of dayPartKeys) {
              const base = { children, availableMinutes: minutes, weather, dayPart };
              const baseline = suggest(activities, makeRequest(base));
              const where = `${children.length} Kind(er), ${minutes} Min., ${weather}, ${dayPart}`;

              histories.forEach((history, index) => {
                const result = suggest(activities, makeRequest({ ...base, history }));
                const expectedSize = Math.min(result.matchCount, 3);
                if (result.matchCount !== baseline.matchCount) {
                  problems.push(`Verlauf ${index}: andere Anzahl passender Ideen (${where})`);
                }
                const same = [...suggestedIds(baseline)].every((id) => suggestedIds(result).has(id));
                if (!same || suggestedIds(result).size !== suggestedIds(baseline).size) {
                  problems.push(`Verlauf ${index}: andere Menge passender Ideen (${where})`);
                }
                if (result.pages.some((page) => page.length !== expectedSize)) {
                  problems.push(`Verlauf ${index}: Gruppe nicht genau ${expectedSize} groß (${where})`);
                }
              });
            }
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it('Daumen runter wirkt auch hier: die bisher erste Idee verlässt die erste Gruppe', () => {
      const request = makeRequest({ availableMinutes: 60 });
      const baseline = suggest(activities, request);
      expect(baseline.matchCount).toBeGreaterThan(6);

      const top = baseline.pages[0][0];
      const result = suggest(activities, { ...request, history: [entryDaysAgo(top.id, 1, 'down')] });
      expect(ids(result.pages[0])).not.toContain(top.id);
      expect(result.matchCount).toBe(baseline.matchCount);
    });
  });
});
