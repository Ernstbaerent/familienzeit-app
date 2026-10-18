# Illustrationen – Stilregeln (Pilot, nicht endgültig)

Stand: Oktober 2026. **Pilot (abgeschlossen):** Getestet wurde mit drei Aktivitäten, ob ein selbst gezeichneter Stil trägt
(Sockenpuppen-Theater, Pizza selber machen, Natron-Vulkan). **Seit M9b (18. Oktober 2026)** entstehen alle Bilder aus dem Baukasten und kommen aus Supabase Storage;
die gebündelten Pilot-Zeichnungen sind entfernt (Git-Historie), der Bilder-Lauf zeichnet die drei Titelbilder neu.
Ergebnis und Bilder: `docs/illustrationen-pilot.md`. Seit DESIGN.md, Zusatz 45, gibt es keine Stock-Fotos mehr: Bilder werden selbst gezeichnet, diese Datei ist die Regelsammlung dafür (M9b zeichnet die Bilder für alle Aktivitäten). Der Pilot gilt weiter als „nicht endgültig“, bis ein Mensch die Bilder durchgesehen hat.

## Gefühl

Passend zu „Sonntagslicht“ mit der Palette C (DESIGN.md, Entscheidung 55): warm, ruhig, wie mit dem Stift auf Papier gezeichnet. Wenige Formen, viel Luft,
ein Gegenstand oder eine Handlung steht im Mittelpunkt. Die Illustration erklärt in einem Blick, **was** man macht,
nicht **wie gut** es aussehen muss.

## Format

| Regel | Wert |
| --- | --- |
| Seitenverhältnis | **2:1** wie der Bildbereich der Karten (`CardMedia`) |
| Zeichenfläche | `viewBox="0 0 400 200"`, alle Maße unten in diesen Einheiten |
| Eigengröße | `width="1200" height="600"`: Falls ein Handy das SVG in seiner Eigengröße rastert (iOS), bleibt es auf der Karte (ca. 312 pt, also 936 px bei 3×) scharf |
| Datei | SVG, **unter 14 KB** (Titel- und Schrittbilder; das Bucket in Supabase erlaubt 20 KB), keine externen Schriften, Bilder oder Links |
| Ablage | Supabase Storage, Bucket `activity-images` (Migration 0005); Adresse in `image` bzw. `step_images` der Aktivität (Migration 0006, gesetzt nur über `set_activity_images`). Nichts gebündelt in der App |
| Name | Titelbild `activities/<id>/cover-<Prüfsumme>.svg`, Schrittbild `activities/<id>/step-N-<Prüfsumme>.svg` (N = Schrittnummer ab 1, Prüfsumme = 16 Zeichen 0–9, a–f). **Dateien nie überschreiben:** neuer Inhalt = neuer Name (`docs/supabase.md`) |

