-- Miki, M9: KI-Wochenlauf. Läufe zurückziehen können, Stichwort-Ideen sammeln, ein Lauf schreibt alles oder nichts.
--
-- So einspielen (Schritt für Schritt: docs/wochenlauf.md): Im Supabase-Dashboard "SQL Editor" öffnen, "New query" wählen,
-- diese ganze Datei einfügen und "Run" drücken, OHNE vorher etwas zu markieren (sonst führt der Editor nur die Markierung aus,
-- und die Rechte ganz unten fehlen). Voraussetzung: 0001_activities.sql ist schon eingespielt.
-- Die Datei darf mehrmals ausgeführt werden: Was es schon gibt, bleibt, die Rechte werden jedes Mal neu und gleich gesetzt.
--
-- Wer darf was (Kurzfassung):
--   App (anon, authenticated): liest weiter nur freigegebene Aktivitäten, sieht activity_ideas gar nicht und darf nichts schreiben.
--   Wochenlauf (service_role = der geheime Schlüssel, nur in GitHub Secrets): liest und schreibt Aktivitäten (ohne Löschen),
--   verwaltet activity_ideas und ruft insert_generated_activities auf.
--   Du im Dashboard (Rolle postgres): darfst alles, wie bisher.

-- 1. Zwei neue Spalten in activities: Zu welchem Lauf gehört eine Aktivität, und wann wurde sie erzeugt?
--    Bei den Aktivitäten von Hand (data/, supabase/seed/) bleiben beide leer (NULL).
alter table public.activities
  add column if not exists batch_id text
    check (batch_id is null or char_length(batch_id) between 1 and 80);
alter table public.activities
  add column if not exists generated_at timestamptz;

comment on column public.activities.batch_id is 'KI-Wochenlauf: Kennung des Laufs (z. B. wl-2026-10-18-123456), damit sich ein ganzer Lauf zurückziehen lässt. NULL = von Hand.';
comment on column public.activities.generated_at is 'KI-Wochenlauf: Zeitpunkt, an dem der Lauf die Aktivität geschrieben hat. NULL = von Hand.';

create index if not exists activities_batch_id_idx on public.activities (batch_id) where batch_id is not null;

-- 2. Stichwort-Ideen für den Wochenlauf (du trägst sie im Table Editor ein, docs/wochenlauf.md).
create table if not exists public.activity_ideas (
  id bigint generated always as identity primary key,
  keyword text not null
    check (char_length(btrim(keyword)) between 1 and 120),
  note text
    check (note is null or char_length(note) <= 1000),
  status text not null default 'open'
    check (status in ('open', 'used')),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_batch_id text
);

comment on table public.activity_ideas is 'Miki: Stichwort-Ideen für den KI-Wochenlauf. Nur der Wochenlauf (service_role) und das Dashboard sehen sie, nie die App.';

create index if not exists activity_ideas_status_idx on public.activity_ideas (status);

-- Row Level Security an und bewusst KEINE Regel (policy): anon und authenticated sehen und ändern damit keine einzige Zeile.
-- service_role (der geheime Schlüssel) und postgres (Dashboard) übergehen RLS ohnehin.
alter table public.activity_ideas enable row level security;

