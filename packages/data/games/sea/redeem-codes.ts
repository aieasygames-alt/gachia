import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawRedeemCodes from './raw-redeem-codes.json';

export interface SeaRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: SeaRedeemCode[] = rawRedeemCodes as unknown as SeaRedeemCode[];

export function getActiveRedeemCodes(): SeaRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: SeaRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
