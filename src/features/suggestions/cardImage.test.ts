// Bild einer Vorschlagskarte (DESIGN.md, Entscheidung 21): Vorrang, stabile Zuordnung, Kategorien ohne Foto.
// Die Tests nehmen eigene Foto-Listen, damit sie nicht davon abhängen, welche Fotos gerade im Ordner liegen.
// Am Ende prüft ein Test die echte Liste der App.

import { categoryKeys, type ActivityCategory } from '../activities/activities';
import { minPhotosPerCategory } from '../activities/categoryPhotoFiles';
import { categoryPhotos } from '../activities/categoryPhotos.generated';
import {
  assignCardImages,
  getCardImageChain,
  hashText,
  pickCategoryPhoto,
  rankPhotos,
  usablePhotos,
  type CardImageInput,
  type PhotoLibrary,
} from './cardImage';

type FakePhoto = { file: string };

function library(counts: Partial<Record<ActivityCategory, number>>): PhotoLibrary<FakePhoto> {
  const prefixes: Record<ActivityCategory, string> = {
    craft: 'basteln',
    game: 'spiel',
    movement: 'bewegung',
    experiment: 'experiment',
    nature: 'natur',
    cooking: 'kochen',
    outing: 'ausflug',
  };
  return Object.fromEntries(
    categoryKeys.map((category) => [
      category,
      Array.from({ length: counts[category] ?? 0 }, (_, i) => ({ file: `${prefixes[category]}-${i + 1}.jpg` })),
    ]),
  ) as unknown as PhotoLibrary<FakePhoto>;
}

function activity(id: string, category: ActivityCategory, image?: string): CardImageInput {
  return { id, category, image };
}

// 200 erfundene IDs: zeigen die Verteilung unabhängig von den echten Aktivitäten.
const manyIds = Array.from({ length: 200 }, (_, i) => `activity-${i}`);

describe('Vorrang der Bilder (drei Fälle)', () => {
  const photos = library({ nature: 3 }); // genau die Mindestzahl

  it('1. Aktivität mit Bild: erst die Web-Adresse, dann das Kategorie-Foto, dann die Fläche', () => {
    const chain = getCardImageChain(activity('a', 'nature', 'https://example.org/a.jpg'), photos);
    expect(chain.map((step) => step.kind)).toEqual(['activity', 'category', 'placeholder']);
    expect(chain[0]).toEqual({ kind: 'activity', uri: 'https://example.org/a.jpg' });
  });

  it('2. Ohne Bild, Kategorie mit Fotos: erst das Kategorie-Foto, dann die Fläche', () => {
    const chain = getCardImageChain(activity('a', 'nature'), photos);
    expect(chain.map((step) => step.kind)).toEqual(['category', 'placeholder']);
  });

  it('3. Ohne Bild, Kategorie ohne Foto: nur die Farbfläche', () => {
    expect(getCardImageChain(activity('a', 'outing'), photos)).toEqual([{ kind: 'placeholder' }]);
  });

  it('3. Ohne Bild und ohne Fotos überhaupt: nur die Farbfläche', () => {
    expect(getCardImageChain(activity('a', 'nature'), library({}))).toEqual([{ kind: 'placeholder' }]);
  });

  it('Mit Bild, aber Kategorie ohne Foto: Web-Adresse, dann die Fläche', () => {
    const chain = getCardImageChain(activity('a', 'outing', 'https://example.org/a.jpg'), photos);
    expect(chain.map((step) => step.kind)).toEqual(['activity', 'placeholder']);
  });

  it('Die letzte Stufe ist immer die Farbfläche, in jeder Kategorie', () => {
    for (const category of categoryKeys) {
      for (const image of [undefined, 'https://example.org/a.jpg']) {
        const chain = getCardImageChain(activity('a', category, image), library({ [category]: 1 }));
        expect(chain[chain.length - 1]).toEqual({ kind: 'placeholder' });
      }
    }
  });

  it.each([
    ['leer', ''],
    ['nur Leerzeichen', '   '],
    ['ohne https (http)', 'http://example.org/a.jpg'],
    ['keine Adresse', 'a.jpg'],
  ])('Ein Bild, das %s ist, zählt als „kein Bild“', (_name, image) => {
    const chain = getCardImageChain(activity('a', 'nature', image), photos);
    expect(chain.map((step) => step.kind)).toEqual(['category', 'placeholder']);
  });

  it('Leerzeichen um eine gültige Adresse werden entfernt', () => {
    const [first] = getCardImageChain(activity('a', 'nature', '  https://example.org/a.jpg '), photos);
    expect(first).toEqual({ kind: 'activity', uri: 'https://example.org/a.jpg' });
  });

  it('Mit Bild, aber Kategorie unter der Mindestzahl: Web-Adresse, dann die Fläche', () => {
    const chain = getCardImageChain(activity('a', 'nature', 'https://example.org/a.jpg'), library({ nature: 2 }));
    expect(chain.map((step) => step.kind)).toEqual(['activity', 'placeholder']);
  });

  it('Eine Karte, deren Web-Adresse nicht lädt, rutscht Stufe für Stufe weiter (Kette von vorn nach hinten)', () => {
    const chain = getCardImageChain(activity('a', 'nature', 'https://example.org/a.jpg'), photos);
    // Die Karte zeigt chain[Anzahl der Fehler]: erst die Adresse, nach einem Fehler das Foto, nach zwei die Fläche.
    expect([0, 1, 2].map((failures) => chain[failures].kind)).toEqual(['activity', 'category', 'placeholder']);
  });
});

