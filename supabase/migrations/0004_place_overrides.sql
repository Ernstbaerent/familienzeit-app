-- Miki: Ausschlussliste für Orte. Einzelne Orte beim Import verstecken (hide) oder hervorheben (boost).
--
-- So einspielen (wie 0003, Schritt für Schritt: docs/orte.md): Im Supabase-Dashboard "SQL Editor" öffnen, "New query" wählen,
-- diese ganze Datei einfügen und "Run" drücken, OHNE vorher etwas zu markieren. Voraussetzung: 0003 ist eingespielt.
-- Die Datei darf mehrmals ausgeführt werden: Vorhandene Einträge bleiben, die Rechte werden jedes Mal neu und gleich gesetzt.
--
-- Wirkung: Der Orte-Import (Teil "Hochladen", scripts/lib/places/overrides.ts) liest die Liste bei jedem Lauf:
--   hide  = der Ort wird nicht importiert
--   boost = Kindertauglichkeit fest 3; holt auch einen Ort zurück, den die Qualitätsregeln weggelassen hätten
-- Eine Änderung wirkt erst mit dem nächsten Import. Fertige SQL-Zeilen zum Eintragen: docs/orte.md, „Einen Ort verstecken oder hervorheben“.
--
-- Wer darf was:
--   App (anon, authenticated): gar nichts, sieht die Tabelle nicht.
--   Import (service_role = der geheime Schlüssel, nur in GitHub Secrets): nur lesen.
--   Du im Dashboard (Rolle postgres): eintragen, ändern, löschen.

create table if not exists public.place_overrides (
  id text primary key
    check (id ~ '^[nwr][1-9][0-9]{0,14}$'), -- OSM-Kennung wie in places.id: n = Punkt, w = Linie/Fläche, r = Relation
  action text not null
    check (action in ('hide', 'boost')),
  note text
    check (note is null or char_length(note) <= 300),
  created_on date not null default current_date
);

comment on table public.place_overrides is 'Miki: Orte beim Import verstecken (hide) oder hervorheben (boost). Nur Dashboard und Import, nie die App (docs/orte.md).';
comment on column public.place_overrides.id is 'OSM-Kennung wie in places.id (z. B. w123). Gilt in allen Bundesländern.';

-- Row Level Security an und bewusst KEINE Regel: anon und authenticated sehen hier nichts.
-- service_role umgeht Row Level Security in Supabase und braucht nur das Recht unten.
alter table public.place_overrides enable row level security;

-- Rechte: erst alles wegnehmen (Supabase vergibt für neue Tabellen in public sonst selbst Rechte), dann genau das Nötige geben.
revoke all on table public.place_overrides from anon, authenticated, service_role;
grant select on table public.place_overrides to service_role;

notify pgrst, 'reload schema';

-- Kontrolle: Das Ergebnis erscheint unten im SQL-Editor. Erwartet sind genau diese zwei Zeilen:
--   RLS place_overrides      | -            | an
--   Tabelle place_overrides  | service_role | SELECT
-- Steht dort mehr (z. B. anon oder authenticated) oder fehlt eine Zeile, stimmen die Rechte nicht.
select 'Tabelle ' || table_name as objekt, grantee as rolle, string_agg(privilege_type, ', ' order by privilege_type) as rechte
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'place_overrides'
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by table_name, grantee
union all
select 'RLS ' || relname, '-', case when relrowsecurity then 'an' else 'AUS (Fehler!)' end
from pg_class
where oid = 'public.place_overrides'::regclass
order by 1, 2;
