Miki – Design

Stand: Oktober 2026. Quelle: PDF „Runde 1 · Drei Richtungen und Logo für Miki" aus Claude Design (liegt im selben Ordner). Die Werte sind aus dem PDF übernommen, nichts ist dazuerfunden.

Gewählte Richtung: A „Sonntagslicht" (warm und fotografisch) Gewähltes Logo: A1 „Zwei Bögen" Name: Miki steht für „Mit Kindern". Wortmarke kleingeschrieben: miki, darunter optional die Zeile „mit Kindern".

Richtung B „Stille Wiese" und Richtung C wurden nicht gewählt. Ihre Werte stehen nur noch im PDF.

So nutzt Claude Code diese Datei
Es wird nur Richtung A umgesetzt.
Werte kommen in src/lib/theme.ts. Die Lint-Regel gegen feste Farben, Größen und Abstände bleibt bestehen. Die Namen der Theme-Werte legt Claude Code fest, die Rollen stehen in den Tabellen unten.
Funktionen, die es in der App noch nicht gibt, werden nicht still mitgebaut. Sie stehen im Abschnitt „Abweichungen vom heutigen Stand". Vorher nachfragen.
Widersprüche zu den Regeln in der CLAUDE.md (Mehrsprachigkeit, Rechts-nach-links, Datenschutz) melden, nicht eigenmächtig lösen.
Gefühl

Wie ein heller Samstagmorgen am Küchentisch: warmes Licht, echte Momente, nichts Inszeniertes. Große Fotos tragen die Stimmung, die Oberfläche tritt bescheiden zurück. Ruhig und warm, keine Punkte, Abzeichen oder Serien, genau drei Karten, ein Hauptknopf.

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

Mit Foto: Natürliches Tageslicht, echte Wohnungen, Hände bei der Arbeit. Kinder schauen nicht in die Kamera, nichts ist aufgeräumt-perfekt.

Ohne Foto (Rückfall, solange es weder ein Bild der Aktivität noch ein Kategorie-Foto gibt, heute der Normalfall): ruhige Farbfläche mit großem, dünnem Kategorie-Symbol, angeschnitten. Gleiche Kartenform, gleiche Höhe wie die Karte mit Foto. Diese Karte muss genauso hochwertig aussehen wie die mit Foto.

Regeln für Fotos

Gelten für jedes Foto in der App, egal ob von Hand oder automatisch ausgewählt:

Keine erkennbaren Gesichter, besonders keine von Kindern. Gut sind Hände bei der Arbeit, Rückenansichten, Nahaufnahmen, Material, Essen, Natur.
Keine erkennbaren Marken, Logos oder Produktverpackungen. Kein Text im Bild.
Nur Bilder, deren Lizenz kommerzielle Nutzung erlaubt (z. B. Unsplash, Pexels). Die Plattformen prüfen nicht, ob Einwilligungen für abgebildete Personen vorliegen, deshalb Regel 1.
Quellenliste: Zu jedem Foto werden gespeichert: Link, Fotograf, Plattform, Lizenz, Datum des Abrufs. Die Liste liegt in docs/bildquellen.md.
Format: Querformat, etwa 1200 px breit, deutlich unter 300 KB. Ablage unter assets/images/ (Kategorie-Fotos unter assets/images/categories/).
Das Foto passt zur Aktivität und widerspricht nicht der Altersgruppe (kein Babyspielzeug bei einer Aktivität für Teenager).
Vor der Beta schaut ein Mensch einmal alle Fotos durch (wie bei den Aktivitäten).

Das Datenmodell der Aktivität hat ein freiwilliges Bildfeld (image), es bleibt eine Web-Adresse (nur von unserem eigenen Speicher, Zusatz 35). Auf der Karte gilt dieser Vorrang: 1. image der Aktivität, 2. gebündeltes Kategorie-Foto aus assets/images/categories/ (nur ab der Mindestzahl Fotos in der Kategorie, Zusatz 34, heute 99: erst einmal ganz ohne Fotos, Zusatz 36), 3. Farbfläche mit Symbol (Entscheidung 21).

Logo A1 „Zwei Bögen"

Das „m" hat einen großen und einen kleinen Bogen: Erwachsene und Kind nebeneinander, zugleich zwei Hügel. Eigene Linien-Schrift, kleingeschrieben. Darunter die Zeile „mit Kindern" (im PDF in Großbuchstaben).

Varianten: Farbe, einfarbig, dunkel. Kleinste Größen im PDF: 29 px und 20 px, das Logo muss dort lesbar bleiben.
Dateien werden gebraucht: Das Logo ist im PDF nur ein Bild. Für die App braucht es das Logo als SVG oder PNG, das App-Icon als quadratisches PNG (mindestens 1024 × 1024) und eine einfarbige Variante. Ablage unter assets/.
Das App-Icon und das Startbild sind in Expo Go nicht zu sehen, erst in einer echten App-Version (Build).
Bildschirme
Start mit Auswahl: Die Auswahl (Kinder, Zeit, Energie) sitzt direkt auf dem Start, ein Tipp bis zu den Vorschlägen. Vorbelegt sind nur die zuletzt gewählten Kinder, Zeit und Energie nicht (Entscheidung 4).
Ergebnis (volle Scrollhöhe): Das Wetter steht als feste Zeile unter der Navigation. Die dritte Karte hat im PDF kein Foto: gleiche Form, Farbfläche plus großes Liniensymbol.
Detail (volle Scrollhöhe): Schritte in 20 px mit 28 px Abstand, Abhak-Felder 56 px hoch (beim Material „Das braucht ihr“, Entscheidung 13). Der Hauptknopf bleibt beim Scrollen fest am unteren Rand.
In der Nähe: Warmer, gedämpfter Kartenstil. Pins rund, mit Kategorie-Farbe. Der gewählte Ort hat eine Beschriftung, die Liste liegt als Blatt darunter. Gehört zu M10 und wird dort gebaut.
Abweichungen vom heutigen Stand der App

