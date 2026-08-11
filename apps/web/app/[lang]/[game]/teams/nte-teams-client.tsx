'use client';



import { useState, useMemo, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import {
  nteCharacters,
  getNteCharacterName,
  getNteCharacterImage,
} from '@gachia/data/games/nte/characters';

import type { NteCharacter } from '@gachia/data/games/nte/types';

import { CharacterAvatar } from '@/components/wiki/character-avatar';
import type { SupportedLocale } from '@gachia/core';


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


export function NteTeams({ locale }: { locale: SupportedLocale }) {
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
