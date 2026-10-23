import type { GameId, SupportedLocale } from '@gachia/core';

export type RocoMerchantGameId = Extract<GameId, 'roco' | 'roco-cn'>;

export interface RocoMerchantItem {
  name: Record<SupportedLocale, string>;
  priority: 'buy' | 'consider' | 'skip';
  note: Record<SupportedLocale, string>;
}

export interface RocoMerchantEntry {
  id: string;
  name: Record<SupportedLocale, string>;
  location: Record<SupportedLocale, string>;
  refresh: Record<SupportedLocale, string>;
  status: 'verified-cn' | 'watchlist' | 'needs-recheck';
  updatedAt: string;
  items: RocoMerchantItem[];
}

export const ROCO_MERCHANTS: Record<RocoMerchantGameId, RocoMerchantEntry[]> = {
  // Unsupported international recommendations are preserved in the S2.10 decision archive.
  roco: [],
  'roco-cn': [
    {
      id: 'wandering-merchant',
      name: { zh: '远行商人', en: 'Wandering Merchant', ja: '行商人' },
      location: { zh: '城镇/地图节点轮换，登录后顺路查看', en: 'Rotates around towns and map nodes; check after login', ja: '町や地図ノードを巡回。ログイン後に確認' },
      refresh: { zh: '每日/周期刷新，具体库存以游戏内为准', en: 'Daily or periodic refresh; stock follows the live client', ja: '毎日または周期更新。在庫はゲーム内基準' },
      status: 'needs-recheck',
      updatedAt: '2026-09-07',
      items: [
        {
          name: { zh: '国王球', en: 'King Balls', ja: '国王球' },
          priority: 'buy',
          note: { zh: '高价值捕捉资源，优先留给稀有和高资质精灵。', en: 'High-value catching resource for rare and high-aptitude Jinies.', ja: 'レア・高資質ジニー用の高価値捕獲資源。' },
        },
        {
          name: { zh: '棱镜球', en: 'Prism Balls', ja: '棱镜球' },
          priority: 'buy',
          note: { zh: '抓异色和关键精灵时收益最高。', en: 'Best saved for shiny and key catches.', ja: '色違いと重要捕獲に温存。' },
        },
        {
          name: { zh: '经验果', en: 'XP fruits', ja: '経験果' },
          priority: 'consider',
          note: { zh: '只喂主力，不建议平均分散。', en: 'Feed main Jinies only; avoid spreading too thin.', ja: '主力だけに使い、分散しすぎない。' },
        },
      ],
    },
    {
      id: 'event-shop',
      name: { zh: '赛季/活动商店', en: 'Season and Event Shop', ja: 'シーズン・イベントショップ' },
      location: { zh: 'S2 活动页、马戏团大厅和限时活动入口', en: 'S2 event tab, Circus Hall, and limited-event menus', ja: 'S2イベント、サーカスホール、期間限定入口' },
      refresh: { zh: '随活动阶段变化，临近截止优先清限时奖励', en: 'Changes by event phase; clear limited rewards near deadlines', ja: 'イベント段階で変化。期限前に限定報酬を優先' },
      status: 'verified-cn',
      updatedAt: '2026-09-07',
      items: [
        {
          name: { zh: '限定精灵/精灵蛋', en: 'Limited Jinies and eggs', ja: '限定ジニー・卵' },
          priority: 'buy',
          note: { zh: '优先级高于常驻材料，错过后复刻时间不稳定。', en: 'Higher priority than permanent mats because reruns are uncertain.', ja: '復刻時期が不安定なため恒常素材より優先。' },
        },
        {
          name: { zh: '天赋刷新卡', en: 'Talent-reset cards', ja: '天賦リセットカード' },
          priority: 'buy',
          note: { zh: '后期培养消耗稳定，看到可换优先换。', en: 'Consistent late-game sink; trade for them when available.', ja: '後半育成で使うため交換優先。' },
        },
        {
          name: { zh: '普通补给箱', en: 'Common supply boxes', ja: '通常補給箱' },
          priority: 'skip',
          note: { zh: '资源紧张时放后面，先拿限定和稀缺道具。', en: 'Delay when currency is tight; take limited items first.', ja: '通貨不足なら後回し。限定と希少品を先に。' },
        },
      ],
    },
  ],
};

export function isRocoMerchantGame(gameId: GameId): gameId is RocoMerchantGameId {
  return gameId === 'roco' || gameId === 'roco-cn';
}

export function getPriorityLabel(priority: RocoMerchantItem['priority'], locale: SupportedLocale): string {
  const labels: Record<RocoMerchantItem['priority'], Record<SupportedLocale, string>> = {
    buy: { zh: '优先购买', en: 'Buy first', ja: '優先購入' },
    consider: { zh: '按需购买', en: 'Consider', ja: '必要なら' },
    skip: { zh: '资源紧张可跳过', en: 'Skip if tight', ja: '不足時は後回し' },
  };
  return labels[priority][locale];
}

export function getStatusLabel(status: RocoMerchantEntry['status'], locale: SupportedLocale): string {
  const labels: Record<RocoMerchantEntry['status'], Record<SupportedLocale, string>> = {
    'verified-cn': { zh: '国服资料整理', en: 'CN reference', ja: '中国版参考' },
    watchlist: { zh: '待开服核验', en: 'Launch watchlist', ja: '開始後確認' },
    'needs-recheck': { zh: '待每日复核', en: 'Daily recheck', ja: '毎日確認' },
  };
  return labels[status][locale];
}
