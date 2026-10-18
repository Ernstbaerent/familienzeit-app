# Theme „Sonntagslicht“ mit der Palette C (Design ab Stufe D1, Farben seit Entscheidung 55)

Das Design kommt aus `docs/design/DESIGN.md` und dem PDF im selben Ordner. Umgesetzt wird es in Stufen
(Roadmap D1 bis D5 in der CLAUDE.md). **D1** legte die Grundlagen: Theme, Schriften, App-Name und die drei
Bausteine `Button`, `Chip` und `Section`. Bildschirme sind erst ab D2 dran.

**Farb-Umstellung (DESIGN.md, Entscheidung 55):** Die Farben der Palette „Sonntagslicht“ (Terrakotta, Salbei, Honig) sind durch die **Palette C**
ersetzt: Leinen, Rosé, Petrol, Tinte. Aufbau, Layout, Schriften, Abstände und die **Namen** der Farbrollen im Theme sind unverändert (nichts bricht).
Ein paar Rollen haben deshalb einen Namen, der nicht mehr zur Farbe passt: `secondary` und `accent` sind jetzt Rosé (früher Salbei und Honig),
`primary` ist Petrol (früher Terrakotta). Die Rohwerte der Palette stehen in `src/lib/palette.ts` (ohne React Native, damit auch das Zeichnungs-Skript sie lesen kann).

## Wo was steht

| Datei                         | Inhalt                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `src/lib/palette.ts`          | die Rohfarben der Palette C, `mixColors`, die Zeichnungs-Palette (`illustrationPalette`) |
| `src/lib/theme.ts`            | Farben (hell, dunkel), Schatten, Schriftnamen und -größen, Abstände, Radien, Mindestgrößen, `useTheme()` |
| `src/lib/useThemedStyles.ts`  | Styles, die von hell/dunkel abhängen                                            |
| `src/lib/fonts.ts`            | Laden von Literata und Onest, Zeitlimit                                         |
| `src/lib/theme.test.ts`       | Kontraste beider Paletten (WCAG AA) und die Vorgaben aus der DESIGN.md          |
| `src/lib/appAssets.test.ts`   | Logo-Dateien, iOS-Icon ohne Alpha-Kanal, `app.json` (Icon, adaptives Icon, Startbild) |
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

Im Code steht an jedem Wert, woher er kommt:

- **Clemens:** von Clemens festgelegt: Leinen `#FCF8F2`, Rosé `#F4BEBB`, Petrol `#1A5D74`, Tinte `#12323D` und die gemessenen Kontraste (Petrol auf Leinen 6,9:1,
  Weiß auf Petrol 7,3:1, Tinte auf Leinen 12,8:1, Tinte auf Rosé, Petrol auf Rosé 4,5:1). Tinte auf Rosé rechnet der Test nach WCAG zu **8,3:1** (gemessen 8,4:1).
- **abgeleitet:** aus der Palette gemischt oder von uns ergänzt, weil es im Design fehlt (Nebentext, Rahmen, Symbole, Warnfarben, alle Dunkelwerte,
  die sieben Kategorie-Töne). Alle Paare sind per Test auf WCAG AA (Text 4,5:1, Symbole 3:1) geprüft.
- Unverändert aus dem alten Design: Radien 22/16/Pille, Schriften, Anleitungstext 20 px, Schrittabstand 28 px, Abhak-Felder 56 px, Tippflächen 44 pt,
  Schriftgrößen (aus dem PDF gemessen), der weiche kurze Kartenschatten (nur die Farbe ist Tinte statt Braun).

### Farben

