# Theme „Sonntagslicht“ (Design ab Stufe D1)

Das Design kommt aus `docs/design/DESIGN.md` und dem PDF im selben Ordner. Umgesetzt wird es in Stufen
(Roadmap D1 bis D5 in der CLAUDE.md). **D1** legt die Grundlagen: Theme, Schriften, App-Name und die drei
Bausteine `Button`, `Chip` und `Section`. Bildschirme sind erst ab D2 dran.

## Wo was steht

| Datei                         | Inhalt                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/theme.ts`            | Farben (hell, dunkel), Schatten, Schriftnamen und -größen, Abstände, Radien, Mindestgrößen, `useTheme()` |
| `src/lib/useThemedStyles.ts`  | Styles, die von hell/dunkel abhängen                                            |
| `src/lib/fonts.ts`            | Laden von Literata und Onest, Zeitlimit                                         |
| `src/lib/theme.test.ts`       | Kontraste beider Paletten (WCAG AA) und die Vorgaben aus der DESIGN.md          |
| `src/lib/contrast.ts`         | Kontrastberechnung nach WCAG, nur für Tests (`theme.test.ts`, Detail-Tests)     |

## So nutzt man das Theme (neue und umgebaute Bildschirme)

```tsx
const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    box: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md },
    title: { fontFamily: fonts.title, fontSize: fontSize.xl, lineHeight: lineHeight.xl, color: colors.text },
  });

function Card() {
  const styles = useThemedStyles(createStyles); // folgt hell/dunkel
  ...
}
```

- `createStyles` steht **außerhalb** der Komponente. `Theme`, `fonts`, `fontSize` usw. kommen aus `@/lib/theme`.
- Der feste Export `colors` (immer hell) gibt es nur, bis jeder Bildschirm umgestellt ist. Umgestellt sind bisher der Start (D2), das Ergebnis mit dem Wetter-Schritt (D3) und die Detailansicht (D4);
  nur noch „Wie war’s?“ (`FeedbackPanel`, `RatingButton`) sowie Verlauf und Kinderprofile (D5) folgen. Neue Bildschirme nehmen `useTheme()` oder `useThemedStyles`.
- Die Lint-Regel gegen feste Farben, Größen, Abstände und Radien bleibt (`npx expo lint`).
- Breiten und Höhen stehen nicht im Theme, **außer** den Mindestgrößen `size.touch` (44 pt Tippfläche)
  und `size.checkbox` (56 px Abhak-Feld). Beides schreibt die DESIGN.md vor.

## Woher die Werte kommen

Die DESIGN.md nennt nicht alles. Im Code steht an jedem Wert, woher er kommt:

- **DESIGN.md:** steht dort (Farben Papier, Sand, Tinte, Terrakotta, Salbei, Honig und die drei Dunkelwerte,
  Radien 22/16/Pille, Schriften, Anleitungstext 20 px, Schrittabstand 28 px, Abhak-Felder 56 px, Tippflächen 44 pt).
- **PDF:** aus dem PDF gemessen.
  - Schriftgrößen aus der Textebene (Chrome druckt 1 px als 0,75 pt, also pt ÷ 0,75; die Anleitung mit 15,0 pt ergibt
    genau die 20 px der DESIGN.md), zusammengefasst auf die Stufen 12/14/16/18/20/22/28/34.
  - Zeilenhöhe des Anleitungstextes (30 px = 1,5 × 20) und Farben für Nebentext, Rahmen, Symbole, Allergen- und
    Sicherheitsflächen aus den gerenderten Bildschirmen. Auch das Weiß der Karten (`card`) ist im PDF gemessen.
  - Der Kartenschatten nach Augenmaß (weich und kurz: etwa 4 px Versatz, 16 px Unschärfe, höchstens 10 % Abdunklung).
    Der warme Schein unter dem Hauptknopf ist ebenfalls nach Augenmaß.
- **abgeleitet:** von uns ergänzt, weil es im Design fehlt. Das sind alle Dunkelwerte außer Hintergrund, Text und Hauptfarbe
  (auch `card` und `selected` im Dunkeln). Sie haben denselben warmen Braunton und sind per Test auf AA geprüft.
  **Ani bestätigt sie noch** (Entscheidung 18/19 in der DESIGN.md).

### Farben

| Name             | Hell      | Dunkel    | Zweck                                                              |
| ---------------- | --------- | --------- | ------------------------------------------------------------------ |
| `background`     | `#FAF6F0` | `#1C1714` | Papier, Grund                                                      |
| `card`           | `#FFFFFF` | `#332A24` | Karten, Kacheln, nicht gewählte Chips (Text darauf `text`)         |
| `surface`        | `#F0E6D8` | `#2A221D` | Sand: Flächen, Platzhalter, Nebenknöpfe (keine Karten)             |
| `text`           | `#2A211C` | `#F3EBE2` | Tinte: Text, Überschriften (14,6:1 auf Papier, 15,1:1 dunkel)      |
| `textMuted`      | `#6B5D53` | `#B8A99B` | Nebentext                                                          |
| `primary`        | `#B4532F` | `#E3825C` | Terrakotta: nur der Hauptknopf                                     |
| `onPrimary`      | `#FFFFFF` | `#1C1714` | Text auf `primary` (5,0:1 hell, 6,4:1 dunkel)                      |
| `secondary`      | `#5F7A5A` | `#8FA887` | Salbei: Zweitfarbe                                                 |
| `onSecondary`    | `#FFFFFF` | `#1C1714` | Text auf `secondary` (4,8:1 hell)                                  |
| `selected`       | `#2A211C` | `#F3EBE2` | Tinte: gewählter Zustand von Chips und Kacheln                     |
| `onSelected`     | `#FAF6F0` | `#1C1714` | Text und Häkchen auf `selected` (14,6:1 hell, 15,1:1 dunkel)       |
| `accent`         | `#E8A94F` | `#E8A94F` | Honig: nur Akzent                                                  |
| `border`         | `#CDBFAE` | `#4A3F37` | Linien zum Gliedern                                                |
| `danger`         | `#9A3B22` | `#F2A892` | Löschen, Fehler, Sicherheit                                        |
| `dangerSurface`  | `#F7E4DE` | `#3B2420` | Fläche für Sicherheitsboxen                                        |
| `warning`        | `#8A5300` | `#F2C27B` | Aufpassen, z. B. Wetterwarnung (bisheriger Wert)                   |
| `warningSurface` | `#FCEBD0` | `#3A2C1A` | Fläche für Hinweisboxen, z. B. Allergene                           |
| `icon`           | `#7A6656` | `#B8A99B` | Symbole                                                            |

