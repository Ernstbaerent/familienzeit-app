// KI-Wochenlauf (M9): ein Aufruf der Claude API (Messages API) mit einem einfachen POST, ohne zusätzliches Paket.
// Die Antwort ist JSON nach einem festen Schema (Structured Outputs: output_config.format).
// Es gibt keine Wiederholung: Jeder Fehler wird als ClaudeApiError gemeldet, und der Lauf hört auf, ohne etwas zu schreiben.
// Der Schlüssel steht nur in der Kopfzeile x-api-key und nie in einer Meldung.

import { readJson, shorten, TimeoutError, withTimeout, type FetchLike } from './http.ts';

export const anthropicUrl = 'https://api.anthropic.com/v1/messages';
export const anthropicVersion = '2023-06-01';

export type ClaudeErrorKind =
  | 'billing' // Guthaben leer oder Zahlungsproblem
  | 'limit' // Rate-Limit oder Ausgabenlimit erreicht
  | 'auth' // Schlüssel falsch
  | 'permission'
  | 'model' // Modell unbekannt oder nicht freigeschaltet
  | 'overloaded'
  | 'server'
  | 'request' // Anfrage abgelehnt (400)
  | 'network'
  | 'timeout'
  | 'refusal' // die KI hat abgelehnt
  | 'truncated' // Antwort zu lang, abgeschnitten
  | 'invalid'; // Antwort ohne brauchbares JSON

export class ClaudeApiError extends Error {
  kind: ClaudeErrorKind;
  status: number | null;
  usage: Usage | null; // bei einer Antwort, die trotzdem bezahlt wurde (abgelehnt, abgeschnitten, kein JSON)
  constructor(kind: ClaudeErrorKind, message: string, status: number | null = null, usage: Usage | null = null) {
    super(message);
    this.name = 'ClaudeApiError';
    this.kind = kind;
    this.status = status;
    this.usage = usage;
  }
}

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

export type ClaudeResult = { data: unknown; usage: Usage; stopReason: string };

export type ClaudeRequest = {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  // Den festen Teil (system) im Zwischenspeicher der API ablegen (Prompt Caching, `cache_control` am Systemtext, 5 Minuten).
  // Ändert laut Doku die Antwort nicht, nur die Kosten: schreiben 1,25-fach, lesen 0,1-fach des Eingabepreises. Nur der Bild-Test nutzt es.
  cacheSystem?: boolean;
};

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function readUsage(raw: unknown): Usage {
  const usage = (raw ?? {}) as Record<string, unknown>;
  return {
    input_tokens: readNumber(usage.input_tokens),
    output_tokens: readNumber(usage.output_tokens),
    cache_creation_input_tokens: readNumber(usage.cache_creation_input_tokens),
    cache_read_input_tokens: readNumber(usage.cache_read_input_tokens),
  };
}

// Ordnet eine Fehlerantwort ein. Leeres Guthaben meldet die API als 402 (billing_error) oder als 400 mit „credit balance“.
// Ein erreichtes Ausgabenlimit kommt als 429 (rate_limit_error) oder als 400 mit „usage limit“.
export function classifyError(status: number, body: unknown): ClaudeApiError {
  const error = ((body ?? {}) as { error?: { type?: unknown; message?: unknown } }).error ?? {};
  const type = typeof error.type === 'string' ? error.type : '';
  const message = typeof error.message === 'string' ? shorten(error.message) : '';
  const detail = `HTTP ${status}${type ? ` ${type}` : ''}${message ? `: ${message}` : ''}`;

  if (status === 402 || type === 'billing_error' || /credit balance|billing|purchase credits|payment/i.test(message)) {
    return new ClaudeApiError('billing', `Guthaben bei Anthropic aufgebraucht oder Zahlungsproblem (${detail})`, status);
  }
  if (status === 429 || type === 'rate_limit_error' || /usage limit|spend limit|rate limit/i.test(message)) {
    return new ClaudeApiError('limit', `Limit bei Anthropic erreicht (${detail})`, status);
  }
  if (status === 401 || type === 'authentication_error') return new ClaudeApiError('auth', `Schlüssel ANTHROPIC_API_KEY wird nicht angenommen (${detail})`, status);
  if (status === 403 || type === 'permission_error') return new ClaudeApiError('permission', `Keine Berechtigung (${detail})`, status);
  if (status === 404 || type === 'not_found_error') return new ClaudeApiError('model', `Modell unbekannt oder nicht verfügbar, ANTHROPIC_MODEL prüfen (${detail})`, status);
  if (status === 529 || type === 'overloaded_error') return new ClaudeApiError('overloaded', `Claude API ist gerade überlastet (${detail})`, status);
  if (status >= 500) return new ClaudeApiError('server', `Fehler bei Anthropic (${detail})`, status);
  return new ClaudeApiError('request', `Anfrage abgelehnt (${detail})`, status);
}

export function buildRequestBody(request: ClaudeRequest): string {
  return JSON.stringify({
    model: request.model,
    max_tokens: request.maxTokens,
    system: request.cacheSystem === true ? [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }] : request.system,
    messages: [{ role: 'user', content: request.prompt }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: request.schema } },
  });
}

export async function callClaude(request: ClaudeRequest, fetchImpl: FetchLike, timeoutMs: number): Promise<ClaudeResult> {
  let response;
  let body: unknown;
  try {
    ({ response, body } = await withTimeout(timeoutMs, 'Claude API', async (signal) => {
      const res = await fetchImpl(anthropicUrl, {
        method: 'POST',
        headers: {
          'x-api-key': request.apiKey,
          'anthropic-version': anthropicVersion,
          'content-type': 'application/json',
        },
        body: buildRequestBody(request),
        signal,
      });
      return { response: res, body: await readJson(res) };
    }));
  } catch (error) {
    if (error instanceof TimeoutError) throw new ClaudeApiError('timeout', error.message);
    throw new ClaudeApiError('network', `Claude API nicht erreichbar (${error instanceof Error ? shorten(error.message, 200) : 'Netzwerkfehler'})`);
  }

  if (!response.ok) throw classifyError(response.status, body);

  const message = (body ?? {}) as { content?: unknown; stop_reason?: unknown; usage?: unknown };
  const usage = readUsage(message.usage);
  const stopReason = typeof message.stop_reason === 'string' ? message.stop_reason : '';
  if (stopReason === 'refusal') throw new ClaudeApiError('refusal', 'Die KI hat die Anfrage abgelehnt (stop_reason refusal)', response.status, usage);
  if (stopReason === 'max_tokens') throw new ClaudeApiError('truncated', 'Antwort war zu lang und wurde abgeschnitten (max_tokens)', response.status, usage);

  const blocks = Array.isArray(message.content) ? message.content : [];
  const text = blocks
    .filter((block): block is { type: 'text'; text: string } => (block as { type?: unknown })?.type === 'text' && typeof (block as { text?: unknown }).text === 'string')
    .map((block) => block.text)
    .join('');
  try {
    return { data: JSON.parse(text), usage, stopReason };
  } catch {
    throw new ClaudeApiError('invalid', 'Antwort enthält kein gültiges JSON', response.status, usage);
  }
}
