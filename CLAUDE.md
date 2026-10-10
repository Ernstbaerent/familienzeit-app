# CLAUDE.md – Familienzeit-App (Arbeitstitel)

Diese Datei liest Claude Code bei jedem Start. Sie beschreibt Projekt, Regeln und aktuellen Stand.
Halte sie kurz und aktuell. Details gehören in `docs/`, nicht hierher.

## Projekt in 3 Sätzen

Eine App für iPhone und Android, die Eltern in unter 30 Sekunden 3 passende Vorschläge gibt,
was sie jetzt oder heute mit ihren Kindern (0–16 Jahre) machen können: Basteln, Spiele, Ausflüge, Veranstaltungen.
Sie berücksichtigt verfügbare Zeit, Energie der Eltern, Alter und Vorlieben der Kinder, Wetter und Standort.
Team: Clemens (Technik, programmiert mit dir), Ani (Design, Ideen).

## Produktprinzipien (bei jeder Entscheidung beachten)

1. **Spontan statt geplant:** Keine Kurse, Abos oder Anmeldungen über den heutigen Tag hinaus.
2. **30 Sekunden:** Wenige Eingaben, immer genau 3 Vorschläge.
3. **Sortieren statt aussortieren:** Nur Sicherheit und Machbarkeit schließen aus, alles andere gewichtet nur.
4. **Immer ein Ergebnis:** Nie eine leere Liste. Fallback sind Aktivitäten für zu Hause.
5. **Handy weg:** Die App ist schnell erledigt. Keine Endlos-Feeds, keine Bindungstricks.
6. **Datenschutz zuerst:** Ohne Konto nutzbar, persönliche Daten nur auf dem Gerät.

## Positionierung und Design-Leitlinien

- **Kern:** Zeit, Energie, Wetter und Ort werden zu einer Entscheidung, zu Hause genauso wie draußen (Wettbewerb: `docs/wettbewerb.md`).
- Ruhig und warm statt bunt und verspielt. Keine Punkte, Abzeichen, Level oder ungefragten Benachrichtigungen.
- Die Entscheidung steht im Mittelpunkt: ein Hauptknopf, drei klare Karten, kein Scrollen durch lange Listen.
- Zu Hause und draußen gleichwertig zeigen, die App soll nicht wie eine reine Ausflugs-App wirken.
- Datenschutz sichtbar machen („ohne Konto, alles bleibt auf deinem Handy“).

## Arbeitsweise mit Clemens

- Clemens ist Einsteiger mit erster App-Erfahrung. Antworte auf **Deutsch**, kurz und verständlich.
- Arbeite in **kleinen Schritten**. Vor größeren Änderungen: erst kurzen Plan zeigen, dann umsetzen.
- Erkläre nach jedem Schritt in 2–3 Sätzen, was du gemacht hast und **wie Clemens es testen kann**.
- Keine neuen Bibliotheken oder kostenpflichtigen Dienste ohne Rückfrage. Budget: ca. 20 € pro Monat.
- Nach jedem erledigten Meilenstein-Schritt: Roadmap unten abhaken, Commit-Nachricht vorschlagen.
- Wenn etwas unklar ist: nachfragen statt raten.

## Tech-Stack

- **App:** Expo (React Native), TypeScript (strict), Expo Router
- **Übersetzungen:** i18next + react-i18next + expo-localization
- **Lokale Daten:** @react-native-async-storage/async-storage
- **Backend:** Supabase (Postgres, Region Frankfurt) – nur öffentliche Daten
- **KI:** Claude API (Haiku) – nur serverseitig (Skript/GitHub Action), **nie in der App**
- **Wetter:** Bright Sky API (DWD-Daten, ohne Schlüssel)
- **Orte:** OpenStreetMap Overpass API (Ergebnisse cachen, sparsam abfragen)
- **Veranstaltungen:** German Tourism Knowledge Graph
- **Symbole:** @expo/vector-icons (Ionicons, nur Linien-Varianten `…-outline`), Zuordnung Kategorie → Symbol nur in `src/features/activities/CategoryIcon.tsx`
- **Tests:** Jest (über `jest-expo`) für Logik (vor allem die Vorschlagslogik)

## Befehle

