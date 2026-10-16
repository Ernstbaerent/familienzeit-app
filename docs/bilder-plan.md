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
- **Prüfungen vor dem Anhängen:** (1) Szene gegen Layout, Rand, Ecken, Überdeckung; (2) Sicherheit und Textabgleich gegen die Aktivität (`docs/bausteine/README.md`); (3) Endprüfung des SVG (nur Farbplätze, nur erlaubter Code, unter 10 KB, gültig); (4) Rückfrage an Claude mit dem gerenderten PNG und dem Text der Aktivität (Urteil `ok`, `widerspricht_dem_text`, `unsicher`, `unlesbar`). Nur wenn alles besteht, wird ein Bild angehängt.

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

Der Test läuft als manueller Lauf derselben Kette (`ids`, Modell und `attach=false` als Eingaben) und braucht deshalb den Workflow im Hauptzweig. **Fünf Aktivitäten:** Tanzfreeze, Pfützen-Spaziergang, Geheimschrift mit Zitronensaft, Kissenburg und Taschenlampen-Geschichten, Bananen-Haferkekse. Je Modell einmal, gemessen werden:

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
Speicher bei 1 500 Aktivitäten: Titelbilder 6 bis 15 MB (bei 4 bis 10 KB je Bild), mit unveränderlichen Dateien und 60 Tagen Aufbewahrung unter 50 MB (kostenloser Tarif: 1 GB).
Datenverkehr je Gerät und Monat geschätzt 100 bis 250 KB; ein einmaliges Neuzeichnen aller Bilder kostet jedes Gerät einmal alle Zeilen (bei 1 500 Aktivitäten etwa 2,8 MB ungepackt).

## Stand

- [x] Erster Test der Lieferung (Bucket, `expo-image`, Seed-Fix, Anleitung): eigener Pull Request. **Offen bei Clemens:** ausprobieren.
- [x] Baukasten Stufe 1 (30 Bausteine, 4 Layouts, Prüfungen, Vorschau): dieser Pull Request. **Offen bei Clemens:** Durchsicht der Vorschau, dann Stufe 2.
- [ ] Baukasten Stufe 2 (rund 45 Bausteine, Layout „hands“, `kit:coverage`)
- [ ] Lieferung vollständig (Migration 0006: `step_images`, Tabellen, Funktion; Schrittbilder in der App; gebündelte Zeichnungen entfernen; Pilot-Bilder in Storage)
- [ ] Bilder-Lauf (Job-Kette, Modelltest, Bericht)
- [ ] Pakete 1 bis 5 oder Lauf über die API (Entscheidungsregel)
- [ ] Schrittbilder (Liste nach den Titelbildern)
