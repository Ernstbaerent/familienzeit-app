// Datenverkehr der Bilder messen und rechnen (M9b, Lieferung). Gemessen wird:
//  1. die Größe echter Titel- und Schrittbilder aus dem Baukasten (alle Probe- und Beispielszenen, gezeichnet wie im Bilder-Lauf),
//     ungepackt und gepackt (gzip),
//  2. um wie viel eine Zeile der Tabelle mit Bild-Adressen wächst und was ein Gerät einmal nachlädt, wenn die Bilder angehängt werden
//     (Testserver aus M8b, echte Aktivitäten aus data/, für 1 500 vervielfältigt).
// Gerechnet wird daraus, was ein Gerät im Monat an Bildern lädt, mit und ohne Gerätespeicher (Annahmen unten, nicht gemessen).
// Die Tabelle zeigt `TRAFFIC_REPORT=1 npx jest imageTraffic`. Die Zahlen stehen in docs/supabase.md („Bilder: Datenverkehr“).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { loadCatalog } from '../../../scripts/lib/kit/catalog';
import { renderSceneSvg } from '../../../scripts/lib/kit/scene';
import type { Scene } from '../../../scripts/lib/kit/types';

import type { Activity } from './activities';
import type { ActivitiesRecord } from './activitiesCache';
import { activityToRow } from './activityRow';
import { refreshActivities } from './activityRefresh';
import { getBundledActivities } from './bundledActivities';
import { FakeActivitiesServer } from './fakeActivitiesServer';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const root = join(__dirname, '../../..');
const report = process.env.TRAFFIC_REPORT === '1';
const config = { url: 'https://abcdefghijklmnopqrst.supabase.co', anonKey: 'sb_publishable_test' };
const prefix = `${config.url}/storage/v1/object/public/`;
const day = 24 * 60 * 60 * 1000;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2).replace('.', ',')} MB`;

// Annahmen für einen Monat auf einem Gerät (nicht gemessen): 20 Mal Ideen holen, je 3 Karten und bei jedem dritten Mal
// „Drei neue Ideen“ (also etwa 4 Karten je Mal), dazu 10 Detailansichten. Schrittbilder: etwa 5 je Aktivität mit Schrittbildern,
// beim Startbestand 25 solche Aktivitäten (Basteln und Experimente zuerst, docs/bilder-plan.md).
const usesPerMonth = 20;
const cardsPerUse = 4;
const detailViewsPerMonth = 10;
const stepImagesPerActivity = 5;

// Wie viele verschiedene Bilder bei `views` zufälligen Anzeigen aus `catalog` Aktivitäten vorkommen (Erwartungswert).
const distinct = (views: number, catalog: number) => catalog * (1 - (1 - 1 / catalog) ** views);

// 1. Echte Bilder aus dem Baukasten.
const catalog = loadCatalog(root);
const sceneFiles = ['assets/bausteine/probe', 'assets/bausteine/beispiele'].flatMap((dir) =>
  readdirSync(join(root, dir))
    .filter((name) => name.endsWith('.scene.json'))
    .map((name) => join(dir, name)),
);
const images = sceneFiles.map((file) => {
  const scene = JSON.parse(readFileSync(join(root, file), 'utf8')) as Scene;
  const svg = renderSceneSvg(scene, catalog);
  return { file, purpose: scene.purpose, raw: Buffer.byteLength(svg), gzip: gzipSync(svg).length };
});
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const meanRaw = average(images.map((image) => image.raw));
const meanGzip = average(images.map((image) => image.gzip));

// 2. Zeilen mit Bild-Adressen (so lang wie die echten: Projekt, Bucket, Ordner der Aktivität, Name mit Prüfsumme).
const coverUrl = (id: string) => `${prefix}activity-images/activities/${id}/cover-0123456789abcdef.svg`;
const stepUrls = (id: string, steps: number) =>
  Object.fromEntries(Array.from({ length: steps }, (_, i) => [String(i + 1), `${prefix}activity-images/activities/${id}/step-${i + 1}-0123456789abcdef.svg`]));

function catalogOf(count: number): Activity[] {
  const base = getBundledActivities();
  return Array.from({ length: count }, (_, i) => {
    const source = base[i % base.length];
    const copy = Math.floor(i / base.length);
    return { ...source, id: copy === 0 ? source.id : `${source.id}-${copy}` };
  });
}

const lines: string[] = [];
const note = (label: string, value: string) => lines.push(`${label} | ${value}`);
afterAll(() => {
  if (report) console.log(['Was | Wert', ...lines].join('\n'));
});

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('Größe der Bilder (Baukasten, gezeichnet wie im Bilder-Lauf)', () => {
  it('alle Probe- und Beispielbilder unter 14 KB, im Mittel einige KB, gepackt etwa ein Drittel', () => {
    expect(images.length).toBeGreaterThanOrEqual(10);
    for (const image of images) expect(image.raw).toBeLessThan(14 * 1024);
    note('Bilder gemessen', `${images.length} (Probe- und Beispielszenen)`);
    note('Größe je Bild ungepackt', `${kb(Math.min(...images.map((i) => i.raw)))} bis ${kb(Math.max(...images.map((i) => i.raw)))}, Mittel ${kb(meanRaw)}`);
    note('Größe je Bild gepackt (gzip)', `${kb(Math.min(...images.map((i) => i.gzip)))} bis ${kb(Math.max(...images.map((i) => i.gzip)))}, Mittel ${kb(meanGzip)}`);
    expect(meanRaw).toBeGreaterThan(1024);
    expect(meanRaw).toBeLessThan(10 * 1024);
    expect(meanGzip).toBeLessThan(meanRaw / 2);
  });
});

describe('Zeilen: einmal nachladen, wenn die Bilder angehängt werden', () => {
  it('eine Adresse macht die Zeile etwa 130 Byte länger, fünf Schrittbilder etwa 700 Byte', () => {
    const activity = getBundledActivities()[0];
    const plain = Buffer.byteLength(JSON.stringify(activityToRow(activity)));
    const withCover = Buffer.byteLength(JSON.stringify(activityToRow({ ...activity, image: coverUrl(activity.id) })));
    const withSteps = Buffer.byteLength(JSON.stringify(activityToRow({ ...activity, image: coverUrl(activity.id), stepImages: stepUrls(activity.id, 5) })));
    note('Zeile ohne Bild / mit Titelbild / mit Titel- und 5 Schrittbildern', `${plain} / ${withCover} / ${withSteps} Byte`);
    expect(withCover - plain).toBeLessThan(200);
    expect(withSteps - withCover).toBeLessThan(5 * 160);
  });

  it.each([119, 1500])('%i Aktivitäten: Bilder für alle in Läufen zu 25 (einmal je Gerät nachladen)', async (count) => {
    const server = new FakeActivitiesServer();
    const activities = catalogOf(count);
    server.upsert(activities.map(activityToRow));
    let record: ActivitiesRecord | null = null;
    let clock = 1_000 * day;
    const sync = async () => {
      server.advance(day);
      clock += day;
      server.clearLog();
      const next = await refreshActivities({ config, imagePrefix: prefix, previous: record, now: () => clock, fetchImpl: server.fetch, save: async () => {} });
      if (next) record = next;
      return server.log.reduce((sum, entry) => ({ raw: sum.raw + Buffer.byteLength(entry.body), gzip: sum.gzip + gzipSync(entry.body).length }), { raw: 0, gzip: 0 });
    };
    await sync(); // erster Abruf (alles), zählt nicht
    let total = { raw: 0, gzip: 0 };
    const runs = Math.ceil(count / 25);
    for (let run = 0; run < runs; run += 1) {
      const batch = activities.slice(run * 25, run * 25 + 25);
      server.upsert(batch.map((activity) => activityToRow({ ...activity, image: coverUrl(activity.id) }))); // set_activity_images: updated_at neu
      const today = await sync();
      total = { raw: total.raw + today.raw, gzip: total.gzip + today.gzip };
    }
    const withImage = (record as ActivitiesRecord | null)?.activities.filter((activity) => activity.image !== undefined).length;
    expect(withImage).toBe(count);
    note(`${count} Aktivitäten: Zeilen nachladen, verteilt auf ${runs} Läufe`, `${kb(total.raw)} ungepackt / ${kb(total.gzip)} gepackt (einmal je Gerät)`);
    // Etwa so viel wie ein voller Abruf, verteilt auf die Tage der Läufe.
    expect(total.raw / count).toBeGreaterThan(1500);
    expect(total.raw / count).toBeLessThan(3500);
  });
});

describe('Bilder je Gerät und Monat (gerechnet)', () => {
  it.each([119, 1500])('%i Aktivitäten: mit und ohne Gerätespeicher', (count) => {
    const cardViews = usesPerMonth * cardsPerUse;
    const coverViews = cardViews + detailViewsPerMonth;
    // Ohne Gerätespeicher: jede Anzeige lädt das Bild neu.
    const coversNoCache = coverViews * meanRaw;
    // Mit Gerätespeicher (expo-image, cachePolicy disk): jedes Bild nur einmal, bis der Speicher es verdrängt.
    const coversCached = distinct(cardViews, count) * meanRaw;
    // Schrittbilder: nur in der Detailansicht, nur bei Aktivitäten mit Schrittbildern (Anteil am Bestand).
    const share = Math.min(1, 25 / count);
    const stepsNoCache = detailViewsPerMonth * share * stepImagesPerActivity * meanRaw;
    const stepsCached = distinct(detailViewsPerMonth * share, Math.max(1, count * share)) * stepImagesPerActivity * meanRaw;
    const fullCatalog = count * meanRaw;
    note(`${count}: Titelbilder je Gerät und Monat ohne / mit Gerätespeicher`, `${kb(coversNoCache)} / ${kb(coversCached)}`);
    note(`${count}: Schrittbilder je Gerät und Monat ohne / mit Gerätespeicher`, `${kb(stepsNoCache)} / ${kb(stepsCached)}`);
    note(`${count}: Obergrenze, ein Gerät sieht jedes Titelbild einmal`, mb(fullCatalog));
    for (const devices of [200, 1000, 5000]) {
      note(`${count}: ${devices} Geräte im Monat ohne / mit Gerätespeicher`, `${mb(devices * (coversNoCache + stepsNoCache))} / ${mb(devices * (coversCached + stepsCached))}`);
    }
    expect(coversCached).toBeLessThanOrEqual(coversNoCache);
    expect(coversNoCache).toBeLessThan(1024 * 1024); // unter 1 MB je Gerät und Monat
  });
});
