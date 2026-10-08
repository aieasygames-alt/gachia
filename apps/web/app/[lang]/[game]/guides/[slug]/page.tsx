import { CATEGORY_LABELS, GAMES, LOCALES, MAIN_WORKER_GAME_IDS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { ClientMarkdown } from '@/components/wiki/client-markdown';
import { buildGuideJsonLd } from '@/lib/jsonld';
import { buildLocalizedAlternates, ensureMetaLength, getEntryUpdatedAt, hasLocalizedContent, limitMetaTitle } from '@/lib/seo-metadata';
import { BANNER_INTENT_PANELS } from '@/lib/banner-intent';
import { join } from 'node:path';
import { loadJson } from '@gachia/data/load-json';

export const dynamicParams = false;

type LocalizedText = Partial<Record<SupportedLocale, string>>;

type GuideLike = {
  id: string;
  title?: string;
  titleEn?: string;
  category: string;
  categoryZh?: string;
  categoryEn?: string;
  summary?: string;
  summaryEn?: string;
  content?: string;
  contentEn?: string;
  tags?: string[];
  faq?: Array<Record<string, string>>;
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: LocalizedText;
  serpDescription?: LocalizedText;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
};

type GuideRuntime = {
  guides: GuideLike[];
  categories: Record<string, Partial<Record<SupportedLocale, string>>>;
  getById: (id: string) => GuideLike | undefined;
  getTitle: (guide: GuideLike, locale: SupportedLocale) => string;
  getSummary: (guide: GuideLike, locale: SupportedLocale) => string;
  getContent: (guide: GuideLike, locale: SupportedLocale) => string;
  getCategory: (guide: GuideLike, locale: SupportedLocale) => string;
  getFaqQuestion: (faq: Record<string, string>, locale: SupportedLocale) => string;
  getFaqAnswer: (faq: Record<string, string>, locale: SupportedLocale) => string;
};

type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

type QuickAnswer = {
  heading: Record<SupportedLocale, string>;
  points: Record<SupportedLocale, string[]>;
};

type GuideArticleImage = {
  src: string;
  alt: string;
  caption: string;
};

const ARTICLE_IMAGE_COUNTS: Partial<Record<GameId, number>> = {
  genshin: 10,
  starrail: 10,
  wuwa: 10,
  nte: 17,
  zzz: 10,
  sea: 10,
  skjh: 9,
  endfield: 9,
  guihuan: 1,
  roco: 1,
  'roco-cn': 1,
};

const ARTICLE_IMAGE_LABELS: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  genshin: { zh: '原神攻略参考图', en: 'Genshin Impact guide reference image', ja: '原神ガイド参考画像' },
  starrail: { zh: '崩坏：星穹铁道攻略参考图', en: 'Honkai: Star Rail guide reference image', ja: '崩壊：スターレイルガイド参考画像' },
  wuwa: { zh: '鸣潮攻略参考图', en: 'Wuthering Waves guide reference image', ja: '鳴潮ガイド参考画像' },
  nte: { zh: '异环攻略参考图', en: 'Neverness to Everness guide reference image', ja: 'Neverness to Evernessガイド参考画像' },
  zzz: { zh: '绝区零攻略参考图', en: 'Zenless Zone Zero guide reference image', ja: 'ゼンレスゾーンゼロガイド参考画像' },
  sea: { zh: '遗忘之海攻略参考图', en: 'Sea of Remnants guide reference image', ja: 'Sea of Remnantsガイド参考画像' },
  skjh: { zh: '失控进化攻略参考图', en: 'Ashfall Evolution guide reference image', ja: 'Ashfall Evolutionガイド参考画像' },
  endfield: { zh: '终末地攻略参考图', en: 'Arknights: Endfield guide reference image', ja: 'エンドフィールドガイド参考画像' },
  guihuan: { zh: '归环攻略参考图', en: 'Guihuan guide reference image', ja: 'Guihuanガイド参考画像' },
  roco: { zh: '洛克王国:世界攻略参考图', en: 'Roco Kingdom guide reference image', ja: 'ロコキングダムガイド参考画像' },
  'roco-cn': { zh: '洛克王国:世界（国服）攻略参考图', en: 'Roco Kingdom (CN) guide reference image', ja: 'ロコキングダム（中国版）ガイド参考画像' },
  aniimo: { zh: '伊莫攻略参考图', en: 'Aniimo guide reference image', ja: 'アニモガイド参考画像' },
};

