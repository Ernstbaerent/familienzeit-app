# Detailansicht (Stufe D4)

Die Detailansicht im Design „Sonntagslicht“ (DESIGN.md, Bildschirm 03, Entscheidungen 13 bis 17 und 21, Zusätze 36 bis 44).
Der Ablauf dahinter (Das machen wir → Fertig → Wie war’s? → Verlauf) ist seit M7 unverändert und steht in `docs/history.md`.

## Aufbau von oben nach unten

| Teil | Was | Datei |
| ---- | --- | ----- |
| Kopf | runder Zurück-Knopf (mindestens 44 pt, beschriftet „Zurück zu den Ideen“), keine Navigationsleiste | `components/BackButton.tsx`, `app/activity/[id].tsx` |
| Bildbereich | wie auf den Karten (2:1, Radius 22): Foto der Aktivität (`image`), sonst (Pilot) ihre Illustration, sonst Farbfläche mit großem Symbol, **ohne Pille** | `suggestions/CardMedia.tsx` (`showPill={false}`) |
| Titel | Kategorie klein darüber, Titel in Literata 34 px (Überschrift), Kurzbeschreibung darunter | `activities/ActivityDetails.tsx` |
| Eckdaten | fünf weiße Kacheln: Dauer, Alter, Energie von dir, Kosten, Ort | `activities/FactTiles.tsx`, Raster `detailLayout.ts` |
| Allergen-Box | nur wenn Allergene erkannt wurden, darunter dauerhaft ein Satz | `activities/ActivityNotices.tsx` |
| Sicherheitsbox | wo nötig, mit „Mit Erwachsenen“ | `activities/ActivityNotices.tsx` |
| Das braucht ihr | Liste mit Abhak-Feldern | `activities/MaterialChecklist.tsx` |
| So geht’s | nummerierte Schritte, 20 px, 28 px Abstand; (Pilot) Schrittbild unter dem Text, 2:1, Radius 16, Dekoration (`docs/design/ILLUSTRATIONEN.md`) | `activities/StepList.tsx` |
| Fester Bereich unten | Hauptknopf „Das machen wir“, danach „Fertig“, danach „Wie war’s?“ | `app/activity/[id].tsx` |

Der Bildschirm ist in drei Blöcke geteilt, die untereinander stehen: Kopf, Scrollbereich, fester Bereich. Der **feste Bereich ist ein Nachbar des Scrollbereichs**,
nicht darüber gelegt. Der Scrollbereich endet deshalb immer über ihm und wird nie verdeckt, bei jeder Schriftgröße und mit Sicherheitsbereich am unteren Rand
(der `SafeAreaView` lässt oben und unten Platz). Zusätzlich hat der Scrollbereich unten `spacing.xl` Luft, damit der letzte Schritt nicht am festen Bereich klebt.

## Eckdaten

Fünf Kacheln, weiß mit feinem Rand und Radius 16 (`radius.tile`): Symbol, Wert (fett), Beschriftung (klein, gedämpft). Für die Sprachausgabe ist jede Kachel **ein** Satz („Dauer: 30–60 Min.“),
das Symbol ist Dekoration. Nicht gebaut (Entscheidung 15): „davon 15 aktiv“, „ergibt 12 Stück“, Untertitel mit den Namen der Kinder.

| Kachel | Wert | Beschriftung (de / en) |
| ------ | ---- | ---------------------- |
| Dauer | z. B. „30–60 Min.“, „2–3 Std.“ (`formatDuration`) | Dauer / Duration |
| Alter | z. B. „3–8 Jahre“, „5 Jahre“, „Alle Alter“ (`formatAgeRange`, wie auf der Karte) | Alter / Age |
| Energie | Wenig / Mittel / Viel (Low / Medium / High) | Energie von dir / Energy from you |
| Kosten | Kostenlos / Wenig / Etwas mehr (Free / A little / A bit more) | Kosten / Cost |
| Ort | **Drinnen** / **Draußen** / **Drinnen oder draußen** für `both` (Indoors / Outdoors / Indoors or outdoors) | Ort / Place |

**Raster** (`detailLayout.ts`, wie `startLayout.ts` auf dem Start): zwei Spalten bei normaler Schrift auf üblichen Handys, eine Spalte bei großer Systemschrift oder sehr schmalem Bildschirm
(Mindestbreite 130 bei normaler Schrift, wächst mit `fontScale`). Steht die letzte Kachel allein in ihrer Zeile (bei fünf Kacheln die Kachel „Ort“), füllt sie die Zeile. Nichts wird abgeschnitten, die Texte brechen um.

Die Texte „Drinnen“, „Draußen“, „Drinnen oder draußen“ und die Symbole (`home-outline`, `sunny-outline`, `partly-sunny-outline`) gibt es damit auch für die Feinschliff-Liste („Drinnen/Draußen“ auf der Karte, CLAUDE.md);
auf der Karte sind sie noch nicht eingebaut.

