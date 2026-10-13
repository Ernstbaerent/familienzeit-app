// Zugang zu Supabase (M8): Projekt-Adresse und öffentlicher Schlüssel aus der .env (EXPO_PUBLIC_*), siehe docs/supabase.md.
// Alles mit EXPO_PUBLIC_ landet in der App und ist damit öffentlich. Deshalb darf hier nur der öffentliche Schlüssel (anon / publishable)
// stehen. Ein geheimer Schlüssel (service_role, sb_secret_) wird abgelehnt, bevor er benutzt wird. Reine Funktionen, ohne UI.
//
// Metro ersetzt `process.env.EXPO_PUBLIC_NAME` beim Bauen durch den Wert, aber nur, wenn der Name ausgeschrieben dasteht.
// Deshalb stehen die drei Zugriffe unten einzeln (nicht `process.env[name]`).

import { parseSupabaseOrigin, storageImagePrefix } from './imageAllowlist';

export type SupabaseConfig = {
  url: string; // z. B. https://abc.supabase.co, ohne Schrägstrich am Ende
  anonKey: string; // der öffentliche Schlüssel
};

export type SupabaseEnv = {
  url?: string;
  anonKey?: string;
  refreshMinutes?: string;
};

// Liest die drei Werte aus der Umgebung (zur Laufzeit, damit sich Tests die Umgebung zurechtlegen können).
export function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    refreshMinutes: process.env.EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES,
  };
}

// Bei einem Schlüssel im JWT-Format (drei Teile mit Punkt, beginnt mit „eyJ“) steht die Rolle im mittleren Teil.
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

// Ist das ein geheimer Schlüssel, der nie in eine App gehört?
export function isSecretKey(key: string): boolean {
  return key.startsWith('sb_secret_') || readJwtRole(key) === 'service_role';
}

// Gibt den Zugang zurück, oder `null`, wenn etwas fehlt oder nicht stimmt. Dann nutzt die App ihre mitgelieferten Aktivitäten.
// Warnungen nennen nie den Schlüssel selbst.
export function getSupabaseConfig(env: SupabaseEnv = readSupabaseEnv()): SupabaseConfig | null {
  const urlValue = env.url?.trim();
  const key = env.anonKey?.trim();
  if (!urlValue && !key) return null; // nicht eingerichtet (z. B. keine .env): ganz normal, keine Meldung
  const url = parseSupabaseOrigin(urlValue);
  if (url === null) {
    console.warn('Supabase: EXPO_PUBLIC_SUPABASE_URL fehlt oder ist ungültig (erwartet: https://<projekt>.supabase.co).');
    return null;
  }
  if (!key) {
    console.warn('Supabase: EXPO_PUBLIC_SUPABASE_ANON_KEY fehlt.');
    return null;
  }
  if (isSecretKey(key)) {
    console.error(
      'Supabase: EXPO_PUBLIC_SUPABASE_ANON_KEY enthält einen GEHEIMEN Schlüssel (service_role / secret). ' +
        'Der wird nicht benutzt, denn alles mit EXPO_PUBLIC_ steckt in der App. Bitte nur den öffentlichen Schlüssel (anon / publishable) eintragen und den geheimen im Supabase-Dashboard erneuern.',
    );
    return null;
  }
  return { url, anonKey: key };
}

// Der erlaubte Anfang für `image` (Allowlist), `null` ohne gültige Projekt-Adresse.
export function getImagePrefix(env: SupabaseEnv = readSupabaseEnv()): string | null {
  return storageImagePrefix(env.url);
}
