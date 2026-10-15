// Orte-Import: Signale aus dem Namen eines Ortes. Die einzige Stelle mit den Wortlisten (Regeln dazu: quality.ts, docs/orte.md).
//
// Neues Wort = eine Zeile in der passenden Liste. Drei Arten, wo das Wort stehen darf:
//   word('Uni')         nur als ganzes Wort („Uni-Museum“, aber nicht „Uniform“). Mehrere Wörter („in Planung“) = genau diese Folge.
//   start('Natur')      am Anfang eines Wortes („Naturkundemuseum“, aber nicht „Signatur“)
//   inside('Sammlung')  irgendwo in einem Wort („Lehrsammlung“, „Sammlungen“)
// Groß- und Kleinschreibung zählt nicht, Bindestriche und Satzzeichen trennen Wörter, ä/ö/ü/ß zählen wie ae/oe/ue/ss.
// Jedes neue Wort braucht einen Test in nameSignals.test.ts, vor allem einen, der zeigt, was es NICHT treffen soll.

import type { PlaceSubtype } from '../../../src/features/places/placeKinds.ts';

type Match = 'word' | 'start' | 'inside';

export type NameRule = {
  label: string; // so steht es im Bericht und im Prüfskript
  match: Match;
  tokens: string[]; // normalisiert
  notFor?: readonly PlaceSubtype[]; // zählt bei diesen Unterarten nicht
  cancelledBy?: readonly NameRule[]; // zählt nicht, wenn eines dieser Wörter auch im Namen steht
};

// „Universität“ → „universitaet“, „Straße“ → „strasse“, „Café“ → „cafe“.
export function normalizeWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
}

export function tokenize(text: string): string[] {
  return normalizeWord(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const rule = (match: Match) => (label: string, options: Pick<NameRule, 'notFor' | 'cancelledBy'> = {}): NameRule => ({
  label,
  match,
  tokens: tokenize(label),
  ...options,
});
const word = rule('word');
const start = rule('start');
const inside = rule('inside');

const bathSubtypes = ['indoorPool', 'outdoorPool', 'pool', 'waterPark'] as const satisfies readonly PlaceSubtype[];

// Wellness: „Erlebnis“ heißt hier Sauna und Therme, nicht Kinder (Gegensignal zu „Erlebnis“).
export const wellnessWords: readonly NameRule[] = [inside('Therme'), start('Thermal'), inside('Sauna'), word('Spa'), inside('Wellness')];

// Abwertend: Lehre, Forschung, Archive. Wirkt nur bei besuchspflichtigen Unterarten, nie bei Zoos (quality.ts).
export const negativeWords: readonly NameRule[] = [
  inside('Universität'), // auch „Universitätsmuseum“, „Musikuniversität“, englisch „University“
  inside('University'),
  word('Uni'),
  inside('Hochschule'),
  inside('Institut'), // auch „Institute“
  inside('Fakultät'),
  word('Faculty'),
  word('Department'),
  inside('Lehrstuhl'),
  inside('Akademie'),
  start('Academy'),
  inside('Sammlung'), // auch „Lehrsammlung“, „Sammlungen“
  start('Collection'),
  inside('Archiv'), // auch „Stadtarchiv“, „Archive“
  start('Anatom'), // „Anatomie“, „Anatomische …“, „Anatomy“
  inside('Kabinett'), // „Münzkabinett“, „Ausstellungskabinett“
  inside('Lapidarium'),
  inside('Herbarium'),
];

// Aufwertend: Kinder, Mitmachen, Natur, Technik, Tiere.
export const positiveWords: readonly NameRule[] = [
  inside('Kinder'),
  word('Kind'),
  start('Familie'), // auch „Familienpark“
  inside('Mitmach'),
  inside('Experiment'), // „Experimente“, „Experimentierfeld“
  inside('Entdeck'), // „Entdecker“, „Naturentdeckerhaus“
  inside('Forscher'), // nicht „Forschung“
  start('Natur'), // „Naturkunde“, „Naturalienkammer“; nicht „Signatur“
  inside('Technik'),
  inside('Spielzeug'),
  inside('Eisenbahn'), // auch „Modelleisenbahn“
  inside('Feuerwehr'),
  inside('Planetarium'),
  inside('Sternwarte'),
  start('Tier'), // „Tierpark“, „Tierwelt“; nicht „Quartier“
  start('Haustier'),
  start('Dino'),
  inside('Saurier'),
  start('Ritter'), // nicht „Dritter“
  inside('Märchen'),
  inside('Abenteuer'),
  inside('Erlebnis', { notFor: bathSubtypes, cancelledBy: wellnessWords }), // nicht „Erlebnisbad“, „Sauna-Erlebniswelt“
  start('Puppe'), // „Puppenmuseum“; nicht „Gruppe“
  start('Mathematik'), // auch „Mathematikum“
  start('Schoko'), // „Schokoladenmuseum“
  // Englisch
  word('Kids'),
  start('Children'),
  start('Family'),
  word('Hands on'),
  start('Discover'),
  start('Science'),
  start('Explor'), // „Explorado“, „Exploratorium“
  word('Nature'),
  start('Technolog'),
  word('Toy'),
  word('Toys'),
  start('Railway'),
  start('Railroad'),
  word('Train'),
  word('Trains'), // nicht „Training“
  start('Firefight'),
  start('Animal'),
  start('Adventure'),
  start('Knight'),
  start('Puppet'),
  start('Observator'),
  word('Mathematics'),
  start('Chocolate'),
];

// Nicht besuchbar: gibt es noch nicht oder gerade nicht. Immer weglassen (Machbarkeit), auch mit Website.
export const notVisitableWords: readonly NameRule[] = [
  word('geplant'),
  word('in Planung'),
  word('im Bau'), // nicht „Museum im Bauernhaus“
  word('geschlossen'), // auch „vorübergehend geschlossen“, „dauerhaft geschlossen“
  word('wegen Sanierung'),
  word('planned'),
  word('under construction'),
  word('closed'),
];

function matchesAt(tokens: readonly string[], index: number, rule: NameRule): boolean {
  if (rule.match === 'word') {
    return rule.tokens.every((part, offset) => tokens[index + offset] === part);
  }
  const token = tokens[index];
  const stem = rule.tokens.join('');
  return rule.match === 'start' ? token.startsWith(stem) : token.includes(stem);
}

function hits(tokens: readonly string[], rule: NameRule): boolean {
  return tokens.some((_, index) => matchesAt(tokens, index, rule));
}

// Welche Wörter einer Liste stehen im Namen? (Nur die, die bei dieser Unterart zählen.)
export function findWords(name: string | null, rules: readonly NameRule[], subtype?: PlaceSubtype): string[] {
  if (!name) return [];
  const tokens = tokenize(name);
  return rules
    .filter((r) => !(subtype && r.notFor?.includes(subtype)))
    .filter((r) => hits(tokens, r))
    .filter((r) => !r.cancelledBy?.some((other) => hits(tokens, other)))
    .map((r) => r.label);
}

export type NameSignals = { positive: string[]; negative: string[]; notVisitable: string[] };

export function nameSignals(name: string | null, subtype?: PlaceSubtype): NameSignals {
  return {
    positive: findWords(name, positiveWords, subtype),
    negative: findWords(name, negativeWords, subtype),
    notVisitable: findWords(name, notVisitableWords, subtype),
  };
}
