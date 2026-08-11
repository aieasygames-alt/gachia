'use client';



import { useState, useMemo, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import {
  wuwaCharacters,
  getWuWaCharacterName,
  getWuWaCharacterImage,
} from '@gachia/data/games/wuwa/characters';

import type { WuWaCharacter } from '@gachia/data/games/wuwa/types';

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
// WuWa Teams (basic - no team comp data, show character cards only)
// =====================================================================

export function WuWaTeams({ locale }: { locale: SupportedLocale }) {
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