Regeln, die aus den Kontrasten folgen:

- **Honig (`accent`) nie für Text, und keine Schrift darauf.** Tinte auf Honig hat 7,7:1, aber im Dunkelmodus ist `text` hell
  und hätte darauf nur 1,7:1. Honig bleibt für kleine Formen.
- **Salbei (`secondary`) nur als Fläche mit `onSecondary`.** Als Textfarbe hat er hell nur 4,4:1.
- **Terrakotta (`primary`) als Textfarbe nur auf `background`** (4,6:1), nicht auf `surface` (4,0:1).
- **`border` gliedert nur.** Mit 1,7:1 reicht er nicht als einziges Merkmal eines Bedienelements (WCAG 1.4.11 verlangt 3:1).
  Bedienelemente erkennt man an Fläche, Text und Symbol.
- **Karten sind weiß (`card`), Sand (`surface`) ist für Flächen.** Auf `card` hat `text` 15,8:1 und `textMuted` 6,3:1.
  Terrakotta (`primary`) ist nur als Hauptknopf erlaubt, nicht als Rand, Häkchen oder Chip-Farbe (Entscheidung 11).
- Die in der DESIGN.md genannten Kontraste weichen minimal von der Rechnung ab (Tinte auf Papier 14,6 statt 15,4:1,
  dunkel 15,1 statt 14,9:1). Alle Paare bestehen AA, geprüft in `src/lib/theme.test.ts`.

### Eigene Ergänzungen und Abweichungen vom PDF

- **Karten sind weiß** (`card`, `#FFFFFF`, aus dem PDF gemessen), **Sand ist für Flächen.** Das war bis D1 anders entschieden
  (Sandkarten, keine Kartenfarbe Weiß). Clemens hat es mit Entscheidung 11 (DESIGN.md) zugunsten des PDF geändert: **`card` gilt damit als
  bestätigt.** Den Dunkelwert (`#332A24`, abgeleitet) bestätigt Ani noch.
