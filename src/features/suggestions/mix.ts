// Vorschläge mit Orten (M10b): Orte und Aktivitäten getrennt sortieren, dann zu Dreiergruppen mischen.
// Reine Funktionen ohne UI. Ohne Orte entsteht genau dasselbe wie bei suggest() (Test in mix.test.ts).
// Regeln: docs/suggestions.md, „Orte in den Vorschlägen“.

import type { Activity } from '../activities/activities';
import type { PlaceRow } from '../places/placeRow';
import { distanceKm, travelFor, type Travel } from '../places/travel';
import type { Place } from '../weather/location';
import { isPlaceExcluded, type PlaceCandidate } from './placeExclusions';
import { scorePlace } from './placeScoring';
import type { SuggestionRequest } from './request';
import { pickBest, rankActivities, suggest, suggestionsPerPage, type ScoredActivity } from './suggest';

// Umkreis-Stufen in km. Es gilt die kleinste Stufe mit genug guten Orten (`radiusRule`).
export const radiusSteps = [5, 15, 30] as const;
export type RadiusKm = (typeof radiusSteps)[number];

export const radiusRule = {
  minPlaces: 2, // mindestens 2 nicht ausgeschlossene Orte …
  minKidWeight: 2, // … mit Kindertauglichkeit 2 oder 3
} as const;

// Höchstens so viele Orte in einer Dreiergruppe (Entscheidung von Clemens):
// bis 1 Std. Zeit höchstens 1, ab 2 Std. bis zu 2, bei Nässe (Regen, Gewitter, Schnee) höchstens 1.
// Der zweite Ort nur mit Kindertauglichkeit 2 oder 3. Immer mindestens 1 Aktivität in der Gruppe.
export const placeSlots = {
  shortTimeUpToMinutes: 60,
  short: 1,
  long: 2,
  wet: 1,
  secondPlaceMinKidWeight: 2,
} as const;

export type ActivitySuggestion = { kind: 'activity'; activity: Activity };
export type PlaceSuggestion = {
  kind: 'place';
  place: PlaceRow;
  km: number; // Luftlinie vom gerundeten Standort
  travel: Travel;
};
export type Suggestion = ActivitySuggestion | PlaceSuggestion;

export type MixedSuggestions = {
  pages: Suggestion[][]; // Dreiergruppen; nur wenn insgesamt weniger als 3 passen, eine kürzere Gruppe (oder keine)
  matchCount: number; // passende Aktivitäten plus passende Orte im gewählten Umkreis
  radiusKm: RadiusKm | null; // gewählter Umkreis, `null` ohne passende Orte
};

export type PlacesInput = {
  origin: Place; // gerundeter Standort
  rows: readonly PlaceRow[];
};

type ScoredPlace = { suggestion: PlaceSuggestion; score: number };

// Passende Orte im kleinsten ausreichenden Umkreis, beste zuerst.
export function rankPlaces(input: PlacesInput, request: SuggestionRequest): { places: ScoredPlace[]; radiusKm: RadiusKm | null } {
  const maxRadius = radiusSteps[radiusSteps.length - 1];
  const candidates: PlaceCandidate[] = [];
  for (const row of input.rows) {
    const km = distanceKm(input.origin, row);
    if (km > maxRadius) continue;
    const candidate = { row, km, travel: travelFor(km) };
    if (!isPlaceExcluded(candidate, request)) candidates.push(candidate);
  }
  if (candidates.length === 0) return { places: [], radiusKm: null };

  const good = candidates.filter((candidate) => candidate.row.kid_weight >= radiusRule.minKidWeight);
  const radiusKm =
    radiusSteps.find((step) => good.filter((candidate) => candidate.km <= step).length >= radiusRule.minPlaces) ?? maxRadius;

  const places = candidates
    .filter((candidate) => candidate.km <= radiusKm)
    .map((candidate) => ({
      suggestion: { kind: 'place' as const, place: candidate.row, km: candidate.km, travel: candidate.travel },
      score: scorePlace(candidate, request),
    }))
    // Gleiche Punkte: der nähere Ort zuerst, dann nach ID (feste Reihenfolge).
    .sort((a, b) => b.score - a.score || a.suggestion.km - b.suggestion.km || a.suggestion.place.id.localeCompare(b.suggestion.place.id));
  return { places, radiusKm };
}

export function maxPlacesPerPage(request: SuggestionRequest): number {
  const wet = request.weather === 'rain' || request.weather === 'thunderstorm' || request.weather === 'snow';
  if (wet) return placeSlots.wet;
  return request.availableMinutes <= placeSlots.shortTimeUpToMinutes ? placeSlots.short : placeSlots.long;
}

