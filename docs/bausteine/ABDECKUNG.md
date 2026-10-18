# Baukasten: Abdeckung der Aktivitäten

> **ERZEUGT** von `npm run kit:coverage` aus `data/` und `assets/bausteine/katalog.json`. Nicht von Hand ändern. Anleitung: [README.md](README.md).

104 Aktivitäten aus `data/` (die KI-Aktivitäten aus der Datenbank fehlen; sie lassen sich mit `-- --extra datei.json` dazunehmen), 50 Bausteine. Ein Gegenstand zählt, wenn er als Material eingetragen ist oder sein Name im Text (Titel, Kurzbeschreibung, Schritte) steht. Die Suche im Text ist grob (Wortstamm des Namens), sie findet auch zufällige Treffer und übersieht Umschreibungen.

## Überblick

- **121** verschiedene Gegenstände kommen vor, **42** davon haben einen Baustein, **79** keinen.
- **95** von 104 Aktivitäten haben mindestens einen Gegenstand mit Baustein, **12** haben für alle ihre Gegenstände einen.
- Im Mittel nennt eine Aktivität **5,2** Gegenstände.

## Gegenstände nach Häufigkeit

### häufig (10 oder mehr Aktivitäten): 12

| Gegenstand | Schlüssel | Aktivitäten (als Material + nur im Text) | Baustein |
| --- | --- | --- | --- |
| Wasser | `water` | 29 (5 + 24) | `water` |
| Papier | `paper` | 28 (24 + 4) | `paper` |
| Stifte | `pencils` | 25 (20 + 5) | **fehlt** |
| Löffel | `spoon` | 23 (5 + 18) | `wooden-spoon` |
| Plastikbecher | `plasticCup` | 18 (18 + 0) | `cup` |
| Schüssel | `bowl` | 16 (16 + 0) | `bowl` |
| Handtuch | `towel` | 16 (12 + 4) | **fehlt** |
| Decke | `blanket` | 14 (7 + 7) | `blanket` |
| Leitungswasser | `tapWater` | 14 (14 + 0) | `water` |
| Stock | `stick` | 13 (3 + 10) | `stick` |
| Tablett oder Backblech | `tray` | 11 (11 + 0) | `tray`, `baking-tray` |
| Schere | `scissors` | 10 (9 + 1) | `scissors`, `child-scissors` |

### mittel (3 bis 9): 53

