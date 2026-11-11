import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { compareElements, compareWeaponLabel } from '../lib/compare';
import { groupTierCharacters, tierName, type TierCharacter } from '../lib/tier-list';
import { text } from '../lib/i18n';

const tierLabel = (tier: string | null, locale: SupportedLocale) => tier ?? text(locale, { zh: '暂无评级', en: 'Unrated', ja: '未評価' });

export function TierDistribution({ characters, locale }: { characters: TierCharacter[]; locale: SupportedLocale }) {
  return <section id="tier-distribution" className="tier-tool__distribution" aria-label={text(locale, { zh: '等级分布', en: 'Tier distribution', ja: 'ティア分布' })}>
    <h2>{text(locale, { zh: '等级分布', en: 'Tier distribution', ja: 'ティア分布' })}</h2>
    <ul>{groupTierCharacters(characters).map(group => <li key={JSON.stringify(group.tier)} data-distribution-tier={group.tier ?? 'unrated'}>
      <span>{tierLabel(group.tier, locale)}</span><div role="meter" aria-label={tierLabel(group.tier, locale)} aria-valuemin={0} aria-valuemax={characters.length || 1} aria-valuenow={group.count}><span style={{ width: `${group.percentage}%` }} /></div>
      <span data-distribution-count={group.count}>{group.count} · {group.percentage.toFixed(1)}%</span>
    </li>)}</ul>
  </section>;
}

export function TierResults({ characters, locale }: { characters: TierCharacter[]; locale: SupportedLocale }) {
  if (!characters.length) return <p className="tier-tool__empty" role="status">{text(locale, { zh: '没有符合条件的角色。', en: 'No matching characters.', ja: '条件に一致するキャラはいません。' })}</p>;
  return <div className="tier-tool__results">{groupTierCharacters(characters).filter(group => group.count).map(group => <section key={JSON.stringify(group.tier)} data-tier={group.tier ?? 'unrated'}>
    <header><h2>{tierLabel(group.tier, locale)}</h2><span className="meta">{group.count}</span></header>
    <ul>{group.characters.map(character => <li key={character.id} data-tier-character={character.id}><Link href={`/${locale}/genshin/characters/${character.id}`}>
      <img src={character.image} alt="" width={52} height={52} loading="lazy" /><span><strong>{tierName(character, locale)}</strong><small>{character.rarity}★ · {compareElements[character.element]?.[locale] ?? character.element}</small><small>{compareWeaponLabel(character.weaponType, locale)}</small></span>
    </Link></li>)}</ul>
  </section>)}</div>;
}
