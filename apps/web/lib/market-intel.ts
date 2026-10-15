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

export const MARKET_INTEL_BATCH_ID = 'market-intel-2026-09-30';
export const MARKET_INTEL_SOURCE_REPORT = '/plans/game-content-update-2026-09-30.md';

export const MARKET_INTEL_OPPORTUNITIES: MarketIntelOpportunity[] = [
  {
    id: 'aniimo-s1-live-content-hub',
    gameId: 'aniimo',
    priority: 'P0',
    title: '伊莫 S1 上线后内容中心',
    keywordCluster: ['伊莫新手攻略', '伊莫虹光怎么选', '伊莫家园升级', '伊莫混沌模式', '伊莫全收集'],
    riskTerms: ['mod', '私服', '代练', '账号交易'],
    targetPages: ['/aniimo/version', '/aniimo/guides/s1-new-player-route', '/aniimo/guides/rainbow-aniimo-guide', '/aniimo/guides/homeland-resource-guide'],
    actions: ['update_existing_page', 'create_topic_page', 'update_live_module', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-30',
    sourceUrls: ['https://www.yimo.com/main', 'https://steamcommunity.com/app/4126040/allnews/?l=schinese'],
    signal: { strength: 'confirmed' },
    notes: 'S1 全平台上线后，将新手、虹光、家园、地图和奖励核验拆为独立入口；社区体验仅用于选题，不替代客户端或官方说明。',
  },
  {
    id: 'azur-promilia-travel-trace-test-content-hub',
    gameId: 'azur-promilia',
    priority: 'P0',
    title: '蓝色星原：旅谣旅迹测试内容中心',
    keywordCluster: ['蓝色星原旅迹测试', '蓝色星原奇波', '蓝色星原家园', '蓝色星原不歪池', '蓝色星原养成'],
    riskTerms: ['测试号交易', '泄露', '解包', '私服'],
    targetPages: ['/azur-promilia/version', '/azur-promilia/guides/kibo-battle-and-ecology', '/azur-promilia/guides/homestead-progression', '/azur-promilia/guides/banner-system-status', '/azur-promilia/guides/test-feedback-tracker'],
    actions: ['update_existing_page', 'create_topic_page', 'add_faq', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-30',
    sourceUrls: ['https://promilia.cn/', 'https://www.taptap.cn/app/593829/topic?group_label_id=3448465'],
    signal: { strength: 'confirmed' },
    notes: '旅迹测试内容统一标为 CBT 参考或官方已确认，明确不将测试数值、养成成本和抽卡规则当作公测结论。',
  },
  {
    id: 'lvmeng-public-beta-readiness-hub',
    gameId: 'lvmeng',
    priority: 'P0',
    title: '绿梦：时空之声1.0公测中心',
    keywordCluster: ['绿梦公测', '绿梦横版ACT', '绿梦配队', '绿梦武器', '绿梦探索', '绿梦卡池福利'],
    riskTerms: ['测试服安装包', '账号交易', '破解', '外挂'],
    targetPages: ['/lvmeng/version', '/lvmeng/guides', '/lvmeng/starter-guide', '/lvmeng/roadmap'],
    actions: ['update_existing_page', 'add_faq', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-30',
    sourceUrls: ['https://www.taptap.cn/app/237561', 'https://apps.apple.com/cn/app/%E7%BB%BF%E6%A2%A6-%E6%97%B6%E7%A9%BA%E4%B9%8B%E5%A3%B0/id6791432398'],
    signal: { strength: 'mixed' },
    notes: '10月15日公测已开启，官方确认三端同账号游戏数据互通；优先维护正式配置、永久活动、恢复补偿和待客户端核验的攻略。',
  },
  {
    id: 'aniimo-launch-recap-mobile-countdown',
    gameId: 'aniimo',
    priority: 'P0',
    title: 'Aniimo launch recap / mobile launch countdown',
    keywordCluster: ['Aniimo codes', 'Aniimo redeem code', 'Aniimo release date', 'September 23 mobile', 'starter', 'beginner guide', 'map', 'Aniimo database', 'Game Pass', 'reviews'],
    riskTerms: ['Pokemon', '侵权争议', 'mod', 'private server', '非官方 apk', '破解'],
    targetPages: ['/aniimo/version', '/aniimo/download', '/aniimo/redeem-codes', '/aniimo/guides/download', '/aniimo/guides/map-regions'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'update_code_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://www.aniimo.com/newslist', 'https://www.aniimo.com/newslist/detail/100051'],
    signal: { strength: 'confirmed', deadline: '2026-09-23' },
    notes: 'PC/主机已进入上线后复盘，移动端 9/23 即将上线；版本页需要同时回答下载、兑换码状态、starter、图鉴和地图问题。',
  },
  {
    id: 'genshin-7-1-livestream-luna-ii-watch',
    gameId: 'genshin',
    priority: 'P0',
    title: '原神 7.1 / Luna II livestream code watch',
    keywordCluster: ['Genshin 7.1 livestream codes', 'Luna II', 'Snezhnaya', 'Sandrone', 'next banner', 'current banner', 'codes', 'Nod-Krai map'],
    riskTerms: ['leaks', 'mod', 'akt', 'vicineko', '同人动漫', '成人动画'],
    targetPages: ['/genshin/version', '/genshin/redeem-codes', '/genshin/guides/banner-schedule-guide', '/genshin/guides/nod-krai-cryoculus-phase-ii-checklist'],
    actions: ['update_existing_page', 'update_live_module', 'update_code_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news', 'https://www.hoyolab.com/'],
    signal: { strength: 'mixed' },
    notes: '公开需求从 Luna I 复盘转向 7.1 前瞻、Luna II、Snezhnaya、直播码和下期卡池；Nod-Krai 保留为长尾入口。',
  },
  {
    id: 'starrail-4-6-special-program-codes',
    gameId: 'starrail',
    priority: 'P0',
    title: '星铁 4.6 special program / code deadline',
    keywordCluster: ['Honkai Star Rail 4.6 livestream codes', '4.6 special program', 'redeem codes', 'next banner', 'pull count', 'team builder'],
    riskTerms: ['leaks', '内鬼吧', '同人', 'akt', 'mod'],
    targetPages: ['/starrail/version', '/starrail/redeem-codes', '/starrail/guides/banner-schedule-guide', '/starrail/guides/4x-fate-gilgamesh-kafka-cyrene-evergreen-plan'],
    actions: ['update_existing_page', 'update_live_module', 'update_code_route', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://www.hoyoverse.com/en-us/news', 'https://www.hoyolab.com/'],
    signal: { strength: 'confirmed' },
    notes: '4.6 前瞻与直播兑换码成为当前窗口，4.5 进入收尾资源和队伍规划阶段。',
  },
  {
    id: 'roco-global-quack-quack-test-official-watch',
    gameId: 'roco',
    priority: 'P0',
    title: 'Roco Global Quack Quack Test official watch',
    keywordCluster: ['Roco Kingdom global', 'Quack Quack Test', 'October 27', 'closed beta', 'pre-register', 'release date', 'platforms', 'creatures'],
    riskTerms: ['老页游', '私服', '破解版'],
    targetPages: ['/roco/version', '/roco/guides/cbt-registration-guide'],
    actions: ['update_existing_page', 'add_faq', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://store.steampowered.com/app/3688140/Roco_Kingdom/', 'https://www.rocokingdom.com/'],
    signal: { strength: 'confirmed', deadline: '2026-10-27' },
    notes: 'Quack Quack Test / 10/27 CBT 已有 Steam 与公开 FAQ 支撑，可升级为官方 watch，但仍不能写成正式上线。',
  },
  {
    id: 'zzz-3-3-watch-3-2-recap',
    gameId: 'zzz',
    priority: 'P1',
    title: 'ZZZ 3.3 watch + 3.2 recap',
    keywordCluster: ['ZZZ 3.3 special program', 'ZZZ 3.2', 'Claret', 'Roxy', 'Armorer', 'Maim', 'next banner', 'livestream codes', 'Steam', 'Xbox'],
    riskTerms: ['akt', '同人动漫', '成人向', 'mod'],
    targetPages: ['/zzz/version', '/zzz/redeem-codes', '/zzz/guides/v3-2-livestream-recap-expired-codes'],
    actions: ['update_existing_page', 'update_live_module', 'update_code_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://zenless.hoyoverse.com/', 'https://www.hoyolab.com/'],
    signal: { strength: 'mixed' },
    notes: '3.2 保留上线后复盘，新增 3.3 前瞻、下期卡池和直播码提醒。',
  },
  {
    id: 'wuwa-3-7-live-mengzhou-chisa-route',
    gameId: 'wuwa',
    priority: 'P1',
    title: '鸣潮 3.7 live / Simulacrum Nexus, Hsin and event route',
    keywordCluster: ['Wuthering Waves 3.7', 'Simulacrum Nexus of Mengzhou', 'Hsin', 'Suoming', 'current banner', 'codes', 'map', 'event', 'download'],
    riskTerms: ['mod', '3d区', '同人', 'akt', '非官方充值'],
    targetPages: ['/wuwa/version', '/wuwa/events', '/wuwa/redeem-codes', '/wuwa/guides/v3-7-live-route', '/wuwa/download', '/wuwa/map'],
    actions: ['update_existing_page', 'create_topic_page', 'update_live_module', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-30',
    sourceUrls: ['https://wutheringwaves.kurogames.com/en/main/news', 'https://mc.kurogames.com/main/news/detail/5569'],
    signal: { strength: 'confirmed' },
    notes: '3.7 已上线；用官方版本说明、唤取公告与游戏内状态维护梦州、角色、活动、下载和资源入口。',
  },
  {
    id: 'nte-september-codes-banner-calendar',
    gameId: 'nte',
    priority: 'P1',
    title: 'NTE September codes / banner calendar',
    keywordCluster: ['NTE codes September 2026', 'Linko', 'Hotori', 'banner calendar', 'active codes', 'expired codes', 'unknown codes', 'redeem code', 'Steam'],
    riskTerms: ['mod', 'maa', '未验证泄露词'],
    targetPages: ['/nte/version', '/nte/redeem-codes', '/nte/guides/aug31-sep14-event-calendar-999-nights'],
    actions: ['update_existing_page', 'update_code_route', 'add_faq', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://nte.perfectworld.com/en/news.html', 'https://www.ldshop.gg/blog/nte/nte-codes.html', 'https://ntegame.net/en/calendar/'],
    signal: { strength: 'mixed' },
    notes: '继续维护 active/expired/unknown 三态；Linko/Hotori 与 banner calendar 标注来源等级。',
  },
  {
    id: 'endfield-pioneer-test-recap-aic',
    gameId: 'endfield',
    priority: 'P1',
    title: 'Endfield Pioneer Test recap / AIC blueprint next steps',
    keywordCluster: ['Arknights Endfield Pioneer Test recap', 'test rewards', 'download', 'AIC factory', 'blueprint', 'Wuling', 'release date watch'],
    riskTerms: ['解包', 'mod', 'mods', '未证实爆料', '账号买卖'],
    targetPages: ['/endfield/version', '/endfield/download', '/endfield/guides/homecoming-update-guide', '/endfield/guides/official-download-specs-homecoming-faq'],
    actions: ['update_existing_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://store.steampowered.com/news/app/4732690/', 'https://www.playarknightsendfield.com/'],
    signal: { strength: 'confirmed' },
    notes: 'Pioneer Test 招募已结束，继续 post-test/AIC/blueprint/Wuling，清理旧版本或 last-call 语义。',
  },
  {
    id: 'ananta-release-no-gacha-fact-check',
    gameId: 'ananta',
    priority: 'P1',
    title: 'Ananta release / no-gacha fact-check',
    keywordCluster: ['Ananta release date', 'January 15 2027', 'no gacha', 'Chongxiao', 'Nova City', 'download', 'PS5', 'PC', 'iOS', 'Android', 'pre-registration'],
    riskTerms: ['无限大符号'],
    targetPages: ['/ananta/version', '/ananta/download', '/ananta/guides/release-date-beta-pc-faq', '/ananta/guides/preregistration-no-gacha-guide'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://www.anantagame.com/m/', 'https://www.pcgamer.com/games/rpg/ananta-guide/'],
    signal: { strength: 'mixed', deadline: '2027-01-15' },
    notes: '2027-01-15 与 no character gacha 仍是高价值事实核查入口，平台表继续按来源分层。',
  },
  {
    id: 'skjh-s2-current-entry',
    gameId: 'skjh',
    priority: 'P1',
    title: '失控进化 S2 current entry',
    keywordCluster: ['失控进化 S2', '制霸王座', '官网', 'WeGame', 'TapTap', '下载', '礼包', 'PC配置', '服务器模式', '防抄家'],
    riskTerms: ['公益服', '非官方包', '私服', '破解版', '账号交易'],
    targetPages: ['/skjh/version', '/skjh/guides/official-pc-download-faq', '/skjh/guides/first-2-hours-starter-route', '/skjh/guides/server-mode-choice'],
    actions: ['update_existing_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://skjh.qq.com/main.shtml', 'https://www.wegame.com.cn/store'],
    signal: { strength: 'mixed' },
    notes: '版本首页和精选入口从 S1 历史切到 S2「制霸王座」、礼包有效期、服务器模式、防抄家。',
  },
  {
    id: 'roco-cn-post-launch-route',
    gameId: 'roco-cn',
    priority: 'P1',
    title: 'Roco CN post-launch route',
    keywordCluster: ['洛克王国世界', '国服', '公测', '兑换码', '宠物图鉴', '活动', '宠物推荐', '精灵培养', '新手'],
    riskTerms: ['代充', '脚本', '私服', '破解版', '账号交易'],
    targetPages: ['/roco-cn/version', '/roco-cn/redeem-codes', '/roco-cn/characters', '/roco-cn/guides/s2-season-guide'],
    actions: ['update_existing_page', 'add_internal_links', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://rocom.qq.com/', 'https://rocom.qq.com/cp/a20260303welfare/'],
    signal: { strength: 'mixed' },
    notes: '保持国服图鉴、兑换码、活动、宠物培养和新手路线，与 Roco Global 明确分流。',
  },
  {
    id: 'sea-early-2027-december-beta-watch',
    gameId: 'sea',
    priority: 'P1',
    title: 'Sea of Remnants beta watch',
    keywordCluster: ['Sea of Remnants release date', 'early 2027', 'closed beta December', 'Steam', 'PS5', 'Xbox', 'mobile', 'gacha', 'solo', 'characters'],
    riskTerms: ['能搬砖吗'],
    targetPages: ['/sea/version', '/sea/download', '/sea/guides/platform-download-guide', '/sea/guides/what-is-forgotten-sea'],
    actions: ['update_existing_page', 'add_faq', 'update_download_route', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://www.seaofremnants.com/', 'https://store.steampowered.com/'],
    signal: { strength: 'mixed' },
    notes: '维持 early 2027 / December beta / platform FAQ，不写死测试资格。',
  },
  {
    id: 'guihuan-test-timeline-fact-check',
    gameId: 'guihuan',
    priority: 'P2',
    title: '归环测试时间线事实核查',
    keywordCluster: ['归环上线时间', 'Rewinding Cadence', '官方', '开发商', '国际服', '公测', '测试招募', '下载'],
    riskTerms: ['回环测试', '库洛'],
    targetPages: ['/guihuan/version', '/guihuan/guides/test-release-timeline-guide', '/guihuan/guides/download-install-guide', '/guihuan/guides/official-release-company-faq'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-09-21',
    sourceUrls: ['https://gh.sarosgame.com/'],
    signal: { strength: 'confirmed' },
    notes: '继续承接测试资格、公测真实性、英文名、开发商、国际服，不写未确认日期。',
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
