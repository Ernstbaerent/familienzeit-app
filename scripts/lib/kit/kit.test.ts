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
import { buildCoverage, coverageMarkdown, mentions, stem } from './coverage';
import { holdPoseNames } from './figureItems';
import { checkScene, contextFromActivity, hotDistance, maxSceneBytes, placeItems, renderSceneSvg, renderSceneTemplate, type ActivityContext } from './scene';
import { containerSheets, poseSheets } from './sheets';
import { buildProbeFiles, elementsOf, loadProbe, similarity, type ProbeActivity } from './probe';
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

  it('hat 50 Bausteine (Stufe 1, Schritt 3a, nach dem ersten Bild-Test), alle mit Vorschau', () => {
    expect(catalog.size).toBe(50);
    expect([...catalog.values()].filter((entry) => entry.kind === 'content')).toHaveLength(11);
    for (const id of ['plate', 'ladle', 'jug', 'basket', 'bucket', 'knife', 'fork', 'child-scissors', 'cotton-swab', 'stick']) expect(catalog.has(id)).toBe(true);
    for (const id of ['cloth-bag', 'paper-bag', 'playing-cards', 'bike', 'house-windows', 'vegetables']) expect(catalog.has(id)).toBe(true);
    const previews = new Set(buildPreviewFiles(catalog, new Map()).map((file) => file.path));
    for (const id of catalog.keys()) expect(previews).toContain(`docs/bausteine/vorschau/${id}.svg`);
  });

  it('jeder Baustein steht in einer Gruppe, deren Ordner die Datei enthält', () => {
    for (const entry of catalog.values()) expect(existsSync(join(root, 'assets/bausteine', entry.group, `${entry.id}.svg`))).toBe(true);
  });

  it('jede Datei in assets/bausteine steht im Katalog (keine verwaiste Datei)', () => {
    const files = readdirSync(join(root, 'assets/bausteine'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'beispiele' && entry.name !== 'probe')
      .flatMap((dir) => readdirSync(join(root, 'assets/bausteine', dir.name)).map((name) => `${dir.name}/${name}`));
    expect(files.sort()).toEqual([...catalog.values()].map((entry) => `${entry.group}/${entry.id}.svg`).sort());
  });

  it('Strichfiguren gibt es nicht mehr: Figuren kommen aus der Besetzung (Rig)', () => {
    expect(existsSync(join(root, 'assets/bausteine/figuren'))).toBe(false);
    for (const example of scenes.values()) for (const item of example.items) expect(['adult', 'child', 'toddler-sit']).not.toContain(item.block);
  });

  it('Haltepunkte: Tablett und Backblech an beiden Rändern, Teller von unten, Löffel und Kelle am Griff mit Spitze, Kanne am Henkel, Schere an den Griffen', () => {
    const grips = (id: string) => Object.keys(catalog.get(id)?.grips ?? {}).sort();
    expect(grips('tray')).toEqual(['left', 'right']);
    expect(grips('baking-tray')).toEqual(['left', 'right']);
    expect(grips('plate')).toEqual(['under']);
    expect(grips('wooden-spoon')).toEqual(['handle', 'tip']);
    expect(grips('ladle')).toEqual(['handle', 'tip']);
    expect(grips('jug')).toEqual(['handle', 'under']);
    expect(grips('scissors')).toEqual(['handle', 'tip']);
    expect(grips('child-scissors')).toEqual(['handle', 'tip']);
  });

  it('Behälter und Inhalte: elf Inhalte, jeder passt in mindestens einen Behälter', () => {
    const containers = [...catalog.values()].filter((entry) => entry.container !== undefined).map((entry) => entry.id).sort();
    expect(containers).toEqual(['baking-tray', 'basket', 'bowl', 'bucket', 'cloth-bag', 'paper-bag', 'plate', 'tray']);
    const contents = [...catalog.values()].filter((entry) => entry.kind === 'content');
    expect(contents.map((entry) => entry.id).sort()).toEqual(['baked-apples', 'bananas', 'chestnuts', 'cookies', 'dough', 'fruit', 'leaves', 'lemon-halves', 'oat-balls', 'vegetables', 'water']);
    for (const content of contents) {
      expect((content.fits ?? []).length).toBeGreaterThan(0);
      for (const id of content.fits ?? []) expect(containers).toContain(id);
    }
    expect(catalog.get('water')?.hazards).toContain('water');
    expect(catalog.get('chestnuts')?.hazards).toContain('smallParts');
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

  it('Haltepunkte liegen auf dem Baustein, eine Spitze nur mit Griff; Inhalte brauchen Behälter; Kinderhand nur bei scharfen Dingen mit Begriffen', () => {
    expect(checkBlock(block({ svg: good, grips: { handle: [40, 0] } })).join('\n')).toMatch(/Haltepunkt „handle“ .* liegt außerhalb/);
    expect(checkBlock(block({ svg: good, grips: { tip: [0, -4] } })).join('\n')).toMatch(/Spitze .* nur zusammen mit einem Griff/);
    expect(checkBlock(block({ svg: good, kind: 'content' })).join('\n')).toMatch(/braucht `fits`/);
    expect(checkBlock(block({ svg: good, kidSafe: true })).join('\n')).toMatch(/`kidSafe` gibt es nur bei scharfen Dingen/);
    expect(checkBlock(block({ svg: good, kidSafe: true, hazards: ['sharp'] })).join('\n')).toMatch(/`kidSafe` braucht `kidTerms`/);
    const fake: Catalog = new Map(catalog);
    (fake as Map<string, LoadedBlock>).set('test', block({ svg: good, kind: 'content', fits: ['cup'] }));
    expect(checkCatalog(fake).join('\n')).toMatch(/„cup“ in `fits` ist kein Behälter/);
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
    expect(checkBlock(block({ svg: good, id: 'pillow', terms: { de: [], en: [] }, neutral: true }))).toEqual([]);
  });

  it('neutral sind genau Teller, Tisch, Stuhl, Kissen, Decke (und die Standlinie), nie etwas Scharfes, Heißes, Elektrisches oder Kleines', () => {
    expect([...catalog.values()].filter((entry) => entry.neutral).map((entry) => entry.id).sort()).toEqual(['blanket', 'chair', 'ground-line', 'pillow', 'plate', 'table']);
    expect(checkBlock(block({ svg: good, id: 'cup', neutral: true })).join('\n')).toMatch(/Neutral dürfen nur/);
    expect(checkBlock(block({ svg: good, id: 'plate', neutral: true, hazards: ['heat'] })).join('\n')).toMatch(/kein Merkmal haben \(hier: heat\)/);
    expect(checkBlock(block({ svg: good, id: 'plate', neutral: true, hazards: ['smallParts'] })).join('\n')).toMatch(/kein Merkmal/);
    expect(checkBlock(block({ svg: good, id: 'chair', neutral: true, materials: ['oldDevice'] })).join('\n')).toMatch(/Material mit Gefahr haben \(hier: electric\)/);
    expect(checkBlock(block({ svg: good, id: 'table', neutral: true, materials: ['knife'] })).join('\n')).toMatch(/hier: sharp/);
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
    expect([...sizes].sort()).toEqual([0.6, 1, 1.5, 2]);
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
    expect(checkScene(scene('outdoor', [{ slot: 'front', figure: 'arne' }]), catalog).join('\n')).toMatch(/Eine Figur passt nicht auf den Platz/);
    expect(checkScene(scene('outdoor', [{ slot: 'front', block: 'cookies' }]), catalog).join('\n')).toMatch(/ist ein Inhalt/);
    expect(checkScene(scene('outdoor', [{ slot: 's1', figure: 'gibt-es-nicht' }]), catalog).join('\n')).toMatch(/Figur „gibt-es-nicht“ gibt es nicht/);
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
    const placed = placeItems(scene('pair', [{ slot: 'left', figure: 'jette' }, { slot: 'right', block: 'cup' }]), catalog);
    expect(placed?.map((entry) => entry.flip)).toEqual([false, true]);
    const own = placeItems(scene('pair', [{ slot: 'right', block: 'cup', flip: false }]), catalog);
    expect(own?.[0].flip).toBe(false);
  });

  it('Rand: ein zu großer Baustein am Rand wird gemeldet', () => {
    // der Tisch (205 breit) auf dem linken Platz von „outdoor“ ragt über den Rand von 24 Einheiten
    expect(checkScene(scene('outdoor', [{ slot: 's1', block: 'table' }]), catalog).join('\n')).toMatch(/ragt aus dem Rand/);
  });

  it('Ecken der Pille: Hohe Bausteine in den oberen Ecken werden gemeldet', () => {
    // Erwachsene der Besetzung (120 und 123 hoch) reichen links und rechts in die Ecken, in der Mitte nicht; ein Baum (147 hoch) reicht hinein
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'left', figure: 'arne' }]), catalog).join('\n')).toMatch(/oberen Ecke.*Erwachsene passen nur in die Mitte/);
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'back', figure: 'arne' }]), catalog)).toEqual([]);
    expect(checkScene(scene('pair', [{ slot: 'left', figure: 'jette' }, { slot: 'middle', figure: 'ilka' }]), catalog)).toEqual([]);
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
  const text = overrides.text ?? 'Schere Messer Becher Brille Kissen Schüssel Teller Pfütze Backblech Ofen Tablett Bratapfel Wasser Kastanie Wattestäbchen Papier Regenjacke';
  const safety = overrides.safety ?? 'nur mit Erwachsenen';
  return {
    materials: overrides.materials ?? [],
    ageMin: overrides.ageMin ?? 5,
    ageMax: overrides.ageMax ?? 9,
    text: { de: text.toLowerCase(), en: '' },
    safety: { de: safety, en: '' },
  };
}

