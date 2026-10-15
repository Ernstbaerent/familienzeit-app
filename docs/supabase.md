# Supabase (M8)

Die Aktivitäten kommen seit M8 aus einer Datenbank bei Supabase (Postgres, Region Frankfurt). Die App liest dort **nur öffentliche Daten**:
die freigegebenen Aktivitäten. Kinderprofile, Verlauf, Auswahl und Standort bleiben auf dem Handy. Ohne Netz, ohne Einrichtung oder bei jedem Fehler
nutzt die App die mitgelieferten Aktivitäten aus `data/` und hat damit immer Vorschläge.

Du brauchst dafür kein Konto in der App und keinen Code zu schreiben. Die Anleitung unten führt dich Schritt für Schritt durch (auf dem Chromebook).

Seit M9 schreibt zusätzlich der **KI-Wochenlauf** jeden Sonntag neue Aktivitäten in dieselbe Tabelle (GitHub Action mit dem geheimen Schlüssel, Migration `0002_activity_runs.sql`). Einrichtung, Rückgängig machen und Durchsicht: `docs/wochenlauf.md`.

Seit M10a gibt es zusätzlich die **Orte aus OpenStreetMap** in der Tabelle `places` (monatlicher Import je Bundesland, Migration `0003_places.sql`). Einrichtung und Ablauf: `docs/orte.md`.
Lizenz (ODbL) und Datenschutz dazu stehen unten in den Abschnitten „OpenStreetMap und ODbL“ und „Was an Supabase geht“. Seit M10b liest die App die Orte in Kacheln (`docs/orte.md`, „Orte in der App (M10b)“).
`anon` darf dafür `places` und `places_imports` lesen; beides steht schon in `0003_places.sql`, eine weitere Migration ist nicht nötig.

## Überblick

```
data/*.json  ──(npm run db:seed-sql)──▶  supabase/seed/*.sql  ──(von Hand im SQL-Editor)──▶  Tabelle "activities" bei Supabase
                                                                                                         │  nur status = 'approved'
App beim Start:  mitgelieferte Aktivitäten (sofort) ─▶ Zwischenspeicher vom Gerät ─▶ einmal pro Tag Supabase  ◀┘
                                                                                     (seit M8b nur die Änderungen)
```

| Was | Datei |
| --- | --- |
| Tabelle und Sicherheitsregeln (SQL) | `supabase/migrations/0001_activities.sql` |
| Einspiel-Dateien für den SQL-Editor (erzeugt, eingecheckt) | `supabase/seed/activities-part-N-of-M.sql` |
| Skript, das sie erzeugt (prüft vorher die Daten) | `scripts/seed-sql.ts` (`npm run db:seed-sql`) |
| Zugang aus der `.env` (mit Schutz vor geheimen Schlüsseln) | `src/features/activities/supabaseConfig.ts` |
| Abruf (einfacher GET, ohne `supabase-js`): Zählprobe, Änderungen, ID-Liste | `src/features/activities/fetchActivities.ts` |
| Abgleich (M8b): Stand, Zusammenführen, ID-Abgleich (reine Funktionen) | `activitySync.ts` |
| Zeile ↔ Aktivität | `src/features/activities/activityRow.ts` |
| Zwischenspeicher (Regeln, Format in Teilen) und Speicher auf dem Gerät | `activitiesCache.ts`, `activitiesStorage.ts` |
| Prüfen und aussortieren (kaputt, nicht freigegeben, fremdes Bild) | `activityLibrary.ts` |
| Ablauf eines Abgleichs, speichern, Fehler fangen | `activityRefresh.ts` |
| Ersatz für Supabase in den Tests, Messung des Datenverkehrs | `fakeActivitiesServer.ts`, `activityTraffic.test.ts` |
| Die Aktivitäten für die ganze App (`useActivities()`) | `ActivitiesContext.tsx` |
| Mitgelieferte Aktivitäten (Rückfall) | `bundledActivities.ts` (liest `data/`) |
| Erlaubte Adresse für Bilder (Allowlist) | `imageAllowlist.ts` |

## Schritt für Schritt (einmal einrichten)

### 1. Projekt

Du hast schon ein Supabase-Projekt. Prüfe im Dashboard unter **Project Settings → General**, dass die Region **Frankfurt (eu-central-1)** ist
(wichtig für den Datenschutz, siehe unten). Notiere dir den Namen des Projekts.

### 2. Tabelle anlegen

1. Dashboard → links **SQL Editor** → **New query**.
2. Die Datei `supabase/migrations/0001_activities.sql` öffnen (auf GitHub oder im Editor), **alles** markieren, kopieren, im SQL-Editor einfügen.
3. **Run** drücken, **ohne im SQL-Editor etwas zu markieren**: Der Editor führt bei markiertem Text nur die Markierung aus, und dann fehlen die Rechte am Ende der Datei (siehe „Rechte für die Daten-Schnittstelle“ unten).
   Erwartet: Unten erscheint das Ergebnis der letzten Abfrage, genau **zwei Zeilen**: `anon | SELECT` und `authenticated | SELECT`.
4. Kontrolle: links **Table Editor** → Tabelle **activities** ist da (noch leer). Neben dem Namen steht kein „RLS disabled“ (die Sicherheitsregeln, Row Level Security, sind an) und auch kein **„API DISABLED“** (die Tabelle ist für die Daten-Schnittstelle freigegeben).

Die Datei darf ein zweites Mal ausgeführt werden, das richtet nichts an. Im Zweifel einfach noch einmal die ganze Datei ausführen.

### 3. Aktivitäten einspielen

Die fertigen Dateien liegen schon im Repo unter `supabase/seed/` (fünf Teile mit je etwa 40 KB, 104 Aktivitäten). Wenn sich `data/` ändert, erzeugst du sie neu:

```bash
npm run db:seed-sql
```

Das Skript prüft zuerst alle Aktivitäten (dieselbe Prüfung wie `npm run activities:check`) und schreibt nichts, wenn etwas nicht stimmt.

Dann für **jeden** der fünf Teile:

1. **SQL Editor → New query**.
2. Den Inhalt von `activities-part-1-of-5.sql` einfügen (dann 2, 3, 4, 5), **Run**.
3. Unten erscheint eine Zahl `aktivitaeten_insgesamt`. Nach Teil 1 sind es 21, nach Teil 5 sind es **104**.

Die Reihenfolge ist egal, und jeder Teil darf wiederholt werden (vorhandene Aktivitäten werden aktualisiert, nichts wird doppelt).

**Wichtig: Alle fünf Teile einspielen.** Liefert die Datenbank der App weniger als 3 gültige Aktivitäten, ignoriert die App sie und bleibt beim Mitgelieferten.
Mit nur Teil 1 (21 Aktivitäten) würde die App dagegen die Datenbank benutzen und hätte plötzlich weniger Auswahl als vorher. Zähle deshalb nach dem Einspielen nach:
im SQL-Editor `select status, count(*) from public.activities group by status;` → `approved | 104`.

### 4. Schlüssel kopieren

Dashboard → **Project Settings → API** (je nach Oberfläche auch „API Keys“). Du brauchst zwei Werte:

- **Project URL**, z. B. `https://abcdefgh.supabase.co`
- den **öffentlichen** Schlüssel: „anon public“ (ein langer Text, der mit `eyJ` beginnt) **oder** „publishable“ (beginnt mit `sb_publishable_`)

**Niemals** den Schlüssel „service_role“ oder „secret“ benutzen: Der darf alles, auch Daten löschen. Alles, was mit `EXPO_PUBLIC_` beginnt, steckt in der App und ist für jeden lesbar.
Die App lehnt einen geheimen Schlüssel deshalb ab und schreibt eine Fehlermeldung in die Konsole. Hast du ihn doch irgendwo eingefügt: im Dashboard erneuern („roll“/„regenerate“).

