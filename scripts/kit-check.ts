// Prüft den Baukasten (assets/bausteine/) und die Beispielszenen (npm run kit:check): jeder Baustein gegen die Regeln, jede Szene gegen Layout,
// Maße und, wenn sie eine Aktivität nennt, gegen deren Sicherheit und Text. Endet mit Fehler bei jedem Problem.
// Anleitung: docs/bausteine/README.md.

import { join } from 'node:path';

import { checkCatalog, loadCatalog, loadExampleScenes } from './lib/kit/catalog.ts';
import { checkScene, contextFromActivity } from './lib/kit/scene.ts';
import { loadActivityData } from './lib/activityData.ts';
import { loadProbe } from './lib/kit/probe.ts';
import { findTitleObjects, loadMaterialLabels } from './lib/kit/titleObjects.ts';

const root = join(import.meta.dirname, '..');
const catalog = loadCatalog(root);
const problems = checkCatalog(catalog);

const labels = loadMaterialLabels(root);
const context = (activity: Parameters<typeof contextFromActivity>[0]) => contextFromActivity(activity, findTitleObjects(activity, labels, catalog));
const activities = new Map(loadActivityData().activities.map((activity) => [activity.id, activity]));
for (const [name, scene] of loadExampleScenes(root)) {
  const activity = scene.activity === undefined ? undefined : activities.get(scene.activity);
  if (scene.activity !== undefined && activity === undefined) problems.push(`Szene ${name}: Aktivität „${scene.activity}“ gibt es nicht in data/.`);
  for (const problem of checkScene(scene, catalog, activity === undefined ? undefined : context(activity))) problems.push(`Szene ${name}: ${problem}`);
}

// Die Probebilder (Schritt 3b) mit ihren Aktivitäten, auch den KI-Aktivitäten aus assets/bausteine/probe/aktivitaeten.json
const probe = loadProbe(root);
for (const extra of probe.extra) activities.set(extra.id, extra as never);
for (const [name, scene] of probe.scenes) {
  const activity = activities.get(scene.activity);
  if (activity === undefined) problems.push(`Probebild ${name}: Aktivität „${scene.activity}“ gibt es nicht.`);
  else for (const problem of checkScene(scene, catalog, context(activity))) problems.push(`Probebild ${name}: ${problem}`);
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Baukasten in Ordnung: ${catalog.size} Bausteine, ${loadExampleScenes(root).size} Beispielszenen, ${probe.scenes.size} Probebilder.`);
