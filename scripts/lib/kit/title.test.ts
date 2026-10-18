// Nach dem ersten echten Bild-Test (2026-10-18): Titelbild und Schrittbild getrennt, kein Messer und keine Schere im Titelbild,
// Gegenstände aus dem Titel, neue Bausteine (Tasche, Tüte, Karten, Fahrrad, Hauswand, Gemüse), Papier nie als Tüte, Inhalt von Bechern,
// Stups' Pose hop, die Pose watch, Helm beim Fahrradfahren, kürzere Unterarme in der Nahaufnahme.

import { join } from 'node:path';

import { loadActivityData } from '../activityData';
import { checkBlock, loadCatalog, loadExampleScenes } from './catalog';
import { forearmEntryY, forearmSpread, freePoseNames, holdPoseNames } from './figureItems';
import { handsY } from './layouts';
import { loadProbe } from './probe';
import { checkScene, contextFromActivity, hopAllowedInTitles, placeItems, type ActivityContext } from './scene';
import { findTitleObjects, headWord, loadMaterialLabels, missingTitleBlocks, titleMentions } from './titleObjects';
import type { Scene, SceneItem } from './types';

const root = join(__dirname, '../../..');
const catalog = loadCatalog(root);
const labels = loadMaterialLabels(root);

function ctx(materials: string[], de: string, extra: Partial<ActivityContext> = {}): ActivityContext {
  return { materials, ageMin: 6, ageMax: 12, text: { de: de.toLowerCase(), en: '' }, safety: { de: '', en: '' }, ...extra };
}
const title = (layout: Scene['layout'], items: SceneItem[]): Scene => ({ layout, purpose: 'title', items });

describe('Titelbild und Schrittbild (Regel 1)', () => {
  const bowlText = ctx(['bowl'], 'rührt in der schüssel mit der gabel teig');

  it('das Layout hands ist im Titelbild ein Fehler, im Schrittbild erlaubt', () => {
    const items: SceneItem[] = [{ slot: 'object', block: 'bowl', content: 'dough', size: 1.5, hands: { figure: 'mats', pose: 'stir', tool: { block: 'fork' } } }];
    expect(checkScene(title('hands', items), catalog, bowlText).join(' ')).toMatch(/„hands“ \(Hände ohne Figur\) gibt es nur für Schrittbilder/);
    expect(checkScene({ layout: 'hands', purpose: 'step', items }, catalog, bowlText)).toEqual([]);
  });

  it('ein Titelbild braucht einen Menschen der Besetzung; ein Tier allein reicht nicht', () => {
    expect(checkScene(title('pair', [{ slot: 'middle', block: 'bowl' }]), catalog, bowlText).join(' ')).toMatch(/mindestens eine Figur der Besetzung/);
    expect(checkScene(title('pair', [{ slot: 'middle', block: 'bowl' }, { slot: 'right', figure: 'stups', pose: 'sit' }]), catalog, bowlText).join(' ')).toMatch(/mindestens eine Figur der Besetzung/);
    expect(checkScene(title('pair', [{ slot: 'middle', block: 'bowl' }, { slot: 'left', figure: 'jette', pose: 'watch' }]), catalog, bowlText)).toEqual([]);
  });

  it('ein Titelbild braucht einen Gegenstand; ohne Gegenstand nur zwei Figuren in Bewegung, und nur wenn der Baukasten nichts für das Material hat', () => {
    const dance = ctx(['musicPlayer'], 'tanzt zur musik aus dem radio');
    const one: SceneItem[] = [{ slot: 'left', figure: 'jette', pose: 'dance' }];
    expect(checkScene(title('pair', one), catalog, ctx([], 'lauft und hüpft')).join(' ')).toMatch(/nur zwei Figuren in Bewegung/);
    const two: SceneItem[] = [...one, { slot: 'right', figure: 'mats', pose: 'walk' }];
    expect(checkScene(title('pair', two), catalog, ctx([], 'lauft und hüpft'))).toEqual([]);
    // Das Radio gibt es als Baustein: dann muss es ins Bild
    expect(checkScene(title('pair', two), catalog, dance).join(' ')).toMatch(/erkennbaren Gegenstand der Aktivität/);
    expect(checkScene(title('pair', [...two, { slot: 'middle', block: 'radio' }]), catalog, dance)).toEqual([]);
  });

  it('ohne Angabe des Zwecks gelten nur die allgemeinen Regeln (Übersichtsbilder der Vorschau)', () => {
    expect(checkScene({ layout: 'pair', items: [{ slot: 'middle', block: 'bowl' }] }, catalog)).toEqual([]);
  });

  it('die Beispielszenen und Probebilder nennen ihren Zweck; hands-Beispiele sind Schrittbilder, die Probebilder Titelbilder', () => {
    for (const [name, scene] of loadExampleScenes(root)) expect([name, scene.purpose]).toEqual([name, scene.layout === 'hands' ? 'step' : 'title']);
    for (const scene of loadProbe(root).scenes.values()) {
      expect(scene.purpose).toBe('title');
      expect(scene.layout).not.toBe('hands');
    }
  });
});

