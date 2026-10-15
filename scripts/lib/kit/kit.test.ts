// Baukasten (M9b): Bausteine, Layouts, Szenen, Sicherheitsregeln und Vorschau (docs/bausteine/README.md).
// Was sich nicht mechanisch prüfen lässt (sieht es gut aus? ist es eindeutig?), prüft ein Mensch auf der Vorschau (docs/bausteine/VORSCHAU.md).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { illustrationPalette } from '../../../src/lib/palette';
import { loadActivityData } from '../activityData';
import { checkBlock, checkCatalog, loadCatalog, loadExampleScenes, maxBlockBytes } from './catalog';
import { estimateBox, pathPoints } from './geometry';
import { cornerZone, layouts } from './layouts';
import { buildPreviewFiles } from './preview';
import { checkScene, contextFromActivity, maxSceneBytes, placeItems, renderSceneSvg, renderSceneTemplate, type ActivityContext } from './scene';
import type { Block, Catalog, LoadedBlock, Scene } from './types';

const root = join(__dirname, '../../..');
const catalog = loadCatalog(root);
const scenes = loadExampleScenes(root);

function block(overrides: Partial<LoadedBlock> & { svg: string }): LoadedBlock {
  const base: Block = {
    id: 'test',
    group: 'basteln',
    kind: 'object',
    label: { de: 'Test', en: 'test' },
    box: { x0: -10, x1: 10, h: 10 },
    hazards: [],
    materials: [],
    terms: { de: ['test'], en: ['test'] },
    neutral: false,
  };
  return { ...base, ...overrides };
}

// Ein gültiger kleiner Baustein, an dem die Verstöße einzeln ausprobiert werden.
const good = '<path d="M-8 0H8V-8H-8Z" fill="{{paper}}" stroke-width="{{line}}"/>';

