# Aktivitäten (M4)

Aktivitäten sind die Ideen, aus denen die App 3 Vorschläge auswählt (ab M5). Dieser Schritt legt das
Datenmodell an und liefert 20 Beispiele zum Testen. Wie die App daraus auswählt, steht in `docs/suggestions.md`.

## Wo was liegt

| Was                                  | Datei                                          |
| ------------------------------------ | ---------------------------------------------- |
| Datentyp und Prüfung der Form        | `src/features/activities/activities.ts`        |
| Material, Gefahren, Allergene        | `src/features/activities/materials.ts`         |
| Sicherheits-Checkliste (Code)        | `src/features/activities/safetyCheck.ts`       |
| Laden (lokal)                        | `src/features/activities/loadActivities.ts`    |
| 20 Beispiel-Aktivitäten              | `data/sample-activities.json`                  |
| Prüfskript                           | `scripts/check-activities.ts`                  |
| Checkliste (Regeln)                  | `docs/sicherheits-checkliste.md`               |

In der App: `loadActivities()` gibt alle Aktivitäten mit Status `approved` zurück. Kaputte Einträge werden
übersprungen und in der Konsole gemeldet.

## Die Felder

| Feld              | Bedeutung |
| ----------------- | --------- |
| `id`              | Eindeutig, nie ändern (der Verlauf in M7 verweist darauf). |
| `category`        | `craft`, `game`, `movement`, `experiment`, `nature`, `cooking`, `outing`. Bestimmt das Symbol auf den Karten (`CategoryIcon.tsx`). |
| `topics`          | Themen der Aktivität. **Dieselben Schlüssel wie Interessen und Abneigungen** in den Kinderprofilen (`preferences.ts`). Siehe unten. |
| `translations`    | Pro Sprache `title`, `summary`, `steps`, optional `safetyNote`. **`de` und `en` sind Pflicht.** |
| `ageMin`, `ageMax`| Alter in vollen Jahren, **beide Grenzen inklusive**, 0–16. Ein Kind mit 2 Jahren und 11 Monaten zählt als 2. |
| `durationMin`, `durationMax` | Minuten. Ein halber Tag sind etwa 180–240. |
| `setting`         | `indoor`, `outdoor` oder `both`. |
| `weather`         | `needsDry` (nur bei Trockenheit), `betterInSun` (bei Sonne schöner). Beides `false` = wetterunabhängig. |
| `dayParts`        | **Freiwillig.** Nur zu diesen Tageszeiten: `morning`, `afternoon`, `evening`. **Fehlt das Feld, passt die Aktivität zu jeder Tageszeit.** Beispiel: „Sterne beobachten“ hat `["evening"]`. Uhrzeit-Grenzen und Regeln: `docs/suggestions.md`. |
| `months`          | **Freiwillig.** Nur in diesen Monaten, als Zahlen: 1 = Januar … 12 = Dezember. **Fehlt das Feld, passt die Aktivität das ganze Jahr.** Beispiel: Plätzchen backen hat `[11, 12]`, Ostereier färben `[3, 4]`. Nicht leer, keine doppelten, nicht alle 12 (dann weglassen). Gedacht für die Nordhalbkugel. |
| `energy`          | Energie, die Eltern brauchen: `low`, `medium`, `high`. |
| `cost`            | 0 = kostenlos, 1 = wenig, 2 = mehr. |
| `materials`       | Schlüssel aus `materials.ts`. Die Texte stehen unter `materials` in `de.json` und `en.json`. |
| `siblingFriendly` | `true`, wenn Kinder verschiedenen Alters gleichzeitig mitmachen können und jedes eine sinnvolle Rolle hat. |
| `status`          | `draft`, `approved`, `rejected`. Nur `approved` erscheint in der App. |
| `source`          | `ai` oder `manual`. |
| `createdAt`       | ISO-Zeitpunkt. |
| `image`           | **Freiwillig.** Web-Adresse (`https://…`) eines Bildes. Fehlt es, zeigt die App später ein Symbol der Kategorie. In M4 und M5b gibt es keine Bilder. |
| `isSample`        | Nur bei Beispieldaten: `true`. |

### Verknüpfung mit den Interessen der Kinder

`topics` nutzt die Schlüssel aus `src/features/profiles/preferences.ts`. M5 geht so vor:

- Ein Thema der Aktivität steht bei den **Interessen** mindestens eines Kindes: Aktivität nach vorn.
- Ein Thema steht bei den **Abneigungen**: Aktivität nach hinten (nie ausschließen).
- Sonst neutral.

Die Schlüssel `loudPlaces`, `crowds` und `longTrips`, `gettingDirty` gibt es nur als Abneigung.
Sie passen vor allem zu Orten und Veranstaltungen (M10, M11). In den Beispielen kommen nur `gettingDirty`
und `longTrips` vor.

## Material und Sicherheit

Material ist eine feste Liste (`materials.ts`) mit Merkmalen wie „Kleinteile“, „scharf“, „heiß“, „Wasser“
und mit Allergenen. Daraus leitet die Sicherheits-Checkliste ab, welche Hinweise eine Aktivität braucht
(siehe `docs/sicherheits-checkliste.md`).

**Neues Material ergänzen:** Schlüssel in `materials.ts` eintragen und den Text unter `materials` in
`de.json` **und** `en.json` ergänzen. `npm run activities:check` meldet einen fehlenden Text.
Schlüssel nie umbenennen, nur dazunehmen.

## Beispieldaten

Die 20 Beispiele sind bewusst gemischt, damit M5 alle typischen Fälle testen kann: alle Kategorien außer
`outing` (Ausflüge kommen später aus Orten und Veranstaltungen), Alter von 0–2 bis 13–16, Dauer von 15 bis
240 Minuten, drinnen, draußen und wetterunabhängig, mit wenig und viel Elternenergie, mit und ohne
Tageszeit und mit großen Altersunterschieden bei Geschwistern. Alle sind `approved`, weil es Testdaten sind.

Sie sind dreifach als Beispieldaten markiert: Datei `data/sample-activities.json`, Feld `isSample: true`
und IDs mit Präfix `sample-`.

**Beispiele später ersetzen** (spätestens mit M8, Supabase):

1. Die Datei `data/sample-activities.json` löschen und in `loadActivities.ts` den Eintrag entfernen.
2. Verweist der lokale Verlauf (ab M7) noch auf `sample-…`-IDs, beim Ersetzen aufräumen.

## Neue Datei mit Aktivitäten ergänzen (z. B. ein M5b-Paket)

1. Datei in `data/` anlegen (Liste von Aktivitäten, gleiches Format).
2. In `src/features/activities/loadActivities.ts` bei `rawActivities` eintragen.
3. `npm run activities:check` ausführen. Das Skript prüft **alle** Dateien in `data/`
   und meldet, wenn eine nicht in `loadActivities.ts` eingetragen ist.

## Testen

```bash
npm run activities:check   # prüft alle Dateien in data/ und zeigt eine Übersicht
npx tsc --noEmit
npx expo lint
```

`activities:check` zeigt alle Aktivitäten als Tabelle (zum Durchlesen), zählt, was die Daten abdecken,
und meldet Fehler: kaputte Einträge, fehlende Texte, `approved` ohne bestandene Checkliste.
Aktivitäten mit Status `draft`, die die Checkliste nicht bestehen, werden aufgelistet und bleiben `draft`.
Die Vorschlagslogik und die Anzeige-Hilfen haben automatische Tests (`npm test`, siehe `docs/suggestions.md`).
