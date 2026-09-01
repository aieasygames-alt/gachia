'use client';

import { useState, useMemo } from 'react';
import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import {
  starrailCharacters,
  getStarRailCharacterName,
  getStarRailCharacterImage,
} from '@gachia/data/games/starrail/characters';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { Link } from '@/lib/i18n/navigation';

// --- Constants ---

const STARRAIL_ELEMENTS = ['fire', 'ice', 'lightning', 'wind', 'physical', 'quantum', 'imaginary'] as const;
const STARRAIL_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};
const STARRAIL_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  fire: { zh: '火', en: 'Fire', ja: '炎' }, ice: { zh: '冰', en: 'Ice', ja: '氷' },
  lightning: { zh: '雷', en: 'Lightning', ja: '雷' }, wind: { zh: '风', en: 'Wind', ja: '風' },
  physical: { zh: '物理', en: 'Physical', ja: '物理' }, quantum: { zh: '量子', en: 'Quantum', ja: '量子' },
  imaginary: { zh: '虚数', en: 'Imaginary', ja: '虚数' },
};

const STARRAIL_PATHS = ['destruction', 'hunt', 'erudition', 'harmony', 'nihility', 'preservation', 'abundance', 'remembrance'] as const;
const STARRAIL_PATH_NAMES: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '智識' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; barColor: string }> = {
  SS: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30', barColor: '#ef4444' },
  S: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30', barColor: '#f97316' },
  A: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30', barColor: '#3b82f6' },
  B: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-500/30', barColor: '#6b7280' },
  C: { bg: 'bg-gray-800/30', text: 'text-gray-500', border: 'border-gray-600/30', barColor: '#4b5563' },
};

const TIER_ORDER = ['SS', 'S', 'A', 'B', 'C'];

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

// --- Component ---

export function StarRailTierListClient({ locale }: { locale: SupportedLocale }) {
  const [filterElement, setFilterElement] = useState<string>('all');
  const [filterPath, setFilterPath] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [showDistribution, setShowDistribution] = useState(false);

  const filtered = useMemo(() => {
    let chars = starrailCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (filterPath !== 'all') chars = chars.filter((c) => c.path === filterPath);
    if (filterRarity !== 'all') chars = chars.filter((c) => c.rarity === Number(filterRarity));
    return chars;
  }, [filterElement, filterPath, filterRarity]);

  // Group by tier
  const tierGroups = useMemo(() => {
    const groups: Record<string, typeof starrailCharacters> = {};
    for (const char of filtered) {
      const tier = char.tierRank || 'B';
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(char);
    }
    return groups;
  }, [filtered]);

  // Distribution data
  const totalChars = filtered.length;

  const gameConfig = GAMES.starrail;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-4 text-sm text-game-text-muted">
        {t(locale, '基于角色综合强度评级，仅供参考', 'Based on overall character strength, for reference only', 'キャラクターの総合的な強さに基づく評価です')}
        <span className="ml-2 text-game-text-muted/60">({filtered.length}/{starrailCharacters.length})</span>
      </p>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-game-border bg-game-surface p-4">
        {/* Element Filter */}
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-medium text-game-text-muted">{t(locale, '属性', 'Element', '属性')}</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {STARRAIL_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: STARRAIL_ELEMENT_COLORS[el] } : {}}>
                {STARRAIL_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
        </div>

        {/* Path Filter */}
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-medium text-game-text-muted">{t(locale, '命途', 'Path', '運命の道')}</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterPath('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPath === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {STARRAIL_PATHS.map((path) => (
              <button key={path} onClick={() => setFilterPath(path)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPath === path ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
                {STARRAIL_PATH_NAMES[path]?.[locale] ?? path}
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
                const imageUrl = getStarRailCharacterImage(char);
                const pathLabel = STARRAIL_PATH_NAMES[char.path]?.[locale] ?? char.path;
                return (
                  <Link key={char.id} href={`/starrail/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt={getStarRailCharacterName(char, locale)} element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getStarRailCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STARRAIL_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{pathLabel}</span>
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
