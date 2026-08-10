'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { GAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';
import {
  genshinCharacters,
  getGenshinCharacterName,
  getGenshinCharacterImage,
} from '@gachia/data/games/genshin/characters';
import type { GenshinCharacter } from '@gachia/data/games/genshin/types';
import {
  starrailCharacters,
  getStarRailCharacterName,
  getStarRailCharacterImage,
} from '@gachia/data/games/starrail/characters';
import type { StarRailCharacter } from '@gachia/data/games/starrail/types';
import {
  wuwaCharacters,
  getWuWaCharacterName,
  getWuWaCharacterImage,
} from '@gachia/data/games/wuwa/characters';
import type { WuWaCharacter } from '@gachia/data/games/wuwa/types';
import {
  nteCharacters,
  getNteCharacterName,
  getNteCharacterImage,
} from '@gachia/data/games/nte/characters';
import type { NteCharacter } from '@gachia/data/games/nte/types';
import {
  zzzCharacters,
  getZzzCharacterName,
  getZzzCharacterImage,
  getZzzCharacterById,
} from '@gachia/data/games/zzz/characters';
import type { ZzzCharacter } from '@gachia/data/games/zzz/types';
import {
  guihuanCharacters,
  getGuihuanCharacterName,
  getGuihuanCharacterImage,
} from '@gachia/data/games/guihuan/characters';
import type { GuihuanCharacter } from '@gachia/data/games/guihuan/types';
import {
  endfieldCharacters,
  getEndfieldCharacterName,
  getEndfieldCharacterImage,
  getEndfieldCharacterById,
} from '@gachia/data/games/endfield/characters';
import type { EndfieldCharacter } from '@gachia/data/games/endfield/types';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

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

