// Bild-Test (M9b, Schritt 3b): die Aktivitäten für den Test aus Supabase lesen, nur mit dem öffentlichen Lese-Schlüssel (anon / publishable).
// Ein einfacher GET auf die REST-Schnittstelle, wie die App (src/features/activities/fetchActivities.ts): nur `status = approved`,
// nur die Spalten, die eine Szene braucht. Ein geheimer Schlüssel wird abgelehnt, bevor er benutzt wird. Es wird nichts geschrieben.

import { readJson, shorten, withTimeout, type FetchLike } from '../weekly/http.ts';
import type { ProbeActivity } from '../kit/probe.ts';

// Vorgabe: dieselben zehn Aktivitäten wie im ersten echten Lauf mit Haiku (18. Oktober 2026, Lauf 39105005711), in derselben Reihenfolge
// (die Figurenwahl zählt in dieser Reihenfolge): die fünf Probeaktivitäten und die fünf KI-Aktivitäten, die damals die neuesten waren.
// Fest als IDs, damit ein neuer Wochenlauf den Vergleich vorher/nachher nicht verschiebt.
export const defaultIds = [
  'baked-apples',
  'banana-oat-balls',
  'dance-freeze',
  'secret-lemon-ink',
  'puddle-explorers',
  'autumn-salad-with-lemon',
  'bike-slalom-with-sticks',
  'card-tricks-for-the-family',
  'counting-lit-windows-nearby',
  'feely-bag-of-nature-finds',
] as const;
export const maxIds = 10;
// Zusätzlich zur Liste: so viele der neuesten Aktivitäten aus dem KI-Wochenlauf (`batch_id is not null`), damit auch neue Aktivitäten
// ohne Entsprechung in data/ getestet werden. Standard 0 (die Liste hat schon zehn), höchstens 5, zusammen höchstens `maxIds`.
export const defaultKi = 0;
export const maxKi = 5;

export function parseKi(input: string | undefined): number {
  const text = (input ?? '').trim();
  if (text === '') return defaultKi;
  if (!/^\d+$/.test(text) || Number(text) > maxKi) throw new Error(`Anzahl KI-Aktivitäten „${text}“ ungültig (0 bis ${maxKi}).`);
  return Number(text);
}

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

// Liest die IDs aus der Eingabe des Workflows (durch Komma oder Leerzeichen getrennt). Leer = die zehn aus dem ersten Lauf.
export function parseIds(input: string | undefined): string[] {
  const ids = (input ?? '').split(/[\s,]+/).map((id) => id.trim()).filter((id) => id !== '');
  const list = ids.length === 0 ? [...defaultIds] : [...new Set(ids)];
  for (const id of list) if (!/^[a-z0-9-]{1,80}$/.test(id)) throw new Error(`Ungültige ID „${id}“ (erlaubt: kleine Buchstaben, Ziffern, Bindestrich).`);
  if (list.length > maxIds) throw new Error(`Höchstens ${maxIds} Aktivitäten je Test, hier ${list.length}.`);
  return list;
}

const columns = 'select=id,age_min,age_max,materials,translations';

function origin(supabaseUrl: string): string {
  const value = supabaseUrl.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(value)) throw new Error('SUPABASE_URL fehlt oder ist ungültig (erwartet: https://<projekt>.supabase.co).');
  return value;
}

const idList = (ids: readonly string[]): string => encodeURIComponent(ids.map((id) => `"${id}"`).join(','));

export function buildUrl(supabaseUrl: string, ids: readonly string[]): string {
  return `${origin(supabaseUrl)}/rest/v1/activities?${columns}&status=eq.approved&id=in.(${idList(ids)})`;
}

// Die neuesten freigegebenen Aktivitäten aus dem KI-Wochenlauf (batch_id gesetzt), ohne die schon gewählten.
export function buildKiUrl(supabaseUrl: string, count: number, exclude: readonly string[]): string {
  const without = exclude.length === 0 ? '' : `&id=not.in.(${idList(exclude)})`;
  return `${origin(supabaseUrl)}/rest/v1/activities?${columns}&status=eq.approved&batch_id=not.is.null${without}&order=generated_at.desc.nullslast,id.asc&limit=${count}`;
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

async function getRows(url: string, headers: Record<string, string>, fetchImpl: FetchLike, timeoutMs: number): Promise<ProbeActivity[]> {
  const { response, body } = await withTimeout(timeoutMs, 'Supabase', async (signal) => {
    const res = await fetchImpl(url, { method: 'GET', headers, signal });
    return { response: res, body: await readJson(res) };
  });
  if (!response.ok) throw new Error(`Supabase antwortet mit HTTP ${response.status}${body === null ? '' : `: ${shorten(JSON.stringify(body), 200)}`}`);
  if (!Array.isArray(body)) throw new Error('Supabase: Antwort ist keine Liste.');
  return body.map(rowToActivity).filter((entry): entry is ProbeActivity => entry !== null);
}

export type TestActivities = {
  activities: ProbeActivity[]; // in der Reihenfolge des Tests: erst die Liste, dann die KI-Aktivitäten
  missing: string[]; // weder in Supabase (freigegeben) noch in der Datei
  fromFile: string[]; // nicht in Supabase, Text aus assets/bausteine/probe/aktivitaeten.json
  ki: string[]; // aus dem KI-Wochenlauf dazugenommen
};

// Liest die Aktivitäten der Liste und `ki` KI-Aktivitäten dazu. Fehlt eine Aktivität der Liste in Supabase, nimmt der Test den Text
// aus `fallback` (die Probe-Datei), falls er dort steht. Nur GET mit dem öffentlichen Schlüssel.
export async function fetchTestActivities(options: { url: string; key: string; ids: readonly string[]; ki?: number; fallback?: readonly ProbeActivity[]; fetchImpl: FetchLike; timeoutMs?: number }): Promise<TestActivities> {
  const headers = buildHeaders(options.key);
  const timeoutMs = options.timeoutMs ?? 15_000;
  const ki = Math.min(options.ki ?? 0, maxIds - options.ids.length);
  if ((options.ki ?? 0) > 0 && ki <= 0) throw new Error(`Höchstens ${maxIds} Aktivitäten je Test: Die Liste hat schon ${options.ids.length}, für KI-Aktivitäten ist kein Platz.`);
  const rows = await getRows(buildUrl(options.url, options.ids), headers, options.fetchImpl, timeoutMs);
  const fromFile: string[] = [];
  const missing: string[] = [];
  const listed = options.ids.flatMap((id) => {
    const row = rows.find((activity) => activity.id === id);
    if (row !== undefined) return [row];
    const file = options.fallback?.find((activity) => activity.id === id);
    if (file !== undefined) {
      fromFile.push(id);
      return [file];
    }
    missing.push(id);
    return [];
  });
  const kiRows = ki > 0 ? await getRows(buildKiUrl(options.url, ki, options.ids), headers, options.fetchImpl, timeoutMs) : [];
  return { activities: [...listed, ...kiRows], missing, fromFile, ki: kiRows.map((activity) => activity.id) };
}
