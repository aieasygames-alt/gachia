import type { GameId } from '@gachia/core';
import { GAME_IDS } from '@gachia/core';
import { getKeywordRisk } from './keyword-governance';

export type MarketIntelPriority = 'P0' | 'P1' | 'P2';

export type MarketIntelAction =
  | 'update_existing_page'
  | 'create_topic_page'
  | 'refresh_metadata'
  | 'add_faq'
  | 'add_internal_links'
  | 'update_live_module'
  | 'update_download_route'
  | 'update_code_route'
  | 'monitor_only'
  | 'reject';

export type MarketIntelStatus = 'todo' | 'in_progress' | 'done' | 'deferred' | 'rejected';

export interface MarketIntelOpportunity {
  id: string;
  gameId: GameId;
  priority: MarketIntelPriority;
  title: string;
  keywordCluster: string[];
  riskTerms: string[];
  targetPages: string[];
  actions: MarketIntelAction[];
  status: MarketIntelStatus;
  sourceDate: string;
  sourceUrls: string[];
  notes: string;
}

export const MARKET_INTEL_BATCH_ID = 'market-intel-2026-08-31';
export const MARKET_INTEL_SOURCE_REPORT = '/plans/market-intel-2026-08-31.md';

export const MARKET_INTEL_OPPORTUNITIES: MarketIntelOpportunity[] = [
  {
    id: 'genshin-7-0-phase-ii-nod-krai',
    gameId: 'genshin',
    priority: 'P0',
    title: '原神 7.0 Phase II / Nod-Krai 地图与卡池中心',
    keywordCluster: ['Genshin Impact 7.0', 'Snezhnaya', 'Nod-Krai', 'Cryoculus', 'Phase II banner', 'codes', 'interactive map', 'current banner', 'next banner'],
    riskTerms: ['leaks', 'mod', 'akt', 'vicineko', '同人动漫', '同人本', '成人动画'],
    targetPages: ['/genshin/version', '/genshin/map', '/genshin/redeem-codes', '/genshin/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_live_module', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news/165689', 'https://x.com/GenshinImpact'],
    notes: '7.0 已进入 Phase II 和上线后深水区，版本页需要从泛上线改为地图收集、Cryoculus、Phase II 卡池和兑换码的分流中心。',
  },
  {
    id: 'zzz-3-2-post-livestream-expired-codes',
    gameId: 'zzz',
    priority: 'P0',
    title: '绝区零 3.2 直播后版本预热 / 过期码说明',
    keywordCluster: ['Zenless Zone Zero 3.2', 'livestream codes', 'FLINTWORKS expired', 'new agents', 'version release date', 'Steam', 'Xbox', 'Microsoft Store'],
    riskTerms: ['akt', '同人动漫', '成人向', 'mod', '非官方一条龙'],
    targetPages: ['/zzz/version', '/zzz/redeem-codes', '/zzz/guides/steam-3-0-start-guide'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'update_code_route', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://zenless.hoyoverse.com/en-us/news/', 'https://game8.co/games/Zenless-Zone-Zero/archives/462303'],
    notes: '3.2 Special Program 已播，直播码窗口已过期；页面应从抢码改为 expired code 说明、3.2 新代理人和下期兑换码提醒。',
  },
  {
    id: 'endfield-steam-pioneer-test-aic',
    gameId: 'endfield',
    priority: 'P0',
    title: '终末地 Steam Pioneer Test / AIC 蓝图中心',
    keywordCluster: ['Arknights Endfield Steam', 'Pioneer Test recruitment', 'beta', 'download', 'blueprint', 'AIC factory', 'characters', 'Homecoming'],
    riskTerms: ['解包', 'mod', 'mods', '未证实爆料'],
    targetPages: ['/endfield/version', '/endfield/download', '/endfield/guides/download-install-guide', '/endfield/guides/homecoming-update-guide'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://endfield.hypergryph.com/news/', 'https://x.com/AKEndfield'],
    notes: 'Steam Pioneer Test recruitment 是本轮新增强信号，测试资格、Steam 下载、Homecoming、AIC factory 和 blueprint 应在同一条入口中承接。',
  },
  {
    id: 'sea-early-2027-december-beta',
    gameId: 'sea',
    priority: 'P0',
    title: '遗忘之海 early 2027 / December closed beta FAQ',
    keywordCluster: ['Sea of Remnants release date', 'early 2027', 'closed beta December', 'Steam', 'PS5', 'Xbox', 'mobile', 'gameplay', 'gacha', 'solo'],
    riskTerms: ['能搬砖吗'],
    targetPages: ['/sea/version', '/sea/download', '/sea/guides/platform-download-guide', '/sea/guides/what-is-forgotten-sea'],
    actions: ['update_existing_page', 'add_faq', 'update_download_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://www.seaofremnants.com/', 'https://ixbt.games/en/news/2026/08/26/morskaia-rpg-sea-of-remnants-vyidet-v-nacale-2027-goda-zakrytaia-beta-startuet-v-dekabre.html'],
    notes: '海外口径转向 early 2027 和 December closed beta，英文 release date、platform、gacha、solo FAQ 需要先修正，避免继续使用泛 2026 说法。',
  },
  {
    id: 'ananta-2027-launch-platforms',
    gameId: 'ananta',
    priority: 'P0',
    title: '无限大 Ananta 2027-01-15 / 平台与商业模式事实核查',
    keywordCluster: ['Ananta release date', 'January 15 2027', 'download', 'PS5', 'PC', 'Android', 'iOS', 'gameplay', 'no gacha', 'cosmetics', 'Chongxiao'],
    riskTerms: ['无限大符号'],
    targetPages: ['/ananta/version', '/ananta/download', '/ananta/guides/release-date-beta-pc-faq', '/ananta/guides/preregistration-no-gacha-guide', '/ananta/guides/gameplay-city-no-gacha-comparison-faq'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'add_faq', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://www.anantagame.com/', 'https://www.pcgamer.com/games/rpg/ananta-guide/'],
    notes: '继续承接 2027-01-15、PS5/PC/Android/iOS、Chongxiao、no-gacha 和 cosmetics；Steam/Xbox 不作为确认平台。',
  },
  {
    id: 'wuwa-3-6-post-launch',
    gameId: 'wuwa',
    priority: 'P1',
    title: '鸣潮 3.6 上线后抽卡 / 地图 / 平台页',
    keywordCluster: ['Wuthering Waves 3.6', 'codes', 'banners', 'characters', 'Qingxiao', 'Jingran', 'map', 'Xbox', 'Steam'],
    riskTerms: ['mod', '3d区', '同人', 'akt'],
    targetPages: ['/wuwa/version', '/wuwa/redeem-codes', '/wuwa/guides/banner-schedule-guide', '/wuwa/download', '/wuwa/map'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://wutheringwaves.kurogames.com/en/main/news/detail/5281', 'https://wutheringwaves.kurogames.com/en/main/news'],
    notes: '3.6 已于 2026-08-20 进入上线后承接，继续强化卡池、角色、地图、兑换码和 Xbox/Steam 新玩家入口。',
  },
  {
    id: 'nte-1-2-aug31-sep14-events',
    gameId: 'nte',
    priority: 'P1',
    title: 'NTE 1.2 8/31-9/14 活动 / 999 Nights 长尾',
    keywordCluster: ['Neverness to Everness events', 'Clash', '999 Nights', 'Iroi', 'Shinku', 'codes', 'download', 'Steam', 'release date'],
    riskTerms: ['mod', 'maa', '未验证泄露词'],
    targetPages: ['/nte/version', '/nte/redeem-codes', '/nte/guides/download-install-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_faq', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://nte.perfectworld.com/en/article/news/gamenews/20260706/263029.html', 'https://game8.co/games/Neverness-to-Everness/archives/592073'],
    notes: '1.2 999 Nights 长尾继续，8/31-9/14 活动信号出现；Iroi/Shinku、兑换码、下载与 Steam 问题稳定。',
  },
  {
    id: 'skjh-aug31-event-ended-catchup',
    gameId: 'skjh',
    priority: 'P1',
    title: '失控进化 8/31 活动收尾 / 新手补课',
    keywordCluster: ['失控进化官网', 'WeGame', '下载', '礼包', '活动时间', 'PC', '配置', 'S1', '服务器模式', '防抄家', '新手攻略'],
    riskTerms: ['公益服', '非官方包', '俄语下载词', '私服', '破解版', 'Ashfall Nebraska'],
    targetPages: ['/skjh/version', '/skjh/guides/official-pc-download-faq', '/skjh/guides/first-2-hours-starter-route', '/skjh/guides/server-mode-choice'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://skjh.qq.com/', 'https://www.taptap.cn/app/733908'],
    notes: '8/31 是活动收尾节点，内容应转向错过后怎么办、WeGame 下载注册、S1 开荒、服务器模式和防抄家。',
  },
  {
    id: 'starrail-4x-fate-planning',
    gameId: 'starrail',
    priority: 'P1',
    title: '星铁 4.x Fate / Gilgamesh / Kafka / Cyrene 搜索承接',
    keywordCluster: ['Honkai Star Rail codes', 'characters', 'tier list', 'banners', 'team builder', 'Gilgamesh', 'Kafka', 'Cyrene', 'Fate collab'],
    riskTerms: ['leaks', '内鬼吧', '同人', 'akt', 'mod'],
    targetPages: ['/starrail/version', '/starrail/redeem-codes', '/starrail/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://www.hoyolab.com/'],
    notes: '4.x 周期继续稳定，Fate 联动、Gilgamesh、Kafka、Cyrene、队伍构建仍适合做常青型抽取规划内容。',
  },
  {
    id: 'guihuan-test-timeline-faq',
    gameId: 'guihuan',
    priority: 'P1',
    title: '归环测试时间线 / 开发商解释',
    keywordCluster: ['归环上线时间', '国际服', '官方', '开发商', '公司', '英文名', '公测', '测试招募', '下载'],
    riskTerms: ['回环测试', '库洛'],
    targetPages: ['/guihuan/version', '/guihuan/guides/test-release-timeline-guide', '/guihuan/guides/download-install-guide', '/guihuan/guides/official-release-company-faq'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-08-31',
    sourceUrls: ['https://gh.sarosgame.com/'],
    notes: '继续保持事实核查型 FAQ，重点回答上线时间、国际服、官方、开发商和测试资格，不误写未确认公测日期。',
  },
];

const SUPPORTED_GAME_IDS = new Set<GameId>(GAME_IDS);

export function getMarketIntelByPriority(priority: MarketIntelPriority): MarketIntelOpportunity[] {
  return MARKET_INTEL_OPPORTUNITIES.filter((opportunity) => opportunity.priority === priority);
}

export function getMarketIntelForGame(gameId: GameId): MarketIntelOpportunity[] {
  return MARKET_INTEL_OPPORTUNITIES.filter((opportunity) => opportunity.gameId === gameId);
}

export function sortMarketIntelByPriority(
  opportunities: MarketIntelOpportunity[],
): MarketIntelOpportunity[] {
  const priorityOrder: Record<MarketIntelPriority, number> = { P0: 0, P1: 1, P2: 2 };
  return [...opportunities].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] || a.id.localeCompare(b.id),
  );
}

export function getMarketIntelValidationIssues(
  opportunities: MarketIntelOpportunity[] = MARKET_INTEL_OPPORTUNITIES,
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const opportunity of opportunities) {
    if (ids.has(opportunity.id)) issues.push(`Duplicate opportunity id: ${opportunity.id}`);
    ids.add(opportunity.id);

    if (!SUPPORTED_GAME_IDS.has(opportunity.gameId)) {
      issues.push(`${opportunity.id} has unsupported gameId: ${opportunity.gameId}`);
    }
    if (opportunity.keywordCluster.length === 0) {
      issues.push(`${opportunity.id} has no keyword cluster`);
    }
    if (opportunity.targetPages.length === 0) {
      issues.push(`${opportunity.id} has no target pages`);
    }
    if (opportunity.sourceUrls.length === 0) {
      issues.push(`${opportunity.id} has no source URLs`);
    }
    if (Number.isNaN(Date.parse(`${opportunity.sourceDate}T00:00:00Z`))) {
      issues.push(`${opportunity.id} has invalid source date`);
    }
    for (const targetPage of opportunity.targetPages) {
      if (!targetPage.startsWith('/')) issues.push(`${opportunity.id} has non-root target page: ${targetPage}`);
    }
    for (const riskTerm of opportunity.riskTerms) {
      if (!getKeywordRisk(riskTerm) && opportunity.actions.includes('reject')) continue;
    }
  }

  return issues;
}
