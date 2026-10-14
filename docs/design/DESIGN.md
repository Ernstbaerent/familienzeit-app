Miki – Design

Stand: Oktober 2026. Quelle: PDF „Runde 1 · Drei Richtungen und Logo für Miki" aus Claude Design (liegt im selben Ordner). Die Werte sind aus dem PDF übernommen, nichts ist dazuerfunden.

Gewählte Richtung: A „Sonntagslicht" (warm; das PDF zeigt Fotos, in der App ersetzen gezeichnete Bilder sie, Zusatz 45) Gewähltes Logo: A1 „Zwei Bögen" Name: Miki steht für „Mit Kindern". Wortmarke kleingeschrieben: miki, darunter optional die Zeile „mit Kindern".

Richtung B „Stille Wiese" und Richtung C wurden nicht gewählt. Ihre Werte stehen nur noch im PDF.

So nutzt Claude Code diese Datei
Es wird nur Richtung A umgesetzt.
Werte kommen in src/lib/theme.ts. Die Lint-Regel gegen feste Farben, Größen und Abstände bleibt bestehen. Die Namen der Theme-Werte legt Claude Code fest, die Rollen stehen in den Tabellen unten.
Funktionen, die es in der App noch nicht gibt, werden nicht still mitgebaut. Sie stehen im Abschnitt „Abweichungen vom heutigen Stand". Vorher nachfragen.
Widersprüche zu den Regeln in der CLAUDE.md (Mehrsprachigkeit, Rechts-nach-links, Datenschutz) melden, nicht eigenmächtig lösen.
Gefühl

Wie ein heller Samstagmorgen am Küchentisch: warmes Licht, echte Momente, nichts Inszeniertes. Große Bilder tragen die Stimmung (im PDF Fotos, in der App gezeichnete Illustrationen, Zusatz 45), die Oberfläche tritt bescheiden zurück. Ruhig und warm, keine Punkte, Abzeichen oder Serien, genau drei Karten, ein Hauptknopf.

Vorgaben für alle Bildschirme
Tippflächen mindestens 44 pt.
Anleitungstext 20 px.
Textkontraste nach WCAG AA (die Werte stehen an den Farben).
Alle Schriften sind Google Fonts (OFL) mit „Latein erweitert" (Türkisch, Rumänisch) und Kyrillisch (Ukrainisch). Arabisch läuft über eine passende Partnerschrift.
Layouts mit logischen Abständen (Anfang/Ende statt links/rechts), damit Rechts-nach-links (Arabisch) funktioniert.
Symbole: gleicher Linienstil, 1,75 px Linie auf 24er-Raster, runde Enden (umgesetzt mit Ionicons, nur Outline, kein eigener Symbolsatz, siehe Entscheidung 20). Kategorien: Basteln, Spiele, Bewegung, Experimente, Natur, Kochen, Ausflüge, Spielplatz, Bad, Termine.
Hell als Standard, Dunkelmodus als Variante (folgt der Handy-Einstellung).
Beispielsituation im PDF: Samstag 13:10, zwei Kinder (4 und 13 Jahre), 1 Std, Energie „normal", Regen ab 15 Uhr. Orte und Veranstaltungen im PDF sind erfunden.
Farben (hell)
Rolle	Name	Wert	Hinweis
Hintergrund	Papier	
#FAF6F0	Grund
Text	Tinte	
#2A211C	15,4:1
Hauptfarbe (Knöpfe)	Terrakotta	
#B4532F	mit weißem Text 5,0:1
Karten	Weiß	
#FFFFFF	Karten, Kacheln, nicht gewählte Chips (Text darauf Tinte)
Flächen	Sand	
#F0E6D8	Flächen, Streifen, Platzhalter, Nebenknöpfe (keine Karten)
Zweitfarbe	Salbei	
#5F7A5A	mit weißem Text 4,8:1
Akzent	Honig	
#E8A94F	nur Akzent, nie für Text
Farben (Dunkelmodus)
Rolle	Wert	Hinweis
Hintergrund	
#1C1714	
Text	
#F3EBE2	14,9:1
Hauptfarbe (Knöpfe)	
#E3825C	mit dunkler Schrift 6,4:1
Schrift
Literata für Titel und Zahlen, Onest für Text und Bedienung.
Arabisch: Noto Naskh Arabic (kommt mit der arabischen Übersetzung).
Beispiel Titel: „Was machen wir heute?". Beispiel Wetterzeile: „Bewölkt, Regen ab 15 Uhr · 11 °C".
Ecken

