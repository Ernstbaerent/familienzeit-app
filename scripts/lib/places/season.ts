// Orte-Import (M10a): Saison eines Ortes (Monate 1–12), damit die App z. B. kein Freibad im Winter vorschlägt.
// Reihenfolge: 1. Monate aus `opening_hours` (z. B. „May-Sep“), 2. das Merkmal `seasonal`, 3. der Standard der Unterart
// (Freibäder und Badestellen draußen: Mai bis September). Drinnen gibt es keine Standard-Saison.

import { placeKinds, type PlaceSetting, type PlaceSubtype } from '../../../src/features/places/placeKinds.ts';

const seasonMonths: Record<string, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  fall: [9, 10, 11],
  winter: [12, 1, 2],
};

// `seasonal=summer`, `seasonal=spring;summer` … → Monate. `yes` (ohne Angabe) und Unbekanntes → null.
export function monthsFromSeasonal(value: string | undefined): number[] | null {
  if (!value) return null;
  const months = new Set<number>();
  for (const part of value.split(';').map((p) => p.trim().toLowerCase())) {
    const list = seasonMonths[part];
    if (!list) return null;
    list.forEach((m) => months.add(m));
  }
  return months.size > 0 && months.size < 12 ? [...months].sort((a, b) => a - b) : null;
}

export function seasonOf(input: {
  subtype: PlaceSubtype;
  setting: PlaceSetting;
  hoursMonths: number[] | null;
  seasonal: string | undefined;
}): number[] | null {
  if (input.hoursMonths) return input.hoursMonths;
  const fromTag = monthsFromSeasonal(input.seasonal);
  if (fromTag) return fromTag;
  const kind = placeKinds[input.subtype] as { defaultSeason?: readonly number[] };
  if (input.setting === 'outdoor' && kind.defaultSeason) return [...kind.defaultSeason];
  return null;
}
