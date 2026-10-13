# Supabase (M8)

Die Aktivitäten kommen seit M8 aus einer Datenbank bei Supabase (Postgres, Region Frankfurt). Die App liest dort **nur öffentliche Daten**:
die freigegebenen Aktivitäten. Kinderprofile, Verlauf, Auswahl und Standort bleiben auf dem Handy. Ohne Netz, ohne Einrichtung oder bei jedem Fehler
nutzt die App die mitgelieferten Aktivitäten aus `data/` und hat damit immer Vorschläge.

Du brauchst dafür kein Konto in der App und keinen Code zu schreiben. Die Anleitung unten führt dich Schritt für Schritt durch (auf dem Chromebook).

## Überblick

```
data/*.json  ──(npm run db:seed-sql)──▶  supabase/seed/*.sql  ──(von Hand im SQL-Editor)──▶  Tabelle "activities" bei Supabase
                                                                                                         │  nur status = 'approved'
App beim Start:  mitgelieferte Aktivitäten (sofort) ─▶ Zwischenspeicher vom Gerät ─▶ einmal pro Tag Supabase  ◀┘
```

| Was | Datei |
| --- | --- |
| Tabelle und Sicherheitsregeln (SQL) | `supabase/migrations/0001_activities.sql` |
| Einspiel-Dateien für den SQL-Editor (erzeugt, eingecheckt) | `supabase/seed/activities-part-N-of-M.sql` |
| Skript, das sie erzeugt (prüft vorher die Daten) | `scripts/seed-sql.ts` (`npm run db:seed-sql`) |
| Zugang aus der `.env` (mit Schutz vor geheimen Schlüsseln) | `src/features/activities/supabaseConfig.ts` |
| Abruf (einfacher GET, ohne `supabase-js`) | `src/features/activities/fetchActivities.ts` |
| Zeile ↔ Aktivität | `src/features/activities/activityRow.ts` |
| Zwischenspeicher (Regeln, Format) und Speicher auf dem Gerät | `activitiesCache.ts`, `activitiesStorage.ts` |
| Prüfen und aussortieren (kaputt, nicht freigegeben, fremdes Bild) | `activityLibrary.ts` |
| Neu holen und speichern, Fehler fangen | `activityRefresh.ts` |
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

**d) Das tägliche Auffrischen ausprobieren.** Die App fragt höchstens einmal in 24 Stunden nach. Zum Testen trägst du in der `.env` die Zeile ein (ohne `#`):

```
EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES=1
```

Dann ändern: Im Table Editor bei einer Aktivität `status` auf `draft` stellen, mindestens eine Minute warten, `npx expo start -c` neu starten und Expo Go neu laden.
Im Terminal steht jetzt „103 von Supabase geladen“, und die Aktivität kommt nicht mehr vor. **Die Zeile danach wieder entfernen** (sie ist nur zum Testen gedacht, der Standard von 24 Stunden ist richtig).

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
  1. Der Zwischenspeicher vom Gerät (`activities.v1`, versioniert wie die Profile) wird gelesen. Ist er brauchbar, ersetzt er das Mitgelieferte.
  2. Ist Supabase eingerichtet und der letzte erfolgreiche Abruf mindestens 24 Stunden her (oder gab es noch nie einen), fragt die App einmal nach. Klappt das, ersetzt der neue Bestand den bisherigen und wird gespeichert.
