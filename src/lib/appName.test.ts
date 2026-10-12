import app from '../../app.json';
import de from '../locales/de.json';
import en from '../locales/en.json';
import nativeDe from '../locales/native/de.json';

// Der App-Name ist vorläufig (CLAUDE.md, „Entscheidungen vor M12“). Die eine Quelle für alle sichtbaren
// Texte ist `app.name` in de.json und en.json. Dieser Test hält die Stellen zusammen, die keine Texte
// aus dem Code lesen können (app.json und die Berechtigungstexte). Bei einer Umbenennung meldet er jede
// Stelle, die noch fehlt.
describe('App-Name', () => {
  const name = de.app.name;

  it('ist in allen Sprachen gleich', () => {
    expect(en.app.name).toBe(name);
  });

  it('steht so in app.json', () => {
    expect(app.expo.name).toBe(name);
  });

  it('steht in den Berechtigungstexten (Englisch und Deutsch)', () => {
    const plugins: unknown[] = app.expo.plugins;
    const locationPlugin = plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-location') as
      | [string, Record<string, unknown>]
      | undefined;
    expect(locationPlugin?.[1].locationWhenInUsePermission).toEqual(expect.stringContaining(name));
    expect(nativeDe.NSLocationWhenInUseUsageDescription).toContain(name);
  });

  it('das Link-Kürzel (scheme) ist der Name in Kleinbuchstaben', () => {
    expect(app.expo.scheme).toBe(name.toLowerCase());
  });
});
