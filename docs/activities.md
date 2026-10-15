# Aktivitäten (M4, M5b)

Aktivitäten sind die Ideen, aus denen die App 3 Vorschläge auswählt (ab M5). M4 hat das Datenmodell angelegt,
M5b den Startbestand geschrieben. Wie die App daraus auswählt, steht in `docs/suggestions.md`.

## Wo was liegt

| Was                                  | Datei                                          |
| ------------------------------------ | ---------------------------------------------- |
| Datentyp und Prüfung der Form        | `src/features/activities/activities.ts`        |
| Material, Gefahren, Allergene        | `src/features/activities/materials.ts`         |
| Sicherheits-Checkliste (Code)        | `src/features/activities/safetyCheck.ts`       |
| Laden für die App (Supabase, Zwischenspeicher, Rückfall) | `src/features/activities/ActivitiesContext.tsx` (`useActivities()`), Details: `docs/supabase.md` |
| Mitgelieferte Aktivitäten (Rückfall, Tests) | `src/features/activities/bundledActivities.ts` (liest `data/`) |
| Aktivitäten (Bestand)                | `data/activities-*.json`                       |
| Prüfskript                           | `scripts/check-activities.ts`                  |
| Checkliste (Regeln)                  | `docs/sicherheits-checkliste.md`               |

In der App: `useActivities()` (Bildschirme) gibt alle Aktivitäten mit Status `approved` zurück. Sie kommen seit M8 aus Supabase
(einmal pro Tag im Hintergrund abgeglichen, seit M8b nur die Änderungen, lokal zwischengespeichert); sind keine Daten ladbar, nutzt die App die mitgelieferten aus `data/`
(`getBundledActivities()`). Kaputte Einträge werden in jedem Fall übersprungen und in der Konsole gemeldet.

## Die Felder

| Feld              | Bedeutung |
| ----------------- | --------- |
| `id`              | Eindeutig, nie ändern (der Verlauf verweist darauf, `HistoryEntry.activityId`, siehe `docs/history.md`). |
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
| `image`           | **Freiwillig.** Web-Adresse (`https://…`) eines Bildes. Fehlt es, zeigt die App die Illustration der Aktivität (falls sie eine hat) oder die Farbfläche mit Symbol. **Seit M8 nur Adressen von unserem eigenen Speicher** (Allowlist, keine IP-Adressen an fremde Server): Die Adresse muss mit `<EXPO_PUBLIC_SUPABASE_URL>/storage/v1/object/public/` beginnen (`imageAllowlist.ts`). Ein fremdes Bild lässt die App beim Laden weg (die Aktivität bleibt), `npm run activities:check` meldet es als Fehler, ohne Projekt-Adresse in der `.env` ist gar kein Bild erlaubt. Das Feld steht **nur in der Datenbank**: `data/` kennt es nicht, und `npm run db:seed-sql` überschreibt es beim Einspielen nie (seit M9b). Die Bilder sind gezeichnete SVG-Dateien (angezeigt mit `expo-image`, Anleitung zum ersten Test: `docs/supabase.md`, „Bilder: erster Test der Lieferung“). Fällt die Datei aus, zeigt die Karte die Farbfläche. |

### Verknüpfung mit den Interessen der Kinder

`topics` nutzt die Schlüssel aus `src/features/profiles/preferences.ts`. M5 geht so vor:

- Ein Thema der Aktivität steht bei den **Interessen** mindestens eines Kindes: Aktivität nach vorn.
- Ein Thema steht bei den **Abneigungen**: Aktivität nach hinten (nie ausschließen).
- Sonst neutral.

Die Schlüssel `loudPlaces`, `crowds` und `longTrips`, `gettingDirty` gibt es nur als Abneigung.
Sie passen vor allem zu Orten und Veranstaltungen (M10, M11). In den Beispielen kommen nur `gettingDirty`
und `longTrips` vor.

## Material und Sicherheit

