# M9b: Bilder für alle Aktivitäten (Plan und Beschlüsse)

Stand: 18. Oktober 2026. Das ist der **beschlossene Plan**, kein fertiger Zustand. Gebaut sind: der Baukasten (`docs/bausteine/`), der Bild-Test und die **vollständige Lieferung** (Migration 0006, Schrittbilder in der App, gebündelte Zeichnungen entfernt; `docs/supabase.md`, „Bilder: Lieferung einrichten“). Noch nicht gebaut: der Bilder-Lauf (Teil B, eigener Pull Request nach der Lieferung).
Alle Zahlen zu Kosten und Datenverkehr sind **Rechnungen aus Token-Mengen und Dateigrößen, nicht gemessen**.

## Beschlüsse (Clemens, 2026-10-15)

1. ~~**Hybrid mit Entscheidungsregel** (4 von 5 tragfähig → API, sonst Claude Code in Paketen).~~ **Entschieden (Clemens, 18. Oktober 2026):** Der zweite Bild-Test hat tragfähige Titelbilder gezeigt (Fahrrad-Slalom, Pfützen-Forscher, Fensterlichter, Tastsäckchen, Tanz-Freeze). Die **API (Haiku) zeichnet** den Startbestand und alle neuen Aktivitäten im täglichen Bilder-Lauf; die Pakete unten entfallen.
2. **Gebündelte Zeichnungen entfallen** (umgesetzt am 18. Oktober 2026). Alle Bilder kommen aus Supabase Storage. Die sechs Pilot-Zeichnungen werden **nicht** hochgeladen (alter Stil mit Strichfiguren): Der Bilder-Lauf zeichnet die drei Titelbilder neu, die drei Schrittbilder vom Sockenpuppen-Theater kommen mit den Schrittbildern (Entscheidung von Clemens). Offen unter „Entscheidungen vor M12“ (CLAUDE.md, Punkt 8): Offline-Start mit gebündelten Titelbildern neu entscheiden.
3. **Natron-Vulkan:** Der Sicherheitshinweis nennt „Schutzbrille oder normale Brille“ (de/en), die Brille bleibt im Bild (erledigt).
4. **Schrittbilder** erst nach den Titelbildern. Priorität: Basteln und Experimente. Das Sockenpuppen-Theater ist gesetzt. Die Liste (20 bis 30 Aktivitäten) legt Claude Code nach den Titelbildern vor.
5. Die etwa **15 KI-Aktivitäten** laufen über den Bilder-Lauf (sie stehen nur in der Datenbank).
6. **Ein Pull Request je Paket**, dazu je einer für Baukasten, Lieferung und Automatik.
7. ~~`IMAGES_AUTO_ATTACH=false` nur für die ersten zwei Läufe.~~ **Geändert (Clemens, 18. Oktober 2026):** Clemens sieht die Titelbilder **in der App** durch, nicht vorher in Kontaktbögen. Der Bilder-Lauf **hängt automatisch an**, was alle drei Prüfungen besteht (Regeln, Bindung an den Text, Rückfrage mit dem PNG mit dem Urteil `ok`); `IMAGES_AUTO_ATTACH` ist von Anfang an an. **Sanfter Anlauf:** höchstens 25 Aktivitäten je Lauf (`IMAGES_MAX_PER_RUN`), täglich; der Startbestand verteilt sich so auf etwa fünf Tage, und ein systematischer Fehler fällt auf, bevor er alle trifft. **Qualitätsbremse:** Besteht weniger als die Hälfte der gezeichneten Bilder eines Laufs, hängt er nichts an und endet rot (E-Mail von GitHub). **Sperre je Aktivität** (`blocked` in `activity_scenes`, Befehle unten). Kontaktbögen bleiben als Bericht im Artefakt, sind aber keine Voraussetzung.
8. **`librsvg2-bin` per apt nur in einem Job ohne Schlüssel** (wie `osmium-tool` beim Orte-Import). Die Jobs mit `ANTHROPIC_API_KEY` oder Supabase-Schlüssel installieren nichts.
9. **Täglicher Bilder-Lauf** (nur Aktivitäten ohne Bild, bei keinem Treffer fast kostenlos) und manuell.
10. **Passt keine Szene, bleibt die Farbfläche.** Es gibt kein erzwungenes Bild.