**Erlaubter SVG-Code** (damit es auf iOS, Android und im Browser gleich aussieht): nur `svg`, `g`, `path`, `circle`, `ellipse`,
`rect`, `line`, `polyline`, `polygon` mit Attributen (`fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `transform`,
`stroke-dasharray` für vorgezeichnete Linien, z. B. die Schnittlinie am Karton).
**Nicht erlaubt:** `text`, `image`, `style`, `script`, `use`, `defs`, Verläufe, Filter, Masken, Schnittpfade, `href`, `url(…)`, `opacity`.
Der Prüfer des Baukastens (`scripts/lib/kit/catalog.ts`, `npm run kit:check`) prüft das für Bausteine und Szenen.

## Linie

- **Tinte** (`{{ink}}`, `#12323D`), **runde Enden und runde Ecken** (`stroke-linecap="round"`, `stroke-linejoin="round"`).
- **Nur drei Stärken:** **5** für die Umrisse der **Figuren** (Menschen und Tiere, `docs/design/FIGUREN.md`), **4** für die Umrisse der Gegenstände, **2,5** für Details (Naht, Faden, Dampf). Auf der Karte (ca. 312 px breit) sind das etwa 3,9 px, 3,1 px und 2 px. Bilder ohne Figuren haben nur 4 und 2,5.
  In einer verkleinerten Gruppe (`scale`) zählt die sichtbare Stärke (bei `scale(.5)` also 8 und 5 eintragen).
  Ausnahme: eine Abdecklinie in `{{paper}}`, die zwei Flächen verbindet (z. B. Schaum, der in den Becher übergeht), darf breiter sein.
- Linien dürfen leicht schwingen, nichts muss perfekt symmetrisch sein. Keine Schraffuren, keine Schatten.

## Farben: die Zeichnungs-Palette

Zeichnungen haben eine **feste eigene Palette** (`illustrationPalette` in `src/lib/palette.ts`): die vier Farben der App und zwei **warme Gegenstandsfarben**, flach, ohne Verläufe und ohne Transparenz.
Jede Farbe in einer Zeichnung ist ein **Platzhalter** `{{name}}` (Rolle), nie ein fester Hexwert (siehe „Farbplätze“).

| Platzhalter | Wert | Einsatz im Bild | Tinte darauf | Leinen darauf |
| --- | --- | --- | --- | --- |
| `{{paper}}` | Leinen `#FCF8F2` | Köpfe, Hände, helle Gegenstände, Schaum, großer Kreis hinter dem Motiv | 12,8:1 | – |
| `{{ground}}` | Rosé-Leinen `#FAE7E2` (gleich `surface`) | Grund des Bildes | 11,4:1 | 1,1:1 |
| `{{ink}}` | Tinte `#12323D` | alle Linien, kleine dunkle Punkte (Knopfaugen) | – | 12,8:1 |
| `{{rose}}` | Rosé `#F4BEBB` | Kleidung (Kinder), Sauce, Vorhänge, Socken: **sparsam**, kleine Flächen | 8,3:1 | 1,5:1 |
| `{{petrol}}` | Petrol `#1A5D74` | Kleidung (Erwachsene), Socken, Puppen | 1,8:1 | 6,9:1 |
| `{{honey}}` | Honig `#E8A94F` (warm) | Teig, Käse, Handschuh, Kleber: nur Gegenstände | 6,6:1 | 1,9:1 |
| `{{brown}}` | Braun `#B07A45` (warm) | Pappe, Holz: nur Gegenstände | 3,7:1 | 3,5:1 |
| `{{skin1}}` bis `{{skin8}}` | `#F1CDB3`, `#DDAA85`, `#C48A62`, `#B07A52`, `#A56B45`, `#8C5C3E`, `#76492F`, `#613A25` | Haut (Kopf und Hände) der Figuren, nie für Gegenstände. Zuordnung und Regel „trägt“: `docs/design/FIGUREN.md` | 9,1:1 bis 1,4:1 | 1,4:1 bis 9,3:1 |

- **Die warmen Töne gelten nur für Gegenstände** (Essen, Pappe, Holz, Klebstoff), **nie für Kleidung oder Flächen der App.** Sie stammen aus derselben Familie wie die Warnfarben (`warning`, `warningSurface`)
  und sind **keine** Farbrollen des Themes (Test). Kleidung ist Petrol, Rosé oder Leinen.
- **Kontraste:** Tinte-Linien auf Rosé, Honig, Braun und Leinen sind klar sichtbar (mindestens 3,7:1). **Auf Petrol nur 1,8:1:** Der Umriss verschwindet im Petrol und die Fläche trägt die Form.
  Deshalb bleiben Petrol-Flächen groß und einfach (Kleidung, Puppen), Details darauf sind in Leinen. Rosé auf Leinen hat nur 1,5:1, Rosé-Flächen stehen deshalb immer mit Tinten-Umriss.
- **Hauttöne:** Auf Petrol tragen die Plätze 6 bis 8 nicht (Haut gegen Petrol unter 1,4:1, Tinte gegen Haut unter 2,5:1): Hinter dem Kopf einer Figur mit so einem Ton liegt nie eine Petrol-Fläche (Szenenprüfer, FIGUREN.md).
- Der Test `src/lib/palette.test.ts` prüft die 15 Werte (sieben Gegenstands- und Flächenfarben, acht Hauttöne) und dass ein unbekannter Platzhalter ein Fehler ist; feste Farben in Bausteinen meldet `npm run kit:check`.
- **Versetzte Flächen:** Farbflächen sitzen 3 bis 4 Einheiten neben ihrem Umriss, wie beim Druck mit leicht verrutschter Farbe.
  Das macht den handgemachten Eindruck und kostet keine Bytes.
- **Grund:** `{{ground}}` mit einem großen, weichen Kreis in `{{paper}}` hinter dem Motiv (das Echo der Farbfläche mit dem Kreis).
- **Dunkelmodus (D5):** Die Bilder bleiben hell (wie Fotos es wären). Sie sind auf der Karte gerahmt und stehen für sich.

## Baukasten (M9b)

Ab M9b entstehen Titelbilder nicht mehr frei von Hand, sondern aus **Bausteinen** mit Farbplätzen, die ein fester Zeichner in feste Plätze eines Layouts setzt (`docs/bausteine/README.md`, Plan: `docs/bilder-plan.md`).
Alle Regeln dieser Datei gelten weiter (Format, Linien, Palette, Figuren, Sicherheit); der Baukasten setzt die mechanisch prüfbaren davon um (Linienstärken 4 und 2,5, nur Palette, erlaubter Code, Ecken der Pille, Rand) und ergänzt die **Petrol-Regel:**
Petrol ist nie Bildgrund; in Bausteinen mit Petrol sind feine Linien Leinen, nicht Tinte (Tinte auf Petrol nur 1,8:1).

## Farbplätze

**Jede Zeichnung entsteht mit den Platzhaltern.** So lässt sich die Palette später ändern, ohne Zeichnungen neu zu zeichnen (SVG-Dateien kennen keine Laufzeit-Variablen, und `expo-image` kann sie nicht umfärben;
`tintColor` färbt nur einfarbig).

1. Bausteine (`assets/bausteine/`) haben Platzhalter wie `fill="{{petrol}}"` statt `#1A5D74`, feste Farbwerte sind verboten (`npm run kit:check`).
2. Der Zeichner des Baukastens setzt die Werte aus `illustrationPalette` (`src/lib/palette.ts`) ein (`renderTemplate` in `scripts/lib/illustrations.ts`), wenn er eine Szene zeichnet.
3. **Palette ändert sich?** Wert in `src/lib/palette.ts` ändern. Neue Bilder haben die neuen Farben; schon hochgeladene Bilder im Bucket bleiben, wie sie sind (Dateien werden nie überschrieben). Sollen sie umgefärbt werden, zeichnet der Bilder-Lauf sie neu (Szenen stehen in `activity_scenes`).
4. **Neue Rolle** (z. B. eine siebte Farbe): in `illustrationPalette` ergänzen, hier in die Tabelle, Kontraste angeben, dann die Bausteine anpassen.

(Bis M9b gab es dazu `assets/illustrations/src/` und `npm run illustrations:build` für die gebündelten Pilot-Zeichnungen; beides ist entfernt.)

## Figuren

**Seit dem 16. Oktober 2026 gilt die festgeschriebene Besetzung (`docs/design/FIGUREN.md`):** Jette, Mats, Nolli, Ilka, Arne, Stups und Tüpfel, gesichtslos, Köpfe und Hände im **Hautton** der Figur (nicht mehr Leinen), Linie 5.
Die einfachen Strichfiguren der Pilot-Bilder und der Stufe 1 (Köpfe in Leinen, Erwachsene etwa 150 hoch) sind abgelöst; die Pilot-Bilder sind deshalb nicht in Supabase gewandert, sondern werden neu gezeichnet.

- **Erwachsene sind deutlich größer als Kinder** (Ilka 120, Arne 123, Mats 105, Jette 88, Nolli 67). Wer was tut, ist so ohne Gesicht erkennbar.
- **Hände halten Gegenstände an deren Haltepunkten** (Griff, Henkel, Rand; Baukasten, Schritt 3a). Hände und Gegenstände sind gut erkennbar und stehen frei, nicht hinter anderen Formen.
- **Erwachsene stehen auf Titelbildern in der Mitte:** An den Seiten reicht ihr Kopf in die Ecken der Kategorie-Pille (siehe „Bildaufbau“).

## Bildaufbau

- **Ein Motiv pro Bild.** Ein Gegenstand oder eine Handlung, kein Hintergrund mit Möbeln oder Räumen.
- **Viel Luft:** Das Motiv bleibt innerhalb von 24 Einheiten Rand.
- **Titelbild und Schrittbild** (seit dem ersten Bild-Test, 18. Oktober 2026): Ein **Titelbild** zeigt mindestens eine Figur der Besetzung und einen erkennbaren Gegenstand der Aktivität (bevorzugt die Layouts `pair`, `outdoor`, `hero`), **nie ein Messer oder eine Schere** (dafür die Zutat, das Ergebnis oder den Ort), und jeden Gegenstand, den der Titel nennt. Hände ohne Figur (Nahaufnahme, Layout `hands`) gibt es nur in **Schrittbildern**. Gibt es für einen Gegenstand aus dem Titel keinen Baustein, entsteht kein Titelbild (Farbfläche); ein Bild, das den Titel falsch macht, ist schlechter als keines.
- **Titelbilder: Die oberen Ecken bleiben frei von Wichtigem** (je etwa 180 × 60): Auf der Karte liegt dort die Kategorie-Pille,
  oben am Anfang der Zeile, bei Rechts-nach-links also oben rechts. Schrittbilder haben keine Pille.
- **Lesbar in jeder Größe:** auf der Karte (ca. 312 × 156), als Schrittbild (ca. 256 × 128) und in Daumennagelgröße
  (96 × 48 und 64 × 32). Im Daumennagel muss das Motiv **an seinen großen Flächen** erkennbar sein, nicht an den Linien.
- **Nahaufnahme vor Szene** (Erfahrung aus dem Pilot): Hände und Gegenstände in Nahaufnahme bleiben im Daumennagel lesbar,
  Szenen mit ganzen Figuren verlieren dort ihre Einzelheiten. Ganze Figuren nur, wenn es darauf ankommt, **wer** etwas tut
  (Erwachsener am Ofen, Erwachsener mit Schere).
- **Inhalt von Bechern und Gläsern:** Zitronensaft und Saft sind Honig, Wasser ist Petrol, ein leerer Becher Leinen. Der Ton ist der Inhalt und braucht wie ein Gegenstand Deckung im Text (Baukasten: `liquids` am Becher).
- **Papier** ist ein flaches Blatt mit leichter Faltkante, nie eine Tüte oder ein Beutel (dafür gibt es Papiertüte und Stofftasche).
- **Auch in Palette C gilt:** Ein Becher mit Schaumkrone darf nicht nach Bierglas aussehen, eine Tube nicht nach Kerze. Eine rosa Tomatensauce bleibt Sauce, wenn Teig (Honig) und Käse (Leinen) dazu stehen.
- **Keine Form, die an etwas anderes erinnert** (Erfahrung aus dem Pilot): Ein Becher mit Schaumkrone wirkte wie ein Bierglas,
  eine Flasche mit spitzer Kappe wie eine Kerze. Jedes Bild einmal mit der Frage „Was könnte man noch darin sehen?“ ansehen.

## Mehrsprachigkeit und Rechts-nach-links

- **Kein Text im Bild**, auch keine Zahlen, Buchstaben, Logos oder Symbole mit Bedeutung (Häkchen, Pfeile).
- Nichts, was eine Leserichtung braucht (keine Bildfolgen, keine Pfeile). Das Bild wird bei Rechts-nach-links **nicht gespiegelt**.
- Für die Sprachausgabe sind alle Illustrationen **Dekoration**. Was zu tun ist, steht im Text.

## Sicherheit

Ein Bild zeigt nie etwas, was der Sicherheits-Checkliste (`docs/sicherheits-checkliste.md`) oder dem Text der Aktivität
widerspricht. **Ein Bild darf nichts zeigen, was der Text nicht sagt.**

**Ausnahme: neutrale Gegenstände** (Entscheidung von Clemens, 2026-10-17). Teller, Tisch, Stuhl, Kissen und Decke dürfen im Bild stehen,
auch wenn der Text sie nicht nennt, solange sie nichts Sicherheitsrelevantes ändern. Sie sind im Katalog mit `neutral` markiert,
die Liste ist fest (`neutralBlockIds` in `scripts/lib/kit/catalog.ts`); eine Erweiterung entscheidet Clemens. Nicht neutral sind:

- ein Teller mit heißem Inhalt (in Kinderhänden ohnehin verboten, siehe Hitze) oder mit Kleinteilen: dann muss der Text den Teller nennen, und die Regeln für Hitze und Kleinteile gelten,
- alles, was scharf, heiß, elektrisch oder klein ist, und jeder Inhalt (Bratäpfel auf dem Teller muss der Text nennen, den leeren Teller nicht).

Beispiel: Bei den Bratäpfeln wartet Jette mit einem leeren Teller, Arne trägt das heiße Blech (`docs/bausteine/PROBE.md`).

Für jedes Bild wird geprüft:

| Thema | Im Bild |
| --- | --- |
| Hitze (Ofen, Herd, Blech, alles frisch aus dem Ofen) | nur **in der Hand** eines Erwachsenen **mit Ofenhandschuhen an der Hand**, kein Kleinkind im Bild, andere Kinder mit Abstand (mindestens 20 Einheiten) |
| Messer, spitze Schere | nur **in der Hand eines Erwachsenen**, nie frei liegend; ein Kind darf zuschauen. **Nie im Titelbild**, nur in Schrittbildern |
| Kinderschere (rund, bunt) | **nie im Titelbild**; im Schrittbild in Kinderhand nur, wenn die Sicherheits-Checkliste es für das Alter erlaubt (ab 3 Jahren, Punkt 5), ein Erwachsener im Bild ist (Punkt 2) und der Text die Kinderschere nennt. Wo die Checkliste schweigt, gilt: nur Erwachsene. Nie in der Hand eines Kleinkinds |
| Tiere (Stups, Tüpfel) | nie im selben Bild mit Hitze, Feuer, Messer oder Schere, und nie bei einer Aktivität mit solchem Material |
| Feuer | keine offene Flamme, keine Kerze (auch nicht in Laternen, Punkt 7) |
| Wasser | kein Kind allein am Wasser, bei Kindern unter 6 immer ein Erwachsener daneben (Punkt 3) |
| Kleinteile | keine losen Kleinteile in der Nähe von Kleinkindern (Punkt 1) |
| Spritzer, Augen | Schutzbrille nur, wenn der Text sie nennt (sonst Bild oder Text anpassen) |
| Alter | die Figuren passen zur Altersspanne der Aktivität (`docs/design/FIGUREN.md`) |
| Fahrrad | wer fährt (Pose `ride`), trägt einen Helm |
| Hautton und Petrol | hinter oder an Kopf und Händen einer Figur, deren Hautton auf Petrol nicht trägt (heute Jette), liegt nichts Petrolfarbenes |

Der Szenenprüfer des Baukastens setzt diese Regeln mechanisch um (`scripts/lib/kit/scene.ts`, Tabelle in `docs/bausteine/README.md`, „Sicherheit“).

**Natron-Vulkan (erledigt 2026-10-15):** Sein Sicherheitshinweis nennt jetzt „Schutzbrille oder normale Brille“ (de/en), die Schutzbrille im Bild ist damit gedeckt. Die Regel bleibt: Eine Schutzbrille zeigt ein Bild nur, wenn der Text sie nennt.

## Vorrang im Bildbereich

Im Bildbereich der Karte und der Detailansicht gilt (seit M9b):

1. `image` der Aktivität (Web-Adresse in unserem Bucket, `expo-image` mit Gerätespeicher),
2. Farbfläche mit Symbol (auch, wenn das Bild nicht lädt).

Die Bildkette steht in `src/features/suggestions/cardImage.ts`, der Bildbereich in `CardMedia`. Gebündelte Illustrationen gibt es nicht mehr.

## Schrittbilder

- Ein Schrittbild steht **unter dem Text seines Schritts**, in der Textspalte (gleich breit wie der Text), Radius `tile` (16).
  Zum eigenen Text sind es 16 px, nach dem Bild bis zum nächsten Schritt 44 px (28 + 16): So gehört es sichtbar zu seinem Schritt.
  Neben dem Text wäre die Anleitung (20 px) zu schmal.
- Es zeigt genau die Handlung dieses Schritts, nicht das Ergebnis eines späteren.
- Die Zuordnung hängt an der Schrittnummer (Spalte `step_images`: `{"1": "<Adresse>", "3": "<Adresse>"}`). Die App zeigt ein Schrittbild nur, wenn es den Schritt in der angezeigten Sprache gibt und die Adresse aus unserem Speicher kommt; lädt es nicht, verschwindet es still (`StepList`, `stepImages.ts`).
- **Ändert sich die Anleitung, müssen die Schrittbilder mitgeprüft werden.** `set_activity_images` lehnt nur Nummern ab, die es nicht gibt. Ändern sich Sicherheitshinweis oder Material, zieht die Datenbank Titel- und Schrittbilder automatisch zurück (Migration 0006, `docs/supabase.md`).
- Gezeichnet werden Schrittbilder noch nicht (nur der Weg dahin ist gebaut, `docs/bilder-plan.md`).

## Prüfung vor dem Einbau

1. Gerendert ansehen: Karte, Schrittbild, Daumennagel 96 × 48 und 64 × 32 (der Bilder-Lauf legt PNG und Kontaktbögen ins Artefakt, `docs/bilder-plan.md`).
2. Fragen: Erkennt man das Motiv im Daumennagel? Ist jede Hand und jeder Gegenstand eindeutig? Stimmt das Bild mit Text und Sicherheitshinweis überein?
3. `npm run kit:check` und `npm test` (prüfen Bausteine, Szenen, Farben, erlaubten SVG-Code, Größe, Sicherheit und Text). Linienstärken, Lesbarkeit und Sicherheit im Bild sieht nur der Mensch.
4. Vor der Beta schaut ein Mensch alle Illustrationen durch (wie die Aktivitäten).
