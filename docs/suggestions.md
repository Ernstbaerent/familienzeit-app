# Vorschläge (M5)

Eltern wählen, wer dabei ist und wie viel Zeit sie haben. Die App zeigt genau 3 passende Ideen.

## Ablauf in der App

| Bildschirm        | Datei                          | Zweck |
| ----------------- | ------------------------------ | ----- |
| Start             | `app/index.tsx`                | Großer Knopf „Was machen wir?“ |
| Was machen wir?   | `app/suggestions/index.tsx`    | Kinder (alle vorausgewählt), Zeit (Pflicht), Energie (freiwillig), Test-Auswahl Wetter und Tageszeit |
| Eure Ideen        | `app/suggestions/results.tsx`  | 3 Karten, „Andere Vorschläge“, „Auswahl ändern“ |

Die Auswahl reist als Parameter in der Bildschirm-Adresse zum Ergebnis (`selection.ts`). Das bleibt auf dem Gerät.
Eine Karte zeigt Kategorie-Symbol, Titel, Dauer und Kurzbeschreibung. Antippen öffnet noch nichts (Detailansicht: M7).

## Wo was liegt

| Was                                        | Datei (in `src/features/`)            |
| ------------------------------------------ | ------------------------------------- |
| Zeit-Auswahl, Energie, Wetter, Tageszeit   | `suggestions/conditions.ts`           |
| Harte Ausschlüsse                          | `suggestions/exclusions.ts`           |
| Gewichtung (alle Gewichte in einer Tabelle)| `suggestions/scoring.ts`              |
| Dreiergruppen, Blättern, Tipps             | `suggestions/suggest.ts`              |
| Auswahl ↔ Bildschirm-Parameter             | `suggestions/selection.ts`            |
| Karte                                      | `suggestions/SuggestionCard.tsx`      |
| Test-Auswahl Wetter und Tageszeit          | `suggestions/TestConditions.tsx`      |
| Kategorie → Symbol                         | `activities/CategoryIcon.tsx`         |
| Dauer als Text, Text in der App-Sprache    | `activities/activityDisplay.ts`, `activities/formatDuration.ts` |

Alles in `exclusions.ts`, `scoring.ts`, `suggest.ts`, `conditions.ts` und `selection.ts` sind reine Funktionen ohne UI.
Die Tests liegen daneben (`*.test.ts`).

## Harte Ausschlüsse (`exclusions.ts`)

Nur Sicherheit und Machbarkeit. Diese Regeln werden **nie** aufgeweicht.

| Grund       | Regel |
| ----------- | ----- |
| `age`       | Die Aktivität muss für **jedes** ausgewählte Kind passen: `ageMin` ≤ Alter ≤ `ageMax`, Alter in vollen Jahren. |
| `time`      | `durationMin` ist länger als die verfügbare Zeit. Passt die kürzeste Variante, ist die Aktivität machbar. Anfahrt gibt es erst mit Orten (M10). |
| `dayPart`   | Die Aktivität hat `dayParts` und die Tageszeit ist nicht dabei. Ohne `dayParts` passt sie immer. |
| `danger`    | Gewitter und `setting: 'outdoor'`. `both` bleibt, weil man es drinnen machen kann. |
| `notDry`    | `weather.needsDry` und es regnet oder gewittert. |
| `notApproved` | Sicherheitsnetz: nur `status: 'approved'` (filtert `loadActivities()` schon). |

**Uhrzeit-Grenzen der Tageszeiten** (`getDayPart`): Morgen 5:00–11:59, Nachmittag 12:00–16:59, Abend 17:00–4:59.

**Zeit-Auswahl:** 30 Min., 1 Std., 2 Std., halber Tag (= 4 Std.).

## Gewichtung (`scoring.ts`)

Ändert nur die Reihenfolge, schließt nie aus. Höhere Punktzahl = weiter vorn.

| Was | Punkte |
| --- | ------ |
| Thema, das mindestens ein ausgewähltes Kind mag | +3 je Thema |
| Thema, das mindestens ein ausgewähltes Kind nicht mag | −4 je Thema |
| Sonne und `betterInSun` | +2 |
| Mehrere Kinder dabei und `siblingFriendly` | +2 |
| Kosten | −1 je Stufe |
| Eltern müde | `low` +2, `high` −4 |
| Eltern normal | `high` −1 |
| Eltern fit | `high` +1 |
| Energie nicht angegeben | 0 |

Bei Gleichstand bleibt die Reihenfolge aus den Daten.
Noch nicht dabei: Entfernung (kommt mit M10) und „kürzlich gemacht“ (braucht den Verlauf aus M7).

## Abwechslung und „Andere Vorschläge“ (`suggest.ts`)

- Die passenden Aktivitäten werden in **Dreiergruppen** aufgeteilt. Pro Platz gewinnt die höchste Punktzahl,
  aber jede Aktivität derselben Kategorie, die schon in der Gruppe ist, bringt **−5**. So sind die 3 Vorschläge
  meist aus verschiedenen Kategorien. Eine deutliche Abneigung wird dadurch aber nicht nach vorn geholt.
- **Immer genau 3:** Ist die letzte Gruppe nicht voll, wird sie mit den besten Ideen aus den anderen Gruppen aufgefüllt.
- **„Andere Vorschläge“** zeigt die nächste Gruppe. Nach der letzten geht es mit einem Hinweis wieder von vorn los
  (kein Endlos-Feed). Gibt es nur eine Gruppe, fehlt der Knopf.
- **Weniger als 3 passende Ideen:** Die App zeigt die vorhandenen und einen freundlichen Hinweis. Ein Tipp
  („weniger Kinder“, „mehr Zeit“) erscheint nur, wenn er wirklich zu mehr Ideen führt (`getTips`).
  Sonst steht dort, dass laufend neue Ideen dazukommen.

## Test-Auswahl Wetter und Tageszeit (bis M6)

Bis M6 wählt man Wetter und Tageszeit von Hand. Der Kasten ist gestrichelt und mit „Nur zum Testen“ beschriftet.
Die Tageszeit ist nach der Uhrzeit vorausgewählt, das Wetter auf „Bewölkt“.

**In M6 entfernen:**

1. `src/features/suggestions/TestConditions.tsx` löschen.
2. In `src/locales/de.json` und `en.json` den Bereich `testConditions` löschen.
3. Im Projekt nach `TEST (M6)` suchen und jede Stelle anpassen:
   `app/suggestions/index.tsx` (Zustand und Kasten) und `src/features/suggestions/selection.ts`
   (Wetter und Tageszeit nicht mehr als Parameter, sondern auf dem Ergebnis-Bildschirm aus Bright Sky und `getDayPart(new Date())`).

Die Vorschlagslogik selbst ändert sich dabei nicht: Sie bekommt Wetter und Tageszeit weiter über `SuggestionRequest`.

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
Diese letzten Tests prüfen nur Regeln, keine einzelnen IDs. Sie laufen also auch, wenn sich die Aktivitäten ändern.

Von Hand: `npx expo start`, mit Expo Go öffnen, „Was machen wir?“ antippen und z. B. ausprobieren:

- Gewitter: keine Ideen für draußen (Pfützen-Forscher, Waldtag mit Picknick, Draußen-Olympiade, Schnitzeljagd fehlen)
- Abend + Kind ab 6: „Sterne beobachten“ taucht auf, morgens nie
- Baby und Teenager zusammen: Hinweis statt Vorschläge
- „Andere Vorschläge“ mehrmals: nach der letzten Gruppe kommt der Hinweis „von vorn“