## Beschlüsse zur Lieferung und zum Bilder-Lauf (Clemens, 18. Oktober 2026)

1. **Versuche:** Als Versuch zählt ein Lauf, in dem die Aktivität gescheitert ist (Regeln oder Bindung an den Text nach zwei Aufrufen, oder Rückfrage mit dem Bild nicht `ok`). Angehängt oder von der Qualitätsbremse aufgehalten zählt nicht. Höchstens **drei Versuche** je Aktivität über alle Läufe, gezählt seit dem letzten `reset` oder `withdrawn` im Protokoll (`activity_image_log`). Danach bleibt die Farbfläche, und die Aktivität steht im Bericht.
2. **„Keine Szene“** (die KI findet keine, oder der Titel nennt einen Gegenstand ohne Baustein) zählt **nicht** als Versuch. Die Aktivität wird erst wieder versucht, wenn sich die **Fassung des Baukastens** ändert (neue Bausteine). Gezielt freigeben: Befehl unten („Ohne Szene freigeben“).
3. **Geänderter Text nach dem Bild:** Titel, Kurzbeschreibung oder Schritte geändert → nur melden (Bericht). **Sicherheitshinweis oder Material geändert → das Bild wird automatisch zurückgezogen** (`image` und `step_images` auf `NULL`, Protokoll `withdrawn`), und die Aktivität ist für neue Versuche frei. Das macht die Datenbank selbst (Trigger aus Migration 0006, getestet), damit es bei jedem Weg gilt (Seed, Table Editor, SQL). Der Bericht des Bilder-Laufs listet diese Rückzüge.
4. **Schrittbilder:** Spalte, Anzeige in der App und der Weg dahin (`set_activity_images` mit `step_images`) sind gebaut; gezeichnet werden noch keine.
5. **Reihenfolge:** erst die Lieferung (Teil A) in `main`, dann der Bilder-Lauf (Teil B) in einer neuen Sitzung.

## Befehle zum Kopieren (SQL-Editor von Supabase)

`'<id>'` jeweils durch die ID der Aktivität ersetzen (z. B. `'puddle-explorers'`; steht in der Tabelle `activities`, Spalte `id`). Alle Befehle laufen ab Migration 0006; der Bilder-Lauf (Teil B) wertet Sperre und Protokoll aus.

**Ein Bild zurückziehen, der nächste Lauf versucht es neu** (begrenzt durch die drei Versuche):

```sql
select public.set_activity_images('<id>', null, null);
```

**Eine Aktivität sperren** (Bild weg und dauerhaft von der Bildautomatik ausgenommen; `<Grund>` ist frei, z. B. „Bild zeigt Messer“):

```sql
begin;
select public.set_activity_images('<id>', null, null);
insert into public.activity_scenes (activity_id, purpose, blocked, blocked_reason)
values ('<id>', 'title', true, '<Grund>')
on conflict (activity_id, purpose) do update set blocked = true, blocked_reason = excluded.blocked_reason;
commit;
```

**Sperre aufheben** (der nächste Lauf darf wieder zeichnen):

```sql
update public.activity_scenes set blocked = false, blocked_reason = null where activity_id = '<id>' and purpose = 'title';
```

**Versuche einer Aktivität zurücksetzen** (nach drei gescheiterten Läufen noch einmal versuchen lassen):

```sql
insert into public.activity_image_log (activity_id, result, reasons) values ('<id>', 'reset', '["von Hand freigegeben"]'::jsonb);
```

**Ohne Szene freigeben** (nach neuen Bausteinen: alle freigegebenen Aktivitäten ohne Bild, deren letzter Eintrag „keine Szene“ war, kommen im nächsten Lauf wieder dran; das Ergebnis zeigt, wie viele):

