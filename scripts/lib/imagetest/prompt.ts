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
import type { Catalog, LoadedBlock, Scene, SceneItem } from '../kit/types.ts';

const tints = ['paper', 'rose', 'petrol', 'honey', 'brown'] as const;
const sizes = [2, 1.5, 1, 0.75, 0.6];

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
const usable = (catalog: Catalog): LoadedBlock[] => [...catalog.values()].filter((block) => block.kind !== 'ground');

// Das Schema der Antwort. Alle Felder sind Pflicht; was nicht gebraucht wird, ist `null` (wie im Wochenlauf).
export function buildSceneSchema(catalog: Catalog): Record<string, unknown> {
  const blockIds = usable(catalog).map((block) => block.id);
  const contentIds = usable(catalog).filter((block) => block.kind === 'content').map((block) => block.id);
  const figureIds = [...cast.humans, ...cast.pets].map((entry) => entry.spec.id);
  const poses = [...new Set([...freePoseNames, ...holdPoseNames, 'sit', 'hop', 'watch'])];
  const slots = [...new Set(Object.values(layouts).flatMap((layout) => Object.keys(layout.slots)))];
  const held = {
    type: 'object',
    additionalProperties: false,
    required: ['block', 'content', 'tint', 'hot', 'size'],
    properties: {
      block: { type: 'string', enum: blockIds },
      content: nullable({ type: 'string', enum: contentIds }),
      tint: nullable({ type: 'string', enum: [...tints] }),
      hot: nullable({ type: 'boolean' }),
      size: nullable({ type: 'number', enum: [1, 0.75, 0.6] }),
    },
  };
  // Ein gehaltener Gegenstand kommt fünfmal vor (links, rechts, beide, Tisch, Werkzeug der Hände): einmal in $defs, sonst Verweise.
  const heldRef = { $ref: '#/$defs/held' };
  const item = {
    type: 'object',
    additionalProperties: false,
    required: ['slot', 'block', 'figure', 'pose', 'tint', 'content', 'hot', 'size', 'flip', 'mitts', 'rainOutfit', 'holds', 'hands'],
    properties: {
      slot: { type: 'string', enum: slots },
      block: nullable({ type: 'string', enum: blockIds }),
      figure: nullable({ type: 'string', enum: figureIds }),
      pose: nullable({ type: 'string', enum: poses }),
      tint: nullable({ type: 'string', enum: [...tints] }),
      content: nullable({ type: 'string', enum: contentIds }),
      hot: nullable({ type: 'boolean' }),
      size: nullable({ type: 'number', enum: sizes }),
      flip: nullable({ type: 'boolean' }),
      mitts: nullable({ type: 'boolean' }),
      rainOutfit: nullable({ type: 'string', enum: ['rose', 'petrol'] }),
      holds: nullable({
        type: 'object',
        additionalProperties: false,
        required: ['left', 'right', 'both', 'surface'],
        properties: { left: nullable(heldRef), right: nullable(heldRef), both: nullable(heldRef), surface: nullable(heldRef) },
      }),
      hands: nullable({
        type: 'object',
        additionalProperties: false,
        required: ['figure', 'pose', 'tool', 'mitts', 'sleeve'],
        properties: {
          figure: { type: 'string', enum: cast.humans.map((entry) => entry.spec.id) },
          pose: { type: 'string', enum: [...handsPoseNames] },
          tool: nullable(heldRef),
          mitts: nullable({ type: 'boolean' }),
          sleeve: nullable({ type: 'string', enum: ['rose', 'petrol'] }),
        },
      }),
    },
  };
  return {
    $defs: { held },
    type: 'object',
    additionalProperties: false,
    required: ['noScene', 'reason', 'layout', 'items'],
    properties: {
      noScene: { type: 'boolean' },
      reason: { type: 'string' },
      layout: { type: 'string', enum: Object.keys(layouts) },
      items: { type: 'array', items: item },
    },
  };
}

