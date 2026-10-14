-- Miki, M10a: Orte aus OpenStreetMap (Spielplätze, Bäder, Museen …), vorab geladen, je Bundesland austauschbar.
--
-- So einspielen (Schritt für Schritt: docs/orte.md): Im Supabase-Dashboard "SQL Editor" öffnen, "New query" wählen,
-- diese ganze Datei einfügen und "Run" drücken, OHNE vorher etwas zu markieren (sonst führt der Editor nur die Markierung aus,
-- und die Rechte ganz unten fehlen). Voraussetzung: 0001 und 0002 sind eingespielt.
-- Die Datei darf mehrmals ausgeführt werden: Was es schon gibt, bleibt (auch die Orte), die Rechte werden jedes Mal neu und gleich gesetzt.
--
-- Herkunft und Lizenz: Die Daten stammen aus OpenStreetMap (© OpenStreetMap-Mitwirkende) und stehen unter der
-- Open Database License 1.0 (ODbL): https://www.openstreetmap.org/copyright und https://opendatacommons.org/licenses/odbl/1-0/
-- Die Tabelle "places" ist eine abgeleitete Datenbank und bleibt unter der ODbL (Prüfliste: docs/supabase.md, „OpenStreetMap und ODbL“).
--
-- Wer darf was (Kurzfassung):
--   App (anon, authenticated): liest places und places_imports (ab M10b), schreibt nie.
--   Import (service_role = der geheime Schlüssel, nur in GitHub Secrets): liest, legt neue Zeilen in der Zwischentabelle ab
--   und tauscht ein Bundesland NUR über die beiden Funktionen aus. Direkt löschen oder ändern darf er in places nichts.
--   Du im Dashboard (Rolle postgres): darfst alles, wie bisher.

-- 1. Die Orte. Ein Ort kann am Rand in zwei Auszügen vorkommen, deshalb gehört das Bundesland zum Schlüssel.
create table if not exists public.places (
  region text not null
    check (region in ('BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH')),
  id text not null
    check (id ~ '^[nwr][1-9][0-9]{0,14}$'),
  name text
    check (name is null or char_length(name) between 1 and 120),
  category text not null
    check (category in ('playground', 'park', 'pool', 'funPark', 'animals', 'museum', 'sight', 'nature', 'indoor')),
  subtype text not null
    check (char_length(subtype) between 1 and 40),
  lat double precision not null
    check (lat between 47 and 55.2),
  lon double precision not null
    check (lon between 5.5 and 15.3),
  tile text not null
    check (tile ~ '^-?[0-9]{1,4}_-?[0-9]{1,4}$'),
  setting text not null
    check (setting in ('indoor', 'outdoor', 'both')),
  months smallint[]
    check (months is null or (cardinality(months) between 1 and 11 and months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[])),
  opening_hours text
    check (opening_hours is null or char_length(opening_hours) between 1 and 255),
  hours_kind text
    check (hours_kind is null or hours_kind in ('plan', 'complex', 'invalid')),
  hours_plan jsonb
    check (hours_plan is null or (jsonb_typeof(hours_plan) = 'object' and jsonb_array_length(hours_plan -> 'days') = 7)),
  website text
    check (website is null or (char_length(website) <= 300 and website ~ '^https?://')),
  locality text
    check (locality is null or char_length(locality) between 1 and 80),
  street text
    check (street is null or char_length(street) between 1 and 80),
  kid_weight smallint not null
    check (kid_weight between 0 and 3),
  primary key (region, id),
  check ((hours_kind is null) = (opening_hours is null)),
  check ((hours_kind = 'plan') = (hours_plan is not null))
);

comment on table public.places is 'Miki: Orte aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0), monatlich je Bundesland neu importiert (docs/orte.md).';
comment on column public.places.tile is 'Kachel 0,2° × 0,3° (src/features/places/placeTiles.ts). Die App fragt nur ganze Kacheln ab, nie ihren Standort.';
comment on column public.places.hours_plan is 'Vom Import vereinfachter Wochenplan (Minuten ab Mitternacht, Montag bis Sonntag). Nur bei hours_kind = plan.';
comment on column public.places.kid_weight is 'Kindertauglichkeit 0 bis 3 (src/features/places/placeKinds.ts).';

create index if not exists places_tile_idx on public.places (tile);

