// Figuren-Rig (M9b): benannte Posen als Daten. Eine Pose hängt von den Maßen der Figur ab (Haltepunkte liegen relativ zu Rumpf und Beinen).
// Die Zielpunkte für die Hände sind Koordinaten der Figur (Mitte der Füße = (0 0), oben negativ).

import { vec, type Vec } from './math.ts';
import { legLength, type HumanSpec, type Pose } from './rig.ts';

export type PoseName = 'stand' | 'hold' | 'tray' | 'cheer' | 'walk' | 'take';
export const poseNames: readonly PoseName[] = ['stand', 'hold', 'tray', 'cheer', 'walk', 'take'];

// Besonderheiten einer Figur, die in „stand“ auffallen (spielerisch geneigter Kopf, Hand in die Hüfte).
export type Quirk = { tilt?: number; handOnHip?: 'L' | 'R' };

export const poseLabels: Record<PoseName, { de: string; en: string }> = {
  stand: { de: 'stehen', en: 'standing' },
  hold: { de: 'hält etwas', en: 'holding something' },
  tray: { de: 'trägt Tablett', en: 'carrying a tray' },
  cheer: { de: 'jubelt', en: 'cheering' },
  walk: { de: 'läuft', en: 'walking' },
  take: { de: 'nimmt Tablett', en: 'taking the tray' },
};

const restLegs = { legL: { angle: 4, bend: 0 }, legR: { angle: 4, bend: 0 } };

// Tablett vor dem Körper: Mitte der Oberkante und Breite so, dass beide Hände die Ränder sicher erreichen (kurze Arme: höher und schmaler).
// `onTable`: Das Tablett steht auf einem Tisch auf Bauchhöhe (Pose „take“), sonst trägt die Figur es vor der Brust.
function trayGeometry(s: HumanSpec, onTable: boolean): { y: number; width: number } {
  const pelvisY = -legLength(s);
  const shoulderY = pelvisY - s.torsoH * 0.9;
  const reach = (s.upperArm + s.foreArm) * 0.93;
  const dy = Math.min((onTable ? 1 : 0.62) * s.torsoH, reach * 0.8);
  const dx = Math.sqrt(Math.max(reach * reach - dy * dy, 16));
  const handX = s.shoulderW / 2 + dx * 0.85;
  return { y: shoulderY + dy, width: Math.max(44, Math.round(2 * (handX + 3))) };
}

export function trayCenter(s: HumanSpec, onTable = false): Vec {
  return vec(0, trayGeometry(s, onTable).y);
}

export function trayWidth(s: HumanSpec, onTable = false): number {
  return trayGeometry(s, onTable).width;
}

// Wo eine gehaltene Platte (Mitte) bei dieser Figur liegt: vor der Brust, auf der rechten Seite.
export function plateCenter(s: HumanSpec): Vec {
  return vec(s.shoulderW * 0.62, -legLength(s) - s.torsoH * 0.52);
}

export function poseOf(s: HumanSpec, name: PoseName, quirk: Quirk = {}): Pose {
  const pelvisY = -legLength(s);
  switch (name) {
    case 'stand': {
      const base: Pose = { ...restLegs, tilt: quirk.tilt, armL: { angle: 11, bend: 6 }, armR: { angle: 11, bend: 6 } };
      if (quirk.handOnHip) {
        const hip = vec((quirk.handOnHip === 'R' ? 1 : -1) * (s.shoulderW * 0.5 + s.upperArm * 0.55), pelvisY - s.torsoH * 0.08);
        if (quirk.handOnHip === 'R') base.armR = { to: hip, elbow: 'out' };
        else base.armL = { to: hip, elbow: 'out' };
      }
      return base;
    }
    case 'hold': {
      const c = plateCenter(s);
      return { ...restLegs, armL: { angle: 11, bend: 6 }, armR: { to: vec(c.x, c.y + 5), elbow: 'out' } };
    }
    case 'tray':
    case 'take': {
      const c = trayCenter(s, name === 'take');
      const half = trayWidth(s, name === 'take') / 2 - 3;
      return {
        ...restLegs,
        lean: name === 'take' ? 5 : 0,
        armL: { to: vec(-half, c.y + 2), elbow: 'out' },
        armR: { to: vec(half, c.y + 2), elbow: 'out' },
      };
    }
    case 'cheer':
      return {
        dy: -9,
        tilt: -3,
        legL: { angle: 16, bend: 30 },
        legR: { angle: 16, bend: 30 },
        armL: { angle: 152, bend: -12 },
        armR: { angle: 152, bend: -12 },
      };
    case 'walk':
      return {
        lean: 2,
        dy: -2,
        legL: { angle: 15, bend: 0 },
        legR: { angle: 3, bend: 28 },
        armL: { angle: 40, bend: 14 },
        armR: { angle: 4, bend: 40 },
      };
  }
}
