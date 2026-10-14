// KI-Wochenlauf (M9): Einstellungen aus der Umgebung (GitHub Secrets und Variablen) und den Schaltern auf der Kommandozeile.
// Fehlt etwas, bricht der Lauf ab, BEVOR er irgendetwas abfragt oder schreibt. Meldungen nennen nie den Wert eines Schlüssels.

import { parseSupabaseOrigin } from '../../../src/features/activities/imageAllowlist.ts';
import { defaultModel, limits } from './limits.ts';

export type SupabaseAdminConfig = {
  url: string; // https://<projekt>.supabase.co
  key: string; // der GEHEIME Schlüssel (sb_secret_… oder service_role)
};

export type RunConfig = {
  dryRun: boolean;
  autoApprove: boolean;
  model: string;
  maxActivities: number; // Obergrenze des Katalogs (approved + draft)
  maxCostUsd: number; // Obergrenze der Kosten pro Lauf (geschätzt, schlimmster Fall)
  anthropicKey: string;
  supabase: SupabaseAdminConfig | null; // null nur im Trockenlauf ohne Supabase-Zugang
  batchId: string;
};

export type ConfigResult = { ok: true; config: RunConfig; notes: string[] } | { ok: false; problems: string[] };

export type Env = Record<string, string | undefined>;

// Rolle in einem Schlüssel im JWT-Format (alte Supabase-Schlüssel, „eyJ…“).
function readJwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3 || !key.startsWith('eyJ')) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    const role = (payload as { role?: unknown } | null)?.role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

// Der Wochenlauf braucht den GEHEIMEN Schlüssel (der öffentliche darf nicht schreiben).
export function isSecretSupabaseKey(key: string): boolean {
  return key.startsWith('sb_secret_') || readJwtRole(key) === 'service_role';
}

function readPositiveNumber(value: string | undefined, fallback: number, name: string, problems: string[], integer: boolean): number {
  const text = value?.trim();
  if (!text) return fallback;
  const number = Number(text);
  if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) {
    problems.push(`${name}: ${integer ? 'ganze Zahl' : 'Zahl'} größer als 0 erwartet`);
    return fallback;
  }
  return number;
}

// Datum in Berliner Zeit als JJJJ-MM-TT (für die Kennung des Laufs).
export function berlinDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Kennung eines Laufs, z. B. wl-2026-10-18-123456789 (Nummer des GitHub-Laufs) oder wl-2026-10-18-a1b2c3 (lokal).
export function makeBatchId(now: Date, runId: string | undefined, randomSuffix: () => string): string {
  const suffix = runId && /^\d{1,20}$/.test(runId.trim()) ? runId.trim() : randomSuffix();
  return `wl-${berlinDate(now)}-${suffix}`;
}

const knownFlags = ['--dry-run', '--auto-approve'];

export function readConfig(env: Env, argv: readonly string[], now: Date, randomSuffix: () => string): ConfigResult {
  const problems: string[] = [];
  const notes: string[] = [];

  for (const arg of argv) {
    if (!knownFlags.includes(arg)) problems.push(`Unbekannter Schalter „${arg}“ (erlaubt: ${knownFlags.join(', ')})`);
  }
  const dryRun = argv.includes('--dry-run');
  const autoApprove = argv.includes('--auto-approve') || env.AUTO_APPROVE?.trim() === 'true';

  const model = env.ANTHROPIC_MODEL?.trim() || defaultModel;
  if (!/^[a-z0-9][a-z0-9.-]{2,79}$/.test(model)) problems.push('ANTHROPIC_MODEL: unerwartete Form (Beispiel: claude-haiku-5-5)');

  const maxActivities = readPositiveNumber(env.MAX_ACTIVITIES, limits.defaultMaxActivities, 'MAX_ACTIVITIES', problems, true);
  const maxCostUsd = readPositiveNumber(env.MAX_COST_USD, limits.defaultMaxCostUsd, 'MAX_COST_USD', problems, false);

  const anthropicKey = env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (!anthropicKey) problems.push('ANTHROPIC_API_KEY fehlt (GitHub: Settings → Secrets and variables → Actions)');

  const urlValue = env.SUPABASE_URL?.trim();
  const keyValue = env.SUPABASE_SECRET_KEY?.trim();
  let supabase: SupabaseAdminConfig | null = null;
  const supabaseProblems: string[] = [];
  if (!urlValue) supabaseProblems.push('SUPABASE_URL fehlt');
  else if (parseSupabaseOrigin(urlValue) === null) supabaseProblems.push('SUPABASE_URL ist ungültig (erwartet: https://<projekt>.supabase.co)');
  if (!keyValue) supabaseProblems.push('SUPABASE_SECRET_KEY fehlt');
  else if (!isSecretSupabaseKey(keyValue)) {
    supabaseProblems.push('SUPABASE_SECRET_KEY ist kein geheimer Schlüssel (erwartet: sb_secret_… oder service_role). Der öffentliche Schlüssel darf nicht schreiben.');
  }
  if (supabaseProblems.length === 0) {
    supabase = { url: parseSupabaseOrigin(urlValue) as string, key: keyValue as string };
  } else if (dryRun && !urlValue && !keyValue) {
    notes.push('Trockenlauf ohne Supabase-Zugang: Vorhandene Titel kommen nur aus data/, Stichwort-Ideen gibt es keine.');
  } else {
    // Im echten Lauf sind alle drei Pflicht. Auch im Trockenlauf ist ein halber Zugang ein Fehler (sonst merkt man ihn erst später).
    problems.push(...supabaseProblems);
  }

  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    notes,
    config: {
      dryRun,
      autoApprove,
      model,
      maxActivities,
      maxCostUsd,
      anthropicKey,
      supabase,
      batchId: makeBatchId(now, env.GITHUB_RUN_ID, randomSuffix),
    },
  };
}