- **Gewählter Zustand von Chips und Kacheln ist Tinte** (`selected` mit `onSelected`), wie im PDF bei den Chips. Das PDF zeigt gewählte
  Kinder-Kacheln mit Terrakotta-Rand: Das ist durch „Terrakotta nur für den Hauptknopf“ ersetzt (DESIGN.md, Entscheidung 11 und 23).
- `shadow.card` und `shadow.primaryButton` gibt es. `shadow.primaryButton` trägt seit D2 der große Hauptknopf auf dem Start.
  `shadow.card` tragen seit D3 die Ergebniskarten (`SuggestionCard`) und die Kartenkästen des Wetter-Schritts (`WeatherCard`); die Kinder-Kacheln auf dem Start haben nur einen feinen Rand.

### Kategorie-Farben (seit D3, Entscheidung 10)

Die Karte ohne Bild zeigt eine **Farbfläche mit einem großen, dünnen, angeschnittenen Kategorie-Symbol** (und einem weichen großen Kreis).
Jede Kategorie hat ihren eigenen Ton. **Es gibt keine neuen Farbtöne:** Alle Werte werden in `src/lib/theme.ts` aus den Farben der Palette
**gemischt** (`categoryTones`, Funktion `mixColors`), nicht von Hand eingetragen. Vier Palettenfarben für sieben Kategorien: Terrakotta, Salbei
und Honig je zweimal (hell und kräftiger getönt), Sand einmal.

Rezept: **Fläche** = Papier mit einem Anteil der Palettenfarbe (Sand: Sand mit einem Anteil Tinte). **Symbol** = die Palettenfarbe, zur Tinte
hin abgedunkelt, damit es mindestens 3:1 zur Fläche hat. **Kreis** = die Fläche, mit Weiß aufgehellt (im Dunkeln mit hellem Text).

| Kategorie (Schlüssel)    | Palettenfarbe   | Fläche (hell) | Symbol (hell) | Kreis (hell) | Fläche (dunkel) | Symbol (dunkel) | Kreis (dunkel) |
| ------------------------ | --------------- | ------------- | ------------- | ------------ | --------------- | --------------- | -------------- |
| Basteln (`craft`)        | Terrakotta, hell     | `#EEDACF` | `#B4532F` | `#F6EBE5` | `#4C3125` | `#E3825C` | `#594034` |
| Bewegung (`movement`)    | Terrakotta, kräftiger | `#E1BBAB` | `#8B4429` | `#EFDAD1` | `#704432` | `#E79C7E` | `#7A5140` |
| Spiel (`game`)           | Salbei, hell         | `#E0E1D7` | `#5F7A5A` | `#EEEFE9` | `#35372D` | `#8FA887` | `#44453B` |
| Natur (`nature`)         | Salbei, kräftiger    | `#C2C9BA` | `#54684E` | `#DDE1D9` | `#4A5142` | `#A8B99E` | `#585D4F` |
| Ausflug (`outing`)       | Honig, hell          | `#F5E0C3` | `#936C38` | `#FAEEDE` | `#4D3A22` | `#E8A94F` | `#5A4831` |
| Experiment (`experiment`) | Honig, kräftiger    | `#F0CC97` | `#7F5E33` | `#F7E3C6` | `#72542D` | `#EBBA74` | `#7C603B` |
| Kochen (`cooking`)       | Sand, abgedunkelt    | `#E2D8CB` | `#756C63` | `#EFEAE2` | `#423A35` | `#A79F97` | `#504843` |

Kontraste (geprüft in `src/lib/theme.test.ts`, für alle sieben Kategorien, hell und dunkel):

- **Symbol auf der Fläche mindestens 3:1** (hell zwischen 3,6:1 und 4,0:1, dunkel zwischen 3,7:1 und 5,3:1). Das Symbol ist Dekoration, die Prüfung hält es trotzdem gut sichtbar.
- **Tinte (`text`) auf der Fläche mindestens 4,5:1** (hell 8,9:1 bis 12,3:1). Auf der Fläche steht kein Text: Der Name der Kategorie steht in der **weißen Pille** (`card`, Tinte darauf 15,8:1).
- Alle sieben Flächen sind verschieden. Zwei Karten derselben Palettenfarbe (z. B. Basteln und Bewegung) unterscheiden sich durch die Tiefe des Tons, das Symbol und den Namen in der Pille; die Farbe ist nie das einzige Merkmal.
- Ein Test prüft, dass jeder berechnete Wert in dieser Tabelle steht. **Ändert sich ein Rezept in `theme.ts`, die Tabelle hier anpassen** (der Test meldet dann die Werte, die fehlen).
- Der Dunkelmodus ist vorbereitet, bleibt aber bis D5 aus (die Dunkelwerte sind wie alle anderen abgeleitet und werden von Ani bestätigt).

