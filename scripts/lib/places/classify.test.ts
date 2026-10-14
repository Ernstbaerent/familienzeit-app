import { placeKinds } from '../../../src/features/places/placeKinds.ts';
import { classifyTags, detectBathSetting, localityTypeOf, type Tags } from './classify.ts';

const classify = (tags: Tags) => classifyTags(tags, (subtype) => placeKinds[subtype].setting);
const subtypeOf = (tags: Tags) => {
  const result = classify(tags);
  return result.ok ? result.subtype : result.reason;
};

describe('classifyTags: Unterarten', () => {
  it.each([
    [{ leisure: 'playground' }, 'playground'],
    [{ leisure: 'playground', indoor: 'yes' }, 'indoorPlayground'],
    [{ leisure: 'indoor_play' }, 'indoorPlayground'],
    [{ leisure: 'trampoline_park' }, 'trampolinePark'],
    [{ leisure: 'park' }, 'park'],
    [{ leisure: 'water_park' }, 'waterPark'],
    [{ leisure: 'sports_centre', sport: 'swimming' }, 'indoorPool'],
    [{ leisure: 'sports_centre', sport: 'soccer;swimming' }, 'indoorPool'],
    [{ leisure: 'swimming_pool', name: 'Freibad Netzschkau' }, 'outdoorPool'],
    [{ leisure: 'swimming_pool', name: 'Kombibad Mitte' }, 'pool'],
    [{ leisure: 'sports_hall', sport: 'climbing' }, 'climbingHall'],
    [{ leisure: 'sports_centre', sport: 'bouldering' }, 'climbingHall'],
    [{ leisure: 'bathing_place' }, 'bathingPlace'],
    [{ leisure: 'miniature_golf' }, 'miniGolf'],
    [{ leisure: 'bowling_alley' }, 'bowling'],
    [{ leisure: 'ice_rink' }, 'iceRink'],
    [{ leisure: 'nature_reserve', name: 'Waschteich Reuth' }, 'natureReserve'],
    [{ tourism: 'theme_park' }, 'themePark'],
    [{ tourism: 'zoo' }, 'zoo'],
    [{ tourism: 'aquarium' }, 'aquarium'],
    [{ tourism: 'museum' }, 'museum'],
    [{ historic: 'castle', name: 'Oberes Schloss' }, 'castle'],
    [{ man_made: 'tower', 'tower:type': 'observation' }, 'observationTower'],
    [{ historic: 'ruins', name: 'Burgruine' }, 'ruins'],
    [{ tourism: 'viewpoint', name: 'Weißer Stein' }, 'viewpoint'],
    [{ tourism: 'attraction', name: 'Steintrog' }, 'attraction'],
    [{ tourism: 'picnic_site', name: 'Rastplatz am Wald' }, 'picnicSite'],
    [{ natural: 'water', water: 'reservoir', name: 'Talsperre Pöhl' }, 'lake'],
    [{ natural: 'water', water: 'pond', name: 'Binsenteich' }, 'pond'],
    [{ amenity: 'cinema' }, 'cinema'],
    [{ amenity: 'library' }, 'library'],
  ])('%o → %s', (tags, expected) => {
    expect(subtypeOf(tags)).toBe(expected);
  });

  it.each([
    [{ leisure: 'escape_game', name: 'Rätselraum' }, 'notMatched'], // bewusst nicht dabei
    [{ route: 'hiking', name: 'Rundweg' }, 'notMatched'], // Wanderwege kommen später
    [{ leisure: 'sports_centre', sport: 'soccer' }, 'notMatched'],
    [{ man_made: 'tower', 'tower:type': 'communication' }, 'notMatched'],
    [{ natural: 'water' }, 'notMatched'],
    [{ leisure: 'playground', access: 'private' }, 'notPublic'],
    [{ leisure: 'swimming_pool', access: 'members', name: 'Vereinsbad' }, 'notPublic'],
    [{ leisure: 'playground', access: 'customers' }, 'notPublic'],
    [{ leisure: 'park', disused: 'yes' }, 'disused'],
    [{ leisure: 'swimming_pool' }, 'nameMissing'], // Gartenpools haben keinen Namen
    [{ tourism: 'viewpoint' }, 'nameMissing'],
    [{ historic: 'castle' }, 'nameMissing'],
    [{ natural: 'water', water: 'lake' }, 'nameMissing'],
  ])('%o → %s', (tags, expected) => {
    expect(subtypeOf(tags)).toBe(expected);
  });

  it('Standard drinnen/draußen kommt aus der Tabelle, bei Bädern aus der Erkennung', () => {
    expect(classify({ tourism: 'museum' })).toEqual({ ok: true, subtype: 'museum', setting: 'indoor' });
    expect(classify({ historic: 'castle', name: 'Burg' })).toEqual({ ok: true, subtype: 'castle', setting: 'both' });
    expect(classify({ leisure: 'water_park', name: 'Erlebnisbad Aqua' })).toEqual({ ok: true, subtype: 'waterPark', setting: 'indoor' });
  });
});

describe('detectBathSetting: Hallen- oder Freibad', () => {
  it.each([
    [{ indoor: 'yes' }, 'indoor'],
    [{ covered: 'yes' }, 'indoor'],
    [{ building: 'yes' }, 'indoor'],
    [{ building: 'no' }, 'outdoor'],
    [{ indoor: 'no' }, 'outdoor'],
    [{ name: 'Hallenbad Greiz' }, 'indoor'],
    [{ name: 'Schwimmhalle Plauen' }, 'indoor'],
    [{ name: 'Waldbad Elsterberg' }, 'outdoor'],
    [{ name: 'Naturerlebnisbad Pausa' }, 'outdoor'], // „erlebnisbad“ steckt darin, ist aber ein Freibad
    [{ name: 'Kombibad Seelze' }, 'both'],
    [{ name: 'Freibad und Hallenbad Nord' }, 'both'],
    [{ name: 'Bad Mitte' }, 'outdoor'], // nichts erkennbar: Standard (hier: draußen)
  ])('%o → %s', (tags, expected) => {
    expect(detectBathSetting(tags, 'outdoor')).toBe(expected);
  });
});

describe('localityTypeOf', () => {
  it('nur bekannte place-Arten mit Namen', () => {
    expect(localityTypeOf({ place: 'suburb', name: 'Pohlitz' })).toBe('suburb');
    expect(localityTypeOf({ place: 'suburb' })).toBeNull();
    expect(localityTypeOf({ place: 'locality', name: 'Am Hang' })).toBeNull();
    expect(localityTypeOf({ place: 'toString', name: 'x' })).toBeNull();
  });
});
