// KI-Wochenlauf (M9): Der Bericht als Markdown, für die Seite des Laufs in GitHub (Job Summary) und für die Konsole.
// Die erste Zeile fasst alles zusammen: freigegeben, als Entwurf, verworfen, Stand der Datenbank, Kosten. Reine Funktionen.

import { formatUsd } from './cost.ts';
import type { Accepted, Rejected } from './review.ts';

export type MaterialSuggestion = { key: string; de: string; en: string; reason: string };

export type RunOutcome =
  | 'written' // geschrieben
  | 'dryRun' // Trockenlauf, nichts geschrieben
  | 'nothingToWrite' // keine Aktivität hat bestanden
  | 'capReached' // Obergrenze MAX_ACTIVITIES erreicht, KI nicht aufgerufen
  | 'aborted'; // Fehler (Schlüssel, API, Datenbank, Zeit), nichts geschrieben

export type RunReport = {
  outcome: RunOutcome;
  reason: string | null; // Grund bei capReached und aborted
  dryRun: boolean;
  autoApprove: boolean;
  model: string;
  batchId: string;
  approved: Accepted[];
  drafts: Accepted[];
  rejected: Rejected[];
  generated: number; // Vorschläge der KI insgesamt
  qualityBrake: boolean;
  materialSuggestions: MaterialSuggestion[];
  ideasUsed: number[];
  db: { count: number | null; max: number; source: 'Supabase' | 'data/' };
  cost: { calls: number; inputTokens: number; outputTokens: number; actualUsd: number; typicalUsd: number | null; worstUsd: number | null };
  warnings: string[];
  notes: string[];
};

const number = (value: number) => value.toLocaleString('de-DE');

// Text in einer Tabellenzelle: keine Zeilenumbrüche und keine senkrechten Striche (die würden die Tabelle zerlegen).
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

export function headline(report: RunReport): string {
  const db = report.db.count === null ? `? von ${number(report.db.max)}` : `${number(report.db.count)} von ${number(report.db.max)}`;
  const counts =
    `Freigegeben: ${report.approved.length} · Als Entwurf: ${report.drafts.length} · Verworfen: ${report.rejected.length} · ` +
    `Datenbank: ${db} · Kosten: ${formatUsd(report.cost.actualUsd)}`;
  const prefix: Record<RunOutcome, string> = {
    written: '',
    dryRun: 'Trockenlauf, nichts geschrieben · ',
    nothingToWrite: 'Nichts geschrieben · ',
    capReached: 'OBERGRENZE ERREICHT, nichts erzeugt · ',
    aborted: 'ABGEBROCHEN, nichts geschrieben · ',
  };
  return `**${prefix[report.outcome]}${counts}**`;
}

function ageRange(accepted: Accepted): string {
  return `${accepted.activity.ageMin}–${accepted.activity.ageMax}`;
}

function activityRows(list: readonly Accepted[], status: string): string[] {
  return list.map((a) => {
    const check = a.flags.length > 0 ? `bestanden, Auffälligkeit: ${a.flags.join('; ')}` : 'bestanden';
    return `| ${status} | ${cell(a.activity.translations.de.title)} | ${a.activity.category} | ${ageRange(a)} | ${cell(check)} |`;
  });
}

export function renderReport(report: RunReport): string {
  const lines: string[] = [headline(report), ''];

  if (report.reason) lines.push(`> **${report.outcome === 'capReached' ? 'Obergrenze' : 'Abbruch'}:** ${report.reason}`, '');
  for (const warning of report.warnings) lines.push(`> **Achtung:** ${warning}`, '');

  const mode = report.dryRun ? 'Trockenlauf (schreibt nichts)' : 'echter Lauf';
  lines.push(
    `Lauf \`${report.batchId}\` · ${mode} · automatische Freigabe ${report.autoApprove ? 'an' : 'aus'} · Modell \`${report.model}\``,
    '',
  );

  const all = [...report.approved, ...report.drafts];
  if (all.length > 0) {
    lines.push(`### ${report.dryRun ? 'Würde schreiben' : 'Neue Aktivitäten'} (${all.length})`, '');
    lines.push('| Status | Titel | Kategorie | Alter | Prüfung |', '| --- | --- | --- | --- | --- |');
    lines.push(...activityRows(report.approved, 'approved'), ...activityRows(report.drafts, 'draft'), '');
  }

  if (report.rejected.length > 0) {
    lines.push(`### Verworfen (${report.rejected.length})`, '', '| Titel | Grund |', '| --- | --- |');
    for (const r of report.rejected) lines.push(`| ${cell(r.title)} | ${cell(r.reasons.join('; '))} |`);
    lines.push('');
  }

  if (report.materialSuggestions.length > 0) {
    lines.push('### Vorgeschlagenes neues Material (nicht benutzt, nur zur Entscheidung)', '');
    for (const m of report.materialSuggestions) lines.push(`- \`${cell(m.key)}\`: ${cell(m.de)} / ${cell(m.en)} – ${cell(m.reason)}`);
    lines.push('');
  }

  lines.push('### Kosten', '');
  if (report.cost.typicalUsd !== null && report.cost.worstUsd !== null) {
    lines.push(`- Schätzung vor dem Lauf: üblich etwa ${formatUsd(report.cost.typicalUsd)}, schlimmster Fall ${formatUsd(report.cost.worstUsd)} pro Aufruf`);
  }
  lines.push(
    `- Tatsächlich: ${formatUsd(report.cost.actualUsd)} für ${report.cost.calls} Aufruf(e), ` +
      `${number(report.cost.inputTokens)} Token Anfrage, ${number(report.cost.outputTokens)} Token Antwort`,
    '',
  );

  if (report.ideasUsed.length > 0) {
    lines.push(`Stichwort-Ideen ${report.dryRun || report.outcome !== 'written' ? 'wären verwendet' : 'als verwendet markiert'}: ${report.ideasUsed.map((id) => `#${id}`).join(', ')}`, '');
  }
  for (const note of report.notes) lines.push(`_${note}_`, '');

  if (all.length > 0) {
    lines.push('<details><summary>Alle Texte zum Durchlesen (Deutsch)</summary>', '');
    for (const a of all) {
      const de = a.activity.translations.de;
      lines.push(`#### ${de.title} (\`${a.activity.id}\`)`, '', de.summary, '');
      de.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
      lines.push('');
      if (de.safetyNote) lines.push(`Sicherheit: ${de.safetyNote}`, '');
      lines.push(`Material: ${a.activity.materials.join(', ')}${a.activity.months ? ` · Monate: ${a.activity.months.join(', ')}` : ''}`, '');
    }
    lines.push('</details>', '');
  }
  return lines.join('\n');
}
