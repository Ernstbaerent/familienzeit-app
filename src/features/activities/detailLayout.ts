// Raster der Eckdaten-Kacheln in der Detailansicht (reine Funktionen, ohne UI).
// Wie auf dem Start (`startLayout.ts`): Nichts darf abgeschnitten werden. Auf üblichen Handys stehen zwei Kacheln nebeneinander (wie im PDF),
// bei großer Systemschrift oder schmalem Bildschirm eine pro Zeile, die Texte brechen um.
// Breiten stehen nicht im Theme (CLAUDE.md), deshalb liegt die Mindestbreite hier.

import { getCellWidth, getColumns } from '../suggestions/startLayout';

// Kleinste Breite einer Eckdaten-Kachel bei normaler Schrift (Symbol, Wert wie „Drinnen oder draußen“, Beschriftung).
export const factTileMinWidth = 130;
export const factColumnsMax = 2;

// Breite jeder Kachel. Steht die letzte Kachel allein in ihrer Zeile (ungerade Anzahl bei zwei Spalten), füllt sie die Zeile.
export function getFactTileWidths(options: {
  count: number;
  containerWidth: number;
  gap: number;
  fontScale: number;
}): number[] {
  const { count, containerWidth, gap, fontScale } = options;
  const columns = getColumns({ containerWidth, gap, minWidth: factTileMinWidth, maxColumns: factColumnsMax, fontScale });
  const cell = getCellWidth(containerWidth, columns, gap);
  const widths = Array.from({ length: count }, () => cell);
  if (columns > 1 && count % columns === 1) widths[count - 1] = containerWidth;
  return widths;
}
