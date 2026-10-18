// Bild-Test (nach dem ersten echten Lauf, 2026-10-18): Beispiele für die Szenenwahl im festen Teil der Anfrage.
// Zwei gute Titelbilder (von Clemens beschrieben) und ein Gegenbeispiel. Ein Test prüft, dass die guten mit ihren Aktivitäten
// alle Regeln bestehen (auch die für Titelbilder) und das Gegenbeispiel an genau den genannten Stellen scheitert.

import type { Scene } from '../kit/types.ts';

export type PromptExample = { name: string; activity: string; why: string; scene: Scene };

export const goodExamples: readonly PromptExample[] = [
  {
    name: 'Pfützen-Forscher',
    activity: 'puddle-explorers',
    why: 'Jette springt in Regenkleidung, Ilka ist dabei (Wasser unter 6 Jahren nur mit Erwachsenem) und trägt den Eimer mit Blättern, links liegt der Stock. Alles steht im Text, die Handlung ist auch winzig zu erkennen.',
    scene: {
      layout: 'outdoor',
      purpose: 'title',
      items: [
        { slot: 's1', block: 'stick' },
        { slot: 'mid', figure: 'ilka', pose: 'hold-plate', outfit: { kind: 'rain', tint: 'rose' }, holds: { right: { block: 'bucket', content: 'leaves', size: 0.6 } } },
        { slot: 's3', figure: 'jette', pose: 'happy', outfit: { kind: 'rain', tint: 'rose' } },
        { slot: 's4', block: 'puddle' },
      ],
    },
  },
  {
    name: 'Bratäpfel aus dem Ofen',
    activity: 'baked-apples',
    why: 'Arne trägt das heiße Blech mit Ofenhandschuhen (Hitze nur beim Erwachsenen), Jette wartet mit leerem Teller und Abstand. Die Bratäpfel aus dem Titel sind im Bild, das Messer nicht (gehört nur in ein Schrittbild).',
    scene: {
      layout: 'pair',
      purpose: 'title',
      items: [
        { slot: 'middle', figure: 'arne', pose: 'carry-tray', mitts: true, holds: { both: { block: 'baking-tray', content: 'baked-apples', hot: true, size: 0.75 } } },
        { slot: 'right', figure: 'jette', pose: 'hold-plate', holds: { right: { block: 'plate', size: 0.75 } } },
      ],
    },
  },
];

// Gegenbeispiel (so NICHT): Hände ohne Figur, ein Messer im Titelbild und Papier als Tüte für ein Tastsäckchen.
export const badExample = {
  name: 'Gegenbeispiel',
  why: 'Falsch: Layout hands gibt es nur für Schrittbilder (ein Titelbild braucht eine Figur); ein Messer gehört nie in ein Titelbild; paper ist ein flaches Blatt und nie die Tüte oder der Beutel (dafür cloth-bag oder paper-bag).',
  scene: {
    layout: 'hands',
    purpose: 'title',
    items: [
      { slot: 'object', block: 'plate', content: 'fruit', size: 2, hands: { figure: 'arne', pose: 'cut', tool: { block: 'knife' } } },
      { slot: 'right', block: 'paper' },
    ],
  } satisfies Scene,
} as const;
