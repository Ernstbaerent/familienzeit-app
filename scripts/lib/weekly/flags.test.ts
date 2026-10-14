// Auffälligkeiten (M9): Marken- und Personennamen im Titel, Verweise auf Websites und soziale Netzwerke, unplausible Mengen und Zeiten.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseActivities, type Activity } from '../../../src/features/activities/activities';
import { detectFlags } from './flags';

function activity(text: { title?: string; summary?: string; step?: string; en?: string } = {}, rest: Partial<Activity> = {}): Activity {
  return {
    id: 'x',
    category: 'craft',
    topics: ['craft'],
    translations: {
      de: { title: text.title ?? 'Blätterkrone basteln', summary: text.summary ?? 'Eine Krone aus Herbstblättern.', steps: ['Sammelt Blätter.', text.step ?? 'Klebt sie auf einen Papierstreifen.'] },
      en: { title: text.en ?? 'Leaf Crown', summary: 'A crown made of autumn leaves.', steps: ['Collect leaves.', 'Glue them onto a paper strip.'] },
    },
    ageMin: 3,
    ageMax: 9,
    durationMin: 20,
    durationMax: 40,
    setting: 'both',
    weather: { needsDry: false, betterInSun: false },
    energy: 'low',
    cost: 0,
    materials: ['paper', 'glue'],
    siblingFriendly: true,
    status: 'draft',
    source: 'ai',
    createdAt: '2026-10-18T16:00:00.000Z',
    ...rest,
  };
}

it('eine unauffällige Aktivität hat keine Auffälligkeit', () => {
  expect(detectFlags(activity())).toEqual([]);
});

describe('Marken- und Personennamen im Titel', () => {
  it.each([
    ['Lego-Stadt bauen', 'Markenname im Titel: „Lego“'],
    ['Haribo-Zählspiel', 'Markenname im Titel: „Haribo“'],
    ['Paw Patrol Rettungsspiel', 'Markenname im Titel: „Paw Patrol“'],
    ['Malen wie Picasso', 'Personenname im Titel: „Picasso“'],
    ['Emmas Kräutergarten', 'Personenname im Titel: „Emma“'],
    ['Stöckchen-Rennen am Bach', null],
    ['Knete®-Figuren', 'Markenzeichen im Titel'],
  ])('%s', (title, expected) => {
    const flags = detectFlags(activity({ title, en: title })).join(' | ');
    if (expected) expect(flags).toContain(expected);
    else expect(flags).toBe('');
  });

  it('ein Vorname als eigenes Wort wird erkannt', () => {
    expect(detectFlags(activity({ title: 'Ein Bild für Anna' })).join(' ')).toContain('Personenname im Titel: „Anna“');
  });

  it('Wörter, die nur einen Namen enthalten, schlagen nicht an (z. B. Annahme, Maxi, Benzin)', () => {
    expect(detectFlags(activity({ title: 'Maxi-Bananen und Benzin-Autos' }))).toEqual([]);
  });
});

describe('Verweise auf Websites, Apps und soziale Netzwerke', () => {
  it.each([
    ['Schaut euch die Anleitung auf www.basteln.de an.'],
    ['Sucht ein Video auf YouTube.'],
    ['Teilt das Bild auf Instagram mit #herbstkrone.'],
    ['Ladet eine App für die Musik herunter.'],
    ['Vorlage unter https://example.com ausdrucken.'],
  ])('%s', (step) => {
    expect(detectFlags(activity({ step })).join(' ')).toContain('Verweis auf Website, App oder soziales Netzwerk');
  });
});

describe('Unplausible Mengen- und Zeitangaben', () => {
  it('eine Zeitangabe im Text, die länger ist als die Dauer', () => {
    expect(detectFlags(activity({ step: 'Lasst es 90 Minuten trocknen.' })).join(' ')).toContain('Zeitangabe im Text (90 Min.)');
    expect(detectFlags(activity({ step: 'Lasst es 2 Stunden trocknen.' })).join(' ')).toContain('(120 Min.)');
    expect(detectFlags(activity({ step: 'Lasst es 10 Minuten trocknen.' }))).toEqual([]);
  });

  it('über Nacht oder mehrere Tage', () => {
    expect(detectFlags(activity({ step: 'Lasst es über Nacht trocknen.' })).join(' ')).toContain('mehreren Tagen oder über Nacht');
    expect(detectFlags(activity({ step: 'Nach 3 Tagen ist es fest.' })).join(' ')).toContain('mehreren Tagen');
  });

  it('Temperatur, Gewicht, Menge, amerikanische Einheiten und sehr große Zahlen', () => {
    expect(detectFlags(activity({ step: 'Backt es bei 300 °C.' })).join(' ')).toContain('Temperatur über 250 °C');
    expect(detectFlags(activity({ step: 'Backt es bei 180 Grad.' }))).toEqual([]);
    expect(detectFlags(activity({ step: 'Nehmt 5 kg Mehl.' })).join(' ')).toContain('5 kg');
    expect(detectFlags(activity({ step: 'Nehmt 200 g Mehl.' }))).toEqual([]);
    expect(detectFlags(activity({ step: 'Füllt 50 Liter Wasser ein.' })).join(' ')).toContain('50 Liter');
    expect(detectFlags(activity({ step: 'Heat to 350 °F.' })).join(' ')).toContain('Amerikanische Maßeinheit');
    expect(detectFlags(activity({ step: 'Ofen auf 180 °C (350 °F) vorheizen.' }))).toEqual([]);
    expect(detectFlags(activity({ step: 'Ein Brett, 12 inches lang.' })).join(' ')).toContain('Amerikanische Maßeinheit');
    expect(detectFlags(activity({ step: 'Zählt bis 10000.' })).join(' ')).toContain('Ungewöhnlich große Zahl');
  });

  it('Dauer: unter 5 Minuten, über 5 Stunden oder eine riesige Spanne', () => {
    expect(detectFlags(activity({}, { durationMin: 2, durationMax: 10 })).join(' ')).toContain('Dauer unter 5 Minuten');
    expect(detectFlags(activity({}, { durationMin: 60, durationMax: 360 })).join(' ')).toContain('Dauer über 5 Stunden');
    expect(detectFlags(activity({}, { durationMin: 10, durationMax: 180 })).join(' ')).toContain('Dauer-Spanne ungewöhnlich groß');
  });
});

it('bei den 104 vorhandenen Aktivitäten schlägt das Sieb selten an (höchstens 5 %)', () => {
  const dir = join(__dirname, '..', '..', '..', 'data');
  const all = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => parseActivities(JSON.parse(readFileSync(join(dir, name), 'utf8'))).activities);
  const flagged = all.filter((a) => detectFlags(a).length > 0);
  expect(all.length).toBeGreaterThanOrEqual(104);
  expect(flagged.length / all.length).toBeLessThanOrEqual(0.05);
});
