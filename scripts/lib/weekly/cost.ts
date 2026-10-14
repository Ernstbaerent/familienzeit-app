// KI-Wochenlauf (M9): Kosten schätzen (vor dem Aufruf) und ausrechnen (aus `usage` der Antwort).
// Preise in US-Dollar pro 1 Million Token, Stand Oktober 2026 (Anthropic-Preisliste). Ändert sich ein Preis oder kommt ein Modell
// dazu: hier eintragen. Für ein Modell ohne Preis startet der Lauf nicht, damit die Kosten-Obergrenze nie ins Leere greift.

import type { Usage } from './anthropic.ts';

type Price = { input: number; output: number; longInput?: number; longOutput?: number; longFrom?: number };

export const prices: Record<string, Price> = {
  // Claude Haiku 5.5: bis 100 000 Token Anfrage 0,10 / 0,50; darüber 0,50 / 2,50.
  'claude-haiku-5-5': { input: 0.1, output: 0.5, longInput: 0.5, longOutput: 2.5, longFrom: 100_000 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-fable-5-1': { input: 10, output: 50 },
};

export function priceOf(model: string): Price | null {
  return prices[model] ?? null;
}

// Grobe, eher zu hohe Schätzung der Token einer Anfrage: etwa 2,5 Zeichen pro Token (deutscher Text und JSON).
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

function rates(price: Price, promptTokens: number): { input: number; output: number } {
  if (price.longFrom !== undefined && promptTokens > price.longFrom) {
    return { input: price.longInput ?? price.input, output: price.longOutput ?? price.output };
  }
  return { input: price.input, output: price.output };
}

// Schlimmster Fall eines Aufrufs: ganze Anfrage plus die volle Antwortlänge (max_tokens).
export function worstCaseUsd(price: Price, promptTokens: number, maxOutputTokens: number): number {
  const r = rates(price, promptTokens);
  return (promptTokens * r.input + maxOutputTokens * r.output) / 1_000_000;
}

// Üblicher Fall: etwa 900 Token Text je Aktivität (Deutsch und Englisch) und 4 000 Token Nachdenken.
export function typicalUsd(price: Price, promptTokens: number, activities: number): number {
  const r = rates(price, promptTokens);
  return (promptTokens * r.input + (activities * 900 + 4_000) * r.output) / 1_000_000;
}

// Tatsächliche Kosten aus `usage` (Cache: Schreiben 1,25-fach, Lesen 0,1-fach des Eingabepreises).
export function actualUsd(price: Price, usage: Usage): number {
  const promptTokens = usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens;
  const r = rates(price, promptTokens);
  const input = usage.input_tokens + usage.cache_creation_input_tokens * 1.25 + usage.cache_read_input_tokens * 0.1;
  return (input * r.input + usage.output_tokens * r.output) / 1_000_000;
}

export function formatUsd(value: number): string {
  const digits = value > 0 && value < 0.01 ? 4 : 2;
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: digits })} $`;
}
