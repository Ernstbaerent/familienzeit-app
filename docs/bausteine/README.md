# Baukasten für Zeichnungen (M9b, Stufe 1 und Schritt 3a)

Stand: 17. Oktober 2026. **44 Bausteine (34 Gegenstände, Möbel und Natur, 10 Inhalte), 5 Layouts, 8 Beispielszenen, die Figuren der Besetzung mit 18 Posen, davon 8 mit Gegenstand in der Hand.** Alle Bausteine, Posen und Behälter in der Palette: [VORSCHAU.md](VORSCHAU.md). Welche Gegenstände die Aktivitäten brauchen: [ABDECKUNG.md](ABDECKUNG.md).
Gesamtplan, Entscheidungen und Job-Kette des Bilder-Laufs: [`docs/bilder-plan.md`](../bilder-plan.md). Stilregeln für jede Zeichnung: [`docs/design/ILLUSTRATIONEN.md`](../design/ILLUSTRATIONEN.md).

## Die Idee in drei Sätzen

Ein **Baustein** ist ein kleines SVG-Stück mit Farbplätzen (Schüssel, Teller, Tisch). Eine **Szene** wählt ein **Layout** und setzt Bausteine und **Figuren der Besetzung** (Jette, Mats, Nolli, Ilka, Arne, Stups, Tüpfel; `docs/design/FIGUREN.md`) in dessen feste **Plätze**
(„links: Jette hält einen Teller mit Bratapfel, Mitte: Arne trägt das Tablett“), nie in Koordinaten. Ein fester **Zeichner** (`scripts/lib/kit/scene.ts`) baut daraus das SVG, und die Prüfungen sehen, was ein Bild nicht zeigen darf.
So bleibt der Stil gleich, und weder ich noch die KI im Bilder-Lauf schreiben freien SVG-Code.

## Wo was liegt

| Was | Wo |
| --- | --- |
| Bausteine (nur SVG-Elemente) | `assets/bausteine/<gruppe>/<id>.svg` |
| Katalog (Maße, Töne, Merkmale, Begriffe) | `assets/bausteine/katalog.json` |
| Beispielszenen (mit Aktivität, wenn sie zu einer passen) | `assets/bausteine/beispiele/<name>.scene.json` |
| Inhalte für Behälter (Bratäpfel, Teig, Wasser …) | `assets/bausteine/inhalt/<id>.svg`, im Katalog mit `kind: "content"` |
| Layouts und Plätze | `scripts/lib/kit/layouts.ts` |
| Prüfung der Bausteine | `scripts/lib/kit/catalog.ts` |
| Zeichnen mit Drehung, Haltepunkten und Inhalt | `scripts/lib/kit/draw.ts` |
| Figuren in Szenen, Posen mit Gegenstand, Hände in Nahaufnahme | `scripts/lib/kit/figureItems.ts` (der Rig selbst: `scripts/lib/figures/`) |
| Szene prüfen und zeichnen, Sicherheit und Textabgleich | `scripts/lib/kit/scene.ts` |
| Übersichtsbilder der Vorschau (Posen, Behälter) | `scripts/lib/kit/sheets.ts` |
| Abdeckungsbericht | `scripts/lib/kit/coverage.ts`, `scripts/kit-coverage.ts` |
| Tests | `scripts/lib/kit/kit.test.ts`, `scripts/lib/figures/figures.test.ts` (laufen mit `npm test`) |
| Vorschau (erzeugt, eingecheckt) | `docs/bausteine/VORSCHAU.md`, `docs/bausteine/vorschau/`, `docs/bausteine/ABDECKUNG.md` |

```bash
npm run kit:check      # prüft alle Bausteine und Beispielszenen (Sicherheit und Text, wenn die Szene eine Aktivität nennt)
npm run kit:preview    # erzeugt die Vorschau neu; `-- --check` prüft nur, ob sie noch passt (der Test macht dasselbe)
npm run kit:coverage   # Abdeckungsbericht über alle Aktivitäten in data/ (ABDECKUNG.md); `-- --check` prüft nur,
                       # `-- --extra datei.json` nimmt weitere Aktivitäten dazu (z. B. KI-Aktivitäten aus der Datenbank) und schreibt nichts
```

## Die Bausteine

