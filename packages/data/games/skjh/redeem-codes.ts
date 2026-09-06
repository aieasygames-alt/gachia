import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { localeStr } from './types';
import { loadJson } from '../../load-json';

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

const rawRedeemCodes = await loadJson<unknown>(
  join(process.cwd(), '../../packages/data/games/skjh/raw-redeem-codes.json'),
  '/data/skjh/raw-redeem-codes.json',
);

export const redeemCodes: SkjhRedeemCode[] = rawRedeemCodes as SkjhRedeemCode[];

export function getActiveRedeemCodes(): SkjhRedeemCode[] {
  return redeemCodes.filter((c) => c.status === 'active');
}

export function getRedeemCodeReward(code: SkjhRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.reward, code.rewardEn, locale);
}