```bash
npm install            # Abhängigkeiten installieren
npx expo start         # App starten, mit Expo Go auf dem Handy testen
npx tsc --noEmit       # TypeScript prüfen
npm test               # Tests ausführen
npx expo lint          # Code-Stil prüfen
npm run places:test    # M2a: Machbarkeitstest Orte (Overpass API, braucht Node 22+, Zwischenspeicher in scripts/.cache/)
npm run activities:check  # M4: prüft alle Aktivitäten in data/ (Form, Sicherheits-Checkliste, Texte), braucht Node 22+
```

## Ordnerstruktur (Ziel)

```
app/                  # Bildschirme (Expo Router)
src/components/       # wiederverwendbare UI-Bausteine
src/features/         # profiles, suggestions, activities, weather, places, events
src/lib/              # supabase, i18n, storage, theme, Hilfsfunktionen
src/locales/          # de.json, en.json, später ar, tr, uk, ro
data/                 # Beispiel-Aktivitäten (JSON)
scripts/              # z. B. generate-activities.ts (KI-Wochenlauf)
supabase/migrations/  # Datenbank-Änderungen als SQL
docs/                 # Konzept und Anleitungen
```

## Regeln für den Code

- Code, Variablen und Dateinamen auf **Englisch**, Kommentare gern auf Deutsch.
- **Keine festen Texte im UI.** Jeder sichtbare Text kommt aus `src/locales/*.json` über i18next.
- **Keine festen Farben, Schriftgrößen, Abstände oder Eckenradien im UI.** Nur aus `src/lib/theme.ts` nehmen;
  fehlt ein Wert, dort ergänzen. `npx expo lint` prüft das in `app/`, `src/components/` und `src/features/`.
- **Rechts-nach-links vorbereiten (Arabisch):** `marginStart`/`marginEnd` statt `marginLeft`/`marginRight`,
  `start`/`end` statt `left`/`right`, Icons mit Richtung spiegeln. Gespiegelt wird nur, wenn die
  angezeigte Sprache rechts-nach-links ist; bis dahin ist es ausgeschaltet (siehe `docs/i18n.md`).
- **Geheimnisse nie ins Repo:** API-Schlüssel nur in `.env` (steht in `.gitignore`) oder GitHub Secrets.
  In der App nur öffentliche Schlüssel (Supabase anon key, `EXPO_PUBLIC_*`).
- **Datenschutz:** Kinderprofile, Feedback und Verlauf nur lokal speichern. Kein echter Name nötig,
  nur Geburtsjahr und -monat. Standort nur bei Nutzung, auf 2 Nachkommastellen (~1 km) runden,
  bevor er an externe Dienste geht.
- Vorschlagslogik als **reine Funktionen** in `src/features/suggestions/` – ohne UI, mit Tests.

## Vorschlagslogik

Umgesetzt in `src/features/suggestions/`, Gewichte und Details in `docs/suggestions.md`.

**Harte Ausschlüsse (nur diese):**
- nicht altersgerecht für mindestens ein ausgewähltes Kind
- dauert länger als die verfügbare Zeit (inkl. Anfahrt)
- passt nicht zur Tageszeit (`dayParts` der Aktivität)
- passt nicht zum Monat (`months` der Aktivität, z. B. Plätzchen nur im November und Dezember)
- draußen bei Gefahr (Gewitter, Sturm, Unwetterwarnung)
- braucht Trockenheit (`needsDry`), es regnet oder gewittert
- Kurse oder Voranmeldung über heute hinaus
- geschlossen oder bereits vorbei

**Gewichtung (nur Reihenfolge):** Interessen/Abneigungen, Wetter-Eignung, Entfernung, Kosten,
Energie der Eltern, Abwechslung (verschiedene Kategorien unter den 3 Vorschlägen; kürzlich Gemachtes nach hinten),
Eignung für Geschwister.

**Fallback:** Zu wenig Orte/Veranstaltungen → Umkreis vergrößern (z. B. 5 → 15 → 30 km) und das anzeigen.
Danach mit Aktivitäten für zu Hause auffüllen. Ergebnis immer genau 3. Bleiben nach den harten Ausschlüssen
weniger als 3 übrig, zeigt die App die vorhandenen mit einem freundlichen Hinweis (Sicherheit wird nie aufgeweicht).

## Datenmodell Aktivität

Umgesetzt in `src/features/activities/`, Felder und Regeln in `docs/activities.md`.

