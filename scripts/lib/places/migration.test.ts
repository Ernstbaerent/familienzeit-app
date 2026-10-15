// Migration 0003 (M10a) und 0004 (Ausschlussliste) als Text geprüft, wie 0001 und 0002: wiederholbar, Row Level Security, Rechte nach allen grant/revoke.
// Dass das SQL in einem echten PostgreSQL läuft (zweimal hintereinander, Austausch alles oder nichts, Qualitätsbremse,
// Obergrenze, Rechte von anon und service_role), wurde zusätzlich in einem lokalen Wegwerf-Postgres geprüft (docs/orte.md, „Tests“).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { placeCategories } from '../../../src/features/places/placeKinds.ts';
import { regionKeys } from '../../../src/features/places/placeRow.ts';

const root = join(__dirname, '..', '..', '..');
const read = (name: string) => readFileSync(join(root, 'supabase', 'migrations', name), 'utf8');
const sql = read('0003_places.sql');
const overridesSql = read('0004_place_overrides.sql');
const all = [read('0001_activities.sql'), read('0002_activity_runs.sql'), sql, overridesSql];

function statements(text: string): string[] {
  const code = text.replace(/--[^\n]*/g, '');
  const parts: string[] = [];
  let current = '';
  let inBody = false;
  for (const piece of code.split(/(\$\$|;)/)) {
    if (piece === '$$') inBody = !inBody;
    if (piece === ';' && !inBody) {
      parts.push(current.replace(/\s+/g, ' ').trim());
      current = '';
    } else current += piece;
  }
  return parts.filter(Boolean);
}

const tablePrivileges = ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger'];

function effective(sqls: string[], object: string, role: string): string[] {
  const have = new Set<string>();
  if (object.startsWith('function')) have.add('execute'); // Postgres gibt neuen Funktionen EXECUTE für PUBLIC
  for (const statement of sqls.flatMap(statements)) {
    const match = /^(grant|revoke) (.+?) on (table|function) (.+?) (?:to|from) (.+)$/i.exec(statement);
    if (!match) continue;
    const [, verb, list, kind, target, roles] = match;
    if (`${kind} ${target}`.replace(/\s+/g, '').toLowerCase() !== object.replace(/\s+/g, '').toLowerCase()) continue;
    if (!roles.split(',').map((r) => r.trim().toLowerCase()).some((r) => r === role || r === 'public')) continue;
    const privileges = /^all( privileges)?$/i.test(list.trim())
      ? kind === 'function'
        ? ['execute']
        : tablePrivileges
      : list.split(',').map((p) => p.trim().toLowerCase());
    for (const privilege of privileges) {
      if (verb.toLowerCase() === 'grant') have.add(privilege);
      else have.delete(privilege);
    }
  }
  return [...have].sort();
}

const begin = 'function public.begin_places_import(text, text)';
const publish = 'function public.publish_places_import(text, text, integer, integer, timestamptz, text)';

describe('Migration 0003: wiederholbar, nichts geht verloren', () => {
  it('legt nur an, was fehlt, ersetzt die Funktionen, löscht nie eine Tabelle', () => {
    expect(sql).toContain('create table if not exists public.places (');
    expect(sql).toContain('create table if not exists public.places_imports (');
    expect(sql).toContain('create table if not exists public.places_staging (');
    expect(sql).toContain('create index if not exists places_tile_idx');
    expect(sql).toContain('create or replace function public.begin_places_import');
    expect(sql).toContain('create or replace function public.publish_places_import');
    expect(sql).not.toMatch(/\bdrop table\b|\btruncate\b/i);
  });

  it('endet mit der Kontrollabfrage', () => {
    const last = statements(sql).at(-1) ?? '';
    expect(last).toMatch(/^select 'Tabelle '/);
    expect(last).toContain('role_routine_grants');
    expect(last).toContain('relrowsecurity');
  });

  it('Bundesländer und Kategorien in den Prüfregeln passen zum Code', () => {
    const regionList = `(${regionKeys.map((k) => `'${k}'`).join(', ')})`;
    expect(sql.split(regionList).length - 1).toBe(4); // places, places_imports, beide Funktionen
    expect(sql).toContain(`category in (${placeCategories.map((c) => `'${c}'`).join(', ')})`);
  });

  it('nennt Herkunft und Lizenz (ODbL)', () => {
    expect(sql).toContain('© OpenStreetMap-Mitwirkende');
    expect(sql).toContain('Open Database License');
  });
});

describe('Row Level Security', () => {
  it('ist an allen drei Tabellen an; lesen dürfen alle nur places und places_imports', () => {
    for (const table of ['places', 'places_imports', 'places_staging']) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
    const policies = statements(sql).filter((s) => /^create policy/i.test(s));
    expect(policies).toHaveLength(2);
    expect(policies.every((p) => / for select to anon, authenticated using \(true\)$/.test(p))).toBe(true);
    expect(policies.some((p) => p.includes('places_staging'))).toBe(false);
  });
});

