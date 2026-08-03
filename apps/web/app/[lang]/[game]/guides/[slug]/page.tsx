import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  getGuideById as getNteGuideById,
  getGuideTitle as getNteGuideTitle,
  getGuideContent as getNteGuideContent,
  getGuideSummary as getNteGuideSummary,
  getGuideCategory as getNteGuideCategory,
  getGuideFaqQuestion as getNteGuideFaqQuestion,
  getGuideFaqAnswer as getNteGuideFaqAnswer,
  NTE_GUIDE_CATEGORIES,
  guides as nteGuides,
} from '@gachia/data/games/nte/guides';
import type { NteGuide } from '@gachia/data/games/nte/guides';
import { getNteCharacterById, getNteCharacterName } from '@gachia/data/games/nte/characters';
import { getRegionById as getNteRegionById, getRegionName as getNteRegionName } from '@gachia/data/games/nte/regions';
import {
  genshinGuides,
  getGuideById as getGenshinGuideById,
  getGuideTitle as getGenshinGuideTitle,
  getGuideContent as getGenshinGuideContent,
  getGuideSummary as getGenshinGuideSummary,
  getGuideCategory as getGenshinGuideCategory,
  getGuideFaqQuestion as getGenshinGuideFaqQuestion,
  getGuideFaqAnswer as getGenshinGuideFaqAnswer,
  GENSHIN_GUIDE_CATEGORIES,
} from '@gachia/data/games/genshin/guides';
import {
  starrailGuides,
  getGuideById as getStarRailGuideById,
  getGuideTitle as getStarRailGuideTitle,
  getGuideContent as getStarRailGuideContent,
  getGuideSummary as getStarRailGuideSummary,
  getGuideCategory as getStarRailGuideCategory,
  getGuideFaqQuestion as getStarRailGuideFaqQuestion,
  getGuideFaqAnswer as getStarRailGuideFaqAnswer,
  STARRAIL_GUIDE_CATEGORIES,
} from '@gachia/data/games/starrail/guides';
import {
  wuwaGuides,
  getGuideById as getWuWaGuideById,
  getGuideTitle as getWuWaGuideTitle,
  getGuideContent as getWuWaGuideContent,
  getGuideSummary as getWuWaGuideSummary,
  getGuideCategory as getWuWaGuideCategory,
  getGuideFaqQuestion as getWuWaGuideFaqQuestion,
  getGuideFaqAnswer as getWuWaGuideFaqAnswer,
  WUWA_GUIDE_CATEGORIES,
} from '@gachia/data/games/wuwa/guides';
import {
  zzzGuides,
  getZzzGuideById,
  getZzzGuideTitle,
  getZzzGuideContent,
  getZzzGuideSummary,
  getZzzGuideCategory,
  getZzzGuideFaqQuestion,
  getZzzGuideFaqAnswer,
  ZZZ_GUIDE_CATEGORIES,
} from '@gachia/data/games/zzz/guides';
import {
  guihuanGuides,
  getGuihuanGuideById,
  getGuihuanGuideTitle,
  getGuihuanGuideContent,
  getGuihuanGuideSummary,
  getGuihuanGuideCategory,
  getGuihuanGuideFaqQuestion,
  getGuihuanGuideFaqAnswer,
  GUIHUAN_GUIDE_CATEGORIES,
} from '@gachia/data/games/guihuan/guides';
import {
  anantaGuides,
  getAnantaGuideById,
  getAnantaGuideTitle,
  getAnantaGuideContent,
  getAnantaGuideSummary,
  getAnantaGuideCategory,
  getAnantaGuideFaqQuestion,
  getAnantaGuideFaqAnswer,
  ANANTA_GUIDE_CATEGORIES,
} from '@gachia/data/games/ananta/guides';
import type { AnantaGuide, AnantaGuideFaq } from '@gachia/data/games/ananta/guides';
import {
  endfieldGuides,
  getEndfieldGuideById,
  getEndfieldGuideTitle,
  getEndfieldGuideContent,
  getEndfieldGuideSummary,
  getEndfieldGuideCategory,
  getEndfieldGuideFaqQuestion,
  getEndfieldGuideFaqAnswer,
  ENDFIELD_GUIDE_CATEGORIES,
} from '@gachia/data/games/endfield/guides';
import type { EndfieldGuide, EndfieldGuideFaq } from '@gachia/data/games/endfield/guides';
import {
  seaGuides,
  getSeaGuideById,
  getSeaGuideTitle,
  getSeaGuideContent,
  getSeaGuideSummary,
  getSeaGuideCategory,
  getSeaGuideFaqQuestion,
  getSeaGuideFaqAnswer,
  SEA_GUIDE_CATEGORIES,
} from '@gachia/data/games/sea/guides';
import type { SeaGuide, SeaGuideFaq } from '@gachia/data/games/sea/guides';
import { getSeaCharacterById, getSeaCharacterName } from '@gachia/data/games/sea/characters';
import {
  skjhGuides,
  getSkjhGuideById,
  getSkjhGuideTitle,
  getSkjhGuideContent,
  getSkjhGuideSummary,
  getSkjhGuideCategory,
  getSkjhGuideFaqQuestion,
  getSkjhGuideFaqAnswer,
  SKJH_GUIDE_CATEGORIES,
} from '@gachia/data/games/skjh/guides';
import type { SkjhGuide, SkjhGuideFaq } from '@gachia/data/games/skjh/guides';
import { Link } from '@/lib/i18n/navigation';
import { ClientMarkdown } from '@/components/wiki/client-markdown';
import { buildGuideJsonLd } from '@/lib/jsonld';
import { buildLocalizedAlternates, ensureMetaLength, getEntryUpdatedAt, hasLocalizedContent } from '@/lib/seo-metadata';
import { BANNER_INTENT_PANELS } from '@/lib/banner-intent';

type LocaleMeta = Partial<Record<SupportedLocale, { title: string; description: string }>>;

type LocalizedText = Partial<Record<SupportedLocale, string>>;

type GuideSeoFields = {
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: LocalizedText;
  serpDescription?: LocalizedText;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
};

type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

type GuideQuickAnswer = {
  heading: Record<SupportedLocale, string>;
  points: Record<SupportedLocale, string[]>;
};

