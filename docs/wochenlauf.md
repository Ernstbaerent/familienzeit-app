# KI-Wochenlauf (M9)

Jeden **Sonntag um 18 Uhr** (Berliner Zeit, Sommer- und Winterzeit) erzeugt eine GitHub Action neue Aktivitäten mit der Claude API (Modell `claude-haiku-5-5`).
Sie prüft jede mit derselben Prüflogik wie `npm run activities:check` (Datenmodell, Sicherheits-Checkliste Punkte 1 bis 7) und schreibt sie in die Supabase-Tabelle `activities`.
Was alle Prüfungen ohne Auffälligkeit besteht, gibt der geplante Lauf **automatisch frei** (`approved`), alles andere bleibt **Entwurf** (`draft`), Durchgefallenes wird verworfen.
Die App holt neue Aktivitäten wie bisher höchstens einmal am Tag (`docs/supabase.md`).

| Was | Wo |
| --- | --- |
| Skript | `scripts/generate-activities.ts` (`npm run activities:generate`), Bausteine in `scripts/lib/weekly/` |
| GitHub Action | `.github/workflows/weekly-activities.yml` |
| Datenbank (Spalten `batch_id`, `generated_at`, Tabelle `activity_ideas`, Funktion zum Schreiben) | `supabase/migrations/0002_activity_runs.sql` |
| Tests | `scripts/lib/weekly/*.test.ts` (laufen mit `npm test`) |

---

## Einen ganzen Lauf zurückziehen (zum Kopieren)

Jede Aktivität aus dem Wochenlauf trägt die Kennung ihres Laufs in `batch_id`, z. B. `wl-2026-10-18-123456789` (Datum und Nummer des GitHub-Laufs).
Die Kennung steht auch auf der Seite des Laufs in GitHub (Zeile „Lauf `wl-…`“). Im Supabase-Dashboard **SQL Editor → New query**:

**1. Welche Läufe gibt es?**

```sql
select batch_id, min(generated_at) as geschrieben, count(*) as anzahl,
       count(*) filter (where status = 'approved') as freigegeben,
       count(*) filter (where status = 'draft') as entwurf
from public.activities
where batch_id is not null
group by batch_id
order by geschrieben desc;
```

**2. Den ganzen Lauf zurückziehen** (Kennung ersetzen). Die App zeigt die Aktivitäten nach ihrem nächsten Abruf nicht mehr (spätestens nach 24 Stunden):

```sql
update public.activities set status = 'draft' where batch_id = 'wl-2026-10-18-123456789';
```

**3. Ganz ablehnen** statt zurückziehen (zählt dann nicht mehr zur Obergrenze, der Titel schützt aber weiter vor Dubletten):

```sql
update public.activities set status = 'rejected' where batch_id = 'wl-2026-10-18-123456789';
```

**Eine einzelne Aktivität freigeben, zurückziehen oder ablehnen** (die `id` steht im Bericht und im Table Editor):

```sql
update public.activities set status = 'approved' where id = 'chestnut-hedgehogs';
update public.activities set status = 'draft'    where id = 'chestnut-hedgehogs';
update public.activities set status = 'rejected' where id = 'chestnut-hedgehogs';
```

**Alle Entwürfe des letzten Laufs ansehen:**

```sql
select id, status, category, age_min, age_max, translations->'de'->>'title' as titel
from public.activities
where batch_id = (select batch_id from public.activities where batch_id is not null order by generated_at desc limit 1)
order by status, id;
```

Gelöscht wird nie: Der Wochenlauf darf gar nicht löschen (kein `DELETE`-Recht), und auch du brauchst es nicht. `draft` und `rejected` sieht die App nicht.

---

## Wöchentliche Durchsicht in 5 Minuten

Am Sonntagabend oder Montag, wenn der Lauf fertig ist:

1. **GitHub → Actions → Wochenlauf Aktivitäten → letzter Lauf.** Die Seite (Summary) beginnt mit einer Zeile wie
   `Freigegeben: 12 · Als Entwurf: 2 · Verworfen: 3 · Datenbank: 1.130 von 1.500 · Kosten: 0,01 $`.
   Steht darüber ein **„Achtung“** (Qualitätsbremse, Obergrenze fast erreicht) oder ist der Lauf rot: unten „Wenn etwas schiefgeht“.
