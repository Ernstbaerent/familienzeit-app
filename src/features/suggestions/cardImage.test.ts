// Bild einer Vorschlagskarte (DESIGN.md, Zusatz 45): Es gibt keine Stock-Fotos mehr. Die Kette kennt das `image` der Aktivität
// (Web-Adresse) und die Farbfläche; die Illustration schiebt CardMedia dazwischen ein (SuggestionCard.test.tsx).

import { getCardImageChain } from './cardImage';

describe('Bildkette einer Aktivität', () => {
  it('mit `image`: erst die Web-Adresse, dann die Farbfläche', () => {
    expect(getCardImageChain({ image: 'https://example.org/a.jpg' })).toEqual([
      { kind: 'activity', uri: 'https://example.org/a.jpg' },
      { kind: 'placeholder' },
    ]);
  });

  it('ohne `image`: nur die Farbfläche', () => {
    expect(getCardImageChain({})).toEqual([{ kind: 'placeholder' }]);
  });

  it('die letzte Stufe ist immer die Farbfläche', () => {
    for (const image of [undefined, '', '   ', 'a.jpg', 'http://example.org/a.jpg', 'https://example.org/a.jpg']) {
      const chain = getCardImageChain({ image });
      expect(chain[chain.length - 1]).toEqual({ kind: 'placeholder' });
    }
  });

  it.each([
    ['leer', ''],
    ['nur Leerzeichen', '   '],
    ['ohne https (http)', 'http://example.org/a.jpg'],
    ['keine Adresse', 'a.jpg'],
  ])('ein Bild, das %s ist, zählt als „kein Bild“', (_name, image) => {
    expect(getCardImageChain({ image })).toEqual([{ kind: 'placeholder' }]);
  });

  it('Leerzeichen um eine gültige Adresse werden entfernt', () => {
    const [first] = getCardImageChain({ image: '  https://example.org/a.jpg ' });
    expect(first).toEqual({ kind: 'activity', uri: 'https://example.org/a.jpg' });
  });

  it('eine Karte, deren Web-Adresse nicht lädt, rutscht zur Farbfläche weiter (Kette von vorn nach hinten)', () => {
    const chain = getCardImageChain({ image: 'https://example.org/a.jpg' });
    // Die Karte zeigt chain[Anzahl der Fehler]: erst die Adresse, nach einem Fehler die Fläche.
    expect([0, 1].map((failures) => chain[failures].kind)).toEqual(['activity', 'placeholder']);
  });
});