```ts
type Activity = {
  id: string;
  category: 'craft' | 'game' | 'movement' | 'experiment' | 'nature' | 'cooking' | 'outing';
  topics: TopicKey[];        // Themen, gleiche Schlüssel wie Interessen/Abneigungen der Kinderprofile
  translations: Record<string, { title: string; summary: string; steps: string[]; safetyNote?: string }>;  // de + en Pflicht
  ageMin: number;            // Jahre, inklusive
  ageMax: number;
  durationMin: number;       // Minuten
  durationMax: number;
  setting: 'indoor' | 'outdoor' | 'both';
  weather: { needsDry: boolean; betterInSun: boolean };
  dayParts?: ('morning' | 'afternoon' | 'evening')[];   // freiwillig: nur zu diesen Tageszeiten; fehlt = jederzeit
  months?: number[];         // freiwillig: nur in diesen Monaten (1 = Januar … 12 = Dezember); fehlt = ganzes Jahr
  energy: 'low' | 'medium' | 'high';   // Energie, die Eltern brauchen
  cost: 0 | 1 | 2;           // 0 = kostenlos, 1 = wenig, 2 = mehr
  materials: MaterialKey[];  // Schlüssel aus materials.ts (mit Gefahren und Allergenen), übersetzt über locales
  siblingFriendly: boolean;
  status: 'draft' | 'approved' | 'rejected';   // nur 'approved' erscheint in der App
  source: 'ai' | 'manual';
  createdAt: string;
  image?: string;            // freiwillig: Web-Adresse; ohne Bild zeigt die App das Symbol der Kategorie
  isSample?: true;           // Beispieldaten (`data/sample-activities.json`), später durch die echte Datenbank ersetzen
};
```

## KI-Wochenlauf

- Einmal pro Woche (GitHub Action) erstellt ein Skript 10–20 neue Aktivitäten mit der Claude API.
- Berücksichtigt Jahreszeit, Feiertage und Stichwort-Ideen aus der Tabelle `activity_ideas`.
- Neue Aktivitäten starten immer mit `status: 'draft'`. Statt einer Freigabe durch Menschen gilt die
  **Sicherheits-Checkliste** (`docs/sicherheits-checkliste.md`): Was besteht, wird automatisch `approved`.
  Was nicht besteht, bleibt `draft` und wird im Prüfskript (`npm run activities:check`) aufgelistet.
- Den Status `draft` behalten wir trotzdem, damit wir eine Freigabe durch Menschen später wieder einführen können.
- Die KI liefert Titel, Anleitung, Altersgrenzen und Sicherheitshinweise vollständig.

## Roadmap erste Version

Bearbeite immer den **ersten offenen Punkt**, außer Clemens sagt etwas anderes.
Punkte mit „⏸ wartet" überspringst du, bis die genannte Voraussetzung erfüllt ist.