### 5. `.env` auf dem Chromebook anlegen

Im Linux-Terminal im Projektordner (`familienzeit-app`):

```bash
cp .env.example .env
nano .env
```

Trage die beiden Werte ein (die Zeile `EXPO_PUBLIC_SUPABASE_URL=` und `EXPO_PUBLIC_SUPABASE_ANON_KEY=`, ohne Anführungszeichen und ohne Leerzeichen), speichern mit `Strg+O`, `Enter`, beenden mit `Strg+X`.

- Die Datei `.env` steht in der `.gitignore` und wird nie hochgeladen. Kontrolle: `git status` zeigt `.env` **nicht** an. Tut es das doch: nicht committen und mir Bescheid geben.
- `.env.example` (ohne echte Werte) ist die Vorlage im Repo.
- Expo liest die `.env` nur beim Start. Nach jeder Änderung die App mit `npx expo start -c` neu starten (das `-c` leert den Zwischenspeicher des Entwicklungsservers).

### 6. Testen

**a) Kommt die Datenbank an?** (im Terminal; ersetze die beiden Werte)

```bash
URL="https://DEIN-PROJEKT.supabase.co"
KEY="dein-öffentlicher-schluessel"

# Schlüssel im JWT-Format ("eyJ…"): beide Kopfzeilen mitsenden
curl -s "$URL/rest/v1/activities?select=id&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# neuer Schlüssel ("sb_publishable_…"): nur apikey
curl -s "$URL/rest/v1/activities?select=id&limit=3" -H "apikey: $KEY"
```

Erwartet: eine Liste wie `[{"id":"animal-yoga"},{"id":"autumn-bingo"},{"id":"baked-apples"}]`. Die Anzahl: `curl -s -D - -o /dev/null "$URL/rest/v1/activities?select=id" -H "apikey: $KEY" -H "Prefer: count=exact" -H "Range: 0-0"` zeigt in der Kopfzeile `content-range: 0-0/104`.

**b) Sind die Sicherheitsregeln dicht?** Das ist der wichtigste Test, weil der Schlüssel in der App steckt.

- Schreiben muss scheitern (und Lesen muss gehen, siehe „Rechte für die Daten-Schnittstelle“ oben): `curl -s -X POST "$URL/rest/v1/activities" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"id":"test"}'` → Antwort mit „permission denied“ (Code 42501). Im Table Editor darf **kein** Eintrag „test“ entstehen.
- Entwürfe müssen unsichtbar sein: Im SQL-Editor `update public.activities set status = 'draft' where id = 'marble-run';` ausführen. Jetzt liefert der Abruf (a) eine Aktivität weniger (103), und `…/rest/v1/activities?id=eq.marble-run&select=id` ergibt `[]`.
  Danach zurück: `update public.activities set status = 'approved' where id = 'marble-run';`

**c) In der App.** `npx expo start -c`, mit Expo Go öffnen. Im Terminal (wo Expo läuft) steht nach ein paar Sekunden:
`Aktivitäten: 104 von Supabase geladen.` Die App sieht aus wie vorher. Das ist richtig: Es ändert sich für Eltern nichts, nur die Quelle der Daten.
Ab dem zweiten Abruf holt die App nur noch die Änderungen (M8b), dann steht dort z. B. `Aktivitäten: 0 Änderung(en), jetzt 104 von Supabase.`

**d) Das tägliche Auffrischen ausprobieren.** Die App fragt höchstens einmal in 24 Stunden nach. Zum Testen trägst du in der `.env` die Zeile ein (ohne `#`):

```
EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES=1
```

Dann ändern: Im Table Editor bei einer Aktivität `status` auf `draft` stellen, mindestens eine Minute warten, `npx expo start -c` neu starten und Expo Go neu laden.
Im Terminal steht jetzt „0 Änderung(en), 1 zurückgezogen, jetzt 103 von Supabase“, und die Aktivität kommt nicht mehr vor. Stellst du sie wieder auf `approved`, steht beim nächsten Mal „1 Änderung(en), jetzt 104 von Supabase“.
**Die Zeile danach wieder entfernen** (sie ist nur zum Testen gedacht, der Standard von 24 Stunden ist richtig).

**e) Der Rückfall.** (1) Flugmodus an, App neu laden: Sie läuft wie immer, im Terminal steht eine Warnung „Abruf bei Supabase fehlgeschlagen“. (2) Falscher Schlüssel in der `.env`: Warnung mit „HTTP 401“, die App läuft weiter.
(3) `.env` umbenennen: Die App nutzt nur das Mitgelieferte und meldet nichts. In Expo Go erscheint bei Warnungen unten ein gelber Balken, das gibt es nur in der Entwicklung, nicht in der fertigen App.

## Rechte für die Daten-Schnittstelle (GRANT) und „API DISABLED“

**Warum das nötig ist.** Der Zugriff auf die Tabelle hat zwei Schlösser, und beide müssen stimmen:

1. **Das Recht (GRANT)** entscheidet, ob eine Rolle die Tabelle überhaupt anfassen darf. Die App benutzt die Rolle `anon` (Besucher ohne Anmeldung). Supabase gibt neue Tabellen im Schema `public` **nicht mehr automatisch** für die Daten-Schnittstelle frei:
   Ohne ausdrückliches `grant` zeigt der Table Editor an der Tabelle „API DISABLED“, und jede Anfrage der App scheitert.
2. **Row Level Security (RLS)** entscheidet danach, welche **Zeilen** die Rolle sieht: nur `status = 'approved'`.

Die Migration (`supabase/migrations/0001_activities.sql`, ganz unten) setzt deshalb genau diese zwei Zeilen, **nur lesen, kein Schreiben**:

```sql
revoke all on table public.activities from anon, authenticated;          -- erst alles wegnehmen
grant select on table public.activities to anon, authenticated;          -- dann nur SELECT (lesen) geben
```

Die Reihenfolge ist wichtig. Ein `grant insert/update/delete` gibt es bewusst nicht; auch ohne Schreib-Rechte wäre RLS ohne Schreib-Regel dicht, es sind also zwei Sicherungen.

**Wie du prüfst, dass es stimmt:**

- **Table Editor:** Bei der Tabelle `activities` steht weder „API DISABLED“ noch „RLS disabled“. Oben rechts lässt sich die Rolle umstellen (je nach Oberfläche von `postgres` auf **`anon`**): Mit `anon` siehst du die Zeilen mit `status = approved`, aber keine Entwürfe.
- **SQL-Editor:** Die Kontrollabfrage am Ende der Migration (einzeln ausführbar) muss genau zwei Zeilen liefern, `anon | SELECT` und `authenticated | SELECT`, und sonst nichts:

  ```sql
  select grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'activities' and grantee in ('anon', 'authenticated')
  order by grantee, privilege_type;
  ```

  Dazu ein Blick auf RLS: `select relrowsecurity from pg_class where oid = 'public.activities'::regclass;` → `true`.
- **Von außen (Schritt 6a und 6b):** Der Abruf mit `curl` liefert Aktivitäten, und der Schreibversuch scheitert mit „permission denied“.

