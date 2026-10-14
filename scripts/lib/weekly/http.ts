// KI-Wochenlauf (M9): gemeinsame Form für Internet-Anfragen. Das Skript gibt das echte `fetch` hinein, die Tests eine Attrappe.

export type HttpResponse = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

export type HttpRequest = {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  signal: AbortSignal;
};

export type FetchLike = (url: string, init: HttpRequest) => Promise<HttpResponse>;

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Führt `task` mit einem Zeitlimit aus. Nach `ms` wird die Anfrage abgebrochen und ein TimeoutError geworfen.
export async function withTimeout<T>(ms: number, what: string, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`${what}: Zeitüberschreitung nach ${Math.max(1, Math.round(ms / 1000))} Sekunden`));
    }, Math.max(0, ms));
  });
  try {
    return await Promise.race([task(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Liest eine Antwort als JSON. `null`, wenn sie leer oder kein gültiges JSON ist.
export async function readJson(response: HttpResponse): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Kurzer, sicherer Ausschnitt aus einer Fehlermeldung (lange Antworten werden abgeschnitten).
export function shorten(text: string, max = 300): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max)} …` : single;
}
