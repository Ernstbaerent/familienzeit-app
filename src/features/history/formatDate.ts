// Datum eines Verlaufseintrags als Text in der App-Sprache, z. B. „10. Oktober 2026“ („October 10, 2026“).
// Es zählt die Ortszeit des Handys, wie bei den Kalendertagen in der Gewichtung.
export function formatHistoryDate(doneAt: string, language: string): string {
  return new Date(doneAt).toLocaleDateString(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
