// Hilfen für die Tests des KI-Wochenlaufs (M9): Katalog aus den echten Übersetzungen, ein gültiger Vorschlag der KI
// und ein gemocktes Internet (Claude API und Supabase), das jede Anfrage mitschreibt. Kein echtes Netz, keine echten Schlüssel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildCatalog, type Catalog } from './catalog.ts';
import type { FetchLike, HttpRequest, HttpResponse } from './http.ts';
import type { ExistingTitle } from './prompt.ts';

const root = join(__dirname, '..', '..', '..');

export function testCatalog(): Catalog {
  const read = (name: string) => JSON.parse(readFileSync(join(root, 'src', 'locales', name), 'utf8'));
  return buildCatalog(read('de.json'), read('en.json'));
}

// Ausgedachte Schlüssel in der echten Form. Sie dürfen in keiner Ausgabe auftauchen.
export const fakeKeys = {
  anthropic: 'sk-ant-api03-TESTKEY-abcdefghijklmnopqrstuvwxyz0123456789',
  supabase: 'sb_secret_TESTKEY_abcdefghijklmnopqrstuvwxyz0123',
};
export const supabaseUrl = 'https://testprojekt.supabase.co';

export function baseEnv(extra: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return { ANTHROPIC_API_KEY: fakeKeys.anthropic, SUPABASE_URL: supabaseUrl, SUPABASE_SECRET_KEY: fakeKeys.supabase, ...extra };
}

// Ausgedachte Wörter, damit sich die Titel der Test-Vorschläge nicht ähneln (die Ähnlichkeitsprüfung würde sonst anschlagen).
const words = [
  'Alvarin', 'Belkuno', 'Cirapex', 'Dorvenu', 'Eskalom', 'Fiontra', 'Gavrill', 'Hupseda', 'Ixmoran', 'Jolbrek', 'Kuvenda', 'Lompari',
  'Mezorin', 'Nuvalte', 'Opriska', 'Pextamu', 'Quorbin', 'Rasvoli', 'Sulmega', 'Tivrona', 'Uskadel', 'Vormeli', 'Wexturo', 'Xalpidu',
  'Yorvesk', 'Zunbari', 'Abrolex', 'Bimtoru', 'Cuvanes', 'Dapsimo', 'Ernuvol', 'Fozdami', 'Gruntel', 'Hivraso', 'Iblanto',
];

export function word(n: number): string {
  return words[n % words.length] + (n >= words.length ? `x${Math.floor(n / words.length)}` : '');
}

// Ein gültiger Vorschlag der KI (so, wie das Antwort-Schema ihn verlangt): Malen mit Papier und Stiften, ohne Gefahren.
export function candidate(n: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ideaId: null,
    category: 'craft',
    topics: ['craft'],
    ageMin: 4,
    ageMax: 10,
    durationMin: 20,
    durationMax: 40,
    setting: 'indoor',
    needsDry: false,
    betterInSun: false,
    dayParts: [],
    months: [],
    energy: 'low',
    cost: 0,
    materials: ['paper', 'markers'],
    siblingFriendly: true,
    de: {
      title: `${word(n)} malen`,
      summary: 'Eine ruhige Idee zum Malen am Tisch.',
      steps: ['Legt Papier und Stifte bereit.', 'Malt zusammen ein großes Bild.', 'Hängt das Bild an die Wand.'],
      safetyNote: '',
    },
    en: {
      title: `${word(n)} Drawing`,
      summary: 'A calm drawing idea at the table.',
      steps: ['Put out paper and pens.', 'Draw a big picture together.', 'Hang the picture on the wall.'],
      safetyNote: '',
    },
    ...overrides,
  };
}

// Ein Vorschlag, der an Punkt 2 der Checkliste scheitert (Schere ohne „Erwachsene“ im Hinweis).
export function unsafeCandidate(n: number): Record<string, unknown> {
  return candidate(n, { materials: ['paper', 'scissors'] });
}

export const dataTitles: ExistingTitle[] = [
  { id: 'baking-soda-volcano', category: 'experiment', status: 'approved', de: 'Natron-Vulkan', en: 'Baking Soda Volcano' },
  { id: 'sock-puppet-theater', category: 'craft', status: 'approved', de: 'Sockenpuppen-Theater', en: 'Sock Puppet Theater' },
];

export type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };
type ClaudeHandler = (callNumber: number, body: Record<string, unknown>) => Reply | Promise<Reply>;

export function response(reply: Reply): HttpResponse {
  const status = reply.status ?? 200;
  const headers = Object.fromEntries(Object.entries(reply.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => (reply.body === undefined ? '' : typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body)),
  };
}

// Antwort der Claude API mit diesen Aktivitäten.
export function claudeReply(activities: unknown[], extra: { suggestions?: unknown[]; usage?: Record<string, number>; stopReason?: string } = {}): Reply {
  return {
    body: {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: '', signature: 'x' },
        { type: 'text', text: JSON.stringify({ activities, newMaterialSuggestions: extra.suggestions ?? [] }) },
      ],
      stop_reason: extra.stopReason ?? 'end_turn',
      usage: extra.usage ?? { input_tokens: 6000, output_tokens: 12000 },
    },
  };
}

export type MockOptions = {
  claude?: ClaudeHandler;
  count?: number | (() => number); // Anzahl approved + draft in der Datenbank
  titles?: ExistingTitle[];
  ideas?: { id: number; keyword: string; note: string | null }[];
  rpc?: (body: Record<string, unknown>) => Reply;
  supabaseError?: { path: string; reply: Reply };
};

// Gemocktes Internet: beantwortet Claude API und Supabase und schreibt jede Anfrage in `calls`.
export function mockInternet(options: MockOptions = {}) {
  const calls: Call[] = [];
  let claudeCalls = 0;
  const fetchImpl: FetchLike = async (url: string, init: HttpRequest) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init.method, headers: init.headers, body });

    if (url === 'https://api.anthropic.com/v1/messages') {
      claudeCalls += 1;
      const handler = options.claude ?? ((n: number) => claudeReply([candidate(n * 100)]));
      return response(await handler(claudeCalls, body));
    }
    if (url.startsWith(`${supabaseUrl}/rest/v1/`)) {
      const path = url.slice(`${supabaseUrl}/rest/v1/`.length);
      if (options.supabaseError && path.startsWith(options.supabaseError.path)) return response(options.supabaseError.reply);
      if (path.startsWith('activities?select=id,category')) {
        const titles = options.titles ?? [];
        const offset = Number(/offset=(\d+)/.exec(path)?.[1] ?? 0);
        return response({ body: titles.slice(offset, offset + 1000).map((t) => ({ id: t.id, category: t.category, status: t.status, de: t.de, en: t.en })) });
      }
      if (path.startsWith('activities?select=id&status=in.(approved,draft)')) {
        const count = typeof options.count === 'function' ? options.count() : (options.count ?? 120);
        return response({ body: [], headers: { 'Content-Range': count === 0 ? '*/0' : `0-0/${count}` } });
      }
      if (path.startsWith('activity_ideas?')) return response({ body: options.ideas ?? [] });
      if (path === 'rpc/insert_generated_activities') {
        if (options.rpc) return response(options.rpc(body));
        return response({ body: (body.p_rows as unknown[]).length });
      }
    }
    return response({ status: 404, body: { message: `unbekannte Adresse im Test: ${url}` } });
  };
  return {
    fetchImpl,
    calls,
    claudeCalls: () => calls.filter((c) => c.url.startsWith('https://api.anthropic.com/')),
    rpcCalls: () => calls.filter((c) => c.url.endsWith('/rpc/insert_generated_activities')),
  };
}
