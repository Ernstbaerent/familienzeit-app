# Bilder über die API: Zwischenspeicher und Kosten (M9b)

Stand: 15. Oktober 2026. Ergänzung zu `docs/bilder-plan.md` (dort unverändert). Preise und Regeln des Zwischenspeichers sind am selben Tag in der Anthropic-Dokumentation (Prompt Caching) nachgesehen.
Die Kosten sind **Rechnungen aus Token-Mengen, nicht gemessen**. Gemessen wird beim Modelltest über `usage` der Antworten.

## Zwischenspeicher (Prompt Caching) bei einfachem `fetch`

Es braucht **kein neues Paket** und keinen Kopf (Header). Der Zwischenspeicher ist ein Feld im Anfragetext (JSON) der Messages API:

1. **`system` als Liste von Textblöcken** statt als einfacher Text, und am **letzten Block des festen Teils** `cache_control` setzen:
   ```json
   {
     "model": "claude-haiku-5-5",
     "max_tokens": 2000,
     "system": [
       { "type": "text", "text": "<Regeln und Baustein-Katalog, immer gleich>", "cache_control": { "type": "ephemeral" } }
     ],
     "messages": [{ "role": "user", "content": "<Text der einen Aktivität>" }],
     "output_config": { "format": { "type": "json_schema", "schema": { } } }
   }
   ```
   Heute steht in `scripts/lib/weekly/anthropic.ts` (`buildRequestBody`) `system: request.system` als Text. Die Änderung ist dieser eine Block; `readUsage` liest `cache_creation_input_tokens` und `cache_read_input_tokens` schon, und `cost.ts` rechnet sie mit (Schreiben 1,25×, Lesen 0,1×).
2. **Der feste Teil kommt zuerst und ist Byte für Byte gleich.** Die Reihenfolge der Anfrage ist Werkzeuge, dann `system`, dann `messages`. Jede Änderung im festen Teil macht alles dahinter ungültig. Deshalb: Baustein-Katalog und Regeln in `system` (sortiert, ohne Datum, ohne Zufall), die Aktivität in `messages`.
3. **Nicht das oberste `cache_control`-Feld** der Anfrage (automatisches Zwischenspeichern) benutzen: Es setzt den Haltepunkt ans Ende der Anfrage, also hinter den Text der Aktivität, der jedes Mal anders ist, und es würde nur Schreibkosten ohne Lesen erzeugen.
4. **Mindestlänge:** 512 Token für Haiku 5.5 und Sonnet 5.5 (kürzer wird still nicht zwischengespeichert, ohne Fehler). Der Baustein-Katalog (rund 6 000 Token) liegt weit darüber. Der feste Teil der Prüfanfrage (Regeln, rund 800 Token) liegt knapp darüber: Er muss mindestens 512 Token haben, sonst gibt es dort keinen Zwischenspeicher.
5. **Lebensdauer 5 Minuten** (Standard), jeder Treffer verlängert sie. Läuft ein Job die Aktivitäten nacheinander ab (Sekunden Abstand), trifft jeder Aufruf außer dem ersten. Zwischen den täglichen Läufen ist der Zwischenspeicher abgelaufen: Jeder Lauf schreibt einmal (1,25×, bei Haiku rund 0,001 $, bei Sonnet rund 0,02 $). Eine Lebensdauer von 1 Stunde (`"ttl": "1h"`, Schreiben 2×) lohnt hier nicht.
6. **Nacheinander, nicht gleichzeitig:** Der erste Aufruf legt den Eintrag an, erst danach lesen die weiteren. Wer alle Aufrufe gleichzeitig abschickt, schreibt mehrfach.
7. **Prüfen:** In der Antwort steht `usage.cache_creation_input_tokens` (geschrieben) und `usage.cache_read_input_tokens` (gelesen); `usage.input_tokens` ist nur der nicht zwischengespeicherte Rest. Ist das Lesen bei der zweiten Aktivität 0, hat sich im festen Teil etwas geändert (Zeitstempel, andere Reihenfolge, anderes Schema).

**Preise** (Anthropic-Dokumentation, 15. Oktober 2026), Dollar pro Million Token:

| | Eingabe | Schreiben (5 Min.) | Lesen | Ausgabe |
| --- | --- | --- | --- | --- |
| Haiku 5.5 (Anfragen bis 100 000 Token) | 0,10 | 0,125 | **0,01** (0,1×) | 0,50 |
| Sonnet 5.5 | 2,00 | 2,50 | **0,10** (**0,05×**, nicht 0,1×) | 10,00 |

Bei Sonnet 5.5 ist Lesen also halb so teuer wie die Annahme 10 %. Weil die Ausgabe den Preis bestimmt, ändert das den Gesamtpreis kaum (0,0198 $ statt 0,0208 $ je Bild).

## Kosten je Bild (Rechnung)

Annahmen: Szene-Aufruf mit 6 000 Token festem Teil (zwischengespeichert), 1 000 Token Text der Aktivität, 500 Token Antwort. Prüf-Aufruf mit 800 Token festem Teil, 1 250 Token (Text und PNG), 300 Token Antwort. Im Schnitt 1,5 Runden je Bild.

| | Haiku 5.5 ohne | Haiku 5.5 mit | Sonnet 5.5 ohne | Sonnet 5.5 mit |
| --- | --- | --- | --- | --- |
| je Bild | 0,0020 $ | **0,0010 $** | 0,0391 $ | **0,0198 $** |
| 119 Titelbilder | 0,23 $ | 0,12 $ | 4,66 $ | 2,35 $ |
| Schrittbilder Stufe 1 (rund 313) | 0,61 $ | 0,33 $ | 12,25 $ | 6,19 $ |
| Schrittbilder Stufe 2 (rund 377) | 0,74 $ | 0,39 $ | 14,76 $ | 7,45 $ |
| alle 810 Bilder einmal | 1,59 $ | 0,84 $ | 31,71 $ | 16,01 $ |
| neue Aktivitäten je Woche (rund 100 Bilder) | 0,20 $ | 0,10 $ | 3,91 $ | 1,98 $ |
| je Monat (4,33 Wochen) | 0,85 $ | 0,45 $ | 16,95 $ | 8,56 $ |

**Korrektur gegenüber dem Plan vom selben Tag:** Dort standen für die Schrittbilder Stufe 1 mit Sonnet „rund 5 $ (mit Zwischenspeicher rund 2 $)“ und für alle Bilder mit Sonnet und Zwischenspeicher „rund 12 $“. Das war zu niedrig. Richtig sind **rund 12 $ (6 $ mit Zwischenspeicher)** für Stufe 1 und **rund 16 $** für alle 810 Bilder mit Zwischenspeicher. Der Zwischenspeicher halbiert die Kosten, spart aber nicht 90 %, weil Antwort und Text der Aktivität den Preis bestimmen, nicht der feste Teil.

**Empfehlung bleibt:** Haiku für Schrittbilder (rund 0,45 $ im Monat), Sonnet höchstens für Titelbilder (119 Bilder rund 2,35 $, danach 15 je Woche rund 0,30 $). Ob Haiku gute Szenen wählt, zeigt der Modelltest.