### Farben und Symbole der Orte (seit M10b)

Orte aus OpenStreetMap erscheinen seit M10b auf denselben Karten wie die Aktivitäten (Farbfläche mit großem Symbol, Pille mit der Unterart, z. B. „Hallenbad“).
Sieben **Bildgruppen** haben einen eigenen Ton und ein eigenes Symbol. Alle anderen Unterarten nehmen Ton und Symbol einer Aktivitäts-Kategorie
(Zuordnung `visual` in `src/features/places/placeKinds.ts`): Park, See, Teich, Rastplatz, Naturschutzgebiet → Natur; Indoorspielplatz, Trampolin-, Kletterhalle, Eisbahn → Bewegung;
Freizeitpark, Aussichtsturm, Aussichtspunkt, Sehenswürdigkeit → Ausflug; Minigolf, Bowling → Spiel. Aquarium nimmt den Zoo, Ruine die Burg.

Auch hier gibt es **keine neuen Farbtöne**: Vier Palettenfarben reichen nicht für 14 verschiedene Flächen, deshalb wird die Fläche bei einigen Orten
zusätzlich mit einer zweiten Palettenfarbe gemischt (`blend` im Rezept, `src/lib/theme.ts`, `placeTones`). Symbol und Kreis wie bei den Kategorien.

| Bildgruppe (Schlüssel) | Symbol | Mischung | Fläche (hell) | Symbol (hell) | Kreis (hell) | Fläche (dunkel) | Symbol (dunkel) | Kreis (dunkel) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Spielplatz (`playground`) | `balloon-outline` (Platzhalter) | Honig mit Terrakotta | `#EDCEAF` | `#92472A` | `#F5E4D3` | `#6E4C2E` | `#E9B05E` | `#79593C` |
| Bad (`pool`) | `water-outline` | Salbei, sehr hell | `#E7E7DE` | `#4C5B44` | `#F2F2ED` | `#3F4337` | `#B7C3AB` | `#4D5045` |
| Museum (`museum`) | `library-outline` (Gebäude mit Säulen) | Sand mit Terrakotta | `#E5CCBA` | `#844228` | `#F1E3D9` | `#623F30` | `#E9A78B` | `#6E4D3E` |
| Zoo (`zoo`) | `paw-outline` | Salbei mit Honig | `#D8CBAB` | `#47523E` | `#EAE2D1` | `#61573C` | `#C1CAB5` | `#6D6349` |
| Burg (`castle`) | `flag-outline` (Platzhalter) | Sand, kräftig abgedunkelt | `#D4CABE` | `#655C54` | `#E7E2DB` | `#524A44` | `#C1B9B1` | `#5F5751` |
| Kino (`cinema`) | `film-outline` | Terrakotta, gedeckt | `#DDC2B4` | `#763D26` | `#ECDDD6` | `#654436` | `#EAB198` | `#705144` |
| Bibliothek (`library`) | `book-outline` | Sand mit Honig und etwas Salbei | `#E0D0B0` | `#765730` | `#EEE5D4` | `#635438` | `#ECC082` | `#6F6046` |

- **Kontraste** (geprüft in `src/lib/theme.test.ts`, hell und dunkel): Symbol auf der Fläche mindestens 3:1 (hell 4,0 bis 5,8:1, dunkel 4,0 bis 5,5:1), Tinte auf der Fläche mindestens 4,5:1 (hell 9,3 bis 12,7:1).
  Alle 14 Flächen (7 Kategorien, 7 Bildgruppen) sind verschieden. Ein Test prüft, dass jeder Wert in dieser Tabelle steht.
- **Platzhalter:** Für Spielplatz und Burg hat Ionicons kein passendes Symbol. Luftballon und Fahne sind Platzhalter, bis es eigene Symbole gibt (Entscheidung von Clemens, M10b).
  Ändern: nur `placeVisualIcons` in `src/features/activities/CategoryIcon.tsx`.
