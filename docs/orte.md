# Orte aus OpenStreetMap (M10a: Import, M10b: in der App, M10c: Ortsseite)

Einmal im Monat lädt eine GitHub Action die OpenStreetMap-Daten je Bundesland bei Geofabrik, filtert daraus familientaugliche Orte
(Spielplätze, Bäder, Zoos, Museen, Burgen …) und legt sie in die Supabase-Tabelle `places`. **Die App liest ab M10b nur von dort**,
in groben Kacheln, nie live bei Overpass oder Geofabrik. Wie die App die Orte holt und speichert, steht unten in „Orte in der App (M10b)“,
die Regeln der Vorschläge (Ausschlüsse, Gewichtung, Umkreis, Mischung) in `docs/suggestions.md`, „Orte in den Vorschlägen (M10b)“.

| Was | Wo |
| --- | --- |
| Tabelle, Zwischentabelle, Austausch je Land (SQL) | `supabase/migrations/0003_places.sql` |
| GitHub Action | `.github/workflows/places-import.yml` |
| Teil „Vorbereiten“ (ohne Schlüssel) | `scripts/places-prepare.ts` (`npm run places:prepare`) |
| Teil „Hochladen“ (mit Schlüssel, ohne npm) | `scripts/places-upload.ts` (`npm run places:upload`) |
| Bausteine (reine Funktionen, mit Tests) | `scripts/lib/places/` |
| Unterarten, Kindertauglichkeit, Kacheln, Prüfung einer Zeile (auch für die App ab M10b) | `src/features/places/` |
| Abruf, Zwischenspeicher und Provider der App (M10b) | `src/features/places/fetchPlaces.ts`, `placesCache.ts`, `placesStorage.ts`, `placesRefresh.ts`, `PlacesContext.tsx` |
| Ortsseite mit „Route öffnen“, Website und Öffnungszeiten (M10c) | `app/place/[id].tsx`, `src/features/places/PlaceDetails.tsx`, `PlaceHours.tsx`, `PlaceWebsiteLink.tsx`, Regeln in `routeLinks.ts`, `website.ts`, `hoursDisplay.ts` |
| Ausgedachte Testorte in echter Zeilenform | `scripts/fixtures/` |
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
- **Wenige Anfragen:** Ein Umkreis von 30 km braucht meist 12 bis 16 Kacheln, ganz im Norden bis 20 (dort ist eine Kachel schmaler), alle in einer Anfrage. Pro Kachel meist einige hundert Orte, in Großstädten mehrere tausend (dichteste: Berlin-Mitte mit 5 149).
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

## Orte in der App (M10b)

### Ablauf

```
Start (nur mit schon erteilter Erlaubnis) oder „Eure Ideen“
  → Standort (sofort auf 2 Nachkommastellen gerundet, wie beim Wetter) → außerhalb Deutschlands? dann keine Orte
  → Kacheln im Umkreis von 30 km (meist 12 bis 16, im Norden bis 20), die eigene zuerst, dann nach Entfernung
  → gespeicherte Kacheln lesen → nur die fehlenden oder alten bei Supabase holen → speichern → nach `id` zusammenfassen
```

- **Nur ganze Kacheln:** `GET /rest/v1/places?select=<alle Spalten>&tile=in.(253_40,253_41,…)&order=tile.asc,region.asc,id.asc&limit=1000&offset=…` mit dem öffentlichen Schlüssel
  (derselbe Zugang und derselbe Schutz vor geheimen Schlüsseln wie bei den Aktivitäten, `supabaseConfig.ts`). Der Standort geht **nie** an Supabase, nur die Kachel-Schlüssel (ein Test prüft die Adresse).
- **Seiten zu 1000 Zeilen**, höchstens 40 Seiten (Schutz vor einer Schleife). **Zeitlimit 10 Sekunden** für den ganzen Abruf.
- **Import-Kennung:** Vor und nach den Seiten liest die App `places_imports` (Bundesland und Kennung, 16 kleine Zeilen). Ändert sie sich dazwischen (ein Import lief genau während des Abrufs),
  wird der ganze Abruf verworfen, und der alte Stand bleibt. Jede gespeicherte Kachel merkt sich die Kennung ihrer Bundesländer. Nachbar-Kacheln werden nicht mitgeholt (einfache Variante, Entscheidung von Clemens).
  **`anon` darf `places_imports` lesen:** Das steht schon in `0003_places.sql` (`grant select on table public.places_imports to anon, authenticated, service_role` und die Regel `places_imports_lesen_fuer_alle`),
  eine Migration 0004 ist nicht nötig.
