// Nur für Tests: ein kleiner Ersatz für die Daten-Schnittstelle von Supabase (PostgREST) mit der Tabelle `activities` (M8b).
// Kann genau die Anfragen, die die App stellt (fetchActivities.ts), und verhält sich dabei wie die echte Datenbank:
//  - Row Level Security: Der öffentliche Schlüssel sieht nur `approved`.
//  - `updated_at` ist die Startzeit des Schreibvorgangs: Alle Zeilen eines Stapels haben denselben Zeitstempel.
//  - Ein Schreibvorgang ist erst nach seinem Ende sichtbar (`begin()` … `commit()`), behält aber seine Startzeit.
//  - Kopfzeilen `Date` (sekundengenau) und `content-range` (bei `Prefer: count=exact`).
// Unbekannte Parameter lassen den Test scheitern, damit der Ersatz nicht still etwas anderes tut als der echte Server.
// Jede Antwort wird mitgeschrieben (`log`), damit Tests den Datenverkehr messen können.

import type { ActivityRow } from './activityRow';
import { formatTimestamp, parseTimestamp } from './activitySync';
import type { FetchLike } from './fetchActivities';

type StoredRow = ActivityRow & { updatedAt: number };

export type LoggedResponse = { url: string; kind: 'count' | 'changes' | 'ids' | 'byIds'; body: string };

// Postgres schreibt Zeitstempel als `2026-10-18T16:00:00.123456+00:00` und lässt Nullen am Ende weg.
export function postgresTimestamp(micros: number): string {
  return formatTimestamp(micros)
    .replace(/\.?0+Z$/, 'Z')
    .replace(/Z$/, '+00:00');
}

function unquote(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replace(/\\(.)/g, '$1') : value;
}

function splitList(inner: string): string[] {
  // Werte in doppelten Anführungszeichen dürfen Kommas enthalten.
  const items: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char === '\\' && quoted) {
      current += char + inner[i + 1];
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
      current += char;
    } else if (char === ',' && !quoted) {
      items.push(current);
      current = '';
    } else current += char;
  }
  items.push(current);
  return items;
}

const fail = (message: string): never => {
  throw new Error(`Testserver: ${message}`);
};

export class FakeActivitiesServer {
  private rows = new Map<string, StoredRow>();
  private pending = new Map<number, { start: number; rows: ActivityRow[] }>();
  private nextTx = 1;
  // Uhr des Servers in Mikrosekunden.
  clock: number;
  sendDateHeader = true;
  sendCountHeader = true;
  // Hängt eine Antwort ab: z. B. `(url) => url.includes('limit=0') ? 503 : null` liefert für die Zählprobe einen Fehler.
  failWith: ((url: string) => number | null) | null = null;
  // Spalten, die es in der Datenbank (noch) nicht gibt, z. B. ['step_images'] vor Migration 0006. Fragt die App sie ab,
  // antwortet der Server wie PostgREST mit HTTP 400 (Code 42703, „column … does not exist“).
  missingColumns: string[] = [];
  log: LoggedResponse[] = [];

  constructor(startIso = '2026-10-18T16:00:00Z') {
    this.clock = parseTimestamp(startIso) ?? fail('Startzeit');
  }

  advance(ms: number): void {
    this.clock += ms * 1000;
  }

  // Schreibt Zeilen sofort (ein Schreibvorgang: alle bekommen denselben Zeitstempel).
  upsert(rows: readonly ActivityRow[]): void {
    for (const row of rows) this.rows.set(row.id, { ...row, updatedAt: this.clock });
  }

  setStatus(ids: readonly string[], status: string): void {
    for (const id of ids) {
      const row = this.rows.get(id) ?? fail(`unbekannte ID ${id}`);
      this.rows.set(id, { ...row, status, updatedAt: this.clock });
    }
  }

  delete(ids: readonly string[]): void {
    for (const id of ids) this.rows.delete(id);
  }

  // Ein Schreibvorgang, der jetzt beginnt und erst mit `commit` sichtbar wird.
  begin(rows: readonly ActivityRow[]): number {
    const tx = this.nextTx;
    this.nextTx += 1;
    this.pending.set(tx, { start: this.clock, rows: [...rows] });
    return tx;
  }

  commit(tx: number): void {
    const pending = this.pending.get(tx) ?? fail('unbekannter Schreibvorgang');
    for (const row of pending.rows) this.rows.set(row.id, { ...row, updatedAt: pending.start });
    this.pending.delete(tx);
  }

