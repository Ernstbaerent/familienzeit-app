// Einstellungen und Schlüssel-Filter (M9).

import { classifyError } from './anthropic';
import { isSecretSupabaseKey, makeBatchId, readConfig } from './config';
import { createRedactor } from './redact';
import { baseEnv, fakeKeys } from './testHelpers';

const now = new Date('2026-10-18T16:00:00Z');
const suffix = () => 'abc123';

describe('readConfig', () => {
  it('Standard: echter Lauf, Entwürfe, claude-haiku-5-5, Obergrenze 1500, Kosten höchstens 0,50 $', () => {
    const result = readConfig(baseEnv(), [], now, suffix);
    if (!result.ok) throw new Error(result.problems.join());
    expect(result.config).toMatchObject({
      dryRun: false,
      autoApprove: false,
      model: 'claude-haiku-5-5',
      maxActivities: 1500,
      maxCostUsd: 0.5,
      batchId: 'wl-2026-10-18-abc123',
      supabase: { url: 'https://testprojekt.supabase.co' },
    });
  });

  it('ANTHROPIC_MODEL, MAX_ACTIVITIES, MAX_COST_USD und AUTO_APPROVE werden übernommen, ein leeres Modell heißt Standard', () => {
    const result = readConfig(baseEnv({ ANTHROPIC_MODEL: 'claude-sonnet-5-5', MAX_ACTIVITIES: '800', MAX_COST_USD: '0.2', AUTO_APPROVE: 'true' }), [], now, suffix);
    expect(result.ok && result.config).toMatchObject({ model: 'claude-sonnet-5-5', maxActivities: 800, maxCostUsd: 0.2, autoApprove: true });
    const empty = readConfig(baseEnv({ ANTHROPIC_MODEL: '' }), [], now, suffix);
    expect(empty.ok && empty.config.model).toBe('claude-haiku-5-5');
  });

  it.each([
    [{ MAX_ACTIVITIES: 'viele' }, 'MAX_ACTIVITIES'],
    [{ MAX_ACTIVITIES: '0' }, 'MAX_ACTIVITIES'],
    [{ MAX_COST_USD: '-1' }, 'MAX_COST_USD'],
    [{ ANTHROPIC_MODEL: 'Claude Haiku!' }, 'ANTHROPIC_MODEL'],
    [{ SUPABASE_URL: 'http://unsicher.supabase.co' }, 'SUPABASE_URL'],
  ])('falscher Wert %j wird gemeldet', (env, name) => {
    const result = readConfig(baseEnv(env), [], now, suffix);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problems.join(' ')).toContain(name);
  });

  it('unbekannte Schalter werden gemeldet', () => {
    const result = readConfig(baseEnv(), ['--dryrun'], now, suffix);
    expect(!result.ok && result.problems.join(' ')).toContain('Unbekannter Schalter „--dryrun“');
  });

  it('im echten Lauf sind alle drei Schlüssel Pflicht; die Meldung nennt nie den Wert', () => {
    const result = readConfig({ ANTHROPIC_API_KEY: fakeKeys.anthropic, SUPABASE_URL: 'https://testprojekt.supabase.co', SUPABASE_SECRET_KEY: 'sb_publishable_xyz123456789' }, [], now, suffix);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('sb_publishable_xyz123456789');
  });

  it('im Trockenlauf geht es ohne Supabase, aber nicht mit einem halben Zugang', () => {
    expect(readConfig({ ANTHROPIC_API_KEY: fakeKeys.anthropic }, ['--dry-run'], now, suffix).ok).toBe(true);
    expect(readConfig({ ANTHROPIC_API_KEY: fakeKeys.anthropic, SUPABASE_URL: 'https://testprojekt.supabase.co' }, ['--dry-run'], now, suffix).ok).toBe(false);
    expect(readConfig({}, ['--dry-run'], now, suffix).ok).toBe(false);
  });
});

describe('geheimer Supabase-Schlüssel', () => {
  const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.signatur`;
  it('sb_secret_ und service_role sind geheim, publishable und anon nicht', () => {
    expect(isSecretSupabaseKey('sb_secret_abc')).toBe(true);
    expect(isSecretSupabaseKey(jwt('service_role'))).toBe(true);
    expect(isSecretSupabaseKey('sb_publishable_abc')).toBe(false);
    expect(isSecretSupabaseKey(jwt('anon'))).toBe(false);
  });
});

describe('Kennung des Laufs', () => {
  it('Berliner Datum und die Nummer des GitHub-Laufs, sonst ein Zufallsteil', () => {
    expect(makeBatchId(new Date('2026-10-18T22:30:00Z'), '123', suffix)).toBe('wl-2026-10-19-123');
    expect(makeBatchId(now, undefined, suffix)).toBe('wl-2026-10-18-abc123');
    expect(makeBatchId(now, 'kein; sql', suffix)).toBe('wl-2026-10-18-abc123');
  });
});

describe('Schlüssel-Filter', () => {
  const redact = createRedactor([fakeKeys.anthropic, fakeKeys.supabase, undefined, '']);

  it('schneidet bekannte Schlüssel heraus, auch URL-kodiert', () => {
    const text = `a ${fakeKeys.anthropic} b ${fakeKeys.supabase} c ${encodeURIComponent(fakeKeys.anthropic)}`;
    expect(redact(text)).toBe('a [verborgen] b [verborgen] c [verborgen]');
  });

  it('schneidet auch unbekannte Schlüssel heraus, die wie Schlüssel aussehen', () => {
    const other = createRedactor([]);
    expect(other('key sk-ant-api03-ANDERER-1234567890')).toBe('key [verborgen]');
    expect(other('sb_secret_ANDERER_123456')).toBe('[verborgen]');
    expect(other('Authorization: Bearer abcdefghijklmnop')).toBe('Authorization: Bearer [verborgen]');
    expect(other('"apikey": "abcdefghijklmnop"')).toBe('"apikey": "[verborgen]"');
    expect(other('eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlLXRlc3Q')).toBe('[verborgen]');
  });

  it('lässt normalen Text in Ruhe', () => {
    expect(redact('Aufruf 1: bitte um 15 Aktivitäten, Kosten 0,01 $')).toBe('Aufruf 1: bitte um 15 Aktivitäten, Kosten 0,01 $');
  });
});

describe('Fehler der Claude API einordnen', () => {
  it.each([
    [402, { error: { type: 'billing_error', message: 'x' } }, 'billing'],
    [400, { error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }, 'billing'],
    [429, { error: { type: 'rate_limit_error', message: 'x' } }, 'limit'],
    [400, { error: { type: 'invalid_request_error', message: 'You have reached your specified API usage limits.' } }, 'limit'],
    [401, { error: { type: 'authentication_error', message: 'x' } }, 'auth'],
    [404, { error: { type: 'not_found_error', message: 'model: x' } }, 'model'],
    [529, { error: { type: 'overloaded_error', message: 'x' } }, 'overloaded'],
    [500, null, 'server'],
    [400, { error: { type: 'invalid_request_error', message: 'max_tokens: too large' } }, 'request'],
  ])('HTTP %s → %s', (status, body, kind) => {
    expect(classifyError(status, body).kind).toBe(kind);
  });
});
