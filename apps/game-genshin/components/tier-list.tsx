'use client';

import { useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { compareElements, compareWeaponTypes } from '../lib/compare';
import { emptyTierFilters, filterTierCharacters, type TierCharacter } from '../lib/tier-list';
import { text } from '../lib/i18n';
import { TierDistribution, TierResults } from './tier-results';

export function TierListExplorer({ characters, locale }: { characters: TierCharacter[]; locale: SupportedLocale }) {
  const [filters, setFilters] = useState(emptyTierFilters), [distribution, setDistribution] = useState(false);
  const filtered = filterTierCharacters(characters, filters);
  const elements = [...new Set([...Object.keys(compareElements), ...characters.map(character => character.element)])];
  const element = text(locale, { zh: '元素', en: 'Element', ja: '元素' });
  const weapon = text(locale, { zh: '武器类型', en: 'Weapon type', ja: '武器タイプ' });
  const rarity = text(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' });
  return <section className="tier-tool" aria-label={text(locale, { zh: '角色评级', en: 'Character ratings', ja: 'キャラ評価' })}>
    <div className="tier-tool__controls"><div className="tier-tool__filters">
      <label>{text(locale, { zh: '搜索角色', en: 'Search characters', ja: 'キャラを検索' })}<input type="search" value={filters.query} onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} /></label>
      <label>{element}<select aria-label={element} value={filters.element} onChange={event => setFilters(current => ({ ...current, element: event.target.value }))}><option value="all">{text(locale, { zh: '全部元素', en: 'All elements', ja: 'すべての元素' })}</option>{elements.map(key => <option key={key} value={key}>{compareElements[key] ? text(locale, compareElements[key]!) : key}</option>)}</select></label>
      <label>{weapon}<select aria-label={weapon} value={filters.weapon} onChange={event => setFilters(current => ({ ...current, weapon: event.target.value }))}><option value="all">{text(locale, { zh: '全部武器', en: 'All weapons', ja: 'すべての武器' })}</option>{Object.entries(compareWeaponTypes).map(([key, labels]) => <option key={key} value={key}>{text(locale, labels)}</option>)}</select></label>
      <label>{rarity}<select aria-label={rarity} value={filters.rarity} onChange={event => setFilters(current => ({ ...current, rarity: event.target.value }))}><option value="all">{text(locale, { zh: '全部稀有度', en: 'All rarities', ja: 'すべてのレアリティ' })}</option><option value="4">4★</option><option value="5">5★</option></select></label>
    </div><div className="tier-tool__actions"><button type="button" onClick={() => setFilters(emptyTierFilters())}>{text(locale, { zh: '清除筛选', en: 'Clear filters', ja: '絞り込みを解除' })}</button>
      <label className="tier-tool__toggle"><input type="checkbox" checked={distribution} aria-controls="tier-distribution" onChange={event => setDistribution(event.target.checked)} />{text(locale, { zh: '分布图', en: 'Distribution', ja: '分布図' })}</label>
    </div></div>
    <p className="tier-tool__count" role="status">{filtered.length} / {characters.length}</p>
    {distribution && <TierDistribution characters={filtered} locale={locale} />}
    <TierResults characters={filtered} locale={locale} />
    <noscript><style>{'.tier-tool__controls { display: none; }'}</style></noscript>
  </section>;
}
