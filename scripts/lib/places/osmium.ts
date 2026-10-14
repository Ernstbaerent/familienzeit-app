// Orte-Import (M10a): Aufrufe von osmium-tool (Ubuntu-Paket `osmium-tool`, in der Action per apt installiert).
// Die Befehle stehen hier als Listen (ohne Shell), damit sie sich testen lassen und nichts falsch zitiert wird.
//
// Ablauf je Bundesland (docs/orte.md, „Ablauf“):
//   1. tags-filter: nur Objekte mit den Merkmalen unserer Kategorien (plus die Punkte ihrer Linien und Flächen).
//   2. Seen: alle Gewässer filtern, davon nur die mit Namen (sonst wären es Hunderttausende Teiche), dann zusammenführen.
//   3. export: als GeoJSON, eine Zeile je Objekt, geschlossene Linien als Fläche, nur die Merkmale, die wir brauchen.

import { spawn } from 'node:child_process';

// Ausdrücke für `osmium tags-filter`. Grob: Das genaue Zuordnen (mit Ausschlüssen und Namenspflicht) macht classify.ts.
export const mainFilterExpressions = [
  'nwr/leisure=playground,park,water_park,swimming_pool,sports_centre,sports_hall,miniature_golf,indoor_play,trampoline_park,bowling_alley,ice_rink,bathing_place,nature_reserve',
  'nwr/tourism=theme_park,zoo,aquarium,museum,attraction,viewpoint,picnic_site',
  'nwr/historic=castle,ruins',
  'nwr/man_made=tower',
  'nwr/amenity=cinema,library',
  'n/place=city,town,village,suburb,quarter,neighbourhood,hamlet',
] as const;

export const waterFilterExpression = 'wr/natural=water';
export const namedFilterExpression = 'wr/name';

// Nur diese Merkmale kommen in die Ausgabe (hält die Datei klein). Alles, was classify.ts, transform.ts und season.ts lesen.
export const exportedTags = [
  'name',
  'leisure',
  'tourism',
  'historic',
  'man_made',
  'tower:type',
  'amenity',
  'natural',
  'water',
  'place',
  'sport',
  'indoor',
  'covered',
  'building',
  'location',
  'access',
  'disused',
  'abandoned',
  'opening_hours',
  'website',
  'contact:website',
  'url',
  'addr:street',
  'addr:suburb',
  'addr:city',
  'seasonal',
] as const;

// Einstellungen für `osmium export`: Typ und Nummer des Objekts, geschlossene Linien nur als Fläche (nie zusätzlich als Linie).
export const exportConfig = {
  attributes: { type: true, id: true },
  linear_tags: false,
  area_tags: true,
  include_tags: exportedTags,
};

export type OsmiumStep = { what: string; args: string[] };

export function buildSteps(paths: {
  input: string;
  main: string;
  water: string;
  namedWater: string;
  merged: string;
  config: string;
  output: string;
}): OsmiumStep[] {
  return [
    { what: 'Merkmale filtern', args: ['tags-filter', paths.input, ...mainFilterExpressions, '-o', paths.main, '--overwrite', '--no-progress'] },
    { what: 'Gewässer filtern', args: ['tags-filter', paths.input, waterFilterExpression, '-o', paths.water, '--overwrite', '--no-progress'] },
    { what: 'Gewässer mit Namen', args: ['tags-filter', paths.water, namedFilterExpression, '-o', paths.namedWater, '--overwrite', '--no-progress'] },
    { what: 'Zusammenführen', args: ['merge', paths.main, paths.namedWater, '-o', paths.merged, '--overwrite', '--no-progress'] },
    {
      what: 'Als GeoJSON ausgeben',
      args: ['export', paths.merged, '-c', paths.config, '-f', 'geojsonseq', '-x', 'print_record_separator=false', '-o', paths.output, '--overwrite', '--no-progress'],
    },
  ];
}

// Stand der Daten (Zeitpunkt der letzten Änderung bei OSM), steht im Kopf der Geofabrik-Datei.
export const replicationTimestampArgs = (input: string) => ['fileinfo', '-g', 'header.option.osmosis_replication_timestamp', input];

export type RunResult = { stdout: string };

// Führt osmium aus. Bricht nach `timeoutMs` ab. Fehlermeldungen werden gekürzt (osmium gibt keine Geheimnisse aus).
export function runOsmium(args: readonly string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('osmium', [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`osmium ${args[0]}: Zeitüberschreitung nach ${Math.round(timeoutMs / 60_000)} Minuten`));
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < 10_000) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 4000) stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`osmium ließ sich nicht starten (${error.message}). Ist osmium-tool installiert?`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout });
      else reject(new Error(`osmium ${args[0]}: Exit-Code ${code}. ${stderr.replace(/\s+/g, ' ').trim().slice(0, 300)}`));
    });
  });
}
