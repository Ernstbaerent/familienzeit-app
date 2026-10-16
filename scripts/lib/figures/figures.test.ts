// Figuren-Rig (M9b): Maße, Rechnung (Arm mit zwei Gliedern), Posen, die zwei Fassungen (ohne und mit Augen), die Zeichnungen und die Vorschau.
// Ob die Figuren als Charaktere funktionieren (Wiedererkennung, Anmutung), sieht ein Mensch auf der Vorschau (docs/design/figuren/VORSCHAU.md).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { contrastRatio } from '../../../src/lib/contrast';
import { illustrationPalette } from '../../../src/lib/palette';
import { checkAgainstActivity, type Placement } from '../kit/scene';
import type { LoadedBlock } from '../kit/types';
import { cast } from './cast';
import { animalBannedHazards, figureAges, figureFitsActivity } from './castRules';
import { capsule, fmt, fromAngles, length, rotate, solveArm, sub, vec } from './math';
import { nameChecks, nameProposals, rejectedNames } from './names';
import { buildPet, petPoseNames } from './pets';
import { buildFigurePreview, figuresDir, legibilityLines, rigData, sizeLimit, sizeLimitSteps } from './preview';
import { plateCenter, poseNames, poseOf, trayCenter, trayWidth } from './poses';
import { buildHuman, legLength, standHeight, type HumanSpec, type Pose } from './rig';
import { childTriptych, familyAtTable, humanInPose, humanSheet, lineup, petSheet } from './scenes';
import { eyeColorOn, skinContrast, skinPalette, skinVariants } from './skin';

const root = join(__dirname, '../../..');
const humans = cast.humans;
const pets = cast.pets;

describe('Besetzung', () => {
  it('fünf Menschen (Nolli, Jette, Mats, Ilka, Arne) und zwei Tiere (Tüpfel die Katze, Stups der Vogel)', () => {
    expect(humans.map((h) => h.spec.name)).toEqual(['Nolli', 'Jette', 'Mats', 'Ilka', 'Arne']);
    expect(humans.map((h) => h.spec.role)).toEqual(['toddler', 'child', 'teen', 'adult', 'adult']);
    expect(pets.map((p) => `${p.spec.name}:${p.spec.kind}`)).toEqual(['Tüpfel:cat', 'Stups:bird']);
  });

  it('sieben verschiedene kurze Namen, alle in der Namensprüfung, keiner wie „Miki“, keiner abgelehnt', () => {
    const names = [...humans.map((h) => h.spec.name), ...pets.map((p) => p.spec.name)];
    expect(new Set(names).size).toBe(7);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(6);
      expect(name.toLowerCase().startsWith('mi')).toBe(false);
      expect(nameChecks.has(name)).toBe(true);
      expect(rejectedNames.map((r) => r.name)).not.toContain(name);
    }
    for (const name of [...nameProposals.papa, ...nameProposals.boy]) expect(nameChecks.has(name)).toBe(true);
  });

  it('Alter und Größe: Nolli ≈3, Jette ≈7, Mats ≈11, deutlich gestaffelt; Erwachsene bleiben unter den oberen Ecken der Karte', () => {
    const by = Object.fromEntries(humans.map((h) => [h.spec.id, h]));
    expect([by.nolli.ageYears, by.jette.ageYears, by.mats.ageYears]).toEqual([3, 7, 11]);
    const h = (id: string) => standHeight(by[id].spec);
    expect(h('jette')).toBeGreaterThan(h('nolli') * 1.25);
    expect(h('mats')).toBeGreaterThan(h('jette') * 1.15);
    expect(h('mats')).toBeGreaterThan(h('nolli') * 1.5);
    expect(h('ilka')).toBeGreaterThan(h('mats') * 1.1);
    expect(h('arne')).toBeGreaterThan(h('ilka'));
    for (const id of ['ilka', 'arne']) expect(h(id)).toBeLessThanOrEqual(125); // Standlinie 176, Ecken bis 56
  });

  it('Regel Figur und Altersspanne: Nolli 0 bis 4, Jette 3 bis 9, Mats 8 bis 16; Erwachsene und Tiere jede', () => {
    expect(figureAges.nolli.fits).toEqual([0, 4]);
    expect(figureAges.jette.fits).toEqual([3, 9]);
    expect(figureAges.mats.fits).toEqual([8, 16]);
    expect(figureFitsActivity('nolli', 5, 12)).toBe(false);
    expect(figureFitsActivity('nolli', 2, 6)).toBe(true);
    expect(figureFitsActivity('mats', 3, 7)).toBe(false);
    expect(figureFitsActivity('mats', 6, 12)).toBe(true);
    expect(figureFitsActivity('ilka', 0, 2)).toBe(true);
    expect(figureFitsActivity('stups', 0, 2)).toBe(true);
  });

  it('Satz C: Linien-Glieder, Kleid oder schlanker Rumpf, Kleidung und Haare nur in Farben der Palette', () => {
    for (const { spec } of humans) {
      expect(spec.limb.style).toBe('line');
      expect(['dress', 'slim']).toContain(spec.torso);
      expect(['petrol', 'rose', 'paper', 'ink']).toContain(spec.colors.top);
      expect(['petrol', 'rose', 'paper', 'ink']).toContain(spec.colors.bottom);
      expect(spec.colors.hair).toBe('ink');
    }
  });
});

