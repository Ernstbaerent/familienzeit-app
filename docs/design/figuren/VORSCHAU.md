# Figuren: die Besetzung in Satz C (Entwurf zur Wahl)

> **ERZEUGT** von `npm run figures:preview` aus `scripts/lib/figures/`. Nicht von Hand ändern. Hintergrund, Regeln und offene Entscheidungen: [`docs/design/FIGUREN.md`](../FIGUREN.md).

Satz C „schlank und verspielt“ ist von Clemens gewählt. Hier die Besetzung aus sieben Figuren, **drei Hautton-Varianten** und **zwei Fassungen** (ohne und mit Augenpunkten), alle aus demselben Rig.
Noch offen und von Clemens zu wählen: **Hautton (A, B oder C), Augenpunkte (ja oder nein) und die Namen von Papa und Junge.**

## Besetzung

| Name | Rolle | Alter | passt zu Aktivitäten (Altersspanne) | Standhöhe | Beschreibung | Namenscheck (Kinderfiguren, Websuche) |
| --- | --- | --- | --- | --- | --- | --- |
| **Nolli** | kleineres Kind | ≈ 3 | 0 bis 4 Jahre | 67 | das kleinste Kind (≈3): Dutt, Petrol-Kleidchen | keine bekannte Kinderfigur gefunden |
| **Jette** | größeres Kind | ≈ 7 | 3 bis 9 Jahre | 88 | das größere Kind (≈7): Haarbüschel, Rosé-Kleid | keine bekannte Figur, nur eine Buchreihe „Jette“ von Fee Krämer (Erwachsenen- bis Jugendbuch) |
| **Mats** | älteres Kind | ≈ 11 | 8 bis 16 Jahre | 105 | der ältere Junge (≈11): Mütze, Rosé-Shirt, die Hand in der Hüfte | Vorschlag für den Jungen: nur das Bilderbuch „Mats und Mathilde“, keine bekannte Figur |
| **Ilka** | Erwachsene | Erwachsene | jede | 120 | die Mutter: groß und schlank, langer Mantel, Schal | keine bekannte Kinderfigur gefunden |
| **Arne** | Erwachsene | Erwachsene | jede | 123 | der Papa: noch etwas größer, Leinen-Pullover, kurze Haare | Vorschlag für den Papa: keine Kinderfigur gefunden (nur der Krimiautor Arne Dahl, ein Erwachsenen-Name) |
| **Tüpfel** | Haustier | – | nie bei Hitze, Feuer, Messer, Schere | 40 | die Katze: schlank, langer Schwanz, spitze Ohren | keine bekannte Figur (nur „Tüpfelblatt“ aus Warrior Cats, anderer Name) |
| **Stups** | Haustier | – | nie bei Hitze, Feuer, Messer, Schere | 39 | der Vogel: klein, dünne Beine, langer Schwanz, Haarschopf | keine bekannte Kinderfigur gefunden |

**Namensvorschläge:** Papa **Arne** (Alternative Malte), Junge **Mats** (Alternative Tore). Schwächer: Rune (Jugendroman „Rune“ und Comicreihe „Rune“ (2024 ff.)); Ivo (Bilderbuch „The Boy Who Lived in a Shell“ (Himmelman) und ein spanischer Roman mit Figur „Ivo“).

## Hautton: drei Varianten

**Variante A: bunte Besetzung.** Fünf feste warme Töne von hell bis dunkel, jede Figur hat ihren eigenen. Zeigt Vielfalt, ohne einzelne Menschen zu beschreiben.

**Variante B: ein mittlerer Ton.** Alle Figuren haben denselben mittleren, warmen Ton (Farbton 23°, gedämpft, ohne Gelb- und ohne Rotstich).

**Variante C: keine Hautfarbe.** Alle Figuren in einem weichen Blaugrau, eindeutig stilisiert. Niemand wird als „hellhäutig“ oder „dunkelhäutig“ gelesen.

Von links nach rechts: Nolli, Jette, Mats, Ilka, Arne, Tüpfel, Stups.

| Variante | ohne Augenpunkte | mit Augenpunkten |
| --- | --- | --- |
| **Variante A: bunte Besetzung** | <img src="vorschau/A-ohne-besetzung.svg" width="312" alt="Variante A: bunte Besetzung, ohne Augenpunkte"> | <img src="vorschau/A-augen-besetzung.svg" width="312" alt="Variante A: bunte Besetzung, mit Augenpunkten"> |
| **Variante B: ein mittlerer Ton** | <img src="vorschau/B-ohne-besetzung.svg" width="312" alt="Variante B: ein mittlerer Ton, ohne Augenpunkte"> | <img src="vorschau/B-augen-besetzung.svg" width="312" alt="Variante B: ein mittlerer Ton, mit Augenpunkten"> |
| **Variante C: keine Hautfarbe** | <img src="vorschau/C-ohne-besetzung.svg" width="312" alt="Variante C: keine Hautfarbe, ohne Augenpunkte"> | <img src="vorschau/C-augen-besetzung.svg" width="312" alt="Variante C: keine Hautfarbe, mit Augenpunkten"> |

