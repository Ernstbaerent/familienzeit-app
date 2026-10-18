// Migration 0006 (M9b, Lieferung vollständig) als Text geprüft, wie 0002 in scripts/lib/weekly/migration.test.ts: wiederholbar,
// Row Level Security, die Rechte nach allen grant/revoke in Reihenfolge, die Prüfungen in set_activity_images und das automatische
// Zurückziehen. Dass das SQL in einem echten PostgreSQL läuft (zweimal hintereinander, Funktion, Trigger, Rechte als anon und
// service_role, Seed erneut, Wochenlauf schreibt weiter), wurde zusätzlich in einem lokalen Wegwerf-Postgres geprüft (docs/supabase.md, „Tests“).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { activityColumns } from './activityRow';
import { storagePublicPath } from './imageAllowlist';

const root = join(__dirname, '..', '..', '..');
const read = (name: string) => readFileSync(join(root, 'supabase', 'migrations', name), 'utf8');
const sql0001 = read('0001_activities.sql');
const sql0002 = read('0002_activity_runs.sql');
const sql0006 = read('0006_activity_images.sql');
const all = [sql0001, sql0002, sql0006];

// SQL ohne Kommentare, Anweisungen einzeln (Funktionen mit $$…$$ bleiben ein Stück).
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

// Rechte von `role` an `object` nach allen grant/revoke der Dateien in Reihenfolge. PUBLIC zählt für jede Rolle mit.
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

const setImages = 'function public.set_activity_images(text, text, jsonb)';
const checkUrl = 'function public.check_activity_image_url(text, text)';
const withdraw = 'function public.withdraw_images_on_safety_change()';

describe('Migration 0006: wiederholbar', () => {
  it('legt nur an, was fehlt, und ersetzt Funktionen und Trigger', () => {
    expect(sql0006).toContain('add column if not exists step_images jsonb');
    expect(sql0006).toContain('drop constraint if exists activities_step_images_object');
    expect(sql0006).toContain('create table if not exists public.activity_scenes');
    expect(sql0006).toContain('create table if not exists public.activity_image_log');
    expect(sql0006).toContain('create or replace function public.set_activity_images');
    expect(sql0006).toContain('drop trigger if exists activities_withdraw_images on public.activities');
    expect(sql0006).not.toMatch(/\bdrop table\b|\btruncate\b|\bdelete from\b/i);
  });

  it('endet mit der Kontrollabfrage (Rechte, RLS, Spalte, Trigger, Bucket)', () => {
    const last = statements(sql0006).at(-1) ?? '';
    expect(last).toMatch(/^select 'Tabelle '/);
    for (const part of ['role_routine_grants', 'relrowsecurity', "column_name = 'step_images'", "tgname = 'activities_withdraw_images'", 'from storage.objects']) {
      expect(last).toContain(part);
    }
  });

  it('die App fragt step_images ab (Spaltenliste der Änderungsabfrage, M8b)', () => {
    expect(activityColumns).toContain('step_images');
  });
});

describe('Neue Tabellen: nur für den Bilder-Lauf', () => {
  it('Row Level Security ist an, und es gibt keine einzige Regel (policy)', () => {
    expect(sql0006).toContain('alter table public.activity_scenes enable row level security;');
    expect(sql0006).toContain('alter table public.activity_image_log enable row level security;');
    expect(statements(sql0006).some((s) => /^create policy/i.test(s))).toBe(false);
  });

  it.each(['anon', 'authenticated'])('%s hat kein einziges Recht', (role) => {
    expect(effective(all, 'table public.activity_scenes', role)).toEqual([]);
    expect(effective(all, 'table public.activity_image_log', role)).toEqual([]);
  });

  it('service_role darf Szenen lesen, eintragen und ändern, aber nicht löschen', () => {
    expect(effective(all, 'table public.activity_scenes', 'service_role')).toEqual(['insert', 'select', 'update']);
  });

  it('service_role darf das Protokoll nur lesen und ergänzen', () => {
    expect(effective(all, 'table public.activity_image_log', 'service_role')).toEqual(['insert', 'select']);
  });

  it('das Protokoll kennt genau die vereinbarten Ergebnisse', () => {
    const match = /result in \(([^)]+)\)/.exec(sql0006);
    expect(match?.[1].split(',').map((value) => value.trim().replace(/'/g, ''))).toEqual([
      'attached', 'not_attached', 'failed_rules', 'failed_review', 'no_scene', 'no_block', 'error', 'replaced', 'withdrawn', 'reset',
    ]);
  });

  it('die Sperre steht in activity_scenes und ist standardmäßig aus', () => {
    expect(sql0006).toContain('blocked boolean not null default false');
  });
});