| Gegenstand | Schlüssel | Aktivitäten (als Material + nur im Text) | Baustein |
| --- | --- | --- | --- |
| Messer | `knife` | 9 (9 + 0) | `knife` |
| Klebeband | `tape` | 8 (8 + 0) | **fehlt** |
| Ball | `ball` | 7 (3 + 4) | **fehlt** |
| Korb | `basket` | 7 (7 + 0) | `basket` |
| Karton | `cardboardBox` | 7 (6 + 1) | `cardboard-box` |
| Filzstifte | `markers` | 7 (7 + 0) | **fehlt** |
| Salz | `salt` | 7 (7 + 0) | **fehlt** |
| Rucksack | `backpack` | 6 (6 + 0) | **fehlt** |
| Stühle | `chairs` | 6 (5 + 1) | `chair` |
| Trinkflasche | `drinkBottle` | 6 (6 + 0) | `bottle` |
| Gabel | `fork` | 6 (6 + 0) | `fork` |
| Öl | `oil` | 6 (5 + 1) | **fehlt** |
| Socken | `socks` | 6 (4 + 2) | `sock` |
| Kochlöffel | `woodenSpoon` | 6 (6 + 0) | `wooden-spoon` |
| Wolle | `wool` | 6 (6 + 0) | **fehlt** |
| Bananen | `banana` | 5 (4 + 1) | `bananas` |
| Buch oder Bilderbuch | `book` | 5 (5 + 0) | **fehlt** |
| Sahne | `cream` | 5 (2 + 3) | **fehlt** |
| Spülmittel | `dishSoap` | 5 (5 + 0) | **fehlt** |
| Schraubglas | `jar` | 5 (5 + 0) | **fehlt** |
| Radio oder Lautsprecher | `musicPlayer` | 5 (5 + 0) | `radio` |
| Teller | `plate` | 5 (4 + 1) | `plate` |
| Kochtopf | `pot` | 5 (4 + 1) | **fehlt** |
| Tuch | `scarf` | 5 (4 + 1) | **fehlt** |
| Zucker | `sugar` | 5 (5 + 0) | **fehlt** |
| Wasserfarben | `watercolors` | 5 (5 + 0) | **fehlt** |
| Apfel | `apple` | 4 (3 + 1) | `baked-apples`, `fruit` |
| Pinsel | `brush` | 4 (4 + 0) | **fehlt** |
| Eimer | `bucket` | 4 (4 + 0) | `bucket` |
| Würfel | `dice` | 4 (1 + 3) | **fehlt** |
| Eier | `egg` | 4 (3 + 1) | **fehlt** |
| Taschenlampe | `flashlight` | 4 (4 + 0) | `flashlight` |
| Altes T-Shirt | `oldShirt` | 4 (4 + 0) | **fehlt** |
| Backofen | `oven` | 4 (3 + 1) | `oven-mitt` |
| Küchenpapier | `paperTowels` | 4 (4 + 0) | **fehlt** |
| Herd | `stove` | 4 (4 + 0) | `oven-mitt` |
| Gemüse | `vegetables` | 4 (4 + 0) | `vegetables` |
| Warme Kleidung | `warmClothes` | 4 (4 + 0) | **fehlt** |
| Joghurt | `yogurt` | 4 (3 + 1) | **fehlt** |
| Papprollen | `cardboardTubes` | 3 (3 + 0) | **fehlt** |
| Straßenkreide | `chalk` | 3 (3 + 0) | **fehlt** |
| Kakao | `cocoa` | 3 (3 + 0) | **fehlt** |
| Kissen | `cushions` | 3 (3 + 0) | `pillow` |
| Mehl | `flour` | 3 (3 + 0) | **fehlt** |
| Kleber | `glue` | 3 (2 + 1) | `glue-tube` |
| Zitronen | `lemon` | 3 (3 + 0) | `lemon-halves` |
| Lupe | `magnifier` | 3 (3 + 0) | **fehlt** |
| Papiertüte | `paperBag` | 3 (3 + 0) | `paper-bag` |
| Nudeln | `pasta` | 3 (1 + 2) | **fehlt** |
| Schwamm | `sponge` | 3 (3 + 0) | **fehlt** |
| Wraps (Weizentortillas) | `tortillas` | 3 (1 + 2) | **fehlt** |
| Essig | `vinegar` | 3 (3 + 0) | **fehlt** |
| Schneebesen | `whisk` | 3 (3 + 0) | **fehlt** |

### selten (1 bis 2): 56

