'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';

type Character = { id: string; name: string; nameEn: string; nameJa?: string; attribute?: string; rank?: string; roleEn?: string; weaponEn?: string };

export function CharacterDirectory({ characters, locale }: { characters: Character[]; locale: SupportedLocale }) {
  const [query, setQuery] = useState('');
  const [attribute, setAttribute] = useState('all');
  const [rank, setRank] = useState('all');
  const [role, setRole] = useState('all');
  const copy = locale === 'zh'
    ? { search: '搜索角色', attribute: '属性', rank: '稀有度', role: '定位', all: '全部', results: '名角色', noResults: '没有匹配的角色，试试调整搜索或筛选。', weapon: '武器' }
    : locale === 'ja'
      ? { search: 'キャラクターを検索', attribute: '属性', rank: 'レアリティ', role: '役割', all: 'すべて', results: '人', noResults: '該当するキャラクターはいません。検索または絞り込みを調整してください。', weapon: '武器' }
      : { search: 'Search characters', attribute: 'Attribute', rank: 'Rank', role: 'Role', all: 'All', results: 'characters', noResults: 'No characters match these filters. Try changing the search or filters.', weapon: 'Weapon' };
  const name = (character: Character) => locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa ?? character.nameEn : character.nameEn;
  const attributes = useMemo(() => [...new Set(characters.map((character) => character.attribute).filter(Boolean))].sort() as string[], [characters]);
  const ranks = useMemo(() => [...new Set(characters.map((character) => character.rank).filter(Boolean))].sort() as string[], [characters]);
  const roles = useMemo(() => [...new Set(characters.map((character) => character.roleEn).filter(Boolean))].sort() as string[], [characters]);
  const filtered = useMemo(() => characters.filter((character) => {
    const text = `${character.name} ${character.nameEn} ${character.nameJa ?? ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (attribute === 'all' || character.attribute === attribute) && (rank === 'all' || character.rank === rank) && (role === 'all' || character.roleEn === role);
  }), [attribute, characters, query, rank, role]);

  return <section className="character-directory"><div className="character-directory__filters"><label>{copy.search}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></label><label>{copy.attribute}<select value={attribute} onChange={(event) => setAttribute(event.target.value)}><option value="all">{copy.all}</option>{attributes.map((value) => <option key={value}>{value}</option>)}</select></label><label>{copy.rank}<select value={rank} onChange={(event) => setRank(event.target.value)}><option value="all">{copy.all}</option>{ranks.map((value) => <option key={value}>{value}</option>)}</select></label><label>{copy.role}<select value={role} onChange={(event) => setRole(event.target.value)}><option value="all">{copy.all}</option>{roles.map((value) => <option key={value}>{value}</option>)}</select></label></div><p className="character-directory__count" aria-live="polite">{filtered.length} {copy.results}</p>{filtered.length ? <div className="grid">{filtered.map((character) => <Link className="card card--character" key={character.id} href={`/${locale}/nte/characters/${character.id}`}><div className="character-monogram" aria-hidden="true"><span>{name(character).slice(0, 1)}</span><small>{character.rank}</small></div><div className="card__title">{name(character)}</div><div className="card__meta">{character.attribute} · {character.rank} · {character.roleEn ?? ''}</div><p>{character.weaponEn ? `${copy.weapon}: ${character.weaponEn}` : ''}</p></Link>)}</div> : <p className="character-directory__empty" role="status">{copy.noResults}</p>}</section>;
}