```sql
insert into public.activity_image_log (activity_id, result, reasons)
select l.activity_id, 'reset', '["ohne Szene, nach neuen Bausteinen freigegeben"]'::jsonb
from (
  select distinct on (activity_id) activity_id, result
  from public.activity_image_log
  where purpose = 'title' and result <> 'replaced'
  order by activity_id, id desc
) l
join public.activities a on a.id = l.activity_id
where l.result in ('no_scene', 'no_block') and a.image is null and a.status = 'approved'
returning activity_id;
```

Normalerweise ist das nicht nötig: Ändert sich die Fassung des Baukastens, versucht der Bilder-Lauf Aktivitäten ohne Szene von selbst noch einmal. Der Befehl hilft, wenn du nicht auf eine Änderung des Baukastens warten willst.

**Übersicht: gesperrte Aktivitäten und der letzte Eintrag je Aktivität:**

```sql
select activity_id, blocked_reason, updated_at from public.activity_scenes where blocked order by updated_at desc;
select distinct on (activity_id) activity_id, result, reasons, missing_blocks, created_at
from public.activity_image_log order by activity_id, id desc;
```

## Aufbau

- **Baukasten** (`docs/bausteine/README.md`): Bausteine mit Farbplätzen, Layouts mit festen Plätzen, ein fester Zeichner. Das Modell wählt nur Layout und Bausteine (Szene als JSON), nie SVG-Code und nie Koordinaten.
- **Lieferung (gebaut):** öffentlicher Bucket `activity-images` (Migration 0005), Dateien nie überschreiben (Name mit Prüfsumme), Adressen in `image` und `step_images`, gesetzt nur über `set_activity_images` (Migration 0006). Die App zeigt sie mit `expo-image` und Gerätespeicher, bei Fehler die Farbfläche bzw. beim Schritt nur den Text. `updated_at` zieht die Änderung über die Abfrage aus M8b auf die Geräte. Anleitung: `docs/supabase.md`, „Bilder: Lieferung einrichten“.
- **Prüfungen vor dem Anhängen:** (1) Szene gegen Layout, Rand, Ecken, Überdeckung; (2) Sicherheit und Textabgleich gegen die Aktivität (`docs/bausteine/README.md`); (3) Endprüfung des SVG (nur Farbplätze, nur erlaubter Code, unter 14 KB, gültig); (4) Rückfrage an Claude mit dem gerenderten PNG und dem Text der Aktivität (Urteil `ok`, `widerspricht_dem_text`, `unsicher`, `unlesbar`). Nur wenn alles besteht, wird ein Bild angehängt.

## Die Job-Kette des Bilder-Laufs (Entwurf, noch nicht gebaut)

> **Stand 18. Oktober 2026, gilt vor der Tabelle unten:** Workflow `images-run.yml`, täglich **19:00** Uhr Berliner Zeit (zwei UTC-Zeiten und eine Prüfung der Ortszeit wie beim Wochenlauf) und manuell (`dry_run`, `attach` Standard an, `limit` Standard 25, `model` Standard haiku).
> Jobs: `pruefung` → `liste` → `zeichnen` → `rendern` → `bewerten` → `hochladen` → `bericht`. Hängt automatisch an (Beschluss 7 oben), höchstens 25 je Lauf, Qualitätsbremse, Sperre, drei Versuche wie in „Beschlüsse zur Lieferung und zum Bilder-Lauf“. Die Tabelle unten ist der ältere Entwurf; Teil B ersetzt diesen Abschnitt.

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

## Nach dem ersten echten Bild-Test (18. Oktober 2026)

