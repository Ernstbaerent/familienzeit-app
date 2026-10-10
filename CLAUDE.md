# CLAUDE.md – Familienzeit-App (Arbeitstitel)

Diese Datei liest Claude Code bei jedem Start. Sie beschreibt Projekt, Regeln und aktuellen Stand.
Halte sie kurz und aktuell. Details gehören in `docs/`, nicht hierher.

## Projekt in 3 Sätzen

Eine App für iPhone und Android, die Eltern in unter 30 Sekunden 3 passende Vorschläge gibt,
was sie jetzt oder heute mit ihren Kindern (0–16 Jahre) machen können: Basteln, Spiele, Ausflüge, Veranstaltungen.
Sie berücksichtigt verfügbare Zeit, Energie der Eltern, Alter und Vorlieben der Kinder, Wetter und Standort.
Team: Clemens (Technik, programmiert mit dir), Ani (Design, Ideen, Freigabe der Aktivitäten).

## Produktprinzipien (bei jeder Entscheidung beachten)

1. **Spontan statt geplant:** Keine Kurse, Abos oder Anmeldungen über den heutigen Tag hinaus.
2. **30 Sekunden:** Wenige Eingaben, immer genau 3 Vorschläge.
3. **Sortieren statt aussortieren:** Nur Sicherheit und Machbarkeit schließen aus, alles andere gewichtet nur.
4. **Immer ein Ergebnis:** Nie eine leere Liste. Fallback sind Aktivitäten für zu Hause.
5. **Handy weg:** Die App ist schnell erledigt. Keine Endlos-Feeds, keine Bindungstricks.
6. **Datenschutz zuerst:** Ohne Konto nutzbar, persönliche Daten nur auf dem Gerät.

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
- **Tests:** Jest für Logik (vor allem die Vorschlagslogik)

## Befehle

```bash
npm install            # Abhängigkeiten installieren
npx expo start         # App starten, mit Expo Go auf dem Handy testen
npx tsc --noEmit       # TypeScript prüfen
npm test               # Tests ausführen
npx expo lint          # Code-Stil prüfen
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

**Harte Ausschlüsse (nur diese):**
- nicht altersgerecht für mindestens ein ausgewähltes Kind
- dauert länger als die verfügbare Zeit (inkl. Anfahrt)
- draußen bei Gefahr (Gewitter, Sturm, Unwetterwarnung)
- Kurse oder Voranmeldung über heute hinaus
- geschlossen oder bereits vorbei

**Gewichtung (nur Reihenfolge):** Interessen/Abneigungen, Wetter-Eignung, Entfernung, Kosten,
Energie der Eltern, Abwechslung (kürzlich Gemachtes nach hinten), Eignung für Geschwister.

**Fallback:** Zu wenig Orte/Veranstaltungen → Umkreis vergrößern (z. B. 5 → 15 → 30 km) und das anzeigen.
Danach mit Aktivitäten für zu Hause auffüllen. Ergebnis immer genau 3.

## Datenmodell Aktivität (Entwurf)

```ts
type Activity = {
  id: string;
  category: 'craft' | 'game' | 'movement' | 'experiment' | 'nature' | 'cooking' | 'outing';
  translations: Record<string, { title: string; summary: string; steps: string[]; safetyNote?: string }>;
  ageMin: number;            // Jahre
  ageMax: number;
  durationMin: number;       // Minuten
  durationMax: number;
  setting: 'indoor' | 'outdoor' | 'both';
  weather: { needsDry: boolean; betterInSun: boolean };
  energy: 'low' | 'medium' | 'high';   // Energie, die Eltern brauchen
  cost: 0 | 1 | 2;           // 0 = kostenlos, 1 = wenig, 2 = mehr
  materials: string[];       // Schlüssel, übersetzt über locales
  siblingFriendly: boolean;
  status: 'draft' | 'approved' | 'rejected';   // nur 'approved' erscheint in der App
  source: 'ai' | 'manual';
  createdAt: string;
};
```

## KI-Wochenlauf

- Einmal pro Woche (GitHub Action) erstellt ein Skript 10–20 neue Aktivitäten mit der Claude API.
- Berücksichtigt Jahreszeit, Feiertage und Stichwort-Ideen aus der Tabelle `activity_ideas`.
- Neue Aktivitäten immer mit `status: 'draft'`. **Ani gibt frei** – sie schreibt keine Anleitungen selbst.
- Die KI liefert Titel, Anleitung, Altersgrenzen und Sicherheitshinweise vollständig.

## Roadmap erste Version

Bearbeite immer den **ersten offenen Punkt**, außer Clemens sagt etwas anderes.

- [x] **M1 Grundgerüst:** Expo-Projekt mit TypeScript, Expo Router, Ordnerstruktur, i18next mit de/en, RTL-Vorbereitung, Startbildschirm
- [ ] **M2 Machbarkeitstest Veranstaltungen:** Skript, das den Knowledge Graph für eine Region abfragt und das Ergebnis zusammenfasst (nur Test, keine App-Funktion)
- [ ] **M3 Kinderprofile:** Einstieg ohne Konto, mehrere Kinder anlegen/bearbeiten, lokal speichern
- [ ] **M4 Aktivitäten:** Datenmodell, 20 Beispiel-Aktivitäten in `data/`, lokal laden
- [ ] **M5 Vorschläge:** Zeit + Energie wählen, Vorschlagslogik mit Tests, 3 Vorschläge anzeigen
- [ ] **M6 Wetter und Standort:** Bright Sky und Standortabfrage in die Vorschlagslogik einbinden
- [ ] **M7 Details und Feedback:** Detailansicht, Daumen hoch/runter, Verlauf lokal
- [ ] **M8 Supabase:** Aktivitäten aus der Datenbank laden (nur `approved`), Offline-Cache
- [ ] **M9 KI-Wochenlauf:** Generator-Skript, GitHub Action, `activity_ideas`, 150–200 Start-Aktivitäten
- [ ] **M10 Orte:** OpenStreetMap-Abfrage für Spielplätze, Museen, Bäder usw.
- [ ] **M11 Veranstaltungen:** Knowledge Graph in die Vorschläge einbinden
- [ ] **M12 Beta:** Datenschutzerklärung, Impressum, Testversionen für Freunde und Familie

## Später (nicht jetzt bauen)

Weitere Sprachen (ar, tr, uk, ro), Kind-Modus, Erinnerungen mit Fotos, Wochenend-Push,
Konto und Familie teilen, Premium/Abo, Radiosender-Kooperationen, Nachbarländer.

## Notizen und Entscheidungen

<!-- Hier kurze Einträge ergänzen, wenn etwas Wichtiges entschieden wurde. Format: Datum – Entscheidung -->
- 2026-10-09 – Konzept festgelegt, Stack: Expo + Supabase + Claude API (Haiku)
- 2026-10-10 – M1: Expo SDK 57, Bildschirme in `app/`, Pfad-Kürzel `@/` = `src/`. App-Sprache = erste passende Handysprache, sonst Englisch (siehe `docs/i18n.md`)
- 2026-10-10 – Zentrales Theme in `src/lib/theme.ts` (Farben, Schriftgrößen, Abstände, Eckenradien) mit neutralen Platzhalterwerten, bis Ani das Design festlegt. Breiten und Höhen bewusst nicht im Theme
- 2026-10-10 – RTL nur, wenn die angezeigte Sprache RTL ist. Bis eine RTL-Übersetzung kommt, ist Spiegeln in `app.json` ausgeschaltet
