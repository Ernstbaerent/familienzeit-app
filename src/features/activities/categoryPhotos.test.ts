// Die Foto-Liste der App muss zu den Dateien in assets/images/categories/ passen (Ablauf: `npm run photos:index`).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { categoryKeys } from './activities';
import {
  buildPhotoIndex,
  categoryPhotoDir,
  photoIndexFile,
  photoPrefixes,
  renderPhotoIndexModule,
} from './categoryPhotoFiles';
import { categoryPhotos } from './categoryPhotos.generated';

const root = join(__dirname, '../../..');
const photoDir = join(root, categoryPhotoDir);
const files = readdirSync(photoDir).filter((name) => !name.startsWith('.'));

describe('buildPhotoIndex', () => {
  it('sortiert nach Nummer, nicht nach Text (natur-10 kommt nach natur-2)', () => {
    const index = buildPhotoIndex(['natur-10.jpg', 'natur-2.jpg', 'natur-1.jpg']);
    expect(index.nature).toEqual(['natur-1.jpg', 'natur-2.jpg', 'natur-10.jpg']);
  });

  it('erlaubt Lücken in den Nummern und ändert keine Namen', () => {
    expect(buildPhotoIndex(['kochen-1.jpg', 'kochen-2.jpg', 'kochen-4.jpg']).cooking).toEqual([
      'kochen-1.jpg',
      'kochen-2.jpg',
      'kochen-4.jpg',
    ]);
  });

  it('ordnet jeden Dateinamen-Anfang seiner Kategorie zu', () => {
    const names = categoryKeys.map((category) => `${photoPrefixes[category]}-1.jpg`);
    const index = buildPhotoIndex(names);
    for (const category of categoryKeys) expect(index[category]).toEqual([`${photoPrefixes[category]}-1.jpg`]);
  });

  it('Kategorien ohne Foto bekommen eine leere Liste (alle sieben sind da)', () => {
    const index = buildPhotoIndex(['spiel-1.jpg']);
    expect(Object.keys(index).sort()).toEqual([...categoryKeys].sort());
    expect(index.game).toEqual(['spiel-1.jpg']);
    for (const category of categoryKeys.filter((key) => key !== 'game')) expect(index[category]).toEqual([]);
  });

  it('versteckte Dateien zählen nicht', () => {
    expect(buildPhotoIndex(['.DS_Store', 'spiel-1.jpg']).game).toEqual(['spiel-1.jpg']);
  });

  it.each(['natur.jpg', 'natur-0.jpg', 'natur-01.jpg', 'natur-1.png', 'wald-1.jpg', 'Natur-1.jpg', 'natur-1.jpeg'])(
    'meldet den Namen %s, der nicht zum Schema passt',
    (name) => {
      expect(() => buildPhotoIndex(['spiel-1.jpg', name])).toThrow(name);
    },
  );
});

describe('Fotos in assets/images/categories/', () => {
  it('Die erzeugte Datei entspricht genau den Dateien (sonst: `npm run photos:index`)', () => {
    const expected = renderPhotoIndexModule(buildPhotoIndex(files));
    const actual = readFileSync(join(root, photoIndexFile), 'utf8');
    expect(actual).toBe(expected);
  });

  it('Die Liste in der App enthält genau die Dateien, nach Kategorie und Nummer', () => {
    const index = buildPhotoIndex(files);
    for (const category of categoryKeys) {
      expect(categoryPhotos[category].map((photo) => photo.file)).toEqual(index[category]);
    }
    const total = categoryKeys.reduce((sum, category) => sum + categoryPhotos[category].length, 0);
    expect(total).toBe(files.length);
  });

  it('Jedes Foto ist unter 300 KB (Regel aus der DESIGN.md)', () => {
    const tooBig = files.filter((file) => statSync(join(photoDir, file)).size >= 300 * 1024);
    expect(tooBig).toEqual([]);
  });

  it('Jedes Foto steht in docs/bildquellen.md, und dort steht kein Foto, das es nicht gibt', () => {
    const sources = readFileSync(join(root, 'docs/bildquellen.md'), 'utf8');
    const listed = [...sources.matchAll(/^\| `([^`]+\.jpg)` \|/gm)].map((match) => match[1]);
    expect([...listed].sort()).toEqual([...files].sort());
  });
});