const pair = (items: Scene['items']): Scene => ({ layout: 'pair', items });

describe('Sicherheit: Scharfes nur in der Hand eines Erwachsenen', () => {
  const knife = (figure: string, slot = 'middle') => ({ slot, figure, pose: 'cut-supervised', holds: { right: { block: 'knife', size: 0.75 } } });

  it('Arne schneidet, Jette schaut zu: in Ordnung', () => {
    expect(checkScene(pair([knife('arne'), { slot: 'left', figure: 'jette', pose: 'curious' }]), catalog, ctx())).toEqual([]);
  });

  it('ein Messer, das frei liegt, ist ein Fehler (auch ohne Figur)', () => {
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'knife' }]), catalog, ctx()).join('\n')).toMatch(/liegt frei im Bild: Scharfes nur in der Hand eines Erwachsenen/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'scissors' }]), catalog, ctx()).join('\n')).toMatch(/liegt frei im Bild/);
  });

  it('ein Kind mit Messer oder spitzer Schere: Fehler', () => {
    expect(checkScene(pair([knife('jette', 'left'), { slot: 'middle', figure: 'arne' }]), catalog, ctx()).join('\n')).toMatch(/„knife“ \(scharf\) hält das Kind „jette“: Scharfes nur in der Hand eines Erwachsenen/);
    const pointed = { slot: 'left', figure: 'mats', pose: 'cut-supervised', holds: { right: { block: 'scissors', size: 0.6 } } };
    expect(checkScene(pair([pointed, { slot: 'middle', figure: 'arne' }]), catalog, ctx({ ageMin: 8, ageMax: 12 })).join('\n')).toMatch(/„scissors“ \(scharf\) hält das ältere Kind „mats“/);
  });

  it('Scharfes und ein Kleinkind im selben Bild: nie', () => {
    expect(checkScene(pair([knife('arne'), { slot: 'left', figure: 'nolli' }]), catalog, ctx({ ageMin: 2 })).join('\n')).toMatch(/\(scharf\) und ein Kleinkind im selben Bild/);
  });

  describe('Kinderschere: nur wenn die Checkliste es für das Alter erlaubt und der Text sie nennt', () => {
    const kid = { slot: 'left', figure: 'jette', pose: 'cut-supervised', holds: { right: { block: 'child-scissors', size: 0.6 } } };
    const adult = { slot: 'middle', figure: 'ilka' };
    const allowed = ctx({ ageMin: 4, text: 'Schneidet mit der Kinderschere.', materials: ['scissors'] });

    it('alles erfüllt (ab 3, Text nennt die Kinderschere, Erwachsener im Bild): in Ordnung', () => {
      expect(checkScene(pair([kid, adult]), catalog, allowed)).toEqual([]);
      expect(checkScene(pair([kid, adult]), catalog, { ...allowed, text: { de: '', en: 'cut with child scissors' } })).toEqual([]);
    });

    it('der Text sagt nur „Schere“: Fehler (wo die Checkliste schweigt, gilt nur Erwachsene)', () => {
      expect(checkScene(pair([kid, adult]), catalog, { ...allowed, text: { de: 'schneidet mit der schere.', en: '' } }).join('\n')).toMatch(/aber der Text nennt sie nicht/);
    });

    it('unter 3 Jahren oder ohne Erwachsenen im Bild: Fehler', () => {
      const young = { ...allowed, ageMin: 2 };
      expect(checkScene(pair([kid, adult]), catalog, young).join('\n')).toMatch(/beginnt unter 3 Jahren \(Checkliste, Punkt 5\)/);
      expect(checkScene(pair([kid]), catalog, allowed).join('\n')).toMatch(/ohne Erwachsenen im Bild \(Checkliste, Punkt 2/);
    });
  });
});

