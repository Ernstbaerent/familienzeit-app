# Vorschläge (M5, Wetter ab M6, Orte ab M10b)

Eltern wählen, wer dabei ist und wie viel Zeit sie haben. Die App zeigt genau 3 passende Ideen.
Seit M10b mischen sich Orte aus der Umgebung (Spielplätze, Bäder, Museen …) unter die Aktivitäten (Abschnitt „Orte in den Vorschlägen (M10b)“ unten).
Die Auswahl sitzt seit D2 direkt auf dem Start (siehe „Start und Auswahl“ unten).

## Ablauf in der App

| Bildschirm        | Datei                          | Zweck |
| ----------------- | ------------------------------ | ----- |
| Start mit Auswahl | `app/index.tsx`                | Kinder-Kacheln, Zeit (Pflicht), Energie (freiwillig), Hauptknopf „Was machen wir?“, Verlauf (nur mit Einträgen) |
| Eure Ideen        | `app/suggestions/results.tsx`  | Falls nötig zuerst der Wetter-Schritt (Erklär-Karte oder „Wie ist das Wetter?“), dann Kopf mit rundem Zurück-Knopf, feste Wetterzeile, genau 3 Karten, „Keine passt? Drei neue Ideen“ |

Der frühere Bildschirm „Was machen wir?“ (`app/suggestions/index.tsx`) ist entfallen (DESIGN.md, Entscheidung 1).

Die Auswahl reist als Parameter in der Bildschirm-Adresse zum Ergebnis (`selection.ts`). Das bleibt auf dem Gerät.
Das Wetter reist nicht mit. Der Start setzt den Parameter `weather` nie; er entsteht erst im Wetter-Schritt auf dem Ergebnis (Handwahl, im Bildschirm gehalten).
Sonst holt sich der Ergebnis-Bildschirm das Wetter selbst (`docs/weather.md`).
Eine Karte zeigt Bild, Illustration oder Farbfläche mit Kategorie-Pille, Titel, Kurzbeschreibung, Dauer und Altersspanne (Details: „Ergebnis mit Karten (D3)“ unten). Antippen öffnet die Detailansicht (M7 siehe `docs/history.md`, Design seit D4 siehe `docs/detail.md`).

## Wo was liegt

| Was                                        | Datei (in `src/features/`)            |
| ------------------------------------------ | ------------------------------------- |
| Zeit-Auswahl, Energie, Wetterlagen, Tageszeit | `suggestions/conditions.ts`        |
| Harte Ausschlüsse                          | `suggestions/exclusions.ts`           |
| Gewichtung (alle Gewichte in einer Tabelle)| `suggestions/scoring.ts`              |
| Dreiergruppen, Blättern, Tipps             | `suggestions/suggest.ts`              |
| Auswahl ↔ Bildschirm-Parameter             | `suggestions/selection.ts`            |
| Start: Bildschirm (nur Anzeige), Kachel, Platzhalter | `suggestions/StartScreen.tsx`, `ChildTile.tsx`, `MoodPlaceholder.tsx` |
| Start: Wann ist der Hauptknopf gesperrt, Auswahl für die Vorschläge bauen | `suggestions/startState.ts` |
| Start: Spalten bei großer Schrift und vielen Kindern | `suggestions/startLayout.ts` |
| Gewählte Kinder: bereinigen, merken, Zustand | `suggestions/selectedChildren.ts`, `selectedChildrenStorage.ts`, `SelectedChildrenContext.tsx` |
| Verlauf auswerten (kürzlich gemacht, Bewertung) | `suggestions/historyIndex.ts`, Punkte in `scoring.ts` |
| Ergebnis: Kopf, Karte, Bildbereich         | `suggestions/ResultsHeader.tsx`, `SuggestionCard.tsx`, `CardMedia.tsx` |
| Welches Bild eine Karte zeigt (Vorrang)    | `suggestions/cardImage.ts`, Illustration: `activities/illustrations.ts` |
| Altersspanne als Text                      | `activities/formatAgeRange.ts`        |
| Wetter und Standort (Abruf, Zwischenspeicher, Anzeige) | `weather/`, siehe `docs/weather.md` |
| Kategorie → Symbol                         | `activities/CategoryIcon.tsx`         |
| Dauer als Text, Text in der App-Sprache    | `activities/activityDisplay.ts`, `activities/formatDuration.ts` |
| Orte: Ausschlüsse, Gewichtung              | `suggestions/placeExclusions.ts`, `suggestions/placeScoring.ts` |
| Orte: Umkreis und Mischung der Dreiergruppen | `suggestions/mix.ts` (`suggestWithPlaces`) |
| Orte: Karte, Detailansicht, Quellenzeile   | `suggestions/PlaceCard.tsx`, `places/PlaceDetails.tsx` (`app/place/[id].tsx`), `places/PlacesSourceLine.tsx` |
| Ortsseite: Route, Website, Öffnungszeiten (M10c) | `places/routeLinks.ts`, `places/website.ts`, `places/hoursDisplay.ts`, `places/PlaceHours.tsx`, `places/PlaceWebsiteLink.tsx` |
| Orte: Entfernung, Anfahrt, Öffnungszeiten, Tageslicht | `places/travel.ts`, `places/openingHours.ts`, `places/sunset.ts` |
| Orte: Tabelle je Unterart (Mindestbesuch, Kosten, Energie, Themen, Trockenheit, Bild) | `places/placeKinds.ts` |
| Orte: Abruf, Zwischenspeicher, Provider    | `places/`, siehe `docs/orte.md`, „Orte in der App (M10b)“ |

