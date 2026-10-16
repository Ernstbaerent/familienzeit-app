# Figuren (M9b): Identifikationsfiguren, Entwurf

**Stand: Satz C „schlank und verspielt“ ist gewählt (Clemens, 16. Oktober 2026).** Das Rig ist gebaut, die Besetzung steht ([VORSCHAU.md](figuren/VORSCHAU.md)). **Noch offen** und von Clemens zu wählen: der **Hautton** (A, B oder C), die **Augenpunkte** (ja oder nein) und die **Namen von Papa und Junge**. Danach wird dieses Dokument festgeschrieben und ändert sich nicht mehr.
Bis dahin ist nichts davon in der App, im Baukasten (`docs/bausteine/`) oder in einem Bild verwendet.

## Wozu Figuren?

- **In der App:** wiederkehrende Figuren in den Titel- und Schrittbildern (M9b), die man wiedererkennt. Sie ersetzen die namenlosen Strichfiguren des Baukastens (Stufe 1).
- **Später auch für Kurzvideos** (YouTube Shorts, Instagram Reels, TikTok): Die Figuren sind so gebaut, dass dieselben Daten ohne neue Zeichnung animiert werden können (siehe „Animation und Video“). **Nichts davon wird jetzt gebaut.** Marketing steht in der CLAUDE.md unter „Nach M12“.
- **Prüfung für ein Maskottchen:** Name und Figur müssen auf einem T-Shirt und in einem 5-Sekunden-Clip funktionieren. Deshalb sind die Namen kurz, in Deutsch und Englisch leicht auszusprechen und nicht wie „Miki“.

## Die Besetzung (Satz C)

Anmutung: lange dünne Linien-Glieder, kleine Köpfe, Kleid und Schal, Haarbüschel, leicht schiefer Kopf. Sieben Figuren, alle gesichtslos (Augenpunkte sind eine freiwillige Fassung):

| Name | Rolle | Alter | Standhöhe | Aussehen |
| --- | --- | --- | --- | --- |
| **Nolli** | kleinstes Kind | ≈ 3 Jahre | 67 | Dutt, Petrol-Kleidchen, Rosé-Schuhe |
| **Jette** | größeres Kind | ≈ 7 Jahre | 88 | Haarbüschel, Rosé-Kleid |
| **Mats** (Vorschlag) | älterer Junge | ≈ 11 Jahre | 105 | Mütze (Petrol mit Leinen-Rand), Rosé-Shirt, schlanker Rumpf, Hand in der Hüfte |
| **Ilka** | Mutter | Erwachsene | 120 | groß und schlank, langer Petrol-Mantel, Rosé-Schal, Bob, Hand in der Hüfte |
| **Arne** (Vorschlag) | Papa | Erwachsene | 123 | noch etwas größer, Leinen-Pullover, Petrol-Hose, kurze Haare |
| **Tüpfel** | Katze | – | 40 | schlank, langer Schwanz, spitze Ohren, Leinen mit Rosé-Nase |
| **Stups** | Vogel | – | 40 | klein, dünne Beine, langer Schwanz, Haarschopf, Honig-Körper, Rosé-Schnabel |

(Standhöhe in Einheiten der 400 × 200-Fläche; Erwachsene bleiben unter 125, damit der Kopf unter den oberen Ecken der Karte bleibt. Ein Test prüft das.)

Die Figuren sind **geschlechtsneutral** gezeichnet. Die Namen sind es nicht alle (Kinder- und Vornamen): Sie nennen kein Geschlecht in der App, im Text über die Figuren steht „Kind“, „Erwachsene“.

### Alter und welche Figur zu welcher Aktivität passt

Regel (in Code: `scripts/lib/figures/castRules.ts`, `figureFitsActivity`; Tests): Eine Szene zeigt nur Kinder-Figuren, deren Altersbereich sich mit der Altersspanne der Aktivität (`ageMin` bis `ageMax`) überschneidet. Erwachsene und Tiere haben keine Altersgrenze.

