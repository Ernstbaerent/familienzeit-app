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
import { hotDistance } from '../kit/scene.ts';
import type { Catalog, HeldItem, LoadedBlock, Scene, SceneItem } from '../kit/types.ts';

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

// Das Schema der Antwort. Alle Felder sind Pflicht (keine optionalen Parameter), keine Unions.
export function buildSceneSchema(catalog: Catalog): Record<string, unknown> {
  const blockIds = usable(catalog).map((block) => block.id);
  const contentIds = usable(catalog).filter((block) => block.kind === 'content').map((block) => block.id);
  const figureIds = [...cast.humans, ...cast.pets].map((entry) => entry.spec.id);
  const poses = [...new Set([...freePoseNames, ...holdPoseNames, 'sit', 'hop', 'watch'])];
  const slots = [...new Set(Object.values(layouts).flatMap((layout) => Object.keys(layout.slots)))];
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
    holds: { type: 'array', items: { $ref: '#/$defs/hold' } },
    hands: { type: 'array', items: { $ref: '#/$defs/hands' } },
  });
  return {
    $defs: { held, hold, hands },
    ...object({
      noScene: { type: 'boolean' },
      reason: { type: 'string' },
      layout: { type: 'string', enum: Object.keys(layouts) },
      items: { type: 'array', items: item },
    }),
  };
}