**Ergebnis** (Haiku, Lauf 39105005711, zehn Aktivitäten, 0,02 $, das Schema wird angenommen, der Prüfer greift): 4 Bilder gut (Pfützen-Forscher, Bananen-Haferkugeln, Fensterlichter, Tanz-Freeze mit Abstrichen), 4 schwach (Bratäpfel, Geheimschrift, Tastsäckchen, Herbst-Salat), 2 ohne Szene wegen fehlender Bausteine (Fahrrad-Slalom, Kartentricks). Die Schwächen lagen an den Regeln und am Baukasten, nicht am Modell.

**Entscheidung (Clemens):** **Haiku** (`claude-haiku-5-5`) bleibt das Modell für Szenen, Titelbilder und Schrittbilder. Das Modell bleibt eine Einstellung (Eingabe `model` im Workflow, Standard `haiku`). Es gibt keine Sonnet-Stufe und keine Eskalation.

**Was sich danach geändert hat** (Regeln in `docs/bausteine/README.md`, „Titelbild und Schrittbild“):

1. **Titelbild und Schrittbild getrennt** (`purpose` in der Szene): Ein Titelbild hat mindestens eine Figur der Besetzung (ein Mensch, Tiere nur dazu) und einen erkennbaren Gegenstand; ohne Gegenstand nur zwei Figuren in Bewegung, und nur, wenn der Baukasten für das Material der Aktivität nichts hat. Das Layout `hands` ist nur für Schrittbilder; im Bild-Test steht es gar nicht zur Wahl, und der Prüfer meldet es als Fehler. Bevorzugt: `pair`, `outdoor`, `hero`. Die Figurenwahl mit Zähler (höchstens 40 % je Figur) bleibt.
2. **Kein Messer und keine Schere im Titelbild** (auch keine Kinderschere). In Schrittbildern gelten die bisherigen Regeln.
3. **Gegenstände aus dem Titel:** Nennt der Titel ein Material der Aktivität (de oder en, `scripts/lib/kit/titleObjects.ts`), muss das Bild es zeigen. Gibt es dafür keinen Baustein, ist kein Titelbild möglich: Der Bild-Test fragt die KI dann gar nicht erst (spart Kosten) und schreibt den Namen in die fehlenden Bausteine.
4. **Stups `hop`** ist für Titelbilder gesperrt; die Pose ist überarbeitet (Vorschau: `docs/bausteine/VORSCHAU.md`, „vorher und nachher“). Freigeben: `hopAllowedInTitles` in `scripts/lib/kit/scene.ts` auf `true`.
5. **Neue Pose `watch`** (schaut zu) für Menschen, **`ride`** (fährt Fahrrad, mit Helm).
6. **Neue Bausteine:** Stofftasche, Papiertüte, Spielkarten, Fahrrad, Hauswand mit Fenstern, Gemüse; neu gezeichnet: Wattestäbchen (ein Kopf), Bananen (Stiel, dunkle Spitze), Papier (Blatt mit Faltkante, nie Tüte). Becher: Honig = Zitronensaft, Petrol = Wasser, Leinen = leer.
7. **Kürzere Unterarme** in `hands`.
8. **Fehlende Bausteine** (`missingBlocks`): Die KI darf sie bei „keine Szene“ nennen, nie erfinden (die Szene kennt nur IDs aus dem Katalog; Namen vorhandener Bausteine zählen nicht). Die Zusammenfassung zählt sie über den Lauf.
9. **Prompt** mit zwei guten Beispielen (Pfützen-Forscher, Bratäpfel) und einem Gegenbeispiel (Messer im Titelbild, `hands` ohne Figur, Papier als Tüte); ein Test prüft, dass die Beispiele alle Regeln bestehen. Bei Bewegung ohne Gegenstand lieber zwei Figuren als ein Tier.
10. **Prompt-Zwischenspeicher** (unten, „Kosten“).

