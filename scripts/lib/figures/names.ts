// Figuren-Rig (M9b): Ergebnis der Namensprüfung gegen bekannte Kinderfiguren (Websuche am 2026-10-15). KEINE Markenprüfung (DPMA, EUIPO, App Stores):
// Die steht unter „Nach M12“ in der CLAUDE.md. Aufgenommen sind nur Namen, bei denen die Suche keine bekannte Kinderfigur gefunden hat.

export const nameChecks: ReadonlyMap<string, string> = new Map([
  ['Nolli', 'keine bekannte Kinderfigur gefunden'],
  ['Jette', 'keine bekannte Figur, nur eine Buchreihe „Jette“ von Fee Krämer (Erwachsenen- bis Jugendbuch)'],
  ['Ilka', 'keine bekannte Kinderfigur gefunden'],
  ['Tüpfel', 'keine bekannte Figur (nur „Tüpfelblatt“ aus Warrior Cats, anderer Name)'],
  ['Stups', 'keine bekannte Kinderfigur gefunden'],
  ['Arne', 'Vorschlag für den Papa: keine Kinderfigur gefunden (nur der Krimiautor Arne Dahl, ein Erwachsenen-Name)'],
  ['Mats', 'Vorschlag für den Jungen: nur das Bilderbuch „Mats und Mathilde“, keine bekannte Figur'],
  ['Malte', 'Alternative für den Papa: keine Kinderfigur gefunden (sehr häufiger Vorname)'],
  ['Tore', 'Alternative für den Jungen: keine Kinderfigur gefunden (nordisch, kurz)'],
]);

// Namen, die zwar frei wären, aber schwächer sind (Websuche am 2026-10-16), mit Grund.
export const weakerNames: readonly { name: string; reason: string }[] = [
  { name: 'Rune', reason: 'Jugendroman „Rune“ und Comicreihe „Rune“ (2024 ff.)' },
  { name: 'Ivo', reason: 'Bilderbuch „The Boy Who Lived in a Shell“ (Himmelman) und ein spanischer Roman mit Figur „Ivo“' },
];

// Vorschläge in der Reihenfolge der Empfehlung (erster Name = vorgeschlagen).
export const nameProposals = { papa: ['Arne', 'Malte'], boy: ['Mats', 'Tore'] } as const;

// Namen, die bei der Prüfung durchgefallen sind (für das Protokoll in docs/design/FIGUREN.md).
export const rejectedNames: readonly { name: string; reason: string }[] = [
  { name: 'Pepo', reason: 'spanische Kinderbuchfiguren (Tausendfüßler Pepo, „Pepo and Lolo“)' },
  { name: 'Teo', reason: 'spanische Vorschulserie „Teo“' },
  { name: 'Zora', reason: '„Die rote Zora“, Kinderbuchklassiker und Fernsehserie' },
  { name: 'Wusel', reason: '„Wusel & Pip“ (niederländische Zeichentrickserie)' },
  { name: 'Ruben', reason: 'Figur aus „PAW Patrol“' },
  { name: 'Lumo', reason: 'ESC-Maskottchen 2025, dazu Kinderserie „Lumo“' },
  { name: 'Luka', reason: 'mehrere Kinderfiguren (Sesamstraße, Disney-Pixar-Umfeld, Lernroboter)' },
  { name: 'Rike', reason: 'Puppenfigur aus „Eine Möhre für Zwei“ (Sesamstraße)' },
  { name: 'Igel', reason: 'Mecki (Hörzu-Maskottchen) liegt zu nah, deshalb Küken' },
];