Alles in `exclusions.ts`, `scoring.ts`, `suggest.ts`, `conditions.ts`, `selection.ts`, `startState.ts`, `startLayout.ts`, `selectedChildren.ts`, `cardImage.ts`,
`placeExclusions.ts`, `placeScoring.ts` und `mix.ts` sind reine Funktionen ohne UI.
Die Tests liegen daneben (`*.test.ts`).

## Start und Auswahl (D2)

Ein Bildschirm, ein Tipp bis zu den Vorschlägen (DESIGN.md, Entscheidungen 1 bis 7 und 22 bis 28). Von oben nach unten:
Wortmarke „miki“ (Platzhalter-Text bis zur Logo-Datei) mit der Pille „Verlauf“ (nur wenn es Einträge gibt), Stimmungsbild-Platzhalter
(Sand mit angeschnittener Sonne, für die Sprachausgabe versteckt), „Wer ist heute dabei?“, Zeit, Energie, Hauptknopf, Datenschutz-Satz.

**Kinder-Kacheln.** Ein Tipp auf die Kachel wählt das Kind aus oder ab. Gewählt zeigt ein Tinte-Rand und ein Tinte-Häkchen
(nicht Terrakotta). Das Stift-Symbol (mindestens 44 × 44) bearbeitet das Kind. Es ist **neben** der Kachel, nicht darin, damit die
Sprachausgabe beide Tippflächen getrennt erreicht. Beschriftung für die Sprachausgabe:
„Mila bearbeiten“, ohne Spitzname „Kind, 4 Jahre bearbeiten“ (en: „Edit Mila“, „Edit child, 4 years“). Dazu die Kachel „Kind hinzufügen“.

**Hauptknopf.** Gesperrt, solange **kein Kind gewählt ist oder keine Zeit** (`getStartIssues`). Energie ist freiwillig und nie vorbelegt.
Unter dem Knopf steht für jeden fehlenden Grund eine Zeile („Bitte wähle mindestens ein Kind.“, „Bitte wähle, wie viel Zeit ihr habt.“),
dieselben Sätze liest die Sprachausgabe als Hinweis am Knopf.

**Merken (Entscheidung 4).** Gemerkt werden **nur die gewählten Kinder**: lokal auf dem Gerät, Schlüssel `selectedChildren.v1`,
Inhalt `{ "version": 1, "childIds": [ … ] }` (nur zufällige IDs, keine Namen, keine Zeit, keine Energie). Zeit und Energie bleiben nur stehen,
solange der Start offen ist; zurück vom Ergebnis führt zum Start mit unveränderter Auswahl, weil der Start im Hintergrund offen bleibt.

| Fall | Ergebnis |
| ---- | -------- |
| Noch nie gewählt, kaputter Speicher, andere Version | Alle Kinder sind gewählt. Später angelegte Kinder zählen von selbst mit. |
| Gemerkte Kinder, einige gelöscht | Gelöschte fliegen raus, auch aus dem Speicher. |
| Alle gemerkten Kinder gelöscht oder zuletzt niemand gewählt | Wieder alle Kinder gewählt (der Start steht nie mit niemandem da). |
| Alle Kinder von Hand abgewählt | Bleibt leer, der Hauptknopf ist gesperrt. Beim nächsten Öffnen sind wieder alle gewählt. |
| Neues Kind angelegt (`app/children/new.tsx`) | Es wird gleich mitgewählt. |
| Speichern schlägt fehl | Die Wahl gilt für diese Sitzung weiter, nur das Merken fehlt (es ist eine Bequemlichkeit). |

**Wetter nach dem Tipp (Entscheidung 7 und 22).** Der Start zeigt kein Wetter und fragt nie nach dem Standort. Er lädt das Wetter höchstens vor,
wenn die Erlaubnis schon da ist (Details und Datenschutz: `docs/weather.md`, „Vorladen beim Öffnen des Starts“). Erst nach dem Hauptknopf
kommt bei Bedarf der Wetter-Schritt auf dem Ergebnis.

**Umbruch und große Schrift (Entscheidung 28).** Nichts wird abgeschnitten, kein Text hat `numberOfLines`. Aus Fensterbreite und
Systemschrift (`fontScale`) ergibt sich, wie viele Zellen nebeneinander passen (`startLayout.ts`): Kinder-Kacheln höchstens 3 pro Zeile, Zeit-Chips 2,
Energie-Kacheln 3. Bei vielen Kindern bricht die Reihe um. Wächst die Schrift, gibt es weniger Spalten, bis zu einer pro Zeile, und die Texte brechen um.
Die Energie ist eine schmale Kachel mit dem Symbol über dem Text und kleinerer Schrift, damit auch das längste englische Wort („Energetic“) hineinpasst.

## Ergebnis mit Karten (D3)

„Eure Ideen“ (`app/suggestions/results.tsx`) nach dem PDF, Bildschirm 02 (DESIGN.md, Entscheidungen 8 bis 12 und 21, Zusätze 29 bis 33). Von oben nach unten:

1. **Kopf** (`ResultsHeader`): runder Zurück-Knopf (weiß mit feinem Rand, mindestens 44 × 44, für die Sprachausgabe „Zurück zur Auswahl“, bei rechts-nach-links gespiegelt)
   und der Titel „Eure Ideen“. Kein Mischen-Symbol. Die Navigationsleiste des Systems ist hier aus (`headerShown: false`), Android-Zurücktaste und Wischgeste bleiben.
2. **Feste Wetterzeile** (`WeatherBar`): Sand-Fläche mit Symbol, Wettertext und „Quelle: Deutscher Wetterdienst“, bleibt beim Scrollen stehen.
   Daneben der Knopf „Ändern“ (Details: `docs/weather.md`). Beim Laden zeigt sie ein Lade-Symbol und „Wetter wird geprüft …“ (für die Sprachausgabe als „beschäftigt“ markiert), der Kopf bleibt benutzbar.
