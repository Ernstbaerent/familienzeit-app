# Vorschläge (M5, Wetter ab M6)

Eltern wählen, wer dabei ist und wie viel Zeit sie haben. Die App zeigt genau 3 passende Ideen.
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
Eine Karte zeigt Foto oder Farbfläche mit Kategorie-Pille, Titel, Kurzbeschreibung, Dauer und Altersspanne (Details: „Ergebnis mit Karten (D3)“ unten). Antippen öffnet die Detailansicht (M7, siehe `docs/history.md`).

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
| Welches Bild eine Karte zeigt (Vorrang, stabile Zuordnung) | `suggestions/cardImage.ts` |
| Liste der Kategorie-Fotos (erzeugt)        | `activities/categoryPhotos.generated.ts`, `activities/categoryPhotoFiles.ts`, Skript `scripts/index-photos.ts` |
| Altersspanne als Text                      | `activities/formatAgeRange.ts`        |
| Wetter und Standort (Abruf, Zwischenspeicher, Anzeige) | `weather/`, siehe `docs/weather.md` |
| Kategorie → Symbol                         | `activities/CategoryIcon.tsx`         |
| Dauer als Text, Text in der App-Sprache    | `activities/activityDisplay.ts`, `activities/formatDuration.ts` |

Alles in `exclusions.ts`, `scoring.ts`, `suggest.ts`, `conditions.ts`, `selection.ts`, `startState.ts`, `startLayout.ts`, `selectedChildren.ts` und `cardImage.ts` sind reine Funktionen ohne UI.
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

### Welches Bild die Karte zeigt (Entscheidung 21)

Jede Karte hat eine Kette von Stufen (`cardImage.ts`), bestes Bild zuerst. **Alle drei Fälle haben dieselbe Form und Höhe** (Seitenverhältnis 2:1), mit derselben Pille:

1. **`image` der Aktivität** (Web-Adresse, nur `https://`). Lädt sie nicht (`onError`), zeigt die Karte die nächste Stufe.
2. **Gebündeltes Kategorie-Foto** aus `assets/images/categories/`, **aber nur, wenn die Kategorie mindestens `minPhotosPerCategory` Fotos hat** (Zusatz 34 und 36, `docs/theme.md`). **Heute steht die Zahl auf 99: erst einmal ganz ohne Fotos**, die Stufe ist vorhanden, wird aber von keiner Kategorie erreicht.
3. **Farbfläche der Kategorie** (heute alle Kategorien, solange sie die Mindestzahl nicht erreichen) mit großem, dünnem, am unteren Rand angeschnittenem Symbol (`categoryIcons`) und einem weichen großen Kreis. Farben: `docs/theme.md`, „Kategorie-Farben“.
   Das Symbol ist Dekoration und bleibt bei großer Systemschrift gleich groß (die Skalierung bleibt an).

**Die Foto-Liste.** Es gibt nicht für jede Kategorie Fotos und nicht immer gleich viele, eine feste Anzahl wird nirgends angenommen. Die Liste für die App wird **erzeugt**:

```bash
npm run photos:index   # liest assets/images/categories/ und schreibt src/features/activities/categoryPhotos.generated.ts
```

Neues Foto: Datei als `kategorie-nummer.jpg` ablegen (basteln, spiel, bewegung, experiment, natur, kochen, ausflug; Nummern dürfen Lücken haben), in `docs/bildquellen.md` eintragen,
`npm run photos:index` ausführen. Der Test `categoryPhotos.test.ts` meldet, wenn die erzeugte Datei nicht zu den Dateien passt, ein Foto 300 KB oder mehr hat
oder ein Foto nicht in `docs/bildquellen.md` steht (und umgekehrt). Das braucht kein zusätzliches Paket (das `Image` von React Native genügt).

