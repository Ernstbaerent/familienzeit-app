// Grenzen der strukturierten Ausgaben der Claude API (output_config.format, strict tools), Stand der Doku 2026-10-18:
// https://platform.claude.com/docs/en/build-with-claude/structured-outputs ("Schema complexity limits").
// Je Anfrage, über alle strengen Schemas zusammen: höchstens 16 Parameter mit Union-Typ (anyOf oder Typ-Liste wie ["string","null"]),
// höchstens 24 optionale Parameter (nicht in `required`), höchstens 20 strenge Werkzeuge. Dazu eine interne Grenze für die Größe
// der kompilierten Grammatik ("Schema is too complex for compilation") und 180 Sekunden Zeit zum Kompilieren.
// Wir zählen streng (jede Stelle im Schema einmal, auch in $defs) und halten selbst eine niedrigere Grenze ein, damit Luft bleibt.

export const apiLimits = { unions: 16, optional: 24 } as const;
export const ourLimits = { unions: 10, optional: 0 } as const;

type Node = Record<string, unknown>;

function walk(node: unknown, path: string, visit: (entry: Node, path: string) => void): void {
  if (Array.isArray(node)) return node.forEach((child, index) => walk(child, `${path}[${index}]`, visit));
  if (typeof node !== 'object' || node === null) return;
  const entry = node as Node;
  visit(entry, path);
  for (const [key, child] of Object.entries(entry)) walk(child, `${path}/${key}`, visit);
}

// Alle Stellen mit Union-Typ (anyOf oder `type` als Liste), als Pfad.
export function unionParameters(schema: unknown): string[] {
  const found: string[] = [];
  walk(schema, '#', (entry, path) => {
    if (Array.isArray(entry.anyOf) || Array.isArray(entry.type)) found.push(path);
  });
  return found;
}

// Alle optionalen Eigenschaften (in `properties`, aber nicht in `required`), als Pfad.
export function optionalParameters(schema: unknown): string[] {
  const found: string[] = [];
  walk(schema, '#', (entry, path) => {
    if (typeof entry.properties !== 'object' || entry.properties === null) return;
    const required = Array.isArray(entry.required) ? (entry.required as unknown[]) : [];
    for (const key of Object.keys(entry.properties)) if (!required.includes(key)) found.push(`${path}/properties/${key}`);
  });
  return found;
}

// Leer = in Ordnung. Prüft gegen unsere eigene, strengere Grenze.
export function schemaLimitProblems(schema: unknown, limits: { unions: number; optional: number } = ourLimits): string[] {
  const problems: string[] = [];
  const unions = unionParameters(schema);
  const optional = optionalParameters(schema);
  if (unions.length > limits.unions) problems.push(`Das Schema hat ${unions.length} Parameter mit Union-Typ (anyOf oder Typ-Liste), erlaubt sind hier ${limits.unions} (API: ${apiLimits.unions}): ${unions.join(', ')}`);
  if (optional.length > limits.optional) problems.push(`Das Schema hat ${optional.length} optionale Parameter, erlaubt sind hier ${limits.optional} (API: ${apiLimits.optional}): ${optional.join(', ')}`);
  return problems;
}