2. **Tabelle „Neue Aktivitäten“ überfliegen:** Titel, Kategorie, Alter. Passt das zu Jahreszeit und Anlässen? Steht bei einem Entwurf eine **Auffälligkeit** (Marke, Name, Website, seltsame Menge)?
3. **„Alle Texte zum Durchlesen“ aufklappen** und zwei oder drei Aktivitäten ganz lesen, vor allem die mit Messer, Herd, Wasser oder Feuer. Stimmen Schritte, Alter und Sicherheitshinweis?
4. **Entwürfe entscheiden** (SQL oben): freigeben, wenn die Auffälligkeit harmlos ist; sonst `rejected`. Gefällt dir ein freigegebener nicht: auf `draft` oder `rejected` setzen.
   Ist der ganze Lauf daneben: **ganzen Lauf zurückziehen** (oben, Nr. 2).
5. **Stichwort-Ideen nachfüllen** (unten), wenn dir etwas eingefallen ist. „Verworfen“ und „Vorgeschlagenes neues Material“ lohnen einen Blick: Kommt ein Material öfter vor, kann es in `materials.ts` dazu (mit Merkmalen, Anleitung in `docs/activities.md`).

Vor der Beta (M12) liest ein Mensch **alle** Aktivitäten einmal ganz durch, auch alle aus dem Wochenlauf.

---

## Pausen-Schalter und Ausschalter

Der geplante Lauf ist **standardmäßig an** und gibt **standardmäßig frei**. Zwei Repo-Variablen ändern das (GitHub: **Settings → Secrets and variables → Actions → Tab „Variables“ → New repository variable**):

| Variable | Wirkung |
| --- | --- |
| `WEEKLY_PAUSED` = `true` | Der Sonntagslauf tut nichts (auf der Seite des Laufs steht „Wochenlauf pausiert“). Manuelle Läufe gehen weiter. **Fortsetzen:** Variable löschen oder auf `false` setzen. |
| `WEEKLY_AUTO_APPROVE` = `false` | Der Sonntagslauf schreibt nur Entwürfe, du gibst per SQL frei. Löschen = wieder automatische Freigabe. |
| `ANTHROPIC_MODEL` | Anderes Modell ohne Codeänderung, z. B. `claude-sonnet-5-5` (etwa 20-mal teurer). Leer = `claude-haiku-5-5`. Für ein Modell ohne hinterlegten Preis (`scripts/lib/weekly/cost.ts`) startet der Lauf nicht. |
| `MAX_ACTIVITIES` | Obergrenze des Katalogs (Status `approved` + `draft`), Standard 1500. |
| `MAX_COST_USD` | Kosten-Obergrenze pro Lauf in Dollar, Standard 0.5. |

**Wichtig beim ersten Mal:** Sobald die Action im Hauptzweig (`main`) liegt, läuft sie am nächsten Sonntag um 18 Uhr echt und mit Freigabe. Willst du vorher in Ruhe testen, setze `WEEKLY_PAUSED=true` **bevor** du den Pull Request zusammenführst.

---

## Schritt für Schritt einrichten (einmal)

### 1. Migration einspielen

1. Supabase-Dashboard → **SQL Editor** → **New query**.
2. `supabase/migrations/0002_activity_runs.sql` öffnen (GitHub oder Editor), **alles** kopieren, einfügen, **Run**. Vorher nichts markieren (sonst fehlen die Rechte am Ende).
3. Erwartet: unten genau diese **sechs Zeilen**:

   | objekt | rolle | rechte |
   | --- | --- | --- |
   | Funktion insert_generated_activities | service_role | EXECUTE |
   | RLS activity_ideas | - | an |
   | Tabelle activities | anon | SELECT |
   | Tabelle activities | authenticated | SELECT |
   | Tabelle activities | service_role | INSERT, SELECT, UPDATE |
   | Tabelle activity_ideas | service_role | DELETE, INSERT, SELECT, UPDATE |

4. Kontrolle im **Table Editor**: Es gibt die Tabelle `activity_ideas` (leer). Daneben steht weder „RLS disabled“ noch eine Freigabe für `anon`.

Die Datei darf mehrmals laufen. Sie ändert an der App nichts: `anon` behält genau `SELECT` auf `activities`.

### 2. Secrets prüfen

GitHub: **Settings → Secrets and variables → Actions → Secrets**. Es müssen genau diese drei Namen da sein (die Werte sieht man dort nicht, das ist richtig):

