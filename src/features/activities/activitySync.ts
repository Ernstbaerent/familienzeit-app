// Abgleich der Aktivitäten mit Supabase (M8b): Stand, Zusammenführen der Änderungen, Abgleich mit der ID-Liste. Reine Funktionen, ohne UI und ohne Netz.
// Das Netz steht in fetchActivities.ts, der Ablauf in activityRefresh.ts. Zahlen und Gründe: docs/supabase.md, „Was die App genau macht“.

import type { Activity } from './activities';
import { prepareActivities } from './activityLibrary';
import { rowToActivityInput } from './activityRow';

// Zeitstempel rechnen wir in Mikrosekunden seit 1970 (so genau wie Postgres). JavaScript-Datumswerte kennen nur Millisekunden;
// abgeschnitten würde der letzte Stapel jeden Tag erneut geladen. Bis zum Jahr 2255 bleibt die Zahl unter 2^53, also exakt.
const microsPerMs = 1000;
const microsPerSecond = 1_000_000;
const microsPerMinute = 60 * microsPerSecond;

// Überlappung: Der gespeicherte Stand liegt mindestens so weit vor der Uhrzeit des Servers. Ein Schreibvorgang (Wochenlauf, Seed-Datei,
// Änderung im Dashboard) bekommt als `updated_at` seine Startzeit, sichtbar wird er erst am Ende. Dauert er weniger als 15 Minuten,
// sieht ihn der nächste Abruf sicher, auch wenn er gerade lief, als das Gerät abgerufen hat.
export const cursorOverlapMicros = 15 * microsPerMinute;

// Spätestens nach so vielen Tagen holt die App die ID-Liste, auch wenn die Zählprobe stimmt (Sicherheitsnetz).
export const idCheckDays = 30;
const dayMs = 24 * 60 * 60 * 1000;

// Mehr fehlende Aktivitäten lädt die App nicht einzeln nach, sondern holt alles neu.
export const maxTargetedFetch = 100;

const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6})\d*)?(Z|[+-]\d{2}(?::?\d{2})?)$/;

// Liest einen Zeitstempel, wie Postgres/PostgREST ihn liefert (z. B. `2026-10-18T16:00:00.123456+00:00`) oder wie wir ihn speichern (`…Z`).
// `null`, wenn der Text kein vollständiger Zeitstempel mit Zeitzone ist.
export function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = timestampPattern.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second, fraction = '', zone] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  if (!Number.isFinite(ms)) return null;
  // Ungültige Tage (z. B. 31. Februar) würde Date.UTC still verschieben: dann lieber gar nicht.
  const check = new Date(ms);
  if (check.getUTCDate() !== Number(day) || check.getUTCMonth() !== Number(month) - 1 || check.getUTCHours() !== Number(hour)) return null;
  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const sign = zone.startsWith('-') ? -1 : 1;
    const digits = zone.slice(1).replace(':', '');
    offsetMinutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || '0'));
  }
  return ms * microsPerMs + Number(fraction.padEnd(6, '0')) - offsetMinutes * microsPerMinute;
}

// Schreibt einen Zeitstempel immer gleich: UTC mit sechs Nachkommastellen und `Z` (kein `+`, das in einer Adresse Ärger macht).
export function formatTimestamp(micros: number): string {
  const ms = Math.floor(micros / microsPerMs);
  const rest = micros - ms * microsPerMs;
  return new Date(ms).toISOString().replace(/\.(\d{3})Z$/, (_, millis: string) => `.${millis}${String(rest).padStart(3, '0')}Z`);
}

// Neuer Stand nach einem Abruf (alles in Mikrosekunden):
//  - der größte gesehene Zeitstempel (ohne geänderte Zeilen bleibt der bisherige Stand),
//  - aber nie später als die Uhrzeit des Servers minus Überlappung (sonst könnte ein noch laufender Schreibvorgang fehlen).
//  - Ohne Uhrzeit des Servers: größter Zeitstempel minus Überlappung (sicher, lädt nur ein paar Zeilen doppelt).
// Die Uhr des Handys spielt dabei keine Rolle.
export function nextCursor(maxSeen: number | null, previous: number | null, serverTime: number | null): number | null {
  if (maxSeen === null) {
    if (previous === null) return null;
    return serverTime === null ? previous : Math.min(previous, serverTime - cursorOverlapMicros);
  }
  const cap = serverTime === null ? maxSeen - cursorOverlapMicros : serverTime - cursorOverlapMicros;
  return Math.min(maxSeen, cap);
}

// Ist der gespeicherte Stand brauchbar? Nicht lesbar oder später als die Uhrzeit des Servers plus Überlappung
// (z. B. nach dem Wiederherstellen der Datenbank aus einer Sicherung): dann alles neu laden.
export function isCursorUsable(cursor: number | null, serverTime: number | null): cursor is number {
  if (cursor === null) return false;
  return serverTime === null || cursor <= serverTime + cursorOverlapMicros;
}

// Ist die ID-Liste wieder fällig? Noch nie, vor 30 Tagen oder länger, oder der Zeitpunkt liegt in der Zukunft (Handy-Uhr verstellt).
export function isIdCheckDue(idCheckedAt: number | null, now: number): boolean {
  if (idCheckedAt === null) return true;
  const age = now - idCheckedAt;
  return age < 0 || age >= idCheckDays * dayMs;
}

function rowId(row: unknown): string | null {
  return typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id : null;
}

// Führt geänderte Zeilen in den Bestand (nach ID) ein. Jede Zeile wird wie neue Daten geprüft:
// gültig und freigegeben ersetzt die alte Fassung; kaputt oder nicht freigegeben entfernt die Aktivität vom Gerät
// (eine veraltete Fassung zu behalten wäre bei einer Sicherheitskorrektur falsch). Gibt einen neuen Bestand zurück, der alte bleibt unverändert.
export function mergeChanges(
  current: ReadonlyMap<string, Activity>,
  rows: readonly unknown[],
  imagePrefix: string | null,
): Map<string, Activity> {
  const next = new Map(current);
  for (const id of rows.map(rowId)) if (id !== null) next.delete(id);
  for (const activity of prepareActivities(rows.map(rowToActivityInput), imagePrefix, 'Supabase')) next.set(activity.id, activity);
  return next;
}

// Abgleich mit der ID-Liste des Servers: Was der Server nicht mehr hat (zurückgezogen), fliegt raus; was auf dem Gerät fehlt, steht in `missing`.
export function reconcileIds(current: ReadonlyMap<string, Activity>, serverIds: readonly string[]): { kept: Map<string, Activity>; missing: string[]; removed: string[] } {
  const server = new Set(serverIds);
  const kept = new Map<string, Activity>();
  const removed: string[] = [];
  for (const [id, activity] of current) {
    if (server.has(id)) kept.set(id, activity);
    else removed.push(id);
  }
  const missing = [...server].filter((id) => !current.has(id));
  return { kept, missing, removed };
}

// Feste Reihenfolge (nach ID, wie früher die Abfrage `order=id.asc`), damit die Vorschläge nicht von der Reihenfolge der Änderungen abhängen.
export function sortById(activities: Iterable<Activity>): Activity[] {
  return [...activities].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
