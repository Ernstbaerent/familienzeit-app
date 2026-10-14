# Orte aus OpenStreetMap (M10a: Import)

Einmal im Monat lädt eine GitHub Action die OpenStreetMap-Daten je Bundesland bei Geofabrik, filtert daraus familientaugliche Orte
(Spielplätze, Bäder, Zoos, Museen, Burgen …) und legt sie in die Supabase-Tabelle `places`. **Die App liest ab M10b nur von dort**,
in groben Kacheln, nie live bei Overpass oder Geofabrik. In M10a ändert sich an der App nichts.

| Was | Wo |
| --- | --- |
| Tabelle, Zwischentabelle, Austausch je Land (SQL) | `supabase/migrations/0003_places.sql` |
| GitHub Action | `.github/workflows/places-import.yml` |
| Teil „Vorbereiten“ (ohne Schlüssel) | `scripts/places-prepare.ts` (`npm run places:prepare`) |
| Teil „Hochladen“ (mit Schlüssel, ohne npm) | `scripts/places-upload.ts` (`npm run places:upload`) |
| Bausteine (reine Funktionen, mit Tests) | `scripts/lib/places/` |
| Unterarten, Kindertauglichkeit, Kacheln, Prüfung einer Zeile (auch für die App ab M10b) | `src/features/places/` |
| Lizenz (ODbL) und Datenschutz | `docs/supabase.md`, Abschnitte „OpenStreetMap und ODbL“ und „Datenschutz, vor M12“ |
| Machbarkeitstest mit den Zahlen aus Greiz und Reudnitz | `docs/machbarkeit-orte.md` |

---

## So startest du den Import

### Erst einmal einrichten

1. **Migration einspielen:** Supabase-Dashboard → **SQL Editor** → **New query** → `supabase/migrations/0003_places.sql` **ganz** einfügen, **ohne etwas zu markieren** → **Run**.
   Erwartet sind unten genau diese **zwölf Zeilen**:

   | objekt | rolle | rechte |
   | --- | --- | --- |
   | Funktion begin_places_import | service_role | EXECUTE |
   | Funktion publish_places_import | service_role | EXECUTE |
   | RLS places | - | an |
   | RLS places_imports | - | an |
   | RLS places_staging | - | an |
   | Tabelle places | anon | SELECT |
   | Tabelle places | authenticated | SELECT |
   | Tabelle places | service_role | SELECT |
   | Tabelle places_imports | anon | SELECT |
   | Tabelle places_imports | authenticated | SELECT |
   | Tabelle places_imports | service_role | SELECT |
   | Tabelle places_staging | service_role | INSERT |

   Die Datei darf mehrmals laufen; vorhandene Orte bleiben.
2. **Secrets:** Es braucht nur die beiden, die es schon gibt: `SUPABASE_URL` und `SUPABASE_SECRET_KEY` (wie beim Wochenlauf, `docs/wochenlauf.md`).
3. **Wichtig beim ersten Mal:** Sobald die Action im Hauptzweig (`main`) liegt, läuft sie am **3. jedes Monats** echt (Thüringen und Sachsen).
   Ist die Migration noch nicht eingespielt, wird der Lauf rot (nichts geht kaputt). Willst du erst testen: Repo-Variable `PLACES_PAUSED=true` setzen, **bevor** du den Pull Request zusammenführst.

### Pilot: Thüringen und Sachsen

1. GitHub → **Actions** → links **Orte importieren** → rechts **Run workflow**.
2. **Trockenlauf:** `regions` = `TH,SN` (Standard), Häkchen bei `dry_run` lassen (Standard) → **Run workflow**.
   Der Lauf lädt und filtert alles, liest bei Supabase nur den Stand und **schreibt nichts**. Die Seite des Laufs zeigt zwei Berichte:
   „Orte vorbereiten“ (Tabelle je Land: Anzahl, mit Name, mit Ortsteil, Öffnungszeiten, Saison, Doppelte …) und „Trockenlauf, nichts geschrieben“.