- Damit sind die Symbole für Spielplatz und Bad aus Entscheidung 12 der DESIGN.md da. Das Symbol für Termine kommt mit M11.

### Bilder auf Karten und in der Detailansicht

Es gibt keine Kategorie-Fotos mehr (DESIGN.md, Zusatz 45). Im Bildbereich gilt: `image` der Aktivität, dann die Illustration (`src/features/activities/illustrations.ts`, Regeln: `docs/design/ILLUSTRATIONEN.md`), dann die Farbfläche mit großem Symbol.
Heute zeigen drei Aktivitäten eine Illustration, alle anderen die Farbfläche. Die Illustrationen für alle Aktivitäten entstehen in M9b.

Zuordnung Kategorie → Symbol: nur in `src/features/activities/CategoryIcon.tsx` (`categoryIcons`, für Orte `placeVisualIcons`). Spielplatz und Bad gibt es seit M10b (siehe „Farben und Symbole der Orte“), Termine kommen mit M11 (Entscheidung 12).

## Bausteine und Besonderheiten (seit D2)

Neu im Theme: `card`, `selected`, `onSelected` (siehe Farbtabelle) sowie `iconSize.sm` (14, Häkchen im kleinen Kreis) und `iconSize.hero`
(160, großes angeschnittenes Symbol auf Platzhalter-Flächen). Alle Paare sind im Kontrasttest geprüft (`theme.test.ts`).

- **`Chip`:** nicht gewählt weiß (`card`) mit feinem Rand, gewählt Tinte (`selected`) mit hellem Text (`onSelected`). Optional `icon` (Linien-Symbol vor dem Text),
  `stacked` (Symbol über dem Text, als Kachel mit Radius `tile`, schmaler Rand und kleinere Schrift für schmale gleich breite Reihen wie die Energie auf dem Start),
  `accessibilityHint` und `style` (für Raster). Der Text darf umbrechen (`flexShrink`), nie abgeschnitten werden.
- **`Button`:** optional `icon` hinter dem Text (`iconFlipsInRTL` für Pfeile), `accessibilityHint`. Der **große Hauptknopf** trägt den warmen Schein
  (`shadow.primaryButton`), ein gesperrter nicht.
- **Symbole und Systemschrift:** Ionicons sind Schrift-Zeichen und wachsen mit der Systemschrift mit (die Skalierung bleibt an, nie `allowFontScaling={false}`).
  Zeichen in Kreisen wachsen deshalb mit (`fontScale` aus `useWindowDimensions`, Kinder-Kachel), dekorative Symbole
  teilen ihre Größe durch `fontScale` und bleiben so gleich groß (Stimmungsbild-Platzhalter, `MoodPlaceholder.tsx`).
- **Ergebnis (D3):** Der runde Zurück-Knopf (`ResultsHeader`) ist weiß mit feinem Rand und mindestens `size.touch` breit und hoch. Die feste Wetterzeile ist Sand (`surface`) mit einer kleinen weißen Pille „Ändern“.
  Die Kategorie-Pille auf dem Bildbereich ist weiß (`card`) mit Tinte darauf. Ein Bild bringt seine eigene Größe mit, deshalb haben Bilder auf Karten ausdrücklich Breite und Höhe 100 %.
- **Detailansicht (D4):** Details und alle Maße in `docs/detail.md`. Neue Bausteine: `BackButton` (der runde Zurück-Knopf, auch im Kopf von „Eure Ideen“), `Section` mit `large` (größere Überschrift),
  `CardMedia` mit `showPill={false}` (Bildbereich ohne Kategorie-Pille). **Abhak-Felder:** Zeile `size.checkbox` (56) hoch, Kästchen 32 px, Rand `icon` (mindestens 3:1 zu `card` und `background`, im Test geprüft, Entscheidung 17),
  abgehakt `selected` mit `onSelected`. **Hinweisboxen:** `warningSurface` mit `warning`, nie `danger` (kein Alarm-Rot). Es gibt keine neuen Theme-Werte.
- **Raster:** Breiten stehen nicht im Theme. Die Mindestbreiten für Kacheln und Chips und die Regeln für die Spalten liegen in
  `src/features/suggestions/startLayout.ts` (getestet).