Material ist eine feste Liste (`materials.ts`) mit Merkmalen wie „Kleinteile“, „scharf“, „heiß“, „Feuer“,
„Wasser“, „Elektrogerät“, „brennbar“ und mit Allergenen. Daraus leitet die Sicherheits-Checkliste ab,
welche Hinweise eine Aktivität braucht (siehe `docs/sicherheits-checkliste.md`). Wichtig beim Schreiben:
`water` ist Wasser zum Spielen (Schüssel, Eimer, Wanne), `tapWater` nur eine kleine Menge zum Anrühren oder Trinken.
Seit M5b umfasst die Liste 122 Materialien, fast alle aus dem Haushalt.

**Neues Material ergänzen:** Schlüssel in `materials.ts` eintragen und den Text unter `materials` in
`de.json` **und** `en.json` ergänzen. `npm run activities:check` meldet einen fehlenden Text.
Schlüssel nie umbenennen, nur dazunehmen.

## Bestand

| Datei                         | Inhalt |
| ----------------------------- | ------ |
| `data/activities-m4.json`     | Die 20 Aktivitäten aus M4. Sie waren zuerst Beispieldaten, bestehen die Checkliste und gehören seit M5b zum echten Bestand (ohne `isSample`, IDs ohne `sample-`). |
| `data/activities-m5b-1.json`  | Paket 1: Regentag, drinnen, kurz, wenig Energie (21) |
| `data/activities-m5b-2.json`  | Paket 2: Kleinkinder 0–2 und Jugendliche 13–16 (21) |
| `data/activities-m5b-3.json`  | Paket 3: Draußen, allgemeine Ausflüge, Experimente, Rollenspiel (21) |
| `data/activities-m5b-4.json`  | Paket 4: Jahreszeiten und Feste (mit `months`), Geschwister, Küche (21) |

Zusammen **104 Aktivitäten**, alle `approved`. Die Zählung zeigt `npm run activities:check`. Stand nach M5b:

| Was | Anzahl |
| --- | ------ |
| Kategorien | Spiele 22, Basteln 18, Experimente 15, Bewegung 14, Natur 14, Kochen 14, Ausflüge 7 |
| Drinnen oder beides / bei Regen machbar (`needsDry` false) | 81 / 89 |
| Wenig Elternenergie | 67 |
| Passt in 30 Minuten / ganz fertig in 30 Minuten | 81 / 45 |
| Für Babys unter 1 / für 1-Jährige / für 2-Jährige | 6 / 15 / 22 |
| Für 14-Jährige / für 16-Jährige | 38 / 24 |
| Geschwistertauglich / davon mit 10+ Jahren Altersspanne | 94 / 24 |
| Saisonal (`months`) / mit Tageszeit (`dayParts`) | 17 / 10 |

Alle 13 Interessen kommen vor, ebenso die Abneigungen `gettingDirty`, `crowds`, `loudPlaces` und `longTrips`.
Ausflüge sind bewusst allgemein (Bücherei, Spielplatz-Tour, Bahnhof), konkrete Orte kommen mit M10.
**Bewusst noch nicht dabei:** Ideen, die Schnee brauchen. Sie kommen, sobald das Wetter in M6 Schnee kennt,
sonst würden sie im Januar auch ohne Schnee vorgeschlagen.

Seit M8 kommen die Aktivitäten aus Supabase (`docs/supabase.md`). Die Dateien in `data/` sind der Startbestand für die Datenbank (`npm run db:seed-sql`) und der Rückfall in der App.
Seit M9 kommen jede Woche KI-Aktivitäten dazu (`docs/wochenlauf.md`). Sie stehen nur in der Datenbank (`source = 'ai'`, `batch_id`), nicht in `data/`; die Zählung oben gilt nur für `data/`.

## Neue Datei mit Aktivitäten ergänzen

1. Datei in `data/` anlegen (Liste von Aktivitäten, gleiches Format).
2. In `src/features/activities/bundledActivities.ts` bei `rawActivities` eintragen.
3. `npm run activities:check` ausführen. Das Skript prüft **alle** Dateien in `data/`
   und meldet, wenn eine nicht in `bundledActivities.ts` eingetragen ist.
4. `npm run db:seed-sql` ausführen und die neuen Teile in Supabase einspielen (`docs/supabase.md`). Der Test `activitySql.test.ts` meldet, wenn `supabase/seed/` nicht zu `data/` passt.

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