3. **Echter Lauf:** noch einmal **Run workflow** mit `TH,SN` und `dry_run` **aus**. Danach im SQL-Editor:
   ```sql
   select region, row_count, imported_at, source_timestamp from public.places_imports order by region;
   select subtype, count(*) from public.places where region = 'TH' group by subtype order by 2 desc;
   ```
4. Stichprobe mit eigenen Augen (z. B. Greiz, Kachel `253_40`):
   ```sql
   select id, name, subtype, locality, hours_kind, months from public.places where tile = '253_40' order by kid_weight desc, name limit 50;
   ```
   Jede Zeile lässt sich auf openstreetmap.org nachsehen: `n123` = `https://www.openstreetmap.org/node/123`, `w…` = `/way/…`, `r…` = `/relation/…`.

### Danach: alle 16 Länder

- **Einmal von Hand:** **Run workflow** mit `regions` = `all` (erst mit `dry_run`, dann ohne).
- **Jeden Monat:** Repo-Variable anlegen (GitHub: **Settings → Secrets and variables → Actions → Tab „Variables“ → New repository variable**):
  `PLACES_REGIONS` = `all`. Ohne diese Variable importiert der Monatslauf nur `TH,SN`.
- **Nur einzelne Länder aktualisieren:** `regions` = z. B. `BY` oder `NW,RP`. Die anderen Länder bleiben, wie sie sind.

Kürzel (ISO 3166-2): BW Baden-Württemberg, BY Bayern, BE Berlin, BB Brandenburg, HB Bremen, HH Hamburg, HE Hessen, MV Mecklenburg-Vorpommern,
NI Niedersachsen, NW Nordrhein-Westfalen, RP Rheinland-Pfalz, SL Saarland, SN Sachsen, ST Sachsen-Anhalt, SH Schleswig-Holstein, TH Thüringen.

### Schalter (Repo-Variablen)

| Variable | Wirkung |
| --- | --- |
| `PLACES_PAUSED` = `true` | Der Monatslauf tut nichts. Manuelle Läufe gehen weiter. |
| `PLACES_REGIONS` | Länder des Monatslaufs: `TH,SN` (ohne Variable), `all` oder eine Liste. |
| `MAX_PLACES` | Obergrenze aller Orte zusammen, Standard 600 000 (siehe „Grenzen“). |

---

## Ablauf

```
Geofabrik (je Land eine .osm.pbf)
   │  Teil 1 „Vorbereiten“ (ohne Schlüssel; npm ci, apt osmium-tool)
   ▼
osmium tags-filter ─▶ osmium export (GeoJSON) ─▶ Node: zuordnen, Doppelte, Ortsteil, Öffnungszeiten, Saison ─▶ places-XX.json.gz
   │  (Datei an Teil 2 weitergereicht, 3 Tage aufbewahrt)
   ▼  Teil 2 „Hochladen“ (mit Schlüssel; kein npm, keine Pakete)
Zwischentabelle places_staging (Pakete à 1000) ─▶ publish_places_import: Land austauschen, alles oder nichts
```

**Je Bundesland, eins nach dem anderen:**

1. **Umriss** (`<land>.poly`) und **Auszug** (`<land>-latest.osm.pbf`) bei Geofabrik laden, mit Prüfsumme (`.md5`). Die große Datei wird nach dem Filtern sofort gelöscht.
2. **osmium tags-filter** auf die Merkmale unserer Kategorien (Liste in `scripts/lib/places/osmium.ts`). Seen getrennt: alle Gewässer, davon nur die mit Namen, dann zusammengeführt
   (sonst wären es Hunderttausende namenlose Teiche).