3. **Warnung, „Standort erlauben“, „Wetter ändern“** (`WeatherPanel`): scrollen mit den Karten.
4. **Genau drei Karten** (`SuggestionCard`).
5. **„Keine passt? Drei neue Ideen“** (Nebenknopf in Sand und Tinte, nicht Terrakotta; Terrakotta ist dem Hauptknopf vorbehalten). Er erscheint nur, wenn es weitere Ideen gibt. Der Durchlauf mit Hinweis nach der letzten Gruppe bleibt.
6. **Weniger als drei Vorschläge:** die vorhandenen mit freundlichem Hinweis wie bisher (ohne den Knopf). Der Verlauf bleibt beim Öffnen eingefroren.

**Der Wetter-Schritt** (Erklär-Karte, „Wie ist das Wetter?“) behält seine Funktion und steht im selben Rahmen (Kopf mit Zurück-Knopf, ohne Wetterzeile), in Kartenform
(weiß, Radius 22), mit „Standort erlauben“ als Hauptknopf. Links sind Tinte mit Unterstreichung (nicht Terrakotta).

**Die Karte** (Radius 22, weiß, weicher Schatten): oben der Bildbereich im Seitenverhältnis 2:1 mit der weißen **Kategorie-Pille** (Symbol und Name), darunter Titel (Literata),
Kurzbeschreibung, Dauer und Altersspanne („3–8 Jahre“, genau ein Alter „5 Jahre“, 0 bis 16 „Alle Alter“). Für die Sprachausgabe ist die ganze Karte **ein Knopf** mit einer
Beschriftung, die mit dem Titel beginnt („Waldspaziergang. Natur, 30–60 Min., 3–8 Jahre. Ein Spaziergang …“) und dem Hinweis „Öffnet die Details“. Der Bildbereich ist Dekoration.
Der Schatten liegt am äußeren Element, das Zuschneiden der Ecken am inneren (sonst ginge der Schatten verloren).

### Welches Bild die Karte zeigt (Zusatz 45)

Es gibt keine Stock-Fotos mehr, Bilder werden selbst gezeichnet (DESIGN.md, Zusatz 45). Jede Karte hat eine Kette von Stufen, bestes Bild zuerst. **Alle Fälle haben dieselbe Form und Höhe** (Seitenverhältnis 2:1), mit derselben Pille:

1. **`image` der Aktivität** (Web-Adresse, nur `https://`, `cardImage.ts`). Lädt sie nicht (`onError`), zeigt die Karte die nächste Stufe.
2. **Illustration der Aktivität** (gezeichnet, SVG, gebündelt, Zuordnung nur in `activities/illustrations.ts`, Regeln `docs/design/ILLUSTRATIONEN.md`). `CardMedia` schiebt sie nach dem `image` ein. Heute haben drei Aktivitäten eine; M9b zeichnet die übrigen.
3. **Farbfläche der Kategorie** (heute der Normalfall) mit großem, dünnem, am unteren Rand angeschnittenem Symbol (`categoryIcons`) und einem weichen großen Kreis. Farben: `docs/theme.md`, „Kategorie-Farben“.
   Das Symbol ist Dekoration und bleibt bei großer Systemschrift gleich groß (die Skalierung bleibt an).

**Datenschutz-Hinweis zu `image` (Zusatz 35):** Eine Web-Adresse in `image` lädt das Bild beim Anzeigen von einem Server (die IP-Adresse geht dorthin). Deshalb darf `image` **nur Adressen von unserem eigenen Speicher** laden (Allowlist), damit keine IP-Adressen an fremde Server gehen.
Seit M8 gibt es die Allowlist (`activities/imageAllowlist.ts`): Erlaubt sind nur Adressen, die mit `<EXPO_PUBLIC_SUPABASE_URL>/storage/v1/object/public/` beginnen (Supabase Storage unseres Projekts, Details `docs/supabase.md`).
Sie gilt an drei Stellen: beim Laden (`prepareActivities` lässt ein fremdes Bild weg, die Aktivität bleibt), in der Prüfung der Daten (`parseActivity` und `npm run activities:check`, dort ein Fehler) und beim Anzeigen (`cardImage.ts`). Ohne Projekt-Adresse ist kein Bild erlaubt. Bisher hat keine Aktivität ein `image`.

## Harte Ausschlüsse (`exclusions.ts`)

Nur Sicherheit und Machbarkeit. Diese Regeln werden **nie** aufgeweicht.

| Grund       | Regel |
| ----------- | ----- |
| `age`       | Die Aktivität muss für **jedes** ausgewählte Kind passen: `ageMin` ≤ Alter ≤ `ageMax`, Alter in vollen Jahren. |
| `time`      | `durationMin` ist länger als die verfügbare Zeit. Passt die kürzeste Variante, ist die Aktivität machbar. Aktivitäten haben keine Anfahrt (Orte schon, siehe unten). |
| `dayPart`   | Die Aktivität hat `dayParts` und die Tageszeit ist nicht dabei. Ohne `dayParts` passt sie immer. |
| `month`     | Die Aktivität hat `months` und der heutige Monat ist nicht dabei. Ohne `months` passt sie das ganze Jahr. Der Monat kommt aus dem Datum (`request.now`), es gibt keine Auswahl dafür. |
| `danger`    | Gewitter **oder amtliche Warnung** (Gewitter, Sturm, Orkan, andere Unwetterwarnung ab Stufe 3) und `setting: 'outdoor'`. `both` bleibt, weil man es drinnen machen kann. |
| `notDry`    | `weather.needsDry` und es regnet, gewittert oder schneit. |
| `notApproved` | Sicherheitsnetz: nur `status: 'approved'` (filtert `prepareActivities()` schon). |

