# Sicherheits-Checkliste für Aktivitäten

Diese Checkliste gilt für **jede** neue Aktivität:

- die Pakete des Startbestands (M5b, Claude Code schreibt sie),
- den späteren KI-Wochenlauf (M9),
- Aktivitäten, die jemand von Hand ergänzt.

Eine Aktivität wird erst `approved` (und damit in der App sichtbar), wenn sie alle Punkte besteht.
Sonst bleibt sie `draft` und wird im Prüfskript aufgelistet. Die 20 Aktivitäten aus M4 wurden
ebenfalls nach dieser Liste geschrieben.

## Die 7 Punkte

| # | Regel | Was zu tun ist |
| - | ----- | -------------- |
| 1 | **Kleinteile nur ab 3 Jahren** | Kommt ein Material mit Kleinteilen vor (Murmeln, Knöpfe, Perlen …), ist `ageMin` mindestens 3. Für Babys und Kleinkinder nur Dinge, die größer sind als eine Faust. |
| 2 | **„Mit Erwachsenen“ bei Schere, Messer, Hitze, Feuer, Wasser und Elektrogeräten** | Der `safetyNote` nennt in **jeder** Sprache ausdrücklich Erwachsene („…nur mit Erwachsenen“ / „…together with adults“). **Kerzen und offenes Feuer gibt es immer nur mit Erwachsenen.** |
| 3 | **Kein unbeaufsichtigtes Wasser unter 6 Jahren** | Ist Wasser dabei (auch Pfützen, Bäche, Teiche) und `ageMin` unter 6, sagt der `safetyNote`, dass Erwachsene **die ganze Zeit** dabei bleiben („…die ganze Zeit dabei“ / „…the whole time“). Eine Aktivität, bei der Kinder allein am Wasser sind, gibt es nicht. |
| 4 | **Allergene nennen** | Bei Kochen, Backen und allem mit Zutaten nennt der `safetyNote` jedes mögliche Allergen („Enthält Milch und Gluten.“). Die Allergene ergeben sich aus dem Material (siehe unten). |
| 5 | **Altersangaben realistisch** | `ageMin` und `ageMax` passen zu dem, was Kinder wirklich können. Schere, Messer, Hitze und Feuer gibt es nicht unter 3 Jahren. Eine Spanne von mehr als 12 Jahren (z. B. 0–16) ist nur selten ehrlich und fällt durch. |
| 6 | **Elektrogeräte aufschrauben: nur klein und mit Batterie** | Nur kleine batteriebetriebene Geräte, die Batterien kommen **vorher** heraus. **Niemals** Geräte mit Netzstecker, Fernseher, Mikrowellen, Monitore oder Netzteile: Darin kann auch ausgesteckt gefährliche Spannung gespeichert sein. Der `safetyNote` sagt das in jeder Sprache („Batterie“ und „Netzstecker“ / „batteries“ and „plug“). |
| 7 | **Licht in Papier nur mit LED** | Laternen, Lampions und alles, worin Licht in Papier oder Stoff steckt, nur mit LED-Licht, **nie mit Kerze**. Der `safetyNote` sagt das in jeder Sprache („LED“ und „Kerze“ / „LED“ and „candle“). Feuer und leicht brennbares Material (Papier, Pappe, Tücher) kommen nie zusammen in einer Aktivität vor. |

## Wie die Prüfung funktioniert

Es gibt zwei Stufen. Beide sind nötig, keine ersetzt die andere.

1. **Mechanisch, per Skript** (`npm run activities:check`, Code in `src/features/activities/safetyCheck.ts`).
   Das Skript liest aus dem Material einer Aktivität ab, welche Gefahren und Allergene vorkommen
   (`src/features/activities/materials.ts`), und prüft dann Alter und Hinweise in Deutsch und Englisch.
   Es sucht nach den Formulierungen aus der Tabelle oben. Die Regeln haben Tests (`safetyCheck.test.ts`).
   Es ist ein **grobes Sieb**:
   Es findet fehlende Hinweise und unmögliche Altersangaben, versteht aber keine Texte.
2. **Inhaltlich, beim Schreiben.** Claude Code geht jede Aktivität einmal gedanklich durch: Stimmen die Schritte,
   ist der Hinweis wirklich passend, ist das Alter ehrlich? Der KI-Wochenlauf (M9) wendet dieselbe Checkliste
   automatisch an, bevor eine Aktivität `approved` wird. Wie genau, klärt M9.

Im Zweifel fällt eine Aktivität durch und bleibt `draft`. Nie umgekehrt.
Dazu kommt: **Vor der Beta liest ein Mensch alle Aktivitäten einmal durch** (Roadmap M12).

## Material, Gefahren und Allergene

Die Merkmale hängen am **Material** in `src/features/activities/materials.ts`, nicht an der einzelnen Aktivität.
So kann man sie nicht vergessen:

| Merkmal       | Beispiel Material                  |
| ------------- | ---------------------------------- |
| `smallParts`  | Murmeln, Knöpfe                    |
| `sharp`       | Schere, Messer                     |
| `heat`        | Herd, Backofen                     |
| `fire`        | Kerze                              |
| `water`       | Wasser zum Spielen, Pfützen, Bach  |
| `electric`    | Altes batteriebetriebenes Gerät    |

Dazu kommt das Merkmal `flammable` (brennt leicht) bei Papier, Pappe, Papiertüten und Tüchern. Es ist keine Gefahr
für sich, aber nie zusammen mit Feuer erlaubt (Punkt 7). Das LED-Licht (`ledLight`) verlangt den Hinweis
„nur LED, keine Kerze“.

**Wasser zum Spielen oder nur zum Anrühren?** `water` ist alles, worin ein Kind planschen oder mit dem Gesicht
hineingeraten kann: Schüssel, Eimer, Wanne, Pfützen, Bach. Dafür gelten Punkt 2 und 3. `tapWater` (Leitungswasser)
ist nur für kleine Mengen zum Anrühren, Trinken oder Pinselauswaschen gedacht: ein Glas, ein Becher, ein Teller.
Im Zweifel `water`.

Allergene (`milk`, `egg`, `gluten`, `nuts`, `peanut`, `soy`, `sesame`) stehen bei den Zutaten,
zum Beispiel `cream` → Milch, `flour` → Gluten, `egg` → Ei.

**Wichtig beim Schreiben:** Jede Zutat und jedes Gerät, das vorkommt, muss als Material eingetragen sein,
sonst fehlen die abgeleiteten Hinweise. Braucht eine Aktivität ein Material, das es noch nicht gibt,
wird es mit seinen Merkmalen ergänzt (Anleitung oben in `materials.ts`).
Die Detailansicht (M7) soll die Allergene später zusätzlich automatisch aus dem Material anzeigen.

## Ablauf pro Paket (M5b) oder Wochenlauf (M9)

1. Aktivitäten schreiben (Deutsch und Englisch, in eigenen Worten, nie von Websites kopiert), zuerst als `draft`.
2. `npm run activities:check` ausführen.
3. Bestanden: Status auf `approved`. Durchgefallen: Probleme beheben oder als `draft` stehen lassen.
4. Erst dann das nächste Paket beginnen.

## Eine neue Regel ergänzen

1. Regel mit Nummer in die Tabelle oben schreiben.
2. Falls sie sich prüfen lässt: Code in `safetyCheck.ts` ergänzen (mit „Punkt N“ in der Meldung).
3. Bei neuen Merkmalen: `hazardKeys` bzw. `allergenKeys` in `materials.ts` erweitern und die Texte in beiden Sprachen ergänzen.