| Gruppe | Bausteine |
| --- | --- |
| Möbel und Fläche (8) | Standlinie, Tisch, Tablett, Decke, Kissen, Stuhl, Karton, Radio |
| Küche (10) | Schüssel, Holzlöffel, Backblech, Pizza, Ofenhandschuh, **Teller, Kelle, Kanne, Messer, Gabel** |
| Basteln (6) | Schere (spitz, nur Erwachsene), Klebetube, Papier, Socke, **Kinderschere (rund, bunt), Wattestäbchen** |
| Experiment (4) | Becher, Flasche, Schutzbrille, Taschenlampe |
| Natur (6) | Baum, Blume, Pfütze, **Stock, Eimer, Korb** |
| Inhalte (10) | **Bratäpfel, Kekse, Haferkugeln, Teig, Obst, Bananen, Zitronenhälften, Wasser, Blätter, Kastanien** |

Fett: neu in Schritt 3a. Die sechs Strichfiguren der Stufe 1 (Erwachsener, Kind, Kleinkind) sind entfernt; Figuren kommen aus der Besetzung (siehe unten).
**Für die fünf Probebilder (Schritt 3b) neu:** Teller und Inhalt Bratäpfel (Bratäpfel), Gabel, Teig, Haferkugeln und Bananen (Bananen-Haferkugeln), Wattestäbchen und Zitronenhälften (Geheimschrift), Stock und Eimer mit Blättern (Pfützen-Forscher), dazu die Posen `dance`, `freeze`, `write` und die Regen-Kleidung im Rig.
**Aus deinem Auftrag für Haltepunkte und Behälter:** Kelle, Kanne, Korb, Messer, Kinderschere und die übrigen Inhalte.

Weitere Bausteine kommen nur, wenn eine Aktivität sie braucht: Die Liste „Materialien ohne Baustein“ in [ABDECKUNG.md](ABDECKUNG.md) zeigt, was am häufigsten fehlt (vorn: Stifte, Handtuch, Ball, Filzstifte, Salz). **Feuer, Flammen und Kerzen gibt es nie** (Sicherheits-Checkliste, Punkt 7), auch keine Noten, Pfeile oder Zeichen mit Bedeutung.

## Regeln für einen Baustein

Jede Regel prüft `npm run kit:check` bzw. der Test, außer wo „Mensch“ steht.

1. **Koordinaten:** Ursprung `(0 0)` ist die Mitte der Standlinie, nach oben ist `y` negativ. Der Baustein ist in der **Größe 1** gezeichnet. Die Fläche steht im Katalog (`box`: `x0`, `x1`, Höhe `h`) und muss die Zeichnung einschließlich Linienbreite umschließen (höchstens 1 Einheit zu klein, höchstens 8 zu groß). Die Meldung nennt das gezeichnete Maß.
2. **Linien:** nur `stroke-width="{{line}}"` (Umriss) und `"{{fine}}"` (Details). Der Zeichner setzt sie so ein, dass die **sichtbare** Stärke immer **4** bzw. **2,5** bleibt, auch wenn der Baustein verkleinert oder vergrößert wird. Feste Zahlen sind verboten. Enden und Ecken sind immer rund (der Zeichner setzt sie für jeden Baustein).
3. **Versetzte Flächen:** Eine Farbfläche steht als eigenes Element mit `stroke="none"` und `transform="translate({{shift}} {{shift}})"` hinter dem Umriss (Druck mit verrutschter Farbe).
4. **Farben:** nur Farbplätze der Zeichnungs-Palette: `{{ink}}`, `{{paper}}`, `{{rose}}`, `{{petrol}}`, `{{honey}}`, `{{brown}}`, `{{ground}}`. Dazu `{{tint}}` für den Ton, den die Szene wählt (die erlaubten Töne stehen im Katalog).
   **Kleidung nur Petrol oder Rosé**, die warmen Töne Honig und Braun nur für Gegenstände.
5. **Petrol-Regel (Tinte auf Petrol hat nur 1,8:1):** Petrol ist nie Bildgrund. Hat ein Baustein Petrol-Flächen (fest oder als wählbarer Ton), sind seine **feinen** Linien Leinen (`stroke="{{paper}}"`, 6,9:1), nicht Tinte. Nur der Umriss (`{{line}}`) bleibt Tinte: Er hält die Silhouette gegen das helle Umfeld.
   Petrol-Flächen bleiben groß und einfach. Dass ein Detail auf Petrol auch wirklich lesbar ist, sieht der **Mensch** auf der Vorschau.
