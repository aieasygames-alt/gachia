'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { GAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import dynamic from 'next/dynamic';
import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

const GenshinTeams = dynamic(() => import('./genshin-teams-client').then((mod) => mod.GenshinTeams), { loading: () => <TeamsLoading /> });
const StarRailTeams = dynamic(() => import('./starrail-teams-client').then((mod) => mod.StarRailTeams), { loading: () => <TeamsLoading /> });
const WuWaTeams = dynamic(() => import('./wuwa-teams-client').then((mod) => mod.WuWaTeams), { loading: () => <TeamsLoading /> });
const NteTeams = dynamic(() => import('./nte-teams-client').then((mod) => mod.NteTeams), { loading: () => <TeamsLoading /> });
const ZzzTeams = dynamic(() => import('./zzz-teams-client').then((mod) => mod.ZzzTeams), { loading: () => <TeamsLoading /> });
const GuihuanTeams = dynamic(() => import('./guihuan-teams-client').then((mod) => mod.GuihuanTeams), { loading: () => <TeamsLoading /> });
const EndfieldTeams = dynamic(() => import('./endfield-teams-client').then((mod) => mod.EndfieldTeams), { loading: () => <TeamsLoading /> });

function TeamsLoading() {
  return <div className="rounded-lg border border-game-border bg-game-surface p-8 text-center text-sm text-game-text-muted">Loading teams...</div>;
}



// --- Constants ---

const GENSHIN_ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'dendro', 'anemo', 'geo'] as const;
const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};
const GENSHIN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  pyro: { zh: '火', en: 'Pyro', ja: '炎' }, hydro: { zh: '水', en: 'Hydro', ja: '水' },
  electro: { zh: '雷', en: 'Electro', ja: '雷' }, cryo: { zh: '冰', en: 'Cryo', ja: '氷' },
  dendro: { zh: '草', en: 'Dendro', ja: '草' }, anemo: { zh: '风', en: 'Anemo', ja: '風' },
  geo: { zh: '岩', en: 'Geo', ja: '岩' },
};

// Element resonance data
const ELEMENT_RESONANCES: Record<string, { name: Record<string, string>; description: Record<string, string>; icon: string }> = {
  pyro2: {
    name: { zh: '热诚之火', en: 'Fervent Flames', ja: '熱誠の炎' },
    description: { zh: '冰元素附着的持续时间下降40%。攻击力提高25%。', en: 'Affected by Cryo for 40% less time. ATK increased by 25%.', ja: '氷元素付着時間-40%。攻撃力+25%。' },
    icon: '🔥',
  },
  hydro2: {
    name: { zh: '愈疗之水', en: 'Soothing Water', ja: '癒しの水' },
    description: { zh: '火元素附着的持续时间下降40%。受治疗加成提高20%。', en: 'Affected by Pyro for 40% less time. Incoming Healing Bonus increased by 20%.', ja: '炎元素付着時間-40%。受ける治療効果+20%。' },
    icon: '💧',
  },
  cryo2: {
    name: { zh: '粉碎之冰', en: 'Shattering Ice', ja: '砕氷' },
    description: { zh: '雷元素附着的持续时间下降40%。攻击附着冰元素或冻结状态下的敌人时，暴击率提高15%。', en: 'Affected by Electro for 40% less time. CRIT Rate against opponents Frozen or affected by Cryo increased by 15%.', ja: '雷元素付着時間-40%。氷元素付着/凍結状態の敵への会心率+15%。' },
    icon: '❄️',
  },
  electro2: {
    name: { zh: '激能之雷', en: 'High Voltage', ja: '高電圧' },
    description: { zh: '水元素附着的持续时间下降40%。超激蔓、超绽放、感电反应时，额外产生一个元素微粒。', en: 'Affected by Hydro for 40% less time. Superconduct, Hyperbloom, Electro-Charged generate 1 Elemental Particle.', ja: '水元素付着時間-40%。超伝導・ハイパーブルーム・感電反応時に元素粒子を1個追加生成。' },
    icon: '⚡',
  },
  anemo2: {
    name: { zh: '迅捷之风', en: 'Impetuous Winds', ja: '疾風' },
    description: { zh: '体力消耗降低15%。移动速度提升10%。技能冷却缩短5%。', en: 'Stamina Consumption decreased 15%. Movement SPD increased 10%. Skill CD decreased 5%.', ja: 'スタミナ消費-15%。移動速度+10%。スキルクールダウン-5%。' },
    icon: '🌪️',
  },
  geo2: {
    name: { zh: '坚定之岩', en: 'Enduring Rock', ja: '堅岩' },
    description: { zh: '护盾强效提升15%。角色处于护盾庇护下时，造成的伤害提升15%。', en: 'Shield Strength +15%. DMG dealt while protected by a shield increased by 15%.', ja: 'シールド強化+15%。シールド保護下での与ダメージ+15%。' },
    icon: '🪨',
  },
  dendro2: {
    name: { zh: '蔓生之草', en: 'Sprawling Greenery', ja: '蔓草' },
    description: { zh: '元素精通提升50。触发燃烧、绽放、超绽放反应后，队伍中附近的所有角色元素精通提升30，持续6秒。', en: 'Elemental Mastery +50. After triggering Burning, Bloom, Hyperbloom, nearby party members EM +30 for 6s.', ja: '元素熟知+50。燃焼・開花・ハイパーブルーム反応後、周囲のパーティメンバーの元素熟知+30（6秒間）。' },
    icon: '🌿',
  },
  quad: {
    name: { zh: '交错之护', en: 'Protective Canopy', ja: '交錯の護り' },
    description: { zh: '所有元素抗性提升15%，物理抗性提升15%。', en: 'All Elemental RES +15%, Physical RES +15%.', ja: '全元素耐性+15%、物理耐性+15%。' },
    icon: '🌈',
  },
};

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