describe('Kein Messer und keine Schere im Titelbild (Regel 2)', () => {
  const knife = ctx(['knife', 'apple'], 'ein erwachsener schneidet den apfel mit dem messer', { ageMin: 4 });
  const cutting: SceneItem[] = [{ slot: 'middle', figure: 'arne', pose: 'cut-supervised', holds: { right: { block: 'knife', size: 0.75 } } }, { slot: 'right', figure: 'jette', pose: 'watch' }];

  it('Messer in Erwachsenenhand: im Titelbild ein Fehler, im Schrittbild erlaubt', () => {
    expect(checkScene(title('pair', cutting), catalog, knife).join(' ')).toMatch(/„knife“: Messer und Scheren gehören nur in Schrittbilder/);
    expect(checkScene({ layout: 'pair', purpose: 'step', items: cutting }, catalog, knife)).toEqual([]);
  });

  it('auch die Kinderschere gehört nicht ins Titelbild, im Schrittbild gelten die bekannten Bedingungen', () => {
    const scissors = ctx(['scissors', 'paper'], 'schneidet mit der kinderschere papier', { ageMin: 4 });
    const kid: SceneItem[] = [{ slot: 'left', figure: 'jette', pose: 'cut-supervised', holds: { right: { block: 'child-scissors', size: 0.6 } } }, { slot: 'middle', figure: 'ilka', pose: 'watch' }];
    expect(checkScene(title('pair', kid), catalog, scissors).join(' ')).toMatch(/„child-scissors“: Messer und Scheren gehören nur in Schrittbilder/);
    expect(checkScene({ layout: 'pair', purpose: 'step', items: kid }, catalog, scissors)).toEqual([]);
    expect(checkScene({ layout: 'pair', purpose: 'step', items: [kid[0]] }, catalog, scissors).join(' ')).toMatch(/ohne Erwachsenen im Bild/);
  });
});

