import { describe, expect, it } from 'vitest';
import { isRedeemCodeActive } from '@/lib/redeem-codes';
import { getRedeemCodesForGame } from '@/lib/game-data/redeem-codes';
import seaCodes from '../public/data/sea/raw-redeem-codes.json';
import zzzCodes from '../public/data/zzz/raw-redeem-codes.json';
import wuwaCodes from '../public/data/wuwa/raw-redeem-codes.json';
import { getActiveRedeemCodes as getWuwaActiveCodes } from '@gachia/data/games/wuwa/redeem-codes';

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

  it('keeps timestamp-based Sea expiry values valid for page formatting', () => {
    for (const code of seaCodes) {
      expect(new Date(code.expiresAt).getTime(), `${code.code} expiry should parse`).not.toBeNaN();
    }
  });

  it('treats expired dates and non-active statuses as inactive', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-07-25' }, now)).toBe(false);
    expect(isRedeemCodeActive({ status: 'expired', expiresAt: '2026-08-01' }, now)).toBe(false);
  });

  it('keeps restrictive WuWa classifications in the public mirror and shares the date-aware module policy', () => {
    const date = new Date('2026-10-23T00:00:00Z');
    for (const code of ['WUTHRINGWAVES', 'WUWACNY2026', 'ROYALFROST2026']) {
      const record = wuwaCodes.find(entry => entry.code === code)!;
      expect(record.status).toBe('expired');
      expect(isRedeemCodeActive(record, date)).toBe(false);
    }
    const expected = wuwaCodes.filter(code => isRedeemCodeActive(code, date)).map(code => code.code);
    expect(getWuwaActiveCodes(date).map(code => code.code)).toEqual(expected);
    expect(expected).not.toContain('WUWAVER30UPDATE');
  });

  it('handles the whole UTC date and fails closed on invalid expiry', () => {
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-10-23' }, new Date('2026-10-23T23:59:59.999Z'))).toBe(true);
    expect(isRedeemCodeActive({ status: 'active', expiresAt: '2026-10-23' }, new Date('2026-10-24T00:00:00Z'))).toBe(false);
    expect(isRedeemCodeActive({ status: 'active', expiresAt: 'unknown' }, now)).toBe(false);
  });

  it('keeps the ZZZ v3.2 livestream code out of active code modules', () => {
    const flintworks = zzzCodes.find((code) => code.code === 'FLINTWORKS');

    expect(flintworks).toMatchObject({
      status: 'expired',
      source: '2026-08-28 v3.2 special program',
    });
    expect(isRedeemCodeActive(flintworks!, new Date('2026-08-31T00:00:00Z'))).toBe(false);
  });

  it('keeps the ZZZ v3.3 livestream-code watchlist out of active code modules', () => {
    const pending = zzzCodes.find((code) => code.code === '3.3_LIVESTREAM_PENDING');

    expect(pending).toMatchObject({
      status: 'watchlist',
      source: 'official-watchlist',
      revealedAt: '2026-10-08',
    });
    expect(isRedeemCodeActive(pending!, new Date('2026-10-09T12:00:00Z'))).toBe(false);
  });

  it('keeps dated Roco CN codes visible so the page can classify expired entries', async () => {
    const codes = await getRedeemCodesForGame('roco-cn');
    const augustLimited = codes.find((code) => code.code === '不要小瞧我和精灵的羁绊啊');

    expect(codes.length).toBeGreaterThan(20);
    expect(augustLimited).toBeDefined();
    expect(isRedeemCodeActive(augustLimited!, new Date('2026-09-07T00:00:00Z'))).toBe(false);
  });
});