**Was passiert, wenn das Recht fehlt?** Die Schnittstelle antwortet der App mit einem Fehler (typisch „permission denied for table activities“ als HTTP 401, oder 404, weil die Tabelle für die Schnittstelle gar nicht sichtbar ist). Die App fängt das ab:
sie schreibt eine Warnung in die Konsole („Abruf bei Supabase fehlgeschlagen (HTTP 401)“) und nutzt **still** den Zwischenspeicher oder den mitgelieferten Bestand. Eltern merken nichts, die App funktioniert wie vorher.
**Der Haken:** Auch du merkst es an der App nicht. Neue und geänderte Aktivitäten kommen einfach nie an. Achte deshalb beim Testen (Schritt 6c) darauf, dass im Terminal wirklich `Aktivitäten: 104 von Supabase geladen.` steht und nicht die Warnung.

**Reparatur:** Die Migration noch einmal **ganz** ausführen (sie ist wiederholbar). Oder nur die beiden Zeilen oben im SQL-Editor ausführen (`revoke … ; grant select …;`), danach die Kontrollabfrage. Die Tabelle und die Daten bleiben dabei unverändert.

**Hinweis zur Entstehung:** Beim ersten Einrichten zeigte die Tabelle „API DISABLED“, behoben mit `grant select on table public.activities to anon, authenticated;`. Die Zeile stand schon in der Migration; vermutlich wurde das Ende der Datei nicht mit ausgeführt
(z. B. weil im SQL-Editor ein Teil markiert war). Gewiss ist das nicht. Seitdem steht in der Migration ein Kommentar dazu und die Kontrollabfrage am Ende, und der Test `activitySql.test.ts` rechnet die Rechte nach (SELECT für `anon` und `authenticated`, kein Schreibrecht, RLS an).

## Was die App genau macht

- **Start:** Sofort sind die mitgelieferten Aktivitäten da (nichts wartet auf Speicher oder Netz). Dann, im Hintergrund:
  1. Der Zwischenspeicher vom Gerät wird gelesen (seit M8b `activities.v2.*`, vorher `activities.v1`). Ist er brauchbar, ersetzt er das Mitgelieferte.
  2. Ist Supabase eingerichtet und der letzte erfolgreiche Abruf mindestens 24 Stunden her (oder gab es noch nie einen), gleicht die App einmal ab (siehe „Nur Änderungen“). Klappt das, ersetzt der abgeglichene Bestand den bisherigen und wird gespeichert.
- **Höchstens ein Abgleich pro Start und pro Tag.** Ein Fehlschlag erneuert den Zeitpunkt nicht, der nächste Start versucht es also wieder.
- **Nur `approved`:** Jede Abfrage verlangt `status=eq.approved`, die Datenbank erlaubt dem öffentlichen Schlüssel nichts anderes (Row Level Security), und die App sortiert beim Laden noch einmal selbst alles Nicht-Freigegebene aus. Drei Schlösser hintereinander.
- **Kaputte Einträge** (fehlende oder falsche Felder, doppelte IDs) werden wie bisher verworfen und mit Grund in der Konsole gemeldet. Das gilt für Supabase, den Zwischenspeicher und das Mitgelieferte gleichermaßen.
  Ist eine **geänderte** Zeile kaputt, verschwindet die Aktivität vom Gerät (eine veraltete Fassung zu behalten wäre bei einer Sicherheitskorrektur falsch).
- **Still bei Fehlern:** Kein Netz, Fehlermeldung vom Server, falscher Schlüssel, pausiertes Projekt, Zeitüberschreitung nach 10 Sekunden (für den ganzen Abgleich), kaputte Antwort: Die App zeigt **nichts** an, es gibt nur eine Warnung in der Konsole. Eltern bekommen weiter ihre drei Vorschläge.
- **Nichts springt:** „Eure Ideen“ und die Detailansicht frieren die Aktivitäten beim Öffnen ein. Kommt im Hintergrund ein neuer Bestand an, sehen sie ihn erst beim nächsten Öffnen. (Kommt der Bestand genau zwischen „Eure Ideen“ und dem Tipp auf eine Karte, kann eine Idee, die inzwischen zurückgezogen wurde, zum Start zurückführen. Das ist selten und harmlos.)
- **Nur zum Testen:** `EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES` in der `.env` ändert den Abstand von 24 Stunden. Der Standard bleibt 24 Stunden; die Variable steht auskommentiert in der `.env.example` und gehört nie in eine fertige App-Version.
- **Bilder (`image`):** Wird nur angezeigt, wenn die Adresse mit `<Projekt-URL>/storage/v1/object/public/` beginnt (Allowlist, DESIGN.md Zusatz 35). Ein Bild von einem fremden Server wird weggelassen, die Aktivität bleibt. Das prüfen auch `npm run activities:check` (Fehler) und die Karte.

### Nur Änderungen (M8b)

Bis M8 holte jedes Gerät jeden Tag **alle** Aktivitäten (104 Aktivitäten: etwa 200 KB, bei 1 500 etwa 2,8 MB). Seit M8b holt es nur, was sich geändert hat. Ein Abgleich (`activityRefresh.ts`) hat diese Schritte, alle zusammen höchstens 10 Sekunden, **alles oder nichts**:

1. **Zählprobe:** eine Anfrage ohne Zeilen (`limit=0`, Kopfzeile `Prefer: count=exact`). Die Antwort ist `[]`, die Anzahl der freigegebenen Aktivitäten steht in der Kopfzeile `content-range` (z. B. `*/119`), die Uhrzeit des Servers in `Date`.
   Meldet der Server weniger als 3, bleibt alles beim Alten.
2. **Änderungen:** alle freigegebenen Zeilen mit `updated_at` nach dem gespeicherten **Stand**, sortiert nach (`updated_at`, `id`), in Seiten zu 500. Ohne brauchbaren Stand (erster Start, Umstieg von M8) sind das alle.
   - Die Seiten hängen über das letzte Paar (Zeitstempel, ID) zusammen, nicht über `offset`. So geht nichts verloren, auch wenn viele Zeilen denselben Zeitstempel haben (ein Seed-Teil oder ein Wochenlauf wird in **einem** Schreibvorgang geschrieben, alle Zeilen bekommen dessen Startzeit) oder sich während des Abrufs eine Zeile ändert.
   - Neue und geänderte Aktivitäten ersetzen die alte Fassung (nach ID).
3. **Zurückgezogenes:** Eine Aktivität, die auf `draft` oder `rejected` gesetzt (oder gelöscht) wird, kommt bei den Änderungen nicht vor, denn die Datenbank zeigt dem öffentlichen Schlüssel nur `approved`.
   Deshalb vergleicht die App die Anzahl auf dem Gerät mit der Zählprobe. Verglichen wird nur, was aus Supabase stammt: Der Zwischenspeicher enthält nie die mitgelieferten Aktivitäten aus `data/`.
   **Weicht die Anzahl ab** oder ist der letzte Abgleich **30 Tage** her (Sicherheitsnetz), holt die App die **ID-Liste** (nur die Spalte `id`, etwa 26 Byte je Aktivität): Was dort fehlt, wird gelöscht; was auf dem Gerät fehlt, wird einzeln nachgeladen (mehr als 100: einmal alles).
   Zurückgezogenes verschwindet damit wie bisher nach höchstens einem Tag. Wird es wieder freigegeben, ändert sich `updated_at`, und es kommt mit den Änderungen zurück.
4. **Mindestens 3 gültige Aktivitäten** nach dem Zusammenführen, sonst bleibt der bisherige Bestand. Dann speichern, mit neuem Stand.