- [x] **M1 Grundgerüst:** Expo-Projekt mit TypeScript, Expo Router, Ordnerstruktur, i18next mit de/en, RTL-Vorbereitung, Startbildschirm
- [x] **M2a Machbarkeitstest Orte (OpenStreetMap):** Skript `scripts/feasibility-places.ts` fragt über die Overpass API familientaugliche Orte für zwei Testorte (Greiz, Reudnitz) in 5/15/30 km ab; Ergebnis in `docs/machbarkeit-orte.md` (nur Test, keine App-Funktion)
- [ ] **M2b Machbarkeitstest Veranstaltungen (Knowledge Graph):** Skript, das den Knowledge Graph für eine Region abfragt und das Ergebnis zusammenfasst (nur Test, keine App-Funktion). ⏸ wartet auf den API-Schlüssel
- [x] **M3 Kinderprofile:** Einstieg ohne Konto, mehrere Kinder anlegen/bearbeiten, lokal speichern
- [x] **M4 Aktivitäten:** Datenmodell, 20 Beispiel-Aktivitäten in `data/`, lokal laden
- [x] **M5 Vorschläge:** Zeit + Energie wählen, Vorschlagslogik mit Tests, 3 Vorschläge anzeigen
- [ ] **M5b Startbestand Aktivitäten:** Claude Code schreibt weitere Aktivitäten vollständig in eigenen Worten (Titel, Kurzbeschreibung, Schritte, Material, Altersangaben, Sicherheitshinweise, Deutsch und Englisch), in Paketen zu je 20–25, bis mindestens 100 erreicht sind. Ideen dürfen bekannte Klassiker sein, Texte werden nie von Websites übernommen. Jede Aktivität durchläuft nach dem Schreiben die Sicherheits-Checkliste (`docs/sicherheits-checkliste.md`); nur wer besteht, wird `approved`. Bilder sind nicht Teil von M5b
- [ ] **M6 Wetter und Standort:** Bright Sky und Standortabfrage in die Vorschlagslogik einbinden
- [ ] **M7 Details und Feedback:** Detailansicht, Daumen hoch/runter, Verlauf lokal
- [ ] **M8 Supabase:** Aktivitäten aus der Datenbank laden (nur `approved`), Offline-Cache
- [ ] **M9 KI-Wochenlauf:** Generator-Skript, GitHub Action, `activity_ideas`. Der Wochenlauf ergänzt laufend neue Aktivitäten zum Bestand aus M5b
- [ ] **M10 Orte:** OpenStreetMap-Abfrage für Spielplätze, Museen, Bäder usw. Erkenntnisse aus M2a (Zahlen und Begründung: `docs/machbarkeit-orte.md`):
  1. Orte ohne Öffnungszeiten nicht ausschließen, sondern mit dem Hinweis „Öffnungszeiten vorher prüfen" anzeigen.
  2. Bäder mit drinnen/draußen kennzeichnen und eine Saison berücksichtigen (keine Freibäder außerhalb der Saison).
  3. Namenlose Orte (z. B. Spielplätze) über Straße oder Ortsteil beschreiben.
  4. Kategorien nach Kindertauglichkeit gewichten (z. B. Rastplätze und kleine Sehenswürdigkeiten niedrig).
  5. Bei Regen sind Indoor-Orte vor Ort selten: Die Aktivitäten für zu Hause sind dann besonders wichtig.
- [ ] **M11 Veranstaltungen:** Knowledge Graph in die Vorschläge einbinden
- [ ] **M12 Beta:** Datenschutzerklärung, Impressum, Testversionen für Freunde und Familie. Vorher liest ein Mensch alle Aktivitäten einmal durch

## Später (nicht jetzt bauen)

Weitere Sprachen (ar, tr, uk, ro), Kind-Modus, Erinnerungen mit Fotos, Wochenend-Push,
Konto und Familie teilen, Premium/Abo, Radiosender-Kooperationen, Nachbarländer,
Anbieter-Portal (lokale Anbieter tragen Angebote und Termine selbst ein), Widget „Idee für heute“,
Vorschläge für einen anderen Ort (z. B. Urlaubsort).

## Notizen und Entscheidungen

