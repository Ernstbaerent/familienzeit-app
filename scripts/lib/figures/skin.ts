// Figuren (M9b): die Hauttöne der Besetzung (entschieden von Clemens, 2026-10-16: Variante A, „bunte Besetzung“).
// Acht warme Braun- und Hauttöne von hell bis tief, ohne Gelb- und ohne Rotstich (Farbton 21° bis 26°). Jede Figur hat einen Platz `skin1` bis `skin8`
// (Kopf und Hände). Die Töne sind Rollen der Zeichnungs-Palette (`illustrationPalette` in src/lib/palette.ts). Kontrast nach WCAG (src/lib/contrast.ts).

import { contrastRatio } from '../../../src/lib/contrast.ts';
import { illustrationPalette } from '../../../src/lib/palette.ts';

// Platz 1 bis 8, von hell bis tief. Die Besetzung nutzt fünf davon, drei sind Reserve für weitere Figuren.
export const skinTones = [illustrationPalette.skin1, illustrationPalette.skin2, illustrationPalette.skin3, illustrationPalette.skin4, illustrationPalette.skin5, illustrationPalette.skin6, illustrationPalette.skin7, illustrationPalette.skin8] as const;
export type SkinSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const tinte = illustrationPalette.ink;
const leinen = illustrationPalette.paper;

export const toneOf = (slot: SkinSlot): string => skinTones[slot - 1];

// Hintergründe, auf denen Figuren stehen können.
export const backgrounds = { leinen: illustrationPalette.paper, rose: illustrationPalette.rose, petrol: illustrationPalette.petrol, ground: illustrationPalette.ground } as const;
export type BackgroundName = keyof typeof backgrounds;

// Regel (Clemens, 2026-10-16): Ein Ton „trägt“ auf einem Hintergrund, wenn die Haut gegen den Hintergrund mindestens 3:1 hat
// ODER der Tinten-Umriss gegen die Haut mindestens 3:1. Bei gesichtslosen Köpfen trägt entweder die Form der Haut oder der Umriss.
export const minContrast = 3;

export function skinCarriesOn(tone: string, background: string): boolean {
  return contrastRatio(tone, background) >= minContrast || contrastRatio(tone, tinte) >= minContrast;
}

export const toneCarries = (slot: SkinSlot, bg: BackgroundName): boolean => skinCarriesOn(toneOf(slot), backgrounds[bg]);

// Farbplätze für renderTemplate (zusätzlich zur Zeichnungs-Palette). Die Augenfarbe gibt es nur für die freiwillige Fassung mit Augenpunkten (nicht gewählt).
export function eyeColorOn(tone: string): string {
  return contrastRatio(tone, tinte) >= contrastRatio(tone, leinen) ? tinte : leinen;
}

export function skinPalette(): Record<string, string> {
  const out: Record<string, string> = { ...illustrationPalette };
  skinTones.forEach((tone, i) => {
    out[`eye${i + 1}`] = eyeColorOn(tone);
  });
  return out;
}

export type SkinContrast = { tone: string; leinen: number; rose: number; ground: number; petrol: number; ink: number; carries: Record<BackgroundName, boolean> };

export function skinContrast(tone: string): SkinContrast {
  return {
    tone,
    leinen: contrastRatio(tone, leinen),
    rose: contrastRatio(tone, illustrationPalette.rose),
    ground: contrastRatio(tone, illustrationPalette.ground),
    petrol: contrastRatio(tone, illustrationPalette.petrol),
    ink: contrastRatio(tone, tinte),
    carries: {
      leinen: skinCarriesOn(tone, backgrounds.leinen),
      rose: skinCarriesOn(tone, backgrounds.rose),
      petrol: skinCarriesOn(tone, backgrounds.petrol),
      ground: skinCarriesOn(tone, backgrounds.ground),
    },
  };
}
