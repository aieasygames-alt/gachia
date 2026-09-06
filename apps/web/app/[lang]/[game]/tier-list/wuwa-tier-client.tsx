'use client';

import { useState, useMemo, useEffect } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { getTierListCharacterImage, getTierListCharacterName, loadTierListClientData, type TierListClientCharacter } from '@/lib/game-data/tier-list-client-data';

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SS: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30' },
  'S+': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  S: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30' },
  'A+': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/30' },
  A: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30' },
  B: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-500/30' },
  C: { bg: 'bg-gray-800/30', text: 'text-gray-500', border: 'border-gray-600/30' },
};

const ELEMENT_COLORS: Record<string, string> = {
  glacio: '#67e8f9', fusion: '#ef4444', electro: '#8b5cf6',
  aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
};

const ELEMENTS = ['all', 'aero', 'glacio', 'electro', 'fusion', 'spectro', 'havoc'] as const;
const TIER_ORDER = ['SS', 'S', 'A+', 'A', 'B', 'C'];

function t(locale: SupportedLocale, zh: string, en: string) {
  return locale === 'zh' ? zh : en;
}

export function WuWaTierListClient({ locale }: { locale: SupportedLocale }) {
  const [characters, setCharacters] = useState<TierListClientCharacter[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => { loadTierListClientData('wuwa').then(setCharacters).catch(() => setLoadError(true)); }, []);
  const [filterElement, setFilterElement] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let chars = characters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [characters, filterElement, search]);

  const tierGroups = useMemo(() => {
    const groups: Record<string, TierListClientCharacter[]> = {};
    for (const char of filtered) {
      const tier = char.tierRank || 'B';
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(char);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-game-text">
        {t(locale, '角色强度榜', 'Character Tier List')}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, '基于角色综合强度评级，仅供参考', 'Based on overall character strength, for reference only')}
      </p>
      {loadError && <p className="mb-4 text-sm text-red-400">{t(locale, '角色数据加载失败，请刷新重试', 'Failed to load character data, please refresh')}</p>}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, '搜索角色...', 'Search character...')}
          className="w-48 rounded-lg border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary"
        />
        <div className="flex flex-wrap gap-1.5">
          {ELEMENTS.map((el) => (
            <button
              key={el}
              onClick={() => setFilterElement(el)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterElement === el
                  ? el === 'all'
                    ? 'bg-game-primary text-white'
                    : 'text-white'
                  : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'
              }`}
              style={filterElement === el && el !== 'all' ? { backgroundColor: ELEMENT_COLORS[el] } : {}}
            >
              {el === 'all' ? t(locale, '全部', 'All') : el.charAt(0).toUpperCase() + el.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Rows */}
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
                const reason = char.tierReason as { zh?: string; en?: string } | undefined;
                return (
                  <Link
                    key={char.id}
                    href={`/wuwa/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt={getTierListCharacterName(char, locale)} element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">
                        {getTierListCharacterName(char, locale)}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.weaponType}</span>
                      </div>
                      {reason && (
                        <p className="mt-0.5 text-[10px] leading-tight text-game-text-muted/70 line-clamp-1">
                          {locale === 'zh' ? reason.zh : reason.en}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-game-text-muted">
          {t(locale, '没有找到角色', 'No characters found')}
        </div>
      )}
    </div>
  );
}
