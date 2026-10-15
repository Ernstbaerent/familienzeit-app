// Orte-Import: Qualität der Ziele, die man besuchen muss (Museen, Bäder, Hallen …). Reine Funktion, Regeln in docs/orte.md
// („Qualität der Ziele mit Eintritt“). Die Wortlisten stehen in nameSignals.ts.
//
// Besuchspflichtige Unterarten (ohne Website und ohne Öffnungszeiten weiß man nicht, ob und wann man hinein kann):
//
//   Namens-Signal     | Website oder Öffnungszeiten | keins von beiden
//   keines            | unverändert                 | −1
//   nur aufwertend    | +1 (höchstens 3)            | unverändert (schützt nur)
//   nur abwertend     | −1                          | weggelassen
//   beides            | unverändert                 | weggelassen
//
// Dazu: Museum ohne Namen und ohne Website und Öffnungszeiten = weggelassen; Wörter „nicht besuchbar“ (geplant, im Bau …) = immer weggelassen.
// Zoos, Tierparks, Tiergehege sind ausgenommen: nur „nicht besuchbar“ und aufwertende Wörter wirken (Wildgehege haben selten eine Website).
// Alle anderen Unterarten (Spielplatz, Park, Badestelle, Natur, Aussicht, Burg …) bleiben unverändert.

import { kidWeightFor, type KidWeight, type PlaceSubtype } from '../../../src/features/places/placeKinds.ts';
import { nameSignals } from './nameSignals.ts';

export const visitRequiredSubtypes = [
  'museum',
  'aquarium',
  'themePark',
  'indoorPool',
  'outdoorPool',
  'pool',
  'waterPark',
  'climbingHall',
  'indoorPlayground',
  'trampolinePark',
  'iceRink',
] as const satisfies readonly PlaceSubtype[];

const visitRequired: ReadonlySet<PlaceSubtype> = new Set(visitRequiredSubtypes);

export type QualityInput = {
  subtype: PlaceSubtype;
  name: string | null;
  hasWebsite: boolean;
  hasOpeningHours: boolean; // irgendein Text in opening_hours, auch komplex oder unlesbar
};

export type DropReason = 'notVisitable' | 'negativeWithoutInfo' | 'namelessMuseumWithoutInfo';

export type QualityResult = {
  base: KidWeight; // was der Import ohne diese Regeln vergibt
  reasons: string[]; // für Bericht und Prüfskript
} & ({ keep: true; kidWeight: KidWeight; change: 'up' | 'down' | null } | { keep: false; drop: DropReason });

const clamp = (value: number): KidWeight => Math.max(0, Math.min(3, value)) as KidWeight;

export function assessPlace(input: QualityInput): QualityResult {
  const base = kidWeightFor(input.subtype, input.name !== null);
  const isZoo = input.subtype === 'zoo';
  if (!isZoo && !visitRequired.has(input.subtype)) return { base, reasons: [], keep: true, kidWeight: base, change: null };

  const signals = nameSignals(input.name, input.subtype);
  const positive = signals.positive.length > 0;
  // Abwertende Wörter und fehlende Infos zählen bei Zoos nicht.
  const negative = !isZoo && signals.negative.length > 0;
  const reasons: string[] = [];
  if (positive) reasons.push(`aufwertend: ${signals.positive.join(', ')}`);
  if (negative) reasons.push(`abwertend: ${signals.negative.join(', ')}`);
  if (signals.notVisitable.length > 0) {
    return { base, reasons: [...reasons, `nicht besuchbar: ${signals.notVisitable.join(', ')}`], keep: false, drop: 'notVisitable' };
  }

  let kidWeight: KidWeight;
  if (isZoo) {
    kidWeight = clamp(base + (positive ? 1 : 0));
  } else {
    const hasInfo = input.hasWebsite || input.hasOpeningHours;
    if (!hasInfo) reasons.push('keine Website und keine Öffnungszeiten');
    if (!hasInfo && negative) return { base, reasons, keep: false, drop: 'negativeWithoutInfo' };
    if (!hasInfo && input.subtype === 'museum' && input.name === null) {
      return { base, reasons: [...reasons, 'Museum ohne Namen'], keep: false, drop: 'namelessMuseumWithoutInfo' };
    }
    let delta = 0;
    if (hasInfo) delta = (positive ? 1 : 0) - (negative ? 1 : 0);
    else if (!positive) delta = -1;
    kidWeight = clamp(base + delta);
  }
  const change = kidWeight > base ? 'up' : kidWeight < base ? 'down' : null;
  return { base, reasons, keep: true, kidWeight, change };
}
