// Baukasten (M9b, Schritt 3a): Übersichtsbilder für die Vorschau. Jede Pose mit Gegenstand in der Hand (Erwachsene und Kinder)
// und jeder Behälter mit seinen Inhalten. Es sind gewöhnliche Szenen (dieselben Layouts, Plätze und Prüfungen), nur ohne Aktivität.

import { holdPoseLabels } from './figureItems.ts';
import type { Catalog, HoldPoseName, Scene } from './types.ts';

export type Sheet = { name: string; title: string; scene: Scene };

// Eine Szene je Pose. Erwachsene stehen in der Mitte (nur dort bleibt ihr Kopf unter den Ecken der Pille).
export const poseSheets: readonly (Sheet & { pose: HoldPoseName | 'dance-freeze' | 'rain' | 'watch' })[] = [
  {
    pose: 'hold-plate',
    name: 'pose-hold-plate',
    title: 'Jette hält einen Teller mit Bratapfel, Ilka einen Korb mit Obst (hängend am Henkel), Mats einen Eimer mit Kastanien.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'hold-plate', holds: { right: { block: 'plate', content: 'baked-apples', size: 0.75 } } },
        { slot: 'middle', figure: 'ilka', pose: 'hold-plate', holds: { right: { block: 'basket', content: 'fruit', size: 0.75 } } },
        { slot: 'right', figure: 'mats', pose: 'hold-plate', holds: { right: { block: 'bucket', content: 'chestnuts', size: 0.6 } } },
      ],
    },
  },
  {
    pose: 'carry-tray',
    name: 'pose-carry-tray',
    title: 'Arne trägt das Tablett mit heißen Bratäpfeln (Ofenhandschuhe, Dampf), Jette ein kleineres Tablett mit Keksen, Mats eins mit Haferkugeln.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'carry-tray', holds: { both: { block: 'tray', content: 'cookies', size: 0.75 } } },
        { slot: 'middle', figure: 'arne', pose: 'carry-tray', mitts: true, holds: { both: { block: 'tray', content: 'baked-apples', hot: true } } },
        { slot: 'right', figure: 'mats', pose: 'carry-tray', holds: { both: { block: 'tray', content: 'oat-balls', size: 0.75 } } },
      ],
    },
  },
  {
    pose: 'point',
    name: 'pose-point',
    title: 'Nolli, Ilka und Stups zeigen (Stups fasst nichts an).',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'nolli', pose: 'point' },
        { slot: 'middle', figure: 'ilka', pose: 'point' },
        { slot: 'right', figure: 'stups', pose: 'point' },
      ],
    },
  },
  {
    pose: 'pour',
    name: 'pose-pour',
    title: 'Arne gießt aus der Kanne (die zweite Hand stützt sie), Jette mit einer kleineren Kanne, rechts ein Becher.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'pour', holds: { right: { block: 'jug', size: 0.6 } } },
        { slot: 'middle', figure: 'arne', pose: 'pour', holds: { right: { block: 'jug', size: 0.75 } } },
        { slot: 'right', block: 'cup', tint: 'petrol' },
      ],
    },
  },
  {
    pose: 'stir',
    name: 'pose-stir',
    title: 'Jette rührt Teig mit dem Holzlöffel, Ilka Wasser mit der Kelle, Mats mit der Gabel.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'stir', holds: { left: { block: 'bowl', content: 'dough', tint: 'honey', size: 0.6 }, right: { block: 'wooden-spoon', size: 0.6 } } },
        { slot: 'middle', figure: 'ilka', pose: 'stir', holds: { left: { block: 'bowl', content: 'water', tint: 'paper', size: 0.75 }, right: { block: 'ladle', size: 0.6 } } },
        { slot: 'right', figure: 'mats', pose: 'stir', holds: { left: { block: 'bowl', content: 'dough', tint: 'rose', size: 0.75 }, right: { block: 'fork', size: 0.75 } } },
      ],
    },
  },
  {
    pose: 'cut-supervised',
    name: 'pose-cut-supervised',
    title: 'Arne schneidet mit dem Messer, Jette schaut zu. Links hält Mats eine Kinderschere (rund, bunt); in einer Szene zu einer Aktivität nur, wenn die Checkliste und der Text es erlauben.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'mats', pose: 'cut-supervised', holds: { right: { block: 'child-scissors', size: 0.75 } } },
        { slot: 'middle', figure: 'arne', pose: 'cut-supervised', holds: { right: { block: 'knife', size: 0.75 } } },
        { slot: 'right', figure: 'jette', pose: 'curious' },
      ],
    },
  },
  {
    pose: 'hand-over',
    name: 'pose-hand-over',
    title: 'Ilka reicht einen Teller mit Keksen, Jette eine Schüssel mit Obst, Nolli schaut.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'hand-over', holds: { right: { block: 'bowl', content: 'fruit', tint: 'rose', size: 0.6 } } },
        { slot: 'middle', figure: 'ilka', pose: 'hand-over', holds: { right: { block: 'plate', content: 'cookies', size: 0.75 } } },
        { slot: 'right', figure: 'nolli', pose: 'curious' },
      ],
    },
  },
  {
    pose: 'write',
    name: 'pose-write',
    title: 'Jette und Mats schreiben am Tisch mit dem Wattestäbchen auf Papier, Arne steht hinter dem Tisch.',
    scene: {
      layout: 'table',
      items: [
        { slot: 'table', block: 'table' },
        { slot: 'left', figure: 'jette', pose: 'write', holds: { right: { block: 'cotton-swab', size: 0.6 }, surface: { block: 'paper', size: 0.6 } } },
        { slot: 'back', figure: 'arne', pose: 'thoughtful' },
        { slot: 'right', figure: 'mats', pose: 'write', holds: { right: { block: 'cotton-swab', size: 0.6 }, surface: { block: 'paper', size: 0.6 } } },
      ],
    },
  },
  {
    pose: 'dance-freeze',
    name: 'pose-dance-freeze',
    title: 'Tanzen und erstarren: Jette erstarrt wie eine Statue, Nolli tanzt, Stups schaut zu. (Erwachsene mit erhobenen Armen reichen in die Ecken der Pille.)',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'freeze' },
        { slot: 'middle', figure: 'nolli', pose: 'dance' },
        { slot: 'right', figure: 'stups', pose: 'watch' },
      ],
    },
  },
  {
    pose: 'ride',
    name: 'pose-ride',
    title: 'Fahrrad (neu nach dem ersten Bild-Test): Mats und Jette fahren mit Helm, die Hand am Lenker, die Füße an den Pedalen; Ilka schaut zu, dazwischen ein Stock (Slalom).',
    scene: {
      layout: 'outdoor',
      items: [
        { slot: 's1', figure: 'mats', pose: 'ride', helmet: 'honey', holds: { both: { block: 'bike', tint: 'petrol', size: 0.75 } } },
        { slot: 'mid', figure: 'ilka', pose: 'watch' },
        { slot: 's3', block: 'stick' },
        { slot: 's4', figure: 'jette', pose: 'ride', helmet: 'rose', holds: { both: { block: 'bike', size: 0.75 } } },
      ],
    },
  },
  {
    pose: 'watch',
    name: 'pose-watch',
    title: 'Schaut zu (neu nach dem ersten Bild-Test): Jette und Mats ohne Gegenstand, Kopf zum Geschehen in der Mitte gedreht, Arme locker.',
    scene: {
      layout: 'pair',
      items: [
        { slot: 'left', figure: 'jette', pose: 'watch' },
        { slot: 'middle', block: 'playing-cards', size: 1.5 },
        { slot: 'right', figure: 'mats', pose: 'watch' },
      ],
    },
  },
  {
    pose: 'rain',
    name: 'pose-rain',
    title: 'Regen-Kleidung: Jette (Rosé) trägt einen Eimer mit Blättern, Arne (Petrol) läuft, Mats (Petrol, die Mütze bleibt) hält einen Stock.',
    scene: {
      layout: 'outdoor',
      items: [
        { slot: 's1', figure: 'jette', pose: 'hold-plate', outfit: { kind: 'rain', tint: 'rose' }, holds: { right: { block: 'bucket', content: 'leaves', size: 0.6 } } },
        { slot: 'mid', figure: 'arne', pose: 'walk', outfit: { kind: 'rain', tint: 'petrol' } },
        { slot: 's4', figure: 'mats', pose: 'hold-plate', outfit: { kind: 'rain', tint: 'petrol' }, holds: { right: { block: 'stick', size: 0.6 } } },
      ],
    },
  },
];