-- 2. Stand je Bundesland: welcher Import gilt, wann, wie viele Orte, Stand der OSM-Daten.
create table if not exists public.places_imports (
  region text primary key
    check (region in ('BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH')),
  import_id text not null
    check (char_length(import_id) between 1 and 80),
  imported_at timestamptz not null default now(),
  row_count integer not null
    check (row_count >= 0),
  source_timestamp timestamptz,
  source_url text
    check (source_url is null or source_url ~ '^https://download\.geofabrik\.de/')
);

comment on table public.places_imports is 'Miki: Stand des Orte-Imports je Bundesland (docs/orte.md).';

-- 3. Zwischentabelle: Der Import lädt ein Land hier in Paketen hoch, dann tauscht publish_places_import es in einem Schritt aus.
--    Gleiche Spalten wie places, dazu die Kennung des Imports. Keine Prüfregeln doppelt: Die Zeilen kommen beim Austausch
--    durch die Regeln von places, und eine kaputte Zeile lässt den ganzen Austausch scheitern.
create table if not exists public.places_staging (
  import_id text not null,
  like public.places
);

comment on table public.places_staging is 'Miki: Zwischenablage des Orte-Imports. Nur der Import (service_role) legt hier ab, nie die App.';

create index if not exists places_staging_region_idx on public.places_staging (region, import_id);

-- Row Level Security: places und places_imports darf jeder lesen (öffentliche Daten, ab M10b für die App).
-- places_staging: RLS an und bewusst KEINE Regel, anon und authenticated sehen dort nichts.
alter table public.places enable row level security;
alter table public.places_imports enable row level security;
alter table public.places_staging enable row level security;

drop policy if exists "places_lesen_fuer_alle" on public.places;
create policy "places_lesen_fuer_alle" on public.places for select to anon, authenticated using (true);
drop policy if exists "places_imports_lesen_fuer_alle" on public.places_imports;
create policy "places_imports_lesen_fuer_alle" on public.places_imports for select to anon, authenticated using (true);

