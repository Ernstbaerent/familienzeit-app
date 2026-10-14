// Orte-Import (M10a): Berichte als Markdown für die Seite des Laufs in GitHub (Job Summary). Reine Funktionen.

import { placeKinds } from '../../../src/features/places/placeKinds.ts';
import type { Summary } from './files.ts';
import { regions } from './regions.ts';
import type { UploadResult } from './upload.ts';

const number = (value: number) => value.toLocaleString('de-DE');
const percent = (part: number, whole: number) => (whole === 0 ? '–' : `${Math.round((part / whole) * 100)} %`);
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const mb = (bytes: number) => `${number(Math.round(bytes / 1024 / 1024))} MB`;
const minutes = (seconds: number) => (seconds < 90 ? `${seconds} s` : `${(seconds / 60).toFixed(1).replace('.', ',')} min`);

export function renderPrepareReport(summary: Summary): string {
  const ok = summary.regions.filter((r) => r.ok);
  const failed = summary.regions.filter((r) => !r.ok);
  const rows = ok.reduce((sum, r) => sum + (r.ok ? r.rows : 0), 0);
  const seconds = summary.regions.reduce((sum, r) => sum + r.seconds, 0);
  const lines = [
    `**Orte vorbereiten: ${ok.length} von ${summary.regions.length} Ländern fertig · ${number(rows)} Orte · ${minutes(seconds)}**`,
    '',
    `Lauf \`${summary.importId}\` · Daten: © OpenStreetMap-Mitwirkende (ODbL 1.0), Auszüge von Geofabrik`,
    '',
  ];
  for (const r of failed) if (!r.ok) lines.push(`> **${r.region} (${regions[r.region].name}) fehlgeschlagen:** ${cell(r.error)}`, '');

  lines.push(
    '| Land | Orte | mit Name | mit Ortsteil | Öffnungszeiten (Plan / komplex / unlesbar) | Website | Saison | Bad geraten | Doppelte | außerhalb | Download | Zeit | OSM-Stand |',
    '| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --- |',
  );
  for (const r of ok) {
    if (!r.ok) continue;
    const s = r.stats;
    lines.push(
      `| ${r.region} | ${number(r.rows)} | ${percent(s.withName, s.rows)} | ${percent(s.withLocality, s.rows)} | ` +
        `${number(s.hours.plan)} / ${number(s.hours.complex)} / ${number(s.hours.invalid)} | ${number(s.withWebsite)} | ${number(s.withSeason)} | ` +
        `${number(s.bathSettingGuessed)} | ${number(s.duplicatesMerged)} | ${number(s.outsideRegion)} | ${mb(r.downloadBytes)} | ${minutes(r.seconds)} | ${r.sourceTimestamp ?? '?'} |`,
    );
  }

  const bySubtype = new Map<string, number>();
  for (const r of ok) if (r.ok) for (const [subtype, count] of Object.entries(r.stats.bySubtype)) bySubtype.set(subtype, (bySubtype.get(subtype) ?? 0) + count);
  if (bySubtype.size > 0) {
    lines.push('', '<details><summary>Orte nach Unterart</summary>', '', '| Unterart | Kategorie | Kindertauglichkeit | Anzahl |', '| --- | --- | --: | --: |');
    for (const [subtype, count] of [...bySubtype.entries()].sort((a, b) => b[1] - a[1])) {
      const kind = placeKinds[subtype as keyof typeof placeKinds];
      lines.push(`| ${subtype} | ${kind?.category ?? '?'} | ${kind?.kidWeight ?? '?'} | ${number(count)} |`);
    }
    lines.push('', '</details>');
  }

  const skipped = { notPublic: 0, disused: 0, nameMissing: 0, closed: 0, invalid: 0 };
  for (const r of ok) {
    if (!r.ok) continue;
    skipped.notPublic += r.stats.skipped.notPublic;
    skipped.disused += r.stats.skipped.disused;
    skipped.nameMissing += r.stats.skipped.nameMissing;
    skipped.closed += r.stats.closedForGood;
    skipped.invalid += r.stats.invalidRows;
  }
  lines.push(
    '',
    `Weggelassen: nicht öffentlich ${number(skipped.notPublic)} · stillgelegt ${number(skipped.disused)} · ohne Pflicht-Namen ${number(skipped.nameMissing)} · ` +
      `laut Öffnungszeiten dauerhaft geschlossen ${number(skipped.closed)} · ungültig ${number(skipped.invalid)}`,
  );
  const examples = ok.flatMap((r) => (r.ok ? r.stats.invalidExamples : [])).slice(0, 5);
  if (examples.length > 0) lines.push('', `> **Achtung, ungültige Zeilen (Fehler im Import):** ${cell(examples.join('; '))}`);
  return lines.join('\n');
}

const statusText = { published: 'übernommen', wouldPublish: 'würde übernommen (Trockenlauf)', failed: 'FEHLER, bisheriger Stand bleibt' } as const;

export function renderUploadReport(result: UploadResult, dryRun: boolean, maxPlaces: number): string {
  const failed = result.outcomes.filter((o) => o.status === 'failed');
  const head = dryRun ? 'Trockenlauf, nichts geschrieben' : failed.length === 0 ? 'Orte hochgeladen' : 'Orte hochgeladen, mit Fehlern';
  const lines = [
    `**${head} · Datenbank: ${number(result.totalBefore)} → ${number(result.totalAfter)} Orte von höchstens ${number(maxPlaces)}**`,
    '',
    '| Land | Ergebnis | Orte neu | bisher | Veränderung |',
    '| --- | --- | --: | --: | --: |',
  ];
  for (const o of result.outcomes) {
    const rows = o.status === 'failed' ? '–' : number(o.rows);
    const previous = o.previous === null ? '?' : number(o.previous);
    const change = o.status === 'failed' || !o.previous ? '–' : `${o.rows >= o.previous ? '+' : ''}${Math.round(((o.rows - o.previous) / o.previous) * 100)} %`;
    lines.push(`| ${o.region} | ${statusText[o.status]} | ${rows} | ${previous} | ${change} |`);
  }
  for (const o of failed) if (o.status === 'failed') lines.push('', `> **${o.region}:** ${cell(o.error)}`);
  return lines.join('\n');
}
