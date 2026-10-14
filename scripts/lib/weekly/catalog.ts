// KI-Wochenlauf (M9): Was die KI kennen muss, aus den Quellen der App: Kategorien, Themen, Material mit Merkmalen und deutschen Namen,
// Namen der Allergene. So gibt es keine zweite Liste, die veralten kann.

import { readFileSync } from 'node:fs';

import { categoryKeys, dayPartKeys, energyKeys, settingKeys } from '../../../src/features/activities/activities.ts';
import { allergenKeys, getMaterialInfo, materialKeys, type MaterialKey } from '../../../src/features/activities/materials.ts';
import type { AllergenNames } from '../../../src/features/activities/safetyCheck.ts';
import { dislikeKeys } from '../../../src/features/profiles/preferences.ts';

export type Catalog = {
  categories: readonly string[];
  topics: readonly string[];
  settings: readonly string[];
  energies: readonly string[];
  dayParts: readonly string[];
  materials: readonly MaterialKey[];
  materialNamesDe: Record<string, string>;
  allergenNames: AllergenNames; // { de: { milk: 'Milch' }, en: { milk: 'milk' } }
};

type Locale = { materials: Record<string, string>; allergens: Record<string, string> };

export function buildCatalog(de: Locale, en: Locale): Catalog {
  return {
    categories: categoryKeys,
    topics: dislikeKeys,
    settings: settingKeys,
    energies: energyKeys,
    dayParts: dayPartKeys,
    materials: materialKeys,
    materialNamesDe: de.materials,
    allergenNames: { de: de.allergens, en: en.allergens },
  };
}

// Liest die Texte aus src/locales (für das Skript; die Tests rufen buildCatalog direkt mit denselben Dateien auf).
export function loadCatalog(root: URL): Catalog {
  const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8')) as Locale;
  return buildCatalog(read('src/locales/de.json'), read('src/locales/en.json'));
}

// Eine Zeile pro Material für den Prompt: Schlüssel, deutscher Name, Merkmale in eckigen Klammern.
export function describeMaterial(catalog: Catalog, key: MaterialKey): string {
  const info = getMaterialInfo(key);
  const marks = [...(info.hazards ?? []), ...(info.flammable ? ['flammable'] : []), ...(info.allergens ?? []).map((a) => `Allergen ${a}`)];
  const name = catalog.materialNamesDe[key] ?? key;
  return `${key} (${name})${marks.length > 0 ? ` [${marks.join(', ')}]` : ''}`;
}

export function allergenWords(catalog: Catalog): string {
  return allergenKeys
    .map((key) => `${key}: „${catalog.allergenNames.de?.[key] ?? key}“ / „${catalog.allergenNames.en?.[key] ?? key}“`)
    .join(', ');
}
