// Datenverkehr messen (M8b): Bytes pro Abruf mit echten Aktivitäten aus data/ (vervielfältigt auf 500 und 1500), gegen den Testserver.
// Gemessen wird der Inhalt der Antworten, ungepackt und gepackt (gzip, wie ihn React Native anfordert). Die Kopfzeilen jeder Antwort
// schätzen wir mit 0,8 KB (nicht gemessen, bei Supabase nicht dokumentiert). Die Tabelle zeigt `TRAFFIC_REPORT=1 npx jest activityTraffic`.
// Achtung beim gepackten Wert für 500 und 1500: Die vervielfältigten Texte wiederholen sich und packen dadurch viel besser als echte.
// Realistisch ist das Verhältnis bei 104 (etwa ein Drittel).
// Die Zahlen stehen in docs/supabase.md („Datenverkehr“).

import { gzipSync } from 'node:zlib';

import type { Activity } from './activities';
import type { ActivitiesRecord } from './activitiesCache';
import { activityToRow } from './activityRow';
import { refreshActivities } from './activityRefresh';
import { getBundledActivities } from './bundledActivities';
import { FakeActivitiesServer, type LoggedResponse } from './fakeActivitiesServer';
import { idPageSize } from './fetchActivities';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_test' };
const headerBytesPerResponse = 800; // Schätzung
const day = 24 * 60 * 60 * 1000;
const report = process.env.TRAFFIC_REPORT === '1';

// Echte Aktivitäten, für größere Bestände mit neuen IDs vervielfältigt.
function catalog(count: number, tag = ''): Activity[] {
  const base = getBundledActivities();
  return Array.from({ length: count }, (_, i) => {
    const source = base[i % base.length];
    const copy = Math.floor(i / base.length);
    return { ...source, id: copy === 0 && tag === '' ? source.id : `${source.id}-${tag}${copy}` };
  });
}

type Measure = { requests: number; raw: number; gzip: number };
function measure(log: readonly LoggedResponse[]): Measure {
  return log.reduce(
    (sum, entry) => ({
      requests: sum.requests + 1,
      raw: sum.raw + Buffer.byteLength(entry.body),
      gzip: sum.gzip + gzipSync(entry.body).length,
    }),
    { requests: 0, raw: 0, gzip: 0 },
  );
}
const withHeaders = (m: Measure, packed: boolean) => (packed ? m.gzip : m.raw) + m.requests * headerBytesPerResponse;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

function setUp(count: number) {
  const server = new FakeActivitiesServer();
  server.upsert(catalog(count).map(activityToRow));
  let record: ActivitiesRecord | null = null;
  let clock = 1_000 * day;
  return {
    server,
    async sync(): Promise<Measure> {
      server.advance(day);
      clock += day;
      server.clearLog();
      const next = await refreshActivities({ config, imagePrefix: null, previous: record, now: () => clock, fetchImpl: server.fetch, save: async () => {} });
      if (next) record = next;
      return measure(server.log);
    },
    get size() {
      return record?.activities.length ?? 0;
    },
  };
}

const rows: string[][] = [];
afterAll(() => {
  if (!report) return;
  console.log(['Aktivitäten | Abruf | Anfragen | Inhalt ungepackt | Inhalt gepackt | mit Kopfzeilen ungepackt / gepackt', ...rows.map((row) => row.join(' | '))].join('\n'));
});

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe.each([104, 500, 1500])('%i Aktivitäten', (count) => {
  it('erster Abruf, Folgetag ohne Änderung, Wochenlauf, Zurückziehen, Monat', async () => {
    const phone = setUp(count);
    const note = (label: string, m: Measure) =>
      rows.push([String(count), label, String(m.requests), kb(m.raw), kb(m.gzip), `${kb(withHeaders(m, false))} / ${kb(withHeaders(m, true))}`]);

    // 1. Erster Abruf: alles (wie früher an jedem Tag).
    const first = await phone.sync();
    note('erster Abruf (alles)', first);
    expect(phone.size).toBe(count);
    expect(first.raw / count).toBeGreaterThan(1000); // etwa 1,9 KB je Aktivität
    expect(first.raw / count).toBeLessThan(3000);

    // 2. Folgetag ohne Änderung: zwei Anfragen mit leerem Inhalt `[]`.
    const quiet = await phone.sync();
    note('Folgetag ohne Änderung', quiet);
    expect(quiet.requests).toBe(2);
    expect(quiet.raw).toBe(4);
    expect(withHeaders(quiet, false)).toBeLessThan(2 * 1024);

    // 3. Nach dem Wochenlauf: nur die 15 neuen.
    phone.server.upsert(catalog(15, 'w').map(activityToRow));
    const weekly = await phone.sync();
    note('nach dem Wochenlauf (15 neu)', weekly);
    expect(weekly.raw).toBeLessThan(15 * 3000);
    expect(weekly.raw).toBeLessThan(first.raw / 5);

    // 4. Eine Aktivität zurückgezogen: Zählprobe weicht ab, dazu die ID-Liste (etwa 26 Byte je Aktivität).
    phone.server.setStatus([catalog(1)[0].id], 'rejected');
    const retracted = await phone.sync();
    note('eine zurückgezogen (mit ID-Liste)', retracted);
    expect(retracted.requests).toBe(2 + Math.ceil((count + 15) / idPageSize)); // Zählprobe, Änderungen, ID-Liste in Seiten zu 1000
    expect(retracted.raw).toBeLessThan((count + 15) * 40);
    expect(phone.size).toBe(count + 14);

    // 5. Ein Monat (30 Abrufe): jede Woche 15 neue, eine Änderung, ein Zurückziehen, einmal die ID-Liste nach 30 Tagen.
    let month: Measure = { requests: 0, raw: 0, gzip: 0 };
    for (let dayOfMonth = 1; dayOfMonth <= 30; dayOfMonth += 1) {
      if (dayOfMonth % 7 === 0) phone.server.upsert(catalog(15, `m${dayOfMonth}-`).map(activityToRow));
      if (dayOfMonth === 10) phone.server.upsert([activityToRow({ ...catalog(2)[1], ageMax: 15 })]);
      if (dayOfMonth === 20) phone.server.setStatus([catalog(3)[2].id], 'rejected');
      const m = await phone.sync();
      month = { requests: month.requests + m.requests, raw: month.raw + m.raw, gzip: month.gzip + m.gzip };
    }
    note('Monat (30 Abrufe, 60 neu)', month);
    // Ziel: im Normalfall wenige KB pro Tag, unabhängig von der Größe des Bestands bis auf die ID-Liste.
    expect(withHeaders(month, false) / 30).toBeLessThan(12 * 1024);
    // Früher: jeden Tag alles.
    expect(withHeaders(month, false)).toBeLessThan((first.raw * 30) / 10);
  });
});
