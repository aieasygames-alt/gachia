import type { GameId, SupportedLocale } from '@gachia/core';

export type LiveStatus = 'live' | 'upcoming' | 'fresh' | 'watch';

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
}

export interface LiveBanner {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status: LiveStatus;
  updatedAt: string;
  priority: number;
}

export interface LiveVersionUpdate {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status: LiveStatus;
  updatedAt: string;
  priority: number;
}

export interface LiveGuideLink {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  updatedAt: string;
  priority: number;
}

export interface LiveCodeSummary {
  gameId: GameId;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  status: LiveStatus;
  updatedAt: string;
  priority: number;
}

export type LiveCalendarEventType =
  | 'banner_start'
  | 'banner_end'
  | 'version_release'
  | 'livestream'
  | 'code_expiry'
  | 'event_start'
  | 'event_end';

export interface LiveCalendarEvent {
  id: string;
  gameId: GameId;
  type: LiveCalendarEventType;
  title: LocalizedText;
  summary: LocalizedText;
  href: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  updatedAt: string;
  priority: number;
}

export const LIVE_UPDATED_AT = '2026-10-08';

export const HOMEPAGE_PRIORITY_GAMES: GameId[] = [
  'lvmeng',
  'genshin',
  'wuwa',
  'zzz',
  'roco',
  'aniimo',
  'skjh',
  'endfield',
  'nte',
  'starrail',
  'sea',
  'ananta',
  'guihuan',
  'roco-cn',
  'azur-promilia',
];

export const LIVE_BANNERS: LiveBanner[] = [
  {
    gameId: 'aniimo',
    title: {"zh": "伊莫10月16日周更新：家园与赛季节点", "en": "Aniimo October 16 update: Homeland and season schedule", "ja": "伊莫10月16日更新：ホームランドとシーズン日時"},
    summary: {"zh": "家园作物增益已公布，10月21日04:00开放丰收集会；100辉石补偿限定1.1更新前注册。下半赛季预览另行核验。", "en": "Homeland boosts are announced; the gathering opens October 21 at 04:00. Compensation requires registration before v1.1. Verify the lower-half preview separately.", "ja": "作物増益を公開、10月21日04:00に集会開始。補償は1.1更新前登録が条件。下半期プレビューは別途確認。"},
    href: '/aniimo/version',
    status: 'fresh',
    updatedAt: '2026-10-18',
    priority: 1,
  },
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Global 测试信息待核实',
      en: 'Roco Global Test Information Unverified',
      ja: 'Roco Global テスト情報未確認',
    },
    summary: {
      zh: '撤回旧 Steam 来源支持：其 App ID 对应其他游戏。测试日程、报名和规则尚待独立核实，不代表测试取消。',
      en: 'The old Steam source is withdrawn: its App ID identifies another game. Test timing, signup and rules need independent verification; this is not a cancellation notice.',
      ja: '旧Steam出典を撤回：App IDは別のゲームを示します。日程・応募・ルールは独立した確認待ちであり、中止告知ではありません。',
    },
    href: '/roco/version',
    status: 'watch',
    updatedAt: '2026-10-24',
    priority: 3,
  },
];