## Allergen-Box (Zusatz 42)

- Sie erscheint **nur, wenn aus dem Material Allergene erkannt wurden** (`getAllergens`, nicht aus dem Hinweistext). Ohne erkannte Allergene gibt es **keine Box und keine Aussage**,
  vor allem nie einen Satz wie „frei von Allergenen“: Die Liste kennt nur, was in `materials.ts` steht, und beweist keine Allergenfreiheit.
- **Unter der Box steht dauerhaft der Satz** „Bei Allergien bitte die Zutatenlisten prüfen.“ / „If you have allergies, please check the ingredient lists.“ (`detail.allergensNote`).
  Immer mit der Box, nie ohne sie; nicht antippbar und nicht wegklickbar.
- Reihenfolge: direkt unter den Eckdaten, vor Material und Anleitung.

## Sicherheitsbox (Zusatz 40)

Nur wo nötig: wenn das Material „Mit Erwachsenen“ verlangt (`needsAdults`, dieselbe Regel wie Punkt 2 der Sicherheits-Checkliste) und/oder die Aktivität einen Sicherheitshinweis hat.
Sie steht **vor Material und Anleitung** (im PDF steht sie am Ende) und nach der Allergen-Box. Beide Boxen sind **deutlich, aber ohne Alarm-Rot**: Fläche `warningSurface` (Honig-Ton),
Rahmen und Titel in `warning`. `danger` und `dangerSurface` kommen auf diesem Bildschirm nicht vor (ein Test prüft das). Allergene und Sicherheit unterscheiden sich durch Symbol und Titel, nicht durch die Farbe.
Der Text in den Boxen steht in Lesegröße (20 px).

## Das braucht ihr: Abhak-Felder (Entscheidung 13 und 17, Zusatz 37 und 39)

- Jede Zeile ist ein Abhak-Feld (Rolle „checkbox“, Zustand „checked“) und **56 px hoch** (`size.checkbox`). Die ganze Zeile ist die Tippfläche. Das sichtbare Kästchen darin ist 32 px groß (wie im PDF).
- **Rand des Kästchens: `icon` aus der Palette**, mindestens 3:1 zur weißen Karte und zum Papier (WCAG 1.4.11). Das prüfen `theme.test.ts` (beide Paletten) und `ActivityScreen.test.tsx` (am gezeichneten Rand).
  Die dünnen Linien zwischen den Zeilen sind `border` (1,7:1), sie gliedern nur.
- **Abgehakt ist Tinte** (`selected`) mit Häkchen (`onSelected`), wie die gewählten Chips (Entscheidung 11 und 23: Terrakotta ist nur dem Hauptknopf vorbehalten, das PDF zeigt hier Terrakotta). Der Text wird dabei gedämpft.
- **Nur im Speicher des Bildschirms** (`useState`): nirgends gespeichert, kein Verlaufseintrag, beim nächsten Öffnen wieder leer. „Das machen wir“ und „Fertig“ ändern die Haken nicht.
- Bei den Schritten gibt es keine Abhak-Felder.
- Ohne Material steht „Ihr braucht kein besonderes Material.“ statt einer Liste.

## So geht’s

Nummer in Literata im sandfarbenen Kreis (`surface`, nicht Terrakotta), Text **20 px** (`fontSize.reading`, Zeilenhöhe 30) mit **28 px** Abstand (`spacing.stepGap`). Für die Sprachausgabe ist jeder Schritt ein Satz („Schritt 1. …“).
Keine Hinweise je Schritt (Entscheidung 15).

## Fester Hauptknopf, Zurück, „Wie war’s?“ (Zusatz 43 und 44)

- **„Das machen wir“** liegt im festen Bereich unten (Entscheidung 14), er scrollt nie weg. Nach dem Tippen wird er zu „Fertig“, darüber steht „Viel Spaß! …“.
- **Nach „Fertig“ steht „Wie war’s?“ im selben festen Bereich** (Funktion und Aussehen unverändert, das neue Aussehen kommt in D5). Es ist deshalb ohne Scrollen sichtbar.
- **Zurück:** Der runde Knopf geht eine Stufe zurück (`router.back()`), also zu den Ideen, ohne Verlauf (direkt geöffnet) zum Start. Die **Zurück-Taste von Android** macht dasselbe: Der Bildschirm fängt sie nicht ab
  (kein `BackHandler`, keine abgeschaltete Geste), „Eure Ideen“ öffnet die Details mit `push`, die Ideen liegen also darunter im Stapel. Nach „Fertig“ und „Wie war’s?“ geht es wie bisher zum Start (`dismissTo('/')`).

## Große Systemschrift, Rechts-nach-links, Sprachausgabe