Karte 22, Knopf Pille (vollständig rund), Kachel 16.

Bildsprache

Stimmung der Bilder: Warm, ruhig, wie mit dem Stift auf Papier gezeichnet, nichts ist aufgeräumt-perfekt. Die Stilregeln stehen in docs/design/ILLUSTRATIONEN.md. (Das PDF zeigt Fotos mit natürlichem Tageslicht; die App verwendet keine Fotos, Zusatz 45.)

Ohne Bild (Rückfall, solange eine Aktivität weder ein eigenes Bild noch eine Illustration hat): ruhige Farbfläche mit großem, dünnem Kategorie-Symbol, angeschnitten. Gleiche Kartenform, gleiche Höhe wie die Karte mit Bild. Diese Karte muss genauso hochwertig aussehen wie die mit Bild.

Bilder (seit Zusatz 45)

Es gibt keine Stock-Fotos mehr. Bilder werden selbst gezeichnet (SVG), die Regeln dafür stehen in docs/design/ILLUSTRATIONEN.md (Format, Linie, Farben, Figuren, Sicherheit). Vor der Beta schaut ein Mensch einmal alle Illustrationen durch (wie bei den Aktivitäten).

Das Datenmodell der Aktivität hat ein freiwilliges Bildfeld (image), es bleibt eine Web-Adresse (nur von unserem eigenen Speicher, Zusatz 35). Im Bildbereich der Karte und der Detailansicht gilt dieser Vorrang: 1. image der Aktivität, 2. Illustration der Aktivität (src/features/activities/illustrations.ts), 3. Farbfläche mit Symbol (Entscheidung 21, geändert durch Zusatz 45). Die Illustrationen für alle Aktivitäten entstehen in M9b.

Logo A1 „Zwei Bögen"

Das „m" hat einen großen und einen kleinen Bogen: Erwachsene und Kind nebeneinander, zugleich zwei Hügel. Eigene Linien-Schrift, kleingeschrieben. Darunter die Zeile „mit Kindern" (im PDF in Großbuchstaben).

Varianten: Farbe, einfarbig, dunkel. Kleinste Größen im PDF: 29 px und 20 px, das Logo muss dort lesbar bleiben.
Dateien werden gebraucht: Das Logo ist im PDF nur ein Bild. Für die App braucht es das Logo als SVG oder PNG, das App-Icon als quadratisches PNG (mindestens 1024 × 1024) und eine einfarbige Variante. Ablage unter assets/.
Das App-Icon und das Startbild sind in Expo Go nicht zu sehen, erst in einer echten App-Version (Build).
Bildschirme
Start mit Auswahl: Die Auswahl (Kinder, Zeit, Energie) sitzt direkt auf dem Start, ein Tipp bis zu den Vorschlägen. Vorbelegt sind nur die zuletzt gewählten Kinder, Zeit und Energie nicht (Entscheidung 4).
Ergebnis (volle Scrollhöhe): Das Wetter steht als feste Zeile unter der Navigation. Die dritte Karte hat im PDF kein Foto: gleiche Form, Farbfläche plus großes Liniensymbol.
Detail (volle Scrollhöhe): Schritte in 20 px mit 28 px Abstand, Abhak-Felder 56 px hoch (beim Material „Das braucht ihr“, Entscheidung 13). Der Hauptknopf bleibt beim Scrollen fest am unteren Rand.
In der Nähe: Warmer, gedämpfter Kartenstil. Pins rund, mit Kategorie-Farbe. Der gewählte Ort hat eine Beschriftung, die Liste liegt als Blatt darunter. Gehört zu M10d (eigener Schritt nach M10a Import, M10b Vorschläge und M10c Detailansicht, Vorschlag in docs/orte.md) und wird erst dort gebaut.
Abweichungen vom heutigen Stand der App

