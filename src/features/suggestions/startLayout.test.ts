import {
  childTileMinWidth,
  energyTileMinWidth,
  getCellWidth,
  getColumns,
  timeChipMinWidth,
} from './startLayout';

const gap = 8;
// Typische Inhaltsbreiten (Bildschirm minus 2 × 24 Rand): kleines Handy, übliches Handy, großes Handy
const widths = [272, 312, 342, 380];

function tileColumns(containerWidth: number, fontScale: number) {
  return getColumns({ containerWidth, gap, minWidth: childTileMinWidth, maxColumns: 3, fontScale });
}

describe('Spalten der Kinder-Kacheln', () => {
  it('bei normaler Schrift auf üblichen Handys drei Spalten (wie im PDF), auf kleinen zwei', () => {
    expect(tileColumns(312, 1)).toBe(3);
    expect(tileColumns(342, 1)).toBe(3);
    expect(tileColumns(272, 1)).toBe(2);
  });

  it('größere Systemschrift gibt weniger Spalten, nie weniger als eine', () => {
    expect(tileColumns(342, 1.3)).toBe(2);
    expect(tileColumns(342, 1.5)).toBe(2);
    expect(tileColumns(342, 2)).toBe(1);
    expect(tileColumns(342, 3)).toBe(1);
    for (const width of widths) expect(tileColumns(width, 4)).toBe(1);
  });

  it('eine kleinere Schrift als normal macht die Kacheln nicht schmaler', () => {
    expect(tileColumns(342, 0.8)).toBe(tileColumns(342, 1));
  });

  it('nie mehr als die Höchstzahl, auch auf breiten Bildschirmen', () => {
    expect(tileColumns(900, 1)).toBe(3);
  });

  it('jede Kachel bleibt bei jeder Schrift mindestens so breit wie ihr Mindestmaß, außer es gibt nur eine Spalte', () => {
    for (const width of widths) {
      for (const fontScale of [1, 1.15, 1.3, 1.6, 2, 3]) {
        const columns = tileColumns(width, fontScale);
        const cell = getCellWidth(width, columns, gap);
        if (columns > 1) expect(cell).toBeGreaterThanOrEqual(childTileMinWidth * Math.max(1, fontScale));
      }
    }
  });
});

describe('Breite einer Zelle', () => {
  it('Zellen und Abstände füllen die Zeile höchstens aus (nichts rutscht durch Rundung in die nächste Zeile)', () => {
    for (const width of [271, 272, 312, 343, 380]) {
      for (const columns of [1, 2, 3]) {
        const cell = getCellWidth(width, columns, gap);
        expect(cell * columns + gap * (columns - 1)).toBeLessThanOrEqual(width);
      }
    }
  });

  it('eine Spalte füllt die ganze Breite', () => {
    expect(getCellWidth(312, 1, gap)).toBe(312);
  });
});

describe('Zeit-Chips und Energie-Kacheln', () => {
  const columns = (minWidth: number, maxColumns: number, containerWidth: number, fontScale: number) =>
    getColumns({ containerWidth, gap, minWidth, maxColumns, fontScale });

  it('Zeit: zwei Spalten (2 × 2 wie im PDF), bei großer Schrift eine', () => {
    expect(columns(timeChipMinWidth, 2, 312, 1)).toBe(2);
    expect(columns(timeChipMinWidth, 2, 312, 1.5)).toBe(1);
  });

  it('Energie: drei Kacheln nebeneinander bei normaler Schrift, bei großer Schrift weniger', () => {
    expect(columns(energyTileMinWidth, 3, 312, 1)).toBe(3);
    expect(columns(energyTileMinWidth, 3, 342, 1.3)).toBe(2);
    expect(columns(energyTileMinWidth, 3, 342, 2)).toBe(1);
  });
});