function getTeamNextSteps(gameId: GameId, locale: SupportedLocale): NextStepLink[] {
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

function getResonances(team: (GenshinCharacter | null)[]) {
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

// =====================================================================
// Genshin Team Builder
// =====================================================================

function GenshinTeams({ locale }: { locale: SupportedLocale }) {
  const [team, setTeam] = useState<(GenshinCharacter | null)[]>([null, null, null, null]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [tab, setTab] = useState<'builder' | 'recommended'>('builder');
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'copied' | 'error'>('idle');

  const filtered = useMemo(() => {
    let chars = genshinCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const resKeys = useMemo(() => getResonances(team), [team]);
  const activeChars = team.filter(Boolean) as GenshinCharacter[];

  const gameConfig = GAMES.genshin;

  function selectChar(char: GenshinCharacter) {
    if (editingSlot === null) return;
    const newTeam = [...team];
    // Remove char from other slot if already in team
    const existingIdx = newTeam.findIndex((c) => c?.id === char.id);
    if (existingIdx !== -1) newTeam[existingIdx] = null;
    newTeam[editingSlot] = char;
    setTeam(newTeam);
    setEditingSlot(null);
    setSearch('');
    setFilterElement('all');
  }

  function removeFromSlot(idx: number) {
    const newTeam = [...team];
    newTeam[idx] = null;
    setTeam(newTeam);
  }

  // Gather recommended teams from all characters in the current team
  const recommendedTeams = useMemo(() => {
    if (activeChars.length === 0) {
      // Show popular teams from top characters
      const topChars = genshinCharacters.filter((c) => c.tierRank === 'SS' || c.tierRank === 'S').slice(0, 8);
      const teams: { name: string; nameEn: string; members: string[]; description: string; descriptionEn: string; sourceChar: string }[] = [];
      const seen = new Set<string>();
      for (const char of topChars) {
        for (const comp of char.teamComps.slice(0, 2)) {
          const key = comp.members.sort().join(',');
          if (!seen.has(key)) {
            seen.add(key);
            teams.push({ ...comp, sourceChar: char.nameEn });
          }
        }
      }
      return teams;
    }

    // Show teams that include any selected character
    const teams: { name: string; nameEn: string; members: string[]; description: string; descriptionEn: string; sourceChar: string; overlap: number }[] = [];
    const seen = new Set<string>();
    const activeIds = new Set(activeChars.map((c) => c.id));

    for (const char of activeChars) {
      for (const comp of char.teamComps) {
        const key = comp.members.sort().join(',');
        if (!seen.has(key)) {
          seen.add(key);
          // Calculate overlap
          const overlap = comp.members.filter((m) => {
            const mc = genshinCharacters.find((c) => c.id === m || c.name === m || c.nameEn === m);
            return mc && activeIds.has(mc.id);
          }).length;
          teams.push({ ...comp, sourceChar: char.nameEn, overlap });
        }
      }
    }

    // Sort by overlap (teams matching more selected chars first)
    teams.sort((a, b) => b.overlap - a.overlap);
    return teams;
  }, [activeChars]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配队模拟器', 'Team Builder', 'パーティ編成')}
      </h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-1">
        <button onClick={() => setTab('builder')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'builder' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
          {t(locale, '自由组队', 'Custom Team', 'フリー編成')}
        </button>
        <button onClick={() => setTab('recommended')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'recommended' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
          {t(locale, '推荐阵容', 'Recommended', 'おすすめ')}
        </button>
      </div>

      {tab === 'builder' ? (
        <>
          {/* Team Slots */}
          <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '队伍成员', 'Team Members', 'パーティメンバー')}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {team.map((char, idx) => (
                <div key={idx} className="relative">
                  {char ? (
                    <div className={`group relative flex flex-col items-center rounded-xl border p-3 transition-all ${
                      editingSlot === idx ? 'border-game-primary ring-2 ring-game-primary/30 bg-game-primary/5' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'
                    }`}>
                      <CharacterAvatar src={getGenshinCharacterImage(char)} alt={char.nameEn} element={char.element}
                        className="h-14 w-14 rounded-xl object-cover ring-2 ring-game-primary/30" />
                      <span className="mt-2 text-xs font-medium text-game-text text-center">{getGenshinCharacterName(char, locale)}</span>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[char.element] }}>
                          {GENSHIN_ELEMENT_NAMES[char.element]?.[locale] ?? char.element}
                        </span>
                        <span className="text-[10px] text-yellow-500">{char.rarity}★</span>
                      </div>
                      {/* Actions */}
                      <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingSlot(editingSlot === idx ? null : idx)}
                          className="rounded-full bg-game-primary p-1 text-white hover:bg-game-primary/80" title={t(locale, '更换', 'Change', '変更')}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => removeFromSlot(idx)}
                          className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600" title={t(locale, '移除', 'Remove', '削除')}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setEditingSlot(editingSlot === idx ? null : idx)}
                      className={`flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-all ${
                        editingSlot === idx ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary/50'
                      }`}>
                      <span className="text-2xl">+</span>
                      <span className="mt-1 text-[10px]">{t(locale, '选择角色', 'Select', '選択')}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Element Resonances */}
          {resKeys.length > 0 && (
            <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {t(locale, '元素共鸣', 'Elemental Resonance', '元素共鳴')}
              </h3>
              <div className="space-y-2">
                {resKeys.map((key) => {
                  const resonance = ELEMENT_RESONANCES[key];
                  if (!resonance) return null;
                  return (
                    <div key={key} className="flex items-start gap-3 rounded-lg bg-game-surface-alt p-3">
                      <span className="text-lg">{resonance.icon}</span>
                      <div>
                        <div className="text-xs font-medium text-game-text">{resonance.name[locale] ?? resonance.name.en}</div>
                        <p className="text-[11px] text-game-text-muted leading-relaxed">{resonance.description[locale] ?? resonance.description.en}</p>
                      </div>
                    </div>
                  );
                })}
                {resKeys.length === 0 && activeChars.length >= 2 && (
                  <p className="text-xs text-game-text-muted">{t(locale, '暂无共鸣效果（需要至少两个相同元素）', 'No resonance (need 2 of same element)', '共鳴なし（同じ元素が2体必要）')}</p>
                )}
              </div>
            </div>
          )}

          {/* Share Team */}
          {activeChars.length > 0 && (
            <div className="mb-6">
              <button
                onClick={async () => {
                  setShareStatus('sharing');
                  try {
                    const buildData = JSON.stringify({ type: 'team', characters: activeChars.map((c) => c.id) });
                    const res = await fetch('/api/shared-builds', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ gameId: 'genshin', characterId: activeChars[0]!.id, buildData }),
                    });
                    if (!res.ok) throw new Error();
                    const { id } = (await res.json()) as { id: string };
                    const url = `${window.location.origin}/${locale}/genshin/teams?share=${id}`;
                    await navigator.clipboard.writeText(url);
                    setShareStatus('copied');
                    setTimeout(() => setShareStatus('idle'), 2000);
                  } catch {
                    setShareStatus('error');
                    setTimeout(() => setShareStatus('idle'), 2000);
                  }
                }}
                disabled={shareStatus === 'sharing'}
                className="rounded-lg bg-game-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-game-primary/80 disabled:opacity-50"
              >
                {shareStatus === 'copied'
                  ? t(locale, '已复制！', 'Copied!', 'コピー済み！')
                  : shareStatus === 'error'
                  ? t(locale, '分享失败', 'Failed', '失敗')
                  : shareStatus === 'sharing'
                  ? '...'
                  : t(locale, '分享队伍', 'Share Team', 'チームを共有')}
              </button>
            </div>
          )}

          {/* Character Selector */}
          {editingSlot !== null && (
            <div className="mb-6 rounded-xl border border-game-primary/30 bg-game-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-game-primary">
                  {t(locale, `选择第 ${editingSlot + 1} 位角色`, `Select Slot ${editingSlot + 1}`, `スロット${editingSlot + 1}を選択`)}
                </h3>
                <button onClick={() => setEditingSlot(null)} className="text-xs text-game-text-muted hover:text-game-text">✕</button>
              </div>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t(locale, '搜索角色...', 'Search character...', 'キャラを検索...')}
                className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none focus:border-game-primary transition-colors" />
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button onClick={() => setFilterElement('all')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
                  {t(locale, '全部', 'All', '全')}
                </button>
                {GENSHIN_ELEMENTS.map((el) => (
                  <button key={el} onClick={() => setFilterElement(el)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                    style={filterElement === el ? { backgroundColor: GENSHIN_ELEMENT_COLORS[el] } : {}}>
                    {GENSHIN_ELEMENT_NAMES[el]?.[locale] ?? el}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 max-h-72 overflow-y-auto">
                {filtered.map((c) => {
                  const isInTeam = team.some((t) => t?.id === c.id);
                  return (
                    <button key={c.id} onClick={() => selectChar(c)} disabled={isInTeam && team[editingSlot]?.id !== c.id}
                      className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${
                        isInTeam ? 'border-game-border bg-game-surface-alt opacity-40 cursor-not-allowed' :
                        'border-game-border bg-game-surface-alt hover:border-game-primary/50'
                      }`}>
                      <CharacterAvatar src={getGenshinCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                      <span className="text-center text-[11px] leading-tight text-game-text-muted group-hover:text-game-text">{getGenshinCharacterName(c, locale)}</span>
                      <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-game-text-muted">
                    {t(locale, '没有找到角色', 'No characters found', 'キャラが見つかりません')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Fill from Recommended */}
          {activeChars.length === 0 && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {t(locale, '快速填充', 'Quick Fill', 'クイックフィル')}
              </h3>
              <p className="mb-3 text-xs text-game-text-muted">{t(locale, '选择一个推荐阵容快速填充', 'Select a recommended team to fill slots', 'おすすめパーティを選択してスロットを埋める')}</p>
              <div className="space-y-2">
                {recommendedTeams.slice(0, 6).map((comp, idx) => (
                  <button key={idx} onClick={() => {
                    const newTeam: (GenshinCharacter | null)[] = [null, null, null, null];
                    comp.members.forEach((member, i) => {
                      const mc = genshinCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                      if (mc && i < 4) newTeam[i] = mc;
                    });
                    setTeam(newTeam);
                  }}
                    className="w-full rounded-lg bg-game-surface-alt p-3 text-left hover:bg-game-surface-alt/80 transition-colors border border-game-border hover:border-game-primary/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-game-text">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.members.map((member) => {
                        const mc = genshinCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                        return (
                          <span key={member} className="flex items-center gap-1 rounded-full bg-game-surface px-2 py-0.5 text-[10px] text-game-text-muted border border-game-border">
                            {mc && <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[mc.element] }} />}
                            {mc ? getGenshinCharacterName(mc, locale) : member}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Recommended Teams Tab */
        <div className="space-y-3">
          <p className="text-xs text-game-text-muted">
            {activeChars.length > 0
              ? t(locale, `包含已选角色的推荐阵容`, `Recommended teams with your selected characters`, `選択済みキャラを含むおすすめパーティ`)
              : t(locale, '热门角色推荐阵容', 'Popular character recommended teams', '人気キャラのおすすめパーティ')
            }
          </p>
          {recommendedTeams.map((comp, idx) => (
            <div key={idx} className="rounded-xl border border-game-border bg-game-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-game-text">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</span>
                <button onClick={() => {
                  const newTeam: (GenshinCharacter | null)[] = [null, null, null, null];
                  comp.members.forEach((member, i) => {
                    const mc = genshinCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                    if (mc && i < 4) newTeam[i] = mc;
                  });
                  setTeam(newTeam);
                  setTab('builder');
                }} className="rounded-lg border border-game-primary/30 px-2 py-1 text-[10px] text-game-primary hover:bg-game-primary/10 transition-colors">
                  {t(locale, '使用此阵容', 'Use Team', '使用')}
                </button>
              </div>
              <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? comp.description : comp.descriptionEn ?? comp.description}</p>
              <div className="flex gap-2">
                {comp.members.map((member) => {
                  const mc = genshinCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                  return (
                    <div key={member} className="flex flex-col items-center gap-1">
                      {mc ? (
                        <>
                          <CharacterAvatar src={getGenshinCharacterImage(mc)} alt={mc.nameEn} element={mc.element} className="h-10 w-10 rounded-lg object-cover" />
                          <span className="text-[10px] text-game-text-muted">{getGenshinCharacterName(mc, locale)}</span>
                        </>
                      ) : (
                        <span className="rounded-lg border border-game-border bg-game-surface-alt px-2 py-1 text-[10px] text-game-text-muted">{member}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {recommendedTeams.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-game-border p-8 text-center">
              <p className="text-sm text-game-text-muted">{t(locale, '暂无推荐阵容', 'No recommended teams', 'おすすめパーティなし')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Star Rail / WuWa Constants ---

const SR_ELEMENTS = ['fire', 'ice', 'lightning', 'wind', 'physical', 'quantum', 'imaginary'] as const;
const SR_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};
const SR_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  fire: { zh: '火', en: 'Fire', ja: '炎' }, ice: { zh: '冰', en: 'Ice', ja: '氷' },
  lightning: { zh: '雷', en: 'Lightning', ja: '雷' }, wind: { zh: '风', en: 'Wind', ja: '風' },
  physical: { zh: '物理', en: 'Physical', ja: '物理' }, quantum: { zh: '量子', en: 'Quantum', ja: '量子' },
  imaginary: { zh: '虚数', en: 'Imaginary', ja: '虚数' },
};
const SR_PATH_NAMES: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' }, hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' }, harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' }, preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' }, remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
};

const WUWA_ELEMENTS = ['glacio', 'fusion', 'electro', 'aero', 'spectro', 'havoc'] as const;
const WUWA_ELEMENT_COLORS: Record<string, string> = {
  glacio: '#67e8f9', fusion: '#ef4444', electro: '#8b5cf6',
  aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
};
const WUWA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  glacio: { zh: '冷凝', en: 'Glacio', ja: '氷凝' }, fusion: { zh: '热熔', en: 'Fusion', ja: '融合' },
  electro: { zh: '导电', en: 'Electro', ja: '導電' }, aero: { zh: '气动', en: 'Aero', ja: '気動' },
  spectro: { zh: '衍射', en: 'Spectro', ja: '回折' }, havoc: { zh: '湮灭', en: 'Havoc', ja: '壊滅' },
};

// =====================================================================
// Star Rail Team Builder
// =====================================================================

function StarRailTeams({ locale }: { locale: SupportedLocale }) {
  const [team, setTeam] = useState<(StarRailCharacter | null)[]>([null, null, null, null]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [tab, setTab] = useState<'builder' | 'recommended'>('builder');

  const filtered = useMemo(() => {
    let chars = starrailCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const activeChars = team.filter(Boolean) as StarRailCharacter[];
  const gameConfig = GAMES.starrail;

  function selectChar(char: StarRailCharacter) {
    if (editingSlot === null) return;
    const newTeam = [...team];
    const existingIdx = newTeam.findIndex((c) => c?.id === char.id);
    if (existingIdx !== -1) newTeam[existingIdx] = null;
    newTeam[editingSlot] = char;
    setTeam(newTeam);
    setEditingSlot(null);
    setSearch('');
    setFilterElement('all');
  }

  // Recommended teams from selected characters
  const recommendedTeams = useMemo(() => {
    if (activeChars.length === 0) {
      const topChars = starrailCharacters.filter((c) => c.tierRank === 'SS' || c.tierRank === 'S').slice(0, 8);
      const teams: typeof topChars[0]['teamComps'] = [];
      const seen = new Set<string>();
      for (const char of topChars) {
        for (const comp of char.teamComps.slice(0, 2)) {
          const key = comp.members.sort().join(',');
          if (!seen.has(key)) { seen.add(key); teams.push(comp); }
        }
      }
      return teams;
    }
    const teams: typeof activeChars[0]['teamComps'] = [];
    const seen = new Set<string>();
    for (const char of activeChars) {
      for (const comp of char.teamComps) {
        const key = comp.members.sort().join(',');
        if (!seen.has(key)) { seen.add(key); teams.push(comp); }
      }
    }
    return teams;
  }, [activeChars]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配队模拟器', 'Team Builder', 'パーティ編成')}
      </h1>

      <div className="mb-4 flex gap-1">
        <button onClick={() => setTab('builder')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'builder' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
          {t(locale, '自由组队', 'Custom Team', 'フリー編成')}
        </button>
        <button onClick={() => setTab('recommended')} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === 'recommended' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
          {t(locale, '推荐阵容', 'Recommended', 'おすすめ')}
        </button>
      </div>

      {tab === 'builder' ? (
        <>
          <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '队伍成员', 'Team Members', 'パーティメンバー')}</h3>
            <div className="grid grid-cols-4 gap-3">
              {team.map((char, idx) => (
                <div key={idx} className="relative">
                  {char ? (
                    <div className={`group relative flex flex-col items-center rounded-xl border p-3 transition-all ${editingSlot === idx ? 'border-game-primary ring-2 ring-game-primary/30 bg-game-primary/5' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                      <CharacterAvatar src={getStarRailCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-14 w-14 rounded-xl object-cover ring-2 ring-game-primary/30" />
                      <span className="mt-2 text-xs font-medium text-game-text text-center">{getStarRailCharacterName(char, locale)}</span>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: SR_ELEMENT_COLORS[char.element] }}>
                          {SR_ELEMENT_NAMES[char.element]?.[locale] ?? char.element}
                        </span>
                        <span className="text-[10px] text-game-text-muted">{SR_PATH_NAMES[char.path]?.[locale] ?? char.path}</span>
                      </div>
                      <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingSlot(editingSlot === idx ? null : idx)} className="rounded-full bg-game-primary p-1 text-white hover:bg-game-primary/80" title={t(locale, '更换', 'Change', '変更')}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => { const nt = [...team]; nt[idx] = null; setTeam(nt); }} className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600" title={t(locale, '移除', 'Remove', '削除')}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setEditingSlot(editingSlot === idx ? null : idx)}
                      className={`flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-all ${editingSlot === idx ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary/50'}`}>
                      <span className="text-2xl">+</span>
                      <span className="mt-1 text-[10px]">{t(locale, '选择角色', 'Select', '選択')}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {editingSlot !== null && (
            <div className="mb-6 rounded-xl border border-game-primary/30 bg-game-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-game-primary">{t(locale, `选择第 ${editingSlot + 1} 位角色`, `Select Slot ${editingSlot + 1}`, `スロット${editingSlot + 1}を選択`)}</h3>
                <button onClick={() => setEditingSlot(null)} className="text-xs text-game-text-muted hover:text-game-text">✕</button>
              </div>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t(locale, '搜索角色...', 'Search character...', 'キャラを検索...')}
                className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none focus:border-game-primary transition-colors" />
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
                  {t(locale, '全部', 'All', '全')}
                </button>
                {SR_ELEMENTS.map((el) => (
                  <button key={el} onClick={() => setFilterElement(el)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                    style={filterElement === el ? { backgroundColor: SR_ELEMENT_COLORS[el] } : {}}>
                    {SR_ELEMENT_NAMES[el]?.[locale] ?? el}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 max-h-72 overflow-y-auto">
                {filtered.map((c) => {
                  const isInTeam = team.some((t) => t?.id === c.id);
                  return (
                    <button key={c.id} onClick={() => selectChar(c)} disabled={isInTeam && team[editingSlot]?.id !== c.id}
                      className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${isInTeam ? 'border-game-border bg-game-surface-alt opacity-40 cursor-not-allowed' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                      <CharacterAvatar src={getStarRailCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                      <span className="text-center text-[11px] leading-tight text-game-text-muted group-hover:text-game-text">{getStarRailCharacterName(c, locale)}</span>
                      <span className="text-[10px] text-game-text-muted">{SR_PATH_NAMES[c.path]?.[locale] ?? c.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick fill */}
          {activeChars.length === 0 && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '快速填充', 'Quick Fill', 'クイックフィル')}</h3>
              <div className="space-y-2">
                {recommendedTeams.slice(0, 6).map((comp, idx) => (
                  <button key={idx} onClick={() => {
                    const newTeam: (StarRailCharacter | null)[] = [null, null, null, null];
                    comp.members.forEach((member, i) => {
                      const mc = starrailCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                      if (mc && i < 4) newTeam[i] = mc;
                    });
                    setTeam(newTeam);
                  }} className="w-full rounded-lg bg-game-surface-alt p-3 text-left hover:bg-game-surface-alt/80 transition-colors border border-game-border hover:border-game-primary/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-game-text">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.members.map((member) => {
                        const mc = starrailCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                        return (
                          <span key={member} className="flex items-center gap-1 rounded-full bg-game-surface px-2 py-0.5 text-[10px] text-game-text-muted border border-game-border">
                            {mc && <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: SR_ELEMENT_COLORS[mc.element] }} />}
                            {mc ? getStarRailCharacterName(mc, locale) : member}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {recommendedTeams.map((comp, idx) => (
            <div key={idx} className="rounded-xl border border-game-border bg-game-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-game-text">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</span>
                <button onClick={() => {
                  const newTeam: (StarRailCharacter | null)[] = [null, null, null, null];
                  comp.members.forEach((member, i) => {
                    const mc = starrailCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                    if (mc && i < 4) newTeam[i] = mc;
                  });
                  setTeam(newTeam);
                  setTab('builder');
                }} className="rounded-lg border border-game-primary/30 px-2 py-1 text-[10px] text-game-primary hover:bg-game-primary/10 transition-colors">
                  {t(locale, '使用此阵容', 'Use Team', '使用')}
                </button>
              </div>
              <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? comp.description : comp.descriptionEn ?? comp.description}</p>
              <div className="flex gap-2">
                {comp.members.map((member) => {
                  const mc = starrailCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                  return (
                    <div key={member} className="flex flex-col items-center gap-1">
                      {mc ? (
                        <>
                          <CharacterAvatar src={getStarRailCharacterImage(mc)} alt={mc.nameEn} element={mc.element} className="h-10 w-10 rounded-lg object-cover" />
                          <span className="text-[10px] text-game-text-muted">{getStarRailCharacterName(mc, locale)}</span>
                        </>
                      ) : (
                        <span className="rounded-lg border border-game-border bg-game-surface-alt px-2 py-1 text-[10px] text-game-text-muted">{member}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// WuWa Teams (basic - no team comp data, show character cards only)
// =====================================================================

function WuWaTeams({ locale }: { locale: SupportedLocale }) {
  const [team, setTeam] = useState<(WuWaCharacter | null)[]>([null, null, null, null]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');

  const filtered = useMemo(() => {
    let chars = wuwaCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const activeChars = team.filter(Boolean) as WuWaCharacter[];
  const gameConfig = GAMES.wuwa;

  function selectChar(char: WuWaCharacter) {
    if (editingSlot === null) return;
    const newTeam = [...team];
    const existingIdx = newTeam.findIndex((c) => c?.id === char.id);
    if (existingIdx !== -1) newTeam[existingIdx] = null;
    newTeam[editingSlot] = char;
    setTeam(newTeam);
    setEditingSlot(null);
    setSearch('');
    setFilterElement('all');
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配队模拟器', 'Team Builder', 'パーティ編成')}
      </h1>

      <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '队伍成员', 'Team Members', 'パーティメンバー')}</h3>
        <div className="grid grid-cols-4 gap-3">
          {team.map((char, idx) => (
            <div key={idx} className="relative">
              {char ? (
                <div className={`group relative flex flex-col items-center rounded-xl border p-3 transition-all ${editingSlot === idx ? 'border-game-primary ring-2 ring-game-primary/30 bg-game-primary/5' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                  <CharacterAvatar src={getWuWaCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-14 w-14 rounded-xl object-cover ring-2 ring-game-primary/30" />
                  <span className="mt-2 text-xs font-medium text-game-text text-center">{getWuWaCharacterName(char, locale)}</span>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: WUWA_ELEMENT_COLORS[char.element] }}>
                      {WUWA_ELEMENT_NAMES[char.element]?.[locale] ?? char.element}
                    </span>
                    <span className="text-[10px] text-yellow-500">{char.rarity}★</span>
                  </div>
                  <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingSlot(editingSlot === idx ? null : idx)} className="rounded-full bg-game-primary p-1 text-white hover:bg-game-primary/80">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => { const nt = [...team]; nt[idx] = null; setTeam(nt); }} className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingSlot(editingSlot === idx ? null : idx)}
                  className={`flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 transition-all ${editingSlot === idx ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary/50'}`}>
                  <span className="text-2xl">+</span>
                  <span className="mt-1 text-[10px]">{t(locale, '选择角色', 'Select', '選択')}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary for selected team */}
      {activeChars.length > 0 && (
        <div className="rounded-xl border border-game-border bg-game-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '队伍属性总和', 'Team Stats Total', 'チームステータス合計')}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-game-border bg-game-surface-alt p-3 text-center">
              <div className="text-xs text-game-text-muted">HP</div>
              <div className="text-lg font-bold text-game-text">{activeChars.reduce((s, c) => s + c.stats.hp, 0)}</div>
            </div>
            <div className="rounded-lg border border-game-border bg-game-surface-alt p-3 text-center">
              <div className="text-xs text-game-text-muted">ATK</div>
              <div className="text-lg font-bold text-game-text">{activeChars.reduce((s, c) => s + c.stats.atk, 0)}</div>
            </div>
            <div className="rounded-lg border border-game-border bg-game-surface-alt p-3 text-center">
              <div className="text-xs text-game-text-muted">DEF</div>
              <div className="text-lg font-bold text-game-text">{activeChars.reduce((s, c) => s + c.stats.def, 0)}</div>
            </div>
          </div>
        </div>
      )}

      {editingSlot !== null && (
        <div className="mb-6 rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-game-primary">{t(locale, `选择第 ${editingSlot + 1} 位角色`, `Select Slot ${editingSlot + 1}`, `スロット${editingSlot + 1}を選択`)}</h3>
            <button onClick={() => setEditingSlot(null)} className="text-xs text-game-text-muted hover:text-game-text">✕</button>
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, '搜索角色...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none focus:border-game-primary transition-colors" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {WUWA_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: WUWA_ELEMENT_COLORS[el] } : {}}>
                {WUWA_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 max-h-72 overflow-y-auto">
            {filtered.map((c) => {
              const isInTeam = team.some((t) => t?.id === c.id);
              return (
                <button key={c.id} onClick={() => selectChar(c)} disabled={isInTeam && team[editingSlot]?.id !== c.id}
                  className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${isInTeam ? 'border-game-border bg-game-surface-alt opacity-40 cursor-not-allowed' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                  <CharacterAvatar src={getWuWaCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                  <span className="text-center text-[11px] leading-tight text-game-text-muted group-hover:text-game-text">{getWuWaCharacterName(c, locale)}</span>
                  <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// NTE Teams
// =====================================================================

const NTE_TEAM_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};
const NTE_TEAM_NAMES: Record<string, Record<string, string>> = {
  anima: { zh: '创生', en: 'Anima' }, chaos: { zh: '混沌', en: 'Chaos' },
  cosmos: { zh: '宇宙', en: 'Cosmos' }, incantation: { zh: '咒术', en: 'Incantation' },
  lakshana: { zh: '相', en: 'Lakshana' }, psyche: { zh: '精神', en: 'Psyche' },
};

function NteTeams({ locale }: { locale: SupportedLocale }) {
  const [slots, setSlots] = useState<(NteCharacter | null)[]>([null, null, null, null]);
  const [search, setSearch] = useState('');
  const [activeSlot, setActiveSlot] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return nteCharacters;
    const q = search.toLowerCase();
    return nteCharacters.filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q));
  }, [search]);

  const gameConfig = GAMES.nte;

  const addToSlot = (char: NteCharacter) => {
    const newSlots = [...slots];
    newSlots[activeSlot] = char;
    setSlots(newSlots);
  };

  // Quick fill from recommended teams
  const firstChar = slots.find(s => s !== null);
  const quickTeams = firstChar?.teamComps ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配队模拟器', 'Team Builder', 'パーティビルダー')}
      </h1>

      {/* Team Slots */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {slots.map((char, i) => (
          <button key={i} onClick={() => setActiveSlot(i)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${activeSlot === i ? 'border-game-primary bg-game-primary/10' : 'border-game-border bg-game-surface hover:border-game-primary/50'}`}>
            {char ? (
              <>
                <CharacterAvatar src={getNteCharacterImage(char)} alt="" element={char.attribute} className="h-14 w-14 rounded-xl object-cover" />
                <span className="text-xs font-medium text-game-text">{getNteCharacterName(char, locale)}</span>
                <span className="text-[10px]" style={{ color: NTE_TEAM_COLORS[char.attribute] }}>{NTE_TEAM_NAMES[char.attribute]?.[locale] ?? char.attribute}</span>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-game-border text-lg text-game-text-muted">{i + 1}</div>
                <span className="text-xs text-game-text-muted">{t(locale, '选择角色', 'Select', '選択')}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Quick Fill */}
      {quickTeams.length > 0 && (
        <div className="mb-4 rounded-xl border border-game-border bg-game-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-game-primary">{t(locale, '快速填充', 'Quick Fill', 'クイックフィル')}</h3>
          <div className="flex flex-wrap gap-2">
            {quickTeams.map((team, i) => (
              <button key={i} onClick={() => {
                const newSlots: (NteCharacter | null)[] = [null, null, null, null];
                team.members.forEach((mId, mi) => {
                  const m = nteCharacters.find(c => c.id === mId);
                  if (m && mi < 4) newSlots[mi] = m;
                });
                setSlots(newSlots);
              }} className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-1.5 text-xs text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                {locale === 'zh' ? team.name : team.nameEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Character Selection */}
      <div className="rounded-xl border border-game-border bg-game-surface p-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
          className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text outline-none focus:border-game-primary" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          {filtered.map(c => (
            <button key={c.id} onClick={() => addToSlot(c)}
              className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${slots.some(s => s?.id === c.id) ? 'border-game-primary/30 bg-game-primary/5 opacity-50' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
              <CharacterAvatar src={getNteCharacterImage(c)} alt="" element={c.attribute} className="h-10 w-10 rounded-lg object-cover" />
              <span className="text-center text-[11px] text-game-text">{getNteCharacterName(c, locale)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Coming Soon
// =====================================================================

// =====================================================================
// ZZZ Teams
// =====================================================================

const ZZZ_TEAM_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#a855f7',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

function ZzzTeams({ locale }: { locale: SupportedLocale }) {
  const teamsWithComps = zzzCharacters.filter((c) => c.teamComps.length > 0);
  const zzzIntentLinks = [
    {
      href: '/zzz/guides/team-building-guide',
      title: t(locale, '配队基础指南', 'Team Building Guide', '編成基礎ガイド'),
      description: t(locale, '先理解强攻、击破、异常、支援和防护位怎么组合。', 'Start with Attack, Stun, Anomaly, Support, and Defense role logic.', '強攻、撃破、異常、支援、防護の組み方を確認。'),
    },
    {
      href: '/zzz/guides/meta-teams-v3-guide',
      title: t(locale, '当前版本主流队伍', 'Current Meta Teams', '現在版本のメタ編成'),
      description: t(locale, '查看 3.0-3.1 主流队伍、抽卡目标和版本环境。', 'Review v3.0-v3.1 meta teams, pull targets, and patch context.', 'v3.0-v3.1の主流編成、ガチャ目標、環境を確認。'),
    },
    {
      href: '/zzz/guides/banner-schedule-guide',
      title: t(locale, '按卡池决定养谁', 'Plan Around Banners', 'バナーから育成判断'),
      description: t(locale, '抽代理人前先确认当前、下期、复刻和菲林预算。', 'Check current banners, next banners, reruns, and Polychrome budget first.', '現在、次回、復刻、菲林予算を先に確認。'),
    },
  ];

  return (
    <div>
      <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-game-primary">
          {t(locale, 'ZZZ 配队入口', 'ZZZ Team Builder', 'ZZZ 編成入口')}
        </p>
        <h1 className="mb-2 text-2xl font-bold text-game-text">
          {t(locale, '绝区零最佳队伍与代理人搭配', 'Best ZZZ Teams and Agent Comps', 'ZZZ おすすめチームとエージェント編成')}
        </h1>
        <p className="mb-4 text-sm leading-relaxed text-game-text-muted">
          {t(
            locale,
            '用这个页面快速查看 ZZZ team builder、最佳队伍、代理人协同和当前版本配队。先确定主输出或异常核心，再补击破、支援、防护和邦布需求。',
            'Use this ZZZ team builder hub to compare best teams, agent comps, synergy, and current-version lineups. Pick your main DPS or Anomaly core first, then add Stun, Support, Defense, and Bangboo needs.',
            'このページでZZZのおすすめチーム、エージェント相性、現在版本の編成を確認。主力DPSまたは異常コアを決めてから撃破、支援、防護、ボンプを補います。'
          )}
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {zzzIntentLinks.map((link) => (
            <a key={link.href} href={`/${locale}${link.href}`} className="rounded-md border border-game-border bg-game-surface-alt p-3 transition-colors hover:border-game-primary">
              <span className="mb-1 block text-sm font-semibold text-game-text">{link.title}</span>
              <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description}</span>
            </a>
          ))}
        </div>
      </section>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, `共 ${teamsWithComps.length} 位代理人的推荐配队`, `${teamsWithComps.length} agents with recommended teams`, `${teamsWithComps.length}エージェントのおすすめ編成`)}
      </p>

      <div className="space-y-4">
        {teamsWithComps.map((char) => (
          <div key={char.id} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <CharacterAvatar src={getZzzCharacterImage(char)} alt={getZzzCharacterName(char, locale)} element={char.attribute} className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <h3 className="font-semibold text-game-text">{getZzzCharacterName(char, locale)}</h3>
                <span className="text-xs rounded px-1" style={{ backgroundColor: ZZZ_TEAM_ELEMENT_COLORS[char.attribute], color: '#fff' }}>{char.attribute}</span>
              </div>
            </div>
            <div className="space-y-3">
              {char.teamComps.map((team, i) => (
                <div key={i} className="rounded border border-game-border/50 bg-game-surface-alt p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-game-text">{locale === 'zh' ? team.name : team.nameEn}</span>
                  </div>
                  <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((memberId) => {
                      const member = getZzzCharacterById(memberId);
                      return member ? (
                        <span key={memberId} className="flex items-center gap-1 rounded bg-game-surface px-2 py-0.5 text-xs text-game-primary">
                          {getZzzCharacterName(member, locale)}
                        </span>
                      ) : (
                        <span key={memberId} className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// Guihun Teams
// =====================================================================

const GUIHUN_TEAM_ELEMENT_COLORS: Record<string, string> = {
  flame: '#ef4444', frost: '#67e8f9', thunder: '#8b5cf6',
  gale: '#6ee7b7', radiance: '#fbbf24', void: '#a855f7',
};

function GuihuanTeams({ locale }: { locale: SupportedLocale }) {
  const teamsWithComps = guihuanCharacters.filter((c) => c.teamComps.length > 0);

  return (
    <div>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, `共 ${teamsWithComps.length} 位角色的推荐配队`, `${teamsWithComps.length} characters with recommended teams`, `${teamsWithComps.length}キャラのおすすめ編成`)}
      </p>

      <div className="space-y-4">
        {teamsWithComps.map((char) => (
          <div key={char.id} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <CharacterAvatar src={getGuihuanCharacterImage(char)} alt={getGuihuanCharacterName(char, locale)} element={char.element} className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <h3 className="font-semibold text-game-text">{getGuihuanCharacterName(char, locale)}</h3>
                <span className="text-xs rounded px-1" style={{ backgroundColor: GUIHUN_TEAM_ELEMENT_COLORS[char.element], color: '#fff' }}>
                  {char.elementEn}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {char.teamComps.map((team, i) => (
                <div key={i} className="rounded border border-game-border/50 bg-game-surface-alt p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-game-text">{locale === 'zh' ? team.name : team.nameEn}</span>
                  </div>
                  <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((memberId) => {
                      const member = guihuanCharacters.find((c) => c.id === memberId);
                      return member ? (
                        <span key={memberId} className="flex items-center gap-1 rounded bg-game-surface px-2 py-0.5 text-xs text-game-primary">
                          {getGuihuanCharacterName(member, locale)}
                        </span>
                      ) : (
                        <span key={memberId} className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// Endfield Teams
// =====================================================================

const ENDFIELD_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', heat: '#ef4444', cryo: '#67e8f9',
  nature: '#4ade80', electric: '#facc15',
};

function EndfieldTeams({ locale }: { locale: SupportedLocale }) {
  const [filterElement, setFilterElement] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');

  const allElements = useMemo(() => {
    const elSet = new Set<string>();
    endfieldCharacters.forEach((c) => elSet.add(c.element));
    return Array.from(elSet);
  }, []);

  const filtered = useMemo(() => {
    let chars = endfieldCharacters.filter((c) => c.teamComps.length > 0);
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (filterRarity !== 'all') chars = chars.filter((c) => String(c.rarity) === filterRarity);
    return chars;
  }, [filterElement, filterRarity]);

  return (
    <div>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, `共 ${filtered.length} 位干员的推荐配队`, `${filtered.length} operators with recommended teams`, `${filtered.length}オペレーターのおすすめ編成`)}
      </p>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterElement('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
            {t(locale, '全部元素', 'All Elements', '全元素')}
          </button>
          {allElements.map((el) => (
            <button key={el} onClick={() => setFilterElement(el)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
              style={filterElement === el ? { backgroundColor: ENDFIELD_ELEMENT_COLORS[el] ?? '#6b7280' } : {}}>
              {el.charAt(0).toUpperCase() + el.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterRarity('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
            {t(locale, '全部稀有度', 'All Rarity', '全レアリティ')}
          </button>
          {['6', '5'].map((r) => (
            <button key={r} onClick={() => setFilterRarity(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === r ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {r}{'★'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((char) => (
          <div key={char.id} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <CharacterAvatar src={getEndfieldCharacterImage(char)} alt={getEndfieldCharacterName(char, locale)} element={char.element} className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <h3 className="font-semibold text-game-text">{getEndfieldCharacterName(char, locale)}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs rounded px-1" style={{ backgroundColor: ENDFIELD_ELEMENT_COLORS[char.element] ?? '#6b7280', color: '#fff' }}>{char.elementEn}</span>
                  <span className="text-[10px] text-yellow-500">{char.rarity}{'★'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {char.teamComps.map((team, i) => (
                <div key={i} className="rounded border border-game-border/50 bg-game-surface-alt p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-game-text">{locale === 'zh' ? team.name : team.nameEn}</span>
                  </div>
                  <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((memberId) => {
                      const member = getEndfieldCharacterById(memberId);
                      return member ? (
                        <span key={memberId} className="flex items-center gap-1.5 rounded bg-game-surface px-2 py-0.5 text-xs text-game-primary">
                          <CharacterAvatar src={getEndfieldCharacterImage(member)} alt={getEndfieldCharacterName(member, locale)} element={member.element} className="h-5 w-5 rounded object-cover" />
                          {getEndfieldCharacterName(member, locale)}
                        </span>
                      ) : (
                        <span key={memberId} className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-game-border p-8 text-center">
          <p className="text-sm text-game-text-muted">{t(locale, '暂无配队数据', 'No team data available', 'チームデータなし')}</p>
        </div>
      )}
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
