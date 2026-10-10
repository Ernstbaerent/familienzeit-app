# Machbarkeitstest Orte (M2a)

Frage: Gibt es in der Umgebung von Greiz genug familientaugliche Orte in OpenStreetMap, um daraus jederzeit
**3 gute Vorschläge** zu bilden – auch in einem Dorf wie Reudnitz?

**Gemessen** am 10.10.2026 auf einem Chromebook mit `scripts/feasibility-places.ts` über `overpass-api.de`
(OSM-Datenstand 13:07–13:11 UTC). Die vollständigen Tabellen stehen im [Anhang](#anhang-vollständige-tabellen).

## Ergebnis in Kürze

- **Menge: reicht.** Im Umkreis von 15 km gibt es um Greiz 567 und um Reudnitz 655 Orte (ohne Mehrfachzählung), im
  Umkreis von 30 km jeweils über 2 800.
- **Qualität: dünn.** Viele Treffer sind Kleinigkeiten (Rastplätze, Dorfteiche, kleine Sehenswürdigkeiten). Zählt man
  nur die **Kernziele** (Bäder, Freizeitparks inkl. Minigolf, Zoos/Tiergehege, Museen, Burgen/Schlösser,
  Aussichtstürme, Indoor-Angebote), sind es um Greiz 13 / 64 / 299 und um Reudnitz **4** / 85 / 331 (5 / 15 / 30 km).
- **Im Dorf reichen 5 km oft nicht.** In Reudnitz greift der Fallback „Umkreis vergrößern" regelmäßig.
- **Bei Regen ist es am knappsten.** Echte Kinder-Indoor-Ziele (Indoorspielplatz, Hallenspielplatz, Kletterhalle,
  Trampolinhalle) gibt es **0 im 15-km-Umkreis** und 5 im 30-km-Umkreis.
- **Öffnungszeiten fehlen meistens.** Bei den kommerziellen Zielen (Bäder, Freizeitparks, Zoos, Museen, Indoor) hat im
  15-km-Umkreis nur etwa ein Drittel `opening_hours` (Greiz 35 %, Reudnitz 33 %). Mit Website dazu sind es etwa die Hälfte
  (53 % bzw. 46 %).
- **Viele Orte haben keinen Namen.** Bei Spielplätzen nur 11–15 %.

**Fazit:** Für **3 Vorschläge** reicht die Datenmenge. Für **gute** Vorschläge braucht M10 eine Gewichtung nach
Kindertauglichkeit, Hinweise statt harter Ausschlüsse bei unbekannten Öffnungszeiten, eine Saison für Bäder und die
Aktivitäten für zu Hause als festen Teil des Regen-Falls. Die fünf Folgerungen stehen unter
[Erkenntnisse für M10](#erkenntnisse-für-m10).

## Vorgehen

**Skript:** `scripts/feasibility-places.ts` (nur ein Test, keine App-Funktion).
Es fragt die Overpass API von OpenStreetMap ab und schreibt die Auswertung als Markdown nach
`scripts/.cache/report.md` (nicht im Repo).

```bash
npm run places:test                     # abfragen und auswerten (Node 22 oder neuer)
npm run places:test -- --offline        # nur aus dem Zwischenspeicher auswerten
npm run places:test -- --selftest       # Rechenfunktionen prüfen, braucht kein Netz
npm run places:test -- --print-queries  # die Overpass-Abfragen im Klartext zeigen, braucht kein Netz
```

Mit der Umgebungsvariable `OVERPASS_URL` lässt sich ein anderer Overpass-Server eintragen
(Standard: `https://overpass-api.de/api/interpreter`). Es darf eine kommagetrennte Liste sein: Der eine erlaubte
Wiederholungsversuch geht dann ohne Wartezeit an den nächsten Server, zum Beispiel
`OVERPASS_URL=https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter npm run places:test`.

### Testorte

| Ort | Mittelpunkt in OSM | gerundet (wie später in der App) |
|---|---|---|
| Greiz (Stadt) | 50,6563 / 12,2009 | 50,66 / 12,20 |
| Reudnitz (Ortsteil von Mohlsdorf-Teichwolframsdorf) | 50,6777 / 12,2781 | 50,68 / 12,28 |

Beide Mittelpunkte hat das Skript selbst in OSM gefunden. Greiz hat dort noch einen zweiten Eintrag (Gemeinde,
50,6478 / 12,1735), der bewusst ignoriert wird. **Die beiden Orte liegen nur etwa 6 km auseinander** (das Museum im
Oberen Schloss ist 0,4 km von Greiz und 6,4 km von Reudnitz entfernt). Bei 15 und 30 km überlappen sich die Umkreise
daher fast vollständig. Der Unterschied „Stadt gegen Dorf" zeigt sich vor allem im Umkreis von 5 km.

### Umkreise

5, 15 und 30 km **Luftlinie vom Ortsmittelpunkt**. Die Fahrzeit ist nicht berücksichtigt.

Overpass bekommt ein Rechteck (bbox) mit ±30 km um die Ortsmitte, nicht einen Kreis. Die Entfernung rechnet das
Skript danach selbst aus dem **Mittelpunkt** jedes Treffers. Bei Punkten ist das exakt, bei Flächen (Park, See,
Naturschutzgebiet) der Mittelpunkt der Fläche. Eine große Fläche, deren Rand schon näher liegt, kann deshalb
etwas zu weit weg einsortiert werden.

**Wanderwege** haben keinen Mittelpunkt. Sie zählen, wenn die Route ein Quadrat mit halber Kantenlänge 5, 15 oder
30 km um die Ortsmitte berührt. Das ist etwas großzügiger als ein Kreis und bekommt keine Entfernung.

### Kategorien und OSM-Merkmale

| Kategorie | Unterarten (OSM-Merkmal) |
|---|---|
| Spielplätze | `leisure=playground` (ohne private und Hallen-Spielplätze) |
| Parks | `leisure=park` (ohne private) |
| Schwimm- und Freibäder | „Freizeitbad" = `leisure=water_park`; benannte `leisure=swimming_pool` (nicht privat); `leisure=sports_centre` mit `sport=swimming` |
| Freizeitparks | `tourism=theme_park`; `leisure=miniature_golf` (Minigolf) |
| Zoos und Tierparks | `tourism=zoo`; `tourism=aquarium` |
| Museen | `tourism=museum` |
| Sehenswürdigkeiten | benannte: `tourism=attraction`, `tourism=viewpoint`, Aussichtstürme (`man_made=tower` + `tower:type=observation`), `historic=castle`, `historic=ruins` |
| Naturerlebnisse | Wanderwege (`route=hiking`); benannte Naturschutzgebiete und Seen/Teiche/Stauseen; `leisure=bathing_place`; `tourism=picnic_site` |
| Indoor-Angebote | `leisure=indoor_play`; Spielplätze mit `indoor=yes`; `leisure=trampoline_park`; Kletter-/Boulderhallen; `leisure=bowling_alley`; `leisure=ice_rink`; `leisure=escape_game`; `amenity=cinema`; `amenity=library` |

Kino und Bibliothek sind eine Ergänzung zur ursprünglichen Liste, weil sie bei schlechtem Wetter oft die
realistischsten Ziele sind. Hallenbäder stehen unter „Schwimm- und Freibäder" und zählen dort auch als Regen-Option.
Die Unterart „Freizeitbad" enthält nach den Namen zu urteilen vor allem **Freibäder** (z. B. „Waldbad Elsterberg",
„Freibad Netzschkau", „Fraureuther Freibad").

### Zählweise

- **Doppelte werden zusammengefasst:** Gleicher Name in derselben Kategorie und näher als 150 m gilt als ein Ort
  (z. B. ein Freibad, das als Punkt und als Fläche eingetragen ist). Namenlose Einträge gleicher Art näher als 40 m
  ebenfalls.
- **Kategorien überschneiden sich** teilweise (eine Burg kann auch ein Museum sein). Deshalb gibt es zusätzlich
  die Zeile „Summe ohne Mehrfachzählung".
- **Wanderwege** sind Routen ohne einen einzelnen Standort. Sie werden mitgezählt (Rechteck, siehe oben),
  bekommen aber keine Entfernung. Lange Fernwanderwege zählen genauso wie kurze Rundwege.
- Bei Sehenswürdigkeiten, benannten Becken, Naturschutzgebieten und Seen zählen nur Einträge **mit Namen**,
  weil man unbenannte Dinge nicht sinnvoll vorschlagen kann. Bei Spielplätzen und Parks zählen auch namenlose.
- **Gemessen wird:** Anzahl pro Kategorie und Umkreis, Anteil mit Namen, mit `opening_hours`, mit Website
  (`website`, `contact:website` oder `url`) und mit mindestens einem von beiden, außerdem je 3 Beispiele.
- **„Kernziele"** ist keine Spalte im Report, sondern eine von uns daraus addierte Zahl: Unterarten Freizeitbad,
  Schwimmbecken, Schwimmhalle, Freizeitpark, Minigolf, Zoo/Tierpark, Aquarium, Museum, Burg/Schloss, Aussichtsturm und
  alle Indoor-Angebote. Mehrfachzählungen sind dabei nicht herausgerechnet.

### Rücksicht auf die Overpass API

Insgesamt **11 Abfragen** (1× Ortsmitten, je Ort 2× Orte und 3× Wanderwege), nacheinander mit mindestens 10 s Pause,
mit Statusprüfung, eigenem User-Agent und höchstens einem Wiederholungsversuch nach 60 s. Jede Antwort wird in
`scripts/.cache/` gespeichert, ein zweiter Lauf fragt nichts erneut ab.

Die Abfragen sind bewusst leicht gehalten (`npm run places:test -- --print-queries` zeigt sie im Klartext):

- Rechteck statt Kreis, Entfernung lokal.
- Pro Abfrage nur 1 bis 5 grobe Zeilen (alle `tourism=…` in einer Zeile usw.). Das genaue Zuordnen mit
  Ausschlüssen und Namenspflicht macht das Skript danach.
- `leisure` (viele Treffer) getrennt vom Rest, Wanderwege getrennt und ohne Geometrie.
- `[timeout:120]` und `[maxsize:134217728]` (128 MB) in jeder Abfrage.

## Ergebnisse

### Anzahl pro Kategorie und Umkreis

| Kategorie | Greiz 5 km | 15 km | 30 km | Reudnitz 5 km | 15 km | 30 km |
|---|--:|--:|--:|--:|--:|--:|
| Spielplätze | 34 | 130 | 821 | 18 | 169 | 849 |
| Parks | 16 | 79 | 532 | 6 | 114 | 585 |
| Schwimm- und Freibäder | 1 | 12 | 58 | 2 | 16 | 62 |
| Freizeitparks (inkl. Minigolf) | 0 | 3 | 20 | 0 | 4 | 25 |
| Zoos und Tierparks | 1 | 2 | 10 | 1 | 3 | 12 |
| Museen | 3 | 18 | 100 | 0 | 28 | 112 |
| Sehenswürdigkeiten | 20 | 94 | 386 | 4 | 76 | 429 |
| Naturerlebnisse | 50 | 218 | 898 | 29 | 228 | 1004 |
| Indoor-Angebote | 3 | 14 | 69 | 1 | 18 | 75 |
| **Summe** | 128 | 570 | 2894 | 61 | 656 | 3153 |
| Summe ohne Mehrfachzählung | 127 | 567 | 2884 | 61 | 655 | 3141 |
| **Kernziele** (addiert, siehe Zählweise) | 13 | 64 | 299 | 4 | 85 | 331 |

**Was in den großen Zahlen steckt** (30 km, Greiz / Reudnitz):

- *Naturerlebnisse* 898 / 1004: davon Rastplätze 347 / 396 und benannte Teiche/Seen 241 / 246. Wanderwege-Routen sind
  278 / 330, Naturschutzgebiete 30 / 30, **Badestellen nur 2 / 2**.
- *Sehenswürdigkeiten* 386 / 429: davon allgemeine „Sehenswürdigkeiten" 205 / 234 (z. B. „Steintrog/Opferwanne",
  „Lehmhäuser"), Aussichtspunkte 121 / 134, Burgen/Schlösser 36 / 37, Aussichtstürme 6 / 8, Ruinen 18 / 16.
- *Freizeitparks* 20 / 25: davon Minigolf 15 / 17 und **echte Freizeitparks 5 / 8**, keiner davon im 15-km-Umkreis.
- *Schwimm- und Freibäder* 58 / 62: davon Hallenbad/Schwimmhalle nur 8 / 9, im 15-km-Umkreis 0 / 1.

### Öffnungszeiten und Website

Alle Orte zusammen (ohne Mehrfachzählung):

| | Greiz 5 km | 15 km | 30 km | Reudnitz 5 km | 15 km | 30 km |
|---|--:|--:|--:|--:|--:|--:|
| Orte | 127 | 567 | 2884 | 61 | 655 | 3141 |
| mit Name | 59 % | 53 % | 50 % | 54 % | 49 % | 51 % |
| mit Öffnungszeiten | 6 (5 %) | 24 (4 %) | 149 (5 %) | 2 (3 %) | 29 (4 %) | 173 (6 %) |
| mit Website | 8 (6 %) | 35 (6 %) | 174 (6 %) | 4 (7 %) | 38 (6 %) | 188 (6 %) |
| Zeiten oder Website | 10 (8 %) | 48 (8 %) | 249 (9 %) | 5 (8 %) | 53 (8 %) | 282 (9 %) |

Diese niedrigen Werte täuschen: Die Masse sind frei zugängliche Orte (Spielplätze, Parks, Wanderwege, Teiche), bei
denen Öffnungszeiten nicht zu erwarten sind. Entscheidend sind die **kommerziellen und öffentlichen Ziele**
(Schwimm- und Freibäder, Freizeitparks, Zoos, Museen, Indoor-Angebote). Dort, addiert aus den Kategorie-Tabellen im Anhang:

| Umkreis | Ort | Ziele | mit Öffnungszeiten | mit Zeiten oder Website |
|---|---|--:|--:|--:|
| 15 km | Greiz | 49 | 17 (35 %) | 26 (53 %) |
| 15 km | Reudnitz | 69 | 23 (33 %) | 32 (46 %) |
| 30 km | Greiz | 257 | 96 (37 %) | 139 (54 %) |
| 30 km | Reudnitz | 286 | 110 (38 %) | 158 (55 %) |

Nach Kategorie (Anteil „Zeiten oder Website", 15 km, Greiz / Reudnitz): Schwimm- und Freibäder 42 % / 31 %,
Freizeitparks 0 % / 75 %, Zoos 100 % / 67 %, Museen 67 % / 39 %, Indoor 50 % / 61 %. Die Zahlen für 5 km sind zu klein,
um etwas daraus abzulesen (z. B. ein einziges Bad).

### Namen

Spielplätze haben nur in **11–15 %** der Fälle einen Namen (Greiz 15 / 14 / 13 %, Reudnitz 11 / 11 / 14 % bei 5 / 15 / 30 km),
Parks in 33–50 %. Die übrigen Kategorien liegen meist bei 55–100 % (Ausnahme: das einzige Indoor-Angebot im
5-km-Umkreis von Reudnitz, eine namenlose Eisbahn).

## Einschätzung: Reicht das für 3 gute Vorschläge?

**Kurz: Ja für die Menge, nein ohne Gewichtung und Fallback.** Drei typische Fälle:

**1. Sonne, halber Tag, Schulkind (bis 30 km): reicht reichlich.**
Um Greiz gibt es im 30-km-Umkreis 299 Kernziele, darunter 10 Zoos/Tiergehege, 5 Freizeitparks, 15 Minigolfanlagen,
36 Burgen/Schlösser und 6 Aussichtstürme, dazu 278 Wanderwege-Routen. Das Problem ist hier nicht die Menge, sondern die
Auswahl: ohne Gewichtung würden Rastplätze und Dorfteiche die Liste dominieren.

**2. 1 Stunde, wenig Energie, Dorf (Reudnitz, 5 km): geht gerade so.**
Im 5-km-Umkreis liegen 61 Orte, aber nur 4 Kernziele (2 Bäder, 1 Tiergehege, 1 namenlose Eisbahn). Der Rest sind
18 Spielplätze (nur 2 mit Namen), 6 Parks, 29 Naturorte (14 Wanderwege-Routen, 8 Rastplätze, 6 Teiche, 1 Naturschutzgebiet)
und 4 kleine Sehenswürdigkeiten. Drei Vorschläge sind möglich (Spielplatz, Park/Teich, Tiergehege Greiz mit 4,3 km), aber
die meisten haben **keinen Namen und keine Details**. Die Bäder sind saisonabhängig. In der Stadt (Greiz, 5 km) sieht es
besser aus: 13 Kernziele, 3 Museen, Kino, Bibliothek.

**3. 2 Stunden, Regen, Kleinkind: knapp, hier muss der Fallback tragen.**
- *Greiz (5 km):* Museen (3), Kino, Bibliothek und eine Eisbahn: Menge reicht. Ob ein Museum für ein Kleinkind passt,
  sagt OSM nicht.
- *Reudnitz (5 km):* 0 Museen, 1 namenlose Eisbahn. Hier reicht nur der Fallback auf **15 km** (46 Museen und
  Indoor-Orte, die nächsten in Greiz, 6,2–6,7 km).
- *Kinder-Indoor:* Indoorspielplatz, Hallenspielplatz, Kletterhalle und Trampolinhalle: **0 im 15-km-Umkreis**, im
  30-km-Umkreis 5 (1 + 1 + 3 + 0). Hallenbäder: 0 (Greiz) bzw. 1 (Reudnitz) im 15-km-Umkreis.
- **Folgerung:** Bei Regen müssen die Aktivitäten für zu Hause gleichberechtigt neben den Orten stehen, nicht erst als
  letzter Rest.

**Datenqualität für „geschlossen":** Von den kommerziellen Zielen haben nur etwa ein Drittel Öffnungszeiten in OSM.
Würde die Vorschlagslogik Orte ohne Öffnungszeiten ausschließen, fielen etwa zwei Drittel der Bäder, Museen, Zoos und
Indoor-Angebote weg, und im 5-km-Umkreis von Reudnitz bliebe bei Regen gar nichts übrig (das einzige Indoor-Angebot
hat keine Öffnungszeiten). Das passt nicht zu „Sortieren statt aussortieren". Ausgeschlossen werden sollte nur, was
**bekannt** geschlossen ist.

**Zum Fallback aus der CLAUDE.md (5 → 15 → 30 km):** Für Greiz trägt oft schon 5 km, für ein Dorf wie Reudnitz greift
die Stufe 15 km regelmäßig, die Stufe 30 km selten. Der Fallback „Aktivitäten für zu Hause" wird vor allem bei Regen
und bei Kleinkindern gebraucht.

**Zur Technik (Entscheidung offen, nicht beschlossen):** Die Abfragen selbst waren schnell (meist unter 10 s). Dazu
kamen aber fünfmal Wartezeiten von 8–31 s auf einen freien Platz am öffentlichen Server und einmal der
Wiederholungsversuch nach 60 s. Zusammengerechnet dauerten die 10 Umkreis-Abfragen für beide Orte 207 s (rund
3,5 Minuten), ohne die 10 s Pause zwischen den Abfragen. Für „unter 30 Sekunden" ist eine **Live-Abfrage vom Handy**
damit riskant. Zu prüfen wäre, ob M10 die Orte einer Region vorab lädt und als öffentliche Daten ablegt (wie die
Aktivitäten in M8), statt live bei Overpass zu fragen.

## Erkenntnisse für M10

Von Clemens am 10.10.2026 aus diesem Test festgehalten (auch in der `CLAUDE.md` unter M10):

1. **Orte ohne Öffnungszeiten werden nicht ausgeschlossen**, sondern mit dem Hinweis „Öffnungszeiten vorher prüfen"
   angezeigt. Nur bekannt geschlossene Orte bleiben hart ausgeschlossen (Regel „geschlossen oder bereits vorbei").
   Grund: nur etwa ein Drittel der kommerziellen Ziele hat `opening_hours` (15 km: 35 % bzw. 33 %).
2. **Bäder brauchen eine Kennzeichnung drinnen/draußen und eine Saison.** Keine Freibäder außerhalb der Saison.
   Grund: Die Unterart „Freizeitbad" besteht überwiegend aus Freibädern, Hallenbäder gibt es im 15-km-Umkreis kaum
   (0 bei Greiz, 1 bei Reudnitz). Dieser Test wertet dafür noch keine OSM-Merkmale aus; in M10 mit abfragen
   (z. B. `indoor`, `seasonal`, Monate in `opening_hours`).
3. **Namenlose Orte werden über Straße oder Ortsteil beschrieben.** Grund: Nur 11–15 % der Spielplätze haben einen
   Namen. Wie wir Straße oder Ortsteil bekommen (Adress-Merkmale in OSM, nächste Straße, Reverse-Geocoding), ist in
   M10 zu klären. Ein zusätzlicher externer Dienst bräuchte vorher Rückfrage, und der Standort würde wie
   üblich auf 2 Nachkommastellen gerundet.
4. **Kategorien bekommen eine Gewichtung nach Kindertauglichkeit.** Niedrig z. B. Rastplätze, Aussichtspunkte, kleine
   „Sehenswürdigkeiten" und Dorfteiche; höher z. B. Spielplätze, Zoos/Tiergehege, Freizeitparks/Minigolf, Bäder
   (in der Saison), Burgen/Schlösser und die wenigen Kinder-Indoor-Ziele. Die genauen Werte legen Clemens und Ani fest.
   Grund: Rastplätze und Teiche machen rund 65 % der „Naturerlebnisse" aus (588 von 898 bei Greiz, 30 km).
5. **Bei Regen sind Indoor-Orte vor Ort selten, die Aktivitäten für zu Hause sind dann besonders wichtig.**
   Grund: 0 Kinder-Indoor-Ziele im 15-km-Umkreis, 5 im 30-km-Umkreis.

Zusätzlich offen (aus der Einschätzung, noch nicht entschieden): ob die Orte in M10 live bei Overpass oder vorab
geladen werden, und ob für „jetzt geöffnet?" eine Bibliothek für `opening_hours` ins Projekt kommt (vorher Rückfrage).

## Verlauf der Messung

Die Messung war ein längerer Weg, die Einzelheiten sind für M10 und M9 nützlich (öffentliche Overpass-Server):

- **Cloud-Umgebung (Entwicklung):** Nur die kleine Ortsmitten-Abfrage kam durch. HTTPS zu `overpass-api.de` wurde in
  allen Versuchen nach etwa 7 s von der Gegenseite abgebrochen, über HTTP (Port 80) kam ein großer Teil der Aufrufe
  mit „503 upstream connect error" zurück, und erreichte eine Umkreis-Abfrage den Server, kam 504 (zu beschäftigt).
  Auch die beiden Ausweich-Server `overpass.kumi.systems` und `overpass.private.coffee` antworteten über etwa
  10 Minuten nur mit „500 Internal Server Error". Die Versuche wurden eingestellt, um die Server nicht zu belasten.
- **Erster lokaler Lauf (Chromebook, HTTPS):** Die Verbindung klappte, die erste Umkreis-Abfrage endete nach 97 s mit
  „runtime error: Query timed out". Grund: 29 einzelne Kreis-Abfragen (`around`) in einer Anfrage waren für den
  ausgelasteten Server zu schwer, schon im 5-km-Umkreis.
- **Zweiter lokaler Lauf:** Nach dem Umbau auf Rechteck (bbox), grobe Zeilen, getrennte Wanderwege und passende
  Zeit-/Speichergrenzen lief alles durch. Einzelne Abfragen mussten 8–31 s auf einen freien Platz warten, eine brauchte
  den einen Wiederholungsversuch (62 s). Die groben Abfragen lieferten bei Greiz 3 235 (`leisure`) und 1 997 (Rest)
  Elemente, bei Reudnitz 3 843 und 2 144. Nach dem Zusammenführen und dem Aussortieren der Rechteck-Ecken passten bei
  Greiz 1 648 und bei Reudnitz 1 984 Treffer zu keinem genauen Filter und wurden verworfen (z. B. ein Becken ohne
  Namen).

## Grenzen dieses Tests

- Luftlinie statt Fahrzeit; bei Flächen der Mittelpunkt, bei Wanderwegen ein Rechteck.
- OpenStreetMap ist von Freiwilligen gepflegt. Eine fehlende Öffnungszeit heißt nicht, dass der Ort keine hat.
  Bei frei zugänglichen Orten (Spielplatz, Park, Wanderweg) sind Öffnungszeiten ohnehin nicht zu erwarten.
- `opening_hours` wird hier nur gezählt, nicht ausgewertet. „Jetzt geöffnet?" zu berechnen ist Thema von
  M10 und braucht voraussichtlich eine Bibliothek (vorher Rückfrage).
- Keine Preise, keine Angaben zur Altersgrenze, keine Veranstaltungen (die kommen mit M2b/M11).
- Keine Angabe, ob ein Bad drinnen oder draußen liegt und ob es Saison hat (siehe Erkenntnis 2).
- Eine Momentaufnahme: Die Daten ändern sich laufend. Zwei Testorte sind ein Stichprobenvergleich, kein Querschnitt
  durch die Region.

## Anhang: vollständige Tabellen

Unverändert aus `scripts/.cache/report.md` (Lauf vom 10.10.2026).

### Greiz (Mitte 50.66 / 12.20)

#### Anzahl pro Kategorie und Umkreis

| Kategorie | 5 km | 15 km | 30 km |
|---|--:|--:|--:|
| Spielplätze | 34 | 130 | 821 |
| Parks | 16 | 79 | 532 |
| Schwimm- und Freibäder | 1 | 12 | 58 |
| Freizeitparks | 0 | 3 | 20 |
| Zoos und Tierparks | 1 | 2 | 10 |
| Museen | 3 | 18 | 100 |
| Sehenswürdigkeiten | 20 | 94 | 386 |
| Naturerlebnisse | 50 | 218 | 898 |
| Indoor-Angebote | 3 | 14 | 69 |
| **Summe** | 128 | 570 | 2894 |
| Summe ohne Mehrfachzählung | 127 | 567 | 2884 |

#### Öffnungszeiten und Website

Anteil der Orte mit Name / mit `opening_hours` / mit Website / mit mindestens einem von beiden.

| Kategorie | Umkreis | Orte | Name | Öffnungszeiten | Website | Zeiten oder Website |
|---|--:|--:|--:|--:|--:|--:|
| Spielplätze | 5 km | 34 | 15 % | 0 (0 %) | 0 (0 %) | 0 (0 %) |
|  | 15 km | 130 | 14 % | 2 (2 %) | 0 (0 %) | 2 (2 %) |
|  | 30 km | 821 | 13 % | 32 (4 %) | 1 (0 %) | 33 (4 %) |
| Parks | 5 km | 16 | 50 % | 1 (6 %) | 0 (0 %) | 1 (6 %) |
|  | 15 km | 79 | 33 % | 2 (3 %) | 0 (0 %) | 2 (3 %) |
|  | 30 km | 532 | 33 % | 12 (2 %) | 8 (2 %) | 16 (3 %) |
| Schwimm- und Freibäder | 5 km | 1 | 100 % | 1 (100 %) | 1 (100 %) | 1 (100 %) |
|  | 15 km | 12 | 100 % | 3 (25 %) | 5 (42 %) | 5 (42 %) |
|  | 30 km | 58 | 93 % | 15 (26 %) | 22 (38 %) | 25 (43 %) |
| Freizeitparks | 5 km | 0 | – | 0 (–) | 0 (–) | 0 (–) |
|  | 15 km | 3 | 67 % | 0 (0 %) | 0 (0 %) | 0 (0 %) |
|  | 30 km | 20 | 70 % | 7 (35 %) | 5 (25 %) | 10 (50 %) |
| Zoos und Tierparks | 5 km | 1 | 100 % | 1 (100 %) | 0 (0 %) | 1 (100 %) |
|  | 15 km | 2 | 100 % | 2 (100 %) | 1 (50 %) | 2 (100 %) |
|  | 30 km | 10 | 100 % | 5 (50 %) | 6 (60 %) | 7 (70 %) |
| Museen | 5 km | 3 | 100 % | 2 (67 %) | 2 (67 %) | 2 (67 %) |
|  | 15 km | 18 | 100 % | 8 (44 %) | 9 (50 %) | 12 (67 %) |
|  | 30 km | 100 | 98 % | 42 (42 %) | 42 (42 %) | 55 (55 %) |
| Sehenswürdigkeiten | 5 km | 20 | 100 % | 1 (5 %) | 1 (5 %) | 1 (5 %) |
|  | 15 km | 94 | 100 % | 4 (4 %) | 9 (10 %) | 12 (13 %) |
|  | 30 km | 386 | 100 % | 12 (3 %) | 32 (8 %) | 38 (10 %) |
| Naturerlebnisse | 5 km | 50 | 72 % | 0 (0 %) | 3 (6 %) | 3 (6 %) |
|  | 15 km | 218 | 55 % | 0 (0 %) | 8 (4 %) | 8 (4 %) |
|  | 30 km | 898 | 61 % | 0 (0 %) | 29 (3 %) | 29 (3 %) |
| Indoor-Angebote | 5 km | 3 | 67 % | 1 (33 %) | 2 (67 %) | 2 (67 %) |
|  | 15 km | 14 | 79 % | 4 (29 %) | 5 (36 %) | 7 (50 %) |
|  | 30 km | 69 | 84 % | 27 (39 %) | 35 (51 %) | 42 (61 %) |
| **Alle (ohne Mehrfachzählung)** | 5 km | 127 | 59 % | 6 (5 %) | 8 (6 %) | 10 (8 %) |
|  | 15 km | 567 | 53 % | 24 (4 %) | 35 (6 %) | 48 (8 %) |
|  | 30 km | 2884 | 50 % | 149 (5 %) | 174 (6 %) | 249 (9 %) |

#### Unterarten

| Kategorie | Unterart | 5 km | 15 km | 30 km |
|---|---|--:|--:|--:|
| Spielplätze | Spielplatz | 34 | 130 | 821 |
| Parks | Park | 16 | 79 | 532 |
| Schwimm- und Freibäder | Freizeitbad | 1 | 11 | 45 |
|  | Schwimmbecken (benannt) | 0 | 1 | 5 |
|  | Schwimmbad/Schwimmhalle | 0 | 0 | 8 |
| Freizeitparks | Freizeitpark | 0 | 0 | 5 |
|  | Minigolf | 0 | 3 | 15 |
| Zoos und Tierparks | Zoo/Tierpark | 1 | 2 | 10 |
|  | Aquarium | 0 | 0 | 0 |
| Museen | Museum | 3 | 18 | 100 |
| Sehenswürdigkeiten | Sehenswürdigkeit | 5 | 34 | 205 |
|  | Aussichtspunkt | 10 | 43 | 121 |
|  | Aussichtsturm | 1 | 2 | 6 |
|  | Burg/Schloss | 4 | 13 | 36 |
|  | Ruine | 0 | 2 | 18 |
| Naturerlebnisse | Wanderweg (Route) | 31 | 91 | 278 |
|  | Naturschutzgebiet | 0 | 2 | 30 |
|  | See/Teich (benannt) | 8 | 41 | 241 |
|  | Badestelle | 0 | 0 | 2 |
|  | Rastplatz | 11 | 84 | 347 |
| Indoor-Angebote | Indoorspielplatz | 0 | 0 | 1 |
|  | Spielplatz in der Halle | 0 | 0 | 1 |
|  | Trampolinhalle | 0 | 0 | 0 |
|  | Kletterhalle | 0 | 0 | 3 |
|  | Bowling/Kegeln | 0 | 5 | 18 |
|  | Eisbahn | 1 | 1 | 2 |
|  | Escape Game | 0 | 0 | 1 |
|  | Kino | 1 | 2 | 10 |
|  | Bibliothek | 1 | 6 | 33 |

#### Beispiele (die 3 nächsten mit Namen)

| Kategorie | Beispiel | Art | Entfernung | Zeiten | Website |
|---|---|---|--:|:-:|:-:|
| Spielplätze | Abenteuer-Spielplatz | Spielplatz | 0.3 km | – | – |
|  | Elsterplatz | Spielplatz | 1.4 km | – | – |
|  | Spielplatz Pohlitz | Spielplatz | 1.6 km | – | – |
| Parks | Stadtpark | Park | 0.1 km | – | – |
|  | Stadtwäldchen | Park | 0.3 km | – | – |
|  | Hoher Platz | Park | 0.3 km | – | – |
| Schwimm- und Freibäder | Bäderkomplex Aubachtal | Freizeitbad | 2.1 km | ja | ja |
|  | Waldbad Elsterberg | Freizeitbad | 6.1 km | ja | ja |
|  | Freibad Netzschkau | Freizeitbad | 6.8 km | – | ja |
| Freizeitparks | Minigolf Unterer Bhf Reichenbach | Minigolf | 8.3 km | – | – |
|  | Freizeitgarten Pöhl | Minigolf | 11.9 km | – | – |
|  | Piratengolf Koberbachtalsperre | Minigolf | 16.1 km | ja | – |
| Zoos und Tierparks | Tiergehege Greiz | Zoo/Tierpark | 3.6 km | ja | – |
|  | Falknerei Herrmann | Zoo/Tierpark | 14.9 km | ja | ja |
|  | Tiergehege Zeulenroda-Triebes | Zoo/Tierpark | 15.2 km | – | ja |
| Museen | Museum im Oberen Schloss | Museum | 0.4 km | – | – |
|  | Museum und Schauwerkstatt im Unteren Schloss | Museum | 0.4 km | ja | ja |
|  | Sommerpalais | Museum | 0.6 km | ja | ja |
| Sehenswürdigkeiten | Oberes Schloss (Greiz) | Burg/Schloss | 0.3 km | – | – |
|  | Bergfried | Aussichtsturm | 0.3 km | – | – |
|  | Unteres Schloss | Burg/Schloss | 0.4 km | – | – |
| Naturerlebnisse | Binsenteich | See/Teich (benannt) | 0.6 km | – | – |
|  | Hirschteich | See/Teich (benannt) | 2.5 km | – | – |
|  | Dorfteich | See/Teich (benannt) | 3.2 km | – | – |
| Indoor-Angebote | UT99 Kinocenter | Kino | 0.4 km | ja | ja |
|  | Stadt- und Kreisbibliothek Greiz | Bibliothek | 0.5 km | – | ja |
|  | Kultur & Autokino Göltzschtalbrücke | Kino | 5.3 km | – | ja |

### Reudnitz (Mohlsdorf-Teichwolframsdorf) (Mitte 50.68 / 12.28)

#### Anzahl pro Kategorie und Umkreis

| Kategorie | 5 km | 15 km | 30 km |
|---|--:|--:|--:|
| Spielplätze | 18 | 169 | 849 |
| Parks | 6 | 114 | 585 |
| Schwimm- und Freibäder | 2 | 16 | 62 |
| Freizeitparks | 0 | 4 | 25 |
| Zoos und Tierparks | 1 | 3 | 12 |
| Museen | 0 | 28 | 112 |
| Sehenswürdigkeiten | 4 | 76 | 429 |
| Naturerlebnisse | 29 | 228 | 1004 |
| Indoor-Angebote | 1 | 18 | 75 |
| **Summe** | 61 | 656 | 3153 |
| Summe ohne Mehrfachzählung | 61 | 655 | 3141 |

#### Öffnungszeiten und Website

Anteil der Orte mit Name / mit `opening_hours` / mit Website / mit mindestens einem von beiden.

| Kategorie | Umkreis | Orte | Name | Öffnungszeiten | Website | Zeiten oder Website |
|---|--:|--:|--:|--:|--:|--:|
| Spielplätze | 5 km | 18 | 11 % | 0 (0 %) | 0 (0 %) | 0 (0 %) |
|  | 15 km | 169 | 11 % | 2 (1 %) | 0 (0 %) | 2 (1 %) |
|  | 30 km | 849 | 14 % | 36 (4 %) | 3 (0 %) | 38 (4 %) |
| Parks | 5 km | 6 | 33 % | 0 (0 %) | 0 (0 %) | 0 (0 %) |
|  | 15 km | 114 | 33 % | 2 (2 %) | 1 (1 %) | 3 (3 %) |
|  | 30 km | 585 | 34 % | 15 (3 %) | 8 (1 %) | 19 (3 %) |
| Schwimm- und Freibäder | 5 km | 2 | 100 % | 1 (50 %) | 1 (50 %) | 1 (50 %) |
|  | 15 km | 16 | 100 % | 4 (25 %) | 5 (31 %) | 5 (31 %) |
|  | 30 km | 62 | 94 % | 17 (27 %) | 26 (42 %) | 30 (48 %) |
| Freizeitparks | 5 km | 0 | – | 0 (–) | 0 (–) | 0 (–) |
|  | 15 km | 4 | 100 % | 3 (75 %) | 0 (0 %) | 3 (75 %) |
|  | 30 km | 25 | 72 % | 10 (40 %) | 6 (24 %) | 13 (52 %) |
| Zoos und Tierparks | 5 km | 1 | 100 % | 1 (100 %) | 0 (0 %) | 1 (100 %) |
|  | 15 km | 3 | 100 % | 1 (33 %) | 1 (33 %) | 2 (67 %) |
|  | 30 km | 12 | 100 % | 6 (50 %) | 6 (50 %) | 8 (67 %) |
| Museen | 5 km | 0 | – | 0 (–) | 0 (–) | 0 (–) |
|  | 15 km | 28 | 100 % | 8 (29 %) | 9 (32 %) | 11 (39 %) |
|  | 30 km | 112 | 98 % | 48 (43 %) | 47 (42 %) | 62 (55 %) |
| Sehenswürdigkeiten | 5 km | 4 | 100 % | 0 (0 %) | 0 (0 %) | 0 (0 %) |
|  | 15 km | 76 | 100 % | 3 (4 %) | 9 (12 %) | 11 (14 %) |
|  | 30 km | 429 | 100 % | 17 (4 %) | 35 (8 %) | 46 (11 %) |
| Naturerlebnisse | 5 km | 29 | 76 % | 0 (0 %) | 3 (10 %) | 3 (10 %) |
|  | 15 km | 228 | 55 % | 0 (0 %) | 6 (3 %) | 6 (3 %) |
|  | 30 km | 1004 | 60 % | 0 (0 %) | 29 (3 %) | 29 (3 %) |
| Indoor-Angebote | 5 km | 1 | 0 % | 0 (0 %) | 0 (0 %) | 0 (0 %) |
|  | 15 km | 18 | 83 % | 7 (39 %) | 8 (44 %) | 11 (61 %) |
|  | 30 km | 75 | 85 % | 29 (39 %) | 35 (47 %) | 45 (60 %) |
| **Alle (ohne Mehrfachzählung)** | 5 km | 61 | 54 % | 2 (3 %) | 4 (7 %) | 5 (8 %) |
|  | 15 km | 655 | 49 % | 29 (4 %) | 38 (6 %) | 53 (8 %) |
|  | 30 km | 3141 | 51 % | 173 (6 %) | 188 (6 %) | 282 (9 %) |

#### Unterarten

| Kategorie | Unterart | 5 km | 15 km | 30 km |
|---|---|--:|--:|--:|
| Spielplätze | Spielplatz | 18 | 169 | 849 |
| Parks | Park | 6 | 114 | 585 |
| Schwimm- und Freibäder | Freizeitbad | 2 | 14 | 49 |
|  | Schwimmbecken (benannt) | 0 | 1 | 4 |
|  | Schwimmbad/Schwimmhalle | 0 | 1 | 9 |
| Freizeitparks | Freizeitpark | 0 | 0 | 8 |
|  | Minigolf | 0 | 4 | 17 |
| Zoos und Tierparks | Zoo/Tierpark | 1 | 3 | 12 |
|  | Aquarium | 0 | 0 | 0 |
| Museen | Museum | 0 | 28 | 112 |
| Sehenswürdigkeiten | Sehenswürdigkeit | 3 | 26 | 234 |
|  | Aussichtspunkt | 1 | 32 | 134 |
|  | Aussichtsturm | 0 | 3 | 8 |
|  | Burg/Schloss | 0 | 13 | 37 |
|  | Ruine | 0 | 2 | 16 |
| Naturerlebnisse | Wanderweg (Route) | 14 | 94 | 330 |
|  | Naturschutzgebiet | 1 | 3 | 30 |
|  | See/Teich (benannt) | 6 | 42 | 246 |
|  | Badestelle | 0 | 0 | 2 |
|  | Rastplatz | 8 | 89 | 396 |
| Indoor-Angebote | Indoorspielplatz | 0 | 0 | 1 |
|  | Spielplatz in der Halle | 0 | 0 | 1 |
|  | Trampolinhalle | 0 | 0 | 0 |
|  | Kletterhalle | 0 | 0 | 3 |
|  | Bowling/Kegeln | 0 | 5 | 20 |
|  | Eisbahn | 1 | 1 | 2 |
|  | Escape Game | 0 | 0 | 1 |
|  | Kino | 0 | 3 | 11 |
|  | Bibliothek | 0 | 9 | 36 |

#### Beispiele (die 3 nächsten mit Namen)

| Kategorie | Beispiel | Art | Entfernung | Zeiten | Website |
|---|---|---|--:|:-:|:-:|
| Spielplätze | Ballspielplatz | Spielplatz | 4.4 km | – | – |
|  | Spielplatz Pohlitz | Spielplatz | 4.4 km | – | – |
|  | Abenteuer-Spielplatz | Spielplatz | 5.8 km | – | – |
| Parks | Kurt-Hahn-Park | Park | 1.7 km | – | – |
|  | Festwiese | Park | 3.7 km | – | – |
|  | Stadtpark | Park | 5.4 km | – | – |
| Schwimm- und Freibäder | Fraureuther Freibad | Freizeitbad | 3.4 km | – | – |
|  | Bäderkomplex Aubachtal | Freizeitbad | 4.6 km | ja | ja |
|  | Freibad Teichwolframsdorf | Freizeitbad | 5.9 km | – | – |
| Freizeitparks | Minigolf Unterer Bhf Reichenbach | Minigolf | 6.9 km | – | – |
|  | Piratengolf Koberbachtalsperre | Minigolf | 11.0 km | ja | – |
|  | Minigolf Hirschfeld | Minigolf | 12.9 km | ja | – |
| Zoos und Tierparks | Tiergehege Greiz | Zoo/Tierpark | 4.3 km | ja | – |
|  | Tiergehege Waldstraße | Zoo/Tierpark | 12.3 km | – | – |
|  | Tierpark Hirschfeld | Zoo/Tierpark | 12.7 km | – | ja |
| Museen | Museum und Schauwerkstatt im Unteren Schloss | Museum | 6.3 km | ja | ja |
|  | Museum im Oberen Schloss | Museum | 6.4 km | – | – |
|  | Sommerpalais | Museum | 6.7 km | ja | ja |
| Sehenswürdigkeiten | Lehmhäuser | Sehenswürdigkeit | 0.9 km | – | – |
|  | Steintrog/Opferwanne | Sehenswürdigkeit | 3.6 km | – | – |
|  | Drei Lärchen | Sehenswürdigkeit | 4.3 km | – | – |
| Naturerlebnisse | Waschteich | See/Teich (benannt) | 2.9 km | – | – |
|  | Breiteich | See/Teich (benannt) | 3.0 km | – | – |
|  | Waschteich Reuth | Naturschutzgebiet | 3.0 km | – | ja |
| Indoor-Angebote | UT99 Kinocenter | Kino | 6.2 km | ja | ja |
|  | Stadt- und Kreisbibliothek Greiz | Bibliothek | 6.2 km | – | ja |
|  | Kultur & Autokino Göltzschtalbrücke | Kino | 6.7 km | – | ja |
