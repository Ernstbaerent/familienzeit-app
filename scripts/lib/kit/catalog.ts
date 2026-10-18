// Baukasten (M9b): Katalog laden und jeden Baustein gegen die Regeln prüfen (docs/bausteine/README.md).
// Ein Baustein ist `assets/bausteine/<gruppe>/<id>.svg` (nur Elemente, kein <svg>) plus ein Eintrag in `assets/bausteine/katalog.json`.
// Die Prüfung ist reiner Text, ohne Browser: Sie sichert Palette, Linienstärken, erlaubten SVG-Code, Maße und die Petrol-Regel.
// Ob ein Baustein gut aussieht, sieht ein Mensch auf der Vorschau (npm run kit:preview).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { elementNames, estimateBox, parseElements } from './geometry.ts';
import { getMaterialInfo, isMaterialKey } from '../../../src/features/activities/materials.ts';
import type { Block, Catalog, GripName, KitHazard, LoadedBlock, Scene, TintName } from './types.ts';

export const kitDir = 'assets/bausteine';

export const tintNames: readonly TintName[] = ['paper', 'rose', 'petrol', 'honey', 'brown'];
export const hazardNames: readonly KitHazard[] = ['sharp', 'heat', 'goggles', 'smallParts', 'water'];
export const gripNames: readonly GripName[] = ['handle', 'tip', 'left', 'right', 'under', 'handlebar', 'saddle', 'pedal'];
// Neutrale Gegenstände (Entscheidung von Clemens, 2026-10-17): Sie dürfen im Bild stehen, auch wenn der Text sie nicht nennt,
// weil sie nichts Sicherheitsrelevantes ändern. Nur diese (dazu die Standlinie); eine Erweiterung entscheidet Clemens.
// Nie neutral: alles, was scharf, heiß, elektrisch oder klein ist, und kein Inhalt.
export const neutralBlockIds: readonly string[] = ['ground-line', 'table', 'chair', 'pillow', 'blanket', 'plate'];
// Farbplätze und Maßplätze, die ein Baustein nutzen darf. `tint` ist der Platz für den Ton, den die Szene wählt.
const colorPlaceholders = ['ink', 'paper', 'rose', 'petrol', 'honey', 'brown', 'ground', 'tint'];
const sizePlaceholders = ['line', 'fine', 'shift'];

export const maxBlockBytes = 2000;
// Der gezeichnete Rahmen darf höchstens so viel kleiner sein als die angegebene Fläche (sonst sagt die Fläche nichts mehr).
const looseBox = 8;
const tightBox = 1; // und höchstens so viel größer
// Erlaubt als Platz unter der Standlinie: die versetzte Farbfläche (3) plus Linie (2).
const belowBase = 5;

const allowedAttributes = new Set([
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'points',
  'fill', 'stroke', 'stroke-width', 'transform',
]);

// Wörter im Namen, die ein Baustein nie haben darf: Feuer gibt es im Baukasten nicht (Sicherheits-Checkliste, Punkt 7).
const fireWords = /flame|fire|candle|kerze|flamme|feuer|match|streichholz|lighter|feuerzeug/i;

export function loadCatalog(root: string): Catalog {
  const raw = JSON.parse(readFileSync(join(root, kitDir, 'katalog.json'), 'utf8')) as { blocks: Block[] };
  const catalog = new Map<string, LoadedBlock>();
  for (const block of raw.blocks) {
    if (catalog.has(block.id)) throw new Error(`Baustein „${block.id}“ steht zweimal im Katalog.`);
    const svg = readFileSync(join(root, kitDir, block.group, `${block.id}.svg`), 'utf8').trim();
    catalog.set(block.id, { ...block, svg });
  }
  return catalog;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{([^{}]*)\}\}/g)].map((match) => match[1]);
}

