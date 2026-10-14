# Testdaten (M10b: Orte in der App)

Alle Orte hier sind **ausgedacht** (Namen, Lagen, Öffnungszeiten). Es sind keine OpenStreetMap-Daten, sie stehen nicht unter der ODbL.
Die Form ist dieselbe wie in der Antwort von Supabase (`GET /rest/v1/places?select=…`, Spalten aus `supabase/migrations/0003_places.sql`).

| Datei | Inhalt |
| --- | --- |
| `places-greiz.json` | 33 Zeilen in 7 Kacheln rund um einen ausgedachten Standort bei Greiz (50,66 / 12,20): Orte unter 1 km, bis 5, 15 und 30 km und einer darüber, verschiedene Unterarten, feste Wochenpläne (auch mit Feiertagsregel), `complex`, `invalid`, Saison, zwei Bundesländer und ein Ort, der am Rand in beiden Ländern steht (gleiche `id`). |
| `places-broken.json` | Zeilen, die die App verwerfen muss (falsche ID, unbekannte Unterart, falsche Kachel, Lage im Meer, Website mit `javascript:`, Plan fehlt, Kindertauglichkeit 7, keine Zeile). |
| `places-imports.json` | Antwort von `places_imports` (Import-Kennung je Bundesland). |

Benutzt von den Tests in `src/features/places/` und `src/features/suggestions/` (z. B. `fetchPlaces.test.ts`, `placesRefresh.test.ts`, `mix.test.ts`).