Heutiger Ablauf: Start mit Hauptknopf „Was machen wir?" → Auswahl (Kinder, Zeit, Energie) → Ergebnis mit drei Karten → Detail → „Das machen wir" → „Fertig" → „Wie war's?" → Verlauf. Folgendes im PDF weicht ab oder ist neu. Alle Punkte sind inzwischen entschieden (Abschnitt „Entscheidungen“ unten). Die Tabelle zeigt den Stand:

Punkt	Vorschlag
Auswahl direkt auf dem Start statt eigener Bildschirm	Übernommen (Nr. 1). Ein Tipp bis zu den Vorschlägen unterstützt das 30-Sekunden-Prinzip. Kinderliste und Verlauf-Link bleiben auf dem Start erreichbar. Stufe D2.
Abhak-Felder bei den Schritten der Anleitung	Übernommen, aber beim Material („Das braucht ihr“), nicht bei den Schritten (Nr. 13). Nur auf dem Bildschirm, nicht gespeichert.
Knopf „Anleitung starten" im PDF	Der Name aus der App bleibt: „Das machen wir“ (Nr. 14).
„Keine passt? Drei neue Ideen"	Ersetzt „Andere Vorschläge“, der Durchlauf mit Hinweis bleibt (Nr. 8).
Text „Ohne Konto. Ohne Tracking." auf dem Start	Ersetzt durch: de „Kein Konto nötig. Deine Daten bleiben auf deinem Handy.“, en „No account needed. Your data stays on your phone.“ Nicht „Ohne Tracking“ (Nr. 5).
Stimmungsbild auf dem Start	Platzhalter: Sandfläche mit großem, dünnem Sonnen-Symbol (Nr. 6), bis ein gezeichnetes Bild da ist (Zusatz 45).
Kartenansicht „In der Nähe"	Erst mit M10d (nach M10a Import, M10b Vorschläge, M10c Detailansicht). Jetzt nicht bauen.
Aktivitäten haben bisher kein Foto	Vorrang auf der Karte: image der Aktivität, dann Illustration, dann Farbfläche mit Symbol (Nr. 21, geändert durch Zusatz 45). Illustrationen kommen schrittweise dazu (M9b).
Entscheidungen
Stand: 12. Oktober 2026. Clemens (Technik) hat die Fragenliste von Claude Code beantwortet. Die Entscheidungen gelten ab sofort und gehen widersprechenden Stellen in dieser Datei und im PDF vor. Die Nummern werden in CLAUDE.md, docs/theme.md und im Code als Verweis benutzt.

Stufe D2 (Start und Auswahl)
1. Die Auswahl (Kinder, Zeit, Energie) sitzt direkt auf dem Start. Der alte Auswahl-Bildschirm entfällt.
2. Ein Kind bearbeitet man über ein Stift-Symbol an der Kachel (mindestens 44 pt, mit Beschriftung für die Sprachausgabe). Ein Tipp auf die Kachel wählt das Kind aus oder ab. Dazu gibt es eine Kachel „Kind hinzufügen“.
3. Energie ist freiwillig und ohne Vorbelegung.
4. Gemerkt werden nur die gewählten Kinder, lokal auf dem Gerät und versioniert. Gelöschte Kinder fliegen aus der Auswahl. Zeit und Energie werden nicht gemerkt.
5. Text auf dem Start: de „Kein Konto nötig. Deine Daten bleiben auf deinem Handy.“, en „No account needed. Your data stays on your phone.“ Nicht „Ohne Tracking“.
6. Stimmungsbild-Platzhalter: sandfarbene Fläche mit großem, dünnem, angeschnittenem Sonnen-Symbol. Für die Sprachausgabe als Dekoration markiert.
7. Das Wetter kommt erst nach dem Tipp auf den Hauptknopf. Ist die Standort-Erlaubnis schon da, darf das Wetter beim Öffnen vorgeladen werden. Die Erlaubnis wird beim Öffnen nie neu erfragt.