describe('Hautton', () => {
  const hue = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    if (d === 0) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };

  it('drei Varianten A, B, C mit fünf Plätzen; jede Figur hat einen Platz, in A hat jede einen eigenen', () => {
    expect(skinVariants.map((v) => v.id)).toEqual(['A', 'B', 'C']);
    for (const v of skinVariants) expect(v.tones).toHaveLength(5);
    expect(new Set(humans.map((h) => h.spec.skin)).size).toBe(5);
    expect(new Set(skinVariants[0].tones).size).toBe(5);
    expect(new Set(skinVariants[1].tones).size).toBe(1);
    expect(new Set(skinVariants[2].tones).size).toBe(1);
  });

  it('kein Gelb: kein Ton hat einen Farbton zwischen 45° und 75°; A und B sind warm (10° bis 35°), C blaugrau (190° bis 230°)', () => {
    for (const v of skinVariants) for (const tone of v.tones) expect(hue(tone) < 45 || hue(tone) > 75).toBe(true);
    for (const tone of [...skinVariants[0].tones, ...skinVariants[1].tones]) {
      expect(hue(tone)).toBeGreaterThanOrEqual(10);
      expect(hue(tone)).toBeLessThanOrEqual(35);
    }
    expect(hue(skinVariants[2].tones[0])).toBeGreaterThanOrEqual(190);
    expect(hue(skinVariants[2].tones[0])).toBeLessThanOrEqual(230);
  });

  it('A geht von hell nach dunkel; jeder Ton trägt den Tinten-Umriss (mindestens 3:1) und den Augenpunkt (mindestens 3:1)', () => {
    const tones = skinVariants[0].tones;
    for (let i = 1; i < tones.length; i++) expect(contrastRatio(tones[i], '#FFFFFF')).toBeGreaterThan(contrastRatio(tones[i - 1], '#FFFFFF'));
    for (const v of skinVariants) {
      for (const tone of v.tones) {
        const c = skinContrast(tone);
        expect(c.ink).toBeGreaterThanOrEqual(3);
        expect(c.eyeContrast).toBeGreaterThanOrEqual(3);
        expect(c.eye).toBe(eyeColorOn(tone));
      }
    }
  });

  it('die Palette einer Variante hat alle Zeichnungsfarben plus skin1 bis skin5 und eye1 bis eye5', () => {
    for (const v of skinVariants) {
      const p = skinPalette(v);
      for (const key of Object.keys(illustrationPalette)) expect(p[key]).toBe(illustrationPalette[key as keyof typeof illustrationPalette]);
      for (let i = 1; i <= 5; i++) {
        expect(p[`skin${i}`]).toBe(v.tones[i - 1]);
        expect([illustrationPalette.ink, illustrationPalette.paper]).toContain(p[`eye${i}`]);
      }
    }
  });
});

