// Spalten der Kacheln und Chips auf dem Start (reine Funktionen, ohne UI).
// Nichts darf abgeschnitten werden: Bei vielen Kindern bricht die Reihe um, bei großer Systemschrift
// (und schmalem Bildschirm) gibt es weniger Spalten, und die Texte brechen um.
// Breiten stehen nicht im Theme (CLAUDE.md), deshalb liegen die Mindestbreiten hier.

// Kleinste Breite einer Kinder-Kachel bei normaler Schrift (Avatar 40 + Stift 44 müssen nebeneinander passen).
export const childTileMinWidth = 96;
// Kleinste Breite eines Zeit-Chips (Pille, z. B. „Halber Tag“ / „Half a day“) und einer Energie-Kachel
// (Symbol über dem Text, kleine Schrift, z. B. das längste Wort „Energetic“) bei normaler Schrift.
export const timeChipMinWidth = 120;
export const energyTileMinWidth = 92;

// So viele Spalten passen höchstens nebeneinander, wenn jede Zelle mindestens `minWidth` (bei normaler Schrift) breit sein soll.
// Die Mindestbreite wächst mit der Systemschrift (`fontScale`, 1 = normal). Mindestens 1, höchstens `maxColumns`.
export function getColumns(options: {
  containerWidth: number;
  gap: number;
  minWidth: number;
  maxColumns: number;
  fontScale: number;
}): number {
  const { containerWidth, gap, minWidth, maxColumns, fontScale } = options;
  const needed = minWidth * Math.max(1, fontScale);
  const fitting = Math.floor((containerWidth + gap) / (needed + gap));
  return Math.min(maxColumns, Math.max(1, fitting));
}

// Breite einer Zelle, wenn `columns` Zellen mit `gap` Abstand genau eine Zeile füllen.
// Abgerundet, damit die letzte Zelle nicht durch Rundung in die nächste Zeile rutscht.
export function getCellWidth(containerWidth: number, columns: number, gap: number): number {
  return Math.floor((containerWidth - gap * (columns - 1)) / columns);
}
