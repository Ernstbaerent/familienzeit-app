# Figuren (M9b): Identifikationsfiguren, Entwurf

**Stand: Entwurf, die Auswahl ist offen.** Drei Figurensätze liegen zur Wahl vor ([VORSCHAU.md](figuren/VORSCHAU.md)). Nach der Wahl wird dieses Dokument **festgeschrieben** (ein Satz, eine Fassung der Gesichter) und ändert sich nicht mehr.
Bis dahin ist nichts davon in der App, im Baukasten (`docs/bausteine/`) oder in einem Bild verwendet.

## Wozu Figuren?

- **In der App:** wiederkehrende Figuren in den Titel- und Schrittbildern (M9b), die man wiedererkennt: ein größeres Kind, ein kleineres Kind, ein Erwachsener, ein Haustier. Sie ersetzen die namenlosen Strichfiguren des Baukastens (Stufe 1).
- **Später auch für Kurzvideos** (YouTube Shorts, Instagram Reels, TikTok): Die Figuren sind so gebaut, dass dieselben Daten ohne neue Zeichnung animiert werden können (siehe „Animation und Video“). **Nichts davon wird jetzt gebaut.** Marketing steht in der CLAUDE.md unter „Nach M12“.
- **Prüfung für ein Maskottchen:** Name und Figur müssen auf einem T-Shirt und in einem 5-Sekunden-Clip funktionieren. Deshalb sind die Namen kurz, in Deutsch und Englisch leicht auszusprechen und nicht wie „Miki“.

## Die drei Sätze

Jeder Satz hat vier Figuren, gleiche Rollen, aber eine deutlich andere Anmutung. Alle sind **gesichtslos** (Kopf als Kreis, keine Hautfarbe: Köpfe und Hände sind Leinen), Wiedererkennung über Silhouette, Haare, Mütze und Kleiderfarben.

| Satz | Anmutung | größeres Kind | kleineres Kind | Erwachsener | Haustier |
| --- | --- | --- | --- | --- | --- |
| **A: rund und weich** | große runde Köpfe, kurze dicke Glieder, eiförmige Rümpfe, Locken, Dutt und Mützchen | **Joni** (Locken, Rosé) | **Fenn** (Mützchen, Petrol) | **Sanne** (Dutt, Leinen und Petrol) | **Stups**, ein rundes Küken |
| **B: eckig und kräftig** | Kasten-Rümpfe, breite Schultern, dicke Glieder mit kleinen Ecken, Stiefel | **Bent** (Bob-Haar, Petrol-Jacke) | **Fidi** (Beanie mit Bommel, Rosé) | **Hanne** (breit, Leinen-Pulli) | **Mutz**, ein kräftiger Hund mit Fleck |
| **C: schlank und verspielt** | lange dünne Linien-Glieder, kleine Köpfe, Kleid, Schal, Haarbüschel, schiefer Kopf | **Jette** (Haarbüschel, Rosé-Kleid) | **Nolli** (Dutt, Petrol-Kleidchen) | **Ilka** (groß, langer Mantel, Schal) | **Tüpfel**, eine schlanke Katze |

Die Figuren sind **geschlechtsneutral** gezeichnet. Die Namen sind es nicht alle (Kinder- und Vornamen): Sie nennen kein Geschlecht in der App, und im Text über die Figuren steht „Kind“ und „Erwachsener“.

### Namensprüfung

Geprüft am 15. Oktober 2026 mit einer Websuche gegen bekannte Kinderfiguren (Bücher, Serien, Maskottchen, Deutsch und Englisch). **Das ist keine Markenprüfung** (DPMA, EUIPO, App Stores): Die steht unter „Nach M12“ in der CLAUDE.md. Ein Name ohne Treffer ist nicht automatisch frei.

- **Ohne bekannte Kinderfigur gefunden:** Joni, Fenn, Sanne, Stups, Bent, Fidi, Hanne, Mutz, Jette, Nolli, Ilka, Tüpfel. Hinweise: Zu „Jette“ gibt es eine Buchreihe von Fee Krämer, zu „Fenn“ eine Jugendbuchreihe „Fenn Halflin“ (9 bis 12), zu „Tüpfel“ nur „Tüpfelblatt“ aus Warrior Cats (anderer Name). Keiner ist ein bekanntes Vorschul-Maskottchen.
- **Durchgefallen** und ersetzt: Pepo (spanische Kinderbuchfiguren), Teo (spanische Vorschulserie), Zora („Die rote Zora“), Wusel („Wusel & Pip“), Ruben (Figur aus „PAW Patrol“), Lumo (ESC-Maskottchen 2025 und eine Kinderserie), Luka (mehrere Kinderfiguren), Rike (Puppenfigur der Sesamstraße).
- **Als Tier verworfen:** ein Igel in Satz A, weil **Mecki** (Hörzu-Maskottchen) zu nah liegt. Deshalb ist das Haustier in Satz A ein Küken.

## Gesichter: zwei Fassungen aus demselben Rig

Jeder Satz liegt in **zwei Fassungen** vor, die sich aus demselben Rig ergeben, damit sich nichts neu zeichnen lässt:

1. **ohne Gesichtszüge** (wie bisher): Kopf als Kreis.
2. **mit zwei Punkten als Augen** (sonst nichts: kein Mund, keine Nase, keine Brauen).

