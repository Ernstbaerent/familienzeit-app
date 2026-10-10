# Machbarkeitstest Orte (M2a)

Frage: Gibt es in der Umgebung von Greiz genug familientaugliche Orte in OpenStreetMap, um daraus jederzeit
**3 gute Vorschläge** zu bilden – auch in einem Dorf wie Reudnitz?

> **Stand: Messung steht noch aus.** Das Skript ist fertig und getestet, aber die Overpass API war aus der
> Cloud-Umgebung nicht zuverlässig erreichbar (siehe [Stand der Messung](#stand-der-messung)). Die Abschnitte
> „Ergebnisse" und „Einschätzung" sind deshalb noch leer. Es stehen hier bewusst **keine** geschätzten Zahlen.

## Vorgehen

**Skript:** `scripts/feasibility-places.ts` (nur ein Test, keine App-Funktion).
Es fragt die Overpass API von OpenStreetMap ab und schreibt die Auswertung als Markdown nach
`scripts/.cache/report.md` (nicht im Repo). Die Tabellen daraus kommen in den Abschnitt „Ergebnisse".

```bash
npm run places:test                # abfragen und auswerten (Node 22.18 oder neuer)
npm run places:test -- --offline   # nur aus dem Zwischenspeicher auswerten
npm run places:test -- --selftest  # Rechenfunktionen prüfen, braucht kein Netz
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
50,6478 / 12,1735), der bewusst ignoriert wird. **Die beiden Orte liegen nur etwa 6 km auseinander.** Bei 15 und
30 km überlappen sich die Umkreise daher fast vollständig. Der Unterschied „Stadt gegen Dorf" zeigt sich vor allem
im Umkreis von 5 km.

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
| Schwimm- und Freibäder | `leisure=water_park`; benannte `leisure=swimming_pool` (nicht privat); `leisure=sports_centre` mit `sport=swimming` |
| Freizeitparks | `tourism=theme_park`; `leisure=miniature_golf` |
| Zoos und Tierparks | `tourism=zoo`; `tourism=aquarium` |
| Museen | `tourism=museum` |
| Sehenswürdigkeiten | benannte: `tourism=attraction`, `tourism=viewpoint`, Aussichtstürme (`man_made=tower` + `tower:type=observation`), `historic=castle`, `historic=ruins` |
| Naturerlebnisse | Wanderwege (`route=hiking`); benannte Naturschutzgebiete und Seen/Teiche/Stauseen; `leisure=bathing_place`; `tourism=picnic_site` |
| Indoor-Angebote | `leisure=indoor_play`; Spielplätze mit `indoor=yes`; `leisure=trampoline_park`; Kletter-/Boulderhallen; `leisure=bowling_alley`; `leisure=ice_rink`; `leisure=escape_game`; `amenity=cinema`; `amenity=library` |

Kino und Bibliothek sind eine Ergänzung zur ursprünglichen Liste, weil sie bei schlechtem Wetter oft die
realistischsten Ziele sind. Hallenbäder stehen unter „Schwimm- und Freibäder" und zählen dort auch als Regen-Option.

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

## Stand der Messung

Aus der Cloud-Umgebung, in der das Skript entwickelt wurde, kam nur die kleine Ortsmitten-Abfrage durch:

- HTTPS zu `overpass-api.de` wurde in allen Versuchen nach etwa 7 s von der Gegenseite abgebrochen.
- Über HTTP (Port 80) kam ein großer Teil der Aufrufe nur mit „503 upstream connect error" zurück.
- Erreichte eine Umkreis-Abfrage Overpass, antwortete der Server mit 504 (zu beschäftigt), auch bei der kleinen
  5-km-Abfrage (nur IDs). Die Ortsmitten-Abfrage dauerte schon 5,6 s, der Server war also langsam.

Danach wurden zwei Ausweich-Server freigegeben (`overpass.kumi.systems`, `overpass.private.coffee`). Beide
antworteten kurz nach einer ersten normalen Statusantwort nur noch mit „500 Internal Server Error", auch auf der
reinen Statusseite, über etwa 10 Minuten. Die Versuche wurden dann eingestellt, um die öffentlichen Server nicht
unnötig zu belasten. Die Messung läuft stattdessen lokal auf einem normalen Rechner mit HTTPS. Das Skript ist von
den Verbindungsproblemen der Cloud-Umgebung nicht betroffen.

**Erster lokaler Lauf (Chromebook, HTTPS):** Die Verbindung klappte, und die Ortsmitten kamen in 4,7 s. Die erste
Umkreis-Abfrage endete aber nach 97 s mit Overpass' „runtime error: Query timed out". Der Grund: 29 einzelne
Kreis-Abfragen (`around`) in einer einzigen Anfrage waren für den ausgelasteten Server zu schwer, schon im
5-km-Umkreis. Daraufhin wurden die Abfragen neu gebaut (Rechteck, grobe Zeilen, mehrere kleine Abfragen,
Wanderwege getrennt, siehe oben). Ob die neue Form durchkommt, zeigt erst der nächste lokale Lauf.

## Ergebnisse

_Noch nicht gemessen._ Hier kommen nach dem Lauf die Tabellen aus `scripts/.cache/report.md` hin: je Testort
Anzahl pro Kategorie (5/15/30 km), Anteil mit Öffnungszeiten/Website, Unterarten und Beispiele.

## Einschätzung: Reicht das für 3 gute Vorschläge?

_Folgt nach der Messung._ Geprüft werden soll an typischen Fällen, zum Beispiel:

1. 2 Stunden, Regen, Kleinkind (Indoor und Bäder im 15-km-Umkreis).
2. Halber Tag, Sonne, Schulkind (Natur, Ausflugsziele im 30-km-Umkreis).
3. 1 Stunde, wenig Energie, Dorf (alles innerhalb von 5 km).

Kriterien: Gibt es für jeden Fall mindestens drei sinnvolle Orte? Reicht die Datenqualität (Öffnungszeiten),
um „geschlossen" auszuschließen? Wo muss der Fallback aus der CLAUDE.md greifen (Umkreis vergrößern, dann
Aktivitäten für zu Hause)?

## Grenzen dieses Tests

- Luftlinie statt Fahrzeit.
- OpenStreetMap ist von Freiwilligen gepflegt. Eine fehlende Öffnungszeit heißt nicht, dass der Ort keine hat.
  Bei frei zugänglichen Orten (Spielplatz, Park, Wanderweg) sind Öffnungszeiten ohnehin nicht zu erwarten.
- `opening_hours` wird hier nur gezählt, nicht ausgewertet. „Jetzt geöffnet?" zu berechnen ist Thema von
  M10 und braucht voraussichtlich eine Bibliothek (vorher Rückfrage).
- Keine Preise, keine Angaben zur Altersgrenze, keine Veranstaltungen (die kommen mit M2b/M11).
- Eine Momentaufnahme: Die Daten ändern sich laufend.
