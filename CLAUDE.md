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
- **Wetter:** Bright Sky API (DWD-Daten, ohne Schlüssel), Details in `docs/weather.md`
- **Standort:** expo-location, nur im Vordergrund und auf 2 Nachkommastellen gerundet
- **Orte:** OpenStreetMap Overpass API (Ergebnisse cachen, sparsam abfragen)
- **Veranstaltungen:** German Tourism Knowledge Graph, ThüCAT, open.destination.one (siehe M11)
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
src/features/         # profiles, suggestions, activities, history, weather, places, events
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
- **Veranstaltungsdaten nur aus lizenzierten Quellen oder von Veranstaltern selbst eingereicht.** Niemals fremde
  Websites oder Kalender automatisch auslesen (Datenbankherstellerrecht, siehe `docs/veranstaltungsquellen.md`).
- Vorschlagslogik als **reine Funktionen** in `src/features/suggestions/` – ohne UI, mit Tests.

## Vorschlagslogik

Umgesetzt in `src/features/suggestions/`, Gewichte und Details in `docs/suggestions.md`.

**Harte Ausschlüsse (nur diese):**
- nicht altersgerecht für mindestens ein ausgewähltes Kind
- dauert länger als die verfügbare Zeit (inkl. Anfahrt)
- passt nicht zur Tageszeit (`dayParts` der Aktivität)
- passt nicht zum Monat (`months` der Aktivität, z. B. Plätzchen nur im November und Dezember)
- draußen bei Gefahr (Gewitter, Sturm, Unwetterwarnung)
- braucht Trockenheit (`needsDry`), es regnet, gewittert oder schneit
- Kurse oder Voranmeldung über heute hinaus
- geschlossen oder bereits vorbei

**Gewichtung (nur Reihenfolge):** Interessen/Abneigungen, Wetter-Eignung, Hitze und Frost (draußen nach hinten), Entfernung, Kosten,
Energie der Eltern, Abwechslung (verschiedene Kategorien unter den 3 Vorschlägen), Verlauf (kürzlich Gemachtes und Daumen runter nach hinten,
Daumen hoch nach vorn, siehe `docs/history.md`), Eignung für Geschwister.

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
- [ ] **M2b Machbarkeitstest Veranstaltungen:** Skript, das den DZT Knowledge Graph, ThüCAT und open.destination.one (Sachsen/Vogtland) für Greiz und Reudnitz abfragt und das Ergebnis zusammenfasst (nur Test, keine App-Funktion). Zugang und Quellen: `docs/veranstaltungsquellen.md`. ⏸ wartet auf die API-Schlüssel
- [x] **M3 Kinderprofile:** Einstieg ohne Konto, mehrere Kinder anlegen/bearbeiten, lokal speichern
- [x] **M4 Aktivitäten:** Datenmodell, 20 Beispiel-Aktivitäten in `data/`, lokal laden
- [x] **M5 Vorschläge:** Zeit + Energie wählen, Vorschlagslogik mit Tests, 3 Vorschläge anzeigen
- [x] **M5b Startbestand Aktivitäten:** Claude Code schreibt weitere Aktivitäten vollständig in eigenen Worten (Titel, Kurzbeschreibung, Schritte, Material, Altersangaben, Sicherheitshinweise, Deutsch und Englisch), in Paketen zu je 20–25, bis mindestens 100 erreicht sind. Ideen dürfen bekannte Klassiker sein, Texte werden nie von Websites übernommen. Jede Aktivität durchläuft nach dem Schreiben die Sicherheits-Checkliste (`docs/sicherheits-checkliste.md`); nur wer besteht, wird `approved`. Bilder sind nicht Teil von M5b
- [x] **M6 Wetter und Standort:** Bright Sky und Standortabfrage in die Vorschlagslogik eingebunden (Details: `docs/weather.md`). Ohne Standort fragt die App „Wie ist das Wetter?“, die Tageszeit kommt aus der Uhrzeit
- [ ] **M6b Schnee-Aktivitäten:** Aktivitäten für Schnee ergänzen (in M5b bewusst weggelassen, weil das Wetter noch keinen Schnee kannte; seit M6 gibt es die Wetterlage `snow`). Dafür braucht das Datenmodell ein Feld für „braucht Schnee“ (Vorschlag: `weather.needsSnow`), mit Regel in der Vorschlagslogik und Tests, danach durchlaufen die neuen Aktivitäten die Sicherheits-Checkliste
- [x] **M7 Details und Feedback:** Detailansicht, Daumen hoch/runter, Verlauf lokal
- [ ] **M8 Supabase:** Aktivitäten aus der Datenbank laden (nur `approved`), Offline-Cache
- [ ] **M9 KI-Wochenlauf:** Generator-Skript, GitHub Action, `activity_ideas`. Der Wochenlauf ergänzt laufend neue Aktivitäten zum Bestand aus M5b
- [ ] **M10 Orte:** OpenStreetMap-Abfrage für Spielplätze, Museen, Bäder usw. Erkenntnisse aus M2a (Zahlen und Begründung: `docs/machbarkeit-orte.md`):
  1. Orte ohne Öffnungszeiten nicht ausschließen, sondern mit dem Hinweis „Öffnungszeiten vorher prüfen" anzeigen.
  2. Bäder mit drinnen/draußen kennzeichnen und eine Saison berücksichtigen (keine Freibäder außerhalb der Saison).
  3. Namenlose Orte (z. B. Spielplätze) über Straße oder Ortsteil beschreiben.
  4. Kategorien nach Kindertauglichkeit gewichten (z. B. Rastplätze und kleine Sehenswürdigkeiten niedrig).
  5. Bei Regen sind Indoor-Orte vor Ort selten: Die Aktivitäten für zu Hause sind dann besonders wichtig.
