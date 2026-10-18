// Bild-Test (M9b, Schritt 3b): Abfrage bei Supabase, Schema und Prompt, Umwandlung der Antwort, Ablauf mit Prüfung und Kosten, Zusammenfassung.
// Alles mit nachgestelltem Internet: kein echtes Netz, keine echten Schlüssel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadActivityData } from '../activityData';
import { loadCatalog, loadExampleScenes } from '../kit/catalog';
import { loadProbe, type ProbeActivity } from '../kit/probe';
import { checkScene, contextFromActivity } from '../kit/scene';
import type { FetchLike, HttpRequest } from '../weekly/http';
import { buildHeaders, buildKiUrl, buildUrl, defaultIds, fetchTestActivities, parseIds, parseKi, rowToActivity } from './activities';
import { buildSceneSchema, buildSystemPrompt, buildUserPrompt, toScene } from './prompt';
import { describeScene, drawAll, maxAttempts, models, summaryMarkdown } from './run';

const root = join(__dirname, '../../..');
const catalog = loadCatalog(root);
const examples = [...loadExampleScenes(root).entries()].slice(0, 4).map(([name, scene]) => ({ name, scene }));
const probe = loadProbe(root);
const byId = new Map<string, ProbeActivity>([...loadActivityData().activities, ...probe.extra].map((activity) => [activity.id, activity as ProbeActivity]));
const puddle = byId.get('puddle-explorers') as ProbeActivity;
const anon = 'sb_publishable_TESTKEY_abcdefghijklmnop';
const apiKey = 'sk-ant-api03-TESTKEY-abcdefghijklmnopqrstuvwxyz0123456789';

type Reply = { status?: number; body: unknown };
function fakeFetch(replies: Reply[]): { fetchImpl: FetchLike; calls: { url: string; init: HttpRequest }[] } {
  const calls: { url: string; init: HttpRequest }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const reply = replies.shift() ?? { status: 500, body: { error: { type: 'api_error', message: 'keine Antwort mehr' } } };
    const status = reply.status ?? 200;
    return { ok: status < 400, status, headers: { get: () => null }, text: async () => JSON.stringify(reply.body) };
  };
  return { fetchImpl, calls };
}

// Eine Antwort der Claude API mit der Szene als JSON (in der Form des Schemas: unbenutzte Felder sind null).
const nullItem = { block: null, figure: null, pose: null, tint: null, content: null, hot: null, size: null, flip: null, mitts: null, rainOutfit: null, holds: null, hands: null };
function claudeReply(scene: { noScene?: boolean; reason?: string; layout: string; items: Record<string, unknown>[] }, usage = { input_tokens: 7000, output_tokens: 600 }): Reply {
  const data = { noScene: scene.noScene ?? false, reason: scene.reason ?? '', layout: scene.layout, items: scene.items.map((item) => ({ ...nullItem, ...item })) };
  return { body: { content: [{ type: 'text', text: JSON.stringify(data) }], stop_reason: 'end_turn', usage } };
}
const goodPuddle = {
  layout: 'outdoor',
  items: [
    { slot: 'mid', figure: 'ilka', pose: 'hold-plate', rainOutfit: 'petrol', holds: { left: null, right: { block: 'bucket', content: 'leaves', tint: null, hot: null, size: 0.6 }, both: null, surface: null } },
    { slot: 's3', figure: 'jette', pose: 'hold-plate', flip: false, rainOutfit: 'rose', holds: { left: null, right: { block: 'stick', content: null, tint: null, hot: null, size: 0.6 }, both: null, surface: null } },
    { slot: 's4', block: 'puddle' },
  ],
};