3. **osmium export** als GeoJSON, eine Zeile je Objekt, geschlossene Linien nur als Fläche, nur die Merkmale, die wir lesen.
4. **Zuordnen** (`classify.ts`): Unterart, drinnen/draußen, Ausschlüsse. Nicht öffentlich (`access=private/no/customers/members`), stillgelegt (`disused`/`abandoned`) fallen weg.
   Bei Becken, Aussichtspunkten, Burgen, Ruinen, Naturschutzgebieten, Seen, Rastplätzen und allgemeinen „Sehenswürdigkeiten“ ist ein Name Pflicht. Spielplätze und Parks auch ohne Namen.
   **Nicht dabei:** Escape Games (Buchung nötig, eher ab 12), Wanderwege (eine Route hat keinen einzelnen Ort; kommt später). **Kinos ja** (ab M10b mit Hinweis „Programm und Altersfreigabe vorher prüfen“).
5. **Lage:** Punkt, bei Flächen der Schwerpunkt (bei mehreren Teilen der größte). Liegt der Punkt **außerhalb des Landesumrisses**, gehört er zum Nachbarland und fällt hier weg.
   Brandenburg lässt alles im Umriss von Berlin weg, Niedersachsen alles in Bremen (Geofabrik liefert Niedersachsen mit Bremen; bei Brandenburg/Berlin schadet die Regel nicht, falls die Dateien getrennt sind).
6. **Doppelte** (`dedupe.ts`): gleicher Name in derselben Kategorie näher als 150 m, ohne Namen gleiche Unterart näher als 40 m (wie im Machbarkeitstest). Es bleibt die Fläche, fehlende Angaben werden übernommen.
7. **Öffnungszeiten** (siehe unten), **Saison**, **Ortsteil** (siehe unten), **Kindertauglichkeit** (`src/features/places/placeKinds.ts`).
8. **Prüfen** jeder Zeile (`checkPlaceRow`), Datei schreiben.

**Hochladen je Land:** Stand lesen → Qualitätsbremse und Obergrenze vorab prüfen → `begin_places_import` (Reste in der Zwischentabelle löschen) → Zeilen in Paketen à 1000 →
`publish_places_import` tauscht das Land in **einer** Transaktion aus. Scheitert ein Land (Download, osmium, Qualitätsbremse, Datenbank), **behält es seinen bisherigen Stand**,
die anderen Länder laufen weiter, und der Lauf endet am Schluss **rot** (GitHub schickt eine E-Mail).

### Was in der Tabelle steht

| Spalte | Inhalt |
| --- | --- |
| `region`, `id` | Bundesland und OSM-Typ mit Nummer (`n` Punkt, `w` Linie/Fläche, `r` Relation). Zusammen der Schlüssel: Ein Ort am Rand kann in zwei Ländern stehen (die App fasst ab M10b nach `id` zusammen). |
| `name` | freiwillig (bei Spielplätzen meist leer) |
| `category`, `subtype` | z. B. `pool` / `outdoorPool`, Liste in `placeKinds.ts` |
| `lat`, `lon`, `tile` | Lage (6 Nachkommastellen) und Kachel (siehe unten) |
| `setting` | `indoor`, `outdoor`, `both` |
| `months` | Saison (1–12), leer = ganzes Jahr |
| `opening_hours`, `hours_kind`, `hours_plan` | Rohtext aus OSM, Art (`plan`, `complex`, `invalid`) und vereinfachter Wochenplan |
| `website` | nur `http(s)://` |
| `locality`, `street` | Ortsteil oder Ort; Straße nur, wenn der Ort selbst `addr:street` hat |
| `kid_weight` | Kindertauglichkeit 0 bis 3 |

`places_imports` hält je Land: Kennung des Laufs, Zeitpunkt, Anzahl, Stand der OSM-Daten und die Geofabrik-Datei.

### Kindertauglichkeit (Startwerte, von Clemens festgelegt)