Stufe D3 (Ergebnis mit Karten)
8. „Keine passt? Drei neue Ideen“ / „None of these? Three new ideas“ ersetzt „Andere Vorschläge“. Der Durchlauf mit Hinweis bleibt.
9. Der Kopf hat einen runden Zurück-Knopf, kein Mischen-Symbol.
10. Jede Kategorie hat eine eigene Farbe, abgetönt aus der Palette, mit Kontrastprüfung im Test.
11. Karten sind weiß (`card`), Sand ist für Flächen (Farbtabelle oben berichtigt). Gewählter Zustand von Chips: Tinte. Terrakotta nur für den Hauptknopf.
12. Symbole für Spielplatz, Bad und Termine kommen erst mit M10 und M11 (Spielplatz und Bad mit M10b, wenn Orte auf den Karten erscheinen; umgesetzt, Zusatz 47).

Stufe D4 (Detailansicht)
13. Abhak-Felder gibt es beim Material („Das braucht ihr“), nicht bei den Schritten. Sie gelten nur auf dem Bildschirm und werden nicht gespeichert.
14. Der Knopf heißt weiter „Das machen wir“ (nicht „Anleitung starten“).
15. „davon 15 aktiv“, „ergibt 12 Stück“, Hinweise je Schritt und persönliche Untertitel werden nicht gebaut. Sie stehen unter „Später“ in der CLAUDE.md.
16. Es gibt kein Teilen-Symbol.
17. Der Rand der Abhak-Felder kommt aus der Palette und hat mindestens 3:1 Kontrast zum Grund. Das wird im Test geprüft (WCAG 1.4.11).

Stufe D5 (Verlauf und Profile, Dunkelmodus)
18. Entwürfe für Verlauf, „Wie war’s?“, Kinderprofile und Standort-Erklärung werden aus dem Stil abgeleitet. Ani prüft sie.
19. Dunkelwerte: Hintergrund, Text und Hauptfarbe stehen im PDF, alles Weitere ist abgeleitet und im Kontrasttest geprüft. `expo-system-ui` ist freigegeben, wenn es zum Einschalten des Dunkelmodus nötig ist (kurz begründen, welches Problem es löst).

Widersprüche zur CLAUDE.md
20. Ionicons (nur Outline) bleiben, es gibt keinen eigenen Symbolsatz. Dass die Linienstärke nicht genau 1,75 px auf dem 24er-Raster ist, ist akzeptiert.
21. Das Feld `image` bleibt eine Web-Adresse. Vorrang auf der Karte: 1. `image` der Aktivität, 2. gebündeltes Kategorie-Foto aus `assets/images/categories/`, 3. Farbfläche mit Symbol. Ohne Foto ist deshalb nicht dauerhaft der Normalfall, sondern der Rückfall. (Die Stufe „Kategorie-Foto“ ist durch Zusatz 45 entfallen, an ihrer Stelle steht die Illustration.)

Zusätze beim Umsetzen von D2 (von Clemens bestätigt)
22. Das Wetter nach dem Tipp (Auslegung von Nr. 7): Ein Schritt auf dem Ergebnis-Bildschirm kommt nur, wenn er nötig ist. Wurde der Standort noch nie gefragt, erscheint zuerst die Erklär-Karte. Fehlt danach das Wetter, genügt ein Tipp auf „Wie ist das Wetter?“, dann erscheinen die Vorschläge.
23. Gewählte Kinder-Kacheln haben Rand und Häkchen in Tinte (nicht Terrakotta wie im PDF), nach Nr. 11.
24. Der Kreis mit dem Anfangsbuchstaben des Kindes ist sandfarben. Die zwei Pastelltöne aus dem PDF brauchten neue, ungeprüfte Farben.
25. Die Wortmarke „miki“ ist bis zur Logo-Datei ein Text in Tinte (im Code als Platzhalter gekennzeichnet).
26. Die Zeile „Samstag, 13:10“ aus dem PDF wird nicht gebaut.
27. Der Hauptknopf ist inaktiv, solange keine Zeit gewählt ist oder kein Kind gewählt ist. Der Hinweis darunter nennt den fehlenden Grund.
28. Die Kinder-Kacheln brechen bei vielen Kindern um und werden nicht abgeschnitten. Bei großer Systemschrift gibt es weniger Spalten pro Zeile, die Texte brechen um.

