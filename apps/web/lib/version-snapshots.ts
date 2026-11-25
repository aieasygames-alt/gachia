import type { GameId, SupportedLocale } from '@gachia/core';
import type { LocalizedText, LiveStatus } from './live-content';

export type VersionSnapshotLinkType = 'banner' | 'codes' | 'characters' | 'guides' | 'builds' | 'download' | 'map';
export type VersionSnapshotSourceTier = 'official' | 'mixed' | 'third_party_watch' | 'needs_verification';

export interface VersionSnapshotLink {
  type: VersionSnapshotLinkType;
  href: string;
  label: LocalizedText;
}

export interface VersionSnapshotPlatformDate {
  platform: string;
  date: string;
  time?: string;
}

export interface VersionSnapshot {
  gameId: GameId;
  currentVersion: string;
  releaseDate?: string;
  dateKind?: 'release' | 'announcement' | 'verified';
  sourceUrls?: string[];
  status: LiveStatus;
  lastUpdatedAt: string;
  sourceTier?: VersionSnapshotSourceTier;
  platformReleaseDates?: VersionSnapshotPlatformDate[];
  summary: LocalizedText;
  whatChanged: LocalizedText[];
  firstSteps: LocalizedText[];
  links: VersionSnapshotLink[];
}

export const VERSION_SNAPSHOT_UPDATED_AT = '2026-10-09';

