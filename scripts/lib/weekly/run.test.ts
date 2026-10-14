// Der ganze Wochenlauf (M9) mit gemockten Antworten von Claude API und Supabase: Standard draft, AUTO_APPROVE, Trockenlauf,
// Qualitätsbremse, Obergrenzen, API-Fehler (nichts wird halb geschrieben), Zeitlimit und kein Schlüssel in irgendeiner Ausgabe.

import { runWeekly, type RunDeps } from './run';
import {
  baseEnv,
  candidate,
  claudeReply,
  dataTitles,
  fakeKeys,
  mockInternet,
  testCatalog,
  unsafeCandidate,
  type MockOptions,
} from './testHelpers';

const catalog = testCatalog();
const now = new Date('2026-10-18T16:00:00Z'); // Sonntag, 18 Uhr in Berlin

function setup(options: MockOptions = {}, overrides: Partial<RunDeps> = {}) {
  const internet = mockInternet(options);
  const lines: string[] = [];
  const deps: RunDeps = {
    env: baseEnv(),
    argv: [],
    now,
    fetchImpl: internet.fetchImpl,
    log: (line) => lines.push(line),
    catalog,
    dataTitles,
    dataActiveCount: 104,
    randomSuffix: () => 'abc123',
    ...overrides,
  };
  return { internet, lines, run: () => runWeekly(deps) };
}

const many = (from: number, count: number, make = candidate) => Array.from({ length: count }, (_, i) => make(from + i));

type RpcBody = { p_rows: { id: string; status: string; source: string; image: unknown }[]; p_idea_ids: number[]; p_batch_id: string; p_max_total: number };
const rpcBody = (internet: ReturnType<typeof mockInternet>) => internet.rpcCalls()[0].body as RpcBody;

describe('Standard: Entwürfe', () => {
  it('schreibt die bestandenen Aktivitäten als draft mit source ai, in einem einzigen Aufruf', async () => {
    const { internet, run } = setup({ claude: () => claudeReply(many(0, 12)) });
    const result = await run();
    expect(result.exitCode).toBe(0);
    expect(result.report.outcome).toBe('written');
    expect(internet.rpcCalls()).toHaveLength(1);
    const body = rpcBody(internet);
    expect(body.p_rows).toHaveLength(12);
    expect(body.p_rows.every((row) => row.status === 'draft' && row.source === 'ai' && row.image === null)).toBe(true);
    expect(body.p_batch_id).toBe('wl-2026-10-18-abc123');
    expect(body.p_max_total).toBe(1500);
  });

  it('der Bericht beginnt mit der Zeile: freigegeben, Entwurf, verworfen, Stand der Datenbank, Kosten', async () => {
    const { run } = setup({ count: 1130, claude: () => claudeReply([...many(0, 11), unsafeCandidate(50)]) });
    const result = await run();
    expect(result.summary.split('\n')[0]).toBe(
      '**Freigegeben: 0 · Als Entwurf: 11 · Verworfen: 1 · Datenbank: 1.141 von 1.500 · Kosten: 0,0066 $**',
    );
  });

  it('nutzt die Kennung des GitHub-Laufs als batch_id, wenn es eine gibt', async () => {
    const { internet, run } = setup({ claude: () => claudeReply(many(0, 10)) }, { env: baseEnv({ GITHUB_RUN_ID: '987654321' }) });
    await run();
    expect(rpcBody(internet).p_batch_id).toBe('wl-2026-10-18-987654321');
  });

  it('markiert benutzte Stichwort-Ideen (nur offene, die es gibt) im selben Aufruf', async () => {
    const ideas = [
      { id: 7, keyword: 'Kastanien', note: null },
      { id: 8, keyword: 'Drachen', note: 'steigen lassen' },
    ];
    const activities = [candidate(0, { ideaId: 7 }), candidate(1, { ideaId: 99 }), ...many(2, 9)];
    const { internet, run } = setup({ ideas, claude: () => claudeReply(activities) });
    const result = await run();
    expect(rpcBody(internet).p_idea_ids).toEqual([7]);
    expect(result.summary).toContain('als verwendet markiert: #7');
    // Die Ideen stehen im Prompt, als Stichwort in einem eigenen Block
    const prompt = (internet.claudeCalls()[0].body as { messages: { content: string }[] }).messages[0].content;
    expect(prompt).toContain('<ideen>\n#7: Kastanien\n#8: Drachen (Notiz: steigen lassen)\n</ideen>');
  });
});

