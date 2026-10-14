// Orte-Import (M10a): Doppelte zusammenfassen (wie im Machbarkeitstest M2a, aber mit einem Raster statt „jeder mit jedem“,
// damit es auch für ein großes Land schnell geht). Ein Ort ist oft doppelt eingetragen, z. B. ein Freibad als Punkt und als Fläche.
//   - gleicher Name (normalisiert) in derselben Kategorie, näher als 150 m
//   - ohne Namen: gleiche Unterart, näher als 40 m
// Behalten wird zuerst eine Fläche (sie ist meist der „eigentliche“ Eintrag, der Punkt ein Rest), sonst die kleinere ID.
// So ist das Ergebnis immer gleich, egal in welcher Reihenfolge osmium die Objekte liefert.
// Fehlende Angaben (Öffnungszeiten, Website, Straße) übernimmt er von den Doppelten.

import { haversineMeters } from './geometry.ts';
import { placeLimits } from './limits.ts';
import { normalizeName } from './clean.ts';

export type DedupeItem = {
  id: string;
  name: string | null;
  category: string;
  subtype: string;
  lat: number;
  lon: number;
  openingHours: string | null;
  website: string | null;
  street: string | null;
  isArea: boolean;
};

// Vergleichsschlüssel eines Namens. Besteht ein Name nur aus Zeichen ohne lateinische Entsprechung, bleibt er, wie er ist
// (sonst wären alle solchen Namen gleich).
const nameKey = (name: string) => normalizeName(name) || name.trim().toLowerCase();

// Zellen von etwa 220 m: Alles, was näher als 150 m ist, liegt in derselben oder einer Nachbarzelle.
const cellLat = 0.002;
const cellLon = 0.003;

export function dedupePlaces<T extends DedupeItem>(items: readonly T[]): { kept: T[]; merged: number } {
  const sorted = [...items].sort((a, b) => Number(b.isArea) - Number(a.isArea) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const grid = new Map<string, T[]>();
  const kept: T[] = [];
  let merged = 0;

  for (const item of sorted) {
    const row = Math.floor(item.lat / cellLat);
    const col = Math.floor(item.lon / cellLon);
    const key = item.name ? nameKey(item.name) : null;
    let twin: T | undefined;
    for (let dr = -1; dr <= 1 && !twin; dr += 1) {
      for (let dc = -1; dc <= 1 && !twin; dc += 1) {
        twin = grid.get(`${row + dr}:${col + dc}`)?.find((other) => {
          const distance = haversineMeters(item.lat, item.lon, other.lat, other.lon);
          if (key !== null) {
            return other.name !== null && other.category === item.category && nameKey(other.name) === key && distance <= placeLimits.sameNamedMeters;
          }
          return other.name === null && other.subtype === item.subtype && distance <= placeLimits.sameUnnamedMeters;
        });
      }
    }
    if (twin) {
      twin.openingHours ??= item.openingHours;
      twin.website ??= item.website;
      twin.street ??= item.street;
      merged += 1;
      continue;
    }
    const cell = `${row}:${col}`;
    const list = grid.get(cell);
    if (list) list.push(item);
    else grid.set(cell, [item]);
    kept.push(item);
  }
  return { kept, merged };
}