describe('Aktivitäten lesen (nur lesen, öffentlicher Schlüssel)', () => {
  it('IDs: Vorgabe sind die fünf aus dem Plan, Liste mit Komma, nur sichere Zeichen, höchstens zehn', () => {
    expect(parseIds('')).toEqual([...defaultIds]);
    expect(parseIds(' baked-apples, dance-freeze ,dance-freeze')).toEqual(['baked-apples', 'dance-freeze']);
    expect(() => parseIds('a;drop')).toThrow(/Ungültige ID/);
    expect(() => parseIds(Array.from({ length: 11 }, (_, i) => `a${i}`).join(','))).toThrow(/Höchstens 10/);
  });

  it('Adresse: nur freigegebene, nur die nötigen Spalten, nur GET; geheimer Schlüssel wird abgelehnt', async () => {
    const url = buildUrl('https://testprojekt.supabase.co/', ['dance-freeze']);
    expect(url).toMatch(/^https:\/\/testprojekt\.supabase\.co\/rest\/v1\/activities\?select=id,age_min,age_max,materials,translations&status=eq\.approved&id=in\./);
    expect(() => buildUrl('http://unsicher', ['x'])).toThrow(/SUPABASE_URL/);
    expect(buildHeaders(anon)).toEqual({ apikey: anon, Accept: 'application/json' });
    expect(() => buildHeaders('sb_secret_abc')).toThrow(/GEHEIMEN Schlüssel/);
    expect(() => buildHeaders('')).toThrow(/fehlt/);
    const { fetchImpl, calls } = fakeFetch([{ body: [{ id: 'dance-freeze', age_min: 1, age_max: 12, materials: ['musicPlayer'], translations: (byId.get('dance-freeze') as ProbeActivity).translations }] }]);
    const result = await fetchTestActivities({ url: 'https://testprojekt.supabase.co', key: anon, ids: ['dance-freeze', 'gibt-es-nicht'], fetchImpl });
    expect(result.activities.map((a) => a.id)).toEqual(['dance-freeze']);
    expect(result.missing).toEqual(['gibt-es-nicht']);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].init.body).toBeUndefined();
  });

  it('KI-Aktivitäten: die neuesten mit batch_id, ohne die schon gewählten; Anzahl 0 bis 5, zusammen höchstens zehn', async () => {
    expect(parseKi('')).toBe(3);
    expect(parseKi(' 0 ')).toBe(0);
    expect(() => parseKi('6')).toThrow(/0 bis 5/);
    expect(() => parseKi('2; drop')).toThrow(/ungültig/);
    const url = buildKiUrl('https://testprojekt.supabase.co', 3, ['dance-freeze']);
    expect(url).toContain('status=eq.approved&batch_id=not.is.null');
    expect(url).toContain(`id=not.in.(${encodeURIComponent('"dance-freeze"')})`);
    expect(url).toMatch(/order=generated_at\.desc\.nullslast,id\.asc&limit=3$/);
    const ai = { id: 'ki-laternen', age_min: 4, age_max: 10, materials: ['paper'], translations: (byId.get('dance-freeze') as ProbeActivity).translations };
    const dance = { ...ai, id: 'dance-freeze', age_min: 1, age_max: 12, materials: ['musicPlayer'] };
    const { fetchImpl, calls } = fakeFetch([{ body: [dance] }, { body: [ai] }]);
    const result = await fetchTestActivities({ url: 'https://testprojekt.supabase.co', key: anon, ids: ['dance-freeze', 'baked-apples', 'gibt-es-nicht'], ki: 3, fallback: probe.extra, fetchImpl });
    expect(result.activities.map((a) => a.id)).toEqual(['dance-freeze', 'baked-apples', 'ki-laternen']);
    expect(result.fromFile).toEqual(['baked-apples']);
    expect(result.missing).toEqual(['gibt-es-nicht']);
    expect(result.ki).toEqual(['ki-laternen']);
    expect(calls.map((call) => call.init.method)).toEqual(['GET', 'GET']);
    expect(calls[1].url).toContain('batch_id=not.is.null');
    const full = Array.from({ length: 10 }, (_, i) => `a${i}`);
    await expect(fetchTestActivities({ url: 'https://testprojekt.supabase.co', key: anon, ids: full, ki: 1, fetchImpl: fakeFetch([]).fetchImpl })).rejects.toThrow(/Höchstens 10/);
  });

  it('kaputte Zeilen fallen weg, Fehler der Datenbank werden gemeldet', async () => {
    expect(rowToActivity({ id: 'x' })).toBeNull();
    const { fetchImpl } = fakeFetch([{ status: 401, body: { message: 'Invalid API key' } }]);
    await expect(fetchTestActivities({ url: 'https://testprojekt.supabase.co', key: anon, ids: ['x'], fetchImpl })).rejects.toThrow(/HTTP 401/);
  });
});

