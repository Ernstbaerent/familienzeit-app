// Allowlist für `image` (DESIGN.md, Zusatz 35): nur Adressen von unserem eigenen Speicher.

import { isAllowedImageUrl, parseSupabaseOrigin, storageImagePrefix, storagePublicPath } from './imageAllowlist';

const origin = 'https://abc.supabase.co';
const prefix = `${origin}${storagePublicPath}`;

describe('parseSupabaseOrigin', () => {
  it.each([
    ['https://abc.supabase.co', origin],
    ['  https://abc.supabase.co  ', origin],
    ['https://abc.supabase.co/', origin],
    ['https://abc.supabase.co//', origin],
    ['HTTPS://ABC.Supabase.CO', origin],
    ['https://abc.supabase.co:443', `${origin}:443`],
  ])('%s → %s', (input, expected) => {
    expect(parseSupabaseOrigin(input)).toBe(expected);
  });

  it.each([
    ['fehlt', undefined],
    ['leer', ''],
    ['nur Leerzeichen', '   '],
    ['http statt https', 'http://abc.supabase.co'],
    ['ohne Schema', 'abc.supabase.co'],
    ['mit Pfad', 'https://abc.supabase.co/rest/v1'],
    ['mit Parametern', 'https://abc.supabase.co?x=1'],
    ['mit Zugangsdaten', 'https://user:pass@abc.supabase.co'],
    ['mit Leerzeichen mitten drin', 'https://abc supabase.co'],
    ['mit zweitem Schema', 'https://https://abc.supabase.co'],
    ['mit Platzhalter aus der .env.example', 'https://DEIN PROJEKT.supabase.co'],
  ])('%s → null', (_name, input) => {
    expect(parseSupabaseOrigin(input)).toBeNull();
  });
});

describe('storageImagePrefix', () => {
  it('ist die Projekt-Adresse plus der öffentliche Speicher-Pfad, mit Schrägstrich am Ende', () => {
    expect(storageImagePrefix('https://abc.supabase.co')).toBe('https://abc.supabase.co/storage/v1/object/public/');
    expect(prefix.endsWith('/')).toBe(true);
  });

  it('ist null ohne gültige Projekt-Adresse (dann ist kein Bild erlaubt)', () => {
    expect(storageImagePrefix(undefined)).toBeNull();
    expect(storageImagePrefix('http://abc.supabase.co')).toBeNull();
  });
});

describe('isAllowedImageUrl', () => {
  it('erlaubt Dateien aus dem öffentlichen Speicher des Projekts', () => {
    expect(isAllowedImageUrl(`${prefix}bilder/wald.svg`, prefix)).toBe(true);
    expect(isAllowedImageUrl(`  ${prefix}wald.svg  `, prefix)).toBe(true);
  });

  it.each([
    ['ein fremder Server', 'https://example.org/wald.jpg'],
    ['ein Host, der mit unserem Namen anfängt', 'https://abc.supabase.co.evil.example/storage/v1/object/public/a.svg'],
    ['Zugangsdaten, hinter denen ein fremder Host steht', 'https://abc.supabase.co@evil.example/storage/v1/object/public/a.svg'],
    ['http statt https', 'http://abc.supabase.co/storage/v1/object/public/a.svg'],
    ['anderes Projekt', 'https://xyz.supabase.co/storage/v1/object/public/a.svg'],
    ['nicht öffentlicher Speicher', 'https://abc.supabase.co/storage/v1/object/sign/a.svg'],
    ['die Datenbank-Schnittstelle', 'https://abc.supabase.co/rest/v1/activities'],
    ['nur der Anfang ohne Datei', prefix],
    ['leer', ''],
    ['keine Adresse', 'wald.svg'],
  ])('lehnt ab: %s', (_name, image) => {
    expect(isAllowedImageUrl(image, prefix)).toBe(false);
  });

  it('lehnt alles ab, was kein Text ist', () => {
    for (const value of [undefined, null, 42, {}, [], true]) expect(isAllowedImageUrl(value, prefix)).toBe(false);
  });

  it('lehnt ohne festgelegten Speicher alles ab', () => {
    expect(isAllowedImageUrl(`${prefix}wald.svg`, null)).toBe(false);
  });
});
