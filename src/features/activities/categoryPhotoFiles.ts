// Kategorie-Fotos: Dateinamen lesen und die Liste erzeugen, die die App nutzt (ohne UI, ohne Dateizugriff).
// Reine Funktionen. Den Dateizugriff macht scripts/index-photos.ts (`npm run photos:index`), geprüft wird in
// categoryPhotos.test.ts, dass die erzeugte Datei zu den Fotos in assets/images/categories/ passt.
//
// Hinweis zu den Imports: Sie enden auf ".ts", weil das Skript diese Datei direkt mit Node liest.

import { categoryKeys, type ActivityCategory } from './activities.ts';

// Ordner der Fotos, vom Projektordner aus. Namensschema der Dateien: kategorie-nummer.jpg (z. B. natur-2.jpg).
export const categoryPhotoDir = 'assets/images/categories';

// Dateiname-Anfang je Kategorie (deutsch, wie in docs/bildquellen.md und in der DESIGN.md).
export const photoPrefixes: Record<ActivityCategory, string> = {
  craft: 'basteln',
  game: 'spiel',
  movement: 'bewegung',
  experiment: 'experiment',
  nature: 'natur',
  cooking: 'kochen',
  outing: 'ausflug',
};

// Ab so vielen Fotos zeigt eine Kategorie ihre Fotos auf den Karten und in der Detailansicht. Hat sie weniger, zeigen sie die Farbfläche mit Symbol.
// ERST EINMAL GANZ OHNE FOTOS (DESIGN.md, Zusatz 36): Die Schwelle steht bewusst auf 99, damit keine Kategorie je so viele Fotos erreicht.
// Der Mechanismus, die Foto-Liste und die Dateien bleiben. Fotos kommen später über M9b (Bilder-Pipeline); dann wird diese Zahl wieder gesenkt
// (davor stand sie auf 3, DESIGN.md Zusatz 34: Mit nur einem oder zwei Fotos passt das Bild oft nicht zur Aktivität, z. B. ein Schachbrett bei der Kissenburg).
// Das `image` einer einzelnen Aktivität hat weiterhin Vorrang und zählt hier nicht mit.
// Die Zahl steht nur hier (Erklärung: docs/theme.md, „Kategorie-Fotos: Mindestzahl“).
export const minPhotosPerCategory = 99;

// Wo die erzeugte Liste liegt (vom Projektordner aus).
export const photoIndexFile = 'src/features/activities/categoryPhotos.generated.ts';

export type PhotoIndex = Record<ActivityCategory, string[]>;

const fileNamePattern = /^([a-z]+)-([1-9]\d*)\.jpg$/;

// Dateinamen je Kategorie, nach Nummer sortiert. Die Nummern dürfen Lücken haben (z. B. 1, 2, 4),
// es wird nie umbenannt. Kategorien ohne Foto bekommen eine leere Liste. Versteckte Dateien (.DS_Store) zählen nicht.
// Passt ein Name nicht zum Schema, ist das ein Fehler (statt das Foto stillschweigend zu übergehen).
export function buildPhotoIndex(fileNames: readonly string[]): PhotoIndex {
  const index = Object.fromEntries(categoryKeys.map((category) => [category, []])) as unknown as Record<
    ActivityCategory,
    { number: number; file: string }[]
  >;
  const problems: string[] = [];

  for (const file of fileNames) {
    if (file.startsWith('.')) continue;
    const match = fileNamePattern.exec(file);
    const category = categoryKeys.find((key) => photoPrefixes[key] === match?.[1]);
    if (!match || !category) {
      problems.push(file);
      continue;
    }
    index[category].push({ number: Number(match[2]), file });
  }

  if (problems.length > 0) {
    const prefixes = categoryKeys.map((category) => photoPrefixes[category]).join(', ');
    throw new Error(
      `Diese Dateien passen nicht zum Schema kategorie-nummer.jpg (Kategorien: ${prefixes}; Nummer ab 1): ${problems.join(', ')}`,
    );
  }

  return Object.fromEntries(
    categoryKeys.map((category) => [
      category,
      index[category].sort((a, b) => a.number - b.number).map((entry) => entry.file),
    ]),
  ) as PhotoIndex;
}

// Der Text der erzeugten Datei. `require` muss feste Pfade haben, damit Metro die Fotos in die App packt;
// deshalb eine erzeugte Datei und keine Suche zur Laufzeit.
export function renderPhotoIndexModule(index: PhotoIndex): string {
  const sections = categoryKeys.map((category) => {
    const files = index[category];
    if (files.length === 0) return `  ${category}: [],`;
    const entries = files.map(
      (file) => `    { file: '${file}', source: require('../../../${categoryPhotoDir}/${file}') },`,
    );
    return [`  ${category}: [`, ...entries, '  ],'].join('\n');
  });

  return `// ERZEUGT von \`npm run photos:index\` (scripts/index-photos.ts). Nicht von Hand ändern.
// Quelle: die Dateien in ${categoryPhotoDir}/ (Namensschema kategorie-nummer.jpg).
// Neues Foto: Datei dort ablegen, in docs/bildquellen.md eintragen, \`npm run photos:index\` ausführen.

import type { ImageSourcePropType } from 'react-native';

import type { ActivityCategory } from './activities';

export type CategoryPhoto = {
  file: string; // Dateiname, z. B. natur-2.jpg
  source: ImageSourcePropType;
};

export const categoryPhotos: Record<ActivityCategory, readonly CategoryPhoto[]> = {
${sections.join('\n')}
};
`;
}