export const VERSION_SNAPSHOTS: Partial<Record<GameId, VersionSnapshot>> = {
  aniimo: {
    gameId: 'aniimo',
    currentVersion: 'S1 逐风启程',
    releaseDate: '2026-09-23',
    sourceUrls: ["https://www.yimo.com/newslist/detail/100043", "https://www.yimo.com/newslist/detail/100046"],
    status: 'live',
    lastUpdatedAt: '2026-10-18',
    sourceTier: 'official',
    platformReleaseDates: [
      { platform: 'PC / console / cloud', date: '2026-09-16' },
      { platform: 'iOS / Android', date: '2026-09-23' },
    ],
    summary: {
      zh: 'S1「逐风启程」已全平台上线。当前内容重点是新手开荒、虹光研究、家园资源、混沌模式与已知问题的官方核验。',
      en: 'S1 is live across platforms. The current hub prioritizes starter routes, Rainbow research, Homeland resources, Chaos mode, and official known-issue checks.',
      ja: 'S1「逐風啓程」は全プラットフォームで配信中です。初心者ルート、虹光研究、ホームランド資源、混沌モード、公式既知問題を優先します。',
    },
    whatChanged: [{"zh": "10月16日周更新：家园作物增益、10月21日04:00丰收集会与修复；下半赛季预览不等于全部实装。", "en": "October 16 weekly update adds Homeland boosts, the October 21 at 04:00 gathering and fixes. The lower-half preview is not proof of full implementation.", "ja": "10月16日週次更新で作物増益、10月21日04:00集会、修正。下半期プレビューは全実装を意味しません。"},
      {
        zh: '版本页从上线倒计时切换为 S1 实装后的玩法与问题导航。',
        en: 'The hub moves from launch countdown into live S1 systems and issue navigation.',
        ja: 'バージョンページを配信カウントダウンからS1実装後のシステム・問題導線へ切り替えます。',
      },
      {
        zh: '虹光、自选、捕捉和研究进度保持分层，避免把赠送或外观变化写成统一结论。',
        en: 'Rainbow selectors, catches, gifts, and research progress remain separated instead of being presented as one universal rule.',
        ja: '虹光自選、捕獲、配布、研究進行は一律の結論にせず分けて扱います。',
      },
    ],
    firstSteps: [
      {
        zh: '先完成主线与系统引导，再安排捕捉、飞行回访、家园和限时活动。',
        en: 'Finish story and system tutorials before scheduling catches, flight revisits, Homeland, and limited events.',
        ja: 'メイン進行とシステム導入を終えてから、捕獲、飛行での再訪、ホームランド、期間限定イベントを進めます。',
      },
      {
        zh: '领取限时奖励前，核对活动页的条件、区服、结束时间和官方已知问题。',
        en: 'Before claiming a limited reward, verify the event requirements, server scope, end time, and official known issues.',
        ja: '期間限定報酬の受取前に、イベント条件、サーバー範囲、終了時刻、公式既知問題を確認します。',
      },
    ],
    links: [
      { type: 'guides', href: '/aniimo/guides/s1-new-player-route', label: { zh: 'S1 新手路线', en: 'S1 starter route', ja: 'S1 初心者ルート' } },
      { type: 'guides', href: '/aniimo/guides/rainbow-aniimo-guide', label: { zh: '虹光指南', en: 'Rainbow guide', ja: '虹光ガイド' } },
      { type: 'guides', href: '/aniimo/guides/homeland-resource-guide', label: { zh: '家园资源', en: 'Homeland resources', ja: 'ホームランド資源' } },
      { type: 'characters', href: '/aniimo/characters', label: { zh: '伊莫图鉴', en: 'Aniimo index', ja: 'Aniimo 図鑑' } },
      { type: 'map', href: '/aniimo/map', label: { zh: '区域地图', en: 'Region map', ja: '地域マップ' } },
      { type: 'codes', href: '/aniimo/redeem-codes', label: { zh: '兑换码与奖励', en: 'Codes and rewards', ja: 'コードと報酬' } },
    ],
  },
  zzz: {
    gameId: 'zzz',
    currentVersion: "3.3 preview recap / 3.2 live",
    releaseDate: '2026-10-15',
    dateKind: 'verified',
    sourceUrls: ["https://zenless.hoyoverse.com/zh-cn/news/166644", "https://zenless.hoyoverse.com/zh-cn/news/166907"],
    status: 'watch',
    lastUpdatedAt: '2026-10-18',
    sourceTier: 'official',
    summary: {"zh": "10月9日3.3「重返天空的旅程」前瞻已发布，菲欧妮、赛维里安即将登场。节目码已于10月11日23:59:59（UTC+8）失效；3.3上线日期待后续正式公告核验。", "en": "The October 9 v3.3 preview is available and introduces two upcoming agents. Its codes expired October 11 at 23:59:59 UTC+8. Verify the release date in follow-up official notices.", "ja": "10月9日のv3.3番組は公開済みで、新エージェント2名を紹介。番組コードは10月11日23:59:59（UTC+8）に失効。実装日は後続公式告知で確認してください。"},
    whatChanged: [{"zh": "10月17日菲欧妮机制介绍已公开；技能图与数值待逐项整理，不据宣传认定3.3已上线。", "en": "The October 17 Feioni mechanics post is available; images and values need transcription. It does not establish that v3.3 is live.", "ja": "10月17日菲欧妮機構紹介公開。画像・数値の整理は未完で、3.3配信の証明ではありません。"}, {"zh": "已切换到当前官方公告状态，旧前瞻仅作历史参考。", "en": "Coverage follows current official notices; old previews are historical reference.", "ja": "現行公式告知に合わせ、過去の番組は履歴参考として扱います。"}],
    firstSteps: [{"zh": "先检查所在地区/服务器、当前活动和卡池结束时间，再规划资源；未核验的代码不列为有效。", "en": "Check your region, server and live event/banner deadlines before budgeting; unverified codes are not active codes.", "ja": "地域、サーバー、開催中イベントとバナー期限を確認してから計画し、未確認コードを有効扱いしません。"}],
    links: [
      { type: 'codes', href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/zzz/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/zzz/guides/v3-2-livestream-recap-expired-codes', label: { zh: '3.2 复盘', en: 'v3.2 recap', ja: 'v3.2まとめ' } },
      { type: 'download', href: '/zzz/download', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
      { type: 'builds', href: '/zzz/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' } },
    ],
  },
  hi3: {
    gameId: 'hi3',
    currentVersion: 'CN 9.1 时序照新 / Global 9.0 archive',
    releaseDate: '2026-10-18',
    dateKind: 'verified',
    sourceUrls: ['https://bh3.mihoyo.com/'],
    status: 'fresh',
    lastUpdatedAt: '2026-10-18',
    sourceTier: 'official',
    summary: {"zh": "国服官网确认9.1「时序照新」正式上线；具体发布日期、角色、补给与活动细节待完整公告核验。本站全球服9.0资料仍作为档案保留，不代替国服当前状态。", "en": "The CN homepage confirms v9.1 is live; its release date, characters, supplies and events await the full notice. Global v9.0 content remains a separate archive, not current CN guidance.", "ja": "中国公式で9.1配信を確認。配信日・キャラ・補給・イベント詳細は公式全文確認待ち。グローバル9.0は資料として残し、中国版現況と混同しません。"},
    whatChanged: [{"zh": "新增国服9.1状态核验；9.0人偶、装备和资源条目仍注明全球服公告来源，不改写为9.1新增内容。", "en": "Adds a CN v9.1 status check. v9.0 AstralOp, gear and resource records retain Global sourcing and are not relabeled as v9.1 additions.", "ja": "中国版9.1状態を追加。9.0人偶・装備・資源はグローバル出典を保持し、9.1追加として扱いません。"}],
    firstSteps: [
      {
        zh: '先在客户端确认服务器、活动与补给结束时间，再领取仍有效的登录和活动奖励。',
        en: 'Confirm server, event deadlines, and supply end times in the client before claiming any still-active login or event rewards.',
        ja: 'クライアントでサーバー、イベント、補給終了時刻を確認してから、有効なログイン・イベント報酬を受け取ります。',
      },
      {
        zh: '盘点水晶、保底、已有队伍与装备后，才判断新角色或装备是否解决实际缺口。',
        en: 'Audit Crystals, pity, existing teams, and equipment before deciding whether a new unit or weapon solves a real gap.',
        ja: '水晶、天井、所持編成、装備を確認してから、新キャラ・武器が実際の不足を埋めるか判断します。',
      },
    ],
    links: [
      { type: 'guides', href: '/hi3/guides/v9-0-official-update-guide', label: { zh: '9.0 官方总览', en: 'v9.0 official overview', ja: 'Ver.9.0公式総覧' } },
      { type: 'guides', href: '/hi3/version', label: { zh: '9.0 版本档案', en: 'v9.0 archive', ja: 'Ver.9.0アーカイブ' } },
      { type: 'guides', href: '/hi3/guides/new-returning-captain-route', label: { zh: '新手 / 回归路线', en: 'New / returnee route', ja: '初心者 / 復帰ルート' } },
      { type: 'characters', href: '/hi3/characters', label: { zh: '首批女武神资料', en: 'First battlesuit entries', ja: '初回戦乙女データ' } },
      { type: 'codes', href: '/hi3/guides/new-returning-captain-route', label: { zh: '当前兑换码状态', en: 'Current code status', ja: '現在のコード状況' } },
      { type: 'download', href: '/hi3/download', label: { zh: '平台 / 下载', en: 'Platforms / download', ja: 'プラットフォーム / DL' } },
    ],
  },
  wuwa: {
    gameId: 'wuwa',
    currentVersion: '3.7 Prism\'s Illusion, Heart\'s Illumination',
    releaseDate: '2026-09-30',
    sourceUrls: ["https://mc.kurogames.com/main/news"],
    status: 'live',
    lastUpdatedAt: '2026-10-18',
    sourceTier: 'official',
    summary: {
      zh: '3.7「镜锁妄世，心照红尘」已于 9 月 30 日上线。当前优先处理梦枢天罗、心/锁暝、活动窗口、邮件补偿和更新后客户端检查。',
      en: 'v3.7 “Prism\'s Illusion, Heart\'s Illumination” launched September 30. Prioritize Simulacrum Nexus of Mengzhou, Hsin/Suoming, event windows, mail compensation, and post-update client checks.',
      ja: 'Ver.3.7「鏡に鎖す妄世、心で照らす紅塵」は9月30日に配信されました。夢州の夢枢天羅、心/鎖暝、イベント期間、メール補償、更新後クライアント確認を優先します。',
    },
    whatChanged: [{"zh": "10月18日官网新增锁暝战斗演示，属于3.7资料增量，不等于确认3.8或角色强度。", "en": "The October 18 Suoming showcase adds v3.7 reference material, not confirmation of v3.8 or a power ranking.", "ja": "10月18日鎖暝映像を追加。3.7資料であり、3.8や強さの確定ではありません。"},
      {
        zh: '版本页从 3.7 观察期切换为实装期，并把 3.6 内容保留为历史参考而非当前卡池依据。',
        en: 'The hub moves from v3.7 watch into live coverage, with v3.6 retained as historical reference rather than current-banner guidance.',
        ja: 'バージョンページをVer.3.7注目から実装情報へ切り替え、Ver.3.6は現行バナー根拠ではなく履歴参考として残します。',
      },
      {
        zh: '卡池、活动和奖励仍以游戏内显示与官方公告核对；不把传闻数值、复刻或后续角色当作已确认内容。',
        en: 'Banners, events, and rewards still require live-client and official-notice verification; rumored stats, reruns, and later characters are not presented as confirmed.',
        ja: 'バナー、イベント、報酬は引き続きゲーム内表示と公式告知で確認し、噂の性能、復刻、後続キャラを確定情報として扱いません。',
      },
    ],
    firstSteps: [
      {
        zh: '先检查邮件、有效兑换码和更新资源，再按主线进度进入梦枢天罗及 3.7 活动。',
        en: 'Check mail, valid codes, and downloaded resources first, then enter the Simulacrum Nexus of Mengzhou and v3.7 events according to story progress.',
        ja: 'まずメール、有効コード、更新リソースを確認し、ストーリー進行に応じて夢州の夢枢天羅とVer.3.7イベントへ進みます。',
      },
      {
        zh: '抽取前记录保底与队伍缺口；若遇到更新后掉帧或下载异常，先完成平台资源更新并保留复现信息。',
        en: 'Record pity and roster gaps before pulling; if you see post-update frame drops or download issues, finish platform resources first and retain reproduction details.',
        ja: '抽選前に天井と編成不足を記録し、更新後のFPS低下やDL異常があれば、まずプラットフォームのリソース更新を完了して再現情報を残します。',
      },
    ],
    links: [
      { type: 'guides', href: '/wuwa/guides/v3-7-hsin-suoming-official-reference', label: { zh: '心 / 锁暝官方资料', en: 'Hsin / Suoming official reference', ja: '心・鎖暝公式資料' } },
      { type: 'guides', href: '/wuwa/guides/v3-7-live-route', label: { zh: '3.7 上线后路线', en: 'v3.7 live route', ja: 'v3.7実装後ルート' } },
      { type: 'guides', href: '/wuwa/events', label: { zh: '活动看板', en: 'Event board', ja: 'イベントボード' } },
      { type: 'banner', href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池与预算', en: 'Current banner and budget', ja: '現在バナーと予算' } },
      { type: 'codes', href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/wuwa/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'download', href: '/wuwa/download', label: { zh: '平台下载', en: 'Platform download', ja: 'プラットフォームDL' } },
      { type: 'map', href: '/wuwa/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
    ],
  },
  starrail: {
    gameId: 'starrail',
    currentVersion: "4.7 此刻，将群星付之一笑",
    releaseDate: '2026-11-11',
    dateKind: 'release',
    sourceUrls: ['https://sr.mihoyo.com/', 'https://act.mihoyo.com/puzzle/hkrpg/e20261024version_2142940ddd/index.html'],
    status: 'live',
    lastUpdatedAt: '2026-11-24',
    sourceTier: 'official',
    summary: {"zh": "国服官网确认4.7「此刻，将群星付之一笑」正式上线，标注更新时间为11月11日；11月24日为本站核验日。跃迁与活动按所在服务器复核。", "en": "The CN official site confirms v4.7 is live and lists November 11 as its update date. Our check was November 24. Verify warps and events for your own server.", "ja": "中国公式サイトでv4.7配信を確認。公式更新日は11月11日、本サイト確認日は11月24日です。跳躍とイベントは利用サーバーで確認してください。"},
    whatChanged: [{"zh": "阿哈跃迁至12月22日15:00；复刻池于12月2日11:59结束第一期、12:00开始第二期。均为国服专题原文时间，未标注时区。", "en": "Aha’s warp ends December 22 at 15:00. Rerun phase one ends December 2 at 11:59; phase two starts at 12:00. These CN-page times have no explicit timezone label.", "ja": "阿哈の跳躍は12月22日15:00まで。復刻第1期は12月2日11:59終了、第2期は12:00開始。中国公式記載時刻で、タイムゾーンの明記はありません。"}],
    firstSteps: [{"zh": "先检查所在地区/服务器、当前活动和卡池结束时间，再规划资源；未核验的代码不列为有效。", "en": "Check your region, server and live event/banner deadlines before budgeting; unverified codes are not active codes.", "ja": "地域、サーバー、開催中イベントとバナー期限を確認してから計画し、未確認コードを有効扱いしません。"}],
    links: [
      { type: 'banner', href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前/下期跃迁', en: 'Current/next warps', ja: '現在/次回跳躍' } },
      { type: 'codes', href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/starrail/characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラ' } },
      { type: 'builds', href: '/starrail/gacha', label: { zh: '抽取预算', en: 'Pull budget', ja: 'ガチャ予算' } },
    ],
  },
  nte: {
    gameId: 'nte',
    currentVersion: "1.4 / October 15 CN update",
    releaseDate: '2026-10-15',
    dateKind: 'verified',
    sourceUrls: ["https://yh.wanmei.com/news/gamebroad/20261014/264537.html", "https://yh.wanmei.com/news/gamebroad/20261015/264630.html", "https://yh.wanmei.com/news/gamebroad/20261016/264655.html"],
    status: 'fresh',
    lastUpdatedAt: '2026-10-18',
    sourceTier: 'mixed',
    summary: {"zh": "国服1.4期间10月15日维护公告公布明音凛、弧盘「月的对跖点」、番外剧情及海月羁遇10级。限定窗口至11月5日05:59；不将国服公告外推国际服或断言维护已按时完成。", "en": "The CN October 15 v1.4 notice adds a limited agent, arc, side story and Haiyue bond level 10. The limited window ends November 5 at 05:59; confirm maintenance completion and regional scope.", "ja": "中国版v1.4の10月15日告知に限定キャラ、弧盤、番外物語、海月の絆Lv10を追加。限定期間は11月5日05:59まで。終了告知と地域範囲を確認してください。"},
    whatChanged: [{"zh": "新增10月16、17日国服热修复摘要；明音凛拥抱问题仍按公告保留待修复状态，不写成1.5。", "en": "Adds October 16–17 CN hotfix summaries. The hug issue remains a planned fix in the notice; this is not v1.5.", "ja": "10月16・17日中国版修正を追加。抱擁問題は告知の修正予定扱いを保持し、1.5としません。"}, {"zh": "已切换到当前官方公告状态，旧前瞻仅作历史参考。", "en": "Coverage follows current official notices; old previews are historical reference.", "ja": "現行公式告知に合わせ、過去の番組は履歴参考として扱います。"}],
    firstSteps: [{"zh": "先检查所在地区/服务器、当前活动和卡池结束时间，再规划资源；未核验的代码不列为有效。", "en": "Check your region, server and live event/banner deadlines before budgeting; unverified codes are not active codes.", "ja": "地域、サーバー、開催中イベントとバナー期限を確認してから計画し、未確認コードを有効扱いしません。"}],
    links: [
      { type: 'download', href: '/nte/download', label: { zh: '下载', en: 'Download', ja: 'DL' } },
      { type: 'codes', href: '/nte/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/nte/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/nte/guides/aug31-sep14-event-calendar-999-nights', label: { zh: '9月日历', en: 'September calendar', ja: '9月日程' } },
    ],
  },
  skjh: {
    gameId: 'skjh',
    currentVersion: 'S2 制霸王座',
    releaseDate: '2026-09-21',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: 'S2「制霸王座」已成为当前主入口，重点是渗透补给、首充/限定礼包、服务器模式和防抄家。',
      en: 'S2 “制霸王座” is now the main entry, focusing on infiltration supplies, first-purchase/limited packs, server modes, and base defense.',
      ja: 'S2「制霸王座」が現在の主要入口です。侵入補給、初回購入/限定パック、サーバーモード、拠点防衛を案内します。',
    },
    whatChanged: [
      {
        zh: '页面从活动收尾升级为 S2 玩法与新手常青入口，礼包内容保留有效期说明。',
        en: 'Coverage moves from event wrap-up into an S2 and evergreen beginner entry, with validity dates kept on pack content.',
        ja: 'イベント終了案内からS2玩法と初心者向け常設入口へ進め、パックには有効期限を残します。',
      },
    ],
    firstSteps: [
      {
        zh: '先看 S2 活动和官方下载，再选择服务器模式。',
        en: 'Start with S2 events and official download, then choose a server mode.',
        ja: 'まずS2イベントと公式DLを確認し、サーバーモードを選びます。',
      },
      {
        zh: '进入游戏后按 0-2 小时路线稳定资源和基地。',
        en: 'After entering the game, follow the 0-2 hour route to stabilize resources and base setup.',
        ja: 'ゲーム開始後は0-2時間ルートで資源と拠点を安定させます。',
      },
    ],
    links: [
      { type: 'download', href: '/skjh/download', label: { zh: '官方下载', en: 'Official download', ja: '公式DL' } },
      { type: 'codes', href: '/skjh/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/skjh/weapons', label: { zh: '武器资料', en: 'Weapons', ja: '武器' } },
      { type: 'guides', href: '/skjh/guides/aug31-event-ended-beginner-catchup', label: { zh: 'S2 / 新手路线', en: 'S2 / beginner route', ja: 'S2 / 初心者ルート' } },
    ],
  },
  endfield: {
    gameId: 'endfield',
    currentVersion: 'CN 丹青渡 / Pioneer Test archive',
    releaseDate: '2026-10-18',
    dateKind: 'verified',
    sourceUrls: ['https://endfield.hypergryph.com/news/6094'],
    status: 'live',
    lastUpdatedAt: '2026-10-18',
    sourceTier: 'official',
    summary: {"zh": "国服「丹青渡」版本已发布，新增祀、明河、「武陵 - 祀的画」与工业系统更新。按当前公告安排寻访和活动；Pioneer Test保留历史标记，其他地区另行核验。", "en": "CN Danqingdu adds Si, Minghe, a Wuling area and industry systems. Use the current CN notice for searches and events; Pioneer Test remains historical and other regions need separate verification.", "ja": "中国版「丹青渡」は祀・明河、武陵の新エリア、工業システムを追加。尋訪・イベントは中国公式告知で確認し、Pioneer Testは履歴、他地域は別途確認します。"},
    whatChanged: [{"zh": "10月15日官方更新说明已公开；新增自动农植机、连携技优先级、装备方案与舱室班组，旧蓝图成本须重验。", "en": "The October 15 notice adds automated planting, combo priorities, equipment presets and cabin shifts. Recheck older blueprint costs.", "ja": "10月15日告知で自動農植機・連携技優先度・装備プラン・船室班組を追加。旧設計図のコストは再確認が必要です。"}],
    firstSteps: [{"zh": "先核对国服公告、服务器时间与资格。祀寻访至11月5日11:59，明河11月5日12:00开始；补偿仅限更新前创建角色且邮件有期限。", "en": "Check CN scope, server time and eligibility. Si ends November 5 at 11:59; Minghe starts at 12:00. Compensation requires a pre-update character and expires.", "ja": "中国版対象・サーバー時刻・資格を確認。祀は11月5日11:59まで、明河は12:00開始。補償は更新前キャラが対象で期限があります。"}],
    links: [
      { type: 'download', href: '/endfield/download', label: { zh: '官方客户端下载', en: 'Official client download', ja: '公式クライアントDL' } },
      { type: 'codes', href: '/endfield/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/endfield/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/endfield/events', label: { zh: '国服版本与活动', en: 'CN version and events', ja: '中国版更新・イベント' } },
    ],
  },
  sea: {
    gameId: 'sea',
    currentVersion: 'early 2027 / December beta watch',
    releaseDate: '2026-09-21',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '海外口径转向 early 2027 和 December closed beta，当前重点是 release date、closed beta、Steam、PS5、Xbox、mobile、gacha 和 solo FAQ。',
      en: 'The overseas signal has shifted toward early 2027 and a December closed beta, so route release date, closed beta, Steam, PS5, Xbox, mobile, gacha, and solo FAQs.',
      ja: '海外シグナルはearly 2027と12月クローズドβへ移っています。release date、closed beta、Steam、PS5、Xbox、mobile、ガチャ、solo FAQを案内します。',
    },
    whatChanged: [
      {
        zh: '遗忘之海从泛 2026 观察改成 early 2027 / December closed beta 的谨慎事实核查。',
        en: 'Sea of Remnants moves from broad 2026 watch wording into cautious early 2027 / December closed-beta fact checks.',
        ja: 'Sea of Remnantsは広い2026注目から、early 2027 / 12月クローズドβの慎重な事実確認へ移ります。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认官网、Steam 和 closed beta 状态，再判断 PS5/Xbox/mobile、gacha、solo 和 MMO 边界。',
        en: 'Confirm official, Steam, and closed-beta status first, then evaluate PS5/Xbox/mobile, gacha, solo, and MMO boundaries.',
        ja: 'まず公式、Steam、クローズドβ状態を確認し、その後PS5/Xbox/mobile、ガチャ、solo、MMO境界を判断します。',
      },
      {
        zh: 'PS5/Xbox 不写成确认日期，除非官方商店或公告明确。',
        en: 'Do not publish PS5/Xbox dates unless official stores or notices confirm them.',
        ja: 'PS5/Xboxの日付は公式ストアか告知が確認するまで書きません。',
      },
    ],
    links: [
      { type: 'download', href: '/sea/download', label: { zh: '平台下载', en: 'Platform download', ja: '平台DL' } },
      { type: 'codes', href: '/sea/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/sea/characters', label: { zh: '船员', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/sea/guides/platform-download-guide', label: { zh: 'Steam / 平台 FAQ', en: 'Steam / Platform FAQ', ja: 'Steam / 平台FAQ' } },
    ],
  },
  roco: {
    gameId: 'roco',
    currentVersion: 'Global test information under review',
    status: 'watch',
    lastUpdatedAt: '2026-10-24',
    sourceTier: 'needs_verification',
    summary: {
      zh: '旧 Steam App ID 对应其他游戏，已撤回其确认支持。国际服测试日期、报名、平台和规则仍待独立核实；不代表测试取消，国服资料不能直接证明国际服规则。',
      en: 'The old Steam App ID identifies another game, so its confirmation is withdrawn. Global test dates, signup, platforms and rules need independent verification. This does not mean the test was cancelled, and CN data does not establish global rules.',
      ja: '旧Steam App IDは別のゲームを示すため、確認根拠を撤回しました。国際版の日程・応募・対応機種・ルールは独立した確認待ちです。中止を意味せず、中国版の資料だけでは国際版のルールを証明できません。',
    },
    whatChanged: [
      {
        zh: '撤回已确认日程、报名截止和活动倒计时；旧攻略中的重复断言仍在复核，不能作为新的独立证据。',
        en: 'Confirmed dates, signup deadlines and calendar countdowns are withdrawn. Repeated claims in older guides are still under review, not new independent evidence.',
        ja: '確認済み日程・応募締切・カウントダウンを撤回。旧ガイドの重複記述は再確認中であり、新たな独立した根拠ではありません。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认公告属于正确游戏、区服和版本，再核对日期、时区、资格和下载入口；不要按旧攻略付款或安装客户端。',
        en: 'Match the announcement to the correct game, region and version before checking dates, time zones, eligibility and downloads. Do not pay or install clients based on older guides.',
        ja: '告知が正しいゲーム・地域・版のものか確認してから、日程・時差・資格・DL先を確認してください。旧ガイドを根拠に支払い・インストールをしないでください。',
      },
      {
        zh: '国服上线、兑换码和图鉴内容继续留在 Roco CN 页面。',
        en: 'China launch, codes, and encyclopedia content stay on Roco CN pages.',
        ja: '中国版リリース、コード、図鑑内容はRoco CNページに残します。',
      },
    ],
    links: [
      { type: 'download', href: '/roco/download', label: { zh: '平台资料核验', en: 'Platform review', ja: '対応機種の確認' } },
      { type: 'codes', href: '/roco/redeem-codes', label: { zh: '兑换码撤回说明', en: 'Code claims withdrawal', ja: 'コード情報の撤回' } },
      { type: 'characters', href: '/roco/characters', label: { zh: '历史条目核验', en: 'Legacy entry review', ja: '過去項目の確認' } },
      { type: 'guides', href: '/roco/guides/global-cn-content-roadmap', label: { zh: '跨服资料核验', en: 'Cross-region verification', ja: '地域間資料の確認' } },
      { type: 'guides', href: '/roco/guides/global-launch-readiness-checklist', label: { zh: '历史设想归档：首发验收清单', en: 'Archived proposal: Launch checklist', ja: '過去の提案：ローンチ確認' } },
      { type: 'guides', href: '/roco/guides/global-first-30-days-pve-plan', label: { zh: '历史设想归档：前 30 天 PvE 包', en: 'Archived proposal: Days 1–30 PvE plan', ja: '過去の提案：1〜30日PvE案' } },
      { type: 'guides', href: '/roco/guides/global-days-31-90-season-event-plan', label: { zh: '历史设想归档：31–90 天赛季包', en: 'Archived proposal: Days 31–90 season plan', ja: '過去の提案：31〜90日シーズン案' } },
      { type: 'guides', href: '/roco/guides/global-cn-release-governance', label: { zh: '历史设想归档：跨服版本治理', en: 'Archived proposal: CN-global governance', ja: '過去の提案：地域間リリース統治' } },
      { type: 'guides', href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '历史设想归档：运营指标与实验', en: 'Archived proposal: Live-ops metrics', ja: '過去の提案：運営指標と実験' } },
      { type: 'guides', href: '/roco/guides/global-localization-cultural-event-playbook', label: { zh: '历史设想归档：本地化与文化活动', en: 'Archived proposal: Localization playbook', ja: '過去の提案：ローカライズ手帳' } },
      { type: 'guides', href: '/roco/guides/global-cbt-to-launch-decision-gates', label: { zh: '历史设想归档：CBT 上线决策', en: 'Archived proposal: CBT launch gates', ja: '過去の提案：CBTローンチ判断' } },
      { type: 'guides', href: '/roco/guides/global-accessibility-cross-device-playbook', label: { zh: '历史设想归档：无障碍与跨设备', en: 'Archived proposal: Accessibility & devices', ja: '過去の提案：アクセシビリティ・端末' } },
      { type: 'guides', href: '/roco/guides/global-economy-monetization-fairness-playbook', label: { zh: '历史设想归档：经济与付费公平', en: 'Archived proposal: Economy & fairness', ja: '過去の提案：経済・課金公平性' } },
      { type: 'guides', href: '/roco/guides/global-returning-player-event-legacy-playbook', label: { zh: '历史设想归档：回流与活动遗产', en: 'Archived proposal: Return & event legacy', ja: '過去の提案：復帰・イベント遺産' } },
      { type: 'guides', href: '/roco/guides/global-change-communication-playbook', label: { zh: '历史设想归档：版本沟通与热修', en: 'Archived proposal: Patch communication', ja: '過去の提案：変更・ホットフィックス' } },
      { type: 'guides', href: '/roco/guides/global-fair-play-integrity-playbook', label: { zh: '历史设想归档：公平竞争与完整性', en: 'Archived proposal: Fair play & integrity', ja: '過去の提案：フェアプレイ・完全性' } },
      { type: 'guides', href: '/roco/guides/global-player-discovery-codex-playbook', label: { zh: '历史设想归档：玩家发现与图鉴', en: 'Archived proposal: Discovery & codex trust', ja: '過去の提案：発見・図鑑信頼性' } },
      { type: 'guides', href: '/roco/guides/global-onboarding-learning-recovery-playbook', label: { zh: '历史设想归档：新手学习与恢复', en: 'Archived proposal: Onboarding & recovery', ja: '過去の提案：導入・失敗復帰' } },
      { type: 'guides', href: '/roco/guides/global-player-feedback-roadmap-playbook', label: { zh: '历史设想归档：玩家反馈与路线图', en: 'Archived proposal: Feedback & roadmap', ja: '過去の提案：フィードバック・計画' } },
      { type: 'guides', href: '/roco/guides/global-player-support-trust-playbook', label: { zh: '历史设想归档：玩家支持与信任', en: 'Archived proposal: Player support', ja: '過去の提案：プレイヤーサポート' } },
      { type: 'guides', href: '/roco/guides/global-social-safety-guild-playbook', label: { zh: '历史设想归档：社交安全与公会', en: 'Archived proposal: Social safety & guilds', ja: '過去の提案：ソーシャル安全・ギルド' } },
    ],
  },
  'roco-cn': {
    gameId: 'roco-cn',
    currentVersion: 'post-launch codes / encyclopedia',
    releaseDate: '2026-09-21',
    status: 'live',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: 'Roco CN 继续承接国服上线后的兑换码、图鉴、活动、宠物推荐和新手路线，重点是有效期与来源标注。',
      en: 'Roco CN continues routing post-launch codes, encyclopedia, events, creature picks, and beginner paths, with focus on validity and source labels.',
      ja: 'Roco CNは中国版リリース後のコード、図鑑、イベント、ペット推薦、初心者ルートを案内し、有効期限と出典ラベルを重視します。',
    },
    whatChanged: [
      {
        zh: '国服内容从 global 页面分离，兑换码和图鉴入口保持在 Roco CN。',
        en: 'China-version content stays separated from global pages, with codes and encyclopedia entry kept on Roco CN.',
        ja: '中国版内容をglobalページから分け、コードと図鑑入口をRoco CNに置きます。',
      },
      {
        zh: '第三方兑换码多有过期风险，需要标注 active、expired 或 unknown。',
        en: 'Third-party code lists often expire, so mark codes as active, expired, or unknown.',
        ja: '第三者コード一覧は期限切れリスクが高いため、active、expired、unknownを明示します。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认兑换码来源和有效期，再进入宠物图鉴与活动路线。',
        en: 'Verify code source and validity first, then move into encyclopedia and event routing.',
        ja: 'まずコードの出典と有効期限を確認し、その後図鑑とイベント導線へ進みます。',
      },
      {
        zh: '全球版 CBT、预注册和海外平台问题不要写入国服页面。',
        en: 'Do not mix global CBT, pre-registration, or overseas-platform questions into China-version pages.',
        ja: 'global CBT、事前登録、海外平台の話題を中国版ページに混ぜません。',
      },
    ],
    links: [
      { type: 'download', href: '/roco-cn/download', label: { zh: '国服入口', en: 'CN entry', ja: '中国版入口' } },
      { type: 'codes', href: '/roco-cn/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
      { type: 'characters', href: '/roco-cn/characters', label: { zh: '宠物图鉴', en: 'Creature index', ja: 'ペット図鑑' } },
      { type: 'guides', href: '/roco-cn/guides/s2-season-guide', label: { zh: '赛季路线', en: 'Season route', ja: 'シーズン導線' } },
    ],
  },
  ananta: {
    gameId: 'ananta',
    currentVersion: 'global launch prep',
    releaseDate: '2027-01-15',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'mixed',
    summary: {
      zh: '无限大已进入 2027年1月15日全球上线准备，承接 release date、download、PS5、PC、Android、iOS、gameplay 和 no-gacha 搜索。',
      en: 'Ananta is now in January 15, 2027 global launch prep, routing release date, download, PS5, PC, Android, iOS, gameplay, and no-gacha searches.',
      ja: 'Anantaは2027年1月15日のグローバル配信準備段階として、release date、DL、PS5、PC、Android、iOS、gameplay、ガチャなし検索を案内します。',
    },
    whatChanged: [
      {
        zh: '官网与 gamescom 2026 信息更新后，全球上线日期按 2027年1月15日处理。',
        en: 'After the official site and gamescom 2026 update, the global launch date is handled as January 15, 2027.',
        ja: '公式サイトとgamescom 2026更新後、グローバル配信日は2027年1月15日として扱います。',
      },
      {
        zh: '平台口径更新为 PS5、PC、Android 和 iOS；Steam/Xbox 不再作为确认平台承接。',
        en: 'Platform wording now uses PS5, PC, Android, and iOS; Steam/Xbox are no longer treated as confirmed platforms.',
        ja: 'プラットフォーム表記はPS5、PC、Android、iOSへ更新し、Steam/Xboxは確定扱いにしません。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认 PS5、PC、Android、iOS 的官方商店/官网入口，再看预下载和 beta 资格。',
        en: 'Confirm PS5, PC, Android, and iOS official/store entries first, then preload and beta eligibility.',
        ja: 'まずPS5、PC、Android、iOSの公式/ストア入口を確認し、事前DLとbeta資格を確認します。',
      },
      {
        zh: '搜索词里的“无限大符号”是歧义词，不承接到游戏内容。',
        en: 'The math-symbol query is off-topic and should not route into game content.',
        ja: '数学記号の検索意図はゲーム内容に接続しません。',
      },
    ],
    links: [
      { type: 'download', href: '/ananta/download', label: { zh: 'PS5 / PC / 移动端', en: 'PS5 / PC / Mobile', ja: 'PS5 / PC / モバイル' } },
      { type: 'codes', href: '/ananta/items', label: { zh: '资料入口', en: 'Data hub', ja: 'データ' } },
      { type: 'characters', href: '/ananta/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/ananta/guides/release-date-beta-pc-faq', label: { zh: '上线日期 FAQ', en: 'Release FAQ', ja: '配信日FAQ' } },
    ],
  },
  guihuan: {
    gameId: 'guihuan',
    currentVersion: 'test timeline watch',
    releaseDate: '2026-08-14',
    status: 'watch',
    lastUpdatedAt: VERSION_SNAPSHOT_UPDATED_AT,
    sourceTier: 'official',
    summary: {
      zh: '归环继续以测试时间线、开发商、国际服、官网、公测和测试招募事实核查承接。',
      en: 'Guihuan stays in test-timeline watch mode for developer, global-server, official site, public beta, and recruitment checks.',
      ja: '帰環はテスト年表、開発元、国際版、公式、公測、テスト募集を確認します。',
    },
    whatChanged: [
      {
        zh: '页面需要把开发商和上线时间事实核查放在首屏，避免误写未确认公测日期。',
        en: 'The page should foreground developer and release-date fact checks to avoid unconfirmed public-beta claims.',
        ja: '開発元とリリース時期の事実確認を先に出し、未確認公測日を避けます。',
      },
    ],
    firstSteps: [
      {
        zh: '先确认官网与测试招募状态，再解释国际服和开发商问题。',
        en: 'Confirm official site and test recruitment first, then explain global-server and developer questions.',
        ja: 'まず公式サイトとテスト募集を確認し、国際版と開発元を説明します。',
      },
      {
        zh: '“库洛”等联想词需要核验，不直接写成开发商结论。',
        en: 'Terms like Kuro need verification and should not be published as developer conclusions.',
        ja: 'Kuroなどの語は検証が必要で、開発元結論として書きません。',
      },
    ],
    links: [
      { type: 'download', href: '/guihuan/download', label: { zh: '下载 / 测试', en: 'Download / Tests', ja: 'DL / テスト' } },
      { type: 'codes', href: '/guihuan/items', label: { zh: '资料入口', en: 'Data hub', ja: 'データ' } },
      { type: 'characters', href: '/guihuan/characters', label: { zh: '角色', en: 'Characters', ja: 'キャラ' } },
      { type: 'guides', href: '/guihuan/guides/test-release-timeline-guide', label: { zh: '测试时间线', en: 'Test timeline', ja: 'テスト年表' } },
    ],
  },
};

export function getVersionSnapshot(gameId: GameId): VersionSnapshot | undefined {
  return VERSION_SNAPSHOTS[gameId];
}

export function localizeVersionText(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text.zh;
}
