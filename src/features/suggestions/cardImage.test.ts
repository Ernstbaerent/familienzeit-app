// Bild einer Vorschlagskarte (DESIGN.md, Entscheidung 21): Vorrang, stabile Zuordnung, Kategorien ohne Foto.
// Die Tests nehmen eigene Foto-Listen, damit sie nicht davon abhängen, welche Fotos gerade im Ordner liegen.
// Den Mechanismus prüfen sie mit einer eigenen Mindestzahl (`testMin`, 3), nicht mit der echten Konstante: Die steht heute auf 99
// (erst einmal ganz ohne Fotos, Zusatz 36) und würde sonst alle Foto-Tests stumm machen. Am Ende prüft ein eigener Block die echten Werte der App.

import { categoryKeys, type Activity, type ActivityCategory } from '../activities/activities';
import { minPhotosPerCategory } from '../activities/categoryPhotoFiles';
import { categoryPhotos } from '../activities/categoryPhotos.generated';
import * as cardImage from './cardImage';
import { hashText, rankPhotos, type CardImageInput, type PhotoLibrary } from './cardImage';

// Mindestzahl für die Tests des Mechanismus (früher die echte Zahl, DESIGN.md Zusatz 34).
const testMin = 3;

const usablePhotos = <Photo extends { file: string }>(photos: readonly Photo[], minPhotos = testMin) =>
  cardImage.usablePhotos(photos, minPhotos);
const pickCategoryPhoto = <Photo extends { file: string }>(
  activity: Pick<Activity, 'id' | 'category'>,
  photoLibrary: PhotoLibrary<Photo>,
  minPhotos = testMin,
) => cardImage.pickCategoryPhoto(activity, photoLibrary, minPhotos);
const getCardImageChain = <Photo extends { file: string }>(
  activity: CardImageInput,
  photoLibrary: PhotoLibrary<Photo>,
  minPhotos = testMin,
) => cardImage.getCardImageChain(activity, photoLibrary, minPhotos);
const assignCardImages = <Photo extends { file: string }>(
  activities: readonly CardImageInput[],
  photoLibrary: PhotoLibrary<Photo>,
  minPhotos = testMin,
) => cardImage.assignCardImages(activities, photoLibrary, minPhotos);

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

describe('Mindestzahl: Kategorie-Fotos erst ab der Mindestzahl (hier mit 3 getestet)', () => {
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

  it('die Mindestzahl ist ein Parameter: dieselben Fotos erscheinen bei 1, aber nicht bei 5', () => {
    const photos = library({ nature: 2 });
    expect(usablePhotos(photos.nature, 1)).toHaveLength(2);
    expect(usablePhotos(photos.nature, 2)).toHaveLength(2);
    expect(usablePhotos(photos.nature, 3)).toEqual([]);
    expect(usablePhotos(photos.nature, 5)).toEqual([]);
    expect(getCardImageChain(activity('a', 'nature'), photos, 1).map((step) => step.kind)).toEqual(['category', 'placeholder']);
    expect(getCardImageChain(activity('a', 'nature'), photos, 5)).toEqual([{ kind: 'placeholder' }]);
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

// Erst einmal ganz ohne Fotos (DESIGN.md, Zusatz 36): Die echte Mindestzahl steht auf 99, keine Kategorie erreicht sie.
// Der Mechanismus bleibt: Mit der echten Zahl erscheinen Fotos wieder, sobald eine Kategorie genug hat.
describe('Heute keine Kategorie-Fotos (echte Werte der App)', () => {
  const photoCount = (category: ActivityCategory) => categoryPhotos[category].length;

  it('die Mindestzahl steht auf 99 (beim Wiedereinschalten der Fotos über M9b hier und in docs/theme.md anpassen)', () => {
    expect(minPhotosPerCategory).toBe(99);
  });

  it('keine Kategorie hat so viele Fotos, die Foto-Liste und die Dateien bleiben aber erhalten', () => {
    for (const category of categoryKeys) expect(photoCount(category)).toBeLessThan(minPhotosPerCategory);
    const total = categoryKeys.reduce((sum, category) => sum + photoCount(category), 0);
    expect(total).toBeGreaterThan(0); // die Liste ist nicht leer geräumt worden
  });

  it('jede Kategorie ohne Bild der Aktivität: nur die Farbfläche, auf der Karte (Gruppe) und für sich allein (Detailansicht)', () => {
    for (const category of categoryKeys) {
      const [inGroup] = cardImage.assignCardImages([activity('echt-1', category)]);
      expect(inGroup).toEqual([{ kind: 'placeholder' }]);
      expect(cardImage.getCardImageChain(activity('echt-1', category))).toEqual([{ kind: 'placeholder' }]);
      expect(cardImage.pickCategoryPhoto(activity('echt-1', category), categoryPhotos)).toBeUndefined();
    }
  });

  it('auch ein Kochen-Rezept, das früher ein Foto bekam, zeigt jetzt die Farbfläche', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `m4-${i}`);
    const chains = cardImage.assignCardImages(ids.map((id) => activity(id, 'cooking')));
    for (const chain of chains) expect(chain.map((step) => step.kind)).toEqual(['placeholder']);
  });

  it('mit Bild der Aktivität: Web-Adresse zuerst, dann die Farbfläche, in jeder Kategorie', () => {
    for (const category of categoryKeys) {
      const [chain] = cardImage.assignCardImages([activity('echt-1', category, 'https://example.org/a.jpg')]);
      expect(chain).toEqual([{ kind: 'activity', uri: 'https://example.org/a.jpg' }, { kind: 'placeholder' }]);
    }
  });

  it('die Konstante ist der Schalter: Hat eine Kategorie genau so viele Fotos wie die Mindestzahl, erscheinen sie wieder', () => {
    const enough = library({ nature: minPhotosPerCategory });
    const [chain] = cardImage.assignCardImages([activity('x', 'nature')], enough);
    expect(chain.map((step) => step.kind)).toEqual(['category', 'placeholder']);
    const oneShort = library({ nature: minPhotosPerCategory - 1 });
    expect(cardImage.assignCardImages([activity('x', 'nature')], oneShort)[0]).toEqual([{ kind: 'placeholder' }]);
  });
});
