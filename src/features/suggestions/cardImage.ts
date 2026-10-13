// Welches Bild eine Vorschlagskarte zeigt. Reine Funktionen, ohne UI.
//
// Es gibt keine Stock-Fotos mehr (DESIGN.md, Zusatz 45): Bilder werden selbst gezeichnet (Illustrationen, SVG).
// Vorrang im Bildbereich: 1. `image` der Aktivität (Web-Adresse, nur von unserem eigenen Speicher), 2. Illustration (illustrations.ts), 3. Farbfläche mit Symbol.
// Diese Datei kennt die erste und die letzte Stufe; die Illustration schiebt `CardMedia` dazwischen ein, weil sie ein gebündeltes Bild ist.
// Jede Karte hat eine Kette dieser Stufen. Lädt eine Stufe nicht (Web-Adresse nicht erreichbar), zeigt die Karte die nächste.

import type { Activity } from '../activities/activities';
import { isAllowedImageUrl } from '../activities/imageAllowlist';
import { getImagePrefix } from '../activities/supabaseConfig';

export type CardImageSource = { kind: 'activity'; uri: string } | { kind: 'placeholder' };

// Die Stufen einer Karte, bestes Bild zuerst. Die letzte Stufe ist immer die Farbfläche.
export type CardImageChain = CardImageSource[];

export type CardImageInput = Pick<Activity, 'image'>;

// Die Bildkette einer Aktivität. Ein `image` zählt nur, wenn es von unserem eigenen Speicher kommt (Allowlist, DESIGN.md Zusatz 35):
// `imagePrefix` ist der erlaubte Anfang der Adresse (Vorgabe: aus EXPO_PUBLIC_SUPABASE_URL). Ohne Projekt-Adresse ist kein Bild erlaubt.
// Leer oder fehlend zählt als „kein Bild“.
export function getCardImageChain(activity: CardImageInput, imagePrefix: string | null = getImagePrefix()): CardImageChain {
  const image = activity.image;
  return isAllowedImageUrl(image, imagePrefix)
    ? [{ kind: 'activity', uri: image.trim() }, { kind: 'placeholder' }]
    : [{ kind: 'placeholder' }];
}
