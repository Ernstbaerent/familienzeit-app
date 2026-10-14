// KI-Wochenlauf (M9): Auffälligkeiten. Eine Aktivität mit Auffälligkeit hat alle Prüfungen bestanden, wird aber NIE automatisch
// freigegeben: Sie bleibt `draft`, bis ein Mensch sie ansieht (docs/wochenlauf.md, „Wöchentliche Durchsicht“).
// Gesucht wird nach:
//   1. Marken- oder Personennamen im Titel,
//   2. Verweisen auf Websites, Apps oder soziale Netzwerke (in allen Texten),
//   3. unplausiblen Mengen- oder Zeitangaben (in allen Texten und in der Dauer).
// Das ist ein grobes Sieb mit festen Listen: lieber eine Auffälligkeit zu viel (dann bleibt es ein Entwurf) als eine zu wenig.
// Reine Funktionen.

import type { Activity } from '../../../src/features/activities/activities.ts';

// Marken, Produkte und bekannte Figuren (Kleinschreibung, als ganzes Wort gesucht).
const brands = [
  'lego', 'duplo', 'playmobil', 'schleich', 'brio', 'kapla', 'ravensburger', 'haba', 'tonie', 'tonies', 'toniebox', 'barbie',
  'hot wheels', 'nerf', 'play-doh', 'playdoh', 'fischertechnik', 'märklin', 'carrera', 'matchbox', 'nintendo', 'playstation',
  'xbox', 'minecraft', 'fortnite', 'roblox', 'pokémon', 'pokemon', 'super mario', 'disney', 'pixar', 'marvel', 'paw patrol',
  'peppa', 'bluey', 'sesamstraße', 'biene maja', 'pumuckl', 'harry potter', 'star wars', 'spider-man', 'spiderman', 'batman',
  'superman', 'hello kitty', 'nutella', 'haribo', 'smarties', 'm&m', 'm&ms', 'oreo', 'milka', 'ritter sport', 'kinder schokolade',
  'überraschungsei', 'coca-cola', 'cola', 'fanta', 'sprite', 'pepsi', 'red bull', 'mentos', 'pringles', 'maggi', 'knorr',
  'dr. oetker', 'oetker', 'tesa', 'pritt', 'uhu', 'edding', 'stabilo', 'faber-castell', 'staedtler', 'ikea', 'amazon', 'aldi',
  'lidl', 'rewe', 'edeka', 'rossmann', 'tupperware', 'thermomix', 'post-it', 'zewa', 'nivea', 'ferrero', 'lindt', 'hanuta',
  'capri-sun', 'capri-sonne', 'danone', 'bob der baumeister', 'feuerwehrmann sam', 'conni', 'pippi', 'pippi langstrumpf',
  'michel aus lönneberga', 'grüffelo', 'gruffalo', 'janosch', 'olaf', 'elsa',
];

// Bekannte Personen und häufige Vornamen (mit großem Anfangsbuchstaben, als ganzes Wort gesucht).
const persons = [
  'Einstein', 'Mozart', 'Beethoven', 'Picasso', 'Van Gogh', 'Monet', 'Kandinsky', 'Klimt', 'Warhol', 'Da Vinci', 'Leonardo',
  'Michelangelo', 'Goethe', 'Schiller', 'Grimm', 'Andersen', 'Lindgren', 'Preußler', 'Newton', 'Darwin', 'Curie', 'Tesla', 'Edison',
  'Humboldt', 'Luther', 'Kolumbus', 'Columbus',
  'Anna', 'Emma', 'Mia', 'Hannah', 'Hanna', 'Lena', 'Lea', 'Leonie', 'Marie', 'Sophie', 'Lina', 'Ella', 'Clara', 'Klara', 'Lisa',
  'Laura', 'Julia', 'Sarah', 'Paula', 'Greta', 'Frieda', 'Ida', 'Emily', 'Charlotte', 'Olivia', 'Amelia',
  'Paul', 'Ben', 'Finn', 'Jonas', 'Leon', 'Luis', 'Lukas', 'Max', 'Noah', 'Elias', 'Felix', 'Emil', 'Anton', 'Oskar', 'Tom', 'Tim',
  'Jan', 'Peter', 'Moritz', 'Karl', 'Fritz', 'Hans', 'Jack', 'Oliver', 'Harry', 'George', 'James', 'William', 'Lucy', 'Sam',
];