describe('Schema und Prompt', () => {
  const schema = buildSceneSchema(catalog);

  it('nur erlaubte Schema-Mittel (Structured Outputs): Objekte mit additionalProperties false und vollständigem required, keine Zahlen- oder Längengrenzen', () => {
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (typeof node !== 'object' || node === null) return;
      const entry = node as Record<string, unknown>;
      for (const key of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern']) expect(entry).not.toHaveProperty(key);
      if (entry.type === 'object') {
        expect(entry.additionalProperties).toBe(false);
        expect([...(entry.required as string[])].sort()).toEqual(Object.keys(entry.properties as object).sort());
      }
      Object.values(entry).forEach(walk);
    };
    walk(schema);
  });

  it('kennt jeden Baustein, jede Figur und jedes Layout; keine Koordinaten', () => {
    const text = JSON.stringify(schema);
    for (const id of catalog.keys()) if (id !== 'ground-line') expect(text).toContain(`"${id}"`);
    for (const id of ['jette', 'mats', 'nolli', 'ilka', 'arne', 'stups', 'tuepfel', 'hands', 'outdoor']) expect(text).toContain(`"${id}"`);
    expect(text).not.toMatch(/"x"|"y"|"svg"/);
  });

  it('der feste Teil nennt die harten Regeln, Bausteine mit Deckung und Beispiele; der Teil je Aktivität ihren Text und bei Wiederholung die Meldungen', () => {
    const system = buildSystemPrompt(catalog, examples);
    for (const phrase of ['nichts, was der Text nicht sagt', 'nur in der Hand eines Erwachsenen', 'mitts: true', 'Kinderschere', 'Erwachsene (ilka, arne) nur auf den Plätzen in der Mitte', 'noScene', 'NIE etwas in Petrol']) expect(system).toContain(phrase);
    expect(system).toContain('puddle (Pfütze');
    const user = buildUserPrompt(puddle);
    expect(user).toContain('Pfützen-Forscher');
    expect(user).toContain(puddle.translations.de.safetyNote as string);
    expect(buildUserPrompt(puddle, ['„stick“ ist zu lang'])).toMatch(/verworfen[\s\S]*„stick“ ist zu lang/);
  });

  it('die Antwort (mit null für Unbenutztes) wird zu einer Szene, die der Prüfer kennt', () => {
    const answer = toScene(JSON.parse((claudeReply(goodPuddle).body as { content: { text: string }[] }).content[0].text));
    expect(answer.noScene).toBe(false);
    expect(answer.scene.items[0]).toEqual({ slot: 'mid', figure: 'ilka', pose: 'hold-plate', outfit: { kind: 'rain', tint: 'petrol' }, holds: { right: { block: 'bucket', content: 'leaves', size: 0.6 } } });
    expect(answer.scene.items[2]).toEqual({ slot: 's4', block: 'puddle' });
    expect(checkScene(answer.scene, catalog, contextFromActivity(puddle))).toEqual([]);
  });
});