describe('Automatische Freigabe', () => {
  it('ohne AUTO_APPROVE bleibt alles draft (Standard false)', async () => {
    const { internet, run } = setup({ claude: () => claudeReply(many(0, 10)) });
    await run();
    expect(rpcBody(internet).p_rows.map((r) => r.status)).toEqual(Array(10).fill('draft'));
  });

  it.each([
    ['Umgebungsvariable AUTO_APPROVE=true', { env: baseEnv({ AUTO_APPROVE: 'true' }) }],
    ['Schalter --auto-approve', { argv: ['--auto-approve'] }],
  ])('mit %s wird approved, was alle Prüfungen ohne Auffälligkeit besteht; Auffälliges bleibt draft', async (_, overrides) => {
    const flagged = candidate(20, { de: { ...(candidate(20).de as object), title: 'Lego-Stadt bauen' } });
    const { internet, run } = setup({ claude: () => claudeReply([...many(0, 10), flagged]) }, overrides);
    const result = await run();
    const rows = rpcBody(internet).p_rows;
    expect(rows.filter((r) => r.status === 'approved')).toHaveLength(10);
    expect(rows.find((r) => r.id === 'uskadel-drawing')?.status).toBe('draft');
    expect(result.summary).toContain('Markenname im Titel: „Lego“');
    expect(result.summary.split('\n')[0]).toContain('Freigegeben: 10 · Als Entwurf: 1');
  });

  it('AUTO_APPROVE mit einem anderen Wert als true gibt nichts frei', async () => {
    const { internet, run } = setup({ claude: () => claudeReply(many(0, 10)) }, { env: baseEnv({ AUTO_APPROVE: 'yes' }) });
    await run();
    expect(rpcBody(internet).p_rows.every((r) => r.status === 'draft')).toBe(true);
  });
});

describe('Qualitätsbremse', () => {
  it('besteht weniger als die Hälfte, bleibt der ganze Lauf draft, mit deutlichem Warnhinweis', async () => {
    // Drei Aufrufe mit je 4 guten und 5 schlechten: 12 von 27 bestanden (weniger als die Hälfte)
    const { internet, lines, run } = setup(
      { claude: (n) => claudeReply([...many(n * 10, 4), ...many(n * 10 + 4, 5, unsafeCandidate)]) },
      { argv: ['--auto-approve'] },
    );
    const result = await run();
    expect(result.exitCode).toBe(0);
    expect(result.report.qualityBrake).toBe(true);
    const rows = rpcBody(internet).p_rows;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === 'draft')).toBe(true);
    expect(result.summary).toContain('Qualitätsbremse');
    expect(lines.some((line) => line.startsWith('::warning title=Qualitätsbremse::'))).toBe(true);
  });

  it('genau die Hälfte bestanden: keine Bremse', async () => {
    const { internet, run } = setup({ claude: () => claudeReply([...many(0, 10), ...many(20, 10, unsafeCandidate)]) }, { argv: ['--auto-approve'] });
    const result = await run();
    expect(result.report.qualityBrake).toBe(false);
    expect(rpcBody(internet).p_rows.every((r) => r.status === 'approved')).toBe(true);
  });
});

describe('Trockenlauf', () => {
  it('ruft die KI, liest bei Supabase, schreibt aber nichts und gibt alles aus', async () => {
    const { internet, lines, run } = setup({ claude: () => claudeReply(many(0, 10)) }, { argv: ['--dry-run'] });
    const result = await run();
    expect(result.exitCode).toBe(0);
    expect(result.report.outcome).toBe('dryRun');
    expect(internet.rpcCalls()).toHaveLength(0);
    expect(internet.calls.every((c) => c.method === 'GET' || c.url.startsWith('https://api.anthropic.com/'))).toBe(true);
    expect(result.summary.split('\n')[0]).toMatch(/^\*\*Trockenlauf, nichts geschrieben · /);
    expect(lines.join('\n')).toContain('"id": "alvarin-drawing"');
    expect(result.summary).toContain('Alle Texte zum Durchlesen');
  });

  it('geht auch ohne Supabase-Zugang (Titel aus data/), dann nur mit dem Claude-Schlüssel', async () => {
    const { internet, run } = setup(
      { claude: () => claudeReply(many(0, 10)) },
      { argv: ['--dry-run'], env: { ANTHROPIC_API_KEY: fakeKeys.anthropic } },
    );
    const result = await run();
    expect(result.exitCode).toBe(0);
    expect(internet.calls.every((c) => c.url.startsWith('https://api.anthropic.com/'))).toBe(true);
    expect(result.summary.split('\n')[0]).toContain('Datenbank: 104 von 1.500');
  });
});