- `ANTHROPIC_API_KEY`: Schlüssel aus der Anthropic Console (beginnt mit `sk-ant-`).
- `SUPABASE_URL`: die Project URL, z. B. `https://abcdefgh.supabase.co` (ohne `/rest/v1`).
- `SUPABASE_SECRET_KEY`: der **geheime** Schlüssel (`sb_secret_…`, Supabase: Project Settings → API Keys → Secret keys). Ein öffentlicher Schlüssel (`sb_publishable_…`, `anon`) wird abgelehnt, denn er darf nicht schreiben.

### 3. Erster Trockenlauf

1. GitHub → **Actions** → links **Wochenlauf Aktivitäten** → rechts **Run workflow**.
2. Häkchen bei `dry_run` lassen (Standard), `auto_approve` aus, **Run workflow**.
3. Nach 1 bis 3 Minuten ist der Lauf grün. Klick darauf: Die Seite beginnt mit `Trockenlauf, nichts geschrieben · Freigegeben: 0 · Als Entwurf: 12 · …`.
   Bei `dry_run` schreibt der Lauf nichts in die Datenbank und markiert keine Stichwort-Idee, er ruft aber die KI auf (kostet etwa einen Cent).

### 4. Ergebnis prüfen

Wie in der „Wöchentlichen Durchsicht“ oben, Punkt 2 und 3. Die vollständigen Daten (JSON) stehen zusätzlich im Protokoll des Schritts „Wochenlauf“.

### 5. Echter Lauf (erst nur Entwürfe)

1. **Run workflow** mit `dry_run` **aus** und `auto_approve` **aus**.
2. Danach im SQL-Editor „Alle Entwürfe des letzten Laufs ansehen“ (oben). Alle haben `draft`, die App zeigt sie noch nicht.
3. Gute freigeben (einzeln oder: `update public.activities set status = 'approved' where batch_id = '…' and status = 'draft';`).
4. In der App: Nach dem nächsten täglichen Abruf (oder mit `EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES=1` zum Testen, `docs/supabase.md` Schritt 6d) steht im Terminal eine höhere Zahl bei „von Supabase geladen“.

### 6. Den Wochenlauf laufen lassen

Nichts zu tun: Er ist an. Ist `WEEKLY_PAUSED=true` gesetzt (siehe oben), die Variable löschen. Ab dem nächsten Sonntag 18 Uhr läuft er mit automatischer Freigabe.
Willst du anfangs jede Woche selbst freigeben: `WEEKLY_AUTO_APPROVE=false`.

---

## Stichwort-Ideen eintragen

Supabase-Dashboard → **Table Editor** → Tabelle **activity_ideas** → **Insert → Insert row**:

| Feld | Was eintragen |
| --- | --- |
| `keyword` | **Pflicht.** Ein Stichwort oder kurzer Satz, z. B. `Kastanien`, `Drachen steigen lassen`, `Regentag mit Teenagern`. |
| `note` | Freiwillig, z. B. `für Kleinkinder`, `ohne Backofen`, `Laternenzeit`. |
| `id`, `status`, `created_at`, `used_at`, `used_batch_id` | **Leer lassen**, das füllt die Datenbank selbst (`status` startet mit `open`). |

**Save.** Jeder Lauf nimmt bis zu 20 offene Ideen mit (die ältesten zuerst). Eine Idee, aus der eine Aktivität entstanden und geschrieben ist, wird `used` (mit Datum und Kennung des Laufs).
Ideen, die nicht passen, bleiben `open` und kommen nächste Woche wieder. Eine Idee noch einmal verwenden: `status` zurück auf `open`. Löschen geht auch.
Die Ideen sieht nur der Wochenlauf, nie die App. **Keine persönlichen Daten** hineinschreiben (keine Namen von Kindern), denn der Text geht an die Claude API.

---

## Was der Lauf genau macht

