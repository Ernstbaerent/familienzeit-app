// Baukasten (M9b): Grobe Maße eines Bausteins aus seinem SVG-Text, ohne Browser.
// Bausteine nutzen nur absolute Pfadbefehle (M L H V C S Q T Z), dann genügt es, alle Punkte (auch Kontrollpunkte) zu sammeln.
// Das Ergebnis ist ein Rahmen, der die Zeichnung sicher umschließt (Kontrollpunkte liegen außerhalb der Kurve, also eher zu groß als zu klein).

export type Box = { minX: number; maxX: number; minY: number; maxY: number };

export const elementNames = ['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'] as const;

const elementPattern = /<([a-zA-Z]+)\b([^>]*?)\/?>/g;
const attributePattern = /([a-zA-Z-]+)="([^"]*)"/g;

export type ParsedElement = { name: string; attrs: Record<string, string> };

// Alle Elemente eines Schnipsels (auch unbekannte, damit die Prüfung sie melden kann).
export function parseElements(fragment: string): ParsedElement[] {
  return [...fragment.matchAll(elementPattern)].map((match) => ({
    name: match[1],
    attrs: Object.fromEntries([...match[2].matchAll(attributePattern)].map((attr) => [attr[1], attr[2]])),
  }));
}

const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, Z: 0 };

// Alle Punkte eines Pfades mit absoluten Befehlen. `null`, wenn etwas anderes vorkommt (relative Befehle, Bögen, kaputte Zahlen).
export function pathPoints(d: string): [number, number][] | null {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  if (tokens === null || tokens.join('').length === 0) return null;
  const points: [number, number][] = [];
  let x = 0;
  let y = 0;
  let command = '';
  let args: number[] = [];
  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      if (!(token in arity)) return null; // relative Befehle und Bögen sind in Bausteinen nicht erlaubt
      if (args.length > 0) return null; // angefangene Zahlengruppe
      command = token;
      continue;
    }
    if (command === '' || command === 'Z') return null;
    args.push(Number(token));
    if (args.length === arity[command]) {
      if (command === 'H') x = args[0];
      else if (command === 'V') y = args[0];
      else {
        for (let i = 0; i < args.length; i += 2) points.push([args[i], args[i + 1]]);
        x = args[args.length - 2];
        y = args[args.length - 1];
      }
      if (command === 'H' || command === 'V') points.push([x, y]);
      args = [];
      if (command === 'M') command = 'L'; // weitere Paare nach M sind Linien
    }
  }
  return args.length === 0 ? points : null;
}

function numbers(value: string | undefined): number[] {
  return (value ?? '').match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
}

// Halbe Linienstärke aus dem Platzhalter (4 → 2, 2,5 → 1,25), damit der Rahmen die Linie mit umfasst.
function halfStroke(attrs: Record<string, string>): number {
  if (attrs.stroke === 'none') return 0;
  if (attrs['stroke-width'] === '{{line}}') return 2;
  if (attrs['stroke-width'] === '{{fine}}') return 1.25;
  return 0;
}

// Der Rahmen eines Schnipsels in seinen eigenen Koordinaten, inklusive Linienbreite und versetzter Farbfläche (`translate({{shift}} {{shift}})`, 3 Einheiten).
// `null`, wenn ein Element nicht lesbar ist.
export function estimateBox(fragment: string, shift = 3): Box | null {
  const box: Box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const add = (x: number, y: number, pad: number, moved: boolean) => {
    const dx = moved ? shift : 0;
    box.minX = Math.min(box.minX, x - pad);
    box.maxX = Math.max(box.maxX, x + pad + dx);
    box.minY = Math.min(box.minY, y - pad);
    box.maxY = Math.max(box.maxY, y + pad + dx);
  };
  for (const { name, attrs } of parseElements(fragment)) {
    const pad = halfStroke(attrs);
    const moved = attrs.transform === 'translate({{shift}} {{shift}})';
    if (name === 'path') {
      const points = pathPoints(attrs.d ?? '');
      if (points === null) return null;
      for (const [x, y] of points) add(x, y, pad, moved);
    } else if (name === 'circle') {
      const [cx, cy, r] = [attrs.cx, attrs.cy, attrs.r].map(Number);
      if ([cx, cy, r].some(Number.isNaN)) return null;
      add(cx - r, cy - r, pad, moved);
      add(cx + r, cy + r, pad, moved);
    } else if (name === 'ellipse') {
      const [cx, cy, rx, ry] = [attrs.cx, attrs.cy, attrs.rx, attrs.ry].map(Number);
      if ([cx, cy, rx, ry].some(Number.isNaN)) return null;
      add(cx - rx, cy - ry, pad, moved);
      add(cx + rx, cy + ry, pad, moved);
    } else if (name === 'rect') {
      const [x, y, w, h] = [attrs.x ?? '0', attrs.y ?? '0', attrs.width, attrs.height].map(Number);
      if ([x, y, w, h].some(Number.isNaN)) return null;
      add(x, y, pad, moved);
      add(x + w, y + h, pad, moved);
    } else if (name === 'line') {
      const [x1, y1, x2, y2] = [attrs.x1, attrs.y1, attrs.x2, attrs.y2].map(Number);
      if ([x1, y1, x2, y2].some(Number.isNaN)) return null;
      add(x1, y1, pad, moved);
      add(x2, y2, pad, moved);
    } else if (name === 'polyline' || name === 'polygon') {
      const values = numbers(attrs.points);
      if (values.length < 4 || values.length % 2 !== 0) return null;
      for (let i = 0; i < values.length; i += 2) add(values[i], values[i + 1], pad, moved);
    }
  }
  return Number.isFinite(box.minX) ? box : null;
}
