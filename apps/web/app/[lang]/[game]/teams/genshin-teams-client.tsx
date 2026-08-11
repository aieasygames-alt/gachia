'use client';



import { useState, useMemo, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import {
  genshinCharacters,
  getGenshinCharacterName,
  getGenshinCharacterImage,
} from '@gachia/data/games/genshin/characters';

import type { GenshinCharacter } from '@gachia/data/games/genshin/types';

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
// Genshin Team Builder
// =====================================================================

export function GenshinTeams({ locale }: { locale: SupportedLocale }) {
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
