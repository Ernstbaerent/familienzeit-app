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
Symbole: gleicher Linienstil, 1,75 px Linie auf 24er-Raster, runde Enden. Kategorien: Basteln, Spiele, Bewegung, Experimente, Natur, Kochen, Ausflüge, Spielplatz, Bad, Termine.
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
Flächen	Sand	
#F0E6D8	Karten, Flächen
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

Ohne Foto (Normalfall, solange es für eine Aktivität kein geprüftes Bild gibt): ruhige Farbfläche mit großem, dünnem Kategorie-Symbol, angeschnitten. Gleiche Kartenform, gleiche Höhe wie die Karte mit Foto. Diese Karte muss genauso hochwertig aussehen wie die mit Foto.

Regeln für Fotos

Gelten für jedes Foto in der App, egal ob von Hand oder automatisch ausgewählt:

Keine erkennbaren Gesichter, besonders keine von Kindern. Gut sind Hände bei der Arbeit, Rückenansichten, Nahaufnahmen, Material, Essen, Natur.
Keine erkennbaren Marken, Logos oder Produktverpackungen. Kein Text im Bild.
Nur Bilder, deren Lizenz kommerzielle Nutzung erlaubt (z. B. Unsplash, Pexels). Die Plattformen prüfen nicht, ob Einwilligungen für abgebildete Personen vorliegen, deshalb Regel 1.
Quellenliste: Zu jedem Foto werden gespeichert: Link, Fotograf, Plattform, Lizenz, Datum des Abrufs. Die Liste liegt in docs/bildquellen.md.
Format: Querformat, etwa 1200 px breit, deutlich unter 300 KB. Ablage unter assets/images/.
Das Foto passt zur Aktivität und widerspricht nicht der Altersgruppe (kein Babyspielzeug bei einer Aktivität für Teenager).
Vor der Beta schaut ein Mensch einmal alle Fotos durch (wie bei den Aktivitäten).

Das Datenmodell der Aktivität hat ein freiwilliges Bildfeld (image). Ohne Bild zeigt die App die Karte ohne Foto.

Logo A1 „Zwei Bögen"

Das „m" hat einen großen und einen kleinen Bogen: Erwachsene und Kind nebeneinander, zugleich zwei Hügel. Eigene Linien-Schrift, kleingeschrieben. Darunter die Zeile „mit Kindern" (im PDF in Großbuchstaben).

Varianten: Farbe, einfarbig, dunkel. Kleinste Größen im PDF: 29 px und 20 px, das Logo muss dort lesbar bleiben.
Dateien werden gebraucht: Das Logo ist im PDF nur ein Bild. Für die App braucht es das Logo als SVG oder PNG, das App-Icon als quadratisches PNG (mindestens 1024 × 1024) und eine einfarbige Variante. Ablage unter assets/.
Das App-Icon und das Startbild sind in Expo Go nicht zu sehen, erst in einer echten App-Version (Build).
Bildschirme
Start mit Auswahl: Die Auswahl (Kinder, Zeit, Energie) sitzt direkt auf dem Start, ein Tipp bis zu den Vorschlägen. Die letzte Wahl bleibt vorbelegt.
Ergebnis (volle Scrollhöhe): Das Wetter steht als feste Zeile unter der Navigation. Die dritte Karte hat im PDF kein Foto: gleiche Form, Farbfläche plus großes Liniensymbol.
Detail (volle Scrollhöhe): Schritte in 20 px mit 28 px Abstand, Abhak-Felder 56 px hoch. Der Hauptknopf bleibt beim Scrollen fest am unteren Rand.
In der Nähe: Warmer, gedämpfter Kartenstil. Pins rund, mit Kategorie-Farbe. Der gewählte Ort hat eine Beschriftung, die Liste liegt als Blatt darunter. Gehört zu M10 und wird dort gebaut.
Abweichungen vom heutigen Stand der App

Heutiger Ablauf: Start mit Hauptknopf „Was machen wir?" → Auswahl (Kinder, Zeit, Energie) → Ergebnis mit drei Karten → Detail → „Das machen wir" → „Fertig" → „Wie war's?" → Verlauf. Folgendes im PDF weicht ab oder ist neu. Jeweils im Plan der Stufe ansprechen und bestätigen lassen:

Punkt	Vorschlag
Auswahl direkt auf dem Start statt eigener Bildschirm	Übernehmen. Ein Tipp bis zu den Vorschlägen unterstützt das 30-Sekunden-Prinzip. Kinderliste und Verlauf-Link bleiben auf dem Start erreichbar. Stufe D2.
Abhak-Felder bei den Schritten der Anleitung	Übernehmen, aber nur auf dem Bildschirm, nicht speichern.
Knopf „Anleitung starten" im PDF	Der Name aus der App bleibt: „Das machen wir".
„Keine passt? Drei neue Ideen"	Entspricht „Andere Vorschläge". Text darf angepasst werden.
Text „Ohne Konto. Ohne Tracking." auf dem Start	Übernehmen, in de und en.
Stimmungsbild auf dem Start	Platzhalter, bis ein geprüftes Foto da ist (siehe Regeln für Fotos).
Kartenansicht „In der Nähe"	Erst mit M10. Jetzt nicht bauen.
Aktivitäten haben bisher kein Foto	Die Karte ohne Foto ist der Normalfall. Fotos kommen schrittweise dazu.
Offene Punkte
 Logo und App-Icon als Dateien exportieren und unter assets/ ablegen
 Name „Miki": Markenregister (DPMA) und App Store / Play Store prüfen
 Bundle-ID und Paketname festlegen (nach der Store-Veröffentlichung nicht mehr änderbar)
 Erste Fotos für die Kategorien auswählen (siehe Regeln für Fotos)
