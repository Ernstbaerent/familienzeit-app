// Abgleich mit Supabase (M8, M8b) gegen den Testserver (fakeActivitiesServer.ts): nur Änderungen, gleiche Zeitstempel, laufende Schreibvorgänge,
// Zurückgezogenes, Rückfall bei jedem Fehler, kaputter Stand, falsche Uhr. Kein Netz, kein echtes Supabase.

import { makeActivity } from '../suggestions/testHelpers';
import type { ActivitiesRecord } from './activitiesCache';
import { activityToRow } from './activityRow';
import { refreshActivities } from './activityRefresh';
import { cursorOverlapMicros, idCheckDays, maxTargetedFetch, parseTimestamp } from './activitySync';
import { FakeActivitiesServer } from './fakeActivitiesServer';
import { pageSize, type FetchLike } from './fetchActivities';
import { getBundledActivities } from './bundledActivities';

// Der Zwischenspeicher (activitiesStorage) wird hier nicht benutzt, ist aber eingebunden und braucht den Ersatz für das Handy.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const config = { url: 'https://abc.supabase.co', anonKey: 'sb_publishable_geheim123' };
const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
const hour = 60 * 60 * 1000;
const day = 24 * hour;

const rowsOf = (count: number, name = 'a') =>
  Array.from({ length: count }, (_, i) => activityToRow(makeActivity({ id: `${name}-${String(i).padStart(4, '0')}` })));
const ids = (record: ActivitiesRecord | null) => record?.activities.map((activity) => activity.id) ?? [];

let warn: jest.SpyInstance;
let info: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  info = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

// Ein Gerät: merkt sich seinen Bestand (wie der Zwischenspeicher) und gleicht ab.
function device(server: FakeActivitiesServer, start: ActivitiesRecord | null = null) {
  let record = start;
  let clock = 1_000 * day; // Uhr des Handys (beliebig, unabhängig vom Server)
  const save = jest.fn(async (next: ActivitiesRecord) => {
    record = next;
  });
  return {
    save,
    get record() {
      return record;
    },
    set record(value: ActivitiesRecord | null) {
      record = value;
    },
    setClock(ms: number) {
      clock = ms;
    },
    async sync(fetchImpl: FetchLike = server.fetch) {
      clock += day;
      server.advance(day);
      server.clearLog();
      const result = await refreshActivities({ config, imagePrefix: prefix, previous: record, now: () => clock, fetchImpl, save });
      return result;
    },
  };
}

const kinds = (server: FakeActivitiesServer) => server.log.map((entry) => entry.kind);