describe('Ablauf: wählen, prüfen, zeichnen', () => {
  it('besteht die Szene, wird sie gezeichnet; Kosten und Token werden gezählt', async () => {
    const { fetchImpl, calls } = fakeFetch([claudeReply(goodPuddle)]);
    const report = await drawAll({ activities: [puddle], catalog, examples, apiKey, model: models.haiku, fetchImpl });
    expect(report.results[0].passed).toBe(true);
    expect(report.results[0].svg).toMatch(/^<svg/);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.headers['x-api-key']).toBe(apiKey);
    const body = JSON.parse(calls[0].init.body as string) as { model: string; output_config: { format: { type: string } } };
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(report.tokens).toEqual({ input: 7000, output: 600 });
    expect(report.totalUsd).toBeCloseTo((7000 * 0.1 + 600 * 0.5) / 1_000_000, 8);
  });

  it('verletzt die erste Szene eine Regel, bekommt der zweite Aufruf die Meldungen; mehr als zwei Aufrufe gibt es nicht', async () => {
    // Jette allein an der Pfütze (Kinder unter 6 nur mit Erwachsenem): verworfen
    const bad = { layout: 'outdoor', items: [{ slot: 's1', figure: 'jette', pose: 'stand' }, { slot: 's4', block: 'puddle' }] };
    const { fetchImpl, calls } = fakeFetch([claudeReply(bad), claudeReply(bad), claudeReply(goodPuddle)]);
    const report = await drawAll({ activities: [puddle], catalog, examples, apiKey, model: models.sonnet, fetchImpl });
    expect(calls).toHaveLength(maxAttempts);
    expect(JSON.parse(calls[1].init.body as string).messages[0].content).toMatch(/verworfen[\s\S]*ohne Erwachsenen/);
    expect(report.results[0].passed).toBe(false);
    expect(report.results[0].attempts[1].problems.join(' ')).toMatch(/ohne Erwachsenen/);
  });

  it('keine Szene (Farbfläche) ist kein Fehler und braucht keinen zweiten Aufruf', async () => {
    const { fetchImpl, calls } = fakeFetch([claudeReply({ noScene: true, reason: 'Das Spiel lässt sich nicht zeigen.', layout: 'pair', items: [] })]);
    const report = await drawAll({ activities: [puddle], catalog, examples, apiKey, model: models.haiku, fetchImpl });
    expect(calls).toHaveLength(1);
    expect(report.results[0].attempts[0].noScene).toBe(true);
    expect(summaryMarkdown(report, new Set())).toMatch(/keine Szene: Das Spiel lässt sich nicht zeigen/);
  });

  it('Kostengrenze: Ist sie im schlimmsten Fall erreicht, gibt es keinen Aufruf mehr', async () => {
    const { fetchImpl, calls } = fakeFetch([claudeReply(goodPuddle)]);
    const report = await drawAll({ activities: [puddle, puddle], catalog, examples, apiKey, model: models.sonnet, fetchImpl, maxCostUsd: 0.01 });
    expect(calls).toHaveLength(0);
    expect(report.stopped).toMatch(/Kostengrenze/);
  });

  it('leeres Guthaben oder falscher Schlüssel beendet den ganzen Test, ohne den Schlüssel zu nennen', async () => {
    const { fetchImpl, calls } = fakeFetch([{ status: 402, body: { error: { type: 'billing_error', message: 'Your credit balance is too low' } } }]);
    const report = await drawAll({ activities: [puddle, puddle], catalog, examples, apiKey, model: models.haiku, fetchImpl });
    expect(calls).toHaveLength(1);
    expect(report.stopped).toMatch(/Guthaben/);
    const summary = summaryMarkdown(report, new Set());
    expect(summary).toMatch(/nicht versucht/);
    expect(summary).not.toContain(apiKey);
  });

  it('die Zusammenfassung nennt je Bild Szene, Prüfergebnis, Größe, Versuche, Token, Kosten, Figuren und das Artefakt', async () => {
    const { fetchImpl } = fakeFetch([claudeReply(goodPuddle)]);
    const report = await drawAll({ activities: [puddle], catalog, examples, apiKey, model: models.haiku, fetchImpl });
    const summary = summaryMarkdown(report, new Set(['puddle-explorers']));
    expect(summary).toContain('**1 von 1**');
    expect(summary).toContain('| Aktivität | Gewählte Szene | Prüfergebnis | Größe | Versuche | Token (Anfrage / Antwort) | Kosten | Figuren | Bild |');
    expect(summary).toContain('outdoor; mid: ilka hold-plate hält bucket mit leaves (Regenkleidung); s3: jette hold-plate hält stick (Regenkleidung); s4: puddle');
    expect(summary).toMatch(/\| bestanden \| \d+,\d KB \| 1 \| 7000 \/ 600 \| 0,0010 \$ \| ilka, jette \|/);
    expect(summary).toContain('`puddle-explorers.png`');
    expect(summary).toContain('Artefakt **bild-test**');
    expect(summary).toContain('### Zähler der Figuren');
    expect(summary).toContain('ilka 1/1, jette 1/1');
    expect(report.results[0].bytes).toBe(Buffer.byteLength(report.results[0].svg as string));
  });

  it('Figurenwahl: der Rat steht in der Anfrage, eine gesperrte Figur führt zum zweiten Versuch, der Zähler steht im Protokoll', async () => {
    // Zwei Bilder: höchstens eines je Figur (40 % von 2, mindestens 1). Das zweite Mal Jette und Ilka wird verworfen, Nolli mit Arne besteht.
    const swap: Record<string, string> = { jette: 'nolli', ilka: 'arne' };
    const withNolli = { ...goodPuddle, items: goodPuddle.items.map((item) => (item.figure === undefined ? item : { ...item, figure: swap[item.figure] ?? item.figure })) };
    const { fetchImpl, calls } = fakeFetch([claudeReply(goodPuddle), claudeReply(goodPuddle), claudeReply(withNolli)]);
    const log: string[] = [];
    const report = await drawAll({ activities: [puddle, puddle], catalog, examples, apiKey, model: models.haiku, fetchImpl, log: (line) => log.push(line) });
    expect(calls).toHaveLength(3);
    const prompt = (index: number): string => JSON.parse(calls[index].init.body as string).messages[0].content as string;
    expect(prompt(0)).toMatch(/Besetzung für dieses Bild[\s\S]*Kind-Figur: bevorzugt jette, sonst nolli, mats/);
    expect(prompt(1)).toMatch(/Kind-Figur: bevorzugt nolli[\s\S]*bevorzugt arne[\s\S]*NICHT jette: steht schon in 1 von 2 Titelbildern[\s\S]*NICHT ilka/);
    expect(prompt(2)).toMatch(/verworfen[\s\S]*„jette“ steht schon in 1 von 2/);
    expect(report.results.map((entry) => entry.passed)).toEqual([true, true]);
    expect(report.results[1].figures).toEqual(['arne', 'nolli']);
    expect(report.counts).toEqual({ ilka: 1, jette: 1, arne: 1, nolli: 1 });
    expect(log[1]).toBe('puddle-explorers: Figuren arne, nolli; Zähler arne 1/2, ilka 1/2, jette 1/2, nolli 1/2');
  });
});

