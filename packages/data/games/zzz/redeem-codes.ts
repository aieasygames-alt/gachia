import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawRedeemCodes from './raw-redeem-codes.json';

export interface ZzzRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: ZzzRedeemCode[] = rawRedeemCodes as unknown as ZzzRedeemCode[];

export function getActiveRedeemCodes(): ZzzRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: ZzzRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
