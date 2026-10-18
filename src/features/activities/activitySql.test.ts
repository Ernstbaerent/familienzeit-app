// SQL für Supabase (M8): die erzeugten Einspiel-Dateien (`npm run db:seed-sql`) und die Datenbank-Vorlage
// (supabase/migrations/0001_activities.sql). Läuft ohne Datenbank: Die Dateien werden als Text geprüft.
// Dass das SQL in einem echten PostgreSQL läuft und die Rechte stimmen, wurde zusätzlich einmal in einem lokalen Wegwerf-Postgres geprüft (docs/supabase.md).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { makeActivity } from '../suggestions/testHelpers';
import {
  categoryKeys,
  dayPartKeys,
  energyKeys,
  parseActivities,
  settingKeys,
  sourceKeys,
  statusKeys,
  type Activity,
} from './activities';
import { activityColumns } from './activityRow';
import { maxActivitiesPerPart, renderSeedFiles, seedColumns, seedDir, sqlString } from './activitySql';

const root = join(__dirname, '..', '..', '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

// Alle Aktivitäten aus data/ in der Reihenfolge der Dateien (wie das Skript sie liest).
function dataActivities(): Activity[] {
  return readdirSync(join(root, 'data'))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .flatMap((name) => parseActivities(JSON.parse(read(`data/${name}`))).activities);
}

describe('Text in SQL', () => {
  it('verdoppelt Hochkommas und lässt alles andere unverändert', () => {
    expect(sqlString("Papa's Tipp")).toBe("'Papa''s Tipp'");
    expect(sqlString('„Zitat“ mit \\ und "Anführungszeichen" und $$')).toBe('\'„Zitat“ mit \\ und "Anführungszeichen" und $$\'');
    expect(sqlString('')).toBe("''");
  });

  it('Hin und zurück ergibt den Originaltext, auch für JSON mit Hochkommas, Umbrüchen und Umlauten', () => {
    const original = { de: { title: "Kinder's „Fest“", summary: 'Zeile 1\nZeile 2', steps: ['a \\ b', '"c"'] }, en: { title: "It's", summary: '', steps: ['x'] } };
    const literal = sqlString(JSON.stringify(original));
    const unquoted = literal.slice(1, -1).replace(/''/g, "'");
    expect(JSON.parse(unquoted)).toEqual(original);
  });

  it('das Zeichen mit dem Code 0 ist ein Fehler (PostgreSQL kann es nicht speichern)', () => {
    expect(() => sqlString('a\u0000b')).toThrow('Code 0');
  });
});

describe('Aufteilung in Teile', () => {
  const many = (count: number) => Array.from({ length: count }, (_, i) => makeActivity({ id: `a-${i}` }));

  it.each([
    [0, []],
    [1, [1]],
    [25, [25]],
    [26, [13, 13]],
    [50, [25, 25]],
    [51, [17, 17, 17]],
    [104, [21, 21, 21, 21, 20]],
  ])('%s Aktivitäten ergeben Teile mit %j Aktivitäten', (count, sizes) => {
    const files = renderSeedFiles(many(count));
    expect(files.map((file) => file.content.split('\n').filter((line) => line.startsWith("  ('")).length)).toEqual(sizes);
    expect(Math.max(0, ...sizes)).toBeLessThanOrEqual(maxActivitiesPerPart);
  });

  it('die Dateinamen zählen von 1 bis zur Anzahl der Teile', () => {
    expect(renderSeedFiles(many(104)).map((file) => file.fileName)).toEqual([
      'activities-part-1-of-5.sql',
      'activities-part-2-of-5.sql',
      'activities-part-3-of-5.sql',
      'activities-part-4-of-5.sql',
      'activities-part-5-of-5.sql',
    ]);
  });

  it('jede Aktivität steht in genau einem Teil, in der Reihenfolge der Daten', () => {
    const files = renderSeedFiles(many(60));
    const ids = files.flatMap((file) => [...file.content.matchAll(/^ {2}\('(a-\d+)'/gm)].map((match) => match[1]));
    expect(ids).toEqual(many(60).map((activity) => activity.id));
  });
});

describe('Aufbau eines Teils', () => {
  const [file] = renderSeedFiles([makeActivity({ id: 'a-1', dayParts: ['morning'], months: [4, 5] }), makeActivity({ id: "o'brien" })]);
  const sql = file.content;

  it('fügt in die Tabelle ein, mit allen Spalten in dieser Reihenfolge (ohne step_images)', () => {
    expect(sql).toContain(`insert into public.activities (${seedColumns.join(', ')})`);
  });

  it('M9b: step_images schreibt der Seed nie (nur set_activity_images in der Datenbank, Migration 0006); die Dateien brauchen 0006 nicht', () => {
    expect(seedColumns).toEqual(activityColumns.filter((column) => column !== 'step_images'));
    expect(sql).not.toContain('step_images');
  });

  it('ist wiederholbar: vorhandene Aktivitäten werden aktualisiert statt doppelt angelegt', () => {
    expect(sql).toContain('on conflict (id) do update set');
    for (const column of seedColumns.filter((name) => name !== 'id' && name !== 'image')) expect(sql).toContain(`${column} = excluded.${column}`);
    expect(sql).not.toContain('id = excluded.id');
  });

  it('M9b: `image` wird beim Einfügen gesetzt, beim Aktualisieren aber nie überschrieben (Bild-Adressen kommen aus der Datenbank)', () => {
    expect(sql).toContain(`insert into public.activities (${seedColumns.join(', ')})`);
    expect(seedColumns).toContain('image');
    const update = sql.slice(sql.indexOf('do update set'));
    expect(update).not.toContain('image');
  });

  it('schreibt nur bei echter Änderung (M8b): alle Spalten außer id verglichen, updated_at zählt nicht', () => {
    const where = sql.slice(sql.indexOf('\nwhere '));
    expect(where).toMatch(/^\nwhere \(activities\.status, /);
    expect(where).toContain('is distinct from (excluded.status, ');
    for (const column of seedColumns.filter((name) => name !== 'id' && name !== 'image')) {
      expect(where).toContain(`activities.${column}`);
      expect(where).toContain(`excluded.${column}`);
    }
    expect(where).not.toContain('updated_at');
    expect(where).not.toContain('activities.id');
  });

  it('endet mit der Kontrollabfrage und hat eine Kopfzeile, die den Weg erklärt', () => {
    expect(sql.startsWith('-- Miki: Aktivitäten einspielen, Teil 1 von 1 (2 Aktivitäten)')).toBe(true);
    expect(sql.trimEnd().endsWith('select count(*) as aktivitaeten_insgesamt from public.activities;')).toBe(true);
    expect(sql).toContain('docs/supabase.md');
  });

  it('Listen, Zahlen und Wahrheitswerte stehen in der Form, die PostgreSQL erwartet', () => {
    expect(sql).toContain("array['morning']::text[]");
    expect(sql).toContain('array[4, 5]::smallint[]');
    expect(sql).toMatch(/, null, null, 'medium'/); // day_parts und months fehlen bei der zweiten Aktivität: null
    expect(sql).toMatch(/false, false/);
    expect(sql).toContain("::timestamptz");
    expect(sql).toContain("::jsonb");
  });

  it('eine Kennung mit Hochkomma bricht das SQL nicht', () => {
    expect(sql).toContain("('o''brien'");
  });

  it('enthält nichts, was Daten löscht oder die Tabelle ändert', () => {
    expect(sql).not.toMatch(/\b(drop|delete|truncate|alter|grant|revoke|create)\b/i);
  });

  it('eine Zahl mit Nachkommastellen ist ein Fehler (statt falscher Daten)', () => {
    expect(() => renderSeedFiles([makeActivity({ id: 'x', ageMin: 1.5 })])).toThrow('ganze Zahl');
  });
});

describe(`die erzeugten Dateien in ${seedDir}/ (npm run db:seed-sql)`, () => {
  const activities = dataActivities();
  const expected = renderSeedFiles(activities);

  it('gibt es für die 104 Aktivitäten aus data/ in fünf Teilen', () => {
    expect(activities.length).toBeGreaterThanOrEqual(104);
    expect(expected.length).toBe(Math.ceil(activities.length / maxActivitiesPerPart));
  });

  it('sind aktuell: Sie stimmen Zeichen für Zeichen mit dem überein, was das Skript heute erzeugen würde', () => {
    // Fehlschlag? `npm run db:seed-sql` ausführen und die Dateien mit einchecken (und neu in Supabase einspielen).
    for (const file of expected) {
      expect(existsSync(join(root, seedDir, file.fileName))).toBe(true);
      expect(read(`${seedDir}/${file.fileName}`)).toBe(file.content);
    }
  });

  it('enthalten keine übrig gebliebenen Teile von früher', () => {
    const onDisk = readdirSync(join(root, seedDir)).filter((name) => name.endsWith('.sql')).sort();
    expect(onDisk).toEqual(expected.map((file) => file.fileName).sort());
  });

  it('enthalten jede Aktivität genau einmal', () => {
    const ids = expected.flatMap((file) => [...file.content.matchAll(/^ {2}\('([^']+)'/gm)].map((match) => match[1]));
    expect(ids.sort()).toEqual(activities.map((activity) => activity.id).sort());
  });
});

// Rechnet aus, welche Rechte `role` an public.activities hat, nachdem alle `grant`- und `revoke`-Anweisungen in dieser Reihenfolge gelaufen sind
// (wie PostgreSQL es tut; ohne automatisch vergebene Rechte, so wie Supabase es für neue Tabellen jetzt handhabt). `sql` ist schon ohne Kommentare, klein geschrieben und mit einfachen Leerzeichen.
const allTablePrivileges = ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger'];
function effectivePrivileges(sql: string, role: string): string[] {
  const have = new Set<string>();
  for (const statement of sql.split(';').map((part) => part.trim())) {
    const match = /^(grant|revoke) (.+?) on (?:table )?public\.activities (?:to|from) (.+)$/.exec(statement);
    if (!match) continue;
    const [, verb, list, roles] = match;
    if (!roles.split(',').map((name) => name.trim()).some((name) => name === role || name === 'public')) continue;
    const privileges = list.trim() === 'all' || list.trim() === 'all privileges' ? allTablePrivileges : list.split(',').map((name) => name.trim());
    for (const privilege of privileges) {
      if (verb === 'grant') have.add(privilege);
      else have.delete(privilege);
    }
  }
  return [...have].sort();
}

describe('die Datenbank-Vorlage supabase/migrations/0001_activities.sql', () => {
  const raw = read('supabase/migrations/0001_activities.sql');
  // Ohne Kommentare, Kleinbuchstaben, Leerraum zusammengezogen: so lässt sich auf Regeln prüfen, egal wie sie umbrochen sind.
  const sql = raw
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  describe('Sicherheit (der öffentliche Schlüssel steckt in der App)', () => {
    it('Row Level Security ist eingeschaltet', () => {
      expect(sql).toContain('alter table public.activities enable row level security');
    });

    it('es gibt genau eine Regel, und die erlaubt nur Lesen freigegebener Aktivitäten', () => {
      const policies = sql.match(/create policy/g) ?? [];
      expect(policies).toHaveLength(1);
      expect(sql).toMatch(/create policy "[^"]+" on public\.activities for select to anon, authenticated using \(status = 'approved'\)/);
    });

    it('keine Regel zum Einfügen, Ändern, Löschen oder „für alles“', () => {
      expect(sql).not.toMatch(/for (insert|update|delete|all)/);
      expect(sql).not.toMatch(/with check/);
    });

    describe('Rechte für die Daten-Schnittstelle (GRANT): Supabase vergibt für neue Tabellen nichts mehr von selbst', () => {
      it('anon hat das SELECT-Recht (sonst zeigt Supabase „API DISABLED“ und die App bekommt „permission denied“)', () => {
        expect(effectivePrivileges(sql, 'anon')).toContain('select');
      });

      it('authenticated hat ebenfalls SELECT', () => {
        expect(effectivePrivileges(sql, 'authenticated')).toContain('select');
      });

      it('und sonst nichts: kein Schreibrecht für anon und authenticated (insert, update, delete, truncate, references, trigger)', () => {
        for (const role of ['anon', 'authenticated']) {
          expect(effectivePrivileges(sql, role)).toEqual(['select']);
          for (const privilege of allTablePrivileges.filter((name) => name !== 'select')) {
            expect(effectivePrivileges(sql, role)).not.toContain(privilege);
          }
        }
      });

      it('die Anweisungen im Wortlaut: erst alles entziehen, dann nur SELECT geben', () => {
        expect(sql).toContain('revoke all on table public.activities from anon, authenticated;');
        expect(sql).toContain('grant select on table public.activities to anon, authenticated;');
        expect(sql.indexOf('revoke all on table public.activities')).toBeLessThan(sql.indexOf('grant select on table public.activities'));
        const grants = sql.match(/grant [^;]*;/g) ?? [];
        expect(grants).toEqual(['grant select on table public.activities to anon, authenticated;']);
      });

      it('nichts wird an alle oder weitere Rollen vergeben, nichts „für alle Tabellen“, nichts weitergebbar', () => {
        expect(sql).not.toMatch(/to public/);
        expect(sql).not.toMatch(/with grant option/);
        expect(sql).not.toMatch(/alter default privileges/);
        expect(sql).not.toMatch(/on all tables/);
        expect(sql).not.toMatch(/to (service_role|postgres|supabase_)/);
      });

      it('der Rechenweg erkennt Fehler: in falscher Reihenfolge, ohne grant oder mit Schreibrecht ist das Ergebnis ein anderes', () => {
        const revoke = 'revoke all on table public.activities from anon, authenticated';
        const grant = 'grant select on table public.activities to anon, authenticated';
        expect(effectivePrivileges(`${revoke}; ${grant};`, 'anon')).toEqual(['select']);
        expect(effectivePrivileges(`${grant}; ${revoke};`, 'anon')).toEqual([]); // revoke nach grant löscht das Recht wieder
        expect(effectivePrivileges(`${revoke};`, 'anon')).toEqual([]); // nur der Anfang wurde ausgeführt: nichts darf lesen
        expect(effectivePrivileges(`${revoke}; ${grant}; grant insert on table public.activities to anon;`, 'anon')).toEqual(['insert', 'select']);
        expect(effectivePrivileges(`${revoke}; grant all on table public.activities to anon;`, 'authenticated')).toEqual([]);
      });

      it('am Ende der Datei zeigt eine Kontrollabfrage, wer welches Recht hat (Ergebnis im SQL-Editor)', () => {
        const last = sql.split(';').map((part) => part.trim()).filter(Boolean).pop() ?? '';
        expect(last).toContain('select grantee, privilege_type from information_schema.role_table_grants');
        expect(last).toContain("table_name = 'activities'");
      });
    });

    it('die Funktion für updated_at legt ihren Suchpfad fest (Supabase-Empfehlung)', () => {
      expect(sql).toContain("set search_path = ''");
    });
  });

  describe('Spalten und Regeln passen zum Datenmodell', () => {
    it('jede Spalte, die die App liest, gibt es in der Tabelle (step_images seit Migration 0006)', () => {
      for (const column of seedColumns) expect(raw).toMatch(new RegExp(`^ {2}${column} `, 'm'));
      expect(readFileSync(join(__dirname, '../../../supabase/migrations/0006_activity_images.sql'), 'utf8')).toContain('add column if not exists step_images jsonb');
    });

    it('zusätzlich gibt es updated_at (setzt die Datenbank selbst)', () => {
      expect(raw).toMatch(/^ {2}updated_at timestamptz not null default now\(\)/m);
      expect(sql).toContain('before update on public.activities');
    });

    it.each([
      ['status', statusKeys],
      ['category', categoryKeys],
      ['setting', settingKeys],
      ['energy', energyKeys],
      ['source', sourceKeys],
      ['day_parts', dayPartKeys],
    ])('erlaubte Werte von %s sind dieselben wie im Code', (column, keys) => {
      const definition = sql.slice(sql.indexOf(` ${column} `)).split(/,\s(?=\w+ )/)[0];
      for (const key of keys) expect(definition).toContain(`'${key}'`);
      const listed = [...definition.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
      expect(new Set(listed)).toEqual(new Set(keys));
    });

    it('Deutsch und Englisch sind Pflicht, Alter 0 bis 16, Kosten 0 bis 2', () => {
      expect(sql).toContain("translations ? 'de' and translations ? 'en'");
      expect(sql).toContain('age_min smallint not null check (age_min between 0 and 16)');
      expect(sql).toContain('cost in (0, 1, 2)');
      expect(sql).toContain('age_min <= age_max');
    });

    it('neu angelegte Aktivitäten sind ohne Angabe nur Entwurf (nie versehentlich freigegeben)', () => {
      expect(sql).toContain("status text not null default 'draft'");
    });

    it('lässt sich ein zweites Mal ausführen', () => {
      expect(sql).toContain('create table if not exists public.activities');
      expect(sql).toContain('drop policy if exists');
      expect(sql).toContain('drop trigger if exists');
      expect(sql).not.toMatch(/drop table/);
    });
  });
});
