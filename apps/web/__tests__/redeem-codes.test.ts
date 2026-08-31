import { describe, expect, it } from 'vitest';
import { isRedeemCodeActive } from '@/lib/redeem-codes';
import zzzCodes from '../public/data/zzz/raw-redeem-codes.json';

describe('redeem code status', () => {
  const now = new Date('2026-07-26T12:00:00Z');

  it('treats active permanent codes as active', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: 'permanent' }, now)).toBe(true);
  });

  it('treats future active codes as active', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-07-26' }, now)).toBe(true);
  });

  it('parses explicit timestamp expiry values without rewriting their timezone', () => {
    const code = { status: 'active', expiresAt: '2026-08-29T23:59:59+08:00' };

    expect(isRedeemCodeActive(code, new Date('2026-08-29T15:59:58Z'))).toBe(true);
    expect(isRedeemCodeActive(code, new Date('2026-08-29T16:00:00Z'))).toBe(false);
  });

  it('treats expired dates and non-active statuses as inactive', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-07-25' }, now)).toBe(false);
    expect(isRedeemCodeActive({ status: 'expired', expiresAt: '2026-08-01' }, now)).toBe(false);
  });

  it('keeps the ZZZ v3.2 livestream code out of active code modules', () => {
    const flintworks = zzzCodes.find((code) => code.code === 'FLINTWORKS');

    expect(flintworks).toMatchObject({
      status: 'expired',
      source: '2026-08-28 v3.2 special program',
    });
    expect(isRedeemCodeActive(flintworks!, new Date('2026-08-31T00:00:00Z'))).toBe(false);
  });
});
