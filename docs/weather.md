# Wetter und Standort (M6)

Die App holt das Wetter beim Deutschen Wetterdienst (über die freie Schnittstelle **Bright Sky**, ohne Schlüssel)
und nutzt es für die Vorschläge. Ohne Standort fragt sie stattdessen „Wie ist das Wetter?“. Die Tageszeit kommt
automatisch aus der Uhrzeit.

**Seit D2:** Der Start (`app/index.tsx`) hat keinen Wetter-Teil mehr. Gefragt wird erst nach dem Tipp auf den Hauptknopf
„Was machen wir?“ (DESIGN.md, Entscheidung 7 und 22). Beim Öffnen des Starts darf das Wetter **vorgeladen** werden, aber nur,
wenn die Erlaubnis für den Standort schon da ist. Die Erlaubnis wird beim Öffnen **nie** erfragt. Was dabei an Bright Sky geht,
steht im Abschnitt „Vorladen beim Öffnen des Starts“.

## Ablauf in der App

| Wann | Was passiert |
| ---- | ------------ |
| App-Start (vor dem Start-Bildschirm) | Nichts. Es wird weder der Standort gelesen noch das Wetter geholt. |
| Start öffnen (und beim Zurückkommen in die App) | **Vorladen**, nur mit schon erteilter Erlaubnis (`useWeatherRefresh`, Details unten). Ohne Erlaubnis passiert nichts, es gibt weder eine Frage noch eine Erklär-Karte. |
| Hauptknopf „Was machen wir?“ | Die Vorschläge öffnen sich. Je nach Stand des Standorts kommt vorher ein **Wetter-Schritt** (`WeatherStep`, Regel `getWeatherStep` in `manualWeather.ts`), sonst gleich die Vorschläge. |
| Standort noch nie gefragt | Wetter-Schritt 1: Erklär-Karte mit **„Standort erlauben“** und **„Wetter selbst wählen“**. |
| „Standort erlauben“ | Erst jetzt zeigt das Handy seinen Dialog (nur „während der Nutzung“). Erlaubt: Das Wetter kommt automatisch, die Vorschläge erscheinen. |
| Standort erlaubt | Kein Schritt. Das Wetter kommt automatisch (war oft schon vorgeladen). |
| Standort verweigert, „selbst wählen“ oder Wetter nicht abrufbar | Wetter-Schritt 2: **„Wie ist das Wetter?“** (Sonne, Bewölkt, Regen, Gewitter, Schnee). **Ein Tipp** wählt das Wetter und zeigt gleich die Vorschläge. Dazu ein kleiner Link „Standort erlauben“. |
| Ergebnis „Eure Ideen“ | Oben eine Zeile mit dem angenommenen Wetter, z. B. „Bewölkt, Regen ab 15 Uhr · 11 °C“, darunter „Quelle: Deutscher Wetterdienst“. |
| Dort: „Wetter ändern“ | Wetter von Hand überschreiben, **auch wenn der Standort klappt**. „Automatisch“ hebt die Handwahl wieder auf. |
| Dort: „Standort erlauben“ | Kleiner Link, solange der Standort nicht erlaubt ist. Hat das Handy ihn dauerhaft abgelehnt, führt er in die Einstellungen. |

Die Handwahl ersetzt nur die **Wetterlage**. Eine amtliche Warnung und die Temperatur bleiben, wenn es sie gibt:
Sicherheit wird nie aufgeweicht.

Wer das Wetter schon von Hand gewählt hat, wird nicht noch einmal gefragt, auch nicht mit der Erklär-Karte
(der Standort lässt sich dann oben bei der Wetterzeile erlauben). Zurück vom Ergebnis führt zum Start, die Auswahl bleibt erhalten.

## Welche Regeln gelten

Alle Zahlen stehen als Konstanten oben in `src/features/weather/situation.ts` (Wetter) und
`src/features/suggestions/scoring.ts` (Gewichtung).

