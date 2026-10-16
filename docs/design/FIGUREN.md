# Figuren (M9b): Identifikationsfiguren

**Stand: festgeschrieben (Clemens, 16. Oktober 2026).** Satz C „schlank und verspielt“, Hautton-Variante A (bunte Besetzung), **keine Augenpunkte** (Emotionen über Haltung und Bewegung), Papa **Arne**, Junge **Mats**. Alle Bilder: [VORSCHAU.md](figuren/VORSCHAU.md) (erzeugt mit `npm run figures:preview`). Der Rig steht in `scripts/lib/figures/`.
Bis die Bausteine erweitert sind (Schritt 3 des Plans), ist nichts davon in der App oder in einem Bild verwendet.

## Wozu Figuren?

- **In der App:** wiederkehrende Figuren in den Titel- und Schrittbildern (M9b), die man wiedererkennt. Sie ersetzen die namenlosen Strichfiguren des Baukastens (Stufe 1).
- **Später auch für Kurzvideos** (YouTube Shorts, Instagram Reels, TikTok): Die Figuren sind so gebaut, dass dieselben Daten ohne neue Zeichnung animiert werden können (siehe „Animation und Video“). **Nichts davon wird jetzt gebaut.** Marketing steht in der CLAUDE.md unter „Nach M12“.
- **Prüfung für ein Maskottchen:** Name und Figur müssen auf einem T-Shirt und in einem 5-Sekunden-Clip funktionieren. Deshalb sind die Namen kurz, in Deutsch und Englisch leicht auszusprechen und nicht wie „Miki“.

## Die Besetzung und ihre Rollen

Anmutung: lange dünne Linien-Glieder, kleine Köpfe, Kleid und Schal, Haarbüschel, leicht schiefer Kopf. Sieben Figuren, alle gesichtslos.

| Name | Rolle | Alter | Standhöhe | Hautton | Aussehen |
| --- | --- | --- | --- | --- | --- |
| **Jette** | **Hauptfigur** (größeres Kind) | ≈ 7 Jahre | 88 | Platz 7 `#76492F` | Haarbüschel, Rosé-Kleid |
| **Mats** | **Hauptfigur** (älterer Junge) | ≈ 11 Jahre | 105 | Platz 1 `#F1CDB3` | Mütze (Petrol mit Leinen-Rand), Rosé-Shirt, schlanker Rumpf, Hand in der Hüfte |
| **Stups** | **Hauptfigur** (Begleiter, Vogel) | – | etwa 50 | – (Honig-Körper) | dünne Beine, langer Schwanz, Haarschopf, Rosé-Schnabel |
| **Ilka** | Nebenfigur (Mutter) | Erwachsene | 120 | Platz 3 `#C48A62` | groß und schlank, langer Petrol-Mantel, Rosé-Schal, Bob, Hand in der Hüfte |
| **Arne** | Nebenfigur (Papa) | Erwachsene | 123 | Platz 5 `#A56B45` | noch etwas größer, Leinen-Pullover, Petrol-Hose, kurze Haare |
| **Nolli** | Nebenfigur (kleinstes Kind) | ≈ 3 Jahre | 67 | Platz 2 `#DDAA85` | Dutt, Petrol-Kleidchen, Rosé-Schuhe |
| **Tüpfel** | **Cameo-Figur** (Katze) | – | 55 | – (Leinen) | rund und sitzend, schlank stehend, langer Schwanz, spitze Ohren |

(Standhöhe in Einheiten der 400 × 200-Fläche; Erwachsene bleiben unter 125, damit der Kopf unter den oberen Ecken der Karte bleibt. Tests prüfen das.)