const GUIDE_QUICK_ANSWERS: Partial<Record<GameId, Record<string, QuickAnswer>>> = {
  genshin: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前卡池、下期和复刻', en: 'Quick answer: check current banner, next banner, and reruns first', ja: '要点：現在、次回、復刻を先に確認' },
      points: {
        zh: ['先看当前卡池，再看下期和复刻预测。', '抽卡前把保底、原石预算和版本目标放在一起。', '只有一次大保底时，优先补队伍缺口最大的角色。'],
        en: ['Use this page to compare current banners, next banners, reruns, pity, and Primogem budget.', 'Check guarantee status, remaining income, and future version targets before pulling.', 'If you only have one full guarantee, secure the character that fixes the biggest team gap first.'],
        ja: ['現在、次回、復刻、天井、原石予算を同時に確認。', '引く前に保証、残り収入、次版本目標をチェック。', '大天井が一回だけなら、編成不足を埋めるキャラを優先。'],
      },
    },
    'cross-game-comparison-guide': {
      heading: { zh: '快速结论：按玩法而不是热度选游戏', en: 'Quick answer: choose by playstyle, not hype', ja: '要点：流行より遊び方で選ぶ' },
      points: {
        zh: ['想探索大世界，优先原神或鸣潮。', '想省时间和回合策略，优先崩铁。', '想要快节奏动作和都市风格，优先绝区零。'],
        en: ['Pick Genshin or WuWa if open-world exploration matters most.', 'Pick HSR if you want turn-based strategy and lower daily time.', 'Pick ZZZ if you want fast action combat and a compact urban style.'],
        ja: ['探索重視なら原神か鳴潮が向きます。', '時短とターン制ならスターレイルが安定です。', '高速アクションと都市感ならZZZが向きます。'],
      },
    },
    'lunar-reaction-guide': {
      heading: { zh: '快速结论：先确认月反应定位和队伍缺口', en: 'Quick answer: check Lunar reaction role, teams, and banner fit first', ja: '要点：月反応の役割、編成、バナー適性を先に確認' },
      points: {
        zh: ['先确认月元素和月反应是否能补当前队伍短板。', '再看 Sandrone、Nod-Krai 角色、圣遗物和伤害倍率。', '抽卡前把月反应收益和当前祈愿目标放在一起比较。'],
        en: ['Use this as a Genshin Lunar reaction guide for Lunar element basics, reaction types, teams, and damage scaling.', 'Compare Sandrone and Nod-Krai characters with artifact needs before farming.', 'Before pulling, match Lunar reaction value against current banners and your existing roster gaps.'],
        ja: ['月元素と月反応が現在編成の不足を補えるか確認。', 'Sandrone、Nod-Kraiキャラ、聖遺物、倍率を比較。', '引く前に月反応価値と現在バナーを並べて判断。'],
      },
    },
  },
  starrail: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前跃迁、下期和复刻', en: 'Quick answer: check current warp, next banner, and reruns first', ja: '要点：現在、次回、復刻を先に確認' },
      points: {
        zh: ['先看当前跃迁，再看下期和复刻。', '把星琼、保底和联动目标放在同一张预算表里。', '资源有限时，先保角色，再考虑光锥。'],
        en: ['Use this page to compare current warps, next banners, reruns, pity, and Stellar Jade budget.', 'Check collab targets, redeem codes, and guaranteed status before pulling.', 'If resources are tight, secure the character first and leave Light Cones for later.'],
        ja: ['現在跳躍、次回、復刻、星玉予算を同時に確認。', 'コラボ目標、コード、保証を引く前に整理。', '資源が少ない時はキャラ優先、光円錐は後回し。'],
      },
    },
    'fate-collab-guide': {
      heading: { zh: '快速结论：Fate 目标要单独留预算', en: 'Quick answer: reserve Fate budget separately', ja: '要点：Fate予算は分けて確保' },
      points: {
        zh: ['联动目标不要和普通复刻混成一个预算。', '先领奖励和兑换码，再算星琼缺口。', '追光锥前先确认角色保底是否安全。'],
        en: ['Do not mix collab targets and normal reruns into one loose budget.', 'Claim rewards and codes before calculating the Jade gap.', 'Check character guarantee before chasing Light Cones.'],
        ja: ['コラボ目標と通常復刻を同じ予算に混ぜない。', '報酬とコードを先に回収して星玉不足を計算。', '光円錐前にキャラ保証を確認。'],
      },
    },
  },
  wuwa: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前卡池、下期和复刻', en: 'Quick answer: check current banner, next banner, and reruns first', ja: '要点：現在、次回、復刻を先に確認' },
      points: {
        zh: ['先看当前卡池，再看下期和复刻。', '角色池和武器池保底要分开算。', '星声紧张时先保角色，再追武器。'],
        en: ['Use this page to compare current banners, next banners, reruns, pity, and Astrite budget.', 'Track character pity and weapon pity separately before pulling.', 'If Astrite is tight, secure the character first and leave weapons for later.'],
        ja: ['現在、次回、復刻、天井、星声予算を確認。', 'キャラ天井と武器天井は分けて計算。', '星声が少ない時はキャラ優先、武器は後回し。'],
      },
    },
    'cross-game-comparison-guide': {
      heading: { zh: '快速结论：按玩法而不是热度选游戏', en: 'Quick answer: choose by playstyle, not hype', ja: '要点：流行より遊び方で選ぶ' },
      points: {
        zh: ['想探索大世界，优先原神或鸣潮。', '想省时间和回合策略，优先崩铁。', '想要快节奏动作和都市风格，优先绝区零。'],
        en: ['Pick Genshin or WuWa if open-world exploration matters most.', 'Pick HSR if you want turn-based strategy and lower daily time.', 'Pick ZZZ if you want fast action combat and compact sessions.'],
        ja: ['探索重視なら原神か鳴潮。', '時短とターン制ならHSR。', '高速アクションならZZZ。'],
      },
    },
  },
  zzz: {
    'banner-schedule-guide': {
      heading: { zh: '快速结论：先看当前卡池、下期和复刻', en: 'Quick answer: check current, next, and upcoming ZZZ banners first', ja: '要点：現在、次回、復刻バナーを先に確認' },
      points: {
        zh: ['先看当前代理人，再看下期和复刻。', '把代理人保底、音擎保底、菲林预算和队伍缺口放在一起。', '资源有限时先保代理人，再考虑专属音擎。'],
        en: ['Use this page to compare current banners, next banners, reruns, pity, and Polychrome budget.', 'Check agent pity, W-Engine pity, guarantee status, and team needs before pulling.', 'If resources are tight, secure the agent first and treat signature W-Engines as optional upgrades.'],
        ja: ['現在、次回、復刻、天井、菲林予算を同時に確認。', '代理人天井、音擎天井、保証、編成不足を先に整理。', '資源が少ない時は代理人優先、専用音擎は後回し。'],
      },
    },
    'team-building-guide': {
      heading: { zh: '快速结论：先补队伍角色，而不是先追单体强度', en: 'Quick answer: fix team roles before chasing raw tier', ja: '要点：単体評価より編成役割を先に埋める' },
      points: {
        zh: ['先确认强攻、击破、异常、支援和生存位是否完整。', '当前卡池角色只有能补队伍缺口时才值得优先抽。', '配队确定后再看音擎、驱动盘和体力刷取顺序。'],
        en: ['Start with Attack, Stun, Anomaly, Support, and survival coverage before judging a single agent.', 'A current-banner agent is worth prioritizing when they fix a real roster gap.', 'After the team is clear, route W-Engines, Drive Discs, and Battery Charge farming.'],
        ja: ['強攻、撃破、異常、支援、生存枠を先に確認。', '現在バナーは編成不足を埋める時に優先。', '編成後に音動機、ドライブ、スタミナを決めます。'],
      },
    },
    'w-engine-guide': {
      heading: { zh: '快速结论：代理人未到手前，不要先追专属音擎', en: 'Quick answer: secure the agent before chasing signatures', ja: '要点：餅武器より代理人確保が先' },
      points: {
        zh: ['音擎价值要和角色保底、队伍定位和替代 A 级音擎一起算。', '资源紧张时，先保代理人，再看专属音擎。', '最终决定要回到配队、驱动盘主属性和当前菲林预算。'],
        en: ['Judge W-Engine value with agent pity, team role, and A-Rank alternatives together.', 'If Polychromes are tight, secure the agent first and delay the signature.', 'Use team fit, Drive Disc main stats, and current-banner budget before pulling weapons.'],
        ja: ['音動機価値は代理人天井、編成役割、A級代替と一緒に判断。', '資源が少ない時は代理人を先に確保。', '編成、ドライブ、菲林予算で最終判断。'],
      },
    },
    'meta-teams-v3-guide': {
      heading: { zh: '快速结论：v3.3 观察期先看队伍缺口和抽卡优先级', en: 'Quick answer: rank v3.3-watch teams by roster gaps and pull priority', ja: '要点：v3.3観察期の編成は不足枠とガチャ優先度で判断' },
      points: {
        zh: ['先把可用代理人按强攻、击破、异常和支援分组。', 'F2P 队伍优先保证循环稳定，再追更高上限。', '当前卡池、音擎和驱动盘刷取要服务于同一个队伍目标。'],
        en: ['Group your agents by Attack, Stun, Anomaly, and Support before picking a meta comp.', 'F2P teams should secure stable rotations before chasing higher ceilings.', 'Current banners, W-Engines, and Drive Disc farming should support one team goal.'],
        ja: ['代理人を強攻、撃破、異常、支援で整理。', 'F2P編成は上限より安定循環を先に確保。', 'バナー、音動機、ドライブは同じ編成目標へ。'],
      },
    },
  },
  nte: {
    'photo-mode-guide': {
      heading: { zh: '快速结论：先会开相机，再调滤镜和拍照点', en: 'Quick answer: open camera first, then tune filters and spots', ja: '要点：カメラ、フィルター、撮影地の順' },
      points: {
        zh: ['先确认拍照入口、HUD 和基础操作。', '再调滤镜、姿势、时间、天气和景深。', '最后去找 Hethereau 城市和角色拍照点。'],
        en: ['Confirm camera access, HUD, and basic controls first.', 'Then tune filters, poses, time, weather, and depth of field.', 'Finally look for Hethereau city and character photo spots.'],
        ja: ['まずカメラ入口、HUD、基本操作を確認。', '次にフィルター、ポーズ、時間、天気、被写界深度。', '最後に撮影スポットを探します。'],
      },
    },
  },
  sea: {
    'open-beta-version-center': {
      heading: { zh: '快速结论：查官网、公测和移动端先从这里分流', en: 'Quick answer: route official, beta, and mobile searches here first', ja: '要点：公式、β、モバイル検索をここで分流' },
      points: {
        zh: ['想找下载入口，直接去下载主入口，不在版本页里绕。', '想确认 PC 公测、移动端、gamescom demo 和首月内容，用本页做总览。', '主机、海外和 demo 信息要和已确认上线日期分开看。'],
        en: ['Use the download hub if your next action is installing the game.', 'Use this page for PC beta, mobile launch, gamescom demo, and month-one content context.', 'Keep console, overseas, and demo signals separate from confirmed launch dates.'],
        ja: ['DLが目的ならDL入口へ進みます。', 'PC、モバイル、gamescom demo、初月内容はこのページで確認します。', 'コンソール、海外、demo情報は確定日程と分けて見ます。'],
      },
    },
    'launch-day-guide': {
      heading: { zh: '快速结论：能进服后先确认账号、福利和首日路线', en: 'Quick answer: after login, check account, rewards, and day-one route', ja: '要点：ログイン後はアカウント、報酬、初日ルート' },
      points: {
        zh: ['还没安装先去下载页；本页解决进服后的路线。', 'PC 老玩家切手机端时，先确认同账号、同区服和奖励规则。', '首日先看黑券自选、好金砖、兑换码和已知问题，再投入养成资源。'],
        en: ['If you have not installed yet, start from the download page; this page is for post-login routing.', 'PC players moving to mobile should confirm account, server, and reward rules first.', 'Check selector, Good Gold Bricks, codes, and known issues before committing resources.'],
        ja: ['未インストールならDLページから開始します。', 'PCからモバイルへ移る場合、同じアカウント、サーバー、報酬規則を先に確認します。', '黒券、好金砖、コード、既知問題を見てから育成資源を使います。'],
      },
    },
    'download-install-guide': {
      heading: { zh: '快速结论：先走官方入口，再排查容量、更新和账号', en: 'Quick answer: use official entry, then check storage, patching, and account', ja: '要点：公式入口、容量、更新、アカウント確認' },
      points: {
        zh: ['下载动作优先从官网、TapTap、App Store、Steam 或官方启动器进入。', '安装失败先查剩余空间、预下载后更新、资源校验和网络。', '进游戏前确认登录方式、区服和 PC/移动端互通，避免把奖励领到错误角色。'],
        en: ['Use official site, TapTap, App Store, Steam, or the official launcher first.', 'For install failures, check storage, post-preload patches, resource verification, and network.', 'Before claiming rewards, confirm login route, server, and PC/mobile cross-progress.'],
        ja: ['公式サイト、TapTap、App Store、Steam、公式ランチャーから入ります。', '失敗時は容量、事前DL後の更新、リソース検証、ネットワークを確認します。', '報酬受取前にログイン、サーバー、PC/モバイル連携を確認します。'],
      },
    },
  },
  roco: {
    'cbt-registration-guide': {
      heading: { zh: '快速结论：10/27 首测，先完成官网报名与问卷', en: 'Quick answer: sign up on the official site before the October 27 CBT', ja: '要点：10/27テスト前に公式サイトで申し込み' },
      points: {
        zh: ['国际服 CBT 于 2026-10-27 开启，报名窗口为 8/26–10/20。', '前往 www.rocokingdom.com 预注册并完成必填问卷，测试资格以官方邮件与公告为准。', 'CBT 仅 PC、iOS、Android 可玩，PS5/Xbox/Steam/Epic/MS Store 属正式版平台。'],
        en: ['The global CBT starts October 27, 2026; sign-ups run from August 26 to October 20.', 'Pre-register on www.rocokingdom.com and complete the mandatory questionnaire; eligibility follows official emails and notices.', 'The CBT is playable on PC, iOS, and Android only; PS5, Xbox, Steam, Epic, and MS Store are full-release platforms.'],
        ja: ['グローバルCBTは2026年10月27日開始、申込は8/26–10/20。', '公式サイトで事前登録と必須アンケートを完了。資格は公式メールと告知基準。', 'CBTはPC、iOS、Androidのみ。PS5/Xbox/Steam/Epic/MS Storeは正式版プラットフォーム。'],
      },
    },
    'starter-guide': {
      heading: { zh: '快速结论：按开荒节奏选，Meewee 稳妥、Sparka 快攻、Cerulla 抗压', en: 'Quick answer: pick by early pacing — Meewee balances, Sparka speeds up, Cerulla survives', ja: '要点：序盤のペースで選ぶ — Meewee安定、Sparka速攻、Cerulla耐久' },
      points: {
        zh: ['国际服御三家为草系 Meewee、火系 Sparka、水系 Cerulla。', '追求稳妥万能先 Meewee；想打快先 Sparka；怕翻车先 Cerulla。', '三只都能在野外补抓，御三家选择不锁定长期进度。'],
        en: ['The international starters are Grass-type Meewee, Fire-type Sparka, and Water-type Cerulla.', 'Pick Meewee for a balanced route, Sparka for aggressive early pacing, or Cerulla for survivability.', 'All three can be caught in the wild later, so the starter pick does not lock your long-term progress.'],
        ja: ['国際版スターターは草Meewee、炎Sparka、水Cerulla。', '万能ならMeewee、速攻ならSparka、耐久ならCerulla。', '3匹とも野生で捕まえられるため、スターターで長期進行は固定されません。'],
      },
    },
    'what-is-roco-kingdom': {
      heading: { zh: '快速结论：免费开放世界精灵收集，主打抓宠、回合战斗与社交', en: 'Quick answer: a free open-world creature-collector focused on catching, turn-based battle, and social play', ja: '要点：無料オープンワールドの捕獲ゲーム' },
      points: {
        zh: ['开发方为腾讯魔方工作室，玩家扮演魔法学院学生 Roco 在 Carosia 大陆冒险。', '可捕捉 400+ 只名为 Jinies 的精灵，战斗为回合制。', '国际服与国服数据相互独立，正式版支持繁中、英文、日文等多语言。'],
        en: ['Developed by Tencent Morefun Studios; you play as a magic-academy student called a Roco exploring Carosia.', 'Catch 400+ creatures named Jinies and battle in turn-based combat.', 'The international and CN versions keep separate data; the global release supports Traditional Chinese, English, Japanese, and more.'],
        ja: ['開発はテンセント魔方工作室。魔法学院生「Roco」となりCarosia大陸を冒険。', '400体以上の「Jinies」を捕獲し、ターン制バトル。', '国際版と中国版のデータは独立。正式版は繁体中文、英語、日本語などに対応予定。'],
      },
    },
    'platforms-and-download-guide': {
      heading: { zh: '快速结论：CBT 只上 PC/iOS/Android，正式版才扩到主机', en: 'Quick answer: the CBT is PC/iOS/Android; console platforms arrive at full release', ja: '要点：CBTはPC/iOS/Androidのみ' },
      points: {
        zh: ['CBT（10/27）可玩平台为 PC、iOS、Android。', '正式版目标平台为 PC、PS5、Xbox、iOS、Android，PC 端含 Steam、Epic、MS Store。', 'Steam 商店页已上线但锁国区；国际服下载以官网为准。'],
        en: ['The October 27 CBT supports PC, iOS, and Android.', 'The full release targets PC, PS5, Xbox, iOS, and Android, with the PC version on Steam, Epic, and Microsoft Store.', 'The Steam page is live but region-locked for CN; use the official site for downloads.'],
        ja: ['CBTはPC、iOS、Androidに対応。', '正式版はPC、PS5、Xbox、iOS、Androidを予定。PC版はSteam、Epic、MS Store。', 'Steamページは中国リージョンロック中。DLは公式サイト基準。'],
      },
    },
    'jinies-guide': {
      heading: { zh: '快速结论：先懂 18 元素、血统与捕捉方式再谈培养', en: 'Quick answer: learn the 18 elements, Bloodline, and catching before building', ja: '要点：18元素、血統、捕獲方法を先に把握' },
      points: {
        zh: ['官方已确认 400+ 只 Jinies，分为 18 种元素。', '血统（Bloodline）系统、Alpha/Exotic 特殊形态与 Buddy Pods 捕捉是本作特色。', 'Alpha 血统化可在特定精灵上获得，Blazion 为 Sparka 血统的 boss 级形态。'],
        en: ['400+ Jinies are confirmed, split across 18 elements.', 'The Bloodline system, Alpha/Exotic special forms, and Buddy Pods catching define progression.', 'Alpha conversion applies to select creatures; Blazion is the boss-tier Bloodline form of Sparka.'],
        ja: ['公式確認済みは400体超、18属性。', '血統（Bloodline）、Alpha/Exotic形態、Buddy Pods捕獲が特徴。', 'Alpha化は特定のジニーに適用され、BlazionはSparka血統のボス級形態。'],
      },
    },
    'battle-system-guide': {
      heading: { zh: '快速结论：回合制核心是体力条、换人与克制预判', en: 'Quick answer: master the stamina bar, switching, and type hints in turn-based combat', ja: '要点：スタミナ管理、交代、相性読みが鍵' },
      points: {
        zh: ['每只精灵 4 个技能、星级体力条，克制关系在界面上可见。', '体力（Stamina）是资源，换人预判决定回合主动权。', '血统技能可覆盖普通技能，PvP 采用等级标准化机制。'],
        en: ['Each Jinie has four skills and a star-based stamina bar, with matchup hints shown in the UI.', 'Stamina is the core resource; anticipating switches decides tempo.', 'Bloodline skills can overwrite normal skills, and PvP uses level-standardized rules.'],
        ja: ['各ジニーは4スキルと星スタミナバー、相性ヒントはUI表示。', 'スタミナが核心リソースで、交代読みが主導権を握る。', '血統スキルは通常スキルを上書き可能。PvPはレベル標準化。'],
      },
    },
    'co-op-and-social-guide': {
      heading: { zh: '快速结论：联机主打组队探索、共骑、家园与友好决斗', en: 'Quick answer: co-op covers party exploration, co-riding, homes, and friendly duels', ja: '要点：パーティ探索、共乗り、ホーム、友好決闘が中心' },
      points: {
        zh: ['支持跨平台组队冒险与共同骑行精灵。', '可以拜访、装饰家园，一起种田。', '友好决斗与跨服好友是社交玩法的主要入口。'],
        en: ['Cross-platform party play and co-riding Jinies are core co-op features.', 'Visit and decorate homes, and farm together with friends.', 'Friendly duels and cross-server friends are the main social loops.'],
        ja: ['クロスプラットフォームのパーティ探索とジニー共乗りが核。', 'ホーム訪問・装飾と共同農作業が可能。', '友好決闘とクロスサーバーフレンドが主なソーシャル導線。'],
      },
    },
    'pre-registration-rewards-faq': {
      heading: { zh: '快速结论：官网预注册开放中，具体奖励待官方公布', en: 'Quick answer: pre-registration is open; specific rewards are still pending official reveal', ja: '要点：事前登録受付中、報酬詳細は公式発表待ち' },
      points: {
        zh: ['国际服预注册已在官网开放，CBT 资格与预约报名联动。', '具体预约奖励、删档规则与付费细节暂未公布，将持续更新。', 'CBT 数据通常不继承到正式版，避免投入过多养成资源。'],
        en: ['International pre-registration is live on the official site and linked to CBT eligibility.', 'Specific rewards, wipe rules, and monetization details are unannounced and will be updated here.', 'CBT progress typically does not carry to launch, so avoid heavy investment.'],
        ja: ['国際版の事前登録は公式サイトで受付中、CBT資格と連動。', '報酬詳細、データ削除規則、課金は未発表のため随時更新。', 'CBTデータは正式版に引き継がれないことが多いため育成投資は控えめに。'],
      },
    },
    'is-roco-kingdom-free-to-play': {
      heading: { zh: '快速结论：免费游玩，官方确认无 Pay-to-Win', en: 'Quick answer: free to play, with developer-confirmed no pay-to-win', ja: '要点：基本無料、課金優遇なし（公式）' },
      points: {
        zh: ['国际服全平台免费下载游玩（F2P）。', '官方明确 PvP 无 Pay-to-Win，400+ 精灵全部游戏内可获得。', '10/27 首测为删档测试，不含内购。'],
        en: ['The global version is free to play on every platform.', 'PvP is developer-confirmed no pay-to-win, and all 400+ Jinies are earnable in-game.', 'The October 27 CBT is wipe-based with no purchases.'],
        ja: ['国際版は全プラットフォームで基本無料。', 'PvPは課金優遇なし（公式）、400種以上は全てゲーム内で獲得可能。', '10/27 CBTはデータ消去型で課金なし。'],
      },
    },
    'roco-kingdom-release-date-guide': {
      heading: { zh: '快速结论：正式版日期未公布，10/27 首测先行', en: 'Quick answer: no launch date yet; the October 27 CBT comes first', ja: '要点：正式版日は未発表、まず10/27 CBT' },
      points: {
        zh: ['正式版发售日尚未公布，官方已确认长期路线图（新赛季/地图/剧情）。', '已确认节点：8/26–10/20 报名、10/23 查资格、10/27 首测。', '正式版登陆 PC/PS5/Xbox/iOS/Android，上线即支持跨平台联机。'],
        en: ['No specific launch date is announced; a long-term roadmap (seasons, maps, story) is confirmed.', 'Confirmed milestones: sign-ups Aug 26–Oct 20, eligibility check Oct 23, CBT Oct 27.', 'The full release targets PC/PS5/Xbox/iOS/Android with day-one cross-play.'],
        ja: ['正式版リリース日は未発表。シーズン・マップ・ストーリーの長期ロードマップは確定。', '申込8/26–10/20、資格確認10/23、CBT10/27。', '正式版はPC/PS5/Xbox/iOS/Android、クロスプレイ対応。'],
      },
    },
    'roco-kingdom-vs-pokemon': {
      heading: { zh: '快速结论：想共享世界选 Roco，想单机叙事选宝可梦', en: 'Quick answer: pick Roco for a shared world, Pokemon for solo narrative', ja: '要点：共有世界ならロコ、シングルならポケモン' },
      points: {
        zh: ['核心循环相似（回合制收集养成），世界结构完全不同。', 'Roco Kingdom 免费跨平台、社交深度高；宝可梦买断制单机叙事强。', 'Roco 有 16 年中国 IP 底蕴（3.5 亿注册玩家），非简单模仿。'],
        en: ['Similar core loop (turn-based collecting), very different world structure.', 'Roco Kingdom is free, cross-platform, and socially deep; Pokemon is premium and narrative-strong.', 'Roco has a 16-year Chinese IP pedigree (350M+ registered players), not a simple clone.'],
        ja: ['基本ループは類似、世界設計は大きく異なる。', 'ロコは無料・クロスプラットフォーム・ソーシャル重視。ポケモンは買い切り・ストーリー重視。', 'ロコは16年の中国IP（登録3.5億人以上）。'],
      },
    },
    'roco-kingdom-crossplay-guide': {
      heading: { zh: '快速结论：正式版 day-one 全平台联机，CBT 仅三端', en: 'Quick answer: day-one crossplay at launch; CBT covers three platforms', ja: '要点：正式版は全機種クロスプレイ、CBTは3平台' },
      points: {
        zh: ['正式版 PC/PS5/Xbox/移动端上线即支持跨平台联机与进度互通。', '10/27 首测仅 PC、iOS、Android 可玩，主机不参与。', '联机玩法含组队冒险、共骑、家园与友好决斗。'],
        en: ['Day-one crossplay and cross-platform progression across PC/PS5/Xbox/mobile at launch.', 'The October 27 CBT is PC, iOS, and Android only — no consoles.', 'Co-op covers party exploration, co-riding, homes, and friendly duels.'],
        ja: ['正式版はPC/PS5/Xbox/モバイルでクロスプレイと進行共有対応。', '10/27 CBTはPC・iOS・Androidのみ。', '協力はパーティ探索、共乗り、ホーム、友好決闘。'],
      },
    },
  },
};