| Name             | Hell      | Dunkel    | Zweck                                                              |
| ---------------- | --------- | --------- | ------------------------------------------------------------------ |
| `background`     | `#FCF8F2` | `#0C2630` | Leinen, Grund (dunkel: sehr dunkles Petrol)                         |
| `card`           | `#FFFFFF` | `#143642` | Karten, Kacheln, nicht gewählte Chips (Text darauf `text`)         |
| `surface`        | `#FAE7E2` | `#103039` | Rosé-Leinen (Leinen + 30 % Rosé): Flächen, Platzhalter, Nebenknöpfe (keine Karten) |
| `text`           | `#12323D` | `#FCF8F2` | Tinte: Text, Überschriften (12,8:1 auf Leinen; dunkel Leinen, 14,9:1) |
| `textMuted`      | `#47636D` | `#A9BDC2` | Nebentext (hell 6,1:1 auf Leinen, 6,4:1 Karte, 5,4:1 `surface`; dunkel 8,0:1, 6,6:1) |
| `primary`        | `#1A5D74` | `#F4BEBB` | Petrol: Hauptknopf und Links (Textfarbe nur mit Unterstreichung); dunkel Rosé |
| `onPrimary`      | `#FFFFFF` | `#0C2630` | Text auf `primary` (7,3:1 hell, 9,7:1 dunkel)                      |
| `secondary`      | `#F4BEBB` | `#F4BEBB` | Rosé: Pastellfläche                                                |
| `onSecondary`    | `#12323D` | `#0C2630` | Text auf `secondary`: **immer Tinte** (8,3:1), nie Weiß oder gedämpfter Text |
| `selected`       | `#12323D` | `#FCF8F2` | Tinte: gewählter Zustand von Chips und Kacheln                     |
| `onSelected`     | `#FCF8F2` | `#0C2630` | Text und Häkchen auf `selected` (12,8:1 hell, 14,9:1 dunkel)       |
| `accent`         | `#F4BEBB` | `#F4BEBB` | Rosé: nur kleine Formen, nie Text                                  |
| `border`         | `#CDD0CE` | `#2E5360` | Linien zum Gliedern (hell 1,5:1, dunkel 1,9:1)                     |
| `danger`         | `#6B2F12` | `#EFA582` | Löschen, Fehler, Sicherheit: dunkler Ton der warmen Warnfamilie    |
| `dangerSurface`  | `#F5E0D3` | `#3A2418` | Fläche für Sicherheitsboxen (mit Rand in `danger`)                 |
| `warning`        | `#7A4A12` | `#F2C27B` | Aufpassen, z. B. Wetterwarnung: warme Funktionsfarbe (Honig/Braun) |
| `warningSurface` | `#F8E8CC` | `#3A2C1A` | Fläche für Hinweisboxen, z. B. Allergene (mit Rand in `warning`)   |
| `icon`           | `#538494` | `#A9BDC2` | Symbole, Rand der Abhak-Felder (hell 4,1:1 auf Karte, 3,9:1 auf Leinen) |

### Kontraste (geprüft in `src/lib/theme.test.ts`)

Text (mindestens 4,5:1), hell: `text` auf Leinen 12,8:1, `surface` 11,4:1, Karte 13,6:1; `textMuted` auf Leinen 6,1:1, `surface` 5,4:1, Karte 6,4:1; `onSelected` auf `selected` 12,8:1;
`onPrimary` auf Petrol 7,3:1; `onSecondary` auf Rosé 8,3:1; `primary` als Text auf Leinen 6,9:1, Karte 7,3:1, `surface` 6,1:1; `danger` auf Leinen 9,7:1, auf `dangerSurface` 8,1:1;
`warning` auf Leinen 7,0:1, auf `warningSurface` 6,2:1, auf Karte 7,5:1; `text` auf `warningSurface` 11,2:1. Dunkel: `text` auf Grund 14,9:1, Karte 12,1:1; `textMuted` 8,0:1 und 6,6:1;
`onPrimary` auf Rosé 9,7:1; Rosé als Text auf Grund 9,7:1, Karte 7,9:1; `danger` und `warning` auf ihren Flächen 7,2:1 und 8,2:1.
Symbole und Bedienelemente (mindestens 3:1): `icon` auf Leinen 3,9:1, `surface` 3,5:1, Karte 4,1:1; `selected` auf Karte 13,6:1.

Regeln, die aus den Kontrasten folgen:

- **Rosé (`secondary`, `accent`) nie für Text, und nur Tinte darauf.** Gedämpfter Text kommt auf Rosé nur auf 3,6:1, Weiß schafft kein AA. Petrol auf Rosé hat 4,5:1 (nur grenzwertig, deshalb nicht für kleinen Text).
- **Rosé auf Leinen hat nur 1,5:1.** Rosé-Flächen und `surface` brauchen deshalb einen feinen Rand oder genug Fläche, um sich abzusetzen. Auch die Warn- und Sicherheitsboxen
  (`warningSurface` auf Leinen nur 1,1:1) tragen einen Rand in ihrer Textfarbe.