describe('Rechte nach allen Migrationen', () => {
  it.each(['anon', 'authenticated'])('%s liest places und places_imports, schreibt nichts, sieht die Zwischentabelle nicht', (role) => {
    expect(effective(all, 'table public.places', role)).toEqual(['select']);
    expect(effective(all, 'table public.places_imports', role)).toEqual(['select']);
    expect(effective(all, 'table public.places_staging', role)).toEqual([]);
    expect(effective(all, begin, role)).toEqual([]);
    expect(effective(all, publish, role)).toEqual([]);
  });

  it('service_role: liest, legt in der Zwischentabelle ab, löscht oder ändert in places nie direkt', () => {
    expect(effective(all, 'table public.places', 'service_role')).toEqual(['select']);
    expect(effective(all, 'table public.places_imports', 'service_role')).toEqual(['select']);
    expect(effective(all, 'table public.places_staging', 'service_role')).toEqual(['insert']);
    expect(effective(all, begin, 'service_role')).toEqual(['execute']);
    expect(effective(all, publish, 'service_role')).toEqual(['execute']);
  });

  it('die App behält bei den Aktivitäten genau SELECT', () => {
    expect(effective(all, 'table public.activities', 'anon')).toEqual(['select']);
  });
});

describe('Die Funktionen', () => {
  it('laufen mit festem search_path; publish darf bis 120 s rechnen', () => {
    expect(sql.match(/security definer\s+set search_path = ''/g)).toHaveLength(2);
    expect(sql).toMatch(/set search_path = ''\s+set statement_timeout = '120s'/);
  });

  it('publish prüft selbst: angekündigte Anzahl, nie leer, Qualitätsbremse 70 %, Obergrenze, dann Austausch nur dieses Landes', () => {
    expect(sql).toContain('if v_new <> p_expected then');
    expect(sql).toContain('if v_new < 1 then');
    expect(sql).toContain('if v_old > 0 and v_new < ceil(v_old * 0.7) then');
    expect(sql).toContain('if v_total - v_old + v_new > p_max_total then');
    expect(sql).toContain('delete from public.places where region = p_region;');
    expect(sql).not.toMatch(/delete from public\.places;|delete from public\.places where (?!region = p_region)/);
  });
});

describe('Migration 0004: Ausschlussliste place_overrides', () => {
  it('wiederholbar: legt nur an, was fehlt, löscht nie eine Tabelle oder Einträge', () => {
    expect(overridesSql).toContain('create table if not exists public.place_overrides (');
    expect(overridesSql).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b/i);
  });

  it('Spalten: Kennung wie places.id, Aktion hide oder boost, Notiz, Datum', () => {
    expect(overridesSql).toMatch(/id text primary key\s+check \(id ~ '\^\[nwr\]\[1-9\]\[0-9\]\{0,14\}\$'\)/);
    expect(sql).toContain("check (id ~ '^[nwr][1-9][0-9]{0,14}$')"); // dieselbe Regel wie in places
    expect(overridesSql).toContain("check (action in ('hide', 'boost'))");
    expect(overridesSql).toContain('note text');
    expect(overridesSql).toContain('created_on date not null default current_date');
  });

  it('Row Level Security an, ohne eine einzige Regel', () => {
    expect(overridesSql).toContain('alter table public.place_overrides enable row level security;');
    expect(statements(overridesSql).filter((s) => /^create policy/i.test(s))).toEqual([]);
  });

  it.each(['anon', 'authenticated'])('%s darf die Liste weder lesen noch schreiben', (role) => {
    expect(effective(all, 'table public.place_overrides', role)).toEqual([]);
  });

  it('nur der geheime Schlüssel (service_role) darf lesen, und nur lesen', () => {
    expect(effective(all, 'table public.place_overrides', 'service_role')).toEqual(['select']);
  });

  it('ändert keine Rechte an anderen Tabellen', () => {
    expect(effective(all, 'table public.places', 'anon')).toEqual(['select']);
    expect(effective(all, 'table public.places', 'service_role')).toEqual(['select']);
    const targets = statements(overridesSql)
      .filter((s) => /^(grant|revoke) /i.test(s))
      .map((s) => / on table (\S+)/i.exec(s)?.[1]);
    expect(new Set(targets)).toEqual(new Set(['public.place_overrides']));
  });

  it('endet mit der Kontrollabfrage (zwei erwartete Zeilen stehen im Kommentar)', () => {
    const last = statements(overridesSql).at(-1) ?? '';
    expect(last).toMatch(/^select 'Tabelle '/);
    expect(last).toContain('relrowsecurity');
    expect(overridesSql).toMatch(/--\s+RLS place_overrides\s+\| -\s+\| an/);
    expect(overridesSql).toMatch(/--\s+Tabelle place_overrides\s+\| service_role \| SELECT/);
  });
});
