// Orte-Import (M10a): Einstellungen aus der Umgebung (GitHub-Eingaben, Variablen, Secrets).
// Fehlt etwas, bricht der Lauf ab, BEVOR er etwas lädt oder schreibt. Meldungen nennen nie den Wert eines Schlüssels.

import type { RegionKey } from '../../../src/features/places/placeRow.ts';
import { parseSupabaseOrigin } from '../../../src/features/activities/imageAllowlist.ts';
import { berlinDate, isSecretSupabaseKey, type SupabaseAdminConfig } from '../weekly/config.ts';
import { placeLimits } from './limits.ts';
import { parseRegionSelection } from './regions.ts';

export type Env = Record<string, string | undefined>;

// Kennung eines Laufs, z. B. orte-2026-10-15-123456789 (Nummer des GitHub-Laufs) oder orte-2026-10-15-a1b2c3 (lokal).
export function makeImportId(now: Date, runId: string | undefined, randomSuffix: () => string): string {
  const suffix = runId && /^\d{1,20}$/.test(runId.trim()) ? runId.trim() : randomSuffix();
  return `orte-${berlinDate(now)}-${suffix}`;
}

export type PrepareConfig = { regions: RegionKey[]; importId: string; workDir: string; outDir: string };

export function readPrepareConfig(env: Env, now: Date, randomSuffix: () => string): { ok: true; config: PrepareConfig } | { ok: false; problems: string[] } {
  const selection = parseRegionSelection(env.PLACES_REGIONS);
  if (!selection.ok) return { ok: false, problems: [`PLACES_REGIONS: ${selection.problem}`] };
  if (selection.regions.length === 0) return { ok: false, problems: ['PLACES_REGIONS: kein Bundesland gewählt'] };
  return {
    ok: true,
    config: {
      regions: selection.regions,
      importId: makeImportId(now, env.GITHUB_RUN_ID, randomSuffix),
      workDir: env.PLACES_WORK_DIR?.trim() || 'places-work',
      outDir: env.PLACES_OUT_DIR?.trim() || 'places-out',
    },
  };
}

export type UploadConfig = { dryRun: boolean; maxPlaces: number; outDir: string; supabase: SupabaseAdminConfig };

export function readUploadConfig(env: Env, argv: readonly string[]): { ok: true; config: UploadConfig } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  for (const arg of argv) if (arg !== '--dry-run') problems.push(`Unbekannter Schalter „${arg}“ (erlaubt: --dry-run)`);
  const dryRun = argv.includes('--dry-run') || env.DRY_RUN?.trim() === 'true';

  let maxPlaces: number = placeLimits.defaultMaxPlaces;
  const maxText = env.MAX_PLACES?.trim();
  if (maxText) {
    const value = Number(maxText);
    if (!Number.isInteger(value) || value < 1) problems.push('MAX_PLACES: ganze Zahl größer als 0 erwartet');
    else maxPlaces = value;
  }

  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim();
  if (!url) problems.push('SUPABASE_URL fehlt (GitHub: Settings → Secrets and variables → Actions)');
  else if (parseSupabaseOrigin(url) === null) problems.push('SUPABASE_URL ist ungültig (erwartet: https://<projekt>.supabase.co)');
  if (!key) problems.push('SUPABASE_SECRET_KEY fehlt');
  else if (!isSecretSupabaseKey(key)) {
    problems.push('SUPABASE_SECRET_KEY ist kein geheimer Schlüssel (erwartet: sb_secret_… oder service_role). Der öffentliche Schlüssel darf nicht schreiben.');
  }
  if (problems.length > 0) return { ok: false, problems };
  return {
    ok: true,
    config: {
      dryRun,
      maxPlaces,
      outDir: env.PLACES_OUT_DIR?.trim() || 'places-out',
      supabase: { url: parseSupabaseOrigin(url as string) as string, key: key as string },
    },
  };
}
