// Figurenwahl für Titelbilder (casting.ts): seltenste passende Figur zuerst, höchstens 40 %, Mats ab 8, Stups gelegentlich.

import { join } from 'node:path';

import { loadActivityData } from '../activityData';
import { addToCounts, adviseCasting, castingProblems, castingPrompt, figureLimit, figuresInScene, fittingKids, petAllowed, replayCasting } from './casting';
import { loadProbe, probeOrder, type ProbeActivity } from './probe';
import type { Scene } from './types';

const activity = (ageMin: number, ageMax: number, materials: string[] = []) => ({ ageMin, ageMax, materials });

describe('Figurenwahl', () => {
  it('Grenze: 40 % der geplanten Bilder, abgerundet, mindestens 1', () => {
    expect(figureLimit(1)).toBe(1);
    expect(figureLimit(2)).toBe(1);
    expect(figureLimit(5)).toBe(2);
    expect(figureLimit(8)).toBe(3);
    expect(figureLimit(10)).toBe(4);
  });

  it('passende Kinder: nach Alter, Nolli nur bei Aktivitäten ab 2 Jahren oder jünger', () => {
    expect(fittingKids(activity(1, 12))).toEqual(['nolli', 'jette', 'mats']);
    expect(fittingKids(activity(3, 10))).toEqual(['jette', 'mats']);
    expect(fittingKids(activity(10, 16))).toEqual(['mats']);
  });

  it('die am seltensten benutzte passende Figur zuerst, bei Gleichstand die, deren Alter näher an der Mitte liegt', () => {
    expect(adviseCasting(activity(4, 12), {}, 5).kids).toEqual(['jette', 'mats']);
    expect(adviseCasting(activity(4, 12), { jette: 1 }, 5).kids).toEqual(['mats', 'jette']);
    expect(adviseCasting(activity(12, 16), {}, 5).kids).toEqual(['mats']);
    expect(adviseCasting(activity(4, 12), {}, 5).adults).toEqual(['arne', 'ilka']);
    expect(adviseCasting(activity(4, 12), { arne: 1 }, 5).adults).toEqual(['ilka', 'arne']);
  });

  it('Mats ist bevorzugt bei Aktivitäten ab 8 Jahren, auch wenn er schon öfter dran war', () => {
    expect(adviseCasting(activity(8, 12), { mats: 1 }, 10).kids).toEqual(['mats', 'jette']);
    expect(adviseCasting(activity(7, 12), { mats: 1 }, 10).kids).toEqual(['jette', 'mats']);
  });

  it('keine Figur in mehr als 40 %: an der Grenze gesperrt, ein Bild mit ihr wird gemeldet', () => {
    const advice = adviseCasting(activity(4, 12), { jette: 2 }, 5);
    expect(advice.kids).toEqual(['mats']);
    expect(advice.blocked.map((entry) => entry.id)).toEqual(['jette']);
    const scene: Scene = { layout: 'pair', items: [{ slot: 'left', figure: 'jette', pose: 'curious' }] };
    expect(castingProblems(scene, advice).join(' ')).toMatch(/„jette“ steht schon in 2 von 5 Titelbildern \(Grenze 40 %, also 2\): Nimm eine andere Figur \(bevorzugt mats\)/);
    // auch als Hände in der Nahaufnahme
    const hands: Scene = { layout: 'hands', items: [{ slot: 'object', block: 'bowl', hands: { figure: 'jette', pose: 'hold' } }] };
    expect(figuresInScene(hands)).toEqual(['jette']);
    expect(castingProblems(hands, advice)).toHaveLength(1);
    expect(castingPrompt(advice)).toMatch(/NICHT jette/);
  });

  it('Stups: gelegentlich vorgeschlagen, nie bei Hitze, Feuer oder Schärfe', () => {
    expect(petAllowed(activity(4, 12, ['apple', 'oven']))).toBe(false);
    expect(petAllowed(activity(6, 12, ['lemon', 'knife']))).toBe(false);
    expect(petAllowed(activity(1, 12, ['musicPlayer']))).toBe(true);
    expect(adviseCasting(activity(1, 12, ['musicPlayer']), {}, 5).pet).toBe('suggested');
    expect(adviseCasting(activity(1, 12, ['musicPlayer']), { stups: 1 }, 5).pet).toBe('allowed');
    expect(adviseCasting(activity(1, 12, ['musicPlayer']), { stups: 2 }, 5).pet).toBe('forbidden');
    const oven = adviseCasting(activity(4, 12, ['oven']), {}, 5);
    expect(oven.pet).toBe('forbidden');
    expect(castingPrompt(oven)).toMatch(/stups und tuepfel nicht in diesem Bild/);
    expect(castingPrompt(adviseCasting(activity(1, 12), {}, 5))).toMatch(/stups darf als Begleiter dazukommen/);
  });

  it('Zähler: jede Figur einmal je Bild', () => {
    const scene: Scene = { layout: 'pair', items: [{ slot: 'left', figure: 'jette', pose: 'curious' }, { slot: 'right', figure: 'jette', pose: 'happy' }, { slot: 'middle', figure: 'arne', pose: 'stand' }] };
    expect(addToCounts({ jette: 1 }, scene)).toEqual({ jette: 2, arne: 1 });
  });

  it('die fünf Probebilder folgen dem Rat: kein Verstoß, keine Figur in mehr als zwei Bildern', () => {
    const probe = loadProbe(join(__dirname, '../../..'));
    const activities = new Map<string, ProbeActivity>([...loadActivityData().activities, ...probe.extra].map((entry) => [entry.id, entry as ProbeActivity]));
    const replay = replayCasting(probeOrder.map((id) => ({ activity: activities.get(id) as ProbeActivity, scene: probe.scenes.get(id) as Scene })));
    expect(replay.flatMap((entry) => entry.problems)).toEqual([]);
    const final = replay.at(-1)?.counts ?? {};
    expect(Math.max(...Object.values(final))).toBeLessThanOrEqual(2);
    expect(final.jette).toBe(2);
    expect(final.stups).toBe(1);
  });
});
