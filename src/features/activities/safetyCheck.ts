// Mechanischer Teil der Sicherheits-Checkliste (docs/sicherheits-checkliste.md).
// Reine Funktionen, damit sie später auch der KI-Wochenlauf (M9) und Jest-Tests nutzen können.
//
// Die Prüfung ist ein grobes Sieb: Sie findet fehlende Hinweise und unmögliche Altersangaben.
// Ob ein Text inhaltlich stimmt, prüft Claude beim Schreiben, und vor der Beta liest ein Mensch alles (M12).
// Im Zweifel fällt eine Aktivität durch und bleibt `draft`, nie umgekehrt.

import type { Activity } from './activities.ts';
import { getMaterialInfo, type AllergenKey, type HazardKey } from './materials.ts';

// Gefahren, bei denen der Hinweis „mit Erwachsenen“ Pflicht ist.
const adultHazards: readonly HazardKey[] = ['sharp', 'heat', 'fire', 'water'];
// Gefahren, die unter 3 Jahren nie vorkommen dürfen.
const notUnderThree: readonly HazardKey[] = ['sharp', 'heat', 'fire'];

const smallPartsMinAge = 3;
const waterSupervisionAge = 6; // darunter: Erwachsene bleiben die ganze Zeit dabei
const maxAgeSpan = 12; // z. B. 4–16; „für alle von 0 bis 16“ ist selten ehrlich

// Formulierungen, nach denen die Prüfung in den Hinweisen sucht.
const adultPhrase: Record<string, RegExp> = { de: /Erwachsene/i, en: /adult/i };
const wholeTimePhrase: Record<string, RegExp> = { de: /die ganze Zeit/i, en: /the whole time/i };

const checkedLanguages = ['de', 'en'] as const;

export function getHazards(activity: Pick<Activity, 'materials'>): HazardKey[] {
  const hazards = new Set<HazardKey>();
  for (const key of activity.materials) {
    for (const hazard of getMaterialInfo(key).hazards ?? []) hazards.add(hazard);
  }
  return [...hazards];
}

export function getAllergens(activity: Pick<Activity, 'materials'>): AllergenKey[] {
  const allergens = new Set<AllergenKey>();
  for (const key of activity.materials) {
    for (const allergen of getMaterialInfo(key).allergens ?? []) allergens.add(allergen);
  }
  return [...allergens];
}

// Namen der Allergene je Sprache (aus den Übersetzungen), z. B. { de: { milk: 'Milch' } }.
export type AllergenNames = Record<string, Partial<Record<AllergenKey, string>>>;

// Gibt die Probleme zurück. Eine leere Liste heißt: bestanden.
// Die Nummern beziehen sich auf die Punkte in docs/sicherheits-checkliste.md.
export function checkSafety(activity: Activity, allergenNames: AllergenNames = {}): string[] {
  const problems: string[] = [];
  const hazards = getHazards(activity);
  const allergens = getAllergens(activity);
  const note = (language: string) => activity.translations[language]?.safetyNote;

  // 1. Kleinteile nur ab 3 Jahren
  if (hazards.includes('smallParts') && activity.ageMin < smallPartsMinAge) {
    problems.push(`Punkt 1: Kleinteile nur ab ${smallPartsMinAge} Jahren, ageMin ist ${activity.ageMin}`);
  }

  // 2. „Mit Erwachsenen“ bei Schere, Messer, Hitze, Feuer und Wasser
  const needsAdultHint = hazards.filter((hazard) => adultHazards.includes(hazard));
  if (needsAdultHint.length > 0) {
    for (const language of checkedLanguages) {
      const text = note(language);
      if (!text) {
        problems.push(`Punkt 2: Sicherheitshinweis (${language}) fehlt wegen ${needsAdultHint.join(', ')}`);
      } else if (!adultPhrase[language].test(text)) {
        problems.push(`Punkt 2: Sicherheitshinweis (${language}) nennt keine Erwachsenen`);
      }
    }
  }

  // 3. Kein unbeaufsichtigtes Wasser unter 6 Jahren
  if (hazards.includes('water') && activity.ageMin < waterSupervisionAge) {
    for (const language of checkedLanguages) {
      const text = note(language);
      if (text && !wholeTimePhrase[language].test(text)) {
        problems.push(
          `Punkt 3: Hinweis (${language}) sagt nicht, dass Erwachsene die ganze Zeit beim Wasser bleiben`,
        );
      }
    }
  }

  // 4. Allergene nennen (Kochen, Backen und alles mit Zutaten)
  if (allergens.length > 0) {
    for (const language of checkedLanguages) {
      const text = note(language);
      if (!text) {
        problems.push(`Punkt 4: Sicherheitshinweis (${language}) fehlt, Allergene: ${allergens.join(', ')}`);
        continue;
      }
      for (const allergen of allergens) {
        const name = allergenNames[language]?.[allergen];
        if (name && !text.toLowerCase().includes(name.toLowerCase())) {
          problems.push(`Punkt 4: Hinweis (${language}) nennt das Allergen „${name}“ nicht`);
        }
      }
    }
  }

  // 5. Altersangaben realistisch
  if (hazards.some((hazard) => notUnderThree.includes(hazard)) && activity.ageMin < 3) {
    problems.push('Punkt 5: Schere, Messer, Hitze oder Feuer gibt es nicht unter 3 Jahren');
  }
  if (activity.ageMax - activity.ageMin > maxAgeSpan) {
    problems.push(`Punkt 5: Altersspanne über ${maxAgeSpan} Jahre ist nicht realistisch`);
  }

  return problems;
}
