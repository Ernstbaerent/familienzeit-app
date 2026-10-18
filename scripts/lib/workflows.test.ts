// GitHub Actions: fester Runner und feste Hauptversionen der Aktionen (docs/github-actions.md).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '../../.github/workflows');
const files = readdirSync(dir).filter((name) => name.endsWith('.yml'));
const read = (name: string) => readFileSync(join(dir, name), 'utf8');
// Je Aktion die erlaubte Hauptversion (die kleinste mit Node 24).
const allowed: Record<string, string> = {
  'actions/checkout': 'v5',
  'actions/setup-node': 'v6',
  'actions/upload-artifact': 'v6',
  'actions/download-artifact': 'v7',
};

describe('Workflows', () => {
  it('gibt es (Wochenlauf, Orte, Bild-Test)', () => {
    expect(files.sort()).toEqual(expect.arrayContaining(['image-test.yml', 'places-import.yml', 'weekly-activities.yml']));
  });

  it.each(files)('%s läuft auf ubuntu-24.04, nie auf ubuntu-latest', (name) => {
    const yml = read(name);
    const runners = [...yml.matchAll(/runs-on:\s*(\S+)/g)].map((match) => match[1]);
    expect(runners.length).toBeGreaterThan(0);
    expect(new Set(runners)).toEqual(new Set(['ubuntu-24.04']));
  });

  it.each(files)('%s nutzt nur die festgelegten Versionen der Aktionen (Node 24)', (name) => {
    const uses = [...read(name).matchAll(/uses:\s*([^@\s]+)@(\S+)/g)].map((match) => [match[1], match[2]]);
    expect(uses.length).toBeGreaterThan(0);
    for (const [action, version] of uses) expect(`${action}@${version}`).toBe(`${action}@${allowed[action] ?? '(nicht freigegeben)'}`);
  });

  it.each(files)('%s: setup-node ohne eigenen Cache, außer im Job mit npm ci', (name) => {
    const steps = read(name).split(/\n\s+- /).filter((step) => step.includes('actions/setup-node'));
    for (const step of steps) expect(step).toMatch(/cache: npm|package-manager-cache: false/);
  });
});