describe('Katalog (Stufe 1)', () => {
  it('besteht alle Regeln', () => {
    expect(checkCatalog(catalog)).toEqual([]);
  });

  it('hat die 30 Bausteine der Stufe 1, alle mit Vorschau', () => {
    expect(catalog.size).toBe(30);
    const previews = new Set(buildPreviewFiles(catalog, new Map()).map((file) => file.path));
    for (const id of catalog.keys()) expect(previews).toContain(`docs/bausteine/vorschau/${id}.svg`);
  });

  it('jeder Baustein steht in einer Gruppe, deren Ordner die Datei enthält', () => {
    for (const entry of catalog.values()) expect(existsSync(join(root, 'assets/bausteine', entry.group, `${entry.id}.svg`))).toBe(true);
  });

  it('jede Datei in assets/bausteine steht im Katalog (keine verwaiste Datei)', () => {
    const files = readdirSync(join(root, 'assets/bausteine'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'beispiele')
      .flatMap((dir) => readdirSync(join(root, 'assets/bausteine', dir.name)).map((name) => `${dir.name}/${name}`));
    expect(files.sort()).toEqual([...catalog.values()].map((entry) => `${entry.group}/${entry.id}.svg`).sort());
  });

  it('Figuren: Erwachsene sind deutlich größer als Kinder, Kinder größer als Kleinkinder, Kleidung nur Petrol oder Rosé', () => {
    const height = (id: string) => catalog.get(id)?.box.h ?? 0;
    expect(height('adult')).toBeGreaterThanOrEqual(height('child') * 1.4);
    expect(height('child')).toBeGreaterThan(height('toddler-sit'));
    for (const entry of catalog.values()) if (entry.kind === 'figure') expect((entry.tints ?? []).every((tint) => tint === 'petrol' || tint === 'rose')).toBe(true);
  });

  it('kein Baustein zeigt Feuer, Flamme oder Kerze', () => {
    for (const entry of catalog.values()) expect(`${entry.id} ${entry.label.de} ${entry.label.en}`).not.toMatch(/flame|fire|candle|kerze|flamme|feuer/i);
  });

  it('Pflichtbausteine: Standlinie und Tisch mit Tischplatte', () => {
    expect(catalog.get('ground-line')?.kind).toBe('ground');
    expect(catalog.get('table')?.surface).toBeGreaterThan(0);
  });
});

describe('Regeln für einen Baustein', () => {
  it('der Beispielbaustein ist in Ordnung', () => {
    expect(checkBlock(block({ svg: good }))).toEqual([]);
  });

  const cases: [string, string, string | RegExp][] = [
    ['feste Farbe', good.replace('{{paper}}', '#FCF8F2'), /Farbplatz|feste Farben/i],
    ['unbekannter Platzhalter', good.replace('{{paper}}', '{{green}}'), /Unbekannter Platzhalter/],
    ['fill fehlt', '<path d="M-8 0H8V-8H-8Z" stroke-width="{{line}}"/>', /ohne fill/],
    ['feste Linienstärke', good.replace('{{line}}', '4'), /nur zwei Linienstärken/],
    ['relativer Pfadbefehl', good.replace('M-8 0H8V-8H-8Z', 'm-8 0h16v-8h-16z'), /Maße nicht lesbar/],
    ['Bogen im Pfad', good.replace('M-8 0H8V-8H-8Z', 'M-8 0A4 4 0 0 1 8 0Z'), /Maße nicht lesbar/],
    ['Text im Bild', `${good}<text x="0" y="0" fill="{{ink}}">Hi</text>`, /<text> ist nicht erlaubt/],
    ['Bild im Bild', `${good}<image href="a.png"/>`, /<image> ist nicht erlaubt/],
    ['Gruppe', `<g>${good}</g>`, /kein <svg>, <g>/],
    ['Transparenz', good.replace('fill=', 'opacity="0.5" fill='), /opacity ist nicht erlaubt/],
    ['Drehung', good.replace('fill=', 'transform="rotate(10)" fill='), /transform ist nur die versetzte Farbfläche/],
    ['Versatz mit Linie', good.replace('fill=', 'transform="translate({{shift}} {{shift}})" fill='), /stroke="none"/],
    ['tint ohne Erlaubnis', good.replace('{{paper}}', '{{tint}}'), /\{\{tint\}\} ohne erlaubte Töne/],
  ];
  it.each(cases)('meldet: %s', (_name, svg, message) => {
    expect(checkBlock(block({ svg })).join('\n')).toMatch(message);
  });

  it('Petrol-Regel: Mit Petrol sind feine Linien Leinen, nicht Tinte (Tinte auf Petrol nur 1,8:1)', () => {
    const petrol = '<path d="M-8 0H8V-8H-8Z" fill="{{petrol}}" stroke-width="{{line}}"/>';
    const inkDetail = '<path d="M-4 -4H4" fill="none" stroke-width="{{fine}}"/>';
    const paperDetail = '<path d="M-4 -4H4" fill="none" stroke="{{paper}}" stroke-width="{{fine}}"/>';
    expect(checkBlock(block({ svg: petrol + inkDetail })).join('\n')).toMatch(/Petrol-Regel/);
    expect(checkBlock(block({ svg: petrol + paperDetail }))).toEqual([]);
    // auch wenn Petrol nur als wählbarer Ton vorkommt
    const tinted = '<path d="M-8 0H8V-8H-8Z" fill="{{tint}}" stroke-width="{{line}}"/>';
    expect(checkBlock(block({ svg: tinted + inkDetail, tints: ['petrol', 'rose'], defaultTint: 'rose' })).join('\n')).toMatch(/Petrol-Regel/);
    expect(checkBlock(block({ svg: tinted + inkDetail, tints: ['rose', 'honey'], defaultTint: 'rose' }))).toEqual([]);
  });

  it('Kleidung nie in warmen Tönen', () => {
    const svg = '<path d="M-8 0H8V-8H-8Z" fill="{{tint}}" stroke-width="{{line}}"/>';
    const figure = block({ svg, kind: 'figure', person: 'adult', neutral: true, tints: ['honey'], defaultTint: 'honey' });
    expect(checkBlock(figure).join('\n')).toMatch(/Kleidung ist nur Petrol oder Rosé/);
  });

  it('Maße: zu kleine und zu große Fläche werden gemeldet, mit dem gezeichneten Maß', () => {
    expect(checkBlock(block({ svg: good, box: { x0: -4, x1: 4, h: 4 } })).join('\n')).toMatch(/ragt .* hinaus \(gezeichnet/);
    expect(checkBlock(block({ svg: good, box: { x0: -40, x1: 40, h: 40 } })).join('\n')).toMatch(/zu groß/);
  });

  it('Größe und Feuer', () => {
    expect(checkBlock(block({ svg: good.repeat(Math.ceil(maxBlockBytes / good.length) + 1), box: { x0: -10, x1: 10, h: 10 } })).join('\n')).toMatch(/Größer als/);
    expect(checkBlock(block({ svg: good, id: 'candle' })).join('\n')).toMatch(/Feuer, Flammen und Kerzen/);
  });

  it('nicht neutrale Bausteine brauchen Begriffe in beiden Sprachen', () => {
    expect(checkBlock(block({ svg: good, terms: { de: [], en: ['x'] } })).join('\n')).toMatch(/Begriffe in Deutsch und Englisch/);
    expect(checkBlock(block({ svg: good, terms: { de: [], en: [] }, neutral: true }))).toEqual([]);
  });
});

describe('Maße aus dem SVG-Text', () => {
  it('Pfad mit absoluten Befehlen: alle Punkte, auch Kontrollpunkte', () => {
    expect(pathPoints('M0 0L10 5H20V8C1 2 3 4 5 6Z')).toEqual([[0, 0], [10, 5], [20, 5], [20, 8], [1, 2], [3, 4], [5, 6]]);
    expect(pathPoints('M0 0 10 5')).toEqual([[0, 0], [10, 5]]); // weitere Paare nach M sind Linien
    expect(pathPoints('m0 0l1 1')).toBeNull();
    expect(pathPoints('M0')).toBeNull();
  });

  it('Rahmen mit Linienbreite und Versatz', () => {
    const box = estimateBox('<circle cx="0" cy="-10" r="10" fill="{{paper}}" stroke-width="{{line}}"/>');
    expect(box).toEqual({ minX: -12, maxX: 12, minY: -22, maxY: 2 });
    const moved = estimateBox('<circle cx="0" cy="-10" r="10" fill="{{paper}}" stroke="none" transform="translate({{shift}} {{shift}})"/>');
    expect(moved).toEqual({ minX: -10, maxX: 13, minY: -20, maxY: 3 });
  });
});

describe('Layouts', () => {
  it('jedes Layout hat Plätze, die im Rahmen liegen und Größen mit einer Vorgabe', () => {
    for (const layout of Object.values(layouts)) {
      expect(Object.keys(layout.slots).length).toBeGreaterThan(0);
      for (const slot of Object.values(layout.slots)) {
        expect(slot.x).toBeGreaterThan(0);
        expect(slot.x).toBeLessThan(400);
        expect(slot.sizes.length).toBeGreaterThan(0);
        expect(slot.kinds.length).toBeGreaterThan(0);
      }
    }
  });

  it('nur diese Größen kommen vor (die sichtbare Linienstärke bleibt bei jeder gleich)', () => {
    const sizes = new Set(Object.values(layouts).flatMap((layout) => Object.values(layout.slots).flatMap((slot) => slot.sizes)));
    expect([...sizes].sort()).toEqual([0.6, 1, 1.5]);
  });
});

const scene = (layout: Scene['layout'], items: Scene['items']): Scene => ({ layout, items });

describe('Szene prüfen (ohne Aktivität)', () => {
  it('eine gültige Szene besteht', () => {
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl' }]), catalog)).toEqual([]);
  });

  it('unbekanntes Layout, Platz, Baustein, doppelter Platz, falsche Art, Größe und Ton', () => {
    expect(checkScene({ layout: 'x' as never, items: [] }, catalog)[0]).toMatch(/Unbekanntes Layout/);
    expect(checkScene(scene('hero', [{ slot: 'nirgends', block: 'bowl' }]), catalog).join('\n')).toMatch(/Platz „nirgends“ gibt es im Layout/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'gibt-es-nicht' }]), catalog).join('\n')).toMatch(/Baustein „gibt-es-nicht“ gibt es nicht/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl' }, { slot: 'main', block: 'cup' }]), catalog).join('\n')).toMatch(/doppelt besetzt/);
    expect(checkScene(scene('outdoor', [{ slot: 'front', block: 'adult' }]), catalog).join('\n')).toMatch(/passt nicht auf den Platz/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl', size: 2 }]), catalog).join('\n')).toMatch(/Größe 2 ist auf dem Platz/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl', tint: 'brown' }]), catalog).join('\n')).toMatch(/gibt es nicht in „brown“/);
    expect(checkScene(scene('hero', []), catalog)).toContain('Keine Bausteine.');
  });

  it('die Standlinie setzt der Zeichner selbst', () => {
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'ground-line' }]), catalog).join('\n')).toMatch(/Standlinie setzt der Zeichner selbst/);
  });

  it('das Layout „table“ braucht den Tisch', () => {
    expect(checkScene(scene('table', [{ slot: 'on1', block: 'cup' }]), catalog).join('\n')).toMatch(/braucht einen Tisch/);
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'on1', block: 'cup' }]), catalog)).toEqual([]);
  });

  it('Dinge auf dem Tisch stehen auf der Tischplatte', () => {
    const placed = placeItems(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'on1', block: 'cup' }]), catalog);
    const surface = 176 - (catalog.get('table')?.surface ?? 0);
    expect(placed?.[1].y).toBe(surface);
  });

  it('Bausteine auf der rechten Hälfte schauen zur Mitte, links nicht', () => {
    const placed = placeItems(scene('pair', [{ slot: 'left', block: 'child' }, { slot: 'right', block: 'child' }]), catalog);
    expect(placed?.map((entry) => entry.flip)).toEqual([false, true]);
    const own = placeItems(scene('pair', [{ slot: 'right', block: 'child', flip: false }]), catalog);
    expect(own?.[0].flip).toBe(false);
  });

  it('Rand: ein zu großer Baustein am Rand wird gemeldet', () => {
    // der Tisch (205 breit) auf dem linken Platz von „outdoor“ ragt über den Rand von 24 Einheiten
    expect(checkScene(scene('outdoor', [{ slot: 's1', block: 'table' }]), catalog).join('\n')).toMatch(/ragt aus dem Rand/);
  });

  it('Ecken der Pille: Hohe Bausteine in den oberen Ecken werden gemeldet', () => {
    // Ein Erwachsener (118 hoch, Kopf bei 58) ist im Rahmen, ein Baum in der Mitte (147 hoch, Krone bei 29) reicht in die Ecken
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'left', block: 'adult' }]), catalog)).toEqual([]);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'tree', size: 1.5 }]), catalog).join('\n')).toMatch(/oberen Ecke/);
    expect(cornerZone.h).toBeLessThan(60);
  });

  it('Überdeckung: Zwei Bausteine, die sich stark überdecken, werden gemeldet', () => {
    const problems = checkScene(scene('outdoor', [{ slot: 's2', block: 'blanket' }, { slot: 'front', block: 'blanket' }]), catalog).join('\n');
    expect(problems).toMatch(/„blanket“ und „blanket“ überdecken sich zu \d+ % \(höchstens 35 %\)/);
    // Nebeneinander ohne Überdeckung besteht
    expect(checkScene(scene('outdoor', [{ slot: 's1', block: 'pillow' }, { slot: 's4', block: 'pillow' }]), catalog)).toEqual([]);
  });

  it('höchstens 6 Bausteine', () => {
    const items = ['s1', 's2', 's3', 's4', 'front'].map((slot) => ({ slot, block: 'pillow' }));
    expect(checkScene(scene('outdoor', [...items, { slot: 's5', block: 'cup' }, { slot: 's6', block: 'cup' }, { slot: 's7', block: 'cup' }]), catalog).join('\n')).toMatch(/Höchstens 6 Bausteine/);
  });
});

