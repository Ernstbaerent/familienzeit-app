// Farbplätze einsetzen (docs/design/ILLUSTRATIONEN.md, „Farbplätze“), benutzt vom Zeichner des Baukastens (scripts/lib/kit/scene.ts).
// Jede Farbe in einem Baustein oder einer Szene ist ein Platzhalter `{{name}}` für eine Rolle der Zeichnungs-Palette (src/lib/palette.ts).
// Reine Funktionen, ohne Dateizugriff, damit sie sich testen lassen.

import { illustrationPalette, type IllustrationColorName } from '../../src/lib/palette.ts';

const placeholder = /\{\{([^{}]*)\}\}/g;

export const illustrationColorNames = Object.keys(illustrationPalette) as IllustrationColorName[];

// Alle Platzhalter-Namen, die in einer Vorlage stehen (ohne Wiederholungen).
export function findPlaceholders(template: string): string[] {
  return [...new Set([...template.matchAll(placeholder)].map((match) => match[1]))];
}

// Setzt die Farben ein. Ein unbekannter Name ist ein Fehler (Tippfehler sollen nie als Text im Bild landen).
export function renderTemplate(template: string, colors: Readonly<Record<string, string>> = illustrationPalette): string {
  return template.replace(placeholder, (_match, name: string) => {
    const color = colors[name];
    if (color === undefined) throw new Error(`Unbekannter Farbplatz {{${name}}} (erlaubt: ${Object.keys(colors).join(', ')})`);
    return color;
  });
}
