import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
const rawRedeemCodes = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/starrail/raw-redeem-codes.json'), '/data/starrail/raw-redeem-codes.json');

export interface StarRailRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: StarRailRedeemCode[] = rawRedeemCodes as unknown as StarRailRedeemCode[];

export function getActiveRedeemCodes(): StarRailRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: StarRailRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