| Wert | Unterarten |
| --- | --- |
| 3 | Spielplatz, Indoorspielplatz, Trampolinhalle, Bäder (alle), Freizeitpark, Minigolf, Zoo/Tierpark, Aquarium |
| 2 | Park mit Namen, Badestelle, Museum, Burg/Schloss, Aussichtsturm, Kletterhalle, Eisbahn, Bibliothek |
| 1 | Park ohne Namen, Ruine, Aussichtspunkt, Naturschutzgebiet, See/Talsperre, Bowling, **Kino (neutral)** |
| 0 | allgemeine „Sehenswürdigkeit“, Teich, Rastplatz |

Ändern: nur in `src/features/places/placeKinds.ts`. Die Werte landen beim Import in `kid_weight`, eine Änderung wirkt also mit dem nächsten Import. Wie viele Punkte das in der Vorschlagslogik gibt, legt M10b fest.

### Ortsteil für namenlose Orte

Damit „Spielplatz“ beschreibbar wird („Spielplatz in Pohlitz“): erst `addr:suburb` am Ort selbst, sonst der **nächste OSM-Punkt** mit `place=…` und Namen,
dessen Umkreis passt (Nachbarschaft 1 km, Weiler 1,5 km, Stadtviertel 2,5 km, Stadtteil und Dorf 3 km, Kleinstadt 5 km, Stadt 8 km), sonst `addr:city`. Kein zusätzlicher Dienst, keine Straßen-Geometrie.

### Bäder: drinnen oder draußen

Erst die Merkmale (`indoor`, `covered`, `location`, `building`), dann der Name („Hallenbad“, „Schwimmhalle“, „Erlebnisbad“, „Therme“ … = drinnen; „Freibad“, „Waldbad“, „Naturbad“, „Strandbad“ … = draußen;
„Kombibad“ oder beides = `both`). Sonst: Sportzentrum mit Schwimmen = drinnen, Becken und Freizeitbad = draußen. Wie oft geraten wurde, steht im Bericht („Bad geraten“).
Saison: Monate aus `opening_hours`, sonst `seasonal`, sonst bei Bädern und Badestellen draußen **Mai bis September**.

---

## Öffnungszeiten (Mischweg A + C)

**Die Bibliothek `opening_hours` (Version 3.15.0, Lizenz LGPL-3.0) läuft nur im Import, im Teil „Vorbereiten“ der GitHub Action, und wird nie mit der App ausgeliefert.**
Sie steht deshalb nur unter `devDependencies`, und ein Test (`scripts/lib/places/isolation.test.ts`) schlägt fehl, sobald eine Datei in `app/` oder `src/` sie lädt.
Sie wandelt jede Regel in einen einfachen Wochenplan um; die App prüft ab M10b nur noch diesen Plan mit eigenem kleinem Code (Möglichkeit C aus dem Plan).

Je Regel (`scripts/lib/places/hours.ts`), mit den Feiertagen des jeweiligen Bundeslandes und in Berliner Zeit:

1. Lesen. Unlesbar → `invalid`.
2. Offene Zeiten für 52 Wochen ab der Importwoche berechnen.
3. **Saison** = Monate mit offenen Zeiten (wenn nicht alle 12), z. B. `May-Sep: …` → Mai bis September.
4. Wochen vergleichen, die ganz in der Saison liegen und **keinen Feiertag** haben. Alle gleich → `plan` (`hours_plan`). Sonst `complex`.
5. Immer `complex`: „unbekannt“ (z. B. `"nach Vereinbarung"`), Zeiten nach der Sonne (`sunrise`, `sunset`; die Bibliothek rechnet sie ohne Sonnendaten mit festen 6 und 18 Uhr),
   Ferien (`SH`), wechselnde Zeiten je Saison.
6. Nie offen und nichts unbekannt (z. B. `off`) → **dauerhaft geschlossen**, der Ort wird nicht importiert.

`hours_plan` sieht so aus (Minuten ab Mitternacht, Montag zuerst, Ende ausschließlich; `ph: true`, wenn die Regel Feiertage nennt):

```json
{ "days": [[], [[600, 1020]], [[600, 1020]], [[600, 1020]], [[600, 1020]], [[600, 1020]], [[600, 1020]]], "ph": true }
```

