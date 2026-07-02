import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawRedeemCodes from './raw-redeem-codes.json';

export interface SkjhRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: SkjhRedeemCode[] = rawRedeemCodes as unknown as SkjhRedeemCode[];

export function getActiveRedeemCodes(): SkjhRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: SkjhRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