- **Petrol (`primary`) ist der Hauptknopf (Weiß darauf) und die Farbe der Links** (Text in Petrol, immer unterstrichen, nie die Farbe allein, Entscheidung 55). Als Rand, Häkchen oder Chip-Farbe ist Petrol nicht erlaubt (Entscheidung 11).
- **`border` gliedert nur.** Mit 1,5:1 reicht er nicht als einziges Merkmal eines Bedienelements (WCAG 1.4.11 verlangt 3:1). Bedienelemente erkennt man an Fläche, Text und Symbol.
- **Karten sind weiß (`card`), `surface` ist für Flächen.** Auf `card` hat `text` 13,6:1 und `textMuted` 6,4:1. Weiß auf Leinen setzt sich nur schwach ab: Der Kartenschatten
  (`shadow.card`, Farbe Tinte) trägt das. **Zu prüfen in der Sichtprüfung auf Android:** Wirkt der Schatten zu schwach, darf ein hauchfeiner Rand in einem hellen Petrol-Ton dazukommen
  (Entscheidung von Clemens; Stand der Sichtprüfung: `docs/farbumstellung/README.md`).
- **Warm ist nur eine Funktionsfarbe:** `warning` und `danger` für Allergen-, Sicherheits- und Wetterwarn-Boxen. Gefahr (`danger`) ist ein dunkleres Braunrot der selben Familie, die Unterscheidung
  zu `warning` läuft über Symbol und Titel, nicht über die Farbe allein. Honig und Braun der Zeichnungen (unten, „Zeichnungs-Palette“) sind **keine** Farben der App-Oberfläche (Test).

### Eigene Ergänzungen und Abweichungen vom PDF

- **Karten sind weiß** (`card`), `surface` ist für Flächen (Entscheidung 11, in Entscheidung 55 bestätigt). Den Dunkelwert (`#143642`, abgeleitet) bestätigt Clemens noch.
- **Gewählter Zustand von Chips und Kacheln ist Tinte** (`selected` mit `onSelected`), nicht der Hauptknopf (Entscheidung 11, 23 und 55).
- `shadow.card` und `shadow.primaryButton` gibt es. `shadow.primaryButton` trägt der große Hauptknopf auf dem Start (Schein in Petrol, nach Augenmaß).
  `shadow.card` tragen die Ergebniskarten (`SuggestionCard`) und die Kartenkästen des Wetter-Schritts (`WeatherCard`) (Farbe Tinte, 8 %); die Kinder-Kacheln auf dem Start haben nur einen feinen Rand.

### Kategorie-Farben (Entscheidung 10, seit Entscheidung 55 mit der Palette C)

Die Karte ohne Bild zeigt eine **Farbfläche mit einem großen, dünnen, angeschnittenen Kategorie-Symbol** (und einem weichen großen Kreis).
Jede Kategorie hat ihren eigenen Ton. **Es gibt keine neuen Farbtöne:** Alle Werte werden in `src/lib/theme.ts` aus den Farben der Palette
**gemischt** (`categoryTones`, Funktion `mixColors`), nicht von Hand eingetragen. Drei Farbtöne und Leinen reichen nicht für sieben klar verschiedene Flächen
(Entscheidung von Clemens: **Alternative A**): **Symbol und Name in der weißen Pille tragen den Unterschied**, die Farbe ist nie das einzige Merkmal.

Rezept: **Fläche** = Leinen mit einem Anteil Rosé oder Petrol (bei Experiment Rosé mit Petrol, bei Ausflug Rosé mit etwas Petrol). **Symbol** = die Palettenfarbe, zur Tinte
hin abgedunkelt. **Kreis** = die Fläche, mit Weiß aufgehellt (im Dunkeln mit Leinen). **Kochen** ist die klare Petrol-Fläche mit Leinen-Symbol.

