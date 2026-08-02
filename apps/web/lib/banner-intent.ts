import type { GameId, SupportedLocale } from '@gachia/core';

export type BannerIntentPanelConfig = {
  title: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  checks: Record<SupportedLocale, string[]>;
  links: Array<{
    href: string;
    label: Record<SupportedLocale, string>;
    description: Record<SupportedLocale, string>;
  }>;
};

export const BANNER_INTENT_PANELS: Partial<Record<GameId, BannerIntentPanelConfig>> = {
  genshin: {
    title: {
      zh: '抽卡前先做 4 件事',
      en: 'Before You Pull: 4 Fast Checks',
      ja: '引く前の4つの確認',
    },
    summary: {
      zh: '这页优先解决 current banner、next banner、rerun 和 Primogem planning 搜索意图。先看卡池，再看资源和角色缺口。',
      en: 'This page is built for current banner, next banner, rerun, and Primogem planning intent. Check banners first, then budget and roster gaps.',
      ja: '現在バナー、次回、復刻、原石計画の検索意図に対応します。先にバナー、次に資源と編成不足を確認します。',
    },
    checks: {
      zh: ['当前 UP 是否补队伍缺口', '下期/复刻是否更值得留保底', '原石是否覆盖至少一次完整保底', '兑换码和版本活动是否已经领取'],
      en: ['Does the current featured unit solve a roster gap?', 'Is the next or rerun banner a better guarantee target?', 'Can your Primogems cover at least one full guarantee?', 'Have you claimed codes and current version rewards?'],
      ja: ['現在UPが編成不足を補うか', '次回や復刻に天井を残すべきか', '原石が一回分の保証に足りるか', 'コードと版本報酬を回収したか'],
    },
    links: [
      {
        href: '/genshin/version',
        label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' },
        description: { zh: '确认当前版本、下期信息和活动资源。', en: 'Check current patch, next-version notes, and event income.', ja: '現在版本、次回情報、イベント報酬を確認。' },
      },
      {
        href: '/genshin/redeem-codes',
        label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' },
        description: { zh: '抽卡前先补可领原石。', en: 'Claim available Primogems before planning pulls.', ja: '引く前に使える原石を回収。' },
      },
      {
        href: '/genshin/build',
        label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: { zh: '抽到角色后继续看武器、圣遗物和队伍。', en: 'After pulling, continue into weapons, artifacts, and teams.', ja: '引いた後に武器、聖遺物、編成へ。' },
      },
    ],
  },
  starrail: {
    title: {
      zh: '跃迁前先看保底、星琼和定位',
      en: 'Before You Warp: Pity, Jades, and Role Gaps',
      ja: '跳躍前に天井、星玉、役割不足を確認',
    },
    summary: {
      zh: '这页优先承接 HSR banner schedule、current banner、next banner 和 rerun 搜索。先把卡池和星琼预算放到同一张决策表里。',
      en: 'This page targets HSR banner schedule, current banner, next banner, and rerun searches. Put banner timing and Stellar Jade budget in one decision flow.',
      ja: 'HSR banner schedule、現在、次回、復刻検索に対応します。バナー時期と星玉予算を同じ流れで確認します。',
    },
    checks: {
      zh: ['当前跃迁是否是队伍刚需', '是否已经大保底或接近软保底', '星琼能否覆盖当前和下期目标', '光锥是否真的比新角色优先'],
      en: ['Is the current warp account-critical?', 'Are you guaranteed or near soft pity?', 'Can your Jades cover both current and next targets?', 'Is the light cone actually more valuable than a new character?'],
      ja: ['現在跳躍が必須級か', '保証中または軟天井に近いか', '星玉が現在と次回目標を覆えるか', '光円錐が新キャラより優先か'],
    },
    links: [
      {
        href: '/starrail/version',
        label: { zh: '4.4 专题', en: 'Version hub', ja: 'バージョン特集' },
        description: { zh: '看当前版本、联动和卡池上下文。', en: 'Check current version, collab context, and patch priorities.', ja: '現在版本、コラボ、優先度を確認。' },
      },
      {
        href: '/starrail/redeem-codes',
        label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' },
        description: { zh: '先领取星琼和版本奖励。', en: 'Claim Stellar Jade and version rewards first.', ja: '星玉と版本報酬を先に回収。' },
      },
      {
        href: '/starrail/build',
        label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: { zh: '抽到后继续看遗器、光锥和配队。', en: 'After pulling, continue into relics, light cones, and teams.', ja: '引いた後に遺物、光円錐、編成へ。' },
      },
    ],
  },
  wuwa: {
    title: {
      zh: '调频前先拆开角色池、武器池和星声',
      en: 'Before You Convene: Character, Weapon, and Astrite Checks',
      ja: '調律前にキャラ、武器、星声を分けて確認',
    },
    summary: {
      zh: '这页优先承接 wuwa banners、wuwa banner schedule、current banner 和 next banner 搜索。角色池和武器池价值不同，要分开规划。',
      en: 'This page targets wuwa banners, wuwa banner schedule, current banner, and next banner searches. Character and weapon banners need separate planning.',
      ja: 'wuwa banners、現在、次回検索に対応します。キャラと武器は別々に計画します。',
    },
    checks: {
      zh: ['当前角色是否补主 C、辅助或队伍循环', '下期/复刻是否更适合你的账号', '星声是否覆盖角色池和武器池风险', '抽前是否领完兑换码和版本奖励'],
      en: ['Does the current character fix DPS, support, or rotation needs?', 'Is the next or rerun banner better for your account?', 'Does your Astrite budget cover character and weapon risk separately?', 'Have you claimed codes and version rewards before pulling?'],
      ja: ['現在キャラが主力、支援、ローテ不足を補うか', '次回や復刻がアカウントに合うか', '星声がキャラと武器のリスクを別々に覆えるか', 'コードと版本報酬を回収したか'],
    },
    links: [
      {
        href: '/wuwa/version',
        label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' },
        description: { zh: '确认当前版本、活动和后续节奏。', en: 'Check current patch, events, and upcoming timing.', ja: '現在版本、イベント、次回流れを確認。' },
      },
      {
        href: '/wuwa/redeem-codes',
        label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' },
        description: { zh: '先补星声和福利，再算抽数。', en: 'Claim Astrite and rewards before counting pulls.', ja: '星声と報酬を先に回収。' },
      },
      {
        href: '/wuwa/build',
        label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: { zh: '抽到后继续看声骸、武器和配队。', en: 'After pulling, continue into Echoes, weapons, and teams.', ja: '引いた後に音骸、武器、編成へ。' },
      },
    ],
  },
  zzz: {
    title: {
      zh: '调频前先看代理人、音擎和菲林',
      en: 'Before You Search: Agents, W-Engines, and Polychromes',
      ja: '調律前に代理人、音擎、菲林を確認',
    },
    summary: {
      zh: '这页优先承接 ZZZ banner schedule、current banner、next banner 和 rerun 搜索。先确认专属频道，再把音擎和菲林风险分开规划。',
      en: 'This page targets ZZZ banner schedule, current banner, next banner, and rerun searches. Check the Exclusive Channel first, then plan W-Engine and Polychrome risk separately.',
      ja: 'ZZZ banner schedule、現在、次回、復刻検索に対応します。先に専属チャンネルを確認し、音擎と菲林リスクを分けて計画します。',
    },
    checks: {
      zh: ['当前代理人是否补击破、输出或异常队缺口', '下期/复刻是否更适合保底', '菲林是否覆盖专属频道和音擎频道风险', '抽前是否领完兑换码、周年和版本奖励'],
      en: ['Does the current agent fix Stun, DPS, or Anomaly team gaps?', 'Is the next or rerun banner a better guarantee target?', 'Does your Polychrome budget cover agent and W-Engine risk separately?', 'Have you claimed codes, anniversary rewards, and patch rewards?'],
      ja: ['現在代理人がブレイク、火力、異常編成不足を補うか', '次回や復刻が保証先として良いか', '菲林が代理人と音擎リスクを別々に覆えるか', 'コード、周年、版本報酬を回収したか'],
    },
    links: [
      {
        href: '/zzz/version',
        label: { zh: '版本专题', en: 'Version hub', ja: 'バージョン特集' },
        description: { zh: '确认当前版本、周年节点和新代理人。', en: 'Check current patch, anniversary timing, and new agents.', ja: '現在版本、周年時期、新代理人を確認。' },
      },
      {
        href: '/zzz/redeem-codes',
        label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' },
        description: { zh: '抽卡前先补菲林和版本奖励。', en: 'Claim Polychromes and patch rewards before pulling.', ja: '引く前に菲林と版本報酬を回収。' },
      },
      {
        href: '/zzz/build',
        label: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' },
        description: { zh: '抽到后继续看驱动盘、音擎和队伍。', en: 'After pulling, continue into Drive Discs, W-Engines, and teams.', ja: '引いた後にドライブ、音擎、編成へ。' },
      },
    ],
  },
};