**Der Stand** ist ein Zeitstempel der Datenbank (Mikrosekunden, UTC), nie die Uhr des Handys: der größte gesehene `updated_at`, aber höchstens die Uhrzeit des Servers minus **15 Minuten**.
Grund: Ein Schreibvorgang bekommt als `updated_at` seine Startzeit, sichtbar wird er erst an seinem Ende. Lief er gerade, als das Handy abgerufen hat, liegt seine Startzeit trotzdem nach dem Stand, und der nächste Abgleich holt ihn.
Fertige Stapel (der Wochenlauf vom Sonntag) werden dagegen nicht jeden Tag neu geladen. Fehlt die Kopfzeile `Date`, gilt größter Zeitstempel minus 15 Minuten (sicher, der letzte Stapel kommt dann einmal doppelt).

**Wenn etwas schiefgeht:**

- **Stand kaputt** (nicht lesbar) oder **in der Zukunft** (mehr als 15 Minuten nach der Uhrzeit des Servers, z. B. nachdem du die Datenbank aus einer Sicherung wiederhergestellt hast): Warnung in der Konsole, die App lädt einmal alles. Bis das klappt, bleibt der bisherige Bestand.
- **Uhr des Handys falsch:** Sie steuert nur „einmal pro Tag“ (steht sie zurück, wird abgeglichen) und die 30 Tage für die ID-Liste (liegt der gespeicherte Zeitpunkt in der Zukunft, gilt die ID-Liste als fällig). Den Stand beeinflusst sie nicht. Schlimmstenfalls gibt es ein paar Abgleiche mehr, jeder ohne Änderung kostet etwa 1,6 KB.
- **Content-range fehlt** (die Anzahl ist unbekannt): Die App vergleicht dann nicht, Zurückgezogenes verschwindet erst mit der ID-Liste nach 30 Tagen. Bei Supabase sollte die Kopfzeile immer kommen.
- **Eine kaputte Zeile in der Datenbank** (z. B. von Hand falsch eingetragen) fehlt auf dem Gerät, die Anzahl weicht also jeden Tag ab, und die App holt jeden Tag die ID-Liste (bei 1 500 Aktivitäten etwa 40 KB). In der Konsole steht dazu jeden Tag „übersprungen“ mit dem Grund. Die Zeile reparieren oder auf `rejected` setzen.

**Zwischenspeicher in Teilen:** `activities.v2.meta` (Zeitpunkt, Stand, letzter ID-Abgleich, Anzahl, Kennung der Fassung) und `activities.v2.part.<Fassung>.<n>` mit je höchstens **200 Aktivitäten** (etwa 400 KB; Android liest Einträge über etwa 2 MB nicht, `docs/wochenlauf.md`, „Wachstum“).
Geschrieben werden erst die neuen Teile, dann `activities.v2.meta`, erst danach werden die alten Teile gelöscht. Bricht das ab, gilt die alte Fassung weiter. Fehlt ein Teil oder ist einer kaputt, ist der ganze Zwischenspeicher ungültig (Mitgeliefertes, der nächste Abgleich lädt alles).
**Umstieg von M8:** Gibt es noch kein v2, liest die App den alten Eintrag `activities.v1` und zeigt ihn sofort. Er hat keinen Stand, deshalb lädt der nächste Abgleich einmal alles (so groß wie früher ein Tag); danach steht v2 auf dem Gerät, und erst dann wird `activities.v1` gelöscht. Niemand verliert etwas.

**Seed-Dateien:** Sie schreiben eine vorhandene Aktivität nur noch, wenn sich wirklich etwas geändert hat (`… do update set … where (…) is distinct from (excluded.…)`). Erneutes Einspielen lässt `updated_at` stehen, und kein Gerät lädt deshalb etwas neu.
Eine Änderung im Table Editor oder per `update` setzt `updated_at` dagegen immer neu (Trigger), auch wenn der Wert gleich bleibt: Das kostet nur die eine Zeile.

## Wenn das Projekt pausiert ist

**Soweit mir bekannt** werden kostenlose Supabase-Projekte nach einer Zeit ohne Aktivität (nach meinem Stand etwa eine Woche) automatisch **pausiert**. Ein pausiertes Projekt antwortet nicht; im Dashboard
gibt es einen Knopf zum Wiederherstellen („Restore project“), und die Daten bleiben nach meinem Stand eine begrenzte Zeit erhalten. Die genauen Fristen, ob Abrufe der App als „Aktivität“ zählen,
und was ein bezahlter Plan kostet, ändern sich: **bitte aktuell bei Supabase nachlesen** (Pricing und die Hilfeseite zu „Pausing projects“).

**Was die App dann tut:** Der Abruf scheitert (Fehler oder Zeitüberschreitung nach 10 Sekunden). Die App bleibt beim Zwischenspeicher oder dem Mitgelieferten, zeigt **keine** Meldung und schreibt nur eine Warnung in die Konsole.
Eltern merken nichts, außer dass neue Aktivitäten nicht ankommen. Ist das Projekt wieder da, klappt der nächste App-Start (ein Fehlschlag erneuert den Zeitpunkt nicht).

**Vor der Beta (M12) klären:**

1. Läuft die Datenbank der Beta und später der Veröffentlichung im kostenlosen Plan? Ein Projekt, das pausiert, ist für eine veröffentlichte App keine Dauerlösung. Optionen: bezahlter Plan (**aktuellen Preis prüfen, das Budget aus der CLAUDE.md sind etwa 20 € im Monat**)
   oder ein regelmäßiges „Lebenszeichen“ (z. B. der KI-Wochenlauf aus M9, der ohnehin wöchentlich in die Datenbank schreibt, oder eine kleine GitHub Action alle paar Tage). Ob das reicht und erlaubt ist, bei Supabase nachlesen.
2. Die Entscheidung in der CLAUDE.md unter „Entscheidungen vor M12“ festhalten.
3. Einmal bewusst testen: Im Dashboard das Projekt pausieren („Pause project“), die App starten (muss ganz normal laufen, nur mit Warnung in der Konsole), danach wiederherstellen und prüfen, dass der Abruf wieder klappt.
4. Prüfen, ob Supabase vor einer Pausierung per E-Mail warnt, und die Adresse des Kontos im Blick behalten (nicht im Spam).
5. Die mitgelieferten Aktivitäten (`data/`) sind der Rückfall und in jeder App-Version eingefroren: In jedem Release auf dem aktuellen Stand halten. Sie sind auch die Sicherung: Aus `data/` lässt sich die Datenbank jederzeit in Minuten neu aufbauen (Schritt 2 und 3).

## Datenverkehr (Egress): messen und wenn es knapp wird

Der kostenlose Tarif hat **5 GB Egress im Monat** (Preisseite, gelesen am 14.10.2026; bitte aktuell nachlesen). Ob Supabase gepackt oder ungepackt zählt, ist nicht dokumentiert, soweit ich es gefunden habe.
Die App packt nichts selbst: React Native fordert gepackte Antworten von sich aus an (Android über OkHttp mit `Accept-Encoding: gzip`, iOS über NSURLSession) und entpackt sie selbst.
Die App setzt `Accept-Encoding` deshalb bewusst **nicht** (auf Android würde sie damit das automatische Entpacken abschalten; ein Test prüft das).

**Gemessen** (`TRAFFIC_REPORT=1 npx jest activityTraffic`, echte Aktivitäten aus `data/`, Testserver, Inhalt der Antworten; Kopfzeilen geschätzt mit 0,8 KB je Antwort):

| Abruf | 104 Aktivitäten | 1 500 Aktivitäten |
| --- | --- | --- |
| erster Abruf (alles, wie früher jeden Tag) | 204 KB ungepackt / 65 KB gepackt | 2,9 MB ungepackt |
| Folgetag ohne Änderung (2 Anfragen, Inhalt `[]`) | **1,6 KB** (fast nur Kopfzeilen) | **1,6 KB** |
| nach dem Wochenlauf (15 neu) | 29 KB / 11 KB | 29 KB / 11 KB |
| eine zurückgezogen (mit ID-Liste) | 5 KB / 3 KB | 44 KB |
| **ein Monat** (30 Abgleiche, 60 neu, eine Änderung, ein Zurückziehen) | **165 KB / 90 KB** | **204 KB** |

