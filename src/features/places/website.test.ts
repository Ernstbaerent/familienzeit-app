// Orte (M10c): Die App prüft die Website vor dem Öffnen noch einmal selbst (nur http und https).

import { websiteLink } from './website';

describe('websiteLink', () => {
  it('http und https mit Rechnernamen sind erlaubt, „www.“ fällt in der Anzeige weg', () => {
    expect(websiteLink('https://www.saline-bad.de/')).toEqual({ url: 'https://www.saline-bad.de/', host: 'saline-bad.de' });
    expect(websiteLink('http://museum.example.org/kinder?x=1')).toEqual({ url: 'http://museum.example.org/kinder?x=1', host: 'museum.example.org' });
    expect(websiteLink('  HTTPS://Zoo.Example.DE  ')).toEqual({ url: 'https://zoo.example.de/', host: 'zoo.example.de' });
  });

  it('andere Schemata werden nie geöffnet', () => {
    for (const raw of [
      'javascript:alert(1)',
      'JavaScript://example.org/%0Aalert(1)',
      'ftp://example.org',
      'file:///etc/passwd',
      'intent://example.org#Intent;end',
      'mailto:info@example.org',
      'tel:+4912345',
      'data:text/html,hi',
      'www.example.org',
      '//example.org',
    ]) {
      expect(websiteLink(raw)).toBeNull();
    }
  });

  it('ohne Punkt im Rechnernamen, mit Benutzername, mit Leerzeichen oder kaputt: keine Website', () => {
    expect(websiteLink('https://localhost/')).toBeNull();
    expect(websiteLink('https://user:pass@example.org/')).toBeNull();
    expect(websiteLink('https://example.org@evil.example/')).toBeNull();
    expect(websiteLink('https://exa mple.org')).toBeNull();
    expect(websiteLink('https://')).toBeNull();
    expect(websiteLink('https://.org')).toBeNull();
  });

  it('keine Angabe', () => {
    expect(websiteLink(null)).toBeNull();
    expect(websiteLink(undefined)).toBeNull();
    expect(websiteLink('')).toBeNull();
  });
});