-- 4. Vor dem Hochladen: alte Reste dieses Landes aus der Zwischentabelle entfernen (z. B. von einem abgebrochenen Lauf).
--    security definer: Die Funktion darf löschen, der Import selbst nicht. Fester search_path, damit nichts untergeschoben wird.
create or replace function public.begin_places_import(p_region text, p_import_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_region is null or p_region not in ('BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH') then
    raise exception 'Unbekanntes Bundesland: %', p_region;
  end if;
  if p_import_id is null or char_length(p_import_id) not between 1 and 80 then
    raise exception 'import_id fehlt oder ist länger als 80 Zeichen';
  end if;
  delete from public.places_staging where region = p_region;
end;
$$;

-- 5. Ein Bundesland austauschen, alles oder nichts in EINER Transaktion:
--    prüfen (Anzahl wie angekündigt, Qualitätsbremse 70 %, Obergrenze aller Orte), alte Orte des Landes löschen,
--    neue aus der Zwischentabelle übernehmen, Zwischentabelle leeren, Stand in places_imports eintragen.
--    Scheitert etwas, bleiben die bisherigen Orte des Landes unverändert.
create or replace function public.publish_places_import(
  p_region text,
  p_import_id text,
  p_expected integer,
  p_max_total integer,
  p_source_timestamp timestamptz,
  p_source_url text
)
returns integer
language plpgsql
security definer
set search_path = ''
set statement_timeout = '120s'
as $$
declare
  v_new integer;
  v_old integer;
  v_total integer;
  v_inserted integer;
begin
  if p_region is null or p_region not in ('BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH') then
    raise exception 'Unbekanntes Bundesland: %', p_region;
  end if;
  if p_max_total is null or p_max_total < 1 then
    raise exception 'Obergrenze (p_max_total) fehlt';
  end if;

  select count(*) into v_new from public.places_staging where region = p_region and import_id = p_import_id;
  if v_new <> p_expected then
    raise exception 'Zwischentabelle hat % Orte für %, angekündigt waren %', v_new, p_region, p_expected;
  end if;
  if v_new < 1 then
    raise exception 'Keine Orte für %: ein leeres Land wird nie übernommen', p_region;
  end if;

  -- Qualitätsbremse je Bundesland: mindestens 70 % der bisherigen Orte dieses Landes.
  select count(*) into v_old from public.places where region = p_region;
  if v_old > 0 and v_new < ceil(v_old * 0.7) then
    raise exception 'Qualitätsbremse: % hat nur % Orte, bisher %, mindestens 70 %% nötig', p_region, v_new, v_old;
  end if;

  -- Obergrenze aller Orte (MAX_PLACES).
  select count(*) into v_total from public.places;
  if v_total - v_old + v_new > p_max_total then
    raise exception 'Obergrenze erreicht: % - % + % > %', v_total, v_old, v_new, p_max_total;
  end if;

  delete from public.places where region = p_region;
  insert into public.places (
    region, id, name, category, subtype, lat, lon, tile, setting, months, opening_hours, hours_kind, hours_plan,
    website, locality, street, kid_weight
  )
  select
    region, id, name, category, subtype, lat, lon, tile, setting, months, opening_hours, hours_kind, hours_plan,
    website, locality, street, kid_weight
  from public.places_staging
  where region = p_region and import_id = p_import_id;
  get diagnostics v_inserted = row_count;

  delete from public.places_staging where region = p_region;

  insert into public.places_imports (region, import_id, imported_at, row_count, source_timestamp, source_url)
  values (p_region, p_import_id, now(), v_inserted, p_source_timestamp, p_source_url)
  on conflict (region) do update set
    import_id = excluded.import_id,
    imported_at = excluded.imported_at,
    row_count = excluded.row_count,
    source_timestamp = excluded.source_timestamp,
    source_url = excluded.source_url;

  return v_inserted;
end;
$$;

comment on function public.publish_places_import(text, text, integer, integer, timestamptz, text) is
  'Miki, Orte-Import: tauscht ein Bundesland in einer Transaktion aus (alles oder nichts, Qualitätsbremse 70 %, Obergrenze).';

-- 6. Rechte für die Daten-Schnittstelle. Wie bei 0001 und 0002: erst alles wegnehmen, dann genau das Nötige geben.
revoke all on table public.places from anon, authenticated, service_role;
grant select on table public.places to anon, authenticated, service_role;

revoke all on table public.places_imports from anon, authenticated, service_role;
grant select on table public.places_imports to anon, authenticated, service_role;

revoke all on table public.places_staging from anon, authenticated, service_role;
grant insert on table public.places_staging to service_role;

revoke all on function public.begin_places_import(text, text) from public, anon, authenticated, service_role;
grant execute on function public.begin_places_import(text, text) to service_role;
revoke all on function public.publish_places_import(text, text, integer, integer, timestamptz, text) from public, anon, authenticated, service_role;
grant execute on function public.publish_places_import(text, text, integer, integer, timestamptz, text) to service_role;

-- Die Daten-Schnittstelle soll die neuen Tabellen und Funktionen sofort kennen.
notify pgrst, 'reload schema';

-- Kontrolle: Das Ergebnis dieser Abfrage erscheint unten im SQL-Editor. Erwartet sind genau diese zwölf Zeilen:
--   Funktion begin_places_import     | service_role  | EXECUTE
--   Funktion publish_places_import   | service_role  | EXECUTE
--   RLS places                       | -             | an
--   RLS places_imports               | -             | an
--   RLS places_staging               | -             | an
--   Tabelle places                   | anon          | SELECT
--   Tabelle places                   | authenticated | SELECT
--   Tabelle places                   | service_role  | SELECT
--   Tabelle places_imports           | anon          | SELECT
--   Tabelle places_imports           | authenticated | SELECT
--   Tabelle places_imports           | service_role  | SELECT
--   Tabelle places_staging           | service_role  | INSERT
-- Steht dort mehr (z. B. anon bei places_staging oder DELETE bei places) oder fehlt eine Zeile, stimmen die Rechte nicht.
select 'Tabelle ' || table_name as objekt, grantee as rolle, string_agg(privilege_type, ', ' order by privilege_type) as rechte
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('places', 'places_imports', 'places_staging')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by table_name, grantee
union all
select 'Funktion ' || routine_name, grantee, string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in ('begin_places_import', 'publish_places_import')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by routine_name, grantee
union all
select 'RLS ' || relname, '-', case when relrowsecurity then 'an' else 'AUS (Fehler!)' end
from pg_class
where oid in ('public.places'::regclass, 'public.places_imports'::regclass, 'public.places_staging'::regclass)
order by 1, 2;
