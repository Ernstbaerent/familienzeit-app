# M9b: Bilder für alle Aktivitäten (Plan und Beschlüsse)

Stand: 15. Oktober 2026. Das ist der **beschlossene Plan**, kein fertiger Zustand. Gebaut ist bisher: der Baukasten Stufe 1 (`docs/bausteine/`, dieser Pull Request) und der erste Test der Lieferung (`docs/supabase.md`, „Bilder: erster Test der Lieferung“, eigener Pull Request).
Alle Zahlen zu Kosten und Datenverkehr sind **Rechnungen aus Token-Mengen und Dateigrößen, nicht gemessen**.

## Beschlüsse (Clemens, 2026-10-15)

1. **Hybrid mit Entscheidungsregel.** Nach dem Modelltest (unten) gilt: Sind mindestens **4 von 5 Bildern tragfähig**, zeichnet die **API** auch den Startbestand (die 104 Aktivitäten aus `data/`), und Clemens prüft nur die gerenderten Vorschauen. Sonst zeichnet Claude Code den Startbestand in Sitzungen (Pakete, siehe unten).
2. **Gebündelte Zeichnungen entfallen.** Alle Bilder kommen aus Supabase Storage; die sechs Pilot-Zeichnungen wandern in dasselbe System. Offen unter „Entscheidungen vor M12“ (CLAUDE.md, Punkt 8): Offline-Start mit gebündelten Titelbildern der 104 Aktivitäten neu entscheiden.
3. **Natron-Vulkan:** Der Sicherheitshinweis nennt „Schutzbrille oder normale Brille“ (de/en), die Brille bleibt im Bild (erledigt).
4. **Schrittbilder** erst nach den Titelbildern. Priorität: Basteln und Experimente. Das Sockenpuppen-Theater ist gesetzt. Die Liste (20 bis 30 Aktivitäten) legt Claude Code nach den Titelbildern vor.
5. Die etwa **15 KI-Aktivitäten** laufen über den Bilder-Lauf (sie stehen nur in der Datenbank).
6. **Ein Pull Request je Paket**, dazu je einer für Baukasten, Lieferung und Automatik.
7. **`IMAGES_AUTO_ATTACH=false` nur für die ersten zwei Läufe**, dann an (Clemens löscht die Variable nach dem zweiten Lauf).
8. **`librsvg2-bin` per apt nur in einem Job ohne Schlüssel** (wie `osmium-tool` beim Orte-Import). Die Jobs mit `ANTHROPIC_API_KEY` oder Supabase-Schlüssel installieren nichts.
9. **Täglicher Bilder-Lauf** (nur Aktivitäten ohne Bild, bei keinem Treffer fast kostenlos) und manuell.
10. **Passt keine Szene, bleibt die Farbfläche.** Es gibt kein erzwungenes Bild.

## Aufbau

- **Baukasten** (`docs/bausteine/README.md`): Bausteine mit Farbplätzen, Layouts mit festen Plätzen, ein fester Zeichner. Das Modell wählt nur Layout und Bausteine (Szene als JSON), nie SVG-Code und nie Koordinaten.
- **Lieferung:** öffentlicher Bucket `activity-images` (Migration `0005_activity_images_bucket.sql`), Dateien nie überschreiben (Name mit Prüfsumme), Adresse in `image` (später `step_images`), die App zeigt sie mit `expo-image`, bei Fehler die Farbfläche. `updated_at` zieht die Änderung über die Abfrage aus M8b auf die Geräte. Entwurf: `docs/supabase.md`, „Ausblick: Bilder und Supabase“.
- **Prüfungen vor dem Anhängen:** (1) Szene gegen Layout, Rand, Ecken, Überdeckung; (2) Sicherheit und Textabgleich gegen die Aktivität (`docs/bausteine/README.md`); (3) Endprüfung des SVG (nur Farbplätze, nur erlaubter Code, unter 14 KB, gültig); (4) Rückfrage an Claude mit dem gerenderten PNG und dem Text der Aktivität (Urteil `ok`, `widerspricht_dem_text`, `unsicher`, `unlesbar`). Nur wenn alles besteht, wird ein Bild angehängt.

## Die Job-Kette des Bilder-Laufs (Entwurf, noch nicht gebaut)

Ein GitHub-Workflow `activity-images.yml` (täglich 19:30 Uhr Berliner Zeit, nach dem Wochenlauf, und manuell) mit fünf Jobs. Zwischen den Jobs gehen **Artefakte** (Texte der Aktivitäten, Szenen, SVG, PNG, Urteile; nichts davon ist geheim, es sind öffentliche Daten und Zeichnungen). Jeder Schlüssel steht nur in dem einen Schritt, der ihn braucht.

