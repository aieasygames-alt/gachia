'use client';

import { useState, useMemo, useEffect } from 'react';
import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { Link } from '@/lib/i18n/navigation';
import { getTierListCharacterImage, getTierListCharacterName, loadTierListClientData, type TierListClientCharacter } from '@/lib/game-data/tier-list-client-data';

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

const WEAPON_TYPES = ['sword', 'claymore', 'polearm', 'bow', 'catalyst'] as const;
const WEAPON_TYPE_NAMES: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; barColor: string }> = {
  SS: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30', barColor: '#ef4444' },
  'S+': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30', barColor: '#eab308' },
  S: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30', barColor: '#f97316' },
  'A+': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/30', barColor: '#a855f7' },
  A: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30', barColor: '#3b82f6' },
  B: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-500/30', barColor: '#6b7280' },
  C: { bg: 'bg-gray-800/30', text: 'text-gray-500', border: 'border-gray-600/30', barColor: '#4b5563' },
};

const TIER_ORDER = ['SS', 'S', 'A+', 'A', 'B', 'C'];

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

// --- Component ---

export function GenshinTierListClient({ locale }: { locale: SupportedLocale }) {
  const [characters, setCharacters] = useState<TierListClientCharacter[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => { loadTierListClientData('genshin').then(setCharacters).catch(() => setLoadError(true)); }, []);
  const [filterElement, setFilterElement] = useState<string>('all');
  const [filterWeapon, setFilterWeapon] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [showDistribution, setShowDistribution] = useState(false);

  const filtered = useMemo(() => {
    let chars = characters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (filterWeapon !== 'all') chars = chars.filter((c) => c.weaponType === filterWeapon);
    if (filterRarity !== 'all') chars = chars.filter((c) => c.rarity === Number(filterRarity));
    return chars;
  }, [characters, filterElement, filterWeapon, filterRarity]);

  // Group by tier
  const tierGroups = useMemo(() => {
    const groups: Record<string, TierListClientCharacter[]> = {};
    for (const char of filtered) {
      const tier = char.tierRank || 'B';
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(char);
    }
    return groups;
  }, [filtered]);

  // Distribution data
  const totalChars = filtered.length;

  const gameConfig = GAMES.genshin;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-4 text-sm text-game-text-muted">
        {t(locale, '基于角色综合强度评级，仅供参考', 'Based on overall character strength, for reference only', 'キャラクターの総合的な強さに基づく評価です')}
        <span className="ml-2 text-game-text-muted/60">({filtered.length}/{characters.length})</span>
      </p>
      {loadError && <p className="mb-4 text-sm text-red-400">{t(locale, '角色数据加载失败，请刷新重试', 'Failed to load character data, please refresh', 'キャラクターデータの読み込みに失敗しました')}</p>}

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-game-border bg-game-surface p-4">
        {/* Element Filter */}
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-medium text-game-text-muted">{t(locale, '元素', 'Element', '元素')}</div>
          <div className="flex flex-wrap gap-1.5">
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
        </div>

        {/* Weapon Type Filter */}
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-medium text-game-text-muted">{t(locale, '武器类型', 'Weapon Type', '武器タイプ')}</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterWeapon('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterWeapon === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {WEAPON_TYPES.map((wt) => (
              <button key={wt} onClick={() => setFilterWeapon(wt)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterWeapon === wt ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
                {WEAPON_TYPE_NAMES[wt]?.[locale] ?? wt}
              </button>
            ))}
          </div>
        </div>

        {/* Rarity Filter */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-game-text-muted">{t(locale, '稀有度', 'Rarity', 'レアリティ')}</div>
          <div className="flex gap-1.5">
            <button onClick={() => setFilterRarity('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            <button onClick={() => setFilterRarity('4')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === '4' ? 'bg-purple-600 text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              4★
            </button>
            <button onClick={() => setFilterRarity('5')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === '5' ? 'bg-yellow-600 text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              5★
            </button>
          </div>

          {/* Distribution toggle */}
          <button onClick={() => setShowDistribution(!showDistribution)}
            className={`ml-auto rounded-full px-3 py-1 text-xs font-medium transition-colors ${showDistribution ? 'bg-game-accent text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
            {t(locale, '分布图', 'Distribution', '分布図')}
          </button>
        </div>
      </div>

      {/* Distribution Chart */}
      {showDistribution && (
        <div className="mb-4 rounded-xl border border-game-border bg-game-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '等级分布', 'Tier Distribution', 'ティア分布')}</h3>
          <div className="space-y-2">
            {TIER_ORDER.map((tier) => {
              const count = tierGroups[tier]?.length ?? 0;
              const pct = totalChars > 0 ? (count / totalChars) * 100 : 0;
              const style = TIER_STYLES[tier] ?? TIER_STYLES.B!;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className={`w-8 text-sm font-bold ${style.text}`}>{tier}</span>
                  <div className="flex-1 h-6 rounded-full bg-game-surface-alt overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: style.barColor }}>
                      {pct >= 8 && <span className="text-[10px] font-medium text-white">{count}</span>}
                    </div>
                  </div>
                  {pct < 8 && <span className="text-xs text-game-text-muted w-6">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier Groups */}
      {TIER_ORDER.map((tier) => {
        const chars = tierGroups[tier];
        if (!chars || chars.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B!;

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({chars.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {chars.map((char) => {
                const imageUrl = getTierListCharacterImage(char);
                return (
                  <Link key={char.id} href={`/genshin/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt={getTierListCharacterName(char, locale)} element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getTierListCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{WEAPON_TYPE_NAMES[char.weaponType ?? '']?.[locale] ?? char.weaponType}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
