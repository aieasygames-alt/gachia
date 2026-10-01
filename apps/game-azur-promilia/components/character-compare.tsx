'use client';

import { useMemo, useState } from 'react';
import type { AzurPromiliaCharacter } from '@gachia/data/games/azur-promilia';
import type { SupportedLocale } from '@gachia/core';

export function CharacterCompare({ characters, locale }: { characters: AzurPromiliaCharacter[]; locale: SupportedLocale }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const labels = {
    zh: { title: '角色对比', search: '搜索角色', count: '已选', max: '最多可选择 4 名角色', limit: '已达到 4 名角色上限', clear: '清空', empty: '从下方选择一名角色，即可开始查看差异。', noResults: '没有匹配的角色。', element: '元素', profession: '职业', weapon: '武器', rarity: '稀有度', battle: '战斗类型', tuning: '调谐印记', blessing: '特色被动', remove: '移除' },
    en: { title: 'Character Compare', search: 'Search characters', count: 'Selected', max: 'Select up to 4 characters', limit: 'The 4-character limit has been reached', clear: 'Clear', empty: 'Select a character below to start comparing.', noResults: 'No characters match this search.', element: 'Element', profession: 'Profession', weapon: 'Weapon', rarity: 'Rarity', battle: 'Battle types', tuning: 'Tuning Marks', blessing: 'Signature passive', remove: 'Remove' },
    ja: { title: 'キャラクター比較', search: 'キャラクターを検索', count: '選択中', max: '最大4人まで選択できます', limit: '4人の選択上限に達しました', clear: 'クリア', empty: '下からキャラクターを選択して比較を始めてください。', noResults: '検索に一致するキャラクターはいません。', element: '属性', profession: '職業', weapon: '武器', rarity: 'レアリティ', battle: '戦闘タイプ', tuning: '調律マーク', blessing: '固有パッシブ', remove: '削除' },
  }[locale];
  const compared = useMemo(() => characters.filter((entry) => selected.includes(entry.id)), [characters, selected]);
  const matches = useMemo(() => characters.filter((character) => `${character.name.zh} ${character.name.en} ${character.name.ja}`.toLowerCase().includes(query.toLowerCase())), [characters, query]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 4 ? [...current, id] : current);
  const values = [[labels.element, (c: AzurPromiliaCharacter) => c.beta.element], [labels.profession, (c: AzurPromiliaCharacter) => c.beta.profession], [labels.weapon, (c: AzurPromiliaCharacter) => c.beta.weaponType], [labels.rarity, (c: AzurPromiliaCharacter) => `${c.beta.rarity}★`], [labels.battle, (c: AzurPromiliaCharacter) => c.beta.battleTypes.join(', ')], [labels.tuning, (c: AzurPromiliaCharacter) => `+ ${c.beta.tuningMarks.gains.join(', ') || '-'} / - ${c.beta.tuningMarks.consumes.join(', ') || '-'}`], [labels.blessing, (c: AzurPromiliaCharacter) => c.beta.skills.find((skill) => skill.category === 'blessing')?.description[locale] || '-']] as const;

  return <section className="compare"><div className="compare__head"><div><h2>{labels.title}</h2><p>{labels.max}</p></div><div className="compare__count"><strong>{labels.count} {selected.length}/4</strong>{selected.length > 0 && <button type="button" onClick={() => setSelected([])}>{labels.clear}</button>}</div></div>
    <div className="compare__selected" aria-live="polite">{compared.length ? compared.map((character) => <span key={character.id}>{character.name[locale]}<button type="button" onClick={() => toggle(character.id)} aria-label={`${labels.remove} ${character.name[locale]}`}>×</button></span>) : <p>{labels.empty}</p>}</div>
    <label className="compare__search">{labels.search}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} /></label>
    <div className="compare__buttons" aria-label={labels.title}>{matches.length ? matches.map((character) => { const active = selected.includes(character.id); const disabled = !active && selected.length >= 4; return <button aria-pressed={active} className={active ? 'compare__button compare__button--active' : 'compare__button'} disabled={disabled} key={character.id} onClick={() => toggle(character.id)} type="button"><span>{character.name[locale]}</span><small>{character.beta.element} · {character.beta.rarity}★</small></button>; }) : <p className="card__meta">{labels.noResults}</p>}</div>
    {selected.length >= 4 && <p className="compare__limit" role="status">{labels.limit}</p>}
    {compared.length > 0 && <div className="compare-table"><div className="compare-row compare-row--head"><strong>{labels.title}</strong>{compared.map((character) => <strong key={character.id}>{character.name[locale]}</strong>)}</div>{values.map(([label, value]) => <div className="compare-row" key={label}><span>{label}</span>{compared.map((character) => <span key={character.id}>{value(character)}</span>)}</div>)}</div>}
  </section>;
}
