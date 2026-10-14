// Orte (M10c): die Website eines Ortes. Reine Funktion.
//
// Der Import (`checkPlaceRow`) lässt nur http(s) durch. Die App prüft vor dem Öffnen trotzdem noch einmal selbst,
// denn ein Link mit fremdem Schema (javascript:, intent:, file: …) darf nie geöffnet werden.

export type WebsiteLink = {
  url: string; // vollständige Adresse für den Browser
  host: string; // zum Anzeigen, ohne „www.“: „saline-bad.de“
};

// Gültig sind nur http:// und https:// mit einem Rechnernamen mit Punkt, ohne Benutzername oder Passwort in der Adresse.
// Sonst `null`: Dann zeigt die Ortsseite keine Website.
export function websiteLink(raw: string | null | undefined): WebsiteLink | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text) || /\s/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username !== '' || url.password !== '') return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return null;
  return { url: url.href, host: host.replace(/^www\./, '') };
}