### Zeitfenster
Es zählt das Wetter **von jetzt bis jetzt + gewählte Zeit, mindestens 2 Stunden** (`minLookaheadMinutes = 120`).
Wer „30 Min.“ wählt, sieht also auch Regen, der in 90 Minuten kommt. „Halber Tag“ ist 4 Stunden.
Betrachtet werden das aktuelle Wetter und die Stundenwerte nach jetzt bis zum Ende des Fensters.

### Wetterlage
Pro Messwert oder Stunde wird eine Lage bestimmt, dann gewinnt im Fenster der **schlimmste** Wert:
**Gewitter > Regen > Schnee > bewölkt/Sonne**. Gibt es nichts davon, entscheidet die Mehrheit der Stunden zwischen Sonne und bewölkt.

| Bright Sky meldet | Lage |
| ----------------- | ---- |
| `thunderstorm`, `hail` (Hagel ist gefährlich draußen) | Gewitter |
| `rain`, `sleet` (Schneeregen) | Regen, **aber nur ab der Mindestmenge** (siehe unten) |
| `snow` | Schnee, immer |
| `dry`, `fog`, keine Angabe | Sonne oder bewölkt |

**Sonne** heißt: am Tag, höchstens 50 % Bewölkung (`sunnyMaxCloudCover`). Nachts und bei Nebel ist es „bewölkt“.
Fehlt die Bewölkung, entscheidet das Symbol von Bright Sky.

### Regen erst ab einer Mindestmenge
Kurzer Nieselregen soll nicht alles blockieren, was trocken sein muss. Regen und Schneeregen zählen deshalb erst ab
**0,3 mm pro Stunde** (`rainMinMmPerHour`). Beispiel: Am 11. Oktober meldete Bright Sky stundenlang „rain“ mit je 0,1 mm
(Nieselregen). Das zählt als bewölkt. Der Messwert „rain“ mit 0,84 mm in der letzten Stunde zählt als Regen.

- Beim aktuellen Wetter ist die Menge der Niederschlag der letzten Stunde, sonst hochgerechnet aus den letzten 30 oder 10 Minuten.
- Ist die Menge unbekannt, glauben wir dem Wetterzustand (Regen).
- **Gewitter, Hagel und Schnee zählen immer**, auch bei kleinster Menge (Sicherheit, und Schnee ist selten und beliebt).
- Getestet in `situation.test.ts` (Grenzen 0,29 / 0,3 mm) und mit der echten Antwort in `brightSky.test.ts`.
- Anpassen: nur die Konstante ändern.

### Amtliche Warnungen (DWD)
Eine Warnung **schließt Aktivitäten nur für draußen aus** (`setting: 'outdoor'`; „drinnen oder draußen“ bleibt), wenn sie sich mit dem Zeitfenster überschneidet und

- im Namen **Gewitter, Sturm oder Orkan** trägt (jede Stufe, z. B. „STURMBÖEN“), **oder**
- jede andere Warnung ist, ab **Stufe 3** („severe“ = Unwetterwarnung, „extreme“), z. B. Starkregen oder Glatteis.

Das schließt **nicht** aus: „Windböen“ (Stufe 1), Warnungen unterhalb von Stufe 3 für andere Ereignisse, Gesundheitswarnungen
(z. B. Hitze, dort wirkt nur die Temperatur auf die Reihenfolge), Entwarnungen und Testmeldungen.
Klappt nur der Abruf der Warnungen nicht, geht die App ohne Warnungen weiter; Gewitter selbst schließt weiter draußen aus.

### Temperatur (nur Reihenfolge)
Wird es im Fenster mindestens **30 °C** oder höchstens **0 °C**, rutschen Aktivitäten draußen nach hinten:
**−4** für `outdoor`, **−1** für `both`, drinnen bleibt. Kein Ausschluss. Ohne Temperatur (Wetter von Hand gewählt, ohne Daten) wird nichts abgezogen.

### Schnee
Schnee ist eine Wetterlage. `needsDry`-Aktivitäten fallen bei Schnee weg (Schnee ist nicht trocken). Aktivitäten, die Schnee brauchen,
gibt es noch nicht: Sie kommen als **M6b** (eigener Schritt, mit einem Feld im Datenmodell).