describe('Sicherheit: Heißes nur mit Ofenhandschuhen an der Hand eines Erwachsenen', () => {
  const tray = (figure: string, mitts: boolean, extra: object = {}) => ({ slot: 'middle', figure, pose: 'carry-tray', mitts, holds: { both: { block: 'tray', content: 'baked-apples', hot: true, ...extra } } });

  it('Arne mit Ofenhandschuhen und heißen Bratäpfeln, Jette mit Abstand: in Ordnung', () => {
    expect(checkScene(pair([tray('arne', true), { slot: 'left', figure: 'jette', pose: 'hold-plate', holds: { right: { block: 'plate', content: 'baked-apples', size: 0.75 } } }]), catalog, ctx())).toEqual([]);
  });

  it('ohne Ofenhandschuhe, in Kinderhand oder frei auf dem Tisch: Fehler', () => {
    expect(checkScene(pair([tray('arne', false)]), catalog, ctx()).join('\n')).toMatch(/\(heiß\) ohne Ofenhandschuhe an den Händen/);
    expect(checkScene(pair([{ ...tray('mats', true), slot: 'left', holds: { both: { block: 'tray', content: 'baked-apples', hot: true, size: 0.75 } } }]), catalog, ctx({ ageMin: 8, ageMax: 12 })).join('\n')).toMatch(/\(heiß\) ist nicht in der Hand eines Erwachsenen/);
    const onTable = scene('table', [{ slot: 'table', block: 'table' }, { slot: 'on1', block: 'baking-tray', size: 0.6 }, { slot: 'back', figure: 'arne', mitts: true }]);
    expect(checkScene(onTable, catalog, ctx()).join('\n')).toMatch(/„baking-tray“ \(heiß\) ist nicht in der Hand eines Erwachsenen/);
  });

  it('ein Kind zu nah am heißen Tablett, ein Kleinkind im Bild: Fehler', () => {
    const near: Scene = { layout: 'outdoor', items: [{ ...tray('arne', true), slot: 'mid' }, { slot: 's2', figure: 'jette' }] };
    expect(checkScene(near, catalog, ctx()).join('\n')).toMatch(new RegExp(`„jette“ steht zu nah an „tray“ \\(heiß\\): mindestens ${hotDistance} Einheiten`));
    expect(checkScene(pair([tray('arne', true), { slot: 'left', figure: 'nolli' }]), catalog, ctx({ ageMin: 2 })).join('\n')).toMatch(/\(heiß\) und ein Kleinkind im selben Bild/);
  });

  it('heiß heißt: Dampf im Bild', () => {
    const hot = renderSceneSvg(pair([tray('arne', true)]), catalog);
    const cold = renderSceneSvg(pair([{ ...tray('arne', true), holds: { both: { block: 'tray', content: 'baked-apples' } } }]), catalog);
    expect(hot.length).toBeGreaterThan(cold.length);
  });

  it('Ofenhandschuhe zeigen nur, was der Text sagt (Ofen, Backofen, Ofenhandschuh)', () => {
    expect(checkScene(pair([tray('arne', true)]), catalog, ctx({ text: 'Tablett Bratapfel' })).join('\n')).toMatch(/„oven-mitt“ ist im Text der Aktivität nicht gedeckt/);
  });
});