Zusätze beim Umsetzen von D3 (von Clemens bestätigt, 34 und 35 von Clemens nach der Prüfung festgelegt)
29. Unten gibt es kein „Auswahl ändern“ mehr: Der runde Zurück-Knopf im Kopf führt zur Auswahl. Das PDF zeigt unten nur „Keine passt? Drei neue Ideen“.
30. Die Wetterzeile ist fest (scrollt nicht mit) und hat den Knopf „Ändern“ (sichtbar „Ändern“, für die Sprachausgabe „Wetter ändern“). Warnung, „Standort erlauben“ und die Wetterwahl stehen im Scrollbereich über den Karten, damit die feste Zeile bei großer Schrift klein bleibt.
31. „Keine passt? Drei neue Ideen“ ist ein Nebenknopf (Sand, Tinte), nicht Terrakotta und kein Textlink wie im PDF (Entscheidung 11). Links im Wetter-Schritt sind Tinte mit Unterstreichung.
32. Nicht gebaut aus dem PDF: die Überschrift „Drei Ideen für eure Stunde“ mit Untertitel („Mila & Jonas · 1 Std · Energie normal · Ändern“) und die Angabe „Drinnen/Draußen“ auf der Karte. Der Kopf trägt den Titel „Eure Ideen“. „Drinnen/Draußen“ steht auf der Feinschliff-Liste in der CLAUDE.md.
33. Die Karte zeigt die Altersspanne („3–8 Jahre“, 0 bis 16 „Alle Alter“) statt „ab 3 J.“. Die sieben Kategorie-Farben (Entscheidung 10) stehen mit allen Werten und Kontrasten in docs/theme.md.
34. Ein Kategorie-Foto erscheint nur, wenn die Kategorie mindestens drei Fotos hat (Konstante `minPhotosPerCategory` in `src/features/activities/categoryPhotoFiles.ts`, Erklärung in docs/theme.md). Mit nur einem oder zwei Fotos passt das Bild oft nicht zur Aktivität (Beispiel: Schachbrett bei der Kissenburg). Das `image` einer einzelnen Aktivität hat weiterhin Vorrang. Stand bei dieser Entscheidung: Natur und Kochen zeigten Fotos, alle anderen die Farbfläche mit Symbol (abgelöst durch Zusatz 36, danach durch Zusatz 45).
35. Das Feld `image` darf nur Adressen von unserem eigenen Speicher laden (Allowlist), damit keine IP-Adressen an fremde Server gehen. Die Allowlist ist seit M8 eingebaut (Supabase Storage unseres Projekts, `src/features/activities/imageAllowlist.ts`, Details docs/supabase.md).

