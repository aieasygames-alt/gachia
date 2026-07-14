import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

type LocaleText = Record<SupportedLocale, string>;

type PlatformInfo = {
  name: string;
  status: LocaleText;
  note: LocaleText;
};

type DownloadCopy = {
  officialUrl: string;
  status: LocaleText;
  intro: LocaleText;
  officialNote: LocaleText;
  platforms: PlatformInfo[];
  specs: LocaleText[];
  cloud: LocaleText;
  crossPlay: LocaleText;
  nextLinks: Array<{
    href: string;
    label: LocaleText;
    description: LocaleText;
  }>;
  faq: Array<{
    question: LocaleText;
    answer: LocaleText;
  }>;
};

const DEFAULT_STATUS: LocaleText = {
  zh: '请优先确认官网、平台商店和官方社区公告；下载包、预下载和服务器开放时间可能按地区变化。',
  en: 'Always verify the official site, platform stores, and official community notices; preload, download size, and server timing can vary by region.',
  ja: '公式サイト、ストア、公式コミュニティ告知を必ず確認してください。事前DL、容量、サーバー時間は地域で変わる場合があります。',
};

const DOWNLOAD_COPY: Record<GameId, DownloadCopy> = {
  genshin: {
    officialUrl: 'https://genshin.hoyoverse.com/',
    status: {
      zh: '原神已长期上线，PC、移动端和主机端均以 HoYoverse 官方入口及平台商店为准。',
      en: 'Genshin Impact is live across PC, mobile, and console; use HoYoverse official entry points and platform stores.',
      ja: '原神はPC、モバイル、コンソールで配信中です。HoYoverse公式入口と各ストアを基準にしてください。',
    },
    intro: {
      zh: '这个页面承接“原神官网、下载、云游戏、配置要求、兑换码”搜索，先帮你确认安全入口，再把版本、地图和养成路线接上。',
      en: 'This page captures official site, download, cloud gaming, specs, and code intent, then routes you into patches, maps, and build planning.',
      ja: '公式、DL、クラウド、推奨環境、コード検索を受け、版本、マップ、育成導線へつなぎます。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC launcher / Epic', '可玩', 'Live', '配信中', '优先使用官网启动器或平台商店。', 'Use the official launcher or platform store.', '公式ランチャーまたはストアを利用。'),
      platform('iOS / Android', '可玩', 'Live', '配信中', '移动端建议预留充足空间并使用 Wi-Fi 更新。', 'Keep enough storage and update over Wi-Fi.', '容量を確保しWi-Fi更新を推奨。'),
      platform('PlayStation / Xbox', '可玩', 'Live', '配信中', '主机端以对应商店页面和账号地区为准。', 'Follow each console store and account region.', '各ストアとアカウント地域に従ってください。'),
    ],
    specs: specs('建议预留 100GB 级别空间给完整客户端与后续资源。', 'Reserve roughly 100GB-class storage for the full client and future assets.', '完全版と追加データ用に100GB級の空き容量を推奨。'),
    cloud: {
      zh: '云游戏入口可能按地区和平台开放，优先确认 HoYoverse 官方说明。',
      en: 'Cloud gaming availability depends on region and platform; confirm HoYoverse notices first.',
      ja: 'クラウド版は地域とプラットフォームで異なるため公式告知を確認してください。',
    },
    crossPlay: crossSaveHoyoverse(),
    nextLinks: commonLinks('genshin', 'banner-schedule-guide'),
    faq: liveFaq('原神', 'Genshin Impact', '原神'),
  },
  starrail: {
    officialUrl: 'https://hsr.hoyoverse.com/',
    status: {
      zh: '星穹铁道已上线，PC、移动端和主机端下载入口以 HoYoverse 官方与平台商店为准。',
      en: 'Honkai: Star Rail is live; use HoYoverse and platform stores for PC, mobile, and console downloads.',
      ja: 'スターレイルは配信中です。PC、モバイル、コンソールはHoYoverse公式と各ストアを確認してください。',
    },
    intro: {
      zh: '这里集中处理星铁下载、官网、云游戏、配置、兑换码和 4.4 版本入坑路径。',
      en: 'Use this hub for Star Rail download, official links, cloud gaming, specs, codes, and v4.4 onboarding.',
      ja: 'DL、公式、クラウド、環境、コード、v4.4入門をまとめます。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC launcher / Epic', '可玩', 'Live', '配信中', 'PC 端适合长线剧情和高画质体验。', 'PC is best for long sessions and high-quality settings.', 'PCは長時間プレイと高画質向き。'),
      platform('iOS / Android', '可玩', 'Live', '配信中', '移动端适合日常清体力和活动。', 'Mobile is convenient for dailies and events.', 'モバイルは日課とイベント向き。'),
      platform('PlayStation / Xbox', '可玩', 'Live', '配信中', '主机端以对应商店支持状态为准。', 'Console support follows each platform store.', 'コンソール対応は各ストア基準。'),
    ],
    specs: specs('建议预留 40GB 以上空间，版本更新前再检查资源包大小。', 'Reserve 40GB+ and recheck asset size before major updates.', '40GB以上を確保し大型更新前に容量を確認。'),
    cloud: cloudOfficial(),
    crossPlay: crossSaveHoyoverse(),
    nextLinks: commonLinks('starrail', 'v4-4-preview-guide'),
    faq: liveFaq('崩坏：星穹铁道', 'Honkai: Star Rail', 'スターレイル'),
  },
  wuwa: {
    officialUrl: 'https://wutheringwaves.kurogames.com/',
    status: {
      zh: '鸣潮已上线，3.5 后 Xbox / Game Pass 相关下载与账号问题需要优先看官方和商店公告。',
      en: 'Wuthering Waves is live; after v3.5, verify Xbox/Game Pass download and account details through official and store notices.',
      ja: '鳴潮は配信中です。v3.5以降のXbox/Game Pass関連は公式とストア告知を確認してください。',
    },
    intro: {
      zh: '集中承接鸣潮下载、官网、国际服、Xbox、云游戏、配置和 3.5 新玩家入坑问题。',
      en: 'A hub for Wuthering Waves download, official links, global server, Xbox, cloud gaming, specs, and v3.5 starters.',
      ja: 'DL、公式、グローバル、Xbox、クラウド、環境、v3.5入門を承接します。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC launcher / Epic', '可玩', 'Live', '配信中', 'PC 端适合声骸刷取和高帧率动作。', 'PC suits Echo farming and high-FPS action.', 'PCはエコー周回と高FPS向き。'),
      platform('iOS / Android', '可玩', 'Live', '配信中', '移动端建议检查性能档位和发热。', 'Check performance presets and thermals on mobile.', 'モバイルは性能設定と発熱を確認。'),
      platform('Xbox / Game Pass', '关注官方状态', 'Check official status', '公式状態を確認', '账号、区服和权益以商店说明为准。', 'Account, region, and perks follow store notices.', 'アカウント、地域、特典はストア告知基準。'),
    ],
    specs: specs('动作体验对帧率敏感，PC 和移动端都建议给画质档位留余量。', 'Action combat is frame-sensitive, so leave headroom on PC and mobile settings.', 'アクションはFPSが重要なので設定に余裕を持たせてください。'),
    cloud: cloudOfficial(),
    crossPlay: {
      zh: '跨平台进度和区服规则请以库洛账号与平台公告为准，切换平台前先确认登录方式。',
      en: 'Cross-platform progress and server rules follow Kuro account and platform notices; confirm login method before switching devices.',
      ja: 'クロス進行とサーバールールはKuroアカウントと告知基準。端末変更前にログイン方式を確認。',
    },
    nextLinks: commonLinks('wuwa', 'v3-5-preview-guide'),
    faq: liveFaq('鸣潮', 'Wuthering Waves', '鳴潮'),
  },
  nte: {
    officialUrl: 'https://nte.perfectworld.com/',
    status: {
      zh: '异环已进入正式上线阶段，下载、区服、PS5 与移动端入口建议统一从官方和商店确认。',
      en: 'NTE is live; verify downloads, servers, PS5, and mobile entry points through official and store pages.',
      ja: '異環は正式配信段階です。DL、サーバー、PS5、モバイル入口は公式とストアで確認。',
    },
    intro: {
      zh: '承接异环官网、下载、配置、云游戏、兑换码、Shinku/Iroi 和 1.2 版本入坑查询。',
      en: 'Covers NTE official site, download, specs, cloud gaming, codes, Shinku/Iroi, and v1.2 onboarding.',
      ja: '公式、DL、環境、クラウド、コード、Shinku/Iroi、v1.2入門を整理。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC', '可玩', 'Live', '配信中', 'UE5 开放世界建议优先装 SSD。', 'SSD installation is recommended for this UE5 open-world title.', 'UE5オープンワールドのためSSD推奨。'),
      platform('iOS / Android', '可玩', 'Live', '配信中', '移动端下载资源包前检查剩余空间。', 'Check free storage before downloading mobile resource packs.', '追加データ前に空き容量を確認。'),
      platform('PlayStation 5', '可玩', 'Live', '配信中', 'PS5 入口以 PlayStation Store 为准。', 'Use PlayStation Store as the source of truth.', 'PS Storeを基準にしてください。'),
    ],
    specs: specs('PC 建议 SSD 和 16GB 内存起步，移动端建议预留 20GB 以上。', 'Use SSD and 16GB RAM on PC; reserve 20GB+ on mobile.', 'PCはSSDと16GB RAM、モバイルは20GB以上推奨。'),
    cloud: cloudOfficial(),
    crossPlay: {
      zh: '跨平台进度通常取决于同一账号和同一区服，国服/国际服切换前请先确认数据是否互通。',
      en: 'Cross-platform progress depends on account and server; confirm CN/global data separation before switching.',
      ja: 'クロス進行はアカウントとサーバー依存。CN/Globalのデータ分離を確認してください。',
    },
    nextLinks: commonLinks('nte', 'download-install-guide'),
    faq: liveFaq('异环', 'Neverness to Everness', '異環'),
  },
  zzz: {
    officialUrl: 'https://zenless.hoyoverse.com/',
    status: {
      zh: '绝区零已上线，Steam、官方启动器、移动端和主机入口需要确认同一 HoYoverse 账号。',
      en: 'ZZZ is live; Steam, official launcher, mobile, and console entry points should use the intended HoYoverse account.',
      ja: 'ゼンレスゾーンゼロは配信中です。Steam、公式ランチャー、モバイル、コンソールは同じHoYoverseアカウントを確認。',
    },
    intro: {
      zh: '集中承接绝区零 Steam 下载、账号绑定、云游戏、兑换码、配置和 3.0 回流入坑问题。',
      en: 'Covers ZZZ Steam download, account linking, cloud gaming, codes, specs, and v3.0 starter questions.',
      ja: 'Steam DL、アカウント連携、クラウド、コード、環境、v3.0復帰/入門を整理。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('Steam / PC launcher', '可玩', 'Live', '配信中', '先确认要绑定的新旧 HoYoverse 账号。', 'Confirm the HoYoverse account before linking Steam or launcher access.', 'Steam/ランチャー連携前にHoYoverseアカウントを確認。'),
      platform('iOS / Android', '可玩', 'Live', '配信中', '移动端适合日常、活动和短时刷取。', 'Mobile is convenient for dailies, events, and short farming sessions.', '日課、イベント、短時間周回に便利。'),
      platform('PlayStation / Xbox', '可玩', 'Live', '配信中', '主机端账号绑定前先确认服务器和平台账号。', 'Check server and platform account before console linking.', '連携前にサーバーとプラットフォームアカウントを確認。'),
    ],
    specs: specs('动作游戏对输入延迟敏感，PC 建议稳定 60fps 以上再提高画质。', 'Input latency matters; target stable 60fps before raising graphics settings.', '入力遅延が重要なので安定60fpsを優先。'),
    cloud: cloudOfficial(),
    crossPlay: crossSaveHoyoverse(),
    nextLinks: commonLinks('zzz', 'steam-3-0-start-guide'),
    faq: liveFaq('绝区零', 'Zenless Zone Zero', 'ゼンレスゾーンゼロ'),
  },
  guihuan: {
    officialUrl: 'https://gh.sarosgame.com/',
    status: {
      zh: '归环仍应按官方测试、公测与平台公告判断是否可下载；不要相信未验证安装包。',
      en: 'Guihuan download availability should follow official test, release, and platform notices; avoid unverified installers.',
      ja: '帰環のDL可否は公式テスト、リリース、ストア告知に従ってください。未確認インストーラは避けましょう。',
    },
    intro: {
      zh: '承接归环官网、下载、公测时间、测试资格、配置和时间循环玩法搜索。',
      en: 'Covers Guihuan official site, downloads, release timing, test access, specs, and time-loop gameplay intent.',
      ja: '公式、DL、リリース時期、テスト資格、環境、時間ループ検索を承接。',
    },
    officialNote: {
      zh: '如果官方未公布正式公测日期或开放下载，请以官网、TapTap、B站和官方社区公告为准。',
      en: 'If the final public release date or download is not announced, use the official site, TapTap, Bilibili, and community notices as source of truth.',
      ja: '正式リリース日やDLが未発表の場合、公式サイト、TapTap、Bilibili、公式コミュニティ告知を基準にしてください。',
    },
    platforms: unreleasedPlatforms(),
    specs: specs('测试期配置可能变化，正式下载前只把设备和空间准备好，不提前安装来历不明客户端。', 'Specs may change during testing; prepare device and storage, but do not install unknown clients.', 'テスト中は環境が変わる可能性があります。端末と容量を準備し、未知のクライアントは避けてください。'),
    cloud: cloudUnreleased(),
    crossPlay: unreleasedCrossPlay(),
    nextLinks: commonLinks('guihuan', 'test-release-timeline-guide'),
    faq: unreleasedFaq('归环', 'Guihuan', '帰環'),
  },
  ananta: {
    officialUrl: 'https://www.anantagame.com/',
    status: {
      zh: '无限大仍以官网预注册、测试与平台愿望单为核心；正式下载和上线时间请等待官方确认。',
      en: 'Ananta remains centered on preregistration, tests, and store wishlists; wait for official confirmation on downloads and launch timing.',
      ja: 'Anantaは事前登録、テスト、ストアウィッシュリスト段階です。正式DLと配信時期は公式確認を待ってください。',
    },
    intro: {
      zh: '承接无限大官网、下载、公测时间、预注册、无抽卡、网易和配置搜索。',
      en: 'Covers Ananta official site, download, release timing, preregistration, no-gacha model, NetEase, and specs.',
      ja: '公式、DL、リリース時期、事前登録、ガチャなし、NetEase、環境検索を整理。',
    },
    officialNote: {
      zh: '如正式公测日期、平台下载和商业模式细节未最终公布，请以官网、预注册页和官方公告为准。',
      en: 'If release date, platform downloads, or monetization details are not finalized, follow the official site, preregistration page, and notices.',
      ja: '正式リリース日、DL、収益モデル詳細が未確定の場合、公式サイトと事前登録告知を基準にしてください。',
    },
    platforms: unreleasedPlatforms(),
    specs: specs('先按开放世界动作游戏准备 PC / 移动端空间，最终配置以官方下载页为准。', 'Prepare PC/mobile storage for an open-world action game; final specs should follow the official download page.', 'オープンワールドアクション向けに容量を準備し、最終環境は公式DLページを確認。'),
    cloud: cloudUnreleased(),
    crossPlay: unreleasedCrossPlay(),
    nextLinks: commonLinks('ananta', 'preregistration-no-gacha-guide'),
    faq: unreleasedFaq('无限大', 'Ananta', 'Ananta'),
  },
  endfield: {
    officialUrl: 'https://endfield.hypergryph.com/',
    status: {
      zh: '终末地下载、测试资格、Homecoming 更新和平台状态请以鹰角官方、商店与测试公告为准。',
      en: 'Endfield downloads, test access, Homecoming updates, and platform status should follow Hypergryph, stores, and test notices.',
      ja: 'EndfieldのDL、テスト資格、Homecoming更新、プラットフォーム状態はHypergryph公式、ストア、テスト告知を基準にしてください。',
    },
    intro: {
      zh: '承接终末地官网、下载、配置、云游戏、角色、AIC 工厂和 Homecoming 查询。',
      en: 'Covers Endfield official site, downloads, specs, cloud gaming, operators, AIC factory, and Homecoming intent.',
      ja: '公式、DL、環境、クラウド、オペレーター、AIC工場、Homecoming検索を整理。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC', '关注官方状态', 'Check official status', '公式状態を確認', '测试/预下载以官方资格和商店页面为准。', 'Tests and preload follow official eligibility and store pages.', 'テスト/事前DLは公式資格とストアページ基準。'),
      platform('iOS / Android', '关注官方状态', 'Check official status', '公式状態を確認', '移动端平台节奏可能与 PC 不同。', 'Mobile timing may differ from PC.', 'モバイル時期はPCと異なる場合があります。'),
      platform('Console', '关注官方状态', 'Check official status', '公式状態を確認', '主机端是否同步请看官方平台公告。', 'Check official platform notices for console timing.', 'コンソール時期は公式告知を確認。'),
    ],
    specs: specs('基地建造和大地图对 CPU、内存与存储都有要求，正式配置以官方为准。', 'Base building and large maps can stress CPU, memory, and storage; final specs follow official notices.', '基地建設と大マップはCPU、メモリ、ストレージに負荷がかかるため公式環境を確認。'),
    cloud: cloudOfficial(),
    crossPlay: unreleasedCrossPlay(),
    nextLinks: commonLinks('endfield', 'download-install-guide'),
    faq: unreleasedFaq('明日方舟：终末地', 'Arknights: Endfield', 'Endfield'),
  },
  sea: {
    officialUrl: 'https://www.seaofremnants.com/',
    status: {
      zh: '遗忘之海下载与平台节奏请以官网、Steam、移动商店和官方公告为准；PC 与移动端节点可能不同。',
      en: 'Sea of Remnants download and platform timing should follow the official site, Steam, mobile stores, and notices; PC and mobile timing can differ.',
      ja: 'Sea of RemnantsのDLと配信時期は公式、Steam、モバイルストア、告知を確認。PCとモバイルは時期が異なる場合があります。',
    },
    intro: {
      zh: '承接遗忘之海官网、下载、配置、云游戏、平台、PC 公测和开服第一天行动路线。',
      en: 'Covers Sea of Remnants official site, download, specs, cloud gaming, platforms, PC open beta, and launch-day routing.',
      ja: '公式、DL、環境、クラウド、プラットフォーム、PC CBT、初日ルートを整理。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC / Steam', '优先入口', 'Primary entry', '優先入口', '适合首日开荒、捏脸和长时间探索。', 'Best for launch-day progression, character creation, and long sessions.', '初日進行、キャラメイク、長時間探索向き。'),
      platform('iOS / Android', '关注官方节点', 'Check official timing', '公式時期を確認', '移动端节点可能晚于 PC，下载前看商店页面。', 'Mobile timing may trail PC; check store pages before downloading.', 'モバイルはPCより遅い場合があるためストア確認。'),
      platform('Cloud trial / H5', '关注活动状态', 'Check event status', 'イベント状態を確認', '云捏脸或云试玩可能是活动型入口。', 'Cloud sculpting or trials may be event-based entries.', 'クラウド顔作成や試遊はイベント型の場合があります。'),
    ],
    specs: specs('PC 端建议 SSD、较大空间和稳定网络；移动端下载前预留资源包空间。', 'Use SSD, ample storage, and stable network on PC; reserve mobile asset-pack space before installing.', 'PCはSSD、容量、安定回線を推奨。モバイルは追加データ容量を確保。'),
    cloud: {
      zh: '云捏脸、云试玩和云游戏不是同一个入口；请看官方活动页确认是否需要下载客户端。',
      en: 'Cloud sculpting, cloud trials, and cloud gaming are not the same entry; check official event pages to see whether a client is required.',
      ja: 'クラウド顔作成、クラウド試遊、クラウドゲームは別物です。公式イベントでクライアント要否を確認。',
    },
    crossPlay: {
      zh: '跨平台存档、服务器和预约奖励绑定需看平台公告；开服前先确认账号与预约页面一致。',
      en: 'Cross-save, servers, and reservation rewards follow platform notices; confirm account and reservation page before launch.',
      ja: 'クロスセーブ、サーバー、予約報酬は告知基準。開始前にアカウントと予約ページを確認。',
    },
    nextLinks: commonLinks('sea', 'platform-download-guide'),
    faq: liveFaq('遗忘之海', 'Sea of Remnants', 'Sea of Remnants'),
  },
  skjh: {
    officialUrl: 'https://skjh.qq.com/',
    status: {
      zh: '失控进化下载优先确认官网、WeGame、移动商店和官方渠道；多端互通与服务器模式要在安装前看清。',
      en: 'Ashfall Evolution downloads should start from the official site, WeGame, mobile stores, and official channels; check cross-play and server mode before installing.',
      ja: '失控進化のDLは公式、WeGame、モバイルストア、公式チャンネルから。多端連携とサーバーモードを事前確認。',
    },
    intro: {
      zh: '承接失控进化官网、下载、PC、手游、云游戏、多端互通、配置和新手 30 分钟路线。',
      en: 'Covers Ashfall Evolution official site, download, PC, mobile, cloud gaming, cross-play, specs, and first-30-minute route.',
      ja: '公式、DL、PC、モバイル、クラウド、多端連携、環境、最初の30分を整理。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC / WeGame', '优先入口', 'Primary entry', '優先入口', '适合建家、PVP 和长时间开荒。', 'Best for base building, PvP, and long progression sessions.', '拠点建築、PvP、長時間進行向き。'),
      platform('iOS / Android / HarmonyOS', '可玩或关注官方状态', 'Live or check official status', '配信中または公式確認', '移动端适合日常、采集和轻量战局。', 'Mobile suits dailies, gathering, and lighter sessions.', '日課、採集、軽めの戦局向き。'),
      platform('Cloud / platform services', '关注官方状态', 'Check official status', '公式状態を確認', '云游戏入口通常跟平台合作活动有关。', 'Cloud access often depends on platform partnerships.', 'クラウド入口はプラットフォーム提携に依存。'),
    ],
    specs: specs('生存建造类游戏建议优先保证稳定帧率、网络延迟和磁盘空间。', 'For survival-building games, prioritize stable frame rate, network latency, and disk space.', 'サバイバル建築では安定FPS、回線遅延、容量を優先。'),
    cloud: cloudOfficial(),
    crossPlay: {
      zh: '多端互通、服务器类型和好友同服规则会影响开局选择，安装前先读平台下载 FAQ。',
      en: 'Cross-play, server type, and friend-server rules affect early choices; read the platform FAQ before installing.',
      ja: '多端連携、サーバー種別、フレンド同服ルールが初動に影響するためFAQを確認。',
    },
    nextLinks: commonLinks('skjh', 'download-crossplay-faq'),
    faq: liveFaq('失控进化', 'Ashfall Evolution', '失控進化'),
  },
};

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    Object.keys(GAMES).map((game) => ({ lang, game }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];
  const copy = DOWNLOAD_COPY[gameId];

  if (!gameConfig || !copy) return {};

  const gameName = gameConfig.name[locale];
  const title = locale === 'zh'
    ? `${gameName}下载入口、官网与配置要求`
    : locale === 'ja'
      ? `${gameName} DL・公式入口・必要環境`
      : `${gameName} Download, Official Site & System Requirements`;
  const description = ensureMetaLength(copy.intro[locale], locale);
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/download`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/download`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/download`, languages },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/download`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];
  const copy = DOWNLOAD_COPY[gameId];

  if (!gameConfig || !copy) notFound();

  const gameName = gameConfig.name[locale];

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-game-border bg-game-surface p-6 shadow-xl shadow-black/10 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-game-primary">
              {locale === 'zh' ? '官方入口 / 下载 / 配置' : locale === 'ja' ? '公式入口 / DL / 環境' : 'Official Entry / Download / Specs'}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-game-text md:text-5xl">
              {locale === 'zh'
                ? `${gameName}下载入口与配置要求`
                : locale === 'ja'
                  ? `${gameName} DL入口と必要環境`
                  : `${gameName} Download & System Requirements`}
            </h1>
            <p className="mt-4 text-base leading-7 text-game-text-muted md:text-lg">
              {copy.intro[locale]}
            </p>
          </div>
          <a
            href={copy.officialUrl}
            rel="nofollow noopener noreferrer"
            target="_blank"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-game-primary px-5 py-3 text-sm font-bold text-black transition hover:opacity-90"
          >
            {locale === 'zh' ? '打开官网' : locale === 'ja' ? '公式を開く' : 'Open Official Site'}
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-game-border bg-game-surface-alt p-5">
        <h2 className="mb-2 text-lg font-bold text-game-text">
          {locale === 'zh' ? '当前下载状态' : locale === 'ja' ? '現在のDL状態' : 'Current Download Status'}
        </h2>
        <p className="text-sm leading-6 text-game-text-muted">{copy.status[locale]}</p>
        <p className="mt-3 rounded-xl border border-game-border bg-game-surface p-4 text-xs leading-6 text-game-text-muted">
          {copy.officialNote[locale]}
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-game-text">
            {locale === 'zh' ? '平台入口怎么选' : locale === 'ja' ? 'プラットフォーム選択' : 'Choose a Platform'}
          </h2>
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {locale === 'zh' ? '安全优先' : locale === 'ja' ? '安全優先' : 'Safety first'}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.platforms.map((platformInfo) => (
            <article key={platformInfo.name} className="rounded-2xl border border-game-border bg-game-surface p-5">
              <h3 className="text-lg font-bold text-game-text">{platformInfo.name}</h3>
              <p className="mt-2 text-sm font-semibold text-game-primary">{platformInfo.status[locale]}</p>
              <p className="mt-3 text-sm leading-6 text-game-text-muted">{platformInfo.note[locale]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title={locale === 'zh' ? '配置与空间' : locale === 'ja' ? '環境と容量' : 'Specs & Storage'}
          items={copy.specs.map((item) => item[locale])}
        />
        <InfoCard
          title={locale === 'zh' ? '云游戏 / 云试玩' : locale === 'ja' ? 'クラウド / 試遊' : 'Cloud / Trial'}
          items={[copy.cloud[locale]]}
        />
        <InfoCard
          title={locale === 'zh' ? '账号与互通' : locale === 'ja' ? 'アカウント連携' : 'Account & Cross-save'}
          items={[copy.crossPlay[locale]]}
        />
      </section>

      <section className="rounded-2xl border border-game-border bg-game-surface p-5">
        <h2 className="mb-4 text-xl font-bold text-game-text">
          {locale === 'zh' ? '下载后下一步' : locale === 'ja' ? 'DL後の次のステップ' : 'Next Steps After Download'}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {copy.nextLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as '/'}
              className="rounded-2xl border border-game-border bg-game-surface-alt p-4 transition hover:border-game-primary hover:bg-game-surface"
            >
              <h3 className="font-bold text-game-text">{link.label[locale]}</h3>
              <p className="mt-2 text-sm leading-6 text-game-text-muted">{link.description[locale]}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-game-border bg-game-surface-alt p-5">
        <h2 className="mb-4 text-xl font-bold text-game-text">
          {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
        </h2>
        <div className="space-y-4">
          {copy.faq.map((item) => (
            <div key={item.question.en} className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="font-semibold text-game-text">{item.question[locale]}</h3>
              <p className="mt-2 text-sm leading-6 text-game-text-muted">{item.answer[locale]}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-2xl border border-game-border bg-game-surface p-5">
      <h2 className="mb-3 text-lg font-bold text-game-text">{title}</h2>
      <ul className="space-y-2 text-sm leading-6 text-game-text-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function platform(name: string, zhStatus: string, enStatus: string, jaStatus: string, zhNote: string, enNote: string, jaNote: string): PlatformInfo {
  return {
    name,
    status: { zh: zhStatus, en: enStatus, ja: jaStatus },
    note: { zh: zhNote, en: enNote, ja: jaNote },
  };
}

function specs(zh: string, en: string, ja: string): LocaleText[] {
  return [
    { zh, en, ja },
    {
      zh: '下载前先确认磁盘空间、系统版本、显卡驱动和网络稳定性。',
      en: 'Before downloading, check disk space, OS version, graphics drivers, and network stability.',
      ja: 'DL前に容量、OS、GPUドライバ、回線安定性を確認してください。',
    },
  ];
}

function cloudOfficial(): LocaleText {
  return {
    zh: '云游戏入口通常按地区、平台合作和账号体系开放，最稳妥做法是从官网或平台商店进入。',
    en: 'Cloud access usually depends on region, platform partnerships, and account systems; the safest path is through the official site or store.',
    ja: 'クラウド入口は地域、提携、アカウント体系に依存します。公式サイトまたはストアから入るのが安全です。',
  };
}

function cloudUnreleased(): LocaleText {
  return {
    zh: '如果官方还没有开放正式下载，所谓云游戏、测试包和抢先安装都需要谨慎核验来源。',
    en: 'If official downloads are not open, verify any cloud access, test package, or early installer very carefully.',
    ja: '正式DLが未公開の場合、クラウド、テストパッケージ、先行インストーラの出所を慎重に確認してください。',
  };
}

function crossSaveHoyoverse(): LocaleText {
  return {
    zh: 'HoYoverse 系游戏跨端体验通常依赖同一账号登录；绑定 Steam、主机或移动端前先确认服务器和邮箱。',
    en: 'HoYoverse cross-device play usually depends on the same account; confirm server and email before linking Steam, console, or mobile.',
    ja: 'HoYoverse作品のクロス端末は同一アカウントが基本です。Steam、コンソール、モバイル連携前にサーバーとメールを確認。',
  };
}

function unreleasedCrossPlay(): LocaleText {
  return {
    zh: '跨平台、跨服和存档规则在测试期可能调整，最终以公测或正式上线公告为准。',
    en: 'Cross-platform, server, and save rules can change during testing; final rules follow launch notices.',
    ja: 'クロスプラットフォーム、サーバー、セーブ規則はテスト中に変わる可能性があり、正式告知を基準にしてください。',
  };
}

function unreleasedPlatforms(): PlatformInfo[] {
  return [
    platform('Official site', '优先确认', 'Check first', '最優先確認', '官网是测试资格、预约和下载状态的第一入口。', 'The official site is the first stop for test access, preregistration, and download status.', '公式サイトはテスト資格、事前登録、DL状態の第一入口です。'),
    platform('PC', '等待官方开放', 'Wait for official access', '公式開放待ち', '不要安装第三方不明客户端。', 'Do not install unknown third-party clients.', '不明な第三者クライアントは避けてください。'),
    platform('iOS / Android / Console', '看平台商店', 'Check platform stores', 'ストア確認', '愿望单、预约和测试名额以商店或官方社区为准。', 'Wishlist, preregistration, and test slots follow stores or official communities.', 'ウィッシュリスト、予約、テスト枠はストアまたは公式コミュニティ基準。'),
  ];
}

function commonLinks(gameId: GameId, guideSlug: string) {
  return [
    {
      href: `/${gameId}/version`,
      label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' },
      description: { zh: '确认当前版本、活动、角色和时间节点。', en: 'Check the current patch, events, characters, and timing.', ja: '現在の版本、イベント、キャラ、時期を確認。' },
    },
    {
      href: `/${gameId}/guides/${guideSlug}`,
      label: { zh: '下载/入坑攻略', en: 'Starter guide', ja: '入門ガイド' },
      description: { zh: '继续查看更细的安装、账号、平台或首日路线。', en: 'Continue into install, account, platform, or day-one routing details.', ja: 'インストール、アカウント、平台、初日ルートを詳しく確認。' },
    },
    {
      href: `/${gameId}/redeem-codes`,
      label: { zh: '兑换码与福利', en: 'Codes & rewards', ja: 'コードと報酬' },
      description: { zh: '下载完成后先检查礼包码、预约奖励和版本福利。', en: 'After installing, check gift codes, reservation rewards, and patch bonuses.', ja: 'DL後にコード、予約報酬、版本報酬を確認。' },
    },
  ];
}

function liveFaq(zhName: string, enName: string, jaName: string) {
  return [
    {
      question: { zh: `${zhName}在哪里下载最安全？`, en: `Where is the safest place to download ${enName}?`, ja: `${jaName}はどこでDLするのが安全ですか？` },
      answer: { zh: '优先使用官网、官方启动器、平台商店或官方社区公告给出的入口，不建议使用来历不明的网盘或安装包。', en: 'Use the official site, official launcher, platform stores, or links from official notices. Avoid unknown mirrors or installers.', ja: '公式サイト、公式ランチャー、ストア、公式告知のリンクを使い、不明なミラーやインストーラは避けてください。' },
    },
    {
      question: { zh: '下载前最容易忽略什么？', en: 'What is easiest to miss before downloading?', ja: 'DL前に見落としやすい点は？' },
      answer: { zh: '账号区服、剩余空间、首包大小、资源包更新时间和平台绑定规则最容易被忽略。', en: 'Account region, free storage, base package size, asset update timing, and platform linking rules are easy to miss.', ja: 'アカウント地域、空き容量、初回容量、追加データ時期、連携ルールを見落としがちです。' },
    },
  ];
}

function unreleasedFaq(zhName: string, enName: string, jaName: string) {
  return [
    {
      question: { zh: `${zhName}现在能下载吗？`, en: `Can I download ${enName} now?`, ja: `${jaName}は今DLできますか？` },
      answer: { zh: '如果官网或平台商店没有明确开放下载，就不要把第三方安装包当作正式客户端。先预约、加入愿望单或等待测试资格公告。', en: 'If the official site or store has not opened downloads, do not treat third-party installers as official clients. Preregister, wishlist, or wait for test-access notices.', ja: '公式サイトやストアでDLが開放されていない場合、第三者インストーラを正式版として扱わないでください。予約、ウィッシュリスト、テスト告知を待ちましょう。' },
    },
    {
      question: { zh: '为什么页面不直接给倒计时？', en: 'Why not show a fixed countdown?', ja: 'なぜ固定カウントダウンを出さないのですか？' },
      answer: { zh: '未上线游戏的测试、预下载和公测节点经常调整。这里优先给官方入口和准备清单，避免误导玩家。', en: 'Test, preload, and launch dates often change before release. This page prioritizes official entry points and preparation steps to avoid misleading players.', ja: '未配信ゲームのテスト、事前DL、正式開始日は変わりやすいため、公式入口と準備事項を優先しています。' },
    },
  ];
}