6. **Erlaubter SVG-Code:** nur `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`; kein `<g>`, kein `<svg>`, kein Kommentar, kein `text`, `image`, `use`, `style`, kein `opacity`, keine Verläufe. **Pfade nur mit absoluten Befehlen** (`M L H V C S Q T Z`, keine Bögen `A`, keine kleinen Buchstaben), damit die Maße ohne Browser stimmen. Jedes Element hat `fill` (sonst wäre es schwarz) und entweder `stroke="none"` oder eine der zwei Linienstärken.
7. **Größe:** höchstens 2 000 Byte je Baustein; eine fertige Szene bleibt unter 14 KB (Clemens, 16. Oktober 2026; das Bucket erlaubt 20 KB).
8. **Kein Gesicht, kein Text, keine Zahlen** im Baustein (Mensch). Figuren sind Strichfiguren, Köpfe und Hände Leinen. Erwachsene sind deutlich größer als Kinder, der Kopf ist bei allen gleich groß (Test).
9. **Eine Form, die an etwas anderes erinnert** (Bierglas, Kerze), meldet nur der Mensch: Jeden Baustein auf der Vorschau fragen „Was könnte man noch darin sehen?“.

## Neue Bausteine

Jeder neue Baustein ist ein **kleiner Pull Request** mit Vorschau:

1. `assets/bausteine/<gruppe>/<id>.svg` zeichnen und einen Eintrag in `katalog.json` machen: `id` (englisch, kleingeschrieben), `group`, `kind` (`figure`, `object`, `furniture`, `nature`), Name de/en, `box`, `tints` und `defaultTint` (wenn `{{tint}}` vorkommt),
   `hazards` (`sharp`, `heat`, `goggles`, `smallParts`, `water`), `materials` (Schlüssel aus `src/features/activities/materials.ts`), `terms` (Wörter im Text, de und en, kleingeschrieben, Wortteile genügen) und `neutral` (nur Tisch und Standlinie).
   Dazu, wenn es passt: `grips` (Haltepunkte, siehe unten), `container` (Behälter), bei Inhalten `fits` (in welche Behälter) und `fill` (Fläche statt Stücke), bei der Kinderschere `kidSafe` und `kidTerms`.
2. `npm run kit:check`, dann `npm run kit:preview`. Beides gehört in den Pull Request.
3. Auf der Vorschau (`VORSCHAU.md`) in Karten- und Daumennagelgröße ansehen und die Frage aus Regel 9 stellen.

**Welche Bausteine fehlen?** `npm run kit:coverage` zählt für alle Aktivitäten, welche Gegenstände (Material und Nennung in Titel, Kurzbeschreibung, Schritten) vorkommen, gruppiert nach Häufigkeit, und welche keinen Baustein haben ([ABDECKUNG.md](ABDECKUNG.md); ein Baustein zählt über seine `materials`). Die Suche im Text ist grob (Wortstamm des Materialnamens). Der Bilder-Lauf (siehe Plan) meldet zusätzlich „fehlende Bausteine“: Die KI darf sie vorschlagen, nie erfinden.

## Figuren in Szenen (Schritt 3a)

Eine Figur steht auf einem Platz wie ein Baustein, aber mit `figure` statt `block`. Größe ist immer 1 (die Maße stehen in der Besetzung), auf der rechten Hälfte schaut sie zur Mitte.

```json
{ "slot": "middle", "figure": "arne", "pose": "carry-tray", "mitts": true,
  "holds": { "both": { "block": "tray", "content": "baked-apples", "hot": true } } }
```

- **Posen ohne Gegenstand** (aus dem Rig): `stand`, `walk`, `cheer`, `dance`, `freeze`, `amazed`, `happy`, `disappointed`, `thoughtful`, `curious`.
- **Posen mit Gegenstand:** Die Pose legt fest, wo der Gegenstand vor der Figur liegt; die Hand wird mit dem Arm aus zwei Gliedern auf seinen **Haltepunkt** gerechnet. Erreicht sie ihn nicht (genauer als 1,5 Einheiten), meldet der Prüfer das mit dem Hinweis, eine kleinere Größe (`"size": 0.75` oder `0.6`) zu wählen.

