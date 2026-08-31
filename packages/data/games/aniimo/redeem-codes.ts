import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';

const rawCodes = await loadJson<unknown>(
  join(process.cwd(), '../../packages/data/games/aniimo/raw-redeem-codes.json'),
  '/data/aniimo/raw-redeem-codes.json',
);

export interface AniimoRedeemCode {
  code: string;
  reward: string;
  rewardZh: string;
  rewardEn: string;
  rewardJa?: string;
  status: string;
  statusZh?: string;
  statusJa?: string;
  updated: string;
  checklist: string[];
  checklistZh?: string[];
  checklistJa?: string[];
}

export const redeemCodes: AniimoRedeemCode[] = rawCodes as AniimoRedeemCode[];

export function getActiveRedeemCodes(): AniimoRedeemCode[] {
  return redeemCodes.filter((code) => code.status === 'Active');
}

export function getRedeemCodeReward(code: AniimoRedeemCode, locale: SupportedLocale): string {
  return localeStr(code.rewardZh, code.rewardEn, locale, code.rewardJa);
}