// Alle Probleme eines Bausteins als Sätze, leer = in Ordnung.
export function checkBlock(block: LoadedBlock): string[] {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(`${block.id}: ${message}`);

  if (!/^[a-z][a-z0-9-]*$/.test(block.id)) fail('Die ID besteht nur aus kleinen Buchstaben, Ziffern und Bindestrichen.');
  if (fireWords.test(block.id) || fireWords.test(block.label.de) || fireWords.test(block.label.en)) {
    fail('Feuer, Flammen und Kerzen gibt es im Baukasten nicht.');
  }
  if (Buffer.byteLength(block.svg) > maxBlockBytes) fail(`Größer als ${maxBlockBytes} Byte.`);
  if (block.svg.includes('<svg') || block.svg.includes('<g') || block.svg.includes('<!--')) {
    fail('Nur Elemente, kein <svg>, <g> oder Kommentar (der Zeichner setzt Gruppe, Linienenden und Platz).');
  }

  // Farbplätze und Maßplätze
  for (const name of placeholders(block.svg)) {
    if (![...colorPlaceholders, ...sizePlaceholders].includes(name)) fail(`Unbekannter Platzhalter {{${name}}}.`);
  }
  if (/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|url\(/i.test(block.svg)) fail('Feste Farben und url(…) sind verboten, nur Farbplätze.');
  const tints = block.tints ?? [];
  if (block.svg.includes('{{tint}}') && tints.length === 0) fail('{{tint}} ohne erlaubte Töne (`tints`).');
  if (!block.svg.includes('{{tint}}') && tints.length > 0) fail('`tints` angegeben, aber {{tint}} kommt nicht vor.');
  for (const tint of tints) if (!tintNames.includes(tint)) fail(`Unbekannter Ton „${tint}“.`);
  if (tints.length > 0 && (block.defaultTint === undefined || !tints.includes(block.defaultTint))) {
    fail('`defaultTint` fehlt oder steht nicht in `tints`.');
  }

  // Elemente
  const elements = parseElements(block.svg);
  if (elements.length === 0) fail('Keine Elemente gefunden.');
  const hasPetrol = block.svg.includes('{{petrol}}') || tints.includes('petrol');
  for (const { name, attrs } of elements) {
    if (!(elementNames as readonly string[]).includes(name)) {
      fail(`Element <${name}> ist nicht erlaubt (erlaubt: ${elementNames.join(', ')}).`);
      continue;
    }
    for (const attr of Object.keys(attrs)) if (!allowedAttributes.has(attr)) fail(`Attribut ${attr} ist nicht erlaubt (<${name}>).`);
    if (attrs.fill === undefined) fail(`<${name}> ohne fill (der Standard wäre Schwarz).`);
    else if (attrs.fill !== 'none' && !/^\{\{[a-z]+\}\}$/.test(attrs.fill)) fail(`fill="${attrs.fill}" ist kein Farbplatz.`);
    if (attrs.stroke !== undefined && attrs.stroke !== 'none' && !['{{ink}}', '{{paper}}'].includes(attrs.stroke)) {
      fail(`stroke="${attrs.stroke}": Linien sind Tinte oder (Details auf Petrol) Leinen.`);
    }
    if (attrs.stroke === 'none') {
      if (attrs['stroke-width'] !== undefined) fail('stroke="none" mit stroke-width.');
    } else if (attrs['stroke-width'] !== '{{line}}' && attrs['stroke-width'] !== '{{fine}}') {
      fail(`<${name}> braucht stroke="none" oder stroke-width="{{line}}" bzw. "{{fine}}" (nur zwei Linienstärken).`);
    }
    if (attrs.transform !== undefined) {
      if (attrs.transform !== 'translate({{shift}} {{shift}})') fail('transform ist nur die versetzte Farbfläche: translate({{shift}} {{shift}}).');
      if (attrs.stroke !== 'none') fail('Die versetzte Farbfläche hat stroke="none".');
    }
    // Petrol-Regel: Tinte auf Petrol hat nur 1,8:1. Hat ein Baustein Petrol-Flächen, sind feine Linien Leinen.
    if (hasPetrol && attrs['stroke-width'] === '{{fine}}' && attrs.stroke !== '{{paper}}') {
      fail('Petrol-Regel: In einem Baustein mit Petrol sind feine Linien ({{fine}}) Leinen (stroke="{{paper}}"), nicht Tinte.');
    }
  }

  // Maße
  const box = estimateBox(block.svg);
  if (box === null) {
    fail('Maße nicht lesbar: Pfade nur mit absoluten Befehlen (M L H V C S Q T Z), keine Bögen.');
  } else {
    const { x0, x1, h } = block.box;
    if (!(x0 < 0 && x1 > 0 && h > 0)) fail('box: x0 < 0 < x1 und h > 0.');
    const drawn = `gezeichnet: ${Math.floor(box.minX)}…${Math.ceil(box.maxX)}, Höhe ${Math.ceil(-box.minY)}`;
    const checks: [string, number, number][] = [
      ['links', box.minX, x0],
      ['rechts', x1, box.maxX],
      ['oben', box.minY, -h],
      ['unten', belowBase, box.maxY],
    ];
    for (const [side, inner, outer] of checks) {
      if (inner < outer - tightBox) fail(`Die Zeichnung ragt ${side} über die angegebene Fläche (${block.box.x0}…${block.box.x1}, Höhe ${block.box.h}) hinaus (${drawn}).`);
    }
    const slack: [string, number][] = [
      ['links', box.minX - x0],
      ['rechts', x1 - box.maxX],
      ['oben', box.minY + h],
    ];
    for (const [side, gap] of slack) if (gap > looseBox) fail(`Die angegebene Fläche ist ${side} um ${gap.toFixed(0)} Einheiten zu groß (höchstens ${looseBox}; ${drawn}).`);
  }

  // Angaben
  for (const hazard of block.hazards) if (!hazardNames.includes(hazard)) fail(`Unbekanntes Merkmal „${hazard}“.`);
  // Haltepunkte liegen auf dem Baustein (in seiner Fläche), Behälter und Inhalte passen zusammen (Schritt 3a).
  const { x0, x1, h } = block.box;
  for (const [name, point] of Object.entries(block.grips ?? {})) {
    if (!gripNames.includes(name as GripName)) fail(`Unbekannter Haltepunkt „${name}“ (erlaubt: ${gripNames.join(', ')}).`);
    else if (point[0] < x0 - 2 || point[0] > x1 + 2 || point[1] < -h - 2 || point[1] > 2) fail(`Haltepunkt „${name}“ (${point.join(' ')}) liegt außerhalb der Fläche.`);
  }
  if (block.grips?.tip !== undefined && block.grips.handle === undefined) fail('Eine Spitze (`tip`) gibt es nur zusammen mit einem Griff (`handle`).');
  if (block.container !== undefined && block.kind === 'content') fail('Ein Inhalt ist kein Behälter.');
  if (block.kind === 'content') {
    if ((block.fits ?? []).length === 0) fail('Ein Inhalt braucht `fits` (die Behälter, in die er passt).');
    if (block.grips !== undefined) fail('Ein Inhalt hat keine Haltepunkte.');
  } else if (block.fits !== undefined || block.fill !== undefined || block.loose !== undefined) fail('`fits`, `fill` und `loose` gibt es nur bei Inhalten.');
  if (block.loose === true && block.fill === true) fail('Eine Fläche (`fill`) kann nicht lose liegen.');
  if (block.kidSafe === true && !block.hazards.includes('sharp')) fail('`kidSafe` gibt es nur bei scharfen Dingen (Kinderschere).');
  if (block.kidSafe === true && (block.kidTerms === undefined || block.kidTerms.de.length === 0 || block.kidTerms.en.length === 0)) fail('`kidSafe` braucht `kidTerms` in Deutsch und Englisch (der Text muss sie nennen).');
  for (const [tint, liquid] of Object.entries(block.liquids ?? {})) {
    if (!(block.tints ?? []).includes(tint as TintName)) fail(`\`liquids\`: Ton „${tint}“ steht nicht in \`tints\`.`);
    if (liquid !== undefined && liquid.materials.length === 0 && (liquid.terms.de.length === 0 || liquid.terms.en.length === 0)) fail(`\`liquids.${tint}\` braucht Material oder Begriffe in Deutsch und Englisch.`);
  }
  if (block.notFor !== undefined && (block.notFor.use.length === 0 || block.notFor.de.length === 0 || block.notFor.en.length === 0)) fail('`notFor` braucht Wörter in Deutsch und Englisch und Ersatz-Bausteine (`use`).');
  if (block.surface !== undefined && block.kind !== 'furniture') fail('`surface` gibt es nur bei Möbeln (Tisch).');
  if (block.neutral) {
    if (!neutralBlockIds.includes(block.id)) fail(`Neutral dürfen nur ${neutralBlockIds.join(', ')} sein (Entscheidung von Clemens).`);
    if (block.kind === 'content') fail('Ein Inhalt ist nie neutral (er zeigt, was gemacht wird).');
    if (block.hazards.length > 0) fail(`Ein neutraler Baustein darf kein Merkmal haben (hier: ${block.hazards.join(', ')}): Scharfes, Heißes, Wasser und Kleinteile sind nie neutral.`);
    const materialHazards = block.materials.flatMap((key) => (isMaterialKey(key) ? (getMaterialInfo(key).hazards ?? []) : []));
    if (materialHazards.length > 0) fail(`Ein neutraler Baustein darf kein Material mit Gefahr haben (hier: ${[...new Set(materialHazards)].join(', ')}), z. B. nichts Elektrisches.`);
  }
  if (!block.neutral && (block.terms.de.length === 0 || block.terms.en.length === 0)) {
    fail('Ein Baustein, der nicht neutral ist, braucht Begriffe in Deutsch und Englisch (`terms`), sonst lässt er sich nicht mit dem Text abgleichen.');
  }
  if (block.label.de.trim() === '' || block.label.en.trim() === '') fail('Name in Deutsch und Englisch fehlt.');
  return problems;
}

// Prüft den ganzen Katalog: jeder Baustein, eindeutige IDs, Pflichtbausteine.
export function checkCatalog(catalog: Catalog): string[] {
  const problems = [...catalog.values()].flatMap(checkBlock);
  for (const id of ['ground-line', 'table']) if (!catalog.has(id)) problems.push(`Pflichtbaustein „${id}“ fehlt.`);
  const table = catalog.get('table');
  if (table !== undefined && table.surface === undefined) problems.push('table: `surface` (Höhe der Tischplatte) fehlt.');
  for (const block of catalog.values()) {
    for (const id of block.notFor?.use ?? []) if (!catalog.has(id)) problems.push(`${block.id}: „${id}“ in \`notFor.use\` gibt es nicht.`);
    for (const id of block.fits ?? []) {
      const container = catalog.get(id);
      if (container?.container === undefined) problems.push(`${block.id}: „${id}“ in \`fits\` ist kein Behälter.`);
      else if (block.fill === true && container.container.kind !== 'deep') problems.push(`${block.id}: Eine Fläche passt nur in tiefe Behälter, „${id}“ ist flach.`);
    }
  }
  return problems;
}

// Beispielszenen (assets/bausteine/beispiele/<name>.scene.json): Name ohne Endung → Szene.
export function loadExampleScenes(root: string): Map<string, Scene & { activity?: string }> {
  const dir = join(root, kitDir, 'beispiele');
  const scenes = new Map<string, Scene & { activity?: string }>();
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.scene.json')).sort()) {
    scenes.set(file.replace('.scene.json', ''), JSON.parse(readFileSync(join(dir, file), 'utf8')) as Scene & { activity?: string });
  }
  return scenes;
}