| Pose | hält | Haltepunkt | Bemerkung |
| --- | --- | --- | --- |
| `hold-plate` (hält) | `right` | `under` (Teller, Schüssel) vor der Brust; Werkzeug am `handle` nach vorn unten; sonst hängend am `handle` (Korb, Eimer) | |
| `carry-tray` (trägt Tablett) | `both` | `left` und `right` | vor dem Bauch, beide Hände |
| `point` (zeigt) | nichts | | Arm gestreckt nach vorn |
| `pour` (gießt) | `right` | `handle` (Kanne), um 50° gekippt | die zweite Hand stützt unten (`under`), wenn sie hinkommt |
| `stir` (rührt) | `left` Schüssel, `right` Werkzeug | `left` der Schüssel, `handle` des Werkzeugs; die Spitze liegt in der Schüssel | |
| `cut-supervised` (schneidet unter Aufsicht) | `right`, am Tisch auch `surface` | `handle`, Spitze nach vorn unten | scharf: nur Erwachsene (siehe Sicherheit) |
| `hand-over` (reicht) | `right` | wie `hold-plate`, Arm fast gestreckt | |
| `write` (schreibt, malt) | `right` Werkzeug, `surface` Papier | Spitze auf der Tischplatte | nur am Tisch (Layout `table`, Plätze `left`, `right`, `back`) |

- **Haltepunkte** (`grips` im Katalog, in Koordinaten des Bausteins): `handle` Griff oder Henkel, `tip` das arbeitende Ende, `left`/`right` die Ränder, `under` von unten. Heute: Tablett und Backblech (`left`, `right`), Teller (`under`), Schüssel (`left`, `right`, `under`), Holzlöffel, Kelle, Gabel, Messer, Wattestäbchen, Stock, beide Scheren (`handle`, `tip`), Kanne (`handle`, `under`), Korb und Eimer (`handle`).
- **Ofenhandschuhe** (`mitts`) trägt die Figur an beiden Händen. **Regen-Kleidung** (`"outfit": { "kind": "rain", "tint": "rose" }`): Regenjacke mit Kapuze (eine Mütze bleibt, dann ohne Kapuze) und Gummistiefel in Rosé oder Petrol.
- **Tiere** (Stups, Tüpfel) haben ihre eigenen Posen (`stand`, `sit`, `hop`, `point`, `watch`; Tüpfel nur `stand`, `sit`, `watch`) und halten nie etwas.
- **Reihenfolge:** Der Körper einer Figur steht auf der Ebene ihres Platzes, Gegenstände, Hände und Kopf davor. So liegen sie auch über dem Tisch.
- **Erwachsene nur in der Mitte** (Plätze `middle`, `mid`, `back`): Ilka (120) und Arne (123) reichen links und rechts mit dem Kopf 3 bis 6 Einheiten in die Ecken der Kategorie-Pille. Für Figuren prüft der Zeichner die Ecken an Kopf (mit Haaren oder Mütze), Händen und gehaltenen Dingen. Auch erhobene Arme von Kindern an den Seiten reichen hinein.

## Behälter mit Inhalt (Schritt 3a)

Ein Behälter (`container` im Katalog) nimmt einen **Inhalt** auf: `{ "block": "bowl", "content": "dough" }`, auf einem Platz oder in der Hand.
**Flach** (Tablett, Teller, Backblech): Die Stücke stehen in einer Reihe (so viele, wie Platz haben, höchstens drei). **Tief** (Schüssel, Korb, Eimer): Stücke liegen als kleiner Haufen in der Öffnung, Flächen (Teig, Wasser) füllen sie.
Welcher Inhalt in welchen Behälter passt, steht beim Inhalt (`fits`), zum Beispiel Wasser nur in Schüssel und Eimer. `"hot": true` setzt Dampf darüber, und das Ding zählt als **heiß**. Inhalte tragen ihre Merkmale selbst: Wasser ist `water`, Kastanien sind `smallParts`.

## Layout `hands` (Nahaufnahme für Schrittbilder, Schritt 3a)

Ein großer Gegenstand (`object`, Größe 2 oder 1,5) auf der Tischkante (y = 150), daneben links und rechts je ein kleiner. Die **Hände** hängen am Gegenstand:

```json
{ "slot": "object", "block": "bowl", "content": "dough", "size": 1.5,
  "hands": { "figure": "jette", "pose": "stir", "tool": { "block": "fork" } } }
```

