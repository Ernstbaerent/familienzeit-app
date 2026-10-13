// Zugang zu Supabase aus der Umgebung: gültige Werte, fehlende Werte und der Schutz vor geheimen Schlüsseln.

import { getImagePrefix, getSupabaseConfig, isSecretKey, readSupabaseEnv } from './supabaseConfig';

// Ein Schlüssel im JWT-Format mit dieser Rolle (nur der mittlere Teil zählt, die Unterschrift ist erfunden).
function jwt(role: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'supabase', role })}.erfundeneUnterschrift`;
}

const anonJwt = jwt('anon');
const serviceJwt = jwt('service_role');

let warn: jest.SpyInstance;
let error: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

const allLogs = () => JSON.stringify([...warn.mock.calls, ...error.mock.calls]);

describe('getSupabaseConfig', () => {
  it('gültige Werte ergeben den Zugang (Adresse bereinigt)', () => {
    expect(getSupabaseConfig({ url: ' https://ABC.supabase.co/ ', anonKey: ` ${anonJwt} ` })).toEqual({
      url: 'https://abc.supabase.co',
      anonKey: anonJwt,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('der neue Schlüssel (sb_publishable_…) ist in Ordnung', () => {
    expect(getSupabaseConfig({ url: 'https://abc.supabase.co', anonKey: 'sb_publishable_abc123' })).toEqual({
      url: 'https://abc.supabase.co',
      anonKey: 'sb_publishable_abc123',
    });
  });

  it('nichts eingetragen (keine .env): kein Zugang, aber auch keine Meldung', () => {
    expect(getSupabaseConfig({})).toBeNull();
    expect(getSupabaseConfig({ url: '  ', anonKey: '' })).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it.each([
    ['die Adresse fehlt', { anonKey: anonJwt }],
    ['die Adresse http ist', { url: 'http://abc.supabase.co', anonKey: anonJwt }],
    ['die Adresse einen Pfad hat', { url: 'https://abc.supabase.co/rest/v1', anonKey: anonJwt }],
    ['der Schlüssel fehlt', { url: 'https://abc.supabase.co' }],
  ])('kein Zugang und eine Warnung, wenn %s', (_name, env) => {
    expect(getSupabaseConfig(env)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  describe('geheime Schlüssel gehören nicht in eine App', () => {
    it.each([
      ['service_role (JWT)', serviceJwt],
      ['sb_secret_…', 'sb_secret_abcdefgh'],
    ])('%s wird abgelehnt, mit lauter Fehlermeldung', (_name, anonKey) => {
      expect(getSupabaseConfig({ url: 'https://abc.supabase.co', anonKey })).toBeNull();
      expect(error).toHaveBeenCalledTimes(1);
      expect(String(error.mock.calls[0][0])).toContain('GEHEIMEN');
    });

    it('in keiner Meldung steht der Schlüssel selbst', () => {
      getSupabaseConfig({ url: 'https://abc.supabase.co', anonKey: serviceJwt });
      getSupabaseConfig({ url: 'https://abc.supabase.co', anonKey: 'sb_secret_abcdefgh' });
      getSupabaseConfig({ url: 'http://abc.supabase.co', anonKey: anonJwt });
      getSupabaseConfig({ url: 'https://abc.supabase.co', anonKey: '' });
      const logs = allLogs();
      for (const secret of [serviceJwt, 'sb_secret_abcdefgh', anonJwt, 'erfundeneUnterschrift']) expect(logs).not.toContain(secret);
    });

    it('isSecretKey erkennt auch Schlüssel ohne Auffüllzeichen und lässt kaputte in Ruhe', () => {
      expect(isSecretKey(serviceJwt)).toBe(true);
      expect(isSecretKey(anonJwt)).toBe(false);
      expect(isSecretKey('sb_publishable_abc')).toBe(false);
      expect(isSecretKey('eyJ.kaputt.x')).toBe(false); // nicht lesbar: kein Grund zur Ablehnung
      expect(isSecretKey('irgendwas')).toBe(false);
    });
  });
});

describe('getImagePrefix', () => {
  it('kommt aus der Projekt-Adresse', () => {
    expect(getImagePrefix({ url: 'https://abc.supabase.co' })).toBe('https://abc.supabase.co/storage/v1/object/public/');
  });

  it('ist null ohne gültige Projekt-Adresse', () => {
    expect(getImagePrefix({})).toBeNull();
    expect(getImagePrefix({ url: 'http://abc.supabase.co' })).toBeNull();
  });
});

describe('readSupabaseEnv', () => {
  const names = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES'] as const;
  const saved = names.map((name) => process.env[name]);
  afterEach(() => {
    names.forEach((name, index) => {
      if (saved[index] === undefined) delete process.env[name];
      else process.env[name] = saved[index];
    });
  });

  it('liest die drei Werte aus der Umgebung (zur Laufzeit)', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_x';
    process.env.EXPO_PUBLIC_ACTIVITIES_REFRESH_MINUTES = '5';
    expect(readSupabaseEnv()).toEqual({ url: 'https://abc.supabase.co', anonKey: 'sb_publishable_x', refreshMinutes: '5' });
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(readSupabaseEnv().url).toBeUndefined();
  });
});