**Uhrzeit-Grenzen der Tageszeiten** (`getDayPart`): Morgen 5:00–11:59, Nachmittag 12:00–16:59, Abend 17:00–4:59.
Die Tageszeit kommt automatisch aus der Uhrzeit beim Öffnen von „Eure Ideen“ (`toSuggestionRequest`), es gibt keine Auswahl dafür.

**Zeit-Auswahl:** 30 Min., 1 Std., 2 Std., halber Tag (= 4 Std.).

## Gewichtung (`scoring.ts`)

Ändert nur die Reihenfolge, schließt nie aus. Höhere Punktzahl = weiter vorn.

| Was | Punkte |
| --- | ------ |
| Thema, das mindestens ein ausgewähltes Kind mag | +3 je Thema |
| Thema, das mindestens ein ausgewähltes Kind nicht mag | −4 je Thema |
| Sonne und `betterInSun` | +2 |
| Hitze (ab 30 °C) oder Frost (0 °C und kälter) im Zeitfenster | `outdoor` −4, `both` −1, drinnen 0 |
| Mehrere Kinder dabei und `siblingFriendly` | +2 |
| Kosten | −1 je Stufe |
| Eltern müde | `low` +2, `high` −4 |
| Eltern normal | `high` −1 |
| Eltern fit | `high` +1 |
| Energie nicht angegeben | 0 |
| Kürzlich gemacht (Verlauf, ab M7) | Tag 0–3 −10, danach linear abklingend bis Tag 28 |
| Daumen runter für diese Aktivität (Verlauf) | −20, 90 Tage lang |
| Daumen hoch für diese Aktivität (Verlauf) | +3 ab Tag 14, bis Tag 179 |
| Daumen hoch für die Kategorie (Verlauf) | +1, bis Tag 179 |

Bei Gleichstand bleibt die Reihenfolge aus den Daten.
Der Verlauf (`request.history`, freiwillig) ändert wie alles hier **nur die Reihenfolge** und schließt nie etwas aus.
Tage zählen als Kalendertage nach Ortszeit. Alle Regeln und Zahlen: `docs/history.md`.
Die Entfernung gilt nur für Orte (eigene Gewichtung, siehe „Orte in den Vorschlägen (M10b)“).

## Abwechslung und „Keine passt? Drei neue Ideen“ (`suggest.ts`)

- Die passenden Aktivitäten werden in **Dreiergruppen** aufgeteilt. Pro Platz gewinnt die höchste Punktzahl,
  aber jede Aktivität derselben Kategorie, die schon in der Gruppe ist, bringt **−5**. So sind die 3 Vorschläge
  meist aus verschiedenen Kategorien. Eine deutliche Abneigung wird dadurch aber nicht nach vorn geholt.
- **Immer genau 3:** Ist die letzte Gruppe nicht voll, wird sie mit den besten Ideen aus den anderen Gruppen aufgefüllt.
- **„Keine passt? Drei neue Ideen“** zeigt die nächste Gruppe (vor D3: „Andere Vorschläge“). Nach der letzten geht es mit einem Hinweis wieder von vorn los
  (kein Endlos-Feed). Gibt es nur eine Gruppe, fehlt der Knopf.
- **Weniger als 3 passende Ideen:** Die App zeigt die vorhandenen und einen freundlichen Hinweis. Ein Tipp
  („weniger Kinder“, „mehr Zeit“) erscheint nur, wenn er wirklich zu mehr Ideen führt (`getTips`).
  Sonst steht dort, dass laufend neue Ideen dazukommen.

## Wetter und Tageszeit (ab M6)

Die Vorschlagslogik bekommt über `SuggestionRequest` die Wetterlage (`weather`, jetzt auch `snow`), die Temperatur im Zeitfenster
(`temperature`, freiwillig) und ob eine amtliche Warnung gilt (`severeWarning`, freiwillig). Woher das kommt, steht in `docs/weather.md`.
Die Logik selbst bleibt reine Funktionen ohne Internet und Standort.

- **Wetterlage:** `sunny`, `cloudy`, `rain`, `thunderstorm`, `snow`. Schnee ist nicht trocken (`needsDry` fällt weg), Aktivitäten, die Schnee brauchen, folgen mit M6b.
- **Temperatur:** nur Gewichtung (siehe oben), nie ein Ausschluss.
- **Warnung:** schließt draußen aus (`danger`), auch wenn das Wetter gerade ruhig ist.

## Orte in den Vorschlägen (M10b)

Woher die Orte kommen (Kacheln aus Supabase, Zwischenspeicher, Fehlerfälle, Datenschutz): `docs/orte.md`, „Orte in der App (M10b)“.
Hier stehen die Regeln der Vorschlagslogik. Alle Zahlen stehen in einer Tabelle im Code (`placeWeights`, `travelRules`, `radiusRule`, `placeSlots`, `placeKinds`).

**Orte und Aktivitäten werden getrennt sortiert und erst danach gemischt.** Die Punkte der Orte sind deshalb nicht mit denen der Aktivitäten vergleichbar.
Ohne passende Orte (kein Standort, keine Daten, alles ausgeschlossen) entsteht **genau dasselbe wie vor M10b** (Test in `mix.test.ts`).

### Entfernung und Anfahrt (`places/travel.ts`)

- **Luftlinie** vom gerundeten Standort (Haversine-Formel). Es gibt keinen Routendienst.
- **Unter 1 km zu Fuß** mit 5 km/h, ohne Aufschlag. **Ab 1 km mit dem Auto:** Luftlinie × 1,3 bei 45 km/h plus 5 Minuten je Strecke. Minuten werden aufgerundet.
- **Hin und zurück** zählt zur verfügbaren Zeit (siehe `time` unten). Beispiele: 0,5 km = 2 × 6 Min., 2 km = 2 × 9 Min., 10 km = 2 × 23 Min., 30 km = 2 × 57 Min.

