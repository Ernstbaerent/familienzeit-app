// Welches Bild eine Vorschlagskarte zeigt. Reine Funktionen, ohne UI.
//
// Es gibt keine Stock-Fotos mehr (DESIGN.md, Zusatz 45): Bilder werden selbst gezeichnet (Illustrationen, SVG).
// Vorrang im Bildbereich: 1. `image` der Aktivität (Web-Adresse), 2. Illustration (illustrations.ts), 3. Farbfläche mit Symbol.
// Diese Datei kennt die ersten und die letzte Stufe; die Illustration schiebt `CardMedia` dazwischen ein, weil sie ein gebündeltes Bild ist.
// Jede Karte hat eine Kette dieser Stufen. Lädt eine Stufe nicht (Web-Adresse nicht erreichbar), zeigt die Karte die nächste.

import type { Activity } from '../activities/activities';

export type CardImageSource = { kind: 'activity'; uri: string } | { kind: 'placeholder' };

// Die Stufen einer Karte, bestes Bild zuerst. Die letzte Stufe ist immer die Farbfläche.
export type CardImageChain = CardImageSource[];

export type CardImageInput = Pick<Activity, 'image'>;

// Nur echte Web-Adressen (https). Leer oder fehlend zählt als „kein Bild“.
function getActivityImage(image: string | undefined): string | undefined {
  const uri = image?.trim();
  return uri && uri.startsWith('https://') ? uri : undefined;
}

// Die Bildkette einer Aktivität.
export function getCardImageChain(activity: CardImageInput): CardImageChain {
  const uri = getActivityImage(activity.image);
  return uri ? [{ kind: 'activity', uri }, { kind: 'placeholder' }] : [{ kind: 'placeholder' }];
}