## Zwischenspeicher und Offline

- Gespeichert wird in AsyncStorage (`weather.v1`) **nur auf dem Gerät**, mit dem auf ~1 km **gerundeten** Ort.
- **30 Minuten** gelten die Daten ohne neuen Abruf (für denselben gerundeten Ort). Dazu wird die Vorhersage für 8 Stunden gespeichert,
  damit jede Zeitspanne daraus berechnet werden kann.
- Klappt ein Abruf nicht (kein Internet, Server down, Ort außerhalb von Deutschland), gelten gespeicherte Daten **bis 3 Stunden** alt.
  Die Zeile zeigt dann „Stand 14:20 Uhr, gerade nicht aktualisierbar“.
- Älter als 3 Stunden oder nichts gespeichert: „Wie ist das Wetter?“ von Hand. Kommt auch der Bildschirm „Eure Ideen“ ohne Auswahl,
  nimmt die App neutral „bewölkt“ an und sagt das offen („Wetter nicht abrufbar. Wir gehen von „Bewölkt“ aus.“).
- Wird die Standort-Erlaubnis zurückgenommen, löscht die App die gespeicherten Wetterdaten.
- Das Zeitlimit für einen Abruf ist 8 Sekunden (`requestTimeoutMs`).

## Datenschutz

- Standort **nur im Vordergrund** und nur nach der Erklär-Karte. Es gibt weder im Code noch in `app.json` Hintergrund-Standort
  (Plugin `expo-location` mit allen Hintergrund-Optionen aus; iOS fragt nur „während der Nutzung“).
- **Vorladen beim Öffnen des Starts:** siehe eigener Abschnitt unten. Kurz: Ohne schon erteilte Erlaubnis geht nichts an Bright Sky.
- Die App fragt „ungefähr“ ab (`Accuracy.Low`, letzter bekannter Standort höchstens 30 Min. alt) und rundet **sofort** auf 2 Nachkommastellen
  (`getRoundedPlace` in `getLocation.ts`). Genauere Werte gibt es sonst nirgends. Die Internet-Adressen runden zusätzlich selbst
  (`buildUrls`), damit nie ein genauerer Wert nach außen gehen kann. Beides ist getestet.
- Bright Sky sieht pro Abruf: den gerundeten Ort, die Zeit und die IP-Adresse (wie bei jedem Internet-Abruf). Kein Konto, keine Kennung.
  **Für die Datenschutzerklärung (M12) merken:** Bright Sky ist ein freier Dienst eines Dritten (`api.brightsky.dev`), die Daten stammen vom
  Deutschen Wetterdienst. Quellenangabe „Deutscher Wetterdienst“ steht in der App.
- Android: Das Handy bietet bei Android 12+ „ungefähr“ oder „genau“ an. Wir blockieren „genau“ nicht (so läuft `expo-location` sicher),
  fragen aber nur ungefähr ab und runden.
- Der iOS-Text im Dialog steht in `app.json` (Englisch) und `src/locales/native/de.json` (Deutsch). Eine neue Sprache braucht auch dort eine Datei.

## Wo was liegt (`src/features/weather/`)

| Was | Datei |
| --- | ----- |
| Ort runden, vergleichen | `location.ts` |
| Standort und Erlaubnis lesen (einzige Stelle mit `expo-location`) | `getLocation.ts` |
| Internet-Adressen, Antworten prüfen (Wetter, Vorhersage, Warnungen) | `brightSky.ts` |
| Der Abruf (`fetch`, Zeitlimit) | `fetchWeather.ts` |
| Regeln des Zwischenspeichers | `weatherCache.ts` |
| Speichern auf dem Gerät | `weatherStorage.ts` |
| Ablauf „Wetter besorgen“ | `weatherService.ts` |
| Wetterlage für die Vorschläge (Fenster, Regel-Mindestmenge, Warnungen, Temperatur) | `situation.ts` |
| Texte zusammensetzen (Zeile, Warnung, Uhrzeit) | `weatherText.ts`, `formatClock.ts` |
| Zustand für die Bildschirme | `WeatherProvider.tsx` |
| Oberfläche | `LocationExplainer.tsx`, `WeatherStep.tsx` (Schritt vor den Vorschlägen), `WeatherChips.tsx`, `WeatherSummary.tsx`, `AllowLocationLink.tsx`, `WeatherIcon.tsx` |
| Wann die Handwahl und der Wetter-Schritt erscheinen | `manualWeather.ts` (`needsManualWeather`, `getWeatherStep`) |

