// Bild-Test (M9b, Schritt 3b): Was die KI über den Baukasten wissen muss, und das Schema ihrer Antwort (Structured Outputs).
// Die KI wählt nur Layout, Plätze, Bausteine, Figuren und Posen; Koordinaten und SVG-Code gibt es in der Antwort nicht.
// Alles kommt aus den Quellen des Baukastens (Katalog, Layouts, Besetzung, Posen), damit keine zweite Liste veraltet. Reine Funktionen.

import { cast } from '../figures/cast.ts';
import { figureAges } from '../figures/castRules.ts';
import { petPosesOf } from '../figures/pets.ts';
import { backgrounds, skinCarriesOn, toneOf } from '../figures/skin.ts';
import { freePoseNames, handsPoseNames, holdPoseLabels, holdPoseNames } from '../kit/figureItems.ts';
import { layouts } from '../kit/layouts.ts';
import type { ProbeActivity } from '../kit/probe.ts';
import { hopAllowedInTitles, hotDistance } from '../kit/scene.ts';
import type { Catalog, HeldItem, LoadedBlock, Scene, ScenePurpose, SceneItem } from '../kit/types.ts';
import { badExample, goodExamples, type PromptExample } from './examples.ts';

const tints = ['paper', 'rose', 'petrol', 'honey', 'brown'] as const;
const sizes = [2, 1.5, 1, 0.75, 0.6];

const usable = (catalog: Catalog): LoadedBlock[] => [...catalog.values()].filter((block) => block.kind !== 'ground');

// Ersatzwerte für „nicht gesetzt“ (statt null): Die API erlaubt höchstens 16 Parameter mit Union-Typ (anyOf oder ["string","null"])
// je Anfrage, und jede Union macht die Grammatik teurer. Das Schema hat deshalb gar keine: Text-Felder nehmen "none",
// die Größe 0 (= Vorgabe), Wahrheitswerte false, `flip` "auto"; `holds` und `hands` sind Listen (leer = nichts).
export const none = 'none';
export const defaultSize = 0;
const heldSizes = [defaultSize, 1, 0.75, 0.6];
const flips = ['auto', 'yes', 'no'] as const;
export const holdHands = ['left', 'right', 'both', 'surface'] as const;

const helmets = [none, 'rose', 'petrol', 'honey'] as const;

// Das Schema der Antwort. Alle Felder sind Pflicht (keine optionalen Parameter), keine Unions.
// Für Titelbilder (der Bild-Test zeichnet nur sie) gibt es das Layout `hands` und Stups' gesperrte Pose `hop` gar nicht erst zur Auswahl.
// `missingBlocks`: Namen fehlender Bausteine, wenn keine Szene möglich ist (die KI darf sie vorschlagen, nie erfinden: die Szene kennt nur IDs aus dem Katalog).
export function buildSceneSchema(catalog: Catalog, purpose: ScenePurpose = 'title'): Record<string, unknown> {
  const blockIds = usable(catalog).map((block) => block.id);
  const contentIds = usable(catalog).filter((block) => block.kind === 'content').map((block) => block.id);
  const figureIds = [...cast.humans, ...cast.pets].map((entry) => entry.spec.id);
  const petPoses = purpose === 'title' && !hopAllowedInTitles ? ['sit', 'watch', 'stand', 'point'] : ['sit', 'hop', 'watch', 'stand', 'point'];
  const poses = [...new Set([...freePoseNames, ...holdPoseNames, ...petPoses])];
  const layoutNames = Object.keys(layouts).filter((name) => purpose !== 'title' || name !== 'hands');
  const slots = [...new Set(layoutNames.flatMap((name) => Object.keys(layouts[name as keyof typeof layouts].slots)))];
  const heldProperties = {
    block: { type: 'string', enum: [none, ...blockIds] },
    content: { type: 'string', enum: [none, ...contentIds] },
    tint: { type: 'string', enum: [none, ...tints] },
    hot: { type: 'boolean' },
    size: { type: 'number', enum: heldSizes },
  };
  const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
  const held = object(heldProperties);
  const hold = object({ hand: { type: 'string', enum: [...holdHands] }, ...heldProperties });
  const hands = object({
    figure: { type: 'string', enum: cast.humans.map((entry) => entry.spec.id) },
    pose: { type: 'string', enum: [...handsPoseNames] },
    tool: { $ref: '#/$defs/held' },
    mitts: { type: 'boolean' },
    sleeve: { type: 'string', enum: [none, 'rose', 'petrol'] },
  });
  const item = object({
    slot: { type: 'string', enum: slots },
    block: { type: 'string', enum: [none, ...blockIds] },
    figure: { type: 'string', enum: [none, ...figureIds] },
    pose: { type: 'string', enum: [none, ...poses] },
    tint: { type: 'string', enum: [none, ...tints] },
    content: { type: 'string', enum: [none, ...contentIds] },
    hot: { type: 'boolean' },
    size: { type: 'number', enum: [defaultSize, ...sizes] },
    flip: { type: 'string', enum: [...flips] },
    mitts: { type: 'boolean' },
    rainOutfit: { type: 'string', enum: [none, 'rose', 'petrol'] },
    helmet: { type: 'string', enum: [...helmets] },
    holds: { type: 'array', items: { $ref: '#/$defs/hold' } },
    ...(purpose === 'title' ? {} : { hands: { type: 'array', items: { $ref: '#/$defs/hands' } } }),
  });
  return {
    $defs: purpose === 'title' ? { held, hold } : { held, hold, hands },
    ...object({
      noScene: { type: 'boolean' },
      reason: { type: 'string' },
      missingBlocks: { type: 'array', items: { type: 'string' } },
      layout: { type: 'string', enum: layoutNames },
      items: { type: 'array', items: item },
    }),
  };
}