Zusätze beim Umsetzen von D4 (36 von Clemens am Anfang von D4 festgelegt, 37 bis 41 im Plan von Clemens bestätigt, 42 bis 44 von Clemens nach dem Plan ergänzt; Details: docs/detail.md)
36. (Abgelöst durch Zusatz 45: Es gibt keine Kategorie-Fotos mehr.) Erst einmal ganz ohne Fotos: Die Mindestzahl `minPhotosPerCategory` steht auf 99, keine Kategorie erreicht sie. Alle Karten und die Detailansicht zeigen die Farbfläche mit Symbol, solange eine Aktivität kein eigenes `image` hat. Mechanismus, Foto-Liste und Dateien bleiben. Fotos kommen später über M9b (Bilder-Pipeline). Löst den Stand von Zusatz 34 („heute Natur und Kochen“), nicht dessen Grund.
37. „Abhak-Felder 56 px hoch“ (Entscheidung 13) heißt: Die ganze Zeile ist 56 px hoch und die Tippfläche. Das sichtbare Kästchen darin ist etwa 32 px groß, wie im PDF.
38. Der Bildbereich der Detailansicht hat die Form und Rundung der Karten, aber keine Kategorie-Pille. Die Kategorie steht klein über dem Titel.
39. Abgehakt ist Tinte mit Häkchen (nach Nr. 11 und 23), nicht Terrakotta wie im PDF. Der Rand der leeren Kästchen ist `icon` aus der Palette (Nr. 17).
40. Die Sicherheitsbox steht vor Material und Anleitung (im PDF am Ende), nach der Allergen-Box. Beide Boxen in den Warnfarben (Honig-Ton), ohne Alarm-Rot.
41. Fünf Eckdaten-Kacheln statt vier im PDF: Dauer, Alter, Energie, Kosten, Ort. Der Wert „beides“ heißt „Drinnen oder draußen“ (en „Indoors or outdoors“). Steht die letzte Kachel allein in ihrer Zeile, füllt sie die Zeile.
42. Die Allergen-Box erscheint nur, wenn Allergene erkannt wurden. Es gibt nie eine Aussage wie „frei von Allergenen“. Unter der Box steht dauerhaft der Satz „Bei Allergien bitte die Zutatenlisten prüfen.“ (en „If you have allergies, please check the ingredient lists.“).
43. Der feste Bereich unten ist ein Nachbar des Scrollbereichs, nicht darüber gelegt: Der Scrollbereich endet über ihm, auch bei großer Schrift und mit Sicherheitsbereich am unteren Rand, und hat unten zusätzlich Luft. Die Zurück-Taste von Android führt zu den Ideen (eine Stufe zurück im Stapel).
44. Nach „Fertig“ ist „Wie war’s?“ ohne Scrollen sichtbar: Es steht im selben festen Bereich wie der Hauptknopf. Funktion und Aussehen bleiben bis D5 unverändert.

Zusatz nach dem Pilot der Illustrationen (13. Oktober 2026, von Clemens festgelegt)
45. Wir verwenden keine Stock-Fotos mehr. Bilder werden künftig selbst gezeichnet (SVG, Regeln in docs/design/ILLUSTRATIONEN.md). Die Foto-Mechanik ist entfernt: die Dateien unter assets/images/categories/, die Quellenliste, das Auswahl-Skript und die Foto-Liste der App samt Tests. Das Feld `image` bleibt, der Vorrang im Bildbereich ist: 1. `image` der Aktivität, 2. Illustration, 3. Farbfläche mit Symbol. Die Zusätze 34 und 36, der Teil „Kategorie-Foto“ der Entscheidung 21 und die Regeln für Fotos gelten nicht mehr. Wo in älteren Entscheidungen „Foto“ steht, gilt jetzt „gezeichnetes Bild“. Die Illustrationen für alle Aktivitäten entstehen in M9b. Die Fotos stehen im Verlauf von Git (Stand vor dieser Änderung: Commit 4332e79), falls je wieder welche gebraucht würden.

