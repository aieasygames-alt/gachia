import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawRedeemCodes = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/roco-cn/raw-redeem-codes.json'), '/data/roco-cn/raw-redeem-codes.json');

export interface RocoCnRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: RocoCnRedeemCode[] = rawRedeemCodes as unknown as RocoCnRedeemCode[];

export function getActiveRedeemCodes(): RocoCnRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: RocoCnRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