describe('Gegenstände aus dem Titel (Regel 3)', () => {
  const activity = (materials: string[], de: string, en: string) => ({ materials, translations: { de: { title: de }, en: { title: en } } });

  it('Hauptwort und Erwähnung im Titel (de und en, zusammengesetzte Wörter, Plural)', () => {
    expect(headWord('Fahrrad und Helm')).toBe('fahrrad');
    expect(headWord('Playing cards')).toBe('cards');
    expect(headWord('Radio oder Lautsprecher')).toBe('radio');
    expect(titleMentions('Kartentricks für die Familie', 'Spielkarten', 'de')).toBe(true);
    expect(titleMentions('Card tricks for the family', 'Playing cards', 'en')).toBe(true);
    expect(titleMentions('Bike slalom with sticks', 'Bike and helmet', 'en')).toBe(true);
    expect(titleMentions('Banana Oat Balls', 'Rolled oats', 'en')).toBe(true);
    expect(titleMentions('Gartenspiele', 'Spielkarten', 'de')).toBe(false);
    expect(titleMentions('Spot the difference', 'Pot', 'en')).toBe(false);
  });

  it('Fahrrad und Spielkarten haben jetzt Bausteine; ein Ball nicht (fehlender Baustein)', () => {
    const bike = findTitleObjects(activity(['bike', 'stick'], 'Fahrrad-Slalom mit Stöcken', 'Bike slalom with sticks'), labels, catalog);
    expect(bike.map((entry) => [entry.key, entry.blocks])).toEqual([['bike', ['bike']], ['stick', ['stick']]]);
    const cards = findTitleObjects(activity(['playingCards'], 'Kartentricks für die Familie', 'Card tricks for the family'), labels, catalog);
    expect(cards.map((entry) => [entry.key, entry.blocks])).toEqual([['playingCards', ['playing-cards']]]);
    const ball = findTitleObjects(activity(['ball'], 'Ball-Zielwurf', 'Ball toss'), labels, catalog);
    expect(missingTitleBlocks(ball)).toEqual(['Ball']);
  });

  it('Scharfes aus dem Titel zählt nicht (das Titelbild zeigt dann das Ergebnis), Material, das der Titel nicht nennt, auch nicht', () => {
    expect(findTitleObjects(activity(['scissors', 'paper'], 'Scherenschnitt-Sterne', 'Scissor-cut stars'), labels, catalog).map((entry) => entry.key)).toEqual([]);
    expect(findTitleObjects(activity(['bowl', 'fork'], 'Bananen-Haferkugeln', 'Banana oat balls'), labels, catalog)).toEqual([]);
  });

  it('ein Bild „Fahrrad-Slalom“ ohne Fahrrad ist ein Fehler; mit Fahrrad und Helm besteht es', () => {
    const data = { materials: ['bike', 'stick'], ageMin: 6, ageMax: 12, translations: { de: { title: 'Fahrrad-Slalom mit Stöcken', summary: 'Slalom mit dem Fahrrad und Helm.', steps: ['Stöcke in den Boden stecken.'] }, en: { title: 'Bike slalom with sticks', summary: 'Slalom by bike with a helmet.', steps: ['Put sticks in the ground.'] } } };
    const context = contextFromActivity(data, findTitleObjects(data, labels, catalog));
    const walking = title('outdoor', [{ slot: 's1', figure: 'mats', pose: 'walk' }, { slot: 's3', block: 'stick' }]);
    expect(checkScene(walking, catalog, context).join(' ')).toMatch(/Der Titel nennt „Fahrrad und Helm“, aber das Bild zeigt es nicht/);
    const riding = title('outdoor', [{ slot: 's1', figure: 'mats', pose: 'ride', helmet: 'honey', holds: { both: { block: 'bike', size: 0.75 } } }, { slot: 's3', block: 'stick' }]);
    expect(checkScene(riding, catalog, context)).toEqual([]);
  });

  it('die Probebilder zeigen alle Gegenstände aus ihren Titeln', () => {
    const probe = loadProbe(root);
    const activities = new Map([...loadActivityData().activities, ...probe.extra].map((entry) => [entry.id, entry]));
    for (const scene of probe.scenes.values()) {
      const data = activities.get(scene.activity) as Parameters<typeof contextFromActivity>[0];
      expect([scene.activity, ...checkScene(scene, catalog, contextFromActivity(data, findTitleObjects(data, labels, catalog)))]).toEqual([scene.activity]);
    }
  });
});

