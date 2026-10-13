// PILOT Illustrationen (docs/design/ILLUSTRATIONEN.md, nicht endgültig): die zentrale Zuordnung „Aktivität → Illustration“.
// Nur hier steht, welche Aktivität ein Titelbild und welche Schritte ein Schrittbild haben. Alle anderen Aktivitäten zeigen
// weiter die Farbfläche (oder ihr Foto). Vorrang im Bildbereich: `image` der Aktivität, dann Illustration, dann Kategorie-Foto, dann Farbfläche.
// Die Dateien liegen in assets/illustrations/ (SVG, angezeigt mit expo-image). Der Test illustrations.test.ts prüft Dateien und Zuordnung.
//
// Neue Illustration: SVG nach den Stilregeln ablegen (Name `aktivitaets-id.svg` bzw. `aktivitaets-id-step-N.svg`),
// hier eintragen, `npm test` ausführen.

export type Illustration = {
  file: string; // Dateiname in assets/illustrations/, z. B. homemade-pizza.svg
  source: number; // das gebündelte Bild (require), für expo-image
};

export type ActivityIllustrations = {
  cover: Illustration; // Titelbild für Karte und Detailansicht
  steps?: Readonly<Record<number, Illustration>>; // Schrittbilder nach Schrittnummer, wie sie in der App steht (ab 1)
};

// Ordner der Illustrationen, vom Projektordner aus.
export const illustrationDir = 'assets/illustrations';

export const activityIllustrations: Readonly<Record<string, ActivityIllustrations>> = {
  'sock-puppet-theater': {
    cover: { file: 'sock-puppet-theater.svg', source: require('../../../assets/illustrations/sock-puppet-theater.svg') },
    steps: {
      1: { file: 'sock-puppet-theater-step-1.svg', source: require('../../../assets/illustrations/sock-puppet-theater-step-1.svg') },
      2: { file: 'sock-puppet-theater-step-2.svg', source: require('../../../assets/illustrations/sock-puppet-theater-step-2.svg') },
      3: { file: 'sock-puppet-theater-step-3.svg', source: require('../../../assets/illustrations/sock-puppet-theater-step-3.svg') },
    },
  },
  'homemade-pizza': {
    cover: { file: 'homemade-pizza.svg', source: require('../../../assets/illustrations/homemade-pizza.svg') },
  },
  'baking-soda-volcano': {
    cover: { file: 'baking-soda-volcano.svg', source: require('../../../assets/illustrations/baking-soda-volcano.svg') },
  },
};

// Das Titelbild einer Aktivität, `undefined` ohne Illustration.
export function getIllustration(activityId: string): Illustration | undefined {
  return activityIllustrations[activityId]?.cover;
}

// Die Schrittbilder einer Aktivität (Schlüssel = Schrittnummer ab 1), `undefined` ohne Schrittbilder.
export function getStepIllustrations(activityId: string): Readonly<Record<number, Illustration>> | undefined {
  return activityIllustrations[activityId]?.steps;
}