describe('Sicherheit: weitere Regeln', () => {
  it('Schutzbrille nur, wenn der Sicherheitshinweis sie nennt', () => {
    const goggles = scene('hero', [{ slot: 'main', block: 'goggles' }]);
    expect(checkScene(goggles, catalog, ctx({ safety: 'Nichts ins Gesicht spritzen.' })).join('\n')).toMatch(/Schutzbrille im Bild, aber der Sicherheitshinweis nennt sie nicht/);
    expect(checkScene(goggles, catalog, ctx({ safety: 'Tragt eine Schutzbrille oder normale Brille.' }))).toEqual([]);
    expect(checkScene(goggles, catalog, { ...ctx(), safety: { en: 'Wear safety goggles.' } })).toEqual([]);
  });

  it('Wasser (Pfütze, Wasser in der Schüssel) unter 6 Jahren nur mit Erwachsenem im Bild', () => {
    const puddle = (items: Scene['items']) => scene('outdoor', items);
    expect(checkScene(puddle([{ slot: 's3', block: 'puddle' }, { slot: 's1', figure: 'jette' }]), catalog, ctx({ ageMin: 3 })).join('\n')).toMatch(/Wasser\) ohne Erwachsenen/);
    expect(checkScene(puddle([{ slot: 's4', block: 'puddle' }, { slot: 's1', figure: 'jette' }, { slot: 'mid', figure: 'ilka' }]), catalog, ctx({ ageMin: 3 }))).toEqual([]);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl', content: 'water' }]), catalog, ctx({ ageMin: 3 })).join('\n')).toMatch(/„water“ \(Wasser\) ohne Erwachsenen/);
  });

  it('Kleinteile (Kastanien) nur ab 3 Jahren', () => {
    const basket = scene('hero', [{ slot: 'main', block: 'basket', content: 'chestnuts' }]);
    expect(checkScene(basket, catalog, ctx({ ageMin: 2, materials: ['basket'] })).join('\n')).toMatch(/„chestnuts“ \(Kleinteile\) bei Kindern unter 3 Jahren/);
    expect(checkScene(basket, catalog, ctx({ ageMin: 3, materials: ['basket'] }))).toEqual([]);
  });

  it('Figuren passen zum Alter (FIGUREN.md): Nolli 0 bis 4 und nur bis Beginn 2 Jahre, Jette 3 bis 9, Mats 8 bis 16', () => {
    expect(checkScene(pair([{ slot: 'left', figure: 'nolli' }]), catalog, ctx({ ageMin: 3, ageMax: 6 })).join('\n')).toMatch(/Kleinkind im Bild, aber die Aktivität beginnt erst ab 3/);
    expect(checkScene(pair([{ slot: 'left', figure: 'jette' }]), catalog, ctx({ ageMin: 10, ageMax: 14 })).join('\n')).toMatch(/„jette“ passt nicht zur Altersspanne/);
    expect(checkScene(pair([{ slot: 'left', figure: 'mats' }]), catalog, ctx({ ageMin: 3, ageMax: 6 })).join('\n')).toMatch(/„mats“ passt nicht zur Altersspanne/);
    expect(checkScene(pair([{ slot: 'middle', figure: 'arne' }]), catalog, ctx({ ageMin: 0, ageMax: 2 }))).toEqual([]);
  });

  it('„Ein Bild zeigt nichts, was der Text nicht sagt“: Gegenstände, Inhalte und Regen-Kleidung brauchen Deckung', () => {
    const bowl = scene('hero', [{ slot: 'main', block: 'bowl' }]);
    expect(checkScene(bowl, catalog, ctx({ text: 'Malt ein Bild.' })).join('\n')).toMatch(/„bowl“ ist im Text der Aktivität nicht gedeckt/);
    expect(checkScene(bowl, catalog, ctx({ text: 'Rührt in der Schüssel.' }))).toEqual([]); // Begriff
    expect(checkScene(bowl, catalog, ctx({ text: 'Malt ein Bild.', materials: ['bowl'] }))).toEqual([]); // Material
    expect(checkScene(bowl, catalog, { ...ctx({ text: '' }), text: { de: '', en: 'stir the bowl' } })).toEqual([]); // englischer Begriff
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl', content: 'dough' }]), catalog, ctx({ text: 'Rührt in der Schüssel.' })).join('\n')).toMatch(/„dough“ ist im Text/);
    const rain = pair([{ slot: 'left', figure: 'jette', outfit: { kind: 'rain', tint: 'rose' } }]);
    expect(checkScene(rain, catalog, ctx({ text: 'Geht raus.' })).join('\n')).toMatch(/Regen-Kleidung .* nicht gedeckt/);
    expect(checkScene(rain, catalog, ctx({ text: 'Geht raus.', materials: ['rainBoots'] }))).toEqual([]);
  });

  it('Figuren, Tisch und Standlinie brauchen keine Deckung', () => {
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'back', figure: 'arne' }]), catalog, ctx({ text: 'Nichts.' }))).toEqual([]);
  });
});