describe('erster Abruf und nur Änderungen', () => {
  it('ohne Bestand: alles laden, nach ID sortiert, mit Stand', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(119).reverse());
    const phone = device(server);
    const record = await phone.sync();
    expect(ids(record)).toEqual(rowsOf(119).map((row) => row.id));
    expect(kinds(server)).toEqual(['count', 'changes']);
    expect(record?.cursor).toBe('2026-10-18T16:00:00.000000Z'); // der Zeitstempel des Stapels
    expect(record?.idCheckedAt).toBe(record?.fetchedAt); // ein voller Abruf zählt als ID-Abgleich
    expect(phone.save).toHaveBeenCalledWith(record);
    expect(String(info.mock.calls[0][0])).toContain('119 von Supabase geladen');
  });

  it('am nächsten Tag ohne Änderung: zwei kleine Anfragen, leere Antworten, keine ID-Liste', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(119));
    const phone = device(server);
    const first = await phone.sync();
    const second = await phone.sync();
    expect(kinds(server)).toEqual(['count', 'changes']);
    expect(server.log.map((entry) => entry.body)).toEqual(['[]', '[]']);
    expect(ids(second)).toEqual(ids(first));
    expect(second?.cursor).toBe(first?.cursor);
  });

  it('nach dem Wochenlauf: nur die 15 neuen werden übertragen, der Stapel danach nicht noch einmal', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(119));
    const phone = device(server);
    await phone.sync();
    server.upsert(rowsOf(15, 'neu'));
    const record = await phone.sync();
    expect(record?.activities).toHaveLength(134);
    expect(JSON.parse(server.log[1].body)).toHaveLength(15);
    await phone.sync();
    expect(server.log[1].body).toBe('[]');
  });

  it('geänderte Aktivität ersetzt die alte Fassung', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(5));
    const phone = device(server);
    await phone.sync();
    server.upsert([{ ...rowsOf(5)[2], age_min: 9, age_max: 12 }]);
    const record = await phone.sync();
    expect(record?.activities.find((activity) => activity.id === 'a-0002')?.ageMin).toBe(9);
    expect(record?.activities).toHaveLength(5);
  });

  it(`mehr als ${pageSize} Zeilen mit gleichem Zeitstempel (ein großer Stapel): keine geht verloren, keine doppelt`, async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(pageSize + 123));
    const phone = device(server);
    expect(await phone.sync()).toBeTruthy();
    expect(phone.record?.activities).toHaveLength(pageSize + 123);
    server.upsert(rowsOf(2 * pageSize + 7, 'b'));
    await phone.sync();
    expect(phone.record?.activities).toHaveLength(3 * pageSize + 130);
    expect(new Set(ids(phone.record)).size).toBe(3 * pageSize + 130);
  });

  it('eine Zeile ändert sich während des Abrufs zwischen zwei Seiten: nichts wird übersprungen', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(2 * pageSize + 10));
    let changesCalls = 0;
    const fetchImpl: FetchLike = async (url, init) => {
      const response = await server.fetch(url, init);
      if (server.log.at(-1)?.kind === 'changes') {
        changesCalls += 1;
        if (changesCalls === 1) {
          server.advance(1);
          server.upsert([{ ...rowsOf(1)[0], age_max: 15 }]); // eine Zeile der ersten Seite wandert ans Ende
        }
      }
      return response;
    };
    const phone = device(server);
    const record = await phone.sync(fetchImpl);
    expect(record?.activities).toHaveLength(2 * pageSize + 10);
  });

  it('ein Schreibvorgang lief beim Abruf noch (Startzeit vor dem Stand): der nächste Abruf holt ihn trotzdem', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();

    // Der Wochenlauf beginnt, schreibt aber noch; kurz danach wird etwas anderes gespeichert und ist sofort sichtbar.
    server.advance(day - 60_000);
    const tx = server.begin(rowsOf(3, 'langsam'));
    server.advance(5_000);
    server.upsert(rowsOf(1, 'schnell'));
    server.advance(5_000);
    server.clearLog();
    const during = await refreshActivities({ config, imagePrefix: prefix, previous: phone.record, now: () => 0, fetchImpl: server.fetch, save: phone.save });
    phone.record = during;
    expect(ids(during)).toContain('schnell-0000');
    expect(ids(during)).not.toContain('langsam-0000');
    // Der Stand liegt mindestens 15 Minuten vor der Uhrzeit des Servers, also vor dem Start des Schreibvorgangs.
    expect(parseTimestamp(during?.cursor)).toBeLessThanOrEqual(server.clock - cursorOverlapMicros);

    server.commit(tx);
    const after = await phone.sync();
    expect(ids(after)).toEqual(expect.arrayContaining(['langsam-0000', 'langsam-0001', 'langsam-0002', 'schnell-0000']));
  });
});