**Stabil pro Aktivität.** Jede Aktivität bekommt aus ihrer ID und den Dateinamen der Fotos ihrer Kategorie eine feste Rangfolge (jedes Foto erhält aus „ID + Dateiname“ einen festen Wert, der höchste steht vorn).
Dieselbe Aktivität zeigt deshalb immer dasselbe Foto. Weil die Rangfolge am Dateinamen hängt und nicht an der Nummer in der Liste, ändert ein neues Foto nur die Aktivitäten, bei denen es vorn landet;
fällt eines weg, wechseln nur die, die es vorn hatten.

**Die drei Karten eines Ergebnisses.** Dasselbe Foto soll auf einem Bildschirm möglichst nur einmal vorkommen (`assignCardImages`): Die Karten bekommen ihr Foto in der Reihenfolge ihrer IDs
(nicht der Anzeige-Reihenfolge, so bleibt ein Foto bei seiner Aktivität, wenn sich die Reihenfolge ändert), jede nimmt das für sie bestplatzierte Foto, das noch frei ist.
Nur wenn die Kategorie weniger Fotos hat als Karten, wiederholt sich eines (mit einer Mindestzahl von drei Fotos und drei Karten pro Gruppe kommt das nicht vor; heute gibt es ohnehin keine Kategorie-Fotos, Zusatz 36). Heißt: Eine Aktivität zeigt immer ihr eigenes Foto, **außer** eine Nachbarkarte derselben Kategorie hätte genau dasselbe,
dann weicht eine von beiden aus. Die Detailansicht (D4) nutzt `getCardImageChain` (dieselbe Wahl wie `pickCategoryPhoto`) und bekommt damit dasselbe Foto wie die Karte; nur im Ausweichfall könnte es dort ein anderes sein. Solange es keine Kategorie-Fotos gibt, zeigen beide die Farbfläche.

**Datenschutz-Hinweis zu `image` (Zusatz 35):** Eine Web-Adresse in `image` lädt das Bild beim Anzeigen von einem Server (die IP-Adresse geht dorthin). Deshalb darf `image` **nur Adressen von unserem eigenen Speicher** laden (Allowlist), damit keine IP-Adressen an fremde Server gehen.
Die Allowlist kommt mit M8 (Supabase); vorher ist der Speicher-Host festzulegen (CLAUDE.md, „Entscheidungen vor M12“). **Heute prüft der Code nur `https://`, die Allowlist gibt es noch nicht.** Bisher hat keine Aktivität ein `image`, es darf bis dahin keine mit fremder Adresse geben.

## Harte Ausschlüsse (`exclusions.ts`)

Nur Sicherheit und Machbarkeit. Diese Regeln werden **nie** aufgeweicht.

| Grund       | Regel |
| ----------- | ----- |
| `age`       | Die Aktivität muss für **jedes** ausgewählte Kind passen: `ageMin` ≤ Alter ≤ `ageMax`, Alter in vollen Jahren. |
| `time`      | `durationMin` ist länger als die verfügbare Zeit. Passt die kürzeste Variante, ist die Aktivität machbar. Anfahrt gibt es erst mit Orten (M10). |
| `dayPart`   | Die Aktivität hat `dayParts` und die Tageszeit ist nicht dabei. Ohne `dayParts` passt sie immer. |
| `month`     | Die Aktivität hat `months` und der heutige Monat ist nicht dabei. Ohne `months` passt sie das ganze Jahr. Der Monat kommt aus dem Datum (`request.now`), es gibt keine Auswahl dafür. |
| `danger`    | Gewitter **oder amtliche Warnung** (Gewitter, Sturm, Orkan, andere Unwetterwarnung ab Stufe 3) und `setting: 'outdoor'`. `both` bleibt, weil man es drinnen machen kann. |
| `notDry`    | `weather.needsDry` und es regnet, gewittert oder schneit. |
| `notApproved` | Sicherheitsnetz: nur `status: 'approved'` (filtert `loadActivities()` schon). |

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
Noch nicht dabei: Entfernung (kommt mit M10).

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
