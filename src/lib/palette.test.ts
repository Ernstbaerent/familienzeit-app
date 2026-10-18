// Die Zeichnungs-Palette (src/lib/palette.ts) und das Einsetzen der Farbplätze (scripts/lib/illustrations.ts).
// Vorher Teil des Tests der gebündelten Pilot-Zeichnungen; die gibt es seit M9b nicht mehr (alle Bilder kommen aus Supabase),
// die Regeln für die Farben gelten weiter für jede Zeichnung des Baukastens.

import { findPlaceholders, illustrationColorNames, renderTemplate } from '../../scripts/lib/illustrations';

import { illustrationPalette } from './palette';
import { lightTheme } from './theme';

describe('Zeichnungs-Palette', () => {
  it('hat genau 15 Farben: sieben für Gegenstände und Flächen, acht Hauttöne, alle als #RRGGBB', () => {
    expect(illustrationColorNames).toHaveLength(15);
    expect(illustrationColorNames.filter((name) => name.startsWith('skin'))).toHaveLength(8);
    for (const color of Object.values(illustrationPalette)) expect(color).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('die warmen Gegenstandsfarben (Honig, Braun) sind keine Farben der App-Oberfläche', () => {
    const theme = Object.values(lightTheme.colors);
    expect(theme).not.toContain(illustrationPalette.honey);
    expect(theme).not.toContain(illustrationPalette.brown);
  });
});

describe('Farbplätze einsetzen', () => {
  it('findet die Platzhalter einer Vorlage ohne Wiederholungen', () => {
    expect(findPlaceholders('<path fill="{{rose}}" stroke="{{ink}}"/><circle fill="{{rose}}"/>')).toEqual(['rose', 'ink']);
  });

  it('ein unbekannter Farbplatz ist ein Fehler, ein Wechsel der Palette wechselt alle Farben', () => {
    expect(() => renderTemplate('<path fill="{{tomato}}"/>')).toThrow(/Unbekannter Farbplatz/);
    expect(renderTemplate('<path fill="{{rose}}" stroke="{{ink}}"/>', { rose: '#111111', ink: '#222222' })).toBe(
      '<path fill="#111111" stroke="#222222"/>',
    );
  });
});