describe('Zurückgezogenes verschwindet', () => {
  it('auf draft gesetzt: die Zählprobe weicht ab, die ID-Liste entfernt die Aktivität', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(119));
    const phone = device(server);
    await phone.sync();
    server.setStatus(['a-0007'], 'draft');
    const record = await phone.sync();
    expect(kinds(server)).toEqual(['count', 'changes', 'ids']);
    expect(ids(record)).not.toContain('a-0007');
    expect(record?.activities).toHaveLength(118);
    expect(String(info.mock.calls.at(-1)?.[0])).toContain('1 zurückgezogen');
    // Danach stimmt die Zählprobe wieder: keine ID-Liste mehr.
    await phone.sync();
    expect(kinds(server)).toEqual(['count', 'changes']);
  });

  it('ein ganzer Lauf zurückgezogen (batch_id → rejected) und gleichzeitig neue: alles stimmt', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(100));
    server.upsert(rowsOf(15, 'lauf1'));
    const phone = device(server);
    await phone.sync();
    server.setStatus(rowsOf(15, 'lauf1').map((row) => row.id), 'rejected');
    server.upsert(rowsOf(15, 'lauf2'));
    const record = await phone.sync();
    expect(record?.activities).toHaveLength(115);
    expect(ids(record).some((id) => id.startsWith('lauf1'))).toBe(false);
  });

  it('wieder freigegeben: kommt mit den Änderungen zurück', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    server.setStatus(['a-0003'], 'draft');
    await phone.sync();
    server.setStatus(['a-0003'], 'approved');
    const record = await phone.sync();
    expect(ids(record)).toContain('a-0003');
    expect(kinds(server)).toEqual(['count', 'changes']);
  });

  it('im Dashboard gelöscht: verschwindet ebenso', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    server.delete(['a-0000']);
    expect(ids(await phone.sync())).not.toContain('a-0000');
  });

  it('die Datenbank hat weniger Aktivitäten als data/: verglichen wird nur, was aus Supabase stammt (keine tägliche ID-Liste)', async () => {
    const bundled = getBundledActivities();
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(20));
    expect(bundled.length).toBeGreaterThan(20);
    const phone = device(server);
    const first = await phone.sync();
    expect(first?.activities).toHaveLength(20);
    expect(ids(first).some((id) => bundled.some((activity) => activity.id === id))).toBe(false);
    for (let round = 0; round < 3; round += 1) {
      await phone.sync();
      expect(kinds(server)).toEqual(['count', 'changes']);
    }
  });

  it(`spätestens nach ${idCheckDays} Tagen die ID-Liste, auch wenn die Zählprobe stimmt (repariert ein vertauschtes Paar)`, async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    // Auf dem Gerät fehlt eine Aktivität und eine falsche ist da (gleiche Anzahl): nur der Abgleich findet das.
    const record = phone.record!;
    phone.record = { ...record, activities: [...record.activities.filter((activity) => activity.id !== 'a-0004'), makeActivity({ id: 'geist' })] };
    for (let round = 1; round < idCheckDays; round += 1) {
      await phone.sync();
      expect(kinds(server)).toEqual(['count', 'changes']);
    }
    const fixed = await phone.sync();
    expect(kinds(server)).toEqual(['count', 'changes', 'ids', 'byIds']);
    expect(ids(fixed)).toContain('a-0004');
    expect(ids(fixed)).not.toContain('geist');
    expect(fixed?.idCheckedAt).toBe(fixed?.fetchedAt);
  });

  it(`fehlen mehr als ${maxTargetedFetch}, wird alles neu geladen statt einzeln`, async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(300));
    const phone = device(server);
    await phone.sync();
    phone.record = { ...phone.record!, activities: phone.record!.activities.slice(0, 150) };
    const record = await phone.sync();
    expect(kinds(server)).toEqual(['count', 'changes', 'ids', 'changes']);
    expect(record?.activities).toHaveLength(300);
  });

  it('ohne content-range (Anzahl unbekannt) wird nicht verglichen; die ID-Liste kommt dann nach 30 Tagen', async () => {
    const server = new FakeActivitiesServer();
    server.sendCountHeader = false;
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    server.setStatus(['a-0001'], 'draft');
    await phone.sync();
    expect(kinds(server)).toEqual(['count', 'changes']);
    expect(ids(phone.record)).toContain('a-0001');
    phone.record = { ...phone.record!, idCheckedAt: 0 };
    expect(ids(await phone.sync())).not.toContain('a-0001');
  });
});

