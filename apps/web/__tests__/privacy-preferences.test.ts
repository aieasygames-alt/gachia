import { describe, expect, it } from 'vitest';
import { allowAnalytics, PRIVACY_KEY, readPrivacyChoice, savePrivacyChoice } from '../lib/privacy-preferences';

describe('privacy choice fails closed', () => {
  it('requires explicit acceptance and exact production origin', () => {
    for (const choice of [null, 'rejected'] as const) expect(allowAnalytics('production', 'https://gachia.com', choice)).toBe(false);
    expect(allowAnalytics('production', 'https://gachia.com', 'accepted')).toBe(true);
    for (const origin of ['https://gachia-staging.aieasygames.workers.dev', 'http://localhost:3000', 'https://gachia.com.evil.test']) expect(allowAnalytics('production', origin, 'accepted')).toBe(false);
    expect(allowAnalytics('development', 'https://gachia.com', 'accepted')).toBe(false);
  });
  it('rejects missing, corrupt and unavailable storage', () => {
    for (const value of [null, '', 'true', '{"accepted":true}', 'v0']) expect(readPrivacyChoice({ getItem: () => value })).toBeNull();
    expect(readPrivacyChoice({ getItem() { throw Error('blocked'); } })).toBeNull();
    expect(savePrivacyChoice({ getItem: () => null, setItem() { throw Error('blocked'); } }, 'accepted')).toBe(false);
    expect(savePrivacyChoice({ getItem: () => null, setItem() {} }, 'accepted')).toBe(false);
  });
  it('persists acceptance and replaces it with rejection', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(savePrivacyChoice(storage, 'accepted')).toBe(true);
    expect(readPrivacyChoice(storage)).toBe('accepted');
    expect(savePrivacyChoice(storage, 'rejected')).toBe(true);
    expect(values.get(PRIVACY_KEY)).toBe('rejected');
  });
});