// Nimmt die Orte für eine Gruppe aus der Liste: höchstens `max`, aus verschiedenen Kategorien, ab dem zweiten nur gut geeignete.
function takePlaces(queue: ScoredPlace[], max: number): PlaceSuggestion[] {
  const taken: PlaceSuggestion[] = [];
  while (taken.length < max) {
    const index = queue.findIndex(
      ({ suggestion }) =>
        (taken.length === 0 || suggestion.place.kid_weight >= placeSlots.secondPlaceMinKidWeight) &&
        !taken.some((other) => other.place.category === suggestion.place.category),
    );
    if (index < 0) break;
    taken.push(queue.splice(index, 1)[0].suggestion);
  }
  return taken;
}

// Reihenfolge in der Gruppe: abwechselnd, die größere Gruppe außen (Aktivität, Ort, Aktivität oder Ort, Aktivität, Ort).
function interleave(activities: Suggestion[], places: Suggestion[]): Suggestion[] {
  const [outer, inner] = places.length > activities.length ? [places, activities] : [activities, places];
  const result: Suggestion[] = [];
  for (let i = 0; i < outer.length; i += 1) {
    result.push(outer[i]);
    if (i < inner.length) result.push(inner[i]);
  }
  return result;
}

const toActivity = (activity: Activity): ActivitySuggestion => ({ kind: 'activity', activity });

export function suggestWithPlaces(
  activities: readonly Activity[],
  request: SuggestionRequest,
  placesInput?: PlacesInput,
): MixedSuggestions {
  const { places, radiusKm } = placesInput ? rankPlaces(placesInput, request) : { places: [], radiusKm: null };

  // Ohne passende Orte: genau die Gruppen von suggest(), unverändert.
  if (places.length === 0) {
    const plain = suggest(activities, request);
    return { pages: plain.pages.map((page) => page.map(toActivity)), matchCount: plain.matchCount, radiusKm: null };
  }

  const ranked = rankActivities(activities, request);
  const matchCount = ranked.length + places.length;
  const actQueue: ScoredActivity[] = [...ranked];
  const placeQueue: ScoredPlace[] = [...places];
  const maxPlaces = maxPlacesPerPage(request);
  const pages: Suggestion[][] = [];

  // Jede Gruppe hat mindestens eine Aktivität: Gruppen gibt es, solange Aktivitäten übrig sind.
  while (actQueue.length > 0) {
    const pagePlaces: Suggestion[] = takePlaces(placeQueue, Math.min(maxPlaces, suggestionsPerPage - 1));
    const pageActivities: Activity[] = [];
    while (pagePlaces.length + pageActivities.length < suggestionsPerPage && actQueue.length > 0) {
      const [picked] = actQueue.splice(pickBest(actQueue, pageActivities), 1);
      pageActivities.push(picked.activity);
    }
    // Garantie vor Mischregeln (Entscheidung von Clemens): Fehlen schon für die erste Gruppe Aktivitäten, füllen weitere Orte auf.
    // Spätere Gruppen füllt unten die Regel „letzte Gruppe auffüllen“, zuerst mit Aktivitäten aus den anderen Gruppen.
    while (pages.length === 0 && pagePlaces.length + pageActivities.length < suggestionsPerPage && placeQueue.length > 0) {
      pagePlaces.push(placeQueue.shift()!.suggestion);
    }
    pages.push(interleave(pageActivities.map(toActivity), pagePlaces));
  }

  // Keine einzige passende Aktivität, aber Orte: eine Gruppe nur mit Orten (Garantie „3, wenn so viele passen“).
  if (pages.length === 0) {
    const pagePlaces: Suggestion[] = takePlaces(placeQueue, suggestionsPerPage);
    while (pagePlaces.length < suggestionsPerPage && placeQueue.length > 0) pagePlaces.push(placeQueue.shift()!.suggestion);
    pages.push(pagePlaces);
  }

  // Ist die letzte Gruppe nicht voll, wird sie wie bei suggest() mit Vorschlägen aus den anderen Gruppen aufgefüllt.
  const last = pages[pages.length - 1];
  if (pages.length > 1 && last.length < suggestionsPerPage) {
    const used = new Set(last);
    const fillers = pages.slice(0, -1).flat().filter((item) => !used.has(item));
    const fillerActivities = fillers.filter((item) => item.kind === 'activity');
    const fillerPlaces = fillers.filter((item) => item.kind === 'place');
    for (const item of [...fillerActivities, ...fillerPlaces]) {
      if (last.length >= suggestionsPerPage) break;
      last.push(item);
    }
  }

  return { pages, matchCount, radiusKm };
}

// Der Umkreis-Hinweis („Umkreis auf 15 km erweitert“) erscheint nur, wenn auf der Seite ein Ort zu sehen ist und der Umkreis größer als 5 km ist.
export function widenedRadius(result: MixedSuggestions, page: readonly Suggestion[]): RadiusKm | null {
  if (result.radiusKm === null || result.radiusKm <= radiusSteps[0]) return null;
  return page.some((item) => item.kind === 'place') ? result.radiusKm : null;
}
