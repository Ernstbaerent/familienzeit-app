// Figuren-Rig (M9b): Maße, Rechnung (Arm mit zwei Gliedern), Posen, Hauttöne, Tier-Regel, Zeichnungen und Vorschau.
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
import { nameChecks, rejectedNames } from './names';
import { buildPet, petPosesOf } from './pets';
import { buildFigurePreview, figuresDir, legibilityLines, rigData, sizeLimit } from './preview';
import { expressionNames, plateCenter, poseNames, poseOf, trayCenter, trayWidth } from './poses';
import { buildHuman, figureLine, legLength, standHeight, type HumanSpec, type Pose } from './rig';
import { childTriptych, expressionSheet, familyAtTable, humanInPose, humanSheet, lineup, petSheet } from './scenes';
import { backgrounds, eyeColorOn, skinCarriesOn, skinContrast, skinPalette, skinTones, toneCarries, toneOf, type SkinSlot } from './skin';

const root = join(__dirname, '../../..');
const humans = cast.humans;
const pets = cast.pets;
const by = Object.fromEntries(humans.map((h) => [h.spec.id, h]));

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
  });

  it('Alter und Größe: Nolli ≈3, Jette ≈7, Mats ≈11, deutlich gestaffelt; Erwachsene bleiben unter den oberen Ecken der Karte', () => {
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
    expect(humans.filter((h) => figureFitsActivity(h.spec.id, 10, 16)).map((h) => h.spec.name)).toEqual(['Mats', 'Ilka', 'Arne']);
    expect(humans.filter((h) => figureFitsActivity(h.spec.id, 0, 2)).map((h) => h.spec.name)).toEqual(['Nolli', 'Ilka', 'Arne']);
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

  it('Stups ist etwa 50 Einheiten hoch (steht, sitzt; beim Hüpfen kommt der Sprung dazu), Tüpfel kleiner Cameo mit drei Posen', () => {
    expect(petPosesOf('bird')).toEqual(['stand', 'sit', 'hop', 'shoulder', 'point', 'watch']);
    expect(petPosesOf('cat')).toEqual(['stand', 'sit', 'watch']);
    const stups = pets.find((p) => p.spec.id === 'stups')!.spec;
    // Höhe aus den Koordinaten der Pfade (oberster Punkt über der Standlinie 176; Steuerpunkte können etwas überstehen)
    for (const pose of ['stand', 'sit'] as const) {
      const svg = buildPet(stups, pose, { x: 100, y: 176 }).svg;
      const ys: number[] = [];
      for (const d of svg.matchAll(/ d="([^"]+)"/g)) for (const m of d[1].matchAll(/(-?[\d.]+) (-?[\d.]+)/g)) ys.push(Number(m[2]));
      for (const c of svg.matchAll(/cy="([\d.]+)" r="([\d.]+)"/g)) ys.push(Number(c[1]) - Number(c[2]));
      const height = 176 - Math.min(...ys);
      expect(height).toBeGreaterThan(44);
      expect(height).toBeLessThan(60);
    }
  });
});

