-- Miki, M8: Tabelle der Aktivitäten.
--
-- So einspielen (Schritt für Schritt: docs/supabase.md): Im Supabase-Dashboard "SQL Editor" öffnen, "New query" wählen,
-- diese ganze Datei einfügen und "Run" drücken. Danach die Daten einspielen (supabase/seed/, erzeugt mit `npm run db:seed-sql`).
-- Die Datei darf mehrmals ausgeführt werden: Was es schon gibt, bleibt unverändert (die Tabelle wird nicht überschrieben).
--
-- Wichtig für die Sicherheit: Der öffentliche Schlüssel steckt in der App und ist damit für alle sichtbar.
-- Deshalb darf er nur eines: freigegebene Aktivitäten LESEN. Das regelt Row Level Security (RLS) unten.
-- Geschrieben wird nur über das Dashboard, den SQL-Editor oder den geheimen service_role-Schlüssel (der nie in die App gehört).

create table if not exists public.activities (
  id text primary key
    check (char_length(id) between 1 and 80),

  -- Nur 'approved' sieht die App. 'draft' = noch nicht freigegeben, 'rejected' = abgelehnt.
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected')),

  category text not null
    check (category in ('craft', 'game', 'movement', 'experiment', 'nature', 'cooking', 'outing')),

  -- Themen (gleiche Schlüssel wie Interessen und Abneigungen der Kinderprofile) und Material (Schlüssel aus materials.ts).
  topics text[] not null default '{}',
  materials text[] not null default '{}',

  -- Texte je Sprache: {"de": {"title", "summary", "steps", "safetyNote"}, "en": {...}}. Deutsch und Englisch sind Pflicht.
  translations jsonb not null
    check (jsonb_typeof(translations) = 'object' and translations ? 'de' and translations ? 'en'),

  -- Alter in Jahren (beide Grenzen inklusive) und Dauer in Minuten.
  age_min smallint not null check (age_min between 0 and 16),
  age_max smallint not null check (age_max between 0 and 16),
  duration_min smallint not null check (duration_min between 1 and 720),
  duration_max smallint not null check (duration_max between 1 and 720),

  setting text not null
    check (setting in ('indoor', 'outdoor', 'both')),

  -- Wetter: braucht Trockenheit, ist bei Sonne schöner.
  needs_dry boolean not null,
  better_in_sun boolean not null,

  -- Freiwillig: NULL heißt "jederzeit" bzw. "das ganze Jahr".
  day_parts text[]
    check (day_parts is null or (cardinality(day_parts) > 0 and day_parts <@ array['morning', 'afternoon', 'evening']::text[])),
  months smallint[]
    check (months is null or (cardinality(months) > 0 and months <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::smallint[])),

  energy text not null
    check (energy in ('low', 'medium', 'high')),
  cost smallint not null
    check (cost in (0, 1, 2)),
  sibling_friendly boolean not null,

  source text not null
    check (source in ('ai', 'manual')),

  -- Freiwillig: Web-Adresse eines Bildes. Die App zeigt es nur, wenn es von unserem eigenen Speicher kommt
  -- (<Projekt-Adresse>/storage/v1/object/public/…), alles andere ignoriert sie.
  image text
    check (image is null or image like 'https://%'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activities_age_order check (age_min <= age_max),
  constraint activities_duration_order check (duration_min <= duration_max)
);

comment on table public.activities is 'Miki: Aktivitäten (Ideen für Eltern und Kinder). Die App liest nur status = approved.';

create index if not exists activities_status_idx on public.activities (status);

-- updated_at bei jeder Änderung automatisch setzen.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activities_set_updated_at on public.activities;
create trigger activities_set_updated_at
  before update on public.activities
  for each row
  execute function public.set_updated_at();

-- Row Level Security: Ohne eine passende Regel sieht und ändert die App nichts.
alter table public.activities enable row level security;

-- Die einzige Regel für die App: Alle (anon = ohne Anmeldung, authenticated = angemeldet) dürfen freigegebene Aktivitäten lesen.
drop policy if exists "Alle duerfen freigegebene Aktivitaeten lesen" on public.activities;
create policy "Alle duerfen freigegebene Aktivitaeten lesen"
  on public.activities
  for select
  to anon, authenticated
  using (status = 'approved');

-- Es gibt keine Regel zum Einfügen, Ändern oder Löschen, die App kann also nicht schreiben.
-- Zusätzlich nehmen wir die Schreibrechte ganz weg (doppelt gesichert) und geben nur das Lesen frei.
revoke all on table public.activities from anon, authenticated;
grant select on table public.activities to anon, authenticated;
