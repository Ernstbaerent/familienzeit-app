// Aus Rohdaten (Supabase, Zwischenspeicher oder data/) werden benutzbare Aktivitäten. Reine Funktionen, ohne UI.
//
// Drei Schutzstufen, bevor eine Aktivität in der App landet:
//  1. Ein `image` von fremdem Speicher fällt weg (die Aktivität bleibt, Allowlist, DESIGN.md Zusatz 35).
//  2. Kaputte Einträge werden verworfen und mit Grund gemeldet (`parseActivities`), doppelte IDs ebenso.
//  3. Nur `approved` kommt durch, auch wenn der Server aus Versehen mehr liefert (zweite Sicherung neben Row Level Security).

import { parseActivities, type Activity } from './activities';
import { isAllowedImageUrl } from './imageAllowlist';

// Unter dieser Zahl gültiger Aktivitäten gilt eine Quelle als unbrauchbar und die App nimmt die nächste (Supabase → Zwischenspeicher → Mitgeliefertes).
// So reicht eine Quelle immer für die drei Vorschläge, und eine halb eingespielte oder leere Datenbank verdrängt den guten Bestand nicht.
export const minUsableActivities = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Entfernt ein `image`, das nicht von unserem eigenen Speicher kommt (`null` heißt „kein Bild“ und fällt still weg). Alles andere bleibt unverändert.
function dropForeignImage(item: unknown, imagePrefix: string | null, label: string): unknown {
  if (!isRecord(item) || item.image === undefined) return item;
  if (item.image !== null && isAllowedImageUrl(item.image, imagePrefix)) return item;
  if (item.image !== null) {
    console.warn(`Aktivität ${String(item.id)} (${label}): Bild nicht von unserem Speicher, es wird nicht angezeigt.`);
  }
  const { image: _removed, ...rest } = item;
  return rest;
}

// Rohdaten → gültige, freigegebene Aktivitäten. `label` sagt in den Warnungen, woher die Daten kommen.
export function prepareActivities(raw: unknown, imagePrefix: string | null, label: string): Activity[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw.map((item) => dropForeignImage(item, imagePrefix, label));
  const { activities, rejected } = parseActivities(cleaned, { imagePrefix });
  for (const item of rejected) {
    console.warn(`Aktivität ${item.id ?? `Nr. ${item.index + 1}`} übersprungen (${label}): ${item.problems.join('; ')}`);
  }
  return activities.filter((activity) => activity.status === 'approved');
}
