// Orte-Import (M10a): Texte aus OSM säubern (Namen, Website, Straße). Lieber weglassen als etwas Kaputtes speichern.

import { placeTextLimits } from '../../../src/features/places/placeRow.ts';

// Steuerzeichen raus, Leerraum zusammenfassen, zu lange Texte kürzen (an einer Wortgrenze, wenn möglich).
export function cleanText(value: string | undefined, max: number): string | null {
  if (!value) return null;
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

// Website: `website`, sonst `contact:website`, sonst `url`. Mehrere (mit „;“) → die erste. Nur http(s) mit Domain.
// Fehlt das Protokoll („www.beispiel.de“), wird https:// ergänzt.
export function cleanWebsite(tags: Readonly<Record<string, string>>): string | null {
  const raw = tags.website ?? tags['contact:website'] ?? tags.url;
  const first = raw?.split(';')[0]?.trim();
  if (!first || /\s/.test(first)) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(first) ? first : `https://${first}`;
  try {
    const url = new URL(withProtocol);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname.includes('.') || url.username || url.password) return null;
    const text = url.toString();
    return text.length <= placeTextLimits.website ? text : null;
  } catch {
    return null;
  }
}

// Für den Vergleich von Namen (Doppelte): klein, ohne Akzente, Leerzeichen und Satzzeichen
// („Stadt-Park“ = „Stadtpark“, „Bäderkomplex“ = „Baderkomplex“).
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