-- 3. Schreiben in einem Rutsch: alle Aktivitäten eines Laufs und das Markieren der benutzten Ideen in EINER Transaktion.
--    Scheitert irgendetwas (doppelte ID, kaputte Zeile, Obergrenze erreicht), wird gar nichts geschrieben.
--    Der Wochenlauf ruft die Funktion über die Daten-Schnittstelle auf (POST /rest/v1/rpc/insert_generated_activities).
--    security invoker: Die Funktion hat nur die Rechte dessen, der sie aufruft (service_role). Ausführen darf sie nur service_role (unten).
create or replace function public.insert_generated_activities(
  p_rows jsonb,
  p_idea_ids bigint[],
  p_batch_id text,
  p_max_total integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new integer;
  v_existing integer;
  v_inserted integer;
begin
  if p_batch_id is null or char_length(p_batch_id) not between 1 and 80 then
    raise exception 'batch_id fehlt oder ist länger als 80 Zeichen';
  end if;
  if p_max_total is null or p_max_total < 1 then
    raise exception 'Obergrenze (p_max_total) fehlt';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'p_rows muss eine Liste sein';
  end if;

  v_new := jsonb_array_length(p_rows);
  if v_new < 1 or v_new > 25 then
    raise exception 'Ein Lauf schreibt 1 bis 25 Aktivitäten, bekommen: %', v_new;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) as e
    where e ->> 'status' is null or e ->> 'status' not in ('draft', 'approved')
  ) then
    raise exception 'Der Wochenlauf schreibt nur draft oder approved';
  end if;

  -- Obergrenze des Katalogs (MAX_ACTIVITIES): zählt freigegebene und Entwürfe, abgelehnte nicht.
  select count(*) into v_existing from public.activities where status in ('approved', 'draft');
  if v_existing + v_new > p_max_total then
    raise exception 'Obergrenze erreicht: % vorhanden + % neu > %', v_existing, v_new, p_max_total;
  end if;

  -- source ist immer 'ai', image immer leer (Bilder kommen mit M9b), batch_id und generated_at setzt die Funktion selbst.
  insert into public.activities (
    id, status, category, topics, translations, age_min, age_max, duration_min, duration_max, setting,
    needs_dry, better_in_sun, day_parts, months, energy, cost, materials, sibling_friendly, source, image,
    created_at, batch_id, generated_at
  )
  select
    r.id, r.status, r.category, r.topics, r.translations, r.age_min, r.age_max, r.duration_min, r.duration_max, r.setting,
    r.needs_dry, r.better_in_sun, r.day_parts, r.months, r.energy, r.cost, r.materials, r.sibling_friendly, 'ai', null,
    r.created_at, p_batch_id, now()
  from jsonb_populate_recordset(null::public.activities, p_rows) as r;
  get diagnostics v_inserted = row_count;

  if p_idea_ids is not null and cardinality(p_idea_ids) > 0 then
    update public.activity_ideas
    set status = 'used', used_at = now(), used_batch_id = p_batch_id
    where id = any(p_idea_ids) and status = 'open';
  end if;

  return v_inserted;
end;
$$;

comment on function public.insert_generated_activities(jsonb, bigint[], text, integer) is
  'Miki, KI-Wochenlauf: schreibt einen ganzen Lauf in einer Transaktion (alles oder nichts) und markiert die benutzten Stichwort-Ideen.';

-- 4. Rechte für die Daten-Schnittstelle. Wie bei 0001: erst alles wegnehmen, dann genau das Nötige geben (Reihenfolge wichtig).
--    Supabase vergibt für neue Tabellen und Funktionen nicht mehr verlässlich Rechte von selbst, deshalb steht hier alles ausdrücklich.

-- activities: Die App behält genau SELECT (aus 0001, hier nicht angefasst). Der Wochenlauf liest, fügt ein und ändert, löscht aber nie.
revoke all on table public.activities from service_role;
grant select, insert, update on table public.activities to service_role;

-- activity_ideas: nur der Wochenlauf. Die App (anon, authenticated) hat kein einziges Recht.
revoke all on table public.activity_ideas from anon, authenticated, service_role;
grant select, insert, update, delete on table public.activity_ideas to service_role;

-- Die Funktion: Postgres erlaubt neue Funktionen sonst allen (PUBLIC). Nur service_role darf sie ausführen.
revoke all on function public.insert_generated_activities(jsonb, bigint[], text, integer) from public, anon, authenticated, service_role;
grant execute on function public.insert_generated_activities(jsonb, bigint[], text, integer) to service_role;

-- Die Daten-Schnittstelle soll die neue Funktion und Spalten sofort kennen.
notify pgrst, 'reload schema';

-- Kontrolle: Das Ergebnis dieser Abfrage erscheint unten im SQL-Editor. Erwartet sind genau diese sechs Zeilen:
--   Funktion insert_generated_activities | service_role  | EXECUTE
--   RLS activity_ideas                   | -             | an
--   Tabelle activities                   | anon          | SELECT
--   Tabelle activities                   | authenticated | SELECT
--   Tabelle activities                   | service_role  | INSERT, SELECT, UPDATE
--   Tabelle activity_ideas               | service_role  | DELETE, INSERT, SELECT, UPDATE
-- Steht dort mehr (z. B. anon bei activity_ideas oder bei der Funktion) oder fehlt eine Zeile, stimmen die Rechte nicht.
select 'Tabelle ' || table_name as objekt, grantee as rolle, string_agg(privilege_type, ', ' order by privilege_type) as rechte
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('activities', 'activity_ideas')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by table_name, grantee
union all
select 'Funktion ' || routine_name, grantee, string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'insert_generated_activities'
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by routine_name, grantee
union all
select 'RLS activity_ideas', '-', case when relrowsecurity then 'an' else 'AUS (Fehler!)' end
from pg_class
where oid = 'public.activity_ideas'::regclass
order by 1, 2;
