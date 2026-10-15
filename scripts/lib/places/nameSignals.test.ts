// Wortlisten (nameSignals.ts): was jedes Wort treffen soll und, genauso wichtig, was nicht.

import { findWords, nameSignals, negativeWords, notVisitableWords, positiveWords, tokenize } from './nameSignals.ts';

const pos = (name: string, subtype?: Parameters<typeof nameSignals>[1]) => nameSignals(name, subtype).positive;
const neg = (name: string) => nameSignals(name).negative;
const closed = (name: string) => nameSignals(name).notVisitable;

describe('tokenize', () => {
  it('klein, Umlaute und ß ausgeschrieben, Bindestriche und Satzzeichen trennen', () => {
    expect(tokenize('Kunst- und Naturalienkammer')).toEqual(['kunst', 'und', 'naturalienkammer']);
    expect(tokenize('Universität Halle-Wittenberg (geplant)')).toEqual(['universitaet', 'halle', 'wittenberg', 'geplant']);
    expect(tokenize('Straßenbahn-Museum „Café“')).toEqual(['strassenbahn', 'museum', 'cafe']);
  });
});

describe('abwertende Wörter', () => {
  it.each([
    ['Universitätsmuseum', 'Universität'],
    ['Musikuniversität Weimar', 'Universität'],
    ['UNIVERSITÄT LEIPZIG', 'Universität'],
    ['Universitaet Jena', 'Universität'],
    ['Uni-Museum', 'Uni'],
    ['Museum of the University', 'University'],
    ['Institut für Geologie', 'Institut'],
    ['Max Planck Institute', 'Institut'],
    ['Lehrsammlung der Fakultät', 'Sammlung'],
    ['Kunstsammlungen Chemnitz', 'Sammlung'],
    ['Stadtarchiv', 'Archiv'],
    ['Anatomische Sammlung', 'Anatom'],
    ['Anatomy Collection', 'Anatom'],
    ['Münzkabinett', 'Kabinett'],
    ['Ausstellungskabinett der Leopoldina', 'Kabinett'],
    ['Kunstakademie', 'Akademie'],
    ['Musikhochschule', 'Hochschule'],
    ['Lapidarium im Kreuzgang', 'Lapidarium'],
    ['Herbarium Haussknecht', 'Herbarium'],
    ['Lehrstuhl für Mineralogie', 'Lehrstuhl'],
  ])('„%s“ → %s', (name, label) => {
    expect(neg(name)).toContain(label);
  });

  it.each(['Uniform-Museum', 'Union-Brauerei', 'Kunstmuseum Moritzburg', 'Gedenkstätte Roter Ochse', 'Dokumentationszentrum', 'Händel-Haus'])(
    '„%s“ ist nicht abwertend',
    (name) => {
      expect(neg(name)).toEqual([]);
    },
  );
});

