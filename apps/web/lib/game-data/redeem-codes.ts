import type { GameId, SupportedLocale } from '@gachia/core';

export interface RedeemCodeEntry {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

export const GAMES_WITH_REDEEM_CODES: GameId[] = ['genshin', 'starrail', 'wuwa', 'zzz', 'nte', 'sea', 'skjh'];

export async function getRedeemCodesForGame(gameId: GameId): Promise<RedeemCodeEntry[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/redeem-codes');
      return mod.redeemCodes as unknown as RedeemCodeEntry[];
    }
    default:
      return [];
  }
}

export async function getRedeemCodeReward(gameId: GameId, code: RedeemCodeEntry, locale: SupportedLocale) {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/redeem-codes');
      return mod.getRedeemCodeReward(code as never, locale);
    }
    default:
      return code.rewardEn;
  }
}