- Die Skalierung bleibt an (nie `allowFontScaling={false}`, nie `fontWeight` bei diesen Schriften). Höhen sind Mindesthöhen, Texte haben kein `numberOfLines`. Das Häkchen im Kästchen und das große Symbol im Bildbereich bleiben gleich groß (Division durch `fontScale`).
- Nur `start`/`end` und logische Abstände, der Zurück-Pfeil wird bei rechts-nach-links gespiegelt (`mirrorInRTL`). Ein Test prüft, dass keine festen linken oder rechten Werte vorkommen.
- Rollen und Beschriftungen: Titel, Boxen und Abschnitte sind Überschriften, Abhak-Felder sind „checkbox“ mit Zustand, Kacheln und Schritte je ein Satz, der Bildbereich ist Dekoration, der Zurück-Knopf ist beschriftet.
- Der Dunkelmodus bleibt bis D5 aus. Alle Farben kommen aus dem Theme (ein Test prüft, dass jede gezeichnete Farbe in der Palette oder den Kategorie-Farben steht).

## Bild (Zusatz 36)

Wie auf den Karten: `image` der Aktivität, sonst die Farbfläche der Kategorie mit großem Symbol. Kategorie-Fotos gibt es **erst einmal gar nicht** (Mindestzahl `minPhotosPerCategory` = 99, `docs/theme.md`), Fotos kommen später über M9b.
Lädt ein `image` nicht, zeigt der Bildbereich die Farbfläche.

## Tests

- `src/features/activities/ActivityScreen.test.tsx`: Kopf und Zurück, Bildbereich, Titel, Eckdaten (de/en, große Schrift), Allergen-Box (nur bei erkannten Allergenen, nie „frei von“, Satz darunter, Reihenfolge), Sicherheitsbox, Abhak-Felder
  (Rolle, 56 px, Rand und Kontrast, nur im Speicher, nach neuem Öffnen leer), Schritte (20 px, 28 px, Nummern), fester Hauptknopf (Nachbar des Scrollbereichs, Abstand unten, Sicherheitsbereich), „Fertig“ und „Wie war’s?“ ohne Scrollen,
  Rollen, Schriften, Rechts-nach-links, keine festen Farben.
- `src/features/activities/detailLayout.test.ts`: Spalten der Eckdaten.
- `src/lib/theme.test.ts`: Kontrast von Rand und Häkchen der Abhak-Felder (hell und dunkel), `warning` auf `card`.
- `src/features/suggestions/cardImage.test.ts`: keine Kategorie-Fotos (Zusatz 36).

## Von Hand testen

`npx expo start`, mit Expo Go öffnen. „Was machen wir?“ → Zeit wählen → eine Karte antippen.

1. Kopf, Bildbereich, Titel, fünf Kacheln, bei Backen/Kochen die Allergen-Box mit dem Satz darunter, bei Schere, Messer oder Herd die Sicherheitsbox. Eine Idee ohne Allergene (z. B. „Ich sehe was, was du nicht siehst“) zeigt keine Allergen-Box und keinen Satz.
2. Material abhaken, zurückgehen und die Karte wieder öffnen: alles ist wieder leer.
3. Nach unten scrollen: Der Hauptknopf bleibt unten stehen, der letzte Schritt ist über ihm ganz zu lesen.
4. In den Handy-Einstellungen die Schrift auf „Sehr groß“ stellen: Kacheln stehen untereinander, nichts ist abgeschnitten.
5. „Das machen wir“ → „Fertig“: „Wie war’s?“ ist sofort ganz zu sehen. Die Zurück-Taste von Android (auf einem Android-Handy) führt von den Details zu den Ideen.

## Sichtprüfung im Browser (D4)

Wie bei D3 mit `react-native-web` und `@expo/metro-runtime`, nur lokal und ohne Speichern installiert (nichts in `package.json`), 360 px breit, Chromium. Geprüft: Anfang, Mitte (Boxen, Material mit 13 Zeilen) und Ende (Schritte über dem festen Knopf)
in Deutsch und Englisch, lange Titel, eine Idee ohne Material und ohne Allergene, „Wie war’s?“ bei 360 × 640 in normaler und doppelter Schrift (die große Schrift und der Sicherheitsbereich unten wurden nachgestellt: Texte per CSS vergrößert und `fontScale` auf 2 gesetzt, unten 34 px Platz gelassen).
Grenzen dieser Prüfung: Es ist ein Browser, kein Handy. Die Zurück-Taste von Android und die echte Systemschrift-Skalierung sind nur durch die Tests und den Aufbau abgesichert, nicht auf einem Gerät.
Bei sehr großer Schrift (ab etwa 3×) auf einem kleinen Handy kann „Wie war’s?“ höher sein als der Bildschirm; bei 2× passt es auf 360 × 640.