const websitePatterns: RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b[a-z0-9-]+\.(de|com|org|net|eu|io|app|tv|info|at|ch)\b/i,
  /\b(youtube|tiktok|instagram|facebook|pinterest|whatsapp|snapchat|twitter|twitch|reddit|spotify|google|alexa|siri|chatgpt|netflix|podcast)\b/i,
  /\b(app|apps|app-store|app store|play store|online|internet|website|webseite|homepage|qr-code|qr code)\b/i,
  /(^|\s)[@#][\p{L}\d_]{2,}/u,
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const brandPattern = new RegExp(`(?<![\\p{L}\\d])(${brands.map(escapeRegExp).join('|')})(?![\\p{L}\\d])`, 'iu');
// Auch mit Genitiv-s: „Emmas Garten“, „Emma's Garden“. („Bach“ fehlt bewusst in der Liste: Es ist auch das Wort für einen kleinen Fluss.)
const personPattern = new RegExp(`(?<![\\p{L}\\d])(${persons.map(escapeRegExp).join('|')})(?:s|['’]s)?(?![\\p{L}\\d])`, 'u');

function allTexts(activity: Activity): string[] {
  return Object.values(activity.translations).flatMap((t) => [t.title, t.summary, ...t.steps, t.safetyNote ?? '']);
}

function toNumber(text: string): number {
  return Number(text.replace(',', '.'));
}

// Sucht Zahl + Einheit und gibt die Zahlen zurück, z. B. „10 Minuten“ → 10.
function amounts(text: string, units: string): number[] {
  const pattern = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${units})(?![\\p{L}])`, 'giu');
  return [...text.matchAll(pattern)].map((match) => toNumber(match[1]));
}

export function detectFlags(activity: Activity): string[] {
  const flags: string[] = [];
  const titles = Object.values(activity.translations).map((t) => t.title);
  const texts = allTexts(activity);
  const body = texts.join('\n');

  // 1. Marken- oder Personennamen im Titel
  for (const title of titles) {
    if (/[®™©]/.test(title)) flags.push(`Markenzeichen im Titel („${title}“)`);
    const brand = brandPattern.exec(title);
    if (brand) flags.push(`Markenname im Titel: „${brand[1]}“`);
    const person = personPattern.exec(title);
    if (person) flags.push(`Personenname im Titel: „${person[1]}“`);
  }

  // 2. Verweise auf Websites, Apps oder soziale Netzwerke
  for (const pattern of websitePatterns) {
    const match = pattern.exec(body);
    if (match) {
      flags.push(`Verweis auf Website, App oder soziales Netzwerk: „${match[0].trim()}“`);
      break;
    }
  }

  // 3. Unplausible Mengen- oder Zeitangaben
  const minutes = amounts(body, 'Minuten|Minute|Min\\.?|minutes?|mins?');
  const hours = amounts(body, 'Stunden|Stunde|Std\\.?|hours?|hrs?');
  const longest = Math.max(0, ...minutes, ...hours.map((h) => h * 60));
  if (longest > activity.durationMax) {
    flags.push(`Zeitangabe im Text (${longest} Min.) ist länger als die Dauer (höchstens ${activity.durationMax} Min.)`);
  }
  if (/über Nacht|am nächsten Tag|nächsten Morgen|overnight|next day|following day|next morning|\b\d+\s*(Tage|Tagen|Woche|Wochen|days|weeks)\b/i.test(body)) {
    flags.push('Text spricht von mehreren Tagen oder über Nacht, die Aktivität soll heute fertig sein');
  }
  const celsius = amounts(body, '°\\s*C|Grad');
  if (celsius.some((t) => t > 250)) flags.push(`Temperatur über 250 °C (${Math.max(...celsius)} °C)`);
  // °F ist in Ordnung, wenn der Text °C daneben nennt („220 °C (425 °F)“).
  const fahrenheitAlone = /\d\s*(°\s*F\b|Fahrenheit)/i.test(body) && !/\d\s*°\s*C\b/.test(body);
  if (fahrenheitAlone || /\d\s*(oz\b|ounces?|lbs?\b|pounds?|inch(es)?|feet|ft\b)/i.test(body)) {
    flags.push('Amerikanische Maßeinheit (°F, oz, lb, inch, feet), bitte metrisch');
  }
  const kilos = [...amounts(body, 'kg|Kilogramm|Kilo|kilograms?'), ...amounts(body, 'g|Gramm|grams?').map((g) => g / 1000)];
  if (kilos.some((kg) => kg > 3)) flags.push(`Ungewöhnlich große Menge (${Math.max(...kilos)} kg)`);
  const liters = [...amounts(body, 'l|Liter|liters?|litres?'), ...amounts(body, 'ml|Milliliter|millilit(?:er|re)s?').map((ml) => ml / 1000)];
  if (liters.some((l) => l > 20)) flags.push(`Ungewöhnlich große Menge (${Math.max(...liters)} Liter)`);
  const bigNumber = [...body.matchAll(/(?<![\d.,])(\d{4,}|[6-9]\d\d)(?!\d|[.,]\d|\s*(?:g|ml|Gramm|grams?|Meter|m|meters?)\b)/g)].map((m) => m[1]);
  if (bigNumber.length > 0) flags.push(`Ungewöhnlich große Zahl im Text (${bigNumber[0]})`);

  if (activity.durationMin < 5) flags.push(`Dauer unter 5 Minuten (${activity.durationMin})`);
  if (activity.durationMax > 300) flags.push(`Dauer über 5 Stunden (${activity.durationMax} Min.)`);
  if (activity.durationMax > activity.durationMin * 4 && activity.durationMax - activity.durationMin > 90) {
    flags.push(`Dauer-Spanne ungewöhnlich groß (${activity.durationMin}–${activity.durationMax} Min.)`);
  }

  return [...new Set(flags)];
}