describe('Schlüssel fehlen: Abbruch vor allem anderen', () => {
  it.each([
    ['ANTHROPIC_API_KEY', { ANTHROPIC_API_KEY: undefined }],
    ['SUPABASE_URL', { SUPABASE_URL: undefined }],
    ['SUPABASE_SECRET_KEY', { SUPABASE_SECRET_KEY: '' }],
  ])('ohne %s: keine einzige Anfrage, Exit-Code 1', async (name, missing) => {
    const { internet, run } = setup({}, { env: baseEnv(missing) });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.calls).toHaveLength(0);
    expect(result.report.reason).toContain(name);
    expect(result.report.reason).toContain('nichts in die Datenbank geschrieben');
  });

  it('ein öffentlicher Schlüssel statt des geheimen wird abgelehnt', async () => {
    const { internet, run } = setup({}, { env: baseEnv({ SUPABASE_SECRET_KEY: 'sb_publishable_abcdefghijklmnop' }) });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.calls).toHaveLength(0);
    expect(result.report.reason).toContain('kein geheimer Schlüssel');
  });

  it('ein Modell ohne hinterlegten Preis startet nicht (die Kosten-Obergrenze würde sonst nicht greifen)', async () => {
    const { internet, run } = setup({}, { env: baseEnv({ ANTHROPIC_MODEL: 'claude-unbekannt-9' }) });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.claudeCalls()).toHaveLength(0);
  });
});

describe('Obergrenze des Katalogs (MAX_ACTIVITIES)', () => {
  it('bei 1500 oder mehr: KI nicht aufrufen, nichts schreiben, deutlich melden und als Fehlschlag enden', async () => {
    const { internet, lines, run } = setup({ count: 1500 });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(result.report.outcome).toBe('capReached');
    expect(internet.claudeCalls()).toHaveLength(0);
    expect(internet.rpcCalls()).toHaveLength(0);
    expect(result.summary.split('\n')[0]).toBe(
      '**OBERGRENZE ERREICHT, nichts erzeugt · Freigegeben: 0 · Als Entwurf: 0 · Verworfen: 0 · Datenbank: 1.500 von 1.500 · Kosten: 0,00 $**',
    );
    expect(lines.some((line) => line.startsWith('::error title=Obergrenze erreicht::'))).toBe(true);
  });

  it('die Obergrenze ist einstellbar', async () => {
    const { internet, run } = setup({ count: 200 }, { env: baseEnv({ MAX_ACTIVITIES: '200' }) });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.claudeCalls()).toHaveLength(0);
  });

  it('knapp vor der Grenze: nur so viele anfragen und schreiben, wie noch hineinpassen', async () => {
    const { internet, run } = setup({ count: 1497, claude: () => claudeReply(many(0, 15)) });
    const result = await run();
    expect(result.exitCode).toBe(0);
    const prompt = (internet.claudeCalls()[0].body as { messages: { content: string }[] }).messages[0].content;
    expect(prompt).toContain('Schreibe genau 3 neue Aktivitäten');
    expect(rpcBody(internet).p_rows).toHaveLength(3); // die KI lieferte 15, nur 3 zählen
    expect(internet.claudeCalls()).toHaveLength(1); // danach ist die Grenze erreicht, kein zweiter Aufruf
    expect(result.summary).toContain('Obergrenze MAX_ACTIVITIES ist fast erreicht');
    expect(result.summary.split('\n')[0]).toContain('Datenbank: 1.500 von 1.500');
  });

  it('zählt vor JEDEM Aufruf neu', async () => {
    let counted = 0;
    const { internet, run } = setup({
      count: () => {
        counted += 1;
        return counted === 1 ? 100 : 1499; // zwischen den Aufrufen ist der Katalog gewachsen
      },
      claude: () => claudeReply([candidate(0), ...many(1, 8, unsafeCandidate)]),
    });
    await run();
    expect(counted).toBe(2);
    expect(internet.claudeCalls()).toHaveLength(1); // 1499 + 1 angenommen = 1500: kein zweiter Aufruf
  });

  it('die Datenbank-Funktion bekommt die Obergrenze mit (sie prüft selbst noch einmal, in derselben Transaktion)', async () => {
    const { internet, run } = setup({ claude: () => claudeReply(many(0, 10)) }, { env: baseEnv({ MAX_ACTIVITIES: '900' }) });
    await run();
    expect(rpcBody(internet).p_max_total).toBe(900);
  });
});