describe('weniger als 3 gültige ersetzen nichts', () => {
  it('Zählprobe meldet 2: nichts ändern, nichts speichern', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(2));
    const phone = device(server);
    expect(await phone.sync()).toBeNull();
    expect(phone.save).not.toHaveBeenCalled();
    expect(warn.mock.calls.map((call) => String(call[0])).some((message) => message.includes('mindestens 3'))).toBe(true);
  });

  it('nach dem Zusammenführen weniger als 3 (Zurückgezogenes): der bisherige Bestand bleibt', async () => {
    const server = new FakeActivitiesServer();
    server.sendCountHeader = false;
    server.upsert(rowsOf(4));
    const phone = device(server);
    const before = await phone.sync();
    server.upsert([{ ...rowsOf(4)[0], age_min: 'zwei' as unknown as number }, { ...rowsOf(4)[1], age_min: 'zwei' as unknown as number }]);
    expect(await phone.sync()).toBeNull();
    expect(phone.record).toBe(before);
  });

  it('liefert der Server Entwürfe mit (Fehler in der Datenbank-Regel), kommen sie nie in den Bestand', async () => {
    const leakedRows = [...rowsOf(4), activityToRow(makeActivity({ id: 'entwurf', status: 'draft' }))].map((row, i) => ({
      ...row,
      updated_at: `2026-10-18T16:00:0${i}+00:00`,
    }));
    const leaky: FetchLike = async (url) => ({
      ok: true,
      status: 200,
      json: async () => (url.includes('limit=0') ? [] : leakedRows),
      headers: { get: (name: string) => (name === 'content-range' ? '*/5' : null) },
    });
    const save = jest.fn();
    const record = await refreshActivities({ config, imagePrefix: prefix, fetchImpl: leaky, save });
    expect(ids(record)).toEqual(['a-0000', 'a-0001', 'a-0002', 'a-0003']);
    expect(JSON.stringify(save.mock.calls[0][0])).not.toContain('entwurf');
  });
});

describe('Rückfall: nichts davon wirft, nichts davon schreibt etwas', () => {
  it.each([
    ['Zählprobe', 'count'],
    ['Änderungen', 'changes'],
    ['ID-Liste', 'ids'],
    ['Nachladen', 'byIds'],
  ] as const)('Fehler bei %s: null, Bestand und Stand unverändert, eine Warnung', async (_name, failing) => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    // Zwei zurückziehen und eines auf dem Gerät entfernen, damit alle vier Anfragen nötig werden (Gerät 9, Server 8).
    server.setStatus(['a-0001', 'a-0002'], 'draft');
    phone.record = { ...phone.record!, activities: phone.record!.activities.filter((activity) => activity.id !== 'a-0009') };
    const before = phone.record;
    phone.save.mockClear();
    warn.mockClear();
    const fetchImpl: FetchLike = async (url, init) => {
      const response = await server.fetch(url, init);
      return server.log.at(-1)?.kind === failing ? { ok: false, status: 503, json: async () => ({}) } : response;
    };
    expect(await phone.sync(fetchImpl)).toBeNull();
    expect(phone.save).not.toHaveBeenCalled();
    expect(phone.record).toBe(before);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('HTTP 503');
  });

  it('kein Netz', async () => {
    const phone = device(new FakeActivitiesServer());
    expect(await phone.sync(async () => Promise.reject(new TypeError('Network request failed')))).toBeNull();
    expect(String(warn.mock.calls[0][0])).toContain('Network request failed');
  });

  it('die Warnungen nennen weder Schlüssel noch Adresse', async () => {
    const server = new FakeActivitiesServer();
    server.failWith = () => 401;
    await device(server).sync();
    const logs = JSON.stringify([...warn.mock.calls, ...info.mock.calls]);
    expect(logs).not.toContain(config.anonKey);
    expect(logs).not.toContain(config.url);
    expect(logs).not.toContain('supabase.co');
  });

  it('Speichern auf dem Gerät schlägt fehl: der neue Bestand gilt trotzdem (bis zum Schließen der App), mit Warnung', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(4));
    const record = await refreshActivities({ config, imagePrefix: prefix, fetchImpl: server.fetch, save: jest.fn().mockRejectedValue(new Error('Speicher voll')) });
    expect(record?.activities).toHaveLength(4);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('Speichern');
  });
});