| Gegenstand | Schlüssel | Aktivitäten (als Material + nur im Text) | Baustein |
| --- | --- | --- | --- |
| Natron | `bakingSoda` | 2 (2 + 0) | **fehlt** |
| Brot | `bread` | 2 (1 + 1) | **fehlt** |
| Butter | `butter` | 2 (1 + 1) | **fehlt** |
| Knöpfe | `buttons` | 2 (1 + 1) | **fehlt** |
| Käse | `cheese` | 2 (2 + 0) | **fehlt** |
| Kastanien | `chestnuts` | 2 (1 + 1) | `chestnuts` |
| Flache Steine (handgroß) | `flatStones` | 2 (2 + 0) | **fehlt** |
| Eiswürfel | `ice` | 2 (2 + 0) | **fehlt** |
| Murmeln | `marbles` | 2 (2 + 0) | **fehlt** |
| Milch | `milk` | 2 (1 + 1) | **fehlt** |
| Handy, Tablet oder Kamera | `phone` | 2 (2 + 0) | **fehlt** |
| Spielkarten | `playingCards` | 2 (2 + 0) | `playing-cards` |
| Pfützen | `puddles` | 2 (1 + 1) | `puddle` |
| Rosinen | `raisins` | 2 (2 + 0) | **fehlt** |
| Nudelholz | `rollingPin` | 2 (2 + 0) | **fehlt** |
| Großer Stein | `stone` | 2 (1 + 1) | **fehlt** |
| Strohhalme | `straws` | 2 (2 + 0) | **fehlt** |
| Tomatensauce | `tomatoSauce` | 2 (2 + 0) | `pizza` |
| Alufolie | `aluminumFoil` | 1 (1 + 0) | **fehlt** |
| Luftballon | `balloon` | 1 (1 + 0) | **fehlt** |
| Helles Bettlaken | `bedsheet` | 1 (1 + 0) | `blanket` |
| Fahrrad und Helm | `bike` | 1 (1 + 0) | `bike` |
| Vogelfutter (Körner) | `birdSeed` | 1 (1 + 0) | **fehlt** |
| Mixer oder Pürierstab | `blender` | 1 (1 + 0) | **fehlt** |
| Zimt | `cinnamon` | 1 (1 + 0) | **fehlt** |
| Kokosfett | `coconutFat` | 1 (1 + 0) | **fehlt** |
| Münzen | `coins` | 1 (1 + 0) | **fehlt** |
| Ausstechformen | `cookieCutters` | 1 (1 + 0) | **fehlt** |
| Speisestärke | `cornstarch` | 1 (1 + 0) | **fehlt** |
| Wattestäbchen | `cottonSwabs` | 1 (1 + 0) | `cotton-swab` |
| Kressesamen | `cressSeeds` | 1 (1 + 0) | **fehlt** |
| Alte Kleidung zum Verkleiden | `dressUpClothes` | 1 (1 + 0) | **fehlt** |
| Gefrierbeutel | `freezerBags` | 1 (1 + 0) | **fehlt** |
| Weiches Obst, z. B. Beeren | `fruit` | 1 (1 + 0) | `fruit` |
| Frische Kräuter | `herbs` | 1 (1 + 0) | **fehlt** |
| Bügeleisen | `iron` | 1 (1 + 0) | **fehlt** |
| Wasserkocher | `kettle` | 1 (1 + 0) | **fehlt** |
| LED-Licht oder Laternenstab | `ledLight` | 1 (1 + 0) | **fehlt** |
| Haferflocken | `oats` | 1 (1 + 0) | `oat-balls` |
| Altes batteriebetriebenes Gerät | `oldDevice` | 1 (1 + 0) | **fehlt** |
| Zwiebelschalen | `onionSkins` | 1 (1 + 0) | **fehlt** |
| Gemahlener Pfeffer | `pepper` | 1 (1 + 0) | **fehlt** |
| Große Kartoffeln | `potato` | 1 (1 + 0) | **fehlt** |
| Quark | `quark` | 1 (1 + 0) | **fehlt** |
| Gummistiefel | `rainBoots` | 1 (1 + 0) | Regen-Kleidung (Figur) |
| Regenjacke | `rainJacket` | 1 (1 + 0) | Regen-Kleidung (Figur) |
| Rotkohl | `redCabbage` | 1 (1 + 0) | **fehlt** |
| Seil | `rope` | 1 (1 + 0) | **fehlt** |
| Schraubenzieher | `screwdriver` | 1 (1 + 0) | **fehlt** |
| Holzspieß | `skewer` | 1 (1 + 0) | **fehlt** |
| Mineralwasser mit Kohlensäure | `sparklingWater` | 1 (1 + 0) | **fehlt** |
| Bach mit Brücke | `stream` | 1 (1 + 0) | **fehlt** |
| Kuscheltiere | `stuffedAnimals` | 1 (1 + 0) | **fehlt** |
| Zahnstocher | `toothpicks` | 1 (1 + 0) | **fehlt** |
| Kurkuma | `turmeric` | 1 (1 + 0) | **fehlt** |
| Trockenhefe | `yeast` | 1 (1 + 0) | **fehlt** |

## Materialien ohne Baustein

Nach Häufigkeit. Ein neuer Baustein lohnt sich vor allem oben in dieser Liste (Regeln: [README.md](README.md), „Neue Bausteine“).

