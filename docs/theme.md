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
- Der feste Export `colors` (immer hell) gibt es nur, bis jeder Bildschirm umgestellt ist. Umgestellt sind bisher der Start (D2) und das Ergebnis mit dem Wetter-Schritt (D3);
  Detail (D4) sowie Verlauf und Kinderprofile (D5) folgen. Neue Bildschirme nehmen `useTheme()` oder `useThemedStyles`.
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

Die Karte ohne Foto zeigt eine **Farbfläche mit einem großen, dünnen, angeschnittenen Kategorie-Symbol** (und einem weichen großen Kreis).
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

### Kategorie-Fotos: Mindestzahl

Ein Kategorie-Foto erscheint auf den Karten **nur, wenn die Kategorie mindestens drei Fotos hat**: Konstante `minPhotosPerCategory` (heute **3**), sie steht nur in
`src/features/activities/categoryPhotoFiles.ts`. Hat eine Kategorie weniger, zeigen ihre Karten die Farbfläche mit Symbol (die Fotos bleiben in der Liste und im Ordner, sie werden nur nicht gezeigt).

- **Warum:** Mit einem oder zwei Fotos passt das Bild oft nicht zur Aktivität (Beispiel: ein Schachbrett bei der Kissenburg). Mit drei und mehr verteilen sich die Fotos, und ein einzelnes unpassendes fällt weniger auf.
- **Heute:** Natur (4 Fotos) und Kochen (3) zeigen Fotos. Basteln und Spiel (je 1), Bewegung, Experiment und Ausflug (je 0) zeigen die Farbfläche. Kommt das dritte Foto einer Kategorie dazu, erscheinen ihre Fotos ohne weitere Änderung (Ablauf: `docs/bildquellen.md`).
- **Vorrang bleibt:** Das `image` einer einzelnen Aktivität gilt weiterhin vor allem anderen und zählt bei der Mindestzahl nicht mit.
- **Geprüft** in `src/features/suggestions/cardImage.test.ts` (0, 1, 2 Fotos: Farbfläche; 3, 4, 7: Fotos; `image` gewinnt immer; jede Kategorie entscheidet für sich) und `categoryPhotos.test.ts` (diese Zahl steht in dieser Datei).
- `npm run photos:index` zeigt je Kategorie, ob sie die Mindestzahl erreicht.

Zuordnung Kategorie → Symbol: nur in `src/features/activities/CategoryIcon.tsx` (`categoryIcons`). Symbole für Spielplatz, Bad und Termine kommen erst mit M10 und M11 (Entscheidung 12).

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
  Die Kategorie-Pille auf dem Bildbereich ist weiß (`card`) mit Tinte darauf. Ein Foto bringt seine eigene Größe mit, deshalb haben Bilder auf Karten ausdrücklich Breite und Höhe 100 %.
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
Startbild schauen. Kommt die Schrift nach dem Zeitlimit doch noch, gilt sie ab dem nächsten Start (bereits gezeigter Text
wechselt nicht mitten in der Nutzung).

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

- Dunkelwerte bestätigen (alle außer Hintergrund, Text, Hauptfarbe; dazu `card` und `selected` im Dunkeln).
- Entwürfe für Verlauf, „Wie war’s?“, Kinderprofile und Standort-Erklärung prüfen, sobald D5 sie aus dem Stil abgeleitet hat (Entscheidung 18).

Entschieden und deshalb nicht mehr offen:

- Weiße Karten oder Sandkarten? **Weiße Karten** (Entscheidung 11).
- `border` hat nur 1,7:1 auf Papier. Der Rand der Abhak-Felder (D4) kommt deshalb aus der Palette mit mindestens 3:1 und wird im Test
  geprüft (Entscheidung 17). `border` bleibt zum Gliedern.