**Vergleich vorher/nachher:** Der Workflow „Bild-Test“ ist mit denselben zehn Aktivitäten vorbelegt wie der erste Lauf, in derselben Reihenfolge (feste IDs in `ids`, `ki` = 0): `baked-apples`, `banana-oat-balls`, `dance-freeze`, `secret-lemon-ink`, `puddle-explorers`, `autumn-salad-with-lemon`, `bike-slalom-with-sticks`, `card-tricks-for-the-family`, `counting-lit-windows-nearby`, `feely-bag-of-nature-finds`. Starten: Actions → „Bild-Test“ → Run workflow, Modell `haiku`, sonst nichts ändern.

## Modelltest: Haiku gegen Sonnet (abgeschlossen: Haiku)

**Vorbereitet (Schritt 3b):** der manuelle Workflow **„Bild-Test“** (`.github/workflows/image-test.yml`, Skript `scripts/image-test.ts`, Bausteine `scripts/lib/imagetest/`). Er ist ein Ausschnitt der Kette oben, ohne Rückfrage mit dem PNG und ohne Hochladen:

1. `liste` liest die Aktivitäten aus Supabase, nur mit dem **öffentlichen Lese-Schlüssel** (nur `approved`, nur GET): die Liste aus dem Feld **`ids`** (vorbelegt: die zehn aus dem ersten Lauf) und dazu so viele der **neuesten KI-Aktivitäten** (`batch_id` gesetzt, also aus dem Wochenlauf, ohne Gegenstück in `data/`), wie das Feld **`ki`** sagt (Standard 0, höchstens 5, zusammen höchstens 10). Fehlt eine Aktivität der Liste in Supabase, nimmt der Test ihren Text aus `assets/bausteine/probe/aktivitaeten.json`, falls er dort steht (heute die Bratäpfel); sonst steht sie als „nicht gefunden“ im Protokoll.
2. `zeichnen` lässt die Claude API je Aktivität **ein Titelbild** wählen (Structured Outputs, nur Layout, Plätze, Bausteine, Figuren, Posen), prüft sie mit dem Szenenprüfer (Sicherheit, Text, Ecken, 14 KB) und zeichnet sie. Verletzt die erste Szene eine Regel, bekommt ein **zweiter Aufruf** die Meldungen; mehr gibt es nicht. Antwortet die KI „keine Szene“, bleibt die Farbfläche (kein Fehler). Die **Figurenwahl** (`scripts/lib/kit/casting.ts`) gibt jeder Anfrage einen Rat mit: die am seltensten benutzte passende Figur zuerst, keine Figur in mehr als 40 % der Bilder des Laufs (eine gesperrte Figur im Bild gilt wie eine Meldung der Prüfung), Mats bevorzugt ab 8 Jahren, Stups gelegentlich als Begleiter (nie bei Hitze oder Schärfe). Der Zähler steht nach jedem Bild im Protokoll des Jobs.
3. `rendern` (ohne Schlüssel) macht mit `rsvg-convert` PNG in Karten- und Daumennagelgröße und schreibt die **Zusammenfassung des Laufs**: je Bild die **gewählte Szene** (in einer Zeile), das **Prüfergebnis**, die **Größe in KB**, die **Versuche**, die **Token** und die **Kosten**, die Figuren, danach die **fehlenden Bausteine** (mit Zähler), der **Zähler der Figuren** und die Szenen als JSON. Die Bilder liegen im Artefakt **bild-test** (14 Tage); in der Zusammenfassung selbst zeigt GitHub keine Bilder aus Artefakten.