### Entfernung und Rundung

Der Standort wird beim Holen sofort auf **2 Nachkommastellen gerundet** (etwa 1 km, Datenschutz-Regel der CLAUDE.md, `weather/location.ts`). Von diesem gerundeten Punkt aus rechnet die App.
Der echte Standort liegt irgendwo in einer Zelle von 0,01° × 0,01° (in Deutschland etwa 1,1 km × 0,7 km) um ihn herum, also **höchstens etwa 0,7 km** daneben
(Ecke der Zelle, im Test nachgerechnet). Folgen:

- Jede Entfernung kann um bis zu etwa 0,7 km zu groß oder zu klein sein. Die Karte zeigt deshalb nur ganze km („ca. 4 km“), unter 1 km „unter 1 km“, und die Detailansicht sagt dazu,
  dass die Entfernung geschätzt ist.
- Die Grenze „unter 1 km zu Fuß“ ist unscharf: Ein Spielplatz 1,3 km entfernt kann als „zu Fuß“ gelten und umgekehrt. Bei 5 km/h macht das höchstens etwa 8 Minuten je Strecke aus.
- Die Umkreis-Stufen (5, 15, 30 km) verschieben sich entsprechend um bis zu 0,7 km. Für die Auswahl ist das unerheblich.
- Genauer rechnen hieße, den genauen Standort zu benutzen. Das will die Datenschutz-Regel nicht, und für „Was machen wir heute?“ reicht die Schätzung.

### Harte Ausschlüsse für Orte (`placeExclusions.ts`)

Nur Sicherheit und Machbarkeit, nie aufgeweicht (wie bei Aktivitäten).

| Grund | Regel |
| --- | --- |
| `time` | Anfahrt hin und zurück plus **Mindestbesuch der Unterart** (`minVisitMinutes` in `placeKinds.ts`) ist länger als die verfügbare Zeit. |
| `season` | Der Ort hat eine Saison (`months`, z. B. Freibad Mai bis September) und der Monat ist nicht dabei. |
| `danger` | Gewitter oder amtliche Warnung und der Ort ist draußen (`outdoor`). `both` bleibt (z. B. Burg mit Innenräumen, Kombibad). |
| `notDry` | Die Unterart braucht Trockenheit (`needsDry`: Spielplatz, Minigolf, Freizeitpark, Aussichtsturm, Aussichtspunkt, Rastplatz) und es regnet, gewittert oder schneit. |
| `closed` | **Nur mit festem Wochenplan** (`hours_kind = plan`, ohne Feiertagsregel): bei Ankunft geschlossen oder schließt vor dem Ende des Mindestbesuchs. Über Mitternacht wird am nächsten Tag weitergelesen. |
| `dark` | Draußen (`outdoor`) und das Ende des Mindestbesuchs liegt nach dem Tageslicht laut Tabelle (siehe „Dunkelheit“). |

**Unbekannte Öffnungszeiten schließen nie aus** (`complex`, `invalid`, keine Angabe; Erkenntnis 1 aus M2a). **Ein Plan mit Feiertagsregel (`ph`) schließt ebenfalls nie aus**:
Die App kennt keine Feiertage, an einem Feiertag könnte der Ort anders offen haben (Entscheidung von Clemens). Beide zeigen „Öffnungszeiten vorher prüfen“.
Den Wochenplan liest die App mit eigenem kleinem Code (`places/openingHours.ts`), die Bibliothek `opening_hours` läuft nur im Import.
Ankunft = jetzt plus eine Strecke Anfahrt. Gerechnet wird in der Ortszeit des Handys.

### Dunkelheit (`places/sunset.ts`)

Ohne Bibliothek und ohne Sonnendaten aus dem Netz: eine **feste Tabelle mit einem Wert je Monat** („Tageslicht bis“). Näherung:

1. Für jeden Tag des Monats und 19 Punkte an den Rändern Deutschlands (Sylt, Flensburg, Fehmarn, Rügen, Usedom, Oder, Görlitz, Zittau, Vogtland, Passau, Berchtesgaden, Oberstdorf, Lindau, Lörrach, Aachen, Selfkant, Emden, Borkum …)
   den Sonnenuntergang mit der Näherungsformel der NOAA berechnen, in Ortszeit (Sommer- und Winterzeit). Der früheste Wert des Monats zählt (im Winter im Nordosten, im Sommer im Südosten).
2. Auf 5 Minuten abrunden und **15 Minuten Reserve** abziehen.

| Monat | Jan | Feb | Mär | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tageslicht bis | 15:30 | 16:25 | 17:20 | 19:15 | 20:00 | 20:40 | 20:30 | 19:35 | 18:25 | 16:15 | 15:30 | 15:25 |

- Jeder Monat gilt mit seinem frühesten Tag (März: 1. März, noch Winterzeit; Oktober: 31. Oktober, schon Winterzeit). Am Monatsende ist es deshalb oft länger hell als die Tabelle sagt, Ende März sogar gut 2 Stunden (Sommerzeit).
- Im Westen ist es im Winter bis zu etwa einer Stunde länger hell als im Nordosten. Das ist gewollt: lieber zu früh als im Dunkeln.
- Ein Besuch, der erst am nächsten Tag endet, gilt immer als dunkel. Den Morgen (vor Sonnenaufgang) prüft die Tabelle nicht.
- Der Test `places/sunset.test.ts` rechnet die Formel für 2026 bis 2030 nach: Die Tabelle liegt jeden Tag mindestens 10 Minuten vor dem frühesten Sonnenuntergang und höchstens 35 Minuten davor.

### Gewichtung der Orte (`placeScoring.ts`, `placeWeights`)

Startwerte aus dem Plan zu M10, von Clemens bestätigt.

