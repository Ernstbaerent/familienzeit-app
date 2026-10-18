// Welche Schrittbilder die Detailansicht zeigt (M9b). Reine Funktion, ohne UI.
//
// Schrittbilder kommen nur aus Supabase (Spalte step_images, Migration 0006). Beim Laden sind sie schon geprüft (activityLibrary.ts);
// hier wird die Allowlist beim Anzeigen noch einmal angewandt (wie bei `image` in cardImage.ts), damit nie ein fremder Server
// eine Anfrage bekommt. Fehlt ein Bild oder passt es nicht, steht beim Schritt nur der Text.

import type { Activity } from './activities';
import { isAllowedImageUrl } from './imageAllowlist';
import { getImagePrefix } from './supabaseConfig';

// Schrittnummer (ab 1) → Web-Adresse, nur Schritte, die es im angezeigten Text gibt.
export function getStepImageUris(
  activity: Pick<Activity, 'stepImages'>,
  stepCount: number,
  imagePrefix: string | null = getImagePrefix(),
): Readonly<Record<number, string>> {
  const result: Record<number, string> = {};
  for (const [key, uri] of Object.entries(activity.stepImages ?? {})) {
    const step = Number(key);
    if (Number.isInteger(step) && step >= 1 && step <= stepCount && isAllowedImageUrl(uri, imagePrefix)) result[step] = uri.trim();
  }
  return result;
}