Heutiger Ablauf: Start mit Hauptknopf „Was machen wir?" → Auswahl (Kinder, Zeit, Energie) → Ergebnis mit drei Karten → Detail → „Das machen wir" → „Fertig" → „Wie war's?" → Verlauf. Folgendes im PDF weicht ab oder ist neu. Alle Punkte sind inzwischen entschieden (Abschnitt „Entscheidungen“ unten). Die Tabelle zeigt den Stand:

Punkt	Vorschlag
Auswahl direkt auf dem Start statt eigener Bildschirm	Übernommen (Nr. 1). Ein Tipp bis zu den Vorschlägen unterstützt das 30-Sekunden-Prinzip. Kinderliste und Verlauf-Link bleiben auf dem Start erreichbar. Stufe D2.
Abhak-Felder bei den Schritten der Anleitung	Übernommen, aber beim Material („Das braucht ihr“), nicht bei den Schritten (Nr. 13). Nur auf dem Bildschirm, nicht gespeichert.
Knopf „Anleitung starten" im PDF	Der Name aus der App bleibt: „Das machen wir“ (Nr. 14).
„Keine passt? Drei neue Ideen"	Ersetzt „Andere Vorschläge“, der Durchlauf mit Hinweis bleibt (Nr. 8).
Text „Ohne Konto. Ohne Tracking." auf dem Start	Ersetzt durch: de „Kein Konto nötig. Deine Daten bleiben auf deinem Handy.“, en „No account needed. Your data stays on your phone.“ Nicht „Ohne Tracking“ (Nr. 5).
Stimmungsbild auf dem Start	Platzhalter: Sandfläche mit großem, dünnem Sonnen-Symbol (Nr. 6), bis ein geprüftes Foto da ist (siehe Regeln für Fotos).
Kartenansicht „In der Nähe"	Erst mit M10. Jetzt nicht bauen.
Aktivitäten haben bisher kein Foto	Vorrang auf der Karte: image der Aktivität, dann Kategorie-Foto, dann Farbfläche mit Symbol (Nr. 21). Fotos kommen schrittweise dazu.
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
12. Symbole für Spielplatz, Bad und Termine kommen erst mit M10 und M11.

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
21. Das Feld `image` bleibt eine Web-Adresse. Vorrang auf der Karte: 1. `image` der Aktivität, 2. gebündeltes Kategorie-Foto aus `assets/images/categories/`, 3. Farbfläche mit Symbol. Ohne Foto ist deshalb nicht dauerhaft der Normalfall, sondern der Rückfall.

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
34. Ein Kategorie-Foto erscheint nur, wenn die Kategorie mindestens drei Fotos hat (Konstante `minPhotosPerCategory` in `src/features/activities/categoryPhotoFiles.ts`, Erklärung in docs/theme.md). Mit nur einem oder zwei Fotos passt das Bild oft nicht zur Aktivität (Beispiel: Schachbrett bei der Kissenburg). Das `image` einer einzelnen Aktivität hat weiterhin Vorrang. Stand bei dieser Entscheidung: Natur und Kochen zeigten Fotos, alle anderen die Farbfläche mit Symbol (abgelöst durch Zusatz 36).
35. Das Feld `image` darf nur Adressen von unserem eigenen Speicher laden (Allowlist), damit keine IP-Adressen an fremde Server gehen. Die Allowlist kommt mit M8, der Speicher-Host steht unter „Entscheidungen vor M12“ in der CLAUDE.md. Bis dahin prüft der Code nur `https://`.

Zusätze beim Umsetzen von D4 (Entscheidung zu Fotos von Clemens am Anfang von D4 festgelegt; die übrigen aus dem Plan, siehe unten)
36. Erst einmal ganz ohne Fotos: Die Mindestzahl `minPhotosPerCategory` steht auf 99, keine Kategorie erreicht sie. Alle Karten und die Detailansicht zeigen die Farbfläche mit Symbol, solange eine Aktivität kein eigenes `image` hat. Mechanismus, Foto-Liste und Dateien bleiben. Fotos kommen später über M9b (Bilder-Pipeline). Löst den Stand von Zusatz 34 („heute Natur und Kochen“), nicht dessen Grund.

Offene Punkte
 Logo und App-Icon als Dateien exportieren und unter assets/ ablegen
 Name „Miki": Markenregister (DPMA) und App Store / Play Store prüfen
 Bundle-ID und Paketname festlegen (nach der Store-Veröffentlichung nicht mehr änderbar)
 Erste Fotos für die Kategorien auswählen (siehe Regeln für Fotos)