describe('Workflow „Bild-Test“', () => {
  const yml = readFileSync(join(root, '.github/workflows/image-test.yml'), 'utf8');
  // Ein Job ohne Kommentarzeilen (dort steht „Kein npm ci“ als Erklärung)
  const section = (name: string, next?: string) =>
    yml
      .slice(yml.indexOf(`\n  ${name}:`), next === undefined ? undefined : yml.indexOf(`\n  ${next}:`))
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');

  it('nur manuell, mit Modell (Haiku oder Sonnet) als Eingabe, nur Leserechte im Repo', () => {
    expect(yml).toMatch(/on:\n  workflow_dispatch:/);
    expect(yml).not.toMatch(/schedule:/);
    expect(yml).toMatch(/options:\n {10}- haiku\n {10}- sonnet/);
    expect(yml).toMatch(/permissions:\n  contents: read/);
  });

  it('Jobs mit Schlüsseln installieren nichts; librsvg2-bin nur im Job ohne Schlüssel', () => {
    const liste = section('liste', 'zeichnen');
    const zeichnen = section('zeichnen', 'rendern');
    const rendern = section('rendern');
    for (const part of [liste, zeichnen]) {
      expect(part).not.toMatch(/npm (ci|install)|apt-get/);
    }
    expect(liste).toContain('SUPABASE_ANON_KEY');
    expect(liste).not.toMatch(/ANTHROPIC_API_KEY|SUPABASE_SECRET_KEY/);
    expect(zeichnen).toContain('ANTHROPIC_API_KEY');
    expect(zeichnen).not.toMatch(/SUPABASE/);
    expect(rendern).toContain('librsvg2-bin');
    expect(rendern).not.toMatch(/secrets\./);
    expect(yml).not.toContain('SUPABASE_SECRET_KEY');
  });

  it('schreibt nichts in die Datenbank und fasst keinen Bucket an (das Skript kennt nur GET auf activities)', () => {
    const script = readFileSync(join(root, 'scripts/image-test.ts'), 'utf8') + readFileSync(join(root, 'scripts/lib/imagetest/activities.ts'), 'utf8');
    expect(script).not.toMatch(/storage\/v1|method: 'POST'|'PATCH'|'DELETE'|rpc\//);
  });
});
