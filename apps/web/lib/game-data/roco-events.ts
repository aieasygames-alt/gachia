import type { GameId, SupportedLocale } from '@gachia/core';

export type RocoEventGameId = Extract<GameId, 'roco' | 'roco-cn'>;

export type RocoEventStatus = 'live' | 'upcoming' | 'ended';

export interface RocoEventEntry {
  id: string;
  title: Record<SupportedLocale, string>;
  category: 'test' | 'season' | 'codes' | 'shop' | 'challenge';
  startAt: string;
  endAt: string;
  rewards: Record<SupportedLocale, string>;
  source: Record<SupportedLocale, string>;
  updatedAt: string;
}

export const ROCO_EVENTS: Record<RocoEventGameId, RocoEventEntry[]> = {
  // Withdrawn schedules are archived in the S2.6 source-decision report, not treated as cancelled.
  roco: [],
  'roco-cn': [
    {
      id: 's2-carnival-tales',
      title: { zh: 'S2「狂欢怪谈」赛季', en: 'S2 Carnival Tales Season', ja: 'S2「狂欢怪谈」シーズン' },
      category: 'season',
      startAt: '2026-05-21',
      endAt: '2026-09-20',
      rewards: { zh: '马戏团小丑、学院呱呱、通行证精灵、赛季材料', en: 'Circus Clown, Academy Guagua, pass Jinies, season materials', ja: '馬戲團小丑、学院呱呱、パス精霊、シーズン素材' },
      source: { zh: '国服 S2 资料整理，截止日期按中下旬待复核', en: 'CN S2 reference; end date needs recheck', ja: '中国版S2参考。終了日は要確認' },
      updatedAt: '2026-09-07',
    },
    {
      id: 's2-season-codes',
      title: { zh: 'S2 赛季兑换码', en: 'S2 Season Codes', ja: 'S2シーズンコード' },
      category: 'codes',
      startAt: '2026-05-21',
      endAt: '2026-09-16',
      rewards: { zh: '洛克贝、咕噜球、异色精灵蛋、天赋刷新卡', en: 'Luoke Coins, Gulu Balls, shiny egg, talent-reset cards', ja: '洛克贝、咕噜球、色違い卵、天賦リセットカード' },
      source: { zh: '兑换码页和 S2 赛季码整理', en: 'Redeem code page and S2 code notes', ja: '交換コードページとS2コード整理' },
      updatedAt: '2026-09-07',
    },
    {
      id: 'august-limited-code',
      title: { zh: '8 月限时口令回顾', en: 'August Limited Code Recap', ja: '8月限定コード回顧' },
      category: 'codes',
      startAt: '2026-08-01',
      endAt: '2026-08-31',
      rewards: { zh: '慈悲为怀精灵蛋，当前应按过期/待复核处理', en: 'Merciful-Heart egg; now treat as expired or needs recheck', ja: '慈悲の心ジニー卵。現在は期限切れ/要確認' },
      source: { zh: '8 月限时码资料', en: 'August limited code reference', ja: '8月限定コード参考' },
      updatedAt: '2026-09-07',
    },
  ],
};

export function isRocoEventGame(gameId: GameId): gameId is RocoEventGameId {
  return gameId === 'roco' || gameId === 'roco-cn';
}

export function getEventStatus(event: RocoEventEntry, now = new Date()): RocoEventStatus {
  const start = new Date(`${event.startAt}T00:00:00Z`);
  const end = new Date(`${event.endAt}T23:59:59Z`);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'live';
}

export function getEventStatusLabel(status: RocoEventStatus, locale: SupportedLocale): string {
  const labels: Record<RocoEventStatus, Record<SupportedLocale, string>> = {
    live: { zh: '进行中', en: 'Live', ja: '開催中' },
    upcoming: { zh: '即将开始', en: 'Upcoming', ja: '近日開始' },
    ended: { zh: '已结束', en: 'Ended', ja: '終了' },
  };
  return labels[status][locale];
}

export function getEventCategoryLabel(category: RocoEventEntry['category'], locale: SupportedLocale): string {
  const labels: Record<RocoEventEntry['category'], Record<SupportedLocale, string>> = {
    test: { zh: '测试', en: 'Test', ja: 'テスト' },
    season: { zh: '赛季', en: 'Season', ja: 'シーズン' },
    codes: { zh: '兑换码', en: 'Codes', ja: 'コード' },
    shop: { zh: '商店', en: 'Shop', ja: 'ショップ' },
    challenge: { zh: '挑战', en: 'Challenge', ja: 'チャレンジ' },
  };
  return labels[category][locale];
}
