// Zufällige ID für lokale Daten (Profile, Verlauf). Reicht ohne Server: Zeit plus Zufall, keine Bibliothek nötig.
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