(Die gepackten Werte bei 1 500 sind im Test zu günstig, weil die vervielfältigten Texte sich wiederholen; realistisch ist etwa ein Drittel des ungepackten Werts.)

Gerechnet für den Monat (jedes Gerät gleicht jeden Tag ab, der ungünstige Fall):

| Geräte | 119 Aktivitäten: bis M8 → seit M8b | 500 | 1 500 |
| --- | --- | --- | --- |
| 200 | 1,3 GB → 34 MB (gepackt 0,4 GB → 19 MB) | 5,4 GB → 36 MB (1,7 GB → 19 MB) | 16 GB → 41 MB (5,2 GB → 21 MB) |
| 1 000 | 6,5 GB → 171 MB (2,1 GB → 93 MB) | 27 GB → 181 MB (8,6 GB → 96 MB) | 82 GB → 205 MB (26 GB → 105 MB) |
| 5 000 | 33 GB → 0,86 GB (10 GB → 0,47 GB) | 136 GB → 0,90 GB (43 GB → 0,48 GB) | 408 GB → 1,0 GB (129 GB → 0,52 GB) |

Dazu einmal pro **neuem Gerät** (und einmal pro Gerät beim Umstieg von M8) der erste volle Abruf: 226 KB, 950 KB bzw. 2,8 MB ungepackt. Seit M8b verbrauchen die **Orte** mehr als die Aktivitäten
(bis etwa 8,4 MB ungepackt pro Gerät und Monat im Ruhrgebiet, `docs/orte.md`, „Datenverkehr pro Gerät und Monat“).

### So siehst du den echten Datenverkehr (nach dem Test)

Die Menüs bei Supabase heißen je nach Stand etwas anders; gesucht ist die **Nutzung (Usage)**.

1. Im Dashboard links unten oder über den Namen der Organisation oben: **Organization Settings → Usage** (manchmal auch „Billing → Usage“).
2. Den Abschnitt **Egress** suchen. Dort steht der Verbrauch des laufenden Abrechnungszeitraums und die Grenze (5 GB), oft mit einer Aufteilung nach Tagen und nach Art (Datenbank-Schnittstelle, Storage, …). „Cached Egress“ ist ein eigener Topf.
3. **Ein Gerät messen:** Notiere den Stand von „Egress“. Starte die App mit `EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES=1` (Schritt 6d) und lade sie zehnmal neu, jeweils mit mindestens einer Minute Abstand. Die Nutzung wird mit Verzögerung aktualisiert (bis zu einigen Stunden): am nächsten Tag noch einmal hinsehen.
   Erwartet: etwa 10 × 1,6 KB, also deutlich unter 1 MB. Steht dort viel mehr, mir Bescheid geben.
4. **Gepackt oder nicht?** Im Terminal (Werte wie in Schritt 6a):

   ```bash
   curl -s -o /dev/null -D - --compressed "$URL/rest/v1/activities?select=*&status=eq.approved" -H "apikey: $KEY" | grep -i -E "content-encoding|content-length"
   curl -s -o /dev/null -w "gepackt: %{size_download} Byte\n" -H "Accept-Encoding: gzip" "$URL/rest/v1/activities?select=*&status=eq.approved" -H "apikey: $KEY"
   curl -s -o /dev/null -w "ungepackt: %{size_download} Byte\n" "$URL/rest/v1/activities?select=*&status=eq.approved" -H "apikey: $KEY"
   ```

   Steht in der ersten Ausgabe `content-encoding: gzip` und ist die zweite Zahl etwa ein Drittel der dritten, packt Supabase. Ob die Nutzung dann den gepackten Wert zählt, siehst du nur am Verbrauch (Punkt 3 mit dem vollen Abruf vergleichen: nach dem Löschen der App-Daten lädt der erste Abgleich alles, etwa 200 KB ungepackt oder 65 KB gepackt).

### Wenn der kostenlose Tarif knapp wird

Supabase schickt nach meinem Stand eine E-Mail, wenn ein Projekt die Grenzen überschreitet; im kostenlosen Tarif können Anfragen danach eingeschränkt werden. **Was genau passiert, bitte bei Supabase nachlesen** („Usage limits“, „Fair use“).
Für die App wäre das harmlos (sie nutzt dann still den Zwischenspeicher oder das Mitgelieferte), aber neue Aktivitäten und Orte kämen nicht mehr an.

Der Reihe nach:

1. **Nachsehen, wer verbraucht.** Seit M8b sind das vor allem die Orte, nicht die Aktivitäten. Sind es doch die Aktivitäten: Wurde etwas sehr oft geändert (z. B. viele Zeilen im Table Editor einzeln gespeichert oder ein großes `update` über alle)? Jede Änderung lädt jedes Gerät einmal.
2. **Große Änderungen bündeln:** lieber einmal in der Woche viele Änderungen als jeden Tag ein paar. Keine `update`-Befehle über die ganze Tabelle, wenn sich nichts ändert (der Trigger setzt `updated_at` trotzdem).
3. **Abstand vergrößern:** Die Aktivitäten fragen höchstens einmal pro Tag nach. Ein Abstand von zwei Tagen halbiert die Kopfzeilen (die Hälfte des Verbrauchs ohne Änderungen); das ist eine Code-Änderung (`defaultRefreshMinutes` in `activitiesCache.ts`), mit mir absprechen.
4. **Orte:** Die Hebel dort (seltener abrufen, kleinere Kacheln oder Umkreis, gepackt) stehen in der CLAUDE.md unter „Später“ und in `docs/orte.md`.
5. **Erst danach** über den bezahlten Plan nachdenken (Pro kostet nach meinem Stand 25 $ im Monat, etwa 23 €, über dem Budget von 20 €; **Preis aktuell prüfen**). Das ist die Entscheidung vor M12, Punkt 7, in der CLAUDE.md.

## Datenschutz, vor M12

Vorarbeit für die Datenschutzerklärung (M12). Das ist **eine Prüfliste, keine Rechtsberatung**: Die Punkte sind das, was ich vor der Veröffentlichung klären und von einer fachkundigen Stelle
(Rechtsanwalt oder Datenschutzbeauftragte) gegenlesen lassen würde.

### Was an Supabase geht

Beim Abruf (höchstens einmal pro Tag und Gerät, siehe oben) sieht Supabase technisch bedingt:

| Was | Wie |
| --- | --- |
| **IP-Adresse** des Handys | fällt bei jeder Internetverbindung an, kann in Server- und API-Protokollen von Supabase stehen |
| Zeitpunkt des Abrufs, abgefragte Tabelle und Parameter | `activities`, `status=approved`, Sortierung, Seite; seit M8b dazu der **Stand** (ein Zeitstempel der Datenbank, z. B. der des letzten Wochenlaufs) und bei Bedarf IDs von Aktivitäten. Der Stand sagt nur, wann das Gerät zuletzt abgeglichen hat, nichts über die Familie. |
| öffentlicher Projekt-Schlüssel | derselbe in jeder App, kein Bezug zu einer Person |
| übliche Angaben der Verbindung | z. B. Programm/Betriebssystem-Kennung der Netzwerkbibliothek (User-Agent) |
| Region des Servers | EU, Frankfurt (eu-central-1) |

