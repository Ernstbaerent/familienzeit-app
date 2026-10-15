// Orte-Import, Teil „Hochladen“: die Ausschlussliste (place_overrides) auf die Zeilen eines Landes anwenden. Reine Funktion.
//   hide  = Ort wird nicht importiert (auch wenn die Regeln ihn behalten hätten)
//   boost = Kindertauglichkeit fest 3; holt auch einen von den Regeln weggelassenen Ort (`held`) zurück
// Läuft im Teil mit dem Schlüssel und ohne npm, deshalb nur eigene Dateien.

import type { PlaceRow } from '../../../src/features/places/placeRow.ts';
import type { PlaceOverrideAction } from './placesAdmin.ts';

export type OverrideCounts = { hidden: number; boosted: number; restored: number };

export function applyOverrides(
  rows: readonly PlaceRow[],
  held: readonly PlaceRow[],
  overrides: ReadonlyMap<string, PlaceOverrideAction>,
): { rows: PlaceRow[]; counts: OverrideCounts; seen: string[] } {
  const counts: OverrideCounts = { hidden: 0, boosted: 0, restored: 0 };
  const seen: string[] = [];
  const result: PlaceRow[] = [];
  for (const row of rows) {
    const action = overrides.get(row.id);
    if (action) seen.push(row.id);
    if (action === 'hide') counts.hidden += 1;
    else if (action === 'boost') {
      counts.boosted += 1;
      result.push({ ...row, kid_weight: 3 });
    } else result.push(row);
  }
  for (const row of held) {
    const action = overrides.get(row.id);
    if (!action) continue;
    seen.push(row.id);
    if (action === 'boost') {
      counts.restored += 1;
      result.push({ ...row, kid_weight: 3 });
    }
  }
  return { rows: result, counts, seen };
}