Stifte (`pencils`, 25), Handtuch (`towel`, 16), Klebeband (`tape`, 8), Ball (`ball`, 7), Filzstifte (`markers`, 7), Salz (`salt`, 7), Rucksack (`backpack`, 6), Öl (`oil`, 6), Wolle (`wool`, 6), Buch oder Bilderbuch (`book`, 5), Sahne (`cream`, 5), Spülmittel (`dishSoap`, 5), Schraubglas (`jar`, 5), Kochtopf (`pot`, 5), Tuch (`scarf`, 5), Zucker (`sugar`, 5), Wasserfarben (`watercolors`, 5), Pinsel (`brush`, 4), Würfel (`dice`, 4), Eier (`egg`, 4), Altes T-Shirt (`oldShirt`, 4), Küchenpapier (`paperTowels`, 4), Warme Kleidung (`warmClothes`, 4), Joghurt (`yogurt`, 4), Papprollen (`cardboardTubes`, 3), Straßenkreide (`chalk`, 3), Kakao (`cocoa`, 3), Mehl (`flour`, 3), Lupe (`magnifier`, 3), Nudeln (`pasta`, 3), Schwamm (`sponge`, 3), Wraps (Weizentortillas) (`tortillas`, 3), Essig (`vinegar`, 3), Schneebesen (`whisk`, 3), Natron (`bakingSoda`, 2), Brot (`bread`, 2), Butter (`butter`, 2), Knöpfe (`buttons`, 2), Käse (`cheese`, 2), Flache Steine (handgroß) (`flatStones`, 2), Eiswürfel (`ice`, 2), Murmeln (`marbles`, 2), Milch (`milk`, 2), Handy, Tablet oder Kamera (`phone`, 2), Rosinen (`raisins`, 2), Nudelholz (`rollingPin`, 2), Großer Stein (`stone`, 2), Strohhalme (`straws`, 2), Alufolie (`aluminumFoil`, 1), Luftballon (`balloon`, 1), Vogelfutter (Körner) (`birdSeed`, 1), Mixer oder Pürierstab (`blender`, 1), Zimt (`cinnamon`, 1), Kokosfett (`coconutFat`, 1), Münzen (`coins`, 1), Ausstechformen (`cookieCutters`, 1), Speisestärke (`cornstarch`, 1), Kressesamen (`cressSeeds`, 1), Alte Kleidung zum Verkleiden (`dressUpClothes`, 1), Gefrierbeutel (`freezerBags`, 1), Frische Kräuter (`herbs`, 1), Bügeleisen (`iron`, 1), Wasserkocher (`kettle`, 1), LED-Licht oder Laternenstab (`ledLight`, 1), Altes batteriebetriebenes Gerät (`oldDevice`, 1), Zwiebelschalen (`onionSkins`, 1), Gemahlener Pfeffer (`pepper`, 1), Große Kartoffeln (`potato`, 1), Quark (`quark`, 1), Rotkohl (`redCabbage`, 1), Seil (`rope`, 1), Schraubenzieher (`screwdriver`, 1), Holzspieß (`skewer`, 1), Mineralwasser mit Kohlensäure (`sparklingWater`, 1), Bach mit Brücke (`stream`, 1), Kuscheltiere (`stuffedAnimals`, 1), Zahnstocher (`toothpicks`, 1), Kurkuma (`turmeric`, 1), Trockenhefe (`yeast`, 1)

## Je Aktivität