Unterarme kommen vom unteren Bildrand, mit Ärmel (Ton der Kleidung der Figur oder `sleeve`), Hautton und Alter der Figur zählen wie bei ganzen Figuren. Posen: `hold` (an den Haltepunkten des Gegenstands), `stir` (linke Hand am Rand, Werkzeug in der Schüssel), `cut` (Werkzeug an der Mitte, die andere Hand hält), `write` (Werkzeug auf der Mitte). Die Ecken der Pille werden auch hier freigehalten, damit das Layout notfalls ein Titelbild tragen kann.

## Layouts und Plätze

Alle Maße in Einheiten der 400 × 200-Fläche. Standlinie `y = 176` (24 Einheiten Rand nach unten), Rand 24 ringsum, oben in den Ecken je 180 × 56 frei (dort sitzt die Kategorie-Pille, links, bei Rechts-nach-links rechts).
Bausteine auf der **rechten Hälfte schauen zur Mitte** (gespiegelt), links nicht; mit `"flip": true/false` lässt sich das ändern. Zeichenreihenfolge ist die `z`-Zahl des Platzes.

| Layout | Plätze (Größen) | Gedacht für |
| --- | --- | --- |
| `hero` | `main` (Mitte, 1,5 oder 1), `left`, `right` (1 oder 0,6) | Nahaufnahme: ein großer Gegenstand |
| `table` | `table` (Tisch), `on1`, `on2`, `on3` (auf der Tischplatte, 1 oder 0,6), `left`, `right` (Figuren oder Dinge), `back` (Figur hinter dem Tisch, Mitte) | Küche, Basteln, Experimente |
| `pair` | `left`, `right` (1 oder 0,6), `middle` (1, 1,5 oder 0,6) | Erwachsener und/oder Kind mit etwas dazwischen |
| `outdoor` | `s1` bis `s4`, `front` (nur Dinge), `mid` (nur Figuren, Mitte) | draußen, Spiele, Bewegung |
| `hands` | `object` (2 oder 1,5), `left`, `right` (1,5 oder 1) | Nahaufnahme von Händen und Gegenstand (Schrittbilder) |

Eine Szene (`*.scene.json`): `{ "layout": "pair", "items": [ { "slot": "left", "figure": "jette", "pose": "cheer" }, { "slot": "middle", "block": "radio", "tint": "honey" }, … ] }`, höchstens **6 Einträge**, einer je Platz, `ground: false` schaltet die Standlinie ab.
Geprüft wird: Layout, Platz, Baustein oder Figur, erlaubte Art für den Platz, Größe, Ton, Inhalt, Pose und Haltepunkte, Rand, Ecken, **Überdeckung** (zwei Einträge überdecken sich höchstens zu 35 % der kleineren Fläche; der Tisch zählt nicht, Dinge stehen darauf, und Dinge auf dem Tisch dürfen vor einer Figur hinter dem Tisch stehen) und die **Dateigröße** (höchstens 14 KB; darüber ist es ein Fehler, nichts wird still weggelassen).
Eine Szene, die nichts davon verletzt, ist **nicht automatisch ein gutes Bild**: Ob sie gut aussieht und eindeutig ist, sieht der Mensch.

## Sicherheit und „nichts, was der Text nicht sagt“

Gilt für jede Szene **zu einer Aktivität** (`"activity": "<id>"` in der Beispielszene, im Bilder-Lauf immer). Wie `checkSafety` ist es ein **grobes mechanisches Sieb**: Es findet Verstöße, versteht aber kein Bild. Dazu kommen die Rückfrage mit dem gerenderten Bild (Plan) und die Durchsicht vor der Beta (M12).