- **Hauptfiguren** tragen die Titelbilder (Jette, Mats nach Altersspanne, Stups als Begleiter). **Nebenfiguren** (Ilka, Arne, Nolli) kommen dazu, wenn die Aktivität sie braucht (Erwachsene bei Hitze und Schere, Nolli bei Kleinkind-Aktivitäten). **Tüpfel** erscheint nur als kleiner Gast (Cameo) mit wenigen Posen.
- Die Figuren sind **geschlechtsneutral** gezeichnet. Die Namen sind es nicht alle (Vornamen): Sie nennen kein Geschlecht in der App, im Text über die Figuren steht „Kind“, „Erwachsene“.

### Alter und welche Figur zu welcher Aktivität passt

Regel (in Code: `scripts/lib/figures/castRules.ts`, `figureFitsActivity`; Tests): Eine Szene zeigt nur Kinder-Figuren, deren Altersbereich sich mit der Altersspanne der Aktivität (`ageMin` bis `ageMax`) überschneidet. Erwachsene und Tiere haben keine Altersgrenze.

| Figur | Alter | passt zu Aktivitäten, die Alter … umfassen |
| --- | --- | --- |
| Nolli | ≈ 3 | 0 bis 4 Jahre |
| Jette | ≈ 7 | 3 bis 9 Jahre |
| Mats | ≈ 11 | 8 bis 16 Jahre |
| Ilka, Arne, Stups, Tüpfel | – | jede |

Gilt die Aktivität für 0 bis 16 Jahre, nimmt die Szene die Figur, die am besten zum Kern der Aktivität passt, oder gar kein Kind. Ergänzend gelten die Regeln des Baukastens (Kleinkind nur bei Aktivitäten ab 2 Jahren, Schere und Hitze nur beim Erwachsenen, `docs/bausteine/README.md`).

### Namensprüfung

Geprüft am 15. und 16. Oktober 2026 mit einer Websuche gegen bekannte Kinderfiguren (Bücher, Serien, Maskottchen, Deutsch und Englisch). **Das ist keine Markenprüfung** (DPMA, EUIPO, App Stores): Sie steht unter „Nach M12“ in der CLAUDE.md. Ein Name ohne Treffer ist nicht automatisch frei.