describe('aufwertende Wörter', () => {
  it.each([
    ['Kindermuseum', 'Kinder'],
    ['Museum für Kind und Familie', 'Kind'],
    ['Familienpark', 'Familie'],
    ['Mitmach-Museum', 'Mitmach'],
    ['Experimente-Werkstatt Mathematik', 'Experiment'],
    ['Entdeckerwelt', 'Entdeck'],
    ['Kinderforscherhaus', 'Forscher'],
    ['Naturkundemuseum', 'Natur'],
    ['Naturalienkammer', 'Natur'],
    ['Verkehrstechnik-Museum', 'Technik'],
    ['Spielzeugmuseum', 'Spielzeug'],
    ['Modelleisenbahn-Ausstellung', 'Eisenbahn'],
    ['Feuerwehrmuseum', 'Feuerwehr'],
    ['Zeiss-Planetarium', 'Planetarium'],
    ['Volkssternwarte', 'Sternwarte'],
    ['Tierpark', 'Tier'],
    ['Museum für Haustierkunde', 'Haustier'],
    ['Dinopark', 'Dino'],
    ['Flugsaurier-Ausstellung', 'Saurier'],
    ['Ritterburg', 'Ritter'],
    ['Märchenwald', 'Märchen'],
    ['Maerchenwald', 'Märchen'],
    ['Abenteuerhalle', 'Abenteuer'],
    ['Erlebnismuseum', 'Erlebnis'],
    ['Puppenmuseum', 'Puppe'],
    ['Mathematikum', 'Mathematik'],
    ['Halloren Schokoladenmuseum', 'Schoko'],
    ['Kids Museum', 'Kids'],
    ['Children’s Museum', 'Children'],
    ['Hands-on Science Center', 'Hands on'],
    ['Science Museum', 'Science'],
    ['Explorado', 'Explor'],
    ['Railway Museum', 'Railway'],
    ['Toy Museum', 'Toy'],
    ['Chocolate Museum', 'Chocolate'],
  ])('„%s“ → %s', (name, label) => {
    expect(pos(name)).toContain(label);
  });

  it.each([
    ['Signatur-Archiv', 'Natur steckt in „Signatur“, aber nicht am Wortanfang'],
    ['Quartiersmuseum', 'Tier steckt in „Quartier“'],
    ['Der Dritte Mann', '„Dritte“ ist kein Ritter'],
    ['Dritter Weg', '„Dritter“ enthält „ritter“'],
    ['Training Center', '„Training“ ist kein Train'],
    ['Gruppenhaus', '„Gruppe“ ist keine Puppe'],
    ['Natürlich Halle', '„natürlich“ ist nicht „Natur“'],
    ['Forschungsmuseum', '„Forschung“ ist nicht „Forscher“'],
  ])('„%s“ ist nicht aufwertend (%s)', (name) => {
    expect(pos(name)).toEqual([]);
  });

  describe('„Erlebnis“ wertet keine Bäder und keine Wellness auf', () => {
    it('zählt bei Bädern nicht (Erlebnisbad)', () => {
      expect(pos('Erlebnisbad Aqua', 'indoorPool')).toEqual([]);
      expect(pos('Erlebnisbad Aqua', 'outdoorPool')).toEqual([]);
      expect(pos('Erlebniswelt am See', 'waterPark')).toEqual([]);
      expect(pos('Erlebniswelt am See', 'pool')).toEqual([]);
    });

    it('zählt nicht neben Therme, Sauna, Spa, Wellness (bei jeder Unterart)', () => {
      expect(pos('Sauna-Erlebniswelt', 'iceRink')).toEqual([]);
      expect(pos('Therme & Erlebnis', 'climbingHall')).toEqual([]);
      expect(pos('Erlebnis Spa', 'museum')).toEqual([]);
      expect(pos('Wellness-Erlebnis', 'indoorPlayground')).toEqual([]);
    });

    it('zählt sonst (Kletter-Erlebnis, Erlebnismuseum)', () => {
      expect(pos('Kletter-Erlebnis', 'climbingHall')).toEqual(['Erlebnis']);
      expect(pos('Erlebnismuseum Bergbau', 'museum')).toEqual(['Erlebnis']);
    });

    it('andere aufwertende Wörter wirken bei Bädern weiter', () => {
      expect(pos('Kinder-Erlebnisbad', 'indoorPool')).toEqual(['Kinder']);
    });
  });
});

describe('nicht besuchbar', () => {
  it.each([
    ['Naturkundliches Museum (geplant)', 'geplant'],
    ['Zoo Musterstadt (in Planung)', 'in Planung'],
    ['Kletterhalle (im Bau)', 'im Bau'],
    ['Freibad – geschlossen', 'geschlossen'],
    ['Heimatmuseum (vorübergehend geschlossen)', 'geschlossen'],
    ['Stadtbad, wegen Sanierung', 'wegen Sanierung'],
    ['Science Center (planned)', 'planned'],
    ['Aquarium – under construction', 'under construction'],
    ['Old Mill Museum (closed)', 'closed'],
  ])('„%s“ → %s', (name, label) => {
    expect(closed(name)).toEqual([label]);
  });

  it.each(['Museum im Bauernhaus', 'Geplantes nicht', 'Geschlossene Gesellschaft', 'Sanierungsmuseum', 'Closedown Gallery'])('„%s“ ist besuchbar', (name) => {
    expect(closed(name)).toEqual([]);
  });
});

describe('Listen', () => {
  it('kein Name = keine Signale', () => {
    expect(nameSignals(null)).toEqual({ positive: [], negative: [], notVisitable: [] });
  });

  it('jedes Wort steht nur einmal je Liste', () => {
    for (const list of [positiveWords, negativeWords, notVisitableWords]) {
      const labels = list.map((rule) => rule.label.toLowerCase());
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('jedes Wort trifft sich selbst (keine Tippfehler in der Liste)', () => {
    for (const list of [positiveWords, negativeWords, notVisitableWords]) {
      for (const rule of list) expect(findWords(rule.label, [rule])).toEqual([rule.label]);
    }
  });
});
