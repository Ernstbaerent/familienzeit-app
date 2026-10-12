# Details, Feedback und Verlauf (M7)

Eltern tippen auf eine Vorschlagskarte, lesen die Idee, starten mit „Das machen wir“ und tippen am Ende auf „Fertig“.
Die App merkt sich, was gemacht wurde, und schlägt es nicht gleich wieder vor. **Alles bleibt auf dem Handy.**

## Ablauf in der App

| Bildschirm                     | Datei                       | Zweck |
| ------------------------------ | --------------------------- | ----- |
| Eure Ideen                     | `app/suggestions/results.tsx` | Karten sind antippbar und öffnen die Details. |
| Details                        | `app/activity/[id].tsx`     | Idee lesen, „Das machen wir“, „Fertig“, „Wie war’s?“. |
| Was wir zusammen gemacht haben | `app/history.tsx`           | Liste, Bewertung ändern oder entfernen, löschen. Erreichbar über die Pille „Verlauf“ oben auf dem Start, sobald es einen Eintrag gibt. |

**Details:** Titel, Kategorie-Symbol, Dauer, Altersspanne, Elternenergie (wenig/mittel/viel), Kosten, dann:

1. **Allergene** in einer hervorgehobenen Box. Sie werden aus dem Material abgeleitet (`getAllergens`), nicht aus dem Hinweistext.
2. **Sicherheit**: Der Hinweistext der Aktivität und das Schild „Mit Erwachsenen“, wenn das Material Schere, Messer, Hitze, Feuer,
   Wasser oder ein Elektrogerät enthält (`needsAdults`, dieselbe Regel wie Punkt 2 der Sicherheits-Checkliste).
3. **Material** als Liste (Texte unter `materials` in `de.json`/`en.json`).
4. **Anleitung** nummeriert, mit der größeren Schrift `fontSize.reading` aus dem Theme und viel Platz zwischen den Schritten.

Der Hauptknopf liegt fest am unteren Rand. „Das machen wir“ speichert **noch nichts**, der Text bleibt sichtbar und der Knopf wird zu
„Fertig“. Erst „Fertig“ legt einen Eintrag an und fragt „Wie war’s?“ (Daumen hoch, Daumen runter oder „Überspringen“). Danach geht es
zurück zum Start. Wer die App nach „Das machen wir“ schließt, hinterlässt keinen Eintrag.

**Doppeltippen auf „Fertig“** erzeugt nur einen Eintrag: Der Knopf ist gesperrt, solange gespeichert wird, Speichervorgänge laufen
nacheinander (`src/lib/serialQueue.ts`), und dieselbe Aktivität innerhalb von 5 Minuten wird zu einem Eintrag zusammengefasst
(`addToHistory`).

## Datenmodell

```ts
type HistoryEntry = {
  id: string;           // zufällig
  activityId: string;   // verweist auf Activity.id
  doneAt: string;       // ISO-Zeitpunkt, wann „Fertig“ getippt wurde
  childIds: string[];   // welche Kinder dabei waren (IDs aus den Profilen)
  rating?: 'up' | 'down'; // Daumen hoch / runter, freiwillig
};
```

Code: `src/features/history/history.ts` (reine Funktionen), `historyStorage.ts` (Speichern), `HistoryContext.tsx` (`useHistory()`).

## Speichern (Datenschutz)

- Nur auf dem Gerät, mit AsyncStorage (`src/lib/storage.ts`). Kein Netzwerkaufruf, kein Konto.
- Schlüssel `history.v1`, Inhalt `{ "version": 1, "entries": [ … ] }`. Eine unbekannte Version ergibt einen leeren Verlauf.
- Beim Laden werden kaputte Einträge (ohne ID, Aktivität oder gültiges Datum) und doppelte IDs verworfen. Eine unbekannte Bewertung
  oder kaputte Kinder-IDs fallen weg, der Eintrag bleibt (`sanitizeHistory`).
- **Höchstens 500 Einträge.** Es bleiben die neuesten, die ältesten fallen zuerst weg.
- `childIds` sind zufällige IDs ohne Namen. Löscht man ein Kind, bleibt seine ID im Verlauf, ohne dass daran etwas Persönliches hängt.
  Verwendet wird sie heute nicht, „kürzlich gemacht“ gilt für die ganze Familie.
- Gibt es die Aktivität eines Eintrags nicht mehr (ab M8 aus der Datenbank), zeigt der Verlauf „Nicht mehr verfügbare Idee“.

## Gewichtung (`weights.history` in `src/features/suggestions/scoring.ts`)

Der Verlauf ändert **nur die Reihenfolge**, nie die Auswahl. Er kommt als freiwilliges Feld `history` in `SuggestionRequest`
und wird erst nach den harten Ausschlüssen ausgewertet (`historyIndex.ts`, `scoreHistory`).

| Was | Punkte |
| --- | ------ |
| Kürzlich gemacht, Tag 0 bis 3 | −10 |
| Danach linear abklingend | Tag 7 ≈ −8,4 · Tag 14 ≈ −5,6 · Tag 21 ≈ −2,8 · ab Tag 28: 0 |
| Daumen runter für genau diese Aktivität, Tag 0 bis 89 | −20 (zusätzlich zu „kürzlich gemacht“) |
| Daumen hoch für diese Aktivität, Tag 14 bis 179 (davor Wartezeit) | +3 |
| Daumen hoch für die Kategorie der Aktivität, Tag 0 bis 179 | +1 (auch für andere Aktivitäten der Kategorie, nur einmal) |

