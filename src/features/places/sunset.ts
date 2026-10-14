// Orte (M10b): Bis wann ist es draußen hell genug? Eine feste Tabelle je Monat, ohne Bibliothek und ohne Sonnendaten vom Netz.
//
// Näherung (docs/suggestions.md, „Dunkelheit“): Für jeden Monat steht hier der früheste Sonnenuntergang in ganz Deutschland
// (Ortszeit mit Sommer- und Winterzeit, gerechnet für 19 Punkte an den Rändern Deutschlands mit der Näherungsformel der NOAA),
// auf 5 Minuten abgerundet und dann 15 Minuten Reserve abgezogen. Im Norden-Osten im Winter und im Süd-Osten im Sommer stimmt
// der Wert also fast genau, anderswo ist es bis zu etwa einer Stunde länger hell. Das ist gewollt: lieber zu früh als im Dunkeln.
// Der Test (sunset.test.ts) rechnet die Formel nach und prüft, dass die Tabelle nie später ist.

// Minuten ab Mitternacht (Ortszeit), Januar zuerst.
export const outdoorDaylightEnd = [
  930, // Januar    15:30 (frühester Sonnenuntergang 15:49)
  985, // Februar   16:25 (16:41)
  1040, // März     17:20 (17:38, am 1. März, noch Winterzeit)
  1155, // April    19:15 (19:31)
  1200, // Mai      20:00 (20:18)
  1240, // Juni     20:40 (20:56)
  1230, // Juli     20:30 (20:45)
  1175, // August   19:35 (19:50)
  1105, // September 18:25 (18:42)
  975, // Oktober   16:15 (16:33, am 31. Oktober, schon Winterzeit)
  930, // November  15:30 (15:47)
  925, // Dezember  15:25 (15:40)
] as const;

// Liegt `end` nach dem Ende des Tageslichts (laut Tabelle)? Ein Besuch, der erst am nächsten Tag endet, liegt immer im Dunkeln.
export function isAfterDaylight(start: Date, end: Date): boolean {
  const sameDay =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();
  if (!sameDay) return true;
  return end.getHours() * 60 + end.getMinutes() > outdoorDaylightEnd[end.getMonth()];
}