## Schrift

Literata für Titel und Zahlen, Onest für Text und Bedienung (beides Google Fonts, OFL).

| Name in `fonts`   | Schnitt                | Einsatz                          |
| ----------------- | ---------------------- | -------------------------------- |
| `title`           | Literata SemiBold (600) | Titel und Überschriften          |
| `number`          | Literata Medium (500)   | Zahlen                           |
| `body`            | Onest Regular (400)     | Fließtext                        |
| `bodyMedium`      | Onest Medium (500)      | Bedienung, Chips                 |
| `bodyStrong`      | Onest SemiBold (600)    | Knöpfe, betonter Text            |

- Pakete: `@expo-google-fonts/literata`, `@expo-google-fonts/onest` (MIT, Schriften OFL) und `expo-font`.
  Eingebunden werden nur diese fünf Schnitte (Unterpfade wie `@expo-google-fonts/onest/400Regular`), das sind etwa 0,8 MB.
- In allen fünf Dateien geprüft: Umlaute und ß, Türkisch (ğ ş İ ı), Rumänisch (ă â î ș ț), das ukrainische Alphabet (є і ї ґ).
- **Nie `fontWeight` mit diesen Schriften.** Auf Android wählt `fontWeight` bei eigenen Schriften keinen Schnitt,
  sondern verfälscht ihn. Immer den passenden Namen aus `fonts` nehmen.
- **Die Systemschrift-Skalierung bleibt an.** Nie `allowFontScaling={false}` oder `maxFontSizeMultiplier` setzen,
  damit sich Menschen mit großer Schrift am Handy die App lesbar einstellen können. Höhen deshalb als `minHeight`.
- Arabisch (Noto Naskh Arabic) kommt mit der arabischen Übersetzung.

### Laden und Zeitlimit

`app/_layout.tsx` hält das Startbild fest (`SplashScreen.preventAutoHideAsync()` aus `expo-router`), bis `useAppFonts()`
meldet, dass die App starten darf. Das ist der Fall, wenn

1. alle Schriften geladen sind, **oder**
2. das Laden mit einem Fehler endet (Warnung in der Konsole), **oder**
3. das **Zeitlimit von 4 Sekunden** (`FONT_LOAD_TIMEOUT_MS` in `src/lib/fonts.ts`) abgelaufen ist.

In Fall 2 und 3 startet die App mit der Systemschrift. So springt beim Start nichts um, und es bleibt nie ein leerer Bildschirm.
Die 4 Sekunden: Die Dateien liegen in der fertigen App selbst, das Laden dauert Millisekunden. Nur im Entwicklungsmodus
(Expo Go) kommen sie über das Netzwerk, dort reichen 4 Sekunden auch bei langsamem WLAN. Länger soll niemand auf ein
Startbild schauen. Kommt die Schrift nach dem Zeitlimit doch noch, gilt sie erst ab dem nächsten Start: **Die ganze Sitzung bleibt bei der Systemschrift.**

Warum das wichtig ist (seit dem Pilot Illustrationen umgesetzt, vorher stand es nur hier): iOS merkt sich die gemessene Größe eines Textes
unter dem **Schriftnamen**, nicht unter der Schrift, die tatsächlich benutzt wurde. Wird ein Text gemessen, solange Onest noch nicht da ist,
gilt die Messung mit der schmaleren Systemschrift weiter. Wird er danach mit Onest gezeichnet, fehlt Platz: iOS schneidet die letzte Zeile
rechts ab und lässt die Zeile darunter weg. Deshalb liest `fonts` in `theme.ts` einen Schalter: Nach Zeitlimit oder Ladefehler schaltet
`useAppFonts` (`src/lib/fonts.ts`) vor dem ersten Text auf die Systemschrift (`fontFamily` leer), und das bleibt bis zum nächsten Start.
Die Namen der Schriftschnitte stehen in `fontFaces`. In der Konsole erscheint dazu eine Warnung. Geprüft in `src/lib/fonts.test.ts`.

**Beim Testen in Expo Go:** Nach einer Sitzung, in der die Schriften zu spät kamen, Expo Go ganz schließen (nicht nur neu laden). Der Speicher
der gemessenen Größen gehört zu Expo Go und kann ein Neuladen der App überstehen.