describe('Feste Obergrenzen pro Lauf', () => {
  it('höchstens 3 Aufrufe, auch wenn nie genug bestehen', async () => {
    const { internet, run } = setup({ claude: (n) => claudeReply(many(n * 30, 5, unsafeCandidate)) });
    const result = await run();
    expect(internet.claudeCalls()).toHaveLength(3);
    expect(result.report.cost.calls).toBe(3);
    expect(internet.rpcCalls()).toHaveLength(0); // nichts bestanden
    expect(result.report.outcome).toBe('nothingToWrite');
  });

  it('höchstens 25 Aktivitäten werden insgesamt angefragt, liefert die KI mehr, zählt der Rest nicht', async () => {
    const { internet, run } = setup({ claude: (n) => claudeReply([...many(n * 40, 2), ...many(n * 40 + 2, 28, unsafeCandidate)]) });
    const result = await run();
    const asked = internet
      .claudeCalls()
      .map((c) => Number(/Schreibe genau (\d+) neue/.exec((c.body as { messages: { content: string }[] }).messages[0].content)?.[1]));
    expect(asked.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(25);
    expect(result.report.generated).toBeLessThanOrEqual(25);
    expect(result.summary).toContain('wurden nicht beachtet');
  });

  it('ein zweiter Aufruf kommt nur, wenn weniger als 10 bestanden haben, und fragt nur nach dem Rest', async () => {
    const { internet, run } = setup({ claude: (n) => claudeReply(n === 1 ? [...many(0, 6), ...many(6, 9, unsafeCandidate)] : many(30, 9)) });
    const result = await run();
    expect(internet.claudeCalls()).toHaveLength(2);
    const second = (internet.claudeCalls()[1].body as { messages: { content: string }[] }).messages[0].content;
    expect(second).toContain('Schreibe genau 9 neue Aktivitäten');
    expect(second).toContain('In diesem Lauf schon geschrieben');
    expect(second).toContain('Diese Vorschläge aus diesem Lauf wurden verworfen');
    expect(rpcBody(internet).p_rows).toHaveLength(15);
    expect(result.report.rejected).toHaveLength(9);
  });

  it('die Kosten-Obergrenze verhindert den Aufruf, wenn schon der schlimmste Fall zu teuer wäre', async () => {
    const { internet, run } = setup({}, { env: baseEnv({ MAX_COST_USD: '0.001' }) });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.claudeCalls()).toHaveLength(0);
    expect(result.report.reason).toContain('MAX_COST_USD');
  });

  it('schickt das Modell aus ANTHROPIC_MODEL (Standard claude-haiku-5-5), die Obergrenze für die Antwort und das Schema', async () => {
    const first = setup({ claude: () => claudeReply(many(0, 10)) });
    await first.run();
    const body = first.internet.claudeCalls()[0].body as Record<string, unknown>;
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.max_tokens).toBe(32000);
    expect((body.output_config as { format: { type: string } }).format.type).toBe('json_schema');

    const second = setup({ claude: () => claudeReply(many(0, 10)) }, { env: baseEnv({ ANTHROPIC_MODEL: 'claude-sonnet-5-5' }) });
    await second.run();
    expect((second.internet.claudeCalls()[0].body as Record<string, unknown>).model).toBe('claude-sonnet-5-5');
  });
});

