// Die gewählten Kinder auf dem Start: Laden, Merken und Bereinigen mit den echten Providern
// (Profile und Auswahl) und einem Speicher im Arbeitsspeicher statt dem Handy.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create } from 'react-test-renderer';

import { saveChildren } from '../profiles/profileStorage';
import type { ChildProfile } from '../profiles/profiles';
import { ProfilesProvider, useProfiles } from '../profiles/ProfilesContext';
import { SelectedChildrenProvider, useSelectedChildren } from './SelectedChildrenContext';
import { saveSelectedChildren } from './selectedChildrenStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function child(id: string): ChildProfile {
  return {
    id,
    birthYear: 2022,
    birthMonth: 5,
    interests: [],
    dislikes: [],
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

type Captured = {
  profiles: ReturnType<typeof useProfiles>;
  selected: ReturnType<typeof useSelectedChildren>;
};

// Baut beide Provider auf, wartet, bis alles vom Speicher gelesen ist, und gibt den jeweils neuesten Stand heraus.
async function mount() {
  const captured = {} as Captured;
  function Probe() {
    captured.profiles = useProfiles();
    captured.selected = useSelectedChildren();
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <ProfilesProvider>
        <SelectedChildrenProvider>
          <Probe />
        </SelectedChildrenProvider>
      </ProfilesProvider>,
    );
  });
  await settle();
  return { captured, unmount: () => act(() => renderer.unmount()) };
}