**Schema der Antwort (seit 18. Oktober 2026 ohne Unions):** Der erste echte Lauf scheiterte bei jeder Aktivität mit HTTP 400 `invalid_request_error` („too many parameters with union types“, 19 von erlaubt 16). Seitdem steht „nicht gesetzt“ nicht mehr als `null`, sondern als fester Wert: Text `"none"`, Größe `0` (= Vorgabe), `false`, `flip` `"auto"`; was eine Figur hält (`holds`) und die Hände der Nahaufnahme (`hands`) sind Listen (leer = nichts). Der Code übersetzt das zurück (`scripts/lib/imagetest/prompt.ts`, `toScene`). Zwei kleine Anfragen (erst Layout, dann Plätze) wären doppelt so viele Aufrufe mit zwei Grammatiken gewesen; ohne strenges Schema müsste unser Prüfer auch kaputtes JSON abfangen. **Grenzen der API** (Doku „Structured outputs“, Abschnitt „Schema complexity limits“, Stand 18. Oktober 2026): höchstens 16 Parameter mit Union-Typ, 24 optionale Parameter und 20 strenge Werkzeuge je Anfrage, dazu eine nicht bezifferte Grenze für die Größe der kompilierten Grammatik („Schema is too complex for compilation“) und 180 Sekunden zum Kompilieren; Zahlen- und Längengrenzen (`minimum`, `maxLength` …) gibt es nicht. Unser Schema hat 0 Unions und 0 optionale Parameter; `scripts/lib/schemaLimits.ts` zählt das vor der ersten Anfrage (eigene Grenze: 10 Unions, 0 optionale), ein Test schlägt bei mehr als 10 Unions fehl. Ungewiss bleibt nur die Grammatik-Grenze: Die Listen der Bausteine stehen dreimal im Schema (etwa 4 KB); meldet die API „too complex“, wäre der nächste Schritt, sie über `$defs` nur einmal zu führen.

**Abbruch und rot:** Der Lauf schickt die Anfragen nacheinander. Lehnt die API eine Anfrage ab (HTTP 400, z. B. `invalid_request_error`), hört er sofort auf, statt dieselbe Anfrage für jede Aktivität zu wiederholen; ebenso bei leerem Guthaben, Limit, falschem Schlüssel und unbekanntem Modell. Der Lauf endet **rot** (GitHub schickt eine E-Mail), wenn er abgebrochen wurde oder **keine** Aktivität ein Bild bekam; bestehen einige und andere nicht, bleibt er grün, und die Zusammenfassung zeigt, was nicht klappte. Die Zusammenfassung wird in beiden Fällen geschrieben.

Er schreibt **nichts** in die Datenbank und fasst **keinen** Bucket an. Jobs mit Schlüssel installieren nichts (kein npm), `librsvg2-bin` nur im Job ohne Schlüssel.

**Einrichten (einmal):** Unter Settings → Secrets and variables → Actions → Secrets das Secret `SUPABASE_ANON_KEY` anlegen (derselbe öffentliche Schlüssel wie `EXPO_PUBLIC_SUPABASE_ANON_KEY` in der `.env`, **nicht** der geheime). `ANTHROPIC_API_KEY` und `SUPABASE_URL` gibt es schon vom Wochenlauf. Freiwillig: Variable `IMAGE_TEST_MAX_COST_USD` (Standard 1 $ je Lauf, im schlimmsten Fall gerechnet).
**Starten:** Actions → „Bild-Test“ → Run workflow, Modell `haiku` (Standard); `ids` (die zehn aus dem ersten Lauf) und `ki` (0) sind vorbelegt. Nur bestimmte Aktivitäten: `ids` ändern. Neue KI-Aktivitäten dazunehmen: weniger als zehn `ids` und `ki` auf 1 bis 5.
**Kosten:** gemessen 0,02 $ für zehn Aktivitäten mit Haiku (erster Lauf); Rechnung für den Startbestand unten, „Kosten“. Die Grenze `IMAGE_TEST_MAX_COST_USD` (Standard 1 $) hält den Lauf vorher an.

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

## Pakete (entfallen: die API zeichnet, Beschluss 1)

Wenn Claude Code den Startbestand zeichnet: ein Pull Request je Paket mit Vorschauseite und Durchsicht. Nach Kategorie, die riskanten zuerst:

| Paket | Inhalt | Anzahl |
| --- | --- | --- |
| 1 | Kochen und Experimente (Teil) | 22 |
| 2 | Experimente (Rest) und Basteln | 25 |
| 3 | Natur und Ausflüge | 21 |
| 4 | Spiele | 22 |
| 5 | Bewegung und Nacharbeit | 14 |