const GUIDE_QUICK_ANSWERS: Partial<Record<GameId, Record<string, GuideQuickAnswer>>> = {
  genshin: {
    'banner-schedule-guide': {
      heading: {
        zh: '快速结论：先看当前祈愿、下期卡池和复刻',
        en: 'Quick answer: check current banner, next banner, and reruns first',
        ja: '要点：現在、次回、復刻バナーを先に確認',
      },
      points: {
        zh: ['当前角色池、下期祈愿和复刻预测要一起看。', '抽卡前先确认保底、原石预算和后续版本目标。', '如果只能覆盖一次大保底，优先保证真正补队伍缺口的角色。'],
        en: ['Use this page to compare the current Genshin banner, next banner, upcoming banners, and rerun timing in one place.', 'Before pulling, check pity, guarantee status, Primogem budget, and future version targets.', 'If you only have one full guarantee, prioritize the character that fixes a real team gap.'],
        ja: ['現在、次回、復刻予想を同じ場所で確認します。', '引く前に天井、保証、原石、次版本目標を確認します。', '天井一回分なら編成不足を解決するキャラを優先します。'],
      },
    },
    'cross-game-comparison-guide': {
      heading: {
        zh: '快速结论：按玩法而不是热度选游戏',
        en: 'Quick answer: choose by playstyle, not hype',
        ja: '要点：流行より遊び方で選ぶ',
      },
      points: {
        zh: ['想探索大世界，优先原神或鸣潮。', '想省时间和自动战斗，优先崩铁。', '想要快节奏动作和都市风格，优先绝区零。'],
        en: ['Pick Genshin or WuWa if open-world exploration matters most.', 'Pick HSR if you want turn-based strategy, auto-battle, and lower daily time.', 'Pick ZZZ if you want fast action combat and a compact urban style.'],
        ja: ['探索重視なら原神か鳴潮が向きます。', '時短とオート戦闘ならスターレイルが安定です。', '高速アクションと都市感ならZZZが向きます。'],
      },
    },
    'lunar-reaction-guide': {
      heading: {
        zh: '快速结论：先判断角色是否围绕月系反应吃加成',
        en: 'Quick answer: check whether the character actually scales with Lunar reactions',
        ja: '要点：月系反応で伸びるキャラか確認',
      },
      points: {
        zh: ['不要只因为新元素就重刷全套装备。', '先看技能倍率、反应触发频率和队伍增益。', '如果角色不靠月系反应输出，常规暴击/攻击仍然更稳。'],
        en: ['Do not rebuild every artifact set just because Lunar reactions are new.', 'Start with skill scaling, trigger frequency, and team buffs.', 'If a character is not Lunar-reaction driven, normal CRIT and ATK priorities may still win.'],
        ja: ['新元素だけで全装備を作り直す必要はありません。', '倍率、発動頻度、編成バフを先に見ます。', '月系反応主体でなければ通常の会心/攻撃が安定です。'],
      },
    },
  },
  zzz: {
    'banner-schedule-guide': {
      heading: {
        zh: '快速结论：先看当前调频、下期与复刻',
        en: 'Quick answer: check current, next, and upcoming ZZZ banners first',
        ja: '要点：現在、次回、復刻バナーを先に確認',
      },
      points: {
        zh: ['当前代理人频道、下期卡池和复刻节点要放在同一条抽卡路线里。', '抽卡前先确认专属频道保底、音擎保底、菲林预算和队伍缺口。', '资源有限时先保代理人，再考虑专属音擎。'],
        en: ['Compare the current ZZZ banner, next banner, upcoming banners, and likely reruns before spending Polychromes.', 'Check agent pity, W-Engine pity, guarantee status, and team needs together.', 'If resources are tight, secure the agent first and treat signature W-Engines as optional upgrades.'],
        ja: ['現在、次回、復刻予想を同じ計画で確認します。', '代理人天井、音擎天井、菲林、編成不足をまとめて見ます。', '資源が少ない場合は代理人を先に確保します。'],
      },
    },
    'v3-0-version-guide': {
      heading: {
        zh: '快速结论：先看已上线的 3.1，再回顾 3.0 内容',
        en: 'Quick answer: start with live v3.1, then use the v3.0 recap',
        ja: '要点：配信中の3.1を先に見て、3.0を振り返る',
      },
      points: {
        zh: ['先打开 3.1 版本专题，确认当前卡池、2 周年福利和 Remielle/Sigrid。', '再检查兑换码、账号绑定、Xbox/Steam 入坑和当前队伍缺口。', '需要了解旧区域、系统和养成背景时，再回看本页的 3.0 内容。'],
        en: ['Open the v3.1 hub first for current banners, 2nd anniversary rewards, and Remielle/Sigrid.', 'Then check redeem codes, account linking, Xbox/Steam onboarding, and your current team gap.', 'Use the v3.0 sections below only when you need older region, system, or progression context.'],
        ja: ['まず3.1特集で現在バナー、2周年報酬、Remielle/Sigridを確認します。', '次に交換コード、アカウント連携、Xbox/Steam入門、編成不足を確認します。', '旧エリアやシステム、育成背景が必要なら本ページの3.0部分を振り返ります。'],
      },
    },
    'drive-disc-guide': {
      heading: {
        zh: '快速结论：先主属性，再 4+2 套装，最后追副词条',
        en: 'Quick answer: main stats first, 4+2 sets second, substats last',
        ja: '要点：メイン、4+2セット、サブの順',
      },
      points: {
        zh: ['4、5、6 号位主属性决定大部分成型速度。', '先凑 4 件核心套装 + 2 件补强套装。', '副词条优化放到主 C 和核心队伍稳定之后。'],
        en: ['Slots 4, 5, and 6 decide most of a Drive Disc build.', 'Use a 4pc core set plus a 2pc stat set as the default route.', 'Chase substats only after the main DPS and core team are stable.'],
        ja: ['4、5、6番のメインステータスが最重要です。', '基本は4セット+2セットで組みます。', 'サブ厳選は主力が安定してからで十分です。'],
      },
    },
    'w-engine-guide': {
      heading: {
        zh: '快速结论：先保代理人，再考虑专属音擎',
        en: 'Quick answer: secure the agent before chasing signature W-Engines',
        ja: '要点：専用音擎より先に代理人を確保',
      },
      points: {
        zh: ['音擎选择先看代理人专精和队伍定位。', '菲林紧张时，A 级音擎通常足够过渡主线和活动。', '只有代理人已经到手且资源有余，才优先考虑专属音擎。'],
        en: ['Match the W-Engine specialty to the agent role before comparing raw stats.', 'If Polychromes are tight, A-Rank W-Engines are often enough for story and events.', 'Pull signature W-Engines only after the agent is secured and your next banner budget is safe.'],
        ja: ['まず代理人の役割と音擎タイプを合わせます。', '菲林が少ない時はA級音擎で十分つなげます。', '代理人確保後に余裕があれば専用音擎を考えます。'],
      },
    },
    'steam-3-0-start-guide': {
      heading: {
        zh: '快速结论：Steam 入坑先确认账号和奖励',
        en: 'Quick answer: confirm account linking and rewards before starting on Steam',
        ja: '要点：Steam開始前に連携と報酬を確認',
      },
      points: {
        zh: ['先确认 HoYoverse 账号、区服和跨端存档，避免进度割裂。', '完成教程后先领邮件、兑换码和版本福利，再规划菲林。', '新玩家下一步优先看 3.0 路线、配队、驱动盘和音擎。'],
        en: ['Confirm your HoYoverse account, region, and cross-save path before starting.', 'After the tutorial, claim mail, codes, and patch rewards before spending Polychromes.', 'New players should route into v3.0 priorities, teams, Drive Discs, and W-Engines next.'],
        ja: ['開始前にHoYoverseアカウント、地域、クロスセーブを確認。', 'チュートリアル後にメール、コード、版本報酬を回収。', '次に3.0優先度、編成、ドライブ、音擎を確認します。'],
      },
    },
    'rupture-specialty-guide': {
      heading: {
        zh: '快速结论：突击队先看爆发窗口和击破配合',
        en: 'Quick answer: Rupture teams depend on burst windows and Daze setup',
        ja: '要点：ラプチャーはブレイク窓と連携を見る',
      },
      points: {
        zh: ['突击不是简单替代强攻，要看敌人失衡窗口。', '先确认核心突击代理人、击破位和支援位是否完整。', '没有核心 S 级时，先用 A 级突击过渡，不要硬拆主队资源。'],
        en: ['Rupture is not a simple Attack replacement; it needs Daze-window planning.', 'Check your Rupture DPS, Stun slot, and support slot together.', 'Without a premium core, use A-Rank options as a bridge instead of breaking your main team.'],
        ja: ['ラプチャーは強攻の単純代替ではなくブレイク窓が重要です。', '主力、ブレイク、支援をまとめて確認します。', '限定主力がいなければA級で過渡します。'],
      },
    },
    'team-building-guide': {
      heading: {
        zh: '快速结论：绝区零配队先保证击破、输出、支援',
        en: 'Quick answer: start every ZZZ team with Stun, DPS, and Support',
        ja: '要点：ブレイク、火力、支援から組む',
      },
      points: {
        zh: ['最稳三人结构是击破 + 主输出 + 支援。', '异常队可以打破模板，但要先确认异常积蓄和紊乱节奏。', '资源有限时先练满一队，再开始第二队。'],
        en: ['The safest 3-agent core is Stun + DPS + Support.', 'Anomaly teams can break the template, but only if buildup and Disorder timing are reliable.', 'If resources are tight, finish one team before starting a second.'],
        ja: ['基本はブレイク+火力+支援です。', '異常編成は蓄積と混沌タイミングを確認します。', '資源が少ない時は一隊を先に完成させます。'],
      },
    },
  },
  starrail: {
    'fate-collab-guide': {
      heading: {
        zh: '快速结论：先区分确认奖励和联动推测',
        en: 'Quick answer: separate confirmed Fate rewards from speculation',
        ja: '要点：確定報酬と推測を分ける',
      },
      points: {
        zh: ['Saber、Archer、Rin、Gilgamesh 搜索要先接到确认信息和资源规划。', '如果只是社区热度，不要当成确定卡池顺序。', '星琼有限时，先在 Himeko Nova、Fate 目标和复刻之间保一个目标。'],
        en: ['Route Saber, Archer, Rin, and Gilgamesh searches into confirmed rewards and pull planning first.', 'Do not treat community heat as confirmed banner order.', 'If Jades are tight, reserve one guarantee across Himeko Nova, Fate targets, and reruns.'],
        ja: ['Saber、Archer、Rin、Gilgamesh検索を報酬と計画へ接続します。', '話題性を確定バナー順として扱いません。', '星玉が少ない時は一つの保証先を決めます。'],
      },
    },
    'cross-game-comparison-guide': {
      heading: {
        zh: '快速结论：崩铁适合想要策略和省时的玩家',
        en: 'Quick answer: HSR fits players who want strategy and lower daily time',
        ja: '要点：戦略と時短ならHSR',
      },
      points: {
        zh: ['想要回合制、自动战斗和较低每日耗时，优先崩铁。', '想探索大世界，原神或鸣潮更合适。', '想短局动作体验，绝区零更直接。'],
        en: ['Choose HSR if turn-based planning, auto-battle, and lower daily time matter most.', 'Choose Genshin or WuWa if open-world exploration matters more.', 'Choose ZZZ if you want compact action combat sessions.'],
        ja: ['ターン制、オート、短い日課ならHSRが向きます。', '探索重視なら原神か鳴潮。', '短時間アクションならZZZが向きます。'],
      },
    },
    'banner-schedule-guide': {
      heading: {
        zh: '快速结论：先看当前跃迁、下期与复刻',
        en: 'Quick answer: check current, next, and rerun banners first',
        ja: '要点：現在、次回、復刻バナーを先に確認',
      },
      points: {
        zh: ['当前卡池、下期跃迁、复刻预估要放在同一张表里看。', '抽卡前先确认保底、垫抽记录和星琼缺口。', '如果目标不是刚需角色，优先保留一次完整保底。'],
        en: ['Use this page to compare the current banner, next banner, and likely reruns in one place.', 'Before pulling, check pity, guarantee status, Stellar Jade budget, and role gaps.', 'If the target is not account-critical, keep one full guarantee reserved for the next high-value banner.'],
        ja: ['現在、次回、復刻予想を同じ表で確認します。', '引く前に天井、保証、星玉、編成不足を確認します。', '必須でない場合は次の重要バナー用に天井を残します。'],
      },
    },
  },
  wuwa: {
    'farming-guide': {
      heading: {
        zh: '快速结论：体力先给当前升级瓶颈',
        en: 'Quick answer: spend Waveplates on the bottleneck blocking your next upgrade',
        ja: '要点：次の育成を止める素材にスタミナを使う',
      },
      points: {
        zh: ['先确认主队缺角色等级、技能材料、武器材料还是声骸。', '材料路线围绕当前主 C 和关键辅助安排。', '主词条没稳定前，不要把大量体力耗在完美副词条上。'],
        en: ['Check whether your main team is blocked by levels, skills, weapons, or Echoes first.', 'Route farming around your current main DPS and key support upgrades.', 'Do not spend heavy Waveplates chasing perfect Echo substats before main stats are stable.'],
        ja: ['主力がレベル、スキル、武器、エコーのどれで止まるか確認。', '周回は主力DPSと重要支援を優先します。', 'メインステ安定前に完璧サブを追いすぎません。'],
      },
    },
    'banner-schedule-guide': {
      heading: {
        zh: '快速结论：先确认当前卡池和下期复刻',
        en: 'Quick answer: current banner, next banner, and reruns',
        ja: '要点：現在バナー、次回バナー、復刻',
      },
      points: {
        zh: ['先看当前 UP、下期角色和复刻节点，再决定星声是否要花。', '保底继承、武器池和角色池要分开规划。', '如果你只缺主 C 或关键辅助，优先按队伍缺口抽。'],
        en: ['Start with the current Wuthering Waves banner, next banner, and expected reruns before spending Astrite.', 'Plan character pity and weapon pity separately because their value depends on different account gaps.', 'If your roster only lacks a main DPS or a key support, pull by team need instead of hype.'],
        ja: ['現在UP、次回、復刻予定を確認してから星声を使います。', 'キャラ天井と武器天井は別々に計画します。', '不足ロールに合わせて引くのが安定です。'],
      },
    },
    'echo-advanced-guide': {
      heading: {
        zh: '快速结论：先主词条，再套装，最后刷副词条',
        en: 'Quick answer: main stat first, set bonus second, substats last',
        ja: '要点：メイン、セット、サブの順で整える',
      },
      points: {
        zh: ['先保证主词条正确，再追 Sonata 套装效果。', '前期不要为了完美副词条浪费太多体力。', '毕业目标是主词条正确、套装成型、副词条服务角色定位。'],
        en: ['For Wuthering Waves Echoes, lock the right main stat before chasing perfect substats.', 'Sonata set bonuses matter, but early builds should avoid overfarming tiny upgrades.', 'A strong build has the correct main stat, a working set bonus, and substats that match the character role.'],
        ja: ['まず正しいメインステータスを確保します。', '序盤は完璧なサブステを追いすぎないようにします。', '完成形はメイン、セット、役割に合うサブステです。'],
      },
    },
    'meta-teams-v3-guide': {
      heading: {
        zh: '快速结论：强队先看核心输出、辅助和循环',
        en: 'Quick answer: judge meta teams by core DPS, support, and rotation',
        ja: '要点：主力、支援、ローテで編成を見る',
      },
      points: {
        zh: ['不要只看单个角色强度，要看队伍循环是否顺。', '先保证主输出、增伤/治疗、协同机制完整。', '缺关键角色时，用同定位替代比硬凑高星更稳。'],
        en: ['A WuWa meta team is strong when the DPS, support, sustain, and rotation all fit together.', 'Do not rank teams by one character alone; uptime and swap flow matter.', 'If you miss a premium unit, replace the role first instead of forcing a high-rarity mismatch.'],
        ja: ['単体評価ではなく編成全体の回り方を見ます。', '主力、支援、維持、交代の噛み合いが重要です。', '限定がいない場合は同じ役割で代用します。'],
      },
    },
  },
  nte: {
    'photo-mode-guide': {
      heading: {
        zh: '快速结论：先开相机，再调焦段、时间和姿势',
        en: 'Quick answer: open photo mode, then tune focal length, time, and pose',
        ja: '要点：カメラ、焦点距離、時間、ポーズを調整',
      },
      points: {
        zh: ['先确认 PC、手柄或移动端入口。', '截图质量主要看焦段、光线、景深和背景干净度。', '隐藏拍照点通常和成就、地标或特殊提示绑定。'],
        en: ['First confirm the PC, controller, or mobile entry point.', 'Better screenshots usually come from focal length, lighting, depth of field, and clean backgrounds.', 'Hidden photo spots are usually tied to achievements, landmarks, or camera prompts.'],
        ja: ['まずPC、コントローラー、モバイルの入口を確認します。', '画質は焦点距離、光、被写界深度、背景整理で変わります。', '隠し撮影地は実績やランドマークと関係します。'],
      },
    },
    'damage-formula': {
      heading: {
        zh: '快速结论：倍率、暴击和属性加成要一起算',
        en: 'Quick answer: multipliers, crit, and elemental bonuses all matter',
        ja: '要点：倍率、会心、属性補正をまとめて見る',
      },
      points: {
        zh: ['只堆一个数值通常不如平衡倍率、暴击和属性加成。', '实战提升要看技能倍率、敌人抗性和队伍增益。', '配装时先找短板，再决定补暴击、攻击还是属性伤害。'],
        en: ['NTE damage is not decided by one stat; skill multiplier, crit, elemental bonus, enemy resistance, and team buffs all stack into the result.', 'Use the formula page to find the weakest part of a build before changing gear.', 'For practical upgrades, compare crit consistency, attack scaling, and elemental damage together.'],
        ja: ['一つの数値だけでなく倍率、会心、属性、耐性、バフをまとめて見ます。', '装備変更前にビルドの弱点を確認します。', '実戦では会心、攻撃、属性ダメージを比較します。'],
      },
    },
  },
  sea: {
    'week-one-live-ops-overview': {
      heading: {
        zh: '快速结论：先分清入口、热修、经济还是查漏',
        en: 'Quick answer: first separate access, hotfix, economy, or gap-check issues',
        ja: '要点：入口、熱修、経済、取りこぼしのどれかを先に分ける',
      },
      points: {
        zh: ['7 月 23 日移动端上线前，入口和互通问题会持续放大。', '7 月 16 日后的体感变化，更适合先看热修与已知问题，而不是盲目重跑。', '如果你卡的是大脸币或渡桥海补完，先走资源页和查漏页，比泛新手攻略更值。'],
        en: ['Before the July 23 mobile launch, access and cross-progress questions will keep growing.', 'If the game feels different after July 16, start with hotfix and issue tracking instead of blind reruns.', 'If your pain is Face Coin pacing or Bridge Sea completion, the economy and gap-check pages beat generic beginner guides now.'],
        ja: ['7月23日のモバイル開始前は入口と連携の質問が増え続けます。', '7月16日以降に感触が変わったなら、まず熱修と既知問題を見るべきです。', '大脸币不足や渡橋海の補完で詰まるなら、汎用初心者ガイドより専用ページが有効です。'],
      },
    },
    'launch-day-guide': {
      heading: {
        zh: '快速结论：PC 先开，移动端再跟进',
        en: 'Quick answer: PC launches first, mobile follows later',
        ja: '要点：PC先行、モバイルは後続',
      },
      points: {
        zh: ['PC 端 7 月 9 日公测，移动端 7 月 23 日上线。', '先确认下载、互通、首月福利和首日路线。', '想快速入坑，先看角色图鉴、版本中心和开服 FAQ。'],
        en: ['Sea of Remnants PC open beta starts July 9, with mobile launch planned for July 23.', 'Check download, cross-platform progress, launch rewards, and day-one routing before spending resources.', 'For a fast start, connect this page to characters, the open beta center, and the launch FAQ.'],
        ja: ['PC公測は7月9日、モバイルは7月23日予定です。', 'DL、連携、報酬、初日ルートを確認します。', '早く始めるならキャラ、版本中心、FAQを見ます。'],
      },
    },
    'open-beta-version-center': {
      heading: {
        zh: '快速结论：这是遗忘之海 Wiki 的版本入口',
        en: 'Quick answer: use this as the Sea of Remnants wiki hub',
        ja: '要点：Sea of Remnants Wikiの入口',
      },
      points: {
        zh: ['这页整理公测时间、官网入口、福利、角色和首月更新。', '如果你只想找 Wiki 信息，先从版本中心跳角色、节奏榜和开服攻略。', '后续 Sea 新内容会优先从这里继续查看。'],
        en: ['This hub connects release timing, official entry points, rewards, characters, and first-month updates.', 'If you searched for a Sea of Remnants wiki, start here, then jump to characters, tier list, launch guide, or download help.', 'New Sea launch topics should route back to this page first.'],
        ja: ['公開日、公式入口、報酬、キャラ、初月更新をまとめます。', 'Wiki情報を探す場合はここからキャラ、Tier表、開服攻略へ進みます。', '新しい話題はまずこのページへ戻します。'],
      },
    },
  },
  skjh: {
    'week-one-live-ops-overview': {
      heading: {
        zh: '快速结论：先判断环境，再决定要不要继续肝这个服',
        en: 'Quick answer: judge the server environment before deciding how hard to commit',
        ja: '要点：まず環境を見て、その鯖を続けるか決める',
      },
      points: {
        zh: ['7 月 14 日处罚公告之后，外挂和非法组队已经是必须单独判断的现实问题。', '如果你觉得“不是不会玩，是完全发育不起来”，先看 wipe 周期和换服判断。', '基地已经稳住后，再补自定义模式和电力，会比继续刷泛开荒内容更有效。'],
        en: ['After the July 14 enforcement notice, cheats and illegal teaming became practical issues that deserve their own check.', 'If your feeling is not “I am bad” but “I cannot progress at all,” review server cycle and switching logic first.', 'Once the base is stable, custom mode and electricity are stronger next reads than more generic opener content.'],
        ja: ['7月14日の処分公告以降、チートと違法チーミングは個別判断が必要な現実問題です。', '下手なのではなく全く育たない感覚なら、まずワイプ周期と鯖移動判断を見ます。', '拠点が安定した後は、汎用開拓よりカスタムモードと電力を見る方が効率的です。'],
      },
    },
  },
};