1. **Schlüssel prüfen.** Fehlt einer oder ist er falsch geformt, bricht der Lauf ab, bevor er irgendetwas abfragt.
2. **Lesen bei Supabase:** vorhandene IDs und Titel (alle Status, auch Entwürfe und abgelehnte) und offene Stichwort-Ideen. Dazu die Titel aus `data/`.
3. **Kalender:** Monat, Jahreszeit, Feiertage und Anlässe der nächsten sechs Wochen (Ostern, Pfingsten, Advent usw. werden berechnet) und ungefähre Ferienzeiten (je Bundesland verschieden, deshalb nur grob). Bei saisonalen Ideen setzt die KI `months`.
4. **Vor jedem Aufruf der KI:** Aktivitäten mit Status `approved` oder `draft` zählen. Ab `MAX_ACTIVITIES` (Standard 1500) ruft der Lauf die KI nicht auf, schreibt nichts und endet **rot** (GitHub schickt dir eine E-Mail). Ist nur noch wenig Platz, fragt er höchstens so viele an, wie hineinpassen.
5. **Claude API** (ohne zusätzliches Paket, einfacher `fetch`): Antwort als JSON nach festem Schema. Das Schema lässt nur bekannte Kategorien, Themen und Materialien zu. Neue Materialien darf die KI nur vorschlagen (Abschnitt im Bericht), nie benutzen.
6. **Prüfen:** Form und Checkliste wie `activities:check`, dazu: 2 bis 12 Schritte (gleich viele in de und en), Titel höchstens 60 Zeichen, mindestens ein Thema, keine Dublette, kein Bild (Bilder kommen mit M9b). Durchgefallene werden verworfen und im Bericht mit Grund aufgeführt.
7. **Status:** `approved` nur mit automatischer Freigabe **und** ohne Auffälligkeit **und** ohne Qualitätsbremse; sonst `draft`. `source` ist immer `ai`.
8. **Schreiben** mit einem einzigen Aufruf der Datenbank-Funktion `insert_generated_activities`: alle Aktivitäten und das Markieren der Ideen in einer Transaktion. Scheitert etwas (z. B. doppelte ID, Obergrenze), ist **nichts** geschrieben.

### Feste Obergrenzen

| Grenze | Wert |
| --- | --- |
| Aktivitäten pro Lauf | Ziel 15, höchstens 25 (auch die Datenbank-Funktion prüft 25) |
| Aufrufe der KI pro Lauf | höchstens 3, fest gezählt. Ein 2. Aufruf nur, wenn weniger als 10 bestanden haben, und nur für den Rest |
| Zeit | 10 Minuten für den Lauf, 15 Minuten für die ganze Action, 30 Sekunden pro Supabase-Anfrage |
| Länge einer Antwort | 32 000 Token |
| Kosten | `MAX_COST_USD`, Standard 0,50 $: Würde der schlimmste Fall des nächsten Aufrufs darüber gehen, kommt er nicht |
| Wiederholungen | keine. Jeder Fehler beendet den Lauf, ohne zu schreiben |

### Auffälligkeiten (bleiben immer Entwurf)

Grobes Sieb mit festen Listen (`scripts/lib/weekly/flags.ts`), lieber eine zu viel:

- **Marken- oder Personennamen im Titel**: z. B. Lego, Playmobil, Haribo, Figuren aus Serien, bekannte Personen (Picasso, Einstein) und häufige Vornamen (auch „Emmas …“), Markenzeichen ®/™.
- **Verweise auf Websites, Apps oder soziale Netzwerke** in allen Texten: Web-Adressen, YouTube, Instagram, TikTok, „App“, Hashtags.
- **Unplausible Mengen- oder Zeitangaben**: eine Zeitangabe im Text, die länger ist als die Dauer; „über Nacht“ oder „nach 3 Tagen“; über 250 °C; mehr als 3 kg oder 20 Liter; amerikanische Einheiten (oz, lb, inch; °F nur ohne °C daneben); sehr große Zahlen; Dauer unter 5 Minuten, über 5 Stunden oder mit riesiger Spanne.
- **Sehr ähnlicher Titel** wie eine vorhandene Aktivität (mögliche Dublette, siehe unten).

Von den 104 Aktivitäten in `data/` hätten 2 eine Auffälligkeit (beide „App“: Trickfilm mit dem Handy und Spielplatz-Tour). Der Test hält das unter 5 %.

### Qualitätsbremse

Besteht **weniger als die Hälfte** der Vorschläge eines Laufs die Prüfungen, bleibt der **ganze Lauf `draft`** (auch die guten), und der Lauf endet mit einem gelben Warnhinweis oben auf der Seite.
Er ist trotzdem grün und hat die bestandenen als Entwürfe geschrieben: Sieh dir die Gründe in „Verworfen“ an und gib frei, was gut ist.

### Dubletten

