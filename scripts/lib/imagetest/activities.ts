// Bild-Test (M9b, Schritt 3b): die Aktivitäten für den Test aus Supabase lesen, nur mit dem öffentlichen Lese-Schlüssel (anon / publishable).
// Ein einfacher GET auf die REST-Schnittstelle, wie die App (src/features/activities/fetchActivities.ts): nur `status = approved`,
// nur die Spalten, die eine Szene braucht. Ein geheimer Schlüssel wird abgelehnt, bevor er benutzt wird. Es wird nichts geschrieben.

import { readJson, shorten, withTimeout, type FetchLike } from '../weekly/http.ts';
import type { ProbeActivity } from '../kit/probe.ts';

export const defaultIds = ['baked-apples', 'banana-oat-balls', 'dance-freeze', 'secret-lemon-ink', 'puddle-explorers'] as const;
export const maxIds = 10;

// Wie in supabaseConfig.ts: sb_secret_… oder ein JWT mit der Rolle service_role gehört nicht in diesen Test.
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3 || !key.startsWith('eyJ')) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as { role?: unknown }).role === 'service_role';
  } catch {
    return false;
  }
}

// Liest die IDs aus der Eingabe des Workflows (durch Komma oder Leerzeichen getrennt). Leer = die fünf aus dem Plan.
export function parseIds(input: string | undefined): string[] {
  const ids = (input ?? '').split(/[\s,]+/).map((id) => id.trim()).filter((id) => id !== '');
  const list = ids.length === 0 ? [...defaultIds] : [...new Set(ids)];
  for (const id of list) if (!/^[a-z0-9-]{1,80}$/.test(id)) throw new Error(`Ungültige ID „${id}“ (erlaubt: kleine Buchstaben, Ziffern, Bindestrich).`);
  if (list.length > maxIds) throw new Error(`Höchstens ${maxIds} Aktivitäten je Test, hier ${list.length}.`);
  return list;
}

export function buildUrl(supabaseUrl: string, ids: readonly string[]): string {
  const origin = supabaseUrl.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new Error('SUPABASE_URL fehlt oder ist ungültig (erwartet: https://<projekt>.supabase.co).');
  const list = ids.map((id) => `"${id}"`).join(',');
  return `${origin}/rest/v1/activities?select=id,age_min,age_max,materials,translations&status=eq.approved&id=in.(${encodeURIComponent(list)})`;
}

export function buildHeaders(key: string): Record<string, string> {
  if (key.trim() === '') throw new Error('SUPABASE_ANON_KEY fehlt (der öffentliche Lese-Schlüssel, nicht der geheime).');
  if (isSecretKey(key)) throw new Error('SUPABASE_ANON_KEY enthält einen GEHEIMEN Schlüssel. Der Bild-Test liest nur mit dem öffentlichen Schlüssel.');
  const headers: Record<string, string> = { apikey: key, Accept: 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is { title: string; summary: string; steps: string[]; safetyNote?: string } =>
  isRecord(value) && typeof value.title === 'string' && typeof value.summary === 'string' && Array.isArray(value.steps) && value.steps.every((step) => typeof step === 'string');

// Eine Zeile der Datenbank in die Form der Probebilder. `null`, wenn etwas fehlt.
export function rowToActivity(row: unknown): ProbeActivity | null {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.age_min !== 'number' || typeof row.age_max !== 'number') return null;
  if (!Array.isArray(row.materials) || !row.materials.every((key) => typeof key === 'string')) return null;
  const translations = row.translations;
  if (!isRecord(translations) || !isText(translations.de) || !isText(translations.en)) return null;
  return { id: row.id, ageMin: row.age_min, ageMax: row.age_max, materials: row.materials as string[], translations: translations as ProbeActivity['translations'] };
}

export async function fetchTestActivities(options: { url: string; key: string; ids: readonly string[]; fetchImpl: FetchLike; timeoutMs?: number }): Promise<{ activities: ProbeActivity[]; missing: string[] }> {
  const headers = buildHeaders(options.key);
  const url = buildUrl(options.url, options.ids);
  const { response, body } = await withTimeout(options.timeoutMs ?? 15_000, 'Supabase', async (signal) => {
    const res = await options.fetchImpl(url, { method: 'GET', headers, signal });
    return { response: res, body: await readJson(res) };
  });
  if (!response.ok) throw new Error(`Supabase antwortet mit HTTP ${response.status}${body === null ? '' : `: ${shorten(JSON.stringify(body), 200)}`}`);
  if (!Array.isArray(body)) throw new Error('Supabase: Antwort ist keine Liste.');
  const activities = body.map(rowToActivity).filter((entry): entry is ProbeActivity => entry !== null);
  const found = new Set(activities.map((activity) => activity.id));
  const ordered = options.ids.flatMap((id) => activities.filter((activity) => activity.id === id));
  return { activities: ordered, missing: options.ids.filter((id) => !found.has(id)) };
}