**Nicht** an Supabase gehen: Kinderprofile (Geburtsjahr und -monat, Spitzname, Interessen), Auswahl, Verlauf, Bewertungen, Standort, Wetter, Gerätekennung, Werbe-ID.
Es gibt kein Konto, keine Cookies und keinen Tracker. Die App schickt nur diesen einen Lese-Abruf und schreibt nie in die Datenbank (die Datenbank würde es auch nicht erlauben).
Die Aktivitäten selbst sind öffentliche Daten. Datenschutzrechtlich geht es deshalb nur um die **IP-Adresse** (und die Verbindungsdaten) beim Abruf.

**Seit M10b: Orte.** Die App fragt Supabase zusätzlich nach Orten, aber **nur nach ganzen Kacheln** (0,2° × 0,3°, in Deutschland etwa 22 × 20 km, Details `docs/orte.md`, „Kacheln“ und „Orte in der App (M10b)“), nie nach ihrem Standort.
Das passiert nur, wenn die Standort-Erlaubnis schon erteilt ist (beim Öffnen des Starts als Vorladen, auf „Eure Ideen“), und nur für Kacheln, die noch nicht oder zu lange auf dem Gerät liegen.
Supabase sieht dabei:

| Was geht an Supabase | Wie |
| --- | --- |
| **IP-Adresse** des Handys | wie beim Abruf der Aktivitäten (Server- und API-Protokolle von Supabase) |
| **Zeitpunkt** | Abruf nur, wenn eine Kachel fehlt, bei Kacheln mit Orten nach 30 Tagen, bei leeren nach 7 Tagen. Frische Kacheln kosten keinen Abruf. |
| **Liste der Kachel-Schlüssel** (z. B. `253_40,253_41,…`) | meist 12 bis 16, im Norden bis 20 Kacheln für den Umkreis von 30 km, oder nur die fehlenden. Aus der Liste lässt sich die **Gegend auf etwa ±10 bis 20 km** ablesen (die Mitte der Kacheln), zusammen mit der IP-Adresse also ungefähr der Wohn- oder Aufenthaltsort. |
| Abfrage von `places_imports` | zweimal je Abruf, ohne Parameter außer der Spaltenliste (für alle Geräte gleich) |
| öffentlicher Projekt-Schlüssel, übliche Verbindungsangaben (User-Agent) | wie bei den Aktivitäten |

**Nicht** an Supabase gehen: die **GPS-Position**, der auf etwa **1 km gerundete Standort** (er bleibt auf dem Handy, die Entfernungen rechnet die App selbst), **Kinderdaten** (Alter, Spitzname, Interessen, Abneigungen),
Auswahl, Verlauf, Bewertungen, Wetter, **Gerätekennung**, Werbe-ID. Die Adresse der Abfrage enthält nur Kachel-Schlüssel (ein Test prüft, dass keine Koordinaten darin stehen: `src/features/places/fetchPlaces.test.ts`).

Weitere Stellen, an denen Daten das Handy verlassen, aber **nur nach einem Tipp**:

- **Seit M10b:** Die Quellenangabe „Orte: © OpenStreetMap-Mitwirkende“ öffnet https://www.openstreetmap.org/copyright im Browser (die IP-Adresse geht dann an die OpenStreetMap Foundation).
- **Seit M10c, „Route öffnen“:** Beim Öffnen einer Route übergibt die App die Koordinaten des Ziels an die von dir gewählte Karten-App.
  Die App selbst sendet dabei nichts und fragt vorher nicht nach (auf dem iPhone erscheint nur das Auswahlmenü). Der Standort geht nicht mit, die Karten-App bestimmt ihn selbst.
  Was die Karten-App weiterschickt, regeln deren Anbieter (Apple, Google, OpenStreetMap Foundation); bei Google Maps und OpenStreetMap im Browser geht die IP-Adresse an diesen Anbieter.
  Auf Android geht zusätzlich der Name des Ortes mit (Beschriftung in der Karte). Details: `docs/orte.md`, „Route und Website (M10c)“.
- **Seit M10c, Website:** „Website öffnen“ öffnet die Website des Ortes im Browser (die IP-Adresse geht dann an diese Website). Nur Adressen mit `http://` oder `https://`.

Alles gehört in die Datenschutzerklärung, mit dem Hinweis, dass dort die Bedingungen dieser Anbieter gelten.
Der Import selbst (GitHub Action) verarbeitet keine Daten von App-Nutzern; die OSM-Dateien von Geofabrik enthalten keine Namen oder IDs der Mitwirkenden.

Kommen später Bilder aus Supabase Storage dazu, geht beim Laden eines Bildes ebenfalls die IP-Adresse dorthin (derselbe Anbieter, deshalb ist die Allowlist auf diesen Speicher beschränkt). Kommen später ein Konto oder eine Sicherung dazu, ist dieser Abschnitt neu zu bewerten.

### Prüfliste für dich (Clemens)

Was ich bei Supabase abrufen oder abschließen würde, und was in die Datenschutzerklärung gehört. Haken setzen, wenn erledigt:

**Unterlagen bei Supabase**

- [ ] **Auftragsverarbeitungsvertrag (AVV)**: Supabase nennt ihn „Data Processing Addendum (DPA)“. Soweit mir bekannt, gibt es ihn auf der Website von Supabase (Bereich „Legal“) und lässt er sich im Dashboard für die Organisation abrufen oder abschließen
  (die Bezeichnung dort kann abweichen, z. B. „Legal Documents“). Abschließen, als PDF speichern, Datum und Vertragspartner notieren.
- [ ] **Standardvertragsklauseln (SCC) / Drittlandübermittlung**: Supabase ist ein Unternehmen mit Sitz in den USA, der Server steht in der EU. Prüfen, ob im DPA Standardvertragsklauseln der EU enthalten sind,
  und ob Supabase (und seine Unterauftragnehmer) für den Datenschutzrahmen EU–USA zertifiziert ist (das lässt sich in der öffentlichen Liste dataprivacyframework.gov nachsehen). Das Ergebnis mit Quelle und Datum festhalten.
- [ ] **Unterauftragnehmer** (Sub-processors): Supabase veröffentlicht eine Liste (z. B. das Hosting bei einem großen Cloud-Anbieter). Ansehen, ob alle Server in der EU liegen, und die Liste mit Datum ablegen.
- [ ] **Sicherheitsnachweise / technische und organisatorische Maßnahmen (TOM)**: Die Sicherheitsseite („Security“/„Trust“) von Supabase ansehen und ablegen, was dort zu Verschlüsselung, Zugriff und Zertifizierungen steht.
- [ ] **Aufbewahrung der Protokolle**: Nachlesen, wie lange Supabase API- und Server-Protokolle (mit IP-Adressen) aufbewahrt. Das gehört als „Speicherdauer“ in die Datenschutzerklärung.
- [ ] **Region bestätigen** (Project Settings → General: Frankfurt) und mit Datum festhalten (Bildschirmfoto).
- [ ] Zugang zum Supabase-Konto absichern (Zwei-Faktor-Anmeldung), und wer außer dir Zugriff hat, auflisten.

**Angaben in der Datenschutzerklärung (Entwurf der Inhalte)**

