# Illustrationen – Stilregeln (Pilot, nicht endgültig)

Stand: Oktober 2026. **Pilot:** Wir testen mit drei Aktivitäten, ob ein selbst gezeichneter Stil trägt
(Sockenpuppen-Theater, Pizza selber machen, Natron-Vulkan). Nichts davon ist endgültig, es gibt keine Automatik.
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
| Datei | SVG, **unter 10 KB**, keine externen Schriften, Bilder oder Links |
| Ablage | Ausgabe in `assets/illustrations/` (**erzeugt**, nicht von Hand ändern), Vorlagen in `assets/illustrations/src/` (siehe „Farbplätze und Erzeugen“) |
| Name | Titelbild `aktivitaets-id.svg`, Schrittbild `aktivitaets-id-step-N.svg` (N = Schrittnummer, wie sie in der App steht, ab 1) |

**Erlaubter SVG-Code** (damit es auf iOS, Android und im Browser gleich aussieht): nur `svg`, `g`, `path`, `circle`, `ellipse`,
`rect`, `line`, `polyline`, `polygon` mit Attributen (`fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `transform`,
`stroke-dasharray` für vorgezeichnete Linien, z. B. die Schnittlinie am Karton).
**Nicht erlaubt:** `text`, `image`, `style`, `script`, `use`, `defs`, Verläufe, Filter, Masken, Schnittpfade, `href`, `url(…)`, `opacity`.
Der Test `src/features/activities/illustrations.test.ts` prüft das.

## Linie

- **Tinte** (`{{ink}}`, `#12323D`), **runde Enden und runde Ecken** (`stroke-linecap="round"`, `stroke-linejoin="round"`).
- **Nur zwei Stärken:** **4** für Umrisse, **2,5** für Details (Naht, Faden, Dampf). Auf der Karte (ca. 312 px breit) sind das etwa 3 px und 2 px.
  In einer verkleinerten Gruppe (`scale`) zählt die sichtbare Stärke (bei `scale(.5)` also 8 und 5 eintragen).
  Ausnahme: eine Abdecklinie in `{{paper}}`, die zwei Flächen verbindet (z. B. Schaum, der in den Becher übergeht), darf breiter sein.
- Linien dürfen leicht schwingen, nichts muss perfekt symmetrisch sein. Keine Schraffuren, keine Schatten.

## Farben: die Zeichnungs-Palette

Zeichnungen haben eine **feste eigene Palette** (`illustrationPalette` in `src/lib/palette.ts`): die vier Farben der App und zwei **warme Gegenstandsfarben**, flach, ohne Verläufe und ohne Transparenz.
Jede Farbe in einer Zeichnung ist ein **Platzhalter** `{{name}}` (Rolle), nie ein fester Hexwert (siehe „Farbplätze und Erzeugen“).

| Platzhalter | Wert | Einsatz im Bild | Tinte darauf | Leinen darauf |
| --- | --- | --- | --- | --- |
| `{{paper}}` | Leinen `#FCF8F2` | Köpfe, Hände, helle Gegenstände, Schaum, großer Kreis hinter dem Motiv | 12,8:1 | – |
| `{{ground}}` | Rosé-Leinen `#FAE7E2` (gleich `surface`) | Grund des Bildes | 11,4:1 | 1,1:1 |
| `{{ink}}` | Tinte `#12323D` | alle Linien, kleine dunkle Punkte (Knopfaugen) | – | 12,8:1 |
| `{{rose}}` | Rosé `#F4BEBB` | Kleidung (Kinder), Sauce, Vorhänge, Socken: **sparsam**, kleine Flächen | 8,3:1 | 1,5:1 |
| `{{petrol}}` | Petrol `#1A5D74` | Kleidung (Erwachsene), Socken, Puppen | 1,8:1 | 6,9:1 |
| `{{honey}}` | Honig `#E8A94F` (warm) | Teig, Käse, Handschuh, Kleber: nur Gegenstände | 6,6:1 | 1,9:1 |
| `{{brown}}` | Braun `#B07A45` (warm) | Pappe, Holz: nur Gegenstände | 3,7:1 | 3,5:1 |

- **Die warmen Töne gelten nur für Gegenstände** (Essen, Pappe, Holz, Klebstoff), **nie für Kleidung oder Flächen der App.** Sie stammen aus derselben Familie wie die Warnfarben (`warning`, `warningSurface`)
  und sind **keine** Farbrollen des Themes (Test). Kleidung ist Petrol, Rosé oder Leinen.
- **Kontraste:** Tinte-Linien auf Rosé, Honig, Braun und Leinen sind klar sichtbar (mindestens 3,7:1). **Auf Petrol nur 1,8:1:** Der Umriss verschwindet im Petrol und die Fläche trägt die Form.
  Deshalb bleiben Petrol-Flächen groß und einfach (Kleidung, Puppen), Details darauf sind in Leinen. Rosé auf Leinen hat nur 1,5:1, Rosé-Flächen stehen deshalb immer mit Tinten-Umriss.
- Der Test `src/features/activities/illustrations.test.ts` prüft: nur diese sieben Werte, keine festen Farben in den Vorlagen, jeder Platzhalter ist bekannt.
- **Versetzte Flächen:** Farbflächen sitzen 3 bis 4 Einheiten neben ihrem Umriss, wie beim Druck mit leicht verrutschter Farbe.
  Das macht den handgemachten Eindruck und kostet keine Bytes.
- **Grund:** `{{ground}}` mit einem großen, weichen Kreis in `{{paper}}` hinter dem Motiv (das Echo der Farbfläche mit dem Kreis).
- **Dunkelmodus (D5):** Die Bilder bleiben hell (wie Fotos es wären). Sie sind auf der Karte gerahmt und stehen für sich.

## Baukasten (M9b)

Ab M9b entstehen Titelbilder nicht mehr frei von Hand, sondern aus **Bausteinen** mit Farbplätzen, die ein fester Zeichner in feste Plätze eines Layouts setzt (`docs/bausteine/README.md`, Plan: `docs/bilder-plan.md`).
Alle Regeln dieser Datei gelten weiter (Format, Linien, Palette, Figuren, Sicherheit); der Baukasten setzt die mechanisch prüfbaren davon um (Linienstärken 4 und 2,5, nur Palette, erlaubter Code, Ecken der Pille, Rand) und ergänzt die **Petrol-Regel:**
Petrol ist nie Bildgrund; in Bausteinen mit Petrol sind feine Linien Leinen, nicht Tinte (Tinte auf Petrol nur 1,8:1).

## Farbplätze und Erzeugen

**Jede künftige Zeichnung entsteht mit den Platzhaltern.** So lässt sich die Palette später ändern, ohne Zeichnungen neu zu zeichnen (SVG-Dateien kennen keine Laufzeit-Variablen, und `expo-image` kann sie nicht umfärben;
`tintColor` färbt nur einfarbig).

1. **Vorlage schreiben:** `assets/illustrations/src/<name>.svg` mit Platzhaltern wie `fill="{{petrol}}"` statt `#1A5D74`. Namen nach „Format“ oben (Titelbild `aktivitaets-id.svg`, Schrittbild `aktivitaets-id-step-N.svg`).
   Feste Farbwerte sind in Vorlagen verboten (Test).
2. **Erzeugen:** `npm run illustrations:build` liest alle Vorlagen, setzt die Werte aus `illustrationPalette` (`src/lib/palette.ts`) ein und schreibt die fertigen SVGs nach `assets/illustrations/`.
   **Die erzeugten Dateien werden eingecheckt** (Metro lädt sie wie bisher mit `require`), von Hand ändert man sie nie.
3. **Palette ändert sich?** Wert in `src/lib/palette.ts` ändern und **`npm run illustrations:build` neu ausführen**, die Ausgabedateien mitchecken. Der Test meldet jede erzeugte Datei, die nicht zu Vorlage und Palette passt
   (`npm run illustrations:build -- --check` prüft dasselbe ohne zu schreiben).
4. **Neue Rolle** (z. B. eine siebte Farbe): in `illustrationPalette` ergänzen, hier in die Tabelle, Kontraste angeben, dann die Vorlagen anpassen.
5. Eintragen in `src/features/activities/illustrations.ts` wie bisher.

## Figuren

- **Einfache Strichfiguren ohne Gesichtszüge:** Kreis als Kopf, Arme und Beine als Linien (Stärke 4), der Oberkörper als
  gerundete Farbfläche (Kleidung in Petrol oder Rosé). Keine Augen, kein Mund, keine Haare, keine Nase.
- **Köpfe und Hände sind `{{paper}}`** mit Tinten-Umriss. So legt das Bild keine Hautfarbe fest.
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
- **Auch in Palette C gilt:** Ein Becher mit Schaumkrone darf nicht nach Bierglas aussehen, eine Tube nicht nach Kerze. Eine rosa Tomatensauce bleibt Sauce, wenn Teig (Honig) und Käse (Leinen) dazu stehen.
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

## Vorrang im Bildbereich

Im Bildbereich der Karte und der Detailansicht gilt:

1. `image` der Aktivität (Web-Adresse),
2. **Illustration** aus der zentralen Zuordnung (`src/features/activities/illustrations.ts`),
3. Farbfläche mit Symbol.

Die Bildkette (`src/features/suggestions/cardImage.ts`) kennt `image` und die Farbfläche; der Bildbereich (`CardMedia`)
schiebt die Illustration dazwischen, sobald die Kette kein geladenes `image` hat.

## Schrittbilder

- Ein Schrittbild steht **unter dem Text seines Schritts**, in der Textspalte (gleich breit wie der Text), Radius `tile` (16).
  Zum eigenen Text sind es 16 px, nach dem Bild bis zum nächsten Schritt 44 px (28 + 16): So gehört es sichtbar zu seinem Schritt.
  Neben dem Text wäre die Anleitung (20 px) zu schmal.
- Es zeigt genau die Handlung dieses Schritts, nicht das Ergebnis eines späteren.
- Die Zuordnung hängt an der Schrittnummer. **Ändert sich die Anleitung, müssen die Schrittbilder mitgeprüft werden**
  (der Test meldet nur Nummern, die es nicht gibt, nicht einen geänderten Inhalt).

## Prüfung vor dem Einbau

1. Im Browser rendern: Karte, Schrittbild, Daumennagel 96 × 48 und 64 × 32.
2. Fragen: Erkennt man das Motiv im Daumennagel? Ist jede Hand und jeder Gegenstand eindeutig? Stimmt das Bild mit Text und Sicherheitshinweis überein?
3. `npm run illustrations:build`, dann `npm test` (prüft Größe, Format, Farben, Vorlagen, erlaubten SVG-Code und die Zuordnung, Test `src/features/activities/illustrations.test.ts`).
   Linienstärken, Lesbarkeit und Sicherheit prüft der Test nicht.
4. Vor der Beta schaut ein Mensch alle Illustrationen durch (wie die Aktivitäten).
