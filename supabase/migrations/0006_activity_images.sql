-- Miki, Migration 0006 (M9b, Lieferung vollständig): Schrittbilder, Szenen, Protokoll der Bild-Versuche, Bilder setzen.
--
-- So einspielen (Schritt für Schritt: docs/supabase.md, „Bilder: Lieferung einrichten (Migration 0006)“): Im Supabase-Dashboard
-- "SQL Editor" öffnen, "New query" wählen, diese ganze Datei einfügen und "Run" drücken, OHNE vorher etwas zu markieren
-- (sonst führt der Editor nur die Markierung aus, und die Rechte ganz unten fehlen).
-- Voraussetzung: 0001, 0002 und 0005 sind schon eingespielt. ERST diese Migration, DANN die App testen: Die App fragt die neue
-- Spalte step_images ab. Fehlt sie, scheitert der tägliche Abgleich (die App bleibt still beim Zwischenspeicher).
-- Die Datei darf mehrmals ausgeführt werden: Was es schon gibt, bleibt, Funktionen und Rechte werden jedes Mal neu und gleich gesetzt.
--
-- Wer darf was (Kurzfassung):
--   App (anon, authenticated): liest weiter nur freigegebene Aktivitäten (jetzt mit step_images), sieht die neuen Tabellen gar nicht
--   und darf nichts schreiben.
--   Bilder-Lauf (service_role = der geheime Schlüssel, nur in GitHub Secrets): liest und schreibt activity_scenes, liest und ergänzt
--   activity_image_log (nie ändern, nie löschen) und setzt Bilder nur über set_activity_images.
--   Du im Dashboard (Rolle postgres): darfst alles, wie bisher.
--
-- Regel für die Dateien im Bucket activity-images: NIE überschreiben. Jede Datei hat eine Prüfsumme im Namen
-- (activities/<id>/cover-<16 Zeichen>.svg, Schrittbild activities/<id>/step-<n>-<16 Zeichen>.svg). Eine neue Fassung ist eine neue Datei,
-- danach ändert set_activity_images die Adresse. Die alte Datei darf erst nach etwa 60 Tagen gelöscht werden (Abfrage in docs/supabase.md).

-- 1. Schrittbilder: Objekt Schrittnummer → Adresse, z. B. {"1": "https://…/step-1-….svg", "3": "https://…"}. NULL = keine.
--    Gesetzt wird die Spalte nur über set_activity_images (prüft Nummern und Adressen). Der Seed aus data/ schreibt sie nie.
alter table public.activities
  add column if not exists step_images jsonb;
alter table public.activities
  drop constraint if exists activities_step_images_object;
alter table public.activities
  add constraint activities_step_images_object check (step_images is null or jsonb_typeof(step_images) = 'object');

comment on column public.activities.step_images is 'M9b: Schrittbilder, Objekt Schrittnummer (ab 1) → Adresse im Bucket activity-images. NULL = keine. Nur über set_activity_images setzen.';

