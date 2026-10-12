/**
 * Erzeugt die Liste der Kategorie-Fotos, die die App nutzt (`npm run photos:index`).
 *
 * Liest die Dateien in assets/images/categories/ (Namensschema kategorie-nummer.jpg) und schreibt
 * src/features/activities/categoryPhotos.generated.ts. Neues Foto: Datei ablegen, in docs/bildquellen.md eintragen,
 * dieses Skript laufen lassen. Der Test categoryPhotos.test.ts meldet, wenn Dateien und Liste nicht zusammenpassen.
 *
 * Braucht Node 22 oder neuer, kein Netz, kein Schlüssel.
 */
/// <reference types="node" />
import { readdirSync, writeFileSync } from 'node:fs';

import {
  buildPhotoIndex,
  categoryPhotoDir,
  photoIndexFile,
  renderPhotoIndexModule,
} from '../src/features/activities/categoryPhotoFiles.ts';
import { categoryKeys } from '../src/features/activities/activities.ts';

const root = new URL('../', import.meta.url);

try {
  const index = buildPhotoIndex(readdirSync(new URL(`${categoryPhotoDir}/`, root)));
  writeFileSync(new URL(photoIndexFile, root), renderPhotoIndexModule(index));

  const total = categoryKeys.reduce((sum, category) => sum + index[category].length, 0);
  console.log(`${photoIndexFile}: ${total} Fotos`);
  for (const category of categoryKeys) {
    const files = index[category];
    console.log(`  ${category.padEnd(10)} ${files.length === 0 ? '– (Farbfläche mit Symbol)' : files.join(', ')}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