- **Sicher erkannt (verworfen):** gleicher Titel auf Deutsch **oder** Englisch, ohne Rücksicht auf Groß- und Kleinschreibung, Bindestriche, Leerzeichen, Satzzeichen und Akzente („Sockenpuppen-Theater“ = „Sockenpuppentheater“). Gleiche ID (aus dem englischen Titel). Geprüft gegen **alle** Aktivitäten in der Datenbank (auch Entwürfe und abgelehnte), gegen `data/` und gegen den eigenen Lauf.
- **Wahrscheinlich erkannt (Auffälligkeit, bleibt Entwurf):** sehr ähnliche Titel, wenn ein Titel ganz im anderen steckt („Natron-Vulkan“ / „Mini-Natron-Vulkan“) oder die meisten Wörter gleich sind („Vulkan aus Natron“).
- **Nicht erkannt:** dieselbe Idee unter ganz anderem Namen („Kastanienmännchen“ und „Figuren aus Herbstfrüchten“). Dagegen hilft nur die Titelliste im Prompt (die KI soll nichts wiederholen) und deine Durchsicht.

**Die Titelliste im Prompt bleibt klein:** nur deutsche Titel, nach Kategorie gruppiert, durch „; “ getrennt, ohne IDs und ohne Englisch. Das sind etwa 25 Zeichen pro Aktivität,
bei 1500 Aktivitäten etwa 37 000 Zeichen (rund 12 000 bis 15 000 Token, mit Haiku 5.5 etwa **0,15 Cent mehr pro Aufruf**). Die Kosten wachsen also kaum mit dem Bestand.
Weil die Liste nur ein Hinweis für die KI ist, ändert das Kürzen nichts an der Sicherheit der Dublettenprüfung: Die macht das Skript danach selbst, gegen **alle** Titel auf Deutsch und Englisch.
Schlimmstenfalls schlägt die KI öfter etwas schon Vorhandenes vor; das wird verworfen, und bei zu vielen greift die Qualitätsbremse.

### 18 Uhr in Berlin, Sommer und Winter

GitHub rechnet Zeitpläne in UTC. In der Action stehen deshalb zwei Zeiten: 16 Uhr UTC (= 18 Uhr Sommerzeit) und 17 Uhr UTC (= 18 Uhr Winterzeit).
Der erste Schritt prüft mit `TZ=Europe/Berlin`, welche gerade gilt; der andere Lauf endet sofort grün mit dem Hinweis „Nicht die Zeit für 18 Uhr in Berlin“.
Du siehst also jeden Sonntag **zwei** Läufe, von denen einer nur diese Zeile hat. Das ist richtig. GitHub startet geplante Läufe manchmal einige Minuten später.

---

## Kosten

Preise Claude Haiku 5.5 (Stand Oktober 2026): 0,10 $ pro Million Token Anfrage, 0,50 $ pro Million Token Antwort (bei Anfragen über 100 000 Token 0,50 $ / 2,50 $, das erreicht der Lauf nicht).

| | pro Aufruf | pro Lauf | pro Monat (4–5 Läufe) |
| --- | --- | --- | --- |
| Üblich (15 Aktivitäten, 1 Aufruf) | etwa 0,01 $ | etwa 0,01 $ | **unter 0,10 $** |
| Schlimmster Fall (3 Aufrufe, jede Antwort voll) | 0,02 $ | 0,06 $ | etwa 0,30 $ |

Gemessen am heutigen Prompt (104 Titel): Systemtext etwa 8 200 Zeichen, Anfrage etwa 3 900, Schema etwa 3 400. Der Lauf schreibt seine Schätzung jedes Mal vor dem ersten Aufruf ins Protokoll und auf die Seite des Laufs, danach die tatsächlichen Kosten aus den Angaben der API.
Mit `ANTHROPIC_MODEL=claude-sonnet-5-5` wären es etwa 20-mal so viel (rund 0,20 $ pro Lauf), immer noch innerhalb des Budgets von 20 € im Monat.

**Zweite Sicherung, empfohlen:** In der Anthropic Console bei den Limits (Spend limits) ein monatliches Ausgabenlimit setzen (z. B. 5 $). Wird es erreicht, stoppt der Lauf mit „Limit bei Anthropic erreicht“ und schreibt nichts.
Supabase und GitHub Actions kosten dafür nichts extra (ein Lauf braucht 1 bis 3 Minuten).

---

## Wenn etwas schiefgeht

Ein roter Lauf schickt dir eine E-Mail von GitHub. Der Grund steht ganz oben auf der Seite des Laufs. **Bei jedem roten Lauf ist nichts in die Datenbank geschrieben.**

