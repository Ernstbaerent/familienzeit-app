// Allowlist für das Feld `image` einer Aktivität (DESIGN.md, Zusatz 35): Ein Bild darf nur von unserem eigenen Speicher kommen
// (Supabase Storage unseres Projekts), damit beim Anzeigen keine IP-Adresse an einen fremden Server geht.
// Erlaubt sind Adressen, die mit `<Projekt-Adresse>/storage/v1/object/public/` beginnen. Die Projekt-Adresse kommt aus
// EXPO_PUBLIC_SUPABASE_URL (siehe supabaseConfig.ts). Reine Funktionen, ohne UI.
//
// Hinweis zu den Imports in anderen Dateien: Diese Datei wird auch vom Prüfskript gelesen (Node), deshalb nichts aus der App importieren.

// Pfad im Supabase-Projekt, unter dem öffentliche Dateien liegen.
export const storagePublicPath = '/storage/v1/object/public/';

// Die Projekt-Adresse muss genau `https://host` sein (ohne Pfad, Zugangsdaten oder Parameter), Groß-/Kleinschreibung egal.
// Bewusst ohne `new URL(…)`: Die URL-Klasse von React Native ist unvollständig.
const originPattern = /^(https:\/\/[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?)\/*$/i;

// `https://abc.supabase.co` → `https://abc.supabase.co`, alles andere (auch http://) → null.
export function parseSupabaseOrigin(value: string | undefined): string | null {
  const match = originPattern.exec(value?.trim() ?? '');
  return match ? match[1].toLowerCase() : null;
}

// Der erlaubte Anfang aller Bild-Adressen, `null`, wenn die Projekt-Adresse fehlt oder ungültig ist (dann ist kein Bild erlaubt).
export function storageImagePrefix(supabaseUrl: string | undefined): string | null {
  const origin = parseSupabaseOrigin(supabaseUrl);
  return origin === null ? null : `${origin}${storagePublicPath}`;
}

// Darf dieses Bild angezeigt werden? Nur, wenn es mit dem erlaubten Anfang beginnt und noch einen Dateipfad danach hat.
// Der Anfang endet mit `/`, ein fremder Host kann also nicht mit einem erlaubten Namen anfangen (`…supabase.co.evil.com` passt nicht).
export function isAllowedImageUrl(image: unknown, prefix: string | null): image is string {
  if (typeof image !== 'string' || prefix === null) return false;
  const uri = image.trim();
  return uri.startsWith(prefix) && uri.length > prefix.length;
}