<!-- Hier kurze Einträge ergänzen, wenn etwas Wichtiges entschieden wurde. Format: Datum – Entscheidung -->
- 2026-10-09 – Konzept festgelegt, Stack: Expo + Supabase + Claude API (Haiku)
- 2026-10-10 – M1: Expo SDK 57, Bildschirme in `app/`, Pfad-Kürzel `@/` = `src/`. App-Sprache = erste passende Handysprache, sonst Englisch (siehe `docs/i18n.md`)
- 2026-10-10 – Zentrales Theme in `src/lib/theme.ts` (Farben, Schriftgrößen, Abstände, Eckenradien) mit neutralen Platzhalterwerten, bis Ani das Design festlegt. Breiten und Höhen bewusst nicht im Theme
- 2026-10-10 – RTL nur, wenn die angezeigte Sprache RTL ist. Bis eine RTL-Übersetzung kommt, ist Spiegeln in `app.json` ausgeschaltet
- 2026-10-10 – Roadmap: M2 aufgeteilt in M2a (Orte, OpenStreetMap, jetzt) und M2b (Veranstaltungen, wartet auf API-Schlüssel). M10 „Orte" bleibt die spätere App-Funktion
- 2026-10-10 – M2a abgeschlossen: Rund um Greiz und Reudnitz gibt es in OSM genug Orte für 3 Vorschläge, aber dünn im Dorf (5 km), bei Regen (keine Kinder-Indoor-Ziele im 15-km-Umkreis) und bei Öffnungszeiten (nur ca. ein Drittel der Bäder, Museen, Zoos, Indoor-Angebote). Die öffentlichen Overpass-Server sind langsam und schwankend: Orte live aus der App abzufragen ist riskant, vor M10 klären, ob sie vorab geladen werden. Die 5 Erkenntnisse stehen bei M10
- 2026-10-10 – Entscheidung aus M2a: Orte werden nicht live aus der App abgefragt, sondern im Hintergrund vorab geladen und in unserer Datenbank (Supabase) abgelegt. Die App liest nur von dort (Details bei M10)
- 2026-10-10 – Entscheidung aus M2a: Für die Auswertung der Öffnungszeiten darf in M10 eine Bibliothek verwendet werden. Welche, wird vor M10 kurz mit Clemens abgestimmt; für alle anderen neuen Bibliotheken gilt weiter die Rückfrage
- 2026-10-10 – M3 abgeschlossen: Kinderprofile nur lokal (AsyncStorage, Schlüssel `profiles.v1`), Details in `docs/profiles.md`. Pflicht sind nur Geburtsjahr und -monat; Spitzname, Interessen und Abneigungen sind freiwillig. Alter unter 2 Jahren in Monaten, ab 2 Jahren in Jahren. Interesse und Abneigung schließen sich gegenseitig aus. Mindestens ein Kind ist nötig (ohne Kind leitet der Start zum Anlegen weiter). Auswahllisten stehen in `src/features/profiles/preferences.ts` (neues Thema = 1 Zeile + Texte in de/en). AsyncStorage ist die einzige neue Bibliothek. Jest ist noch nicht eingerichtet, kommt mit M5
- 2026-10-10 – M4 abgeschlossen: Datenmodell in `src/features/activities/`, 20 Beispiele in `data/sample-activities.json` (alle `approved`, aber als Beispieldaten markiert: `isSample`, IDs `sample-…`), Details in `docs/activities.md`. Neue Felder gegenüber dem Entwurf: `topics` (gleiche Schlüssel wie Interessen/Abneigungen, damit M5 zuordnen kann), `dayParts` (freiwillig, Tageszeit; fehlt = jederzeit), `image` (freiwillig; ohne Bild später Kategorie-Symbol), `isSample`. Material ist eine feste Liste mit Gefahren und Allergenen (`materials.ts`); daraus prüft `npm run activities:check` die Sicherheits-Checkliste. Dafür ist `allowImportingTsExtensions` in `tsconfig.json` gesetzt, damit das Skript Code aus `src/` nutzen kann. Jest kommt weiter mit M5
- 2026-10-10 – Entscheidung zu Aktivitäten: Keine Freigabe durch Ani. Es gilt die Sicherheits-Checkliste (`docs/sicherheits-checkliste.md`) für M5b und den KI-Wochenlauf; bestanden = `approved`, sonst bleibt es `draft`. Vor der Beta (M12) liest ein Mensch alle Aktivitäten einmal durch. Team-Zeile: Ani macht Design und Ideen
- 2026-10-10 – M5 abgeschlossen: „Was machen wir?“ (`app/suggestions/`) mit Kindern (alle vorausgewählt), Zeit (30 Min./1 Std./2 Std./halber Tag = 240 Min.), Energie (freiwillig) und 3 Karten mit „Andere Vorschläge“. Details in `docs/suggestions.md`. Entscheidungen: Tageszeit (`dayParts`) und `needsDry` bei Regen/Gewitter sind harte Ausschlüsse (Machbarkeit; „Sortieren statt aussortieren“ zielt auf zu wenige Orte auf dem Land, bei Regen gibt es genug für drinnen). Zeit schließt nur aus, wenn schon `durationMin` nicht passt. Bei Gewitter bleibt `both` (drinnen machbar). Tageszeit-Grenzen: Morgen ab 5, Nachmittag ab 12, Abend ab 17 Uhr. Abwechslung über Abzug je gleicher Kategorie in der Dreiergruppe. Weniger als 3 Treffer: vorhandene zeigen plus Hinweis, Tipps nur, wenn sie wirklich helfen. Wetter und Tageszeit sind bis M6 eine Test-Auswahl, alle Stellen mit `TEST (M6)` markiert. Neue Pakete: `@expo/vector-icons` (Ionicons, Linien-Stil), `jest`, `jest-expo`, `@types/jest`. In `tsconfig.json` steht `"types": ["jest"]`, weil TypeScript 6 Typ-Pakete nicht mehr automatisch einbindet. Gemeinsamer Baustein `Section` in `src/components/`