export type ModelAnswer = { noScene: boolean; reason: string; missingBlocks: string[]; scene: Scene; problems: string[] };

type Raw = Record<string, unknown>;


const text = (value: unknown): string | undefined => (typeof value === 'string' && value !== none && value !== '' ? value : undefined);
const sizeOf = (value: unknown): number | undefined => (typeof value === 'number' && value !== defaultSize ? value : undefined);
const yes = (value: unknown): true | undefined => (value === true ? true : undefined);
const defined = <T extends Raw>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

function toHeld(raw: unknown): HeldItem | undefined {
  const entry = (raw ?? {}) as Raw;
  const block = text(entry.block);
  if (block === undefined) return undefined;
  return defined({ block, content: text(entry.content), tint: text(entry.tint) as HeldItem['tint'], hot: yes(entry.hot), size: sizeOf(entry.size) }) as HeldItem;
}

// Macht aus der Antwort (mit Ersatzwerten für Unbenutztes) eine Szene des Baukastens. Was sich so nicht übersetzen lässt
// (eine Hand doppelt belegt, mehr als ein Paar Hände), steht in `problems` und gilt wie eine Meldung der Prüfung.
export function toScene(answer: unknown, purpose: ScenePurpose = 'title'): ModelAnswer {
  const raw = (answer ?? {}) as { noScene?: unknown; reason?: unknown; missingBlocks?: unknown; layout?: unknown; items?: unknown };
  const problems: string[] = [];
  const items: SceneItem[] = (Array.isArray(raw.items) ? raw.items : []).map((value) => {
    const entry = (value ?? {}) as Raw;
    const slot = typeof entry.slot === 'string' ? entry.slot : '';
    const flip = entry.flip === 'yes' ? true : entry.flip === 'no' ? false : undefined;
    const rain = text(entry.rainOutfit);
    const helmet = text(entry.helmet);
    const item = defined({
      slot,
      block: text(entry.block),
      figure: text(entry.figure),
      pose: text(entry.pose),
      tint: text(entry.tint),
      content: text(entry.content),
      hot: yes(entry.hot),
      size: sizeOf(entry.size),
      flip,
      mitts: yes(entry.mitts),
      outfit: rain === undefined ? undefined : { kind: 'rain', tint: rain },
      helmet,
    }) as SceneItem;
    const holds: Record<string, HeldItem> = {};
    for (const hold of Array.isArray(entry.holds) ? (entry.holds as Raw[]) : []) {
      const hand = String(hold.hand);
      const heldItem = toHeld(hold);
      if (heldItem === undefined) continue;
      if (holds[hand] !== undefined) problems.push(`Platz „${slot}“: Die Hand „${hand}“ hält zwei Dinge; eine Hand hält höchstens eins.`);
      holds[hand] = heldItem;
    }
    if (Object.keys(holds).length > 0) item.holds = holds as SceneItem['holds'];
    const handsList = Array.isArray(entry.hands) ? (entry.hands as Raw[]) : [];
    if (handsList.length > 1) problems.push(`Platz „${slot}“: höchstens ein Paar Hände (\`hands\`), hier ${handsList.length}.`);
    const hands = handsList[0];
    if (hands !== undefined) {
      item.hands = defined({
        figure: String(hands.figure),
        pose: String(hands.pose),
        tool: toHeld(hands.tool),
        mitts: yes(hands.mitts),
        sleeve: text(hands.sleeve),
      }) as unknown as SceneItem['hands'];
    }
    return item;
  });
  const missingBlocks = Array.isArray(raw.missingBlocks) ? raw.missingBlocks.filter((name): name is string => typeof name === 'string' && name.trim() !== '').map((name) => name.trim()) : [];
  return {
    noScene: raw.noScene === true,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
    missingBlocks,
    scene: { layout: (typeof raw.layout === 'string' ? raw.layout : 'pair') as Scene['layout'], items, purpose },
    problems,
  };
}

