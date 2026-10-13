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
import { maxActivitiesPerPart, renderSeedFiles, seedDir, sqlString } from './activitySql';

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

  it('fügt in die Tabelle ein, mit allen Spalten in dieser Reihenfolge', () => {
    expect(sql).toContain(`insert into public.activities (${activityColumns.join(', ')})`);
  });

  it('ist wiederholbar: vorhandene Aktivitäten werden aktualisiert statt doppelt angelegt', () => {
    expect(sql).toContain('on conflict (id) do update set');
    for (const column of activityColumns.filter((name) => name !== 'id')) expect(sql).toContain(`${column} = excluded.${column}`);
    expect(sql).not.toContain('id = excluded.id');
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

    it('Schreibrechte werden entzogen, nur das Lesen wird freigegeben, an niemanden sonst', () => {
      expect(sql).toContain('revoke all on table public.activities from anon, authenticated');
      const grants = sql.match(/grant [^;]*;/g) ?? [];
      expect(grants).toEqual(['grant select on table public.activities to anon, authenticated;']);
      expect(sql).not.toMatch(/to public/);
    });

    it('die Regel kommt, bevor Rechte vergeben werden, und alles steht in einer Datei', () => {
      expect(sql.indexOf('enable row level security')).toBeLessThan(sql.indexOf('grant select'));
    });

    it('die Funktion für updated_at legt ihren Suchpfad fest (Supabase-Empfehlung)', () => {
      expect(sql).toContain("set search_path = ''");
    });
  });

  describe('Spalten und Regeln passen zum Datenmodell', () => {
    it('jede Spalte, die die App liest, gibt es in der Tabelle', () => {
      for (const column of activityColumns) expect(raw).toMatch(new RegExp(`^ {2}${column} `, 'm'));
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