export const LIVE_VERSION_UPDATES: LiveVersionUpdate[] = [
  {
    gameId: 'aniimo',
    title: {"zh": "伊莫10月16日周更新：家园与赛季节点", "en": "Aniimo October 16 update: Homeland and season schedule", "ja": "伊莫10月16日更新：ホームランドとシーズン日時"},
    summary: {"zh": "家园作物增益已公布，10月21日04:00开放丰收集会；100辉石补偿限定1.1更新前注册。下半赛季预览另行核验。", "en": "Homeland boosts are announced; the gathering opens October 21 at 04:00. Compensation requires registration before v1.1. Verify the lower-half preview separately.", "ja": "作物増益を公開、10月21日04:00に集会開始。補償は1.1更新前登録が条件。下半期プレビューは別途確認。"},
    href: '/aniimo/version',
    status: 'fresh',
    updatedAt: '2026-10-18',
    priority: 1,
  },
  {
    gameId: 'starrail',
    title: {"zh": "星铁近期更新：跃迁与活动核验", "en": "Recent HSR Updates: Warps and Events", "ja": "スターレイル直近更新：跳躍とイベント"},
    summary: {"zh": "进入版本页查看近期官方更新、跃迁窗口与活动奖励，逐条核对来源日期和所在区服。", "en": "Open the version hub for recent official updates, warp windows and event rewards, with source dates and region scope.", "ja": "バージョンページで直近の公式更新、跳躍期間、イベント報酬を出典確認日・地域とともに確認できます。"},
    href: '/starrail/version',
    status: 'fresh',
    updatedAt: '2026-11-24',
    priority: 2,
  },
  {
    gameId: 'zzz',
    title: {"zh": "绝区零3.3前瞻复盘：节目码已过期", "en": "ZZZ v3.3 Preview Recap: Codes Expired", "ja": "ZZZ v3.3番組まとめ：コード失効済み"},
    summary: {"zh": "10月9日前瞻已发布，菲欧妮、赛维里安即将登场。节目码已于10月11日23:59:59（UTC+8）失效；3.3上线日待后续公告核验。", "en": "The October 9 preview is published. Program codes expired October 11 at 23:59:59 UTC+8; verify the release date in follow-up notices.", "ja": "10月9日の番組は公開済み。コードは10月11日23:59:59（UTC+8）に失効。実装日は後続告知で確認してください。"},
    href: '/zzz/version',
    status: 'watch',
    updatedAt: '2026-10-15',
    priority: 3,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮 3.7 已上线：梦枢天罗、心与活动路线',
      en: 'WuWa v3.7 Is Live: Simulacrum Nexus, Hsin and Event Routes',
      ja: '鳴潮 Ver.3.7配信中：夢枢天羅・心・イベント導線',
    },
    summary: {
      zh: '3.7「镜锁妄世，心照红尘」已上线。先检查邮件、资源下载与活动条件，再处理梦枢天罗、当前唤取和限时挑战。',
      en: 'v3.7 “Prism\'s Illusion, Heart\'s Illumination” is live. Check mail, downloads, and event conditions before the Simulacrum Nexus, current Convene, and limited challenges.',
      ja: 'Ver.3.7「鏡に鎖す妄世、心で照らす紅塵」配信中です。夢枢天羅、現在の集音、期間限定挑戦の前に、メール、DL、イベント条件を確認します。',
    },
    href: '/wuwa/version',
    status: 'live',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Global 测试来源复核',
      en: 'Roco Global Test Source Review',
      ja: 'Roco Global テスト出典の再確認',
    },
    summary: {
      zh: '旧测试日期不再作为已确认日程。报名、平台、资格与删档规则需要匹配正确游戏的独立官方证据。',
      en: 'The old test date is no longer a confirmed schedule. Signup, platforms, eligibility and wipe rules need independent official evidence for the correct game.',
      ja: '旧テスト日は確認済み日程として扱いません。応募・対応機種・資格・データ削除ルールは正しいゲームの独立した公式根拠が必要です。',
    },
    href: '/roco/version',
    status: 'watch',
    updatedAt: '2026-10-24',
    priority: 5,
  },
  {
    gameId: 'skjh',
    title: {
      zh: '失控进化 S2 制霸王座当前入口',
      en: 'Ashfall Evolution S2 Throne Rush Entry',
      ja: '失控進化 S2 制霸王座入口',
    },
    summary: {
      zh: '入口从 S1 历史切到 S2「制霸王座」、礼包有效期、服务器模式和防抄家路线。',
      en: 'The route has moved from S1 history into S2 Throne Rush, reward validity, server modes, and anti-raid planning.',
      ja: 'S1履歴からS2「制霸王座」、報酬期限、サーバーモード、防衛導線へ移行。',
    },
    href: '/skjh/version',
    status: 'fresh',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    gameId: 'endfield',
    title: {"zh": "终末地国服丹青渡：寻访、补偿与工业更新", "en": "Endfield CN Danqingdu: searches, compensation and industry", "ja": "中国版丹青渡：尋訪・補償・工業更新"},
    summary: {"zh": "10月15日官方更新公开祀、明河、新区域与系统改动。寻访分阶段、补偿有资格；旧测试独立保留，其他地区另行核验。", "en": "The October 15 CN notice adds operators, area and systems. Searches are phased and compensation is conditional; older tests and other regions remain separate.", "ja": "10月15日中国版告知で新キャラ・エリア・システム追加。尋訪は段階開催、補償は資格付き。旧テスト・他地域は区別。"},
    href: '/endfield/version',
    status: 'live',
    updatedAt: '2026-10-18',
    priority: 7,
  },
  {
    gameId: 'sea',
    title: {
      zh: '遗忘之海 early 2027 / December beta watch',
      en: 'Sea of Remnants Early 2027 / December Beta Watch',
      ja: 'Sea of Remnants early 2027 / December beta注目',
    },
    summary: {
      zh: '保持 watch 口径承接 early 2027、December closed beta、Steam、PS5/Xbox、mobile、gacha 和 solo。',
      en: 'Maintains watch wording for early 2027, December closed beta, Steam, PS5/Xbox, mobile, gacha, and solo intent.',
      ja: 'early 2027、December closed beta、Steam、PS5/Xbox、mobile、gacha、soloをwatch表現で承接。',
    },
    href: '/sea/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 8,
  },
  {
    gameId: 'nte',
    title: {"zh": "异环国服1.4：10月15日更新公告", "en": "NTE CN v1.4: October 15 Update Notice", "ja": "NTE中国版v1.4：10月15日更新告知"},
    summary: {"zh": "官方公告新增明音凛、限定弧盘与番外剧情，相关限定窗口至11月5日05:59；维护完成和国际服时间另行核验。", "en": "The CN notice adds a limited agent, arc and side story, with limited content through November 5 at 05:59. Verify maintenance completion and global timing separately.", "ja": "中国版告知で限定キャラ、弧盤、番外物語を追加。限定期間は11月5日05:59まで。完了告知と海外版日程は別途確認してください。"},
    href: '/nte/version',
    status: 'fresh',
    updatedAt: '2026-10-15',
    priority: 9,
  },
  {
    gameId: 'ananta',
    title: {
      zh: '无限大 2027-01-15 / no-gacha fact-check',
      en: 'Ananta Jan 15 2027 / No-Gacha Fact-check',
      ja: 'Ananta 2027-01-15 / ガチャなし確認',
    },
    summary: {
      zh: '继续把 release date、no character gacha、platform、pre-registration 和 Nova City/Chongxiao 放在前排。',
      en: 'Keep release date, no character gacha, platforms, preregistration, and Nova City/Chongxiao up front.',
      ja: 'release date、no character gacha、platform、pre-registration、Nova City/Chongxiaoを前面に出します。',
    },
    href: '/ananta/version',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 10,
  },
];