-- 2. Szenen der Bilder: welche Szene (JSON aus dem Baukasten) zu welchem Bild gehört, mit welcher Fassung des Baukastens gezeichnet,
--    zu welchen Texten (Prüfsumme). Dazu die Sperre: blocked = true nimmt eine Aktivität dauerhaft von der Bildautomatik aus
--    (gilt über die Zeile mit purpose = 'title' für die ganze Aktivität). Befehle zum Sperren und Entsperren: docs/bilder-plan.md.
create table if not exists public.activity_scenes (
  activity_id text not null references public.activities (id) on delete cascade,
  purpose text not null default 'title'
    check (purpose = 'title' or purpose ~ '^step-[1-9][0-9]?$'),
  scene jsonb
    check (scene is null or jsonb_typeof(scene) = 'object'),
  kit_version text
    check (kit_version is null or char_length(kit_version) between 1 and 64),
  steps_hash text
    check (steps_hash is null or char_length(steps_hash) between 1 and 128),
  image_url text
    check (image_url is null or image_url like 'https://%'),
  blocked boolean not null default false,
  blocked_reason text
    check (blocked_reason is null or char_length(blocked_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (activity_id, purpose)
);

comment on table public.activity_scenes is 'Miki, M9b: Szene je Bild (Baukasten), Fassung des Baukastens, Prüfsumme der Texte, Sperre für die Bildautomatik. Nur Bilder-Lauf und Dashboard.';

drop trigger if exists activity_scenes_set_updated_at on public.activity_scenes;
create trigger activity_scenes_set_updated_at
  before update on public.activity_scenes
  for each row
  execute function public.set_updated_at();

-- 3. Protokoll der Bild-Versuche: eine Zeile je Aktivität und Lauf (und für ersetzte oder zurückgezogene Adressen).
--    Wird nur ergänzt, nie geändert. Ergebnis (result):
--      attached       Bild angehängt
--      not_attached   bestanden, aber nicht angehängt (Qualitätsbremse oder attach aus); zählt nicht als Versuch
--      failed_rules   Regeln oder Bindung an den Text nicht bestanden; zählt als Versuch
--      failed_review  Rückfrage mit dem Bild nicht „ok“; zählt als Versuch
--      no_scene       die KI fand keine Szene; zählt nicht, neuer Versuch erst mit neuer Fassung des Baukastens
--      no_block       der Titel nennt einen Gegenstand ohne Baustein (keine Anfrage); wie no_scene
--      error          Fehler im Lauf (z. B. Upload); zählt nicht
--      replaced       eine Adresse wurde ersetzt oder entfernt (urls = die alten Adressen, für das Löschen nach 60 Tagen)
--      withdrawn      Bild automatisch zurückgezogen, weil sich Sicherheitshinweis oder Material geändert haben; gibt frei für neue Versuche
--      reset          von Hand freigegeben (Versuche zurückgesetzt, docs/bilder-plan.md)
--    Versuche zählen nur seit dem letzten reset oder withdrawn.
create table if not exists public.activity_image_log (
  id bigint generated always as identity primary key,
  activity_id text not null references public.activities (id) on delete cascade,
  run_id text
    check (run_id is null or char_length(run_id) between 1 and 80),
  attempt smallint
    check (attempt is null or attempt between 1 and 100),
  purpose text not null default 'title'
    check (purpose = 'title' or purpose ~ '^step-[1-9][0-9]?$'),
  model text
    check (model is null or char_length(model) between 1 and 80),
  result text not null
    check (result in ('attached', 'not_attached', 'failed_rules', 'failed_review', 'no_scene', 'no_block', 'error', 'replaced', 'withdrawn', 'reset')),
  reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(reasons) = 'array'),
  missing_blocks text[] not null default '{}',
  kit_version text
    check (kit_version is null or char_length(kit_version) between 1 and 64),
  cost_usd numeric(10, 6)
    check (cost_usd is null or cost_usd >= 0),
  urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.activity_image_log is 'Miki, M9b: Protokoll der Bild-Versuche (nur ergänzen). Versuche zählen seit dem letzten reset oder withdrawn. Nur Bilder-Lauf und Dashboard.';

create index if not exists activity_image_log_activity_idx on public.activity_image_log (activity_id, created_at desc);

-- Row Level Security an und bewusst KEINE Regel (policy): anon und authenticated sehen und ändern keine einzige Zeile.
-- service_role (der geheime Schlüssel) und postgres (Dashboard) übergehen RLS ohnehin.
alter table public.activity_scenes enable row level security;
alter table public.activity_image_log enable row level security;

-- 4. Prüfung einer Bild-Adresse (nur intern, von set_activity_images benutzt). Erlaubt ist genau:
--      https://<Projekt, 20 Zeichen>.supabase.co/storage/v1/object/public/activity-images/activities/<id>/<name>-<16 Zeichen>.svg
--    und die Datei muss im Bucket liegen. Den Host des eigenen Projekts prüft zusätzlich die App (Allowlist, imageAllowlist.ts).
create or replace function public.check_activity_image_url(p_id text, p_url text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  if p_id is null or p_id !~ '^[a-z0-9][a-z0-9-]*$' then
    raise exception 'Die ID „%“ taugt nicht für einen Dateinamen (nur a–z, 0–9 und Bindestrich).', p_id;
  end if;
  v_path := substring(p_url from '^https://[a-z0-9]{20}\.supabase\.co/storage/v1/object/public/activity-images/(.+)$');
  if v_path is null then
    raise exception 'Adresse „%“ zeigt nicht auf den Bucket activity-images eines Supabase-Projekts.', p_url;
  end if;
  if v_path !~ ('^activities/' || p_id || '/[a-z0-9]+(-[a-z0-9]+)*-[0-9a-f]{16}\.svg$') then
    raise exception 'Dateiname „%“ passt nicht: erwartet activities/%/<name>-<16 Zeichen Prüfsumme>.svg', v_path, p_id;
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'activity-images' and o.name = v_path) then
    raise exception 'Die Datei „%“ liegt nicht im Bucket activity-images. Erst hochladen, dann die Adresse setzen.', v_path;
  end if;
end;
$$;

comment on function public.check_activity_image_url(text, text) is 'Miki, M9b: prüft eine Bild-Adresse für set_activity_images (Bucket, Dateiname mit Prüfsumme, Datei vorhanden).';

-- 5. Bilder einer Aktivität setzen oder entfernen. Der Bilder-Lauf ruft sie über die Daten-Schnittstelle auf
--    (POST /rest/v1/rpc/set_activity_images), du im SQL-Editor mit select public.set_activity_images('<id>', '<adresse>', null);
--    p_image: Titelbild oder NULL. p_step_images: Objekt Schrittnummer → Adresse oder NULL; Einträge mit NULL fallen weg,
--    ein leeres Ergebnis wird NULL. Ändert nur, wenn sich etwas unterscheidet (sonst lüde jedes Handy die Zeile neu), und
--    schreibt ersetzte Adressen ins Protokoll (für das Löschen nach 60 Tagen). updated_at setzt der Trigger aus 0001 neu,
--    damit holen die Handys die Änderung beim nächsten Abgleich (M8b). Gibt true zurück, wenn sich etwas geändert hat.
create or replace function public.set_activity_images(p_id text, p_image text, p_step_images jsonb default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_image text;
  v_old_steps jsonb;
  v_steps_count integer;
  v_new_steps jsonb := null;
  v_key text;
  v_value jsonb;
  v_removed text[];
begin
  select a.image, a.step_images, coalesce(jsonb_array_length(a.translations -> 'de' -> 'steps'), 0)
    into v_old_image, v_old_steps, v_steps_count
    from public.activities a
    where a.id = p_id
    for update;
  if not found then
    raise exception 'Die Aktivität „%“ gibt es nicht.', p_id;
  end if;

  if p_image is not null then
    perform public.check_activity_image_url(p_id, p_image);
  end if;

  if p_step_images is not null and jsonb_typeof(p_step_images) <> 'null' then
    if jsonb_typeof(p_step_images) <> 'object' then
      raise exception 'Schrittbilder: Objekt Schrittnummer → Adresse erwartet.';
    end if;
    for v_key, v_value in select e.key, e.value from jsonb_each(p_step_images) e loop
      if v_key !~ '^[1-9][0-9]?$' or v_key::integer > v_steps_count then
        raise exception 'Schrittbilder: Schritt „%“ gibt es bei „%“ nicht (% Schritte).', v_key, p_id, v_steps_count;
      end if;
      continue when jsonb_typeof(v_value) = 'null';
      if jsonb_typeof(v_value) <> 'string' then
        raise exception 'Schrittbilder: Schritt % braucht eine Adresse (Text) oder null.', v_key;
      end if;
      perform public.check_activity_image_url(p_id, v_value #>> '{}');
      v_new_steps := coalesce(v_new_steps, '{}'::jsonb) || jsonb_build_object(v_key, v_value);
    end loop;
  end if;

  if v_old_image is not distinct from p_image and v_old_steps is not distinct from v_new_steps then
    return false;
  end if;

  update public.activities
    set image = p_image, step_images = v_new_steps
    where id = p_id;

  -- Adressen, die vorher da waren und jetzt nicht mehr: ins Protokoll (die Dateien bleiben im Bucket, gelöscht wird erst nach etwa 60 Tagen).
  v_removed := array(
    select u from unnest(array_remove(array[v_old_image] || array(select t.value from jsonb_each_text(v_old_steps) t), null)) u
    except
    select u from unnest(array_remove(array[p_image] || array(select t.value from jsonb_each_text(v_new_steps) t), null)) u
  );
  if cardinality(v_removed) > 0 then
    insert into public.activity_image_log (activity_id, result, reasons, urls)
    values (p_id, 'replaced', '["Adresse ersetzt oder entfernt (set_activity_images)"]'::jsonb, v_removed);
  end if;
  return true;
end;
$$;

comment on function public.set_activity_images(text, text, jsonb) is 'Miki, M9b: setzt Titelbild und Schrittbilder einer Aktivität (prüft Adressen und Dateien), protokolliert ersetzte Adressen.';

-- 6. Bild automatisch zurückziehen, wenn sich Sicherheitshinweis (safetyNote, in irgendeiner Sprache) oder Material einer Aktivität
--    mit Bild ändern: Das Bild könnte dann etwas zeigen, was der Text nicht mehr deckt. image und step_images werden NULL,
--    das Protokoll bekommt „withdrawn“ (gibt die Aktivität für neue Versuche des Bilder-Laufs frei). Gilt für jede Änderung:
--    Seed aus data/, Table Editor, SQL. Eine Änderung nur an Titel, Kurzbeschreibung oder Schritten zieht nichts zurück (meldet der Bilder-Lauf).
create or replace function public.withdraw_images_on_safety_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reasons jsonb := '[]'::jsonb;
begin
  if old.image is null and old.step_images is null then
    return new;
  end if;
  if (select jsonb_object_agg(e.key, e.value -> 'safetyNote') from jsonb_each(old.translations) e)
     is distinct from (select jsonb_object_agg(e.key, e.value -> 'safetyNote') from jsonb_each(new.translations) e) then
    v_reasons := v_reasons || '["Sicherheitshinweis geändert"]'::jsonb;
  end if;
  if array(select m from unnest(old.materials) m order by m) is distinct from array(select m from unnest(new.materials) m order by m) then
    v_reasons := v_reasons || '["Material geändert"]'::jsonb;
  end if;
  if jsonb_array_length(v_reasons) = 0 then
    return new;
  end if;
  insert into public.activity_image_log (activity_id, result, reasons, urls)
  values (
    old.id,
    'withdrawn',
    v_reasons,
    array_remove(array[old.image] || array(select t.value from jsonb_each_text(old.step_images) t), null)
  );
  new.image := null;
  new.step_images := null;
  return new;
end;
$$;

comment on function public.withdraw_images_on_safety_change() is 'Miki, M9b: zieht Bilder zurück, wenn sich Sicherheitshinweis oder Material ändern (Trigger an activities).';

drop trigger if exists activities_withdraw_images on public.activities;
create trigger activities_withdraw_images
  before update of translations, materials on public.activities
  for each row
  execute function public.withdraw_images_on_safety_change();

-- 7. Rechte für die Daten-Schnittstelle. Wie bei 0001 und 0002: erst alles wegnehmen, dann genau das Nötige geben (Reihenfolge wichtig).
--    activities bleibt, wie 0001 und 0002 es setzen (App: SELECT, also auch step_images; Bilder-Lauf und Wochenlauf: SELECT, INSERT, UPDATE).

-- activity_scenes: nur der Bilder-Lauf, lesen, einfügen, ändern (Szene je Bild), nie löschen.
revoke all on table public.activity_scenes from anon, authenticated, service_role;
grant select, insert, update on table public.activity_scenes to service_role;

-- activity_image_log: nur der Bilder-Lauf, lesen und ergänzen. Kein UPDATE, kein DELETE: Das Protokoll bleibt, wie es geschrieben wurde.
revoke all on table public.activity_image_log from anon, authenticated, service_role;
grant select, insert on table public.activity_image_log to service_role;

-- Funktionen: Postgres erlaubt neue Funktionen sonst allen (PUBLIC). set_activity_images nur für service_role,
-- die beiden Hilfsfunktionen für niemanden (sie laufen nur innerhalb von set_activity_images bzw. als Trigger).
revoke all on function public.set_activity_images(text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.set_activity_images(text, text, jsonb) to service_role;
revoke all on function public.check_activity_image_url(text, text) from public, anon, authenticated, service_role;
revoke all on function public.withdraw_images_on_safety_change() from public, anon, authenticated, service_role;

-- Die Daten-Schnittstelle soll die neue Spalte, die Tabellen und die Funktion sofort kennen.
notify pgrst, 'reload schema';

-- Kontrolle: Das Ergebnis dieser Abfrage erscheint unten im SQL-Editor. Erwartet sind genau diese elf Zeilen:
--   Bucket activity-images (Dateien)      | -             | eine Zahl (0 ist richtig, solange nichts hochgeladen ist)
--   Funktion set_activity_images          | service_role  | EXECUTE
--   RLS activity_image_log                | -             | an
--   RLS activity_scenes                   | -             | an
--   Spalte activities.step_images         | -             | jsonb
--   Tabelle activities                    | anon          | SELECT
--   Tabelle activities                    | authenticated | SELECT
--   Tabelle activities                    | service_role  | INSERT, SELECT, UPDATE
--   Tabelle activity_image_log            | service_role  | INSERT, SELECT
--   Tabelle activity_scenes               | service_role  | INSERT, SELECT, UPDATE
--   Trigger activities_withdraw_images    | -             | an
-- Steht dort mehr (z. B. anon bei activity_scenes oder bei der Funktion) oder fehlt
-- eine Zeile, stimmen die Rechte nicht. Kommt statt der Tabelle eine Fehlermeldung zu storage.objects, schick sie mir.
select 'Tabelle ' || table_name as objekt, grantee as rolle, string_agg(privilege_type, ', ' order by privilege_type) as rechte
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('activities', 'activity_scenes', 'activity_image_log')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by table_name, grantee
union all
select 'Funktion ' || routine_name, grantee, string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in ('set_activity_images', 'check_activity_image_url', 'withdraw_images_on_safety_change')
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by routine_name, grantee
union all
select 'RLS ' || relname, '-', case when relrowsecurity then 'an' else 'AUS (Fehler!)' end
from pg_class
where oid in ('public.activity_scenes'::regclass, 'public.activity_image_log'::regclass)
union all
select 'Spalte activities.step_images', '-', data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'activities' and column_name = 'step_images'
union all
select 'Trigger activities_withdraw_images', '-', case when tgenabled <> 'D' then 'an' else 'AUS (Fehler!)' end
from pg_trigger
where tgname = 'activities_withdraw_images' and tgrelid = 'public.activities'::regclass
union all
select 'Bucket activity-images (Dateien)', '-', count(*)::text
from storage.objects
where bucket_id = 'activity-images'
order by 1, 2;
