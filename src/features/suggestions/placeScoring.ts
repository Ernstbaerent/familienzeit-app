// Gewichtung der Orte (M10b): bestimmt nur die Reihenfolge der Orte untereinander, schließt nie etwas aus.
// Orte und Aktivitäten werden getrennt sortiert und erst danach gemischt (mix.ts), die Punkte sind also nicht mit denen der
// Aktivitäten vergleichbar. Startwerte aus dem Plan zu M10, von Clemens bestätigt. Tabelle: docs/suggestions.md.

import { isOpenAt } from '../places/openingHours';
import { placeKinds, type KidWeight } from '../places/placeKinds';
import { hasReliablePlan, type PlaceCandidate } from './placeExclusions';
import type { SuggestionRequest } from './request';
import { hasExtremeTemperature, heatFromCelsius, weights } from './scoring';

// Alle Gewichte für Orte an einer Stelle, damit man sie leicht nachjustieren kann.
export const placeWeights = {
  kidWeight: { 3: 4, 2: 2, 1: 0, 0: -3 } satisfies Record<KidWeight, number>, // Kindertauglichkeit aus dem Import
  perKm: -0.25, // je km Luftlinie
  perKmLongTripsFactor: 2, // doppelt, wenn ein ausgewähltes Kind „lange Fahrten“ nicht mag
  sunnyOutdoor: 2, // Sonne und draußen
  wetIndoor: 3, // Regen oder Schnee (auch Gewitter) und drinnen
  rainOutdoor: -4, // Regen und draußen
  heatOutdoor: -4, // Hitze (ab 30 °C) und draußen
  heatBathing: 3, // Hitze und Bad oder Badestelle (statt des Abzugs für draußen)
  frostOutdoor: -4, // Frost (0 °C und kälter) und draußen
  openNow: 1, // fester Wochenplan und bei Ankunft offen
  interest: weights.interest, // +3 je Thema der Unterart, das ein Kind mag (wie bei Aktivitäten)
  dislike: weights.dislike, // −4 je Thema, das ein Kind nicht mag
  costPerLevel: weights.costPerLevel, // wie bei Aktivitäten
  parentEnergy: weights.parentEnergy, // wie bei Aktivitäten
  dailyJitter: 1, // stabile Streuung je Tag und Ort: 0 bis unter 1 Punkt (bis Orte in den Verlauf kommen, M10e)
} as const;

// Kleine stabile Zahl zwischen 0 und 1 aus Datum und Ort (FNV-1a). Gleicher Tag, gleicher Ort = gleiche Zahl.
// So steht nicht jeden Tag derselbe Spielplatz ganz oben, aber die Reihenfolge springt nicht beim Neuladen.
export function dailyJitter(id: string, now: Date): number {
  const text = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}|${id}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Abschluss-Mischung (wie bei MurmurHash3), damit ähnliche IDs (n1, n2 …) gleichmäßig verteilte Werte bekommen.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0x100000000;
}

export function scorePlace(candidate: PlaceCandidate, request: SuggestionRequest): number {
  const { row, km, travel } = candidate;
  const kind = placeKinds[row.subtype];
  const outdoor = row.setting === 'outdoor';
  let score = placeWeights.kidWeight[row.kid_weight];

  const longTrips = request.children.some((child) => child.dislikes.includes('longTrips'));
  score += km * placeWeights.perKm * (longTrips ? placeWeights.perKmLongTripsFactor : 1);

  if (request.weather === 'sunny' && outdoor) score += placeWeights.sunnyOutdoor;
  const wet = request.weather === 'rain' || request.weather === 'snow' || request.weather === 'thunderstorm';
  if (wet && row.setting === 'indoor') score += placeWeights.wetIndoor;
  if (request.weather === 'rain' && outdoor) score += placeWeights.rainOutdoor;

  if (hasExtremeTemperature(request.temperature) && request.temperature) {
    const hot = request.temperature.max >= heatFromCelsius;
    if (hot && row.category === 'pool') score += placeWeights.heatBathing;
    else if (hot && outdoor) score += placeWeights.heatOutdoor;
    else if (!hot && outdoor) score += placeWeights.frostOutdoor;
  }

  if (hasReliablePlan(row) && row.hours_plan) {
    const arrival = new Date(request.now.getTime() + travel.oneWayMinutes * 60_000);
    if (isOpenAt(row.hours_plan, arrival)) score += placeWeights.openNow;
  }

  for (const topic of kind.topics) {
    if (request.children.some((child) => (child.interests as readonly string[]).includes(topic))) score += placeWeights.interest;
    if (request.children.some((child) => (child.dislikes as readonly string[]).includes(topic))) score += placeWeights.dislike;
  }

  score += kind.cost * placeWeights.costPerLevel;
  if (request.parentEnergy) score += placeWeights.parentEnergy[request.parentEnergy][kind.energy];

  return score + dailyJitter(row.id, request.now) * placeWeights.dailyJitter;
}
