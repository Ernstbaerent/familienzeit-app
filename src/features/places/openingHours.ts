// Orte (M10b): den vereinfachten Wochenplan aus dem Import lesen (`hours_plan`, docs/orte.md, „Öffnungszeiten“).
// Eigener kleiner Code, keine Bibliothek: Die Bibliothek opening_hours läuft nur im Import und kommt nie in die App.
// Reine Funktionen. Gerechnet wird in der Ortszeit des Handys (die Orte liegen in Deutschland).

import type { HoursPlan } from './placeRow';

const minutesPerDay = 1440;

// Montag = 0 … Sonntag = 6 (wie `hours_plan.days`).
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Ist der Ort ab `start` ohne Unterbrechung mindestens `minutes` Minuten offen?
// Zeiträume über Mitternacht stehen im Plan als zwei Teile (bis 1440 und ab 0 am nächsten Tag) und werden hier verbunden.
// Ein Besuch dauert höchstens einige Stunden: Mehr als 7 Tage am Stück werden nicht geprüft.
export function isOpenThrough(plan: HoursPlan, start: Date, minutes: number): boolean {
  let day = weekdayIndex(start);
  let from = start.getHours() * 60 + start.getMinutes();
  let needed = minutes;
  for (let step = 0; step < 7; step += 1) {
    const interval = plan.days[day].find(([open, close]) => open <= from && from < close);
    if (!interval) return false;
    const available = interval[1] - from;
    if (available >= needed) return true;
    if (interval[1] !== minutesPerDay) return false; // schließt vor dem Ende des Besuchs
    needed -= available;
    day = (day + 1) % 7;
    from = 0;
  }
  return true;
}

// Ist der Ort jetzt offen (für die Gewichtung „bekannt und offen“)?
export function isOpenAt(plan: HoursPlan, date: Date): boolean {
  return isOpenThrough(plan, date, 1);
}