Bei `complex`, `invalid` und ohne Öffnungszeiten zeigt die App ab M10b „Öffnungszeiten vorher prüfen“ und schließt **nie** aus (Erkenntnis 1 aus M2a).

---

## Kacheln

Raster 0,2° Breite × 0,3° Länge, in Deutschland etwa 22 km hoch und 19 bis 23 km breit (`src/features/places/placeTiles.ts`), Schlüssel z. B. `253_40` (Greiz).
Gerechnet in ganzen Zehnmillionstel Grad, damit keine Rundungsfehler an Kachelgrenzen entstehen.

- **Grob genug für den Datenschutz:** Ab M10b fragt die App nur nach ganzen Kacheln. Supabase erfährt damit höchstens die Gegend (etwa ±10 bis 20 km), etwa 20-mal gröber als die 1-km-Rundung beim Wetter.
- **Wenige Anfragen:** Ein Umkreis von 30 km braucht höchstens 4 × 4 Kacheln, meist 9. Pro Kachel etwa 400 bis 1000 Orte (Großstadt mehr).
- **Index** `places_tile_idx` macht die Abfrage nach Kacheln schnell.

---

## Grenzen (und warum)

| Grenze | Wert | Begründung |
| --- | --- | --- |
| Größe einer Geofabrik-Datei | 1,5 GB | Größte Länder (Okt. 2026): NRW ca. 871 MB, Bayern ca. 805–830 MB, Baden-Württemberg ca. 611 MB. 1,5 GB lässt gut 70 % Luft für Wachstum und fängt eine falsche Adresse (z. B. ganz Europa, 29 GB) ab. |
| Download pro Lauf | 8 GB | Alle 16 Länder zusammen heute ca. 4,9 GB. |
| Plattenplatz | – | Der Runner hat etwa 14 GB. Es liegt immer nur ein Land gleichzeitig auf der Platte (höchstens ca. 1 GB plus gefilterte Dateien), dazu `node_modules` (ca. 1 GB). |
| Orte pro Land | 150 000 | Schätzung NRW 60 000 bis 90 000. Mehr deutet auf einen Fehler im Filter hin. |
| `MAX_PLACES` (alle zusammen) | 600 000 | Schätzung Deutschland 300 000 bis 500 000, plus 20 % Luft. |
| Qualitätsbremse | 70 % je Land | Hat ein Land weniger als 70 % seiner bisherigen Orte, bleibt der alte Stand (Skript **und** Datenbank-Funktion prüfen das). |
| Zeit | 90 Min. „Vorbereiten“, 45 Min. „Hochladen“, 20 Min. je Download und je osmium-Aufruf, 60 s je Supabase-Anfrage, 120 s für den Austausch eines Landes | siehe „Dauer“ |
| Pakete | 1000 Zeilen (ca. 300 KB) je Anfrage, höchstens 200 Pakete je Land | |
| Wiederholungen | keine | Jeder Fehler beendet das Land, nicht den Lauf. Ein neuer Lauf darf jederzeit gestartet werden. |

### Dauer

Geschätzt, nicht gemessen (Geofabrik ist aus der Cloud-Umgebung von Claude Code nicht erreichbar):
Download der 4,9 GB bei üblichen 20 bis 100 MB/s etwa 1 bis 4 Minuten, `osmium tags-filter` liest etwa 50 bis 100 MB/s (also 1 bis 2 Minuten für alle zweimal),
Ausgabe und Umwandlung in Node einige Minuten. **Zusammen 15 bis 30 Minuten für alle 16 Länder**, Thüringen und Sachsen in 2 bis 5 Minuten. „Hochladen“ für ganz Deutschland
etwa 400 Pakete, geschätzt 5 bis 10 Minuten. Die Dauer je Land steht im Bericht.