describe('Bilder (M9b, Migration 0006)', () => {
  const bucket = `${prefix}activity-images/activities/a-0001/`;
  const cover = `${bucket}cover-0123456789abcdef.svg`;
  const step = (n: number) => `${bucket}step-${n}-000000000000000${n}.svg`;
  const withImages = (image: string | null, stepImages: Record<string, string> | null) => ({
    ...activityToRow(makeActivity({ id: 'a-0001', translations: {
      de: { title: 'Titel', summary: 'Kurz', steps: ['Eins', 'Zwei', 'Drei'] },
      en: { title: 'Title', summary: 'Short', steps: ['One', 'Two', 'Three'] },
    } })),
    image,
    step_images: stepImages,
  });

  it('Datenbank ohne step_images (Migration 0006 fehlt): der Abgleich scheitert still, Bestand und Stand bleiben, eine Warnung', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(5));
    const phone = device(server);
    await phone.sync();
    const before = phone.record;
    server.missingColumns = ['step_images'];
    server.advance(hour);
    server.upsert(rowsOf(2, 'neu'));
    phone.save.mockClear();
    warn.mockClear();
    expect(await phone.sync()).toBeNull();
    expect(phone.save).not.toHaveBeenCalled();
    expect(phone.record).toBe(before);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('HTTP 400');
    // Ist die Migration eingespielt, klappt der nächste Abgleich (ein Fehlschlag erneuert den Zeitpunkt nicht).
    server.missingColumns = [];
    expect(ids(await phone.sync())).toHaveLength(7);
  });

  it('erster Start ohne Zwischenspeicher und ohne step_images in der Datenbank: null (die App bleibt beim Mitgelieferten)', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(5));
    server.missingColumns = ['step_images'];
    const phone = device(server);
    expect(await phone.sync()).toBeNull();
    expect(phone.save).not.toHaveBeenCalled();
  });

  it('ein gesetztes Bild ändert updated_at: das Gerät holt Titelbild und Schrittbilder mit den Änderungen, nur diese eine Zeile', async () => {
    const server = new FakeActivitiesServer();
    server.upsert([...rowsOf(4, 'b'), withImages(null, null)]);
    const phone = device(server);
    await phone.sync();
    expect(phone.record?.activities.find((activity) => activity.id === 'a-0001')?.image).toBeUndefined();
    server.advance(hour);
    server.upsert([withImages(cover, { 1: step(1), 3: step(3) })]); // set_activity_images: der Trigger setzt updated_at neu
    await phone.sync();
    const changes = server.log.filter((entry) => entry.kind === 'changes');
    expect(changes).toHaveLength(1);
    expect(JSON.parse(changes[0].body)).toHaveLength(1);
    const activity = phone.record?.activities.find((entry) => entry.id === 'a-0001');
    expect(activity?.image).toBe(cover);
    expect(activity?.stepImages).toEqual({ 1: step(1), 3: step(3) });
  });

  it('zurückgezogen (image und step_images NULL, z. B. weil sich der Sicherheitshinweis geändert hat): das Gerät zeigt keine Bilder mehr', async () => {
    const server = new FakeActivitiesServer();
    server.upsert([...rowsOf(4, 'b'), withImages(cover, { 2: step(2) })]);
    const phone = device(server);
    await phone.sync();
    expect(phone.record?.activities.find((activity) => activity.id === 'a-0001')?.stepImages).toEqual({ 2: step(2) });
    server.advance(hour);
    server.upsert([withImages(null, null)]);
    await phone.sync();
    const activity = phone.record?.activities.find((entry) => entry.id === 'a-0001');
    expect(activity?.image).toBeUndefined();
    expect(activity?.stepImages).toBeUndefined();
  });

  it('ein einzelnes falsches Schrittbild (fremder Speicher, Schritt fehlt) fällt weg, die übrigen und die Aktivität bleiben', async () => {
    const server = new FakeActivitiesServer();
    server.upsert([...rowsOf(4, 'b'), withImages(cover, { 1: 'https://example.org/x.svg', 2: step(2), 7: step(7) })]);
    const phone = device(server);
    await phone.sync();
    const activity = phone.record?.activities.find((entry) => entry.id === 'a-0001');
    expect(activity?.image).toBe(cover);
    expect(activity?.stepImages).toEqual({ 2: step(2) });
    expect(warn.mock.calls.some((call) => String(call[0]).includes('Schrittbild'))).toBe(true);
  });
});