| Kategorie (Schlüssel)    | Palettenfarbe          | Fläche (hell) | Symbol (hell) | Kreis (hell) | Fläche (dunkel) | Symbol (dunkel) | Kreis (dunkel) |
| ------------------------ | ---------------------- | ------------- | ------------- | ------------ | --------------- | --------------- | -------------- |
| Basteln (`craft`)        | Rosé, hell             | `#F8D8D4` | `#19576C` | `#FBEAE7` | `#3F474F` | `#F4BEBB` | `#4E555C` |
| Bewegung (`movement`)    | Rosé, voll             | `#F4BEBB` | `#174E61` | `#F9DBDA` | `#696368` | `#F6CAC6` | `#756F73` |
| Spiel (`game`)           | Petrol, hell           | `#DCE2E0` | `#1A5D74` | `#ECEFEE` | `#134252` | `#96B2B9` | `#26515F` |
| Natur (`nature`)         | Petrol, kräftiger      | `#B8CACC` | `#185266` | `#D8E2E3` | `#175266` | `#A2BAC0` | `#295F71` |
| Ausflug (`outing`)       | Rosé mit etwas Petrol  | `#DDCCCB` | `#1A5D74` | `#ECE3E2` | `#415762` | `#F5C4C1` | `#50646E` |
| Experiment (`experiment`) | Rosé-Petrol, dunkel   | `#A89CA2` | `#164556` | `#CFC9CC` | `#365B6A` | `#F4BEBB` | `#466875` |
| Kochen (`cooking`)       | Petrol, klar           | `#598897` | `#FCF8F2` | `#A4BEC6` | `#1A5D74` | `#FCF8F2` | `#2C697E` |

Kontraste (geprüft in `src/lib/theme.test.ts`, für alle sieben Kategorien, hell und dunkel):

- **Symbol auf der Fläche mindestens 3:1** (hell zwischen 3,7:1 und 6,0:1, dunkel zwischen 4,0:1 und 6,9:1). Das Symbol ist Dekoration, die Prüfung hält es trotzdem gut sichtbar.
- **Tinte (`text`) auf der Fläche mindestens 4,5:1** (hell 5,1:1 bis 10,3:1, dunkel 5,5:1 bis 10,3:1). **Ausnahme: Kochen im Hellen** (3,5:1): Die tiefe Fläche kann Tinte und Leinen nicht mit 4,5:1 tragen,
  und es steht kein Text darauf (der Name steht in der **weißen Pille**, `card`, Tinte darauf 13,6:1); dort gilt 3:1.
- Alle sieben Flächen sind verschieden, aber **nicht alle auf den ersten Blick**: Der kleinste Farbabstand (ΔE, CIE76) zwischen zwei Flächen ist bei Basteln und Ausflug etwa 8, bei den anderen größer. Die Pille mit Name und das Symbol machen den Unterschied.
- Ein Test prüft, dass jeder berechnete Wert in dieser Tabelle steht. **Ändert sich ein Rezept in `theme.ts`, die Tabelle hier anpassen** (der Test meldet dann die Werte, die fehlen).
- Der Dunkelmodus ist vorbereitet, bleibt aber bis D5 aus (die Dunkelwerte sind abgeleitet und werden von Clemens bestätigt).

### Farben und Symbole der Orte (seit M10b, Farben seit Entscheidung 55 ohne eigene Töne)

Orte aus OpenStreetMap erscheinen seit M10b auf denselben Karten wie die Aktivitäten (Farbfläche mit großem Symbol, Pille mit der Unterart, z. B. „Hallenbad“).
Sieben **Bildgruppen** haben ein eigenes Symbol. **Eigene Farben haben sie seit Entscheidung 55 nicht mehr** (Entscheidung von Clemens): Jede Bildgruppe nimmt den Ton einer Aktivitäts-Kategorie.
Alle anderen Unterarten nahmen schon vorher Ton und Symbol einer Aktivitäts-Kategorie (Zuordnung `visual` in `src/features/places/placeKinds.ts`): Park, See, Teich, Rastplatz, Naturschutzgebiet → Natur;
Indoorspielplatz, Trampolin-, Kletterhalle, Eisbahn → Bewegung; Freizeitpark, Aussichtsturm, Aussichtspunkt, Sehenswürdigkeit → Ausflug; Minigolf, Bowling → Spiel. Aquarium nimmt den Zoo, Ruine die Burg.

| Bildgruppe → Ton der Kategorie | Symbol |
| --- | --- |
| `playground` → `movement` (Spielplatz) | `balloon-outline` (Platzhalter) |
| `pool` → `nature` (Bad) | `water-outline` |
| `museum` → `craft` (Museum) | `library-outline` (Gebäude mit Säulen) |
| `zoo` → `outing` (Zoo) | `paw-outline` |
| `castle` → `experiment` (Burg) | `flag-outline` (Platzhalter) |
| `cinema` → `game` (Kino) | `film-outline` |
| `library` → `cooking` (Bibliothek) | `book-outline` |