Szenen für den Startbestand liegen dann im Repo (`data/scenes/`), die für KI-Aktivitäten in der Datenbank.

## Kosten mit Haiku (Rechnung, Stand 18. Oktober 2026)

**Annahmen:** Haiku 5.5 kostet 0,10 $ je Million Token Anfrage und 0,50 $ Antwort (bis 100 000 Token Anfrage). Eine Anfrage hat nach dem Umbau etwa **6 400 Token**: fester Teil (Regeln, Bausteine, Beispiele) etwa 13 700 Zeichen ≈ 4 600 Token, Schema etwa 4 200 Zeichen ≈ 1 400 Token, Text der Aktivität und Besetzung etwa 1 200 Zeichen ≈ 400 Token (geschätzt mit etwa 3 Zeichen je Token, nicht gezählt). Die Antwort hat etwa **2 000 Token** (Nachdenken bei `effort: medium` und die Szene als JSON; zurückgerechnet aus den 0,02 $ des ersten Laufs). Im Mittel **1,4 Aufrufe je Bild** (der zweite Aufruf nach einer Meldung des Prüfers). Zwischenspeicher: nur der feste Teil (4 600 Token) wird gespeichert; schreiben kostet 1,25-fach, lesen 0,1-fach; je Lauf einmal schreiben (Läufe zu höchstens 20 Aktivitäten, die Aufrufe liegen Sekunden auseinander, die 5 Minuten Lebensdauer reichen).

| | Aufrufe | ohne Zwischenspeicher | mit Zwischenspeicher |
| --- | --- | --- | --- |
| je Aufruf | 1 | 0,00164 $ | 0,00123 $ (lesen), 0,00176 $ (erster Aufruf eines Laufs) |
| 119 Titelbilder (Startbestand und KI-Aktivitäten), 6 Läufe | 167 | **0,27 $** | **0,21 $** |
| rund 700 Schrittbilder, etwa 35 Läufe | 980 | **1,61 $** | **1,22 $** |
| 15 neue Aktivitäten pro Woche (Titelbilder), 1 Lauf | 21 je Woche | 0,034 $ je Woche, etwa **0,15 $ im Monat** | 0,026 $ je Woche, etwa **0,11 $ im Monat** |

Der Zwischenspeicher spart etwa ein Viertel; der größere Teil der Kosten ist die Antwort (das Nachdenken), die er nicht berührt. Mit kürzeren Antworten (`effort: low`) ließe sich mehr sparen, das ändert aber die Antworten und ist nicht eingebaut. Sonnet läge etwa 20-mal höher und ist nicht mehr vorgesehen.

**Prompt-Zwischenspeicher (eingebaut im Bild-Test):** Laut Doku der Claude API („Prompt caching“, Stand 18. Oktober 2026) genügt beim einfachen `fetch` ein Feld `cache_control: { "type": "ephemeral" }` am Systemtext (`system` als Liste mit einem Text-Block), kein neues Paket und kein Beta-Kopf. Haiku 5.5 speichert ab 512 Token, die Lebensdauer ist 5 Minuten (jeder Treffer verlängert sie). Wichtig: Der gespeicherte Teil muss Byte für Byte gleich bleiben; deshalb steht nichts je Aktivität darin (Text, Besetzung und Meldungen stehen in der Anfrage danach), und Schema und Modell bleiben im Lauf gleich (ein anderes `output_config.format` würde den Speicher ungültig machen). Die Doku sagt ausdrücklich: „Prompt caching has no effect on output token generation. The response you receive is identical to what you would get if prompt caching were not used.“ Ob er wirkt, zeigt die Zusammenfassung jedes Laufs: „davon … aus dem Zwischenspeicher gelesen“. Bleibt die Zahl bei 0, ist der feste Teil zu kurz oder ändert sich. Der Wochenlauf macht nur einen Aufruf je Lauf und nutzt den Zwischenspeicher deshalb nicht.
Speicher bei 1 500 Aktivitäten: Titelbilder 6 bis 15 MB (bei 4 bis 14 KB je Bild), mit unveränderlichen Dateien und 60 Tagen Aufbewahrung unter 50 MB (kostenloser Tarif: 1 GB).
Datenverkehr je Gerät und Monat geschätzt 100 bis 250 KB; ein einmaliges Neuzeichnen aller Bilder kostet jedes Gerät einmal alle Zeilen (bei 1 500 Aktivitäten etwa 2,8 MB ungepackt).

