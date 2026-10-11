# Veranstaltungsdaten für eine Familien-App in Deutschland: Quellen, Zugang, Lizenzen und Fahrplan (Stand Oktober 2026)

Der schnellste legale Weg zu bundesweiten, familientauglichen Veranstaltungsdaten ist ein kostenloser API-Schlüssel für den German Tourism Knowledge Graph der DZT (rund 239.000 Event-Instanzen, überwiegend CC-lizenziert). Für die Startregion Ostthüringen/Greiz kommen zwei Quellen hinzu: ThüCAT direkt und – wegen der Vogtland-Lage – der Freizeitkalender des Vogtlandkreises. Die eigentlich spontanen Dorf- und Vereinsereignisse (Kinderflohmarkt, Drachenfest, Kirmes) stecken in diesen Quellen aber nur lückenhaft. Sie müssen über Kooperationen und eine eigene Einreichungsfunktion für Veranstalter gewonnen werden. Ticketing-Plattformen (Eventim, Reservix/ADticket, Ticketmaster) liefern vor allem kommerzielle Konzerte und Theater. Ihre Terminlisten überschneiden sich stark, und sie sind eher Monetarisierungs- als Kerndatenquelle.

## TL;DR

- **Sofort starten mit drei Quellen:** DZT Knowledge Graph (API-Key per E-Mail an open-data@germany.travel, kostenlos), ThüCAT (API-Key auf Anfrage, kostenlos, CC-Lizenzen) und open.destination.one (kostenloser API-Zugang über destination.meta, CC0/CC BY/CC BY-SA). Damit ist ein Großteil der offenen Tourismus-Events aller 16 Länder abgedeckt. Die Landesdatenbanken speisen ihre offenen Daten ohnehin in den Knowledge Graph ein, deshalb ist das Dubletten-Risiko hoch.
- **Für Ostthüringen reichen offene Tourismusdaten nicht:** Die Kalender von Stadt und Landkreis Greiz zeigen Hallenflohmärkte, Apfelfeste, Lampionumzüge und Kindersachenmärkte, die typischerweise nicht in Tourismusdatenbanken landen. Wichtigste Kooperationspartner sind der Freizeitkalender Vogtland (Landratsamt Vogtlandkreis; laut Kalenderseite des Vogtlandkreises „von ca. 1000 Veranstaltern als Plattform genutzt" und „derzeit auf über 30 Kommunen- und Veranstalterportalen eingebunden"), die regionalen ThüCAT-Redaktionen sowie Flohmarktportale wie marktcom und das krencky24-/Meine-Flohmarkt-Termine-Netzwerk.
- **Rechtlich gilt: lizenzieren, nicht scrapen.** Kommerzielle Portale (Rausgegangen, regioactive, Mittelalter-Kalender, Flohmarktportale) bieten keine offene API. Systematisches Übernehmen ihrer Kalender kann nach EuGH „CV-Online" (C-762/19) und BGH „Zweite Zahnarztmeinung II" das Datenbankherstellerrecht (§ 87b UrhG) verletzen. Eventbrite (Suche seit 2020 abgeschaltet) und Meetup (API nur mit Meetup Pro) sind für die App praktisch unbrauchbar.

## Key Findings

