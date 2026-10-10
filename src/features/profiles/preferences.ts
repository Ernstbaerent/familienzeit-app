// Auswahllisten für Interessen und Abneigungen eines Kindes.
//
// Neues Thema ergänzen:
//   1. Schlüssel hier in die Liste eintragen (Englisch, camelCase).
//   2. Den Text unter "preferences" in src/locales/de.json UND en.json ergänzen.
// Mehr ist nicht nötig. Fehlt ein Text, meldet `npx tsc --noEmit` das.
// Gespeichert wird immer der Schlüssel, nie der Text. Umbenennen im UI bricht also keine Profile.
// Einen Schlüssel nie umbenennen, sondern nur dazunehmen (alte Profile kennen ihn sonst nicht mehr).

// Themen, die ein Kind mögen kann.
export const interestKeys = [
  'craft', // Basteln und Malen
  'building', // Bauen und Konstruieren
  'natureAnimals', // Natur und Tiere
  'movement', // Bewegung und Sport
  'water', // Wasser und Schwimmen
  'music', // Musik und Tanzen
  'experiments', // Experimente und Forschen
  'cooking', // Kochen und Backen
  'stories', // Geschichten und Lesen
  'roleplay', // Rollenspiele und Verkleiden
  'games', // Spiele und Rätsel
  'technology', // Technik und Fahrzeuge
  'outings', // Ausflüge und Entdecken
] as const;

// Abneigungen: alle Themen von oben plus Dinge, die nur als Abneigung Sinn ergeben.
export const dislikeKeys = [
  ...interestKeys,
  'loudPlaces', // laute Orte
  'crowds', // viele Menschen
  'longTrips', // lange Fahrten
  'gettingDirty', // schmutzig werden
] as const;

export type InterestKey = (typeof interestKeys)[number];
export type DislikeKey = (typeof dislikeKeys)[number];

export function isInterestKey(value: unknown): value is InterestKey {
  return (interestKeys as readonly unknown[]).includes(value);
}

export function isDislikeKey(value: unknown): value is DislikeKey {
  return (dislikeKeys as readonly unknown[]).includes(value);
}