**Falls ein Lauf für alle Länder an die 90 Minuten kommt:** auf eine **Matrix je Bundesland** umbauen (`strategy.matrix.region` mit `max-parallel: 2`, damit Geofabrik nicht 16 Downloads gleichzeitig bekommt).
Jedes Land wird ein eigener Job mit eigener Datei, „Hochladen“ wartet auf alle und lädt die vorhandenen hoch. Das ist in den Skripten schon angelegt (je Land eine Datei, ein Land scheitert allein),
nur die Action müsste die Liste der Länder als Matrix verteilen. Erst umbauen, wenn die gemessene Dauer es nötig macht.

---

## Geofabrik: Bedingungen und Abruf-Regeln

Gelesen am 14.10.2026 auf geofabrik.de („Downloads“) und im Blog von Geofabrik:

- Die Auszüge sind **kostenlos**, meist täglich aktuell. Für Deutschland gibt es jedes Bundesland als eigene Datei.
- **Lizenz:** Alle OpenStreetMap-Daten dort stehen unter der **Open Database License 1.0**. Man darf sie für jeden Zweck nutzen, muss OpenStreetMap als Quelle nennen, und **abgeleitete Datenbanken behalten dieselbe Lizenz** (Prüfliste: `docs/supabase.md`).
- Die öffentlichen Dateien enthalten **keine Benutzernamen, Benutzer-IDs und Changeset-IDs** der Mitwirkenden.
- **Keine festen Mengengrenzen**, aber Geofabrik sperrt IP-Adressen, die mehrere Terabyte im Monat laden oder dieselbe große Datei hundertfach laden, und bittet, Skripte zu überwachen.
- Seit September 2025 leiten „latest“-Dateien auf die Datei mit Datum weiter.

**Unsere Regeln:** einmal im Monat (plus Läufe von Hand), jede Datei höchstens einmal pro Lauf, eigener User-Agent (`miki-places-import/1.0 …`), Prüfsumme, nur `download.geofabrik.de`
(auch nach der Weiterleitung), höchstens 1,5 GB je Datei und 8 GB je Lauf, keine automatischen Wiederholungen. Das sind ca. 5 GB im Monat, weit weg von allem, was Geofabrik stört.

**Alternativen** (falls Geofabrik einmal ausfällt): ein Spiegelserver mit denselben Dateien (z. B. TU Darmstadt, GWDG) oder planet.openstreetmap.org (ganze Welt, ca. 80 GB, zu groß).
Overpass aus der Action wäre langsam und schwankend (M2a). Für einen Wechsel nur `geofabrikBase` und `geofabrikHost` in `scripts/lib/places/regions.ts` ändern.

---

## Größe und Kosten

| | Orte (geschätzt) | Datenbank (ca. 250 Byte je Zeile mit Index) |
| --- | --- | --- |
| Thüringen + Sachsen | 28 000 – 40 000 | 7 – 10 MB |
| Deutschland | 300 000 – 500 000 | 75 – 125 MB, beim Austausch eines Landes kurz mehr |

Kostenloser Tarif bei Supabase (Preisseite, gelesen am 14.10.2026): **500 MB Datenbank** (darüber nur noch lesen), **5 GB Egress** plus 5 GB zwischengespeicherter Egress im Monat,
Pause nach einer Woche ohne Aktivität. Ein neues Projekt belegt schon 40 bis 60 MB. Für ganz Deutschland reicht der Platz, auch mit den Aktivitäten.
Pro (25 $ im Monat, etwa 23 €) ist eine **Entscheidung vor M12** (CLAUDE.md, Punkt 7). Der übertragene Datenverkehr der **Aktivitäten** wird früher eng als die Orte, deshalb M8b (CLAUDE.md, Roadmap).

Nach dem ersten Import für alle Länder die echte Größe ansehen:

```sql
select pg_size_pretty(pg_total_relation_size('public.places')) as orte,
       pg_size_pretty(pg_total_relation_size('public.places_staging')) as zwischentabelle,
       pg_size_pretty(pg_database_size(current_database())) as datenbank;
```

---

## Wenn etwas schiefgeht

