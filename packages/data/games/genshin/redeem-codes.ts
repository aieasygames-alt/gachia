import type { SupportedLocale } from '@gachia/core';
import rawRedeemCodes from './raw-redeem-codes.json';
import { localeStr } from './types';

export interface GenshinRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: GenshinRedeemCode[] = rawRedeemCodes as unknown as GenshinRedeemCode[];

export function getActiveRedeemCodes(): GenshinRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: GenshinRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