describe('Posen mit Gegenstand (Haltepunkte)', () => {
  it('jede benannte Pose hat ein Übersichtsbild, und alle bestehen die Prüfung', () => {
    const shown = new Set(poseSheets.map((sheet) => sheet.pose));
    for (const name of holdPoseNames) expect(shown.has(name)).toBe(true);
    for (const sheet of poseSheets) expect([sheet.name, ...checkScene(sheet.scene, catalog)]).toEqual([sheet.name]);
  });

  it('die Hände sitzen an den Haltepunkten: Tablett an beiden Rändern, Teller von unten, Kanne am Henkel', () => {
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) < 1.5;
    const placed = placeItems(pair([{ slot: 'middle', figure: 'arne', pose: 'carry-tray', mitts: true, holds: { both: { block: 'tray' } } }]), catalog);
    const figure = placed?.[0].figure;
    expect(figure?.problems).toEqual([]);
    // Das Tablett ist 76 breit: Die Hände liegen 36 links und rechts der Mitte, auf gleicher Höhe
    const [left, right] = figure?.hands ?? [];
    expect(Math.abs(right.c.x - left.c.x - 72)).toBeLessThan(1);
    expect(Math.abs(right.c.y - left.c.y)).toBeLessThan(1);
    const jug = placeItems(pair([{ slot: 'middle', figure: 'arne', pose: 'pour', holds: { right: { block: 'jug', size: 0.75 } } }]), catalog)?.[0].figure;
    expect(jug?.problems).toEqual([]);
    expect(near(jug?.hands[1].c ?? { x: 0, y: 0 }, jug?.hands[1].c ?? { x: 1, y: 1 })).toBe(true);
  });

  it('erreicht eine Hand ihren Haltepunkt nicht, meldet der Prüfer das (mit dem Hinweis auf eine kleinere Größe)', () => {
    expect(checkScene(pair([{ slot: 'left', figure: 'nolli', pose: 'carry-tray', holds: { both: { block: 'tray' } } }]), catalog).join('\n')).toMatch(/Nolli erreicht .* Haltepunkt nicht .*0\.75/);
  });

  it('falsche Pose, falscher Gegenstand oder fehlender Haltepunkt: verständliche Meldung', () => {
    expect(checkScene(pair([{ slot: 'left', figure: 'jette', pose: 'fliegt' }]), catalog).join('\n')).toMatch(/Pose „fliegt“ gibt es nicht/);
    expect(checkScene(pair([{ slot: 'left', figure: 'jette', pose: 'stand', holds: { right: { block: 'plate' } } }]), catalog).join('\n')).toMatch(/Die Pose „stand“ hält nichts/);
    expect(checkScene(pair([{ slot: 'middle', figure: 'arne', pose: 'carry-tray', holds: { both: { block: 'plate' } } }]), catalog).join('\n')).toMatch(/keinen Haltepunkt „left“, „right“/);
    expect(checkScene(pair([{ slot: 'left', figure: 'jette', pose: 'write', holds: { right: { block: 'cotton-swab' } } }]), catalog).join('\n')).toMatch(/„write“ braucht einen Tisch/);
    expect(checkScene(pair([{ slot: 'middle', figure: 'arne', pose: 'hold-plate', holds: { right: { block: 'plate', content: 'water' } } }]), catalog).join('\n')).toMatch(/„water“ passt nicht in „plate“/);
    expect(checkScene(pair([{ slot: 'middle', figure: 'arne', size: 0.6 }]), catalog).join('\n')).toMatch(/Figuren haben immer Größe 1/);
  });
});

describe('Behälter mit Inhalt', () => {
  it('jeder Behälter mit allen Inhalten, die in ihn passen, besteht die Prüfung', () => {
    const sheets = containerSheets(catalog);
    for (const sheet of sheets) expect([sheet.name, ...checkScene(sheet.scene, catalog)]).toEqual([sheet.name]);
    const shown = new Set(sheets.flatMap((sheet) => sheet.scene.items.map((item) => `${item.block}/${item.content}`)));
    for (const content of [...catalog.values()].filter((entry) => entry.kind === 'content')) {
      for (const container of content.fits ?? []) expect(shown.has(`${container}/${content.id}`)).toBe(true);
    }
  });

  it('ein Inhalt in einem Behälter, in den er nicht passt, oder in einem Gegenstand ohne Öffnung: Fehler', () => {
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'tray', content: 'water' }]), catalog).join('\n')).toMatch(/„water“ passt nicht in „tray“/);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'cup', content: 'cookies' }]), catalog).join('\n')).toMatch(/„cup“ ist kein Behälter/);
  });
});