- [ ] **M11 Veranstaltungen:** Die ersten Quellen (Knowledge Graph, ThüCAT, open.destination.one) in die Vorschläge einbinden (Recherche: `docs/veranstaltungsquellen.md`). Pflicht von Anfang an:
  1. Lizenz und Quellenangabe pro Veranstaltung speichern.
  2. Datensätze mit NC- oder ND-Lizenz herausfiltern.
  3. Quellenhinweis in der Detailansicht anzeigen.
  4. Dubletten über Ort, Startzeit und Titel erkennen.
- [ ] **M12 Beta:** Datenschutzerklärung, Impressum, Testversionen für Freunde und Familie. Vorher liest ein Mensch alle Aktivitäten einmal durch

## Später (nicht jetzt bauen)

Weitere Sprachen (ar, tr, uk, ro), Kind-Modus, Erinnerungen mit Fotos, Wochenend-Push,
Konto und Familie teilen, Premium/Abo, Radiosender-Kooperationen, Nachbarländer,
Anbieter-Portal (lokale Anbieter tragen Angebote und Termine selbst ein), Widget „Idee für heute“,
Bildschirm anlassen während der Anleitung (braucht ein neues Paket, `expo-keep-awake`, vorher Rückfrage),
Vorschläge für einen anderen Ort (z. B. Urlaubsort), Wetter im Ausland (Urlaub), z. B. über eine zweite Wetterquelle (Bright Sky deckt nur Deutschland ab).
Veranstaltungen (Details: `docs/veranstaltungsquellen.md`): Einreichungsformular für Veranstalter (Vereine, Kitas, Kirchgemeinden) mit Lizenz-Einwilligung,
Ticket-Partnerprogramme (Eventim über AWIN, Reservix/ADticket), Kooperationen (Freizeitkalender Vogtland, Flohmarkt- und Mittelalter-Portale),
weitere Landesschnittstellen.

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
- 2026-10-10 – M5b abgeschlossen: 104 Aktivitäten (20 aus M4 + 4 Pakete à 21 in `data/activities-m5b-*.json`), alle `approved`, Verteilung in `docs/activities.md`. Die 20 aus M4 sind jetzt echter Bestand (Datei `data/activities-m4.json`, ohne `isSample`, IDs ohne `sample-`; das Feld `isSample` ist aus dem Datenmodell entfernt). Neues freiwilliges Feld `months` (1–12, fehlt = ganzes Jahr) als harter Ausschluss `month`, Monat aus dem Datum. Monate statt Jahreszeiten, weil Ostern, Advent und Laternenzeit nicht in eine Jahreszeit passen. Waldtag mit Picknick April–Oktober, Sterne beobachten September–März. Sicherheits-Checkliste um Punkt 6 (Elektrogeräte: nur klein und batteriebetrieben, Batterien vorher heraus, nie mit Netzstecker, Fernseher, Mikrowellen, Monitore, Netzteile) und Punkt 7 (Licht in Papier nur mit LED, nie Kerze; Feuer und brennbares Material nie zusammen) erweitert, mit Tests. Neue Materialien: `tapWater` (Leitungswasser in kleinen Mengen, Wasser zum Spielen bleibt `water`), Vogelfutter mit Allergenen Erdnüsse und Nüsse, insgesamt 53 neue (jetzt 122). Prüfskript zählt die Verteilung und meldet doppelte Titel. Schnee-Ideen erst nach M6
- 2026-10-11 – M6 abgeschlossen: Wetter und Standort, Details und alle Zahlen in `docs/weather.md`. Code in `src/features/weather/`, die Vorschlagslogik bleibt reine Funktionen und bekommt nur `weather` (neu: `snow`), `temperature` und `severeWarning` über `SuggestionRequest`. Standort nur im Vordergrund, erst nach einer Erklär-Karte, sofort auf 2 Nachkommastellen gerundet (auch die Internet-Adressen runden selbst); ohne Standort fragt die App „Wie ist das Wetter?“ (die Test-Auswahl aus M5 ist darin aufgegangen, `TestConditions` und alle `TEST (M6)` sind weg). Die Tageszeit kommt aus der Uhrzeit. Zeitfenster: gewählte Zeit, mindestens 2 Std.; der schlimmste Wert im Fenster zählt (Gewitter > Regen > Schnee > bewölkt/Sonne). Regen zählt erst ab 0,3 mm/h (Nieselregen blockiert nichts), Gewitter, Hagel und Schnee immer. Amtliche Warnung vor Gewitter, Sturm oder Orkan (jede Stufe) und jede andere Warnung ab Stufe 3 schließt draußen aus („Windböen“ nicht). Hitze ab 30 °C und Frost bei 0 °C: draußen −4, „beides“ −1, nur Reihenfolge. Schnee ist nicht trocken (`needsDry` fällt weg). Zwischenspeicher 30 Min., ohne Internet bis 3 Std. alt nutzbar, gespeichert wird nur der gerundete Ort. Handwahl auf „Eure Ideen“ ersetzt nur die Wetterlage, Warnung und Temperatur bleiben (Sicherheit wird nie aufgeweicht). Neues Paket: `expo-location` (~57.0.20); Android fragt nur „ungefähr“ ab, blockiert „genau“ aber nicht. Schnee-Aktivitäten sind jetzt M6b, „Wetter im Ausland“ steht unter „Später“
- 2026-10-11 – M7 abgeschlossen: Details, Feedback und Verlauf, Details und alle Zahlen in `docs/history.md`. Karten sind antippbar (`app/activity/[id].tsx`): Eckdaten, Allergen-Box (aus dem Material abgeleitet), Sicherheits-Box mit „Mit Erwachsenen“ (`needsAdults`, dieselbe Regel wie Punkt 2 der Checkliste), Material, nummerierte Anleitung in der größeren Theme-Schrift `fontSize.reading`. „Das machen wir“ speichert nichts, erst „Fertig“ legt einen Eintrag an (Aktivität, Datum, Kinder) und fragt „Wie war’s?“ (Daumen hoch/runter/überspringen, sonst nichts: keine Punkte oder Serien). Doppeltippen auf „Fertig“ ergibt einen Eintrag (Knopfsperre, Warteschlange `src/lib/serialQueue.ts`, dieselbe Aktivität innerhalb von 5 Minuten wird zusammengefasst). Verlauf nur lokal (`history.v1`, versioniert, kaputte Einträge fliegen beim Laden raus, höchstens 500). Bildschirm „Was wir zusammen gemacht haben“ (`app/history.tsx`, vom Start erreichbar, sobald es Einträge gibt): Bewertung nachträglich ändern oder entfernen, einzelne Einträge und alles löschen. Gewichtung (`weights.history`): kürzlich gemacht Tag 0–3 −10, linear bis 0 an Tag 28; Daumen runter −20 für 90 Tage; Daumen hoch +3 ab Tag 14 bis Tag 179 und +1 für die Kategorie. **Tage zählen als Kalendertage nach Ortszeit** (`src/lib/calendarDays.ts`), nicht als 24-Stunden-Blöcke; getestet mit der Zeitumstellung am 25.10.2026 und Einträgen um Mitternacht. Dafür laufen alle Jest-Tests in `Europe/Berlin` (`jest.global-setup.js`). Je Aktivität zählt nur das letzte Mal, die neueste Bewertung gilt. Der Verlauf kommt als freiwilliges Feld `history` in `SuggestionRequest`, ändert nur die Reihenfolge, und die Garantie „mindestens 3, wenn so viele passen“ gilt auch bei vollem Verlauf (getestet, auch mit den echten Aktivitäten). Auf „Eure Ideen“ ist der Verlauf beim Öffnen eingefroren, damit sich Karten nicht umsortieren. Keine neuen Pakete. „Bildschirm anlassen“ steht unter „Später“ (braucht `expo-keep-awake`)