| # | Job | Tut | Schlüssel | Installiert |
| - | --- | --- | --- | --- |
| 1 | `liste` | liest bei Supabase, welche freigegebenen Aktivitäten kein Bild haben (höchstens 20 je Lauf, höchstens 3 Versuche je Aktivität, Versuche aus `activity_image_log`), schreibt `todo.json` | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (nur lesend benutzt) | nichts |
| 2 | `zeichnen` | fragt Claude nach der **Szene** (JSON nach festem Schema, nur Layout, Plätze, Baustein-IDs), prüft sie mechanisch (Layout, Sicherheit, Textabgleich), baut das SVG | `ANTHROPIC_API_KEY` | nichts |
| 3 | `rendern` | wandelt jedes SVG mit `rsvg-convert` in ein PNG (600 × 300) | **keine** | `librsvg2-bin` (apt) |
| 4 | `pruefen` | schickt PNG und Text der Aktivität an Claude, bekommt das Urteil; schreibt `verdicts.json` | `ANTHROPIC_API_KEY` | nichts |
| 5 | `hochladen` | nur Bestandenes: SVG nach Storage (`x-upsert: false`), `image` setzen, alles in `activity_image_log` und `activity_scenes` schreiben; bei `IMAGES_AUTO_ATTACH=false` nur Bericht, nichts anhängen | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | nichts |

Weitere Regeln: Eine Revision gibt es nicht im selben Lauf (der Job `rendern` ist der einzige mit Zeichenprogramm und hat keinen Schlüssel). Besteht ein Bild nicht, bleibt die Karte bei der Farbfläche, und der nächste Lauf versucht es noch einmal (höchstens 3 Versuche, das Modell antwortet jedes Mal etwas anders).
Variablen: `IMAGES_PAUSED=true` (Pause), `IMAGES_AUTO_ATTACH=false` (nur zeichnen und berichten), `MAX_COST_USD` (Kostengrenze), `ANTHROPIC_MODEL` (Modell). Fehler der API (Guthaben, Limit, Schlüssel) beenden den Lauf, ohne etwas anzuhängen. Der Bericht zeigt eine Übersicht aller gezeichneten Bilder, die Urteile, die Kosten und „fehlende Bausteine“.
Zurückziehen: `update public.activities set image = null where id = '…'`.

## Modelltest: Haiku gegen Sonnet

**Vorbereitet (Schritt 3b):** der manuelle Workflow **„Bild-Test“** (`.github/workflows/image-test.yml`, Skript `scripts/image-test.ts`, Bausteine `scripts/lib/imagetest/`). Er ist ein Ausschnitt der Kette oben, ohne Rückfrage mit dem PNG und ohne Hochladen:

1. `liste` liest die Aktivitäten aus Supabase, nur mit dem **öffentlichen Lese-Schlüssel** (nur `approved`, nur GET): die Liste aus dem Feld **`ids`** und dazu so viele der **neuesten KI-Aktivitäten** (`batch_id` gesetzt, also aus dem Wochenlauf, ohne Gegenstück in `data/`), wie das Feld **`ki`** sagt (Standard 3, höchstens 5, zusammen höchstens 10). Fehlt eine Aktivität der Liste in Supabase, nimmt der Test ihren Text aus `assets/bausteine/probe/aktivitaeten.json`, falls er dort steht (heute die Bratäpfel); sonst steht sie als „nicht gefunden“ im Protokoll.
2. `zeichnen` lässt die Claude API je Aktivität **eine Szene** wählen (Structured Outputs, nur Layout, Plätze, Bausteine, Figuren, Posen), prüft sie mit dem Szenenprüfer (Sicherheit, Text, Ecken, 14 KB) und zeichnet sie. Verletzt die erste Szene eine Regel, bekommt ein **zweiter Aufruf** die Meldungen; mehr gibt es nicht. Antwortet die KI „keine Szene“, bleibt die Farbfläche (kein Fehler). Die **Figurenwahl** (`scripts/lib/kit/casting.ts`) gibt jeder Anfrage einen Rat mit: die am seltensten benutzte passende Figur zuerst, keine Figur in mehr als 40 % der Bilder des Laufs (eine gesperrte Figur im Bild gilt wie eine Meldung der Prüfung), Mats bevorzugt ab 8 Jahren, Stups gelegentlich als Begleiter (nie bei Hitze oder Schärfe). Der Zähler steht nach jedem Bild im Protokoll des Jobs.
3. `rendern` (ohne Schlüssel) macht mit `rsvg-convert` PNG in Karten- und Daumennagelgröße und schreibt die **Zusammenfassung des Laufs**: je Bild die **gewählte Szene** (in einer Zeile), das **Prüfergebnis**, die **Größe in KB**, die **Versuche**, die **Token** und die **Kosten**, die Figuren, danach der **Zähler der Figuren** und die Szenen als JSON. Die Bilder liegen im Artefakt **bild-test** (14 Tage); in der Zusammenfassung selbst zeigt GitHub keine Bilder aus Artefakten.