describe('Rechnung', () => {
  it('Drehung um 90°: (1 0) wird zu (0 1)', () => {
    const p = rotate(vec(1, 0), 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });

  it('Zahlen mit höchstens einer Nachkommastelle, ohne „-0“', () => {
    expect(fmt(1.2345)).toBe('1.2');
    expect(fmt(3)).toBe('3');
    expect(fmt(-0.04)).toBe('0');
  });

  it('Arm mit zwei Gliedern: erreichbares Ziel wird getroffen, Gliedlängen bleiben', () => {
    const s = vec(0, 0);
    const t = vec(18, 12);
    const { elbow, hand } = solveArm(s, t, 15, 14, 1, 'down');
    expect(length(sub(hand, t))).toBeLessThan(0.01);
    expect(length(sub(elbow, s))).toBeCloseTo(15, 5);
    expect(length(sub(hand, elbow))).toBeCloseTo(14, 5);
  });

  it('zu weites Ziel: der Arm streckt sich zum Ziel hin', () => {
    const { hand, elbow } = solveArm(vec(0, 0), vec(100, 0), 10, 10, 1, 'down');
    expect(hand.x).toBeGreaterThan(19.9);
    expect(hand.x).toBeLessThan(20);
    expect(Math.abs(elbow.y)).toBeLessThan(0.5);
  });

  it('Ellbogen nach unten, oben oder außen', () => {
    const args = [vec(0, 0), vec(14, 0), 12, 12] as const;
    expect(solveArm(...args, 1, 'down').elbow.y).toBeGreaterThan(0);
    expect(solveArm(...args, 1, 'up').elbow.y).toBeLessThan(0);
    expect(solveArm(vec(0, 0), vec(8, 14), 12, 12, 1, 'out').elbow.x).toBeGreaterThan(solveArm(vec(0, 0), vec(8, 14), 12, 12, 1, 'down').elbow.x - 0.0001);
  });

  it('Glieder aus Winkeln: Länge bleibt, 0° zeigt nach unten, außen ist je nach Seite links oder rechts', () => {
    const r = fromAngles(vec(0, 0), 0, 0, 10, 8, 1);
    expect(r.end.x).toBeCloseTo(0);
    expect(r.end.y).toBeCloseTo(18);
    const right = fromAngles(vec(0, 0), 90, 0, 10, 0, 1).mid;
    const left = fromAngles(vec(0, 0), 90, 0, 10, 0, -1).mid;
    expect(right.x).toBeCloseTo(10);
    expect(left.x).toBeCloseTo(-10);
  });

  it('Kapsel: ein geschlossener Pfad mit absoluten Befehlen', () => {
    const d = capsule(vec(0, 0), vec(10, 0), 3);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toMatch(/^[MLCZ0-9 .\-]+$/);
  });
});

describe('Posen', () => {
  it.each(humans.map((h) => [h.spec.name, h] as const))('%s: alle Posen rechnen sauber (keine ungültigen Zahlen)', (_label, h) => {
    for (const name of poseNames) {
      const r = buildHuman(h.spec, poseOf(h.spec, name, h.quirk), { x: 100, y: 176, eyes: true });
      expect(r.svg).not.toMatch(/NaN|Infinity|undefined/);
      expect(r.svg.length).toBeGreaterThan(200);
    }
  });

  it.each(humans.map((h) => [h.spec.name, h] as const))('%s: beim Tablett sitzen die Hände an den Rändern', (_label, h) => {
    const r = buildHuman(h.spec, poseOf(h.spec, 'tray', h.quirk), { x: 100, y: 176 });
    const c = trayCenter(h.spec);
    const half = trayWidth(h.spec) / 2 - 3;
    // Das Ziel liegt in Reichweite: Die Hände treffen die Ränder auf eine Einheit genau.
    expect(length(sub(r.anchors.handL, vec(100 - half, 176 + c.y + 2)))).toBeLessThan(1);
    expect(length(sub(r.anchors.handR, vec(100 + half, 176 + c.y + 2)))).toBeLessThan(1);
  });

  it.each(humans.map((h) => [h.spec.name, h] as const))('%s: „hält etwas“ legt die Hand an den Teller', (_label, h) => {
    const r = buildHuman(h.spec, poseOf(h.spec, 'hold', h.quirk), { x: 100, y: 176 });
    const c = plateCenter(h.spec);
    expect(length(sub(r.anchors.handR, vec(100 + c.x, 176 + c.y + 5)))).toBeLessThan(1);
  });

  it.each(humans.map((h) => [h.spec.name, h] as const))('%s: beim Jubeln sind beide Hände über dem Kopf', (_label, h) => {
    const r = buildHuman(h.spec, poseOf(h.spec, 'cheer', h.quirk), { x: 100, y: 176 });
    expect(r.anchors.handL.y).toBeLessThan(r.anchors.head.y);
    expect(r.anchors.handR.y).toBeLessThan(r.anchors.head.y);
  });

  it('beim Stehen stehen die Füße auf der Standlinie', () => {
    for (const h of humans) {
      const r = buildHuman(h.spec, poseOf(h.spec, 'stand', h.quirk), { x: 100, y: 176 });
      expect(r.anchors.footL.y).toBeGreaterThan(176 - 3);
      expect(r.anchors.footL.y).toBeLessThanOrEqual(176 + 0.5);
      expect(legLength(h.spec)).toBeGreaterThan(0);
    }
  });

  it('Posen sind Daten: aus JSON gelesen ergeben sie dasselbe Bild', () => {
    const data = rigData() as { humans: { spec: HumanSpec; poses: Record<string, Pose> }[] };
    const parsed = JSON.parse(JSON.stringify(data)) as typeof data;
    humans.forEach((h, hi) => {
      const copy = parsed.humans[hi];
      for (const name of poseNames) {
        const a = buildHuman(h.spec, poseOf(h.spec, name, h.quirk), { x: 90, y: 176 }).svg;
        const b = buildHuman(copy.spec, copy.poses[name], { x: 90, y: 176 }).svg;
        expect(b).toBe(a);
      }
    });
  });

  it('Tiere: alle sechs Posen (steht, sitzt, hüpft, Schulter, zeigt, schaut zu) rechnen sauber', () => {
    expect(petPoseNames).toEqual(['stand', 'sit', 'hop', 'shoulder', 'point', 'watch']);
    for (const p of pets) {
      for (const pose of petPoseNames) {
        const svg = buildPet(p.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
        expect(svg.length).toBeGreaterThan(300);
      }
    }
  });
});

describe('Zwei Fassungen aus demselben Rig', () => {
  const humanEye = /<circle cx="[\d.\-]+" cy="[\d.\-]+" r="[\d.]+" fill="\{\{eye\d\}\}" stroke="none"\/>/g;
  const petEye = /<circle cx="[\d.\-]+" cy="[\d.\-]+" r="[\d.]+" fill="\{\{ink\}\}" stroke="none"\/>/g;

  it('mit Augen ist genau „ohne“ plus zwei Punkte (Menschen)', () => {
    for (const h of humans) {
      for (const name of poseNames) {
        const pose = poseOf(h.spec, name, h.quirk);
        const without = buildHuman(h.spec, pose, { x: 100, y: 176, eyes: false }).svg;
        const withEyes = buildHuman(h.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(withEyes.match(humanEye)?.length).toBe(2);
        expect(without.match(humanEye)).toBeNull();
        expect(withEyes.replace(humanEye, '')).toBe(without);
      }
    }
  });

  it('mit Augen ist genau „ohne“ plus zwei Punkte (Tiere)', () => {
    for (const p of pets) {
      for (const pose of petPoseNames) {
        const without = buildPet(p.spec, pose, { x: 100, y: 176, eyes: false }).svg;
        const withEyes = buildPet(p.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(withEyes.match(petEye)?.length).toBe(2);
        expect(withEyes.replace(petEye, '')).toBe(without);
      }
    }
  });

  it('die Augen sind nur Punkte: sonst kein Gesichtszug', () => {
    const svg = humanInPose(humans[0].spec, humans[0].quirk, 'stand', 100, { eyes: true });
    expect(svg.match(humanEye)?.length).toBe(2);
  });
});

describe('Tier-Regel', () => {
  // Ein Baustein und eine Platzierung mit den Feldern, die die Regel liest.
  const block = (id: string, extra: Partial<LoadedBlock>): Placement =>
    ({ item: { slot: 's', block: id }, slot: {}, x: 100, y: 176, size: 1, flip: false, tint: undefined, block: { id, group: 'x', kind: 'object', hazards: [], materials: [], terms: { de: [], en: [] }, neutral: true, svg: '', box: { x0: -10, x1: 10, h: 10 }, label: { de: id, en: id }, ...extra } }) as unknown as Placement;
  const activity = (materials: string[]) => ({ materials, ageMin: 4, ageMax: 9, text: { de: '', en: '' }, safety: { de: 'nur mit Erwachsenen', en: '' } });
  const cat = block('cat', { kind: 'figure', animal: true });

  it('Szenenprüfer und Regel nennen genau Hitze, Feuer, Messer und Schere', () => {
    expect([...animalBannedHazards]).toEqual(['sharp', 'heat', 'fire']);
  });

  it('Tier und Schere (scharf) im selben Bild: Verstoß', () => {
    const problems = checkAgainstActivity([cat, block('scissors', { hazards: ['sharp'] })], activity([])).join('\n');
    expect(problems).toMatch(/Ein Tier im Bild/);
  });

  it('Tier und Material mit Hitze (Backofen, Herd), Messer oder Kerze in der Aktivität: Verstoß', () => {
    for (const material of ['oven', 'stove', 'knife', 'scissors']) expect(checkAgainstActivity([cat], activity([material])).join('\n')).toMatch(/Ein Tier im Bild.*Tiere nie bei Hitze/);
  });

  it('Tier mit harmlosem Material: kein Verstoß; ohne Tier verhindert die Regel nichts', () => {
    expect(checkAgainstActivity([cat], activity(['paper']))).toEqual([]);
    expect(checkAgainstActivity([block('oven', { hazards: ['heat'] })], activity(['oven'])).join('\n')).not.toMatch(/Ein Tier/);
  });
});

describe('Zeichnungen und Vorschau', () => {
  const preview = buildFigurePreview();
  const svgs = preview.filter((file) => file.path.endsWith('.svg'));
  const tones = new Set(skinVariants.flatMap((v) => v.tones).map((c) => c.toUpperCase()));
  const palette = new Set([...Object.values(illustrationPalette).map((c) => c.toUpperCase()), ...tones]);

  it('erzeugt je Variante und Fassung Besetzung, Blätter, Tiere, Familie und Triptychen, dazu die Lesbarkeitsprobe', () => {
    // je Variante und Fassung: 1 Besetzung + 5 Figurenblätter + 4 Tierblätter + 1 Familie + 9 Triptychon-Bilder = 20; × 3 × 2 + 3 Lesbarkeit
    expect(svgs).toHaveLength(3 * 2 * 20 + legibilityLines.length);
  });

  it.each(svgs.map((file) => [file.path.replace(`${figuresDir}/`, ''), file.content] as const))('%s: nur erlaubter SVG-Code, nur Palette (plus Hautton), nur die vorgesehenen Linienstärken, Größe unter der Grenze', (path, svg) => {
    expect(svg).not.toMatch(/\{\{|\}\}/);
    expect(svg).not.toMatch(/<(text|image|style|script|use|defs|filter|mask|clipPath|linearGradient|radialGradient)\b|href=|url\(|opacity=|NaN/);
    for (const tag of svg.match(/<([a-zA-Z]+)/g) ?? []) expect(['<svg', '<rect', '<circle', '<g', '<path', '<ellipse']).toContain(tag);
    for (const color of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(palette).toContain(color.toUpperCase());
    const lesbar = path.match(/lesbar-(\d)\.svg$/);
    const allowed = lesbar ? [lesbar[1], '2.5', '4'] : ['4', '2.5'];
    for (const m of svg.matchAll(/stroke-width="([\d.]+)"/g)) expect(allowed).toContain(m[1]);
    expect(svg.match(/<g\b/g)?.length).toBe(svg.match(/<\/g>/g)?.length);
    // Titelbild-Grenze 10 KB für einzelne Szenen; Blätter (mehrere Posen) und „Familie am Tisch“ (fünf Menschen) bis 14 KB wie Schrittbilder
    const isScene = /-(besetzung|[a-z]+-tri\d)\.svg$|lesbar-/.test(path);
    expect(Buffer.byteLength(svg)).toBeLessThan(isScene ? sizeLimit : sizeLimitSteps);
  });

  it('Blätter, Besetzung, Familie und Triptychen entstehen aus denselben Funktionen wie die Vorschau', () => {
    const [a, b] = [skinVariants[0], skinVariants[2]];
    const find = (name: string) => preview.find((f) => f.path.endsWith(`vorschau/${name}`))?.content;
    expect(humanSheet(humans[1], false, a)).toBe(find('A-ohne-jette.svg'));
    expect(petSheet(pets[1], true, b, 1)).toBe(find('C-augen-stups-2.svg'));
    expect(lineup(true, a)).toBe(find('A-augen-besetzung.svg'));
    expect(familyAtTable(false, b)).toBe(find('C-ohne-familie.svg'));
    expect(childTriptych('mats', false, a).map((p) => p.svg)).toEqual([1, 2, 3].map((i) => find(`A-ohne-mats-tri${i}.svg`)));
  });

  it('die eingecheckten Dateien passen zum Code (npm run figures:preview)', () => {
    for (const file of preview) {
      const target = join(root, file.path);
      expect(existsSync(target)).toBe(true);
      expect(readFileSync(target, 'utf8') === file.content ? '' : `veraltet: ${file.path}`).toBe('');
    }
    const wanted = new Set(preview.map((f) => f.path));
    for (const name of readdirSync(join(root, figuresDir, 'vorschau')).filter((n) => n.endsWith('.svg'))) {
      expect(wanted.has(`${figuresDir}/vorschau/${name}`) ? '' : `überflüssig: ${name}`).toBe('');
    }
  });

  it('FIGUREN.md nennt jeden Namen, jeden abgelehnten Namen, die Tier-Regel und die Namensvorschläge', () => {
    const text = readFileSync(join(root, 'docs/design/FIGUREN.md'), 'utf8');
    for (const h of humans) expect(text).toContain(h.spec.name);
    for (const p of pets) expect(text).toContain(p.spec.name);
    for (const r of rejectedNames) expect(text).toContain(r.name);
    for (const name of [...nameProposals.papa, ...nameProposals.boy]) expect(text).toContain(name);
    expect(text).toMatch(/nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung/);
  });

  it('eine Szene mit Kindern bekommt nur die Figuren, die zur Altersspanne passen (Beispiel Familie und Triptychon)', () => {
    expect(humans.filter((h) => figureFitsActivity(h.spec.id, 4, 9)).map((h) => h.spec.name)).toEqual(['Nolli', 'Jette', 'Mats', 'Ilka', 'Arne']);
    expect(humans.filter((h) => figureFitsActivity(h.spec.id, 10, 16)).map((h) => h.spec.name)).toEqual(['Mats', 'Ilka', 'Arne']);
    expect(humans.filter((h) => figureFitsActivity(h.spec.id, 0, 2)).map((h) => h.spec.name)).toEqual(['Nolli', 'Ilka', 'Arne']);
  });
});
