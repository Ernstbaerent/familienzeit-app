// Welches Bild eine Vorschlagskarte zeigt (DESIGN.md, Entscheidung 21). Reine Funktionen, ohne UI.
//
// Vorrang: 1. `image` der Aktivität (Web-Adresse), 2. gebündeltes Kategorie-Foto, 3. Farbfläche mit Symbol.
// Ein Kategorie-Foto gibt es nur, wenn die Kategorie mindestens `minPhotosPerCategory` Fotos hat (sonst passt das Bild zu oft nicht).
// Jede Karte hat eine Kette dieser Stufen. Lädt eine Stufe nicht (Web-Adresse nicht erreichbar), zeigt die Karte die nächste.
// Fotos gibt es nicht für jede Kategorie und nicht immer gleich viele: Die Liste kommt aus categoryPhotos.generated.ts
// (`npm run photos:index`), es gibt keine feste Anzahl (nur die Mindestzahl, ab der eine Kategorie Fotos zeigt).

import type { Activity, ActivityCategory } from '../activities/activities';
import { minPhotosPerCategory } from '../activities/categoryPhotoFiles';
import { categoryPhotos, type CategoryPhoto } from '../activities/categoryPhotos.generated';

export type CardImageSource<Photo extends { file: string } = CategoryPhoto> =
  | { kind: 'activity'; uri: string }
  | { kind: 'category'; photo: Photo }
  | { kind: 'placeholder' };

// Die Stufen einer Karte, bestes Bild zuerst. Die letzte Stufe ist immer die Farbfläche.
export type CardImageChain<Photo extends { file: string } = CategoryPhoto> = CardImageSource<Photo>[];

export type PhotoLibrary<Photo extends { file: string }> = Record<ActivityCategory, readonly Photo[]>;

export type CardImageInput = Pick<Activity, 'id' | 'category' | 'image'>;

// 32-Bit-Streuwert eines Textes (FNV-1a, danach durchmischt). Gleicher Text, gleicher Wert, auf jedem Gerät.
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Vergleich ohne Sprachregeln, damit die Reihenfolge auf jedem Gerät gleich ist.
function compareText(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

// Die Fotos einer Kategorie in der Reihenfolge, die zu dieser Aktivität gehört: Jedes Foto bekommt aus Aktivitäts-ID
// und Dateiname einen festen Wert, der höchste steht vorn. Das ist stabil (dieselbe Aktivität, dieselbe Reihenfolge)
// und hängt nur am Foto, nicht an seiner Nummer in der Liste: Kommt ein Foto dazu, ändert sich nur bei den Aktivitäten
// etwas, bei denen das neue Foto vorn landet. Fällt eines weg, rutschen nur die nach, die es vorn hatten.
export function rankPhotos<Photo extends { file: string }>(
  activityId: string,
  photos: readonly Photo[],
): Photo[] {
  return photos
    .map((photo) => ({ photo, score: hashText(`${activityId}|${photo.file}`) }))
    .sort((a, b) => b.score - a.score || compareText(a.photo.file, b.photo.file))
    .map((entry) => entry.photo);
}

// Die Fotos einer Kategorie, die auf Karten erscheinen dürfen: alle, wenn es mindestens `minPhotosPerCategory` sind, sonst keines.
export function usablePhotos<Photo extends { file: string }>(photos: readonly Photo[]): readonly Photo[] {
  return photos.length >= minPhotosPerCategory ? photos : [];
}

// Das Foto, das diese Aktivität allein (ohne Nachbarkarten) bekommt. `undefined`, wenn die Kategorie kein Foto hat.
export function pickCategoryPhoto<Photo extends { file: string }>(
  activity: Pick<Activity, 'id' | 'category'>,
  library: PhotoLibrary<Photo>,
): Photo | undefined {
  return rankPhotos(activity.id, usablePhotos(library[activity.category]))[0];
}

// Nur echte Web-Adressen (https). Leer oder fehlend zählt als „kein Bild“.
function getActivityImage(image: string | undefined): string | undefined {
  const uri = image?.trim();
  return uri && uri.startsWith('https://') ? uri : undefined;
}

function buildChain<Photo extends { file: string }>(
  image: string | undefined,
  photo: Photo | undefined,
): CardImageChain<Photo> {
  const uri = getActivityImage(image);
  const chain: CardImageChain<Photo> = [];
  if (uri) chain.push({ kind: 'activity', uri });
  if (photo) chain.push({ kind: 'category', photo });
  chain.push({ kind: 'placeholder' });
  return chain;
}

// Die Bildkette einer einzelnen Aktivität (ohne Rücksicht auf andere Karten).
export function getCardImageChain<Photo extends { file: string } = CategoryPhoto>(
  activity: CardImageInput,
  library: PhotoLibrary<Photo> = categoryPhotos as unknown as PhotoLibrary<Photo>,
): CardImageChain<Photo> {
  return buildChain(activity.image, pickCategoryPhoto(activity, library));
}

// Die Bildketten für die Karten eines Ergebnisses, in derselben Reihenfolge wie `activities`.
// Dasselbe Foto soll auf einem Bildschirm möglichst nur einmal vorkommen: Die Karten bekommen ihr Foto in der Reihenfolge
// ihrer IDs (nicht ihrer Anzeige-Reihenfolge, so bleibt ein Foto bei der Aktivität, auch wenn sich die Reihenfolge ändert).
// Jede nimmt das für sie bestplatzierte Foto, das noch frei ist. Nur wenn die Kategorie weniger Fotos hat als Karten,
// wiederholt sich eines (dann ist es unvermeidlich). Bei der Mindestzahl von drei Fotos je Kategorie und drei Karten pro Gruppe
// kommt das in einer Dreiergruppe nicht vor. Kategorien mit weniger Fotos zeigen die Farbfläche und nehmen anderen nichts weg.
export function assignCardImages<Photo extends { file: string } = CategoryPhoto>(
  activities: readonly CardImageInput[],
  library: PhotoLibrary<Photo> = categoryPhotos as unknown as PhotoLibrary<Photo>,
): CardImageChain<Photo>[] {
  const taken = new Set<string>();
  const photos = new Map<number, Photo | undefined>();

  const order = activities
    .map((_, index) => index)
    .sort((a, b) => compareText(activities[a].id, activities[b].id) || a - b);
  for (const index of order) {
    const activity = activities[index];
    const ranked = rankPhotos(activity.id, usablePhotos(library[activity.category]));
    const photo = ranked.find((candidate) => !taken.has(candidate.file)) ?? ranked[0];
    if (photo) taken.add(photo.file);
    photos.set(index, photo);
  }

  return activities.map((activity, index) => buildChain(activity.image, photos.get(index)));
}
