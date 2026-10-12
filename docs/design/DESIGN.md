Miki – Design (Runde 1)

Stand: Oktober 2026. Quelle: PDF „Runde 1 · Drei Richtungen und Logo für Miki" aus Claude Design. Die Werte sind aus dem PDF übernommen, nichts ist dazuerfunden.

Gewählte Richtung: noch offen (A „Sonntagslicht" oder B „Stille Wiese"). Hier eintragen, sobald entschieden ist.

Stand des PDFs: Im PDF-Text stehen nur Richtung A und B. Richtung C „Wegweiser" und die Empfehlung fehlen. Falls sie in Claude Design existieren, bitte nachliefern.

Name: Miki steht für „Mit Kindern". Wortmarke kleingeschrieben: miki.

So nutzt Claude Code diese Datei
Es wird nur die gewählte Richtung umgesetzt. Die andere Richtung dient nur als Referenz.
Werte kommen in src/lib/theme.ts. Die Lint-Regel gegen feste Farben, Größen und Abstände bleibt bestehen. Die Namen der Theme-Werte legt Claude Code fest, die Rollen stehen in den Tabellen unten.
Funktionen, die es in der App noch nicht gibt, werden nicht still mitgebaut. Sie stehen im Abschnitt „Abweichungen vom heutigen Stand". Vorher nachfragen.
Widersprüche zu den Regeln in der CLAUDE.md (Mehrsprachigkeit, Rechts-nach-links, Datenschutz) melden, nicht eigenmächtig lösen.
Gemeinsame Vorgaben (gelten für beide Richtungen)
Tippflächen mindestens 44 pt.
Anleitungstext 20 px.
Textkontraste nach WCAG AA (die Kontrastwerte stehen an den Farben).
Alle Schriften sind Google Fonts (OFL) mit „Latein erweitert" (Türkisch, Rumänisch) und Kyrillisch (Ukrainisch). Arabisch läuft über eine passende Partnerschrift.
Layouts mit logischen Abständen (Anfang/Ende statt links/rechts), damit Rechts-nach-links (Arabisch) funktioniert.
Symbole: gleicher Linienstil, 1,75 px Linie auf 24er-Raster, runde Enden. Kategorien: Basteln, Spiele, Bewegung, Experimente, Natur, Kochen, Ausflüge, Spielplatz, Bad, Termine.
Hell als Standard, Dunkelmodus als Variante.
Fotos im PDF sind Platzhalter. Orte und Veranstaltungen im PDF sind erfunden.
Beispielsituation im PDF (in beiden Richtungen gleich): Samstag 13:10, zwei Kinder (4 und 13 Jahre), 1 Std, Energie „normal", Regen ab 15 Uhr.
Richtung A – „Sonntagslicht" (warm und fotografisch)

Gefühl: wie ein heller Samstagmorgen am Küchentisch. Warmes Licht, echte Momente, nichts Inszeniertes. Große Fotos tragen die Stimmung, die Oberfläche tritt bescheiden zurück.

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
Arabisch: Noto Naskh Arabic.
Beispiel Titel: „Was machen wir heute?". Beispiel Wetterzeile: „Bewölkt, Regen ab 15 Uhr · 11 °C".
Ecken

Karte 22, Knopf Pille (vollständig rund), Kachel 16.

Bildsprache: Foto
Natürliches Tageslicht, echte Wohnungen, Hände bei der Arbeit. Kinder schauen nicht in die Kamera, nichts ist aufgeräumt-perfekt.
Ohne Foto: ruhige Farbfläche mit großem, dünnem Kategorie-Symbol, angeschnitten. Gleiche Kartenform, gleiche Höhe wie die Karte mit Foto.
Logo-Entwürfe
A1 „Zwei Bögen": Das „m" hat einen großen und einen kleinen Bogen, Erwachsene und Kind nebeneinander, zugleich zwei Hügel. Eigene Linien-Schrift, kleingeschrieben.
A2 „Tagesbogen": Die Sonne auf ihrem Weg über den Horizont, für Zeit und Wetter. Wortmarke in Literata.
A3 „Drei Karten": Drei Karten, eine liegt vorn, als Zeichen für „drei Vorschläge". Wortmarke in Onest.
Jeder Entwurf in drei Varianten: Farbe, einfarbig, dunkel. Kleinste Größen im PDF: 29 px und 20 px.
Bildschirme
Start mit Auswahl: Die Auswahl (Kinder, Zeit, Energie) sitzt direkt auf dem Start, ein Tipp bis zu den Vorschlägen. Die letzte Wahl bleibt vorbelegt.
Ergebnis (volle Scrollhöhe): Das Wetter steht als feste Zeile unter der Navigation. Die dritte Karte hat kein Foto: gleiche Form, Farbfläche plus großes Liniensymbol.
Detail (volle Scrollhöhe): Schritte in 20 px mit 28 px Abstand, Abhak-Felder 56 px hoch. Der Hauptknopf bleibt beim Scrollen fest am unteren Rand.
In der Nähe: Warmer, gedämpfter Kartenstil. Pins rund, mit Kategorie-Farbe. Der gewählte Ort hat eine Beschriftung, die Liste liegt als Blatt darunter.
Richtung B – „Stille Wiese" (ruhig und illustriert)

Gefühl: ein tiefer Atemzug zwischen Arbeit und Abendessen. Weiche Farbflächen, viel Luft, nichts drängt. Illustrationen erzählen leise, statt einen perfekten Familiennachmittag vorzuführen.

