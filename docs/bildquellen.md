# Bildquellen

Diese Liste belegt die Herkunft jedes Fotos in `assets/images/categories/` (Regel aus `docs/design/DESIGN.md`, Abschnitt „Regeln für Fotos“):
Datei, Plattform, Link zur Foto-Seite, Fotograf, Lizenz, Abrufdatum und Prüfbefund. **Wer ein Foto hinzufügt oder ersetzt, trägt es hier ein.**
Dateinamen: `kategorie-nummer.jpg` (basteln, spiel, bewegung, experiment, natur, kochen, ausflug), etwa 1200 px breit, unter 300 KB.

**Text für den Info-Bildschirm** (Pixabay bittet um einen Hinweis zur Herkunft, Pflicht ist er laut Lizenz nicht; der Text kommt über
`src/locales` in die App): de „Bilder: Pixabay“, en „Images: Pixabay“.

**Lizenz:** [Pixabay Content License](https://pixabay.com/service/license-summary/), kostenlos auch für kommerzielle Nutzung, keine Pflicht zur
Namensnennung. Pixabay garantiert keine Einwilligungen abgebildeter Personen, deshalb gilt die Regel „keine erkennbaren Gesichter“.

**Prüfung:** Die Befunde stammen aus einer Sichtprüfung durch Claude Code am 12.10.2026 (Gesichter auch im Hintergrund, Marken, Logos,
Verpackungen, Text). **Vor der Beta schaut ein Mensch alle Fotos noch einmal durch.**

**Stand:** 9 Fotos (Natur 4, Kochen 3, Basteln 1, Spiel 1). Für **Bewegung**, **Experiment** und **Ausflug** gibt es noch kein Foto. **Erst einmal ganz ohne Fotos (DESIGN.md, Zusatz 36):**
Karten und Detailansicht zeigen Kategorie-Fotos erst, wenn die Kategorie mindestens `minPhotosPerCategory` Fotos hat (heute 99, `docs/theme.md`, „Kategorie-Fotos: Mindestzahl“). Heute zeigt also **keine** Kategorie ein Foto,
alle zeigen die Farbfläche mit Symbol (Rückfall laut DESIGN.md, Entscheidung 21). Die Fotos bleiben trotzdem hier und im Ordner; neue Fotos kommen später über M9b. Die Nummern dürfen Lücken haben (`kochen-3` fehlt).

**Neues Foto aufnehmen:** Datei als `kategorie-nummer.jpg` nach `assets/images/categories/` legen, hier eintragen und `npm run photos:index` laufen
lassen (erzeugt die Liste, die die App nutzt). Der Test `categoryPhotos.test.ts` meldet, wenn Datei, Liste und diese Tabelle nicht zusammenpassen.

| Datei | Plattform | Foto-Seite | Fotograf | Lizenz | Abrufdatum | Prüfbefund |
| --- | --- | --- | --- | --- | --- | --- |
| `basteln-1.jpg` | Pixabay | [Pixabay 1450300](https://pixabay.com/photos/hearts-clothespins-clothesline-hang-1450300/) | [congerdesign](https://pixabay.com/users/509903/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein. Bunt und frisch statt ruhig und warm, aufgebautes Stillleben. |
| `spiel-1.jpg` | Pixabay | [Pixabay 1511866](https://pixabay.com/photos/checkmate-chess-board-chess-board-1511866/) | [stevepb](https://pixabay.com/users/282134/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `natur-1.jpg` | Pixabay | [Pixabay 1698730](https://pixabay.com/photos/chestnut-autumn-spur-open-1698730/) | [NoName_13](https://pixabay.com/users/2364555/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `natur-2.jpg` | Pixabay | [Pixabay 2740751](https://pixabay.com/photos/chestnut-fall-buckeye-2740751/) | [Couleur](https://pixabay.com/users/1195798/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `natur-3.jpg` | Pixabay | [Pixabay 3193305](https://pixabay.com/photos/fall-fog-forest-tree-trunks-path-3193305/) | [jplenio](https://pixabay.com/users/7645255/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `natur-4.jpg` | Pixabay | [Pixabay 4591121](https://pixabay.com/photos/path-trees-autumn-fog-avenue-fall-4591121/) | [Peggychoucair](https://pixabay.com/users/1130890/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `kochen-1.jpg` | Pixabay | [Pixabay 943245](https://pixabay.com/photos/new-year-background-dough-cook-943245/) | [ClickerHappy](https://pixabay.com/users/324082/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `kochen-2.jpg` | Pixabay | [Pixabay 1181189](https://pixabay.com/photos/pasta-fettuccine-fresh-pasta-1181189/) | [Oldmermaid](https://pixabay.com/users/1999835/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
| `kochen-4.jpg` | Pixabay | [Pixabay 2132874](https://pixabay.com/photos/cooking-pies-vareniki-pelmeni-cook-2132874/) | [Daria-Yakovleva](https://pixabay.com/users/3938704/) | Pixabay Content License | 2026-10-12 | Gesichter: nein · Marken: nein · Text: nein |