const GUIDE_FALLBACK_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  genshin: [
    {
      href: '/genshin/characters',
      label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '继续看角色、配装和定位', en: 'Continue with characters, builds, and roles', ja: 'キャラ・育成・役割を確認' },
    },
    {
      href: '/genshin/weapons',
      label: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '补齐角色适配武器思路', en: 'Fill in the best weapon ideas', ja: '適性武器を補完' },
    },
    {
      href: '/genshin/items',
      label: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把养成材料和刷取路径接起来', en: 'Connect materials with farming routes', ja: '素材と周回ルートを接続' },
    },
  ],
  starrail: [
    {
      href: '/starrail/characters',
      label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '继续看角色、光锥和配队', en: 'Continue with characters, light cones, and teams', ja: 'キャラ・光円錐・編成へ' },
    },
    {
      href: '/starrail/weapons',
      label: { zh: '看光锥图鉴', en: 'Browse light cones', ja: '光円錐図鑑へ' },
      description: { zh: '补齐武器与适配角色', en: 'Match light cones to characters', ja: '光円錐と適性キャラを確認' },
    },
    {
      href: '/starrail/items',
      label: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看突破和行迹材料', en: 'Continue with ascension and trace materials', ja: '昇格・軌跡素材を確認' },
    },
  ],
  guihuan: [
    {
      href: '/guihuan/characters',
      label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '继续看角色、武器和配队', en: 'Continue with characters, weapons, and teams', ja: 'キャラ・武器・編成へ' },
    },
    {
      href: '/guihuan/weapons',
      label: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '补齐武器与使用者关系', en: 'Match weapons to their users', ja: '武器と使い手を確認' },
    },
    {
      href: '/guihuan/items',
      label: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看培养材料和来源', en: 'Continue with upgrade materials and sources', ja: '育成素材と入手先を確認' },
    },
  ],
  ananta: [
    {
      href: '/ananta/characters',
      label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '继续看角色、武器和养成', en: 'Continue with characters, weapons, and growth', ja: 'キャラ・武器・育成へ' },
    },
    {
      href: '/ananta/weapons',
      label: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '补齐武器适配角色', en: 'Match weapons to suitable characters', ja: '武器と適性キャラを確認' },
    },
    {
      href: '/ananta/items',
      label: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看突破材料和需求', en: 'Continue with upgrade materials and requirements', ja: '突破素材と必要数を確認' },
    },
  ],
  sea: [
    {
      href: '/sea/guides/week-one-live-ops-overview',
      label: { zh: '看首周问题总览', en: 'Read week-one live-ops hub', ja: '首週ハブを見る' },
      description: { zh: '先分清移动端、热修、经济和查漏四类问题', en: 'Separate mobile, hotfix, economy, and gap-check questions first', ja: 'モバイル、熱修、経済、補完の4つを整理', },
    },
    {
      href: '/sea/guides/mobile-launch-guide',
      label: { zh: '看移动端上线 FAQ', en: 'Read mobile launch FAQ', ja: 'モバイル開始FAQへ' },
      description: { zh: '先确认 7 月 23 日前后该怎么选平台', en: 'Decide how to handle platforms around July 23', ja: '7月23日前後のプラットフォーム判断をする', },
    },
    {
      href: '/sea/guides/horn-farming-economy-guide',
      label: { zh: '看号角与大脸币', en: 'Read horn and Face Coin guide', ja: '号角と大脸币を見る' },
      description: { zh: '把资源焦虑直接落到返航和收益判断上', en: 'Turn economy pressure into return-timing and income decisions', ja: '資源圧を返航と収益判断に落とす', },
    },
  ],
  skjh: [
    {
      href: '/skjh/guides/week-one-live-ops-overview',
      label: { zh: '看首周问题总览', en: 'Read week-one live-ops hub', ja: '首週ハブを見る' },
      description: { zh: '先把反作弊、换服、自定义模式和电力分开判断', en: 'Separate anti-cheat, server switching, custom mode, and electricity first', ja: '反作弊、鯖移動、カスタム、電力を分けて見る', },
    },
    {
      href: '/skjh/guides/anti-cheat-reporting-guide',
      label: { zh: '看反作弊与举报', en: 'Read anti-cheat guide', ja: '反作弊ガイドへ' },
      description: { zh: '如果环境越来越差，先确认是不是外挂或非法组队问题', en: 'If the environment feels worse, check cheats and illegal teaming first', ja: '環境悪化を感じたらまずチートと違法チーミングを見る', },
    },
    {
      href: '/skjh/guides/server-wipe-cycle-guide',
      label: { zh: '看换服与 wipe 周期', en: 'Read server cycle guide', ja: 'ワイプ周期を見る' },
      description: { zh: '把“玩不下去”先拆成服务器节奏问题', en: 'Break “I cannot keep up” into a server-cycle diagnosis', ja: '「ついていけない」を鯖周期の問題として診断する', },
    },
  ],
};