| Regel | Prüfung |
| --- | --- |
| **Scharfes** (`sharp`: Messer, spitze Schere) | Nur **in der Hand eines Erwachsenen**. Liegt es frei im Bild, hält es ein Kind (auch Mats) oder ist ein Kleinkind im Bild: Fehler. Das gilt auch für Hände in Nahaufnahme. |
| **Kinderschere** (`kidSafe`) | Ein Kind darf sie halten, wenn die Sicherheits-Checkliste es erlaubt: Aktivität ab **3 Jahren** (Punkt 5), ein **Erwachsener im Bild** (Punkt 2, „mit Erwachsenen“), und der **Text nennt die Kinderschere** („Kinderschere“, „child scissors“ …). Fehlt eines, gilt: nur Erwachsene. Ein Kleinkind hält sie nie. |
| **Heißes** (`heat`: Backblech, `"hot": true`) | Nur in der Hand eines **Erwachsenen mit Ofenhandschuhen** (`mitts`); ein Ofenhandschuh irgendwo im Bild reicht nicht mehr. **Kein Kleinkind** im Bild, andere Kinder mindestens **20 Einheiten** Abstand (waagerecht). |
| **Tiere** (Stups, Tüpfel) | Nie im selben Bild mit Scharfem oder Heißem (auch in der Hand, auch als heißer Inhalt) und nie bei einer Aktivität mit Backofen, Herd, Messer, Schere, Kerze im Material. |
| Feuer | Es gibt keinen Baustein dafür. |
| Schutzbrille (`goggles`) | Nur, wenn der **Sicherheitshinweis** (de oder en) Brille bzw. „goggles“ oder „glasses“ nennt. |
| Kleinteile (`smallParts`, auch Kastanien) | Nur, wenn `ageMin` mindestens 3 ist. |
| Wasser (`water`: Pfütze, Wasser in Schüssel oder Eimer) | Bei `ageMin` unter 6 ist ein **Erwachsener im Bild**. |
| **Petrol hinter tiefen Hauttönen** | Trägt der Hautton einer Figur auf Petrol nicht (Plätze 6 bis 8, heute Jette), liegt **an Kopf und Händen** nichts Petrolfarbenes: kein Baustein in Petrol, kein Petrol-Inhalt (Wasser), keine eigene Petrol-Kapuze, kein Petrol-Ärmel, keine Petrol-Kleidung einer anderen Figur. Geprüft mit der echten Lage von Kopf und Händen aus dem Rig. |
| Alter der Figuren | Kinder-Figuren nur zur Altersspanne der Aktivität (Nolli 0 bis 4, Jette 3 bis 9, Mats 8 bis 16), Nolli zusätzlich nur, wenn die Aktivität ab 2 Jahren oder jünger beginnt. |
| Nichts, was der Text nicht sagt | Jeder nicht neutrale Baustein, jeder Inhalt, die Regen-Kleidung und die Ofenhandschuhe müssen **gedeckt** sein: durch Material der Aktivität **oder** einen Begriff (`terms`) im Titel, in der Kurzbeschreibung, den Schritten oder im Sicherheitshinweis, in Deutsch oder Englisch. Tisch und Standlinie sind neutral, Figuren ebenso. |

## Offen für die Durchsicht (Schritt 3a)

Bitte auf der Vorschau ansehen und rückmelden, **bevor** die fünf Probebilder (Schritt 3b) entstehen:

1. **Erwachsene nur in der Mitte.** Ilka und Arne reichen an den Seiten in die Ecken der Pille (der Satz in FIGUREN.md „unter 125, damit der Kopf unter den Ecken bleibt“ stimmte nicht: Standlinie 176 minus 123 ist 53, die Ecken reichen bis 56). Mögliche Wege: so lassen (ein Erwachsener je Titelbild, in der Mitte), die Standlinie für Titelbilder etwas tiefer setzen (Rand unten kleiner als 24), oder Erwachsene in Titelbildern sitzend oder gebeugt. Das entscheidest du.
2. **Erhobene Arme an den Seiten** (Jubeln, Tanzen) reichen ebenfalls in die Ecken. In den Übersichtsbildern tanzen deshalb Jette und Nolli, nicht Mats.
3. Lesen sich die Posen mit Gegenstand (Hände an den Rändern des Tabletts, Kanne gekippt, Löffel in der Schüssel)? Mein Eindruck: Tablett, Teller und Rühren lesen sich gut, Gießen und Schneiden auf der Karte gut, im Daumennagel nur als Haltung. Der Teller in Kinderhand ist klein.
4. Behälter mit Inhalt: Kekse, Bananen und Zitronenhälften sind im Daumennagel nur noch Punkte; in der Nahaufnahme (`hands`) sind sie gut zu sehen.
5. Kanne und Kelle sind neu gezeichnet und noch nicht durch „Was könnte man noch darin sehen?“ gegangen (die Kelle liegt flach wie ein Griff mit Napf).
