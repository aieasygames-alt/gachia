import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
import { isRedeemCodeActive } from '../../redeem-code-status';
const rawRedeemCodes = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/wuwa/raw-redeem-codes.json'), '/data/wuwa/raw-redeem-codes.json');

export interface WuWaRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: WuWaRedeemCode[] = rawRedeemCodes as unknown as WuWaRedeemCode[];

export function getActiveRedeemCodes(now = new Date()): WuWaRedeemCode[] {
  return redeemCodes.filter((c) => isRedeemCodeActive(c, now));
}

export function getRedeemCodeReward(code: WuWaRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