Ein Test stellt sicher, dass „mit Augen“ genau „ohne“ plus zwei Punkte ist (`scripts/lib/figures/figures.test.ts`). **Offene Entscheidung (Clemens):** App-Bilder ohne Gesichtszüge und nur die Videos mit Augen, oder beides.

## Aufbau (Rig)

Alle Figuren bestehen aus **getrennten Teilen mit Ankerpunkten**:

- **Mensch:** Kopf, Haar oder Mütze, Rumpf (Ei, Kasten, schlank, Kleid), je Arm Oberarm, Unterarm und Hand, je Bein Oberschenkel, Unterschenkel und Schuh, optional Schal. Ankerpunkte: Becken, Hals, Kopf, beide Schultern, beide Hände, beide Füße.
- **Haustier** (von der Seite, Blick nach rechts): Körper, Kopf, Ohren, Beine, Schwanz, beim Küken Schnabel und Flügel.
- **Maße** stehen als Zahlen (`HumanSpec`, `PetSpec`) in `scripts/lib/figures/sets.ts`, alle in Einheiten der 400 × 200-Fläche wie die Bausteine. Die Linien bleiben immer 4 und 2,5.
- **Benannte Posen als Daten** (`scripts/lib/figures/poses.ts`): `stand`, `hold` (hält einen Teller), `tray` (trägt ein Tablett mit beiden Händen), `cheer` (jubelt), `walk`, `take` (nimmt das Tablett vom Tisch). Haustiere: `stand`, `walk`, `jump`, `sniff`.
  Eine Pose ist entweder ein Satz **Winkel** (Arm: Winkel und Beugung) oder ein **Zielpunkt für die Hand**: Dann rechnet ein Arm mit zwei Gliedern (`solveArm`) den Ellbogen aus. So sitzen die Hände an den Rändern eines Tabletts, an einem Teller oder an einem Griff, und die Gegenstände stehen nicht nur daneben.
- **Haltepunkte (`grip`)** sind die Zielpunkte der Hände. Heute gibt es sie für das Tablett (beide Ränder) und den Teller (Unterseite); der Baukasten bekommt sie für Schüssel, Löffel, Kanne, Schere und andere in der Erweiterung von Stufe 1.
- Die **Rig-Daten** (Maße, Besonderheiten, alle Posen aufgelöst) stehen als JSON in [`figuren/rig-daten.json`](figuren/rig-daten.json). Ein Test prüft, dass ein aus JSON gelesener Satz dasselbe Bild ergibt.

### Dateigröße

Die Teile werden beim Zeichnen mit absoluten Koordinaten gerechnet (keine verschachtelten Gruppen), die Pose steckt nur in den Zahlen. Gemessen (Näheres und alle Dateien in [VORSCHAU.md](figuren/VORSCHAU.md), „Dateigrößen“):

- Eine Figur kostet etwa **1,5 bis 2,5 KB** (Satz C mit Linien-Gliedern am wenigsten, Satz A und B mit Kapsel-Gliedern am meisten).
- Szenen mit vier bis fünf Figuren plus Tisch und Tablett liegen bei **6,7 bis 9,5 KB**, ein Triptychon-Bild mit zwei Figuren bei **3 bis 5 KB**. **Alle Bilder bleiben unter 10 KB**; die 14 KB für Schrittbilder (Clemens, 15. Oktober 2026) werden bei den Figuren nicht gebraucht.
- Das Mittel dazu: Die versetzte Farbfläche gibt es nur am Rumpf, nicht an Armen und Beinen (sonst etwa ein Drittel mehr Bytes). Ein Schalter (`limbShadow`) schaltet sie wieder ein.

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

- **Kleidung:** Petrol, Rosé, Leinen und Tinte (Palette C und Zeichnungs-Palette). Haare Tinte. Köpfe und Hände Leinen. Auf Petrol sind feine Linien Leinen (**Petrol-Regel**, `docs/bausteine/README.md`).
- **Warme Töne** (Honig, Braun) gelten bisher nur für Gegenstände. In den Entwürfen kommen sie zusätzlich an **Mützen-Bommeln, Ofenhandschuhen und beim Haustier** vor (Küken Honig, Hund mit Honig-Fleck). **Offene Entscheidung (Clemens):** Dürfen Honig und Braun für Haustiere und Accessoires der Figuren gelten, oder bleiben sie ganz bei den Gegenständen?

## Offene Entscheidungen vor dem Festschreiben

1. **Welcher Satz** (A, B oder C), oder Mischung (zum Beispiel die Köpfe von A mit den Körpern von B).
2. **Gesichter:** nur ohne, nur mit Augen, oder App ohne und Videos mit Augen.
3. **Namen:** Passen sie? Ein anderer Name ist nach der Wahl schnell getauscht, danach nicht mehr.
4. **Warme Töne** an Figuren (siehe oben).
5. **Haustier:** Küken, Hund oder Katze, oder zwei Tiere.

## Nach dem Festschreiben

Die gewählten Figuren ersetzen die Strichfiguren in den Bausteinen und bekommen Haltepunkte an den Gegenständen (Stufe 1 erweitert, Schritt 3 des Plans). Ändern lässt sich danach nur noch, was dieses Dokument ausdrücklich erlaubt.