## Dunkelmodus

- Die Dunkelwerte (auch `card`, `selected`, `onSelected`) und `useTheme()` sind fertig. `useTheme()` folgt der Handy-Einstellung.
- **Eingeschaltet wird er erst in D5.** Bis dahin liefert `useTheme()` immer das helle Theme
  (Schalter `darkModeEnabled` in `src/lib/theme.ts`). Zwei Gründe:
  1. Die meisten Bildschirme nutzen noch den festen hellen `colors`-Export. Sonst gäbe es halb dunkle Bildschirme.
  2. `"userInterfaceStyle": "light"` in `app.json` hält Android nur mit `expo-system-ui` hell. Das haben wir nicht
     installiert (Android zeigt beim Bauen die Warnung „Install expo-system-ui“). Der Schalter ist also die einzige
     Stelle, die zuverlässig hell hält. Dasselbe gilt für `backgroundColor` in `app.json`, deshalb ist keines gesetzt.
- **Einschalten in D5:** `darkModeEnabled` auf `true`, den Test in `theme.test.ts` anpassen, in `app.json`
  `userInterfaceStyle` auf `"automatic"` stellen (oder ganz weglassen: Android folgt dem Handy ohnehin), alle Bildschirme in
  Hell und Dunkel prüfen. `expo-system-ui` ist dafür freigegeben (Entscheidung 19 in der DESIGN.md), aber nur, wenn es zum Einschalten
  wirklich nötig ist (z. B. für den Hintergrund beim Start). Dann kurz begründen, welches Problem es löst.

## App-Name

Der Name **Miki** ist vorläufig (CLAUDE.md, „Entscheidungen vor M12“). Die zentrale Stelle für alle sichtbaren Texte ist
`app.name` in `src/locales/de.json` und `en.json`. Folgende Stellen können keinen Text aus dem Code lesen und stehen
deshalb einzeln in den Dateien:

- `app.json`: `name`, `scheme` (Name in Kleinbuchstaben) und der englische Berechtigungstext beim Plugin `expo-location`
- `src/locales/native/de.json`: deutscher Berechtigungstext (iOS)

`src/lib/appName.test.ts` meldet jede Stelle, die bei einer Umbenennung noch fehlt. `slug` (`familienzeit-app`) und der
Repo-Name bleiben, sie hängen technisch an Expo und GitHub. **Bundle-ID und Paketname sind absichtlich nicht gesetzt**
(nach der Store-Veröffentlichung nicht mehr änderbar, Entscheidung vor M12).

## Logo und App-Icon

Es liegen noch keine Dateien unter `assets/`. Die DESIGN.md braucht dafür (Ablage unter `assets/`):

- das Logo „Zwei Bögen“ als SVG oder PNG, dazu eine einfarbige Variante
- das App-Icon als quadratisches PNG, mindestens 1024 × 1024 px
- für Android ein Vordergrundbild für das adaptive Icon (mit Rand, die Form wird zugeschnitten)

Sobald die Dateien da sind, werden Icon, adaptives Android-Icon und Startbild in `app.json` eingebunden
(Hintergrundfarbe Papier `#FAF6F0`). Zu sehen ist das erst in einer echten App-Version (Build), nicht in Expo Go.

## Offen für Ani

(Seit M10b: Ani ist nicht mehr beteiligt, Clemens entscheidet. Die Punkte bleiben offen, bis Clemens sie bestätigt.)

- Dunkelwerte bestätigen (alle außer Hintergrund, Text, Hauptfarbe; dazu `card` und `selected` im Dunkeln, und die Dunkelwerte der Orte).
- Entwürfe für Verlauf, „Wie war’s?“, Kinderprofile und Standort-Erklärung prüfen, sobald D5 sie aus dem Stil abgeleitet hat (Entscheidung 18).
- Eigene Symbole für Spielplatz und Burg (heute Platzhalter, siehe „Farben und Symbole der Orte“).

Entschieden und deshalb nicht mehr offen:

- Weiße Karten oder Sandkarten? **Weiße Karten** (Entscheidung 11).
- `border` hat nur 1,7:1 auf Papier. Der Rand der Abhak-Felder (D4) kommt deshalb aus der Palette mit mindestens 3:1 und wird im Test
  geprüft (Entscheidung 17). `border` bleibt zum Gliedern.