// Eine Aktivität in der Form des Abgleichs, nur mit den Feldern, die die Regeln lesen.
function ctx(overrides: { materials?: string[]; ageMin?: number; ageMax?: number; text?: string; safety?: string } = {}): ActivityContext {
  const text = overrides.text ?? 'Schere Becher Brille Kissen Schüssel Pfütze Backblech Ofenhandschuh';
  const safety = overrides.safety ?? 'nur mit Erwachsenen';
  return {
    materials: overrides.materials ?? [],
    ageMin: overrides.ageMin ?? 5,
    ageMax: overrides.ageMax ?? 9,
    text: { de: text.toLowerCase(), en: '' },
    safety: { de: safety, en: '' },
  };
}

describe('Sicherheit und Textabgleich', () => {
  const cut = (items: Scene['items']) => scene('outdoor', items);

  it('Schere: nur bei einem Erwachsenen, eindeutig', () => {
    expect(checkScene(cut([{ slot: 's1', block: 'adult-reach' }, { slot: 's2', block: 'scissors' }, { slot: 's3', block: 'child' }]), catalog, ctx())).toEqual([]);
    const noPerson = checkScene(scene('hero', [{ slot: 'main', block: 'scissors' }]), catalog, ctx()).join('\n');
    expect(noPerson).toMatch(/nicht eindeutig bei einem Erwachsenen/);
    // Gleichstand zählt nicht (Schere genau in der Mitte zwischen Erwachsenem und Kind)
    const tie = checkScene(scene('pair', [{ slot: 'left', block: 'child' }, { slot: 'middle', block: 'scissors' }, { slot: 'right', block: 'adult' }]), catalog, ctx()).join('\n');
    expect(tie).toMatch(/nicht eindeutig bei einem Erwachsenen/);
    // das Kind ist näher als der Erwachsene
    const nearChild = checkScene(cut([{ slot: 's1', block: 'child' }, { slot: 's2', block: 'scissors' }, { slot: 's3', block: 'adult' }]), catalog, ctx()).join('\n');
    expect(nearChild).toMatch(/nicht eindeutig bei einem Erwachsenen/);
  });

  it('Schere und ein Kleinkind im selben Bild: nie', () => {
    const problems = checkScene(cut([{ slot: 's1', block: 'adult' }, { slot: 's2', block: 'scissors' }, { slot: 's3', block: 'toddler-sit' }]), catalog, ctx({ ageMin: 1 })).join('\n');
    expect(problems).toMatch(/und ein Kleinkind im selben Bild/);
  });

  it('Hitze (Backblech): Erwachsener nah, Ofenhandschuh im Bild', () => {
    const base = [{ slot: 'table', block: 'table' }, { slot: 'on1', block: 'baking-tray', size: 0.6 }];
    const withAdult = [...base, { slot: 'left', block: 'adult' }];
    expect(checkScene(scene('table', withAdult), catalog, ctx()).join('\n')).toMatch(/ohne Ofenhandschuh/);
    expect(checkScene(scene('table', [...withAdult, { slot: 'on3', block: 'oven-mitt' }]), catalog, ctx())).toEqual([]);
    expect(checkScene(scene('table', [...base, { slot: 'on3', block: 'oven-mitt' }]), catalog, ctx()).join('\n')).toMatch(/nicht eindeutig bei einem Erwachsenen/);
  });

  it('Schutzbrille nur, wenn der Sicherheitshinweis sie nennt', () => {
    const goggles = scene('hero', [{ slot: 'main', block: 'goggles' }]);
    expect(checkScene(goggles, catalog, ctx({ safety: 'Nichts ins Gesicht spritzen.' })).join('\n')).toMatch(/Schutzbrille im Bild, aber der Sicherheitshinweis nennt sie nicht/);
    expect(checkScene(goggles, catalog, ctx({ safety: 'Tragt eine Schutzbrille oder normale Brille.' }))).toEqual([]);
    expect(checkScene(goggles, catalog, { ...ctx(), safety: { en: 'Wear safety goggles.' } })).toEqual([]);
  });

  it('Wasser (Pfütze) unter 6 Jahren nur mit Erwachsenem im Bild', () => {
    const puddle = (items: Scene['items']) => scene('outdoor', items);
    expect(checkScene(puddle([{ slot: 's3', block: 'puddle' }, { slot: 's2', block: 'child' }]), catalog, ctx({ ageMin: 3 })).join('\n')).toMatch(/Wasser\) ohne Erwachsenen/);
    expect(checkScene(puddle([{ slot: 's3', block: 'puddle' }, { slot: 's2', block: 'child' }, { slot: 's1', block: 'adult' }]), catalog, ctx({ ageMin: 3 }))).toEqual([]);
    expect(checkScene(puddle([{ slot: 's3', block: 'puddle' }, { slot: 's2', block: 'child' }]), catalog, ctx({ ageMin: 6 }))).toEqual([]);
  });

  it('Kleinteile nur ab 3 Jahren (mit einem Baustein, der Kleinteile hat)', () => {
    const small: Catalog = new Map(catalog);
    (small as Map<string, LoadedBlock>).set('cup', { ...(catalog.get('cup') as LoadedBlock), hazards: ['smallParts'] });
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'cup' }]), small, ctx({ ageMin: 2 })).join('\n')).toMatch(/Kleinteile\) bei Kindern unter 3 Jahren/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'cup' }]), small, ctx({ ageMin: 3 }))).toEqual([]);
  });

  it('Figuren passen zum Alter: Kleinkind nur bis 2, Kind erst ab 3', () => {
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'toddler-sit', size: 1 }]), catalog, ctx({ ageMin: 4 })).join('\n')).toMatch(/Kleinkind im Bild, aber die Aktivität beginnt erst ab 3/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'child', size: 1 }]), catalog, ctx({ ageMin: 0, ageMax: 2 })).join('\n')).toMatch(/Kind im Bild, aber die Aktivität ist nur für Kinder unter 3/);
  });

  it('„Ein Bild zeigt nichts, was der Text nicht sagt“: ein Gegenstand ohne Deckung wird gemeldet', () => {
    const bowl = scene('hero', [{ slot: 'main', block: 'bowl' }]);
    expect(checkScene(bowl, catalog, ctx({ text: 'Malt ein Bild.' })).join('\n')).toMatch(/„bowl“ ist im Text der Aktivität nicht gedeckt/);
    expect(checkScene(bowl, catalog, ctx({ text: 'Rührt in der Schüssel.' }))).toEqual([]); // Begriff
    expect(checkScene(bowl, catalog, ctx({ text: 'Malt ein Bild.', materials: ['bowl'] }))).toEqual([]); // Material
    expect(checkScene(bowl, catalog, { ...ctx({ text: '' }), text: { de: '', en: 'stir the bowl' } })).toEqual([]); // englischer Begriff
  });

  it('Figuren, Tisch und Standlinie brauchen keine Deckung', () => {
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'left', block: 'adult' }]), catalog, ctx({ text: 'Nichts.' }))).toEqual([]);
  });
});

