// Migration 0002 (M9) als Text geprüft, wie 0001 in activitySql.test.ts: wiederholbar, Row Level Security, und die Rechte nach allen
// grant/revoke in Reihenfolge. Dass das SQL in einem echten PostgreSQL läuft (zweimal hintereinander, Funktion alles oder nichts,
// Obergrenze, anon ohne Zugriff), wurde zusätzlich in einem lokalen Wegwerf-Postgres geprüft (docs/wochenlauf.md, „Tests“).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');
const read = (name: string) => readFileSync(join(root, 'supabase', 'migrations', name), 'utf8');
const sql0001 = read('0001_activities.sql');
const sql0002 = read('0002_activity_runs.sql');

// SQL ohne Kommentare, Anweisungen einzeln (die Funktion mit $$…$$ bleibt ein Stück).
function statements(sql: string): string[] {
  const code = sql.replace(/--[^\n]*/g, '');
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

// Rechte von `role` an `object` („table public.x“ oder „function public.f(…)“) nach allen grant/revoke der Dateien in Reihenfolge.
// PUBLIC zählt für jede Rolle mit (Postgres gibt neuen Funktionen EXECUTE für PUBLIC).
function effective(sqls: string[], object: string, role: string): string[] {
  const have = new Set<string>();
  if (object.startsWith('function')) have.add('execute'); // Standard von Postgres für neue Funktionen
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

const both = [sql0001, sql0002];
const fn = 'function public.insert_generated_activities(jsonb, bigint[], text, integer)';

describe('Migration 0002: wiederholbar', () => {
  it('legt nur an, was fehlt, und ersetzt die Funktion', () => {
    expect(sql0002).toContain('add column if not exists batch_id text');
    expect(sql0002).toContain('add column if not exists generated_at timestamptz');
    expect(sql0002).toContain('create table if not exists public.activity_ideas');
    expect(sql0002).toContain('create index if not exists activities_batch_id_idx');
    expect(sql0002).toContain('create or replace function public.insert_generated_activities');
    expect(sql0002).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b/i);
  });

  it('endet mit der Kontrollabfrage', () => {
    const last = statements(sql0002).at(-1) ?? '';
    expect(last).toMatch(/^select 'Tabelle '/);
    expect(last).toContain('role_routine_grants');
    expect(last).toContain('relrowsecurity');
  });
});

describe('activity_ideas: nur für den Wochenlauf', () => {
  it('Row Level Security ist an, und es gibt keine einzige Regel (policy)', () => {
    expect(sql0002).toContain('alter table public.activity_ideas enable row level security;');
    expect(statements(sql0002).some((s) => /^create policy/i.test(s))).toBe(false);
  });

  it.each(['anon', 'authenticated'])('%s hat kein einziges Recht', (role) => {
    expect(effective(both, 'table public.activity_ideas', role)).toEqual([]);
  });

  it('service_role darf lesen, eintragen, ändern und löschen', () => {
    expect(effective(both, 'table public.activity_ideas', 'service_role')).toEqual(['delete', 'insert', 'select', 'update']);
  });
});

describe('activities: die App bleibt beim Lesen, der Wochenlauf löscht nie', () => {
  it.each(['anon', 'authenticated'])('%s hat nach beiden Migrationen genau SELECT', (role) => {
    expect(effective(both, 'table public.activities', role)).toEqual(['select']);
  });

  it('service_role darf lesen, einfügen und ändern, aber nicht löschen', () => {
    expect(effective(both, 'table public.activities', 'service_role')).toEqual(['insert', 'select', 'update']);
  });
});

describe('insert_generated_activities: alles oder nichts, nur für service_role', () => {
  it('nur service_role darf sie ausführen (PUBLIC, anon und authenticated nicht)', () => {
    expect(effective(both, fn, 'service_role')).toEqual(['execute']);
    expect(effective(both, fn, 'anon')).toEqual([]);
    expect(effective(both, fn, 'authenticated')).toEqual([]);
  });

  it('der Rechenweg erkennt Fehler: ohne revoke from public dürfte jeder sie ausführen', () => {
    expect(effective([`grant execute on ${fn} to service_role;`], fn, 'anon')).toEqual(['execute']);
  });

  it('läuft mit den Rechten des Aufrufers und festem search_path', () => {
    expect(sql0002).toMatch(/security invoker\s+set search_path = ''/);
    expect(sql0002).not.toMatch(/security definer/i);
  });

  it('prüft selbst: höchstens 25, nur draft oder approved, Obergrenze des Katalogs, source ai, kein Bild', () => {
    expect(sql0002).toContain('if v_new < 1 or v_new > 25 then');
    expect(sql0002).toContain("not in ('draft', 'approved')");
    expect(sql0002).toContain("select count(*) into v_existing from public.activities where status in ('approved', 'draft');");
    expect(sql0002).toContain('if v_existing + v_new > p_max_total then');
    expect(sql0002).toMatch(/r\.sibling_friendly, 'ai', null,/);
  });

  it('markiert nur offene Ideen als verwendet, im selben Aufruf', () => {
    expect(sql0002).toContain("set status = 'used', used_at = now(), used_batch_id = p_batch_id");
    expect(sql0002).toContain("where id = any(p_idea_ids) and status = 'open';");
  });
});
