import { factTileMinWidth, getFactTileWidths } from './detailLayout';

const gap = 16;
// Typische Inhaltsbreiten (Bildschirm minus 2 × 24 Rand): sehr kleines Handy (320), übliches Handy (360), großes Handy
const widths = [272, 312, 342, 380];
const twoColumnWidths = widths.filter((width) => width >= 2 * factTileMinWidth + gap);

describe('Raster der Eckdaten-Kacheln', () => {
  it('bei normaler Schrift auf üblichen Handys zwei Spalten (wie im PDF)', () => {
    expect(twoColumnWidths).toEqual([312, 342, 380]);
    for (const containerWidth of twoColumnWidths) {
      const [first, second] = getFactTileWidths({ count: 4, containerWidth, gap, fontScale: 1 });
      expect(first).toBe(second);
      expect(first * 2 + gap).toBeLessThanOrEqual(containerWidth);
      expect(first).toBeLessThan(containerWidth);
    }
  });

  it('auf einem sehr kleinen Handy (320 breit) reicht der Platz nicht für zwei Spalten: eine Spalte, nichts wird abgeschnitten', () => {
    expect(getFactTileWidths({ count: 5, containerWidth: 272, gap, fontScale: 1 })).toEqual(Array(5).fill(272));
  });

  it('bei großer Systemschrift eine Spalte: jede Kachel so breit wie der Inhalt', () => {
    for (const containerWidth of widths) {
      for (const fontScale of [1.5, 2, 3]) {
        expect(getFactTileWidths({ count: 5, containerWidth, gap, fontScale })).toEqual(Array(5).fill(containerWidth));
      }
    }
  });

  it('keine Kachel ist bei normaler Schrift schmaler als die Mindestbreite', () => {
    for (const containerWidth of widths) {
      for (const width of getFactTileWidths({ count: 5, containerWidth, gap, fontScale: 1 })) {
        expect(width).toBeGreaterThanOrEqual(factTileMinWidth);
      }
    }
  });

  it('fünf Kacheln in zwei Spalten: die letzte steht allein in der Zeile und füllt sie', () => {
    const result = getFactTileWidths({ count: 5, containerWidth: 312, gap, fontScale: 1 });
    expect(result.slice(0, 4)).toEqual(Array(4).fill(148));
    expect(result[4]).toBe(312);
  });

  it('bei gerader Anzahl bleiben alle Kacheln gleich breit', () => {
    expect(getFactTileWidths({ count: 4, containerWidth: 312, gap, fontScale: 1 })).toEqual(Array(4).fill(148));
  });

  it('eine Zeile ergibt nie mehr als die Inhaltsbreite (kein Umbruch durch Rundung)', () => {
    for (const containerWidth of [301, 311.5, 333, 359.75]) {
      const [first, second] = getFactTileWidths({ count: 4, containerWidth, gap, fontScale: 1 });
      expect(first + gap + second).toBeLessThanOrEqual(containerWidth);
    }
  });

  it('keine Kacheln ergeben eine leere Liste', () => {
    expect(getFactTileWidths({ count: 0, containerWidth: 312, gap, fontScale: 1 })).toEqual([]);
  });
});
