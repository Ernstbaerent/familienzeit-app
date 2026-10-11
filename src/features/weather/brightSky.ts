// Bright Sky (https://brightsky.dev): freie Schnittstelle zu den Daten des Deutschen Wetterdienstes (DWD).
// Hier nur reine Funktionen: Internet-Adressen bauen und die Antworten prüfen. Der eigentliche Abruf
// steht in fetchWeather.ts. Die Antworten werden nie blind übernommen, sondern Feld für Feld geprüft;
// was nicht passt, wird `null` oder fällt weg.

import { roundPlace, type Place } from './location';
import {
  brightSkyConditions,
  type BrightSkyCondition,
  type DangerAlert,
  type WarningKind,
  type WeatherRecord,
} from './types';

export const brightSkyBaseUrl = 'https://api.brightsky.dev';

// So viele Stunden Vorhersage holen wir. Gebraucht werden höchstens 4 Std. (halber Tag) ab jetzt,
// der Rest ist Reserve, falls die zwischengespeicherten Daten später noch benutzt werden.
export const forecastHours = 8;

const hourMs = 3_600_000;

// Die drei Adressen für einen Ort. Die Koordinaten werden HIER gerundet (2 Nachkommastellen),
// egal was hereinkommt. So kann kein genauerer Wert nach außen gehen.
export function buildUrls(
  place: Place,
  now: Date,
): { current: string; forecast: string; alerts: string } {
  const { lat, lon } = roundPlace(place);
  const where = `lat=${lat}&lon=${lon}`;
  const hourStart = Math.floor(now.getTime() / hourMs) * hourMs;
  const first = encodeURIComponent(new Date(hourStart).toISOString());
  const last = encodeURIComponent(new Date(hourStart + forecastHours * hourMs).toISOString());
  return {
    current: `${brightSkyBaseUrl}/current_weather?${where}`,
    forecast: `${brightSkyBaseUrl}/weather?${where}&date=${first}&last_date=${last}`,
    alerts: `${brightSkyBaseUrl}/alerts?${where}`,
  };
}

// --- Kleine Prüf-Helfer für unbekannte Daten ---

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asTime(value: unknown): number | null {
  const text = asString(value);
  if (text === null) return null;
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : time;
}

function asCondition(value: unknown): BrightSkyCondition | null {
  return (brightSkyConditions as readonly unknown[]).includes(value)
    ? (value as BrightSkyCondition)
    : null;
}

// --- Aktuelles Wetter und Vorhersage ---

// Aktuelles Wetter: Niederschlag der letzten Stunde (`precipitation_60`). Fehlt der Wert, wird aus den
// letzten 30 oder 10 Minuten hochgerechnet.
export function parseCurrent(json: unknown): WeatherRecord | null {
  const record = asObject(asObject(json)?.weather);
  if (!record) return null;
  const time = asTime(record.timestamp);
  if (time === null) return null;

  const last60 = asNumber(record.precipitation_60);
  const last30 = asNumber(record.precipitation_30);
  const last10 = asNumber(record.precipitation_10);
  let precipitation: number | null = null;
  if (last60 !== null) precipitation = last60;
  else if (last30 !== null) precipitation = last30 * 2;
  else if (last10 !== null) precipitation = last10 * 6;

  return {
    time,
    condition: asCondition(record.condition),
    icon: asString(record.icon),
    cloudCover: asNumber(record.cloud_cover),
    precipitation,
    temperature: asNumber(record.temperature),
  };
}

// Stündliche Vorhersage, nach Zeit sortiert. Kaputte Einträge fallen weg.
export function parseForecast(json: unknown): WeatherRecord[] {
  const list = asObject(json)?.weather;
  if (!Array.isArray(list)) return [];
  const records: WeatherRecord[] = [];
  for (const entry of list) {
    const record = asObject(entry);
    const time = asTime(record?.timestamp);
    if (!record || time === null) continue;
    records.push({
      time,
      condition: asCondition(record.condition),
      icon: asString(record.icon),
      cloudCover: asNumber(record.cloud_cover),
      precipitation: asNumber(record.precipitation),
      temperature: asNumber(record.temperature),
    });
  }
  return records.sort((a, b) => a.time - b.time);
}

// --- Amtliche Warnungen ---

// Welche Warnung schließt draußen aus?
//  - Gewitter (jede Stufe) und Sturm oder Orkan (jede Stufe): erkannt am Namen der Warnung.
//    „Windböen“ (Stufe 1) gehört NICHT dazu.
//  - Jede andere Warnung ab Stufe 3 („severe“ = Unwetterwarnung, „extreme“).
// Nicht gezählt: Testmeldungen, Entwarnungen und Gesundheitswarnungen (z. B. Hitze, da wirkt die Temperatur
// nur auf die Reihenfolge).
const thunderstormWords = /gewitter|thunderstorm/;
const stormWords = /sturm|orkan|storm|hurricane/;

export function parseAlerts(json: unknown): DangerAlert[] {
  const list = asObject(json)?.alerts;
  if (!Array.isArray(list)) return [];
  const alerts: DangerAlert[] = [];
  for (const entry of list) {
    const alert = asObject(entry);
    if (!alert) continue;
    if (alert.status === 'test') continue;
    if (alert.category === 'health') continue;
    if (alert.response_type === 'allclear') continue;

    const onset = asTime(alert.onset) ?? asTime(alert.effective);
    if (onset === null) continue;
    const kind = getWarningKind(alert);
    if (kind === null) continue;
    alerts.push({ kind, onset, expires: asTime(alert.expires) });
  }
  return alerts;
}

function getWarningKind(alert: Record<string, unknown>): WarningKind | null {
  // Der Name der Warnung (z. B. „STURMBÖEN“). Fehlt er, hilft die Überschrift.
  const name = [alert.event_de, alert.event_en]
    .map(asString)
    .filter((text): text is string => text !== null)
    .join(' ');
  const text = (name || [alert.headline_de, alert.headline_en].map(asString).join(' ')).toLowerCase();

  if (thunderstormWords.test(text)) return 'thunderstorm';
  if (stormWords.test(text)) return 'storm';
  if (alert.severity === 'severe' || alert.severity === 'extreme') return 'severe';
  return null;
}