- **Höchstens ein Abruf pro Start und pro Tag.** Ein Fehlschlag erneuert den Zeitpunkt nicht, der nächste Start versucht es also wieder.
- **Alles oder nichts:** Der neue Bestand ersetzt den alten komplett (so verschwindet eine zurückgezogene Aktivität auch aus der App). Er gilt aber nur, wenn mindestens **3 gültige** Aktivitäten ankommen; sonst bleibt der Zwischenspeicher oder das Mitgelieferte.
- **Nur `approved`:** Die Abfrage verlangt `status=eq.approved`, die Datenbank erlaubt dem öffentlichen Schlüssel nichts anderes (Row Level Security), und die App sortiert beim Laden noch einmal selbst alles Nicht-Freigegebene aus. Drei Schlösser hintereinander.
- **Kaputte Einträge** (fehlende oder falsche Felder, doppelte IDs) werden wie bisher verworfen und mit Grund in der Konsole gemeldet. Das gilt für Supabase, den Zwischenspeicher und das Mitgelieferte gleichermaßen.
- **Still bei Fehlern:** Kein Netz, Fehlermeldung vom Server, falscher Schlüssel, pausiertes Projekt, Zeitüberschreitung nach 10 Sekunden, kaputte Antwort: Die App zeigt **nichts** an, es gibt nur eine Warnung in der Konsole. Eltern bekommen weiter ihre drei Vorschläge.
- **Nichts springt:** „Eure Ideen“ und die Detailansicht frieren die Aktivitäten beim Öffnen ein. Kommt im Hintergrund ein neuer Bestand an, sehen sie ihn erst beim nächsten Öffnen. (Kommt der Bestand genau zwischen „Eure Ideen“ und dem Tipp auf eine Karte, kann eine Idee, die inzwischen zurückgezogen wurde, zum Start zurückführen. Das ist selten und harmlos.)
- **Nur zum Testen:** `EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES` in der `.env` ändert den Abstand von 24 Stunden. Der Standard bleibt 24 Stunden; die Variable steht auskommentiert in der `.env.example` und gehört nie in eine fertige App-Version.
- **Größe:** Alle 104 Aktivitäten sind etwa 200 KB als JSON (gepackt übertragen etwa 65 KB). Ein Abruf pro Tag und Gerät ist damit unkritisch. Bei mehr als 500 Aktivitäten holt die App sie in Seiten à 500.
- **Bilder (`image`):** Wird nur angezeigt, wenn die Adresse mit `<Projekt-URL>/storage/v1/object/public/` beginnt (Allowlist, DESIGN.md Zusatz 35). Ein Bild von einem fremden Server wird weggelassen, die Aktivität bleibt. Das prüfen auch `npm run activities:check` (Fehler) und die Karte.

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

## Datenschutz, vor M12

Vorarbeit für die Datenschutzerklärung (M12). Das ist **eine Prüfliste, keine Rechtsberatung**: Die Punkte sind das, was ich vor der Veröffentlichung klären und von einer fachkundigen Stelle
(Rechtsanwalt oder Datenschutzbeauftragte) gegenlesen lassen würde.

### Was an Supabase geht

Beim Abruf (höchstens einmal pro Tag und Gerät, siehe oben) sieht Supabase technisch bedingt:

| Was | Wie |
| --- | --- |
| **IP-Adresse** des Handys | fällt bei jeder Internetverbindung an, kann in Server- und API-Protokollen von Supabase stehen |
| Zeitpunkt des Abrufs, abgefragte Tabelle und Parameter | `activities`, `status=approved`, Seite, Sortierung (für alle Geräte gleich) |
| öffentlicher Projekt-Schlüssel | derselbe in jeder App, kein Bezug zu einer Person |
| übliche Angaben der Verbindung | z. B. Programm/Betriebssystem-Kennung der Netzwerkbibliothek (User-Agent) |
| Region des Servers | EU, Frankfurt (eu-central-1) |

**Nicht** an Supabase gehen: Kinderprofile (Geburtsjahr und -monat, Spitzname, Interessen), Auswahl, Verlauf, Bewertungen, Standort, Wetter, Gerätekennung, Werbe-ID.
Es gibt kein Konto, keine Cookies und keinen Tracker. Die App schickt nur diesen einen Lese-Abruf und schreibt nie in die Datenbank (die Datenbank würde es auch nicht erlauben).
Die Aktivitäten selbst sind öffentliche Daten. Datenschutzrechtlich geht es deshalb nur um die **IP-Adresse** (und die Verbindungsdaten) beim Abruf.

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
- [ ] **Alle weiteren Dienste der App an einem Ort aufführen**, nicht nur Supabase: Bright Sky / Deutscher Wetterdienst (Wetter, siehe `docs/weather.md`, dort auch der Abschnitt zum Standort) und später OpenStreetMap-Daten (M10), Veranstaltungsquellen (M11).
- [ ] Verantwortlicher, Kontakt und Rechte der Betroffenen (Auskunft, Löschung, Beschwerde bei der Aufsichtsbehörde), Impressum (M12).

**Weitere Punkte**

