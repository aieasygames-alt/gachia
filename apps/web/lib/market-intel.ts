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

export const MARKET_INTEL_BATCH_ID = 'market-intel-2026-09-03';
export const MARKET_INTEL_SOURCE_REPORT = '/plans/market-intel-2026-09-03.md';

export const MARKET_INTEL_OPPORTUNITIES: MarketIntelOpportunity[] = [
  {
    id: 'aniimo-2026-09-03-launch-countdown',
    gameId: 'aniimo',
    priority: 'P0',
    title: 'Aniimo 全球上线倒计时 / 平台 FAQ',
    keywordCluster: ['Aniimo release date', 'September 16 2026', 'September 23 mobile', 'PC', 'console', 'mobile', 'pre-order', 'starter', 'creature catching', 'map'],
    riskTerms: ['Pokemon', '侵权争议', 'mod', 'private server'],
    targetPages: ['/aniimo/version', '/aniimo/download', '/aniimo/guides'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_faq', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://www.aniimo.com/main', 'https://www.aniimo.com/newslist/detail/100051'],
    notes: '官方站已确认 PC/主机 2026-09-16、移动端 2026-09-23；应立即承接上线倒计时、预购/预注册和捕捉入门。',
  },
  {
    id: 'genshin-7-0-luna-i-nod-krai',
    gameId: 'genshin',
    priority: 'P0',
    title: '原神 Luna I / Nod-Krai 上线前中心',
    keywordCluster: ['Genshin Luna I', 'Song of the Welkin Moon', 'Nod-Krai', 'September 10', 'Lauma', 'Flins', 'Aino', 'free 5-star', 'returning players', 'codes'],
    riskTerms: ['leaks', 'mod', 'akt', 'vicineko', '同人动漫', '成人动画'],
    targetPages: ['/genshin/version', '/genshin/map', '/genshin/redeem-codes', '/genshin/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_live_module', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://blog.playstation.com/2025/08/29/genshin-impact-version-luna-i-song-of-the-welkin-moon-segue-launches-september-10/', 'https://x.com/GenshinImpact/status/1962459976124993689'],
    notes: 'Luna I / Nod-Krai 进入上线前最后一周，版本页需要从 7.0 Phase II 改为新地图、角色和回归奖励路线。',
  },
  {
    id: 'zzz-3-2-release-hub',
    gameId: 'zzz',
    priority: 'P0',
    title: '绝区零 3.2 上线倒计时 / Claret + Roxy 中心',
    keywordCluster: ['Zenless Zone Zero 3.2', 'September 9', 'Their Secret Histories', 'Claret', 'Roxy', 'Armorer', 'Maim', 'livestream codes expired', 'HoYoLAND 2026'],
    riskTerms: ['akt', '同人动漫', '成人向', 'mod'],
    targetPages: ['/zzz/version', '/zzz/redeem-codes', '/zzz/guides/steam-3-0-start-guide'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'update_code_route', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://zenless.hoyoverse.com/en-us/news/', 'https://www.gematsu.com/2026/08/zenless-zone-zero-version-3-2-update-their-secret-histories-launches-september-9'],
    notes: '3.2 已确认 9 月 9 日上线，直播码从可领改为过期说明，新代理人与平台入口需要合并承接。',
  },
  {
    id: 'starrail-4-5-phase-2-planning',
    gameId: 'starrail',
    priority: 'P0',
    title: '星铁 4.5 Phase 2 资源与卡池规划',
    keywordCluster: ['Honkai Star Rail 4.5', 'Astropolis', 'September 12', 'Phase 2', 'banners', 'pull count', 'codes', 'Fate collab', 'team builder'],
    riskTerms: ['leaks', '内鬼吧', '同人', 'akt', 'mod'],
    targetPages: ['/starrail/version', '/starrail/redeem-codes', '/starrail/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news/165826', 'https://x.com/honkaistarrail'],
    notes: '4.5 已上线，当前窗口更适合做 Phase 2 前准备、兑换码和队伍规划。',
  },
  {
    id: 'endfield-steam-pioneer-test-last-call',
    gameId: 'endfield',
    priority: 'P0',
    title: '终末地 Steam Pioneer Test 最后召集',
    keywordCluster: ['Arknights Endfield Steam Pioneer Test', 'September 10', 'beta recruitment', 'download', 'AIC factory', 'blueprint', 'Sanity', 'characters'],
    riskTerms: ['解包', 'mod', 'mods', '未证实爆料'],
    targetPages: ['/endfield/version', '/endfield/download', '/endfield/guides/download-install-guide', '/endfield/guides/homecoming-update-guide'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://endfield.hypergryph.com/news/', 'https://x.com/AKEndfield'],
    notes: 'Steam Pioneer Test 招募仍是 9/10 前的强时效窗口，资格、下载、AIC 和 blueprint 需要继续放在同一条入口。',
  },
  {
    id: 'sea-early-2027-december-beta',
    gameId: 'sea',
    priority: 'P1',
    title: '遗忘之海 early 2027 / December closed beta FAQ',
    keywordCluster: ['Sea of Remnants release date', 'early 2027', 'closed beta December', 'Steam', 'PS5', 'Xbox', 'mobile', 'gameplay', 'gacha', 'solo'],
    riskTerms: ['能搬砖吗'],
    targetPages: ['/sea/version', '/sea/download', '/sea/guides/platform-download-guide', '/sea/guides/what-is-forgotten-sea'],
    actions: ['update_existing_page', 'add_faq', 'update_download_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://www.seaofremnants.com/', 'https://www.gematsu.com/2026/08/sea-of-remnants-adds-xbox-series-version-launches-in-early-2027'],
    notes: 'release date 已转向 early 2027 + December closed beta，继续保持 watch 口径。',
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
    sourceDate: '2026-09-03',
    sourceUrls: ['https://wutheringwaves.kurogames.com/en/main/news/detail/5281', 'https://wutheringwaves.kurogames.com/en/main/news'],
    notes: '3.6 已进入 Phase 1 / Phase 2 转换窗口，继续强化卡池、角色、地图、兑换码和平台入口。',
  },
  {
    id: 'nte-september-events-codes',
    gameId: 'nte',
    priority: 'P1',
    title: 'NTE 9 月活动 / codes / banner hub',
    keywordCluster: ['NTE codes September 2026', 'events', 'Shipwreck Salvage', 'Ghost Train', 'Iroi', 'Shinku', 'Zankou', 'Linko', 'download', 'Steam'],
    riskTerms: ['mod', 'maa', '未验证泄露词'],
    targetPages: ['/nte/version', '/nte/redeem-codes', '/nte/guides/download-install-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_faq', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://nte.perfectworld.com/en/article/news/gamenews/20260706/263029.html', 'https://www.ldshop.gg/blog/nte'],
    notes: '9 月活动和 codes 搜索继续存在，但所有日期需要区分官方和攻略站口径。',
  },
  {
    id: 'skjh-post-launch-beginner-catchup',
    gameId: 'skjh',
    priority: 'P1',
    title: '失控进化上线后新手补课',
    keywordCluster: ['失控进化官网', 'WeGame', 'TapTap', '下载', '礼包', 'PC配置', 'S1', '服务器模式', '防抄家', '新手攻略'],
    riskTerms: ['公益服', '非官方包', '私服', '破解版', 'Ashfall Nebraska'],
    targetPages: ['/skjh/version', '/skjh/guides/official-pc-download-faq', '/skjh/guides/first-2-hours-starter-route', '/skjh/guides/server-mode-choice'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://skjh.qq.com/', 'https://www.taptap.cn/app/733908'],
    notes: '活动结束后应转向下载、礼包、PC 配置、服务器模式和防抄家常青页。',
  },
  {
    id: 'roco-global-and-cn-separation',
    gameId: 'roco',
    priority: 'P1',
    title: 'Roco Global / Roco CN 分流',
    keywordCluster: ['Roco Kingdom global', 'release date', 'platforms', 'creatures', 'pre-register', 'Roco vs Roco CN'],
    riskTerms: ['老页游', '私服'],
    targetPages: ['/roco/version', '/roco/guides/cbt-registration-guide'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://en.wikipedia.org/wiki/Roco_Kingdom'],
    notes: 'Global reveal 后更适合做海外版与国服分流，避免把国服上线信息写到全球版页面。',
  },
  {
    id: 'roco-cn-catchup-route',
    gameId: 'roco-cn',
    priority: 'P2',
    title: 'Roco CN 国服开服后图鉴 / 活动 / 新手路线',
    keywordCluster: ['洛克王国世界', '国服', '公测', '兑换码', '宠物图鉴', '精灵推荐', '活动', '新手攻略'],
    riskTerms: ['代充', '脚本', '私服', '破解版', '账号交易'],
    targetPages: ['/roco-cn/version', '/roco-cn/guides/redeem-codes-cn', '/roco-cn/guides/s2-season-guide'],
    actions: ['update_existing_page', 'add_internal_links', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://www.gamerbraves.com/roco-kingdom-world-launches-in-china-on-march-26-2026/'],
    notes: '国服更适合做图鉴、兑换码、活动和新手路线，避免与全球版信息混用。',
  },
  {
    id: 'ananta-no-gacha-launch-prep',
    gameId: 'ananta',
    priority: 'P2',
    title: '无限大 no-gacha / 上线准备补位',
    keywordCluster: ['Ananta release date', 'January 15 2027', 'no gacha', 'PS5', 'PC', 'Android', 'iOS', 'Chongxiao', 'pre-registration'],
    riskTerms: ['无限大符号'],
    targetPages: ['/ananta/version', '/ananta/download', '/ananta/guides/release-date-beta-pc-faq'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-03',
    sourceUrls: ['https://www.anantagame.com/', 'https://www.pcgamer.com/games/rpg/ananta-guide/'],
    notes: '补位到站内 currentSiteGames 覆盖，继续用 no-gacha、平台和上线准备的事实核查口径。',
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
    sourceDate: '2026-09-03',
    sourceUrls: ['https://gh.sarosgame.com/'],
    notes: '继续保持事实核查型 FAQ，重点回答上线时间、国际服、官方、开发商和测试资格。',
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