- [ ] **Empfänger / Auftragsverarbeiter:** Supabase (Name und Anschrift des Vertragspartners aus dem DPA), Serverstandort EU (Frankfurt).
- [ ] **Zweck:** Laden und Aktualisieren der Aktivitäten (Ideen), damit die App auch neue Ideen zeigt.
- [ ] **Welche Daten:** IP-Adresse, Zeitpunkt, technische Verbindungsdaten; keine Kinderdaten, kein Standort, keine Konten (klar sagen, was **nicht** übertragen wird).
- [ ] **Rechtsgrundlage:** welche, lässt du fachkundig bestimmen (naheliegend ist ein berechtigtes Interesse, bei Kindern als Zielgruppe aber besonders sorgfältig prüfen).
- [ ] **Speicherdauer:** Dauer der Protokolle bei Supabase (siehe oben); in der App wird nichts davon gespeichert, der Zwischenspeicher auf dem Handy enthält nur öffentliche Aktivitäten.
- [ ] **Übermittlung in Drittländer:** falls zutreffend, die Garantien (Standardvertragsklauseln, Datenschutzrahmen) nennen.
- [ ] **Hinweis auf Freiwilligkeit / Offline:** Die App funktioniert auch ohne Abruf (mitgelieferte Aktivitäten), es gibt keine Pflicht zur Registrierung.
- [ ] **Alle weiteren Dienste der App an einem Ort aufführen**, nicht nur Supabase: Bright Sky / Deutscher Wetterdienst (Wetter, siehe `docs/weather.md`, dort auch der Abschnitt zum Standort), die Orte aus OpenStreetMap (Abruf in Kacheln, siehe oben „Ab M10b: Orte“; „Route öffnen“ und Website-Links nur nach einem Tipp) und später Veranstaltungsquellen (M11).
- [ ] **Orte (ab M10b):** in der Datenschutzerklärung die Kacheln erklären (welche Gegend daraus erkennbar ist) und die Quellenangabe „© OpenStreetMap-Mitwirkende“ (Lizenz unten).
- [ ] Verantwortlicher, Kontakt und Rechte der Betroffenen (Auskunft, Löschung, Beschwerde bei der Aufsichtsbehörde), Impressum (M12).

**Weitere Punkte**

- [ ] **Verzeichnis der Verarbeitungstätigkeiten** (Art. 30 DSGVO): Eintrag „Abruf der Aktivitäten“ ergänzen.
- [ ] **Store-Angaben** (Apple „App-Datenschutz“, Google Play „Datensicherheit“): müssen zur Datenschutzerklärung passen. Was die App an Daten sammelt und teilt, ehrlich und gleich angeben (IP-Adresse beim Abruf, Wetter-/Standortabfrage).
- [ ] **Zielgruppe prüfen:** Die App richtet sich an Eltern, spricht aber über Kinder. Ob und welche besonderen Regeln für Kinder greifen, fachkundig klären lassen.
- [ ] **Prüfung durch eine fachkundige Stelle**, bevor die Datenschutzerklärung veröffentlicht wird.

## OpenStreetMap und ODbL (Prüfliste vor M12)

Die Orte in `places` stammen aus OpenStreetMap (über Geofabrik, `docs/orte.md`). OpenStreetMap steht unter der **Open Database License 1.0 (ODbL)**.
Das ist **eine Prüfliste, keine Rechtsberatung**: Was ich aus den Texten der OpenStreetMap Foundation (Licence and Legal FAQ, Attribution Guidelines, gelesen am 14.10.2026) und von Geofabrik herausgelesen habe,
und was vor der Veröffentlichung eine fachkundige Stelle bestätigen sollte.

### Was das für uns bedeutet

- **`places` ist eine abgeleitete Datenbank** (Derivative Database): Wir filtern, ändern und ergänzen die OSM-Daten (Unterart, Ortsteil, Saison, vereinfachte Öffnungszeiten, Kindertauglichkeit).
  Sie bleibt deshalb unter der ODbL („Share-Alike“).
- **Die Karten und Detailansichten der App sind „Produced Works“** (aus der Datenbank gemachte Werke). Für sie gilt: Quellenangabe, und auf Anfrage die abgeleitete Datenbank
  (oder die Mittel, sie herzustellen) unter der ODbL herausgeben. Die App selbst darf eine andere Lizenz haben.
- **Die Aktivitäten bleiben getrennt.** Sie stehen in einer eigenen Tabelle und werden nicht mit OSM-Daten vermischt. Zusammen in einer App bilden sie eine „Collective Database“ (Sammlung unabhängiger Datenbanken),
  die nicht als abgeleitete Datenbank gilt. Die Aktivitäten fallen damit nicht unter die Weitergabepflicht. **Regel für später:** OSM-Daten nie in die Tabelle `activities` oder in `data/` kopieren.
- **„Öffentlich“:** Die Pflichten greifen bei öffentlicher Nutzung. Mit der Beta (Testversionen für Freunde und Familie) und spätestens mit der Veröffentlichung nutzen wir die Daten öffentlich.
  Die Daten-Schnittstelle von Supabase (mit dem öffentlichen Schlüssel lesbar) gibt die abgeleitete Datenbank ebenfalls öffentlich weiter.
- **Keine technischen Sperren gegen die Weitergabe**, ohne zusätzlich eine freie Kopie anzubieten (ODbL Abschnitt 4.7). Die Kacheln und der öffentliche Schlüssel sind keine Sperre im Sinne der Lizenz,
  das sollte aber die fachkundige Stelle bestätigen.

### Quellenangabe (Attribution)

Nach den Attribution Guidelines der OpenStreetMap Foundation:

- Text: **„© OpenStreetMap-Mitwirkende“** (oder „© OpenStreetMap contributors“), das Wort „OpenStreetMap“ als **Link auf https://www.openstreetmap.org/copyright** (dort stehen die Quellen und die ODbL).
- **Sichtbar ohne Zutun:** Wer die Orte sieht, muss die Angabe sehen, ohne erst etwas antippen zu müssen. Sie muss gut lesbar sein (Kontrast nach WCAG, wie in unserem Theme).
- **Ort der Angabe:** in der Nähe der Daten. Für M10b/M10c geplant: eine Zeile „Orte: © OpenStreetMap-Mitwirkende“ unter den Karten, wenn ein Ort dabei ist, und in der Detailansicht eines Ortes.
  Bei einer späteren Kartenansicht (M10d) zusätzlich in einer Ecke der Karte.
- **In der Datenbank selbst:** Die Tabelle trägt einen Kommentar mit Quelle und Lizenz (`0003_places.sql`), dazu diese Datei und `docs/orte.md` im Repo.

### Prüfliste für dich (Clemens)

- [ ] Quellenangabe in der App wie oben (seit M10b unter den Karten und in der Detailansicht eines Ortes: „Orte: © OpenStreetMap-Mitwirkende“ mit Link und „Daten unter der Open Database License (ODbL)“; vor der Beta in der App ansehen).
- [ ] Im Impressum oder auf einer Seite „Datenquellen“ der App: „Orte: © OpenStreetMap-Mitwirkende, Daten unter der Open Database License (ODbL)“ mit Link.
- [ ] **Weitergabe auf Anfrage:** Wie wir die abgeleitete Datenbank herausgeben, wenn jemand fragt. Vorschlag: Hinweis „Die Ortsdaten erhältst du auf Anfrage unter der ODbL“ und ein Export
  (`copy (select * from public.places) to …` bzw. im Table Editor als CSV) plus der Hinweis auf das Verfahren (dieses Repo: `scripts/places-prepare.ts`). Festlegen, wer die Anfragen beantwortet.
- [ ] Ist das Repo nicht öffentlich: klären, ob der Hinweis auf das Verfahren reicht oder ob wir den Export anbieten müssen (Vorschlag: Export anbieten, das ist einfach).
- [ ] Bestätigen lassen, dass Aktivitäten und Orte als „Collective Database“ getrennt bleiben, solange sie in getrennten Tabellen stehen.
- [ ] Geofabrik: Die Bedingungen einmal selbst lesen (geofabrik.de → Data → Downloads) und mit Datum festhalten (Stand bei mir: 14.10.2026, Lizenz ODbL, keine Benutzerdaten in den öffentlichen Dateien).
- [ ] Prüfung durch eine fachkundige Stelle vor M12 (zusammen mit der Datenschutzerklärung).

