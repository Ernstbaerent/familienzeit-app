// Prüfskript für die Qualitätsregeln mit echten Daten (npm run places:check-names, Anleitung: docs/orte.md).
// Liest eine CSV-Datei aus dem SQL-Editor von Supabase und zeigt je Zeile, was die Regeln aus quality.ts mit dem Ort machen.
// Reine Funktionen, ohne Netz und ohne Schlüssel.

import { isPlaceSubtype, kidWeightFor, type PlaceSubtype } from '../../../src/features/places/placeKinds.ts';
import { assessPlace } from './quality.ts';

// CSV mit Komma oder Semikolon, Felder in "…" (mit "" für ein Anführungszeichen), Zeilenende \n oder \r\n.
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === separator) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const emptyValues = ['', 'null', 'NULL', '\\N'];
const trueValues = ['true', 't', 'ja', 'yes', 'y', '1', 'wahr'];
const falseValues = ['false', 'f', 'nein', 'no', 'n', '0', 'falsch', ...emptyValues];

function readBool(value: string | undefined): boolean | null {
  const v = (value ?? '').trim();
  if (trueValues.includes(v.toLowerCase())) return true;
  if (falseValues.includes(v) || falseValues.includes(v.toLowerCase())) return false;
  return null;
}

const text = (value: string | undefined): string | null => {
  const v = (value ?? '').trim();
  return emptyValues.includes(v) ? null : v;
};

export type CheckedRow = {
  line: number; // Zeile in der Datei (Kopfzeile = 1)
  id: string | null;
  name: string | null;
  locality: string | null;
  subtype: string;
  before: number | null; // kid_weight aus der Datei, sonst der Startwert der Unterart
  result: { kind: 'kept'; kidWeight: number; change: 'up' | 'down' | null } | { kind: 'dropped' } | { kind: 'error'; message: string };
  reasons: string[];
};

// Spalten wie in der Abfrage aus docs/orte.md: id (freiwillig), name, subtype, hat_website, hat_zeiten, kid_weight (freiwillig), locality (freiwillig).
// Statt hat_website/hat_zeiten gehen auch die Rohspalten website und opening_hours.
export function checkCsv(content: string): { rows: CheckedRow[]; problems: string[] } {
  const [header, ...data] = parseCsv(content);
  if (!header) return { rows: [], problems: ['Die Datei ist leer.'] };
  const columns = header.map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => columns.findIndex((c) => names.includes(c));
  const at = {
    id: col('id'),
    name: col('name'),
    subtype: col('subtype', 'unterart'),
    website: col('hat_website', 'has_website'),
    hours: col('hat_zeiten', 'has_hours', 'hat_oeffnungszeiten'),
    rawWebsite: col('website'),
    rawHours: col('opening_hours'),
    kidWeight: col('kid_weight'),
    locality: col('locality', 'ort'),
  };
  const problems: string[] = [];
  if (at.name < 0) problems.push('Spalte „name“ fehlt.');
  if (at.subtype < 0) problems.push('Spalte „subtype“ fehlt.');
  if (at.website < 0 && at.rawWebsite < 0) problems.push('Spalte „hat_website“ (oder „website“) fehlt.');
  if (at.hours < 0 && at.rawHours < 0) problems.push('Spalte „hat_zeiten“ (oder „opening_hours“) fehlt.');
  if (problems.length > 0) return { rows: [], problems: [...problems, `Gefunden: ${columns.join(', ')}`] };

  const rows = data.map((cells, index): CheckedRow => {
    const get = (i: number) => (i >= 0 ? cells[i] : undefined);
    const subtype = (get(at.subtype) ?? '').trim();
    const name = text(get(at.name));
    const weight = Number.parseInt((get(at.kidWeight) ?? '').trim(), 10);
    const base: CheckedRow = {
      line: index + 2,
      id: text(get(at.id)),
      name,
      locality: text(get(at.locality)),
      subtype,
      before: Number.isInteger(weight) ? weight : isPlaceSubtype(subtype) ? kidWeightFor(subtype, name !== null) : null,
      result: { kind: 'error', message: '' },
      reasons: [],
    };
    if (!isPlaceSubtype(subtype)) return { ...base, result: { kind: 'error', message: `unbekannte Unterart „${subtype}“` } };
    const hasWebsite = at.website >= 0 ? readBool(get(at.website)) : text(get(at.rawWebsite)) !== null;
    const hasOpeningHours = at.hours >= 0 ? readBool(get(at.hours)) : text(get(at.rawHours)) !== null;
    if (hasWebsite === null || hasOpeningHours === null) {
      return { ...base, result: { kind: 'error', message: 'hat_website/hat_zeiten: erwartet true oder false' } };
    }
    const quality = assessPlace({ subtype: subtype as PlaceSubtype, name, hasWebsite, hasOpeningHours });
    const result: CheckedRow['result'] = quality.keep
      ? { kind: 'kept', kidWeight: quality.kidWeight, change: base.before === null ? quality.change : quality.kidWeight > base.before ? 'up' : quality.kidWeight < base.before ? 'down' : null }
      : { kind: 'dropped' };
    return { ...base, result, reasons: quality.reasons };
  });
  return { rows, problems: [] };
}

const cell = (value: string | null) => (value ?? '–').replace(/\|/g, '\\|');

// Als Markdown-Tabelle (im Terminal lesbar, lässt sich in eine Notiz kopieren). Die ID steht vorn, zum Kopieren für place_overrides.
export function renderCheck(rows: readonly CheckedRow[]): string {
  const lines = ['| ID | Name | Ort | Unterart | bisher | neu | Gründe |', '| --- | --- | --- | --- | --: | --- | --- |'];
  const count = { dropped: 0, down: 0, up: 0, same: 0, error: 0 };
  for (const row of rows) {
    let after: string;
    if (row.result.kind === 'dropped') {
      after = '**weggelassen**';
      count.dropped += 1;
    } else if (row.result.kind === 'error') {
      after = `Fehler: ${row.result.message}`;
      count.error += 1;
    } else if (row.result.change === 'up') {
      after = `${row.result.kidWeight} ↑ aufgewertet`;
      count.up += 1;
    } else if (row.result.change === 'down') {
      after = `${row.result.kidWeight} ↓ abgewertet`;
      count.down += 1;
    } else {
      after = `${row.result.kidWeight} (gleich)`;
      count.same += 1;
    }
    lines.push(
      `| ${cell(row.id)} | ${cell(row.name ?? 'ohne Namen')} | ${cell(row.locality)} | ${cell(row.subtype)} | ${row.before ?? '?'} | ${after} | ${cell(row.reasons.join('; ') || null)} |`,
    );
  }
  lines.push(
    '',
    `${rows.length} Orte: ${count.dropped} weggelassen, ${count.down} abgewertet, ${count.up} aufgewertet, ${count.same} unverändert` +
      (count.error > 0 ? `, ${count.error} mit Fehler` : ''),
  );
  return lines.join('\n');
}
