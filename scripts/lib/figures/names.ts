// Figuren-Rig (M9b): Ergebnis der Namensprüfung gegen bekannte Kinderfiguren (Websuche am 2026-10-15). KEINE Markenprüfung (DPMA, EUIPO, App Stores):
// Die steht unter „Nach M12“ in der CLAUDE.md. Aufgenommen sind nur Namen, bei denen die Suche keine bekannte Kinderfigur gefunden hat.

export const nameChecks: ReadonlyMap<string, string> = new Map([
  ['Joni', 'keine bekannte Kinderfigur gefunden'],
  ['Fenn', 'keine Kinderfigur gefunden (nur Buchreihe „Fenn Halflin“ für 9 bis 12, kein Vorschulbezug)'],
  ['Sanne', 'keine bekannte Kinderfigur gefunden'],
  ['Stups', 'keine bekannte Kinderfigur gefunden (Igel gibt es viele, deshalb ein Küken)'],
  ['Bent', 'keine bekannte Kinderfigur gefunden'],
  ['Fidi', 'keine bekannte Kinderfigur gefunden'],
  ['Hanne', 'keine bekannte Kinderfigur gefunden'],
  ['Mutz', 'keine bekannte Kinderfigur gefunden'],
  ['Jette', 'keine bekannte Figur, nur eine Buchreihe „Jette“ von Fee Krämer (Erwachsenen- bis Jugendbuch)'],
  ['Nolli', 'keine bekannte Kinderfigur gefunden'],
  ['Ilka', 'keine bekannte Kinderfigur gefunden'],
  ['Tüpfel', 'keine bekannte Figur (nur „Tüpfelblatt“ aus Warrior Cats, anderer Name)'],
]);

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
