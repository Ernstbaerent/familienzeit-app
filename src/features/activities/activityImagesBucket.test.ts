// Migration 0005 (M9b, erster Test der Lieferung): Der Bucket für Aktivitäts-Bilder ist öffentlich lesbar, klein und nur für SVG,
// und die Datei legt keine Schreib-Policy für die App an. Das SQL selbst wurde nicht gegen ein echtes Supabase-Projekt ausgeführt
// (Schritt 1 der Anleitung „Bilder: erster Test“ in docs/supabase.md).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { storagePublicPath } from './imageAllowlist';

const sql = readFileSync(join(__dirname, '../../../supabase/migrations/0005_activity_images_bucket.sql'), 'utf8');
// Ohne Kommentare, damit nur ausführbares SQL geprüft wird.
const code = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

describe('Migration 0005: Bucket activity-images', () => {
  it('legt den Bucket öffentlich an, mit höchstens 20 KB und nur SVG', () => {
    expect(code).toContain("values ('activity-images', 'activity-images', true, 20480, array['image/svg+xml'])");
  });

  it('ist wiederholbar und stellt die Einstellungen bei jedem Lauf wieder her', () => {
    expect(code).toContain('on conflict (id) do update set');
    for (const column of ['public', 'file_size_limit', 'allowed_mime_types']) expect(code).toContain(`${column} = excluded.${column}`);
  });

  it('legt keine Policy an und vergibt keine Rechte (Schreiben nur mit dem geheimen Schlüssel oder im Dashboard)', () => {
    expect(code.toLowerCase()).not.toContain('create policy');
    expect(code.toLowerCase()).not.toContain('grant ');
    expect(code.toLowerCase()).not.toContain('delete from');
  });

  it('endet mit der Kontrollabfrage (Bucket und Schreib-Policies)', () => {
    expect(code).toContain("'Bucket' as was");
    expect(code).toContain("'Schreib-Policy (soll fehlen)' as was");
    expect(code.trimEnd().endsWith(';')).toBe(true);
  });

  it('der Bucket passt zum Pfad der Allowlist der App', () => {
    expect(storagePublicPath).toBe('/storage/v1/object/public/');
  });
});