- **Ohne bekannte Kinderfigur gefunden:** Nolli, Jette, Ilka, Tüpfel, Stups, Arne. Hinweise: Zu „Jette“ gibt es eine Buchreihe von Fee Krämer, zu „Tüpfel“ nur „Tüpfelblatt“ aus Warrior Cats (anderer Name), zu „Arne“ den Krimiautor Arne Dahl.
- **Mats:** keine bekannte Kinderfigur, aber das **Bilderbuch „Mats und Mathilde“**. Das ist bei der Markenprüfung besonders zu beachten (CLAUDE.md, „Nach M12“). Alternative wäre Tore.
- **Nicht gewählt:** Malte (Papa), Tore (Junge); schwächer waren Rune (Jugendroman „Rune“ und Comicreihe „Rune“) und Ivo (Bilderbuch „The Boy Who Lived in a Shell“ und ein spanischer Roman mit Figur „Ivo“).
- **Durchgefallen** und ersetzt (aus den ersten Entwürfen): Pepo (spanische Kinderbuchfiguren), Teo (spanische Vorschulserie), Zora („Die rote Zora“), Wusel („Wusel & Pip“), Ruben (Figur aus „PAW Patrol“), Lumo (ESC-Maskottchen 2025 und eine Kinderserie), Luka (mehrere Kinderfiguren), Rike (Puppenfigur der Sesamstraße).
- **Als Tier verworfen:** ein Igel, weil **Mecki** (Hörzu-Maskottchen) zu nah liegt. Deshalb ist Stups ein Vogel.
- **Nicht gewählt:** Satz A (Joni, Fenn, Sanne) und Satz B (Bent, Fidi, Hanne, Mutz). Ihre Entwürfe stehen in der Git-Historie (PR #28, Stand davor: Commit `547a921`).

## Hauttöne

Variante A, **acht Töne** von hell bis tief, Farbton 21° bis 26° (ohne Gelb- und ohne Rotstich; Test: 18° bis 28°). Sie sind Rollen der Zeichnungs-Palette (`skin1` bis `skin8` in `illustrationPalette`, `src/lib/palette.ts`) und liegen als Farbplätze in den Vorlagen. Fünf sind vergeben, drei sind Reserve für weitere Figuren.

**Regel (Clemens, 16. Oktober 2026):** Ein Ton **trägt** auf einem Hintergrund, wenn die **Haut gegen den Hintergrund mindestens 3:1** hat **oder** der **Tinten-Umriss gegen die Haut mindestens 3:1**. Bei gesichtslosen Köpfen trägt entweder die Form der Haut oder der Umriss. Die frühere Regel „Umriss mindestens 3:1“ hätte die tiefen Töne ausgeschlossen.

| Platz | Ton | Figur | Haut gegen Leinen | Rosé | Bildgrund | Petrol | Tinte gegen Haut | trägt auf Leinen / Rosé / Bildgrund / Petrol |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `#F1CDB3` | Mats | 1,4:1 | 1,1:1 | 1,2:1 | 4,9:1 | 9,1:1 | ja / ja / ja / ja |
| 2 | `#DDAA85` | Nolli | 2,0:1 | 1,3:1 | 1,7:1 | 3,6:1 | 6,6:1 | ja / ja / ja / ja |
| 3 | `#C48A62` | Ilka | 2,8:1 | 1,8:1 | 2,5:1 | 2,5:1 | 4,6:1 | ja / ja / ja / ja |
| 4 | `#B07A52` | Reserve | 3,5:1 | 2,2:1 | 3,1:1 | 2,0:1 | 3,7:1 | ja / ja / ja / ja |
| 5 | `#A56B45` | Arne | 4,1:1 | 2,7:1 | 3,7:1 | 1,7:1 | 3,1:1 | ja / ja / ja / ja |
| 6 | `#8C5C3E` | Reserve | 5,3:1 | 3,5:1 | 4,7:1 | 1,3:1 | 2,4:1 | ja / ja / ja / **nein** |
| 7 | `#76492F` | Jette | 7,2:1 | 4,7:1 | 6,4:1 | 1,0:1 | 1,8:1 | ja / ja / ja / **nein** |
| 8 | `#613A25` | Reserve | 9,3:1 | 6,0:1 | 8,2:1 | 1,3:1 | 1,4:1 | ja / ja / ja / **nein** |

Hintergründe: Leinen `#FCF8F2`, Rosé `#F4BEBB`, Petrol `#1A5D74`, Bildgrund `#FAE7E2`. Alle Werte aus `src/lib/contrast.ts`, die Tabelle steht auch in [VORSCHAU.md](figuren/VORSCHAU.md).

**Wo ein Ton nicht mehr trägt:** Auf Leinen, Rosé und dem Bildgrund trägt **jeder** Ton (die hellen über den Umriss, die tiefen über die Haut selbst). **Auf Petrol tragen die Plätze 6, 7 und 8 nicht**: Petrol ist fast so dunkel wie diese Brauntöne (Haut gegen Petrol 1,0:1 bis 1,3:1), und der Tinten-Umriss verschwindet auf ihnen (1,4:1 bis 2,4:1). Ein tiefer Kopf vor einer Petrol-Fläche wäre ein dunkler Fleck ohne Form.

**Wie der Szenenprüfer damit umgeht** (`checkAgainstActivity` in `scripts/lib/kit/scene.ts`, Tests in `figures.test.ts`): Figuren-Bausteine tragen ihren Hautton (`skin`). Trägt der Ton auf Petrol nicht, meldet der Prüfer einen **Fehler**, sobald ein Baustein in Petrol (zum Beispiel ein Vorhang, ein Kissen oder ein Kleidungsstück eines Bausteins hinter dem Kopf) den **Kopfbereich** (oberes Drittel der Figur) überdeckt. Die Szene wird dann verworfen oder mit anderer Farbe (Rosé statt Petrol) gebaut; die Farbfläche der Karte bleibt der Rückfall. Petrol am Körper (Kleidung, unterhalb des Kopfbereichs) ist erlaubt, ebenso Petrol hinter hellen Köpfen. Der Bildgrund ist Rosé-Leinen, nie Petrol, deshalb trifft die Regel nur Gegenstände im Bild.

### Zuordnung der Töne zu den Figuren

Jette (Hauptfigur) **Platz 7** (tief), Mats (Hauptfigur) **Platz 1** (hell), Nolli **Platz 2**, Ilka **Platz 3**, Arne **Platz 5**.

- **Die beiden Hauptfiguren** tragen die beiden Enden der genutzten Töne: Mats den hellsten (Platz 1), Jette den tiefsten (Platz 7). Sie haben also verschiedene Töne, und nicht beide den hellsten. Die Nebenfiguren liegen dazwischen (Platz 2, 3, 5), jeder Ton gehört genau einer Figur.
- **Keine Rolle ist an eine Hautfarbe gebunden:** Der hellste und der tiefste Ton stehen bei den Hauptfiguren, nicht bei Helfern; Erwachsene haben mittlere Töne, das Kleinkind einen hellen. Eine Szene ohne Jette oder Mats (zum Beispiel nur mit Nolli und Ilka) zeigt trotzdem verschiedene Töne.
- **Keine Familie ist festgelegt:** Wer zu wem gehört, sagen wir nirgends (nicht in der App, nicht in den Texten). Die Figuren sind eine Besetzung, keine Familie. „Familie am Tisch“ ist ein Test für Größen, kein Familienfoto.
- **Technisch:** Jettes Platz 7 trägt auf Petrol nicht. Deshalb darf bei ihr hinter dem Kopf nichts Petrolfarbenes stehen (Prüfer, siehe oben). Das sind die Kosten der tiefen Hautfarbe bei einer Hauptfigur, und sie sind tragbar: Rosé, Leinen und Honig gehen immer.

Wie die Töne bei Eltern ankommen, ist nicht Sache des Codes: Das Gespräch mit Eltern aus unterschiedlichen Familien steht in der CLAUDE.md unter „Nach M12“.

## Linien

**Figuren: 5. Gegenstände: 4. Feine Linien: 2,5** (Entscheidung von Clemens, 16. Oktober 2026). Geprüft, ob das einheitlich wirkt: Familie am Tisch mit Figurenlinie 4, 4,5 und 5 (VORSCHAU.md, „Einheitlichkeit der Linien“): Auf der Karte und im Daumennagel fällt die Differenz zwischen Figur (5) und Tisch, Teller und Tablett (4) nicht auf; die Figuren wirken etwas kräftiger und tragen so den Vordergrund. Deshalb bleibt es bei 5 und 4 (4,5 für alles war nicht nötig). Der Rig setzt 5 über `figureLine` (`rig.ts`), die Tiere ebenso. Die Regel steht in `docs/design/ILLUSTRATIONEN.md`.

## Ausdrucksposen (Daten, nichts wird animiert)

Emotionen über Haltung statt über Gesichtszüge. Fünf Posen im Rig (`poses.ts`, `rig-daten.json`), für jede Figur gerechnet; VORSCHAU.md zeigt sie bei Jette und Mats:

| Pose | Name im Rig | Haltung |
| --- | --- | --- |
| staunt | `amazed` | zurückgelehnt, Kopf in den Nacken, Hände neben den Kopf gehoben, Beine etwas auseinander |
| freut sich | `happy` | kleiner Hüpfer, Arme locker nach oben außen, Kopf zur Seite |
| enttäuscht | `disappointed` | nach vorn gesunken, Kopf hängt, Arme hängen schlaff |
| nachdenklich | `thoughtful` | eine Hand am Kinn, der andere Arm quer vor dem Bauch, Kopf geneigt |
| neugierig | `curious` | nach vorn gebeugt, Kopf gestreckt, eine Hand streckt sich nach vorn |

Dazu die Gebrauchsposen `stand`, `hold`, `tray`, `cheer`, `walk`, `take`. Ehrlich: Bei Jette verschwinden die Arme im Kleid-Schnitt zum Teil, ihre Posen lesen sich vor allem über Kopf und Rumpf; `amazed` und `thoughtful` sind bei beiden die schwächsten Posen. Ein Mensch sollte sie vor der Beta ansehen.

## Tiere: Stups und Tüpfel

- **Stups** (Vogel, Hauptfigur, Begleiter) ist **etwa 50 Einheiten hoch** (gemessen an der Bounding-Box im Browser: steht 51, sitzt 55, hüpft 49, zeigt 48, auf der Schulter 53, jeweils mit Beinen und Schopf). Sechs Posen: `stand`, `sit`, `hop`, `shoulder` (sitzt auf der Schulter; der Rig liefert dafür den Ankerpunkt `shoulderR`), `point` (zeigt: Flügel nach vorn, Schnabel vorn), `watch` (schaut zu). **Lesbarkeit im Daumennagel 96 × 48:** In doppelter Pixeldichte (heutige Handys) ist Stups in allen sechs Posen als Vogel zu erkennen, auch `point`. In einfacher Dichte ist er noch als Vogel zu erkennen, aber unscharf; `point` ist dort nur an der Haltung zu lesen. In 64 × 32 bleibt eine kleine Form.
- **Tüpfel** (Katze, Cameo-Figur) hat drei Posen: `stand`, `sit`, `watch` (schaut zu). Die **Sitzpose ist neu** (rund, aufrecht, der Schwanz liegt um die Vorderpfoten) und überzeugt als Silhouette; die alte schräge Pose ist entfernt. Tüpfel ist ein Gast und trägt nie ein Bild.
- **Regel: Tiere erscheinen nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung.** Sie gilt auch bei Feuer. Umgesetzt im Szenenprüfer (`checkAgainstActivity` in `scripts/lib/kit/scene.ts`, Baustein-Merkmal `animal`): Ein Tier im Bild zusammen mit einem Baustein mit dem Merkmal scharf, heiß oder Feuer ist ein Fehler, ebenso eine Aktivität, deren Material eines dieser Merkmale hat (zum Beispiel Backofen, Herd, Messer, Schere, Kerze). Die Prüfung ist bewusst streng (Material der Aktivität, nicht nur das Bild). Tests: `figures.test.ts`, Abschnitt „Tier-Regel“.
- Stups **fasst nichts an**: In seinem Triptychon hüpft er herein, **zeigt** auf das Tablett und hüpft vor Freude.

## Aufbau (Rig)

Alle Figuren bestehen aus **getrennten Teilen mit Ankerpunkten**:

- **Mensch:** Kopf, Haar oder Mütze, Rumpf (Kleid oder schlank), je Arm Oberarm, Unterarm und Hand, je Bein Oberschenkel, Unterschenkel und Schuh, optional Schal. Ankerpunkte: Becken, Hals, Kopf, beide Schultern, beide Hände, beide Füße.
- **Tiere:** Körper, Kopf, Ohren (Katze) oder Schnabel und Schopf (Vogel), Beine, Schwanz, Flügel oder Pfote.
- **Maße** stehen als Zahlen (`HumanSpec`, `PetSpec`) in `scripts/lib/figures/cast.ts`, alle in Einheiten der 400 × 200-Fläche wie die Bausteine.
- **Benannte Posen als Daten** (`scripts/lib/figures/poses.ts`), für Tiere in `pets.ts`. Eine Pose ist entweder ein Satz **Winkel** (Arm: Winkel und Beugung) oder ein **Zielpunkt für die Hand**: Dann rechnet ein Arm mit zwei Gliedern (`solveArm`) den Ellbogen aus. So sitzen die Hände an den Rändern eines Tabletts, an einem Teller oder an einem Griff.
- **Haltepunkte (`grip`)** sind die Zielpunkte der Hände. Heute gibt es sie für das Tablett (beide Ränder) und den Teller; der Baukasten bekommt sie für Schüssel, Löffel, Kanne, Schere und andere in der Erweiterung von Stufe 1 (Schritt 3 des Plans).
- **Augenpunkte** sind im Rig als freiwillige Fassung eingebaut (zwei Punkte, getestet), aber **nicht gewählt** und in keiner Vorschau.
- Die **Rig-Daten** (Maße, Alter, Hautton, Besonderheiten, alle Posen aufgelöst) stehen als JSON in [`figuren/rig-daten.json`](figuren/rig-daten.json). Ein Test prüft, dass aus JSON gelesene Daten dasselbe Bild ergeben.

### Dateigröße

**Grenze für Titel- und Schrittbilder: 14 KB** (Clemens, 16. Oktober 2026; vorher 10 KB für Titelbilder, 14 KB nur für Schrittbilder). Das Bucket in Supabase erlaubt weiter 20 KB je Datei (Migration 0005), die Migration bleibt unverändert. Der Szenenprüfer (`maxSceneBytes` in `scripts/lib/kit/scene.ts`), die Figuren-Tests und der Test der Zeichnungen (`illustrations.test.ts`) prüfen 14 KB.

Gemessen mit **Linie 5**, ohne Augenpunkte (alle Dateien in VORSCHAU.md):

| Szene | Größe | gepackt (gzip) |
| --- | --- | --- |
| Besetzung (fünf Menschen, Katze, Vogel) | 8,8 KB | 2,2 KB |
| Familie am Tisch (fünf Menschen, Katze, Tisch, Teller) | 8,2 KB | 2,0 KB |
| Triptychon-Bild (eine Figur, Tisch, Tablett) | 1,9 bis 2,2 KB | 0,6 KB |
| Stups-Triptychon | 1,6 bis 1,8 KB | – |
| Figurenblatt (vier Posen, kein Titelbild) | 5,7 bis 7,8 KB | – |
| Ausdrucksblatt (fünf Posen) | 6,4 bis 7,4 KB | – |

Eine stehende Figur kostet 1,2 bis 1,7 KB (Menschen), Tiere 0,9 bis 1,0 KB. Damit passt eine Szene mit allen fünf Menschen und zwei Tieren (8,8 KB) deutlich unter 14 KB; die Szenenprüfung begrenzt ohnehin auf 6 Bausteine. Das Mittel zur Größe: Die versetzte Farbfläche gibt es nur am Rumpf, nicht an Armen und Beinen (Schalter `limbShadow`).

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

- **Kleidung:** Petrol, Rosé, Leinen und Tinte (Palette C und Zeichnungs-Palette). Haare Tinte. Köpfe und Hände haben den **Hautton** der Figur (siehe „Hauttöne“). Auf Petrol sind feine Linien Leinen (**Petrol-Regel**, `docs/bausteine/README.md`).
- **Warme Töne** (Honig, Braun) gelten für Gegenstände, dazu für **Ofenhandschuhe, Mützen-Bommel und den Vogel Stups** (Honig) als Ausnahme der Figuren (Clemens hat Stups so bestätigt). Kein Gelb an Haut.

## Nach dem Festschreiben

Die Figuren ersetzen die Strichfiguren in den Bausteinen und bekommen Haltepunkte an den Gegenständen (Stufe 1 erweitert, Schritt 3 des Plans). Ändern lässt sich danach nur, was dieses Dokument ausdrücklich erlaubt: weitere Reserve-Töne vergeben, Posen ergänzen, Namen nach der Markenprüfung tauschen (eine Zeile in `cast.ts`, `names.ts` und diesem Text).
