# Anleitung: Start mit Claude Code

## Teil A – Einmalig einrichten (ca. 20 Minuten)

**Voraussetzungen:** Node.js (LTS-Version), Git, Claude Code, ein GitHub-Konto
und die App **Expo Go** auf deinem Handy (App Store bzw. Play Store).

1. **Neues Repository auf GitHub anlegen**
   github.com → „New repository“ → Name z. B. `familienzeit-app` → **Private** →
   Haken bei „Add a README file“ → bei „.gitignore“ die Vorlage **Node** wählen → „Create repository“.

2. **Repository auf deinen Rechner holen** (im Terminal):
   ```bash
   git clone https://github.com/DEIN-NAME/familienzeit-app.git
   cd familienzeit-app
   ```

3. **CLAUDE.md in den Hauptordner legen**
   Die Datei `CLAUDE.md` kommt direkt in `familienzeit-app/`, also neben `README.md`.
   Nicht in einen Unterordner. Nur dort findet Claude Code sie automatisch.
   Diese Anleitung kannst du optional unter `docs/ANLEITUNG.md` ablegen.

4. **Hochladen:**
   ```bash
   git add .
   git commit -m "CLAUDE.md hinzufügen"
   git push
   ```

5. **Claude Code im Projektordner starten:**
   ```bash
   claude
   ```
   Claude Code liest die `CLAUDE.md` bei jedem Start automatisch. Du musst sie nicht reinkopieren.
   **Wichtig:** Führe nicht `/init` aus – das würde eine neue CLAUDE.md erzeugen.

6. **Kurz prüfen, ob es geklappt hat:**
   > Fasse in 3 Sätzen zusammen, was du über dieses Projekt weißt und was der nächste Schritt ist.

## Teil B – Ablauf jeder Arbeitsstunde

1. Terminal öffnen, `cd familienzeit-app`, dann `git pull`, dann `claude`.
2. Standard-Prompt:
   > Mach mit dem nächsten offenen Punkt der Roadmap weiter. Zeig mir zuerst einen kurzen Plan.
3. Plan lesen, mit „Passt, leg los“ bestätigen oder korrigieren.
4. Testen: in einem zweiten Terminal `npx expo start`, QR-Code mit Expo Go scannen.
5. Wenn es läuft:
   > Funktioniert. Hake den Schritt in der Roadmap ab und mach einen Commit.
   Danach `git push` (oder Claude Code darum bitten).
6. Vor einer neuen großen Aufgabe `/clear` eingeben. Das leert das Gespräch, die CLAUDE.md bleibt.

**Wenn etwas nicht funktioniert:** Fehlermeldung komplett kopieren und schreiben:
> Das funktioniert nicht. Fehlermeldung: [einfügen]. Was ist los, und wie beheben wir es?

**Wenn etwas Wichtiges entschieden wurde:**
> Trag in der CLAUDE.md unter „Notizen und Entscheidungen“ ein: [Entscheidung].

**Tipp:** Mit `Shift+Tab` kannst du in den Plan-Modus wechseln. Claude Code plant dann nur und ändert noch nichts.

## Teil C – Die ersten Prompts

### Prompt für M1 – Grundgerüst

> Lies die CLAUDE.md. Wir starten mit M1.
> Richte ein Expo-Projekt mit TypeScript und Expo Router in diesem Ordner ein.
> README.md und CLAUDE.md liegen schon hier und müssen erhalten bleiben.
> Lege die Ordnerstruktur aus der CLAUDE.md an, richte i18next mit Deutsch und Englisch ein
> (Sprache automatisch vom Handy übernehmen) und bereite das Layout für rechts-nach-links vor.
> Baue einen einfachen Startbildschirm mit Begrüßung, deren Text aus den Sprachdateien kommt.
> Sorge dafür, dass `.env` in der `.gitignore` steht.
> Zeig mir zuerst den Plan. Erkläre am Ende, wie ich die App auf meinem Handy teste.

### Prompt für M2 – Machbarkeitstest Veranstaltungen

> Wir machen M2. Finde heraus, wie man auf den German Tourism Knowledge Graph zugreift
> (Registrierung, Schlüssel, Abfragebeispiele) und erkläre mir, was ich selbst tun muss.
> Schreib dann ein kleines Skript in `scripts/`, das Veranstaltungen der nächsten 7 Tage
> im Umkreis von 30 km um [DEIN ORT] abfragt und zusammenfasst: Anzahl, wie viele familientauglich
> und spontan besuchbar wirken, Beispiele. Das ist nur ein Test, keine App-Funktion.

### Prompt für M3 – Kinderprofile

> Wir machen M3. Baue den Einstieg ohne Konto: Beim ersten Start kann man ein oder mehrere Kinder anlegen
> (Spitzname optional, Geburtsjahr und -monat, Interessen aus einer Auswahl, Abneigungen).
> Profile lassen sich bearbeiten und löschen und werden nur lokal gespeichert.
> Halte dich an die Datenschutz-Regeln aus der CLAUDE.md. Alle Texte über i18next.

Ab M4 reicht der Standard-Prompt aus Teil B, weil die Roadmap in der CLAUDE.md genau genug ist.

## Teil D – Was noch kommt

Bevor ihr M8 (Supabase), M9 (KI-Wochenlauf) und M11 (Veranstaltungen) erreicht, gibt es eigene
Anleitungen: Konten anlegen, Schlüssel sicher hinterlegen, Freigabe-Ablauf für Ani in Supabase.