| Aktivität | Gegenstände | davon mit Baustein | Bausteine |
| --- | --- | --- | --- |
| Hüpfekästchen (`hopscotch`) | 2 | 0 | – |
| Kniereiter und Fingerspiele (`knee-rides-and-finger-rhymes`) | 0 | 0 | – |
| Ausflug in die Bücherei (`library-trip`) | 1 | 0 | – |
| Vogelkonzert am Morgen (`morning-bird-concert`) | 1 | 0 | – |
| Foto-Safari in der Nachbarschaft (`neighborhood-photo-safari`) | 1 | 0 | – |
| Guck-guck mit dem Tuch (`peekaboo`) | 1 | 0 | – |
| Bilderbuch mit Geräuschen (`picture-book-sounds`) | 1 | 0 | – |
| Ochs am Berg (`red-light-green-light`) | 0 | 0 | – |
| Straßenkreide-Kunstwerk (`sidewalk-chalk-masterpiece`) | 1 | 0 | – |
| Luftballon-Volleyball (`balloon-volleyball`) | 4 | 1 | `chair` |
| Barfußpfad im Garten oder Park (`barefoot-trail`) | 2 | 1 | `sock` |
| Krabbeltier-Safari (`bug-safari`) | 2 | 1 | `cup` |
| Kastanientiere basteln (`chestnut-animals`) | 5 | 1 | `chestnuts` |
| Stadt, Land, Fluss (`city-country-river`) | 2 | 1 | `paper` |
| Wolkenbilder entdecken (`cloud-pictures`) | 2 | 1 | `blanket` |
| Tanz-Freeze (`dance-freeze`) | 1 | 1 | `radio` |
| Würfel-Workout (`dice-workout`) | 3 | 1 | `paper` |
| Verkleiden und Modenschau (`dress-up-fashion-show`) | 4 | 1 | `radio` |
| Nachtspaziergang mit Taschenlampe (`flashlight-night-walk`) | 2 | 1 | `flashlight` |
| Freundschaftsbänder knüpfen (`friendship-bracelets`) | 3 | 1 | `scissors`, `child-scissors` |
| Ich sehe was, was du nicht siehst (`i-spy`) | 1 | 1 | `stick` |
| Eis in der Tüte (`ice-cream-in-a-bag`) | 9 | 1 | `wooden-spoon` |
| Eigenen Tanz erfinden (`make-up-a-dance`) | 1 | 1 | `radio` |
| Trickfilm mit dem Handy (`stop-motion-film`) | 5 | 1 | `paper` |
| Fortsetzungsgeschichte (`story-chain`) | 1 | 1 | `puddle` |
| Tasche aus einem alten T-Shirt (`tshirt-bag`) | 4 | 1 | `scissors`, `child-scissors` |
| Wer bin ich? (`who-am-i`) | 2 | 1 | `paper` |
| Vögel am Fenster zählen (`window-bird-count`) | 2 | 1 | `paper` |
| Tier-Yoga (`animal-yoga`) | 2 | 2 | `blanket`, `sock` |
| Bananen-Smoothie mixen (`banana-smoothie`) | 6 | 2 | `cup`, `bananas` |
| Badewannen-Labor (`bathtub-lab`) | 6 | 2 | `water`, `cup` |
| Kettenreaktion bauen (`chain-reaction`) | 7 | 2 | `cup`, `playing-cards` |
| Pantomime raten (`charades`) | 3 | 2 | `paper`, `bowl` |
| Bechertürme bauen und umwerfen (`cup-towers`) | 2 | 2 | `cup`, `sock` |
| Escape-Room für die Eltern (`escape-room-for-parents`) | 5 | 2 | `paper`, `cardboard-box` |
| Faltmonster zeichnen (`fold-over-monsters`) | 3 | 2 | `paper`, `stick` |
| Murmelbahn aus Papprollen (`marble-run`) | 5 | 2 | `scissors`, `child-scissors`, `cardboard-box` |
| Natur-Mandala legen (`nature-mandala`) | 2 | 2 | `stick`, `basket` |
| Ich packe meinen Koffer (`packing-suitcase`) | 2 | 2 | `blanket`, `baked-apples`, `fruit` |
| Musik malen (`paint-the-music`) | 3 | 2 | `paper`, `radio` |
| Malen mit Wasser (`painting-with-water`) | 4 | 2 | `water`, `bucket` |
| Papierflieger-Wettbewerb (`paper-plane-contest`) | 3 | 2 | `paper`, `basket` |
| Schneeflocken aus Papier schneiden (`paper-snowflakes`) | 3 | 2 | `paper`, `scissors`, `child-scissors` |
| Musik-Quiz: Die Hits der Eltern (`parents-music-quiz`) | 3 | 2 | `paper`, `radio` |
| Spielplatz-Tour (`playground-tour`) | 3 | 2 | `water`, `bottle` |
| Mit Bus oder Bahn ins Blaue (`ride-into-the-unknown`) | 3 | 2 | `water`, `bottle` |
| Schnitzeljagd im Garten (`scavenger-hunt`) | 3 | 2 | `paper`, `cardboard-box` |
| Butter im Glas schütteln (`shake-butter`) | 8 | 2 | `wooden-spoon`, `blanket` |
| Sockenbälle in den Korb (`sock-ball-toss`) | 3 | 2 | `basket`, `sock` |
| Schwamm-Wasserschlacht (`sponge-water-fight`) | 4 | 2 | `water`, `bucket` |
| Sterne beobachten (`stargazing`) | 3 | 2 | `blanket`, `flashlight` |
| Stöckchen-Rennen an der Brücke (`stick-race`) | 3 | 2 | `water`, `stick` |
| Gipfelstürmer: Auf den höchsten Punkt in der Nähe (`summit-hike`) | 4 | 2 | `water`, `bottle` |
| Einkaufs-Rallye (`supermarket-rally`) | 4 | 2 | `paper`, `basket` |
| Kuscheltier-Tierarzt (`teddy-vet`) | 6 | 2 | `paper`, `wooden-spoon` |
| Herbst-Bingo im Park (`autumn-bingo`) | 5 | 3 | `paper`, `paper-bag`, `chestnuts` |
| Plätzchen ausstechen (`christmas-cookies`) | 9 | 3 | `bowl`, `tray`, `baking-tray`, `oven-mitt` |
| Krabbeltunnel aus Stühlen (`crawling-tunnel`) | 4 | 3 | `blanket`, `chair`, `pillow` |
| Familien-Radtour (`family-bike-tour`) | 5 | 3 | `water`, `bottle`, `bike` |
| Fingerabdruck-Tiere (`fingerprint-animals`) | 7 | 3 | `water`, `paper` |
| Welches Boot trägt am meisten? (`foil-boats`) | 6 | 3 | `water`, `paper`, `bowl` |
| Waldtag mit Picknick (`forest-day-picnic`) | 5 | 3 | `blanket`, `bottle`, `paper-bag` |
| Draußen-Olympiade (`garden-olympics`) | 6 | 3 | `wooden-spoon`, `bucket` |
| Kartenhaus bauen (`house-of-cards`) | 3 | 3 | `blanket`, `stick`, `playing-cards` |
| Eiswürfel angeln (`ice-cube-fishing`) | 7 | 3 | `water`, `cup` |
| Küchen-Konzert (`kitchen-concert`) | 5 | 3 | `wooden-spoon`, `cup` |
| Ostereier-Suche mit Papiereiern (`paper-easter-egg-hunt`) | 5 | 3 | `paper`, `scissors`, `child-scissors`, `basket` |
| Pfeffer auf der Flucht (`pepper-on-the-run`) | 5 | 3 | `water`, `plate` |
| Geschichtensteine bemalen (`story-stones`) | 8 | 3 | `water`, `basket` |
| Altes Gerät aufschrauben (`take-apart-an-old-device`) | 7 | 3 | `stick`, `tray`, `baking-tray`, `glue-tube` |
| Züge gucken (`watching-trains`) | 3 | 3 | `water`, `bottle`, `plate` |
| Natron-Vulkan (`baking-soda-volcano`) | 7 | 4 | `water`, `wooden-spoon`, `cup`, `tray`, `baking-tray` |
| Futterglocken für Vögel (`bird-feeder-cakes`) | 10 | 4 | `cup`, `stick`, `wooden-spoon`, `oven-mitt` |
| Tanzende Rosinen (`dancing-raisins`) | 7 | 4 | `water`, `cup`, `stick` |
| Riesen-Seifenblasen (`giant-soap-bubbles`) | 8 | 4 | `water`, `wooden-spoon`, `tray`, `baking-tray` |
| Kresse säen (`grow-cress`) | 7 | 4 | `water`, `paper`, `plate` |
| Hindernisparcours im Flur (`obstacle-course`) | 5 | 4 | `blanket`, `cardboard-box`, `chair`, `pillow` |
| Kissenburg und Taschenlampen-Geschichten (`pillow-fort`) | 4 | 4 | `blanket`, `chair`, `flashlight`, `pillow` |
| Kartoffeldruck (`potato-stamps`) | 13 | 4 | `water`, `paper`, `knife`, `cardboard-box` |
| Wraps zum Selberrollen (`roll-your-own-wraps`) | 7 | 4 | `bowl`, `knife`, `plate`, `vegetables` |
| Sockenpuppen-Theater (`sock-puppet-theater`) | 8 | 4 | `scissors`, `child-scissors`, `cardboard-box`, `sock`, `glue-tube` |
| Schatzkorb (`treasure-basket`) | 7 | 4 | `wooden-spoon`, `cup`, `basket` |
| Wandernde Farben (`walking-water`) | 7 | 4 | `water`, `paper`, `cup` |
| Fingerfarben aus Joghurt (`yogurt-finger-paint`) | 8 | 4 | `paper`, `wooden-spoon`, `bowl`, `tray`, `baking-tray` |
| Bananen-Pfannkuchen (`banana-pancakes`) | 7 | 5 | `wooden-spoon`, `bowl`, `fork`, `bananas`, `oven-mitt` |
| Bananen-Joghurt selbst gemacht (`banana-yogurt`) | 6 | 5 | `wooden-spoon`, `bowl`, `chair`, `fork`, `bananas` |
| Zauberschleim aus Speisestärke (`cornstarch-goo`) | 8 | 5 | `water`, `wooden-spoon`, `bowl`, `tray`, `baking-tray` |
| Ostereier mit Zwiebelschalen färben (`onion-skin-easter-eggs`) | 12 | 5 | `water`, `paper`, `wooden-spoon`, `oven-mitt` |
| Laterne aus einer Papiertüte (`paper-bag-lantern`) | 7 | 5 | `paper`, `stick`, `scissors`, `child-scissors`, `glue-tube`, `paper-bag` |
| Restaurant spielen (`play-restaurant`) | 7 | 5 | `paper`, `cup`, `blanket`, `tray`, `baking-tray`, `plate` |
| Geheimschrift mit Zitronensaft (`secret-lemon-ink`) | 6 | 5 | `paper`, `cup`, `knife`, `lemon-halves`, `cotton-swab` |
| Schattentheater (`shadow-theater`) | 8 | 5 | `scissors`, `child-scissors`, `cardboard-box`, `chair`, `flashlight`, `blanket` |
| Bratäpfel aus dem Ofen (`baked-apples`) | 9 | 6 | `wooden-spoon`, `bowl`, `tray`, `baking-tray`, `knife`, `baked-apples`, `fruit`, `oven-mitt` |
| Bananen-Haferkugeln (`banana-oat-balls`) | 8 | 6 | `wooden-spoon`, `bowl`, `fork`, `bananas`, `oven-mitt`, `oat-balls` |
| Schwimmt oder sinkt? (`float-or-sink`) | 9 | 6 | `water`, `wooden-spoon`, `cup`, `bowl`, `baked-apples`, `fruit` |
| Pfützen-Forscher (`puddle-explorers`) | 6 | 6 | `stick`, `scissors`, `child-scissors`, `bucket`, `puddle`, Regen-Kleidung (Figur) |
| Was fehlt? (Kim-Spiel) (`what-is-missing`) | 9 | 6 | `wooden-spoon`, `blanket`, `tray`, `baking-tray`, `sock`, `baked-apples`, `fruit` |
| Joghurt-Eis am Stiel (`frozen-yogurt-pops`) | 8 | 7 | `wooden-spoon`, `cup`, `bowl`, `stick`, `fork`, `bananas`, `fruit` |
| Zitronenlimonade selbst machen (`homemade-lemonade`) | 9 | 7 | `water`, `wooden-spoon`, `cup`, `knife`, `fork`, `lemon-halves` |
| Heute kochen die Kinder: Nudeln mit Gemüsesauce (`kids-cook-pasta`) | 12 | 7 | `water`, `wooden-spoon`, `blanket`, `knife`, `oven-mitt`, `vegetables`, `pizza` |
| Rotkohl-Zauberwasser (`red-cabbage-color-magic`) | 14 | 7 | `water`, `paper`, `cup`, `bowl`, `knife`, `lemon-halves` |
| Figuren aus Salzteig (`salt-dough-figures`) | 13 | 7 | `water`, `wooden-spoon`, `bowl`, `stick`, `tray`, `baking-tray`, `fork` |
| Kräuterquark mit Gemüsesticks (`herb-dip-with-veggie-sticks`) | 11 | 8 | `water`, `wooden-spoon`, `bowl`, `stick`, `scissors`, `child-scissors`, `knife`, `vegetables` |
| Pizza selber machen (`homemade-pizza`) | 17 | 9 | `water`, `wooden-spoon`, `bowl`, `blanket`, `tray`, `baking-tray`, `knife`, `oven-mitt`, `vegetables`, `pizza` |