- [ ] **Verzeichnis der Verarbeitungstätigkeiten** (Art. 30 DSGVO): Eintrag „Abruf der Aktivitäten“ ergänzen.
- [ ] **Store-Angaben** (Apple „App-Datenschutz“, Google Play „Datensicherheit“): müssen zur Datenschutzerklärung passen. Was die App an Daten sammelt und teilt, ehrlich und gleich angeben (IP-Adresse beim Abruf, Wetter-/Standortabfrage).
- [ ] **Zielgruppe prüfen:** Die App richtet sich an Eltern, spricht aber über Kinder. Ob und welche besonderen Regeln für Kinder greifen, fachkundig klären lassen.
- [ ] **Prüfung durch eine fachkundige Stelle**, bevor die Datenschutzerklärung veröffentlicht wird.

## Sicherheit in einem Satz

Der öffentliche Schlüssel in der App darf nur freigegebene Aktivitäten **lesen**; alles andere verbieten die Regeln in der Datenbank (`supabase/migrations/0001_activities.sql`, geprüft in `activitySql.test.ts`).
Geschrieben wird nur im Dashboard, im SQL-Editor oder mit dem geheimen Schlüssel — und der gehört nie in die App oder ins Repo.

## Aktivitäten später ändern

Bis zum KI-Wochenlauf (M9) ist `data/` die Quelle: Datei ändern → `npm run activities:check` → `npm run db:seed-sql` → die geänderten Teile erneut im SQL-Editor ausführen (vorhandene Aktivitäten werden aktualisiert).
Eine Aktivität zurückziehen: im Table Editor `status` auf `rejected` stellen (oder im SQL-Editor), die App nimmt sie beim nächsten Abruf heraus. Danach auch in `data/` den Status ändern, damit sie nicht beim nächsten Einspielen wieder freigegeben wird.
Der Test `activitySql.test.ts` meldet, wenn die Dateien in `supabase/seed/` nicht mehr zu `data/` passen.

## Ausblick: Bilder und Supabase (Vorschlag, nicht gebaut)

Heute liegen die Illustrationen gebündelt in der App (`assets/illustrations/`), die Zuordnung steht in `src/features/activities/illustrations.ts`. Ein neues Bild braucht damit ein App-Update. Für laufend neue Aktivitäten (M9) schlage ich später vor:

- Die Bilder kommen in einen öffentlichen Speicherbereich (Bucket) von Supabase Storage. Die Allowlist (`imageAllowlist.ts`) erlaubt genau diesen Speicher schon.
- Die Tabelle bekommt zwei freiwillige Spalten: `image` (gibt es schon: Titelbild) und `step_images` (JSON: Schrittnummer → Pfad). Die App zeigt sie mit `expo-image` (das `Image` von React Native kann keine SVG-Dateien aus dem Netz).
- Die gebündelten Illustrationen bleiben als Offline-Rückfall. Die Reihenfolge bleibt `image` → gebündelte Illustration → Farbfläche.
- Bis M9b viele Bilder liefert, genügt der heutige Weg (gebündelt). Entscheiden, sobald mehr als eine Handvoll Aktivitäten Bilder haben.

## Tests

```bash
npm test               # u. a. Abruf, Zwischenspeicher, Rückfall, Nur-approved, Provider, SQL
npm run activities:check
npm run db:seed-sql    # erzeugt supabase/seed/ neu (der Test meldet, wenn sie veraltet sind)
```

Die Tests laufen ohne Netz und ohne Supabase: Der Abruf wird mit gemockten Antworten geprüft (`fetchActivities.test.ts`, `activityRefresh.test.ts`, `ActivitiesContext.test.tsx`).
Das SQL wurde zusätzlich einmal in einem lokalen Wegwerf-Postgres (PGlite, nicht Teil des Projekts) ausgeführt: Tabelle, Einspielen (auch wiederholt), Lesen als `anon`, Schreiben als `anon`/`authenticated` verboten, Entwürfe unsichtbar.
Der Test der Migration (`activitySql.test.ts`) rechnet auch die Rechte nach: `anon` und `authenticated` haben am Ende genau `SELECT`, kein Schreibrecht, Row Level Security ist an. Zusätzlich wurde die Migration in dem Wegwerf-Postgres so geprüft, wie Supabase neue Tabellen jetzt behandelt (keine automatisch vergebenen Rechte): Mit der ganzen Datei hat `anon` genau `SELECT`; fehlt das Ende der Datei, hat `anon` kein Recht und bekommt „permission denied“.
**Ich selbst konnte nichts gegen das echte Supabase-Projekt testen** (kein Zugriff): Das übernimmt Schritt 6 oben.
