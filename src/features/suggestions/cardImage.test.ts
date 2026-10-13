// Bild einer Vorschlagskarte (DESIGN.md, Zusatz 45): Es gibt keine Stock-Fotos mehr. Die Kette kennt das `image` der Aktivität
// (Web-Adresse, nur von unserem eigenen Speicher, Zusatz 35) und die Farbfläche; die Illustration schiebt CardMedia dazwischen ein
// (SuggestionCard.test.tsx).

import { getCardImageChain } from './cardImage';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
const ownImage = `${prefix}bilder/a.svg`;

describe('Bildkette einer Aktivität', () => {
  it('mit `image` von unserem Speicher: erst die Web-Adresse, dann die Farbfläche', () => {
    expect(getCardImageChain({ image: ownImage }, prefix)).toEqual([
      { kind: 'activity', uri: ownImage },
      { kind: 'placeholder' },
    ]);
  });

  it('ohne `image`: nur die Farbfläche', () => {
    expect(getCardImageChain({}, prefix)).toEqual([{ kind: 'placeholder' }]);
  });

  it('die letzte Stufe ist immer die Farbfläche', () => {
    for (const image of [undefined, '', '   ', 'a.jpg', 'http://example.org/a.jpg', 'https://example.org/a.jpg', ownImage]) {
      const chain = getCardImageChain({ image }, prefix);
      expect(chain[chain.length - 1]).toEqual({ kind: 'placeholder' });
    }
  });

  it.each([
    ['leer', ''],
    ['nur Leerzeichen', '   '],
    ['ohne https (http)', 'http://abc.supabase.co/storage/v1/object/public/a.svg'],
    ['keine Adresse', 'a.jpg'],
    ['von einem fremden Server', 'https://example.org/a.jpg'],
    ['von einem fremden Server mit ähnlichem Namen', 'https://abc.supabase.co.evil.example/storage/v1/object/public/a.svg'],
    ['mit Zugangsdaten, die zu einem fremden Server führen', 'https://abc.supabase.co@evil.example/storage/v1/object/public/a.svg'],
    ['von unserem Projekt, aber nicht aus dem öffentlichen Speicher', 'https://abc.supabase.co/rest/v1/activities'],
    ['nur der erlaubte Anfang ohne Datei', prefix],
  ])('ein Bild, das %s ist, zählt als „kein Bild“', (_name, image) => {
    expect(getCardImageChain({ image }, prefix)).toEqual([{ kind: 'placeholder' }]);
  });

  it('ohne festgelegten Speicher (keine Projekt-Adresse) ist kein Bild erlaubt', () => {
    expect(getCardImageChain({ image: ownImage }, null)).toEqual([{ kind: 'placeholder' }]);
  });

  it('Leerzeichen um eine gültige Adresse werden entfernt', () => {
    const [first] = getCardImageChain({ image: `  ${ownImage} ` }, prefix);
    expect(first).toEqual({ kind: 'activity', uri: ownImage });
  });

  it('eine Karte, deren Web-Adresse nicht lädt, rutscht zur Farbfläche weiter (Kette von vorn nach hinten)', () => {
    const chain = getCardImageChain({ image: ownImage }, prefix);
    // Die Karte zeigt chain[Anzahl der Fehler]: erst die Adresse, nach einem Fehler die Fläche.
    expect([0, 1].map((failures) => chain[failures].kind)).toEqual(['activity', 'placeholder']);
  });

  describe('Vorgabe aus der Umgebung (EXPO_PUBLIC_SUPABASE_URL)', () => {
    const original = process.env.EXPO_PUBLIC_SUPABASE_URL;
    afterEach(() => {
      if (original === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      else process.env.EXPO_PUBLIC_SUPABASE_URL = original;
    });

    it('mit gesetzter Projekt-Adresse gilt deren Speicher', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
      expect(getCardImageChain({ image: ownImage })[0]).toEqual({ kind: 'activity', uri: ownImage });
      expect(getCardImageChain({ image: 'https://example.org/a.jpg' })).toEqual([{ kind: 'placeholder' }]);
    });

    it('ohne Projekt-Adresse ist kein Bild erlaubt', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      expect(getCardImageChain({ image: ownImage })).toEqual([{ kind: 'placeholder' }]);
    });
  });
});