function describeBlock(block: LoadedBlock): string {
  const parts = [`${block.id} (${block.label.de}, ${block.kind})`];
  if ((block.tints ?? []).length > 0) parts.push(`Töne ${block.tints?.join('/')}`);
  if (block.hazards.length > 0) parts.push(`Merkmale ${block.hazards.join('/')}`);
  if (block.grips !== undefined) parts.push(`Haltepunkte ${Object.keys(block.grips).join('/')}`);
  if (block.container !== undefined) parts.push(`Behälter ${block.container.kind === 'flat' ? 'flach' : 'tief'}`);
  if (block.fits !== undefined) parts.push(`passt in ${block.fits.join('/')}${block.loose === true ? ', auch lose auf dem Tisch' : ''}`);
  if (block.kidSafe === true) parts.push('Kind darf sie halten, nur wenn der Text „Kinderschere“ nennt');
  if (block.hazards.includes('sharp')) parts.push('NIE im Titelbild');
  if (block.liquids !== undefined) parts.push(`Ton = Inhalt: ${(block.tints ?? []).map((tint) => `${tint} ${block.liquids?.[tint]?.label.de ?? 'leer'}`).join(', ')}`);
  if (block.notFor !== undefined) parts.push(`nie als Tüte oder Beutel (dafür ${block.notFor.use.join(' oder ')})`);
  if (block.grips?.handlebar !== undefined) parts.push('Pose ride: Figur fährt (mit helmet), sonst steht es da');
  const cover = [...block.materials, ...block.terms.de].slice(0, 6);
  if (!block.neutral) parts.push(`gedeckt durch: ${cover.join(', ')}`);
  return `- ${parts.join('; ')}`;
}