1. **Der Knowledge Graph (KG) der DZT ist das Rückgrat, aber kein Selbstläufer.** Laut dem ISWC-Poster der Betreiber (STI Innsbruck/Onlim/DZT) enthielt der KG am 07.03.2024 239.000 Instanzen vom Typ schema:Event. Er wird täglich von den Landesmarketingorganisationen aktualisiert, und jede Instanz trägt ihre eigene Lizenz, „typically a Creative Common license like CC-BY-SA". Zugang gibt es über API (inkl. SPARQL), einen MCP-Server für KI-Anwendungen und ein Serviceportal für kuratierte Datenpakete. Der API-Schlüssel ist laut DZT kostenlos.
2. **Lizenzfalle Brandenburg:** Das Contentnetzwerk Brandenburg liefert POIs und Veranstaltungen an den KG „aktuell mit der CC-Lizenz ‚CC BY-NC-ND'". Das wäre für eine kommerzielle App mit Kürzen/Umformulieren von Texten nicht nutzbar (NC = nicht kommerziell, ND = keine Bearbeitung). Bayern und Sachsen übertragen dagegen nur CC0, CC BY und CC BY-SA. Die Lizenz muss deshalb **pro Datensatz** ausgewertet und gespeichert werden.
3. **Alle 16 Länder haben eine zentrale Tourismus-Datenbank, aber unterschiedliche Systeme und Zugangswege.** Drei Systemfamilien dominieren: destination.one (Niedersachsen, Sachsen, Leipzig, NRW-Finder), DataCycle (BayernCloud, RLP-DataHub) und mein.toubiz (Baden-Württemberg, Saarland). Hinzu kommen Eigenentwicklungen: ThüCAT (auch Basis für Hessen), Brandenburg-Contentnetzwerk, SAiNT (Sachsen-Anhalt), TLDB-SH (Schleswig-Holstein), MV-Datenbank.
4. **Ticketing-Daten überschneiden sich stark.** Reservix und ADticket teilen ihre Event-Bestände („die Veranstaltungen des einen sind auch über die Schnittstelle des anderen abrufbar"). Aggregatoren wie kulturis importieren Reservix, Eventim und OpenDataGermany parallel und müssen Dubletten bereinigen.
5. **Familien-/Kinderfilter sind die Ausnahme.** Keine der geprüften Tourismus-Schnittstellen dokumentiert öffentlich einen verlässlichen Kinder-/Familien-Filter. Baden-Württemberg nennt „Familienfreundlichkeit" als Anreicherungsziel. Die App braucht daher eine eigene Klassifikation (Regeln plus ggf. LLM) über Titel, Kategorie, Ort und Uhrzeit.
6. **Die Thüringer Familien-App ist Wettbewerber und Signal zugleich.** Sie ist seit 1. Mai 2025 live, wird vom Thüringer Sozialministerium (TMSGAF) betrieben und übernimmt ThüCAT-Events automatisch. Ihre API ist eine **Eingangs**-Schnittstelle für Anbieter, keine öffentliche Datenausgabe. Das belegt aber, dass ThüCAT-Events für Familien-Apps nutzbar sind.

## Übersichtstabelle der Quellen

**Legende Eignung:** hoch = sofort integrierbar, rechtlich klar, relevant; mittel = nutzbar mit Einschränkungen oder nach Beta; gering = kaum Nutzen oder rechtlich/technisch schwierig. „n. v." = nicht verifiziert.

### A. Nationale Aggregatoren und Systemanbieter

| Quelle | Art der Veranstaltungen | Abdeckung | Zugang | Kosten | Lizenz/Nutzungsbedingungen | Familienfilter | Eignung |
|---|---|---|---|---|---|---|---|
| German Tourism Knowledge Graph (DZT, open-data-germany.org) | Alle touristischen Events der LMOs: Feste, Märkte, Konzerte, Führungen, Ausstellungen | Bundesweit, alle 16 Länder; Land stark abhängig von lokaler Pflege | API-Schlüssel per E-Mail an open-data@germany.travel; zusätzlich MCP-Server und Serviceportal | Kostenlos | Lizenz je Instanz, meist CC BY-SA; teils CC BY-NC-ND (Brandenburg) | Kein dokumentierter Filter; schema.org-Kategorien | **hoch** |
| open.destination.one (neusta destination.one) | POIs, Events, Touren, Artikel | DACH; u. a. Sachsen, Niedersachsen, Leipzig; „mehr als 50.000 offene Daten" | Registrierung, Lizenzschlüssel, API destination.meta oder Widgets destination.pages | API kostenlos (Free); Premium-Anpassungen kostenpflichtig, Widget-Premium 540 € netto | Nur CC0, CC BY, CC BY-SA; Plattform-Nutzungsbedingungen (Namensnennung, Backlink) | Kategorien; Familie n. v. | **hoch** |
| feratel deskline, Outdooractive, Infomax, TOMAS, DAMAS, Regiondo | Primärsysteme der Orte/Regionen | Regional | Keine direkte Drittnutzung geprüft; Daten fließen über Landes-Hubs (z. B. Niedersachsen, Sachsen) in KG/destination.one | n. v. | Nach Lizenz des Datenpflegers | n. v. | gering (indirekt über Hubs nutzen) |

### B. Landestourismusorganisationen (alle 16 Länder)

| Quelle | Art der Veranstaltungen | Abdeckung | Zugang | Kosten | Lizenz/Nutzungsbedingungen | Im DZT-KG? | Eignung |
|---|---|---|---|---|---|---|---|
| **Thüringen – ThüCAT** (Thüringer Tourismus GmbH) | Events, POIs, Spielplätze, Parks, Vereine | Thüringen; laut Thüringer Tourismusnetzwerk („5 Jahre ThüCAT", 16.07.2025) „über 15.000 touristische Datensätze … sowie mehr als 3.000 Veranstaltungseinträge"; Stadt und Land (z. B. Unstrut-Hainich-Kreis mit kommunalen Lieferungen) | API-Key direkt bei ThüCAT (Projekt und benötigte Daten angeben); Formate JSON, JSON-LD, XML; Webkomponenten inkl. Veranstaltungskalender | Kostenlos | Creative-Commons-Lizenzen je Datensatz | Ja, regelmäßiger Export | **hoch** |
| Bayern – BayernCloud Tourismus (BayTM, DataCycle) | Events, POIs, Touren, Echtzeitdaten | Bayern; zum Start 188.245 Datensätze, davon 11.300 Open Data | Kostenloser Account unter bayerncloud.digital, API-Token beantragen | Kostenlos | Open Data nur CC-lizenziert; „Closed Data" nicht für Entwickler | Ja (nur CC0/BY/BY-SA, Content-Score ≥ 70) | mittel–hoch |
| Baden-Württemberg – mein.toubiz (TMBW) | Events, POIs, Touren u. a. | BW, 200.000 Datensätze (Anfang 2025) | Open-Data-Pool per API sowie KG | Kostenlos | CC je Datensatz; Lizenzinfos „zwingend" zu beachten | Ja | mittel–hoch |
| Brandenburg – Contentnetzwerk (TMB) | Laut TMB-Seite „jährlich 40.000 Veranstaltungsdaten" (DZT-Statusseite: rund 45.000 Event-Datensätze) | Brandenburg, länderübergreifend | Content-Liefervertrag; XML täglich, ab 2025 JSON | Vertraglich, n. v. | An KG: CC BY-NC-ND | Ja | mittel (Lizenz prüfen) |
| Berlin – visitBerlin Data Hub | Events, Insider-Tipps | Berlin | Über KG; eigener Hub im Aufbau | n. v. | n. v. | Teilweise | mittel |
| Bremen – WFB | n. v. | Bremen | Kontakt über WFB | n. v. | n. v. | Ja (Partner) | gering–mittel |
| Hamburg – Veranstaltungsdatenbank Hamburg & Metropolregion | Events | Hamburg + Metropolregion | Seit 2014 „Vorstufe von Open Data"; über KG | n. v. | n. v. | Ja | mittel |
| Hessen – Content Hub Hessen (auf ThüCAT-Basis) | Events, POIs, Gastronomie | Hessen | Über KG; Registrierung im Tourismus Hub Hessen | n. v. | schema.org/ODTA, Open-Data-Ansatz | Ja | mittel |
| Mecklenburg-Vorpommern – Tourismusverband MV | über 10.000 Events pro Jahr | MV | XML, JSON, JSON-LD; „Neue Nutzer willkommen" | Frei nutzbar | Eigene Nutzungsbedingungen, Umstellung auf CC bis Ende 2025 | Teilweise | mittel–hoch |
| Niedersachsen – Niedersachsen Hub (TMN, destination.one) | 8.679 Events, davon 3.684 Open Data (Stand Feb. 2025) | Niedersachsen | Open Data-Finder, Export-API mit Doku | Kostenlos | CC0/CC BY/CC BY-SA plus ANB des Hubs | Ja, alle Open-Data-Inhalte | mittel–hoch |
| NRW – Data Hub NRW / Open Data Finder | Events, POIs, Touren | NRW inkl. Ruhr | Open Data Finder: Kontaktdaten, Zustimmung zu Nutzungsbedingungen, Lizenzschlüssel für destination.meta | Kostenlos | Stammdaten Public Domain Mark; Medien mind. CC BY-SA empfohlen | Ja | mittel–hoch |
| Rheinland-Pfalz – RLP DataHub (DataCycle) | Events, Pauschalen, Führungen | RLP, 10 Regionen, 135 Orte | Kuratierte Datensammlungen an Partner (u. a. App-Dienstleister, Amtsblatt-Verlage) | n. v. | Musterverträge, Open Data | Ja | mittel (Kooperation) |
| Saarland – mein.toubiz (TZS) | Events, POIs | Saarland | Über KG; Schnittstellen auf Anfrage | n. v. | CC je Datensatz | Ja | mittel |
| Sachsen – SaTourN (TMGS, destination.one) | Events, POIs, Touren, Angebote | Sachsen; Primärsysteme Outdooractive, Feratel, Regiondo, DAMAS | Open Data Finder Sachsen: Lizenzschlüssel für destination.meta | Kostenlos | CC0/CC BY/CC BY-SA | Ja | **hoch** (Nachbarregion Vogtland/Westsachsen) |
| Sachsen-Anhalt – SAiNT (IMG) | Events, POIs, ÖPNV-Verknüpfung, MoWaS-Warnungen | Sachsen-Anhalt | Über KG; Kontakt IMG | n. v. | Open-Data-Ansatz | Ja | mittel |
| Schleswig-Holstein – TLDB-SH (TA.SH) | Ausflugsziele, Touren, Events | SH | White-Label-Widget (mit infomax) für Open Data | n. v. | Open Data; Landesportal empfiehlt CC0 | Teilweise | mittel |

### C. Ticketing- und Eventplattformen

| Quelle | Art der Veranstaltungen | Abdeckung | Zugang | Kosten | Lizenz/Nutzungsbedingungen | Familienfilter | Eignung |
|---|---|---|---|---|---|---|---|
| Eventim (CTS Eventim) via AWIN | Konzerte, Musicals, Sport, Familienshows; laut AWIN-Programmprofil über 200.000 Events pro Jahr, laut CTS-EVENTIM-Pressemitteilung (26.03.2026) „mehr als 300 Millionen Tickets" pro Jahr über die Konzernsysteme | Bundesweit, Schwerpunkt Städte/Hallen | Publisher-Bewerbung bei AWIN; Produktdaten-Feeds; Freischaltung bis zu 28 Tage | Kostenlos; 20 % Provision auf die Netto-Vorverkaufsgebühr | Affiliate-Bedingungen; 1-Tages-Cookie, kein SEA; einzelne Events nicht freigegeben | Kategorien im Feed, Familie n. v. | mittel (Monetarisierung) |
| Reservix + ADticket | Klassik, Rock, Jazz, Pop, Theater, Sport; „täglich über 30.000 Events" | Bundesweit; Reservix betreut laut Eventbranchenverzeichnis „mehr als 7.000 Veranstalter" aus Konzerten, Sport, Theater, Tourismus, Tourneen und Messen, auch in Kleinstädten (z. B. Vogtlandhalle Greiz bei ADticket) | Developer-API für Partner (Login), Affiliate-/Medienpartner-Programm, auch AWIN | Partnerschaft, Provision | Partnervertrag | n. v. | mittel–hoch |
| Ticketmaster Discovery API | Konzerte, Sport, Theater, Family-Shows | Global; in Deutschland schwächer als Eventim (Einschätzung) | Self-Service-API-Key | Kostenlos; 5.000 Calls/Tag, 5 req/s (FAQ nennt 2 req/s); Deep Paging max. 1.000 Items | Ticketmaster-Nutzungsbedingungen und Branding; Discovery Feed für zugelassene Partner | Klassifikationen (Segment/Genre); Familie n. v. | gering–mittel |
| Eventfrog Public API | Alle Eventtypen, viele kleine Veranstalter | Schweiz stark, Deutschland wachsend (Umfang n. v.) | Public API-Key (api.eventfrog.net), filterbar nach Region, Kategorie, Datum | Kostenlos laut Anbieter | Nutzungsbedingungen n. v. | Rubriken, Kinder n. v. | mittel |
| Eventbrite | Workshops, Networking | Global | Öffentliche Suche (/v3/events/search) am 12.12.2019 abgeschaltet, Restzugriff bis 20.02.2020; nur eigene Organisations-/Venue-Events | – | – | – | **gering** |
| Meetup | Gruppentreffen | Global | GraphQL seit Feb. 2025; OAuth nur mit aktivem Meetup Pro | Pro-Abo | API-Lizenzbedingungen, Widerruf möglich | – | **gering** |
| pretix | Veranstalter-eigene Events | Je Veranstalter | Authentifizierte REST-API pro Organizer; keine organisatorübergreifende öffentliche Liste | – | Nur mit Token/Zustimmung des Veranstalters | – | gering (nur per Veranstalter) |
| Tixforgigs | Clubkonzerte | Regional | Einbettbares Ticketshop-Template mit Ortsfilter; keine öffentliche Daten-API | n. v. | n. v. | – | gering |

### D. Städte, Kommunen und Open-Data-Portale

| Quelle | Art der Veranstaltungen | Abdeckung | Zugang | Kosten | Lizenz | Familienfilter | Eignung |
|---|---|---|---|---|---|---|---|
| Berlin Open Data: „Berliner und Brandenburger Straßen- und Volksfeste", „Weihnachtsmärkte", „Wochen- und Trödelmärkte" | Volksfeste, Weihnachtsmärkte, Trödelmärkte | Berlin und Brandenburg | Offene REST-API (SimpleSearch) mit JSON/GeoJSON/CSV, ohne Key; Volksfeste zuletzt am 21.08.2026 aktualisiert | Kostenlos | CC BY | Nein | **hoch** |
| Leipzig – „Travel-API Leipzig" (LTM) | Events, Gastgeber, Touren | Leipzig und Umland | Über open.destination.one | Kostenlos | CC BY mit Back-Link | Kategorien | hoch |
| GovData / Landesportale (z. B. Schleswig-Holstein) | Vereinzelt Märkte und Feste | Uneinheitlich | CKAN-APIs | Kostenlos | Meist DL-DE oder CC | Nein | mittel (Einzelfunde) |
| Hamburg, München, Köln, Dresden, Erfurt, Jena | n. v. | – | Kein eigener Event-Open-Data-Datensatz verifiziert; Events vermutlich über KG/Landeshubs | – | – | – | n. v. |
| Freizeitkalender Vogtland (freizeitkalender.eu, Landratsamt Vogtlandkreis, Technik pitcom GmbH Plauen) | Alle lokalen Veranstaltungen inkl. Vereinsfeste; speist z. B. den Kalender der Vogtlandhalle Greiz | Sächsisches Vogtland mit Ausstrahlung nach Greiz; laut Kalenderseite des Vogtlandkreises „von ca. 1000 Veranstaltern als Plattform genutzt" und „auf über 30 Kommunen- und Veranstalterportalen eingebunden" | Nur Kooperation (Ansprechpartner: Andreas Bachmann, Amt für Kataster und Geoinformation, Tel. +49 3741 300 240 9, bachmann.andreas@vogtlandkreis.de) | n. v. | n. v. | Kategorien | **hoch (Kooperation)** |
| Stadt Greiz / Landkreis Greiz Veranstaltungskalender | Kindersachenmärkte, Drachenfeste, Halloween, Park- und Schlossfest, Herbstmarkt | Greiz und Landkreis | Keine API gefunden – nur Kooperation | – | – | Nein | hoch (Kooperation) |

### E. Spezialportale und Kooperationskandidaten

| Quelle | Art der Veranstaltungen | Abdeckung | Zugang | Kosten | Lizenz/Bedingungen | Familienfilter | Eignung |
|---|---|---|---|---|---|---|---|
| marktcom.de (marktcom.de Deutschland GmbH, Baesweiler) | Flohmärkte, Stadtfeste, Märkte | Bundesweit; nach eigener Aussage „größter Veranstaltungskalender für Stadtfeste und Marktveranstaltungen" | Keine öffentliche API; wirbt mit Terminveröffentlichung „zusätzlich bei unseren Kooperationspartnern", also Syndikation per Vertrag | n. v. | AGB; Datenbankrecht beachten | Kinderflohmärkte als Kategorie n. v. | hoch (Kooperation) |
| Meine-Flohmarkt-Termine / krencky24 / meine-kinderflohmarkt-termine.de / marktundkunst.com | Flohmärkte, Kinderflohmärkte, Kunsthandwerk | Bundesweit | Keine API/Feed gefunden; Serientermine werden unterstützt | n. v. | n. v. | Eigene Kinderflohmarkt-Seite | hoch (Kooperation) |
| Mittelalter-Kalender (mittelalterkalender.info, marktkalendarium.de, mittelalter-zeitreise.de) | Mittelaltermärkte, Ritterturniere; „weit über 1000" Märkte pro Jahr | Bundesweit | Keine API; Hobby-/Kleinbetreiber | – | Datenbankschutz wahrscheinlich, Erlaubnis einholen | – | mittel (Kooperation) |
| regioactive.de | Konzerte, Partys, Kultur | Bundesweit | Keine öffentliche API; Syndikation an Stadtportale (z. B. visit-mannheim.de) über B2B-Absprachen | Lizenz auf Anfrage | n. v. | – | mittel (Kooperation) |
| Rausgegangen | Kultur, Konzerte, Partys (städtisch) | Großstädte | Keine öffentliche API; individuelle Zusammenarbeit über „Zentrale"; Seite laut Dritten seit 09/2026 hinter Botschutz | – | – | – | gering–mittel |
| Kinderzeit-App (kinderzeitapp.de) | Familienaktivitäten, Community-Beiträge | Ausgewählte Städte | Keine API/Partnerprogramm | – | – | Ja (Kernthema) | Wettbewerber, keine Quelle |
| Thüringer Familien-App (TMSGAF) | Familienangebote, ThüCAT-Events, Familienkompass | Thüringen | API nur für Anbieter (Eingang), keine Datenausgabe | – | Nutzungs- und Teilnahmebedingungen TMSGAF | Ja | gering als Quelle, hoch als Partner/Vorbild |
| Deutscher Schaustellerbund, festivalsindeutschland.de, flohmarkt.info, kinderzeit.de | Volksfeste/Kirmes, Festivals, Flohmärkte | – | n. v. | – | – | – | n. v. – direkt anfragen |
| Lokalzeitungen, Amtsblatt-Verlage, Radiosender, Stadtmagazine | Lokale Termine | Regional | Nur Kooperation; RLP beliefert Amtsblatt-Verlage bereits aus dem DataHub, d. h. Verlage sind oft *Abnehmer* derselben Daten | – | Vertrag | – | mittel |

### F. Offene Wissensbasen und Ergänzungen

| Quelle | Nutzen | Zugang | Lizenz | Eignung |
|---|---|---|---|---|
| OpenStreetMap | Veranstaltungsorte, Marktplätze (amenity=marketplace), Spielplätze; keine verlässlichen Termine | Overpass/Planet-Extrakte; eigene oder kommerzielle Kacheln (OSM-Tiles „not intended for commercial use") | ODbL: kommerziell erlaubt, Namensnennung „OpenStreetMap", Share-Alike für abgeleitete Datenbanken | mittel (Geo-Anreicherung) |
| Wikidata | Wiederkehrende Großereignisse (Volksfeste, Weihnachtsmärkte) als Entitäten; Abdeckung n. v. | SPARQL | CC0; Vorsicht: kein Kopieren zwischen OSM und Wikidata | gering–mittel |
| schema.org-Event-Markup auf Veranstalter-Websites | Strukturierte Events (z. B. ADticket-Seiten enthalten JSON-LD) | Nur mit Erlaubnis bzw. für eigene Partner auslesen; Markup ist keine Lizenz | Nutzungsbedingungen der Website | gering ohne Vertrag |
| Kirchengemeinden, Vereinsplattformen, Bibliotheksverbünde | Gemeindefeste, Basare, Lesungen | n. v. – keine zentrale offene API verifiziert | – | mittel (über Einreichungsformular) |

## Details

### German Tourism Knowledge Graph (DZT)

- **Zugang:** Eine E-Mail an open-data@germany.travel mit Firma, E-Mail-Adresse und Ansprechperson genügt. Man erhält einen API-Key und kann laut Betreiberpapier „free of charge" abrufen. Die Doku liegt unter changelog-dzt-kg.readme.io. Seit März 2026 gibt es drei Zugänge auf dieselbe Datenbasis: API (für Apps), MCP-Server (für KI-Agenten, z. B. Chat-Funktion „Was können wir jetzt machen?") und Serviceportal (kuratierte Pakete).
- **Abdeckung:** Laut DZT-Datensatzseite (open-data-germany.org/en/dataset) sind „more than 500,000 up-to-date data records" verfügbar, davon „approximately 200,000 tourism-related objects (POIs, tours, events, restaurants, hotels, etc.)" und weitere 310.000 Infrastrukturdatensätze; 239.000 schema:Event-Instanzen (Stand 07.03.2024). Daten aller 16 Länder, täglich aktualisiert, angereichert mit ÖPNV-Haltestellen und Ladesäulen.
- **Einschränkungen:** Es landen nur Datensätze mit offener Lizenz und ausreichender Qualität im KG (Bayern: Content-Score ≥ 70). Ein Familienfilter ist nicht dokumentiert. Dorf- und Vereinsfeste fehlen, wenn die örtliche Tourist-Info sie nicht pflegt. Die Ausnahme Brandenburg mit CC BY-NC-ND muss technisch ausgefiltert oder vertraglich geklärt werden.
- **Pflichten:** CC BY/BY-SA verlangen Namensnennung (Urheber, Lizenz, Link) je Datensatz. BY-SA verlangt außerdem, dass bearbeitete Inhalte unter derselben Lizenz weitergegeben werden. Speichern und Cachen erlaubt CC grundsätzlich; Aktualität muss man durch tägliche Synchronisation selbst sicherstellen.

### Thüringen und Ostthüringen/Greiz im Detail

- **ThüCAT** ist die naheliegende Primärquelle. Das Familienportal „Rosa Krokodil" und die Thüringer Familien-App nutzen ThüCAT bereits. Das bestätigt, dass Familienanwendungen akzeptierte Use-Cases sind.
- **Lücke im ländlichen Raum:** Der Kalender des Landkreises Greiz listet am 10.10.2026 u. a. „Hallen Flohmarkt" (Alte Greika Werk IV), „Apfelfest im Rittergut Kleingera" und „Kunst-, Handwerk- & Kreativmarkt". Der Kalender der Stadt Greiz führt „Herbstmarkt für Kindersachen" (Berga/Elster), „Kinderdrachenfest in Gommla" und „Lampionumzug und Halloweenparty". Genau das sind die spontanen Familienaktivitäten, die die App braucht. Ob sie in ThüCAT stehen, hängt davon ab, ob die zuständige Redaktion sie pflegt; ein eigener API-Zugang dieser Kalender wurde nicht gefunden.
- **Vogtland-Effekt:** Die Vogtlandhalle Greiz erzeugt ihren Veranstaltungsplan „mit freundlicher Unterstützung des Vogtlandkreises aus der Zentralen Veranstaltungsdatenbank freizeitkalender.eu". Für Greiz ist die sächsische Vogtland-Datenbank damit faktisch eine Primärquelle. Die Hallen-Events erscheinen zusätzlich bei ADticket/Reservix: klassisches Dubletten-Szenario.
- **Empfehlung:** Für Ostthüringen ist eine Dreifach-Strategie nötig: ThüCAT plus Freizeitkalender Vogtland plus eigenes Einreichungsformular für Vereine, Kitas, Kirchgemeinden und Feuerwehren. Ohne Letzteres bleibt die App im ländlichen Raum dünn.

### Ticketing: wofür es taugt

- **Eventim/AWIN:** Der Produktfeed eignet sich, um Kindertheater, Familienshows und Musicals mit Kauf-Link zu zeigen und Provision zu verdienen. Spontanität ist begrenzt (Vorverkauf), Flohmärkte und Feste fehlen.
- **Reservix/ADticket:** Für Mittel- und Kleinstädte die relevantere Ticketquelle (z. B. Kindermusicals in der Vogtlandhalle Greiz). Die Developer-API ist partnerbasiert; Reservix und ADticket vor Integration als **eine** Quelle behandeln.
- **Ticketmaster:** Technisch am einfachsten (Self-Service), für Ostthüringen aber kaum relevant. 5.000 Calls/Tag reichen nur für gecachte Abrufe, nicht für Live-Abfragen pro Nutzer.
- **Eventfrog:** Offenste Ticketing-API (Public Key, Filter nach Region/Kategorie/Datum). Lohnt einen Test, sobald die deutsche Abdeckung in der Zielregion messbar ist.

### Dubletten-Risiko: wo sich Quellen überschneiden

| Überschneidung | Mechanismus | Konsequenz |
|---|---|---|
| Landesdatenbanken ↔ DZT-KG | Alle LMOs liefern Open Data in den KG (BayernCloud, SaTourN, Niedersachsen Hub, Data Hub NRW, ThüCAT, SAiNT, mein.toubiz) | Pro Land **entweder** KG **oder** Landes-API als Hauptquelle; Landes-API nur ergänzend (Echtzeit, Felder, Closed-Data-Vereinbarungen) |
| open.destination.one ↔ Niedersachsen/Sachsen/Leipzig ↔ KG | Gleiche destination.one-Datenbasis | Dreifach-Dubletten möglich; IDs der Primärsysteme mitführen |
| ThüCAT ↔ Content Hub Hessen | Gleiche Technik, getrennte Daten | Geringes Risiko |
| ThüCAT ↔ Thüringer Familien-App | Familien-App übernimmt ThüCAT | Kein Datenzugewinn aus der Familien-App |
| Reservix ↔ ADticket | Gemeinsame Bestände | Als eine Quelle behandeln |
| Eventim ↔ Reservix ↔ Tourismus-DBs | Veranstalter verkaufen mehrkanalig; Tourist-Infos pflegen Hallen-Events zusätzlich | Dubletten-Matching über Ort + Startzeit + normalisierten Titel |
| freizeitkalender.eu ↔ greiz.de/Vogtlandhalle ↔ ADticket | Syndikation | Freizeitkalender als „Master" für Vogtland-Events |
| Berlin Open Data ↔ visitBerlin/KG | Senatsdaten vs. Tourismusdaten | Weihnachtsmärkte/Volksfeste aus Senatsdaten bevorzugen (amtlich, CC BY) |

**Technische Empfehlung:** ein kanonisches Event-Modell (schema.org/ODTA) mit Feldern `source`, `source_id`, `license`, `attribution`, `primary_system_id` und einem Matching-Score (Geodistanz < 200 m, Start ± 30 min, Titelähnlichkeit). Dazu eine Quell-Priorität je Region.

### Rechtlicher Rahmen

- **Datenbankherstellerrecht (§§ 87a ff. UrhG):** Veranstaltungskalender sind regelmäßig geschützte Datenbanken, wenn eine wesentliche Investition in Beschaffung, Prüfung oder Darstellung der Daten steckt. Der EuGH entschied am 03.06.2021 in „CV-Online Latvia" (C-762/19), dass eine Meta-Suchmaschine Daten entnimmt und weiterverwendet. Verletzt ist das Recht, wenn dies die Amortisation der Investition gefährdet, typischerweise durch ein Ersatzprodukt. Eine Familien-App, die fremde Kalender übernimmt, liegt nahe an diesem Szenario.
- **Wiederholte Kleinentnahmen:** Nach BGH „Zweite Zahnarztmeinung II" (I ZR 196/08, 01.12.2010) ist auch die wiederholte, systematische Übernahme unwesentlicher Teile verboten, wenn sie in der Summe einen wesentlichen Teil ergibt oder der normalen Auswertung zuwiderläuft. Regelmäßiges Scraping fällt typischerweise darunter. Nach BGH „HIT BILANZ" (I ZR 290/02) ist unerheblich, ob die Anordnung übernommen wird oder ob die Kopie einem anderen Zweck dient.
- **Folgerung:** Nur lizenzierte Daten (CC, ODbL, Partnerverträge) oder Daten, die Veranstalter selbst einreichen. schema.org-Markup auf fremden Websites ist keine Lizenz. Fakten (Datum, Ort) einzelner Events darf man nennen; die systematische Übernahme ganzer Kalender nicht. Für Texte und Bilder gilt zusätzlich das Urheberrecht; Bilder nur mit expliziter CC-Lizenz übernehmen.

## Recommendations (Phasenplan)

### Phase 1 – Sofort (vor/zur Beta, Region Ostthüringen + Basis bundesweit)

1. **DZT Knowledge Graph:** Formlose E-Mail an open-data@germany.travel (Firma, Kontakt, Use-Case „Familien-App, kommerziell"). Gleich klären: kommerzielle Nutzung, Umgang mit CC BY-NC-ND-Datensätzen, MCP-Server-Zugang.
2. **ThüCAT:** API-Key über die Entwicklerseite cms.thuecat.org/developer anfordern. Projekt beschreiben und Domänen *ttgds:Event*, *PointOfInterest* (Spielplätze, Parks) und *Organization* (Vereine) beantragen. Ansprechpartner Thüringer Tourismus GmbH: Detlef Klinge.
3. **open.destination.one / Open Data Finder Sachsen:** Registrieren, Lizenzschlüssel für destination.meta holen. Deckt Westsachsen/Vogtland, Leipzig und Niedersachsen mit ab.
4. **Berlin Open Data:** Weihnachtsmärkte, Straßen-/Volksfeste und Trödelmärkte direkt über die SimpleSearch-JSON-API einbinden (kein Key, CC BY). Das ist ein guter Saisontest für die Weihnachtsmarkt-Funktion im November.
5. **Freizeitkalender Vogtland:** Andreas Bachmann (Landratsamt Vogtlandkreis, Amt für Kataster und Geoinformation, Plauen; Tel. +49 3741 300 240 9, bachmann.andreas@vogtlandkreis.de) wegen eines Daten-Feeds ansprechen. Argument: zusätzliche Reichweite für die laut Vogtlandkreis „ca. 1000 Veranstalter", die die Plattform nutzen.
6. **Eigenes Einreichungsformular** für Veranstalter mit expliziter Lizenzeinwilligung (z. B. CC BY 4.0 oder einfache Nutzungsrechte), Serientermin-Funktion und Kinder-/Altersfeld. Das ist im ländlichen Raum die wichtigste Datenquelle überhaupt.
7. **Lizenz-Engine** von Tag 1: Lizenz und Attribution je Datensatz speichern, NC/ND-Datensätze herausfiltern, Quellenhinweis in der Detailansicht.

### Phase 2 – Nach der Beta (bundesweite Ausweitung, Monetarisierung)

1. **Landes-APIs gezielt ergänzen**, wo der KG lückenhaft ist: BayernCloud (Account auf bayerncloud.digital, API-Token), Open Data Finder NRW (Lizenzschlüssel destination.meta), Niedersachsen Export-API, TMBW-Open-Data-Pool (Ansprechpartnerin Susanne Bleibel), MV-Datenbank (Carsten Pescht).
2. **Eventim via AWIN** (Publisher-Bewerbung, bis zu 28 Tage Prüfung) und **Reservix/ADticket-Partnerprogramm** (Developer-API, AWIN möglich) für Familienshows und Kindertheater mit Kauf-Link.
3. **Eventfrog Public API** testen und die Abdeckung in Thüringen/Sachsen messen. **Ticketmaster** nur als Ergänzung für Großstädte.
4. **Familienklassifikation** auf allen Quellen trainieren und evaluieren: Kategorien, Stichwörter wie „Kinder", „Familie", „Puppentheater", „Kinderflohmarkt", Uhrzeit und Ort (z. B. Spielplatznähe über OSM).

### Phase 3 – Mit Kooperationen (Datenpartnerschaften)

1. **Flohmärkte:** marktcom.de Deutschland GmbH (technik@marktcom.de) und Betreiber des Meine-Flohmarkt-Termine-/krencky24-Netzwerks (inkl. meine-kinderflohmarkt-termine.de) wegen Lizenz-Feed mit Attribution und Deep-Link anfragen.
2. **Mittelaltermärkte/Ritterturniere:** Betreiber von mittelalterkalender.info und marktkalendarium.de; Gegenleistung Reichweite/Verlinkung.
3. **Volksfeste/Kirmes:** Deutscher Schaustellerbund und Landesverbände (Thüringen/Sachsen) direkt anfragen; Datenangebot nicht verifiziert.
4. **Kommunen in Ostthüringen:** Stadt Greiz (Tourist-Information) und Landkreis Greiz: Bitte um Einpflege der Termine in ThüCAT oder direkten Feed. Gleiches für Gera, Zeulenroda-Triebes und Altenburger Land über die zuständigen ThüCAT-DMOs.
5. **Medien:** regioactive (B2B-Lizenz) und Rausgegangen („individuelle Zusammenarbeit"). Lokalzeitungen und Amtsblatt-Verlage eher als Distributions- oder Gegenseitigkeitspartner ansprechen, weil sie oft dieselben Tourismusdaten nutzen.
6. **Thüringer Familien-App (TMSGAF):** Austausch suchen. Sie ist kein Datenlieferant, könnte aber über Kooperation (z. B. gemeinsames Anbieter-Onboarding) Synergien bringen.

## Caveats

- **Nicht verifiziert** wurden: offene Event-Datensätze von Hamburg, München, Köln, Dresden, Erfurt und Jena (eigene Portale); Datenangebote des Deutschen Schaustellerbunds, von festivalsindeutschland.de, flohmarkt.info und kinderzeit.de; die Nutzungsbedingungen von regioactive und Eventfrog; konkrete Familienkategorien in Ticketmaster- und Eventfrog-Klassifikationen.
- **Zahlen haben unterschiedliche Stände:** 239.000 KG-Events (März 2024), Niedersachsen-Zahlen (Feb. 2025), BayernCloud-Startzahlen (Livegang). Die Ticketmaster-Rate-Limits widersprechen sich in der eigenen Doku (5 vs. 2 Anfragen/Sekunde).
- **Die Lizenzlage ist datensatzbezogen** und kann sich ändern (z. B. MV-Umstellung auf CC, Brandenburg NC-ND). Vor kommerziellem Launch alle Lizenzen und AGB schriftlich bestätigen lassen; dieser Bericht ersetzt keine Rechtsberatung.
- **Die Aussage zum Botschutz bei Rausgegangen** stammt aus einem Drittprojekt auf GitHub und wurde nicht selbst geprüft.
