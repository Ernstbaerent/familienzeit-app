// Figuren-Rig (M9b): Maße, Rechnung (Arm mit zwei Gliedern), Posen, die zwei Fassungen (ohne und mit Augen), die Zeichnungen und die Vorschau.
// Ob die Figuren als Charaktere funktionieren (Wiedererkennung, Anmutung), sieht ein Mensch auf der Vorschau (docs/design/figuren/VORSCHAU.md).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { illustrationPalette } from '../../../src/lib/palette';
import { capsule, fmt, fromAngles, length, rotate, solveArm, sub, vec } from './math';
import { nameChecks, rejectedNames } from './names';
import { buildPet, petPoseNames } from './pets';
import { figuresDir, buildFigurePreview, rigData, sizeLimit, sizeLimitSteps } from './preview';
import { plateCenter, poseNames, poseOf, trayCenter, trayWidth } from './poses';
import { buildHuman, legLength, standHeight, type HumanSpec, type Pose } from './rig';
import { groupShot, humanInPose, humanSheet, petSheet, triptych } from './scenes';
import { figureSets } from './sets';

const root = join(__dirname, '../../..');
const humans = figureSets.flatMap((set) => set.humans.map((h) => ({ set, ...h })));

describe('Figurensätze', () => {
  it('drei Sätze A, B, C mit je größerem Kind, kleinerem Kind, Erwachsenem und Haustier', () => {
    expect(figureSets.map((set) => set.id)).toEqual(['A', 'B', 'C']);
    for (const set of figureSets) {
      expect(set.humans.map((h) => h.spec.role).sort()).toEqual(['adult', 'child', 'toddler']);
      expect(set.pet.spec.name.length).toBeGreaterThan(0);
    }
  });

  it('zwölf verschiedene kurze Namen, alle in der Namensprüfung, keiner wie „Miki“', () => {
    const names = figureSets.flatMap((set) => [...set.humans.map((h) => h.spec.name), set.pet.spec.name]);
    expect(new Set(names).size).toBe(12);
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(6);
      expect(name.toLowerCase().startsWith('mi')).toBe(false);
      expect(nameChecks.has(name)).toBe(true);
      expect(rejectedNames.map((r) => r.name)).not.toContain(name);
    }
  });

  it('Erwachsene sind größer als größere Kinder, diese größer als kleinere (Kopf bleibt im Verhältnis)', () => {
    for (const set of figureSets) {
      const h = (role: HumanSpec['role']) => standHeight(set.humans.find((x) => x.spec.role === role)!.spec);
      expect(h('adult')).toBeGreaterThan(h('child') * 1.15);
      expect(h('child')).toBeGreaterThan(h('toddler') * 1.05);
      expect(h('adult')).toBeLessThanOrEqual(125); // Kopf bleibt unter den oberen Ecken der Karte (Standlinie 176, Ecken bis 56)
    }
  });

  it('die Sätze unterscheiden sich in Form (Rumpf, Glieder), nicht nur in Farbe', () => {
    const feel = (id: 'A' | 'B' | 'C') => {
      const s = figureSets.find((x) => x.id === id)!.humans[0].spec;
      return `${s.torso}/${s.limb.style}`;
    };
    expect(new Set([feel('A'), feel('B'), feel('C')]).size).toBe(3);
    expect(new Set(figureSets.map((set) => set.pet.spec.kind)).size).toBe(3);
  });

  it('Kleidung und Haare nur in Farben der Palette, warme Töne nur für Mützen, Schuhe, Akzente und das Küken', () => {
    for (const { spec } of humans) {
      expect(['petrol', 'rose', 'paper', 'ink']).toContain(spec.colors.top);
      expect(['petrol', 'rose', 'paper', 'ink']).toContain(spec.colors.bottom);
      expect(spec.colors.hair).toBe('ink');
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
  it.each(humans.map((h) => [`${h.set.id} ${h.spec.name}`, h] as const))('%s: alle Posen rechnen sauber (keine ungültigen Zahlen)', (_label, h) => {
    for (const name of poseNames) {
      const r = buildHuman(h.spec, poseOf(h.spec, name, h.quirk), { x: 100, y: 176, eyes: true });
      expect(r.svg).not.toMatch(/NaN|Infinity|undefined/);
      expect(r.svg.length).toBeGreaterThan(200);
    }
  });

  it.each(humans.map((h) => [`${h.set.id} ${h.spec.name}`, h] as const))('%s: beim Tablett sitzen die Hände an den Rändern', (_label, h) => {
    const r = buildHuman(h.spec, poseOf(h.spec, 'tray', h.quirk), { x: 100, y: 176 });
    const c = trayCenter(h.spec);
    const half = trayWidth(h.spec) / 2 - 3;
    // Das Ziel liegt in Reichweite: Die Hände treffen die Ränder auf eine Einheit genau.
    expect(length(sub(r.anchors.handL, vec(100 - half, 176 + c.y + 2)))).toBeLessThan(1);
    expect(length(sub(r.anchors.handR, vec(100 + half, 176 + c.y + 2)))).toBeLessThan(1);
  });

  it.each(humans.map((h) => [`${h.set.id} ${h.spec.name}`, h] as const))('%s: „hält etwas“ legt die Hand an den Teller', (_label, h) => {
    const r = buildHuman(h.spec, poseOf(h.spec, 'hold', h.quirk), { x: 100, y: 176 });
    const c = plateCenter(h.spec);
    expect(length(sub(r.anchors.handR, vec(100 + c.x, 176 + c.y + 5)))).toBeLessThan(1);
  });

  it.each(humans.map((h) => [`${h.set.id} ${h.spec.name}`, h] as const))('%s: beim Jubeln sind beide Hände über dem Kopf', (_label, h) => {
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
    const data = rigData(figureSets) as { sets: { humans: { spec: HumanSpec; quirk: null | object; poses: Record<string, Pose> }[] }[] };
    const parsed = JSON.parse(JSON.stringify(data)) as typeof data;
    figureSets.forEach((set, si) =>
      set.humans.forEach((h, hi) => {
        const copy = parsed.sets[si].humans[hi];
        for (const name of poseNames) {
          const a = buildHuman(h.spec, poseOf(h.spec, name, h.quirk), { x: 90, y: 176 }).svg;
          const b = buildHuman(copy.spec, copy.poses[name], { x: 90, y: 176 }).svg;
          expect(b).toBe(a);
        }
      }),
    );
  });

  it('Haustiere: alle Posen rechnen sauber', () => {
    for (const set of figureSets) {
      for (const pose of petPoseNames) {
        const svg = buildPet(set.pet.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });
});

describe('Zwei Fassungen aus demselben Rig', () => {
  const eyeCircle = /<circle cx="[\d.\-]+" cy="[\d.\-]+" r="[\d.]+" fill="\{\{ink\}\}" stroke="none"\/>/g;

  it('mit Augen ist genau „ohne“ plus zwei Punkte (Menschen)', () => {
    for (const h of humans) {
      for (const name of poseNames) {
        const pose = poseOf(h.spec, name, h.quirk);
        const without = buildHuman(h.spec, pose, { x: 100, y: 176, eyes: false }).svg;
        const withEyes = buildHuman(h.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(withEyes.match(eyeCircle)?.length).toBe(2);
        expect(without.match(eyeCircle)).toBeNull();
        expect(withEyes.replace(eyeCircle, '')).toBe(without);
      }
    }
  });

  it('mit Augen ist genau „ohne“ plus zwei Punkte (Haustiere)', () => {
    for (const set of figureSets) {
      for (const pose of petPoseNames) {
        const without = buildPet(set.pet.spec, pose, { x: 100, y: 176, eyes: false }).svg;
        const withEyes = buildPet(set.pet.spec, pose, { x: 100, y: 176, eyes: true }).svg;
        expect(withEyes.replace(/<circle cx="[\d.\-]+" cy="[\d.\-]+" r="[\d.]+" fill="\{\{ink\}\}" stroke="none"\/>/g, '')).toBe(without.replace(/<circle cx="[\d.\-]+" cy="[\d.\-]+" r="[\d.]+" fill="\{\{ink\}\}" stroke="none"\/>/g, ''));
        expect((withEyes.match(eyeCircle) ?? []).length - (without.match(eyeCircle) ?? []).length).toBe(2);
      }
    }
  });

  it('die Augen sind nur Punkte: sonst kein Gesichtszug (kein Mund, keine Nase beim Menschen)', () => {
    const svg = humanInPose(humans[0].spec, humans[0].quirk, 'stand', 100, { eyes: true });
    expect(svg.match(eyeCircle)?.length).toBe(2);
  });
});

describe('Zeichnungen und Vorschau', () => {
  const preview = buildFigurePreview(figureSets, nameChecks);
  const svgs = preview.filter((file) => file.path.endsWith('.svg'));
  const palette = new Set(Object.values(illustrationPalette).map((c) => c.toUpperCase()));

  it('erzeugt je Satz und Fassung Blätter, Gruppenbild und Triptychon', () => {
    // 3 Sätze × 2 Fassungen × (3 Menschen + Haustier + Gruppe + 3 Triptychon-Bilder)
    expect(svgs).toHaveLength(3 * 2 * 8);
  });

  it.each(svgs.map((file) => [file.path.replace(`${figuresDir}/`, ''), file.content] as const))('%s: nur erlaubter SVG-Code, nur Palette, nur zwei Linienstärken, Größe unter der Grenze', (path, svg) => {
    expect(svg).not.toMatch(/\{\{|\}\}/);
    expect(svg).not.toMatch(/<(text|image|style|script|use|defs|filter|mask|clipPath|linearGradient|radialGradient)\b|href=|url\(|opacity=|NaN/);
    for (const tag of svg.match(/<([a-zA-Z]+)/g) ?? []) expect(['<svg', '<rect', '<circle', '<g', '<path', '<ellipse']).toContain(tag);
    for (const color of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(palette).toContain(color.toUpperCase());
    for (const m of svg.matchAll(/stroke-width="([\d.]+)"/g)) expect(['4', '2.5']).toContain(m[1]);
    expect(svg.match(/<g\b/g)?.length).toBe(svg.match(/<\/g>/g)?.length);
    // Szenen (Gruppenbild, Triptychon) unter der Grenze für Titelbilder; ein Figurenblatt zeigt vier Posen in einem Bild und darf bis 14 KB
    const isScene = /-(gruppe|tri\d)\.svg$/.test(path);
    expect(Buffer.byteLength(svg)).toBeLessThan(isScene ? sizeLimit : sizeLimitSteps);
  });

  it('Figurenblätter, Gruppenbild und Triptychon entstehen aus denselben Funktionen wie die Vorschau', () => {
    const set = figureSets[0];
    expect(humanSheet(set.humans[0], false)).toBe(preview.find((f) => f.path.endsWith('vorschau/A-ohne-joni.svg'))?.content);
    expect(petSheet(set.pet, true)).toBe(preview.find((f) => f.path.endsWith('vorschau/A-augen-stups.svg'))?.content);
    expect(groupShot(set, true)).toBe(preview.find((f) => f.path.endsWith('vorschau/A-augen-gruppe.svg'))?.content);
    expect(triptych(set, false)).toHaveLength(3);
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

  it('FIGUREN.md nennt jeden Namen und jeden abgelehnten Namen', () => {
    const text = readFileSync(join(root, 'docs/design/FIGUREN.md'), 'utf8');
    for (const set of figureSets) {
      for (const h of set.humans) expect(text).toContain(h.spec.name);
      expect(text).toContain(set.pet.spec.name);
    }
    for (const r of rejectedNames) expect(text).toContain(r.name);
  });
});