function getTeamNextSteps(gameId: string, locale: SupportedLocale): NextStepLink[] {
  const titles = {
    characters: { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' },
    build: { zh: '看配装推荐', en: 'Open Build Recommender', ja: 'ビルドを見る' },
    guides: { zh: '看攻略专题', en: 'Open Guides', ja: '攻略を見る' },
  } as const;

  const descriptions = {
    characters: {
      zh: '先确认角色定位和技能，再回来搭队会更顺手。',
      en: 'Review roles and skills first, then come back and build teams faster.',
      ja: 'まず役割とスキルを確認すると編成しやすくなります。',
    },
    build: {
      zh: '如果你已经有主 C 或主坦，直接看配装会更快。',
      en: 'If your main carry or tank is already chosen, jump straight to builds.',
      ja: '主力が決まっているなら、ビルドから入るのが早いです。',
    },
    guides: {
      zh: '想看更完整的养成、站位和版本思路，可以继续往攻略页走。',
      en: 'For deeper setup, positioning, and patch notes, head to the guides hub.',
      ja: '育成、配置、更新方針まで見たいなら攻略ページへどうぞ。',
    },
  } as const;

  return [
    {
      href: `/${gameId}/characters`,
      title: titles.characters,
      description: descriptions.characters,
    },
    {
      href: `/${gameId}/build`,
      title: titles.build,
      description: descriptions.build,
    },
    {
      href: `/${gameId}/guides`,
      title: titles.guides,
      description: descriptions.guides,
    },
  ];
}

function withNextSteps(content: ReactNode, locale: SupportedLocale, links: NextStepLink[]) {
  return (
    <>
      {content}
      <NextStepStrip locale={locale} links={links} />
    </>
  );
}

// --- Resonance calculator ---

function getResonances(team: ({ element: string } | null)[]) {
  const elements = team.filter(Boolean).map((c) => c!.element);
  const counts: Record<string, number> = {};
  for (const el of elements) counts[el] = (counts[el] || 0) + 1;

  const resKeys: string[] = [];
  const uniqueElements = new Set(elements);

  if (uniqueElements.size >= 4) {
    resKeys.push('quad');
  } else {
    for (const el of Object.keys(counts)) {
      if (counts[el]! >= 2) resKeys.push(`${el}2`);
    }
  }

  return resKeys;
}

// =====================================================================
// Client Component
// =====================================================================

export function TeamsClient({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  if (gameId === 'skjh') return withNextSteps(<SkjhSquadSimulator locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'genshin') return withNextSteps(<GenshinTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'starrail') return withNextSteps(<StarRailTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'wuwa') return withNextSteps(<WuWaTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'nte') return withNextSteps(<NteTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'zzz') return withNextSteps(<ZzzTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'guihuan') return withNextSteps(<GuihuanTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  if (gameId === 'endfield') return withNextSteps(<EndfieldTeams locale={locale} />, locale, getTeamNextSteps(gameId, locale));
  return <ComingSoon locale={locale} />;
}



// =====================================================================
// Ashfall Evolution Squad Role Simulator
// =====================================================================

type SquadSize = 'solo' | 'duo' | 'trio' | 'squad';

const SKJH_ROLES: Record<SquadSize, Array<{ role: string; roleEn: string; focus: string; focusEn: string; firstDay: string; firstDayEn: string }>> = {
  solo: [
    { role: '独狼全能位', roleEn: 'Solo Generalist', focus: '低曝光建家、短路线、分仓储物、保命撤离', focusEn: 'Low-profile base, short routes, split storage, escape planning', firstDay: '睡袋、领地柜、石质核心、猎弓和一条稳定废料路线', firstDayEn: 'Sleeping bag, territory cabinet, stone core, bow, and one scrap loop' },
  ],
  duo: [
    { role: '建筑/后勤位', roleEn: 'Builder / Logistics', focus: '房型、维护、储物、水源、补给', focusEn: 'Base layout, upkeep, storage, water, supplies', firstDay: '石质核心区、双门缓冲、维护资源和小仓库', firstDayEn: 'Stone core, airlocks, upkeep materials, and storage' },
    { role: '资源/战斗位', roleEn: 'Runner / Fighter', focus: '废料路线、护送、侦查、基础枪械', focusEn: 'Scrap loop, escorting, scouting, basic weapons', firstDay: '低级据点循环、猎弓或冲锋枪路线、周边敌情记录', firstDayEn: 'Low-tier POI loop, bow or SMG path, nearby enemy notes' },
  ],
  trio: [
    { role: '建筑位', roleEn: 'Builder', focus: '房型、防御、维护、反抄家通道', focusEn: 'Layout, defense, upkeep, anti-raid paths', firstDay: '完成石质核心和第二层门', firstDayEn: 'Finish stone core and second door layer' },
    { role: '资源位', roleEn: 'Resource Runner', focus: '木石矿、废料、食物水源、熔炼', focusEn: 'Wood, stone, scrap, food, water, smelting', firstDay: '建立两条资源路线并分批回家', firstDayEn: 'Set up two routes and bank loot often' },
    { role: '战斗/侦查位', roleEn: 'Fighter / Scout', focus: '护送、报点、据点入口观察、守家', focusEn: 'Escorts, callouts, POI watch, base defense', firstDay: '记录邻居、撤离路线和高危门口', firstDayEn: 'Track neighbors, exits, and high-risk entrances' },
  ],
  squad: [
    { role: '建筑指挥', roleEn: 'Build Lead', focus: '主基地、外墙、诱导通道、电力规划', focusEn: 'Main base, outer walls, funnels, electricity', firstDay: '确定主基地和备用点', firstDayEn: 'Choose main base and fallback spot' },
    { role: '资源队', roleEn: 'Resource Team', focus: '分组跑木石矿、废料和组件', focusEn: 'Wood, stone, scrap, components in pairs', firstDay: '建立安全回收节奏', firstDayEn: 'Create safe banking rhythm' },
    { role: '战斗队', roleEn: 'Combat Team', focus: '护送、抢点、守家、反打', focusEn: 'Escort, contest, defend, counter-push', firstDay: '保护资源队和关键门口', firstDayEn: 'Protect runners and key doors' },
    { role: '侦查/外交', roleEn: 'Scout / Diplomacy', focus: '邻居识别、路线预警、临时联盟、冲突规避', focusEn: 'Neighbor tracking, route warnings, temporary alliances, conflict avoidance', firstDay: '绘制周边势力和撤离路线', firstDayEn: 'Map nearby groups and escape routes' },
  ],
};
function SkjhSquadSimulator({ locale }: { locale: SupportedLocale }) {
  const [size, setSize] = useState<SquadSize>('trio');
  const [goal, setGoal] = useState<'safe' | 'standard' | 'challenge'>('standard');
  const roles = SKJH_ROLES[size];
  const gameConfig = GAMES.skjh;
  const riskText = {
    safe: t(locale, '安全区优先学习系统，资源收益较稳，战斗位可减少，后勤和路线记忆更重要。', 'Safe-zone play prioritizes learning systems and stable income. Reduce combat pressure and focus on logistics and routes.', '安全区ではシステム理解と安定収入を優先します。'),
    standard: t(locale, '标准模式需要兼顾发育与守家，建议至少保留一名能随时回防的成员。', 'Standard mode balances growth and defense. Keep at least one player ready to return and defend.', '標準モードでは成長と守家の両立が重要です。'),
    challenge: t(locale, '挑战模式容错低，必须固定报点词、撤离路线和资源回存节奏。', 'Challenge mode has low tolerance. Standardize callouts, exits, and banking rhythm.', '挑戦モードはミスの許容度が低く、報告と撤退ルートが重要です。'),
  }[goal];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '小队分工模拟器', 'Squad Role Simulator', 'チーム役割シミュレーター')}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, '按人数和服务器目标分配建筑位、资源位、侦查位、战斗位和后勤位。', 'Assign builder, runner, scout, fighter, and logistics roles by squad size and server goal.', '人数と目標に応じて役割を割り当てます。')}
      </p>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-game-border bg-game-surface p-3">
          <div className="mb-2 text-xs font-medium text-game-text-muted">{t(locale, '队伍人数', 'Squad Size', '人数')}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['solo', t(locale, '独狼', 'Solo', 'ソロ')],
              ['duo', t(locale, '双人队', 'Duo', 'デュオ')],
              ['trio', t(locale, '三人队', 'Trio', 'トリオ')],
              ['squad', t(locale, '四人以上', '4+', '4人以上')],
            ] as Array<[SquadSize, string]>).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSize(id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${size === id ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3">
          <div className="mb-2 text-xs font-medium text-game-text-muted">{t(locale, '服务器目标', 'Server Goal', 'サーバー目標')}</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['safe', t(locale, '安全区', 'Safe', '安全区')],
              ['standard', t(locale, '标准', 'Standard', '標準')],
              ['challenge', t(locale, '挑战', 'Challenge', '挑戦')],
            ] as Array<['safe' | 'standard' | 'challenge', string]>).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setGoal(id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${goal === id ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-game-text">{t(locale, '策略提示', 'Strategy Note', '戦略メモ')}</h2>
        <p className="text-sm leading-relaxed text-game-text-muted">{riskText}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <div key={role.role} className="rounded-lg border border-game-border bg-game-surface p-4">
            <h3 className="mb-2 text-lg font-semibold text-game-primary">{locale === 'zh' ? role.role : role.roleEn}</h3>
            <div className="mb-3 rounded bg-game-surface-alt p-3">
              <div className="mb-1 text-xs text-game-text-muted">{t(locale, '职责重点', 'Focus', '重点')}</div>
              <p className="text-sm text-game-text">{locale === 'zh' ? role.focus : role.focusEn}</p>
            </div>
            <div className="rounded bg-game-surface-alt p-3">
              <div className="mb-1 text-xs text-game-text-muted">{t(locale, '首日目标', 'Day-One Goal', '初日目標')}</div>
              <p className="text-sm text-game-text">{locale === 'zh' ? role.firstDay : role.firstDayEn}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-game-text-muted">{t(locale, '敬请期待', 'Coming Soon', 'Coming Soon')}</h2>
        <p className="text-sm text-game-text-muted">{t(locale, '该游戏的配队功能正在开发中', 'Team builder for this game is under development', 'このゲームのパーティ機能は開発中です')}</p>
      </div>
    </div>
  );
}