| Figur | Alter | passt zu Aktivitäten, die Alter … umfassen |
| --- | --- | --- |
| Nolli | ≈ 3 | 0 bis 4 Jahre |
| Jette | ≈ 7 | 3 bis 9 Jahre |
| Mats | ≈ 11 | 8 bis 16 Jahre |
| Ilka, Arne | Erwachsene | jede |

Gilt die Aktivität für 0 bis 16 Jahre, nimmt die Szene die Figur, die am besten zum Kern der Aktivität passt, oder gar kein Kind. Ergänzend gelten die Regeln des Baukastens (Kleinkind nur bei Aktivitäten ab 2 Jahren, Schere und Hitze nur beim Erwachsenen, `docs/bausteine/README.md`).

### Namensprüfung

Geprüft am 15. und 16. Oktober 2026 mit einer Websuche gegen bekannte Kinderfiguren (Bücher, Serien, Maskottchen, Deutsch und Englisch). **Das ist keine Markenprüfung** (DPMA, EUIPO, App Stores): Die steht unter „Nach M12“ in der CLAUDE.md. Ein Name ohne Treffer ist nicht automatisch frei.

- **Ohne bekannte Kinderfigur gefunden:** Nolli, Jette, Ilka, Tüpfel, Stups. Hinweise: Zu „Jette“ gibt es eine Buchreihe von Fee Krämer, zu „Tüpfel“ nur „Tüpfelblatt“ aus Warrior Cats (anderer Name).
- **Vorschläge für Papa und Junge** (kurz, nordisch-verspielt, in Deutsch und Englisch aussprechbar, nicht wie „Miki“):
  - Papa: **Arne** (keine Kinderfigur, nur der Krimiautor Arne Dahl) oder **Malte** (keine Kinderfigur, aber ein sehr häufiger Vorname).
  - Junge: **Mats** (nur das Bilderbuch „Mats und Mathilde“) oder **Tore** (keine Kinderfigur, nordisch, kurz).
  - **Schwächer:** Rune (Jugendroman „Rune“ und die Comicreihe „Rune“, 2024 ff.), Ivo (Bilderbuch „The Boy Who Lived in a Shell“ und ein spanischer Roman mit Figur „Ivo“).
  - Entwurfsstand: **Arne** und **Mats**. Der Name steht als `name` in `scripts/lib/figures/cast.ts`, ein Tausch ändert nur diese Zeile, die Namensprüfung (`names.ts`) und diesen Text.