Bei jedem roten Lauf gilt: **Länder, die gescheitert sind, haben ihren bisherigen Stand behalten.** Der Grund steht oben auf der Seite des Laufs.

| Meldung | Bedeutung | Was tun |
| --- | --- | --- |
| `HTTP 404` beim Stand lesen, `PGRST…`, „permission denied“ | Migration 0003 fehlt oder lief nur halb. | Migration ganz ausführen, Kontrollzeilen vergleichen. |
| `Geofabrik-Datei: HTTP 503` / Zeitüberschreitung | Geofabrik gerade nicht erreichbar. | Später erneut starten (nur dieses Land: `regions` = Kürzel). |
| „Prüfsumme stimmt nicht“ | Datei unvollständig oder Geofabrik hat sie gerade erneuert. | Erneut starten. |
| „Datei ist … MB groß, erlaubt sind 1536 MB“ | Datei größer als die Grenze. | Prüfen, ob die Adresse stimmt; sonst `maxDownloadBytes` in `limits.ts` bewusst anheben. |
| **Qualitätsbremse** | Neues Land hat weniger als 70 % der bisherigen Orte. | Bericht ansehen (Filter kaputt? Geofabrik-Datei unvollständig?). Ist der Rückgang echt, das Land im SQL-Editor leeren (`delete from public.places where region = 'TH';`) und neu importieren. |
| **Obergrenze MAX_PLACES** | Alle Orte zusammen wären mehr als `MAX_PLACES`. | Bericht prüfen; die Variable `MAX_PLACES` nur bewusst anheben (Größe oben). |
| „keine Orte gefunden“ / „ungültige Zeilen“ | Fehler im Filter oder im Import. | Bericht und Protokoll ansehen, mir Bescheid geben. |
| `osmium …: Exit-Code` | osmium konnte die Datei nicht lesen. | Erneut starten; bleibt es, Protokoll ansehen. |
| Kein Lauf am 3. | Pausiert? Oder GitHub schaltet geplante Läufe in öffentlichen Repos nach 60 Tagen ohne Änderung ab. | `PLACES_PAUSED` prüfen, unter Actions „Enable workflow“. |

**Schlüssel:** „Hochladen“ läuft ohne npm und lädt nur eigene Dateien (Test `isolation.test.ts`), alle Ausgaben laufen durch denselben Filter wie beim Wochenlauf (`redact.ts`).
„Vorbereiten“ bekommt gar keinen Schlüssel. Der geheime Schlüssel darf in `places` nichts direkt löschen oder ändern, nur über die beiden Funktionen.

---

## Lokal ausprobieren (freiwillig)

Auf dem Chromebook (Node 22, `sudo apt-get install osmium-tool`, im Projektordner), ohne Schlüssel:

```bash
PLACES_REGIONS=TH npm run places:prepare      # lädt Thüringen (ca. 150 MB), Ergebnis in places-out/
```

`places-out/` und `places-work/` stehen in der `.gitignore` (Daten unter ODbL, nicht ins Repo).
Hochladen von Hand ginge mit `npm run places:upload -- --dry-run` und den beiden Supabase-Werten als Umgebungsvariablen, ist aber nicht nötig: Das macht die Action.

---

## Die nächsten Schritte (nicht gebaut)

- **M10b Vorschläge:** Die App lädt die Kacheln rund um den (gerundeten) Standort, speichert sie mit Version auf dem Gerät (bis 30 Tage frisch, ohne Netz bis 90 Tage nutzbar mit dezentem Hinweis),
  und die Vorschlagslogik mischt höchstens zwei Orte unter die drei Karten. Regeln und Zahlen stehen in der Roadmap der CLAUDE.md (M10b).