Farben (hell)
Rolle	Name	Wert	Hinweis
Hintergrund	Creme	
#F6F4EC	Grund
Text	Tinte	
#1F2A24	13,5:1
Hauptfarbe (Knöpfe)	Moos	
#3F6B4F	mit weißem Text 6,1:1
Flächen	Salbei hell	
#DCE6D5	Karten, Flächen
Wetterfläche	Himmel	
#D6E4EC	für die Wetterzeile
Akzent	Aprikose	
#F2B98A	nur Akzent, nie für Text
Farben (Dunkelmodus)
Rolle	Wert	Hinweis
Hintergrund	
#141A16	
Text	
#ECEFE6	15,1:1
Hauptfarbe (Knöpfe)	
#9CC5A6	mit dunkler Schrift 9,2:1
Schrift
Rubik für alles. Leicht gerundete Ecken, ruhige Formen, nicht verspielt.
Arabisch: Noto Sans Arabic.
Ecken

Karte 24, Knopf 20, Chip 14.

Symbole

Gleiche Linien-Symbole, hier immer auf einer weichen Kategorie-Kachel. Jede Kategorie hat eine helle Fläche und eine dunkle Linie (Kontrast mindestens 4,5:1).

Bildsprache: Illustration
Flächige, ruhige Szenen ohne Gesichter: Landschaften, Tische, Hände. Fotos kommen später ergänzend dazu, immer in weichen Rahmen.
Ohne Foto: Kachel in der Kategorie-Farbe mit weicher Form und dünnem Symbol. Wirkt wie eine kleine Illustration.
Logo-Entwürfe
B1 „Steinmännchen": Drei gestapelte Kiesel, unterschiedlich groß, im Gleichgewicht. Am Wanderweg zeigt so ein Stapel, wo es langgeht. Wortmarke Rubik Medium.
B2 „Zwei Blätter": Ein großes und ein kleines Blatt an einem Stiel. Wortmarke leicht gesperrt, sehr ruhig.
B3 „Tageskreis": Ein Kreis mit Horizont und Sonne, wie ein Blick aus dem Fenster auf den Tag. Wortmarke Rubik Semibold.
Jeder Entwurf in drei Varianten: Farbe, einfarbig, dunkel. Kleinste Größen im PDF: 29 px und 20 px.
Bildschirme
Start: Sehr wenig auf dem Start: Bild, Kinder, ein Knopf. Zeit und Energie fragt der nächste Schritt (zwei Tipps).
Ergebnis: Alle drei Ideen passen auf einen Bildschirm, kein Scrollen. Die Wetterzeile erklärt kurz, warum diese Ideen kommen („Darum heute vor allem Ideen für drinnen.").
Detail (volle Scrollhöhe): Jeder Schritt ist eine eigene Karte, gut mit dem Daumen zu treffen („1 von 5", „2 von 5" usw.). Der Knopf bleibt unten fest.
In der Nähe: Helle Pastellkarte, runde Pins ohne Spitze. Die Liste nutzt dieselben Kategorie-Kacheln wie die Karte.
Abweichungen vom heutigen Stand der App

Der heutige Ablauf: Start mit Hauptknopf „Was machen wir?" → Auswahl (Kinder, Zeit, Energie) → Ergebnis mit drei Karten → Detail → „Das machen wir" → „Fertig" → „Wie war's?" → Verlauf. Folgendes im PDF gibt es noch nicht oder weicht ab. Nicht still umsetzen, sondern vorher klären:

Punkt	Richtung	Stand
Auswahl (Kinder, Zeit, Energie) direkt auf dem Start statt eigener Bildschirm	A	Ändert den Ablauf. B entspricht dem heutigen Ablauf.
Abhak-Felder bei den Schritten der Anleitung	A	Neue Funktion. Offen: wird der Haken gespeichert? Vorschlag: nur auf dem Bildschirm, nicht gespeichert.
„Schritt 1 von 5" als Schritt-Karten	B	Nur Darstellung, keine neue Logik.
Wetterzeile mit Begründung („Darum heute vor allem Ideen für drinnen")	B	Neue Textlogik, abhängig von der Wetterlage.
Knopf „Anleitung starten" im PDF	A, B	Heißt in der App „Das machen wir". Der Name bleibt, bis anders entschieden.
„Keine passt? Drei neue Ideen" / „Andere Ideen"	A, B	Entspricht „Andere Vorschläge". Text darf angepasst werden.
Text „Ohne Konto. Ohne Tracking." auf dem Start	A	Neuer Text, passt zur Datenschutz-Linie.
Stimmungsbild oder Illustration auf dem Start	A (Foto), B (Illustration)	Das Bild muss erst erstellt oder beschafft werden. Bis dahin Platzhalter.
Kartenansicht „In der Nähe"	A, B	Gehört zu M10 (Orte). Jetzt nicht bauen.
Aktivitäten haben bisher kein Foto	A, B	Die Variante „ohne Foto" ist deshalb der Normalfall, nicht der Sonderfall.
Logo und Dateien
Im PDF sind die Logos nur als Bild enthalten. Für die App werden Dateien gebraucht: das gewählte Logo als SVG oder PNG, das App-Icon als quadratisches PNG (mindestens 1024 × 1024) und eine einfarbige Variante.
Diese Dateien bitte aus Claude Design als PNG exportieren und unter assets/ im Repo ablegen.
Das App-Icon und das Startbild sind in Expo Go nicht zu sehen, erst in einer echten App-Version (Build).
Offene Entscheidungen
 Richtung wählen (A oder B), gern mit Mischwünschen
 Logo wählen (A1–A3 oder B1–B3)
 Name „Miki": Markenregister (DPMA) und App Store / Play Store prüfen
 Bundle-ID und Paketname festlegen (nach der Store-Veröffentlichung nicht mehr änderbar)
 Richtung C und Empfehlung aus Claude Design nachliefern, falls vorhanden
