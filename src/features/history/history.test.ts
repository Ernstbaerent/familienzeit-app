import {
  addToHistory,
  limitEntries,
  maxHistoryEntries,
  mergeWindowMinutes,
  parseStoredHistory,
  removeEntry,
  sanitizeHistory,
  setRating,
  sortNewestFirst,
  toStoredHistory,
  type HistoryEntry,
} from './history';

const now = new Date(2026, 9, 10, 15, 0); // 10. Oktober 2026, 15 Uhr
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

let counter = 0;
function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  counter += 1;
  return {
    id: `entry-${counter}`,
    activityId: 'activity-a',
    doneAt: minutesAgo(60).toISOString(),
    childIds: ['kid-1'],
    ...overrides,
  };
}

describe('addToHistory', () => {
  it('legt einen Eintrag mit Aktivität, Datum und Kindern an', () => {
    const { entries, entry: created } = addToHistory(
      [],
      { activityId: 'activity-a', childIds: ['kid-1', 'kid-2'] },
      now,
    );
    expect(entries).toEqual([created]);
    expect(created).toMatchObject({
      activityId: 'activity-a',
      doneAt: now.toISOString(),
      childIds: ['kid-1', 'kid-2'],
    });
    expect(created.id).not.toBe('');
    expect(created.rating).toBeUndefined();
  });

  it('der neue Eintrag steht vorn', () => {
    const old = entry({ doneAt: minutesAgo(600).toISOString() });
    const { entries, entry: created } = addToHistory([old], { activityId: 'b', childIds: [] }, now);
    expect(entries.map((item) => item.id)).toEqual([created.id, old.id]);
  });

  describe('Doppeltippen auf „Fertig“', () => {
    it('zweimal sofort hintereinander ergibt nur einen Eintrag', () => {
      const draft = { activityId: 'activity-a', childIds: ['kid-1'] };
      const first = addToHistory([], draft, now);
      const second = addToHistory(first.entries, draft, new Date(now.getTime() + 300));

      expect(second.entries).toHaveLength(1);
      expect(second.entry.id).toBe(first.entry.id);
      expect(second.entry.doneAt).toBe(first.entry.doneAt); // die erste Zeit bleibt
    });

    it('viele Tipper in einer Sekunde ergeben trotzdem einen', () => {
      const draft = { activityId: 'activity-a', childIds: ['kid-1'] };
      let entries: HistoryEntry[] = [];
      for (let tap = 0; tap < 10; tap++) {
        entries = addToHistory(entries, draft, new Date(now.getTime() + tap * 100)).entries;
      }
      expect(entries).toHaveLength(1);
    });

    it('Grenze: genau 5 Minuten gelten noch als derselbe Eintrag, 5 Minuten und eine Sekunde nicht', () => {
      expect(mergeWindowMinutes).toBe(5);
      const base = [entry({ doneAt: minutesAgo(5).toISOString() })];
      const draft = { activityId: 'activity-a', childIds: ['kid-1'] };

      expect(addToHistory(base, draft, now).entries).toHaveLength(1);
      const later = new Date(now.getTime() + 1000);
      expect(addToHistory(base, draft, later).entries).toHaveLength(2);
    });

    it('eine andere Aktivität zur gleichen Zeit ist ein eigener Eintrag', () => {
      const first = addToHistory([], { activityId: 'activity-a', childIds: [] }, now);
      const second = addToHistory(first.entries, { activityId: 'activity-b', childIds: [] }, now);
      expect(second.entries).toHaveLength(2);
    });

    it('dieselbe Aktivität später am Tag ist ein eigener Eintrag', () => {
      const earlier = [entry({ doneAt: minutesAgo(180).toISOString() })];
      const { entries } = addToHistory(earlier, { activityId: 'activity-a', childIds: ['kid-1'] }, now);
      expect(entries).toHaveLength(2);
    });

    it('der vorhandene Eintrag behält seine Bewertung, Kinder werden ergänzt', () => {
      const rated = entry({ doneAt: minutesAgo(1).toISOString(), rating: 'up', childIds: ['kid-1'] });
      const { entries, entry: merged } = addToHistory(
        [rated],
        { activityId: 'activity-a', childIds: ['kid-1', 'kid-2'] },
        now,
      );
      expect(entries).toHaveLength(1);
      expect(merged.id).toBe(rated.id);
      expect(merged.rating).toBe('up');
      expect(merged.childIds).toEqual(['kid-1', 'kid-2']);
    });
  });

  it('hält die Grenze von 500 Einträgen: die ältesten fallen weg', () => {
    let entries: HistoryEntry[] = [];
    for (let index = 0; index < maxHistoryEntries + 5; index++) {
      const when = new Date(now.getTime() - (maxHistoryEntries + 5 - index) * 24 * 60 * 60 * 1000);
      entries = addToHistory(entries, { activityId: `activity-${index}`, childIds: [] }, when).entries;
    }
    expect(entries).toHaveLength(maxHistoryEntries);
    // Die 5 ältesten (0 bis 4) sind weg, der neueste ist noch da.
    const kept = new Set(entries.map((item) => item.activityId));
    for (let index = 0; index < 5; index++) expect(kept.has(`activity-${index}`)).toBe(false);
    expect(kept.has(`activity-${maxHistoryEntries + 4}`)).toBe(true);
  });
});