### Kontrast der Töne

WCAG-Kontrast (`src/lib/contrast.ts`). **Gegen Leinen, Rosé, Grund und Petrol** zeigt, wie sich die Haut vom Hintergrund absetzt (für Flächen sind 3:1 das Ziel, für „Haut“ nicht erreichbar, weil helle Töne nie 3:1 gegen helle Hintergründe haben). Die Figur wird über den **Tinten-Umriss** gelesen: Tinte gegen den Hintergrund (Grund) 11:1. Wichtig ist deshalb **Tinte gegen die Haut** (Lesbarkeit der Linie auf dem Gesicht und den Händen) und der **Augenpunkt** gegen die Haut (Tinte oder Leinen, je nachdem, was besser ist).

| Variante / Platz | Ton | gegen Leinen | gegen Rosé | gegen Grund | gegen Petrol | Tinte auf Haut | Augenpunkt (Farbe, Kontrast) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A: Nolli | `#F1CDB3` | 1,4:1 | 1,1:1 | 1,2:1 | 4,9:1 | **9,1:1** | Tinte, 9,1:1 |
| A: Jette | `#DDAA85` | 2,0:1 | 1,3:1 | 1,7:1 | 3,6:1 | **6,6:1** | Tinte, 6,6:1 |
| A: Ilka | `#C48A62` | 2,8:1 | 1,8:1 | 2,5:1 | 2,5:1 | **4,6:1** | Tinte, 4,6:1 |
| A: Arne | `#B07A52` | 3,5:1 | 2,2:1 | 3,1:1 | 2,0:1 | **3,7:1** | Tinte, 3,7:1 |
| A: Mats | `#A56B45` | 4,1:1 | 2,7:1 | 3,7:1 | 1,7:1 | **3,1:1** | Leinen, 4,1:1 |
| B: alle | `#C4967C` | 2,5:1 | 1,6:1 | 2,2:1 | 2,8:1 | **5,2:1** | Tinte, 5,2:1 |
| C: alle | `#A9BFCB` | 1,8:1 | 1,2:1 | 1,6:1 | 3,8:1 | **7,1:1** | Tinte, 7,1:1 |

## Figurenblätter

Von links nach rechts: stehen, hält einen Teller mit Apfel, trägt ein Tablett (Erwachsene mit Ofenhandschuhen und heißen Äpfeln, Kinder mit kalten Keksen), jubelt. Menschen von vorn.

### Nolli

| Variante | Fassung | Karte | 96 × 48 | 64 × 32 |
| --- | --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-nolli.svg" width="312" alt="Nolli"> | <img src="vorschau/A-ohne-nolli.svg" width="96" alt="Nolli"> | <img src="vorschau/A-ohne-nolli.svg" width="64" alt="Nolli"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-nolli.svg" width="312" alt="Nolli"> | <img src="vorschau/A-augen-nolli.svg" width="96" alt="Nolli"> | <img src="vorschau/A-augen-nolli.svg" width="64" alt="Nolli"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-nolli.svg" width="312" alt="Nolli"> | <img src="vorschau/B-ohne-nolli.svg" width="96" alt="Nolli"> | <img src="vorschau/B-ohne-nolli.svg" width="64" alt="Nolli"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-nolli.svg" width="312" alt="Nolli"> | <img src="vorschau/B-augen-nolli.svg" width="96" alt="Nolli"> | <img src="vorschau/B-augen-nolli.svg" width="64" alt="Nolli"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-nolli.svg" width="312" alt="Nolli"> | <img src="vorschau/C-ohne-nolli.svg" width="96" alt="Nolli"> | <img src="vorschau/C-ohne-nolli.svg" width="64" alt="Nolli"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-nolli.svg" width="312" alt="Nolli"> | <img src="vorschau/C-augen-nolli.svg" width="96" alt="Nolli"> | <img src="vorschau/C-augen-nolli.svg" width="64" alt="Nolli"> |

### Jette

