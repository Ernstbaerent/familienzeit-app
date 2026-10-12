import { buildStartSelection, canStart, getStartIssues } from './startState';

const profiles = [{ id: 'a' }, { id: 'b' }];

describe('Hauptknopf auf dem Start: wann er gesperrt ist', () => {
  it('ohne Zeit gesperrt, der Grund ist die fehlende Zeit', () => {
    expect(canStart({ childIds: ['a'], time: null })).toBe(false);
    expect(getStartIssues({ childIds: ['a'], time: null })).toEqual(['time']);
  });

  it('ohne Kind gesperrt, der Grund ist das fehlende Kind', () => {
    expect(canStart({ childIds: [], time: 'hour1' })).toBe(false);
    expect(getStartIssues({ childIds: [], time: 'hour1' })).toEqual(['children']);
  });

  it('fehlt beides, werden beide Gründe genannt: erst Kinder, dann Zeit (wie die Fragen auf dem Start)', () => {
    expect(getStartIssues({ childIds: [], time: null })).toEqual(['children', 'time']);
  });

  it('mit mindestens einem Kind und einer Zeit ist er frei, ohne Gründe', () => {
    expect(canStart({ childIds: ['a'], time: 'minutes30' })).toBe(true);
    expect(getStartIssues({ childIds: ['a', 'b'], time: 'halfDay' })).toEqual([]);
  });
});

describe('Auswahl für die Vorschläge bauen', () => {
  it('Energie ist freiwillig: ohne Energie fehlt das Feld ganz', () => {
    const selection = buildStartSelection(
      { childIds: ['a'], time: 'hour1', parentEnergy: null },
      profiles,
    );
    expect(selection).toEqual({ childIds: ['a'], time: 'hour1' });
    expect(selection).not.toHaveProperty('parentEnergy');
  });

  it('nimmt die gewählte Energie mit', () => {
    expect(
      buildStartSelection({ childIds: ['a', 'b'], time: 'hours2', parentEnergy: 'tired' }, profiles),
    ).toEqual({ childIds: ['a', 'b'], time: 'hours2', parentEnergy: 'tired' });
  });

  it('Kinder, die es nicht mehr gibt, fallen weg', () => {
    expect(
      buildStartSelection({ childIds: ['a', 'gone'], time: 'hour1', parentEnergy: null }, profiles)?.childIds,
    ).toEqual(['a']);
  });

  it('gesperrt (kein Kind, kein bekanntes Kind oder keine Zeit): null', () => {
    expect(buildStartSelection({ childIds: [], time: 'hour1', parentEnergy: null }, profiles)).toBeNull();
    expect(buildStartSelection({ childIds: ['gone'], time: 'hour1', parentEnergy: null }, profiles)).toBeNull();
    expect(buildStartSelection({ childIds: ['a'], time: null, parentEnergy: 'fit' }, profiles)).toBeNull();
  });
});