Er schreibt **nichts** in die Datenbank und fasst **keinen** Bucket an. Jobs mit Schlüssel installieren nichts (kein npm), `librsvg2-bin` nur im Job ohne Schlüssel.

**Einrichten (einmal):** Unter Settings → Secrets and variables → Actions → Secrets das Secret `SUPABASE_ANON_KEY` anlegen (derselbe öffentliche Schlüssel wie `EXPO_PUBLIC_SUPABASE_ANON_KEY` in der `.env`, **nicht** der geheime). `ANTHROPIC_API_KEY` und `SUPABASE_URL` gibt es schon vom Wochenlauf. Freiwillig: Variable `IMAGE_TEST_MAX_COST_USD` (Standard 1 $ je Lauf, im schlimmsten Fall gerechnet).
**Starten:** Actions → „Bild-Test“ → Run workflow, Modell `haiku` oder `sonnet`; `ids` (die fünf Probeaktivitäten) und `ki` (3) sind vorbelegt. Einmal mit jedem Modell. Nur bestimmte Aktivitäten: `ids` ändern und `ki` auf `0` setzen.
**Kosten (Rechnung):** Eine Anfrage hat etwa 7 000 Token (Regeln, Bausteine, Schema, Text der Aktivität). Haiku etwa 0,001 bis 0,005 $ je Aufruf, Sonnet etwa 0,02 bis 0,1 $; acht Aktivitäten mit höchstens zwei Aufrufen: Haiku unter 0,1 $, Sonnet unter 1 $ (die Grenze `IMAGE_TEST_MAX_COST_USD` hält den Lauf vorher an).

### Bilder ansehen

1. Auf GitHub **Actions** öffnen, links **„Bild-Test“** wählen und den Lauf anklicken (oben steht der neueste).
2. Auf der Seite des Laufs steht die **Zusammenfassung** (Tabelle je Bild, Zähler der Figuren). Ganz unten unter **Artifacts** liegt **bild-test**: anklicken, der Browser lädt `bild-test.zip` herunter (nur angemeldet; das Artefakt bleibt 14 Tage).
3. Die ZIP-Datei öffnen (auf dem Chromebook: in „Dateien“ doppelt anklicken, dann den Ordner öffnen). Je Aktivität gibt es `<id>.png` (Kartengröße 624 × 312), `<id>-96.png` und `<id>-64.png` (Daumennagel), dazu `<id>.svg` und `report.json` (alle Angaben der Zusammenfassung als Daten).
4. Die PNG mit einem Doppelklick ansehen. Wichtig ist der Blick auf die **Daumennagel** `-96.png` und `-64.png`: Erkennt man dort noch, was man tut? Die SVG öffnet jeder Browser (Datei in ein Browserfenster ziehen).
5. Neben der Tabelle notieren: tragfähig ja oder nein, und warum. Das ist das Maß für die Entscheidungsregel (4 von 5).

**Fünf Aktivitäten** (geändert am 17. Oktober 2026, Texte aus `data/` außer den Bratäpfeln): Bratäpfel aus dem Ofen (`baked-apples`, KI-Aktivität), Bananen-Haferkugeln (`banana-oat-balls`), Tanz-Freeze (`dance-freeze`), Geheimschrift mit Zitronensaft (`secret-lemon-ink`), Pfützen-Forscher (`puddle-explorers`), dazu die drei neuesten KI-Aktivitäten. Zum Vergleich hat Claude Code die fünf von Hand gesetzt, mit derselben Figurenwahl (`docs/bausteine/PROBE.md`, „Besetzung“). Je Modell einmal, gemessen werden:

