// Prüfung der KI-Vorschläge (M9): dieselbe Form- und Checklisten-Prüfung wie data/, dazu Dubletten und Auffälligkeiten.

import { areTitlesSimilar, normalizeTitle, reviewCandidates, slugify, type ReviewContext } from './review';
import { candidate, dataTitles, testCatalog } from './testHelpers';

const catalog = testCatalog();
const context: ReviewContext = {
  existing: dataTitles,
  allergenNames: catalog.allergenNames,
  openIdeaIds: new Set([3]),
  createdAt: '2026-10-18T16:00:00.000Z',
};

function reasonsFor(raw: Record<string, unknown>): string[] {
  const { accepted, rejected } = reviewCandidates([raw], context, []);
  if (accepted.length > 0) return [];
  return rejected[0].reasons;
}

const withText = (n: number, de: Record<string, unknown>, en: Record<string, unknown>, rest: Record<string, unknown> = {}) => {
  const base = candidate(n);
  return candidate(n, { ...rest, de: { ...(base.de as object), ...de }, en: { ...(base.en as object), ...en } });
};

describe('gültige Vorschläge', () => {
  it('werden angenommen: Status draft, source ai, ID aus dem englischen Titel, freiwillige leere Listen weggelassen', () => {
    const { accepted, rejected } = reviewCandidates([candidate(0, { ideaId: 3 })], context, []);
    expect(rejected).toEqual([]);
    const { activity, ideaId, flags } = accepted[0];
    expect(activity).toMatchObject({ id: 'alvarin-drawing', status: 'draft', source: 'ai', createdAt: context.createdAt });
    expect(activity).not.toHaveProperty('dayParts');
    expect(activity).not.toHaveProperty('months');
    expect(activity).not.toHaveProperty('image');
    expect(activity.translations.de).not.toHaveProperty('safetyNote'); // "" heißt: kein Hinweis
    expect(ideaId).toBe(3);
    expect(flags).toEqual([]);
  });

  it('eine unbekannte oder schon benutzte Idee wird nicht übernommen', () => {
    expect(reviewCandidates([candidate(0, { ideaId: 42 })], context, []).accepted[0].ideaId).toBeNull();
  });

  it('saisonale Monate und Tageszeiten bleiben erhalten', () => {
    const { accepted } = reviewCandidates([candidate(0, { months: [10, 11], dayParts: ['afternoon'] })], context, []);
    expect(accepted[0].activity.months).toEqual([10, 11]);
    expect(accepted[0].activity.dayParts).toEqual(['afternoon']);
  });

  it('ein Bild der KI gibt es nicht (Bilder kommen mit M9b)', () => {
    const { accepted } = reviewCandidates([candidate(0, { image: 'https://example.com/a.png' })], context, []);
    expect(accepted[0].activity).not.toHaveProperty('image');
  });
});

describe('Form (dieselbe Prüfung wie data/)', () => {
  it.each([
    ['unbekanntes Material', { materials: ['paper', 'glitterGlue'] }, 'materials: unbekannter Schlüssel glitterGlue'],
    ['unbekanntes Thema', { topics: ['football'] }, 'topics: unbekannter Schlüssel football'],
    ['Alter über 16', { ageMax: 18 }, 'ageMax: ganze Zahl von 0 bis 16 erwartet'],
    ['Alter verdreht', { ageMin: 9, ageMax: 5 }, 'ageMin darf nicht größer sein als ageMax'],
    ['alle 12 Monate', { months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }, 'months: alle 12 Monate, dann besser weglassen'],
    ['kein Thema', { topics: [] }, 'topics: mindestens ein Thema erwartet'],
  ])('%s', (_, overrides, expected) => {
    expect(reasonsFor(candidate(0, overrides)).join(' | ')).toContain(expected);
  });

  it('englischer Text fehlt', () => {
    expect(reasonsFor(candidate(0, { en: null })).join(' | ')).toContain('translations.en');
  });

  it('zu wenige oder zu viele Schritte, oder verschieden viele in de und en', () => {
    expect(reasonsFor(withText(0, { steps: ['Nur einer.'] }, { steps: ['Only one.'] })).join(' ')).toContain('2 bis 12 erwartet');
    expect(reasonsFor(withText(0, {}, { steps: ['a', 'b'] })).join(' ')).toContain('verschieden viele Schritte');
  });

  it('zu langer Titel', () => {
    expect(reasonsFor(withText(0, { title: 'Ein sehr sehr langer Titel, der einfach nicht mehr aufhören will' }, {})).join(' ')).toContain(
      'länger als 60 Zeichen',
    );
  });
});