describe('Stabile Zuordnung pro Aktivität', () => {
  const photos = library({ nature: 4, cooking: 3 });

  it('dieselbe Aktivität bekommt immer dasselbe Foto', () => {
    for (const id of manyIds.slice(0, 40)) {
      const first = pickCategoryPhoto(activity(id, 'nature'), photos);
      for (let i = 0; i < 3; i++) expect(pickCategoryPhoto(activity(id, 'nature'), photos)).toEqual(first);
    }
  });

  it('der Streuwert ist fest: ändern sich diese Zahlen, ändern sich alle Zuordnungen', () => {
    // Feste Werte aus dem ersten Lauf. Sie sichern, dass dieselbe Aktivität nach einem Update dasselbe Foto behält.
    expect(hashText('')).toBe(2872998923);
    expect(hashText('a')).toBe(444641715);
    expect(hashText('activity-0|natur-1.jpg')).toBe(2800863819);
    expect(hashText('m4-001|kochen-2.jpg')).toBe(509399825);
  });

  it('die Fotos verteilen sich ungefähr gleichmäßig (4 Fotos, 200 Aktivitäten)', () => {
    const counts = new Map<string, number>();
    for (const id of manyIds) {
      const file = pickCategoryPhoto(activity(id, 'nature'), photos)!.file;
      counts.set(file, (counts.get(file) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(['natur-1.jpg', 'natur-2.jpg', 'natur-3.jpg', 'natur-4.jpg']);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(30); // Erwartung 50, hier ±20 als Rahmen
      expect(count).toBeLessThanOrEqual(70);
    }
  });

  it('die Rangfolge enthält jedes Foto genau einmal und hängt nicht von der Reihenfolge der Liste ab', () => {
    const forward = rankPhotos('activity-7', photos.nature);
    const reversed = rankPhotos('activity-7', [...photos.nature].reverse());
    expect(forward.map((photo) => photo.file).sort()).toEqual(photos.nature.map((photo) => photo.file).sort());
    expect(reversed).toEqual(forward);
  });

  it('kommt ein Foto dazu, ändert sich nur, wo das neue Foto gewinnt (alles andere bleibt)', () => {
    const before = library({ cooking: 3 }); // kochen-1 bis kochen-3
    const after = library({ cooking: 4 }); // dazu kochen-4
    let changed = 0;
    for (const id of manyIds) {
      const old = pickCategoryPhoto(activity(id, 'cooking'), before)!.file;
      const now = pickCategoryPhoto(activity(id, 'cooking'), after)!.file;
      if (old !== now) {
        changed += 1;
        expect(now).toBe('kochen-4.jpg');
      }
    }
    // Erwartung: etwa ein Viertel wechselt zum neuen Foto, die übrigen bleiben bei ihrem
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(manyIds.length / 2);
  });

  it('fällt ein Foto weg, ändert sich nur bei denen, die es vorn hatten', () => {
    const full = library({ nature: 4 });
    const without = { ...full, nature: full.nature.filter((photo) => photo.file !== 'natur-3.jpg') };
    for (const id of manyIds) {
      const old = pickCategoryPhoto(activity(id, 'nature'), full)!.file;
      const now = pickCategoryPhoto(activity(id, 'nature'), without)!.file;
      if (old !== 'natur-3.jpg') expect(now).toBe(old);
      else expect(now).not.toBe('natur-3.jpg');
    }
  });

  it('eine Kategorie ohne Foto liefert kein Foto', () => {
    expect(pickCategoryPhoto(activity('a', 'movement'), photos)).toBeUndefined();
    expect(rankPhotos('a', [])).toEqual([]);
  });
});

describe('Die drei Karten eines Ergebnisses', () => {
  const photos = library({ nature: 4, cooking: 3, craft: 3, game: 2 });

  function files(chains: ReturnType<typeof assignCardImages<FakePhoto>>) {
    return chains.map((chain) => {
      const step = chain.find((entry) => entry.kind === 'category');
      return step?.kind === 'category' ? step.photo.file : null;
    });
  }

  it('geben Karten derselben Kategorie verschiedene Fotos, wenn genug da sind (alle Dreiergruppen)', () => {
    for (let i = 0; i < 60; i++) {
      const group = [activity(`n-${i}`, 'nature'), activity(`n-${i + 100}`, 'nature'), activity(`n-${i + 200}`, 'nature')];
      expect(new Set(files(assignCardImages(group, photos))).size).toBe(3);
    }
    // Auch mit genau der Mindestzahl (drei Fotos) bekommen drei Karten drei verschiedene Fotos.
    for (let i = 0; i < 60; i++) {
      const group = [activity(`k-${i}`, 'cooking'), activity(`k-${i + 100}`, 'cooking'), activity(`k-${i + 200}`, 'cooking')];
      expect(new Set(files(assignCardImages(group, photos))).size).toBe(3);
    }
  });

  it('wiederholen ein Foto nur, wenn die Kategorie weniger Fotos hat als Karten', () => {
    const four = [0, 1, 2, 3].map((i) => activity(`n-${i}`, 'nature'));
    expect(new Set(files(assignCardImages(four, photos))).size).toBe(4);
    const five = [0, 1, 2, 3, 4].map((i) => activity(`n-${i}`, 'nature'));
    expect(new Set(files(assignCardImages(five, photos))).size).toBe(4); // vier Fotos, fünf Karten: genau eines wiederholt sich
    const fourCooking = [0, 1, 2, 3].map((i) => activity(`k-${i}`, 'cooking'));
    expect(new Set(files(assignCardImages(fourCooking, photos))).size).toBe(3); // drei Fotos, vier Karten
  });

  it('die Reihenfolge der Karten ändert nichts daran, welches Foto zu welcher Aktivität gehört', () => {
    const group = [activity('n-b', 'nature'), activity('c-a', 'cooking'), activity('n-a', 'nature')];
    const forward = assignCardImages(group, photos);
    const order = [2, 0, 1];
    const shuffled = assignCardImages(order.map((i) => group[i]), photos);
    order.forEach((original, position) => expect(shuffled[position]).toEqual(forward[original]));
  });

  it('eine einzelne Karte ohne Nachbarn bekommt ihr bestes Foto (wie pickCategoryPhoto)', () => {
    for (const id of manyIds.slice(0, 30)) {
      const [chain] = assignCardImages([activity(id, 'nature')], photos);
      expect(chain).toEqual(getCardImageChain(activity(id, 'nature'), photos));
    }
  });

  it('Karten verschiedener Kategorien beeinflussen sich nicht', () => {
    const alone = assignCardImages([activity('x', 'nature')], photos)[0];
    const mixed = assignCardImages([activity('x', 'nature'), activity('y', 'cooking'), activity('z', 'craft')], photos)[0];
    expect(mixed).toEqual(alone);
  });

  it('Karten ohne Foto in der Kategorie zeigen die Fläche, die anderen ihr Foto', () => {
    const chains = assignCardImages(
      [activity('a', 'outing'), activity('b', 'nature'), activity('c', 'movement', 'https://example.org/c.jpg')],
      photos,
    );
    expect(chains.map((chain) => chain.map((step) => step.kind))).toEqual([
      ['placeholder'],
      ['category', 'placeholder'],
      ['activity', 'placeholder'],
    ]);
  });

  it('eine leere Gruppe ergibt eine leere Liste', () => {
    expect(assignCardImages([], photos)).toEqual([]);
  });
});

describe('Mindestzahl: Kategorie-Fotos erst ab drei Fotos je Kategorie', () => {
  it('die Mindestzahl ist 3 (Entscheidung von Clemens, steht nur in categoryPhotoFiles.ts)', () => {
    expect(minPhotosPerCategory).toBe(3);
  });

  it.each([0, 1, 2])('eine Kategorie mit %s Foto(s) zeigt keines: nur die Farbfläche', (count) => {
    const photos = library({ cooking: count });
    expect(usablePhotos(photos.cooking)).toEqual([]);
    expect(pickCategoryPhoto(activity('a', 'cooking'), photos)).toBeUndefined();
    expect(getCardImageChain(activity('a', 'cooking'), photos)).toEqual([{ kind: 'placeholder' }]);
    expect(assignCardImages([activity('a', 'cooking'), activity('b', 'cooking')], photos)).toEqual([
      [{ kind: 'placeholder' }],
      [{ kind: 'placeholder' }],
    ]);
  });

  it.each([3, 4, 7])('eine Kategorie mit %s Fotos zeigt ihre Fotos', (count) => {
    const photos = library({ cooking: count });
    expect(usablePhotos(photos.cooking)).toHaveLength(count);
    expect(pickCategoryPhoto(activity('a', 'cooking'), photos)).toBeDefined();
    expect(getCardImageChain(activity('a', 'cooking'), photos).map((step) => step.kind)).toEqual(['category', 'placeholder']);
  });

  it('das Bild einer Aktivität hat weiterhin Vorrang, auch in einer Kategorie ohne genug Fotos', () => {
    for (const count of [0, 1, 2]) {
      const chain = getCardImageChain(activity('a', 'game', 'https://example.org/a.jpg'), library({ game: count }));
      expect(chain).toEqual([{ kind: 'activity', uri: 'https://example.org/a.jpg' }, { kind: 'placeholder' }]);
    }
  });

  it('jede Kategorie entscheidet für sich: eine mit zwei Fotos nimmt einer mit drei nichts weg', () => {
    const photos = library({ cooking: 3, game: 2 });
    const chains = assignCardImages([activity('a', 'cooking'), activity('b', 'game'), activity('c', 'cooking')], photos);
    expect(chains.map((chain) => chain.map((step) => step.kind))).toEqual([
      ['category', 'placeholder'],
      ['placeholder'],
      ['category', 'placeholder'],
    ]);
    expect(chains[0]).not.toEqual(chains[2]); // die beiden Kochen-Karten zeigen verschiedene Fotos
  });
});

describe('Die Fotos der App (categoryPhotos.generated.ts)', () => {
  it('eine Kategorie zeigt Fotos genau dann, wenn sie mindestens die Mindestzahl hat; sonst die Farbfläche', () => {
    for (const category of categoryKeys) {
      const [chain] = assignCardImages([activity('echt-1', category)]);
      expect(chain[chain.length - 1]).toEqual({ kind: 'placeholder' });
      expect(chain.some((step) => step.kind === 'category')).toBe(categoryPhotos[category].length >= minPhotosPerCategory);
    }
  });

  it('mit Bild der Aktivität: Web-Adresse zuerst, in jeder Kategorie', () => {
    for (const category of categoryKeys) {
      const [chain] = assignCardImages([activity('echt-1', category, 'https://example.org/a.jpg')]);
      expect(chain[0]).toEqual({ kind: 'activity', uri: 'https://example.org/a.jpg' });
    }
  });
});
