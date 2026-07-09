import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawRedeemCodes = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/nte/raw-redeem-codes.json'), '/data/nte/raw-redeem-codes.json');

export interface NteRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: NteRedeemCode[] = rawRedeemCodes as unknown as NteRedeemCode[];

export function getActiveRedeemCodes(): NteRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: NteRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
