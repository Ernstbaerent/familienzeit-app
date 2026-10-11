// Kalendertage nach Ortszeit (nicht in 24-Stunden-Blöcken).
// Gestern 23:59 und heute 00:01 liegen einen Kalendertag auseinander, obwohl nur zwei Minuten dazwischen sind.
// Bei der Zeitumstellung (23 oder 25 Stunden am Tag) bleibt es ein Tag.

const millisecondsPerDay = 24 * 60 * 60 * 1000;

// Mitternacht-Zähler: Datum als „Tag Nr. …“ in UTC, ohne Uhrzeit. Weil jeder Tag in UTC genau 24 Stunden hat,
// spielt die Zeitumstellung der Ortszeit keine Rolle mehr.
function toDayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / millisecondsPerDay);
}

// Wie viele Kalendertage `from` vor `to` liegt (0 = am selben Tag, 1 = gestern).
// Liegt `from` in der Zukunft (z. B. weil die Uhr verstellt wurde), zählt es als heute (0).
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.max(0, toDayNumber(to) - toDayNumber(from));
}
