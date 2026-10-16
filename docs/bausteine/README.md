# Baukasten für Zeichnungen (M9b, Stufe 1)

Stand: Oktober 2026. **Stufe 1: 30 Bausteine, 4 Layouts, 5 Beispielszenen.** Alle Bausteine in der Palette: [VORSCHAU.md](VORSCHAU.md).
Gesamtplan, Entscheidungen und Job-Kette des Bilder-Laufs: [`docs/bilder-plan.md`](../bilder-plan.md). Stilregeln für jede Zeichnung: [`docs/design/ILLUSTRATIONEN.md`](../design/ILLUSTRATIONEN.md).

## Die Idee in drei Sätzen

Ein **Baustein** ist ein kleines SVG-Stück mit Farbplätzen (Schüssel, Erwachsener, Tisch). Eine **Szene** wählt ein **Layout** und setzt Bausteine in dessen feste **Plätze**
(„links: Kind, Mitte: Radio, rechts: Kind“), nie in Koordinaten. Ein fester **Zeichner** (`scripts/lib/kit/scene.ts`) baut daraus das SVG, und die Prüfungen sehen, was ein Bild nicht zeigen darf.
So bleibt der Stil gleich, und weder ich noch die KI im Bilder-Lauf schreiben freien SVG-Code.

## Wo was liegt

| Was | Wo |
| --- | --- |
| Bausteine (nur SVG-Elemente) | `assets/bausteine/<gruppe>/<id>.svg` |
| Katalog (Maße, Töne, Merkmale, Begriffe) | `assets/bausteine/katalog.json` |
| Beispielszenen (mit Aktivität, wenn sie zu einer passen) | `assets/bausteine/beispiele/<name>.scene.json` |
| Layouts und Plätze | `scripts/lib/kit/layouts.ts` |
| Prüfung der Bausteine | `scripts/lib/kit/catalog.ts` |
| Szene prüfen und zeichnen, Sicherheit und Textabgleich | `scripts/lib/kit/scene.ts` |
| Tests | `scripts/lib/kit/kit.test.ts` (laufen mit `npm test`) |
| Vorschau (erzeugt, eingecheckt) | `docs/bausteine/VORSCHAU.md`, `docs/bausteine/vorschau/` |

```bash
npm run kit:check      # prüft alle Bausteine und Beispielszenen (Sicherheit und Text, wenn die Szene eine Aktivität nennt)
npm run kit:preview    # erzeugt die Vorschau neu; `-- --check` prüft nur, ob sie noch passt (der Test macht dasselbe)
```

## Die 30 Bausteine der Stufe 1

| Gruppe | Bausteine |
| --- | --- |
| Figuren (6) | Erwachsener (ruhig, greift), Kind (ruhig, greift, jubelt), Kleinkind (sitzend) |
| Möbel und Fläche (8) | Standlinie, Tisch, Tablett, Decke, Kissen, Stuhl, Karton, Radio |
| Küche (5) | Schüssel, Holzlöffel, Backblech, Pizza, Ofenhandschuh |
| Basteln (4) | Schere, Klebetube, Papier, Socke |
| Experiment (4) | Becher, Flasche, Schutzbrille, Taschenlampe |
| Natur (3) | Baum, Blume, Pfütze |

**Stufe 2** (erst nach der Durchsicht von Stufe 1): rund 45 weitere, z. B. Jugendlicher, Hände, Schneebesen, Nudelholz, Pfanne, Topf, Ausstecher, Teller, Teig, Obst und Gemüse,
Pinsel mit Farben, Stifte, Wolle, Knopf, Klebeband, Lupe, Luftballon, Blatt, Pilz, Stein, Kastanie, Stock, Sonne, Wolke, Eimer, Würfel, Karten, Ball, Bauklötze, Seil, Reifen, Trommel, Rassel,
Rucksack, Fernglas, Buch, Bank, Wegweiser; dazu das Layout „hands“ und zusammengesetzte Bausteine wie „Pizza auf dem Blech“. **Feuer, Flammen und Kerzen gibt es nie** (Sicherheits-Checkliste, Punkt 7), auch keine Noten, Pfeile oder Zeichen mit Bedeutung.

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
   `hazards` (`sharp`, `heat`, `goggles`, `smallParts`, `water`), `materials` (Schlüssel aus `src/features/activities/materials.ts`), `terms` (Wörter im Text, de und en, kleingeschrieben, Wortteile genügen) und `neutral` (nur Figuren, Tisch, Standlinie).
2. `npm run kit:check`, dann `npm run kit:preview`. Beides gehört in den Pull Request.
3. Auf der Vorschau (`VORSCHAU.md`) in Karten- und Daumennagelgröße ansehen und die Frage aus Regel 9 stellen.

**Welche Bausteine fehlen?** Der Bilder-Lauf (siehe Plan) meldet im Bericht „fehlende Bausteine“, wie der Wochenlauf neues Material meldet: Die KI darf sie vorschlagen, nie erfinden. Ein Abdeckungsbericht über alle Aktivitäten (`kit:coverage`) kommt mit Stufe 2.