| Was | Punkte |
| --- | --- |
| Kindertauglichkeit (`kid_weight`) 3 / 2 / 1 / 0 | +4 / +2 / 0 / −3 |
| Entfernung (Luftlinie) | −0,25 je km, doppelt, wenn ein ausgewähltes Kind „lange Fahrten“ nicht mag |
| Sonne und draußen | +2 |
| Regen, Schnee oder Gewitter und drinnen | +3 |
| Regen und draußen | −4 |
| Hitze (ab 30 °C) und draußen | −4; **Bad und Badestelle stattdessen +3** |
| Frost (0 °C und kälter) und draußen | −4 |
| Fester Wochenplan und bei Ankunft offen | +1 |
| Thema der Unterart, das ein Kind mag / nicht mag | +3 / −4 je Thema |
| Kosten der Unterart | −1 je Stufe |
| Energie der Eltern | wie bei Aktivitäten (müde: wenig +2, viel −4; normal: viel −1; fit: viel +1) |
| Tägliche Streuung | 0 bis unter 1, stabil aus Datum und Ort (gleicher Tag = gleiche Reihenfolge) |

**Kinos** sind neutral (keine Themen, Kindertauglichkeit 1) und zeigen „Programm und Altersfreigabe vorher prüfen“. Die Streuung entfällt, sobald Orte in den Verlauf kommen (M10e).

**Tabelle je Unterart** (`placeKinds.ts`, Startwerte von Clemens bestätigt; Mindestbesuch in Min. · Kosten · Energie der Eltern · Themen · braucht Trockenheit):

| Unterart | Werte |
| --- | --- |
| Spielplatz | 30 · 0 · wenig · Bewegung · ja |
| Park | 30 · 0 · wenig · Natur und Tiere |
| Freibad, Kombibad, Hallenbad | 90 · 1 · viel · Wasser, Bewegung |
| Spaßbad | 120 · 2 · viel · Wasser, Bewegung |
| Badestelle | 60 · 0 · viel · Wasser, Natur und Tiere |
| Freizeitpark | 180 · 2 · viel · Ausflüge, laute Orte, viele Menschen · ja |
| Minigolf | 45 · 1 · mittel · Spiele · ja |
| Zoo | 90 · 2 · mittel · Natur und Tiere |
| Aquarium | 60 · 2 · mittel · Natur und Tiere |
| Museum | 60 · 1 · mittel · Ausflüge |
| Burg | 60 · 1 · mittel · Geschichten, Ausflüge |
| Aussichtsturm | 30 · 1 · mittel · Ausflüge · ja |
| Ruine | 30 · 0 · wenig · Ausflüge |
| Aussichtspunkt | 20 · 0 · wenig · Ausflüge · ja |
| Sehenswürdigkeit | 20 · 0 · wenig · Ausflüge |
| Naturschutzgebiet, See | 45 · 0 · mittel · Natur und Tiere |
| Teich | 20 · 0 · wenig · Natur und Tiere |
| Rastplatz | 30 · 0 · wenig · Natur und Tiere · ja |
| Indoorspielplatz | 90 · 2 · wenig · Bewegung, laute Orte, viele Menschen |
| Trampolinhalle | 60 · 2 · mittel · Bewegung, laute Orte |
| Kletterhalle | 60 · 2 · viel · Bewegung |
| Eisbahn | 60 · 1 · viel · Bewegung |
| Bowling | 60 · 2 · wenig · Spiele, laute Orte |
| Kino | 100 · 2 · wenig · keine Themen |
| Bibliothek | 30 · 0 · wenig · Geschichten |

### Umkreis (`mix.ts`, `radiusRule`)

Es gilt die **kleinste Stufe aus 5, 15 und 30 km**, in der mindestens **2 nicht ausgeschlossene Orte mit Kindertauglichkeit 2 oder 3** liegen. Sonst 30 km.
Orte außerhalb der gewählten Stufe kommen gar nicht in Frage, über 30 km nie. Ist der Umkreis größer als 5 km und steht auf der Seite ein Ort, erscheint über den Karten
„Umkreis auf 15 km erweitert“ (bzw. 30 km; en „Search radius widened to 15 km“).

### Zusammenstellung der drei Karten (`mix.ts`, `placeSlots`)

| Fall | Orte je Dreiergruppe |
| --- | --- |
| bis 1 Std. Zeit | höchstens 1 |
| ab 2 Std. | bis zu 2 (der zweite nur mit Kindertauglichkeit 2 oder 3) |
| Regen, Gewitter oder Schnee | höchstens 1 (auch mit viel Zeit) |

- Zwei Orte einer Gruppe sind aus **verschiedenen Kategorien** (nicht zwei Spielplätze). Jeder Ort kommt nur einmal vor.
- **Immer mindestens 1 Aktivität** je Gruppe. Gruppen gibt es, solange Aktivitäten übrig sind; gehen die Orte aus, bestehen die weiteren Gruppen nur aus Aktivitäten.
- Reihenfolge in der Gruppe: abwechselnd, die größere Gruppe außen (Ort – Aktivität – Ort oder Aktivität – Ort – Aktivität).
- Die Aktivitäten werden wie bisher ausgewählt (Abwechslung −5 je gleicher Kategorie, Verlauf, Gewichtung).
- **Garantie vor Mischregeln** (Entscheidung von Clemens): Fehlen schon für die erste Gruppe Aktivitäten (z. B. Baby und Teenager, nur eine Idee passt), füllen weitere Orte auf 3 auf,
  auch über die Grenze „bei Nässe höchstens 1“. Passt gar keine Aktivität, aber es gibt Orte, gibt es eine Gruppe mit 3 Orten. Ist die letzte Gruppe nicht voll, wird sie wie bisher aufgefüllt,
  zuerst mit Aktivitäten aus den anderen Gruppen, dann mit Orten. Die Sicherheit (harte Ausschlüsse) wird dabei nie aufgeweicht.