// Der feste Teil der Anfrage (gleich für alle Aktivitäten, damit er im Zwischenspeicher der API bleibt; nichts darin ändert sich je Aufruf).
// Seit dem ersten echten Lauf (2026-10-18): Titelbild-Regeln, zwei gute Beispiele, ein Gegenbeispiel, fehlende Bausteine melden.
export function buildSystemPrompt(catalog: Catalog, examples: readonly PromptExample[] = goodExamples, bad: { why: string; scene: Scene } = badExample): string {
  const titleLayouts = Object.values(layouts).filter((layout) => layout.name !== 'hands');
  const layoutLines = titleLayouts.map((layout) => {
    const slots = Object.entries(layout.slots).map(([name, slot]) => `${name} (x ${slot.x}, ${slot.kinds.join('/')}, Größen ${slot.sizes.join('/')})`);
    return `- ${layout.name}${['pair', 'outdoor', 'hero'].includes(layout.name) ? ' (bevorzugt)' : ''}: ${layout.description} Plätze: ${slots.join('; ')}`;
  });
  const figureLines = [
    ...cast.humans.map((h) => {
      const age = figureAges[h.spec.id];
      const carries = skinCarriesOn(toneOf(h.spec.skin), backgrounds.petrol);
      return `- ${h.spec.id} (${h.spec.name}, ${h.spec.role}${age === undefined ? ', Erwachsene' : `, passt zu Aktivitäten, die ${age.fits[0]} bis ${age.fits[1]} Jahre umfassen`}${carries ? '' : '; NIE etwas in Petrol an Kopf oder Händen'})`;
    }),
    ...cast.pets.map((p) => `- ${p.spec.id} (${p.spec.name}, Tier; Posen ${petPosesOf(p.spec.kind).filter((pose) => pose !== 'shoulder' && (hopAllowedInTitles || pose !== 'hop')).join('/')}; hält nie etwas; nur als Begleiter)`),
  ];
  const holdLines = holdPoseNames.map((name) => `- ${name}: ${holdPoseLabels[name].de}`);
  const exampleLines = examples.map((example) => `${example.name} (gut): ${example.why}\n${JSON.stringify(example.scene)}`);
  return [
    'Du setzt ein TITELBILD (das Bild auf der Karte) für eine Familien-App aus einem festen Baukasten zusammen. Du wählst nur Layout, Plätze, Bausteine, Figuren und Posen. Koordinaten und Zeichnungen gibt es nicht; ein Programm zeichnet das Bild und prüft es danach mechanisch.',
    'Ziel: Ein Blick auf das Bild (auch winzig, 96 × 48 Pixel) soll sagen, was man bei dieser Aktivität tut. Eine Figur, ein erkennbarer Gegenstand, eine klare Handlung. Bevorzugte Layouts: pair, outdoor, hero (table nur, wenn ein Tisch zur Aktivität gehört). Ist keine ehrliche Szene möglich, setze noScene: true und begründe es in reason; dann bleibt die Farbfläche der Karte, und das ist kein Fehler. Eine ehrliche „keine Szene“-Antwort ist besser als ein irreführendes Bild.',
    'Titelbild-Regeln (Verstoß = Bild wird verworfen):\n' +
      'T1. Mindestens eine Figur der Besetzung (jette, mats, nolli, ilka oder arne) und mindestens ein erkennbarer Gegenstand der Aktivität. stups und tuepfel kommen nur dazu, nie allein. Hände ohne Figur (Nahaufnahme) gibt es nur für Schrittbilder, nicht hier.\n' +
      'T2. Kein Messer und keine Schere (auch keine Kinderschere) im Titelbild. Zeige stattdessen die Zutat, das Ergebnis oder den Ort der Aktivität (Herbst-Salat: eine Figur mit der Schüssel voll Gemüse).\n' +
      'T3. Nennt der Titel einen Gegenstand (Fahrrad, Spielkarten, Zitrone …), muss er im Bild sein. Fehlt dafür ein Baustein, setze noScene: true und schreibe den Namen des fehlenden Gegenstands (deutsch, Einzahl) in missingBlocks. Lass ihn nie einfach weg, und nimm nie einen anderen Baustein als Ersatz.\n' +
      'T4. Für Bewegung ohne Gegenstand (Tanzen, Hüpfen, Laufen, Fangen): lieber zwei Figuren in Bewegung (dance, freeze, walk, cheer, happy) als ein Tier.\n' +
      'T5. Becher und Gläser: Der Ton ist der Inhalt. Zitronensaft und Saft sind honey, Wasser ist petrol, ein leerer Becher paper.\n' +
      'T6. paper ist ein flaches Blatt Papier, nie eine Tüte oder ein Beutel. Für Tüten und Säckchen gibt es paper-bag und cloth-bag.\n' +
      'T7. Wer Fahrrad fährt (Pose ride, das Fahrrad in holds both), trägt einen Helm (helmet rose, petrol oder honey).',
    'Sicherheitsregeln (Verstoß = Bild wird verworfen):\n' +
      '1. Ein Bild zeigt nichts, was der Text nicht sagt: Jeder Baustein und jeder Inhalt braucht sein Material in der Aktivität oder einen seiner Begriffe im Text (siehe „gedeckt durch“). Teller, Tisch, Stuhl, Kissen, Decke sind neutral. Regen-Kleidung nur, wenn der Text Regenjacke oder Gummistiefel nennt, Ofenhandschuhe nur, wenn er Ofen nennt.\n' +
      `2. Heißes (Backblech, hot: true) nur in der Hand eines Erwachsenen mit mitts: true; kein Kleinkind im Bild; andere Kinder mindestens ${hotDistance} Einheiten entfernt (ein Platz Abstand).\n` +
      '3. Tiere (stups, tuepfel) nie mit Heißem oder Scharfem, nie wenn die Aktivität Ofen, Herd, Messer, Schere oder Kerze nennt.\n' +
      '4. Schutzbrille nur, wenn der Sicherheitshinweis eine Brille nennt. Wasser (Pfütze, Wasser) bei Aktivitäten unter 6 Jahren nur mit Erwachsenem im Bild.\n' +
      '5. Kinder-Figuren nur passend zum Alter der Aktivität; nolli nur, wenn die Aktivität mit 2 Jahren oder jünger beginnt.\n' +
      '6. Erwachsene (ilka, arne) nur auf den Plätzen in der Mitte (pair: middle; outdoor: mid; table: back): An den Seiten verdeckt die Kategorie-Pille ihren Kopf. Erhobene Arme an den Seiten ebenso vermeiden.\n' +
      '7. Höchstens 6 Einträge, ein Eintrag je Platz; ein Eintrag hat entweder block oder figure (das andere ist "none"). Figuren haben immer size 0. Inhalte (content) stehen nur in Behältern, die sie in „passt in“ nennen, oder lose auf dem Tisch, wenn erlaubt.\n' +
      '8. Posen mit Gegenstand halten ihn in holds (Liste, je Hand ein Eintrag mit hand): hold-plate und hand-over mit hand right, carry-tray mit hand both (für Kinder size 0.75 oder 0.6), pour mit right, stir: Schüssel mit left und Werkzeug mit right, write: Werkzeug mit right, dazu freiwillig surface (nur am Tisch), ride: Fahrrad mit both (für Kinder size 0.75).\n' +
      'Leere Felder: Text "none", size 0 (= Vorgabe), hot und mitts false, flip "auto" (yes = gespiegelt, no = nicht gespiegelt), holds und missingBlocks leere Liste.\n' +
      '9. Besetzung: Die Anfrage nennt je Bild, welche Figur bevorzugt ist und welche gesperrt (keine Figur in mehr als 40 % der Bilder; Mats bevorzugt ab 8 Jahren; Stups gelegentlich als Begleiter). Eine gesperrte Figur verwirft das Bild.',
    `Layouts:\n${layoutLines.join('\n')}`,
    `Figuren:\n${figureLines.join('\n')}`,
    `Posen ohne Gegenstand (Menschen): ${freePoseNames.join(', ')} (watch = schaut zu, ohne Gegenstand).\nPosen mit Gegenstand:\n${holdLines.join('\n')}`,
    `Bausteine:\n${usable(catalog).map(describeBlock).join('\n')}`,
    `Beispiele:\n${exampleLines.join('\n')}\nGegenbeispiel (so NICHT): ${bad.why}\n${JSON.stringify(bad.scene)}`,
  ].join('\n\n');
}

export function buildUserPrompt(activity: ProbeActivity, problems: readonly string[] = [], casting = ''): string {
  const de = activity.translations.de;
  const en = activity.translations.en;
  const lines = [
    `Aktivität ${activity.id}, ${activity.ageMin} bis ${activity.ageMax} Jahre. Material: ${activity.materials.join(', ')}.`,
    `Titel: ${de.title}`,
    `Kurz: ${de.summary}`,
    `Schritte: ${de.steps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`,
    `Sicherheitshinweis: ${de.safetyNote ?? '–'}`,
    `English title: ${en.title}. English safety note: ${en.safetyNote ?? '–'}`,
  ];
  if (casting !== '') lines.push(casting);
  lines.push('Setze genau ein Titelbild als JSON nach dem Schema.');
  if (problems.length > 0) lines.push(`Dein erster Vorschlag wurde verworfen. Die Prüfung meldete:\n- ${problems.join('\n- ')}\nSetze eine neue Szene, die diese Punkte vermeidet, oder antworte mit noScene: true.`);
  return lines.join('\n');
}
