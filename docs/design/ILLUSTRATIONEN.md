# Illustrationen – Stilregeln (Pilot, nicht endgültig)

Stand: Oktober 2026. **Pilot:** Wir testen mit drei Aktivitäten, ob ein selbst gezeichneter Stil trägt
(Sockenpuppen-Theater, Pizza selber machen, Natron-Vulkan). Nichts davon ist endgültig, es gibt keine Automatik.
Ergebnis und Bilder: `docs/illustrationen-pilot.md`. Die Regeln für Fotos (DESIGN.md, „Regeln für Fotos“) bleiben unverändert.

## Gefühl

Passend zu „Sonntagslicht“: warm, ruhig, wie mit dem Stift auf Papier gezeichnet. Wenige Formen, viel Luft,
ein Gegenstand oder eine Handlung steht im Mittelpunkt. Die Illustration erklärt in einem Blick, **was** man macht,
nicht **wie gut** es aussehen muss.

## Format

| Regel | Wert |
| --- | --- |
| Seitenverhältnis | **2:1** wie der Bildbereich der Karten (`CardMedia`) |
| Zeichenfläche | `viewBox="0 0 400 200"`, alle Maße unten in diesen Einheiten |
| Eigengröße | `width="1200" height="600"`: Falls ein Handy das SVG in seiner Eigengröße rastert (iOS), bleibt es auf der Karte (ca. 312 pt, also 936 px bei 3×) scharf |
| Datei | SVG, **unter 10 KB**, keine externen Schriften, Bilder oder Links |
| Ablage | `assets/illustrations/` |
| Name | Titelbild `aktivitaets-id.svg`, Schrittbild `aktivitaets-id-step-N.svg` (N = Schrittnummer, wie sie in der App steht, ab 1) |