- **Prüfung:** Jede Zeile läuft durch `checkPlaceRow` (dieselbe Prüfung wie im Import). Kaputte Zeilen und Zeilen aus nicht angefragten Kacheln fallen weg, die Anzahl steht in der Konsole.
- **Doppelte:** Ein Ort am Rand zweier Bundesländer steht zweimal in der Tabelle (gleiche `id`); die App nimmt ihn einmal.
- **Vorladen:** Der Start lädt die Orte vor, aber nur, wenn die Standort-Erlaubnis schon da ist (wie das Wetter, DESIGN.md Entscheidung 7). Er fragt nie nach der Erlaubnis.
  Frische Kacheln kosten dabei keinen Abruf, nur einen Blick in den Speicher.
- **Auf „Eure Ideen“** wartet die App gleichzeitig mit dem Wetter höchstens 4 Sekunden, danach nur Aktivitäten (Details: `docs/suggestions.md`).

### Zwischenspeicher auf dem Gerät

| Regel | Wert |
| --- | --- |
| Eintrag je Kachel | `places.v1.tile.<key>` mit `{ version: 1, fetchedAt, importIds, rows }`; dazu das Verzeichnis `places.v1.index` (Größe und letzte Nutzung je Kachel) |
| Neu holen | Kacheln mit Orten nach 30 Tagen, leere nach 7 Tagen; liegt die Abrufzeit in der Zukunft (Uhr verstellt), sofort |
| Ohne Netz | gespeicherte Kacheln bis 90 Tage weiter nutzen, ab Tag 31 mit dem Hinweis „Stand: vor n Tagen“ in der Quellenzeile; nach 90 Tagen werden sie gelöscht |
| Höchstens | 25 Kacheln **und** 2 MB für alle Kacheln zusammen (Entscheidung von Clemens) |
| Herauswerfen | zuerst Kacheln, die gerade nicht gebraucht werden (die am längsten ungenutzte zuerst), dann die gebrauchten von der entferntesten an. Herausgeworfene gelten bis zum Schließen der App trotzdem, nur nicht offline. |
| Kompakte Form | kurze Feldnamen, keine leeren Felder, `category` und `tile` werden beim Lesen berechnet: etwa **160 Byte je Ort** statt etwa 335 Byte in der Antwort von Supabase |

Gelesenes wird wie neue Daten geprüft (andere Version oder kaputter Eintrag zählt als „nicht gespeichert“). Schlägt das Speichern fehl (Speicher voll), gelten die Orte bis zum Schließen der App; es gibt nur eine Warnung in der Konsole.

### Speicher-Budget auf Android (6 MB)

AsyncStorage erlaubt auf Android insgesamt etwa **6 MB** (`AsyncStorage_db_size_in_MB`), ein einzelner Eintrag darf höchstens etwa **2 MB** groß sein (CursorWindow, Details: `docs/wochenlauf.md`, „Wachstum“).
Gemessen bzw. aus den Grenzen gerechnet:

| Eintrag | heute (104 Aktivitäten) | bei 1 500 Aktivitäten |
| --- | --- | --- |
| Aktivitäten (`activities.v1`, etwa 1,9 KB je Aktivität) | 0,2 MB | 2,8 MB |
| Kinderprofile (`profiles.v1`) | unter 0,01 MB | unter 0,01 MB |
| Verlauf (`history.v1`, höchstens 500 Einträge à etwa 150 Byte) | bis 0,08 MB | bis 0,08 MB |
| Wetter (`weather.v1`, Vorhersage für einen Ort) | etwa 0,02 MB | etwa 0,02 MB |
| Auswahl, Standort-Entscheidung | unter 0,01 MB | unter 0,01 MB |
| **Orte** (alle Kacheln, Obergrenze) | **bis 2,0 MB** | **bis 2,0 MB** |
| **Zusammen** | **bis etwa 2,3 MB** | **bis etwa 4,9 MB** |

- **Heute passt es mit viel Luft** (etwa 2,3 von 6 MB).
- **Bei 1 500 Aktivitäten passt es knapp** (etwa 4,9 von 6 MB, gut 1 MB Luft). Ob SQLite beim Überschreiben des Aktivitäten-Eintrags kurz Platz für alten und neuen Inhalt braucht, ist nicht gemessen
  (`docs/wochenlauf.md` nimmt es an); dann wären es kurz bis zu etwa 7,7 MB, und das Speichern der Aktivitäten würde scheitern (die App läuft weiter, nur ohne neuen Zwischenspeicher).
  Unabhängig davon ist der Aktivitäten-Eintrag ab etwa 1 000 Aktivitäten **allein** größer als 2 MB und auf Android nicht mehr lesbar. Beides löst das Aufteilen des Aktivitäten-Speichers
  (CLAUDE.md, „Später“, bei 800 Aktivitäten). **Empfehlung:** Das Aufteilen spätestens bei 800 Aktivitäten bauen; die Orte bleiben mit ihrer eigenen Obergrenze von 2 MB getrennt davon sicher.