export const LIVE_CODE_SUMMARIES: LiveCodeSummary[] = [
  {
    gameId: 'starrail',
    title: {
      zh: '星铁兑换码核验入口',
      en: 'HSR Code Verification',
      ja: 'スターレイルコード確認',
    },
    summary: {
      zh: '历史兑换码须按官方期限和区服重新核验，不把旧节目码视为当前有效。',
      en: 'Recheck historical codes against official deadlines and server scope before treating them as active.',
      ja: '過去のコードは公式期限と地域を再確認し、現在有効とは断定しません。',
    },
    href: '/starrail/redeem-codes',
    status: 'watch',
    updatedAt: '2026-11-24',
    priority: 2,
  },
  {
    gameId: 'aniimo',
    title: {
      zh: 'Aniimo 兑换码状态',
      en: 'Aniimo Code Status',
      ja: 'Aniimoコード状態',
    },
    summary: {
      zh: '上线后仍按 active、expired、unknown 分层；未确认公开码不放入可领取模块。',
      en: 'After launch, keep active, expired, and unknown tiers; unconfirmed public codes stay out of claimable modules.',
      ja: '配信後もactive、expired、unknownを分け、未確認コードを受取可能欄に入れません。',
    },
    href: '/aniimo/redeem-codes',
    status: 'watch',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
  {
    gameId: 'nte',
    title: {
      zh: '异环 9 月兑换码三态',
      en: 'NTE September Code Tiers',
      ja: 'NTE 9月コード三分類',
    },
    summary: {
      zh: '继续维护 active、expired、unknown，避免把攻略站或社区码写成官方确认。',
      en: 'Maintain active, expired, and unknown states without treating guide-site or community codes as official.',
      ja: 'active、expired、unknownを維持し、攻略サイト/社区コードを公式扱いしません。',
    },
    href: '/nte/redeem-codes',
    status: 'watch',
    updatedAt: '2026-10-15',
    priority: 4,
  },
  {
    gameId: 'zzz',
    title: {
      zh: '绝区零 3.3 直播码提醒',
      en: 'ZZZ v3.3 Code Reminder',
      ja: 'ZZZ v3.3コード提醒',
    },
    summary: {
      zh: '3.3节目码已于10月11日23:59:59（UTC+8）失效；只保留过期记录，其他兑换码按各自官方期限核验。',
      en: 'v3.3 program codes expired October 11 at 23:59:59 UTC+8. Keep them expired and verify other codes separately.',
      ja: 'v3.3番組コードは10月11日23:59:59（UTC+8）に失効しました。他のコードは個別に確認してください。',
    },
    href: '/zzz/redeem-codes',
    status: 'watch',
    updatedAt: '2026-10-15',
    priority: 5,
  },
];

export const LIVE_GUIDES: LiveGuideLink[] = [
  {
    gameId: 'roco',
    title: {
      zh: 'Roco Kingdom 测试信息核验状态',
      en: 'Roco Kingdom Test Verification Status',
      ja: 'Roco Kingdom テスト情報の確認状況',
    },
    summary: {
      zh: '先查看来源撤回说明。旧报名攻略仍待复核，不应据此安排测试、付款或下载客户端。',
      en: 'Read the source-withdrawal notice first. The old signup guide is still under review; do not use it to schedule testing, pay or download a client.',
      ja: 'まず出典撤回の説明を確認してください。旧応募ガイドは再確認中であり、参加計画・支払い・クライアントDLの根拠にしないでください。',
    },
    href: '/roco/version',
    updatedAt: '2026-10-24',
    priority: 1,
  },
  {
    gameId: 'roco-cn',
    title: {
      zh: '国服兑换码大全（2026-08 更新）',
      en: 'CN Redeem Codes (August 2026)',
      ja: '中国版交換コード一覧（2026年8月更新）',
    },
    summary: {
      zh: '公测长期码、S2 赛季码、主播码与 8 月限时口令，附兑换入口与注意事项。',
      en: 'Launch codes, S2 season codes, creator codes, and the August limited-time password, with redemption steps and tips.',
      ja: '公測恒常コード、S2シーズンコード、クリエイターコード、8月期間限定パスワードと入力方法をまとめています。',
    },
    href: '/roco-cn/guides/redeem-codes-cn',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'sea',
    title: {
      zh: '遗忘之海 Steam / gacha / solo FAQ',
      en: 'Sea of Remnants Steam / Gacha / Solo FAQ',
      ja: 'Sea of Remnants Steam / ガチャ / ソロFAQ',
    },
    summary: {
      zh: '承接 early 2027、December beta、Steam、PS5/Xbox、mobile、gacha 与 solo 搜索。',
      en: 'Routes early 2027, December beta, Steam, PS5/Xbox, mobile, gacha, and solo intent.',
      ja: 'early 2027、December beta、Steam、PS5/Xbox、mobile、gacha、solo検索へ案内します。',
    },
    href: '/sea/guides/platform-download-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
  {
    gameId: 'ananta',
    title: {
      zh: '无限大 2027 全球上线准备',
      en: 'Ananta 2027 Global Launch Prep',
      ja: 'Ananta 2027 配信準備',
    },
    summary: {
      zh: '承接 2027年1月15日、PS5、PC、Android、iOS、download、gameplay 和 no-gacha 搜索。',
      en: 'Routes January 15 2027, PS5, PC, Android, iOS, download, gameplay, and no-gacha searches.',
      ja: '2027年1月15日、PS5、PC、Android、iOS、DL、gameplay、ガチャなし検索へ案内します。',
    },
    href: '/ananta/guides/release-date-beta-pc-faq',
    updatedAt: LIVE_UPDATED_AT,
    priority: 5,
  },
  {
    gameId: 'guihuan',
    title: {
      zh: '归环测试时间线 / 开发商 FAQ',
      en: 'Guihuan Test Timeline / Developer FAQ',
      ja: '帰環 テスト年表 / 開発元FAQ',
    },
    summary: {
      zh: '事实核查上线时间、国际服、官方、开发商、公司、英文和测试招募。',
      en: 'Fact-check release timing, global-server intent, official sources, developer, English name, and test recruitment.',
      ja: 'リリース時期、国際版、公式、開発元、英語名、テスト募集を確認します。',
    },
    href: '/guihuan/guides/test-release-timeline-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 6,
  },
  {
    gameId: 'wuwa',
    title: {
      zh: '鸣潮当前卡池',
      en: 'Wuthering Waves v3.7 Live Route',
      ja: '鳴潮 現在バナー',
    },
    summary: {
      zh: '3.7 上线后路线、活动、兑换码、Xbox/Steam 和地图入口集中承接。',
      en: 'Route v3.7 live coverage, events, codes, Xbox/Steam, and map intent.',
      ja: 'Ver.3.7実装後ルート、イベント、コード、Xbox/Steam、マップ検索意図に対応します。',
    },
    href: '/wuwa/guides/banner-schedule-guide',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    gameId: 'skjh',
    title: {
      zh: '失控进化新手 0-2 小时',
      en: 'Ashfall Evolution First 0-2 Hours',
      ja: '失控進化 最初の0-2時間',
    },
    summary: {
      zh: '上线后优先解决下载、服务器模式、开荒路线和基地防守。',
      en: 'Solve download, server mode, starter route, and base-defense questions after launch.',
      ja: 'DL、サーバーモード、序盤ルート、拠点防衛を優先します。',
    },
    href: '/skjh/guides/first-2-hours-starter-route',
    updatedAt: LIVE_UPDATED_AT,
    priority: 2,
  },
  {
    gameId: 'endfield',
    title: {
      zh: '终末地蓝图 / AIC 工厂',
      en: 'Endfield Blueprint / AIC Factory',
      ja: 'エンドフィールド 設計図 / AIC工場',
    },
    summary: {
      zh: '测试资格、下载、角色、蓝图和 AIC 工厂系统是当前承接重点。',
      en: 'Test access, downloads, characters, blueprints, and AIC factory content are the current focus.',
      ja: 'テスト資格、DL、キャラ、設計図、AIC工場を重点化します。',
    },
    href: '/endfield/guides/pioneer-test-post-test-route',
    updatedAt: LIVE_UPDATED_AT,
    priority: 3,
  },
];

export const LIVE_CALENDAR_EVENTS: LiveCalendarEvent[] = [
{
  "id": "wuwa-v37-fish-web-start",
  "gameId": "wuwa",
  "type": "event_start",
  "title": {
    "zh": "鸣潮：朝月鱼涌H5开启",
    "en": "WuWa: Web Fishing Event Starts",
    "ja": "鳴潮：Web釣りイベント開始"
  },
  "summary": {
    "zh": "官方窗口10/15 10:00至11/1 09:59（UTC+8）；领取条件见活动页与官方公告。",
    "en": "Official window: Oct 15 10:00 to Nov 1 09:59 UTC+8. Verify reward requirements in the official event.",
    "ja": "公式期間は10/15 10:00〜11/1 09:59（UTC+8）。受取条件は公式イベントで確認。"
  },
  "href": "/wuwa/guides/v3-7-hsin-suoming-official-reference",
  "startsAt": "2026-10-15",
  "endsAt": "2026-11-01",
  "timezone": "Asia/Shanghai",
  "updatedAt": "2026-10-15",
  "priority": 1
},
  {
    id: 'aniimo-mobile-launch-2026-09-23',
    gameId: 'aniimo',
    type: 'version_release',
    title: {
      zh: 'Aniimo 移动端上线',
      en: 'Aniimo Mobile Launch',
      ja: 'Aniimo モバイル配信',
    },
    summary: {
      zh: '移动端官方日期为 2026-09-23；PC/主机已进入上线后复盘。',
      en: 'The official mobile date is 2026-09-23; PC/console is already in launch recap mode.',
      ja: 'モバイル公式日程は2026-09-23。PC/コンソールは配信後まとめ段階です。',
    },
    href: '/aniimo/version',
    startsAt: '2026-09-23',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 1,
  },
  {
    id: 'ananta-global-launch-2027-01-15',
    gameId: 'ananta',
    type: 'version_release',
    title: {
      zh: '无限大 2027-01-15 上线观察',
      en: 'Ananta Jan 15 2027 Launch Watch',
      ja: 'Ananta 2027-01-15配信注目',
    },
    summary: {
      zh: '继续事实核查 2027-01-15、no character gacha、平台、预注册和 Nova City/Chongxiao。',
      en: 'Continue fact-checking Jan 15 2027, no character gacha, platforms, preregistration, and Nova City/Chongxiao.',
      ja: '2027-01-15、no character gacha、平台、事前登録、Nova City/Chongxiaoを確認します。',
    },
    href: '/ananta/version',
    startsAt: '2027-01-15',
    timezone: 'Asia/Shanghai',
    updatedAt: LIVE_UPDATED_AT,
    priority: 4,
  },
];
export function localizeText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.zh;
}

export function sortByPriority<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

export function sortCalendarEvents(events: LiveCalendarEvent[]): LiveCalendarEvent[] {
  return [...events].sort((a, b) => {
    const dateDiff = Date.parse(`${a.startsAt}T00:00:00Z`) - Date.parse(`${b.startsAt}T00:00:00Z`);
    return dateDiff === 0 ? a.priority - b.priority : dateDiff;
  });
}