- **Kontraste:** dieselben wie bei der Kategorie (Tabelle oben), geprüft in `src/lib/theme.test.ts`. Die Zuordnung steht in `theme.ts` (`placeToneCategory`); der Test hält diese Tabelle fest.
- **Platzhalter:** Für Spielplatz und Burg hat Ionicons kein passendes Symbol. Luftballon und Fahne sind Platzhalter, bis es eigene Symbole gibt (Entscheidung von Clemens, M10b).
  Ändern: nur `placeVisualIcons` in `src/features/activities/CategoryIcon.tsx`.
- Das Symbol für Termine kommt mit M11.

### Bilder auf Karten und in der Detailansicht

Es gibt keine Kategorie-Fotos mehr (DESIGN.md, Zusatz 45). Im Bildbereich gilt: `image` der Aktivität (gezeichnet, aus Supabase Storage, Regeln: `docs/design/ILLUSTRATIONEN.md`), sonst die Farbfläche mit großem Symbol.
Gebündelte Zeichnungen gibt es seit M9b nicht mehr; der Bilder-Lauf zeichnet die Titelbilder für alle Aktivitäten (`docs/bilder-plan.md`).

**Zeichnungs-Palette:** Zeichnungen haben eine eigene feste Palette (Leinen, Rosé, Petrol, Tinte plus Honig und Braun als warme Gegenstandsfarben, `illustrationPalette` in `src/lib/palette.ts`, Werte und Kontraste in `docs/design/ILLUSTRATIONEN.md`).
Bausteine und Szenen haben Farbplätze, der Zeichner des Baukastens setzt die Werte ein (`docs/bausteine/README.md`). Honig und Braun gelten nur für Gegenstände in Zeichnungen, nie für Flächen der App.

Zuordnung Kategorie → Symbol: nur in `src/features/activities/CategoryIcon.tsx` (`categoryIcons`, für Orte `placeVisualIcons`). Spielplatz und Bad gibt es seit M10b (siehe „Farben und Symbole der Orte“), Termine kommen mit M11 (Entscheidung 12).

## Bausteine und Besonderheiten (seit D2)

Neu im Theme: `card`, `selected`, `onSelected` (siehe Farbtabelle) sowie `iconSize.sm` (14, Häkchen im kleinen Kreis) und `iconSize.hero`
(160, großes angeschnittenes Symbol auf Platzhalter-Flächen). Alle Paare sind im Kontrasttest geprüft (`theme.test.ts`).

- **`Chip`:** nicht gewählt weiß (`card`) mit feinem Rand, gewählt Tinte (`selected`) mit hellem Text (`onSelected`). Optional `icon` (Linien-Symbol vor dem Text),
  `stacked` (Symbol über dem Text, als Kachel mit Radius `tile`, schmaler Rand und kleinere Schrift für schmale gleich breite Reihen wie die Energie auf dem Start),
  `accessibilityHint` und `style` (für Raster). Der Text darf umbrechen (`flexShrink`), nie abgeschnitten werden.
- **`Button`:** optional `icon` hinter dem Text (`iconFlipsInRTL` für Pfeile), `accessibilityHint`. Der **große Hauptknopf** trägt den Petrol-Schein
  (`shadow.primaryButton`), ein gesperrter nicht.
- **Symbole und Systemschrift:** Ionicons sind Schrift-Zeichen und wachsen mit der Systemschrift mit (die Skalierung bleibt an, nie `allowFontScaling={false}`).
  Zeichen in Kreisen wachsen deshalb mit (`fontScale` aus `useWindowDimensions`, Kinder-Kachel), dekorative Symbole
  teilen ihre Größe durch `fontScale` und bleiben so gleich groß (Stimmungsbild-Platzhalter, `MoodPlaceholder.tsx`).
- **Ergebnis (D3):** Der runde Zurück-Knopf (`ResultsHeader`) ist weiß mit feinem Rand und mindestens `size.touch` breit und hoch. Die feste Wetterzeile ist `surface` (Rosé-Leinen, mit feinem Rand) mit einer kleinen weißen Pille „Ändern“.
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

