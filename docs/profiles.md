# Kinderprofile (M3)

Eltern legen beim ersten Start ohne Konto ein oder mehrere Kinder an. Die Profile sind die Grundlage
für die Vorschlagslogik (Alter, Interessen, Abneigungen).

## Pflicht und freiwillig

| Angabe                         | Pflicht? | Hinweis                                                   |
| ------------------------------ | -------- | --------------------------------------------------------- |
| Geburtsjahr und -monat         | **Ja**   | Nur Jahr und Monat, nie der genaue Tag. Nicht in der Zukunft. |
| Spitzname                      | Nein     | Höchstens 30 Zeichen. Ein echter Name ist nicht nötig.     |
| Interessen                     | Nein     | Darf leer bleiben.                                         |
| Abneigungen                    | Nein     | Darf leer bleiben.                                         |

„Speichern“ ist erst aktiv, wenn Geburtsjahr und -monat gewählt sind. Alles andere darf leer bleiben.

Interessen und Abneigungen **sortieren nur** (Produktprinzip „Sortieren statt aussortieren“): Ein Thema bei den
Abneigungen schließt Ideen nicht aus, sie kommen nur weiter hinten. Fehlen sie ganz, ist das neutral.
Ein Thema kann nicht gleichzeitig Interesse und Abneigung sein: Wählt man es auf der einen Seite,
verschwindet es auf der anderen.

## Alter anzeigen

Wir kennen nur Jahr und Monat. Im Geburtsmonat ist ein Kind also 0 Monate alt.

- Unter 1 Jahr: Monate („8 Monate“)
- Ab 1 Jahr bis unter 2 Jahren: „1 Jahr“ oder „1 Jahr und 4 Monate“
- Ab 2 Jahren: Jahre („5 Jahre“)

Die Regel steht in `describeAge` (`src/features/profiles/profiles.ts`), der Text in `src/features/profiles/formatAge.ts`
und in den Übersetzungen unter `age`.

## Wo es gespeichert wird (Datenschutz)

- Nur auf dem Gerät, mit AsyncStorage (`src/lib/storage.ts`). Es gibt keinen Netzwerkaufruf und kein Konto.
- Schlüssel `profiles.v1`, Inhalt `{ "version": 1, "children": [ … ] }` (`src/features/profiles/profileStorage.ts`).
- Ein Kind besteht aus: `id` (zufällig), `nickname?`, `birthYear`, `birthMonth` (1–12), `interests`, `dislikes`, `createdAt`.
- Beim Laden werden kaputte Einträge, doppelte IDs und unbekannte Themen verworfen (`sanitizeChildren`).
- Wird die App gelöscht, sind auch die Profile weg. Es gibt keine Sicherung in der Cloud.

## Ein Thema zur Auswahl ergänzen

Die Listen stehen in `src/features/profiles/preferences.ts`.

1. Schlüssel in `interestKeys` eintragen, wenn man das Thema mögen können soll.
   Themen, die nur als Abneigung Sinn ergeben (wie „laute Orte“), kommen in `dislikeKeys`
   (dort stehen automatisch alle Interessen mit drin).
2. Den Text unter `preferences` in **`src/locales/de.json` und `src/locales/en.json`** ergänzen
   (derselbe Schlüssel). `npx tsc --noEmit` meldet einen fehlenden Text.
3. Fertig. Das Formular zeigt das Thema automatisch an.

Gespeichert wird der Schlüssel, nie der Text. Deshalb gilt:

- Den **Text ändern** ist jederzeit möglich.
- Einen **Schlüssel nie umbenennen**: Alte Profile kennen ihn sonst nicht mehr.
  Stattdessen einen neuen Schlüssel ergänzen.
- Ein Thema **entfernen** ist möglich. Es verschwindet beim Laden aus bestehenden Profilen.

## Bildschirme

| Bildschirm        | Datei                       | Zweck                                                         |
| ----------------- | --------------------------- | ------------------------------------------------------------- |
| Start             | `app/index.tsx`             | Kinder-Kacheln (Tipp wählt aus oder ab, Stift-Symbol bearbeitet, Kachel „Kind hinzufügen“), dazu die Auswahl für die Vorschläge (`docs/suggestions.md`, „Start und Auswahl“). Ohne Kind geht es automatisch zu „Kind anlegen“. |
| Kind anlegen      | `app/children/new.tsx`      | Beim ersten Kind mit Willkommenstext.                         |
| Kind bearbeiten   | `app/children/[id].tsx`     | Ändern oder löschen (mit Sicherheitsabfrage).                  |

Es braucht mindestens ein Kind: Ohne Alter gibt es keine Vorschläge. Löscht man das letzte Kind,
landet man wieder beim Anlegen.

Das Formular steckt in `src/features/profiles/ChildForm.tsx`, der Zugriff auf die Profile in
`src/features/profiles/ProfilesContext.tsx` (`useProfiles()`).

## Testen

Die Logik (Alter, Auswahl, Aufräumen) besteht aus reinen Funktionen in `profiles.ts` und `preferences.ts`.
Jest ist seit M5 eingerichtet (`npm test`), eigene Tests für die Profil-Funktionen gibt es noch nicht.
Bis dahin von Hand mit `npx expo start` und Expo Go ausprobieren.