- Die dichteste Kachel (`262_44`, Berlin-Mitte, 5 149 Orte, deine Abfrage) braucht kompakt etwa **0,8 MB** und passt allein gut unter die 2 MB je Eintrag.
  2 MB reichen für etwa 13 000 Orte: In Berlin oder im Ruhrgebiet werden deshalb nicht alle Kacheln des 30-km-Umkreises gespeichert, sondern die nächsten. Die fernen gelten bis zum Schließen der App
  und werden beim nächsten Öffnen (frühestens nach 30 Tagen bzw. wenn sie fehlen) neu geholt.

### Datenverkehr pro Gerät und Monat

Rechnung: Ein Gerät holt seine Kacheln höchstens einmal in 30 Tagen (leere Kacheln alle 7 Tage, die sind winzig), dazu zweimal `places_imports` (je etwa 1 KB).
Bleibt die Familie in ihrer Gegend, ist das **ein voller Abruf des 30-km-Umkreises pro Monat**. Eine Zeile in der Antwort von Supabase hat etwa 335 Byte (gemessen an den Testdaten).

Gepackt (gzip): React Native fragt von sich aus gepackte Antworten an, und PostgREST packt sie. Mit 5 000 ausgedachten Zeilen ergab sich Faktor 14, das ist zu günstig (die Testdaten wiederholen sich).
Echte Namen und Koordinaten packen schlechter; ich rechne vorsichtig mit **Faktor 6**.

| Gegend (30-km-Umkreis) | Orte (geschätzt) | ungepackt | gepackt (÷ 6) | Geräte im Monat bis 5 GB, gepackt | … ungepackt |
| --- | --- | --- | --- | --- | --- |
| Berlin-Mitte (12 Kacheln, darunter 5 149 und 2 289) | etwa 15 000 | etwa 5,0 MB | etwa 0,8 MB | etwa 6 000 | etwa 1 000 |
| Ruhrgebiet (Essen, 16 Kacheln, darunter 2 543, sonst meist 1 000 bis 2 500) | etwa 25 000 | etwa 8,4 MB | etwa 1,4 MB | etwa 3 600 | etwa 600 |
| ländlich (Greiz, 16 Kacheln à 150 bis 400) | etwa 4 000 | etwa 1,3 MB | etwa 0,22 MB | etwa 23 000 | etwa 3 800 |

- **Folge für die 5 GB des kostenlosen Tarifs:** Die Orte allein vertragen einige tausend aktive Geräte im Monat (gemischt aus Stadt und Land). Wie Supabase den Datenverkehr zählt
  (gepackt oder ungepackt), ist nicht dokumentiert, soweit ich es gefunden habe: **bitte nach dem Pilot in der Nutzungsübersicht des Dashboards nachsehen** („Usage“ → „Egress“).
- **Die Aktivitäten verbrauchen mehr als die Orte:** Jedes Gerät holt sie heute täglich ganz, etwa 65 KB gepackt, also etwa 2 MB im Monat, bei 1 500 Aktivitäten etwa 27 MB im Monat
  (`docs/wochenlauf.md`, „Wachstum“). Das ist der Grund für M8b (Aktivitäten als Änderungen laden). Die Orte holen sich dagegen schon jetzt nur, was fehlt oder alt ist.
- Die Zahlen der Orte im Umkreis sind geschätzt. Nachzählen für einen Ort (Kacheln aus `tilesAround`, z. B. Berlin-Mitte):
  `select count(*) from public.places where tile in ('261_43','261_44','261_45','261_46','262_43','262_44','262_45','262_46','263_43','263_44','263_45','263_46');`

### Fehlerfälle

Alle still: keine Meldung in der App, nur eine Warnung in der Konsole (ohne Schlüssel, ohne Adresse, ohne Standort). Eltern bekommen weiter ihre drei Vorschläge.