describe('kaputter Stand und falsche Uhr', () => {
  it('Stand nicht lesbar: einmal alles laden, der bisherige Bestand bleibt bis dahin', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    phone.record = { ...phone.record!, cursor: null };
    server.upsert(rowsOf(1, 'neu'));
    const record = await phone.sync();
    expect(server.log[1].body.length).toBeGreaterThan(1000); // alles, nicht nur die Änderung
    expect(record?.activities).toHaveLength(11);
    expect(record?.cursor).not.toBeNull();
  });

  it('Stand in der Zukunft (Datenbank aus einer Sicherung wiederhergestellt): Warnung und einmal alles laden', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    phone.record = { ...phone.record!, cursor: '2030-01-01T00:00:00.000000Z' };
    server.upsert(rowsOf(1, 'neu'));
    const record = await phone.sync();
    expect(ids(record)).toContain('neu-0000');
    expect(warn.mock.calls.map((call) => String(call[0])).some((message) => message.includes('Stand'))).toBe(true);
    expect(parseTimestamp(record?.cursor)).toBeLessThan(parseTimestamp('2027-01-01T00:00:00Z') as number);
  });

  it('die Uhr des Handys spielt für den Stand keine Rolle (Uhr Jahre vor oder zurück)', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    phone.setClock(-5 * 365 * day);
    const first = await phone.sync();
    phone.setClock(50 * 365 * day);
    server.upsert(rowsOf(2, 'neu'));
    const second = await phone.sync();
    expect(first?.cursor).toBe('2026-10-18T16:00:00.000000Z');
    expect(second?.activities).toHaveLength(12);
  });

  it('Zeitpunkt des ID-Abgleichs in der Zukunft (Uhr war vorgestellt): ID-Liste gilt als fällig', async () => {
    const server = new FakeActivitiesServer();
    server.upsert(rowsOf(10));
    const phone = device(server);
    await phone.sync();
    phone.record = { ...phone.record!, idCheckedAt: 99_999 * day };
    await phone.sync();
    expect(kinds(server)).toContain('ids');
  });

  it('ohne Kopfzeile Date: Stand = größter Zeitstempel minus 15 Minuten (sicher, lädt den letzten Stapel einmal doppelt)', async () => {
    const server = new FakeActivitiesServer();
    server.sendDateHeader = false;
    server.upsert(rowsOf(10));
    const phone = device(server);
    const record = await phone.sync();
    expect(parseTimestamp(record?.cursor)).toBe((parseTimestamp('2026-10-18T16:00:00Z') as number) - cursorOverlapMicros);
    await phone.sync();
    expect(JSON.parse(server.log[1].body)).toHaveLength(10);
  });
});

it('eine kaputte geänderte Zeile auf dem Server entfernt die Aktivität vom Gerät (keine veraltete Fassung)', async () => {
  const server = new FakeActivitiesServer();
  server.upsert(rowsOf(10));
  const phone = device(server);
  await phone.sync();
  server.upsert([{ ...rowsOf(10)[3], category: 'unbekannt' }]);
  const record = await phone.sync();
  expect(ids(record)).not.toContain('a-0003');
});