| Meldung | Bedeutung | Was tun |
| --- | --- | --- |
| **OBERGRENZE ERREICHT** | `approved` + `draft` ≥ `MAX_ACTIVITIES` (1500). Die KI wurde nicht aufgerufen. | Entwürfe aufräumen (auf `rejected` setzen, zählen dann nicht mehr) oder die Obergrenze bewusst anheben (Variable `MAX_ACTIVITIES`). Vorher „Wachstum“ unten lesen. |
| **Guthaben bei Anthropic aufgebraucht** | Kein Guthaben (402 oder „credit balance“). | Anthropic Console → Billing → Guthaben aufladen. Dann den Lauf manuell starten (`dry_run` aus) oder bis Sonntag warten. |
| **Limit bei Anthropic erreicht** | Rate-Limit oder dein Ausgabenlimit. | Später erneut starten oder das Limit in der Console prüfen. |
| **ANTHROPIC_API_KEY wird nicht angenommen** | Schlüssel falsch oder gelöscht. | Schlüssel erneuern (unten). |
| **Modell unbekannt** / **kein Preis hinterlegt** | `ANTHROPIC_MODEL` falsch geschrieben oder neu. | Variable korrigieren oder löschen. Ein neues Modell: Preis in `scripts/lib/weekly/cost.ts` eintragen. |
| **Kosten-Obergrenze** | Der schlimmste Fall wäre teurer als `MAX_COST_USD`. | Meist ein teures Modell. Modell oder `MAX_COST_USD` anpassen. |
| **Supabase (…): HTTP 401** | `SUPABASE_SECRET_KEY` falsch oder erneuert. | Secret aktualisieren. |
| **Supabase (Aktivitäten schreiben): HTTP 404** oder **PGRST202** | Die Funktion fehlt: Migration 0002 nicht eingespielt. | Schritt 1 oben. |
| **permission denied** | Rechte fehlen (z. B. nur ein Teil der Migration lief). | Migration 0002 noch einmal **ganz** ausführen, Kontrollzeilen vergleichen. |
| **die Datenbank hat den ganzen Lauf abgelehnt … 23505** | Doppelte ID (z. B. zwei Läufe kurz nacheinander). | Nichts kaputt, nichts geschrieben. Lauf neu starten. |
| **Zeitüberschreitung** | API oder Supabase antworten nicht. | Später neu starten. Ist Supabase pausiert: im Dashboard „Restore project“. |
| **Einstellungen fehlen** | Ein Secret fehlt oder ist falsch benannt. | Namen genau prüfen: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. |
| Gelb: **Qualitätsbremse** | Weniger als die Hälfte bestand. Alles ist Entwurf. | „Verworfen“ lesen. Häufig: fehlende Sicherheitshinweise oder Dubletten. Gute freigeben. Kommt es öfter vor: anderes Modell versuchen. |
| Gelb: **Keine Aktivität hat die Prüfungen bestanden** | Nichts geschrieben. | Wie Qualitätsbremse. |
| Kein Lauf am Sonntag | Pausiert? Oder: GitHub schaltet geplante Läufe in **öffentlichen** Repos nach 60 Tagen ohne Änderungen im Repo ab. | `WEEKLY_PAUSED` prüfen. Unter Actions erscheint dann „This scheduled workflow is disabled“ mit Knopf „Enable workflow“. |

Einen fehlgeschlagenen Lauf darfst du jederzeit einfach neu starten: Weil nichts halb geschrieben wird, entsteht nichts doppelt. Kosten: höchstens ein paar Cent.

---

## Schlüssel erneuern

Wenn ein Schlüssel irgendwo hingeraten ist, wo er nicht hingehört (Chat, Screenshot, Datei im Repo), **sofort** erneuern. Sonst etwa einmal im Jahr.

**Anthropic:**

1. Anthropic Console → **API Keys** → **Create Key** (Name z. B. `miki-wochenlauf-2027`). Den Schlüssel kopieren, er wird nur einmal gezeigt.
2. GitHub → Settings → Secrets and variables → Actions → `ANTHROPIC_API_KEY` → **Update secret** → einfügen → speichern.
3. Manuellen Trockenlauf starten (grün = klappt).
4. In der Console den **alten** Schlüssel löschen.

**Supabase:**