**Erlaubter SVG-Code** (damit es auf iOS, Android und im Browser gleich aussieht): nur `svg`, `g`, `path`, `circle`, `ellipse`,
`rect`, `line`, `polyline`, `polygon` mit Attributen (`fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `transform`,
`stroke-dasharray` für vorgezeichnete Linien, z. B. die Schnittlinie am Karton).
**Nicht erlaubt:** `text`, `image`, `style`, `script`, `use`, `defs`, Verläufe, Filter, Masken, Schnittpfade, `href`, `url(…)`, `opacity`.
Der Test `src/features/activities/illustrations.test.ts` prüft das.

## Linie

- **Tinte** (`#2A211C`), **runde Enden und runde Ecken** (`stroke-linecap="round"`, `stroke-linejoin="round"`).
- **Nur zwei Stärken:** **4** für Umrisse, **2,5** für Details (Naht, Faden, Dampf). Auf der Karte (ca. 312 px breit) sind das etwa 3 px und 2 px.
  In einer verkleinerten Gruppe (`scale`) zählt die sichtbare Stärke (bei `scale(.5)` also 8 und 5 eintragen).
  Ausnahme: eine Abdecklinie in Papier, die zwei Flächen verbindet (z. B. Schaum, der in den Becher übergeht), darf breiter sein.
- Linien dürfen leicht schwingen, nichts muss perfekt symmetrisch sein. Keine Schraffuren, keine Schatten.

## Farben

Nur die sechs Farben der Palette, flach, ohne Verläufe und ohne Transparenz:

| Farbe | Wert | Einsatz im Bild |
| --- | --- | --- |
| Papier | `#FAF6F0` | Köpfe, Hände, helle Gegenstände, Schaum |
| Sand | `#F0E6D8` | Grund des Bildes |
| Tinte | `#2A211C` | alle Linien, kleine dunkle Punkte (Knopfaugen) |
| Terrakotta | `#B4532F` | **sparsam**, nur kleine Flächen (Tomatensauce, ein Vorhang), damit das Bild nicht mit dem Hauptknopf wetteifert |
| Salbei | `#5F7A5A` | Kleidung, Pflanzen, Gemüse |
| Honig | `#E8A94F` | Kleidung, Karton, Teig, Käse, Licht |

- **Versetzte Flächen:** Farbflächen sitzen 3 bis 4 Einheiten neben ihrem Umriss, wie beim Druck mit leicht verrutschter Farbe.
  Das macht den handgemachten Eindruck und kostet keine Bytes.
- **Grund:** Sand mit einem großen, weichen Kreis in Papier hinter dem Motiv (das Echo der Farbfläche mit dem Kreis).
- **Dunkelmodus (D5):** Die Bilder bleiben hell, wie Fotos. Sie sind auf der Karte gerahmt und stehen für sich.

## Figuren

- **Einfache Strichfiguren ohne Gesichtszüge:** Kreis als Kopf, Arme und Beine als Linien (Stärke 4), der Oberkörper als
  gerundete Farbfläche (Kleidung). Keine Augen, kein Mund, keine Haare, keine Nase.
- **Köpfe und Hände sind Papier** mit Tinten-Umriss. So legt das Bild keine Hautfarbe fest.
- **Erwachsene sind deutlich größer als Kinder** (Erwachsene etwa 150, Kinder etwa 95 Einheiten hoch, Kopf gleich groß).
  Wer was tut, ist so ohne Gesicht erkennbar.
- **Hände und Gegenstände sind gut erkennbar:** Sie sind groß, haben eine klare Form (Fäustling mit Daumen) und stehen
  frei, nicht hinter anderen Formen.

## Bildaufbau

- **Ein Motiv pro Bild.** Ein Gegenstand oder eine Handlung, kein Hintergrund mit Möbeln oder Räumen.
- **Viel Luft:** Das Motiv bleibt innerhalb von 24 Einheiten Rand.
- **Titelbilder: Die oberen Ecken bleiben frei von Wichtigem** (je etwa 180 × 60): Auf der Karte liegt dort die Kategorie-Pille,
  oben am Anfang der Zeile, bei Rechts-nach-links also oben rechts. Schrittbilder haben keine Pille.
- **Lesbar in jeder Größe:** auf der Karte (ca. 312 × 156), als Schrittbild (ca. 256 × 128) und in Daumennagelgröße
  (96 × 48 und 64 × 32). Im Daumennagel muss das Motiv **an seinen großen Flächen** erkennbar sein, nicht an den Linien.
- **Nahaufnahme vor Szene** (Erfahrung aus dem Pilot): Hände und Gegenstände in Nahaufnahme bleiben im Daumennagel lesbar,
  Szenen mit ganzen Figuren verlieren dort ihre Einzelheiten. Ganze Figuren nur, wenn es darauf ankommt, **wer** etwas tut
  (Erwachsener am Ofen, Erwachsener mit Schere).
- **Keine Form, die an etwas anderes erinnert** (Erfahrung aus dem Pilot): Ein Becher mit Schaumkrone wirkte wie ein Bierglas,
  eine Flasche mit spitzer Kappe wie eine Kerze. Jedes Bild einmal mit der Frage „Was könnte man noch darin sehen?“ ansehen.

## Mehrsprachigkeit und Rechts-nach-links

- **Kein Text im Bild**, auch keine Zahlen, Buchstaben, Logos oder Symbole mit Bedeutung (Häkchen, Pfeile).
- Nichts, was eine Leserichtung braucht (keine Bildfolgen, keine Pfeile). Das Bild wird bei Rechts-nach-links **nicht gespiegelt**.
- Für die Sprachausgabe sind alle Illustrationen **Dekoration**. Was zu tun ist, steht im Text.

## Sicherheit

Ein Bild zeigt nie etwas, was der Sicherheits-Checkliste (`docs/sicherheits-checkliste.md`) oder dem Text der Aktivität
widerspricht. **Ein Bild darf nichts zeigen, was der Text nicht sagt.** Für jedes Bild wird geprüft:

| Thema | Im Bild |
| --- | --- |
| Hitze (Ofen, Herd, Blech) | nur ein Erwachsener mit Ofenhandschuhen, das Kind mit Abstand |
| Schere, Messer | nur in der Hand eines Erwachsenen (Ausnahme: die Aktivität erlaubt es Kindern ausdrücklich) |
| Feuer | keine offene Flamme, keine Kerze (auch nicht in Laternen, Punkt 7) |
| Wasser | kein Kind allein am Wasser, bei Kindern unter 6 immer ein Erwachsener daneben (Punkt 3) |
| Kleinteile | keine losen Kleinteile in der Nähe von Kleinkindern (Punkt 1) |
| Spritzer, Augen | Schutzbrille nur, wenn der Text sie nennt (sonst Bild oder Text anpassen) |
| Alter | Größe der Figuren passt zur Altersgruppe der Aktivität |

**Bekannte Ausnahme im Pilot:** Der Natron-Vulkan zeigt eine Schutzbrille, sein Sicherheitshinweis nennt sie noch nicht.
Das steht als Punkt für die Durchsicht vor der Beta in der CLAUDE.md (Text ergänzen oder Bild anpassen).

## Vorrang im Bildbereich (Pilot)

Im Bildbereich der Karte und der Detailansicht gilt:

1. `image` der Aktivität (Web-Adresse),
2. **Illustration** aus der zentralen Zuordnung (`src/features/activities/illustrations.ts`),
3. gebündeltes Kategorie-Foto (heute keines, Mindestzahl 99),
4. Farbfläche mit Symbol.

Die Illustration gewinnt vor dem Kategorie-Foto, weil sie genau zu dieser Aktivität passt, ein Kategorie-Foto nur zur Kategorie.
Die Foto-Mechanik (`src/features/suggestions/cardImage.ts`) bleibt für den Pilot unverändert: Der Bildbereich (`CardMedia`)
zeigt die Illustration, sobald die Kette kein geladenes `image` hat.

## Schrittbilder

- Ein Schrittbild steht **unter dem Text seines Schritts**, in der Textspalte (gleich breit wie der Text), Radius `tile` (16).
  Neben dem Text wäre die Anleitung (20 px) zu schmal.
- Es zeigt genau die Handlung dieses Schritts, nicht das Ergebnis eines späteren.
- Die Zuordnung hängt an der Schrittnummer. **Ändert sich die Anleitung, müssen die Schrittbilder mitgeprüft werden**
  (der Test meldet nur Nummern, die es nicht gibt, nicht einen geänderten Inhalt).

## Prüfung vor dem Einbau

1. Im Browser rendern: Karte, Schrittbild, Daumennagel 96 × 48 und 64 × 32.
2. Fragen: Erkennt man das Motiv im Daumennagel? Ist jede Hand und jeder Gegenstand eindeutig? Stimmt das Bild mit Text und Sicherheitshinweis überein?
3. `npm test` (prüft Größe, Format, Farben, erlaubten SVG-Code und die Zuordnung, Test `src/features/activities/illustrations.test.ts`).
   Linienstärken, Lesbarkeit und Sicherheit prüft der Test nicht.
4. Vor der Beta schaut ein Mensch alle Illustrationen durch (wie Fotos und Aktivitäten).