| Variante | Fassung | Karte | 96 × 48 | 64 × 32 |
| --- | --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-jette.svg" width="312" alt="Jette"> | <img src="vorschau/A-ohne-jette.svg" width="96" alt="Jette"> | <img src="vorschau/A-ohne-jette.svg" width="64" alt="Jette"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-jette.svg" width="312" alt="Jette"> | <img src="vorschau/A-augen-jette.svg" width="96" alt="Jette"> | <img src="vorschau/A-augen-jette.svg" width="64" alt="Jette"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-jette.svg" width="312" alt="Jette"> | <img src="vorschau/B-ohne-jette.svg" width="96" alt="Jette"> | <img src="vorschau/B-ohne-jette.svg" width="64" alt="Jette"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-jette.svg" width="312" alt="Jette"> | <img src="vorschau/B-augen-jette.svg" width="96" alt="Jette"> | <img src="vorschau/B-augen-jette.svg" width="64" alt="Jette"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-jette.svg" width="312" alt="Jette"> | <img src="vorschau/C-ohne-jette.svg" width="96" alt="Jette"> | <img src="vorschau/C-ohne-jette.svg" width="64" alt="Jette"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-jette.svg" width="312" alt="Jette"> | <img src="vorschau/C-augen-jette.svg" width="96" alt="Jette"> | <img src="vorschau/C-augen-jette.svg" width="64" alt="Jette"> |

### Mats

| Variante | Fassung | Karte | 96 × 48 | 64 × 32 |
| --- | --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-mats.svg" width="312" alt="Mats"> | <img src="vorschau/A-ohne-mats.svg" width="96" alt="Mats"> | <img src="vorschau/A-ohne-mats.svg" width="64" alt="Mats"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-mats.svg" width="312" alt="Mats"> | <img src="vorschau/A-augen-mats.svg" width="96" alt="Mats"> | <img src="vorschau/A-augen-mats.svg" width="64" alt="Mats"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-mats.svg" width="312" alt="Mats"> | <img src="vorschau/B-ohne-mats.svg" width="96" alt="Mats"> | <img src="vorschau/B-ohne-mats.svg" width="64" alt="Mats"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-mats.svg" width="312" alt="Mats"> | <img src="vorschau/B-augen-mats.svg" width="96" alt="Mats"> | <img src="vorschau/B-augen-mats.svg" width="64" alt="Mats"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-mats.svg" width="312" alt="Mats"> | <img src="vorschau/C-ohne-mats.svg" width="96" alt="Mats"> | <img src="vorschau/C-ohne-mats.svg" width="64" alt="Mats"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-mats.svg" width="312" alt="Mats"> | <img src="vorschau/C-augen-mats.svg" width="96" alt="Mats"> | <img src="vorschau/C-augen-mats.svg" width="64" alt="Mats"> |

### Ilka

| Variante | Fassung | Karte | 96 × 48 | 64 × 32 |
| --- | --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-ilka.svg" width="312" alt="Ilka"> | <img src="vorschau/A-ohne-ilka.svg" width="96" alt="Ilka"> | <img src="vorschau/A-ohne-ilka.svg" width="64" alt="Ilka"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-ilka.svg" width="312" alt="Ilka"> | <img src="vorschau/A-augen-ilka.svg" width="96" alt="Ilka"> | <img src="vorschau/A-augen-ilka.svg" width="64" alt="Ilka"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-ilka.svg" width="312" alt="Ilka"> | <img src="vorschau/B-ohne-ilka.svg" width="96" alt="Ilka"> | <img src="vorschau/B-ohne-ilka.svg" width="64" alt="Ilka"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-ilka.svg" width="312" alt="Ilka"> | <img src="vorschau/B-augen-ilka.svg" width="96" alt="Ilka"> | <img src="vorschau/B-augen-ilka.svg" width="64" alt="Ilka"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-ilka.svg" width="312" alt="Ilka"> | <img src="vorschau/C-ohne-ilka.svg" width="96" alt="Ilka"> | <img src="vorschau/C-ohne-ilka.svg" width="64" alt="Ilka"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-ilka.svg" width="312" alt="Ilka"> | <img src="vorschau/C-augen-ilka.svg" width="96" alt="Ilka"> | <img src="vorschau/C-augen-ilka.svg" width="64" alt="Ilka"> |

### Arne

| Variante | Fassung | Karte | 96 × 48 | 64 × 32 |
| --- | --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-arne.svg" width="312" alt="Arne"> | <img src="vorschau/A-ohne-arne.svg" width="96" alt="Arne"> | <img src="vorschau/A-ohne-arne.svg" width="64" alt="Arne"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-arne.svg" width="312" alt="Arne"> | <img src="vorschau/A-augen-arne.svg" width="96" alt="Arne"> | <img src="vorschau/A-augen-arne.svg" width="64" alt="Arne"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-arne.svg" width="312" alt="Arne"> | <img src="vorschau/B-ohne-arne.svg" width="96" alt="Arne"> | <img src="vorschau/B-ohne-arne.svg" width="64" alt="Arne"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-arne.svg" width="312" alt="Arne"> | <img src="vorschau/B-augen-arne.svg" width="96" alt="Arne"> | <img src="vorschau/B-augen-arne.svg" width="64" alt="Arne"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-arne.svg" width="312" alt="Arne"> | <img src="vorschau/C-ohne-arne.svg" width="96" alt="Arne"> | <img src="vorschau/C-ohne-arne.svg" width="64" alt="Arne"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-arne.svg" width="312" alt="Arne"> | <img src="vorschau/C-augen-arne.svg" width="96" alt="Arne"> | <img src="vorschau/C-augen-arne.svg" width="64" alt="Arne"> |