`location.ts`, `brightSky.ts`, `situation.ts`, `weatherCache.ts`, `weatherText.ts` und `manualWeather.ts` sind reine Funktionen mit Tests.
Die Vorschlagslogik (`src/features/suggestions/`) kennt weder Standort noch Internet: Sie bekommt Wetterlage, Temperatur und
Warnung über `SuggestionRequest` (`toConditions(situation)`).

## Testen

```bash
npm test               # Jest: alle Regeln oben, der Ablauf mit falschem Standort/Internet
npx tsc --noEmit
npx expo lint
```

Von Hand mit Expo Go (`npx expo start`, QR-Code scannen). Der Standort lässt sich nur auf einem echten Handy prüfen:

1. **Erstes Mal:** Die App öffnen. Auf dem Start ist **kein** Wetter zu sehen und das Handy fragt **nicht** nach dem Standort.
   Zeit wählen, „Was machen wir?“ antippen. Es erscheint die Erklär-Karte, noch **kein** Dialog des Handys.
2. **„Standort erlauben“ → „Beim Verwenden der App“.** Die Vorschläge erscheinen, oben steht das Wetter mit „Quelle: Deutscher Wetterdienst“.
   Danach die App schließen und wieder öffnen: Der Start lädt das Wetter jetzt vor (siehe unten), gefragt wird nichts.
3. **Zweites Mal (innerhalb von 30 Min.):** geht schnell, es wird nicht neu abgerufen (der Zwischenspeicher gilt).
4. **„Wetter ändern“ → Regen:** Die Zeile zeigt „Eure Auswahl: Regen“, die Vorschläge ändern sich (nichts, was trocken sein muss). „Automatisch“ stellt zurück.
5. **Flugmodus an:** Innerhalb von 30 Minuten nach Schritt 2 geht alles wie gewohnt (Daten noch frisch). Danach, mit Daten unter 3 Std.,
   steht „Stand …, gerade nicht aktualisierbar“. Gibt es keine Daten (z. B. frisch installiert), erscheint „Wie ist das Wetter?“.
6. **Standort verweigern** (Einstellungen → Miki → Standort aus, oder „Wetter selbst wählen“): Nach dem Tipp auf „Was machen wir?“ erscheint „Wie ist das Wetter?“ mit Sonne, Bewölkt, Regen, Gewitter, Schnee und dem Link „Standort erlauben“.
   Ein Tipp aufs Wetter zeigt gleich die Vorschläge. Zurück führt zum Start, Kinder, Zeit und Energie sind noch gewählt.
7. **Außerhalb von Deutschland** liefert Bright Sky keine Daten: auch dann die Auswahl von Hand.

Die Wetter-Abfragen lassen sich mit Beispielen ausprobieren:
`https://api.brightsky.dev/current_weather?lat=50.66&lon=12.19` (Greiz).

## Grenzen

- Bright Sky ist ein freier Dienst ohne Zusage. Fällt er aus, fragt die App von Hand. Eine zweite Wetterquelle steht unter „Später“.
- Wetter im Ausland (Urlaub) gibt es noch nicht; Bright Sky deckt nur Deutschland ab.
- Das Wetter wird beim Öffnen des Starts, beim Öffnen der Vorschläge und beim Zurückkommen in die App besorgt (jeweils mit dem Zwischenspeicher von 30 Minuten),
  nicht ständig und nie im Hintergrund.

