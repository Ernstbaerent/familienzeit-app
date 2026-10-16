// Figuren (M9b): drei Hautton-Varianten zur Auswahl (Entwurf, nichts festgeschrieben, siehe docs/design/FIGUREN.md).
// Jede Figur hat einen Platz `skin1` bis `skin5` (und `eye1` bis `eye5` für die Augenpunkte). Eine Variante sagt, welche Farbe auf welchem Platz liegt.
// Die Töne sind Platzhalter der Zeichnungs-Palette; sie kommen nach der Wahl in src/lib/palette.ts. Kontrast nach WCAG (src/lib/contrast.ts).

import { contrastRatio } from '../../../src/lib/contrast.ts';
import { illustrationPalette } from '../../../src/lib/palette.ts';

export type SkinVariantId = 'A' | 'B' | 'C';

export type SkinVariant = {
  id: SkinVariantId;
  title: string;
  idea: string;
  tones: readonly [string, string, string, string, string]; // Farbe je Platz skin1 bis skin5
};

export const skinVariants: readonly SkinVariant[] = [
  {
    id: 'A',
    title: 'Variante A: bunte Besetzung',
    idea: 'Fünf feste warme Töne von hell bis dunkel, jede Figur hat ihren eigenen. Zeigt Vielfalt, ohne einzelne Menschen zu beschreiben.',
    tones: ['#F1CDB3', '#DDAA85', '#C48A62', '#B07A52', '#A56B45'],
  },
  {
    id: 'B',
    title: 'Variante B: ein mittlerer Ton',
    idea: 'Alle Figuren haben denselben mittleren, warmen Ton (Farbton 23°, gedämpft, ohne Gelb- und ohne Rotstich).',
    tones: ['#C4967C', '#C4967C', '#C4967C', '#C4967C', '#C4967C'],
  },
  {
    id: 'C',
    title: 'Variante C: keine Hautfarbe',
    idea: 'Alle Figuren in einem weichen Blaugrau, eindeutig stilisiert. Niemand wird als „hellhäutig“ oder „dunkelhäutig“ gelesen.',
    tones: ['#A9BFCB', '#A9BFCB', '#A9BFCB', '#A9BFCB', '#A9BFCB'],
  },
];

const tinte = illustrationPalette.ink;
const leinen = illustrationPalette.paper;

// Augenpunkt auf einem Hautton: Tinte oder Leinen, je nachdem, was auf dem Ton besser lesbar ist.
export const eyeColorOn = (tone: string): string => (contrastRatio(tone, tinte) >= contrastRatio(tone, leinen) ? tinte : leinen);

// Farbplätze einer Variante, zum Einsetzen mit renderTemplate (zusätzlich zur Zeichnungs-Palette).
export function skinPalette(variant: SkinVariant): Record<string, string> {
  const out: Record<string, string> = { ...illustrationPalette };
  variant.tones.forEach((tone, i) => {
    out[`skin${i + 1}`] = tone;
    out[`eye${i + 1}`] = eyeColorOn(tone);
  });
  return out;
}

export type SkinContrast = { tone: string; leinen: number; rose: number; ground: number; petrol: number; ink: number; eye: string; eyeContrast: number };

// Kontrast eines Tons gegen die Hintergründe, auf denen Figuren stehen, und gegen die Tinte (Umriss).
export function skinContrast(tone: string): SkinContrast {
  const eye = eyeColorOn(tone);
  return {
    tone,
    leinen: contrastRatio(tone, leinen),
    rose: contrastRatio(tone, illustrationPalette.rose),
    ground: contrastRatio(tone, illustrationPalette.ground),
    petrol: contrastRatio(tone, illustrationPalette.petrol),
    ink: contrastRatio(tone, tinte),
    eye,
    eyeContrast: contrastRatio(tone, eye),
  };
}