## Tiere: Posen

Posen: steht, sitzt, hüpft, sitzt auf der Schulter, zeigt, schaut zu. Je zwei Bilder: erst steht, sitzt, hüpft; dann sitzt auf der Schulter (bei Jette), zeigt, schaut zu. **Regel:** Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung (auch nicht bei Feuer). Sie ist im Szenenprüfer (`checkAgainstActivity`) und in FIGUREN.md festgeschrieben.

### Tüpfel

| Variante | Fassung | steht, sitzt, hüpft | Schulter, zeigt, schaut zu |
| --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-tuepfel-1.svg" width="280" alt="Tüpfel 1"> | <img src="vorschau/A-ohne-tuepfel-2.svg" width="280" alt="Tüpfel 2"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-tuepfel-1.svg" width="280" alt="Tüpfel 1"> | <img src="vorschau/A-augen-tuepfel-2.svg" width="280" alt="Tüpfel 2"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-tuepfel-1.svg" width="280" alt="Tüpfel 1"> | <img src="vorschau/B-ohne-tuepfel-2.svg" width="280" alt="Tüpfel 2"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-tuepfel-1.svg" width="280" alt="Tüpfel 1"> | <img src="vorschau/B-augen-tuepfel-2.svg" width="280" alt="Tüpfel 2"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-tuepfel-1.svg" width="280" alt="Tüpfel 1"> | <img src="vorschau/C-ohne-tuepfel-2.svg" width="280" alt="Tüpfel 2"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-tuepfel-1.svg" width="280" alt="Tüpfel 1"> | <img src="vorschau/C-augen-tuepfel-2.svg" width="280" alt="Tüpfel 2"> |

### Stups

| Variante | Fassung | steht, sitzt, hüpft | Schulter, zeigt, schaut zu |
| --- | --- | --- | --- |
| A | ohne Augenpunkte | <img src="vorschau/A-ohne-stups-1.svg" width="280" alt="Stups 1"> | <img src="vorschau/A-ohne-stups-2.svg" width="280" alt="Stups 2"> |
| A | mit Augenpunkten | <img src="vorschau/A-augen-stups-1.svg" width="280" alt="Stups 1"> | <img src="vorschau/A-augen-stups-2.svg" width="280" alt="Stups 2"> |
| B | ohne Augenpunkte | <img src="vorschau/B-ohne-stups-1.svg" width="280" alt="Stups 1"> | <img src="vorschau/B-ohne-stups-2.svg" width="280" alt="Stups 2"> |
| B | mit Augenpunkten | <img src="vorschau/B-augen-stups-1.svg" width="280" alt="Stups 1"> | <img src="vorschau/B-augen-stups-2.svg" width="280" alt="Stups 2"> |
| C | ohne Augenpunkte | <img src="vorschau/C-ohne-stups-1.svg" width="280" alt="Stups 1"> | <img src="vorschau/C-ohne-stups-2.svg" width="280" alt="Stups 2"> |
| C | mit Augenpunkten | <img src="vorschau/C-augen-stups-1.svg" width="280" alt="Stups 1"> | <img src="vorschau/C-augen-stups-2.svg" width="280" alt="Stups 2"> |

## Familie am Tisch

Mats, Jette, Nolli, Ilka und Arne stehen hinter dem gedeckten Tisch, Tüpfel sitzt davor. Zum Prüfen von Größenverhältnissen und Wiedererkennung. Auf dem Tisch nur ein Teller mit Apfel.

| Variante | ohne Augenpunkte | mit Augenpunkten |
| --- | --- | --- |
| **Variante A: bunte Besetzung** | <img src="vorschau/A-ohne-familie.svg" width="312" alt="Familie am Tisch"> | <img src="vorschau/A-augen-familie.svg" width="312" alt="Familie am Tisch"> |
| **Variante B: ein mittlerer Ton** | <img src="vorschau/B-ohne-familie.svg" width="312" alt="Familie am Tisch"> | <img src="vorschau/B-augen-familie.svg" width="312" alt="Familie am Tisch"> |
| **Variante C: keine Hautfarbe** | <img src="vorschau/C-ohne-familie.svg" width="312" alt="Familie am Tisch"> | <img src="vorschau/C-augen-familie.svg" width="312" alt="Familie am Tisch"> |

## Triptychen

Läuft herein, nimmt das Tablett, jubelt. Für die Kinder liegen **kalte** Kekse auf dem Tablett (kein Ofen, keine heißen Dinge im Bild). **Stups fasst nichts an:** Er hüpft herein, zeigt auf das Tablett und hüpft vor Freude.

