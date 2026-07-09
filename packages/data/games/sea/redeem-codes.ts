import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawRedeemCodes = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/sea/raw-redeem-codes.json'), '/data/sea/raw-redeem-codes.json');

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
