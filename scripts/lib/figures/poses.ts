// Figuren-Rig (M9b): benannte Posen als Daten. Eine Pose hängt von den Maßen der Figur ab (Haltepunkte liegen relativ zu Rumpf und Beinen).
// Die Zielpunkte für die Hände sind Koordinaten der Figur (Mitte der Füße = (0 0), oben negativ).

import { vec, type Vec } from './math.ts';
import { legLength, type HumanSpec, type Pose } from './rig.ts';

export type PoseName = 'stand' | 'hold' | 'tray' | 'cheer' | 'walk' | 'take' | 'dance' | 'freeze' | 'watch' | ExpressionName;
// Ausdrucksposen (Entscheidung von Clemens, 2026-10-16): Emotionen über Haltung statt über Gesichtszüge. Nur Daten, nichts wird animiert.
export type ExpressionName = 'amazed' | 'happy' | 'disappointed' | 'thoughtful' | 'curious';
export const expressionNames: readonly ExpressionName[] = ['amazed', 'happy', 'disappointed', 'thoughtful', 'curious'];
export const poseNames: readonly PoseName[] = ['stand', 'hold', 'tray', 'cheer', 'walk', 'take', 'dance', 'freeze', 'watch', ...expressionNames];

// Besonderheiten einer Figur, die in „stand“ auffallen (spielerisch geneigter Kopf, Hand in die Hüfte).
export type Quirk = { tilt?: number; handOnHip?: 'L' | 'R' };

export const poseLabels: Record<PoseName, { de: string; en: string }> = {
  stand: { de: 'stehen', en: 'standing' },
  hold: { de: 'hält etwas', en: 'holding something' },
  tray: { de: 'trägt Tablett', en: 'carrying a tray' },
  cheer: { de: 'jubelt', en: 'cheering' },
  walk: { de: 'läuft', en: 'walking' },
  take: { de: 'nimmt Tablett', en: 'taking the tray' },
  dance: { de: 'tanzt', en: 'dancing' },
  freeze: { de: 'erstarrt wie eine Statue', en: 'frozen like a statue' },
  watch: { de: 'schaut zu', en: 'watching' },
  amazed: { de: 'staunt', en: 'amazed' },
  happy: { de: 'freut sich', en: 'happy' },
  disappointed: { de: 'enttäuscht', en: 'disappointed' },
  thoughtful: { de: 'nachdenklich', en: 'thoughtful' },
  curious: { de: 'neugierig', en: 'curious' },
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
    case 'amazed':
      // zurückgelehnt, Kopf in den Nacken, Hände neben den Kopf gehoben, Beine etwas auseinander
      return { lean: -4, tilt: -8, legL: { angle: 9, bend: 0 }, legR: { angle: 9, bend: 0 }, armL: { angle: 42, bend: 105 }, armR: { angle: 42, bend: 105 } };
    case 'happy':
      // kleiner Hüpfer, Arme locker nach oben außen, Kopf zur Seite
      return { dy: -5, tilt: 7, legL: { angle: 10, bend: 14 }, legR: { angle: 10, bend: 14 }, armL: { angle: 128, bend: 14 }, armR: { angle: 128, bend: 14 } };
    case 'disappointed':
      // nach vorn gesunken, Kopf hängt, Arme hängen schlaff
      return { lean: 7, tilt: 16, ...restLegs, armL: { angle: 3, bend: 0 }, armR: { angle: 3, bend: 0 } };
    case 'thoughtful': {
      // eine Hand am Kinn, der andere Arm quer vor dem Bauch, Kopf leicht geneigt
      const headY = pelvisY - s.torsoH - s.neck - s.headR;
      return {
        tilt: 8,
        ...restLegs,
        armR: { to: vec(s.headR * 0.45, headY + s.headR * 1.3), elbow: 'out' },
        armL: { to: vec(s.shoulderW * 0.15, pelvisY - s.torsoH * 0.4), elbow: 'down' },
      };
    }
    case 'curious': {
      // nach vorn gebeugt, Kopf gestreckt, eine Hand streckt sich nach vorn
      const sh = pelvisY - s.torsoH * 0.9;
      return {
        lean: 10,
        tilt: -9,
        ...restLegs,
        armL: { angle: 12, bend: 6 },
        armR: { to: vec(s.shoulderW * 0.5 + s.upperArm * 0.95, sh + 4), elbow: 'down' },
      };
    }
    case 'dance':
      // tanzt (Schritt 3a): kleiner Hüpfer, ein Arm angewinkelt nach oben, der andere locker nach außen, ein Bein schwingt
      return {
        dy: -7,
        lean: 7,
        tilt: -9,
        legL: { angle: 14, bend: 30 },
        legR: { angle: 34, bend: 48 },
        armL: { angle: 150, bend: 62 },
        armR: { angle: 48, bend: 88 },
      };
    case 'freeze':
      // erstarrt wie eine Statue (Schritt 3a): steif, ein Arm gestreckt nach oben, einer zur Seite, ein Bein angehoben (Standbein gerade)
      return {
        lean: -3,
        tilt: 5,
        legL: { angle: 2, bend: 0 },
        legR: { angle: 55, bend: 85 },
        armL: { angle: 168, bend: 0 },
        armR: { angle: 92, bend: 0 },
      };
    case 'watch':
      // schaut zu (nach dem ersten Bild-Test, 2026-10-18): ohne Gegenstand, Oberkörper leicht zum Geschehen (zur Bildmitte) geneigt,
      // Kopf zum Geschehen gedreht und etwas gesenkt, Arme hängen locker (kein Zeigen, kein Greifen)
      return {
        lean: 4,
        tilt: 12,
        legL: { angle: 3, bend: 0 },
        legR: { angle: 7, bend: 4 },
        armL: { angle: 5, bend: 6 },
        armR: { angle: 9, bend: 16 },
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