### Jette

**Variante A, ohne Augenpunkte**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/A-ohne-jette-tri1.svg" width="300" alt="Jette"> | <img src="vorschau/A-ohne-jette-tri2.svg" width="300" alt="Jette"> | <img src="vorschau/A-ohne-jette-tri3.svg" width="300" alt="Jette"> |

**Variante A, mit Augenpunkten**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/A-augen-jette-tri1.svg" width="300" alt="Jette"> | <img src="vorschau/A-augen-jette-tri2.svg" width="300" alt="Jette"> | <img src="vorschau/A-augen-jette-tri3.svg" width="300" alt="Jette"> |

**Variante B, ohne Augenpunkte**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/B-ohne-jette-tri1.svg" width="300" alt="Jette"> | <img src="vorschau/B-ohne-jette-tri2.svg" width="300" alt="Jette"> | <img src="vorschau/B-ohne-jette-tri3.svg" width="300" alt="Jette"> |

**Variante B, mit Augenpunkten**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/B-augen-jette-tri1.svg" width="300" alt="Jette"> | <img src="vorschau/B-augen-jette-tri2.svg" width="300" alt="Jette"> | <img src="vorschau/B-augen-jette-tri3.svg" width="300" alt="Jette"> |

**Variante C, ohne Augenpunkte**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/C-ohne-jette-tri1.svg" width="300" alt="Jette"> | <img src="vorschau/C-ohne-jette-tri2.svg" width="300" alt="Jette"> | <img src="vorschau/C-ohne-jette-tri3.svg" width="300" alt="Jette"> |

**Variante C, mit Augenpunkten**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/C-augen-jette-tri1.svg" width="300" alt="Jette"> | <img src="vorschau/C-augen-jette-tri2.svg" width="300" alt="Jette"> | <img src="vorschau/C-augen-jette-tri3.svg" width="300" alt="Jette"> |

### Mats

**Variante A, ohne Augenpunkte**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/A-ohne-mats-tri1.svg" width="300" alt="Mats"> | <img src="vorschau/A-ohne-mats-tri2.svg" width="300" alt="Mats"> | <img src="vorschau/A-ohne-mats-tri3.svg" width="300" alt="Mats"> |

**Variante A, mit Augenpunkten**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/A-augen-mats-tri1.svg" width="300" alt="Mats"> | <img src="vorschau/A-augen-mats-tri2.svg" width="300" alt="Mats"> | <img src="vorschau/A-augen-mats-tri3.svg" width="300" alt="Mats"> |

**Variante B, ohne Augenpunkte**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/B-ohne-mats-tri1.svg" width="300" alt="Mats"> | <img src="vorschau/B-ohne-mats-tri2.svg" width="300" alt="Mats"> | <img src="vorschau/B-ohne-mats-tri3.svg" width="300" alt="Mats"> |

**Variante B, mit Augenpunkten**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/B-augen-mats-tri1.svg" width="300" alt="Mats"> | <img src="vorschau/B-augen-mats-tri2.svg" width="300" alt="Mats"> | <img src="vorschau/B-augen-mats-tri3.svg" width="300" alt="Mats"> |

**Variante C, ohne Augenpunkte**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/C-ohne-mats-tri1.svg" width="300" alt="Mats"> | <img src="vorschau/C-ohne-mats-tri2.svg" width="300" alt="Mats"> | <img src="vorschau/C-ohne-mats-tri3.svg" width="300" alt="Mats"> |

**Variante C, mit Augenpunkten**

| 1. läuft herein | 2. nimmt das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/C-augen-mats-tri1.svg" width="300" alt="Mats"> | <img src="vorschau/C-augen-mats-tri2.svg" width="300" alt="Mats"> | <img src="vorschau/C-augen-mats-tri3.svg" width="300" alt="Mats"> |

### Stups

**Variante A, ohne Augenpunkte**

| 1. hüpft herein | 2. zeigt auf das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/A-ohne-stups-tri1.svg" width="300" alt="Stups"> | <img src="vorschau/A-ohne-stups-tri2.svg" width="300" alt="Stups"> | <img src="vorschau/A-ohne-stups-tri3.svg" width="300" alt="Stups"> |

**Variante A, mit Augenpunkten**

| 1. hüpft herein | 2. zeigt auf das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/A-augen-stups-tri1.svg" width="300" alt="Stups"> | <img src="vorschau/A-augen-stups-tri2.svg" width="300" alt="Stups"> | <img src="vorschau/A-augen-stups-tri3.svg" width="300" alt="Stups"> |

**Variante B, ohne Augenpunkte**

| 1. hüpft herein | 2. zeigt auf das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/B-ohne-stups-tri1.svg" width="300" alt="Stups"> | <img src="vorschau/B-ohne-stups-tri2.svg" width="300" alt="Stups"> | <img src="vorschau/B-ohne-stups-tri3.svg" width="300" alt="Stups"> |