describe('Sicherheits-Checkliste (dieselbe wie data/)', () => {
  it('Punkt 1: Kleinteile unter 3 Jahren', () => {
    expect(reasonsFor(candidate(0, { ageMin: 1, materials: ['buttons'] })).join(' ')).toContain('Punkt 1');
  });

  it('Punkt 2: Schere ohne Erwachsene im Hinweis, mit Hinweis bestanden', () => {
    expect(reasonsFor(candidate(0, { materials: ['paper', 'scissors'] })).join(' ')).toContain('Punkt 2');
    const ok = withText(
      0,
      { safetyNote: 'Die Schere benutzen Kinder nur mit Erwachsenen.' },
      { safetyNote: 'Children only use scissors with adults.' },
      { materials: ['paper', 'scissors'] },
    );
    expect(reasonsFor(ok)).toEqual([]);
  });

  it('Punkt 3: Wasser unter 6 Jahren ohne „die ganze Zeit“', () => {
    const raw = withText(
      0,
      { safetyNote: 'Nur mit Erwachsenen am Wasser.' },
      { safetyNote: 'Only with adults near water.' },
      { ageMin: 2, materials: ['water', 'bucket'] },
    );
    expect(reasonsFor(raw).join(' ')).toContain('Punkt 3');
  });

  it('Punkt 4: Allergene nicht genannt', () => {
    const raw = withText(
      0,
      { safetyNote: 'Den Ofen bedienen nur Erwachsene.' },
      { safetyNote: 'Only adults use the oven.' },
      { category: 'cooking', topics: ['cooking'], materials: ['flour', 'butter', 'oven'] },
    );
    const reasons = reasonsFor(raw).join(' ');
    expect(reasons).toContain('Punkt 4');
    expect(reasons).toContain('Gluten');
    expect(reasons).toContain('Milch');
  });

  it('Punkt 5: Messer unter 3 Jahren und Altersspanne über 12', () => {
    const knife = withText(0, { safetyNote: 'Das Messer nur mit Erwachsenen.' }, { safetyNote: 'Knife only with adults.' }, { ageMin: 2, materials: ['knife', 'apple'] });
    expect(reasonsFor(knife).join(' ')).toContain('Punkt 5');
    expect(reasonsFor(candidate(0, { ageMin: 0, ageMax: 16 })).join(' ')).toContain('Punkt 5');
  });

  it('Punkt 6: Gerät aufschrauben ohne „Batterie“ und „Netzstecker“', () => {
    const raw = withText(
      0,
      { safetyNote: 'Nur mit Erwachsenen.' },
      { safetyNote: 'Only with adults.' },
      { category: 'experiment', topics: ['technology'], ageMin: 8, materials: ['oldDevice', 'screwdriver'] },
    );
    expect(reasonsFor(raw).join(' ')).toContain('Punkt 6');
  });

  it('Punkt 7: Kerze mit Papier ist nie erlaubt, LED ohne „keine Kerze“ auch nicht', () => {
    const fire = withText(0, { safetyNote: 'Kerzen nur mit Erwachsenen.' }, { safetyNote: 'Candles only with adults.' }, { materials: ['paper', 'candle'] });
    expect(reasonsFor(fire).join(' ')).toContain('Punkt 7: Feuer zusammen mit brennbarem Material');
    expect(reasonsFor(candidate(0, { materials: ['paperBag', 'ledLight'] })).join(' ')).toContain('Punkt 7');
  });
});

describe('Dubletten', () => {
  it('gleicher Titel trotz Bindestrich, Groß- und Kleinschreibung oder Leerzeichen', () => {
    expect(normalizeTitle('Sockenpuppen-Theater')).toBe(normalizeTitle('sockenpuppen theater'));
    expect(normalizeTitle('Größe messen')).toBe('grossemessen');
    expect(reasonsFor(withText(0, { title: 'Sockenpuppentheater' }, {})).join(' ')).toContain('Dublette: Titel (de) gibt es schon („Sockenpuppen-Theater“)');
    expect(reasonsFor(withText(0, {}, { title: 'baking soda volcano' })).join(' ')).toContain('Dublette: Titel (en)');
  });

  it('gleiche ID (aus dem englischen Titel)', () => {
    expect(reasonsFor(withText(0, {}, { title: 'Sock-Puppet Theater!' })).join(' ')).toContain('die ID „sock-puppet-theater“ gibt es schon');
  });

  it('sehr ähnliche Titel sind keine Dublette, aber eine Auffälligkeit (bleibt Entwurf)', () => {
    expect(areTitlesSimilar('Natron-Vulkan', 'Vulkan aus Natron')).toBe(true);
    expect(areTitlesSimilar('Natron-Vulkan', 'Mini-Natron-Vulkan')).toBe(true);
    expect(areTitlesSimilar('Kastanientiere basteln', 'Blätterkrone basteln')).toBe(false);
    const { accepted } = reviewCandidates([withText(0, { title: 'Vulkan aus Natron' }, { title: 'Volcano Made of Baking Soda' })], context, []);
    expect(accepted[0].flags.join(' ')).toContain('Titel sehr ähnlich wie „Natron-Vulkan“');
  });
});

describe('ID aus dem Titel', () => {
  it('klein, mit Bindestrichen, ohne Sonderzeichen, höchstens 60 Zeichen an einer Wortgrenze', () => {
    expect(slugify('Chestnut Hedgehogs!')).toBe('chestnut-hedgehogs');
    expect(slugify('Crème brûlée & Co.')).toBe('creme-brulee-co');
    const long = slugify('A Very Long Title With Many Words That Goes On And On Beyond Sixty Characters');
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith('-')).toBe(false);
  });
});