describe('Fehler der API: stoppen, nichts schreiben', () => {
  it.each([
    ['leeres Guthaben (402)', { status: 402, body: { type: 'error', error: { type: 'billing_error', message: 'Your credit balance is too low.' } } }, 'Guthaben'],
    ['leeres Guthaben (400 mit credit balance)', { status: 400, body: { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } } }, 'Guthaben'],
    ['Rate-Limit (429)', { status: 429, body: { type: 'error', error: { type: 'rate_limit_error', message: 'Number of requests has exceeded your rate limit' } } }, 'Limit'],
    ['Ausgabenlimit (400 usage limit)', { status: 400, body: { type: 'error', error: { type: 'invalid_request_error', message: 'You have reached your specified API usage limits.' } } }, 'Limit'],
    ['Überlastung (529)', { status: 529, body: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } }, 'überlastet'],
    ['falscher Schlüssel (401)', { status: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } }, 'ANTHROPIC_API_KEY'],
  ])('%s: Lauf gestoppt, Exit-Code 1, keine Wiederholung', async (_, reply, text) => {
    const { internet, run } = setup({ claude: () => reply });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(result.report.outcome).toBe('aborted');
    expect(result.report.reason).toContain(text);
    expect(internet.claudeCalls()).toHaveLength(1);
    expect(internet.rpcCalls()).toHaveLength(0);
  });

  it('Fehler beim zweiten Aufruf: auch das Ergebnis des ersten wird NICHT geschrieben', async () => {
    const { internet, run } = setup({
      claude: (n) =>
        n === 1
          ? claudeReply([...many(0, 5), ...many(5, 5, unsafeCandidate)])
          : { status: 402, body: { type: 'error', error: { type: 'billing_error', message: 'credit balance too low' } } },
    });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.claudeCalls()).toHaveLength(2);
    expect(internet.rpcCalls()).toHaveLength(0);
    expect(result.summary.split('\n')[0]).toMatch(/^\*\*ABGEBROCHEN, nichts geschrieben · /);
  });

  it.each([
    ['abgelehnt (refusal)', claudeReply([], { stopReason: 'refusal' })],
    ['abgeschnitten (max_tokens)', claudeReply([], { stopReason: 'max_tokens' })],
    ['kein JSON', { body: { content: [{ type: 'text', text: '{"activities": [' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } } }],
    ['kein Netz', Promise.reject(new Error('getaddrinfo ENOTFOUND api.anthropic.com'))],
  ])('Antwort %s: Abbruch ohne Schreiben', async (_, reply) => {
    const { internet, run } = setup({ claude: () => reply as never });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.rpcCalls()).toHaveLength(0);
  });

  it('lehnt die Datenbank das Schreiben ab (z. B. doppelte ID), ist nichts geschrieben und der Lauf ein Fehlschlag', async () => {
    const { run } = setup({
      claude: () => claudeReply(many(0, 10)),
      rpc: () => ({ status: 409, body: { code: '23505', message: 'duplicate key value violates unique constraint "activities_pkey"' } }),
    });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(result.report.reason).toContain('die Datenbank hat den ganzen Lauf abgelehnt');
    expect(result.report.reason).toContain('23505');
  });

  it('kann Supabase nicht gelesen werden, wird die KI gar nicht erst aufgerufen', async () => {
    const { internet, run } = setup({ supabaseError: { path: 'activities?select=id,category', reply: { status: 401, body: { message: 'Invalid API key' } } } });
    const result = await run();
    expect(result.exitCode).toBe(1);
    expect(internet.claudeCalls()).toHaveLength(0);
  });

  it('Zeitlimit: antwortet die API nicht, endet der Lauf ohne Schreiben', async () => {
    const internet = mockInternet({ claude: () => new Promise(() => {}) });
    const result = await runWeekly({
      env: baseEnv(),
      argv: [],
      now,
      fetchImpl: internet.fetchImpl,
      log: () => {},
      catalog,
      dataTitles,
      dataActiveCount: 104,
      randomSuffix: () => 'abc123',
      limits: { runTimeoutMs: 50 },
    });
    expect(result.exitCode).toBe(1);
    expect(result.report.reason).toContain('Zeitüberschreitung');
    expect(internet.rpcCalls()).toHaveLength(0);
  });
});