export const poseSheetLabel = (pose: (typeof poseSheets)[number]['pose']): string =>
  pose === 'dance-freeze' ? 'tanzt, erstarrt' : pose === 'rain' ? 'Regen-Kleidung' : pose === 'watch' ? 'schaut zu' : holdPoseLabels[pose].de;

// Ein Bild je Behälter mit bis zu vier Inhalten nebeneinander (alle Inhalte, die in ihn passen).
export function containerSheets(catalog: Catalog): Sheet[] {
  const sheets: Sheet[] = [];
  const contents = [...catalog.values()].filter((block) => block.kind === 'content');
  const slots = ['s1', 's2', 's3', 's4'];
  for (const container of [...catalog.values()].filter((block) => block.container !== undefined)) {
    const fitting = contents.filter((content) => (content.fits ?? []).includes(container.id));
    const size = container.box.x1 - container.box.x0 > 90 ? 0.6 : 1;
    for (let start = 0; start < fitting.length; start += 4) {
      const part = fitting.slice(start, start + 4);
      sheets.push({
        name: `behaelter-${container.id}${start === 0 ? '' : `-${start / 4 + 1}`}`,
        title: `${container.label.de}: ${part.map((content) => content.label.de + (content.id === 'baked-apples' ? ' (heiß, mit Dampf)' : '')).join(', ')}`,
        scene: {
          layout: 'outdoor',
          items: part.map((content, index) => ({ slot: slots[index], block: container.id, content: content.id, size, hot: content.id === 'baked-apples' ? true : undefined })),
        },
      });
    }
  }
  return sheets;
}