export type ModelAnswer = { noScene: boolean; reason: string; scene: Scene };

type Raw = Record<string, unknown>;
const clean = <T extends Raw>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null)) as T;

// Macht aus der Antwort (mit `null` für Unbenutztes) eine Szene des Baukastens.
export function toScene(answer: unknown): ModelAnswer {
  const raw = (answer ?? {}) as { noScene?: unknown; reason?: unknown; layout?: unknown; items?: unknown };
  const items: SceneItem[] = (Array.isArray(raw.items) ? raw.items : []).map((entry) => {
    const item = clean({ ...(entry as Raw) });
    const { rainOutfit, holds, hands, ...rest } = item as Raw & { rainOutfit?: string; holds?: Raw; hands?: Raw };
    const out = rest as SceneItem;
    if (rainOutfit !== undefined) out.outfit = { kind: 'rain', tint: rainOutfit as 'rose' | 'petrol' };
    if (holds !== undefined) {
      const kept = Object.fromEntries(Object.entries(clean(holds)).map(([key, value]) => [key, clean(value as Raw)]));
      if (Object.keys(kept).length > 0) out.holds = kept as SceneItem['holds'];
    }
    if (hands !== undefined) {
      const h = clean(hands);
      if (h.tool !== undefined) h.tool = clean(h.tool as Raw);
      out.hands = h as unknown as SceneItem['hands'];
    }
    return out;
  });
  return {
    noScene: raw.noScene === true,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
    scene: { layout: (typeof raw.layout === 'string' ? raw.layout : 'pair') as Scene['layout'], items },
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
      '8. Höchstens 6 Einträge, ein Eintrag je Platz; ein Eintrag hat entweder block oder figure. Figuren haben immer Größe 1 (size null). Inhalte (content) stehen nur in Behältern, die sie in „passt in“ nennen, oder lose auf dem Tisch, wenn erlaubt.\n' +
      '9. Posen mit Gegenstand halten ihn in holds: hold-plate und hand-over in right, carry-tray in both (für Kinder size 0.75 oder 0.6), pour in right, stir: Schüssel in left und Werkzeug in right, cut-supervised und write: Werkzeug in right, optional surface (write nur am Tisch).\n' +
      '10. Im Layout hands hängen die Hände am Gegenstand auf dem Platz object (hands: figure, pose hold/stir/cut/write, Werkzeug in tool).',
    `Layouts:\n${layoutLines.join('\n')}`,
    `Figuren:\n${figureLines.join('\n')}`,
    `Posen ohne Gegenstand (Menschen): ${freePoseNames.join(', ')}.\nPosen mit Gegenstand:\n${holdLines.join('\n')}`,
    `Bausteine:\n${usable(catalog).map(describeBlock).join('\n')}`,
    `Beispiele (gültige Szenen):\n${examples.map((example) => `${example.name}: ${JSON.stringify(example.scene)}`).join('\n')}`,
  ].join('\n\n');
}

export function buildUserPrompt(activity: ProbeActivity, problems: readonly string[] = []): string {
  const de = activity.translations.de;
  const en = activity.translations.en;
  const lines = [
    `Aktivität ${activity.id}, ${activity.ageMin} bis ${activity.ageMax} Jahre. Material: ${activity.materials.join(', ')}.`,
    `Titel: ${de.title}`,
    `Kurz: ${de.summary}`,
    `Schritte: ${de.steps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`,
    `Sicherheitshinweis: ${de.safetyNote ?? '–'}`,
    `English title: ${en.title}. English safety note: ${en.safetyNote ?? '–'}`,
    'Setze genau ein Titelbild als JSON nach dem Schema.',
  ];
  if (problems.length > 0) lines.push(`Dein erster Vorschlag wurde verworfen. Die Prüfung meldete:\n- ${problems.join('\n- ')}\nSetze eine neue Szene, die diese Punkte vermeidet, oder antworte mit noScene: true.`);
  return lines.join('\n');
}