- **Durchgefallen** und ersetzt (aus den ersten Entwürfen): Pepo (spanische Kinderbuchfiguren), Teo (spanische Vorschulserie), Zora („Die rote Zora“), Wusel („Wusel & Pip“), Ruben (Figur aus „PAW Patrol“), Lumo (ESC-Maskottchen 2025 und eine Kinderserie), Luka (mehrere Kinderfiguren), Rike (Puppenfigur der Sesamstraße).
- **Als Tier verworfen:** ein Igel, weil **Mecki** (Hörzu-Maskottchen) zu nah liegt. Deshalb ist der Vogel Stups ein Vogel und kein Igel.
- **Nicht gewählt:** Satz A (Joni, Fenn, Sanne, Stups als Küken) und Satz B (Bent, Fidi, Hanne, Mutz). Ihre Entwürfe stehen in der Git-Historie (PR #28, Stand davor: Commit `547a921`).

## Hautton: drei Varianten

Die Köpfe und Hände der Figuren haben bisher keine Hautfarbe (Leinen). Für die Wahl liegen drei Varianten vor, in der Vorschau für die ganze Besetzung ([VORSCHAU.md](figuren/VORSCHAU.md), „Hautton“). Jede Figur hat einen **Farbplatz** `skin1` bis `skin5` (Augenpunkte `eye1` bis `eye5`); eine Variante legt fest, welche Farbe auf welchem Platz liegt. Nach der Wahl kommen die Töne als Rollen in die Zeichnungs-Palette (`src/lib/palette.ts`) und in die Vorlagen der Zeichnungen.

| Variante | Idee | Töne |
| --- | --- | --- |
| **A: bunte Besetzung** | fünf feste warme Töne von hell bis dunkel, jede Figur hat ihren eigenen (Nolli hell … Mats am dunkelsten) | `#F1CDB3`, `#DDAA85`, `#C48A62`, `#B07A52`, `#A56B45` |
| **B: ein mittlerer Ton** | alle gleich, warm, gedämpft, Farbton 23°, ohne Gelb- und ohne Rotstich | `#C4967C` |
| **C: keine Hautfarbe** | alle in einem weichen Blaugrau, eindeutig stilisiert | `#A9BFCB` |

**Kein Gelb:** Kein Ton liegt im Farbbereich 45° bis 75° (Test). A und B sind warm (10° bis 35°), C blaugrau (190° bis 230°).

**Kontrast** (WCAG, Werte der Tabelle in VORSCHAU.md, „Kontrast der Töne“):

- **Haut gegen die Hintergründe** ist bei allen Tönen niedrig: gegen Leinen 1,4:1 (hellster Ton von A) bis 4,1:1 (dunkelster Ton von A), gegen Rosé 1,1:1 bis 2,7:1, gegen den Grund der Bilder 1,2:1 bis 3,7:1, gegen Petrol 1,7:1 bis 4,9:1. **Die Haut allein trägt die Figur nicht**, das tut der Tinten-Umriss (Tinte gegen den Grund 11,4:1). Das ist so gewollt und bei allen drei Varianten gleich.
- **Tinten-Umriss auf der Haut** (wie gut man die Linie auf Gesicht und Händen sieht): A 9,1:1 / 6,6:1 / 4,6:1 / 3,7:1 / **3,1:1** (der dunkelste Ton), B 5,2:1, C 7,1:1. **Ehrliche Grenze:** Noch dunklere Töne als `#A56B45` würden 3:1 gegen die Tinte unterschreiten (Tinte ist fast schwarz); der dunkelste Ton von A ist deshalb ein mittleres Braun und kein tiefes. Wer ein dunkleres Braun will, müsste den Umriss auf der Haut heller machen (zum Beispiel Leinen) oder für Köpfe einen dünneren Umriss wählen: eine eigene Entscheidung, nicht jetzt.
- **Augenpunkte:** Tinte auf den helleren Tönen (4,6:1 bis 9,1:1), **Leinen auf dem dunkelsten Ton von A** (4,1:1; Tinte hätte dort nur 3,1:1). Die Regel steht im Code (`eyeColorOn`): Tinte oder Leinen, je nachdem, was auf dem Ton besser lesbar ist.

## Gesichter: zwei Fassungen aus demselben Rig

Jede Figur liegt in **zwei Fassungen** vor, die sich aus demselben Rig ergeben, damit sich nichts neu zeichnen lässt:

1. **ohne Gesichtszüge** (wie bisher): Kopf als Kreis.
2. **mit zwei Punkten als Augen** (sonst nichts: kein Mund, keine Nase, keine Brauen).

Ein Test stellt sicher, dass „mit Augen“ genau „ohne“ plus zwei Punkte ist (`scripts/lib/figures/figures.test.ts`), für Menschen und Tiere. **Offene Entscheidung (Clemens):** App-Bilder ohne Gesichtszüge und nur die Videos mit Augen, oder beides.

## Tiere: Katze Tüpfel und Vogel Stups

Beide von der Seite, Blick nach rechts, im Stil von Satz C (lange dünne Linien, kleiner Kopf, schiefe Haltung). Sechs benannte Posen als Daten: `stand` (steht), `sit` (sitzt), `hop` (hüpft), `shoulder` (sitzt auf der Schulter: die Vorschau zeigt es bei Jette, der Rig liefert dafür den Ankerpunkt `shoulderR`), `point` (zeigt: Katze mit gehobener Pfote, Vogel mit ausgestrecktem Flügel), `watch` (schaut zu: sitzt, Kopf nach oben gedreht).

**Regel: Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung.** Sie gilt auch bei Feuer. Umgesetzt im Szenenprüfer (`checkAgainstActivity` in `scripts/lib/kit/scene.ts`, Baustein-Merkmal `animal`): Ein Tier im Bild zusammen mit einem Baustein mit dem Merkmal scharf, heiß oder Feuer ist ein Fehler, ebenso eine Aktivität, deren Material eines dieser Merkmale hat (zum Beispiel Backofen, Herd, Messer, Schere, Kerze). Die Prüfung ist bewusst streng (Material der Aktivität, nicht nur das Bild), weil ein Tier in einem Bild einer Küchen-Aktivität sonst am Herd stehen könnte. Tests: `figures.test.ts`, Abschnitt „Tier-Regel“.

Der Vogel **fasst nichts an**: In seinem Triptychon hüpft er herein, **zeigt** auf das Tablett und hüpft vor Freude.

## Aufbau (Rig)

Alle Figuren bestehen aus **getrennten Teilen mit Ankerpunkten**:

- **Mensch:** Kopf, Haar oder Mütze, Rumpf (Kleid oder schlank), je Arm Oberarm, Unterarm und Hand, je Bein Oberschenkel, Unterschenkel und Schuh, optional Schal. Ankerpunkte: Becken, Hals, Kopf, beide Schultern, beide Hände, beide Füße.
- **Haustier:** Körper, Kopf, Ohren (Katze) oder Schnabel und Schopf (Vogel), Beine, Schwanz, Flügel oder Pfote.
- **Maße** stehen als Zahlen (`HumanSpec`, `PetSpec`) in `scripts/lib/figures/cast.ts`, alle in Einheiten der 400 × 200-Fläche wie die Bausteine. Die Linien sind 4 und 2,5 (siehe „Lesbarkeit bei kleiner Größe“).
- **Benannte Posen als Daten** (`scripts/lib/figures/poses.ts`): `stand`, `hold` (hält einen Teller), `tray` (trägt ein Tablett mit beiden Händen), `cheer` (jubelt), `walk`, `take` (nimmt das Tablett vom Tisch). Tiere: siehe oben.
  Eine Pose ist entweder ein Satz **Winkel** (Arm: Winkel und Beugung) oder ein **Zielpunkt für die Hand**: Dann rechnet ein Arm mit zwei Gliedern (`solveArm`) den Ellbogen aus. So sitzen die Hände an den Rändern eines Tabletts, an einem Teller oder an einem Griff, und die Gegenstände stehen nicht nur daneben.
- **Haltepunkte (`grip`)** sind die Zielpunkte der Hände. Heute gibt es sie für das Tablett (beide Ränder) und den Teller (Unterseite); der Baukasten bekommt sie für Schüssel, Löffel, Kanne, Schere und andere in der Erweiterung von Stufe 1.
- Die **Rig-Daten** (Maße, Alter, Besonderheiten, alle Posen aufgelöst, Hautton-Varianten) stehen als JSON in [`figuren/rig-daten.json`](figuren/rig-daten.json). Ein Test prüft, dass aus JSON gelesene Daten dasselbe Bild ergeben.

### Dateigröße

Die Teile werden beim Zeichnen mit absoluten Koordinaten gerechnet (keine verschachtelten Gruppen), die Pose steckt nur in den Zahlen. Gemessen (alle Dateien und Werte in [VORSCHAU.md](figuren/VORSCHAU.md), „Dateigrößen“), ohne Gesichtszüge, mit Augenpunkten etwa 0,1 bis 0,2 KB mehr je Figur:

- Eine stehende Figur kostet **1,2 bis 1,7 KB** (Linien-Glieder), die Tiere 0,9 bis 1,0 KB.
- **Triptychon-Bilder** (eine Figur, Tisch, Tablett) **1,6 bis 2,8 KB**. **Besetzung** (fünf Menschen, zwei Tiere) **9,3 KB** (mit Augen 10,0 KB, knapp unter der Grenze von 10 KB für Titelbilder). **Familie am Tisch** (fünf Menschen, Katze, Tisch) **8,7 KB** (mit Augen 9,5 KB). Gepackt (gzip) etwa ein Viertel davon (Besetzung 9,3 KB, gepackt 2,3 KB).
- **Grenzen:** Titelbilder unter 10 KB, Schrittbilder bis 14 KB (Clemens, 15. Oktober 2026). Mehr als fünf Menschen und ein Tier in einem Titelbild gehen also nicht; die Szenenprüfung begrenzt ohnehin auf 6 Bausteine. Ein **Figurenblatt** (mehrere Posen einer Figur, kein Titelbild) ist 3,1 bis 8,5 KB.
- Das Mittel dazu: Die versetzte Farbfläche gibt es nur am Rumpf, nicht an Armen und Beinen (sonst etwa ein Drittel mehr Bytes). Ein Schalter (`limbShadow`) schaltet sie wieder ein.

## Lesbarkeit bei kleiner Größe

Geprüft mit der ganzen Besetzung (VORSCHAU.md, „Lesbarkeit bei kleiner Größe“) bei 96 × 48 und 64 × 32, in einfacher und doppelter Pixeldichte, mit Figurenlinie 4 (heute), 5 und 6. Die Linie 4 einer 400 breiten Fläche ist bei 96 px **0,96 px** dick, bei 64 px **0,64 px** (bei Pixeldichte 2: 1,9 und 1,3 px).

- **96 × 48, doppelte Dichte (heutige Handys):** alle sieben Figuren sind mit Linie 4 als Figuren zu erkennen, Größenstaffel und Kleiderfarben sind sichtbar. Die Glieder sind aber dünn.
- **96 × 48, einfache Dichte:** Mit Linie 4 sind die Linien-Glieder grau und gezackt (kleiner als ein Pixel). Mit **Linie 5** sind sie durchgehend zu sehen. Mit **Linie 6** werden Köpfe und Hände dunkel und verlieren Hautton und Augenpunkte.
- **64 × 32:** Mit jeder Linie bleiben nur Silhouetten übrig (Größe, Kleid oder Hose, Mütze); Hautton, Haarbüschel und Haltung gehen verloren. Diese Größe nutzt die App heute nirgends. Figuren sind dort nur als Gruppe lesbar, nicht einzeln.
- **Empfehlung:** Für Figuren die Linie **5** statt 4 (feine Linien bleiben 2,5), das ist die kleinste Änderung, die die dünnen Glieder auf kleinen Bildern trägt, ohne die Köpfe zuzuschmieren. Das ändert die Zeichenregel „Linien 4 und 2,5“ der Zeichnungen (`ILLUSTRATIONEN.md`) nur für Figuren; **das entscheidet Clemens**, bis dahin bleibt es bei 4. Der Rig kennt den Schalter (`line`).

## Animation und Video (später, nichts davon ist gebaut)

Die Posen sind **Daten** (Winkel, Zielpunkte), die Figur ist **Teile mit Ankerpunkten**, und das Zeichnen sind **reine Funktionen**. Damit gilt:

- **Zwischenbilder** entstehen durch Mischen zweier Posen (Winkel und Zielpunkte lassen sich Schritt für Schritt überblenden). Hüpfen, Kippen, Reinlaufen, Winken und Tabletttragen sind einfache Bewegungen dieser Zahlen.
- **Für die Videos braucht die App kein neues Paket**, denn sie entstehen außerhalb der App: derselbe TypeScript-Code rechnet die Pose, erzeugt ein SVG je Bild, ein Browser oder Renderer macht daraus ein Bild, `ffmpeg` baut das Video. Die Hilfsmittel in Frage kämen (aus dem Gedächtnis, **nicht geprüft**; Lizenzen und Preise vor einer Nutzung prüfen):

| Werkzeug | Idee | Läuft in der GitHub-Action? |
| --- | --- | --- |
| **Playwright oder Puppeteer** (Chromium ohne Oberfläche) + `ffmpeg` | Skript erzeugt je Bild ein SVG, der Browser macht Standbilder, `ffmpeg` fügt sie zusammen. Deterministisch, weil jedes Bild einzeln gerechnet wird. | **Ja**: Chromium lässt sich im Lauf installieren (rund 150 MB), `ffmpeg` per apt. Ein Job ohne Schlüssel. |
| **Remotion** (React zu Video, nutzt Chromium und `ffmpeg`) | Szenen als React-Komponenten, `npx remotion render` ergibt MP4. Bequem für Titel und Übergänge. | **Ja**, läuft auf Linux-CI. **Lizenz prüfen**: Ab einer bestimmten Firmengröße kostenpflichtig. |
| **Motion Canvas** (TypeScript, quelloffen) | Animationen als Code mit Editor im Browser, Ausgabe als Bildfolge oder Video. | **Ja**, mit Chromium ohne Oberfläche (Aufwand höher). |
| **Lottie** (Animationsdatei) | Die Rig-Daten werden in eine Lottie-Datei gewandelt, ein Player zeigt sie. Gut für kleine Wiederholschleifen. | Nur mit einem Zusatzschritt (Player im Browser aufnehmen). Ein Umwandler wäre eigener Code. |
| **Von Hand** (Videoprogramm am Handy oder Computer) | Standbilder aus dieser Vorschau, Schnitt von Hand. | Nein, kein Automat. Für einen **ersten Test-Clip von 20 bis 30 Sekunden** reicht das. |

Der erste Schritt (CLAUDE.md, „Nach M12“) bleibt: erst ein Test-Clip, dann entscheiden. Musik und Effekte entweder selbst erzeugt oder CC0, keine „nicht kommerziell“-Lizenzen.

## Farbregeln

- **Kleidung:** Petrol, Rosé, Leinen und Tinte (Palette C und Zeichnungs-Palette). Haare Tinte. Köpfe und Hände haben den **Hautton** der gewählten Variante (siehe oben), bis zur Wahl Leinen in der Palette. Auf Petrol sind feine Linien Leinen (**Petrol-Regel**, `docs/bausteine/README.md`).
- **Warme Töne** (Honig, Braun) gelten bisher nur für Gegenstände. In den Entwürfen kommen sie zusätzlich an **Ofenhandschuhen, Mützen und beim Vogel Stups** (Honig) vor. **Offene Entscheidung (Clemens):** Dürfen Honig und Braun für Tiere und Accessoires der Figuren gelten, oder bleiben sie ganz bei den Gegenständen?
- **Kein Gelb** an Haut (siehe „Hautton“).

## Offene Entscheidungen vor dem Festschreiben

1. **Hautton:** A (bunte Besetzung), B (ein mittlerer Ton) oder C (keine Hautfarbe, Blaugrau).
2. **Augenpunkte:** nur ohne, nur mit, oder App ohne und Videos mit.
3. **Namen von Papa und Junge:** Arne oder Malte, Mats oder Tore (Entwurfsstand Arne und Mats).
4. **Figurenlinie:** 4 wie bisher oder 5 für Figuren.
5. **Warme Töne** an Figuren und Tieren (siehe oben).

## Nach dem Festschreiben

Die gewählten Figuren ersetzen die Strichfiguren in den Bausteinen und bekommen Haltepunkte an den Gegenständen (Stufe 1 erweitert, Schritt 3 des Plans). Die Hauttöne kommen als Rollen in `src/lib/palette.ts` und in die Zeichnungs-Vorlagen. Ändern lässt sich danach nur noch, was dieses Dokument ausdrücklich erlaubt.