## Layouts und Plätze

Alle Maße in Einheiten der 400 × 200-Fläche. Standlinie `y = 176` (24 Einheiten Rand nach unten), Rand 24 ringsum, oben in den Ecken je 180 × 56 frei (dort sitzt die Kategorie-Pille, links, bei Rechts-nach-links rechts).
Bausteine auf der **rechten Hälfte schauen zur Mitte** (gespiegelt), links nicht; mit `"flip": true/false` lässt sich das ändern. Zeichenreihenfolge ist die `z`-Zahl des Platzes.

| Layout | Plätze (Größen) | Gedacht für |
| --- | --- | --- |
| `hero` | `main` (Mitte, 1,5 oder 1), `left`, `right` (1 oder 0,6) | Nahaufnahme: ein großer Gegenstand |
| `table` | `table` (Tisch), `on1`, `on2`, `on3` (auf der Tischplatte, 1 oder 0,6), `left`, `right` (Figuren) | Küche, Basteln, Experimente |
| `pair` | `left`, `right` (1 oder 0,6), `middle` (1, 1,5 oder 0,6) | Erwachsener und/oder Kind mit etwas dazwischen |
| `outdoor` | `s1` bis `s4`, `front` (nur Dinge) | draußen, Spiele, Bewegung |

Eine Szene (`*.scene.json`): `{ "layout": "pair", "items": [ { "slot": "left", "block": "child-cheer", "tint": "rose" }, … ] }`, höchstens **6 Bausteine**, ein Baustein je Platz, `ground: false` schaltet die Standlinie ab.
Geprüft wird: Layout, Platz, Baustein, erlaubte Art für den Platz, Größe, Ton, Rand, Ecken und **Überdeckung** (zwei Bausteine überdecken sich höchstens zu 35 % der kleineren Fläche; der Tisch zählt nicht, Dinge stehen darauf).
Eine Szene, die nichts davon verletzt, ist **nicht automatisch ein gutes Bild**: Ob sie gut aussieht und eindeutig ist, sieht der Mensch.

## Sicherheit und „nichts, was der Text nicht sagt“

Gilt für jede Szene **zu einer Aktivität** (`"activity": "<id>"` in der Beispielszene, im Bilder-Lauf immer). Wie `checkSafety` ist es ein **grobes mechanisches Sieb**: Es findet Verstöße, versteht aber kein Bild. Dazu kommen die Rückfrage mit dem gerenderten Bild (Plan) und die Durchsicht vor der Beta (M12).

| Regel | Prüfung |
| --- | --- |
| Schere, Messer (`sharp`) und Hitze (`heat`, z. B. Backblech) | Die **nächste** Figur ist ein Erwachsener (bei Gleichstand zählt es nicht), und **kein Kleinkind** im Bild. Hitze braucht zusätzlich einen **Ofenhandschuh** im Bild. |
| Feuer | Es gibt keinen Baustein dafür. |
| Schutzbrille (`goggles`) | Nur, wenn der **Sicherheitshinweis** (de oder en) Brille bzw. „goggles“ oder „glasses“ nennt. |
| Kleinteile (`smallParts`) | Nur, wenn `ageMin` mindestens 3 ist. |
| Wasser (`water`, z. B. Pfütze) | Bei `ageMin` unter 6 ist ein **Erwachsener im Bild**. |
| Alter der Figuren | Kleinkind nur, wenn die Aktivität schon ab 2 oder jünger geht; Kind erst, wenn sie bis mindestens 3 geht; Jugendlicher erst ab Obergrenze 12. |
| Nichts, was der Text nicht sagt | Jeder nicht neutrale Baustein muss **gedeckt** sein: durch eines seiner Materialien in `materials` der Aktivität **oder** durch einen Begriff (`terms`) im Titel, in der Kurzbeschreibung, den Schritten oder im Sicherheitshinweis, in Deutsch oder Englisch. Figuren, Tisch und Standlinie sind neutral. |

## Offen für die Durchsicht (Stufe 1)

Bitte auf der Vorschau ansehen und rückmelden, **bevor** Stufe 2 gebaut wird:

1. Passt der Stil zum Pilot (Figuren, Linien, Farbflächen)? Sind die Figuren zu schlicht oder zu klein? Sollen Erwachsene/Kinder mehr Hände oder Haltungen bekommen?
2. Welche Bausteine sind schwer zu erkennen (Daumennagel 96 × 48 und 64 × 32)? Mein Eindruck: Tablett, Backblech, Decke und Papier sind flach und wirken klein; Klebetube und Taschenlampe sind klein.
3. Sieht ein Baustein nach etwas anderem aus (Bierglas, Kerze, …)? Pfütze und Radio besonders ansehen.
4. Wirken die Beispielszenen eindeutig? Es sind keine endgültigen Titelbilder.
5. Sind die Layouts (vier Stück) richtig geschnitten, oder fehlt ein Platz (z. B. etwas, das eine Figur in der Hand hält)? Heute stehen Gegenstände nur **neben** Figuren, nicht in ihrer Hand.