describe('Layout „hands“ (Nahaufnahme)', () => {
  const hands = (figure: string, extra: object = {}): Scene => ({
    layout: 'hands',
    items: [{ slot: 'object', block: 'plate', content: 'lemon-halves', size: 2, hands: { figure, pose: 'cut', tool: { block: 'knife', size: 0.75 }, ...extra } }],
  });

  it('die drei Beispiele bestehen; Hände gibt es nur in diesem Layout, und das Layout braucht Hände', () => {
    for (const name of ['hands-stir', 'hands-cut', 'hands-write']) expect(checkScene(scenes.get(name) as Scene, catalog)).toEqual([]);
    expect(checkScene(scene('hero', [{ slot: 'main', block: 'bowl', hands: { figure: 'jette', pose: 'hold' } }]), catalog).join('\n')).toMatch(/nur im Layout „hands“/);
    expect(checkScene(scene('hands', [{ slot: 'object', block: 'bowl' }]), catalog).join('\n')).toMatch(/braucht Hände/);
  });

  it('Messer in Nahaufnahme: Erwachsenenhände in Ordnung, Kinderhände ein Fehler', () => {
    const lemon = ctx({ ageMin: 6, ageMax: 12, materials: ['lemon', 'knife', 'plate'] });
    expect(checkScene(hands('arne'), catalog, lemon)).toEqual([]);
    expect(checkScene(hands('jette'), catalog, lemon).join('\n')).toMatch(/„knife“ \(scharf\) hält das Kind „jette“/);
  });

  it('Jettes Hände mit Petrol-Ärmel: Fehler (Platz 7 trägt auf Petrol nicht); Rosé geht', () => {
    const stir = (sleeve: 'petrol' | 'rose'): Scene => ({ layout: 'hands', items: [{ slot: 'object', block: 'bowl', tint: 'honey', content: 'dough', size: 1.5, hands: { figure: 'jette', pose: 'stir', sleeve, tool: { block: 'fork' } } }] });
    const activity = ctx({ ageMin: 4, text: 'Teig in der Schüssel mit der Gabel.' });
    expect(checkScene(stir('petrol'), catalog, activity).join('\n')).toMatch(/trägt auf Petrol nicht, aber .*Ärmel/);
    expect(checkScene(stir('rose'), catalog, activity)).toEqual([]);
  });
});

describe('Dateigröße', () => {
  it('über 14 KB meldet der Prüfer, statt etwas wegzulassen', () => {
    const big: Catalog = new Map(catalog);
    const heavy = (catalog.get('cup') as LoadedBlock).svg.repeat(20);
    (big as Map<string, LoadedBlock>).set('cup', { ...(catalog.get('cup') as LoadedBlock), svg: heavy });
    const many = scene('outdoor', ['s1', 's2', 's3', 's4'].map((slot) => ({ slot, block: 'cup', size: 0.6 })));
    expect(checkScene(many, big).join('\n')).toMatch(/Das Bild hat \d+\.\d KB, erlaubt sind höchstens 14 KB/);
  });

  it('alle Beispiel- und Übersichtsbilder bleiben unter 14 KB', () => {
    for (const example of [...scenes.values(), ...poseSheets.map((sheet) => sheet.scene), ...containerSheets(catalog).map((sheet) => sheet.scene)]) {
      expect(Buffer.byteLength(renderSceneSvg(example, catalog))).toBeLessThan(maxSceneBytes);
    }
  });
});

describe('Abdeckung (kit:coverage)', () => {
  const labels = { bowl: { de: 'Schüssel', en: 'Bowl' }, pencils: { de: 'Stifte', en: 'Pencils' }, pot: { de: 'Topf', en: 'Pot' } };
  const activity = (id: string, materials: string[], text: string) => ({ id, materials, translations: { de: { title: id, summary: text, steps: [] }, en: { title: id, summary: '', steps: [] } } });

  it('zählt Material und Nennung im Text, ordnet Bausteine über ihr Material zu', () => {
    const coverage = buildCoverage([activity('a', ['bowl'], ''), activity('b', [], 'Nehmt eure Filzstifte.'), activity('c', [], 'Ein Spot.')], catalog, labels);
    const row = (key: string) => coverage.materials.find((entry) => entry.key === key);
    expect(row('bowl')).toMatchObject({ inMaterials: 1, inTextOnly: 0, blocks: ['bowl'] });
    expect(row('pencils')).toMatchObject({ inMaterials: 0, inTextOnly: 1, blocks: [] });
    expect(row('pot')).toBeUndefined(); // „pot“ steckt nicht am Wortanfang von „Spot“
    expect(coverage.activities.find((entry) => entry.id === 'a')).toMatchObject({ objects: 1, withBlock: 1 });
    expect(coverageMarkdown(coverage, catalog.size, 0)).toMatch(/Stifte \(`pencils`, 1\)/);
  });

  it('Wortstamm und Suche im Text', () => {
    expect(stem('Kastanien')).toBe('kastanie');
    expect(stem('Stifte')).toBe('stift');
    expect(mentions('nehmt filzstifte', 'stift', 'de')).toBe(true);
    expect(mentions('a spot', 'pot', 'en')).toBe(false);
    expect(mentions('the pot', 'pot', 'en')).toBe(true);
  });

  it('docs/bausteine/ABDECKUNG.md passt zu Daten und Katalog (npm run kit:coverage)', () => {
    const de = JSON.parse(readFileSync(join(root, 'src/locales/de.json'), 'utf8')) as { materials: Record<string, string> };
    const en = JSON.parse(readFileSync(join(root, 'src/locales/en.json'), 'utf8')) as { materials: Record<string, string> };
    const all = Object.fromEntries(Object.keys(de.materials).map((key) => [key, { de: de.materials[key], en: en.materials[key] ?? key }]));
    const markdown = coverageMarkdown(buildCoverage(loadActivityData().activities, catalog, all), catalog.size, 0);
    expect(readFileSync(join(root, 'docs/bausteine/ABDECKUNG.md'), 'utf8') === markdown ? '' : 'veraltet: ABDECKUNG.md').toBe('');
  });
});