| Fall | Folge |
| --- | --- |
| Supabase nicht eingerichtet, geheimer Schlüssel in der `.env` (abgelehnt) | kein Abruf; gespeicherte Kacheln oder nur Aktivitäten |
| keine Erlaubnis, Ortung aus, kein Empfang | keine Orte, kein Abruf |
| außerhalb Deutschlands | kein Abruf, nur Aktivitäten |
| Netzfehler, HTTP 401 (Schlüssel), 404 (Migration fehlt), 5xx, pausiertes Projekt, Zeitüberschreitung nach 10 s | gespeicherte Kacheln bis 90 Tage, sonst nur Aktivitäten; ein Fehlschlag wird beim nächsten Öffnen erneut versucht |
| Antwort kein JSON, keine Liste, mehr als 40 Seiten | wie oben, nichts wird gespeichert |
| Import lief während des Abrufs | wie oben |
| einzelne kaputte Zeilen, Zeilen aus fremden Kacheln | verworfen, die anderen bleiben |
| Speicher kaputt oder andere Version | zählt als nicht gespeichert |
| Speicher voll, Kachel zu groß | Orte gelten bis zum Schließen der App |

### Testdaten

`scripts/fixtures/` enthält **ausgedachte** Orte in der Form der Antwort von Supabase (keine OSM-Daten): 33 Zeilen in 7 Kacheln rund um einen Standort bei Greiz,
kaputte Zeilen und eine Antwort von `places_imports` (Beschreibung: `scripts/fixtures/README.md`). Benutzt in `src/features/places/*.test.ts` und `src/features/suggestions/mix.test.ts`.

**Nicht getestet** (kein Zugang aus der Cloud-Umgebung): gegen das echte Supabase-Projekt und auf einem echten Handy. Zum Ausprobieren: Abschnitt „Von Hand“ in `docs/suggestions.md`.

## Route und Website (M10c)

Die Ortsseite (`app/place/[id].tsx`) führt mit einem Tipp zur Route in einer Karten-App und zur Website des Ortes.
**Die App berechnet keine Route, bindet keine Karte ein, braucht keinen Schlüssel und kein neues Paket:** `Linking` und `ActionSheetIOS` aus React Native reichen,
die `app.json` ist unverändert (keine Abfrage installierter Apps, keine `LSApplicationQueriesSchemes`, keine `<queries>` für Android).

### „Route öffnen“

Hauptknopf fest unten (wie „Das machen wir“ bei den Ideen), für die Sprachausgabe „Route öffnen zu Saline Bad und Sauna“. Übergeben wird **nur das Ziel**, nie der Standort.

| Handy | Was passiert | Link |
| --- | --- | --- |
| Android | Android zeigt „Öffnen mit …“ (die Auswahl der Karten-Apps). Ist eine Karten-App als Standard gesetzt, öffnet sie sich sofort. | `geo:0,0?q=50.659123,12.198765(Saline%20Bad%20und%20Sauna)` |
| iPhone | kleines Auswahlmenü „Öffnen mit“: Apple Karten, Google Maps, OpenStreetMap (Karte), Abbrechen | siehe unten |

| Eintrag auf dem iPhone | Link | Modus |
| --- | --- | --- |
| Apple Karten | `https://maps.apple.com/directions?destination=50.659123,12.198765&mode=driving` | `walking` / `driving` |
| Google Maps | `https://www.google.com/maps/dir/?api=1&destination=50.659123%2C12.198765&travelmode=driving` | `walking` / `driving` |
| OpenStreetMap (Karte) | `https://www.openstreetmap.org/?mlat=50.659123&mlon=12.198765#map=17/50.659123/12.198765` | keiner |

- **Zu Fuß oder Auto:** unter 1 km Luftlinie zu Fuß, sonst Auto, dieselbe Regel wie die Anfahrt (`travelFor` in `travel.ts`). Gesetzt wird der Modus nur, wo der Anbieter einen hat (Apple, Google).
- **Name:** Nur die geo-URI von Android kennt eine Beschriftung. Für Routen haben Apple und Google keinen dokumentierten Parameter für einen Namen; dort gehen nur die Koordinaten mit (genauer als ein Name).
- **Kodierung:** Koordinaten mit höchstens 6 Nachkommastellen, ohne Exponent. Namen werden ganz kodiert, auch `( ) ! ' *` (in der geo-URI begrenzen die Klammern den Namen). Google verlangt das Komma als `%2C`, Apple zeigt es in seinen Beispielen unkodiert.
- **Web-Links statt App-Erkennung:** Google Maps öffnet laut Google-Doku die App, wenn sie installiert ist, sonst den Browser. `maps.apple.com` öffnet auf dem iPhone Apple Karten.
  Das ist einfacher als installierte Apps über Schemata in der `app.json` zu erkennen.