describe('Zeichnen', () => {
  // Die Farbplätze der Zeichnungs-Palette und alles, was Bildregeln verbieten (ILLUSTRATIONEN.md).
  const palette = new Set(Object.values(illustrationPalette).map((color) => color.toUpperCase()));
  const forbidden = /<(text|image|style|script|use|defs|filter|mask|clipPath|linearGradient|radialGradient)\b|href=|url\(|opacity=/;

  it.each([...scenes.entries()])('Beispielszene %s: mit Platzhaltern, ohne Reste und ohne verbotenen Code', (_name, example) => {
    const template = renderSceneTemplate(example, catalog);
    expect(template.match(/\{\{([a-z]+)\}\}/g)?.every((token) => ['{{ground}}', '{{paper}}', '{{ink}}', '{{rose}}', '{{petrol}}', '{{honey}}', '{{brown}}'].includes(token))).toBe(true);
    const svg = renderSceneSvg(example, catalog);
    expect(svg).not.toMatch(/\{\{|\}\}/);
    expect(svg).not.toMatch(forbidden);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1200" height="600" viewBox="0 0 400 200">/);
    expect(Buffer.byteLength(svg)).toBeLessThan(maxSceneBytes);
    for (const color of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(palette).toContain(color.toUpperCase());
  });

  it('Linienstärken: sichtbar immer 4 oder 2,5, auch bei verkleinerten und vergrößerten Bausteinen', () => {
    for (const example of scenes.values()) {
      const svg = renderSceneSvg(example, catalog);
      for (const group of svg.split('<g ').slice(1)) {
        const scale = Math.abs(Number(/scale\((-?[\d.]+) /.exec(group)?.[1] ?? 1));
        for (const match of group.matchAll(/stroke-width="([\d.]+)"/g)) {
          const visible = Number(match[1]) * scale;
          expect([4, 2.5].some((width) => Math.abs(visible - width) < 0.05)).toBe(true);
        }
      }
    }
  });

  it('Linien sind rund, Standlinie und Grund sind dabei', () => {
    const svg = renderSceneSvg(scene('hero', [{ slot: 'main', block: 'bowl' }]), catalog);
    expect(svg).toContain('stroke-linecap="round" stroke-linejoin="round"');
    expect(svg).toContain('M-144 0H144');
    expect(svg).toContain('<circle cx="200" cy="108" r="90"');
    expect(renderSceneSvg({ ...scene('hero', [{ slot: 'main', block: 'bowl' }]), ground: false }, catalog)).not.toContain('M-144 0H144');
  });

  it('gleiche Szene ergibt gleiches SVG', () => {
    const example = scenes.values().next().value as Scene;
    expect(renderSceneSvg(example, catalog)).toBe(renderSceneSvg(example, catalog));
  });

  it('eine Szene mit Problemen lässt sich nicht zeichnen', () => {
    expect(() => renderSceneTemplate(scene('hero', [{ slot: 'nirgends', block: 'bowl' }]), catalog)).toThrow(/nicht lesbar/);
  });
});

describe('Beispielszenen', () => {
  const activities = new Map(loadActivityData().activities.map((activity) => [activity.id, activity]));

  it.each([...scenes.entries()])('%s besteht Layout-, Maß- und (mit Aktivität) Sicherheitsregeln', (_name, example) => {
    const activity = example.activity === undefined ? undefined : activities.get(example.activity);
    if (example.activity !== undefined) expect(activity).toBeDefined();
    expect(checkScene(example, catalog, activity === undefined ? undefined : contextFromActivity(activity))).toEqual([]);
  });
});

describe('Vorschau', () => {
  it('die eingecheckten Dateien passen zu Bausteinen und Beispielszenen (npm run kit:preview)', () => {
    const files = buildPreviewFiles(catalog, scenes);
    for (const file of files) {
      const target = join(root, file.path);
      expect(existsSync(target)).toBe(true);
      expect(readFileSync(target, 'utf8') === file.content ? '' : `veraltet: ${file.path}`).toBe('');
    }
    const wanted = new Set(files.map((file) => file.path));
    for (const folder of ['vorschau', 'vorschau/beispiele']) {
      for (const name of readdirSync(join(root, 'docs/bausteine', folder)).filter((entry) => entry.endsWith('.svg'))) {
        expect(wanted.has(`docs/bausteine/${folder}/${name}`) ? '' : `überflüssig: ${folder}/${name}`).toBe('');
      }
    }
  });

  it('die Seite nennt jeden Baustein und jede Beispielszene', () => {
    const page = buildPreviewFiles(catalog, scenes).find((file) => file.path.endsWith('VORSCHAU.md'))?.content ?? '';
    for (const id of catalog.keys()) expect(page).toContain(`\`${id}\``);
    for (const name of scenes.keys()) expect(page).toContain(`\`${name}\``);
  });
});