**Variante B, mit Augenpunkten**

| 1. hüpft herein | 2. zeigt auf das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/B-augen-stups-tri1.svg" width="300" alt="Stups"> | <img src="vorschau/B-augen-stups-tri2.svg" width="300" alt="Stups"> | <img src="vorschau/B-augen-stups-tri3.svg" width="300" alt="Stups"> |

**Variante C, ohne Augenpunkte**

| 1. hüpft herein | 2. zeigt auf das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/C-ohne-stups-tri1.svg" width="300" alt="Stups"> | <img src="vorschau/C-ohne-stups-tri2.svg" width="300" alt="Stups"> | <img src="vorschau/C-ohne-stups-tri3.svg" width="300" alt="Stups"> |

**Variante C, mit Augenpunkten**

| 1. hüpft herein | 2. zeigt auf das Tablett | 3. jubelt |
| --- | --- | --- |
| <img src="vorschau/C-augen-stups-tri1.svg" width="300" alt="Stups"> | <img src="vorschau/C-augen-stups-tri2.svg" width="300" alt="Stups"> | <img src="vorschau/C-augen-stups-tri3.svg" width="300" alt="Stups"> |

## Lesbarkeit bei kleiner Größe

Die Besetzung (Variante A, ohne Augenpunkte) mit Figurenlinie 4 (heute), 5 und 6. Die Linie 4 einer 400-breiten Fläche ist bei 96 px Breite 0,96 px dick, bei 64 px 0,64 px (mal Pixeldichte 2 oder 3 des Handys: 1,9 und 1,3 px bzw. 2,9 und 1,9 px). Die feinen Linien (2,5) bleiben unverändert.

| Figurenlinie | Karte 312 | 96 × 48 | 64 × 32 | Linie bei 96 / 64 px |
| --- | --- | --- | --- | --- |
| 4 | <img src="vorschau/lesbar-4.svg" width="312" alt="Linie 4"> | <img src="vorschau/lesbar-4.svg" width="96" alt="Linie 4"> | <img src="vorschau/lesbar-4.svg" width="64" alt="Linie 4"> | 0,96 px / 0,64 px |
| 5 | <img src="vorschau/lesbar-5.svg" width="312" alt="Linie 5"> | <img src="vorschau/lesbar-5.svg" width="96" alt="Linie 5"> | <img src="vorschau/lesbar-5.svg" width="64" alt="Linie 5"> | 1,20 px / 0,80 px |
| 6 | <img src="vorschau/lesbar-6.svg" width="312" alt="Linie 6"> | <img src="vorschau/lesbar-6.svg" width="96" alt="Linie 6"> | <img src="vorschau/lesbar-6.svg" width="64" alt="Linie 6"> | 1,44 px / 0,96 px |

## Dateigrößen (gemessen)

Szenen (Besetzung mit sieben Figuren, Triptychon, Lesbarkeit) bleiben unter 10 KB, der Grenze für Titelbilder: das größte ist 10,0 KB (die Besetzung mit Augenpunkten, knapp darunter). **Familie am Tisch** (fünf Menschen, ein Tier, ein Tisch) kommt auf 9,2 KB und bleibt ebenfalls darunter, aber nur knapp: mehr Figuren oder Gegenstände passen in ein Titelbild nicht. Ein **Figurenblatt** zeigt mehrere Posen und ist kein Titelbild (das größte 8,3 KB).