// Lässt Speichern und Neuzeichnen zu Ende laufen.
async function settle() {
  for (let round = 0; round < 3; round += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function storedIds(): Promise<unknown> {
  const raw = await AsyncStorage.getItem('selectedChildren.v1');
  return raw === null ? null : (JSON.parse(raw) as { childIds: string[] }).childIds;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Gewählte Kinder auf dem Start', () => {
  it('lädt erst, wenn Profile und gemerkte Auswahl gelesen sind', async () => {
    await saveChildren([child('a')]);
    const captured = {} as Captured;
    function Probe() {
      captured.selected = useSelectedChildren();
      return null;
    }
    let renderer!: ReturnType<typeof create>;
    // Synchron zeichnen: Das Lesen vom Gerät (asynchron) ist danach noch nicht fertig.
    act(() => {
      renderer = create(
        <ProfilesProvider>
          <SelectedChildrenProvider>
            <Probe />
          </SelectedChildrenProvider>
        </ProfilesProvider>,
      );
    });
    expect(captured.selected.status).toBe('loading');
    expect(captured.selected.childIds).toEqual([]);
    await settle();
    expect(captured.selected.status).toBe('ready');
    expect(captured.selected.childIds).toEqual(['a']);
    act(() => renderer.unmount());
  });

  it('noch nie gewählt: alle Kinder sind vorausgewählt', async () => {
    await saveChildren([child('a'), child('b')]);
    const { captured } = await mount();
    expect(captured.selected.childIds).toEqual(['a', 'b']);
  });

  it('stellt die zuletzt gewählten Kinder wieder her, Zeit und Energie gibt es dabei nicht', async () => {
    await saveChildren([child('a'), child('b'), child('c')]);
    await saveSelectedChildren(['b']);
    const { captured } = await mount();
    expect(captured.selected.childIds).toEqual(['b']);
    expect(Object.keys(captured.selected).sort()).toEqual(
      ['childIds', 'selectChild', 'status', 'toggleChild'].sort(),
    );
  });

  it('gelöschte Kinder fliegen beim Öffnen raus, auch aus dem Gespeicherten', async () => {
    await saveChildren([child('a'), child('b')]);
    await saveSelectedChildren(['a', 'gone', 'b', 'also-gone']);
    const { captured } = await mount();
    expect(captured.selected.childIds).toEqual(['a', 'b']);
    expect(await storedIds()).toEqual(['a', 'b']);
  });

  it('war das einzige gemerkte Kind gelöscht, sind wieder alle gewählt', async () => {
    await saveChildren([child('a'), child('b')]);
    await saveSelectedChildren(['gone']);
    const { captured } = await mount();
    expect(captured.selected.childIds).toEqual(['a', 'b']);
  });

  it('kaputter Speicher: wie nie gewählt, alle Kinder', async () => {
    await saveChildren([child('a'), child('b')]);
    await AsyncStorage.setItem('selectedChildren.v1', '{kaputt');
    const { captured } = await mount();
    expect(captured.selected.childIds).toEqual(['a', 'b']);
  });

  it('Antippen wählt ab und merkt es auf dem Gerät', async () => {
    await saveChildren([child('a'), child('b')]);
    const { captured } = await mount();
    await act(async () => captured.selected.toggleChild('a'));
    await settle();
    expect(captured.selected.childIds).toEqual(['b']);
    expect(await storedIds()).toEqual(['b']);
    await act(async () => captured.selected.toggleChild('a'));
    await settle();
    expect(captured.selected.childIds).toEqual(['a', 'b']);
    expect(await storedIds()).toEqual(['a', 'b']);
  });

  it('alle Kinder lassen sich abwählen und bleiben dann abgewählt (der Hauptknopf ist dann gesperrt)', async () => {
    await saveChildren([child('a')]);
    const { captured } = await mount();
    await act(async () => captured.selected.toggleChild('a'));
    await settle();
    expect(captured.selected.childIds).toEqual([]);
    expect(await storedIds()).toEqual([]);
  });

  it('wurde zuletzt niemand gewählt, startet die App beim nächsten Mal mit allen Kindern', async () => {
    await saveChildren([child('a'), child('b')]);
    await saveSelectedChildren([]);
    const { captured } = await mount();
    expect(captured.selected.childIds).toEqual(['a', 'b']);
  });

  it('ein neu angelegtes Kind zählt gleich mit, auch wenn zuvor eine Auswahl gemerkt war', async () => {
    await saveChildren([child('a'), child('b')]);
    await saveSelectedChildren(['a']);
    const { captured } = await mount();
    let created!: ChildProfile;
    await act(async () => {
      created = await captured.profiles.addChild({
        birthYear: 2020,
        birthMonth: 3,
        interests: [],
        dislikes: [],
      });
      captured.selected.selectChild(created.id);
    });
    await settle();
    expect(captured.selected.childIds).toEqual(['a', created.id]);
    expect(await storedIds()).toEqual(['a', created.id]);
  });

  it('bei „alle“ zählt ein neues Kind von selbst mit, ohne dass es gewählt werden muss', async () => {
    await saveChildren([child('a')]);
    const { captured } = await mount();
    let created!: ChildProfile;
    await act(async () => {
      created = await captured.profiles.addChild({
        birthYear: 2020,
        birthMonth: 3,
        interests: [],
        dislikes: [],
      });
    });
    await settle();
    expect(captured.selected.childIds).toEqual(['a', created.id]);
  });

  it('wird ein gewähltes Kind gelöscht, fliegt es aus der Auswahl und aus dem Speicher', async () => {
    await saveChildren([child('a'), child('b'), child('c')]);
    await saveSelectedChildren(['a', 'b']);
    const { captured } = await mount();
    await act(async () => captured.profiles.deleteChild('a'));
    await settle();
    expect(captured.selected.childIds).toEqual(['b']);
    expect(await storedIds()).toEqual(['b']);
  });

  it('wird das einzige gewählte Kind gelöscht, sind danach die übrigen gewählt (nicht niemand)', async () => {
    await saveChildren([child('a'), child('b')]);
    await saveSelectedChildren(['a']);
    const { captured } = await mount();
    await act(async () => captured.profiles.deleteChild('a'));
    await settle();
    expect(captured.selected.childIds).toEqual(['b']);
  });

  it('speichert nichts außer den Profilen und den gewählten Kindern', async () => {
    await saveChildren([child('a'), child('b')]);
    const { captured } = await mount();
    await act(async () => captured.selected.toggleChild('b'));
    await settle();
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(['profiles.v1', 'selectedChildren.v1']);
  });
});