1. Dashboard → **Project Settings → API Keys → Secret keys** → neuen geheimen Schlüssel anlegen (`sb_secret_…`), kopieren.
2. GitHub → Secret `SUPABASE_SECRET_KEY` → **Update secret**.
3. Manuellen Trockenlauf starten.
4. Den **alten** geheimen Schlüssel in Supabase widerrufen (Revoke/Delete).

Der öffentliche Schlüssel der App (`sb_publishable_…` / anon) ist davon nicht betroffen.

**Wo Schlüssel nie auftauchen:** Das Skript gibt keinen Schlüssel aus, auch nicht in Fehlermeldungen. Jede Ausgabe läuft durch einen Filter (`scripts/lib/weekly/redact.ts`), der die bekannten Schlüssel und alles, was wie ein Schlüssel aussieht, durch `[verborgen]` ersetzt. GitHub verdeckt Secrets in Protokollen zusätzlich mit `***`.
Die Action installiert keine Pakete (`npm ci` fehlt bewusst), und die Schlüssel stehen nur im einen Schritt, der das Skript startet.

---

## Lokal ausprobieren (freiwillig)

Normalerweise läuft alles in GitHub. Zum Ausprobieren auf dem Chromebook (Node 22, im Projektordner), ohne die Schlüssel in eine Datei oder die Befehlshistorie zu schreiben:

```bash
read -rsp "Anthropic-Schlüssel: " ANTHROPIC_API_KEY && export ANTHROPIC_API_KEY && echo
npm run activities:generate -- --dry-run    # ohne Supabase: Titel nur aus data/
```

Das Skript liest keine `.env`. Geheime Schlüssel gehören nie in die `.env` der App (alles mit `EXPO_PUBLIC_` steckt in der App).

---

## Wachstum: Größe der Daten in der App (gemessen, nicht gebaut)

Gemessen mit den 104 Aktivitäten (`activityToRow` für die Antwort von Supabase, das Format von `activities.v1` für den Zwischenspeicher):

| | 104 (heute) | je Aktivität | 1000 | 1500 |
| --- | --- | --- | --- | --- |
| Antwort von Supabase (JSON) | 200 KB | 1,9 KB (1,4 bis 2,9 KB) | 1,9 MB | 2,8 MB |
| davon übertragen (gepackt) | 65 KB | 0,6 KB | 0,6 MB | 0,9 MB |
| Zwischenspeicher `activities.v1` (ein Eintrag) | 196 KB | 1,9 KB | 1,8 MB | 2,8 MB |

**Wo es auf Android eng wird:** AsyncStorage (Version 2.2) speichert auf Android in SQLite, jeder Schlüssel ist **eine Zeile**. Beim Lesen muss eine Zeile in ein sogenanntes CursorWindow passen, das unter Android **etwa 2 MB** groß ist.
Ist der Eintrag größer, scheitert das Lesen („Row too big to fit into CursorWindow“). Zusätzlich ist die ganze Datenbank von AsyncStorage auf Android standardmäßig auf **6 MB** begrenzt (`AsyncStorage_db_size_in_MB`), und beim Überschreiben stehen kurz alter und neuer Eintrag nebeneinander.

- Rechnerisch ist bei **etwa 1080 Aktivitäten** ein Eintrag 2 MB groß. **Ab etwa 1000 Aktivitäten** würde ich mit Problemen rechnen (Texte werden mit der Zeit eher länger, und Englisch, Deutsch, später Türkisch usw. vervielfachen die Größe).
- Was dann passiert: Die App fängt Fehler beim Lesen ab und nutzt die mitgelieferten Aktivitäten; nach jedem Neustart lädt sie wieder von Supabase. Eltern merken wenig, aber der Zwischenspeicher hilft nicht mehr, und ohne Netz fehlen die neuen Aktivitäten.
- iOS hat diese Grenze so nicht (dort sind es Dateien), betroffen wäre nur Android.
- Beim Wachstum von etwa 15 Aktivitäten pro Woche ist die Grenze in gut einem Jahr erreicht; die Obergrenze 1500 liegt **darüber**.

**Vorschlag, wenn es so weit ist (vor 900 Aktivitäten):**