describe('Neue und überarbeitete Bausteine (Regel 6)', () => {
  it('alle neuen Bausteine bestehen die Regeln, mit Begriffen de und en, unter der Größengrenze', () => {
    for (const id of ['cloth-bag', 'paper-bag', 'playing-cards', 'bike', 'house-windows', 'vegetables', 'cotton-swab', 'bananas', 'paper']) {
      const block = catalog.get(id);
      expect(block).toBeDefined();
      expect([id, ...checkBlock(block as never)]).toEqual([id]);
      if (block?.neutral !== true) expect((block?.terms.de.length ?? 0) * (block?.terms.en.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('Tasche und Tüte: Öffnung (tiefer Behälter) und Griff; Blätter und Kastanien passen hinein', () => {
    for (const id of ['cloth-bag', 'paper-bag']) {
      expect(catalog.get(id)?.container?.kind).toBe('deep');
      expect(catalog.get(id)?.grips?.handle).toBeDefined();
      expect(catalog.get('leaves')?.fits).toContain(id);
    }
    expect(catalog.get('paper-bag')?.materials).toEqual(['paperBag']);
  });

  it('Spielkarten ohne Zahlen, Zeichen oder Schrift: nur Flächen, keine feinen Linien', () => {
    const svg = catalog.get('playing-cards')?.svg ?? '';
    expect(svg).not.toContain('{{fine}}');
    expect(svg).not.toMatch(/<text|<circle/);
  });

  it('Fahrrad: von der Seite, Haltepunkte für Lenker, Sattel und Pedal; Pose ride mit Helm', () => {
    expect(Object.keys(catalog.get('bike')?.grips ?? {}).sort()).toEqual(['handlebar', 'pedal', 'saddle']);
    expect(holdPoseNames).toContain('ride');
    const noHelmet = { layout: 'outdoor' as const, items: [{ slot: 's1', figure: 'mats', pose: 'ride', holds: { both: { block: 'bike', size: 0.75 } } }] };
    expect(checkScene(noHelmet, catalog).join(' ')).toMatch(/fährt Fahrrad ohne Helm/);
    const placed = placeItems({ ...noHelmet, items: [{ ...noHelmet.items[0], helmet: 'honey' as const }] }, catalog);
    expect(placed?.[0].problems).toEqual([]);
    // Der Helm braucht Deckung im Text (Material bike oder „Helm“)
    const helmet = { ...noHelmet, items: [{ ...noHelmet.items[0], helmet: 'rose' as const }] };
    expect(checkScene(helmet, catalog, ctx(['stick'], 'slalom um stöcke mit dem fahrrad')).join(' ')).toMatch(/Fahrradhelm ist im Text der Aktivität nicht gedeckt/);
    expect(checkScene(helmet, catalog, ctx(['bike'], 'slalom mit dem fahrrad'))).toEqual([]);
    // Jette trägt nie Petrol am Kopf: auch kein Petrol-Helm
    const jette = { layout: 'outdoor' as const, items: [{ slot: 's4', figure: 'jette', pose: 'ride', helmet: 'petrol' as const, holds: { both: { block: 'bike', size: 0.75 } } }] };
    expect(checkScene(jette, catalog, ctx(['bike'], 'fahrrad', { ageMin: 5, ageMax: 9 })).join(' ')).toMatch(/Hautton von „jette“.*trägt auf Petrol nicht/);
  });

  it('Hauswand mit Fenstern: zwei erleuchtet (Honig), zwei dunkel (Petrol), ohne feine Linien (Petrol-Regel)', () => {
    const svg = catalog.get('house-windows')?.svg ?? '';
    expect(svg.match(/fill="\{\{honey\}\}"/g)).toHaveLength(2);
    expect(svg.match(/fill="\{\{petrol\}\}"/g)).toHaveLength(2);
    expect(svg).not.toContain('{{fine}}');
  });

  it('Wattestäbchen mit genau einem Wattekopf, Bananen mit Stiel (Braun) und dunkler Spitze (Tinte)', () => {
    const swab = catalog.get('cotton-swab')?.svg ?? '';
    expect(swab.match(/stroke-width="\{\{line\}\}"/g)).toHaveLength(1); // nur ein Kopf mit Umriss, der Stiel ist fein
    expect(swab).not.toMatch(/<ellipse/);
    const banana = catalog.get('bananas')?.svg ?? '';
    expect(banana).toContain('fill="{{brown}}"');
    expect(banana).toContain('fill="{{ink}}"');
    expect(catalog.get('bananas')?.loose).toBe(true);
  });

  it('Papier ist nie Tüte oder Beutel: „Papiertüte“ deckt es nicht, und bei Tüte oder Beutel im Text braucht das Bild die Tüte selbst', () => {
    const paper = catalog.get('paper');
    expect(paper?.label.de).toMatch(/nie Tüte oder Beutel/);
    expect(paper?.materials).toEqual(['paper']);
    const scene = (extra: SceneItem[] = []) => title('pair', [{ slot: 'left', figure: 'jette', pose: 'watch' }, { slot: 'middle', block: 'paper', size: 1.5 }, ...extra]);
    const bagOnly = ctx(['paperBag'], 'steckt die dinge in eine papiertüte', { ageMin: 4, ageMax: 8 });
    expect(checkScene(scene(), catalog, bagOnly).join(' ')).toMatch(/„paper“ ist im Text der Aktivität nicht gedeckt/);
    const both = ctx(['paper', 'paperBag'], 'malt auf papier und steckt es in die tüte', { ageMin: 4, ageMax: 8 });
    expect(checkScene(scene(), catalog, both).join(' ')).toMatch(/„paper“ ist ein flaches Blatt, keine Tüte und kein Beutel/);
    expect(checkScene(scene([{ slot: 'right', block: 'paper-bag' }]), catalog, both)).toEqual([]);
  });

  it('Becher: Honig zeigt Zitronensaft, Petrol Wasser, Leinen ist leer; jeder Inhalt braucht Deckung im Text (Regel h)', () => {
    expect(catalog.get('cup')?.tints).toEqual(['petrol', 'honey', 'paper']);
    const cup = (tint: 'petrol' | 'honey' | 'paper') => title('pair', [{ slot: 'left', figure: 'jette', pose: 'watch' }, { slot: 'middle', block: 'cup', tint }]);
    const lemon = ctx(['lemon', 'plasticCup'], 'presst zitronensaft in einen becher', { ageMin: 6 });
    expect(checkScene(cup('honey'), catalog, lemon)).toEqual([]);
    expect(checkScene(cup('petrol'), catalog, lemon).join(' ')).toMatch(/„cup“ in „petrol“ zeigt Wasser, aber der Text nennt es nicht/);
    expect(checkScene(cup('paper'), catalog, lemon)).toEqual([]);
    const water = ctx(['tapWater', 'plasticCup'], 'füllt wasser in den becher', { ageMin: 6 });
    expect(checkScene(cup('petrol'), catalog, water)).toEqual([]);
    expect(checkScene(cup('honey'), catalog, water).join(' ')).toMatch(/zeigt Zitronensaft oder Saft/);
    expect(catalog.get('water')?.svg).toContain('{{petrol}}');
  });
});

describe('Posen und Nahaufnahme (Regeln 4, 5, 7)', () => {
  it('Stups hop ist für Titelbilder gesperrt (bis Clemens die Überarbeitung freigibt), sonst erlaubt', () => {
    expect(hopAllowedInTitles).toBe(false);
    const items: SceneItem[] = [{ slot: 'left', figure: 'jette', pose: 'dance' }, { slot: 'middle', block: 'radio' }, { slot: 'right', figure: 'stups', pose: 'hop' }];
    const dance = ctx(['musicPlayer'], 'tanzt zur musik', { ageMin: 3, ageMax: 9 });
    expect(checkScene(title('pair', items), catalog, dance).join(' ')).toMatch(/Stups in der Pose „hop“ ist für Titelbilder gesperrt/);
    expect(checkScene({ layout: 'pair', purpose: 'step', items }, catalog, dance)).toEqual([]);
  });

  it('die Pose watch gibt es für Menschen (ohne Gegenstand)', () => {
    expect(freePoseNames).toContain('watch');
    const items: SceneItem[] = [{ slot: 'left', figure: 'jette', pose: 'watch' }, { slot: 'right', figure: 'mats', pose: 'watch' }];
    expect(placeItems({ layout: 'pair', items }, catalog)?.map((p) => p.problems)).toEqual([[], []]);
    expect(checkScene({ layout: 'pair', items: [{ ...items[0], holds: { right: { block: 'plate' } } }] }, catalog).join(' ')).toMatch(/hält nichts/);
  });

  it('kürzere Unterarme in der Nahaufnahme: Tischkante tiefer, Arme steil von knapp unter dem Rand', () => {
    expect(handsY).toBe(160);
    expect(forearmSpread).toBeLessThan(36);
    expect(forearmEntryY).toBeLessThan(216);
    const placed = placeItems({ layout: 'hands', purpose: 'step', items: [{ slot: 'object', block: 'bowl', content: 'dough', size: 1.5, hands: { figure: 'mats', pose: 'stir', tool: { block: 'fork' } } }] }, catalog);
    const hands = placed?.[0].figure?.hands ?? [];
    expect(hands.length).toBe(2);
    // vorher: Gegenstand 10 Einheiten höher, Arm 36 zur Seite ab y = 216
    for (const hand of hands) expect(Math.hypot(forearmSpread, forearmEntryY - hand.c.y)).toBeLessThan(Math.hypot(36, 216 - (hand.c.y - 10)) - 15);
  });
});
