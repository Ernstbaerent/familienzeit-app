// Baukasten (M9b): Gegenstände, die der Titel einer Aktivität nennt (Aufgabe nach dem ersten Bild-Test, 2026-10-18).
// Ein Titelbild darf einen Gegenstand aus dem Titel nicht weglassen: Ein Bild „Fahrrad-Slalom“ ohne Fahrrad macht den Titel falsch.
// Erkannt wird über das Material der Aktivität: Steht der Name eines Materials (de oder en) im Titel derselben Sprache, ist es ein
// Titel-Gegenstand. Gibt es dafür keinen Baustein, ist keine Szene möglich (fehlender Baustein). Reine Funktionen bis auf das Laden der Namen.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { blocksForMaterial, figureCover } from './coverage.ts';
import type { Catalog } from './types.ts';

export type MaterialLabels = Readonly<Record<string, { de: string; en: string }>>;
export type TitleObject = { key: string; label: { de: string; en: string }; blocks: string[] };
export type TitleActivity = { materials: readonly string[]; translations: Readonly<Record<string, { title: string }>> };

// Die Namen der Materialien aus den Übersetzungen der App (src/locales/de.json und en.json).
export function loadMaterialLabels(root: string): MaterialLabels {
  const read = (language: string) => (JSON.parse(readFileSync(join(root, `src/locales/${language}.json`), 'utf8')) as { materials: Record<string, string> }).materials;
  const de = read('de');
  const en = read('en');
  return Object.fromEntries(Object.keys(de).map((key) => [key, { de: de[key], en: en[key] ?? key }]));
}

// Das Hauptwort eines Materialnamens: der erste Teil vor „und“, „oder“, Komma oder Klammer, davon das letzte Wort.
// „Fahrrad und Helm“ → „fahrrad“, „Playing cards“ → „cards“, „Radio oder Lautsprecher“ → „radio“.
export function headWord(label: string): string {
  const first = label.toLowerCase().split(/\s+(?:und|oder|and|or)\s+|,|\(/u)[0].trim();
  const words = first.split(/\s+/u).filter((word) => word !== '');
  return words.at(-1) ?? '';
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Steht das Material im Titel? Deutsch: Wortstamm (ohne Endung n, e, s) irgendwo im Titel, bei langen Wörtern auch der hintere Teil
// eines zusammengesetzten Wortes ab 5 Buchstaben („Spielkarten“ → „karte“ in „Kartentricks“). Englisch: am Wortanfang, ohne Plural-s.
export function titleMentions(title: string, label: string, language: string): boolean {
  const head = headWord(label);
  const text = title.toLowerCase();
  if (head.length < 3) return false;
  if (language === 'de') {
    const stem = head.length > 4 ? head.replace(/[nes]$/u, '') : head;
    if (stem.length >= 4 && text.includes(stem)) return true;
    for (let start = 1; stem.length - start >= 5; start += 1) if (text.includes(stem.slice(start))) return true;
    return new RegExp(`(^|[^\\p{L}])${escape(stem)}`, 'u').test(text);
  }
  const stem = head.length > 3 ? head.replace(/s$/u, '') : head;
  return new RegExp(`(^|[^\\p{L}])${escape(stem)}`, 'u').test(text);
}

// Die Gegenstände aus dem Titel mit den Bausteinen, die sie zeigen. Scharfes (Messer, Schere) zählt nicht: Es gehört nie in ein Titelbild,
// dort zeigt das Bild stattdessen die Zutat, das Ergebnis oder den Ort. Was die Figuren selbst zeigen (Regen-Kleidung), zählt als gezeigt.
export function findTitleObjects(activity: TitleActivity, labels: MaterialLabels, catalog: Catalog): TitleObject[] {
  const found: TitleObject[] = [];
  for (const key of new Set(activity.materials)) {
    const label = labels[key];
    if (label === undefined || figureCover[key] !== undefined) continue;
    const named = (['de', 'en'] as const).some((language) => {
      const title = activity.translations[language]?.title;
      return title !== undefined && titleMentions(title, label[language], language);
    });
    if (!named) continue;
    const all = blocksForMaterial(catalog, key);
    if (all.length > 0 && all.every((id) => catalog.get(id)?.hazards.includes('sharp') === true)) continue;
    found.push({ key, label, blocks: all.filter((id) => catalog.get(id)?.hazards.includes('sharp') !== true) });
  }
  return found;
}

// Titel-Gegenstände ohne Baustein: Für diese Aktivität ist kein Titelbild möglich. Die Namen gehen in die Liste „fehlende Bausteine“.
export function missingTitleBlocks(objects: readonly TitleObject[]): string[] {
  return objects.filter((entry) => entry.blocks.length === 0).map((entry) => entry.label.de);
}
