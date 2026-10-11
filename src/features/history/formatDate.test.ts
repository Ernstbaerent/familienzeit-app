import { formatHistoryDate } from './formatDate';

describe('formatHistoryDate', () => {
  it('Datum in der App-Sprache', () => {
    const doneAt = new Date(2026, 9, 10, 15, 0).toISOString();
    expect(formatHistoryDate(doneAt, 'de')).toBe('10. Oktober 2026');
    expect(formatHistoryDate(doneAt, 'en')).toBe('October 10, 2026');
  });

  it('kurz nach Mitternacht Ortszeit gehört zum neuen Tag (nicht zum UTC-Tag davor)', () => {
    // 0:30 Uhr am 26.10.2026 ist in UTC noch der 25.10. (Sommerzeit/Winterzeit).
    const doneAt = new Date(2026, 9, 26, 0, 30).toISOString();
    expect(formatHistoryDate(doneAt, 'de')).toBe('26. Oktober 2026');
  });
});