describe('activities: die App bleibt beim Lesen', () => {
  it.each(['anon', 'authenticated'])('%s hat nach allen Migrationen genau SELECT (damit auch step_images)', (role) => {
    expect(effective(all, 'table public.activities', role)).toEqual(['select']);
  });

  it('service_role bleibt bei lesen, einfügen, ändern (0002), nie löschen', () => {
    expect(effective(all, 'table public.activities', 'service_role')).toEqual(['insert', 'select', 'update']);
  });

  it('step_images ist ein Objekt oder NULL', () => {
    expect(sql0006).toContain("check (step_images is null or jsonb_typeof(step_images) = 'object')");
  });
});

describe('set_activity_images: nur für service_role, prüft jede Adresse', () => {
  it('nur service_role darf sie ausführen, die Hilfsfunktionen niemand', () => {
    expect(effective(all, setImages, 'service_role')).toEqual(['execute']);
    for (const role of ['anon', 'authenticated']) expect(effective(all, setImages, role)).toEqual([]);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect(effective(all, checkUrl, role)).toEqual([]);
      expect(effective(all, withdraw, role)).toEqual([]);
    }
  });

  it('läuft mit festem search_path (security definer, damit sie storage.objects lesen darf)', () => {
    const definers = sql0006.match(/security definer\s+set search_path = ''/g) ?? [];
    expect(definers).toHaveLength(3);
  });

  it('erlaubt nur den Bucket activity-images unter dem öffentlichen Pfad der App, Dateiname mit Prüfsumme, Datei muss da sein', () => {
    expect(sql0006).toContain(`supabase\\.co${storagePublicPath.replace(/\//g, '/')}activity-images/(.+)$`);
    expect(sql0006).toContain("'^activities/' || p_id || '/[a-z0-9]+(-[a-z0-9]+)*-[0-9a-f]{16}\\.svg$'");
    expect(sql0006).toContain("o.bucket_id = 'activity-images' and o.name = v_path");
    expect(sql0006).toContain("p_id !~ '^[a-z0-9][a-z0-9-]*$'");
  });

  it('prüft die Schrittnummern gegen die Schritte der Aktivität', () => {
    expect(sql0006).toContain("v_key !~ '^[1-9][0-9]?$' or v_key::integer > v_steps_count");
  });

  it('ändert nur bei echtem Unterschied (sonst lüde jedes Handy die Zeile neu) und protokolliert ersetzte Adressen', () => {
    expect(sql0006).toContain('if v_old_image is not distinct from p_image and v_old_steps is not distinct from v_new_steps then');
    expect(sql0006).toMatch(/values \(p_id, 'replaced'/);
  });

  it('updated_at setzt der Trigger aus 0001 bei jeder Änderung neu', () => {
    expect(sql0001).toContain('create trigger activities_set_updated_at');
    expect(sql0001).toMatch(/before update on public\.activities/);
  });
});

describe('Bilder automatisch zurückziehen bei geändertem Sicherheitshinweis oder Material', () => {
  it('Trigger nur bei Änderung von translations oder materials', () => {
    expect(sql0006).toContain('before update of translations, materials on public.activities');
  });

  it('vergleicht den Sicherheitshinweis aller Sprachen und das Material ohne Reihenfolge', () => {
    expect(sql0006).toContain("jsonb_object_agg(e.key, e.value -> 'safetyNote') from jsonb_each(old.translations)");
    expect(sql0006).toContain('array(select m from unnest(old.materials) m order by m) is distinct from array(select m from unnest(new.materials) m order by m)');
  });

  it('setzt beide Spalten auf NULL und schreibt „withdrawn“ mit den alten Adressen', () => {
    expect(sql0006).toContain('new.image := null;');
    expect(sql0006).toContain('new.step_images := null;');
    expect(sql0006).toMatch(/'withdrawn',\s+v_reasons,\s+array_remove\(array\[old\.image\]/);
  });
});