Zusätze beim Umsetzen von M10b (Orte in den Vorschlägen, 14. Oktober 2026, von Clemens im Plan bestätigt; Ani ist nicht mehr beteiligt, Clemens entscheidet)
46. Ortskarte: dieselbe Karte wie bei den Aktivitäten (weiß, Radius 22, Schatten, Bildbereich 2:1 mit weißer Pille). In der Pille steht die Unterart („Hallenbad“, „Spielplatz“). Darunter der Titel (Name, sonst „Spielplatz in Pohlitz“), die Zeile „ca. 4 km · Pohlitz“ und, wenn nötig, „Öffnungszeiten vorher prüfen“ und bei Kinos „Programm und Altersfreigabe vorher prüfen“. Keine Kurzbeschreibung, keine Dauer. Für die Sprachausgabe ist die Karte ein Knopf.
47. Bildgruppen und Farben der Orte: sieben eigene Gruppen (Spielplatz, Bad, Museum, Zoo, Burg, Kino, Bibliothek) mit eigenem Ton aus der Palette (auch als Mischung zweier Palettenfarben) und eigenem Ionicons-Symbol, Kontraste im Test geprüft wie bei Entscheidung 10. Die übrigen Unterarten nehmen Ton und Symbol einer Aktivitäts-Kategorie. Werte: docs/theme.md, „Farben und Symbole der Orte“. Damit sind die Symbole für Spielplatz und Bad aus Entscheidung 12 da.
48. Spielplatz (Luftballon) und Burg (Fahne) sind Platzhalter-Symbole: Ionicons hat keine passenden.
49. Quellenzeile der Orte: unter den Karten, nur wenn auf der Seite ein Ort steht, „Orte: © OpenStreetMap-Mitwirkende“ (Tinte, unterstrichen, Link auf openstreetmap.org/copyright) und darunter klein „Daten unter der Open Database License (ODbL)“, bei älteren Daten ohne Netz „Stand: vor n Tagen“. Ähnlich der Quelle in der Wetterzeile, aber im Scrollbereich. Dazu über den Karten „Umkreis auf 15 km erweitert“, wenn der Umkreis größer als 5 km ist. Solange die Orte noch laden (höchstens 4 Sekunden), steht unter der Wetterzeile ruhig „Orte in der Nähe werden gesucht …“.
50. Detailansicht eines Ortes (einfach, bis M10c): runder Zurück-Knopf, Bildbereich ohne Pille, Unterart klein über dem Titel, zwei weiße Kacheln (Entfernung „ca. 4 km Luftlinie“, Ortsteil), Hinweise in einer Sand-Fläche, ein Satz zur geschätzten Entfernung, die Quellenzeile. Kein Hauptknopf, kein Teilen. „Route öffnen“ und Website kommen mit M10c. (Seit M10c erweitert, Zusätze 51 bis 54.)

Zusätze beim Umsetzen von M10c (Ortsseite mit Route und Website, 14. Oktober 2026, von Clemens im Plan bestätigt)
51. Die Ortsseite ist aufgebaut wie die Detailansicht einer Idee: Der Inhalt scrollt, fest unten liegt der Hauptknopf „Route öffnen“ (groß, Terrakotta, mindestens 44 pt, Nachbar des Scrollbereichs wie in Zusatz 43). Für die Sprachausgabe heißt er „Route öffnen zu …“ mit dem Namen des Ortes. Kein Teilen, keine Fahrzeit (die Karten-App weiß es besser).
52. „Route öffnen“ zeigt vorher keinen Dialog. Auf dem iPhone erscheint nur das Auswahlmenü des Systems („Öffnen mit“: Apple Karten, Google Maps, OpenStreetMap (Karte), Abbrechen), auf Android die Auswahl „Öffnen mit …“ von Android. „OpenStreetMap (Karte)“ heißt so, weil dort nur die Karte mit Markierung öffnet, keine Route.
53. Abschnitt „Öffnungszeiten“: Ein fester Wochenplan steht als Liste Montag bis Sonntag in einer weißen Kachel, der heutige Tag mit Sand-Fläche, fetter Schrift und „· heute“ (die Farbe ist nie das einzige Merkmal). Sonst „Öffnungszeiten vorher prüfen“ und der Rohtext aus OpenStreetMap in einer weißen Kachel. Hinweise (Feiertage, vorher prüfen, Kino) stehen wie bisher in der Sand-Fläche mit Info-Symbol, die Saison als eigene Zeile. Die Adresse steht als Zeile in Nebentext-Farbe unter dem Titel.
54. „Website öffnen“ ist eine weiße Zeile (mindestens 44 pt) mit Globus-Symbol, Text in Tinte unterstrichen (Links wie Zusatz 31), darunter klein die Adresse und „Öffnet im Browser“, am Ende das Symbol „öffnet woanders“ (bei rechts-nach-links gespiegelt). Kein Terrakotta.

Offene Punkte
 Logo und App-Icon als Dateien exportieren und unter assets/ ablegen
 Name „Miki": Markenregister (DPMA) und App Store / Play Store prüfen
 Bundle-ID und Paketname festlegen (nach der Store-Veröffentlichung nicht mehr änderbar)
 Illustrationen für alle Aktivitäten zeichnen (M9b)
