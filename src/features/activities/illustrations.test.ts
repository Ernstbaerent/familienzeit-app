// PILOT Illustrationen: Die Dateien in assets/illustrations/ halten die mechanisch prüfbaren Stilregeln ein
// (docs/design/ILLUSTRATIONEN.md), und die zentrale Zuordnung passt zu Dateien und Aktivitäten.
// Was sich nicht mechanisch prüfen lässt (Linienstärke, Lesbarkeit, Sicherheit), prüft ein Mensch beim Ansehen.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { lightTheme } from '@/lib/theme';
import { illustrationPalette } from '@/lib/palette';

import { findPlaceholders, illustrationColorNames, renderTemplate } from '../../../scripts/lib/illustrations';

import { activityIllustrations, getIllustration, getStepIllustrations, illustrationDir } from './illustrations';
import { getBundledActivities } from './bundledActivities';

const root = join(__dirname, '../../..');
const dir = join(root, illustrationDir);
const files = readdirSync(dir).filter((name) => name.endsWith('.svg'));
const templateDir = join(dir, 'src');
const templates = readdirSync(templateDir).filter((name) => name.endsWith('.svg'));
const read = (file: string) => readFileSync(join(dir, file), 'utf8');

// Die Farben der Zeichnungs-Palette (src/lib/palette.ts): Leinen, Rosé, Petrol, Tinte und die zwei warmen Gegenstandsfarben.
const palette = Object.values(illustrationPalette).map((color) => color.toUpperCase());

const allowedElements = ['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'];

// Alle Einträge der Zuordnung: Titelbilder und Schrittbilder, mit Aktivität und Schrittnummer.
const entries = Object.entries(activityIllustrations).flatMap(([id, { cover, steps }]) => [
  { id, step: undefined as number | undefined, file: cover.file },
  ...Object.entries(steps ?? {}).map(([step, illustration]) => ({ id, step: Number(step), file: illustration.file })),
]);

describe('Dateien in assets/illustrations/', () => {
  it('jede Datei steht genau einmal in der Zuordnung, und jede Zuordnung hat eine Datei', () => {
    const mapped = entries.map((entry) => entry.file);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect([...mapped].sort()).toEqual([...files].sort());
  });

  it.each(files)('%s: SVG, unter 10 KB', (file) => {
    expect(file).toMatch(/\.svg$/);
    expect(statSync(join(dir, file)).size).toBeLessThan(10 * 1024);
  });

  it.each(files)('%s: Zeichenfläche 400 × 200 (2:1), Eigengröße 1200 × 600', (file) => {
    const svg = read(file);
    const tag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
    expect(tag).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(tag).toContain('viewBox="0 0 400 200"');
    expect(tag).toContain('width="1200"');
    expect(tag).toContain('height="600"');
  });

  it.each(files)('%s: nur Farben aus der Zeichnungs-Palette', (file) => {
    const svg = read(file);
    const colors = (svg.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((color) => color.toUpperCase());
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) expect(palette).toContain(color);
    // Farben nur als Wert, nicht als Name (red) oder Funktion (rgb(…)).
    for (const [, value] of svg.matchAll(/\b(?:fill|stroke)="([^"]*)"/g)) expect(value === 'none' || value.startsWith('#')).toBe(true);
  });

  it.each(files)('%s: nur erlaubter SVG-Code (kein Text, keine Bilder, keine Links, kein CSS)', (file) => {
    const svg = read(file);
    for (const [, element] of svg.matchAll(/<([a-zA-Z][\w:-]*)/g)) expect(allowedElements).toContain(element);
    expect(svg).not.toMatch(/href|url\(|opacity|style=|class=|<!\[CDATA\[|@import|font/i);
  });
});

// Farbplätze (ILLUSTRATIONEN.md): Jede Zeichnung entsteht aus einer Vorlage mit Platzhaltern. Die Dateien in assets/illustrations/ sind erzeugt.
describe('Vorlagen in assets/illustrations/src/', () => {
  it('jede Zeichnung hat genau eine Vorlage und jede Vorlage eine Zeichnung', () => {
    expect([...templates].sort()).toEqual([...files].sort());
  });

  it.each(templates)('%s: Farben nur als Platzhalter, nur bekannte Rollen, keine festen Farbwerte', (file) => {
    const template = readFileSync(join(templateDir, file), 'utf8');
    expect(template).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const names = findPlaceholders(template);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(illustrationColorNames).toContain(name);
  });

  it.each(templates)('%s: die erzeugte Datei passt zu Vorlage und Palette (sonst: npm run illustrations:build)', (file) => {
    const template = readFileSync(join(templateDir, file), 'utf8');
    expect(read(file)).toBe(renderTemplate(template));
    expect(read(file)).not.toContain('{{');
  });

  it('ein unbekannter Farbplatz ist ein Fehler, ein Wechsel der Palette wechselt alle Farben', () => {
    expect(() => renderTemplate('<path fill="{{tomato}}"/>')).toThrow(/Unbekannter Farbplatz/);
    expect(renderTemplate('<path fill="{{rose}}" stroke="{{ink}}"/>', { rose: '#111111', ink: '#222222' })).toBe(
      '<path fill="#111111" stroke="#222222"/>',
    );
  });

  it('die warmen Gegenstandsfarben (Honig, Braun) sind keine Farben der App-Oberfläche', () => {
    const theme = Object.values(lightTheme.colors);
    expect(theme).not.toContain(illustrationPalette.honey);
    expect(theme).not.toContain(illustrationPalette.brown);
  });
});

describe('Zuordnung Aktivität → Illustration', () => {
  const activities = new Map(getBundledActivities().map((activity) => [activity.id, activity]));

  it.each(entries.map((entry) => [entry.file, entry] as const))('%s gehört zu einer freigegebenen Aktivität', (_, entry) => {
    expect(activities.has(entry.id)).toBe(true);
  });

  it.each(entries.map((entry) => [entry.file, entry] as const))('%s hat den Namen aus Aktivität und Schrittnummer', (_, entry) => {
    expect(entry.file).toBe(entry.step === undefined ? `${entry.id}.svg` : `${entry.id}-step-${entry.step}.svg`);
  });

  it('Schrittbilder gehören zu Schritten, die es in jeder Sprache gibt (Nummer ab 1)', () => {
    for (const entry of entries.filter((item) => item.step !== undefined)) {
      const step = entry.step as number;
      expect(Number.isInteger(step)).toBe(true);
      expect(step).toBeGreaterThanOrEqual(1);
      for (const text of Object.values(activities.get(entry.id)?.translations ?? {})) {
        expect(step).toBeLessThanOrEqual(text.steps.length);
      }
    }
  });

  it('Pilot: genau drei Aktivitäten, Schrittbilder nur beim Sockenpuppen-Theater (Schritte 1 bis 3)', () => {
    expect(Object.keys(activityIllustrations).sort()).toEqual(['baking-soda-volcano', 'homemade-pizza', 'sock-puppet-theater']);
    expect(Object.keys(getStepIllustrations('sock-puppet-theater') ?? {})).toEqual(['1', '2', '3']);
    expect(getStepIllustrations('homemade-pizza')).toBeUndefined();
    expect(getStepIllustrations('baking-soda-volcano')).toBeUndefined();
  });

  it('andere Aktivitäten haben keine Illustration (auch keine Namen wie „constructor“)', () => {
    expect(getIllustration('forest-walk')).toBeUndefined();
    expect(getIllustration('constructor')).toBeUndefined();
    expect(getStepIllustrations('toString')).toBeUndefined();
    expect(getIllustration('homemade-pizza')?.file).toBe('homemade-pizza.svg');
  });
});