## Stand

- [x] Erster Test der Lieferung (Bucket, `expo-image`, Seed-Fix, Anleitung): eigener Pull Request. **Offen bei Clemens:** ausprobieren.
- [x] Baukasten Stufe 1 (30 Bausteine, 4 Layouts, Prüfungen, Vorschau): dieser Pull Request. **Offen bei Clemens:** Durchsicht der Vorschau, dann Stufe 2.
- [x] Schritt 3a (Teil von Stufe 2): Figuren der Besetzung in Szenen, Haltepunkte, acht Posen mit Gegenstand, Regen-Kleidung, Behälter mit zehn Inhalten, 10 neue Bausteine, Layout `hands`, strengere Sicherheitsregeln, `kit:coverage`, Prüfung der 14 KB (`docs/bausteine/README.md`). Entscheidung (Clemens, 17. Oktober 2026): Erwachsene bleiben in der Mitte, höchstens einer je Titelbild; zeigt sich, dass das zu gleichförmig wird, kommen sitzende oder gebeugte Posen als Vorschlag.
- [x] Schritt 3b: fünf Titelbilder von Hand als Machbarkeitsprobe (Bratäpfel, Bananen-Haferkugeln, Tanz-Freeze, Geheimschrift, Pfützen-Forscher) mit Bewertung, `docs/bausteine/PROBE.md`; lose Inhalte auf dem Tisch; Workflow „Bild-Test“ vorbereitet. **Offen bei Clemens:** Probebilder ansehen, Secret `SUPABASE_ANON_KEY` anlegen, Bild-Test mit Haiku und Sonnet starten.
- [x] Nachbesserung nach dem ersten Bild-Test (18. Oktober 2026): Titelbild und Schrittbild getrennt, kein Messer und keine Schere im Titelbild, Gegenstände aus dem Titel, sechs neue und drei neu gezeichnete Bausteine, Posen `watch` und `ride`, Stups `hop` überarbeitet (für Titelbilder gesperrt), kürzere Unterarme, fehlende Bausteine im Bericht, Beispiele im Prompt, Zwischenspeicher. **Offen bei Clemens:** Bild-Test mit Haiku starten und mit dem ersten Lauf vergleichen; Stups `hop` ansehen und freigeben oder nicht.
- [ ] Weitere Bausteine nach der Abdeckung (`docs/bausteine/ABDECKUNG.md`, vorn: Stifte, Handtuch, Klebeband, Ball) und nach den fehlenden Bausteinen der Bild-Tests
- [x] Lieferung vollständig (18. Oktober 2026): Migration 0006 (`step_images`, `activity_scenes` mit Sperre, `activity_image_log`, `set_activity_images`, automatisches Zurückziehen), Schrittbilder in der App, gebündelte Zeichnungen entfernt (Pilot-Bilder nicht hochgeladen, werden neu gezeichnet), Datenverkehr gemessen. **Offen bei Clemens:** Migration 0006 einspielen, **dann** die App testen (`docs/supabase.md`, „Bilder: Lieferung einrichten“).
- [ ] Bilder-Lauf (Teil B, neue Sitzung auf `main`): Job-Kette, dreifache Prüfung, automatisch anhängen, Bericht mit Kontaktbögen und fehlenden Bausteinen
- [x] ~~Pakete 1 bis 5 oder Lauf über die API (Entscheidungsregel)~~ entschieden: Lauf über die API
- [ ] Schrittbilder (Liste nach den Titelbildern)