| Datei | Größe | Art |
| --- | --- | --- |
| `vorschau/A-ohne-besetzung.svg` | 9,1 KB | Szene |
| `vorschau/A-augen-besetzung.svg` | 10,0 KB | Szene |
| `vorschau/B-ohne-besetzung.svg` | 9,1 KB | Szene |
| `vorschau/B-augen-besetzung.svg` | 10,0 KB | Szene |
| `vorschau/C-ohne-besetzung.svg` | 9,1 KB | Szene |
| `vorschau/C-augen-besetzung.svg` | 10,0 KB | Szene |
| `vorschau/A-ohne-nolli.svg` | 6,1 KB | Blatt |
| `vorschau/A-augen-nolli.svg` | 6,7 KB | Blatt |
| `vorschau/B-ohne-nolli.svg` | 6,1 KB | Blatt |
| `vorschau/B-augen-nolli.svg` | 6,7 KB | Blatt |
| `vorschau/C-ohne-nolli.svg` | 6,1 KB | Blatt |
| `vorschau/C-augen-nolli.svg` | 6,7 KB | Blatt |
| `vorschau/A-ohne-jette.svg` | 5,7 KB | Blatt |
| `vorschau/A-augen-jette.svg` | 6,2 KB | Blatt |
| `vorschau/B-ohne-jette.svg` | 5,7 KB | Blatt |
| `vorschau/B-augen-jette.svg` | 6,2 KB | Blatt |
| `vorschau/C-ohne-jette.svg` | 5,7 KB | Blatt |
| `vorschau/C-augen-jette.svg` | 6,2 KB | Blatt |
| `vorschau/A-ohne-mats.svg` | 6,5 KB | Blatt |
| `vorschau/A-augen-mats.svg` | 7,0 KB | Blatt |
| `vorschau/B-ohne-mats.svg` | 6,5 KB | Blatt |
| `vorschau/B-augen-mats.svg` | 7,0 KB | Blatt |
| `vorschau/C-ohne-mats.svg` | 6,5 KB | Blatt |
| `vorschau/C-augen-mats.svg` | 7,0 KB | Blatt |
| `vorschau/A-ohne-ilka.svg` | 7,8 KB | Blatt |
| `vorschau/A-augen-ilka.svg` | 8,3 KB | Blatt |
| `vorschau/B-ohne-ilka.svg` | 7,8 KB | Blatt |
| `vorschau/B-augen-ilka.svg` | 8,3 KB | Blatt |
| `vorschau/C-ohne-ilka.svg` | 7,8 KB | Blatt |
| `vorschau/C-augen-ilka.svg` | 8,3 KB | Blatt |
| `vorschau/A-ohne-arne.svg` | 6,0 KB | Blatt |
| `vorschau/A-augen-arne.svg` | 6,5 KB | Blatt |
| `vorschau/B-ohne-arne.svg` | 6,0 KB | Blatt |
| `vorschau/B-augen-arne.svg` | 6,5 KB | Blatt |
| `vorschau/C-ohne-arne.svg` | 6,0 KB | Blatt |
| `vorschau/C-augen-arne.svg` | 6,5 KB | Blatt |
| `vorschau/A-ohne-tuepfel-1.svg` | 3,2 KB | Blatt |
| `vorschau/A-ohne-tuepfel-2.svg` | 4,4 KB | Blatt |
| `vorschau/A-augen-tuepfel-1.svg` | 3,6 KB | Blatt |
| `vorschau/A-augen-tuepfel-2.svg` | 4,9 KB | Blatt |
| `vorschau/B-ohne-tuepfel-1.svg` | 3,2 KB | Blatt |
| `vorschau/B-ohne-tuepfel-2.svg` | 4,4 KB | Blatt |
| `vorschau/B-augen-tuepfel-1.svg` | 3,6 KB | Blatt |
| `vorschau/B-augen-tuepfel-2.svg` | 4,9 KB | Blatt |
| `vorschau/C-ohne-tuepfel-1.svg` | 3,2 KB | Blatt |
| `vorschau/C-ohne-tuepfel-2.svg` | 4,4 KB | Blatt |
| `vorschau/C-augen-tuepfel-1.svg` | 3,6 KB | Blatt |
| `vorschau/C-augen-tuepfel-2.svg` | 4,9 KB | Blatt |
| `vorschau/A-ohne-stups-1.svg` | 3,1 KB | Blatt |
| `vorschau/A-ohne-stups-2.svg` | 4,5 KB | Blatt |
| `vorschau/A-augen-stups-1.svg` | 3,5 KB | Blatt |
| `vorschau/A-augen-stups-2.svg` | 5,0 KB | Blatt |
| `vorschau/B-ohne-stups-1.svg` | 3,1 KB | Blatt |
| `vorschau/B-ohne-stups-2.svg` | 4,5 KB | Blatt |
| `vorschau/B-augen-stups-1.svg` | 3,5 KB | Blatt |
| `vorschau/B-augen-stups-2.svg` | 5,0 KB | Blatt |
| `vorschau/C-ohne-stups-1.svg` | 3,1 KB | Blatt |
| `vorschau/C-ohne-stups-2.svg` | 4,5 KB | Blatt |
| `vorschau/C-augen-stups-1.svg` | 3,5 KB | Blatt |
| `vorschau/C-augen-stups-2.svg` | 5,0 KB | Blatt |
| `vorschau/A-ohne-familie.svg` | 8,5 KB | Familie |
| `vorschau/A-augen-familie.svg` | 9,2 KB | Familie |
| `vorschau/B-ohne-familie.svg` | 8,5 KB | Familie |
| `vorschau/B-augen-familie.svg` | 9,2 KB | Familie |
| `vorschau/C-ohne-familie.svg` | 8,5 KB | Familie |
| `vorschau/C-augen-familie.svg` | 9,2 KB | Familie |
| `vorschau/A-ohne-jette-tri1.svg` | 2,0 KB | Szene |
| `vorschau/A-ohne-jette-tri2.svg` | 2,0 KB | Szene |
| `vorschau/A-ohne-jette-tri3.svg` | 1,9 KB | Szene |
| `vorschau/A-augen-jette-tri1.svg` | 2,1 KB | Szene |
| `vorschau/A-augen-jette-tri2.svg` | 2,1 KB | Szene |
| `vorschau/A-augen-jette-tri3.svg` | 2,1 KB | Szene |
| `vorschau/B-ohne-jette-tri1.svg` | 2,0 KB | Szene |
| `vorschau/B-ohne-jette-tri2.svg` | 2,0 KB | Szene |
| `vorschau/B-ohne-jette-tri3.svg` | 1,9 KB | Szene |
| `vorschau/B-augen-jette-tri1.svg` | 2,1 KB | Szene |
| `vorschau/B-augen-jette-tri2.svg` | 2,1 KB | Szene |
| `vorschau/B-augen-jette-tri3.svg` | 2,1 KB | Szene |
| `vorschau/C-ohne-jette-tri1.svg` | 2,0 KB | Szene |
| `vorschau/C-ohne-jette-tri2.svg` | 2,0 KB | Szene |
| `vorschau/C-ohne-jette-tri3.svg` | 1,9 KB | Szene |
| `vorschau/C-augen-jette-tri1.svg` | 2,1 KB | Szene |
| `vorschau/C-augen-jette-tri2.svg` | 2,1 KB | Szene |
| `vorschau/C-augen-jette-tri3.svg` | 2,1 KB | Szene |
| `vorschau/A-ohne-mats-tri1.svg` | 2,1 KB | Szene |
| `vorschau/A-ohne-mats-tri2.svg` | 2,2 KB | Szene |
| `vorschau/A-ohne-mats-tri3.svg` | 2,2 KB | Szene |
| `vorschau/A-augen-mats-tri1.svg` | 2,3 KB | Szene |
| `vorschau/A-augen-mats-tri2.svg` | 2,3 KB | Szene |
| `vorschau/A-augen-mats-tri3.svg` | 2,3 KB | Szene |
| `vorschau/B-ohne-mats-tri1.svg` | 2,1 KB | Szene |
| `vorschau/B-ohne-mats-tri2.svg` | 2,2 KB | Szene |
| `vorschau/B-ohne-mats-tri3.svg` | 2,2 KB | Szene |
| `vorschau/B-augen-mats-tri1.svg` | 2,3 KB | Szene |
| `vorschau/B-augen-mats-tri2.svg` | 2,3 KB | Szene |
| `vorschau/B-augen-mats-tri3.svg` | 2,3 KB | Szene |
| `vorschau/C-ohne-mats-tri1.svg` | 2,1 KB | Szene |
| `vorschau/C-ohne-mats-tri2.svg` | 2,2 KB | Szene |
| `vorschau/C-ohne-mats-tri3.svg` | 2,2 KB | Szene |
| `vorschau/C-augen-mats-tri1.svg` | 2,3 KB | Szene |
| `vorschau/C-augen-mats-tri2.svg` | 2,3 KB | Szene |
| `vorschau/C-augen-mats-tri3.svg` | 2,3 KB | Szene |
| `vorschau/A-ohne-stups-tri1.svg` | 1,6 KB | Szene |
| `vorschau/A-ohne-stups-tri2.svg` | 1,8 KB | Szene |
| `vorschau/A-ohne-stups-tri3.svg` | 1,6 KB | Szene |
| `vorschau/A-augen-stups-tri1.svg` | 1,7 KB | Szene |
| `vorschau/A-augen-stups-tri2.svg` | 1,9 KB | Szene |
| `vorschau/A-augen-stups-tri3.svg` | 1,7 KB | Szene |
| `vorschau/B-ohne-stups-tri1.svg` | 1,6 KB | Szene |
| `vorschau/B-ohne-stups-tri2.svg` | 1,8 KB | Szene |
| `vorschau/B-ohne-stups-tri3.svg` | 1,6 KB | Szene |
| `vorschau/B-augen-stups-tri1.svg` | 1,7 KB | Szene |
| `vorschau/B-augen-stups-tri2.svg` | 1,9 KB | Szene |
| `vorschau/B-augen-stups-tri3.svg` | 1,7 KB | Szene |
| `vorschau/C-ohne-stups-tri1.svg` | 1,6 KB | Szene |
| `vorschau/C-ohne-stups-tri2.svg` | 1,8 KB | Szene |
| `vorschau/C-ohne-stups-tri3.svg` | 1,6 KB | Szene |
| `vorschau/C-augen-stups-tri1.svg` | 1,7 KB | Szene |
| `vorschau/C-augen-stups-tri2.svg` | 1,9 KB | Szene |
| `vorschau/C-augen-stups-tri3.svg` | 1,7 KB | Szene |
| `vorschau/lesbar-4.svg` | 9,1 KB | Szene |
| `vorschau/lesbar-5.svg` | 9,1 KB | Szene |
| `vorschau/lesbar-6.svg` | 9,1 KB | Szene |

