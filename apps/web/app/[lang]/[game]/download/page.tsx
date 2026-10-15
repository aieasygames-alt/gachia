import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';

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
  primaryRole?: LocaleText;
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

const DOWNLOAD_COPY: Partial<Record<GameId, DownloadCopy>> = {
  hi3: {
    officialUrl: 'https://honkaiimpact3.hoyoverse.com/',
    status: {
      zh: '下载前先确认地区、服务器与账号体系。本站版本档案参考全球服公告，国服和其他地区的活动、补给与客户端入口需分别核对。',
      en: 'Confirm region, server, and account system before downloading. This site’s version archive references global notices; verify CN and other regional events, supplies, and client entry points separately.',
      ja: 'ダウンロード前に地域、サーバー、アカウント体系を確認。本サイトのバージョン資料はグローバル告知を参照し、中国版などのイベント、補給、クライアント入口は個別に確認してください。',
    },
    intro: {
      zh: '从崩坏3官网选择对应地区的客户端，再核对移动端商店发行方、账号登录方式和已有进度。安装完成后，可继续查看版本档案、新手回归路线与材料资料。',
      en: 'Choose the regional client from the official HI3 site, then verify the mobile store publisher, sign-in method, and existing progress. After installation, continue to the version archive, returnee route, and materials.',
      ja: '崩壊3rd公式サイトで地域に合うクライアントを選び、モバイルストアの配信元、ログイン方法、既存進行を確認。インストール後はバージョン資料、復帰ルート、素材資料へ進めます。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC', '官网入口', 'Official entry', '公式入口', '从地区官网进入下载，安装前核对发行方与账号登录方式。', 'Use the regional official download and verify publisher and sign-in method.', '地域公式サイトからDLし、配信元とログイン方法を確認。'),
      platform('iOS / Android', '地区商店入口', 'Regional stores', '地域ストア入口', '通过官网跳转至对应商店，核对商店地区与现有账号所属服务器。', 'Follow official store links and verify store region and the server of your existing account.', '公式ストアリンクを利用し、ストア地域と既存アカウントのサーバーを確認。'),
    ],
    specs: specs('安装前核对官网当前配置、启动器所需空间和游戏内资源包大小；更新解压需要额外空闲空间。', 'Check current official requirements, launcher storage, and in-game asset size before installing; updates need additional extraction space.', 'インストール前に公式の現行環境、ランチャー容量、追加データ容量を確認。更新展開用の空き容量も確保してください。'),
    cloud: {
      zh: '云游戏服务与地区入口请从官方渠道核对，登录前确认账号和服务器。',
      en: 'Verify cloud services and regional availability through official channels; confirm account and server before signing in.',
      ja: 'クラウドサービスと地域対応は公式で確認し、ログイン前にアカウントとサーバーを確認してください。',
    },
    crossPlay: {
      zh: '换设备前确认客户端地区、账号体系和服务器一致。遇到新建角色或进度不符时，先核对登录方式与服务器，再联系官方客服；账号绑定与数据互通以官方说明为准。',
      en: 'Before changing devices, match client region, account system, and server. If progress differs or a new profile appears, check sign-in method and server before contacting support. Follow official account-linking and cross-save instructions.',
      ja: '端末変更前にクライアント地域、アカウント体系、サーバーを合わせてください。進行が違う場合はログイン方法とサーバーを確認し、公式サポートへ。連携とデータ共有は公式説明に従ってください。',
    },
    nextLinks: [
      { href: '/hi3/version', label: { zh: '版本档案', en: 'Version archive', ja: 'バージョン資料' }, description: { zh: '查看已收录角色、人偶、装备与圣痕', en: 'Browse recorded units, AstralOps, gear, and stigmata', ja: '収録済み戦乙女、人偶、装備、聖痕を確認' } },
      { href: '/hi3/guides/new-returning-captain-route', label: { zh: '新手与回归路线', en: 'New and returning Captain route', ja: '初心者・復帰ルート' }, description: { zh: '安装后核对账号、活动与资源', en: 'Check account, events, and resources after installation', ja: 'インストール後のアカウント、イベント、資源確認' } },
    ],
    faq: [{
      question: { zh: '换设备后为什么看不到原有进度？', en: 'Why is my progress missing after changing devices?', ja: '端末変更後に進行が見つからないのは？' },
      answer: { zh: '先检查客户端地区、登录方式、账号与服务器是否和之前一致。仍无法找到时，通过官网客服入口提供账号信息进行核查。', en: 'Check that client region, sign-in method, account, and server match your previous device. If progress is still missing, contact official support through the site.', ja: 'クライアント地域、ログイン方法、アカウント、サーバーが以前と同じか確認し、見つからない場合は公式サイトのサポートに連絡してください。' },
    }],
  },
  genshin: {
    officialUrl: 'https://genshin.hoyoverse.com/',
    status: {
      zh: '原神已长期上线，PC、移动端和主机端均以 HoYoverse 官方入口及平台商店为准。',
      en: 'Genshin Impact is live across PC, mobile, and console; use HoYoverse official entry points and platform stores.',
      ja: '原神はPC、モバイル、コンソールで配信中です。HoYoverse公式入口と各ストアを基準にしてください。',
    },
    intro: {
      zh: '这个页面先帮你确认原神官网、下载、云游戏、配置要求和兑换码入口，再继续查看版本、地图和养成路线。',
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
      zh: '这里集中处理星铁下载、官网、云游戏、配置、兑换码和 4.6 版本入坑路径。',
      en: 'Use this hub for Star Rail download, official links, cloud gaming, specs, codes, and v4.6 onboarding.',
      ja: 'DL、公式、クラウド、環境、コード、v4.6入門をまとめます。',
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
    nextLinks: commonLinks('starrail', 'banner-schedule-guide'),
    faq: liveFaq('崩坏：星穹铁道', 'Honkai: Star Rail', 'スターレイル'),
  },
  wuwa: {
    officialUrl: 'https://wutheringwaves.kurogames.com/',
    status: {
      zh: '鸣潮已上线并进入 3.7 实装期。下载、资源分级包、Xbox / Game Pass 账号与商店入口仍应以官方和平台公告为准。',
      en: 'Wuthering Waves is live and in its v3.7 release window. Verify downloads, tiered resource packages, and Xbox/Game Pass account or store details through official and platform notices.',
      ja: '鳴潮は配信中でVer.3.7実装期間です。DL、段階リソース、Xbox/Game Passのアカウントとストア入口は公式とプラットフォーム告知を基準にしてください。',
    },
    intro: {
      zh: '集中查看鸣潮下载、官网、国际服、Xbox、云游戏、配置、3.7 资源下载与新玩家入坑问题。',
      en: 'A hub for Wuthering Waves download, official links, global server, Xbox, cloud gaming, specs, v3.7 resource downloads, and new-player onboarding.',
      ja: 'DL、公式、グローバル、Xbox、クラウド、環境、Ver.3.7のリソースDL、新規入門を整理します。',
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
    nextLinks: commonLinks('wuwa', 'banner-schedule-guide'),
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
      zh: '集中查看异环官网、下载、配置、云游戏、兑换码、Shinku/Iroi 和 1.2 版本入坑问题。',
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
      zh: '集中查看绝区零 Steam 下载、账号绑定、云游戏、兑换码、配置、3.3 观察和 3.2 后回流入坑问题。',
      en: 'Covers ZZZ Steam download, account linking, cloud gaming, codes, specs, v3.3 watch items, and v3.2+ starter questions.',
      ja: 'Steam DL、アカウント連携、クラウド、コード、環境、v3.3観察、v3.2以降の復帰/入門を整理。',
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
      zh: '集中查看归环官网、下载、公测时间、测试资格、配置和时间循环玩法问题。',
      en: 'Covers Guihuan official site, downloads, release timing, test access, specs, and time-loop gameplay intent.',
      ja: '公式、DL、リリース時期、テスト資格、環境、時間ループ情報を確認。',
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
      zh: '无限大官网已更新为 2027年1月15日全球上线，平台为 PS5、PC、Android 和 iOS；预下载、包体和区服仍以官方入口为准。',
      en: 'Ananta is listed for global release on January 15, 2027, on PS5, PC, Android, and iOS; preload, package size, and servers still follow official entries.',
      ja: 'Anantaは2027年1月15日グローバル配信予定で、対応はPS5、PC、Android、iOSです。事前DL、容量、サーバーは公式入口を確認してください。',
    },
    intro: {
      zh: '集中查看无限大官网、2027年1月15日上线、PS5、PC、Android、iOS、预下载、无抽卡、网易和配置问题。',
      en: 'Covers Ananta official site, January 15 2027 launch, PS5, PC, Android, iOS, preload, no-gacha model, NetEase, and specs.',
      ja: '公式、2027年1月15日配信、PS5、PC、Android、iOS、事前DL、ガチャなし、NetEase、環境検索を整理。',
    },
    officialNote: {
      zh: '发布日期和平台已可按官方最新信息处理；具体开服时间、预下载开启、PC 配置、账号互通和商业模式细节仍等待官方后续公告。',
      en: 'The release date and platforms can now follow the latest official wording; exact server time, preload, PC specs, cross-save, and monetization details still need later notices.',
      ja: '配信日と対応機種は最新公式情報に従えますが、正確な開始時刻、事前DL、PC環境、クロスセーブ、収益モデル詳細は続報待ちです。',
    },
    platforms: [
      platform('PlayStation 5', '已确认平台', 'Confirmed platform', '対応予定', '关注 PlayStation Store 页面、预载、账号区域和主机版本说明。', 'Watch the PlayStation Store page, preload, account region, and console-version notes.', 'PS Store、事前DL、アカウント地域、コンソール版情報を確認。'),
      platform('PC', '已确认平台', 'Confirmed platform', '対応予定', '关注官网启动器、配置要求、预下载包体和登录方式。', 'Check the official launcher, specs, preload package, and login method.', '公式ランチャー、必要環境、事前DL容量、ログイン方式を確認。'),
      platform('iOS / Android', '已确认平台', 'Confirmed platform', '対応予定', '移动端下载前确认商店预约、设备要求、资源包大小和地区开放。', 'Before mobile download, confirm store reservation, device requirements, asset size, and regional access.', 'モバイルDL前にストア予約、端末要件、追加データ容量、地域対応を確認。'),
    ],
    specs: specs('先按开放世界动作游戏准备 PC / 移动端空间；PS5、PC、Android、iOS 的最终配置和容量以官方下载页为准。', 'Prepare storage for an open-world action game; final PS5, PC, Android, and iOS specs and size should follow the official download page.', 'オープンワールドアクション向けに容量を準備し、PS5/PC/Android/iOSの最終環境と容量は公式DLページを確認。'),
    cloud: cloudUnreleased(),
    crossPlay: unreleasedCrossPlay(),
    nextLinks: commonLinks('ananta', 'release-date-beta-pc-faq'),
    faq: [
      {
        question: { zh: '无限大什么时候上线？', en: 'When does Ananta release?', ja: 'Anantaの配信日はいつですか？' },
        answer: { zh: '当前官网信息显示全球上线日期为 2027年1月15日。', en: 'The current official-site wording lists global release on January 15, 2027.', ja: '現在の公式情報ではグローバル配信日は2027年1月15日です。' },
      },
      {
        question: { zh: '无限大有哪些平台？', en: 'Which Ananta platforms are confirmed?', ja: 'Anantaの対応プラットフォームは？' },
        answer: { zh: 'PS5、PC、Android 和 iOS 是当前确认平台；其他平台等待官方后续说明。', en: 'PS5, PC, Android, and iOS are currently confirmed; wait for official updates on any other platforms.', ja: '現時点ではPS5、PC、Android、iOSが確認済みです。その他は続報待ちです。' },
      },
      {
        question: { zh: '现在能下载无限大吗？', en: 'Can I download Ananta now?', ja: 'Anantaは今DLできますか？' },
        answer: { zh: '上线前请只使用官网、官方商店或官方测试资格入口，避免第三方安装包。', en: 'Before launch, use only the official site, official stores, or official test access, and avoid third-party installers.', ja: '配信前は公式サイト、公式ストア、公式テスト入口のみ利用し、非公式インストーラは避けてください。' },
      },
    ],
  },
  endfield: {
    officialUrl: 'https://endfield.hypergryph.com/',
    status: {
      zh: '终末地下载、测试资格、Pioneer Test 复盘和平台状态请以鹰角官方、商店与测试公告为准。',
      en: 'Endfield downloads, test access, Pioneer Test recaps, and platform status should follow Hypergryph, stores, and test notices.',
      ja: 'EndfieldのDL、テスト資格、Pioneer Test回顧、プラットフォーム状態はHypergryph公式、ストア、テスト告知を基準にしてください。',
    },
    intro: {
      zh: '集中查看终末地官网、下载、配置、云游戏、角色、AIC 工厂和 Pioneer Test 后续问题。',
      en: 'Covers Endfield official site, downloads, specs, cloud gaming, operators, AIC factory, and post-Pioneer-Test intent.',
      ja: '公式、DL、環境、クラウド、オペレーター、AIC工場、Pioneer Test後の検索を整理。',
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
      zh: '集中查看遗忘之海官网入口、官网下载、移动端下载、Steam、TapTap、iOS、Android、配置、云游戏、平台互通和开服排错路线。',
      en: 'Covers Sea of Remnants official site, download, specs, cloud gaming, platforms, PC open beta, and launch-day routing.',
      ja: '公式、DL、環境、クラウド、プラットフォーム、PC CBT、初日ルートを整理。',
    },
    primaryRole: {
      zh: '这是遗忘之海下载相关搜索的主入口：先在这里确认官网、Steam、TapTap、iOS、Android 和云游戏，再进入细分安装指南。',
      en: 'This is the main Sea of Remnants download hub: verify official, Steam, mobile, and cloud routes here before opening detailed guides.',
      ja: 'Sea of Remnantsの主DL入口です。公式、Steam、モバイル、クラウドを確認してから詳細ガイドへ進みます。',
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
      zh: '集中查看失控进化官网入口、官网下载、WeGame、PC 电脑版、手游入口、云游戏、多端互通、服务器模式、配置和新手 30 分钟路线。',
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
    nextLinks: commonLinks('skjh', 'platform-download-guide'),
    faq: liveFaq('失控进化', 'Ashfall Evolution', '失控進化'),
  },
  roco: {
    officialUrl: 'https://www.rocokingdom.com/',
    status: {
      zh: '国际服首轮全球封闭测试（CBT）定于 2026-10-27 开启，报名通道已在官网开放；CBT 可玩平台为 PC、iOS、Android，正式版将扩展至 PS5、Xbox、Steam、Epic 与 Microsoft Store。',
      en: 'The first global Closed Beta Test (CBT) starts on October 27, 2026, with pre-registration open now on the official site; the CBT is playable on PC, iOS, and Android, with PS5, Xbox, Steam, Epic, and Microsoft Store arriving at full release.',
      ja: '初回グローバルCBTは2026年10月27日開始予定で、公式サイトで事前登録受付中。CBTはPC、iOS、Androidでプレイ可能。PS5、Xbox、Steam、Epic、MS Storeは正式版で対応予定。',
    },
    intro: {
      zh: '集中查看《洛克王国:世界》国际服官网入口、CBT 报名与下载、CBT 可玩平台（PC/iOS/Android）、正式版平台（PS5/Xbox/Steam/Epic/MS Store）、配置要求和预约福利，再继续看 CBT 注册指南、版本时间线和兑换码。',
      en: 'A hub for Roco Kingdom official site, CBT pre-registration and download, CBT platforms (PC/iOS/Android), full-release platforms (PS5/Xbox/Steam/Epic/MS Store), specs, and pre-registration rewards, then routing into the CBT guide, version timeline, and redeem codes.',
      ja: 'ロコキングダム公式サイト、CBT事前登録とDL、CBT対応平台（PC/iOS/Android）、正式版平台（PS5/Xbox/Steam/Epic/MS Store）、推奨環境、予約特典をまとめ、CBTガイド、版本、交換コードへ案内します。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('Official site', '优先入口', 'Primary entry', '優先入口', 'CBT 报名、资格查询和下载状态的第一入口。', 'The first stop for CBT signup, eligibility, and download status.', 'CBT応募、資格確認、DL状態の第一入口。'),
      platform('PC (Windows)', 'CBT 可玩', 'Playable in CBT', 'CBT対応', '10/27 首测可玩平台之一，客户端入口以官网为准。', 'One of the playable CBT platforms starting October 27; client entry follows the official site.', '10/27のCBTでプレイ可能な平台の一つ。クライアントは公式サイト基準。'),
      platform('iOS', 'CBT 可玩', 'Playable in CBT', 'CBT対応', '10/27 首测可玩平台之一，下载以上架后的 App Store 为准。', 'One of the playable CBT platforms starting October 27; download follows App Store availability.', '10/27のCBT対応平台。DLはApp Store配信基準。'),
      platform('Android', 'CBT 可玩', 'Playable in CBT', 'CBT対応', '10/27 首测可玩平台之一，下载以 Google Play 等商店上架为准。', 'One of the playable CBT platforms starting October 27; download follows Google Play availability.', '10/27のCBT対応平台。DLはGoogle Play等の配信基準。'),
      platform('PS5 / Xbox / Steam / Epic / MS Store', '正式版平台', 'Full-release platforms', '正式版平台', '属于正式版而非 CBT；Steam 商店页已上线但锁国区，国际服下载以官网为准。', 'These are full-release platforms, not CBT; the Steam page is live but region-locked for CN — use the official site for the international version.', '正式版のみの対応。Steamページは公開済みだが中国リージョンはロック中。国際版は公式サイト基準。'),
    ],
    specs: specs('开放世界精灵收集游戏对存储和网络稳定性有要求，CBT 具体配置与包体大小以官方公告为准。', 'An open-world creature-collector needs storage and stable network; exact CBT specs and package size follow official notices.', 'オープンワールド捕獲ゲームは容量と安定回線が必要です。CBTの推奨環境と容量は公式告知を確認。'),
    cloud: cloudUnreleased(),
    crossPlay: unreleasedCrossPlay(),
    nextLinks: [
      {
        href: '/roco/guides/cbt-registration-guide',
        label: { zh: 'CBT 报名指南', en: 'CBT registration', ja: 'CBT応募' },
        description: { zh: '确认报名问卷、资格邮件、平台和测试前检查。', en: 'Check questionnaire, eligibility mail, platforms, and pre-test steps.', ja: '応募フォーム、資格メール、平台、テスト前確認を整理。' },
      },
      {
        href: '/roco/version',
        label: { zh: 'CBT 时间线', en: 'CBT timeline', ja: 'CBT日程' },
        description: { zh: '跟进 2026-10-27 CBT、平台边界和正式版计划。', en: 'Track the Oct 27, 2026 CBT, platform scope, and full-release plan.', ja: '2026-10-27 CBT、平台範囲、正式版予定を確認。' },
      },
      {
        href: '/roco/characters',
        label: { zh: '精灵图鉴', en: 'Jinie wiki', ja: 'ジニー図鑑' },
        description: { zh: '下载前先看已曝光精灵、属性和进化链。', en: 'Review revealed Jinies, types, and evolution lines before downloading.', ja: 'DL前に公開ジニー、属性、進化を確認。' },
      },
      {
        href: '/roco/map',
        label: { zh: '地图核验入口', en: 'Map watch', ja: 'マップ確認' },
        description: { zh: '记录 CBT 后需要补的区域、捕捉点和路线。', en: 'Track regions, capture spots, and routes queued for CBT checks.', ja: 'CBT後に確認する地域、捕獲地点、ルートを追跡。' },
      },
    ],
    faq: [
      {
        question: { zh: '国际服 CBT 怎么报名？', en: 'How do I sign up for the international CBT?', ja: '国際CBTにはどう申し込む？' },
        answer: { zh: '前往官网 www.rocokingdom.com 报名并完成预注册，测试资格、设备要求和后续下载说明都以官方邮件与官网公告为准。', en: 'Pre-register on the official site at www.rocokingdom.com; eligibility, device requirements, and download instructions follow official emails and site notices.', ja: '公式サイト（www.rocokingdom.com）で事前登録を完了してください。資格、端末要件、DL手順は公式メールと告知基準です。' },
      },
      {
        question: { zh: '国际服和国服数据互通吗？', en: 'Do the international and CN versions share data?', ja: '国際版と中国版のデータは共有されますか？' },
        answer: { zh: '不互通。官方明确国际服与国服数据相互独立，国际服正式版支持繁中、英文、日文等多语言。', en: 'No. Tencent confirmed the international and CN versions have independent data; the global release supports Traditional Chinese, English, Japanese, and more.', ja: 'いいえ。国際版と中国版のデータは独立しています。国際版は繁体中文、英語、日本語などに対応予定です。' },
      },
    ],
  },
  'roco-cn': {
    officialUrl: 'https://rocom.qq.com/',
    status: {
      zh: '国服已全平台上线，PC、安卓、iOS、鸿蒙多端数据互通；下载入口以官网 rocom.qq.com、WeGame 与平台商店为准。',
      en: 'The CN version is live across PC, Android, iOS, and HarmonyOS with cross-device progress; download from rocom.qq.com, WeGame, and platform stores.',
      ja: '中国版は全プラットフォームで配信中。PC、Android、iOS、HarmonyOSでデータ共有。DLはrocom.qq.com、WeGame、ストア基準。',
    },
    intro: {
      zh: '集中查看《洛克王国:世界》国服官网、官网下载、WeGame、移动端、配置要求和账号互通规则。',
      en: 'A hub for the CN version official site, download, WeGame, mobile, specs, and account linking rules.',
      ja: '中国版の公式サイト、DL、WeGame、モバイル、環境、アカウント連携をまとめます。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC / WeGame', '优先入口', 'Primary entry', '優先入口', '官网下载或 WeGame 商店搜索「洛克王国:世界」即可获取客户端。', 'Download from the official site or search "洛克王国:世界" on WeGame.', '公式サイトまたはWeGameで入手できます。'),
      platform('iOS / Android / HarmonyOS', '可玩', 'Live', '配信中', '多端互通，同一 QQ/微信账号可在任意设备登录并同步进度。', 'Cross-device progress; log in with the same QQ/WeChat account on any device.', '複数端末で進行共有。同じQQ/WeChatアカウントでログイン。'),
      platform('Mobile / PC 互通', '数据互通', 'Cross-device', 'データ共有', 'QQ 与微信账号数据独立，可添加游戏内学号一起游玩。', 'QQ and WeChat data are separate; link via in-game UID.', 'QQとWeChatのデータは別管理。ゲーム内UIDで共有可能。'),
    ],
    specs: specs('移动端建议预留 30GB 以上、PC 端 45GB 以上空间，推荐使用固态硬盘。', 'Reserve 30GB+ on mobile and 45GB+ on PC; an SSD is recommended.', 'モバイルは30GB以上、PCは45GB以上を確保し、SSDを推奨。'),
    cloud: cloudOfficial(),
    crossPlay: {
      zh: 'PC、安卓、iOS、鸿蒙多端账号与数据互通；QQ 和微信账号数据独立，绑定前先确认登录方式。',
      en: 'PC, Android, iOS, and HarmonyOS share account progress; QQ and WeChat data are separate, so confirm login before linking.',
      ja: 'PC、Android、iOS、HarmonyOSでデータ共有。QQとWeChatは別データのため連携前にログイン方式を確認。',
    },
    nextLinks: [
      {
        href: '/roco-cn/version',
        label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' },
        description: { zh: '确认当前版本、赛季、活动和时间节点。', en: 'Check the current patch, season, events, and timing.', ja: '現在の版本、シーズン、イベント、時期を確認。' },
      },
      {
        href: '/roco-cn/characters',
        label: { zh: '精灵图鉴', en: 'Jinie wiki', ja: 'ジニー図鑑' },
        description: { zh: '下载后继续筛选精灵、属性、技能和进化链。', en: 'After install, filter Jinies by type, skills, and evolution lines.', ja: 'DL後にジニー、属性、スキル、進化を確認。' },
      },
      {
        href: '/roco-cn/redeem-codes',
        label: { zh: '兑换码与福利', en: 'Codes & rewards', ja: 'コードと報酬' },
        description: { zh: '查看礼包码、预约奖励和版本福利。', en: 'Check gift codes, reservation rewards, and patch bonuses.', ja: 'コード、予約報酬、版本報酬を確認。' },
      },
      {
        href: '/roco-cn/map',
        label: { zh: '地图与资源路线', en: 'Map & routes', ja: 'マップとルート' },
        description: { zh: '把区域、捕捉点、活动和后续商人刷新串起来。', en: 'Connect regions, captures, events, and future merchant refreshes.', ja: '地域、捕獲、イベント、商人更新へ接続。' },
      },
    ],
    faq: liveFaq('洛克王国:世界', 'Roco Kingdom (CN)', 'ロコキングダム（中国版）'),
  },
  aniimo: {
    officialUrl: 'https://www.aniimo.com/',
    status: {
      zh: '伊莫（Aniimo）官方日期为 PC/主机 2026-09-16，移动端 2026-09-23；下载入口以官网、Steam、Epic、Xbox、PlayStation、App Store 与 Google Play 为准。',
      en: 'Aniimo is officially dated for PC/console on 2026-09-16 and mobile on 2026-09-23; use the official site and platform stores.',
      ja: 'アニモ（Aniimo）はPC/コンソールが2026-09-16、モバイルが2026-09-23予定。公式サイトと各ストアを確認してください。',
    },
    intro: {
      zh: '这里集中查看伊莫官网、发售日期、平台入口、预注册奖励、兑换码状态、PC/主机上线后核验和移动端倒计时。',
      en: 'Use this hub for Aniimo official links, release dates, platform stores, pre-registration rewards, code status, PC/console post-launch checks, and the mobile countdown.',
      ja: '公式リンク、発売日、ストア、事前登録報酬、コード状態、PC/コンソール配信後確認、モバイルカウントダウンをまとめます。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [
      platform('PC / Steam / Epic', '2026-09-16', '2026-09-16', '2026-09-16', 'PC 端优先确认 Steam、Epic 与官网公告。', 'Check Steam, Epic, and official news first for PC.', 'PCはSteam、Epic、公式告知を確認。'),
      platform('Xbox / PlayStation', '2026-09-16', '2026-09-16', '2026-09-16', '主机端以对应平台商店开放时间为准。', 'Console timing follows each platform store.', 'コンソールは各ストアの公開時間基準。'),
      platform('iOS / Android', '2026-09-23', '2026-09-23', '2026-09-23', '移动端比 PC/主机晚一周，注意地区商店可见性。', 'Mobile follows one week later; store visibility can vary by region.', 'モバイルは1週間後。地域ごとの表示差に注意。'),
    ],
    specs: specs('正式配置和包体大小以官方公告与平台商店为准，避免使用非官方 APK 或安装器。', 'Final specs and size should follow official notices and platform stores; avoid unofficial APKs or installers.', '最終環境と容量は公式告知とストア基準。非公式APKやインストーラーは避けてください。'),
    cloud: {
      zh: '暂未确认官方云游戏入口；如果平台商店新增云游或试玩入口，以上线后公告为准。',
      en: 'No official cloud gaming entry is confirmed yet; follow post-launch platform notices if one appears.',
      ja: '公式クラウド入口は未確認です。追加時はリリース後の告知を確認してください。',
    },
    crossPlay: {
      zh: '跨平台账号、服务器和进度规则等待正式上线说明，建议注册时保留同一账号体系。',
      en: 'Cross-platform account, server, and progress rules are awaiting launch details; keep one account ecosystem where possible.',
      ja: 'クロス進行とサーバー規則は正式告知待ち。同じアカウント体系を使うのが無難です。',
    },
    nextLinks: [
      {
        href: '/aniimo/guides/release-date',
        label: { zh: '发售日期', en: 'Release dates', ja: '発売日' },
        description: { zh: '确认 PC/主机与移动端两个上线日期。', en: 'Check PC/console and mobile launch dates.', ja: 'PC/コンソールとモバイルの日程を確認。' },
      },
      {
        href: '/aniimo/characters',
        label: { zh: 'Aniimo 图鉴', en: 'Aniimo database', ja: 'Aniimo図鑑' },
        description: { zh: '查看 89 个 Aniimo 的元素、阶段、区域和进化线。', en: 'Browse 89 Aniimo by element, stage, region, and evolution line.', ja: '89体の元素、段階、地域、進化ラインを確認。' },
      },
      {
        href: '/aniimo/map',
        label: { zh: '区域地图', en: 'Region map', ja: '地域マップ' },
        description: { zh: '从 6 个区域继续看已知 Aniimo 和上线后刷新点核验。', en: 'Use 6 regions to track known Aniimo and post-launch spawn checks.', ja: '6地域から既知Aniimoと出現確認を追跡。' },
      },
      {
        href: '/aniimo/redeem-codes',
        label: { zh: '兑换码与奖励', en: 'Codes & rewards', ja: 'コードと報酬' },
        description: { zh: '区分暂无兑换码和已确认预注册奖励。', en: 'Separate code status from confirmed launch rewards.', ja: 'コード状態と事前登録報酬を分けて確認。' },
      },
    ],
    faq: liveFaq('伊莫', 'Aniimo', 'アニモ'),
  },
  'azur-promilia': {
    officialUrl: 'https://azurpromilia.com/',
    status: {
      zh: '蓝色星原：旅谣的上线时间、平台和下载状态等待官方公告确认。',
      en: 'Azur Promilia launch timing, platforms, and download status await official confirmation.',
      ja: 'アズールプロミリアの配信時期、対応機種、ダウンロード情報は公式発表待ちです。',
    },
    intro: {
      zh: '这里仅提供官方信息核对入口，不展示未经确认的下载包、测试资格或设备要求。',
      en: 'This hub provides official-information checks only; unverified downloads, test access, and device requirements are not listed.',
      ja: '公式情報の確認入口のみを掲載し、未確認のDL、テスト参加条件、端末要件は掲載しません。',
    },
    officialNote: DEFAULT_STATUS,
    platforms: [],
    specs: specs('等待官方设备要求。', 'Awaiting official device requirements.', '公式端末要件を確認中。'),
    cloud: { zh: '尚未确认官方云游戏入口。', en: 'No official cloud gaming entry is confirmed.', ja: '公式クラウド入口は未確認です。' },
    crossPlay: { zh: '跨平台账号与进度规则等待官方说明。', en: 'Cross-platform account and progress rules await official details.', ja: 'クロス進行とアカウント規則は公式発表待ちです。' },
    nextLinks: [],
    faq: liveFaq('蓝色星原：旅谣', 'Azur Promilia', 'アズールプロミリア'),
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
    ? `${gameName}下载｜官网入口、官网下载与配置要求`
    : locale === 'ja'
      ? `${gameName} DL・公式入口・必要環境`
      : `${gameName} Download, Official Site & System Requirements`;
  const description = ensureMetaLength(copy.intro[locale], locale);
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/download`, LOCALES);

  return {
    title,
    description,
    alternates,
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
    <div className="space-y-8">
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
            {copy.primaryRole && (
              <p className="mt-4 rounded-2xl border border-game-border bg-game-surface-alt p-4 text-sm leading-6 text-game-text-muted">
                {copy.primaryRole[locale]}
              </p>
            )}
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
    </div>
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