const GUIDE_META_OVERRIDES: Record<string, LocaleMeta> = {
  'genshin/banner-schedule-guide': {
    en: {
      title: 'Genshin Banner Schedule: Current, Next & Rerun Banners',
      description: 'Track the current Genshin banner, next banner, upcoming banners, reruns, pity rules, Primogem planning, and pull priorities.',
    },
    zh: {
      title: '原神祈愿卡池排期 2026：当前卡池与下期预测',
      description: '查看原神当前与下期祈愿卡池、复刻预测、保底规则、原石规划和抽卡优先级，帮助你决定该抽还是该存。',
    },
  },
  'starrail/banner-schedule-guide': {
    en: {
      title: 'HSR Banner Schedule: Current, Next & Rerun Warps',
      description: 'Track the current HSR banner, next banner, rerun warps, pity rules, Stellar Jade planning, and pull priorities.',
    },
    zh: {
      title: '崩坏星穹铁道卡池排期 2026：当前与下期跃迁',
      description: '整理崩铁当前卡池、下期跃迁、复刻预测、保底机制、星琼规划和抽卡优先级，方便提前安排资源。',
    },
  },
  'wuwa/banner-schedule-guide': {
    en: {
      title: 'WuWa Banners: Current, Next & Upcoming Banner Schedule',
      description: 'Check WuWa banners, the current banner, next banner, upcoming banners, reruns, pity carry-over, Astrite planning, and pull priorities.',
    },
    zh: {
      title: '鸣潮卡池排期 2026：当前卡池、下期与复刻预测',
      description: '查看鸣潮当前卡池、下期角色、复刻节奏、保底继承、星声规划和抽取优先级，适合零氪与月卡玩家。',
    },
  },
  'zzz/banner-schedule-guide': {
    en: {
      title: 'ZZZ Banner Schedule: Current, Next & Upcoming Banners',
      description: 'Track the current ZZZ banner, next banner, upcoming banners, reruns, Signal Search pity, Polychrome planning, and pull priorities.',
    },
    zh: {
      title: '绝区零卡池排期 2026：当前调频、下期与复刻',
      description: '查看绝区零当前调频、下期卡池、复刻预测、保底机制、菲林规划和抽取优先级，抽卡前先确认队伍缺口。',
    },
  },
  'wuwa/echo-advanced-guide': {
    en: {
      title: 'Wuthering Waves Echo Guide: Best Sets, Main Stats & Substats',
      description: 'Choose the best Wuthering Waves Echo sets, main stats, substats, Sonata bonuses, cost setup, and farming priority for current builds.',
    },
    zh: {
      title: '鸣潮声骸进阶攻略：主词条、副词条与套装',
      description: '讲清鸣潮声骸主词条、副词条、Sonata 套装选择和刷取优先级，帮助你更快完成毕业配装。',
    },
  },
  'wuwa/meta-teams-v3-guide': {
    en: {
      title: 'WuWa Meta Teams 2026: Best Teams, Rotations & Builds',
      description: 'Best Wuthering Waves teams for the current patch, with core characters, rotations, Echo notes, F2P options, and team-building priorities.',
    },
    zh: {
      title: '鸣潮版本强队 v3：主流配队、循环与配装',
      description: '整理鸣潮当前版本强队、循环手法、核心角色与配装思路，适合直接抄作业。',
    },
  },
  'zzz/v3-0-version-guide': {
    en: {
      title: 'ZZZ v3.1 Live Hub: Banners, Anniversary Rewards & v3.0 Recap',
      description: 'Track the live ZZZ v3.1 patch, anniversary rewards, Remielle/Sigrid, banners, codes, Xbox and Steam onboarding, plus a v3.0 recap.',
    },
    zh: {
      title: '绝区零 3.1 当前版本入口：卡池、周年福利与 3.0 回顾',
      description: '查看绝区零 3.1 当前卡池、2 周年福利、Remielle/Sigrid、兑换码、Xbox/Steam 入坑，并回顾 3.0 系统与养成。',
    },
  },
  'zzz/drive-disc-guide': {
    en: {
      title: 'ZZZ Drive Disc Guide: Best Sets, Main Stats & Builds',
      description: 'Choose the best ZZZ Drive Disc sets, main stats, slot 4-6 priorities, 4pc and 2pc combinations, and farming order for each agent role.',
    },
    zh: {
      title: '绝区零驱动盘攻略：套装、主属性与刷取优先级',
      description: '整理绝区零驱动盘套装、4/5/6号位主属性、4+2搭配、副词条和刷取优先级，适合快速完成代理人配装。',
    },
  },
  'zzz/rupture-specialty-guide': {
    en: {
      title: 'ZZZ Rupture Guide: Specialty Mechanics, Agents & Teams',
      description: 'Learn how ZZZ Rupture specialty works, which agents to build, how Daze windows affect burst damage, and which teams use Rupture best.',
    },
    zh: {
      title: '绝区零突击专精攻略：机制、代理人与配队',
      description: '讲清绝区零突击专精机制、核心代理人、失衡爆发窗口、驱动盘和配队思路，帮助你判断是否值得培养。',
    },
  },
  'zzz/team-building-guide': {
    en: {
      title: 'ZZZ Team Building Guide: Best Team Cores, Roles & Synergy',
      description: 'Build better Zenless Zone Zero teams with Stun, DPS, Support, Anomaly, and Defense roles, plus beginner cores and resource priorities.',
    },
    zh: {
      title: '绝区零配队攻略：队伍核心、职业定位与协同',
      description: '整理绝区零击破、输出、支援、异常和防护定位，讲清新手配队核心、属性协同、资源投入和二队规划。',
    },
  },
  'genshin/cross-game-comparison-guide': {
    en: {
      title: 'Genshin vs HSR vs ZZZ vs WuWa: Best Gacha Game to Play',
      description: 'Compare Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, and Wuthering Waves by combat, grind, F2P value, story, and endgame.',
    },
    zh: {
      title: '原神 vs 崩铁 vs 绝区零 vs 鸣潮：哪款二游适合你',
      description: '从战斗、探索、肝度、抽卡、零氪体验、剧情和终局内容对比原神、崩铁、绝区零与鸣潮，帮你快速选择。',
    },
  },
  'genshin/lunar-reaction-guide': {
    en: {
      title: 'Genshin Lunar Reaction Guide: Elements, Teams & Builds',
      description: 'Understand Genshin Lunar reactions, element interactions, team-building priorities, artifact choices, and when Lunar scaling is worth building around.',
    },
    zh: {
      title: '原神月系反应攻略：元素机制、配队与圣遗物',
      description: '讲清原神月系反应机制、元素联动、配队优先级、圣遗物选择和角色是否值得围绕月系反应培养。',
    },
  },
  'wuwa/cross-game-comparison-guide': {
    en: {
      title: 'WuWa vs Genshin vs ZZZ vs HSR: Which Anime Gacha Fits You?',
      description: 'Compare Wuthering Waves with Genshin, ZZZ, and Honkai: Star Rail by action combat, exploration, grind, gacha, F2P value, and endgame.',
    },
    zh: {
      title: '鸣潮 vs 原神 vs 绝区零 vs 崩铁：动作、探索与抽卡对比',
      description: '对比鸣潮、原神、绝区零和崩铁的战斗手感、开放世界、肝度、抽卡、零氪体验和终局内容。',
    },
  },
  'starrail/cross-game-comparison-guide': {
    en: {
      title: 'Genshin vs WuWa vs ZZZ vs HSR: Which Gacha Should You Play?',
      description: 'Compare ZZZ, Wuthering Waves, Genshin Impact, and Honkai: Star Rail by combat, grind, gacha, F2P value, story, and endgame.',
    },
    zh: {
      title: '绝区零 vs 鸣潮 vs 原神 vs 崩铁：哪款更适合你？',
      description: '从战斗、肝度、抽卡、零氪体验、剧情和终局内容对比四款热门二游，帮你选择最适合长期玩的游戏。',
    },
  },
  'starrail/fate-collab-guide': {
    en: {
      title: 'HSR Fate Collab Guide: Characters, Banners & Rewards',
      description: 'Honkai: Star Rail Fate collaboration guide covering expected characters, banners, rewards, event format, and pull planning.',
    },
    zh: {
      title: '崩铁 Fate 联动攻略：角色、卡池、奖励与抽取规划',
      description: '整理崩坏星穹铁道 Fate 联动的角色、卡池、活动奖励、玩法形式和抽取建议，方便提前规划星琼。',
    },
  },
  'endfield/crisis-contract-guide': {
    en: {
      title: 'Endfield Crisis Contract Retest: 40-45 Star Guide',
      description: 'Clear Arknights Endfield Crisis Contract Retest with 40, 42, and 45-star strategies, Etra tank setups, F2P builds, and indicators.',
    },
    zh: {
      title: '终末地危机合约重燃测试攻略：40-45星打法',
      description: '终末地危机合约重燃测试 40星、42星、45星打法，包含埃特拉主T思路、平民构筑、指标选择和奖励目标。',
    },
  },
  'nte/boss-guide-comprehensive': {
    en: {
      title: 'NTE Boss Weakness Guide: All Bosses, Drops & Teams',
      description: 'Find NTE boss weaknesses, shield counters, attack patterns, recommended teams, weekly boss rewards, and farming priorities.',
    },
    zh: {
      title: '异环 Boss 弱点攻略：全 Boss 打法、掉落与配队',
      description: '整理异环 Boss 弱点、破盾克制、攻击模式、推荐阵容、周本掉落和刷取优先级，适合快速通关和材料规划。',
    },
  },
  'nte/photo-mode-guide': {
    en: {
      title: 'NTE Photo Mode Guide: Unlock, Use & Best Settings',
      description: 'Learn how to unlock NTE photo mode, find the best settings, and capture cleaner shots with your favorite characters.',
    },
    zh: {
      title: '异环拍照模式攻略：解锁、使用与最佳设置',
      description: '整理异环拍照模式的解锁方式、使用方法和最佳设置，帮助你更快拍出高质量截图。',
    },
  },
  'nte/damage-formula': {
    en: {
      title: 'NTE Damage Formula Guide: Crit, Elements & Multipliers',
      description: 'Break down the NTE damage formula, including crit, elemental bonuses, skill multipliers, and build implications.',
    },
    zh: {
      title: '异环伤害公式攻略：暴击、属性与倍率计算',
      description: '讲清异环伤害公式中的暴击、属性加成、技能倍率和实战影响，帮助你理解如何提升输出。',
    },
  },
  'sea/launch-day-guide': {
    en: {
      title: 'Sea of Remnants Official Hub & Launch Guide: July 9 PC Open Beta, Cross-Platform, Launch Rewards',
      description: 'Sea of Remnants official hub and launch guide covering the July 9 PC open beta, July 23 mobile launch, cross-platform support, 100 pulls in launch month, free Black Ticket crew selection, PC specs, preload, and beginner FAQ.',
    },
    zh: {
      title: '《遗忘之海》官网入口与开服攻略：7 月 9 日公测、平台互通、首月福利',
      description: '遗忘之海官网入口与开服攻略，覆盖 7 月 9 日 PC 公测、7 月 23 日移动端、三端互通、首月 100 抽资源、自选黑券船员、PC 配置要求、预下载入口、新手首日路线和 FAQ。',
    },
  },
  'sea/open-beta-version-center': {
    en: {
      title: 'Sea of Remnants Open Beta Center / Official Hub: July 9 PC Launch and July 23 Mobile Updates',
      description: 'Summarizes Sea of Remnants PC open beta on July 9, the July 23 mobile launch, official hub links, cross-platform play, first-month content, and launch rewards.',
    },
    zh: {
      title: '《遗忘之海》公测中心 / 官网入口：7 月 9 日公测与首月更新',
      description: '汇总《遗忘之海》2026 年 7 月 9 日 PC 公测、移动端 7 月 23 日上线、官网入口、三端互通、首月新海域、新船员、系统玩法和公测福利。',
    },
  },
  'sea/download-install-guide': {
    en: {
      title: 'Sea of Remnants Mobile Download Guide: TapTap, iOS, Android, Steam, Official Launcher',
      description: 'Sea of Remnants July 23 mobile launch download guide covering TapTap, iOS, Android, Steam, official launcher, post-preload updates, storage, account checks, and troubleshooting.',
    },
    zh: {
      title: '《遗忘之海》移动端下载入口：官网、TapTap、iOS、Android、Steam 与官方启动器',
      description: '更新至 2026 年 7 月 23 日移动端首发口径，整理官网、TapTap、iOS、Android、Steam、官方启动器、预下载后更新、容量、账号和首日排错。',
    },
  },
  'sea/mechanics-faq-guide': {
    en: {
      title: 'Sea of Remnants Mechanics FAQ: Damage Reduction, Trading, Weekly Dredging',
      description: 'Answer Sea of Remnants launch-week mechanics questions: damage reduction, trade gifting, weekly dredging value, character vs outfit pulls, and F2P resource decisions.',
    },
    zh: {
      title: '《遗忘之海》机制 FAQ：减伤、交易送人、周常打捞、角色还是服装',
      description: '集中回答遗忘之海开服后最常见的机制问题：减伤怎么算、交易物品能不能送人、周常打捞值不值做、角色和服装资源是否冲突。',
    },
  },
};

