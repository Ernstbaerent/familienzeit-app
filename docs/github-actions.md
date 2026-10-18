# GitHub Actions: Runner und Versionen

Alle Workflows in `.github/workflows/` (Wochenlauf, Orte importieren, Bild-Test, später der Bilder-Lauf) laufen auf einem **fest eingestellten Runner** und mit **fest eingestellten Hauptversionen** der Aktionen. Der Test `scripts/lib/workflows.test.ts` hält beides fest.

## Runner

`runs-on: ubuntu-24.04`, nie `ubuntu-latest`. Grund: `ubuntu-latest` wechselt ab dem 19. Oktober 2026 auf Ubuntu 26; dabei können sich Pakete und Werkzeuge ändern, ohne dass wir es merken. Geprüft für 24.04 (Paketliste von Ubuntu „noble“, Bereich „universe“, auf den GitHub-Runnern eingeschaltet): `osmium-tool` 1.16.0 (Orte importieren) und `librsvg2-bin` 2.58 mit `rsvg-convert` (Bild-Test).

**Wann der Runner bewusst angehoben wird:** in einem eigenen Pull Request, sobald GitHub das Ende von Ubuntu 24.04 ankündigt oder wir ein Paket brauchen, das es dort nicht gibt; vorher laufen der Orte-Import als Trockenlauf und der Bild-Test einmal von Hand auf der neuen Version.

## Versionen der Aktionen (Stand 18. Oktober 2026)

Je die kleinste Hauptversion, die auf Node 24 läuft (die Hinweise zu Node 20 verschwinden damit). Neuere Hauptversionen ändern Verhalten und werden nur mit Grund angehoben.

| Aktion | Version | Warum nicht neuer |
| --- | --- | --- |
| `actions/checkout` | v5 | v6 und v7 ändern nichts, was wir brauchen |
| `actions/setup-node` | v6 | v7 ohne Nutzen für uns |
| `actions/upload-artifact` | v6 | v7 kann ohne ZIP hochladen (anderes Verhalten) |
| `actions/download-artifact` | v7 | v8 entpackt nicht mehr automatisch und bricht bei Prüfsummenfehlern ab |

`setup-node` legt ab v5 von selbst einen Cache an, wenn `package.json` ein Feld `packageManager` hat. In allen Jobs ohne `npm ci` steht deshalb `package-manager-cache: false`: Neben Schlüsseln wird nichts installiert und nichts aus einem Cache geholt.