describe('Zeichnen', () => {
  // Die Farbplätze der Zeichnungs-Palette und alles, was Bildregeln verbieten (ILLUSTRATIONEN.md).
  const palette = new Set(Object.values(illustrationPalette).map((color) => color.toUpperCase()));
  const forbidden = /<(text|image|style|script|use|defs|filter|mask|clipPath|linearGradient|radialGradient)\b|href=|url\(|opacity=/;

  it.each([...scenes.entries()])('Beispielszene %s: mit Platzhaltern, ohne Reste und ohne verbotenen Code', (_name, example) => {
    const template = renderSceneTemplate(example, catalog);
    expect(template.match(/\{\{([a-z0-9]+)\}\}/g)?.every((token) => /^\{\{(ground|paper|ink|rose|petrol|honey|brown|skin[1-8])\}\}$/.test(token))).toBe(true);
    const svg = renderSceneSvg(example, catalog);
    expect(svg).not.toMatch(/\{\{|\}\}/);
    expect(svg).not.toMatch(forbidden);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1200" height="600" viewBox="0 0 400 200">/);
    expect(Buffer.byteLength(svg)).toBeLessThan(maxSceneBytes);
    for (const color of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(palette).toContain(color.toUpperCase());
  });

  it('Linienstärken: Gegenstände sichtbar immer 4 oder 2,5 (auch verkleinert und gedreht), Figuren und Hände 5 oder 2,5', () => {
    const all = [...scenes.values(), ...poseSheets.map((sheet) => sheet.scene), ...containerSheets(catalog).map((sheet) => sheet.scene)];
    for (const example of all) {
      const svg = renderSceneSvg(example, catalog);
      // Gruppen ineinander: die sichtbare Stärke ist die eingetragene mal alle Vergrößerungen der umgebenden Gruppen
      const stack: { scale: number; figure: boolean }[] = [{ scale: 1, figure: false }];
      for (const token of svg.matchAll(/<g\b([^>]*)>|<\/g>|stroke-width="([\d.]+)"/g)) {
        if (token[0] === '</g>') stack.pop();
        else if (token[1] !== undefined) {
          const outer = stack[stack.length - 1];
          const own = Math.abs(Number(/scale\((-?[\d.]+)/.exec(token[1])?.[1] ?? 1));
          stack.push({ scale: outer.scale * own, figure: !token[1].includes('transform=') });
        } else {
          const { scale, figure } = stack[stack.length - 1];
          const visible = Number(token[2]) * scale;
          expect([figure ? 5 : 4, 2.5].some((width) => Math.abs(visible - width) < 0.05) ? '' : `${visible} (Figur: ${figure})`).toBe('');
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
    for (const folder of ['vorschau', 'vorschau/beispiele', 'vorschau/posen', 'vorschau/behaelter']) {
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

describe('Probebilder (Schritt 3b)', () => {
  const probe = loadProbe(root);
  const activities = new Map<string, ProbeActivity>([...loadActivityData().activities, ...probe.extra].map((activity) => [activity.id, activity as ProbeActivity]));

  it('die fünf Aktivitäten aus dem Plan, jede mit Bewertung; alle bestehen alle Regeln mit ihrem Text', () => {
    expect([...probe.scenes.keys()].sort()).toEqual(['baked-apples', 'banana-oat-balls', 'dance-freeze', 'puddle-explorers', 'secret-lemon-ink']);
    for (const [name, scene] of probe.scenes) {
      const activity = activities.get(scene.activity);
      expect(activity).toBeDefined();
      expect([name, ...checkScene(scene, catalog, contextFromActivity(activity as ProbeActivity))]).toEqual([name]);
      for (const part of [scene.review.carries, scene.review.missing, scene.review.check]) expect(part.length).toBeGreaterThan(0);
    }
  });

  it('Bratäpfel: Der Text nennt keinen Teller, der Teller ist aber neutral; mit heißem Inhalt in Kinderhand fällt er durch', () => {
    const baked = activities.get('baked-apples') as ProbeActivity;
    const withPlate = (held: object): Scene => ({
      layout: 'pair',
      items: [
        { slot: 'middle', figure: 'arne', pose: 'carry-tray', mitts: true, holds: { both: { block: 'baking-tray', content: 'baked-apples', hot: true, size: 0.75 } } },
        { slot: 'right', figure: 'jette', pose: 'hold-plate', holds: { right: { block: 'plate', size: 0.75, ...held } } },
      ],
    });
    const context = contextFromActivity(baked);
    expect(/teller|plate/i.test(Object.values(context.text).join(' '))).toBe(false);
    // leerer Teller: neutral, braucht keinen Text
    expect(checkScene(withPlate({}), catalog, context)).toEqual([]);
    // abgekühlter Bratapfel auf dem Teller: der Inhalt ist über „Apfel“ gedeckt
    expect(checkScene(withPlate({ content: 'baked-apples' }), catalog, context)).toEqual([]);
    // heißer Inhalt in Kinderhand: nicht mehr neutral und nicht erlaubt
    const hot = checkScene(withPlate({ content: 'baked-apples', hot: true }), catalog, context).join('\n');
    expect(hot).toMatch(/„plate“ \(heiß\) ist nicht in der Hand eines Erwachsenen/);
    expect(hot).toMatch(/„plate“ ist im Text der Aktivität nicht gedeckt/);
  });

  it('neutral heißt nur: muss nicht im Text stehen; heiße Kekse auf dem Teller machen ihn nicht neutral', () => {
    const hotCookies = scene('table', [{ slot: 'table', block: 'table' }, { slot: 'on2', block: 'plate', content: 'cookies', hot: true, size: 0.6 }, { slot: 'right', figure: 'jette', pose: 'curious' }]);
    const problems = checkScene(hotCookies, catalog, ctx({ text: 'Kekse backen', ageMin: 4, ageMax: 8 })).join('\n');
    expect(problems).toMatch(/„plate“ ist im Text der Aktivität nicht gedeckt/);
    expect(problems).toMatch(/„plate“ \(heiß\) ist nicht in der Hand eines Erwachsenen/);
    const pillows = scene('table', [{ slot: 'table', block: 'table' }, { slot: 'left', block: 'pillow' }, { slot: 'on2', block: 'plate', size: 0.6 }, { slot: 'right', figure: 'jette', pose: 'curious' }]);
    expect(checkScene(pillows, catalog, ctx({ text: 'Malen', ageMin: 4, ageMax: 8 }))).toEqual([]);
  });

  it('Unterscheidbarkeit: mindestens vier Layouts, mittlere Überschneidung unter einem Drittel', () => {
    const scenes = [...probe.scenes.values()];
    expect(new Set(scenes.map((scene) => scene.layout)).size).toBeGreaterThanOrEqual(4);
    const sets = scenes.map(elementsOf);
    const pairs = sets.flatMap((a, i) => sets.slice(i + 1).map((b) => similarity(a, b)));
    expect(pairs.reduce((sum, value) => sum + value, 0) / pairs.length).toBeLessThan(1 / 3);
    expect(similarity(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3);
  });

  it('die Vorschauseite PROBE.md und ihre Bilder passen zum Code (npm run kit:preview) und nennen Titel, Sicherheitshinweis und Prüfergebnis', () => {
    const files = buildProbeFiles(catalog, probe, activities);
    for (const file of files) expect(readFileSync(join(root, file.path), 'utf8') === file.content ? '' : `veraltet: ${file.path}`).toBe('');
    const page = files.find((file) => file.path.endsWith('PROBE.md'))?.content ?? '';
    for (const [, scene] of probe.scenes) {
      const de = (activities.get(scene.activity) as ProbeActivity).translations.de;
      expect(page).toContain(`## ${de.title}`);
      expect(page).toContain(de.safetyNote as string);
    }
    expect(page.match(/\*\*Prüfergebnis:\*\* bestanden/g)).toHaveLength(5);
    for (const name of readdirSync(join(root, 'docs/bausteine/probe'))) expect(files.some((file) => file.path === `docs/bausteine/probe/${name}`)).toBe(true);
  });
});

describe('Lose Inhalte und Überdeckung (Schritt 3b)', () => {
  it('Haferkugeln und Zitronenhälften liegen lose auf dem Tisch oder neben der Nahaufnahme, sonst nur im Behälter', () => {
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'on1', block: 'oat-balls' }]), catalog)).toEqual([]);
    expect(checkScene(scene('hands', [{ slot: 'object', block: 'bowl', hands: { figure: 'arne', pose: 'hold' } }, { slot: 'left', block: 'lemon-halves' }]), catalog)).toEqual([]);
    expect(checkScene(scene('outdoor', [{ slot: 's1', block: 'oat-balls' }]), catalog).join('\n')).toMatch(/lose auf der Tischplatte/);
    expect(checkScene(scene('table', [{ slot: 'table', block: 'table' }, { slot: 'on1', block: 'dough' }]), catalog).join('\n')).toMatch(/steht nur in einem Behälter/);
    expect(checkBlock({ ...(catalog.get('dough') as LoadedBlock), loose: true }).join('\n')).toMatch(/Fläche .* kann nicht lose liegen/);
  });

  it('bei Figuren zählt für die Überdeckung nur der Körper: Ein Stock darf in die Pfütze reichen', () => {
    const poke = scene('outdoor', [{ slot: 's3', figure: 'jette', pose: 'hold-plate', flip: false, holds: { right: { block: 'stick', size: 0.6 } } }, { slot: 's4', block: 'puddle' }]);
    expect(checkScene(poke, catalog)).toEqual([]);
    const figure = placeItems(poke, catalog)?.[0].figure;
    // Der Rahmen mit Stock reicht weiter nach rechts als der Körper; für Rand und Ecken zählt der ganze Rahmen
    expect((figure?.box.maxX ?? 0) - (figure?.bodyBox.maxX ?? 0)).toBeGreaterThan(15);
  });
});
