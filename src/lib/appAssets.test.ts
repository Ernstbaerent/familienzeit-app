import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import app from '../../app.json';
import { palette } from './palette';

// Logo, App-Icon und Startbild (DESIGN.md, Entscheidung 55, docs/theme.md „Logo und App-Icon“). Zu sehen ist das erst in einem echten Build,
// nicht in Expo Go: Dieser Test prüft deshalb die Dateien und die Verdrahtung in app.json.

const root = join(__dirname, '../..');

// Liest Breite, Höhe und Farbtyp aus dem Kopf einer PNG-Datei (IHDR). Farbtyp 2 = RGB, 6 = RGBA, 4 = Grau mit Alpha, 3 = Palette.
function readPng(path: string) {
  const bytes = readFileSync(join(root, path));
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
    hasTransparencyChunk: bytes.includes(Buffer.from('tRNS')),
  };
}

const logoFiles = [
  'assets/logo/app-icon.png',
  'assets/logo/android-foreground.png',
  'assets/logo/android-monochrome.png',
  'assets/logo/wordmark-petrol.png',
  'assets/logo/wordmark-linen.png',
  'assets/logo/logo-petrol.png',
  'assets/logo/logo-linen.png',
];

describe('Logo-Dateien', () => {
  it.each(logoFiles)('%s liegt unter assets/logo/ und ist ein PNG', (file) => {
    expect(existsSync(join(root, file))).toBe(true);
    expect(readPng(file).width).toBeGreaterThan(0);
  });

  it('keine Logo-Datei liegt mehr lose im Projektordner', () => {
    expect(existsSync(join(root, 'miki-app-icon-1024.png'))).toBe(false);
  });

  it('App-Icon und Android-Symbole sind quadratisch und mindestens 1024 × 1024', () => {
    for (const file of ['assets/logo/app-icon.png', 'assets/logo/android-foreground.png', 'assets/logo/android-monochrome.png']) {
      const { width, height } = readPng(file);
      expect(width).toBe(height);
      expect(width).toBeGreaterThanOrEqual(1024);
    }
  });
});

describe('iOS-App-Icon', () => {
  // Apple lehnt App-Icons mit Alpha-Kanal ab (App Store Connect): RGB ohne Transparenz.
  it('hat keinen Alpha-Kanal (PNG-Farbtyp RGB, kein tRNS-Block)', () => {
    const icon = readPng('assets/logo/app-icon.png');
    expect(icon.colorType).toBe(2);
    expect(icon.hasTransparencyChunk).toBe(false);
  });

  it('ist das Icon in app.json', () => {
    expect(app.expo.icon).toBe('./assets/logo/app-icon.png');
  });
});

describe('app.json: Icon, adaptives Android-Icon, Startbild', () => {
  it('das adaptive Android-Icon hat Petrol als Hintergrund und Vordergrund und Monochrom aus assets/logo/', () => {
    const adaptive = app.expo.android.adaptiveIcon;
    expect(adaptive.backgroundColor).toBe(palette.petrol);
    expect(adaptive.foregroundImage).toBe('./assets/logo/android-foreground.png');
    expect(adaptive.monochromeImage).toBe('./assets/logo/android-monochrome.png');
    for (const file of [adaptive.foregroundImage, adaptive.monochromeImage]) expect(existsSync(join(root, file))).toBe(true);
  });

  it('der Vordergrund des adaptiven Icons ist transparent (Petrol kommt vom Hintergrund)', () => {
    expect(readPng('assets/logo/android-foreground.png').colorType).toBe(6);
  });

  it('das Startbild ist das Logo „mit Kindern“ in Petrol auf Leinen', () => {
    const plugins: unknown[] = app.expo.plugins;
    const splash = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') as
      | [string, { image: string; backgroundColor: string }]
      | undefined;
    expect(splash?.[1].image).toBe('./assets/logo/logo-petrol.png');
    expect(splash?.[1].backgroundColor).toBe(palette.linen);
    expect(existsSync(join(root, splash?.[1].image ?? 'fehlt'))).toBe(true);
  });

  it('Bundle-ID und Paketname sind weiter nicht gesetzt (Entscheidung vor M12)', () => {
    expect(JSON.stringify(app)).not.toMatch(/bundleIdentifier|"package"/);
  });
});
