-- Miki, Migration 0005 (M9b, erster Test der Lieferung): öffentlicher Speicherbereich für Aktivitäts-Bilder.
--
-- Das ist die KLEINSTE Fassung: nur der Bucket. Die Spalte `image` gibt es seit 0001, die App zeigt sie schon
-- (nur Adressen unter <Projekt-Adresse>/storage/v1/object/public/, siehe imageAllowlist.ts). Alles Weitere (Spalte step_images,
-- Tabellen für Szenen und Versuche, Funktion zum Setzen der Bilder, Rechte für den Bilder-Lauf) kommt später als 0006.
--
-- Was der Bucket tut:
--  * öffentlich LESEN: Jeder mit der Adresse darf die Datei laden (GET), ohne Schlüssel. Das braucht die App.
--  * SCHREIBEN: nur mit dem geheimen Schlüssel (service_role) oder im Dashboard (Storage → Upload). Es gibt absichtlich keine
--    Policy auf storage.objects für anon oder authenticated, also kann die App oder jemand mit dem öffentlichen Schlüssel nichts hochladen.
--  * höchstens 20 KB je Datei und nur SVG (image/svg+xml). Ein Titelbild ist etwa 2 bis 8 KB.
--
-- Regel für die Dateien: NIE überschreiben. Eine neue Fassung bekommt einen neuen Namen (z. B. mit Prüfsumme), danach ändert man
-- `image` der Aktivität. Würde man die Datei unter demselben Namen ersetzen, behielten die Handys das alte Bild im Speicher.
--
-- Kann mehrmals ausgeführt werden. Im SQL-Editor des Supabase-Dashboards alles auf einmal einfügen und Run drücken.
-- (Klappt das Einfügen in storage.buckets nicht: Dashboard → Storage → New bucket, gleiche Einstellungen, siehe docs/supabase.md.)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-images', 'activity-images', true, 20480, array['image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Kontrollabfrage. Erwartet:
--  * genau EINE Zeile „Bucket“: öffentlich: true, höchstens 20480 Byte, image/svg+xml
--  * KEINE Zeile „Schreib-Policy“. Steht dort eine, darf jemand außer dem geheimen Schlüssel auf storage.objects schreiben
--    (dann gehört sie geprüft; die Migration legt keine an).
select 'Bucket' as was,
       b.id::text as name,
       ('öffentlich: ' || b.public::text
         || ', höchstens ' || coalesce(b.file_size_limit::text, 'unbegrenzt') || ' Byte, '
         || coalesce(array_to_string(b.allowed_mime_types, ','), 'alle Typen')) as einstellung
from storage.buckets b
where b.id = 'activity-images'
union all
select 'Schreib-Policy (soll fehlen)' as was,
       p.policyname::text as name,
       (p.cmd || ' für ' || array_to_string(p.roles, ',')) as einstellung
from pg_policies p
where p.schemaname = 'storage'
  and p.tablename = 'objects'
  and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and p.roles && array['anon', 'authenticated', 'public']::name[];
