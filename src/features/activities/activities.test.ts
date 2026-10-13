// parseActivity / parseActivities: die Prüfung von `image` mit und ohne Allowlist (M8, DESIGN.md Zusatz 35).

import { makeActivity } from '../suggestions/testHelpers';
import { parseActivities, parseActivity } from './activities';

const prefix = 'https://abc.supabase.co/storage/v1/object/public/';
const own = `${prefix}bilder/wald.svg`;

function parse(image: unknown, options?: Parameters<typeof parseActivity>[1]) {
  return parseActivity({ ...makeActivity({ id: 'a' }), image }, options);
}

describe('image ohne Allowlist (wie bisher: nur https)', () => {
  it('https ist in Ordnung, ein fehlendes Bild auch', () => {
    expect(parse('https://example.org/a.jpg').ok).toBe(true);
    expect(parseActivity(makeActivity({ id: 'a' })).ok).toBe(true);
  });

  it.each(['', '   ', 'http://example.org/a.jpg', 'a.jpg', 42])('%p wird abgelehnt', (image) => {
    expect(parse(image).ok).toBe(false);
  });
});

describe('image mit Allowlist', () => {
  it('Adresse von unserem Speicher ist in Ordnung', () => {
    expect(parse(own, { imagePrefix: prefix }).ok).toBe(true);
  });

  it('fremde Adresse wird abgelehnt und das Problem nennt den erlaubten Anfang', () => {
    const result = parse('https://example.org/a.jpg', { imagePrefix: prefix });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(' ')).toContain(prefix);
  });

  it('ohne festgelegten Speicher (null) ist kein Bild erlaubt, und das Problem sagt warum', () => {
    const result = parse(own, { imagePrefix: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(' ')).toContain('EXPO_PUBLIC_SUPABASE_URL');
  });

  it('eine Aktivität ohne Bild ist immer in Ordnung, auch wenn kein Speicher festgelegt ist', () => {
    expect(parseActivity(makeActivity({ id: 'a' }), { imagePrefix: null }).ok).toBe(true);
    expect(parseActivity(makeActivity({ id: 'a' }), { imagePrefix: prefix }).ok).toBe(true);
  });

  it('parseActivities gibt die Allowlist weiter und verwirft nur die betroffene Aktivität', () => {
    const { activities, rejected } = parseActivities(
      [{ ...makeActivity({ id: 'a' }), image: own }, { ...makeActivity({ id: 'b' }), image: 'https://example.org/b.jpg' }, makeActivity({ id: 'c' })],
      { imagePrefix: prefix },
    );
    expect(activities.map((activity) => activity.id)).toEqual(['a', 'c']);
    expect(rejected.map((item) => item.id)).toEqual(['b']);
  });
});
