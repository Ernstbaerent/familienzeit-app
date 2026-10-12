# Theme „Sonntagslicht“ (Design Stufe D1)

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
- Der feste Export `colors` (immer hell) gibt es nur, bis jeder Bildschirm umgestellt ist (D2 bis D5).
  Neue Bildschirme nehmen `useTheme()` oder `useThemedStyles`.
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
    Sicherheitsflächen aus den gerenderten Bildschirmen.
  - Der Kartenschatten nach Augenmaß (weich und kurz: etwa 4 px Versatz, 16 px Unschärfe, höchstens 10 % Abdunklung).
    Der warme Schein unter dem Hauptknopf ist ebenfalls nach Augenmaß.
- **abgeleitet:** von uns ergänzt, weil es im Design fehlt. Das sind alle Dunkelwerte außer Hintergrund, Text und Hauptfarbe.
  Sie haben denselben warmen Braunton und sind per Test auf AA geprüft. **Ani bestätigt sie noch.**

### Farben

| Name             | Hell      | Dunkel    | Zweck                                                              |
| ---------------- | --------- | --------- | ------------------------------------------------------------------ |
| `background`     | `#FAF6F0` | `#1C1714` | Papier, Grund                                                      |
| `surface`        | `#F0E6D8` | `#2A221D` | Sand: Karten und Flächen                                           |
| `text`           | `#2A211C` | `#F3EBE2` | Tinte: Text, Überschriften (14,6:1 auf Papier, 15,1:1 dunkel)      |
| `textMuted`      | `#6B5D53` | `#B8A99B` | Nebentext                                                          |
| `primary`        | `#B4532F` | `#E3825C` | Terrakotta: Hauptknöpfe, gewählte Chips                            |
| `onPrimary`      | `#FFFFFF` | `#1C1714` | Text auf `primary` (5,0:1 hell, 6,4:1 dunkel)                      |
| `secondary`      | `#5F7A5A` | `#8FA887` | Salbei: Zweitfarbe                                                 |
| `onSecondary`    | `#FFFFFF` | `#1C1714` | Text auf `secondary` (4,8:1 hell)                                  |
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
- Die in der DESIGN.md genannten Kontraste weichen minimal von der Rechnung ab (Tinte auf Papier 14,6 statt 15,4:1,
  dunkel 15,1 statt 14,9:1). Alle Paare bestehen AA, geprüft in `src/lib/theme.test.ts`.

### Eigene Ergänzungen und Abweichungen vom PDF

- Im PDF sind Karten und Chips **weiß** (`#FFFFFF`) mit Schatten, und gewählte Chips sind Tinte. Entschieden ist:
  **Karten und Flächen sind Sand** (`surface`), wie in der DESIGN.md. Es gibt deshalb **keine** Kartenfarbe Weiß.
  Weiß kommt nur als `onPrimary` und `onSecondary` vor (steht in der DESIGN.md: „mit weißem Text“).
  Braucht ein Bildschirm später doch Weiß, wird es hier als eigene Ergänzung eingetragen.
- Gewählte Chips bleiben in der Hauptfarbe (`primary`), wie schon vor dem Design.
- Die Schatten `shadow.card` und `shadow.primaryButton` sind da, aber noch nicht eingesetzt. Ob Sandkarten einen
  Schatten tragen, entscheidet D3.

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

- Die Dunkelwerte und `useTheme()` sind fertig. `useTheme()` folgt der Handy-Einstellung.
- **Eingeschaltet wird er erst in D5.** Bis dahin liefert `useTheme()` immer das helle Theme
  (Schalter `darkModeEnabled` in `src/lib/theme.ts`). Zwei Gründe:
  1. Die meisten Bildschirme nutzen noch den festen hellen `colors`-Export. Sonst gäbe es halb dunkle Bildschirme.
  2. `"userInterfaceStyle": "light"` in `app.json` hält Android nur mit `expo-system-ui` hell. Das haben wir nicht
     installiert (Android zeigt beim Bauen die Warnung „Install expo-system-ui“). Der Schalter ist also die einzige
     Stelle, die zuverlässig hell hält. Dasselbe gilt für `backgroundColor` in `app.json`, deshalb ist keines gesetzt.
- **Einschalten in D5:** `darkModeEnabled` auf `true`, den Test in `theme.test.ts` anpassen, in `app.json`
  `userInterfaceStyle` auf `"automatic"` stellen (oder ganz weglassen: Android folgt dem Handy ohnehin), alle Bildschirme in
  Hell und Dunkel prüfen. Ob dafür `expo-system-ui` nötig wird (z. B. für den Hintergrund beim Start), vorher mit Clemens klären,
  es wäre ein neues Paket.

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

- Dunkelwerte bestätigen (alle außer Hintergrund, Text, Hauptfarbe).
- `border` hat nur 1,7:1 auf Papier. Für Eingabefelder und Abhak-Felder (D4) braucht es einen kräftigeren Rand
  oder eine andere Erkennung.
- Weiße Karten oder Sandkarten? (siehe „Eigene Ergänzungen“)
