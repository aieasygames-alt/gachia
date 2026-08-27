import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawRedeemCodes = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/roco/raw-redeem-codes.json'), '/data/roco/raw-redeem-codes.json');

export interface RocoRedeemCode {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const redeemCodes: RocoRedeemCode[] = rawRedeemCodes as unknown as RocoRedeemCode[];

export function getActiveRedeemCodes(): RocoRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: RocoRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