- „Keine passt? Drei neue Ideen“, der Durchlauf mit Hinweis „von vorn“ und das Einfrieren beim Öffnen bleiben. `matchCount` zählt Aktivitäten und Orte; der Hinweis bei weniger als 3 erscheint
  also nur, wenn auch mit Orten weniger als 3 passen. Die Tipps („weniger Kinder“, „mehr Zeit“) zählen weiter nur Aktivitäten.

### Auf „Eure Ideen“

- Die Orte werden besorgt, sobald der Standort erlaubt ist (auch direkt nach „Standort erlauben“ im Wetter-Schritt). Ohne Standort (Handwahl des Wetters) gibt es nur Aktivitäten, ohne Warten.
- Die App wartet **gleichzeitig mit dem Wetter höchstens 4 Sekunden** auf die Orte (`placesWaitMs` in `app/suggestions/results.tsx`). Ist das Wetter schon da, steht so lange die feste Wetterzeile und darunter
  ruhig „Orte in der Nähe werden gesucht …“ (für die Sprachausgabe „beschäftigt“). Danach zeigt sie nur Aktivitäten.
- Danach sind die Orte für diese Ansicht **eingefroren** (wie Aktivitäten und Verlauf): Kommen sie später an, gelten sie erst beim nächsten Öffnen. Eine Handwahl des Wetters mischt dieselben Orte neu.
- **Ortskarte** (`PlaceCard`): Bildbereich wie bei den Aktivitäten (Farbfläche mit großem Symbol, weiße Pille mit der Unterart, z. B. „Hallenbad“; Farben und Symbole: `docs/theme.md`),
  Titel (Name, sonst „Spielplatz in Pohlitz“, sonst „Spielplatz, Elsterstraße“, sonst „Spielplatz“), darunter „ca. 4 km · Pohlitz“ (den Ortsteil nur, wenn er nicht schon im Titel steht),
  bei Bedarf „Öffnungszeiten vorher prüfen“ und bei Kinos „Programm und Altersfreigabe vorher prüfen“. Für die Sprachausgabe ist die Karte ein Knopf mit einer Beschriftung
  („Stadtbibliothek Musterstadt. Bibliothek, unter 1 km. Öffnungszeiten vorher prüfen“).
- **Quellenzeile** unter den Karten, nur wenn auf der Seite ein Ort steht: „Orte: © OpenStreetMap-Mitwirkende“ (unterstrichen, Link auf openstreetmap.org/copyright) und darunter
  „Daten unter der Open Database License (ODbL)“, bei älteren Kacheln ohne Netz zusätzlich „Stand: vor n Tagen“. Tippfläche mindestens 44.
- **Detailansicht eines Ortes** (`app/place/[id].tsx`, seit M10c): Zurück-Knopf, Bildbereich ohne Pille, Unterart, Titel, Adresse („Elsterstraße, Pohlitz“, nur mit Straße und Ort),
  Entfernung („ca. 4 km Luftlinie“), Ortsteil, Abschnitt „Öffnungszeiten“ (fester Wochenplan als Liste mit „heute“, sonst „Öffnungszeiten vorher prüfen“ und der Rohtext; Saison; Kino-Hinweis),
  „Website öffnen“ (nur mit gültiger Adresse), der Satz zur geschätzten Entfernung und die Quellenangabe. **Fest unten der Hauptknopf „Route öffnen“**, der Inhalt scrollt (wie bei den Ideen).
  **Keine Fahrzeit:** Die geschätzte Anfahrt zählt nur für die Ausschlüsse; die Karten-App hinter „Route öffnen“ weiß es besser. Kein Verlauf für Orte (M10e).
  Links, Menü und Quellen: `docs/orte.md`, „Route und Website (M10c)“.
- **„Route öffnen“:** auf dem iPhone ein Auswahlmenü (Apple Karten, Google Maps, OpenStreetMap (Karte)), auf Android die Auswahl „Öffnen mit …“ des Systems. Unter 1 km zu Fuß, sonst Auto.
  **Auf Android öffnet sich die Karten-App sofort, wenn sie als Standard gesetzt ist.** Das ist eine Einstellung des Handys, kein Fehler. (Zurücksetzen: Android-Einstellungen → Apps → die Karten-App → „Standardmäßig öffnen“ → Standardeinstellungen löschen; die Bezeichnungen unterscheiden sich je nach Handy.)

### Testen

- `mix.test.ts`: Umkreis, Mischung (1 Std., 2 Std., Regen, verschiedene Kategorien, zweiter Ort), Garantie (eine Aktivität, keine Aktivität, nur 2 insgesamt, letzte Gruppe), ohne Orte genau wie bisher,
  und mit den **echten Aktivitäten und den ausgedachten Testorten** (`scripts/fixtures/places-greiz.json`) für 5 Monate × 3 Tageszeiten × 5 Wetterlagen × 4 Zeiten × mit/ohne Warnung × ohne/leere/volle Orte
  (1 800 Fälle): immer 3 Karten ohne Doppelte, wenn so viele passen, und bei Gefahr nie ein Ort draußen.
- `placeRules.test.ts`: jeder Ausschluss einzeln und jede Zeile der Gewichtung. `ResultsScreen.test.tsx`: Karten, Quellenzeile, Umkreis-Hinweis, 4-Sekunden-Frist, Einfrieren, Englisch.
- Seit M10c: `routeLinks.test.ts` (alle Links, Android und iPhone, zu Fuß/Auto, Dezimalstellen, Sonderzeichen), `website.test.ts`, `hoursDisplay.test.ts` (Liste, heute, über Mitternacht, Saison, de/en) und `PlaceScreen.test.tsx` (Knopf, Menü, Website, Öffnungszeiten auf der Seite).

