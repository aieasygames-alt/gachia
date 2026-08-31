import type { SupportedLocale } from '@gachia/core';
import rawCodes from './raw-redeem-codes.json';

export interface AniimoRedeemCode {
  code: string;
  reward: string;
  rewardZh: string;
  rewardEn: string;
  status: string;
  updated: string;
  checklist: string[];
}

export const redeemCodes: AniimoRedeemCode[] = rawCodes as AniimoRedeemCode[];

export function getActiveRedeemCodes(): AniimoRedeemCode[] {
  return redeemCodes.filter((code) => code.status === 'Active');
}

export function getRedeemCodeReward(code: AniimoRedeemCode, locale: SupportedLocale): string {
  if (locale === 'zh') return code.rewardZh;
  return code.rewardEn;
}