- **M10c Detailansicht** mit „Route öffnen“ (Karten-App des Handys) und Quellenangabe.
- **M10e Orte im Verlauf** nach M10c.
- **M10d Kartenansicht „In der Nähe“** (frühestens nach M12). Vorschlag: MapLibre (`@maplibre/maplibre-react-native`) mit **eigenen Vektorkacheln**: eine PMTiles-Datei
  mit den Kartendaten für Deutschland (aus OpenStreetMap erzeugt, z. B. mit dem Werkzeug Planetiler oder als fertiger Auszug von Protomaps), abgelegt in unserem Supabase Storage.
  So gehen keine IP-Adressen an Google oder Apple, und der warme Kartenstil aus der DESIGN.md lässt sich selbst festlegen. Dafür braucht die App einen eigenen Entwicklungs-Build
  (Expo Go reicht dann nicht mehr), ein neues Paket und Speicherplatz (eine PMTiles-Datei für Deutschland ist mehrere hundert MB bis wenige GB groß; das passt nicht in den kostenlosen Tarif von 1 GB Storage).
  Quellenangabe in einer Ecke der Karte. Vorher mit Clemens klären, ob eine Karte zum Prinzip „Handy weg“ passt.

---

## Tests

```bash
npm test     # u. a. scripts/lib/places/*.test.ts und src/features/places/places.test.ts, ohne Netz und ohne Schlüssel
```

Geprüft werden: Zuordnung jeder Unterart und jeder Ausschluss, Bäder drinnen/draußen, Umrisse (auch mit Loch), Schwerpunkte, Doppelte (auch über Zellgrenzen und unabhängig von der Reihenfolge),
Öffnungszeiten (Wochenplan, Feiertage, Saison, über Mitternacht, Zeitumstellung, `off`, Ferien, Sonne, unlesbar), Saison, Website, die ganze Umwandlung mit Testdaten,
Download (Weiterleitung, Prüfsumme, Größe, fremder Server), „Vorbereiten“ als Ganzes (ein Land scheitert allein, Arbeitsdateien werden gelöscht),
„Hochladen“ (Trockenlauf schreibt nichts, Pakete, Qualitätsbremse und Obergrenze je Land, kein Schlüssel in Ausgaben), die Rechte der Migration und die beiden Isolationsregeln.

**Testdaten:** `scripts/lib/places/fixtures/sample.osm` ist von Hand geschrieben (keine echten OSM-Daten, Namen und Lagen nur angelehnt an Greiz).
`sample.geojsonseq` ist die Ausgabe von osmium dafür; ist osmium installiert, prüft ein Test, dass die Befehle aus `osmium.ts` genau diese Ausgabe erzeugen.

Zusätzlich einmal von Hand geprüft, nicht Teil des Projekts:

- Migration 0001 bis 0003 (0003 zweimal) in einem lokalen Wegwerf-Postgres (PGlite) mit den Rollen von Supabase: Kontrollabfrage liefert die zwölf Zeilen; Austausch klappt;
  Qualitätsbremse greift bei 60 % und lässt 70 % durch; falsche Anzahl und Obergrenze werden abgelehnt; eine kaputte Zeile lässt den Austausch scheitern und das Land bleibt unverändert;
  `anon` liest `places` und `places_imports`, sieht die Zwischentabelle nicht und darf weder schreiben noch die Funktionen aufrufen; `service_role` darf in `places` weder löschen noch ändern.
- Der ganze Weg mit echtem osmium: Testdaten als Geofabrik-Datei nachgestellt (Weiterleitung, Prüfsumme, Umriss), „Vorbereiten“ für Thüringen und Sachsen (Sachsen mit Fehler 404),
  dann „Hochladen“ gegen eine nachgestellte Daten-Schnittstelle auf PGlite: Thüringen übernommen, Sachsen behält seinen Stand, Lauf rot.

**Nicht getestet** (kein Zugang aus der Cloud-Umgebung: `download.geofabrik.de` bricht die Verbindung ab, das echte Supabase-Projekt ist nicht erreichbar):
ein Lauf mit echten Geofabrik-Dateien und gegen das echte Supabase-Projekt. Das ist der Pilot oben (Trockenlauf, dann echter Lauf für Thüringen und Sachsen).
