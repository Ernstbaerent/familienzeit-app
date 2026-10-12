import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useFonts } from 'expo-font';

import { FONT_LOAD_TIMEOUT_MS, useAppFonts } from './fonts';
import { fonts } from './theme';

// Nur das Laden selbst wird nachgestellt. Dass die Schriftdateien über ihre Unterpfade gefunden werden,
// prüft schon der Import von ./fonts.
jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
const mockUseFonts = jest.mocked(useFonts);

// React soll wissen, dass hier getestet wird (sonst meldet `act` eine Warnung).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TIMEOUT = 1000;
let renderer: ReactTestRenderer | undefined;

// Gibt das Ergebnis des Hooks als Eigenschaft weiter, damit der Test es aus dem gerenderten Baum lesen kann.
function Probe() {
  return createElement('probe', { ready: useAppFonts(TIMEOUT) });
}

// true, sobald die App starten darf.
function isReady() {
  return (renderer?.toJSON() as { props: { ready: boolean } } | null)?.props.ready === true;
}

function render() {
  act(() => {
    if (renderer) renderer.update(createElement(Probe));
    else renderer = create(createElement(Probe));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  renderer = undefined;
});

afterEach(() => {
  act(() => renderer?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useAppFonts', () => {
  it('wartet, solange die Schriften laden', () => {
    mockUseFonts.mockReturnValue([false, null]);
    render();
    expect(isReady()).toBe(false);
    act(() => jest.advanceTimersByTime(TIMEOUT - 1));
    expect(isReady()).toBe(false);
  });

  it('startet, sobald die Schriften geladen sind', () => {
    mockUseFonts.mockReturnValue([false, null]);
    render();
    mockUseFonts.mockReturnValue([true, null]);
    render();
    expect(isReady()).toBe(true);
  });

  it('startet nach dem Zeitlimit mit der Systemschrift', () => {
    mockUseFonts.mockReturnValue([false, null]);
    render();
    act(() => jest.advanceTimersByTime(TIMEOUT));
    expect(isReady()).toBe(true);
  });

  it('startet sofort bei einem Ladefehler (und meldet ihn in der Konsole)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUseFonts.mockReturnValue([false, new Error('kaputt')]);
    render();
    expect(isReady()).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('lädt genau die fünf Schriftschnitte aus theme.ts', () => {
    mockUseFonts.mockReturnValue([true, null]);
    render();
    const requested = Object.keys(mockUseFonts.mock.calls[0][0] as Record<string, unknown>);
    expect(requested.sort()).toEqual(Object.values(fonts).sort());
  });

  it('das Zeitlimit beträgt 4 Sekunden (dokumentiert in docs/theme.md)', () => {
    expect(FONT_LOAD_TIMEOUT_MS).toBe(4000);
  });
});