const GUIDE_NEXT_STEPS: Partial<Record<GameId, Record<string, NextStepLink[]>>> = {
  genshin: {
    'banner-schedule-guide': [
      { href: '/genshin/guides/luna-viii-sandrone-guide', label: { zh: 'Luna VIII 专题', en: 'Luna VIII guide', ja: 'Luna VIII特集' }, description: { zh: '继续看版本、角色和活动路线。', en: 'Continue into version, character, and event routing.', ja: '版本、キャラ、イベントへ。' } },
      { href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '抽卡前先补资源。', en: 'Claim resources before pulling.', ja: 'ガチャ前に資源を回収。' } },
      { href: '/calendar', label: { zh: '跨游戏日历', en: 'Banner calendar', ja: 'ガチャ日程' }, description: { zh: '对比多游戏卡池、版本和兑换码期限。', en: 'Compare banners, versions, and code deadlines across games.', ja: '複数ゲームのバナー、版本、コード期限を比較。' } },
    ],
    'snezhnaya-version-guide': [
      { href: '/genshin/guides/lunar-reaction-guide', label: { zh: '月反应指南', en: 'Lunar reaction guide', ja: '月反応ガイド' }, description: { zh: '把 Nod-Krai 角色、月元素和队伍机制接起来。', en: 'Connect Nod-Krai characters, Lunar element rules, and team value.', ja: 'Nod-Kraiキャラ、月元素、編成価値を接続。' } },
      { href: '/genshin/guides/banner-schedule-guide', label: { zh: '当前祈愿', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看 Sandrone、复刻和原石规划。', en: 'Check Sandrone, reruns, and Primogem planning next.', ja: 'Sandrone、復刻、原石計画を確認。' } },
    ],
    'lunar-reaction-guide': [
      { href: '/genshin/guides/snezhnaya-version-guide', label: { zh: 'Nod-Krai 版本', en: 'Nod-Krai version', ja: 'Nod-Krai版本' }, description: { zh: '回到版本路线看角色、地图和活动。', en: 'Return to the version route for characters, map, and events.', ja: 'キャラ、地図、イベントへ戻る。' } },
      { href: '/genshin/build', label: { zh: '角色配装', en: 'Build routes', ja: 'ビルド' }, description: { zh: '按月反应收益继续看武器、圣遗物和词条。', en: 'Turn Lunar reaction value into weapon, artifact, and stat choices.', ja: '月反応価値を武器、聖遺物、ステータスへ。' } },
    ],
    'boss-strategy-guide': [
      { href: '/genshin/items', label: { zh: '材料图鉴', en: 'Material database', ja: '素材図鑑' }, description: { zh: '按周本和世界 Boss 继续查突破材料。', en: 'Use boss drops to plan ascension and talent materials.', ja: 'ボス素材で突破と天賦を計画。' } },
      { href: '/genshin/build', label: { zh: '角色配装', en: 'Build routes', ja: 'ビルド' }, description: { zh: '按 Boss 弱点选择主 C、护盾、治疗和元素反应。', en: 'Match DPS, shields, healing, and reactions to boss weaknesses.', ja: '弱点に合わせてDPS、盾、回復、反応を選択。' } },
    ],
  },
  starrail: {
    'banner-schedule-guide': [
      { href: '/starrail/guides/himeko-nova-fate-pull-plan', label: { zh: 'Fate 抽卡规划', en: 'Fate pull plan', ja: 'Fateガチャ計画' }, description: { zh: '把当前跃迁和联动预算放一起。', en: 'Connect current warps with collab budget.', ja: '現在跳躍とコラボ予算を接続。' } },
      { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先领码再算星琼。', en: 'Claim codes before calculating Jade.', ja: 'コード後に星玉計算。' } },
      { href: '/calendar', label: { zh: '跨游戏日历', en: 'Banner calendar', ja: 'ガチャ日程' }, description: { zh: '对比多游戏卡池、版本和兑换码期限。', en: 'Compare banners, versions, and code deadlines across games.', ja: '複数ゲームのバナー、版本、コード期限を比較。' } },
    ],
    'fate-collab-guide': [
      { href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current warps', ja: '現在跳躍' }, description: { zh: '回到 4.6 跃迁观察入口算预算。', en: 'Return to v4.6 warp planning for budget checks.', ja: 'v4.6跳躍計画で予算確認。' } },
      { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '补齐联动前资源。', en: 'Top up resources before collab pulls.', ja: 'コラボ前に資源補充。' } },
    ],
    'cross-game-comparison-guide': [
      { href: '/starrail/guides/banner-schedule-guide', label: { zh: '崩铁当前跃迁', en: 'HSR current banners', ja: 'HSR現在跳躍' }, description: { zh: '如果你偏回合和低日常压力，继续看星琼预算。', en: 'If HSR fits your time budget, check live warps and Jade planning.', ja: 'HSRが合うなら現在跳躍と星玉計画へ。' } },
      { href: '/zzz/teams', label: { zh: 'ZZZ 配队工具', en: 'ZZZ team builder', ja: 'ZZZ編成ツール' }, description: { zh: '如果你偏快节奏动作，先看队伍和代理人协同。', en: 'If ZZZ fits your action preference, compare teams and agent synergy.', ja: 'ZZZなら編成と代理人相性を確認。' } },
    ],
    'farming-route-guide': [
      { href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current banners', ja: '現在跳躍' }, description: { zh: '按当前目标决定体力给谁。', en: 'Use live targets to decide who gets Trailblaze Power.', ja: '現在目標で開拓力配分を判断。' } },
      { href: '/starrail/guides/relic-guide', label: { zh: '遗器攻略', en: 'Relic guide', ja: '遺物攻略' }, description: { zh: '材料瓶颈解决后再刷遗器。', en: 'Farm relics after core material bottlenecks are clear.', ja: '素材後に遺物へ。' } },
    ],
  },
  wuwa: {
    'banner-schedule-guide': [
      { href: '/wuwa/guides/v3-5-preview-guide', label: { zh: 'v3.5 专题', en: 'v3.5 guide', ja: 'v3.5特集' }, description: { zh: '当前版本角色、平台和活动入口。', en: 'Current version characters, platforms, and events.', ja: '現在版本のキャラ、平台、イベント。' } },
      { href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '抽前先补星声。', en: 'Claim Astrite before pulling.', ja: 'ガチャ前に星声を回収。' } },
      { href: '/calendar', label: { zh: '跨游戏日历', en: 'Banner calendar', ja: 'ガチャ日程' }, description: { zh: '对比多游戏卡池、版本和兑换码期限。', en: 'Compare banners, versions, and code deadlines across games.', ja: '複数ゲームのバナー、版本、コード期限を比較。' } },
    ],
    'echo-advanced-guide': [
      { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '先确认要养谁。', en: 'Confirm who you are building first.', ja: '育成対象を確認。' } },
      { href: '/wuwa/build', label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' }, description: { zh: '把声骸和队伍连起来。', en: 'Connect Echoes with team builds.', ja: 'エコーと編成を接続。' } },
    ],
    'farming-guide': [
      { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '按目标角色安排体力。', en: 'Spend stamina around target characters.', ja: '目標キャラでスタミナ配分。' } },
      { href: '/wuwa/guides/echo-advanced-guide', label: { zh: '声骸攻略', en: 'Echo guide', ja: 'エコー攻略' }, description: { zh: '材料刷完再追声骸。', en: 'Move into Echoes after core materials.', ja: '素材後にエコーへ。' } },
    ],
  },
  zzz: {
    'banner-schedule-guide': [
      { href: '/zzz/version', label: { zh: 'v3.3 观察', en: 'v3.3 watch', ja: 'v3.3観察' }, description: { zh: '3.3 观察、3.2 回顾、奖励和平台入口。', en: 'v3.3 watch items, v3.2 recap, rewards, and platform routes.', ja: 'v3.3観察、v3.2回顧、報酬、平台。' } },
      { href: '/zzz/teams', label: { zh: '配队模拟器', en: 'ZZZ team builder', ja: 'ZZZ編成ツール' }, description: { zh: '抽前先看当前代理人能进哪些队伍。', en: 'Check best teams and agent synergy before pulling.', ja: '引く前に編成相性を確認。' } },
      { href: '/calendar', label: { zh: '跨游戏日历', en: 'Banner calendar', ja: 'ガチャ日程' }, description: { zh: '对比多游戏卡池、版本和兑换码期限。', en: 'Compare banners, versions, and code deadlines across games.', ja: '複数ゲームのバナー、版本、コード期限を比較。' } },
    ],
    'team-building-guide': [
      { href: '/zzz/guides/meta-teams-v3-guide', label: { zh: 'v3.3 观察期队伍', en: 'v3.3-watch teams', ja: 'v3.3観察期編成' }, description: { zh: '从通用配队继续看当前版本队伍优先级。', en: 'Move from team basics into current meta priorities.', ja: '基本編成から現在メタへ。' } },
      { href: '/zzz/guides/w-engine-guide', label: { zh: '音擎优先级', en: 'W-Engine priority', ja: '音動機優先度' }, description: { zh: '队伍确定后再判断是否追专属音擎。', en: 'After team roles are set, decide whether signatures are worth chasing.', ja: '編成後に餅武器価値を判断。' } },
    ],
    'v3-0-version-guide': [
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '先看 3.3 观察、3.2 回顾、复刻和菲林规划。', en: 'Check v3.3 watch items, v3.2 recap, reruns, and Polychrome planning.', ja: 'v3.3観察、v3.2回顧、復刻、菲林計画を確認。' } },
      { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '回顾版本前先补当前可领资源。', en: 'Claim live rewards before using the version recap.', ja: '振り返り前に現在の報酬を回収。' } },
    ],
    'cross-game-comparison-guide': [
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '绝区零当前卡池', en: 'ZZZ current banners', ja: 'ZZZ現在バナー' }, description: { zh: '决定入坑前先看当前代理人和菲林规划。', en: 'Before starting, check live agents and Polychrome planning.', ja: '開始前に現在代理人と菲林計画を確認。' } },
      { href: '/genshin/guides/banner-schedule-guide', label: { zh: '原神当前祈愿', en: 'Genshin current banners', ja: '原神現在バナー' }, description: { zh: '大世界探索路线继续看原神卡池和原石。', en: 'For open-world exploration, compare Genshin banners and Primogems.', ja: '探索重視なら原神バナーと原石へ。' } },
    ],
    'build-jane-doe': [
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '先确认简·杜相关卡池和菲林预算。', en: 'Check Jane Doe banner context and Polychrome budget first.', ja: 'Jane Doeバナーと菲林予算を確認。' } },
      { href: '/zzz/teams', label: { zh: '简·杜配队', en: 'Jane Doe teams', ja: 'Jane Doe編成' }, description: { zh: '配装前先确认异常队和当前队伍缺口。', en: 'Check Anomaly teams and roster gaps before finishing the build.', ja: '異常編成と不足枠を確認。' } },
    ],
    'steam-3-0-start-guide': [
      { href: '/zzz/version', label: { zh: 'v3.3 观察入口', en: 'v3.3 watch hub', ja: 'v3.3観察入口' }, description: { zh: '先走当前版本入口。', en: 'Start from the current version route.', ja: '現在版本から開始。' } },
      { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '新号先领资源。', en: 'Claim starter resources first.', ja: '新規資源を回収。' } },
    ],
    'w-engine-guide': [
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '先确认代理人是否到手。', en: 'Check whether the agent is secured.', ja: '代理人確保を確認。' } },
      { href: '/zzz/teams', label: { zh: '配队模拟器', en: 'Team builder', ja: '編成ツール' }, description: { zh: '按队伍定位决定是否追专属音擎。', en: 'Use team role and synergy before chasing signatures.', ja: '編成役割で餅武器優先度を判断。' } },
    ],
    'meta-teams-v3-guide': [
      { href: '/zzz/teams', label: { zh: '配队模拟器', en: 'ZZZ team builder', ja: 'ZZZ編成ツール' }, description: { zh: '把推荐队伍落到你的角色池。', en: 'Map meta teams onto your own roster.', ja: '推奨編成を手持ちに合わせる。' } },
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '按队伍缺口决定抽卡优先级。', en: 'Use team gaps to set pull priority.', ja: '編成不足でガチャ優先度を決める。' } },
    ],
    'drive-disc-guide': [
      { href: '/zzz/guides/w-engine-guide', label: { zh: '音擎指南', en: 'W-Engine guide', ja: '音動機攻略' }, description: { zh: '配装和武器一起看。', en: 'Read gear and weapons together.', ja: '装備と武器を一緒に。' } },
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '按当前代理人决定刷取。', en: 'Farm around current agents.', ja: '現在代理人で厳選判断。' } },
    ],
    'farming-route-guide': [
      { href: '/zzz/teams', label: { zh: '配队模拟器', en: 'ZZZ team builder', ja: 'ZZZ編成ツール' }, description: { zh: '按队伍缺口决定体力优先级。', en: 'Use team gaps to decide Battery Charge priority.', ja: '編成不足でスタミナ優先度を判断。' } },
      { href: '/zzz/guides/drive-disc-guide', label: { zh: '驱动盘刷取', en: 'Drive Disc farming', ja: 'ドライブ厳選' }, description: { zh: '材料刷完后再进入驱动盘路线。', en: 'Move into Drive Discs after core materials.', ja: '素材後にドライブへ。' } },
    ],
  },
  nte: {
    'photo-mode-guide': [
      { href: '/nte/version', label: { zh: '版本专题', en: 'Version hub', ja: '版本特集' }, description: { zh: '回到 v1.2 当前内容。', en: 'Return to current v1.2 content.', ja: 'v1.2内容へ戻る。' } },
      { href: '/nte/map', label: { zh: '地图', en: 'Map', ja: 'マップ' }, description: { zh: '找城市区域和拍照点。', en: 'Find city zones and photo spots.', ja: '都市区域と撮影地へ。' } },
    ],
    'damage-formula': [
      { href: '/nte/guides/talent-priority', label: { zh: '技能升级顺序', en: 'Talent priority', ja: 'スキル優先度' }, description: { zh: '算完伤害后决定先升哪些技能。', en: 'After checking damage, decide which skills to level first.', ja: 'ダメージ確認後にスキル優先度へ。' } },
      { href: '/nte/build', label: { zh: '角色配装', en: 'Build routes', ja: 'ビルド' }, description: { zh: '把公式、弧盘、武器和属性词条接起来。', en: 'Connect formula, disks, weapons, and stat priorities.', ja: '式、弧盤、武器、ステータスを接続。' } },
    ],
    'talent-priority': [
      { href: '/nte/guides/damage-formula', label: { zh: '伤害公式', en: 'Damage formula', ja: 'ダメージ式' }, description: { zh: '先看倍率、暴击、防御和抗性怎么影响收益。', en: 'Check multipliers, crit, defense, and resistance impact.', ja: '倍率、会心、防御、耐性を確認。' } },
      { href: '/nte/items', label: { zh: '材料图鉴', en: 'Material database', ja: '素材図鑑' }, description: { zh: '按技能优先级继续查材料来源。', en: 'Use the upgrade order to plan material farming.', ja: '優先度に合わせて素材を確認。' } },
    ],
  },
  sea: {
    'open-beta-version-center': [
      { href: '/sea/download', label: { zh: '下载主入口', en: 'Download hub', ja: 'DL入口' }, description: { zh: '把官网、PC、手机、云游戏入口统一到可执行下载页。', en: 'Move from status context into official PC, mobile, and cloud download routes.', ja: '公式、PC、モバイル、クラウドDLへ進みます。' } },
      { href: '/sea/guides/launch-day-guide', label: { zh: '开服行动路线', en: 'Launch route', ja: '開始ルート' }, description: { zh: '能进服后再看账号、福利、黑券和首日优先级。', en: 'After login, check account, rewards, selector, and day-one priorities.', ja: 'ログイン後にアカウント、報酬、黒券、初日優先度を確認。' } },
    ],
    'launch-day-guide': [
      { href: '/sea/download', label: { zh: '还没下载先点这里', en: 'Install first', ja: 'まずDL' }, description: { zh: '下载、安装、平台和设备问题回到主入口。', en: 'Use the main hub for download, install, platform, and device questions.', ja: 'DL、インストール、平台、端末問題へ。' } },
      { href: '/sea/calculator', label: { zh: '黑券与资源工具', en: 'Selector and resources', ja: '黒券と資源' }, description: { zh: '先算 6 选 1、周常打捞、好金砖和外观预算。', en: 'Plan the selector, weekly dredging, Good Gold Bricks, and outfit budget.', ja: '6択、週課、好金砖、衣装予算を計算。' } },
    ],
    'download-install-guide': [
      { href: '/sea/download', label: { zh: '下载主入口', en: 'Download hub', ja: 'DL入口' }, description: { zh: '先确认官网、TapTap、App Store、Steam 和启动器入口。', en: 'Confirm official site, TapTap, App Store, Steam, and launcher routes.', ja: '公式、TapTap、App Store、Steam、ランチャーを確認。' } },
      { href: '/sea/guides/pc-mobile-cross-progression-faq', label: { zh: 'PC 手机互通', en: 'PC/mobile cross-progress', ja: 'PC/モバイル連携' }, description: { zh: '安装后先确认账号、区服、渠道和奖励领取边界。', en: 'After install, confirm account, server, channel, and reward boundaries.', ja: 'インストール後にアカウント、鯖、渠道、報酬を確認。' } },
    ],
  },
  roco: {
    'global-cn-content-roadmap': [
      { href: '/roco/guides/global-launch-readiness-checklist', label: { zh: '首发验收清单', en: 'Launch checklist', ja: 'ローンチ確認リスト' }, description: { zh: '将路线图转成 CBT 到首发的可验收条件。', en: 'Turn the roadmap into CBT-to-launch acceptance criteria.', ja: 'ロードマップをCBTからローンチまでの確認条件へ。' } },
      { href: '/roco/guides/global-cn-release-governance', label: { zh: '跨服版本治理', en: 'CN-global governance', ja: '地域間リリース統治' }, description: { zh: '明确什么同步、什么本地化验证、何时公告或回滚。', en: 'Define parity, localization gates, communication, and rollback.', ja: '同期、翻訳ゲート、告知、ロールバックを定義。' } },
    ],
    'global-launch-readiness-checklist': [
      { href: '/roco/guides/global-cbt-to-launch-decision-gates', label: { zh: 'CBT 上线决策', en: 'CBT launch gates', ja: 'CBTローンチ判断' }, description: { zh: '把验收清单转成测试问题、缺陷优先级和 Go/No-Go 门槛。', en: 'Turn acceptance checks into test questions, defect priority, and Go/No-Go gates.', ja: '確認項目をテスト課題、不具合優先度、Go/No-Goへ変換。' } },
      { href: '/roco/guides/global-accessibility-cross-device-playbook', label: { zh: '无障碍与跨设备', en: 'Accessibility & devices', ja: 'アクセシビリティ・端末' }, description: { zh: '把键鼠、手柄、触控、文本和断线恢复纳入首发验收。', en: 'Add keyboard, controller, touch, text, and recovery to launch validation.', ja: '鍵盤、パッド、タッチ、文字、切断復旧をローンチ検証へ。' } },
      { href: '/roco/guides/global-first-30-days-pve-plan', label: { zh: '前 30 天 PvE 包', en: 'Days 1–30 PvE plan', ja: '1〜30日PvE案' }, description: { zh: '首发通过后，安排稳定的挑战区、周常和追赶机制。', en: 'After launch readiness, plan challenge zones, weekly goals, and catch-up.', ja: 'ローンチ確認後、挑戦、週次、追いつきへ。' } },
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '运营指标与实验', en: 'Live-ops metrics', ja: '運営指標と実験' }, description: { zh: '用统一指标验证首发，而不是只看下载和总参与。', en: 'Validate launch with shared metrics, not downloads alone.', ja: 'DL数だけでなく共通指標でローンチを検証。' } },
    ],
    'global-first-30-days-pve-plan': [
      { href: '/roco/guides/global-returning-player-event-legacy-playbook', label: { zh: '回流与活动遗产', en: 'Return & event legacy', ja: '復帰・イベント遺産' }, description: { zh: '为中断玩家补上核心养成、故事归档和可规划的追赶路径。', en: 'Add core progression, story archive, and plannable catch-up for returners.', ja: '復帰者へ核心育成、物語記録、計画可能な追いつきを追加。' } },
      { href: '/roco/guides/global-days-31-90-season-event-plan', label: { zh: '31–90 天赛季包', en: 'Days 31–90 season plan', ja: '31〜90日シーズン案' }, description: { zh: '首月循环稳定后，再进入首赛季和全球社区活动。', en: 'Move into first-season and global-event planning after month one stabilizes.', ja: '初月安定後に初回シーズンと世界イベントへ。' } },
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '首月指标', en: 'Month-one metrics', ja: '初月指標' }, description: { zh: '检查失败重试、材料来源和回归追赶是否有效。', en: 'Check retries, material sourcing, and returner catch-up.', ja: '再挑戦、素材導線、復帰者追いつきを確認。' } },
    ],
    'global-days-31-90-season-event-plan': [
      { href: '/roco/guides/global-returning-player-event-legacy-playbook', label: { zh: '回流与活动遗产', en: 'Return & event legacy', ja: '復帰・イベント遺産' }, description: { zh: '把赛季结束后的归档、核心奖励替代和回流追赶写入活动设计。', en: 'Put archives, core-reward alternatives, and returner catch-up into season design.', ja: 'アーカイブ、核心報酬代替、復帰者追いつきをシーズン設計へ。' } },
      { href: '/roco/guides/global-localization-cultural-event-playbook', label: { zh: '本地化与文化活动', en: 'Localization playbook', ja: 'ローカライズ手帳' }, description: { zh: '为赛季和全球活动补上术语、时区、补领与复刻规则。', en: 'Add terminology, time-zone, late-claim, and rerun rules to seasonal events.', ja: 'シーズンイベントへ用語、時区、補受取、復刻規則を追加。' } },
      { href: '/roco/guides/global-cn-release-governance', label: { zh: '跨服版本治理', en: 'CN-global governance', ja: '地域間リリース統治' }, description: { zh: '把赛季移植、区域差异、补领与回滚写进发布规则。', en: 'Put ports, regional differences, late claims, and rollback into release rules.', ja: '移植、地域差、補受取、ロールバックを配信規則へ。' } },
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '活动复盘指标', en: 'Event recap metrics', ja: 'イベント振り返り指標' }, description: { zh: '评估时区公平、活动回流和旧新精灵使用分布。', en: 'Evaluate time-zone fairness, return, and old/new creature use.', ja: '時区公平、復帰、旧新精霊の利用を評価。' } },
    ],
    'global-cn-release-governance': [
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '治理指标与实验', en: 'Governance metrics', ja: '統治指標と実験' }, description: { zh: '将发布门槛与上线后的数据、实验和事故复盘连接起来。', en: 'Connect release gates with live data, experiments, and incident reviews.', ja: 'リリースゲートを運用データ、実験、事故振り返りへ接続。' } },
      { href: '/roco/guides/global-cn-content-roadmap', label: { zh: '回到补充路线图', en: 'Return to roadmap', ja: '補完ロードマップへ戻る' }, description: { zh: '查看首发到 90 天的内容顺序和长期双向策略。', en: 'Review launch-to-day-90 sequencing and long-term two-way strategy.', ja: 'ローンチから90日と長期双方向戦略を確認。' } },
    ],
    'global-live-ops-metrics-experiments': [
      { href: '/roco/guides/global-cbt-to-launch-decision-gates', label: { zh: 'CBT 上线决策', en: 'CBT launch gates', ja: 'CBTローンチ判断' }, description: { zh: '将测试指标和缺陷证据用于正式上线的 Go/No-Go 判断。', en: 'Use test metrics and defect evidence for launch Go/No-Go decisions.', ja: 'テスト指標と不具合証拠をGo/No-Go判断に使う。' } },
      { href: '/roco/guides/global-launch-readiness-checklist', label: { zh: '首发验收清单', en: 'Launch checklist', ja: 'ローンチ確認リスト' }, description: { zh: '将指标回写到新手、跨端、本地化与安全验收。', en: 'Feed metrics back into onboarding, cross-play, localization, and safety acceptance.', ja: '指標を導入、クロスプレイ、翻訳、安全の確認へ戻す。' } },
      { href: '/roco/guides/global-days-31-90-season-event-plan', label: { zh: '赛季与活动包', en: 'Season and event plan', ja: 'シーズン・イベント案' }, description: { zh: '将实验结果用于下一阶段赛季和全球活动调整。', en: 'Use experiment results to tune the next season and global event.', ja: '実験結果を次のシーズンと世界イベントへ反映。' } },
    ],
    'global-localization-cultural-event-playbook': [
      { href: '/roco/guides/global-player-support-trust-playbook', label: { zh: '玩家支持与信任', en: 'Player support', ja: 'プレイヤーサポート' }, description: { zh: '将本地化、奖励和时区问题接入可追踪的支持与补偿路径。', en: 'Connect localization, reward, and time-zone issues to trackable support and compensation paths.', ja: '翻訳、報酬、時区問題を追跡可能なサポート・補償導線へ。' } },
      { href: '/roco/guides/global-days-31-90-season-event-plan', label: { zh: '31–90 天赛季包', en: 'Days 31–90 season plan', ja: '31〜90日シーズン案' }, description: { zh: '将文化活动模板应用到首赛季与全球社区活动。', en: 'Apply the cultural-event template to the first season and global community event.', ja: '文化イベントの型を初回シーズンと世界イベントに適用。' } },
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '本地化指标', en: 'Localization metrics', ja: 'ローカライズ指標' }, description: { zh: '用时区参与、文本理解和补领数据复盘本地化效果。', en: 'Review localization through time-zone, comprehension, and late-claim data.', ja: '時区参加、文章理解、補受取データでローカライズを振り返る。' } },
    ],
    'global-cbt-to-launch-decision-gates': [
      { href: '/roco/guides/global-accessibility-cross-device-playbook', label: { zh: '无障碍与跨设备', en: 'Accessibility & devices', ja: 'アクセシビリティ・端末' }, description: { zh: '验证不同输入、语言、网络和设备都可完成核心流程。', en: 'Verify core completion across input, language, network, and device conditions.', ja: '入力、言語、通信、端末の違いでもコア完了を検証。' } },
      { href: '/roco/guides/global-economy-monetization-fairness-playbook', label: { zh: '经济与付费公平', en: 'Economy & fairness', ja: '経済・課金公平性' }, description: { zh: '将核心养成来源、价格透明和故障恢复列入上线门槛。', en: 'Put progression sources, price clarity, and recovery into launch gates.', ja: '育成入手元、価格透明性、障害復旧をローンチゲートへ。' } },
      { href: '/roco/guides/global-social-safety-guild-playbook', label: { zh: '社交安全与公会', en: 'Social safety & guilds', ja: 'ソーシャル安全・ギルド' }, description: { zh: '将跨端组队、权限、举报与未成年人保护列入上线门槛。', en: 'Include cross-play parties, permissions, reports, and youth safety in launch gates.', ja: 'クロスプレイPT、権限、通報、未成年保護をローンチゲートへ。' } },
      { href: '/roco/guides/global-launch-readiness-checklist', label: { zh: '首发验收清单', en: 'Launch checklist', ja: 'ローンチ確認リスト' }, description: { zh: '回到核心循环、跨端、本地化和服务的上线条件。', en: 'Return to core-loop, cross-play, localization, and service readiness.', ja: '基本循環、クロスプレイ、翻訳、サービスの準備条件へ戻る。' } },
      { href: '/roco/guides/global-cn-release-governance', label: { zh: '跨服版本治理', en: 'CN-global governance', ja: '地域間リリース統治' }, description: { zh: '将 CBT 结论接入跨服移植、公告和回滚规则。', en: 'Connect CBT conclusions to cross-region ports, communication, and rollback.', ja: 'CBT結論を地域間移植、告知、ロールバックへ接続。' } },
    ],
    'global-player-support-trust-playbook': [
      { href: '/roco/guides/global-economy-monetization-fairness-playbook', label: { zh: '经济与付费公平', en: 'Economy & fairness', ja: '経済・課金公平性' }, description: { zh: '把价格、退款、未交付和代币异常接入公平性与恢复规则。', en: 'Connect prices, refunds, non-delivery, and token faults to fairness and recovery rules.', ja: '価格、返金、未配信、代币異常を公平性・復旧規則へ接続。' } },
      { href: '/roco/guides/global-social-safety-guild-playbook', label: { zh: '社交安全与公会', en: 'Social safety & guilds', ja: 'ソーシャル安全・ギルド' }, description: { zh: '将举报、申诉、权限事故和社区保护纳入支持闭环。', en: 'Bring reports, appeals, permission incidents, and community protection into support operations.', ja: '通報、異議申立て、権限事故、コミュニティ保護をサポート運用へ。' } },
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '支持与信任指标', en: 'Support metrics', ja: 'サポート指標' }, description: { zh: '用处理时长、补发正确率和语言差异改进服务。', en: 'Improve service through resolution time, restoration accuracy, and language-gap data.', ja: '処理時間、復旧正確性、言語差データでサービスを改善。' } },
    ],
    'global-social-safety-guild-playbook': [
      { href: '/roco/guides/global-player-support-trust-playbook', label: { zh: '玩家支持与信任', en: 'Player support', ja: 'プレイヤーサポート' }, description: { zh: '查看进度、奖励、退款、申诉和隐私问题的支持规则。', en: 'Review support rules for progression, rewards, refunds, appeals, and privacy.', ja: '進行、報酬、返金、異議申立て、プライバシーのサポート規則へ。' } },
      { href: '/roco/guides/global-first-30-days-pve-plan', label: { zh: '前 30 天 PvE 包', en: 'Days 1–30 PvE plan', ja: '1〜30日PvE案' }, description: { zh: '确认单人、公开匹配和公会协作都能获得核心养成。', en: 'Ensure solo, public-match, and guild routes all access core progression.', ja: 'ソロ、公開マッチ、ギルドの全ルートで核心育成へアクセス。' } },
    ],
    'global-economy-monetization-fairness-playbook': [
      { href: '/roco/guides/global-returning-player-event-legacy-playbook', label: { zh: '回流与活动遗产', en: 'Return & event legacy', ja: '復帰・イベント遺産' }, description: { zh: '将代币期限、核心奖励替代和回流追赶接入经济公平性审查。', en: 'Connect token expiry, core-reward alternatives, and returner catch-up to fairness review.', ja: '代币期限、核心報酬代替、復帰者追いつきを公平性レビューへ接続。' } },
      { href: '/roco/guides/global-player-support-trust-playbook', label: { zh: '玩家支持与信任', en: 'Player support', ja: 'プレイヤーサポート' }, description: { zh: '补齐退款、未交付、补偿与隐私的可追踪支持路径。', en: 'Add trackable support for refunds, non-delivery, compensation, and privacy.', ja: '返金、未配信、補償、プライバシーの追跡可能なサポートを確認。' } },
      { href: '/roco/guides/global-live-ops-metrics-experiments', label: { zh: '运营指标与实验', en: 'Live-ops metrics', ja: '運営指標と実験' }, description: { zh: '用来源/消耗、回流追赶和地区差异验证经济是否健康。', en: 'Use source/sink, catch-up, and regional gaps to validate economic health.', ja: '入手/消費、追いつき、地域差で経済の健全性を検証。' } },
      { href: '/roco/guides/global-first-30-days-pve-plan', label: { zh: '前 30 天 PvE 包', en: 'Days 1–30 PvE plan', ja: '1〜30日PvE案' }, description: { zh: '把稳定的核心养成来源和追赶路径写入首月内容。', en: 'Put dependable progression sources and catch-up into month-one content.', ja: '安定した育成入手元と追いつきを初月コンテンツへ。' } },
    ],
    'global-accessibility-cross-device-playbook': [
      { href: '/roco/guides/global-cbt-to-launch-decision-gates', label: { zh: 'CBT 上线决策', en: 'CBT launch gates', ja: 'CBTローンチ判断' }, description: { zh: '把跨设备与无障碍证据转成可阻止上线的明确门槛。', en: 'Turn cross-device and accessibility evidence into concrete launch gates.', ja: 'クロスデバイス・アクセシビリティ証拠を明確なローンチゲートへ。' } },
      { href: '/roco/guides/global-localization-cultural-event-playbook', label: { zh: '本地化与文化活动', en: 'Localization playbook', ja: 'ローカライズ手帳' }, description: { zh: '检查大字体、小屏、手柄焦点和多语言任务的可读性。', en: 'Check large text, small screens, controller focus, and multilingual task readability.', ja: '大きな文字、小画面、パッド焦点、多言語任務の可読性を確認。' } },
      { href: '/roco/guides/global-player-support-trust-playbook', label: { zh: '玩家支持与信任', en: 'Player support', ja: 'プレイヤーサポート' }, description: { zh: '将无法操作、无法阅读或断线恢复问题接入支持和事故响应。', en: 'Connect blocked input, unreadable text, and recovery issues to support response.', ja: '操作不能、読めない文章、復旧問題をサポート対応へ接続。' } },
    ],
    'global-returning-player-event-legacy-playbook': [
      { href: '/roco/guides/global-days-31-90-season-event-plan', label: { zh: '31–90 天赛季包', en: 'Days 31–90 season plan', ja: '31〜90日シーズン案' }, description: { zh: '将归档、替代来源和回流数据用于下一季活动设计。', en: 'Use archives, alternatives, and returner data in next-season design.', ja: 'アーカイブ、代替入手元、復帰データを次シーズン設計へ。' } },
      { href: '/roco/guides/global-economy-monetization-fairness-playbook', label: { zh: '经济与付费公平', en: 'Economy & fairness', ja: '経済・課金公平性' }, description: { zh: '检查追赶材料、过期代币和可选收藏是否保持公平与透明。', en: 'Review catch-up materials, expiring tokens, and optional collections for fairness.', ja: '追いつき素材、期限付き代币、任意コレクションの公平性を確認。' } },
      { href: '/roco/guides/global-localization-cultural-event-playbook', label: { zh: '本地化与文化活动', en: 'Localization playbook', ja: 'ローカライズ手帳' }, description: { zh: '为旧活动保留多语言故事摘要、规则和文化语境。', en: 'Preserve multilingual story recaps, rules, and cultural context for past events.', ja: '過去イベントに多言語の物語要約、規則、文化文脈を残す。' } },
    ],
    'cbt-registration-guide': [
      { href: '/roco/version', label: { zh: '版本时间线', en: 'Version timeline', ja: '版本タイムライン' }, description: { zh: '报名后接着看 CBT 到正式版的节点和已确认内容。', en: 'After signing up, continue into the CBT-to-launch timeline and confirmed content.', ja: '申込後はCBTから正式版までの予定と確定情報へ。' } },
      { href: '/roco/guides/platforms-and-download-guide', label: { zh: '平台与下载', en: 'Platforms & download', ja: '平台とDL' }, description: { zh: '确认 CBT 可玩平台与设备要求。', en: 'Confirm CBT platforms and device requirements.', ja: 'CBTの対応平台と端末要件を確認。' } },
    ],
    'starter-guide': [
      { href: '/roco/guides/jinies-guide', label: { zh: '精灵图鉴', en: 'Jinies guide', ja: 'ジニー図鑑' }, description: { zh: '御三家之外，看 18 元素、血统和特殊形态。', en: 'Beyond starters, learn the 18 elements, Bloodline, and special forms.', ja: 'スターター以外に18属性、血統、特殊形態を確認。' } },
      { href: '/roco/guides/battle-system-guide', label: { zh: '战斗系统', en: 'Battle system', ja: '戦闘システム' }, description: { zh: '先懂回合制、体力条和克制再定养成方向。', en: 'Understand turn-based combat, stamina, and type hints before building.', ja: 'ターン制、スタミナ、相性を見てから育成方針を決める。' } },
    ],
    'what-is-roco-kingdom': [
      { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名指南', en: 'CBT registration', ja: 'CBT登録ガイド' }, description: { zh: '了解游戏后，先完成 10/27 首测报名。', en: 'Now that you know the game, sign up for the October 27 CBT.', ja: 'ゲーム理解後は10/27のCBTに申し込み。' } },
      { href: '/roco/guides/pre-registration-rewards-faq', label: { zh: '预约奖励 FAQ', en: 'Pre-registration FAQ', ja: '事前登録FAQ' }, description: { zh: '预约福利、资格和语言支持疑问看这里。', en: 'Check rewards, eligibility, and language support here.', ja: '報酬、資格、言語サポートをここで確認。' } },
    ],
    'platforms-and-download-guide': [
      { href: '/roco/download', label: { zh: '下载主入口', en: 'Download hub', ja: 'DL入口' }, description: { zh: '把官网、商店和平台状态集中到可执行下载页。', en: 'Move into the executable download page with store status.', ja: 'ストア状況を含むDLページへ進みます。' } },
      { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名', en: 'CBT registration', ja: 'CBT登録' }, description: { zh: 'CBT 资格与报名绑定，先完成预注册。', en: 'CBT eligibility ties to pre-registration, so sign up first.', ja: 'CBT資格は事前登録と連動するため先に申し込み。' } },
    ],
    'jinies-guide': [
      { href: '/roco/characters', label: { zh: '精灵图鉴数据库', en: 'Jinie database', ja: 'ジニーデータベース' }, description: { zh: '按属性、稀有度和栖息地继续查具体精灵。', en: 'Browse specific Jinies by element, rarity, and habitat.', ja: '属性、レア度、生息地で具体的なジニーを確認。' } },
      { href: '/roco/guides/battle-system-guide', label: { zh: '战斗系统', en: 'Battle system', ja: '戦闘システム' }, description: { zh: '把元素克制和血统技能接进实战。', en: 'Connect elements and Bloodline skills to real combat.', ja: '元素相性と血統スキルを実戦に活かす。' } },
    ],
    'battle-system-guide': [
      { href: '/roco/guides/jinies-guide', label: { zh: '精灵图鉴', en: 'Jinies guide', ja: 'ジニー図鑑' }, description: { zh: '先确认元素、血统和捕捉方式再组队。', en: 'Check elements, Bloodline, and catching before teambuilding.', ja: '編成前に属性、血統、捕獲方法を確認。' } },
      { href: '/roco/guides/starter-guide', label: { zh: '御三家选择', en: 'Starter guide', ja: 'スターター選択' }, description: { zh: '回到开局，按节奏和生存需求选御三家。', en: 'Return to the opener and pick a starter by pace and survival.', ja: '序盤のペースと耐久でスターターを選ぶ。' } },
    ],
    'co-op-and-social-guide': [
      { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名', en: 'CBT registration', ja: 'CBT登録' }, description: { zh: '找队友前先确认自己是否拿到测试资格。', en: 'Confirm your own CBT eligibility before forming groups.', ja: '仲間集めの前に自分のCBT資格を確認。' } },
      { href: '/roco/guides/what-is-roco-kingdom', label: { zh: '游戏是什么', en: 'What is Roco Kingdom?', ja: 'ゲーム概要' }, description: { zh: '了解世界设定和社交定位。', en: 'Review the setting and social positioning.', ja: '世界観とソーシャル定位を振り返る。' } },
    ],
    'pre-registration-rewards-faq': [
      { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名指南', en: 'CBT registration', ja: 'CBT登録ガイド' }, description: { zh: '福利之外，报名入口和必填问卷在这里。', en: 'Beyond rewards, find the signup page and questionnaire here.', ja: '報酬以外に申込入口と必須アンケートはこちら。' } },
      { href: '/roco/guides/platforms-and-download-guide', label: { zh: '平台与下载', en: 'Platforms & download', ja: '平台とDL' }, description: { zh: '确认可玩平台后规划设备。', en: 'Plan your device after checking supported platforms.', ja: '対応平台確認後に端末を準備。' } },
    ],
    'is-roco-kingdom-free-to-play': [
      { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名指南', en: 'CBT registration', ja: 'CBT登録ガイド' }, description: { zh: '免费入坑，先报名 10/27 首测。', en: 'Free to start — sign up for the October 27 CBT.', ja: '無料で開始。まず10/27 CBTに申込。' } },
      { href: '/roco/guides/roco-kingdom-vs-pokemon', label: { zh: '对比宝可梦', en: 'vs Pokemon', ja: 'ポケモン比較' }, description: { zh: '和买断制精灵收集游戏怎么选。', en: 'How it compares to premium creature collectors.', ja: '買い切り収集ゲームとの違い。' } },
    ],
    'roco-kingdom-release-date-guide': [
      { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名指南', en: 'CBT registration', ja: 'CBT登録ガイド' }, description: { zh: '等正式版之前，先参加 10/27 首测。', en: 'While waiting for launch, join the October 27 CBT.', ja: '正式版待ちの間に10/27 CBTへ。' } },
      { href: '/roco/guides/platforms-and-download-guide', label: { zh: '平台与下载', en: 'Platforms & download', ja: '平台とDL' }, description: { zh: '确认各阶段可玩平台。', en: 'Check platforms per release phase.', ja: '各段階の対応平台を確認。' } },
    ],
    'roco-kingdom-vs-pokemon': [
      { href: '/roco/guides/is-roco-kingdom-free-to-play', label: { zh: '免费模式详解', en: 'F2P model', ja: 'F2Pモデル' }, description: { zh: '商业模式差异的具体说明。', en: 'Details on the monetization difference.', ja: '課金モデルの違いを詳しく。' } },
      { href: '/roco/guides/co-op-and-social-guide', label: { zh: '联机与社交', en: 'Co-op & social', ja: '協力・ソーシャル' }, description: { zh: '共享世界的社交玩法一览。', en: 'See the shared-world social features.', ja: '共有世界のソーシャル機能。' } },
    ],
    'roco-kingdom-crossplay-guide': [
      { href: '/roco/guides/co-op-and-social-guide', label: { zh: '联机与社交指南', en: 'Co-op guide', ja: '協力ガイド' }, description: { zh: '跨平台组队能玩什么。', en: 'What cross-platform parties can do together.', ja: 'クロスプレイでできること。' } },
      { href: '/roco/guides/platforms-and-download-guide', label: { zh: '平台与下载', en: 'Platforms & download', ja: '平台とDL' }, description: { zh: '各平台下载入口。', en: 'Download entry points per platform.', ja: '各平台のDL入口。' } },
    ],
  },
};

const GUIDE_FALLBACK_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  genshin: [
    { href: '/genshin/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看抽卡和资源规划。', en: 'Continue with pull and resource planning.', ja: 'ガチャと資源計画へ。' } },
    { href: '/genshin/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先补可领取资源。', en: 'Claim available resources.', ja: '資源を回収。' } },
  ],
  starrail: [
    { href: '/starrail/guides/banner-schedule-guide', label: { zh: '当前跃迁', en: 'Current warps', ja: '現在跳躍' }, description: { zh: '继续看星琼规划。', en: 'Continue with Jade planning.', ja: '星玉計画へ。' } },
    { href: '/starrail/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先领版本资源。', en: 'Claim patch resources.', ja: '版本資源を回収。' } },
  ],
  wuwa: [
    { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看星声和角色目标。', en: 'Continue with Astrite and targets.', ja: '星声と目標へ。' } },
    { href: '/wuwa/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '抽前先补资源。', en: 'Claim resources before pulling.', ja: '資源を回収。' } },
  ],
  zzz: [
    { href: '/zzz/guides/banner-schedule-guide', label: { zh: '当前卡池', en: 'Current banners', ja: '現在バナー' }, description: { zh: '继续看菲林规划。', en: 'Continue with Polychrome planning.', ja: 'ポリクローム計画へ。' } },
    { href: '/zzz/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, description: { zh: '先领码再抽。', en: 'Claim codes before pulling.', ja: 'コード後にガチャ。' } },
  ],
  roco: [
    { href: '/roco/guides/cbt-registration-guide', label: { zh: 'CBT 报名指南', en: 'CBT registration', ja: 'CBT登録ガイド' }, description: { zh: '首测前先确认报名与资格。', en: 'Secure signup and eligibility before the first test.', ja: '初回テスト前に申込と資格を確認。' } },
    { href: '/roco/guides/starter-guide', label: { zh: '御三家选择', en: 'Starter guide', ja: 'スターター選択' }, description: { zh: '开局路线与捕捉建议。', en: 'Early pacing and catching advice.', ja: '序盤ルートと捕獲のコツ。' } },
  ],
  'roco-cn': [
    { href: '/roco-cn/guides/redeem-codes-cn', label: { zh: '兑换码大全', en: 'Redeem codes', ja: '交換コード一覧' }, description: { zh: '先领当前可用的洛克钻与资源。', en: 'Claim Luoke Diamonds and resources first.', ja: '先にロックダイヤと資源を回収。' } },
    { href: '/roco-cn/guides/starter-guide-cn', label: { zh: '新手开荒', en: 'Starter guide', ja: '初心者ガイド' }, description: { zh: '御三家选择与开局路线。', en: 'Starter picks and day-one route.', ja: '御三家選びと初日ルート。' } },
    { href: '/roco-cn/guides/s2-season-guide', label: { zh: 'S2 赛季指南', en: 'S2 season guide', ja: 'S2シーズンガイド' }, description: { zh: '赛季内容与迪莫超进化。', en: 'Season content and Dimo Ultra Evolution.', ja: 'シーズン内容とDimo超進化。' } },
    { href: '/roco-cn/characters', label: { zh: '精灵图鉴', en: 'Jinie database', ja: 'ジニー図鑑' }, description: { zh: '查热门精灵捕捉与进化。', en: 'Check popular Jinies and evolutions.', ja: '人気ジニーの捕獲と進化を確認。' } },
  ],
};

const GUIDE_INTENT_GROUPS = [
  ['banner', 'schedule', 'wish', 'pity', 'pull', 'gacha', '祈愿', '卡池', '保底', '抽卡'],
  ['comparison', 'compare', 'vs', '对比', '横评'],
  ['farming', 'route', 'material', '材料', '路线'],
  ['team', 'meta', 'tier', 'build', '配队', '强度', '排行'],
  ['echo', 'disc', 'engine', 'weapon', 'artifact', '声骸', '驱动盘', '音擎', '武器', '圣遗物'],
] as const;

async function getGuideRuntime(gameId: GameId): Promise<GuideRuntime> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/guides');
      return makeRuntime(mod.genshinGuides, mod.GENSHIN_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/guides');
      return makeRuntime(mod.starrailGuides, mod.STARRAIL_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/guides');
      return makeRuntime(mod.wuwaGuides, mod.WUWA_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/guides');
      return makeRuntime(mod.guides, mod.NTE_GUIDE_CATEGORIES, mod.getGuideById, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideContent, mod.getGuideCategory, mod.getGuideFaqQuestion, mod.getGuideFaqAnswer);
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/guides');
      return makeRuntime(mod.zzzGuides, mod.ZZZ_GUIDE_CATEGORIES, mod.getZzzGuideById, mod.getZzzGuideTitle, mod.getZzzGuideSummary, mod.getZzzGuideContent, mod.getZzzGuideCategory, mod.getZzzGuideFaqQuestion, mod.getZzzGuideFaqAnswer);
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/guides');
      return makeRuntime(mod.guihuanGuides, mod.GUIHUAN_GUIDE_CATEGORIES, mod.getGuihuanGuideById, mod.getGuihuanGuideTitle, mod.getGuihuanGuideSummary, mod.getGuihuanGuideContent, mod.getGuihuanGuideCategory, mod.getGuihuanGuideFaqQuestion, mod.getGuihuanGuideFaqAnswer);
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/guides');
      return makeRuntime(mod.anantaGuides, mod.ANANTA_GUIDE_CATEGORIES, mod.getAnantaGuideById, mod.getAnantaGuideTitle, mod.getAnantaGuideSummary, mod.getAnantaGuideContent, mod.getAnantaGuideCategory, mod.getAnantaGuideFaqQuestion, mod.getAnantaGuideFaqAnswer);
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/guides');
      return makeRuntime(mod.endfieldGuides, mod.ENDFIELD_GUIDE_CATEGORIES, mod.getEndfieldGuideById, mod.getEndfieldGuideTitle, mod.getEndfieldGuideSummary, mod.getEndfieldGuideContent, mod.getEndfieldGuideCategory, mod.getEndfieldGuideFaqQuestion, mod.getEndfieldGuideFaqAnswer);
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/guides');
      const summaries = await loadJson<GuideLike[]>(join(process.cwd(), '../../apps/web/public/data-client/sea/guides.json'), '/data-client/sea/guides.json').catch(() => mod.seaGuides);
      return makeRuntime(summaries, mod.SEA_GUIDE_CATEGORIES, mod.getSeaGuideById, mod.getSeaGuideTitle, mod.getSeaGuideSummary, mod.getSeaGuideContent, mod.getSeaGuideCategory, mod.getSeaGuideFaqQuestion, mod.getSeaGuideFaqAnswer);
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/guides');
      return makeRuntime(mod.skjhGuides, mod.SKJH_GUIDE_CATEGORIES, mod.getSkjhGuideById, mod.getSkjhGuideTitle, mod.getSkjhGuideSummary, mod.getSkjhGuideContent, mod.getSkjhGuideCategory, mod.getSkjhGuideFaqQuestion, mod.getSkjhGuideFaqAnswer);
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/guides');
      return makeRuntime(mod.rocoGuides, mod.ROCO_GUIDE_CATEGORIES, mod.getRocoGuideById, mod.getRocoGuideTitle, mod.getRocoGuideSummary, mod.getRocoGuideContent, mod.getRocoGuideCategory, mod.getRocoGuideFaqQuestion, mod.getRocoGuideFaqAnswer);
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/guides');
      return makeRuntime(mod.rocoCnGuides, mod.ROCO_CN_GUIDE_CATEGORIES, mod.getRocoCnGuideById, mod.getRocoCnGuideTitle, mod.getRocoCnGuideSummary, mod.getRocoCnGuideContent, mod.getRocoCnGuideCategory, mod.getRocoCnGuideFaqQuestion, mod.getRocoCnGuideFaqAnswer);
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/guides');
      return makeRuntime(mod.aniimoGuides, mod.ANIIMO_GUIDE_CATEGORIES, mod.getAniimoGuideById, mod.getAniimoGuideTitle, mod.getAniimoGuideSummary, mod.getAniimoGuideContent, mod.getAniimoGuideCategory, mod.getAniimoGuideFaqQuestion, mod.getAniimoGuideFaqAnswer);
    }
    default:
      notFound();
  }
}

async function getGuideBySlug(runtime: GuideRuntime, gameId: GameId, slug: string) {
  if (gameId !== 'sea') return runtime.getById(slug);
  return loadJson<GuideLike>(
    join(process.cwd(), '../../apps/web/public/data-client/sea/guides', `${slug}.json`),
    `/data-client/sea/guides/${slug}.json`,
  ).catch(() => runtime.getById(slug));
}

function makeRuntime(
  guides: unknown[],
  categories: Record<string, Partial<Record<SupportedLocale, string>>>,
  getById: (id: string) => unknown,
  getTitle: (guide: never, locale: SupportedLocale) => string,
  getSummary: (guide: never, locale: SupportedLocale) => string,
  getContent: (guide: never, locale: SupportedLocale) => string,
  getCategory: (guide: never, locale: SupportedLocale) => string,
  getFaqQuestion: (faq: never, locale: SupportedLocale) => string,
  getFaqAnswer: (faq: never, locale: SupportedLocale) => string,
): GuideRuntime {
  return {
    guides: guides as GuideLike[],
    categories,
    getById: (id) => getById(id) as GuideLike | undefined,
    getTitle: (guide, locale) => getTitle(guide as never, locale),
    getSummary: (guide, locale) => getSummary(guide as never, locale),
    getContent: (guide, locale) => getContent(guide as never, locale),
    getCategory: (guide, locale) => getCategory(guide as never, locale),
    getFaqQuestion: (faq, locale) => getFaqQuestion(faq as never, locale),
    getFaqAnswer: (faq, locale) => getFaqAnswer(faq as never, locale),
  };
}

export async function generateStaticParams() {
  const entries = await Promise.all(
    MAIN_WORKER_GAME_IDS
      .map(async (gameId) => {
      const runtime = await getGuideRuntime(gameId);
      return LOCALES.flatMap((lang) => runtime.guides.map((guide) => ({ lang, game: gameId, slug: guide.id })));
      })
  );

  return entries.flat();
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; game: string; slug: string }> }) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (!isGameId(gameId)) return {};

  const runtime = await getGuideRuntime(gameId);
  const guide = await getGuideBySlug(runtime, gameId, slug);
  if (!guide) return {};

  const gameName = GAMES[gameId].name[locale];
  const meta = buildGuideMeta(guide, runtime.getTitle(guide, locale), runtime.getSummary(guide, locale), gameName, locale, gameId);

  return withGuideIndexing(locale, guide, {
    ...meta,
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/guides/${slug}`, LOCALES, {
      includeLocale: (lang) => hasLocalizedContent(guide, lang),
    }),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://gachia.com/${locale}/${gameId}/guides/${slug}`,
      siteName: 'Gachia',
      images: [{ url: `https://gachia.com/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  });
}

export default async function GuideDetailPage({ params }: { params: Promise<{ lang: string; game: string; slug: string }> }) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (!isGameId(gameId)) notFound();

  const runtime = await getGuideRuntime(gameId);
  const guide = await getGuideBySlug(runtime, gameId, slug);
  if (!guide) notFound();

  const title = runtime.getTitle(guide, locale);
  const summary = runtime.getSummary(guide, locale);
  const content = runtime.getContent(guide, locale);
  const category = runtime.getCategory(guide, locale);
  const guideTags = Array.isArray(guide.tags) ? guide.tags : [];
  const articleImages = getGuideArticleImages(gameId, guide.id, title, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href={`/${gameId}/guides` as '/'} className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {runtime.categories[guide.category]?.[locale] && (
          <>
            <span>{runtime.categories[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{title}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES[gameId].theme.primary }}>
        {title}
      </h1>
      {summary && (
        <p className="mb-4 max-w-4xl text-sm leading-relaxed text-game-text-muted">
          {summary}
        </p>
      )}

      {guide.currentVersion && (
        <div className="mb-6 rounded-md border border-game-border bg-game-surface px-4 py-3 text-xs leading-relaxed text-game-text-muted">
          <strong className="mr-1 text-game-text">{guide.currentVersion.toLowerCase().includes('historical') ? (locale === 'zh' ? '历史参考' : locale === 'ja' ? '過去の参考' : 'Historical reference') : (locale === 'zh' ? '版本状态' : locale === 'ja' ? 'バージョン状況' : 'Version status')}:</strong>
          {guide.currentVersion.toLowerCase().includes('historical')
            ? (locale === 'zh' ? '本页保留历史版本资料，用于理解旧机制或旧活动；当前卡池、奖励和版本状态请前往最新版本专题。' : locale === 'ja' ? '過去バージョンの資料です。現在のバナー、報酬、版本状況は最新特集を確認してください。' : 'This page preserves historical version information for context. Use the latest version hub for live banners, rewards, and status.')
            : (locale === 'zh' ? `当前内容周期：${guide.currentVersion}。卡池、活动和数值可能变化，请以游戏内或官方公告为最终依据。` : locale === 'ja' ? `現在の内容周期：${guide.currentVersion}。バナー、イベント、数値は変わる可能性があるため公式告知を確認してください。` : `Current content cycle: ${guide.currentVersion}. Banners, events, and values can change; confirm final details in the client or official notices.`)}
        </div>
      )}

      {slug === 'banner-schedule-guide' && (
        <nav aria-label={locale === 'zh' ? '卡池相关工具' : locale === 'ja' ? 'バナー関連ツール' : 'Banner tools'} className="mb-6 grid gap-2 sm:grid-cols-3">
          <Link href={`/${gameId}/teams` as '/'} className="rounded-md border border-game-primary/40 bg-game-surface p-3 transition-colors hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{locale === 'zh' ? '用配队验证目标' : locale === 'ja' ? '編成で目標を確認' : 'Validate with Team Builder'}</span>
            <span className="mt-1 block text-xs text-game-text-muted">{locale === 'zh' ? '先看队伍缺口，再决定是否抽卡。' : locale === 'ja' ? '編成不足を見てから引く。' : 'Check roster gaps before pulling.'}</span>
          </Link>
          <Link href={`/${gameId}/tier-list` as '/'} className="rounded-md border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{locale === 'zh' ? '查看角色强度榜' : locale === 'ja' ? 'キャラTierを見る' : 'Check Character Tier List'}</span>
            <span className="mt-1 block text-xs text-game-text-muted">{locale === 'zh' ? '对照版本评级和培养优先级。' : locale === 'ja' ? '評価と育成優先度を比較。' : 'Compare current ratings and priorities.'}</span>
          </Link>
          <Link href={`/${gameId}/redeem-codes` as '/'} className="rounded-md border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{locale === 'zh' ? '领取兑换码' : locale === 'ja' ? '交換コード' : 'Claim Redeem Codes'}</span>
            <span className="mt-1 block text-xs text-game-text-muted">{locale === 'zh' ? '把免费资源计入卡池预算。' : locale === 'ja' ? '無料資源を予算に加算。' : 'Add free currency to your banner budget.'}</span>
          </Link>
        </nav>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guideTags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <BannerIntentPanel gameId={gameId} slug={slug} locale={locale} />
      <QuickAnswerSection gameId={gameId} slug={slug} locale={locale} />

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <GuideArticleBody content={content} images={articleImages} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {runtime.getFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {runtime.getFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId={gameId} currentSlug={slug} locale={locale} />
      <RelatedGuidesSection runtime={runtime} gameId={gameId} current={guide} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href={`/${gameId}/guides` as '/'} className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId,
        locale,
        title,
        summary: runtime.getSummary(guide, locale),
        slug,
        tags: guideTags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: runtime.getFaqQuestion(f, locale), answer: runtime.getFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

function buildGuideMeta(guide: GuideLike, guideTitle: string, summary: string, gameName: string, locale: SupportedLocale, gameId?: GameId) {
  const intentMeta = getBannerIntentMeta(guide.id, gameName, locale, gameId);
  if (intentMeta) {
    return {
      title: limitMetaTitle(intentMeta.title, guideTitle),
      description: ensureMetaLength(intentMeta.description, locale),
    };
  }
  const serpTitle = getLocalizedSeoText(guide.serpTitle, locale);
  const serpDescription = getLocalizedSeoText(guide.serpDescription, locale);
  if (serpTitle && serpDescription) {
    return { title: limitMetaTitle(serpTitle, guideTitle), description: ensureMetaLength(serpDescription, locale) };
  }

  const titleSuffix = guideTitle.length > 45 ? '' : locale === 'zh' ? ` — ${gameName}攻略详解` : locale === 'ja' ? ` — ${gameName}攻略ガイド` : ` — ${gameName} Guide`;
  const title = `${guideTitle}${titleSuffix}`;
  const baseSummary = summary?.trim() ?? '';
  const description = baseSummary.length >= 100
    ? baseSummary.slice(0, 160)
    : locale === 'zh'
      ? `${guideTitle}是${gameName}的详细攻略，包含技巧、策略、FAQ、版本要点和实战思路。${baseSummary ? ` 额外摘要：${baseSummary}` : ''}`
      : locale === 'ja'
        ? `${guideTitle}の${gameName}攻略ガイド。Tips、戦略、FAQ、版本要点をまとめます。${baseSummary ? ` 補足: ${baseSummary}` : ''}`
        : `Complete ${guideTitle} guide for ${gameName} with tips, strategies, FAQ, version notes, and practical advice. ${baseSummary ? `Summary: ${baseSummary}` : ''}`;

  return { title: limitMetaTitle(title, guideTitle), description: ensureMetaLength(description, locale) };
}

function getBannerIntentMeta(slug: string, gameName: string, locale: SupportedLocale, gameId?: GameId) {
  if (slug !== 'banner-schedule-guide') return null;
  const copy: Record<string, { title: string; description: string }> = {
    genshin: {
      title: locale === 'zh' ? '原神卡池时间表 2026：当前、下一个祈愿与复刻' : locale === 'ja' ? '原神バナー予定 2026：現在・次回・復刻' : 'Genshin Impact Banner Schedule 2026: Current, Next & Reruns',
      description: locale === 'zh' ? '查看原神当前卡池、下一个祈愿、复刻预测、结束时间和原石规划。按版本持续更新，抽卡前快速确认目标。' : locale === 'ja' ? '原神の現在・次回・復刻バナー、終了日、原石計画を確認。バージョンごとに更新します。' : 'Check the current Genshin Impact banners, next wishes, reruns, end dates, and Primogem planning. Updated for each version before you pull.',
    },
    starrail: {
      title: locale === 'zh' ? '崩坏：星穹铁道卡池时间表 2026：当前、下期与复刻' : locale === 'ja' ? '崩壊スターレイル バナー予定 2026：現在・次回・復刻' : 'Honkai: Star Rail Banner Schedule 2026: Current, Next & Reruns',
      description: locale === 'zh' ? '查看崩坏：星穹铁道当前跃迁、下期角色、复刻、结束时间和星琼预算，按版本及时更新。' : locale === 'ja' ? '崩壊：スターレイルの現在跳躍、次回、復刻、終了日、星玉計画を確認。' : 'Track current Honkai: Star Rail warps, next characters, reruns, end dates, and Stellar Jade planning with version updates.',
    },
    wuwa: {
      title: locale === 'zh' ? '鸣潮卡池时间表 2026：当前、下一个角色与复刻' : locale === 'ja' ? '鳴潮バナー予定 2026：現在・次回・復刻' : 'Wuthering Waves Banner Schedule 2026: Current, Next & Reruns',
      description: locale === 'zh' ? '查看鸣潮当前卡池、下一个角色、复刻预测、结束时间和星声规划，角色池与武器池分开计算。' : locale === 'ja' ? '鳴潮の現在・次回・復刻、終了日、星声計画を確認。キャラと武器を分けて管理。' : 'See current Wuthering Waves banners, next characters, reruns, end dates, and Astrite planning. Track character and weapon pity separately.',
    },
    zzz: {
      title: locale === 'zh' ? '绝区零卡池时间表 2026：当前、下一个代理人与复刻' : locale === 'ja' ? 'ゼンレスゾーンゼロ バナー予定 2026：現在・次回・復刻' : 'Zenless Zone Zero Banner Schedule 2026: Current, Next & Reruns',
      description: locale === 'zh' ? '查看绝区零当前卡池、下一个代理人、复刻、结束时间和菲林规划，抽卡前先核对队伍缺口。' : locale === 'ja' ? 'ゼンレスゾーンゼロの現在・次回・復刻、終了日、菲林計画を確認。' : 'Track current Zenless Zone Zero agents, next banners, reruns, end dates, and Polychrome planning before you pull.',
    },
  };
  const key = gameId && copy[gameId] ? gameId : null;
  return key ? copy[key] : null;
}

function getLocalizedSeoText(values: LocalizedText | undefined, locale: SupportedLocale) {
  return values?.[locale] ?? values?.en ?? values?.zh;
}

function getGuideUpdatedAt(guide: unknown) {
  return getEntryUpdatedAt(guide);
}

function withGuideIndexing(locale: SupportedLocale, guide: unknown, metadata: object) {
  if (!hasLocalizedContent(guide, locale)) {
    return { ...metadata, robots: { index: false, follow: true } };
  }

  return metadata;
}

function GuideFreshnessSection({ guide, locale }: { guide: GuideLike; locale: SupportedLocale }) {
  const facts = guide.quickFacts?.[locale] ?? guide.quickFacts?.en ?? guide.quickFacts?.zh ?? [];
  if (!guide.updatedAt && !guide.currentVersion && facts.length === 0) return null;

  const updatedLabel = locale === 'zh' ? '更新于' : locale === 'ja' ? '更新日' : 'Updated';
  const versionLabel = locale === 'zh' ? '当前版本' : locale === 'ja' ? '現在版本' : 'Current version';

  return (
    <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-game-text-muted">
        {guide.updatedAt && <span className="rounded bg-game-surface-alt px-2 py-1">{updatedLabel}: {guide.updatedAt}</span>}
        {guide.currentVersion && <span className="rounded bg-game-surface-alt px-2 py-1">{versionLabel}: {guide.currentVersion}</span>}
      </div>
      {facts.length > 0 && (
        <ul className="grid gap-2 text-sm leading-relaxed text-game-text-muted sm:grid-cols-2">
          {facts.map((fact) => (
            <li key={fact} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BannerIntentPanel({ gameId, slug, locale }: { gameId: GameId; slug: string; locale: SupportedLocale }) {
  if (slug !== 'banner-schedule-guide') return null;
  const panel = BANNER_INTENT_PANELS[gameId];
  if (!panel) return null;

  const checkLabel = locale === 'zh' ? '快速检查' : locale === 'ja' ? 'クイック確認' : 'Fast Checks';
  const linkLabel = locale === 'zh' ? '相关入口' : locale === 'ja' ? '関連入口' : 'Related Actions';

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-game-border bg-game-surface">
      <div className="border-b border-game-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-game-primary">
          {locale === 'zh' ? '卡池决策面板' : locale === 'ja' ? 'バナー判断パネル' : 'Banner Decision Panel'}
        </p>
        <h2 className="mb-2 text-lg font-semibold text-game-text">{panel.title[locale]}</h2>
        <p className="text-sm leading-relaxed text-game-text-muted">{panel.summary[locale]}</p>
      </div>
      <div className="grid gap-px bg-game-border md:grid-cols-[1fr_0.9fr]">
        <div className="bg-game-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-game-text">{checkLabel}</h3>
          <ul className="grid gap-2 text-sm leading-relaxed text-game-text-muted sm:grid-cols-2 md:grid-cols-1">
            {panel.checks[locale].map((check) => (
              <li key={check} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-game-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-game-text">{linkLabel}</h3>
          <div className="space-y-2">
            {panel.links.map((link) => (
              <Link key={link.href} href={link.href as '/'} className="block rounded-md border border-game-border bg-game-surface-alt p-3 transition-colors hover:border-game-primary">
                <span className="mb-1 block text-sm font-semibold text-game-text">{link.label[locale]}</span>
                <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description[locale]}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickAnswerSection({ gameId, slug, locale }: { gameId: GameId; slug: string; locale: SupportedLocale }) {
  const answer = GUIDE_QUICK_ANSWERS[gameId]?.[slug];
  if (!answer) return null;

  if (slug === 'banner-schedule-guide') {
    return <BannerQuickAnswerSection answer={answer} locale={locale} />;
  }

  return (
    <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
      <h2 className="mb-3 text-base font-semibold text-game-text">{answer.heading[locale]}</h2>
      <ul className="space-y-2 text-sm leading-relaxed text-game-text-muted">
        {answer.points[locale].map((point) => (
          <li key={point} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-game-primary" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BannerQuickAnswerSection({ answer, locale }: { answer: QuickAnswer; locale: SupportedLocale }) {
  const intentLabel = locale === 'zh' ? '搜索意图' : locale === 'ja' ? '検索意図' : 'Search intent';
  const actionLabel = locale === 'zh' ? '优先动作' : locale === 'ja' ? '優先アクション' : 'Priority action';

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-game-border bg-game-surface">
      <div className="border-b border-game-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-game-primary">{intentLabel}</p>
        <h2 className="text-base font-semibold text-game-text">{answer.heading[locale]}</h2>
      </div>
      <div className="grid gap-px bg-game-border md:grid-cols-3">
        {answer.points[locale].map((point, index) => (
          <div key={point} className="bg-game-surface p-4">
            <span className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-game-primary/10 text-xs font-bold text-game-primary">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-game-text-muted">{point}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-game-border bg-game-surface-alt px-4 py-3 text-xs text-game-text-muted">
        <span className="font-semibold text-game-text">{actionLabel}:</span>
        <span>current banner</span>
        <span>next banner</span>
        <span>upcoming banners</span>
        <span>reruns</span>
        <span>pity</span>
      </div>
    </section>
  );
}

function GuideArticleBody({ content, images }: { content: string; images: GuideArticleImage[] }) {
  const [leadImage, inlineImage] = images;
  const [firstPart, secondPart] = inlineImage ? splitGuideContentForImage(content) : [content, ''];

  return (
    <>
      {leadImage && <GuideArticleImageBlock image={leadImage} priority />}
      <ClientMarkdown content={firstPart} />
      {inlineImage && <GuideArticleImageBlock image={inlineImage} />}
      {secondPart && <ClientMarkdown content={secondPart} />}
    </>
  );
}

function GuideArticleImageBlock({ image, priority = false }: { image: GuideArticleImage; priority?: boolean }) {
  return (
    <figure className="mb-6 overflow-hidden rounded-lg border border-game-border bg-game-surface-alt">
      <img
        src={image.src}
        alt={image.alt}
        className="aspect-video w-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
      />
      <figcaption className="border-t border-game-border px-4 py-2 text-xs leading-relaxed text-game-text-muted">
        {image.caption}
      </figcaption>
    </figure>
  );
}

function getGuideArticleImages(gameId: GameId, slug: string, title: string, locale: SupportedLocale): GuideArticleImage[] {
  const count = ARTICLE_IMAGE_COUNTS[gameId] ?? 0;
  if (count === 0) return [];

  const imageTotal = shouldShowSecondaryArticleImage(slug) && count > 1 ? 2 : 1;
  const start = stableImageIndex(`${gameId}:${slug}`, count);
  const label = ARTICLE_IMAGE_LABELS[gameId]?.[locale] ?? ARTICLE_IMAGE_LABELS[gameId]?.en ?? title;
  const gameName = GAMES[gameId].name[locale] ?? GAMES[gameId].name.en;

  return Array.from({ length: imageTotal }, (_, offset) => {
    const index = (start + offset * 3) % count;
    const src = gameId === 'guihuan' || gameId === 'roco' || gameId === 'roco-cn'
      ? `/images/og/${gameId}.webp`
      : `/images/articles/${gameId}/${index}.webp`;

    return {
      src,
      alt: `${title} - ${gameName}`,
      caption: imageTotal > 1 ? `${label} ${offset + 1}` : label,
    };
  });
}

function shouldShowSecondaryArticleImage(slug: string) {
  return GUIDE_INTENT_GROUPS.some((group) => group.some((term) => slug.toLowerCase().includes(term)));
}

function stableImageIndex(value: string, modulo: number) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash % modulo;
}

function splitGuideContentForImage(content: string): [string, string] {
  const headings = [...content.matchAll(/^##\s+/gm)];
  const splitAt = headings[1]?.index ?? headings[0]?.index;
  if (!splitAt || splitAt < 400) return [content, ''];

  return [content.slice(0, splitAt).trim(), content.slice(splitAt).trim()];
}

function NextStepSection({ gameId, currentSlug, locale }: { gameId: GameId; currentSlug: string; locale: SupportedLocale }) {
  const nextSteps = GUIDE_NEXT_STEPS[gameId]?.[currentSlug] ?? GUIDE_FALLBACK_NEXT_STEPS[gameId];
  if (!nextSteps?.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nextSteps.map((step) => (
          <Link key={step.href} href={step.href as '/'} className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary">
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{step.label[locale]}</h3>
            <p className="text-xs text-game-text-muted line-clamp-2">{step.description[locale]}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedGuidesSection({ runtime, gameId, current, locale }: { runtime: GuideRuntime; gameId: GameId; current: GuideLike; locale: SupportedLocale }) {
  const related = selectRelatedGuides(runtime.guides, current);

  if (related.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '相关攻略' : locale === 'ja' ? '関連ガイド' : 'Related Guides'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((guide) => (
          <Link key={guide.id} href={`/${gameId}/guides/${guide.id}` as '/'} className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary">
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{runtime.getTitle(guide, locale)}</h3>
            <p className="text-xs text-game-text-muted line-clamp-2">{runtime.getSummary(guide, locale)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function selectRelatedGuides(guides: GuideLike[], current: GuideLike) {
  const currentTags = new Set(current.tags ?? []);
  const currentIntentMask = getGuideIntentMask(current);
  const top: Array<{ guide: GuideLike; score: number; index: number }> = [];

  guides.forEach((guide, index) => {
    if (guide.id === current.id) return;

    const score = getRelatedGuideScore(current, guide, currentTags, currentIntentMask);
    const item = { guide, score, index };
    const insertAt = top.findIndex((candidate) => score > candidate.score || (score === candidate.score && index < candidate.index));

    if (insertAt === -1) {
      if (top.length < 4) top.push(item);
      return;
    }

    top.splice(insertAt, 0, item);
    if (top.length > 4) top.length = 4;
  });

  return top.map(({ guide }) => guide);
}

function getRelatedGuideScore(current: GuideLike, candidate: GuideLike, currentTags: Set<string>, currentIntentMask: number) {
  const sameCategory = candidate.category === current.category ? 2 : 0;
  const sharedTags = (candidate.tags ?? []).reduce((count, tag) => count + (currentTags.has(tag) ? 1 : 0), 0);
  const sharedIntent = countSharedIntentBits(currentIntentMask & getGuideIntentMask(candidate)) * 3;

  return sameCategory + sharedTags + sharedIntent;
}

function getGuideIntentMask(guide: GuideLike) {
  const terms = [guide.id, guide.category, ...(guide.tags ?? [])].join(' ').toLowerCase();

  return GUIDE_INTENT_GROUPS.reduce((mask, group, index) => {
    return group.some((term) => terms.includes(term)) ? mask | (1 << index) : mask;
  }, 0);
}

function countSharedIntentBits(mask: number) {
  let count = 0;
  let value = mask;

  while (value > 0) {
    count += value & 1;
    value >>= 1;
  }

  return count;
}

function isGameId(gameId: string): gameId is GameId {
  return Object.prototype.hasOwnProperty.call(GAMES, gameId);
}
