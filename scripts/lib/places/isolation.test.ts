// Zwei Sicherheitsregeln für den Orte-Import, als Test festgehalten:
//   1. Die LGPL-Bibliothek opening_hours läuft nur im Import („Vorbereiten“) und kommt nie in die App (app/, src/).
//   2. „Hochladen“ läuft mit dem geheimen Schlüssel und ohne npm: Das Skript darf (auch über Umwege) nur eigene Dateien und
//      Node-Bausteine (node:…) laden, kein einziges Paket.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = join(__dirname, '..', '..', '..');

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : filesIn(path);
    return /\.(ts|tsx|js|jsx)$/.test(name) ? [path] : [];
  });
}

// Laufzeit-Importe einer Datei (ohne `import type`, die verschwinden beim Ausführen).
function runtimeImports(path: string): string[] {
  const code = readFileSync(path, 'utf8');
  const specifiers: string[] = [];
  for (const match of code.matchAll(/^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/gm)) {
    if (!match[2]) specifiers.push(match[3]);
  }
  for (const match of code.matchAll(/\b(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g)) specifiers.push(match[1]);
  return specifiers;
}

describe('opening_hours (LGPL) nur im Import', () => {
  it('keine Datei in app/ oder src/ lädt opening_hours', () => {
    const offenders = [...filesIn(join(root, 'app')), ...filesIn(join(root, 'src'))].filter((file) =>
      /['"]opening_hours['"]/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('steht nur unter devDependencies (nicht in dependencies)', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(pkg.dependencies.opening_hours).toBeUndefined();
    expect(pkg.devDependencies.opening_hours).toBe('3.15.0');
  });
});

describe('„Hochladen“ lädt kein einziges Paket', () => {
  it('alle Dateien, die scripts/places-upload.ts (auch indirekt) lädt, nutzen nur eigene Dateien und node:…', () => {
    const seen = new Set<string>();
    const packages: string[] = [];
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      for (const specifier of runtimeImports(file)) {
        if (specifier.startsWith('node:')) continue;
        if (specifier.startsWith('.')) visit(resolve(dirname(file), specifier));
        else packages.push(`${relative(root, file)} → ${specifier}`);
      }
    };
    visit(join(root, 'scripts', 'places-upload.ts'));
    expect(packages).toEqual([]);
    // Zur Sicherheit: Die Öffnungszeiten-Auswertung (mit opening_hours) ist nicht dabei.
    expect([...seen].map((f) => relative(root, f))).not.toContain(join('scripts', 'lib', 'places', 'hours.ts'));
    expect(seen.size).toBeGreaterThan(5);
  });
});
