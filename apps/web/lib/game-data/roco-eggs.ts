import type { GameId, SupportedLocale } from '@gachia/core';

export type RocoEggGameId = Extract<GameId, 'roco' | 'roco-cn'>;

export interface RocoEggEntry {
  id: string;
  name: Record<SupportedLocale, string>;
  source: Record<SupportedLocale, string>;
  status: 'confirmed-cn' | 'watchlist' | 'limited';
  priority: 'high' | 'medium' | 'low';
  note: Record<SupportedLocale, string>;
}

export const ROCO_EGGS: Record<RocoEggGameId, RocoEggEntry[]> = {
  // Unsupported international recommendations are preserved in the S2.10 decision archive.
  roco: [],
  'roco-cn': [
    {
      id: 'shimmering-jinie-egg',
      name: { zh: '炫彩精灵蛋', en: 'Shimmering Jinie Egg', ja: 'きらめくジニー卵' },
      source: { zh: '主播长期码/活动奖励', en: 'Creator codes and event rewards', ja: '配信者コード・イベント報酬' },
      status: 'confirmed-cn',
      priority: 'high',
      note: { zh: '可能开出异色，优先级高于普通培养材料。', en: 'May hatch shiny variants; prioritize over common training materials.', ja: '色違い候補。通常育成素材より優先。' },
    },
    {
      id: 'merciful-heart-egg',
      name: { zh: '慈悲为怀精灵蛋', en: 'Merciful-Heart Egg', ja: '慈悲の心ジニー卵' },
      source: { zh: '8 月限时口令，当前应归入过期/待复核', en: 'August limited code; now expired or needs recheck', ja: '8月限定コード。現在は期限切れ/要確認' },
      status: 'limited',
      priority: 'medium',
      note: { zh: '用于捕捉保 1 点血相关能力，过期后只保留作历史参考。', en: 'Tied to a catching utility effect; keep as historical reference after expiry.', ja: '捕獲補助能力に関連。期限後は参考情報として保持。' },
    },
    {
      id: 'academy-guagua-egg',
      name: { zh: '学院呱呱蛋', en: 'Academy Guagua Egg', ja: '学院グァグァ卵' },
      source: { zh: 'S2「呱呱上学记」活动兑换', en: 'S2 Guagua Goes to School event exchange', ja: 'S2「グァグァ通学記」イベント交換' },
      status: 'limited',
      priority: 'high',
      note: { zh: '限时活动精灵，临近赛季截止时优先兑换。', en: 'Limited event Jinie; exchange before season deadlines.', ja: '期間限定ジニー。シーズン終了前に交換。' },
    },
  ],
};

export function isRocoEggGame(gameId: GameId): gameId is RocoEggGameId {
  return gameId === 'roco' || gameId === 'roco-cn';
}

export function getEggStatusLabel(status: RocoEggEntry['status'], locale: SupportedLocale): string {
  const labels: Record<RocoEggEntry['status'], Record<SupportedLocale, string>> = {
    'confirmed-cn': { zh: '国服已整理', en: 'CN reference', ja: '中国版参考' },
    watchlist: { zh: '待核验', en: 'Watchlist', ja: '確認待ち' },
    limited: { zh: '限时/需复核', en: 'Limited or recheck', ja: '限定/要確認' },
  };
  return labels[status][locale];
}

export function getEggPriorityLabel(priority: RocoEggEntry['priority'], locale: SupportedLocale): string {
  const labels: Record<RocoEggEntry['priority'], Record<SupportedLocale, string>> = {
    high: { zh: '高优先级', en: 'High priority', ja: '高優先度' },
    medium: { zh: '中优先级', en: 'Medium priority', ja: '中優先度' },
    low: { zh: '低优先级', en: 'Low priority', ja: '低優先度' },
  };
  return labels[priority][locale];
}