## Sicherheit in einem Satz

Der öffentliche Schlüssel in der App darf nur freigegebene Aktivitäten **lesen**; alles andere verbieten die Regeln in der Datenbank (`supabase/migrations/0001_activities.sql`, geprüft in `activitySql.test.ts`).
Geschrieben wird nur im Dashboard, im SQL-Editor oder mit dem geheimen Schlüssel — und der gehört nie in die App oder ins Repo. Den geheimen Schlüssel benutzen nur der KI-Wochenlauf und der Orte-Import, er steht nur in den GitHub Secrets (`SUPABASE_SECRET_KEY`). Bei den Aktivitäten darf er lesen, einfügen und ändern, aber nicht löschen (`0002_activity_runs.sql`, geprüft in `scripts/lib/weekly/migration.test.ts`);
bei den Orten darf er nur lesen, in die Zwischentabelle einfügen und ein Bundesland über die Funktion `publish_places_import` austauschen, nie direkt löschen oder ändern (`0003_places.sql`, geprüft in `scripts/lib/places/migration.test.ts`).

## Aktivitäten später ändern

Seit dem KI-Wochenlauf (M9) gibt es zwei Quellen: Die Aktivitäten von Hand stehen in `data/` (Datei ändern → `npm run activities:check` → `npm run db:seed-sql` → die geänderten Teile erneut im SQL-Editor ausführen, vorhandene Aktivitäten werden aktualisiert).
Die KI-Aktivitäten (`source = 'ai'`, mit `batch_id`) stehen **nur in der Datenbank**, nicht in `data/` und damit nicht im Rückfall der App. Sie ändert man im Table Editor oder per SQL (`docs/wochenlauf.md`).
Eine Aktivität zurückziehen: im Table Editor `status` auf `rejected` stellen (oder im SQL-Editor), die App nimmt sie beim nächsten Abruf heraus. Danach auch in `data/` den Status ändern, damit sie nicht beim nächsten Einspielen wieder freigegeben wird.
Der Test `activitySql.test.ts` meldet, wenn die Dateien in `supabase/seed/` nicht mehr zu `data/` passen.

## Ausblick: Bilder und Supabase (Vorschlag, nicht gebaut)

Heute liegen die Illustrationen gebündelt in der App (`assets/illustrations/`), die Zuordnung steht in `src/features/activities/illustrations.ts`. Ein neues Bild braucht damit ein App-Update. Für laufend neue Aktivitäten (M9) schlage ich später vor:

- Die Bilder kommen in einen öffentlichen Speicherbereich (Bucket) von Supabase Storage. Die Allowlist (`imageAllowlist.ts`) erlaubt genau diesen Speicher schon.
- Die Tabelle bekommt zwei freiwillige Spalten: `image` (gibt es schon: Titelbild) und `step_images` (JSON: Schrittnummer → Pfad). Die App zeigt sie mit `expo-image` (das `Image` von React Native kann keine SVG-Dateien aus dem Netz).
- **Zusammenspiel mit M8b (nur Entwurf, nicht gebaut):** `step_images` kommt in `activityColumns` (`activityRow.ts`) und damit in die Abfrage der Änderungen. Ändert sich `image` oder `step_images`, setzt der Trigger `updated_at` neu, und jedes Gerät bekommt die neue Zeile beim nächsten Abgleich.
  **Regel: Dateien in Storage nie überschreiben.** Eine neue Fassung bekommt einen neuen Namen mit Prüfsumme (z. B. `activities/<id>/cover-<hash>.svg`), danach wird die Zeile geändert. Würde die Datei unter demselben Namen ersetzt, änderte sich die Zeile nicht, und die Geräte behielten das alte Bild im Cache von `expo-image`.
  Alte Dateien erst nach etwa 60 Tagen löschen (ein Gerät, das lange nicht abgeglichen hat, zeigt bis dahin das alte Bild; danach fällt es auf Illustration bzw. Farbfläche zurück). Bilder laden erst beim Anzeigen und bleiben im Cache, ihr Datenverkehr zählt bei Storage, nicht bei der Datenbank.
- Die gebündelten Illustrationen bleiben als Offline-Rückfall. Die Reihenfolge bleibt `image` → gebündelte Illustration → Farbfläche.
- Bis M9b viele Bilder liefert, genügt der heutige Weg (gebündelt). Entscheiden, sobald mehr als eine Handvoll Aktivitäten Bilder haben.

## Tests

```bash
npm test               # u. a. Abruf, Zwischenspeicher, Rückfall, Nur-approved, Provider, SQL
npm run activities:check
npm run db:seed-sql    # erzeugt supabase/seed/ neu (der Test meldet, wenn sie veraltet sind)
```

Die Tests laufen ohne Netz und ohne Supabase: Der Abruf wird mit gemockten Antworten geprüft (`fetchActivities.test.ts`, `activityRefresh.test.ts`, `ActivitiesContext.test.tsx`).
Seit M8b beantwortet ein Testserver (`fakeActivitiesServer.ts`) die Anfragen wie die Datenbank (nur `approved`, gleicher Zeitstempel je Schreibvorgang, Schreibvorgänge erst am Ende sichtbar, Kopfzeilen `Date` und `content-range`).
Geprüft werden u. a.: erster Abruf, Folgetag ohne Änderung, Wochenlauf, mehr als 500 Zeilen mit gleichem Zeitstempel, eine Zeile ändert sich mitten im Abruf, ein Schreibvorgang läuft beim Abruf noch, Zurückziehen (auch ganzer Lauf, Löschen, wieder freigeben),
Datenbank mit weniger Aktivitäten als `data/` (keine tägliche ID-Liste), ID-Liste nach 30 Tagen, mehr als 100 fehlende, weniger als 3 gültige, Fehler in jedem Schritt, kaputter Stand, Stand in der Zukunft, falsche Handy-Uhr, fehlende Kopfzeilen,
Zwischenspeicher in Teilen (Umstieg von v1, abgebrochenes Schreiben, fehlender Teil, 1 500 Aktivitäten unter 1 MB je Eintrag) und der Datenverkehr (`activityTraffic.test.ts`).
Die Seed-Dateien (nur bei echter Änderung schreiben) wurden zusätzlich in einem Wegwerf-Postgres (PGlite) eingespielt: Erneutes Einspielen lässt `updated_at` stehen.
Das SQL wurde zusätzlich einmal in einem lokalen Wegwerf-Postgres (PGlite, nicht Teil des Projekts) ausgeführt: Tabelle, Einspielen (auch wiederholt), Lesen als `anon`, Schreiben als `anon`/`authenticated` verboten, Entwürfe unsichtbar.
Der Test der Migration (`activitySql.test.ts`) rechnet auch die Rechte nach: `anon` und `authenticated` haben am Ende genau `SELECT`, kein Schreibrecht, Row Level Security ist an. Zusätzlich wurde die Migration in dem Wegwerf-Postgres so geprüft, wie Supabase neue Tabellen jetzt behandelt (keine automatisch vergebenen Rechte): Mit der ganzen Datei hat `anon` genau `SELECT`; fehlt das Ende der Datei, hat `anon` kein Recht und bekommt „permission denied“.
**Ich selbst konnte nichts gegen das echte Supabase-Projekt testen** (kein Zugriff): Das übernimmt Schritt 6 oben.