function getGuideSeoFields(guide: unknown): GuideSeoFields {
  return guide && typeof guide === 'object' ? guide as GuideSeoFields : {};
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

const GUIDE_NEXT_STEPS: Partial<Record<GameId, Record<string, NextStepLink[]>>> = {
  zzz: {
    'v3-0-version-guide': [
      {
        href: '/zzz/version',
        label: { zh: '去 3.1 当前版本专题', en: 'Open the live v3.1 hub', ja: '配信中のv3.1特集へ' },
        description: { zh: '当前卡池、周年福利和热词入口', en: 'Current banners, anniversary rewards, and hot topics', ja: '現在バナー、周年報酬、注目トピック' },
      },
      {
        href: '/zzz/guides/meta-teams-v3-guide',
        label: { zh: '看当前主流配队', en: 'Read current meta teams', ja: '現在の編成を見る' },
        description: { zh: '结合当前角色与系统安排队伍', en: 'Build teams around the live roster and systems', ja: '現在のキャラとシステムで編成' },
      },
      {
        href: '/zzz/guides/rupture-specialty-guide',
        label: { zh: '看突击专精', en: 'Read Rupture guide', ja: 'ラプチャー解説へ' },
        description: { zh: '补齐新专精与新属性机制', en: 'Learn the new specialty and attribute system', ja: '新専精と新属性を補完', },
      },
    ],
    'meta-teams-v3-guide': [
      {
        href: '/zzz/version',
        label: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '先确认版本核心词再做配队', en: 'Re-check the version keywords first', ja: 'まず版本キーワードを確認', },
      },
      {
        href: '/zzz/guides/v3-0-version-guide',
        label: { zh: '看完整版本指南', en: 'Read full version guide', ja: '完全版ガイドを見る' },
        description: { zh: '先把 3.0 节点补齐', en: 'Fill in the 3.0 nodes first', ja: '3.0ノードを補完', },
      },
    ],
    'rupture-specialty-guide': [
      {
        href: '/zzz/characters',
        label: { zh: '看代理人图鉴', en: 'Open agent roster', ja: '代理人図鑑へ' },
        description: { zh: '把突击角色和强度先认全', en: 'Identify the key Rupture agents', ja: '主要ラプチャー代理人を確認', },
      },
      {
        href: '/zzz/version',
        label: { zh: '回到版本专题', en: 'Return to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '版本词和专精词一起看', en: 'Review the version topics together', ja: '版本トピックをまとめて確認', },
      },
    ],
  },
  starrail: {
    'banner-schedule-guide': [
      {
        href: '/starrail/version',
        label: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
        description: { zh: '把当前跃迁和版本节点一起看', en: 'Connect banner timing with the current version hub', ja: 'バナー時期を版本情報と一緒に確認', },
      },
      {
        href: '/starrail/characters',
        label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
        description: { zh: '抽卡前先确认角色定位和队伍缺口', en: 'Check roles and roster gaps before pulling', ja: '引く前に役割と編成不足を確認', },
      },
      {
        href: '/starrail/gacha',
        label: { zh: '看抽卡模拟', en: 'Open gacha tools', ja: 'ガチャツールへ' },
        description: { zh: '把保底、星琼和抽取计划算清楚', en: 'Plan pity, Stellar Jade, and pull targets', ja: '天井、星玉、狙いを計画', },
      },
    ],
  },
  wuwa: {
    'banner-schedule-guide': [
      {
        href: '/wuwa/version',
        label: { zh: '去版本专题', en: 'Open version hub', ja: 'バージョン特集へ' },
        description: { zh: '把当前卡池和版本热词一起看', en: 'Connect banners with the current version hub', ja: 'バナーと版本話題を確認', },
      },
      {
        href: '/wuwa/guides/meta-teams-v3-guide',
        label: { zh: '看主流配队', en: 'Read meta teams', ja: '編成を見る' },
        description: { zh: '抽卡前先确认角色能进哪些队', en: 'Check team value before spending Astrite', ja: '星声を使う前に編成価値を確認', },
      },
      {
        href: '/wuwa/characters',
        label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
        description: { zh: '继续看定位、属性和养成入口', en: 'Continue with roles, attributes, and build entries', ja: '役割、属性、育成入口へ', },
      },
    ],
    'echo-advanced-guide': [
      {
        href: '/wuwa/characters',
        label: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
        description: { zh: '按角色定位反推声骸主词条', en: 'Choose Echo stats from character role first', ja: 'キャラ役割からエコーを選ぶ', },
      },
      {
        href: '/wuwa/guides/meta-teams-v3-guide',
        label: { zh: '看主流配队', en: 'Read meta teams', ja: '編成を見る' },
        description: { zh: '把声骸配置放回队伍循环里', en: 'Place Echo builds back into team rotations', ja: 'エコーを編成ローテへ戻す', },
      },
      {
        href: '/wuwa/version',
        label: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '确认当前版本刷取优先级', en: 'Check current farming priorities', ja: '現在の周回優先度を確認', },
      },
    ],
    'meta-teams-v3-guide': [
      {
        href: '/wuwa/guides/banner-schedule-guide',
        label: { zh: '看卡池排期', en: 'Read banner schedule', ja: 'バナー予定へ' },
        description: { zh: '把队伍缺口转成抽卡优先级', en: 'Turn roster gaps into pull priorities', ja: '編成不足をガチャ優先度へ', },
      },
      {
        href: '/wuwa/guides/echo-advanced-guide',
        label: { zh: '看声骸进阶', en: 'Read Echo guide', ja: 'エコーガイドへ' },
        description: { zh: '继续补主词条、套装和副词条', en: 'Continue with main stats, sets, and substats', ja: 'メイン、セット、サブを確認', },
      },
    ],
    'v3-4-version-guide': [
      {
        href: '/wuwa/version',
        label: { zh: '去鸣潮版本专题', en: 'Open WuWa version hub', ja: '鳴潮バージョン特集へ' },
        description: { zh: '先看版本总览与热词', en: 'Version overview and current hot topics', ja: '版本概要と注目トピック', },
      },
      {
        href: '/wuwa/guides/v3-5-preview-guide',
        label: { zh: '看 v3.5 前瞻', en: 'Read v3.5 preview', ja: 'v3.5前瞻へ' },
        description: { zh: '继续看后续版本排期', en: 'Continue into the next version timing', ja: '次版本の流れを確認', },
      },
      {
        href: '/wuwa/guides/roya-frostlands-guide',
        label: { zh: '看新区域攻略', en: 'Read the region guide', ja: '新区域攻略へ' },
        description: { zh: '把新地图和养成一起串起来', en: 'Connect the new area with farming', ja: '新マップと育成導線を接続', },
      },
    ],
    'v3-5-preview-guide': [
      {
        href: '/wuwa/version',
        label: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '先确认当前版本节点', en: 'Confirm the current version node', ja: '現在の版本を確認', },
      },
      {
        href: '/wuwa/guides/v3-4-version-guide',
        label: { zh: '看 v3.4 版本', en: 'Read v3.4 guide', ja: 'v3.4を見る' },
        description: { zh: '前一个版本的内容补齐', en: 'Fill in the previous version context', ja: '前版本の文脈を補完', },
      },
    ],
    'roya-frostlands-guide': [
      {
        href: '/wuwa/characters',
        label: { zh: '看角色图鉴', en: 'Open character roster', ja: 'キャラ図鑑へ' },
        description: { zh: '找适合刷图的角色和配队', en: 'Find suitable characters and teams', ja: '周回向きキャラと編成を確認', },
      },
      {
        href: '/wuwa/version',
        label: { zh: '回到版本专题', en: 'Return to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '把新地图放回版本节奏里', en: 'Place the new area back in version timing', ja: '新エリアを版本導線に戻す', },
      },
    ],
  },
  endfield: {
    'download-install-guide': [
      {
        href: '/endfield/version',
        label: { zh: '去测试专题', en: 'Open test hub', ja: 'テスト特集へ' },
        description: { zh: '先确认是否在测试阶段', en: 'Check whether the game is in test phase', ja: 'テスト段階か確認', },
      },
      {
        href: '/endfield/guides/combat-system-guide',
        label: { zh: '看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' },
        description: { zh: '下载之后直接接战斗理解', en: 'Move straight into combat basics', ja: 'DL後に戦闘理解へ進む', },
      },
    ],
    'combat-system-guide': [
      {
        href: '/endfield/version',
        label: { zh: '回到测试专题', en: 'Back to test hub', ja: 'テスト特集へ戻る' },
        description: { zh: '确认测试节奏和入口', en: 'Confirm test timing and entry points', ja: 'テスト時期と入口を確認', },
      },
      {
        href: '/endfield/guides/crisis-contract-guide',
        label: { zh: '看高难攻略', en: 'Read crisis content', ja: '高難度攻略へ' },
        description: { zh: '看战斗系统如何用于高难玩法', en: 'Connect combat to high-difficulty content', ja: '戦闘から高難度へ接続', },
      },
    ],
    'crisis-contract-guide': [
      {
        href: '/endfield/characters',
        label: { zh: '看干员图鉴', en: 'Open operator roster', ja: 'オペレーター図鑑へ' },
        description: { zh: '回头补阵容和职业', en: 'Review roster and roles', ja: '編成と職分を確認', },
      },
      {
        href: '/endfield/version',
        label: { zh: '回到测试专题', en: 'Return to test hub', ja: 'テスト特集へ戻る' },
        description: { zh: '继续看测试与下载信息', en: 'Continue with test and download info', ja: 'テストとDL情報へ戻る', },
      },
    ],
  },
  nte: {
    'photo-mode-guide': [
      {
        href: '/nte/guides/beginner-guide',
        label: { zh: '看新手入门', en: 'Read beginner guide', ja: '初心者ガイドへ' },
        description: { zh: '先补齐基础操作，再看拍照技巧', en: 'Learn basics before photo tips', ja: '基本操作を先に確認', },
      },
      {
        href: '/nte/guides/download-install-guide',
        label: { zh: '看下载安装', en: 'Read install guide', ja: 'DLガイドへ' },
        description: { zh: '拍照之前先完成安装和启动', en: 'Finish install and launch first', ja: 'インストールと起動を先に', },
      },
    ],
    'damage-formula': [
      {
        href: '/nte/guides/boss-guide',
        label: { zh: '看 Boss 攻略', en: 'Read boss guide', ja: 'ボス攻略へ' },
        description: { zh: '把倍率理解和实战对象对上', en: 'Match formula theory to bosses', ja: '倍率理解を実戦へつなぐ', },
      },
      {
        href: '/nte/guides/gacha-strategy',
        label: { zh: '看抽卡策略', en: 'Read gacha strategy', ja: 'ガチャ戦略へ' },
        description: { zh: '算伤害之后再看资源规划', en: 'Plan resources after damage math', ja: '計算後に資源計画へ', },
      },
    ],
    'boss-guide-comprehensive': [
      {
        href: '/nte/guides/damage-formula',
        label: { zh: '看伤害公式', en: 'Read damage formula', ja: 'ダメージ計算へ' },
        description: { zh: '先理解数值，再回看 Boss 弱点', en: 'Understand numbers before weakness', ja: '数値を先に理解', },
      },
      {
        href: '/nte/version',
        label: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
        description: { zh: '把 Boss 词放回版本节点里', en: 'Place boss topics back into the version hub', ja: 'ボス話題を版本へ戻す', },
      },
    ],
  },
  sea: {
    'launch-day-guide': [
      {
        href: '/sea/guides/open-beta-version-center',
        label: { zh: '看公测中心', en: 'Read open beta center', ja: 'CBT特集へ' },
        description: { zh: '先确认版本时间和福利', en: 'Check timing and rewards first', ja: '時期と報酬を確認', },
      },
      {
        href: '/sea/guides/download-install-guide',
        label: { zh: '看下载安装', en: 'Read install guide', ja: 'DLガイドへ' },
        description: { zh: '开服前先把安装准备好', en: 'Get set up before launch', ja: '開始前に準備', },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Read gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '开服后别乱花，先看怎么赚和怎么卖', en: 'Do not spend blindly before learning the early economy', ja: '序盤の金策と売り方を先に確認', },
      },
    ],
    'open-beta-version-center': [
      {
        href: '/sea/guides/launch-day-guide',
        label: { zh: '看开服攻略', en: 'Read launch guide', ja: '開服攻略へ' },
        description: { zh: '把时间、福利和首日路线串起来', en: 'Tie timing, rewards, and first-day route together', ja: '時期、報酬、初日ルートを接続', },
      },
      {
        href: '/sea/guides/collaborations-guide',
        label: { zh: '看联动总表', en: 'Read collab matrix', ja: 'コラボ一覧へ' },
        description: { zh: '把角色与联动内容一起看', en: 'Review crews and collabs together', ja: '船員とコラボを一緒に確認', },
      },
    ],
    'download-install-guide': [
      {
        href: '/sea/guides/pc-mobile-cross-progression-faq',
        label: { zh: '看互通 FAQ', en: 'Read cross-progress FAQ', ja: '連携FAQへ' },
        description: { zh: '先确认账号、区服、渠道和奖励边界', en: 'Check account, server, channel, and reward boundaries', ja: 'アカウント、サーバー、チャネル、報酬境界を確認', },
      },
      {
        href: '/sea/guides/mobile-troubleshooting-guide',
        label: { zh: '看首日排错', en: 'Read troubleshooting', ja: '初日対応へ' },
        description: { zh: '黑屏、卡顿、更新慢和福利没到账先看这里', en: 'Use this for black screens, lag, slow updates, and missing rewards', ja: '黒画面、ラグ、更新遅延、報酬未着を確認', },
      },
    ],
    'payment-model-guide': [
      {
        href: '/sea/guides/mechanics-faq-guide',
        label: { zh: '看机制 FAQ', en: 'Read mechanics FAQ', ja: 'システムFAQへ' },
        description: { zh: '先回答减伤、交易、周常和服装资源冲突', en: 'Answer damage reduction, trading, weekly, and outfit-resource questions', ja: '軽減、交易、週課、衣装資源の疑問を確認', },
      },
      {
        href: '/sea/guides/trade-market-guide',
        label: { zh: '看贸易场总览', en: 'Read trade market guide', ja: '交易所総覧へ' },
        description: { zh: '先把贸易场机制和可交易内容看全', en: 'See how the market works and what is tradeable', ja: '交易所の仕組みと取引対象を確認', },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Read gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '继续看零氪首周怎么赚、怎么卖、怎么囤', en: 'Continue with first-week F2P earning and selling routes', ja: '無課金向けの初週金策へ進む', },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '把资源规划落到首月抽卡决策上', en: 'Turn monetization info into a launch-month pull plan', ja: '資源計画を初月の判断に落とし込む', },
      },
    ],
    'trade-market-guide': [
      {
        href: '/sea/guides/mechanics-faq-guide',
        label: { zh: '看机制 FAQ', en: 'Read mechanics FAQ', ja: 'システムFAQへ' },
        description: { zh: '补充交易送人、周常和资源冲突的常见问答', en: 'Follow up with gifting, weekly, and resource-conflict answers', ja: '贈与、週課、資源衝突のFAQを確認', },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Read gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '从系统总览继续走到首周实操路线', en: 'Move from system overview into practical first-week execution', ja: '総覧から初週実践へ進む', },
      },
      {
        href: '/sea/guides/payment-model-guide',
        label: { zh: '回到付费模式', en: 'Back to payment model', ja: '課金モデルへ戻る' },
        description: { zh: '把交易系统放回整体商业化设计里看', en: 'Place the market back inside the full monetization model', ja: '交易所を全体課金設計に戻して見る', },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '继续看资源该换推进、外观还是交易空间', en: 'Decide whether resources should become power, cosmetics, or flexibility', ja: '資源を火力・衣装・余地のどれに変えるか判断', },
      },
    ],
    'good-gold-bricks-farming-guide': [
      {
        href: '/sea/guides/mechanics-faq-guide',
        label: { zh: '看机制 FAQ', en: 'Read mechanics FAQ', ja: 'システムFAQへ' },
        description: { zh: '继续确认交易、送人、囤货和周常收益', en: 'Confirm trading, gifting, hoarding, and weekly value', ja: '交易、贈与、貯蓄、週課価値を確認', },
      },
      {
        href: '/sea/guides/trade-market-guide',
        label: { zh: '回看贸易场总览', en: 'Back to trade market guide', ja: '交易所総覧へ戻る' },
        description: { zh: '先把总规则再对一遍，再做价格判断', en: 'Review the core rules before making market calls', ja: '価格判断前にルールを再確認', },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '赚到好金砖之后，下一步就是决定怎么花', en: 'After earning bricks, decide how to spend them', ja: '好金砖を稼いだ後は使い道を決める', },
      },
      {
        href: '/sea/guides/payment-model-guide',
        label: { zh: '看付费模式', en: 'Read payment model', ja: '課金モデルへ' },
        description: { zh: '把好金砖放回整体零氪/轻氪策略里看', en: 'Reconnect bricks to the broader F2P or light-spend plan', ja: '好金砖を全体戦略に戻して確認', },
      },
    ],
    'character-vs-outfit-pull-guide': [
      {
        href: '/sea/guides/mechanics-faq-guide',
        label: { zh: '看机制 FAQ', en: 'Read mechanics FAQ', ja: 'システムFAQへ' },
        description: { zh: '先确认服装、角色和周常资源是否冲突', en: 'Check whether outfits, characters, and weekly resources conflict', ja: '衣装、キャラ、週課資源の衝突を確認', },
      },
      {
        href: '/sea/guides/payment-model-guide',
        label: { zh: '回到付费模式', en: 'Back to payment model', ja: '課金モデルへ戻る' },
        description: { zh: '重新确认角色、外观和保底的整体关系', en: 'Re-check the bigger relationship between pulls, cosmetics, and pity', ja: 'ガチャ・衣装・保底の全体関係へ戻る', },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Read gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '如果你决定先囤资源，就继续看怎么赚', en: 'If you decide to save, continue with how to earn bricks efficiently', ja: '先に貯めるなら金策ルートへ', },
      },
      {
        href: '/sea/guides/launch-day-guide',
        label: { zh: '回到开服攻略', en: 'Back to launch guide', ja: '開服攻略へ戻る' },
        description: { zh: '把抽卡判断放回首日路线和资源节奏里', en: 'Place the pull decision back into your day-one route', ja: '判断を初日ルートに戻して確認', },
      },
    ],
    'memory-reunion-guide': [
      {
        href: '/sea/calculator',
        label: { zh: '用黑券推荐器', en: 'Use Black Ticket selector', ja: '黒券おすすめを使う' },
        description: { zh: '按队伍缺口直接算 6 选 1 顺序', en: 'Rank the 6-choice selector by roster gap', ja: '編成不足から6択順位を出す', },
      },
      {
        href: '/sea/guides/mechanics-faq-guide',
        label: { zh: '看机制 FAQ', en: 'Read mechanics FAQ', ja: 'システムFAQへ' },
        description: { zh: '继续看周常打捞、减伤和资源冲突', en: 'Continue with weekly dredging, mitigation, and resource conflicts', ja: '週課、軽減、資源衝突を確認', },
      },
    ],
    'mechanics-faq-guide': [
      {
        href: '/sea/calculator',
        label: { zh: '用黑券推荐器', en: 'Use Black Ticket selector', ja: '黒券おすすめを使う' },
        description: { zh: '把 FAQ 里的队伍缺口变成 6 选 1 排序', en: 'Turn roster-gap answers into a 6-choice ranking', ja: '不足ロールを6択順位に変換', },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Read Gold Bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '继续看交易、囤货和首周赚钱路线', en: 'Continue with trading, hoarding, and week-one earning routes', ja: '交易、貯蓄、初週金策へ', },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '把资源冲突落到首月抽取判断', en: 'Turn resource conflicts into launch-month pull decisions', ja: '資源衝突を初月判断へ落とす', },
      },
    ],
  },
};

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) => [
    ...nteGuides.map((guide) => ({
      lang,
      game: 'nte',
      slug: guide.id,
    })),
    ...genshinGuides.map((guide) => ({
      lang,
      game: 'genshin',
      slug: guide.id,
    })),
    ...starrailGuides.map((guide) => ({
      lang,
      game: 'starrail',
      slug: guide.id,
    })),
    ...wuwaGuides.map((guide) => ({
      lang,
      game: 'wuwa',
      slug: guide.id,
    })),
    ...zzzGuides.map((guide) => ({
      lang,
      game: 'zzz',
      slug: guide.id,
    })),
    ...guihuanGuides.map((guide) => ({
      lang,
      game: 'guihuan',
      slug: guide.id,
    })),
    ...anantaGuides.map((g) => ({
      lang,
      game: 'ananta',
      slug: g.id,
    })),
    ...endfieldGuides.map((g) => ({
      lang,
      game: 'endfield',
      slug: g.id,
    })),
    ...seaGuides.map((g) => ({
      lang,
      game: 'sea',
      slug: g.id,
    })),
    ...skjhGuides.map((g) => ({
      lang,
      game: 'skjh',
      slug: g.id,
    })),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  const buildOg = (title: string, description: string, gameId: string, slug: string, locale: SupportedLocale) => ({
    title,
    description,
    url: `https://gachia.com/${locale}/${gameId}/guides/${slug}`,
    siteName: 'Gachia',
    images: [{ url: `https://gachia.com/images/og/${gameId}.webp`, width: 1200, height: 630 }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  });

  const buildGuideAlternates = (gameId: string, slug: string, guide: unknown) => buildLocalizedAlternates(
    locale,
    (lang) => `/${lang}/${gameId}/guides/${slug}`,
    LOCALES,
    { includeLocale: (lang) => hasLocalizedContent(guide, lang) }
  );

  // Build intent-rich title & description per locale for guides
  const buildGuideMeta = (guide: unknown, guideTitle: string, summary: string, gameName: string) => {
    const seoFields = getGuideSeoFields(guide);
    const serpTitle = getLocalizedSeoText(seoFields.serpTitle, locale);
    const serpDescription = getLocalizedSeoText(seoFields.serpDescription, locale);
    if (serpTitle && serpDescription) {
      return {
        title: serpTitle,
        description: ensureMetaLength(serpDescription, locale),
      };
    }

    const override = GUIDE_META_OVERRIDES[`${gameId}/${slug}`]?.[locale];
    if (override) {
      return {
        ...override,
        description: ensureMetaLength(override.description, locale),
      };
    }

    // For long descriptive titles, skip the game-name suffix to stay within SERP display limits
    const titleSuffix = guideTitle.length > 45
      ? ''
      : locale === 'zh'
        ? ` — ${gameName}攻略详解`
        : locale === 'ja'
          ? ` — ${gameName}攻略ガイド`
          : ` — ${gameName} Guide`;
    const title = `${guideTitle}${titleSuffix}`;
    const baseSummary = summary?.trim() ?? '';
    const desc = baseSummary.length >= 100
      ? baseSummary.slice(0, 160)
      : locale === 'zh'
        ? `${guideTitle}是${gameName}的详细攻略，包含技巧、策略、FAQ、版本要点和实战思路，帮助你快速掌握这页最重要的内容。${baseSummary ? ` 额外摘要：${baseSummary}` : ''}`
        : locale === 'ja'
          ? `${guideTitle}の${gameName}攻略ガイド。Tips、戦略、FAQ、版本要点、実戦の考え方をまとめ、必要な情報へすぐ進めます。${baseSummary ? ` 補足: ${baseSummary}` : ''}`
          : `Complete ${guideTitle} guide for ${gameName} with tips, strategies, FAQ, version notes, and practical advice. ${baseSummary ? `Summary: ${baseSummary}` : ''}`;
    return { title, description: ensureMetaLength(desc, locale) };
  };

  if (gameId === 'genshin') {
    const guide = getGenshinGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.genshin.name[locale];
    const meta = buildGuideMeta(guide, getGenshinGuideTitle(guide, locale), getGenshinGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'nte') {
    const guide = getNteGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.nte.name[locale];
    const meta = buildGuideMeta(guide, getNteGuideTitle(guide, locale), getNteGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'wuwa') {
    const guide = getWuWaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.wuwa.name[locale];
    const meta = buildGuideMeta(guide, getWuWaGuideTitle(guide, locale), getWuWaGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'starrail') {
    const guide = getStarRailGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.starrail.name[locale];
    const meta = buildGuideMeta(guide, getStarRailGuideTitle(guide, locale), getStarRailGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'zzz') {
    const guide = getZzzGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.zzz.name[locale];
    const meta = buildGuideMeta(guide, getZzzGuideTitle(guide, locale), getZzzGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'guihuan') {
    const guide = getGuihuanGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.guihuan.name[locale];
    const meta = buildGuideMeta(guide, getGuihuanGuideTitle(guide, locale), getGuihuanGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'ananta') {
    const guide = getAnantaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.ananta.name[locale];
    const meta = buildGuideMeta(guide, getAnantaGuideTitle(guide, locale), getAnantaGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'endfield') {
    const guide = getEndfieldGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.endfield.name[locale];
    const meta = buildGuideMeta(guide, getEndfieldGuideTitle(guide, locale), getEndfieldGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'sea') {
    const guide = getSeaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.sea.name[locale];
    const meta = buildGuideMeta(guide, getSeaGuideTitle(guide, locale), getSeaGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  if (gameId === 'skjh') {
    const guide = getSkjhGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.skjh.name[locale];
    const meta = buildGuideMeta(guide, getSkjhGuideTitle(guide, locale), getSkjhGuideSummary(guide, locale), gameName);
    return withGuideIndexing(locale, guide, { ...meta, alternates: buildGuideAlternates(gameId, slug, guide), openGraph: buildOg(meta.title, meta.description, gameId, slug, locale) });
  }

  return {};
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    return <GenshinGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'nte') {
    return <NteGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'starrail') {
    return <StarRailGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'zzz') {
    return <ZzzGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'guihuan') {
    return <GuihuanGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'ananta') {
    return <AnantaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'endfield') {
    return <EndfieldGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'sea') {
    return <SeaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'skjh') {
    return <SkjhGuideDetail locale={locale} slug={slug} />;
  }

  notFound();
}

function GenshinGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getGenshinGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.genshin;
  const content = getGenshinGuideContent(guide, locale);
  const category = getGenshinGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/genshin/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {GENSHIN_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{GENSHIN_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGenshinGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGenshinGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <BannerIntentPanel gameId="genshin" slug={slug} locale={locale} />
      <QuickAnswerSection gameId="genshin" slug={slug} locale={locale} />

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getGenshinGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getGenshinGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="genshin" currentSlug={slug} locale={locale} />
      <NextStepSection gameId="genshin" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/genshin/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'genshin',
        locale,
        title: getGenshinGuideTitle(guide, locale),
        summary: getGenshinGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getGenshinGuideFaqQuestion(f, locale), answer: getGenshinGuideFaqAnswer(f, locale) })),
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

function NteGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getNteGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.nte;
  const content = getNteGuideContent(guide, locale);
  const category = getNteGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/nte/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {NTE_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{NTE_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getNteGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getNteGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <QuickAnswerSection gameId="nte" slug={slug} locale={locale} />

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getNteGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getNteGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NteRelatedEntitiesSection guide={guide} locale={locale} currentSlug={slug} />

      <NextStepSection gameId="nte" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="nte" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/nte/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'nte',
        locale,
        title: getNteGuideTitle(guide, locale),
        summary: getNteGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getNteGuideFaqQuestion(f, locale), answer: getNteGuideFaqAnswer(f, locale) })),
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

// ============================================================
// Wuthering Waves Guide Detail
// ============================================================

function WuWaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getWuWaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.wuwa;
  const content = getWuWaGuideContent(guide, locale);
  const category = getWuWaGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/wuwa/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {WUWA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{WUWA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getWuWaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getWuWaGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <BannerIntentPanel gameId="wuwa" slug={slug} locale={locale} />
      <QuickAnswerSection gameId="wuwa" slug={slug} locale={locale} />

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getWuWaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getWuWaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId="wuwa" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="wuwa" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/wuwa/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'wuwa',
        locale,
        title: getWuWaGuideTitle(guide, locale),
        summary: getWuWaGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getWuWaGuideFaqQuestion(f, locale), answer: getWuWaGuideFaqAnswer(f, locale) })),
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

// ============================================================
// Star Rail Guide Detail
// ============================================================

function StarRailGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getStarRailGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.starrail;
  const content = getStarRailGuideContent(guide, locale);
  const category = getStarRailGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/starrail/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {STARRAIL_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{STARRAIL_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getStarRailGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getStarRailGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <BannerIntentPanel gameId="starrail" slug={slug} locale={locale} />
      <QuickAnswerSection gameId="starrail" slug={slug} locale={locale} />

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
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
                  {getStarRailGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getStarRailGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="starrail" currentSlug={slug} locale={locale} />
      <NextStepSection gameId="starrail" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/starrail/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'starrail',
        locale,
        title: getStarRailGuideTitle(guide, locale),
        summary: getStarRailGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getStarRailGuideFaqQuestion(f, locale), answer: getStarRailGuideFaqAnswer(f, locale) })),
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

/* ---------- ZZZ Guide Detail ---------- */

function ZzzGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getZzzGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.zzz;
  const content = getZzzGuideContent(guide, locale);
  const category = getZzzGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/zzz/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ZZZ_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ZZZ_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getZzzGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getZzzGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <BannerIntentPanel gameId="zzz" slug={slug} locale={locale} />
      <QuickAnswerSection gameId="zzz" slug={slug} locale={locale} />

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
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
                  {getZzzGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getZzzGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId="zzz" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="zzz" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/zzz/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'zzz',
        locale,
        title: getZzzGuideTitle(guide, locale),
        summary: getZzzGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getZzzGuideFaqQuestion(f, locale), answer: getZzzGuideFaqAnswer(f, locale) })),
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

/* ---------- Guihuan Guide Detail ---------- */

function GuihuanGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getGuihuanGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.guihuan;
  const content = getGuihuanGuideContent(guide, locale);
  const category = getGuihuanGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/guihuan/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {GUIHUAN_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{GUIHUAN_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGuihuanGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGuihuanGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
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
                  {getGuihuanGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getGuihuanGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="guihuan" currentSlug={slug} locale={locale} />
      <NextStepSection gameId="guihuan" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/guihuan/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'guihuan',
        locale,
        title: getGuihuanGuideTitle(guide, locale),
        summary: getGuihuanGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getGuihuanGuideFaqQuestion(f, locale), answer: getGuihuanGuideFaqAnswer(f, locale) })),
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

/* ---------- Ananta Guide Detail ---------- */

function AnantaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: AnantaGuide | undefined = getAnantaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.ananta;
  const content = getAnantaGuideContent(guide, locale);
  const category = getAnantaGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/ananta/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ANANTA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ANANTA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getAnantaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getAnantaGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: AnantaGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getAnantaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getAnantaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="ananta" currentSlug={slug} locale={locale} />
      <NextStepSection gameId="ananta" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/ananta/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'ananta',
        locale,
        title: getAnantaGuideTitle(guide, locale),
        summary: getAnantaGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getAnantaGuideFaqQuestion(f, locale), answer: getAnantaGuideFaqAnswer(f, locale) })),
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

/* ---------- Endfield Guide Detail ---------- */

function EndfieldGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: EndfieldGuide | undefined = getEndfieldGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.endfield;
  const content = getEndfieldGuideContent(guide, locale);
  const category = getEndfieldGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/endfield/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ENDFIELD_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ENDFIELD_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getEndfieldGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getEndfieldGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: EndfieldGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getEndfieldGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getEndfieldGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <NextStepSection gameId="endfield" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="endfield" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/endfield/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'endfield',
        locale,
        title: getEndfieldGuideTitle(guide, locale),
        summary: getEndfieldGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getEndfieldGuideFaqQuestion(f, locale), answer: getEndfieldGuideFaqAnswer(f, locale) })),
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

