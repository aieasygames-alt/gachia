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

export const MARKET_INTEL_BATCH_ID = 'market-intel-2026-08-19';
export const MARKET_INTEL_SOURCE_REPORT = '/plans/market-intel-2026-08-19.md';

export const MARKET_INTEL_OPPORTUNITIES: MarketIntelOpportunity[] = [
  {
    id: 'genshin-7-0-snezhnaya-hub',
    gameId: 'genshin',
    priority: 'P0',
    title: '原神 7.0 / 至冬版本中心',
    keywordCluster: ['Genshin Impact Snezhnaya', 'next banner', 'codes', 'Sandrone', 'Columbina', 'map'],
    riskTerms: ['leaks', 'mod', 'akt', 'vicineko', '同人动漫', '同人本', '成人动画'],
    targetPages: ['/genshin/version', '/genshin/redeem-codes', '/genshin/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_live_module', 'add_internal_links', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://www.hoyolab.com/'],
    notes: '版本页继续承接 7.0 / 至冬预热，重点是卡池、地图、兑换码和角色入口。',
  },
  {
    id: 'wuwa-3-6-platform-hub',
    gameId: 'wuwa',
    priority: 'P0',
    title: '鸣潮 3.6 + Xbox/Steam 入坑更新',
    keywordCluster: ['Wuthering Waves 3.6', 'codes', 'banners', 'characters', 'xbox', 'map', 'Cyberpunk collab'],
    riskTerms: ['mod', '3d区', '同人', 'akt'],
    targetPages: ['/wuwa/version', '/wuwa/redeem-codes', '/wuwa/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://wutheringwaves.kurogames.com/en/main/news'],
    notes: '平台 FAQ 和版本页双线继续承接 Steam/Xbox/Game Pass 相关搜索。',
  },
  {
    id: 'zzz-3-1-platform-compensation',
    gameId: 'zzz',
    priority: 'P0',
    title: '绝区零 3.1 后半 / 已知问题 / 平台页',
    keywordCluster: ['Zenless Zone Zero codes', '3.1', 'characters', 'Steam', 'download', 'cloud', 'new characters'],
    riskTerms: ['akt', '同人动漫', '成人向', 'mod', '非官方一条龙'],
    targetPages: ['/zzz/version', '/zzz/redeem-codes', '/zzz/guides/steam-3-0-start-guide'],
    actions: ['update_existing_page', 'update_live_module', 'update_download_route', 'update_code_route'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://www.hoyolab.com/article/46062784', 'https://www.hoyolab.com/article/46038142'],
    notes: '3.1 后半与周年页继续承接平台下载、账号绑定和兑换码。',
  },
  {
    id: 'skjh-august-collab-beginner',
    gameId: 'skjh',
    priority: 'P0',
    title: '失控进化 8 月联动 + 上线后攻略组',
    keywordCluster: ['失控进化官网', 'steam', '攻略', '是什么游戏', '下载', 'PC', '开荒', '防抄家'],
    riskTerms: ['公益服', '非官方包', '俄语下载词', 'Ashfall Nebraska'],
    targetPages: ['/skjh/version', '/skjh/guides/official-pc-download-faq', '/skjh/guides/first-2-hours-starter-route', '/skjh/guides/server-mode-choice'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://skjh.qq.com/', 'https://www.taptap.cn/app/733908'],
    notes: '工具型攻略优先级高于新闻搬运，继续围绕下载、服务器模式和防抄家。',
  },
  {
    id: 'endfield-august-beta-aic',
    gameId: 'endfield',
    priority: 'P0',
    title: '终末地 8 月活动 / 全面测试资格页',
    keywordCluster: ['Arknights Endfield beta', 'wiki', 'characters', 'blueprint', 'code', 'download', 'test recruitment'],
    riskTerms: ['解包', 'mod', 'mods', '未证实爆料'],
    targetPages: ['/endfield/version', '/endfield/guides/download-install-guide', '/endfield/guides/homecoming-update-guide'],
    actions: ['update_existing_page', 'create_topic_page', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://endfield.hypergryph.com/news/3824', 'https://play.google.com/store/apps/details?id=com.gryphline.endfield.gp'],
    notes: 'Homecoming 与蓝图/AIC 工厂仍是差异化内容资产。',
  },
  {
    id: 'nte-1-2-iroi-999-nights',
    gameId: 'nte',
    priority: 'P1',
    title: 'NTE 1.2 后半 Iroi / 999 Nights',
    keywordCluster: ['异环官网', '国际服', '兑换码', 'wiki', '1.3', 'Shinku', 'Iroi', '999 Nights', 'download', 'Steam'],
    riskTerms: ['mod', 'maa', '未验证泄露词'],
    targetPages: ['/nte/version', '/nte/redeem-codes', '/nte/guides/download-install-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_faq', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://nte.perfectworld.com/en/article/news/gamenews/20260706/263029.html', 'https://nte.perfectworld.com/en/article/news/gamenews/20260728/263296.html'],
    notes: '继续保持 1.2 后半口径，不把 1.3 推测写成官方日期。',
  },
  {
    id: 'starrail-4x-fate-planning',
    gameId: 'starrail',
    priority: 'P1',
    title: '星铁 4.x Fate / Cyrene / Kafka / Gilgamesh 搜索承接',
    keywordCluster: ['Honkai Star Rail codes', 'characters', 'tier list', 'banners', 'team builder', 'Gilgamesh', 'Kafka', 'Cyrene'],
    riskTerms: ['leaks', '内鬼吧', '同人', 'akt', 'mod'],
    targetPages: ['/starrail/version', '/starrail/redeem-codes', '/starrail/guides/banner-schedule-guide'],
    actions: ['update_existing_page', 'update_code_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://www.hoyolab.com/topicDetail/298842'],
    notes: 'Fate、Gilgamesh、Kafka、Cyrene 继续适合做抽取与配队内容。',
  },
  {
    id: 'sea-steam-gacha-solo-faq',
    gameId: 'sea',
    priority: 'P1',
    title: '遗忘之海移动端首发后 FAQ',
    keywordCluster: ['Sea of Remnants Steam', 'release date', 'gameplay', 'gacha', 'solo', 'PS5', 'Xbox', 'wiki'],
    riskTerms: ['能搬砖吗'],
    targetPages: ['/sea/version', '/sea/guides/platform-download-guide', '/sea/guides/what-is-forgotten-sea'],
    actions: ['update_existing_page', 'add_faq', 'update_download_route', 'add_internal_links'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://sea.163.com/news/update/', 'https://store.steampowered.com/app/3633680/Sea_of_Remnants/'],
    notes: '英文 FAQ 仍最稳，重点解释 release date、gacha、solo、Steam、PS5/Xbox。',
  },
  {
    id: 'ananta-prereg-beta-watch',
    gameId: 'ananta',
    priority: 'P1',
    title: '无限大 Ananta 2027 release / download / gameplay',
    keywordCluster: ['Ananta release date', 'January 15 2027', 'Ananta download', 'PS5', 'PC', 'Android', 'iOS', 'gameplay', 'no gacha', '无限大官网', '公测时间'],
    riskTerms: ['无限大符号'],
    targetPages: ['/ananta/version', '/ananta/download', '/ananta/guides/release-date-beta-pc-faq', '/ananta/guides/download-install-guide'],
    actions: ['update_existing_page', 'add_faq', 'refresh_metadata'],
    status: 'done',
    sourceDate: '2026-08-26',
    sourceUrls: ['https://www.anantagame.com/', 'https://www.anantagame.com/preview/'],
    notes: '按 2027-01-15 全球上线和 PS5/PC/Android/iOS 平台更新，Steam/Xbox 不作为确认平台。',
  },
  {
    id: 'guihuan-release-dev-faq',
    gameId: 'guihuan',
    priority: 'P1',
    title: '归环测试时间线 / 开发商解释',
    keywordCluster: ['归环上线时间', '国际服', '官方', '开发商', '公司', '英文', '公测', '测试招募'],
    riskTerms: ['回环测试', '库洛'],
    targetPages: ['/guihuan/version', '/guihuan/guides/test-release-timeline-guide', '/guihuan/guides/download-install-guide'],
    actions: ['update_existing_page', 'add_faq', 'monitor_only'],
    status: 'done',
    sourceDate: '2026-08-19',
    sourceUrls: ['https://gh.sarosgame.com/'],
    notes: '事实核查型 FAQ 继续有效，统一声明官方未公布正式公测日期。',
  },
  {
    id: 'roco-intl-cbt-prereg',
    gameId: 'roco',
    priority: 'P2',
    title: '《洛克王国:世界》国际服 CBT / 预注册攻略',
    keywordCluster: ['Roco Kingdom CBT', 'pre-registration', 'download', 'Jinies', 'redeem codes', 'rocokingdom.com', '洛克王国世界国际服'],
    riskTerms: ['洛克王国手游', '国服混淆', '非官方包', 'apk', '破解版'],
    targetPages: ['/roco/version', '/roco/download', '/roco/guides/cbt-registration-guide', '/roco/redeem-codes'],
    actions: ['create_topic_page', 'update_download_route', 'update_code_route', 'add_internal_links'],
    status: 'in_progress',
    sourceDate: '2026-08-27',
    sourceUrls: ['https://www.rocokingdom.com/'],
    notes: '国际服 CBT 定于 2026-10-27，覆盖 iOS/Android/PS5/Xbox/Windows/Steam/Epic；与国服数据独立，需单独预注册。',
  },
  {
    id: 'roco-cn-s1-live-guide',
    gameId: 'roco-cn',
    priority: 'P2',
    title: '洛克王国:世界 国服 S1 赛季 / 图鉴补充',
    keywordCluster: ['洛克王国世界官网', '下载', 'S1 暗夜拾光', '精灵图鉴', '兑换码', 'rocom.qq.com'],
    riskTerms: ['国际服混淆', 'apk', '私服', '破解版'],
    targetPages: ['/roco-cn/version', '/roco-cn/redeem-codes', '/roco-cn/characters'],
    actions: ['create_topic_page', 'update_code_route', 'add_internal_links'],
    status: 'todo',
    sourceDate: '2026-08-27',
    sourceUrls: ['https://rocom.qq.com/'],
    notes: '国服 2026-03-26 全平台上线，S1 赛季「暗夜拾光」，347 只图鉴精灵；国际服/国服数据独立，内容口径需区分。',
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