## Logo, App-Icon und Startbild (Entscheidung 55)

Die Dateien liegen unter `assets/logo/` (PNG; aus dem Projektordner dorthin verschoben und kürzer benannt):

| Datei | Inhalt | Einsatz |
| --- | --- | --- |
| `app-icon.png` | 1024 × 1024, Leinen-„m“ auf Petrol, **RGB ohne Alpha-Kanal** (Apple lehnt Icons mit Alpha ab, Test in `src/lib/appAssets.test.ts`) | `icon` in `app.json` |
| `android-foreground.png` | 1024 × 1024, Leinen-„m“, durchsichtig, mit Rand für die Zuschneideform | adaptives Android-Icon, Hintergrund `#1A5D74` |
| `android-monochrome.png` | 1024 × 1024, einfarbig | Android 13 Themen-Icon |
| `wordmark-petrol.png`, `wordmark-linen.png` | Wortmarke „miki“, 2398 × 1267 | Start: Petrol auf hellem, Leinen auf dunklem Grund (der Start wählt nach `scheme`) |
| `logo-petrol.png`, `logo-linen.png` | Wortmarke mit „MIT KINDERN“, 2398 × 1702 | Startbild (Petrol auf Leinen); Leinen für ein dunkles Startbild (D5) |

- **`app.json`:** `icon`, `android.adaptiveIcon` (Vordergrund, Monochrom, `backgroundColor` Petrol) und das Plugin `expo-splash-screen` (Logo „mit Kindern“ in Petrol, 200 breit, `contain`, Hintergrund Leinen).
  Bundle-ID und Paketname bleiben ungesetzt (Entscheidung vor M12).
- **Neues Paket `expo-splash-screen` (~57.0.10, von Clemens freigegeben):** Seit SDK 55 wird das Startbild über dieses Plugin eingestellt; der Schlüssel `splash` in `app.json` gilt nur noch für das Web.
  Die Version ist die von SDK 57 erwartete (`bundledNativeModules.json`). Prüfen mit `npx expo install --check`.
- **Start:** Die Wortmarke ersetzt den Text „miki“ (`StartScreen`, `expo-image`, 76 × 40; im Dunkeln die Leinen-Datei). Für die Sprachausgabe heißt sie „Miki“ (aus `app.name`, Bildrolle).
- **Was in Expo Go zu sehen ist:** die Wortmarke auf dem Start und alle Farben. **Nicht** zu sehen sind App-Icon, adaptives Android-Icon, Themen-Icon und das Startbild: Expo Go zeigt sein eigenes Icon und
  sein eigenes Startbild. Das sieht man erst in einem echten Build (EAS oder `npx expo prebuild`). Bis dahin prüft `appAssets.test.ts` nur Dateien und Verdrahtung.
- **Dunkelmodus (D5):** Das dunkle Startbild (`dark` im Plugin, Leinen-Logo auf `#0C2630`) wird erst mit D5 eingebunden (die Leinen-Wortmarke auf dem Start ist schon vorbereitet, sie erscheint, sobald der Dunkelmodus an ist): Das native Startbild folgt der Handy-Einstellung,
  die App bleibt bis D5 hell, sonst gäbe es ein dunkles Startbild vor einer hellen App.

## Offen für Ani

(Seit M10b: Ani ist nicht mehr beteiligt, Clemens entscheidet. Die Punkte bleiben offen, bis Clemens sie bestätigt.)

- Dunkelwerte bestätigen (alle Dunkelwerte sind abgeleitet; sie werden im Test auf Kontrast geprüft, eingeschaltet wird der Dunkelmodus in D5).
- Entwürfe für Verlauf, „Wie war’s?“, Kinderprofile und Standort-Erklärung prüfen, sobald D5 sie aus dem Stil abgeleitet hat (Entscheidung 18).
- Eigene Symbole für Spielplatz und Burg (heute Platzhalter, siehe „Farben und Symbole der Orte“).

Entschieden und deshalb nicht mehr offen:

- Weiße Karten oder Sandkarten? **Weiße Karten** (Entscheidung 11).
- `border` hat nur 1,7:1 auf Papier. Der Rand der Abhak-Felder (D4) kommt deshalb aus der Palette mit mindestens 3:1 und wird im Test
  geprüft (Entscheidung 17). `border` bleibt zum Gliedern.