Zum Vergleich: ein Interesse zählt +3, eine Abneigung −4, eine zweite Aktivität derselben Kategorie in der Dreiergruppe −5.

Regeln im Detail:

- **Tage sind Kalendertage nach Ortszeit**, keine 24-Stunden-Blöcke (`src/lib/calendarDays.ts`). Gestern 23:59 und heute 00:01 liegen einen Tag
  auseinander. Die Zeitumstellung (25.10.2026: 25 Stunden, 29.3.2026: 23 Stunden) ändert nichts an der Zählung. Liegt ein Eintrag in der
  Zukunft (Uhr verstellt), zählt er als heute.
- **Je Aktivität zählt nur das letzte Mal.** Wer fünfmal dasselbe gemacht hat, wird nicht fünfmal abgezogen.
- **Die neueste Bewertung gilt.** Ein späteres Daumen hoch hebt ein früheres Daumen runter auf und umgekehrt (auch für den Kategorie-Bonus).
  Ein neuerer Eintrag ohne Bewertung ändert die Bewertung nicht.
- Die Bewertung lässt sich im Verlauf nachträglich ändern oder entfernen. Dann gilt sofort die vorherige Bewertung oder keine.
- Die Bildschirm-Reihenfolge friert beim Öffnen von „Eure Ideen“ ein, damit sich die Karten nicht umsortieren, während man zwischen
  Details und Vorschlägen wechselt.

**Garantie „mindestens 3, wenn überhaupt so viele passen“:** Der Verlauf schließt nie etwas aus. Auch ein voller Verlauf (500 Einträge, alles gestern
mit Daumen runter) lässt dieselben Ideen übrig wie ein leerer, und jede Gruppe hat genau 3. Das prüfen die Tests in
`src/features/suggestions/history.test.ts`, auch mit den echten Aktivitäten aus `data/`.

## Verlauf löschen

- **In der App:** Start → „Verlauf“ (Pille oben). Pro Eintrag „Löschen“, ganz unten „Ganzen Verlauf löschen“ (jeweils mit Rückfrage).
  Danach liegt `{ "version": 1, "entries": [] }` auf dem Gerät. Der Knopf auf dem Start verschwindet, sobald kein Eintrag mehr da ist.
- **App löschen** entfernt alles, was die App gespeichert hat (auch die Kinderprofile). Eine Cloud-Sicherung gibt es nicht.
- Beim Entwickeln: `history.v1` in AsyncStorage löschen (oder die App-Daten in den Handy-Einstellungen löschen).

## Hinweis für die Datenschutzerklärung (M12)

- Der Verlauf (welche Idee, an welchem Tag, mit welchen Kindern, Bewertung) liegt **nur lokal auf dem Gerät**. Er wird nicht übertragen,
  nicht ausgewertet und nicht an Dritte weitergegeben. Es gibt keinen Server, keinen Konto-Bezug und keine Analyse-Dienste.
- Die Kinder-Zuordnung besteht aus zufälligen IDs ohne Namen. Nutzer können einzelne Einträge oder den ganzen Verlauf jederzeit in der App löschen.
- Maximal 500 Einträge, ältere werden automatisch entfernt.
- Er wird nur genutzt, um kürzlich Gemachtes weiter hinten und Beliebtes weiter vorn einzusortieren.
- Kommt später ein Konto oder eine Sicherung (siehe „Später“ in der CLAUDE.md), muss dieser Abschnitt neu bewertet werden.

## Testen

```bash
npm test               # Verlauf, Kalendertage, Gewichtung, Garantie, Doppeltippen
npx tsc --noEmit
npx expo lint
```

Alle Tests laufen in deutscher Ortszeit (`jest.global-setup.js` setzt `TZ=Europe/Berlin`), damit die Zeitumstellung wirklich vorkommt.
`src/lib/calendarDays.test.ts` prüft zuerst, dass der 25.10.2026 tatsächlich 25 Stunden hat. Sonst würde der Test nichts beweisen.

Von Hand: `npx expo start`, mit Expo Go öffnen.

1. „Was machen wir?“ → Zeit wählen → eine Karte antippen: Details mit Eckdaten, Material, Schritten. Bei Backen/Kochen die Allergen-Box,
   bei Schere, Messer, Herd oder Wasser das Schild „Mit Erwachsenen“.
2. „Das machen wir“ tippen: Anleitung bleibt, unten steht „Fertig“. Zurückgehen und die App schließen: kein Eintrag.
3. „Fertig“ schnell zweimal tippen: ein Eintrag. Daumen hoch oder runter wählen (oder „Überspringen“), die App landet auf dem Start.
4. Die Pille „Verlauf“ erscheint oben auf dem Start. Dort Bewertung ändern, nochmal tippen = entfernen, Einträge löschen.
5. Erneut „Was machen wir?“: Die gerade gemachte Idee steht nicht mehr vorn. Eine mit Daumen runter steht noch weiter hinten.
