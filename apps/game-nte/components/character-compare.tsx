'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';

type Character = {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  attribute?: string;
  rank?: string;
  roleEn?: string;
  weaponEn?: string;
};

export function CharacterCompare({ characters, locale }: { characters: Character[]; locale: SupportedLocale }) {
  const [selected, setSelected] = useState<string[]>([]);
  const copy = locale === 'zh'
    ? { select: '选择角色', selected: '已选', limit: '最多对比 4 名角色', empty: '从下方选择角色以开始对比。', attribute: '属性', rank: '稀有度', role: '定位', weapon: '武器', open: '查看详情' }
    : locale === 'ja'
      ? { select: 'キャラクターを選択', selected: '選択中', limit: '最大4人まで比較できます', empty: '下からキャラクターを選んで比較を始めてください。', attribute: '属性', rank: 'レアリティ', role: '役割', weapon: '武器', open: '詳細を見る' }
      : { select: 'Select characters', selected: 'Selected', limit: 'Compare up to 4 characters', empty: 'Choose characters below to start comparing.', attribute: 'Attribute', rank: 'Rank', role: 'Role', weapon: 'Weapon', open: 'Open profile' };
  const name = (character: Character) => locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa ?? character.nameEn : character.nameEn;
  const compared = useMemo(() => characters.filter((character) => selected.includes(character.id)), [characters, selected]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 4 ? [...current, id] : current);
  const rows: Array<[string, (character: Character) => string]> = [[copy.attribute, (character) => character.attribute ?? '—'], [copy.rank, (character) => character.rank ?? '—'], [copy.role, (character) => character.roleEn ?? '—'], [copy.weapon, (character) => character.weaponEn ?? '—']];

  return <section className="nte-compare"><div className="section-heading"><div><div className="eyebrow">Compare</div><h2>{copy.select}</h2></div><p>{copy.limit}</p></div><div className="nte-compare__picker" role="group" aria-label={copy.select}>{characters.map((character) => <button className={selected.includes(character.id) ? 'nte-compare__choice nte-compare__choice--active' : 'nte-compare__choice'} key={character.id} type="button" onClick={() => toggle(character.id)} aria-pressed={selected.includes(character.id)}>{name(character)}</button>)}</div><p className="nte-compare__count">{copy.selected}: {selected.length}/4</p>{compared.length ? <div className="nte-compare__table"><div className="nte-compare__row nte-compare__row--head"><span>{copy.select}</span>{compared.map((character) => <Link key={character.id} href={`/${locale}/nte/characters/${character.id}`}>{name(character)}</Link>)}</div>{rows.map(([label, value]) => <div className="nte-compare__row" key={label}><span>{label}</span>{compared.map((character) => <span key={character.id}>{value(character)}</span>)}</div>)}<div className="nte-compare__row"><span>{copy.open}</span>{compared.map((character) => <Link key={character.id} href={`/${locale}/nte/characters/${character.id}`}>{copy.open}</Link>)}</div></div> : <p className="notice">{copy.empty}</p>}</section>;
}
