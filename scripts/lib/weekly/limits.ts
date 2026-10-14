// KI-Wochenlauf (M9): feste Obergrenzen und Standardwerte an einem Ort. Details und Begründung: docs/wochenlauf.md.
// Diese Datei importiert nichts, damit Skript und Tests sie direkt lesen können.

export const defaultModel = 'claude-haiku-5-5';

export const limits = {
  // Höchstens so viele Aktivitäten fragt ein Lauf insgesamt bei der KI an und schreibt er (auch die Datenbank-Funktion prüft 25).
  maxActivitiesPerRun: 25,
  // Höchstens so viele Aufrufe der Claude API pro Lauf. Jeder Aufruf zählt, ein Fehler beendet den Lauf (keine Wiederholung).
  maxApiCalls: 3,
  // So viele Aktivitäten wünscht sich ein Lauf (Ziel 10 bis 20 pro Woche).
  targetPerRun: 15,
  // Sind nach der Prüfung weniger als so viele übrig, fragt der Lauf ein weiteres Mal nach (solange Aufrufe übrig sind).
  minWantedPerRun: 10,
  // Zeitlimit für den ganzen Lauf. Die GitHub Action hat zusätzlich 15 Minuten.
  runTimeoutMs: 10 * 60_000,
  // Zeitlimit für eine einzelne Anfrage an Supabase.
  supabaseTimeoutMs: 30_000,
  // Höchstens so viele Token darf eine Antwort der KI haben (Text und Nachdenken zusammen).
  maxOutputTokens: 32_000,
  // Standard für MAX_ACTIVITIES: Obergrenze des Katalogs (Status approved oder draft).
  defaultMaxActivities: 1500,
  // Standard für MAX_COST_USD: Würde der schlimmste Fall eines Aufrufs diese Summe überschreiten, ruft der Lauf die KI nicht (mehr) auf.
  defaultMaxCostUsd: 0.5,
  // Höchstens so viele offene Stichwort-Ideen kommen in einen Aufruf (die ältesten zuerst).
  maxIdeasPerCall: 20,
  // Seiten beim Lesen der vorhandenen Titel: 20 × 1000 = 20 000 Zeilen, mehr nie (Schutz vor einer Schleife).
  titlePageSize: 1000,
  maxTitlePages: 20,
} as const;