describe('setRating', () => {
  const entries = [entry({ id: 'x' }), entry({ id: 'y', rating: 'down' })];

  it('setzt eine Bewertung', () => {
    expect(setRating(entries, 'x', 'up').find((item) => item.id === 'x')?.rating).toBe('up');
  });

  it('ändert eine Bewertung nachträglich', () => {
    expect(setRating(entries, 'y', 'up').find((item) => item.id === 'y')?.rating).toBe('up');
  });

  it('entfernt eine Bewertung ganz (kein leerer Schlüssel)', () => {
    const changed = setRating(entries, 'y', undefined).find((item) => item.id === 'y');
    expect(changed).toBeDefined();
    expect(changed && 'rating' in changed).toBe(false);
  });

  it('ändert nur den gewählten Eintrag und nicht die Liste, die hereinkam', () => {
    const result = setRating(entries, 'x', 'up');
    expect(result.find((item) => item.id === 'y')).toBe(entries[1]);
    expect(entries[0].rating).toBeUndefined();
  });
});

describe('removeEntry', () => {
  it('löscht genau einen Eintrag', () => {
    const entries = [entry({ id: 'x' }), entry({ id: 'y' })];
    expect(removeEntry(entries, 'x').map((item) => item.id)).toEqual(['y']);
    expect(removeEntry(entries, 'unbekannt')).toHaveLength(2);
  });
});

describe('Sortieren und Begrenzen', () => {
  it('neueste zuerst', () => {
    const old = entry({ doneAt: minutesAgo(300).toISOString() });
    const recent = entry({ doneAt: minutesAgo(10).toISOString() });
    expect(sortNewestFirst([old, recent])).toEqual([recent, old]);
  });

  it('limitEntries behält die 500 neuesten', () => {
    const many = Array.from({ length: 600 }, (_, index) =>
      entry({ doneAt: minutesAgo(index).toISOString() }),
    );
    const limited = limitEntries(many);
    expect(limited).toHaveLength(500);
    expect(limited[0]).toBe(many[0]);
    expect(limited[499]).toBe(many[499]);
  });
});

describe('Laden und Aufräumen (sanitizeHistory)', () => {
  it('behält gute Einträge', () => {
    const good = entry({ rating: 'down', childIds: ['kid-1', 'kid-2'] });
    expect(sanitizeHistory([good])).toEqual([good]);
  });

  it('verwirft kaputte Einträge', () => {
    const good = entry();
    const result = sanitizeHistory([
      null,
      'text',
      42,
      [],
      {},
      { ...good, id: '' },
      { ...good, id: 7 },
      { ...good, id: 'ohne-aktivitaet', activityId: '' },
      { ...good, id: 'aktivitaet-zahl', activityId: 5 },
      { ...good, id: 'kein-datum', doneAt: undefined },
      { ...good, id: 'datum-unsinn', doneAt: 'gestern' },
      { ...good, id: 'datum-zahl', doneAt: 1760000000000 },
      good,
    ]);
    expect(result).toEqual([good]);
  });

  it('verwirft doppelte IDs (der erste bleibt)', () => {
    const first = entry({ id: 'doppelt', activityId: 'erste' });
    const second = entry({ id: 'doppelt', activityId: 'zweite' });
    expect(sanitizeHistory([first, second])).toEqual([first]);
  });

  it('eine unbekannte Bewertung fällt weg, der Eintrag bleibt', () => {
    const [result] = sanitizeHistory([{ ...entry({ id: 'r' }), rating: 'super' }]);
    expect(result.id).toBe('r');
    expect('rating' in result).toBe(false);
  });

  it('kaputte Kinder-IDs fallen weg, fehlende Liste wird zur leeren', () => {
    const [mixed] = sanitizeHistory([{ ...entry(), childIds: ['kid-1', 5, null, '', 'kid-1', 'kid-2'] }]);
    expect(mixed.childIds).toEqual(['kid-1', 'kid-2']);
    const [none] = sanitizeHistory([{ ...entry(), childIds: 'kid-1' }]);
    expect(none.childIds).toEqual([]);
  });

  it('behält höchstens die 500 neuesten, auch wenn mehr gespeichert sind', () => {
    const many = Array.from({ length: 520 }, (_, index) =>
      entry({ doneAt: minutesAgo(index).toISOString() }),
    );
    const result = sanitizeHistory(many);
    expect(result).toHaveLength(500);
    expect(result[0].id).toBe(many[0].id);
    expect(result.some((item) => item.id === many[519].id)).toBe(false);
  });

  it('kein Array: leerer Verlauf', () => {
    expect(sanitizeHistory(undefined)).toEqual([]);
    expect(sanitizeHistory({})).toEqual([]);
    expect(sanitizeHistory('kaputt')).toEqual([]);
  });
});

describe('parseStoredHistory (Version)', () => {
  it('liest, was toStoredHistory schreibt', () => {
    const entries = [entry({ rating: 'up' }), entry()];
    expect(parseStoredHistory(toStoredHistory(entries))).toEqual(sortNewestFirst(entries));
    expect(toStoredHistory(entries).version).toBe(1);
  });

  it('nichts gespeichert, kaputt oder eine unbekannte Version: leerer Verlauf', () => {
    expect(parseStoredHistory(null)).toEqual([]);
    expect(parseStoredHistory('kaputt')).toEqual([]);
    expect(parseStoredHistory([entry()])).toEqual([]);
    expect(parseStoredHistory({ entries: [entry()] })).toEqual([]);
    expect(parseStoredHistory({ version: 2, entries: [entry()] })).toEqual([]);
  });
});