- **Apple:** Das Format `/directions` ist laut Apple ab iOS 18.4 dokumentiert; das ältere Format (`?daddr=`) steht nicht mehr in der Doku. Was ältere iPhones mit dem Link machen, ist nicht dokumentiert (vermutlich Karte ohne Route).
- **OpenStreetMap:** Eine Adresse für Routen ist bei OpenStreetMap nicht dokumentiert (`/directions?engine=…&route=…` steht nur in Foren und Fehlerberichten). Deshalb der dokumentierte Link mit Markierung (OSM-Wiki „Browsing“),
  und der Eintrag heißt „OpenStreetMap (Karte)“ / „OpenStreetMap (map)“, damit er keine Route verspricht (Entscheidung von Clemens).
- **Kein Dialog vorher**, auf dem iPhone nur das Auswahlmenü. Scheitert das Öffnen (z. B. keine Karten-App auf Android), erscheint danach „Es wurde keine Karten-App gefunden.“
- **Keine Fahrzeit** auf der Ortsseite: Die Karten-App weiß es besser (Entscheidung von Clemens). Die geschätzte Anfahrt bleibt nur in der Vorschlagslogik.
- **Datenschutz:** Beim Öffnen einer Route übergibt die App die Koordinaten des Ziels an die von dir gewählte Karten-App (`docs/supabase.md`, „Was an Supabase geht“).

Quellen (gelesen am 14.10.2026): Apple „Adopting unified Maps URLs“ (developer.apple.com/documentation/mapkit/unified-map-urls), Google „Maps URLs, Get Started“ (developers.google.com/maps/documentation/urls/get-started,
aus der Cloud-Umgebung gesperrt, Inhalt über die Websuche geprüft), Android „Common intents“, Abschnitt „Show a location on a map“ (developer.android.com/guide/components/intents-common), OSM-Wiki „Browsing“ (`mlat`, `mlon`, `#map=`).

### Website

Eine Zeile „Website öffnen“ (Link, mindestens 44 pt hoch), darunter klein die Adresse ohne „www.“ und „Öffnet im Browser“. Sie erscheint nur, wenn der Ort eine gültige Website hat.
Der Import lässt schon nur `http(s)://` durch (`checkPlaceRow`); die App prüft vor dem Anzeigen noch einmal selbst (`website.ts`): nur `http://` und `https://`, Rechnername mit Punkt, kein Benutzername oder Passwort in der Adresse, keine Leerzeichen.
Alles andere (`javascript:`, `intent:`, `file:` …) wird nie geöffnet. Erst der Tipp öffnet den Browser.

### Öffnungszeiten, Adresse, Saison

- **Fester Wochenplan** (`hours_kind = plan`): Liste Montag bis Sonntag in der App-Sprache (de/en), Zeiten 24-stündig („9:00–17:00“, „geschlossen“, „rund um die Uhr“). Zeiten über Mitternacht stehen wieder in einer Zeile („18:00–2:00“).
  **Heute** ist hervorgehoben: Sand-Fläche, fette Schrift und „· heute“ (für die Sprachausgabe „Heute, Mittwoch: 9:00–17:00“). Heute kommt aus der Uhr des Handys beim Öffnen der Seite.
  Mit Feiertagsregel zusätzlich „An Feiertagen können die Zeiten abweichen.“ und „Öffnungszeiten vorher prüfen“.
- **Komplex, unlesbar oder unbekannt:** „Öffnungszeiten vorher prüfen“, dazu der Rohtext aus OpenStreetMap („Angabe in OpenStreetMap“), falls es einen gibt.
- **Kino:** zusätzlich „Programm und Altersfreigabe vorher prüfen“.
- **Saison** (Entscheidung von Clemens): Hat der Ort Monate, steht „Saison: Mai bis September“ dabei (auch über den Jahreswechsel, „Dezember bis Februar“), damit ein Freibad im Oktober nicht offen aussieht.
- **Adresse:** Stehen Straße und Ort in den Daten, steht „Elsterstraße, Pohlitz“ unter dem Titel (nur Text aus den Daten, OpenStreetMap hat hier meist keine Hausnummer).

### Was in Expo Go testbar ist

**Alles:** Die App nutzt nur `Linking.openURL` und `ActionSheetIOS` und ändert die `app.json` nicht. „Öffnen mit …“ auf Android, das Menü auf dem iPhone, Apple Karten, Google Maps (App oder Browser), OpenStreetMap und die Website
verhalten sich in Expo Go wie in der fertigen App. Ein echter Build ist nur die letzte Bestätigung vor der Beta.

## Die nächsten Schritte (nicht gebaut)

- **M10e Orte im Verlauf** (nach M10c).
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
