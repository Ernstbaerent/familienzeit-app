// ERZEUGT von `npm run photos:index` (scripts/index-photos.ts). Nicht von Hand ändern.
// Quelle: die Dateien in assets/images/categories/ (Namensschema kategorie-nummer.jpg).
// Neues Foto: Datei dort ablegen, in docs/bildquellen.md eintragen, `npm run photos:index` ausführen.

import type { ImageSourcePropType } from 'react-native';

import type { ActivityCategory } from './activities';

export type CategoryPhoto = {
  file: string; // Dateiname, z. B. natur-2.jpg
  source: ImageSourcePropType;
};

export const categoryPhotos: Record<ActivityCategory, readonly CategoryPhoto[]> = {
  craft: [
    { file: 'basteln-1.jpg', source: require('../../../assets/images/categories/basteln-1.jpg') },
  ],
  game: [
    { file: 'spiel-1.jpg', source: require('../../../assets/images/categories/spiel-1.jpg') },
  ],
  movement: [],
  experiment: [],
  nature: [
    { file: 'natur-1.jpg', source: require('../../../assets/images/categories/natur-1.jpg') },
    { file: 'natur-2.jpg', source: require('../../../assets/images/categories/natur-2.jpg') },
    { file: 'natur-3.jpg', source: require('../../../assets/images/categories/natur-3.jpg') },
    { file: 'natur-4.jpg', source: require('../../../assets/images/categories/natur-4.jpg') },
  ],
  cooking: [
    { file: 'kochen-1.jpg', source: require('../../../assets/images/categories/kochen-1.jpg') },
    { file: 'kochen-2.jpg', source: require('../../../assets/images/categories/kochen-2.jpg') },
    { file: 'kochen-4.jpg', source: require('../../../assets/images/categories/kochen-4.jpg') },
  ],
  outing: [],
};