describe('Hauttöne', () => {
  const hue = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };

  it('acht Töne von hell nach dunkel, Teil der Zeichnungs-Palette (skin1 bis skin8)', () => {
    expect(skinTones).toHaveLength(8);
    for (let i = 1; i < skinTones.length; i++) expect(contrastRatio(skinTones[i], '#FFFFFF')).toBeGreaterThan(contrastRatio(skinTones[i - 1], '#FFFFFF'));
    skinTones.forEach((tone, i) => expect(illustrationPalette[`skin${i + 1}` as keyof typeof illustrationPalette]).toBe(tone));
  });

  it('ohne Gelb- und ohne Rotstich: Farbton 18° bis 28° (Haut warm, nicht rot, nicht gelb)', () => {
    for (const tone of skinTones) {
      expect(hue(tone)).toBeGreaterThanOrEqual(18);
      expect(hue(tone)).toBeLessThanOrEqual(28);
    }
  });

  it('Regel: trägt, wenn Haut gegen Hintergrund oder Tinte gegen Haut mindestens 3:1 hat', () => {
    expect(skinCarriesOn('#12323D', '#12323D')).toBe(false);
    expect(skinCarriesOn('#613A25', backgrounds.leinen)).toBe(true); // Haut gegen Leinen
    expect(skinCarriesOn('#F1CDB3', backgrounds.leinen)).toBe(true); // Tinte gegen Haut
    expect(skinCarriesOn('#613A25', backgrounds.petrol)).toBe(false);
  });

  it('jeder Ton trägt auf Leinen, Rosé und dem Bildgrund; auf Petrol tragen genau die tiefsten drei nicht', () => {
    for (let slot = 1; slot <= 8; slot++) {
      for (const bg of ['leinen', 'rose', 'ground'] as const) expect(toneCarries(slot as SkinSlot, bg)).toBe(true);
    }
    const notOnPetrol = [1, 2, 3, 4, 5, 6, 7, 8].filter((slot) => !toneCarries(slot as SkinSlot, 'petrol'));
    expect(notOnPetrol).toEqual([6, 7, 8]);
  });

  it('Zuordnung: Hauptfiguren Jette und Mats haben verschiedene Töne und nicht beide den hellsten; kein Ton gehört zu einer Rolle', () => {
    const tone = (id: string) => by[id].spec.skin;
    expect(tone('jette')).not.toBe(tone('mats'));
    expect(Math.min(tone('jette'), tone('mats'))).toBeLessThanOrEqual(2); // ein heller
    expect(Math.max(tone('jette'), tone('mats'))).toBeGreaterThanOrEqual(6); // ein tiefer
    expect(new Set(humans.map((h) => h.spec.skin)).size).toBe(5);
    // die Hauptfiguren (Jette, Mats) tragen den hellsten und den tiefsten genutzten Ton; die Nebenfiguren liegen dazwischen
    const used = humans.map((h) => h.spec.skin);
    expect([Math.min(...used), Math.max(...used)].sort()).toEqual([tone('jette'), tone('mats')].sort());
    for (const id of ['ilka', 'arne', 'nolli']) {
      expect(tone(id)).toBeGreaterThan(Math.min(...used));
      expect(tone(id)).toBeLessThan(Math.max(...used));
    }
  });

  it('Kontrast-Hilfen: Werte stimmen, die Palette hat skin1 bis skin8', () => {
    const c = skinContrast('#613A25');
    expect(c.leinen).toBeGreaterThan(8);
    expect(c.petrol).toBeLessThan(3);
    expect(c.carries.petrol).toBe(false);
    const p = skinPalette();
    for (let i = 1; i <= 8; i++) {
      expect(p[`skin${i}`]).toBe(toneOf(i as SkinSlot));
      expect([illustrationPalette.ink, illustrationPalette.paper]).toContain(p[`eye${i}`]);
    }
    expect(eyeColorOn('#613A25')).toBe(illustrationPalette.paper);
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

  it('fünf Ausdrucksposen (staunt, freut sich, enttäuscht, nachdenklich, neugierig), alle verschieden und als Daten im Rig', () => {
    expect(expressionNames).toEqual(['amazed', 'happy', 'disappointed', 'thoughtful', 'curious']);
    for (const h of [by.jette, by.mats]) {
      const images = expressionNames.map((n) => buildHuman(h.spec, poseOf(h.spec, n, h.quirk), { x: 100, y: 176 }).svg);
      expect(new Set(images).size).toBe(5);
      const data = (rigData() as { humans: { spec: { id: string }; poses: Record<string, unknown> }[] }).humans.find((x) => x.spec.id === h.spec.id)!;
      for (const n of expressionNames) expect(data.poses[n]).toBeDefined();
    }
  });

  it('nachdenklich: die Hand liegt am Kinn (unter dem Kopf, nahe der Kopfmitte)', () => {
    for (const h of [by.jette, by.mats]) {
      const r = buildHuman(h.spec, poseOf(h.spec, 'thoughtful', h.quirk), { x: 100, y: 176 });
      expect(Math.abs(r.anchors.handR.x - r.anchors.head.x)).toBeLessThan(h.spec.headR * 1.6);
      expect(r.anchors.handR.y).toBeGreaterThan(r.anchors.head.y);
      expect(r.anchors.handR.y).toBeLessThan(r.anchors.head.y + h.spec.headR * 2.4);
    }
  });

  it('Tiere: alle Posen je Art rechnen sauber', () => {
    for (const p of pets) {
      for (const pose of petPosesOf(p.spec.kind)) {
        const svg = buildPet(p.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
        expect(svg.length).toBeGreaterThan(300);
      }
    }
  });
});

describe('Linien', () => {
  it('Figuren haben Linie 5, Gegenstände 4, feine Linien 2,5', () => {
    expect(figureLine).toBe(5);
    const svg = humanInPose(by.ilka.spec, by.ilka.quirk, 'tray', 100, { eyes: false, held: { kind: 'tray', content: 'apples', mitts: true } });
    const widths = new Set([...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]));
    expect([...widths].sort()).toEqual(['2.5', '4', '5']);
    expect(buildHuman(by.ilka.spec, poseOf(by.ilka.spec, 'stand'), { x: 100, y: 176 }).svg).not.toMatch(/stroke-width="4"/);
    expect(buildHuman(by.ilka.spec, poseOf(by.ilka.spec, 'stand'), { x: 100, y: 176, line: 4 }).svg).toMatch(/stroke-width="4"/);
  });
});

describe('Tier-Regel', () => {
  // Ein Baustein und eine Platzierung mit den Feldern, die die Regel liest.
  const block = (id: string, extra: Partial<LoadedBlock>, tint?: string): Placement =>
    ({ item: { slot: 's', block: id }, slot: {}, x: 100, y: 176, size: 1, flip: false, tint, box: { minX: 80, maxX: 120, minY: 100, maxY: 176 }, block: { id, group: 'x', kind: 'object', hazards: [], materials: [], terms: { de: [], en: [] }, neutral: true, svg: '', label: { de: id, en: id }, box: { x0: -20, x1: 20, h: 76 }, ...extra } }) as unknown as Placement;
  const activity = (materials: string[]) => ({ materials, ageMin: 4, ageMax: 9, text: { de: '', en: '' }, safety: { de: 'nur mit Erwachsenen', en: '' } });
  const cat = block('cat', { kind: 'figure', animal: true });

  it('Szenenprüfer und Regel nennen genau Hitze, Feuer, Messer und Schere', () => {
    expect([...animalBannedHazards]).toEqual(['sharp', 'heat', 'fire']);
  });

  it('Tier und Schere (scharf) im selben Bild: Verstoß', () => {
    expect(checkAgainstActivity([cat, block('scissors', { hazards: ['sharp'] })], activity([])).join('\n')).toMatch(/Ein Tier im Bild/);
  });

  it('Tier und Material mit Hitze (Backofen, Herd), Messer oder Schere in der Aktivität: Verstoß', () => {
    for (const material of ['oven', 'stove', 'knife', 'scissors']) expect(checkAgainstActivity([cat], activity([material])).join('\n')).toMatch(/Ein Tier im Bild.*Tiere nie bei Hitze/);
  });

  it('Tier mit harmlosem Material: kein Verstoß; ohne Tier verhindert die Regel nichts', () => {
    expect(checkAgainstActivity([cat], activity(['paper']))).toEqual([]);
    expect(checkAgainstActivity([block('oven', { hazards: ['heat'] })], activity(['oven'])).join('\n')).not.toMatch(/Ein Tier/);
  });
});

describe('Hautton und Petrol im Szenenprüfer', () => {
  const place = (id: string, extra: Partial<LoadedBlock>, box: Placement['box'], tint?: string): Placement =>
    ({ item: { slot: 's', block: id }, slot: {}, x: (box.minX + box.maxX) / 2, y: box.maxY, size: 1, flip: false, tint, box, block: { id, group: 'x', kind: 'object', hazards: [], materials: [], terms: { de: [], en: [] }, neutral: true, svg: '', label: { de: id, en: id }, box: { x0: -20, x1: 20, h: 76 }, ...extra } }) as unknown as Placement;
  const activity = { materials: [], ageMin: 4, ageMax: 9, text: { de: '', en: '' }, safety: { de: '', en: '' } };
  const figure = (tone: string) => place('jette', { kind: 'figure', person: 'child', skin: tone }, { minX: 80, maxX: 120, minY: 100, maxY: 176 });
  const curtain = (box: Placement['box']) => place('curtain', {}, box, 'petrol');

  it('tiefer Ton (trägt auf Petrol nicht) mit Petrol-Fläche am Kopf: Verstoß', () => {
    const problems = checkAgainstActivity([figure('#76492F'), curtain({ minX: 60, maxX: 140, minY: 90, maxY: 176 })], activity).join('\n');
    expect(problems).toMatch(/trägt auf Petrol nicht/);
  });

  it('tiefer Ton mit Petrol-Fläche nur unten (am Körper, nicht am Kopf): kein Verstoß', () => {
    expect(checkAgainstActivity([figure('#76492F'), curtain({ minX: 60, maxX: 140, minY: 150, maxY: 176 })], activity)).toEqual([]);
  });

  it('heller Ton (trägt auf Petrol) mit Petrol am Kopf: kein Verstoß', () => {
    expect(checkAgainstActivity([figure('#DDAA85'), curtain({ minX: 60, maxX: 140, minY: 90, maxY: 176 })], activity)).toEqual([]);
  });
});

describe('Zeichnungen und Vorschau', () => {
  const preview = buildFigurePreview();
  const svgs = preview.filter((file) => file.path.endsWith('.svg'));
  const palette = new Set(Object.values(illustrationPalette).map((c) => c.toUpperCase()));

  it('erzeugt Besetzung, fünf Figurenblätter, zwei Ausdrucksblätter, drei Tierblätter, Familie, drei Triptychen und die Linienprobe', () => {
    expect(svgs).toHaveLength(1 + 5 + 2 + 3 + 1 + 9 + legibilityLines.length);
  });

  it.each(svgs.map((file) => [file.path.replace(`${figuresDir}/`, ''), file.content] as const))('%s: nur erlaubter SVG-Code, nur Palette, nur die vorgesehenen Linienstärken, unter der Grenze von 14 KB', (path, svg) => {
    expect(svg).not.toMatch(/\{\{|\}\}/);
    expect(svg).not.toMatch(/<(text|image|style|script|use|defs|filter|mask|clipPath|linearGradient|radialGradient)\b|href=|url\(|opacity=|NaN/);
    for (const tag of svg.match(/<([a-zA-Z]+)/g) ?? []) expect(['<svg', '<rect', '<circle', '<g', '<path', '<ellipse']).toContain(tag);
    for (const color of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(palette).toContain(color.toUpperCase());
    const line = path.match(/linie-([\d-]+)\.svg$/);
    const allowed = line ? [line[1].replace('-', '.'), '2.5', '4'] : ['4', '5', '2.5'];
    for (const m of svg.matchAll(/stroke-width="([\d.]+)"/g)) expect(allowed).toContain(m[1]);
    expect(svg.match(/<g\b/g)?.length).toBe(svg.match(/<\/g>/g)?.length);
    expect(Buffer.byteLength(svg)).toBeLessThan(sizeLimit);
  });

  it('Szenen mit Linie 5 (Besetzung, Familie, Triptychen) bleiben unter 14 KB, ohne die Grenze auszureizen', () => {
    expect(Buffer.byteLength(lineup())).toBeLessThan(sizeLimit);
    expect(Buffer.byteLength(familyAtTable())).toBeLessThan(sizeLimit);
  });

  it('Blätter, Besetzung, Familie und Triptychen entstehen aus denselben Funktionen wie die Vorschau', () => {
    const find = (name: string) => preview.find((f) => f.path.endsWith(`vorschau/${name}`))?.content;
    expect(humanSheet(by.jette)).toBe(find('jette.svg'));
    expect(expressionSheet(by.mats)).toBe(find('mats-ausdruck.svg'));
    expect(petSheet(pets[1], 1)).toBe(find('stups-2.svg'));
    expect(lineup()).toBe(find('besetzung.svg'));
    expect(familyAtTable()).toBe(find('familie.svg'));
    expect(childTriptych('mats').map((p) => p.svg)).toEqual([1, 2, 3].map((i) => find(`mats-tri${i}.svg`)));
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

  it('FIGUREN.md nennt jeden Namen, jeden abgelehnten Namen und die Tier-Regel', () => {
    const text = readFileSync(join(root, 'docs/design/FIGUREN.md'), 'utf8');
    for (const h of humans) expect(text).toContain(h.spec.name);
    for (const p of pets) expect(text).toContain(p.spec.name);
    for (const r of rejectedNames) expect(text).toContain(r.name);
    expect(text).toMatch(/nie in Szenen mit Backofen, Herd, heißen Gegenständen, Messer oder Schere in Benutzung/);
  });
});