- **Kosten je Bild** (Token aus den Angaben der API, die Prüfung eingerechnet).
- **Bestanden?** Alle mechanischen Prüfungen und das Urteil des Modells.
- **Tragfähig?** (Claude Code und Clemens sehen sich die Bilder an): Ist das Motiv im Daumennagel (96 × 48) erkennbar? Passt es zum Text? Hat es keine Form, die an etwas anderes erinnert? Das Maß für die Entscheidungsregel (4 von 5).
- **Wie unterscheidbar sind die fünf Bilder?** (1) mechanisch: wie viele verschiedene Layouts, und die mittlere Überschneidung der Baustein-Mengen je Paar (Ziel: kein Paar mit gleichem Layout und gleichen Hauptbausteinen); (2) eine Rückfrage an Claude mit allen fünf Bildern in einem Bild („Welche könnte man verwechseln?“); (3) die Kontaktbögen in 96 × 48 zum Ansehen.
- **Passt keine Szene,** bleibt es bei der Farbfläche: Das zählt als „nicht tragfähig“, aber nicht als Fehler.

## Pakete (nur falls die Entscheidungsregel gegen die API ausgeht)

Wenn Claude Code den Startbestand zeichnet: ein Pull Request je Paket mit Vorschauseite und Durchsicht. Nach Kategorie, die riskanten zuerst:

| Paket | Inhalt | Anzahl |
| --- | --- | --- |
| 1 | Kochen und Experimente (Teil) | 22 |
| 2 | Experimente (Rest) und Basteln | 25 |
| 3 | Natur und Ausflüge | 21 |
| 4 | Spiele | 22 |
| 5 | Bewegung und Nacharbeit | 14 |

Szenen für den Startbestand liegen dann im Repo (`data/scenes/`), die für KI-Aktivitäten in der Datenbank.

## Kosten (Rechnung, nicht gemessen)

Haiku 5.5: 0,10 $ pro Million Token Anfrage, 0,50 $ Antwort. Sonnet 5.5: etwa 20-mal so viel.
Je Bild mit durchschnittlich 1,5 Runden: etwa **0,002 $ (Haiku)** bzw. **0,04 $ (Sonnet)**. Einmal 119 Titelbilder: etwa 0,25 $ bzw. 4,50 $. Laufend 15 Bilder pro Woche: etwa 0,03 $ bzw. 0,60 $.
Speicher bei 1 500 Aktivitäten: Titelbilder 6 bis 15 MB (bei 4 bis 14 KB je Bild), mit unveränderlichen Dateien und 60 Tagen Aufbewahrung unter 50 MB (kostenloser Tarif: 1 GB).
Datenverkehr je Gerät und Monat geschätzt 100 bis 250 KB; ein einmaliges Neuzeichnen aller Bilder kostet jedes Gerät einmal alle Zeilen (bei 1 500 Aktivitäten etwa 2,8 MB ungepackt).

## Stand

- [x] Erster Test der Lieferung (Bucket, `expo-image`, Seed-Fix, Anleitung): eigener Pull Request. **Offen bei Clemens:** ausprobieren.
- [x] Baukasten Stufe 1 (30 Bausteine, 4 Layouts, Prüfungen, Vorschau): dieser Pull Request. **Offen bei Clemens:** Durchsicht der Vorschau, dann Stufe 2.
- [x] Schritt 3a (Teil von Stufe 2): Figuren der Besetzung in Szenen, Haltepunkte, acht Posen mit Gegenstand, Regen-Kleidung, Behälter mit zehn Inhalten, 10 neue Bausteine, Layout `hands`, strengere Sicherheitsregeln, `kit:coverage`, Prüfung der 14 KB (`docs/bausteine/README.md`). Entscheidung (Clemens, 17. Oktober 2026): Erwachsene bleiben in der Mitte, höchstens einer je Titelbild; zeigt sich, dass das zu gleichförmig wird, kommen sitzende oder gebeugte Posen als Vorschlag.
- [x] Schritt 3b: fünf Titelbilder von Hand als Machbarkeitsprobe (Bratäpfel, Bananen-Haferkugeln, Tanz-Freeze, Geheimschrift, Pfützen-Forscher) mit Bewertung, `docs/bausteine/PROBE.md`; lose Inhalte auf dem Tisch; Workflow „Bild-Test“ vorbereitet. **Offen bei Clemens:** Probebilder ansehen, Secret `SUPABASE_ANON_KEY` anlegen, Bild-Test mit Haiku und Sonnet starten.
- [ ] Weitere Bausteine nach der Abdeckung (`docs/bausteine/ABDECKUNG.md`, vorn: Stifte, Handtuch, Klebeband, Ball)
- [ ] Lieferung vollständig (Migration 0006: `step_images`, Tabellen, Funktion; Schrittbilder in der App; gebündelte Zeichnungen entfernen; Pilot-Bilder in Storage)
- [ ] Bilder-Lauf (Job-Kette, Modelltest, Bericht)
- [ ] Pakete 1 bis 5 oder Lauf über die API (Entscheidungsregel)
- [ ] Schrittbilder (Liste nach den Titelbildern)