## Vorladen beim Öffnen des Starts

*Vorarbeit für die Datenschutzerklärung (M12). Der Stand gilt ab D2.*

**Wann:** Der Start-Bildschirm ruft `useWeatherRefresh` auf (`app/index.tsx`), und zwar

1. beim Öffnen des Start-Bildschirms (beim Start der App, und auch, wenn der Start nach „Kind anlegen“ neu aufgebaut wird), und
2. wenn die App aus dem Hintergrund wieder in den Vordergrund kommt, solange der Start im Bildschirm-Stapel liegt
   (auch wenn gerade ein anderer Bildschirm darüber offen ist).

Zurück vom Ergebnis zum Start löst **kein** neues Vorladen aus (der Start bleibt dabei im Hintergrund offen).
Dasselbe Besorgen geschieht beim Öffnen der Vorschläge (Ergebnis-Bildschirm). Das Vorladen ist also nur ein Vorsprung,
kein zusätzlicher Dienst.

**Bedingung:** Nur wenn die Erlaubnis für den Standort **schon erteilt** ist („beim Verwenden der App“). Das Vorladen liest den Stand
der Erlaubnis nur (`getForegroundPermissionsAsync`) und **fragt nie nach**. Ohne Erlaubnis (nie gefragt, verweigert, „Wetter selbst wählen“,
dauerhaft abgelehnt) gehen weder Standort noch Wetter-Anfrage irgendwohin, und gespeicherte Wetterdaten werden gelöscht.

**Was mit dem Standort geschieht:** Er wird nur auf dem Gerät gelesen (ungefähre Genauigkeit, höchstens 30 Minuten alter letzter Standort,
sonst eine neue ungefähre Ortung mit 6 Sekunden Zeitlimit) und **sofort auf 2 Nachkommastellen gerundet** (etwa 1 km).
Alles Weitere sieht nur diesen gerundeten Ort.

**Was geht an Bright Sky (`api.brightsky.dev`):** Bei einem Abruf drei Anfragen (`current_weather`, `weather` für 8 Stunden Vorhersage, `alerts`),
jeweils mit

- dem **gerundeten Ort** (`lat` und `lon` mit 2 Nachkommastellen),
- bei der Vorhersage dem **Zeitfenster** (volle Stunde jetzt bis 8 Stunden später),
- und, wie bei jeder Internetverbindung unvermeidbar, der **IP-Adresse** des Handys sowie den Kopfzeilen, die das Betriebssystem
  üblicherweise mitschickt (z. B. User-Agent). Die App selbst setzt nur `Accept: application/json`.

Es geht **kein** Konto, keine Kennung, kein Kind, keine Auswahl (Kinder, Zeit, Energie) und kein Verlauf an Bright Sky.

**Wie oft:** Höchstens ein Abruf (drei Anfragen) alle 30 Minuten, solange der gerundete Ort gleich bleibt. Ist der gespeicherte Stand
jünger als 30 Minuten und gehört zum selben gerundeten Ort, geht **keine** Anfrage ins Internet (nur der Standort wird auf dem Gerät gelesen).
Ein anderer gerundeter Ort löst einen neuen Abruf aus. Bei Fehlern gilt der Stand bis 3 Stunden (siehe oben).
Es gibt kein Vorladen im Hintergrund und keinen Zeitplan.

**Warum vorladen:** Die Vorschläge stehen nach dem Tipp auf den Hauptknopf sofort da (30-Sekunden-Prinzip), statt erst auf das Wetter zu warten.

**Prüfen:** Flugmodus an, App öffnen: Der Start erscheint ohne Verzögerung und ohne Fehlermeldung (das Vorladen scheitert still).
Standort-Erlaubnis in den Einstellungen entziehen, App öffnen: Es erscheint keine Erlaubnis-Frage und keine Erklär-Karte auf dem Start.
Automatisch geprüft ist, dass `resolveWeather` ohne Erlaubnis nichts abruft und nie nachfragt (`weatherService.test.ts`).
