// KI-Wochenlauf (M9): Kein Schlüssel erscheint je in Ausgaben, Logs, Fehlermeldungen oder Dateien.
// Jede Ausgabe des Skripts (Konsole und Job Summary) läuft durch diese Funktion. Sie schneidet heraus:
//   1. die Werte der Geheimnisse selbst (auch URL-kodiert), die das Skript kennt,
//   2. alles, was wie ein Schlüssel aussieht, auch wenn es ein unbekannter ist (sk-ant-…, sb_secret_…, Bearer …, JWT).

const hidden = '[verborgen]';

// Muster für Schlüssel, die wir nicht kennen müssen, um sie zu erkennen.
const keyPatterns: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{6,}/g, // Anthropic
  /sb_secret_[A-Za-z0-9_-]{6,}/g, // Supabase, neuer geheimer Schlüssel
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // JWT (z. B. alter service_role-Schlüssel)
  /(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, // Authorization: Bearer …
  /((?:x-api-key|apikey)["']?\s*[:=]\s*["']?)[A-Za-z0-9._~+/=-]{8,}/gi, // Kopfzeilen, die als Text auftauchen
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type Redact = (text: string) => string;

export function createRedactor(secrets: readonly (string | null | undefined)[]): Redact {
  const values = new Set<string>();
  for (const secret of secrets) {
    const value = secret?.trim();
    if (!value || value.length < 6) continue;
    values.add(value);
    values.add(encodeURIComponent(value));
  }
  // Längere zuerst, damit ein kürzeres Geheimnis nicht ein längeres halb ersetzt.
  const exact = [...values].sort((a, b) => b.length - a.length).map((value) => new RegExp(escapeRegExp(value), 'g'));

  return (text: string) => {
    let result = String(text);
    for (const pattern of exact) result = result.replace(pattern, hidden);
    for (const pattern of keyPatterns) {
      result = result.replace(pattern, (match, prefix?: string) =>
        typeof prefix === 'string' && match.startsWith(prefix) ? `${prefix}${hidden}` : hidden,
      );
    }
    return result;
  };
}