Von Hand (mit Standort, Supabase eingerichtet, Orte importiert): Start öffnen, Kind und „2 Std.“ wählen, „Was machen wir?“. Erwartet: Unter den drei Karten sind bis zu zwei Orte (Ort – Aktivität – Ort),
darunter die Zeile „Orte: © OpenStreetMap-Mitwirkende“. „Wetter ändern“ auf Regen: höchstens ein Ort, kein Spielplatz. „1 Std.“: höchstens ein Ort. Nach Einbruch der Dunkelheit (Tabelle oben) keine Orte draußen.
Ortskarte antippen: Detailansicht mit Entfernung. Flugmodus und neu öffnen: Die Orte kommen aus dem Speicher.
Ortsseite (M10c, alles in Expo Go testbar): „Route öffnen“ antippen. Android: Auswahl „Öffnen mit …“ (oder sofort die Standard-Karten-App), das Ziel ist markiert (mit dem Namen, wenn die Karten-App die Beschriftung zeigt).
iPhone: Menü mit Apple Karten, Google Maps, OpenStreetMap (Karte) und Abbrechen; Apple Karten und Google Maps zeigen die Route (Google Maps ohne App im Browser), unter 1 km zu Fuß, sonst mit dem Auto; OpenStreetMap zeigt die Karte mit Markierung.
Ein Ort mit Website: „Website öffnen“ öffnet den Browser. Ein Ort mit festem Wochenplan: Liste Montag bis Sonntag, heute hervorgehoben. Auf Englisch umstellen: Wochentage und Menü auf Englisch.

## Kategorie-Symbole

`src/features/activities/CategoryIcon.tsx` ist die **einzige** Stelle mit der Zuordnung Kategorie → Symbol.
Wir nutzen Ionicons aus `@expo/vector-icons`, nur die Linien-Varianten (`…-outline`). Größe kommt aus `iconSize`,
Farbe aus `colors.icon` (beides in `src/lib/theme.ts`).
Alle Symbole zum Aussuchen: <https://icons.expo.fyi> (Filter „Ionicons“).
Eigene Symbole von Ani: nur diese Datei ändern, die Bildschirme nutzen nur `<CategoryIcon category=… />`.

## Testen

```bash
npm test               # Jest: Vorschlagslogik und Hilfsfunktionen
npx tsc --noEmit
npx expo lint
```

`suggest.test.ts` prüft die Regeln einzeln, typische Fälle mit einem festen Mini-Katalog
(Regen + Kleinkind, Gewitter, 30 Min. + müde, Baby + Teenager, Abend, Interessen und Abneigungen)
und alle harten Ausschlüsse mit den echten Aktivitäten aus `data/` für über tausend Kombinationen.
Ein weiterer Test spielt mit den echten Aktivitäten alle 12 Monate durch: kein Vorschlag außerhalb seiner Monate,
und für ein Kind mit 5 Jahren und 1 Stunde gibt es in jedem Monat, bei jedem Wetter (auch Schnee), mit und ohne Warnung und zu jeder Tageszeit mindestens 3 Ideen.
Diese letzten Tests prüfen nur Regeln, keine einzelnen IDs. Sie laufen also auch, wenn sich die Aktivitäten ändern.
Der Verlauf hat eigene Tests in `history.test.ts` (Zahlen, Grenzen, Kalendertage mit Zeitumstellung, Garantie „genau 3“ bei vollem Verlauf).

Von Hand: `npx expo start`, mit Expo Go öffnen. Auf dem Start mindestens ein Kind und eine Zeit wählen, dann „Was machen wir?“ antippen:

1. **Hauptknopf:** Er ist gesperrt, solange keine Zeit gewählt ist. Der Hinweis darunter sagt, was fehlt. Alle Kinder abwählen: gesperrt mit „Bitte wähle mindestens ein Kind.“
2. **Merken:** Ein Kind abwählen, die App ganz schließen und neu öffnen: Dasselbe Kind ist wieder abgewählt, Zeit und Energie sind leer.
3. **Stift:** Er öffnet „Kind bearbeiten“. Ein Tipp auf die Kachel wählt nur aus oder ab. Ein Kind löschen: Es verschwindet vom Start und aus der Auswahl.
4. **Zurück:** Auf „Eure Ideen“ zurück tippen: Der Start ist unverändert (Kinder, Zeit, Energie).
5. **Große Schrift:** In den Handy-Einstellungen die Schrift auf die größte Stufe stellen, Start öffnen: Die Kacheln stehen untereinander, nichts ist abgeschnitten (auch mit sieben Kindern und auf Englisch prüfen).

Das Wetter lässt sich mit „Ändern“ (öffnet „Wetter ändern“) auf „Eure Ideen“
(oder ohne Standort mit „Wie ist das Wetter?“) selbst wählen, z. B. ausprobieren (Wetter und Standort: `docs/weather.md`):

- Gewitter: keine Ideen für draußen (Pfützen-Forscher, Waldtag mit Picknick, Draußen-Olympiade, Schnitzeljagd fehlen)
- Abend + Kind ab 6: „Sterne beobachten“ taucht auf (nur September bis März), morgens nie
- Monate: Im Oktober können „Kastanientiere“, „Laterne aus einer Papiertüte“ und „Bratäpfel“ kommen,
  „Plätzchen ausstechen“ und „Ostereier färben“ nie (Monat kommt aus dem Datum des Handys)
- Schnee: nichts, was trocken sein muss (z. B. Picknick); sonst bleibt alles möglich
- Baby und Teenager zusammen: Hinweis statt Vorschläge
- „Keine passt? Drei neue Ideen“ mehrmals: nach der letzten Gruppe kommt der Hinweis „von vorn“