1. Den Zwischenspeicher in **Teile** aufteilen: `activities.v2.meta` (Version, Zeitpunkt, Anzahl und Schlüssel der Teile) und `activities.v2.part.0`, `.part.1`, … mit je höchstens 200 Aktivitäten (etwa 400 KB, weit unter 2 MB).
   Schreiben mit `multiSet` (alle Teile in einem Aufruf), danach alte, überzählige Teile mit `multiRemove` löschen; lesen mit `multiGet`. Ein Teil, das fehlt oder kaputt ist, macht den ganzen Zwischenspeicher ungültig (wie heute: dann Mitgeliefertes).
   Den alten Schlüssel `activities.v1` beim ersten Schreiben von v2 löschen.
2. Zusätzlich kleiner werden: nur die Sprachen speichern, die die App gerade anzeigt, plus Englisch als Rückfall.
3. Die Gesamtgrenze von 6 MB im Blick behalten (Profile und Verlauf liegen dort auch). Sie lässt sich in den Build-Einstellungen anheben, aber besser klein bleiben.
4. Später, wenn es noch mehr werden: Supabase nur die Änderungen seit dem letzten Abruf abfragen (`updated_at`), statt jeden Tag alles.

---

## Datenschutz

Der Wochenlauf schickt **keine** persönlichen Daten: an die Claude API gehen nur die Regeln, die Materialliste, Datum und Anlässe, die Titel der Aktivitäten und deine Stichwort-Ideen (deshalb dort nichts Persönliches eintragen).
Er läuft auf Servern von GitHub, nicht in der App. Für die Datenschutzerklärung (M12) betrifft er die App-Nutzer nicht; ins Verzeichnis der Verarbeitungstätigkeiten gehört er als „Erstellung von Inhalten mit einem KI-Dienst“ trotzdem, mit Anthropic als Dienstleister.

---

## Tests

```bash
npm test                        # u. a. scripts/lib/weekly/*.test.ts, alles mit gemockten Antworten, ohne Netz und ohne Schlüssel
npx tsc --noEmit
npx expo lint
npm run activities:check
```

Geprüft wird unter anderem: gültige und ungültige Vorschläge, jeder Punkt der Checkliste, unbekanntes Material, Dubletten (Datenbank, `data/`, im Lauf, Schreibweisen), Auffälligkeiten, Standard `draft`, `AUTO_APPROVE`, Qualitätsbremse,
Trockenlauf (nur lesende Anfragen), fehlende oder öffentliche Schlüssel (keine einzige Anfrage), die Obergrenze des Katalogs (keine KI, nichts geschrieben, Exit-Code 1; knapp davor nur der Rest; Neuzählung vor jedem Aufruf),
höchstens 3 Aufrufe und 25 Aktivitäten, Kosten-Obergrenze, alle Fehler der API (leeres Guthaben, Limit, Überlastung, abgelehnt, abgeschnitten, kein JSON, kein Netz, Zeitlimit): nie ein Schreibaufruf;
Fehler beim zweiten Aufruf: auch das Ergebnis des ersten wird nicht geschrieben; Kopfzeilen (`x-api-key`, `apikey` ohne Bearer); **kein Schlüssel in irgendeiner Ausgabe**, auch wenn eine Fehlermeldung ihn zurückspiegelt.
Dazu der Kalender (Ostern, Advent, Buß- und Bettag, Jahreswechsel) und die Rechte in Migration 0002.

Zusätzlich einmal von Hand geprüft, nicht Teil des Projekts:

- Migration 0001, ein Teil der Einspiel-Dateien und Migration 0002 (zweimal hintereinander) in einem lokalen Wegwerf-Postgres (PGlite): Kontrollabfrage liefert die sechs Zeilen; `anon` und `authenticated` dürfen die Funktion nicht ausführen und `activity_ideas` weder lesen noch ändern; `service_role` schreibt, darf aber nicht löschen;
  eine doppelte ID lässt den ganzen Aufruf scheitern (keine Aktivität, keine Idee markiert); Obergrenze, falscher Status und mehr als 25 werden abgelehnt; `source` wird `ai`, `image` leer.
- Die Zeitplan-Prüfung der Action mit nachgestellter Sommer- und Winterzeit, Pause und manuellem Lauf.
- Das Skript gegen die echte Claude API mit einem **ausgedachten** Schlüssel: Die API lehnt ab (401), der Lauf endet rot mit klarer Meldung, der Schlüssel steht nirgends in der Ausgabe.

**Nicht getestet** (kein Zugang): ein Lauf mit echtem Schlüssel gegen die Claude API und gegen das echte Supabase-Projekt. Das ist Schritt 3 bis 5 der Einrichtung.