export type ModelAnswer = { noScene: boolean; reason: string; scene: Scene; problems: string[] };

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
export function toScene(answer: unknown): ModelAnswer {
  const raw = (answer ?? {}) as { noScene?: unknown; reason?: unknown; layout?: unknown; items?: unknown };
  const problems: string[] = [];
  const items: SceneItem[] = (Array.isArray(raw.items) ? raw.items : []).map((value) => {
    const entry = (value ?? {}) as Raw;
    const slot = typeof entry.slot === 'string' ? entry.slot : '';
    const flip = entry.flip === 'yes' ? true : entry.flip === 'no' ? false : undefined;
    const rain = text(entry.rainOutfit);
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
  return {
    noScene: raw.noScene === true,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
    scene: { layout: (typeof raw.layout === 'string' ? raw.layout : 'pair') as Scene['layout'], items },
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
  const cover = [...block.materials, ...block.terms.de].slice(0, 6);
  if (!block.neutral) parts.push(`gedeckt durch: ${cover.join(', ')}`);
  return `- ${parts.join('; ')}`;
}

// Der feste Teil der Anfrage (gleich für alle Aktivitäten, damit er im Zwischenspeicher der API bleiben kann).
export function buildSystemPrompt(catalog: Catalog, examples: readonly { name: string; scene: Scene }[]): string {
  const layoutLines = Object.values(layouts).map((layout) => {
    const slots = Object.entries(layout.slots).map(([name, slot]) => `${name} (x ${slot.x}, ${slot.kinds.join('/')}, Größen ${slot.sizes.join('/')})`);
    return `- ${layout.name}: ${layout.description} Plätze: ${slots.join('; ')}`;
  });
  const figureLines = [
    ...cast.humans.map((h) => {
      const age = figureAges[h.spec.id];
      const carries = skinCarriesOn(toneOf(h.spec.skin), backgrounds.petrol);
      return `- ${h.spec.id} (${h.spec.name}, ${h.spec.role}${age === undefined ? ', Erwachsene' : `, passt zu Aktivitäten, die ${age.fits[0]} bis ${age.fits[1]} Jahre umfassen`}${carries ? '' : '; NIE etwas in Petrol an Kopf oder Händen'})`;
    }),
    ...cast.pets.map((p) => `- ${p.spec.id} (${p.spec.name}, Tier; Posen ${petPosesOf(p.spec.kind).filter((pose) => pose !== 'shoulder').join('/')}; hält nie etwas)`),
  ];
  const holdLines = holdPoseNames.map((name) => `- ${name}: ${holdPoseLabels[name].de}`);
  return [
    'Du setzt ein Titelbild für eine Familien-App aus einem festen Baukasten zusammen. Du wählst nur Layout, Plätze, Bausteine, Figuren und Posen. Koordinaten und Zeichnungen gibt es nicht; ein Programm zeichnet das Bild und prüft es danach mechanisch.',
    'Ziel: Ein Blick auf das Bild (auch winzig, 96 × 48 Pixel) soll sagen, was man bei dieser Aktivität tut. Wenige Dinge, eine klare Handlung. Passt keine Szene, setze noScene: true und begründe es in reason; dann bleibt die Farbfläche der Karte, und das ist kein Fehler.',
    'Harte Regeln (Verstoß = Bild wird verworfen):\n' +
      '1. Ein Bild zeigt nichts, was der Text nicht sagt: Jeder Baustein und jeder Inhalt braucht sein Material in der Aktivität oder einen seiner Begriffe im Text (siehe „gedeckt durch“). Regen-Kleidung nur, wenn der Text Regenjacke oder Gummistiefel nennt, Ofenhandschuhe nur, wenn er Ofen nennt.\n' +
      '2. Messer und spitze Schere nur in der Hand eines Erwachsenen (Pose cut-supervised), nie frei liegend, nie mit Kleinkind (nolli) im Bild. Die Kinderschere darf ein Kind nur halten, wenn die Aktivität ab 3 Jahren ist, ein Erwachsener im Bild ist und der Text „Kinderschere“ nennt.\n' +
      `3. Heißes (Backblech, hot: true) nur in der Hand eines Erwachsenen mit mitts: true; kein Kleinkind im Bild; andere Kinder mindestens ${hotDistance} Einheiten entfernt (ein Platz Abstand).\n` +
      '4. Tiere (stups, tuepfel) nie mit Heißem oder Scharfem, nie wenn die Aktivität Ofen, Herd, Messer, Schere oder Kerze nennt.\n' +
      '5. Schutzbrille nur, wenn der Sicherheitshinweis eine Brille nennt. Wasser (Pfütze, Wasser) bei Aktivitäten unter 6 Jahren nur mit Erwachsenem im Bild.\n' +
      '6. Kinder-Figuren nur passend zum Alter der Aktivität; nolli nur, wenn die Aktivität mit 2 Jahren oder jünger beginnt.\n' +
      '7. Erwachsene (ilka, arne) nur auf den Plätzen in der Mitte (pair: middle; outdoor: mid; table: back): An den Seiten verdeckt die Kategorie-Pille ihren Kopf. Erhobene Arme an den Seiten ebenso vermeiden.\n' +
      '8. Höchstens 6 Einträge, ein Eintrag je Platz; ein Eintrag hat entweder block oder figure (das andere ist "none"). Figuren haben immer size 0. Inhalte (content) stehen nur in Behältern, die sie in „passt in“ nennen, oder lose auf dem Tisch, wenn erlaubt.\n' +
      '9. Posen mit Gegenstand halten ihn in holds (Liste, je Hand ein Eintrag mit hand): hold-plate und hand-over mit hand right, carry-tray mit hand both (für Kinder size 0.75 oder 0.6), pour mit right, stir: Schüssel mit left und Werkzeug mit right, cut-supervised und write: Werkzeug mit right, dazu freiwillig surface (write nur am Tisch).\n' +
      '10. Im Layout hands hängen die Hände am Gegenstand auf dem Platz object (hands: eine Liste mit genau einem Eintrag: figure, pose hold/stir/cut/write, Werkzeug in tool, ohne Werkzeug tool.block "none").\n' +
      'Leere Felder: Text "none", size 0 (= Vorgabe), hot und mitts false, flip "auto" (yes = gespiegelt, no = nicht gespiegelt), holds und hands leere Liste.\n' +
      '11. Besetzung: Die Anfrage nennt je Bild, welche Figur bevorzugt ist und welche gesperrt (keine Figur in mehr als 40 % der Bilder; Mats bevorzugt ab 8 Jahren; Stups gelegentlich als Begleiter). Eine gesperrte Figur (auch als Hände) verwirft das Bild.',
    `Layouts:\n${layoutLines.join('\n')}`,
    `Figuren:\n${figureLines.join('\n')}`,
    `Posen ohne Gegenstand (Menschen): ${freePoseNames.join(', ')}.\nPosen mit Gegenstand:\n${holdLines.join('\n')}`,
    `Bausteine:\n${usable(catalog).map(describeBlock).join('\n')}`,
    `Beispiele (gültige Szenen):\n${examples.map((example) => `${example.name}: ${JSON.stringify(example.scene)}`).join('\n')}`,
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
