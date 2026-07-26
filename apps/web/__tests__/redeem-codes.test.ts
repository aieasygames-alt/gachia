import { describe, expect, it } from 'vitest';
import { isRedeemCodeActive } from '@/lib/redeem-codes';

describe('redeem code status', () => {
  const now = new Date('2026-07-26T12:00:00Z');

  it('treats active permanent codes as active', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: 'permanent' }, now)).toBe(true);
  });

  it('treats future active codes as active', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-07-26' }, now)).toBe(true);
  });

  it('treats expired dates and non-active statuses as inactive', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-07-25' }, now)).toBe(false);
    expect(isRedeemCodeActive({ status: 'expired', expiresAt: '2026-08-01' }, now)).toBe(false);
  });
});