/* ---------- Sea of Remnants Guide Detail ---------- */

function SeaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: SeaGuide | undefined = getSeaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.sea;
  const content = getSeaGuideContent(guide, locale);
  const category = getSeaGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/sea/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {SEA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{SEA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getSeaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getSeaGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <GuideFreshnessSection guide={guide} locale={locale} />
      <QuickAnswerSection gameId="sea" slug={slug} locale={locale} />

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: SeaGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getSeaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getSeaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <SeaRelatedEntitiesSection guide={guide} locale={locale} currentSlug={slug} />

      <NextStepSection gameId="sea" currentSlug={slug} locale={locale} />

      <RelatedGuidesSection gameId="sea" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/sea/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'sea',
        locale,
        title: getSeaGuideTitle(guide, locale),
        summary: getSeaGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getSeaGuideFaqQuestion(f, locale), answer: getSeaGuideFaqAnswer(f, locale) })),
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

/* ---------- Ashfall Evolution Guide Detail ---------- */

function SkjhGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: SkjhGuide | undefined = getSkjhGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.skjh;
  const content = getSkjhGuideContent(guide, locale);
  const category = getSkjhGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/skjh/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {SKJH_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{SKJH_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getSkjhGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getSkjhGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem: SkjhGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getSkjhGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getSkjhGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="skjh" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/skjh/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'skjh',
        locale,
        title: getSkjhGuideTitle(guide, locale),
        summary: getSkjhGuideSummary(guide, locale),
        slug,
        tags: guide.tags,
        categoryLabel: category,
        updatedAt: getGuideUpdatedAt(guide),
        faq: guide.faq?.map((f) => ({ question: getSkjhGuideFaqQuestion(f, locale), answer: getSkjhGuideFaqAnswer(f, locale) })),
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

// --- Shared Related Guides Section ---

type GuideLike = { id: string; category: string; tags: string[] };

function getGuideIntentScore(current: GuideLike, candidate: GuideLike) {
  const currentTerms = [
    current.id,
    current.category,
    ...current.tags,
  ].join(' ').toLowerCase();
  const candidateTerms = [
    candidate.id,
    candidate.category,
    ...candidate.tags,
  ].join(' ').toLowerCase();

  const intentGroups = [
    ['banner', 'schedule', 'wish', 'pity', 'pull', 'gacha', '祈愿', '卡池', '保底', '抽卡'],
    ['boss', 'weakness', 'drop', 'combat', 'challenge', '副本', '弱点', '掉落', '战斗'],
    ['comparison', 'compare', 'vs', '对比', '横评'],
    ['farming', 'route', 'material', '材料', '路线'],
    ['team', 'meta', 'tier', 'build', '配队', '强度', '排行'],
  ];

  return intentGroups.reduce((score, group) => {
    const currentMatches = group.some((term) => currentTerms.includes(term));
    const candidateMatches = group.some((term) => candidateTerms.includes(term));
    return score + (currentMatches && candidateMatches ? 3 : 0);
  }, 0);
}

function RelatedGuidesSection({ gameId, currentSlug, locale }: { gameId: string; currentSlug: string; locale: SupportedLocale }) {
  const allGuides = getGuidesForGame(gameId);
  const current = allGuides.find((g) => g.id === currentSlug);
  if (!current) return null;

  const related = allGuides
    .filter((g) => g.id !== currentSlug)
    .map((g) => {
      const sameCategory = g.category === current.category ? 2 : 0;
      const sharedTags = g.tags.filter((t) => current.tags.includes(t)).length;
      return { ...g, score: sameCategory + sharedTags + getGuideIntentScore(current, g) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (related.length === 0) return null;

  const sectionTitle = locale === 'zh' ? '相关攻略' : locale === 'ja' ? '関連ガイド' : 'Related Guides';

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">{sectionTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((g) => {
          const title = getGuideTitleForGame(gameId, g, locale);
          const summary = getGuideSummaryForGame(gameId, g, locale);
          return (
            <Link
              key={g.id}
              href={`/${gameId}/guides/${g.id}` as '/'}
              className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary"
            >
              <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{title}</h3>
              <p className="text-xs text-game-text-muted line-clamp-2">{summary}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function QuickAnswerSection({ gameId, slug, locale }: { gameId: GameId; slug: string; locale: SupportedLocale }) {
  const answer = GUIDE_QUICK_ANSWERS[gameId]?.[slug];
  if (!answer) return null;

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
        <h2 className="mb-2 text-lg font-semibold text-game-text">
          {panel.title[locale]}
        </h2>
        <p className="text-sm leading-relaxed text-game-text-muted">
          {panel.summary[locale]}
        </p>
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
              <Link
                key={link.href}
                href={link.href as '/'}
                className="block rounded-md border border-game-border bg-game-surface-alt p-3 transition-colors hover:border-game-primary"
              >
                <span className="mb-1 block text-sm font-semibold text-game-text">
                  {link.label[locale]}
                </span>
                <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">
                  {link.description[locale]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GuideFreshnessSection({ guide, locale }: { guide: unknown; locale: SupportedLocale }) {
  const seoFields = getGuideSeoFields(guide);
  const facts = seoFields.quickFacts?.[locale] ?? seoFields.quickFacts?.en ?? seoFields.quickFacts?.zh ?? [];
  if (!seoFields.updatedAt && !seoFields.currentVersion && facts.length === 0) return null;

  const updatedLabel = locale === 'zh' ? '更新于' : locale === 'ja' ? '更新日' : 'Updated';
  const versionLabel = locale === 'zh' ? '当前版本' : locale === 'ja' ? '現在版本' : 'Current version';

  return (
    <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-game-text-muted">
        {seoFields.updatedAt && (
          <span className="rounded bg-game-surface-alt px-2 py-1">
            {updatedLabel}: {seoFields.updatedAt}
          </span>
        )}
        {seoFields.currentVersion && (
          <span className="rounded bg-game-surface-alt px-2 py-1">
            {versionLabel}: {seoFields.currentVersion}
          </span>
        )}
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

function NextStepSection({ gameId, currentSlug, locale }: { gameId: string; currentSlug: string; locale: SupportedLocale }) {
  const nextSteps = GUIDE_NEXT_STEPS[gameId as GameId]?.[currentSlug] ?? GUIDE_FALLBACK_NEXT_STEPS[gameId as GameId];
  if (!nextSteps?.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {nextSteps.map((step) => (
          <Link
            key={step.href}
            href={step.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {step.label[locale]}
            </h3>
            <p className="text-xs text-game-text-muted line-clamp-2">
              {step.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

const NTE_LORE_LINKS: Record<string, { href: string; label: Record<SupportedLocale, string>; description: Record<SupportedLocale, string> }> = {
  'hollow-phenomenon': {
    href: '/nte/guides/exploration-tips',
    label: { zh: '空洞现象与探索提示', en: 'Hollow Phenomenon & Exploration Tips', ja: 'ホロウ現象と探索ヒント' },
    description: {
      zh: '先看空洞现象的探索规律，再回到地图路线与隐藏内容。',
      en: 'Learn Hollow phenomenon patterns, then return to routes and hidden content.',
      ja: 'ホロウ現象の探索傾向を確認してから、ルートと隠し要素へ戻れます。',
    },
  },
};

const NTE_LOCATION_LABELS: Record<string, Record<SupportedLocale, string>> = {
  hethereau: { zh: '海瑟劳', en: 'Hethereau', ja: 'ヘテロー' },
  'sixth-street': { zh: '六街', en: 'Sixth Street', ja: 'シックスストリート' },
  'hollow-zero': { zh: '空洞零号', en: 'Hollow Zero', ja: 'ホロウ・ゼロ' },
  'lumina-square': { zh: '光映广场', en: 'Lumina Square', ja: 'ルミナスクエア' },
};

function NteRelatedEntitiesSection({
  guide,
  locale,
  currentSlug,
}: {
  guide: NteGuide;
  locale: SupportedLocale;
  currentSlug: string;
}) {
  const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

  const characterLinks = (guide.relatedCharacters ?? [])
    .map((id) => {
      const character = getNteCharacterById(id);
      if (!character) return null;
      return {
        href: `/nte/characters/${id}`,
        label: getNteCharacterName(character, locale),
        description:
          locale === 'zh'
            ? '去角色详情页看技能、定位和配装。'
            : locale === 'ja'
              ? 'キャラ詳細でスキル、役割、ビルドを確認。'
              : 'Open the character page for skills, roles, and builds.',
      };
    })
    .filter(isDefined)
    .filter((item) => item.href !== `/nte/guides/${currentSlug}`);

  const locationLinks = (guide.relatedLocations ?? [])
    .map((id) => {
      const region = getNteRegionById(id);
      const label = region ? getNteRegionName(region, locale) : NTE_LOCATION_LABELS[id]?.[locale] ?? id;
      return {
        href: `/nte/map#${id}`,
        label,
        description:
          locale === 'zh'
            ? '去地图页查看区域、路线和探索入口。'
            : locale === 'ja'
              ? 'マップで区域、ルート、探索入口を確認。'
              : 'Open the map for zones, routes, and exploration entry points.',
      };
    })
    .filter(isDefined)
    .filter((item) => item.href !== `/nte/guides/${currentSlug}`);

  const loreLinks = (guide.relatedLore ?? [])
    .map((id) => {
      const preset = NTE_LORE_LINKS[id];
      if (preset) {
        return {
          href: preset.href,
          label: preset.label[locale],
          description: preset.description[locale],
        };
      }
      return {
        href: '/nte/version',
        label:
          locale === 'zh'
            ? '世界观与版本专题'
            : locale === 'ja'
              ? '世界観とバージョン特集'
              : 'Lore and version hub',
        description:
          locale === 'zh'
            ? '回到版本专题继续看世界观和更新节点。'
            : locale === 'ja'
              ? 'バージョン特集に戻って世界観と更新を確認。'
              : 'Return to the version hub for lore and updates.',
      };
    })
    .filter(isDefined)
    .filter((item) => item.href !== `/nte/guides/${currentSlug}`);

  const sections = [
    { title: locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters', links: characterLinks },
    { title: locale === 'zh' ? '相关地点' : locale === 'ja' ? '関連ロケーション' : 'Related Locations', links: locationLinks },
    { title: locale === 'zh' ? '相关世界观' : locale === 'ja' ? '関連世界観' : 'Related Lore', links: loreLinks },
  ].filter((section) => section.links.length > 0);

  if (sections.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-game-primary">
        {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '続けて見る' : 'Continue Exploring'}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">{section.title}</h3>
            <div className="space-y-2">
              {section.links.map((link) => (
                <Link
                  key={`${section.title}-${link.href}-${link.label}`}
                  href={link.href as '/'}
                  className="block rounded-md border border-game-border bg-game-surface-alt px-3 py-2 transition-colors hover:border-game-primary"
                >
                  <div className="text-sm font-medium text-game-text">{link.label}</div>
                  <div className="mt-1 text-xs text-game-text-muted">{link.description}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const SEA_GUIDE_ENTITY_LINKS: Record<string, {
  characters?: string[];
  guides?: Array<{ href: string; label: Record<SupportedLocale, string>; description: Record<SupportedLocale, string> }>;
}> = {
  'launch-day-guide': {
    characters: ['traveler', 'ais', 'little-axe', 'princess'],
    guides: [
      {
        href: '/sea/guides/open-beta-version-center',
        label: { zh: '看公测中心', en: 'Open beta center', ja: '公測センターへ' },
        description: { zh: '先看版本总览和首月更新。', en: 'Start with the version overview and month-one updates.', ja: '版本概要と初月更新を見る。' },
      },
      {
        href: '/sea/guides/download-install-guide',
        label: { zh: '看下载安装', en: 'Download & install', ja: 'DLガイドへ' },
        description: { zh: '开服前把下载和安装准备好。', en: 'Get download and install ready before launch.', ja: '配信前にDLとインストールを整える。' },
      },
      {
        href: '/sea/guides/launch-rewards-codes-guide',
        label: { zh: '看福利与兑换码', en: 'Rewards & codes', ja: '報酬とコードへ' },
        description: { zh: '别漏掉首月福利和兑换码。', en: 'Do not miss launch rewards or codes.', ja: '初月報酬とコードを見逃さない。' },
      },
    ],
  },
  'open-beta-version-center': {
    characters: ['traveler', 'ais', 'little-axe', 'heige'],
    guides: [
      {
        href: '/sea/guides/launch-day-guide',
        label: { zh: '看开服攻略', en: 'Launch guide', ja: '開服攻略へ' },
        description: { zh: '把时间、福利和首日路线串起来。', en: 'Tie timing, rewards, and day-one routing together.', ja: '時期、報酬、初日ルートを接続。' },
      },
      {
        href: '/sea/guides/launch-preview-calendar',
        label: { zh: '看前瞻日历', en: 'Preview calendar', ja: '前瞻カレンダーへ' },
        description: { zh: '继续看版本节点和节奏。', en: 'Continue with version nodes and pacing.', ja: '版本ノードと進行を確認。' },
      },
      {
        href: '/sea/guides/launch-rewards-codes-guide',
        label: { zh: '看福利与兑换码', en: 'Rewards & codes', ja: '報酬とコードへ' },
        description: { zh: '把版本更新和奖励入口接起来。', en: 'Connect version updates with reward pages.', ja: '版本更新と報酬導線をつなぐ。' },
      },
    ],
  },
  'download-install-guide': {
    characters: ['traveler', 'ais'],
    guides: [
      {
        href: '/sea/guides/pc-mobile-cross-progression-faq',
        label: { zh: '看互通 FAQ', en: 'Cross-progress FAQ', ja: '連携FAQへ' },
        description: { zh: '先确认账号、区服、渠道和奖励边界。', en: 'Check account, server, channel, and reward boundaries.', ja: 'アカウント、サーバー、チャネル、報酬境界を確認。' },
      },
      {
        href: '/sea/guides/mobile-troubleshooting-guide',
        label: { zh: '看首日排错', en: 'Troubleshooting', ja: '初日対応へ' },
        description: { zh: '进不去、黑屏、卡顿、更新慢时先查。', en: 'Check this for login issues, black screens, lag, and slow updates.', ja: 'ログイン不可、黒画面、ラグ、更新遅延を確認。' },
      },
      {
        href: '/sea/guides/launch-rewards-codes-guide',
        label: { zh: '看福利兑换码', en: 'Rewards and codes', ja: '報酬とコードへ' },
        description: { zh: '安装后别急着领奖，先确认账号和区服。', en: 'Before claiming rewards, confirm account and server.', ja: '報酬受取前にアカウントとサーバーを確認。' },
      },
    ],
  },
  'tier-list-guide': {
    characters: ['traveler', 'ais', 'little-axe', 'heige', 'princess'],
    guides: [
      {
        href: '/sea/guides/team-building-guide',
        label: { zh: '看船队编组', en: 'Team building', ja: '船隊編成へ' },
        description: { zh: '把强度和阵容搭配连起来。', en: 'Connect tier strength with team building.', ja: '強度と編成をつなぐ。' },
      },
      {
        href: '/sea/guides/gacha-recruitment-guide',
        label: { zh: '看招募规划', en: 'Recruitment plan', ja: '招募計画へ' },
        description: { zh: '抽卡前先看资源和 6 选 1。', en: 'Check resources and the selector before pulling.', ja: '抽選前に資源と6択を確認。' },
      },
      {
        href: '/sea/guides/combat-system-guide',
        label: { zh: '看战斗系统', en: 'Combat system', ja: '戦闘システムへ' },
        description: { zh: '理解机制后再选角色。', en: 'Understand mechanics before choosing crews.', ja: '機構を理解してから選ぶ。' },
      },
    ],
  },
  'team-building-guide': {
    characters: ['traveler', 'ais', 'little-axe', 'princess'],
    guides: [
      {
        href: '/sea/guides/tier-list-guide',
        label: { zh: '看节奏榜', en: 'Tier list', ja: 'Tier表へ' },
        description: { zh: '阵容前先看强度。', en: 'Check strength before building.', ja: '編成前に強度を確認。' },
      },
      {
        href: '/sea/guides/gacha-recruitment-guide',
        label: { zh: '看招募规划', en: 'Recruitment plan', ja: '招募計画へ' },
        description: { zh: '把抽卡和队伍需求对上。', en: 'Align pulls with team needs.', ja: '抽選と編成需要を合わせる。' },
      },
      {
        href: '/sea/guides/combat-system-guide',
        label: { zh: '看战斗系统', en: 'Combat system', ja: '戦闘システムへ' },
        description: { zh: '理解机制后再抄作业。', en: 'Learn the mechanics before copying comps.', ja: '機構理解してから真似る。' },
      },
    ],
  },
  'gacha-recruitment-guide': {
    characters: ['traveler', 'ais', 'little-axe', 'heige', 'princess'],
    guides: [
      {
        href: '/sea/guides/launch-rewards-codes-guide',
        label: { zh: '看福利与兑换码', en: 'Rewards & codes', ja: '報酬とコードへ' },
        description: { zh: '先拿资源再决定怎么抽。', en: 'Secure resources before deciding pulls.', ja: '資源を確保してから抽選判断。' },
      },
      {
        href: '/sea/guides/tier-list-guide',
        label: { zh: '看节奏榜', en: 'Tier list', ja: 'Tier表へ' },
        description: { zh: '把抽卡目标和强度对齐。', en: 'Align targets with strength picks.', ja: '狙いと強度を揃える。' },
      },
      {
        href: '/sea/guides/team-building-guide',
        label: { zh: '看船队编组', en: 'Team building', ja: '船隊編成へ' },
        description: { zh: '看完抽卡再接阵容。', en: 'Move from recruitment into team building.', ja: '招募後に編成へ進む。' },
      },
    ],
  },
  'combat-system-guide': {
    characters: ['traveler', 'ais', 'little-axe'],
    guides: [
      {
        href: '/sea/guides/launch-boss-map-guide',
        label: { zh: '看公测海域与 BOSS', en: 'Boss map guide', ja: '海域とBOSSへ' },
        description: { zh: '把战斗机制用到实际 Boss 和海域。', en: 'Apply combat mechanics to actual bosses.', ja: '戦闘機構を実戦へ。' },
      },
      {
        href: '/sea/guides/team-building-guide',
        label: { zh: '看船队编组', en: 'Team building', ja: '船隊編成へ' },
        description: { zh: '理解机制后组队更顺。', en: 'Build teams more smoothly after mechanics.', ja: '機構理解後に編成しやすい。' },
      },
      {
        href: '/sea/guides/tier-list-guide',
        label: { zh: '看节奏榜', en: 'Tier list', ja: 'Tier表へ' },
        description: { zh: '把机制和强度连起来。', en: 'Link mechanics with power rankings.', ja: '機構と強度を結ぶ。' },
      },
    ],
  },
  'launch-boss-map-guide': {
    characters: ['traveler', 'ais', 'little-axe', 'heige'],
    guides: [
      {
        href: '/sea/guides/combat-system-guide',
        label: { zh: '看战斗系统', en: 'Combat system', ja: '戦闘システムへ' },
        description: { zh: '先理解机制再看 BOSS。', en: 'Understand mechanics before bosses.', ja: '機構を先に理解。' },
      },
      {
        href: '/sea/guides/launch-day-guide',
        label: { zh: '看开服攻略', en: 'Launch guide', ja: '開服攻略へ' },
        description: { zh: '海域和首日路线一起看。', en: 'Read sea routes alongside launch day flow.', ja: '海域と初日導線を一緒に。' },
      },
    ],
  },
  'payment-model-guide': {
    characters: ['princess', 'little-axe', 'heige'],
    guides: [
      {
        href: '/sea/guides/trade-market-guide',
        label: { zh: '看贸易场总览', en: 'Trade market guide', ja: '交易所総覧へ' },
        description: { zh: '继续看好金砖和玩家交易怎么运作。', en: 'Continue with how Good Gold Bricks and trading work.', ja: '好金砖と取引の仕組みを続けて確認。' },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '把付费逻辑落到首周赚钱路线。', en: 'Turn monetization theory into first-week earning routes.', ja: '課金設計を初週金策に落とし込む。' },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '继续看首月资源怎么分配。', en: 'Keep going with launch-month resource splitting.', ja: '初月の資源配分を続けて確認。' },
      },
    ],
  },
  'trade-market-guide': {
    characters: ['little-axe', 'heige', 'princess'],
    guides: [
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '从机制总览继续走到首周实操。', en: 'Move from system overview into first-week execution.', ja: '仕組みから初週実践へ進む。' },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '把交易所得和抽卡决策连起来。', en: 'Connect market gains to your pull decisions.', ja: '交易利益とガチャ判断をつなぐ。' },
      },
    ],
  },
  'good-gold-bricks-farming-guide': {
    characters: ['little-axe', 'princess', 'heige'],
    guides: [
      {
        href: '/sea/guides/trade-market-guide',
        label: { zh: '回看贸易场总览', en: 'Trade market guide', ja: '交易所総覧へ' },
        description: { zh: '先把总规则再对一遍。', en: 'Review the core rules again.', ja: '基本ルールを再確認する。' },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        label: { zh: '看角色还是服装', en: 'Character vs outfit pulls', ja: 'キャラか衣装かを見る' },
        description: { zh: '赚到资源后继续决定怎么花。', en: 'After earning resources, decide how to spend them.', ja: '稼いだ後の使い道を決める。' },
      },
    ],
  },
  'character-vs-outfit-pull-guide': {
    characters: ['little-axe', 'princess', 'molly'],
    guides: [
      {
        href: '/sea/guides/payment-model-guide',
        label: { zh: '回到付费模式', en: 'Payment model guide', ja: '課金モデルへ' },
        description: { zh: '重新确认保底、交易和付费边界。', en: 'Re-check pity, trading, and monetization boundaries.', ja: '保底・取引・課金境界を再確認。' },
      },
      {
        href: '/sea/guides/good-gold-bricks-farming-guide',
        label: { zh: '看好金砖速刷', en: 'Gold bricks guide', ja: '好金砖ガイドへ' },
        description: { zh: '如果决定先存，就继续看怎么赚。', en: 'If you decide to save first, continue with how to earn.', ja: '先に貯めるなら金策へ進む。' },
      },
    ],
  },
};

function SeaRelatedEntitiesSection({
  guide,
  locale,
  currentSlug,
}: {
  guide: SeaGuide;
  locale: SupportedLocale;
  currentSlug: string;
}) {
  const isDefined = <T,>(value: T | null | undefined): value is T => value != null;
  const preset = SEA_GUIDE_ENTITY_LINKS[guide.id] ?? {};

  const characterLinks = (preset.characters ?? [])
    .map((id) => {
      const character = getSeaCharacterById(id);
      if (!character) return null;
      return {
        href: `/sea/characters/${id}`,
        label: getSeaCharacterName(character, locale),
        description:
          locale === 'zh'
            ? '去角色详情页看定位、配装和技能。'
            : locale === 'ja'
              ? 'キャラ詳細で役割、ビルド、スキルを見る。'
              : 'Open the character page for roles, builds, and skills.',
      };
    })
    .filter(isDefined);

  const guideLinks = (preset.guides ?? [])
    .filter((item) => item.href !== `/sea/guides/${currentSlug}`);

  if (characterLinks.length === 0 && guideLinks.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-game-primary">
        {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '続けて見る' : 'Continue Exploring'}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {characterLinks.length > 0 && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">
              {locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}
            </h3>
            <div className="space-y-2">
              {characterLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as '/'}
                  className="block rounded-md border border-game-border bg-game-surface-alt px-3 py-2 transition-colors hover:border-game-primary"
                >
                  <div className="text-sm font-medium text-game-text">{link.label}</div>
                  <div className="mt-1 text-xs text-game-text-muted">{link.description}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {guideLinks.length > 0 && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">
              {locale === 'zh' ? '下一步阅读' : locale === 'ja' ? '次に読む' : 'Next Reads'}
            </h3>
            <div className="space-y-2">
              {guideLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as '/'}
                  className="block rounded-md border border-game-border bg-game-surface-alt px-3 py-2 transition-colors hover:border-game-primary"
                >
                  <div className="text-sm font-medium text-game-text">{link.label[locale]}</div>
                  <div className="mt-1 text-xs text-game-text-muted">{link.description[locale]}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getGuidesForGame(gameId: string): GuideLike[] {
  switch (gameId) {
    case 'genshin': return genshinGuides;
    case 'starrail': return starrailGuides;
    case 'wuwa': return wuwaGuides;
    case 'nte': return nteGuides;
    case 'zzz': return zzzGuides;
    case 'guihuan': return guihuanGuides;
    case 'ananta': return anantaGuides;
    case 'endfield': return endfieldGuides;
    case 'sea': return seaGuides;
    case 'skjh': return skjhGuides;
    default: return [];
  }
}

function getGuideTitleForGame(gameId: string, guide: GuideLike, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinGuideTitle(guide as unknown as Parameters<typeof getGenshinGuideTitle>[0], locale);
    case 'starrail': return getStarRailGuideTitle(guide as unknown as Parameters<typeof getStarRailGuideTitle>[0], locale);
    case 'wuwa': return getWuWaGuideTitle(guide as unknown as Parameters<typeof getWuWaGuideTitle>[0], locale);
    case 'nte': return getNteGuideTitle(guide as unknown as Parameters<typeof getNteGuideTitle>[0], locale);
    case 'zzz': return getZzzGuideTitle(guide as unknown as Parameters<typeof getZzzGuideTitle>[0], locale);
    case 'guihuan': return getGuihuanGuideTitle(guide as unknown as Parameters<typeof getGuihuanGuideTitle>[0], locale);
    case 'ananta': return getAnantaGuideTitle(guide as unknown as Parameters<typeof getAnantaGuideTitle>[0], locale);
    case 'endfield': return getEndfieldGuideTitle(guide as unknown as Parameters<typeof getEndfieldGuideTitle>[0], locale);
    case 'sea': return getSeaGuideTitle(guide as unknown as Parameters<typeof getSeaGuideTitle>[0], locale);
    case 'skjh': return getSkjhGuideTitle(guide as unknown as Parameters<typeof getSkjhGuideTitle>[0], locale);
    default: return guide.id;
  }
}

function getGuideSummaryForGame(gameId: string, guide: GuideLike, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinGuideSummary(guide as unknown as Parameters<typeof getGenshinGuideSummary>[0], locale);
    case 'starrail': return getStarRailGuideSummary(guide as unknown as Parameters<typeof getStarRailGuideSummary>[0], locale);
    case 'wuwa': return getWuWaGuideSummary(guide as unknown as Parameters<typeof getWuWaGuideSummary>[0], locale);
    case 'nte': return getNteGuideSummary(guide as unknown as Parameters<typeof getNteGuideSummary>[0], locale);
    case 'zzz': return getZzzGuideSummary(guide as unknown as Parameters<typeof getZzzGuideSummary>[0], locale);
    case 'guihuan': return getGuihuanGuideSummary(guide as unknown as Parameters<typeof getGuihuanGuideSummary>[0], locale);
    case 'ananta': return getAnantaGuideSummary(guide as unknown as Parameters<typeof getAnantaGuideSummary>[0], locale);
    case 'endfield': return getEndfieldGuideSummary(guide as unknown as Parameters<typeof getEndfieldGuideSummary>[0], locale);
    case 'sea': return getSeaGuideSummary(guide as unknown as Parameters<typeof getSeaGuideSummary>[0], locale);
    case 'skjh': return getSkjhGuideSummary(guide as unknown as Parameters<typeof getSkjhGuideSummary>[0], locale);
    default: return '';
  }
}
