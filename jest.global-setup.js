// Läuft einmal vor allen Tests: Alle Tests laufen in deutscher Ortszeit.
// So gibt es die Zeitumstellung (am 25.10.2026 hat der Tag 25 Stunden) wirklich,
// und die Tests verhalten sich auf jedem Rechner gleich.
module.exports = async () => {
  process.env.TZ = 'Europe/Berlin';
};