  approvedCount(): number {
    return [...this.rows.values()].filter((row) => row.status === 'approved').length;
  }

  clearLog(): void {
    this.log = [];
  }

  readonly fetch: FetchLike = async (url, init) => {
    const status = this.failWith?.(url) ?? null;
    if (status !== null) return { ok: false, status, json: async () => ({ message: 'Fehler' }), headers: this.headers(null, null) };

    const [path, query = ''] = url.split('?');
    if (!path.endsWith('/rest/v1/activities')) fail(`unbekannter Pfad ${path}`);
    const params = query.split('&').map((pair) => {
      const index = pair.indexOf('=');
      return [pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))] as const;
    });

    // Row Level Security: nur freigegebene Zeilen.
    let rows = [...this.rows.values()].filter((row) => row.status === 'approved');
    let columns: string[] = [];
    let limit = Infinity;
    let order = '';
    for (const [name, value] of params) {
      if (name === 'select') columns = value.split(',');
      else if (name === 'status') {
        if (value !== 'eq.approved') fail(`status=${value}`);
      } else if (name === 'updated_at') {
        const at = value.startsWith('gt.') ? parseTimestamp(value.slice(3)) : fail(`updated_at=${value}`);
        rows = rows.filter((row) => row.updatedAt > (at ?? fail('Zeitstempel')));
      } else if (name === 'or') {
        const match = /^\(updated_at\.gt\.([^,]+),and\(updated_at\.eq\.([^,]+),id\.gt\.(.+)\)\)$/.exec(value) ?? fail(`or=${value}`);
        const at = parseTimestamp(match[1]) ?? fail('Zeitstempel');
        if (parseTimestamp(match[2]) !== at) fail('or mit zwei Zeitstempeln');
        const id = unquote(match[3]);
        rows = rows.filter((row) => row.updatedAt > at || (row.updatedAt === at && row.id > id));
      } else if (name === 'id') {
        if (value.startsWith('gt.')) {
          const id = unquote(value.slice(3));
          rows = rows.filter((row) => row.id > id);
        } else if (value.startsWith('in.(') && value.endsWith(')')) {
          const ids = new Set(splitList(value.slice(4, -1)).map(unquote));
          rows = rows.filter((row) => ids.has(row.id));
        } else fail(`id=${value}`);
      } else if (name === 'order') order = value;
      else if (name === 'limit') limit = Number(value);
      else fail(`unbekannter Parameter ${name}`);
    }
    const missing = columns.find((column) => this.missingColumns.includes(column));
    if (missing !== undefined) {
      const error = { code: '42703', details: null, hint: null, message: `column activities.${missing} does not exist` };
      return { ok: false, status: 400, json: async () => error, headers: this.headers(null, null) };
    }
    if (order === 'updated_at.asc,id.asc') rows.sort((a, b) => a.updatedAt - b.updatedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    else if (order === 'id.asc') rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    else if (order !== '') fail(`order=${order}`);
    const total = rows.length;
    const page = rows.slice(0, limit).map((row) => {
      const out: Record<string, unknown> = {};
      for (const column of columns) {
        if (column === 'updated_at') out.updated_at = postgresTimestamp(row.updatedAt);
        else if (column in row) out[column] = row[column as keyof ActivityRow];
        else fail(`unbekannte Spalte ${column}`);
      }
      return out;
    });

    const body = JSON.stringify(page);
    const kind: LoggedResponse['kind'] =
      limit === 0 ? 'count' : columns.length === 1 && columns[0] === 'id' ? 'ids' : params.some(([name, value]) => name === 'id' && value.startsWith('in.')) ? 'byIds' : 'changes';
    this.log.push({ url, kind, body });
    const wantsCount = init.headers.Prefer === 'count=exact';
    return { ok: true, status: 200, json: async () => JSON.parse(body) as unknown, headers: this.headers(wantsCount ? total : null, page.length) };
  };

  private headers(total: number | null, length: number | null) {
    const values: Record<string, string> = {};
    if (this.sendDateHeader) values.date = new Date(Math.floor(this.clock / 1000)).toUTCString();
    if (this.sendCountHeader && total !== null) values['content-range'] = length ? `0-${length - 1}/${total}` : `*/${total}`;
    return { get: (name: string) => values[name.toLowerCase()] ?? null };
  }
}