describe('Dubletten', () => {
  it('gegen die Datenbank (auch Entwürfe), gegen data/ und innerhalb des Laufs', async () => {
    const titles = [{ id: 'old-one', category: 'craft', status: 'draft', de: 'Alvarin malen', en: 'Something Else' }];
    const fromData = candidate(1, { de: { ...(candidate(1).de as object), title: 'Natron Vulkan' } });
    const twice = candidate(2);
    const { internet, run } = setup({ titles, claude: () => claudeReply([candidate(0), fromData, twice, twice, ...many(10, 10)]) });
    const result = await run();
    const reasons = result.report.rejected.map((r) => `${r.title}: ${r.reasons.join('; ')}`);
    expect(reasons).toEqual([
      'Alvarin malen: Dublette: Titel (de) gibt es schon („Alvarin malen“)',
      'Natron Vulkan: Dublette: Titel (de) gibt es schon („Natron-Vulkan“)',
      'Cirapex malen: Dublette: die ID „cirapex-drawing“ gibt es schon; Dublette: Titel (de) steht schon in diesem Lauf; Dublette: Titel (en) steht schon in diesem Lauf',
    ]);
    expect(rpcBody(internet).p_rows).toHaveLength(11);
  });

  it('die Titelliste im Prompt enthält nur deutsche Titel, nach Kategorie gruppiert', async () => {
    const titles = [
      { id: 'a', category: 'craft', status: 'approved', de: 'Kartoffeldruck', en: 'Potato Stamps' },
      { id: 'b', category: 'nature', status: 'rejected', de: 'Kresse säen', en: 'Grow Cress' },
    ];
    const { internet, run } = setup({ titles, claude: () => claudeReply(many(0, 10)) });
    await run();
    const prompt = (internet.claudeCalls()[0].body as { messages: { content: string }[] }).messages[0].content;
    expect(prompt).toContain('craft: Kartoffeldruck; Sockenpuppen-Theater');
    expect(prompt).toContain('nature: Kresse säen');
    expect(prompt).not.toContain('Potato Stamps');
  });
});

describe('Kein Schlüssel in Ausgaben', () => {
  const echo = `Fehler mit ${fakeKeys.anthropic} und ${fakeKeys.supabase} und Bearer ${fakeKeys.supabase} und ${encodeURIComponent(fakeKeys.anthropic)}`;

  it.each([
    ['in der Fehlermeldung der Claude API', { claude: () => ({ status: 400, body: { type: 'error', error: { type: 'invalid_request_error', message: echo } } }) }],
    ['in der Fehlermeldung von Supabase', { supabaseError: { path: 'activities?select=id,category', reply: { status: 401, body: { message: echo, hint: fakeKeys.supabase } } } }],
    ['beim Schreiben', { claude: () => claudeReply(many(0, 10)), rpc: () => ({ status: 400, body: { message: echo } }) }],
    ['in einem Netzwerkfehler', { claude: () => Promise.reject(new Error(echo)) }],
    ['in den Texten der KI (Trockenlauf gibt alles aus)', { claude: () => claudeReply([candidate(0, { de: { ...(candidate(0).de as object), summary: echo } }), ...many(1, 9)]) }],
  ])('%s', async (_, options) => {
    const { lines, run } = setup(options as MockOptions, { argv: ['--dry-run'] });
    const dry = await run();
    const { lines: lines2, run: run2 } = setup(options as MockOptions);
    const real = await run2();
    const everything = [...lines, ...lines2, dry.summary, real.summary].join('\n');
    expect(everything).not.toContain(fakeKeys.anthropic);
    expect(everything).not.toContain(fakeKeys.supabase);
    expect(everything).not.toContain('TESTKEY');
    expect(everything).not.toContain(encodeURIComponent(fakeKeys.anthropic));
  });

  it('die Schlüssel gehen nur in die richtigen Kopfzeilen: x-api-key zu Anthropic, apikey (ohne Bearer) zu Supabase', async () => {
    const { internet, run } = setup({ claude: () => claudeReply(many(0, 10)) });
    await run();
    for (const call of internet.calls) {
      const values = JSON.stringify(call.body ?? '') + call.url;
      expect(values).not.toContain('TESTKEY');
      if (call.url.startsWith('https://api.anthropic.com/')) {
        expect(call.headers['x-api-key']).toBe(fakeKeys.anthropic);
        expect(call.headers.apikey).toBeUndefined();
      } else {
        expect(call.headers.apikey).toBe(fakeKeys.supabase);
        expect(call.headers.Authorization).toBeUndefined(); // sb_secret_ ist kein JWT und gehört nicht in Bearer
        expect(call.headers['x-api-key']).toBeUndefined();
      }
    }
  });
});

describe('Material', () => {
  it('neue Materialien sind nur Vorschläge im Bericht; ein unbekanntes Material wird verworfen', async () => {
    const unknown = candidate(0, { materials: ['paper', 'glitterGlue'] });
    const { run } = setup({
      claude: () => claudeReply([unknown, ...many(1, 10)], { suggestions: [{ key: 'glitterGlue', de: 'Glitzerkleber', en: 'glitter glue', reason: 'für Karten' }] }),
    });
    const result = await run();
    expect(result.report.rejected[0].reasons.join(' ')).toContain('materials: unbekannter Schlüssel glitterGlue');
    expect(result.summary).toContain('`glitterGlue`: Glitzerkleber / glitter glue – für Karten');
  });
});
