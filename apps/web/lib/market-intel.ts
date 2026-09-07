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

export type MarketIntelStatus =
  | 'watch'
  | 'planned'
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'expired'
  | 'deferred'
  | 'rejected';

export type MarketIntelSignalStrength = 'confirmed' | 'mixed' | 'needs_verification';

export interface MarketIntelSignal {
  strength: MarketIntelSignalStrength;
  deadline?: string;
}

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
  signal?: MarketIntelSignal;
  notes: string;
}

export const MARKET_INTEL_BATCH_ID = 'market-intel-2026-09-07';
export const MARKET_INTEL_SOURCE_REPORT = '/plans/market-intel-2026-09-07.md';

export const MARKET_INTEL_OPPORTUNITIES: MarketIntelOpportunity[] = [
  {
    id: 'zzz-3-2-launch-day-route',
    gameId: 'zzz',
    priority: 'P0',
    title: '绝区零 3.2 launch day route',
    keywordCluster: ['Zenless Zone Zero 3.2', 'September 9', 'Their Secret Histories', 'Claret', 'Roxy', 'Armorer', 'Maim', 'rerun banners', 'Steam', 'Xbox', 'expired livestream codes'],
    riskTerms: ['akt', '同人动漫', '成人向', 'mod'],
    targetPages: ['/zzz/version', '/zzz/redeem-codes', '/zzz/guides/steam-3-0-start-guide'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'update_code_route', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news/165951', 'https://noisypixel.net/zenless-zone-zero-version-3-2-claret-roxy-armorer/'],
    signal: { strength: 'confirmed', deadline: '2026-09-09' },
    notes: '3.2 已进入 9/9 上线前最后窗口，版本页应从 release hub 升级为首日路线，兑换码页明确直播码 expired。',
  },
  {
    id: 'genshin-luna-i-final-prep',
    gameId: 'genshin',
    priority: 'P0',
    title: '原神 Luna I / Nod-Krai final prep',
    keywordCluster: ['Genshin Luna I', 'Song of the Welkin Moon', 'Nod-Krai', 'September 10', 'Lauma', 'Flins', 'Aino', 'free 5-star', 'anniversary rewards', 'returning player', 'interactive map'],
    riskTerms: ['leaks', 'mod', 'akt', 'vicineko', '同人动漫', '成人动画'],
    targetPages: ['/genshin/version', '/genshin/map', '/genshin/redeem-codes', '/genshin/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_live_module', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news/159364', 'https://blog.playstation.com/2025/08/29/genshin-impact-version-luna-i-song-of-the-welkin-moon-segue-launches-september-10/'],
    signal: { strength: 'confirmed', deadline: '2026-09-10' },
    notes: 'Luna I / Nod-Krai 仍是 9/10 前核心入口，版本页需要突出最终准备、免费 5 星、周年/回归奖励和地图材料。',
  },
  {
    id: 'endfield-steam-pioneer-test-cutoff',
    gameId: 'endfield',
    priority: 'P0',
    title: '终末地 Steam Pioneer Test cutoff',
    keywordCluster: ['Arknights Endfield Steam Pioneer Test', 'September 10', '13:00 UTC+8', 'beta recruitment', 'Steam test rewards', 'download', 'AIC factory', 'blueprint', 'Sanity'],
    riskTerms: ['解包', 'mod', 'mods', '未证实爆料'],
    targetPages: ['/endfield/version', '/endfield/download', '/endfield/guides/download-install-guide', '/endfield/guides/homecoming-update-guide'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://survey.gryphline.com/s/bf70c9fca887998cb784808ed6c17b0d', 'https://store.steampowered.com/news/app/4732690/view/689766422328378820'],
    signal: { strength: 'confirmed', deadline: '2026-09-10' },
    notes: 'Steam Pioneer Test 9/10 13:00 UTC+8 截止，页面需要 last-call 倒计时，并准备 9/10 后切 recap/expired。',
  },
  {
    id: 'aniimo-global-launch-starter-route',
    gameId: 'aniimo',
    priority: 'P0',
    title: 'Aniimo 全球上线倒计时 / starter route',
    keywordCluster: ['Aniimo release date', 'September 16 2026', 'September 23 mobile', 'PC', 'PS5', 'Xbox', 'Steam', 'Epic Games Store', 'Game Pass', 'pre-order', 'starter', 'creature catching'],
    riskTerms: ['Pokemon', '侵权争议', 'mod', 'private server'],
    targetPages: ['/aniimo/version', '/aniimo/download', '/aniimo/guides/download'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_faq', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://www.aniimo.com/newslist/detail/100051', 'https://www.aniimo.com/newslist'],
    signal: { strength: 'confirmed', deadline: '2026-09-16' },
    notes: '官方上线日期仍是 PC/主机 9/16、移动端 9/23，当前需要把平台表、预购、starter、capture/twine/map 串起来。',
  },
  {
    id: 'starrail-4-5-phase-2-planning',
    gameId: 'starrail',
    priority: 'P1',
    title: '星铁 4.5 Phase 2 抽取规划',
    keywordCluster: ['Honkai Star Rail 4.5', 'Phase 2', 'September 12', 'banners', 'pull count', 'codes', 'Fate collab', 'team builder'],
    riskTerms: ['leaks', '内鬼吧', '同人', 'akt', 'mod'],
    targetPages: ['/starrail/version', '/starrail/redeem-codes', '/starrail/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news/165826', 'https://x.com/honkaistarrail'],
    signal: { strength: 'confirmed', deadline: '2026-09-12' },
    notes: '4.5 已上线且 9/12 前仍有 Phase 2 短期窗口，继续承接抽取规划、兑换码和队伍构建。',
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
    sourceDate: '2026-09-07',
    sourceUrls: ['https://www.seaofremnants.com/', 'https://www.gematsu.com/2026/08/sea-of-remnants-adds-xbox-series-version-launches-in-early-2027'],
    signal: { strength: 'mixed' },
    notes: '本轮没有更强新信号，继续维持 early 2027 + December closed beta + platform FAQ 的谨慎 watch 口径。',
  },
  {
    id: 'wuwa-3-6-phase-2-jingran-prep',
    gameId: 'wuwa',
    priority: 'P1',
    title: '鸣潮 3.6 Phase 2 / Jingran prep',
    keywordCluster: ['Wuthering Waves 3.6', 'Jingran', 'Qingxiao', 'banners', 'codes', 'map', 'Xbox', 'Steam', 'download'],
    riskTerms: ['mod', '3d区', '同人', 'akt'],
    targetPages: ['/wuwa/version', '/wuwa/redeem-codes', '/wuwa/guides/banner-schedule-guide', '/wuwa/download', '/wuwa/map'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://wutheringwaves.kurogames.com/en/main/news/detail/5281', 'https://wutheringwaves.kurogames.com/en/main/news'],
    signal: { strength: 'mixed', deadline: '2026-09-10' },
    notes: '3.6 Phase 2/Jingran 接近 9/10，继续强化卡池、地图、兑换码和平台入口；机制细节避免未核验爆料。',
  },
  {
    id: 'nte-september-codes-banner-calendar',
    gameId: 'nte',
    priority: 'P1',
    title: 'NTE September codes / banner calendar',
    keywordCluster: ['NTE codes September 2026', 'Linko', 'Hotori', 'banner calendar', 'active codes', 'expired codes', 'redeem code', 'Steam'],
    riskTerms: ['mod', 'maa', '未验证泄露词'],
    targetPages: ['/nte/version', '/nte/redeem-codes', '/nte/guides/download-install-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_faq', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://nte.perfectworld.com/en/article/news/gamenews/20260706/263029.html', 'https://www.ldshop.gg/blog/nte/nte-codes.html', 'https://ntegame.net/en/calendar/'],
    signal: { strength: 'mixed' },
    notes: '9 月 codes、active/expired、Linko/Hotori 和 banner calendar 信号增强，页面必须标注官方/攻略站/待核验来源等级。',
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
    sourceDate: '2026-09-07',
    sourceUrls: ['https://skjh.qq.com/', 'https://www.taptap.cn/app/733908'],
    signal: { strength: 'mixed' },
    notes: '本轮继续保持上线后常青承接，下载、礼包、PC 配置、服务器模式和防抄家优先于过期礼包词。',
  },
  {
    id: 'roco-global-quack-quack-test-watch',
    gameId: 'roco',
    priority: 'P1',
    title: 'Roco Global Quack Quack Test watch',
    keywordCluster: ['Roco Kingdom global', 'Quack Quack Test', 'October 27', 'closed beta', 'pre-register', 'release date', 'platforms', 'creatures'],
    riskTerms: ['老页游', '私服'],
    targetPages: ['/roco/version', '/roco/guides/cbt-registration-guide'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://mobalytics.gg/gamebase/previews/roco-kingdom-early-release-date', 'https://game8.co/articles/release-dates/roco-kingdom-release-date-and-time'],
    signal: { strength: 'needs_verification', deadline: '2026-10-27' },
    notes: 'Global 版出现 October 27 / Quack Quack Test 第三方 CBT 信号，必须标注待官方核验并继续与 Roco CN 分流。',
  },
  {
    id: 'roco-cn-catchup-route',
    gameId: 'roco-cn',
    priority: 'P1',
    title: 'Roco CN 国服兑换码 / 图鉴路线',
    keywordCluster: ['洛克王国世界', '国服', '公测', '兑换码', '宠物图鉴', '精灵推荐', '活动', '新手攻略'],
    riskTerms: ['代充', '脚本', '私服', '破解版', '账号交易'],
    targetPages: ['/roco-cn/version', '/roco-cn/guides/redeem-codes-cn', '/roco-cn/guides/s2-season-guide'],
    actions: ['update_existing_page', 'add_internal_links', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://rocom.qq.com/cp/a20260303welfare/', 'https://www.gamerbraves.com/roco-kingdom-world-launches-in-china-on-march-26-2026/'],
    signal: { strength: 'mixed' },
    notes: '国服继续适合图鉴、兑换码、活动和新手路线，兑换码页应突出有效期与来源，减少过期码误导。',
  },
  {
    id: 'ananta-no-gacha-launch-prep',
    gameId: 'ananta',
    priority: 'P1',
    title: '无限大 no-gacha / release fact-check',
    keywordCluster: ['Ananta release date', 'January 15 2027', 'no gacha', 'PS5', 'PC', 'Android', 'iOS', 'Chongxiao', 'pre-registration'],
    riskTerms: ['无限大符号'],
    targetPages: ['/ananta/version', '/ananta/download', '/ananta/guides/release-date-beta-pc-faq'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://www.anantagame.com/m/', 'https://www.pcgamer.com/games/rpg/ananta-guide/'],
    signal: { strength: 'mixed', deadline: '2027-01-15' },
    notes: '官方站继续写 January 15th, 2027，no character gacha 和平台表需要继续做事实核查。',
  },
  {
    id: 'guihuan-test-timeline-faq',
    gameId: 'guihuan',
    priority: 'P2',
    title: '归环测试时间线 / 开发商解释',
    keywordCluster: ['归环上线时间', '国际服', '官方', '开发商', '公司', '英文名', '公测', '测试招募', '下载'],
    riskTerms: ['回环测试', '库洛'],
    targetPages: ['/guihuan/version', '/guihuan/guides/test-release-timeline-guide', '/guihuan/guides/download-install-guide', '/guihuan/guides/official-release-company-faq'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-07',
    sourceUrls: ['https://gh.sarosgame.com/'],
    signal: { strength: 'confirmed' },
    notes: '暂无新定档强信号，继续保持测试资格、英文名、开发商、公测时间真实性的事实核查。',
  },
];

const SUPPORTED_GAME_IDS = new Set<GameId>(GAME_IDS);
const SUPPORTED_MARKET_INTEL_STATUSES = new Set<MarketIntelStatus>([
  'watch',
  'planned',
  'todo',
  'in_progress',
  'done',
  'expired',
  'deferred',
  'rejected',
]);
const SUPPORTED_MARKET_INTEL_SIGNAL_STRENGTHS = new Set<MarketIntelSignalStrength>([
  'confirmed',
  'mixed',
  'needs_verification',
]);

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
    if (!SUPPORTED_MARKET_INTEL_STATUSES.has(opportunity.status)) {
      issues.push(`${opportunity.id} has unsupported status: ${opportunity.status}`);
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
    if (opportunity.signal) {
      if (!SUPPORTED_MARKET_INTEL_SIGNAL_STRENGTHS.has(opportunity.signal.strength)) {
        issues.push(`${opportunity.id} has unsupported signal strength: ${opportunity.signal.strength}`);
      }
      if (
        opportunity.signal.deadline &&
        Number.isNaN(Date.parse(`${opportunity.signal.deadline}T00:00:00Z`))
      ) {
        issues.push(`${opportunity.id} has invalid signal deadline: ${opportunity.signal.deadline}`);
      }
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
