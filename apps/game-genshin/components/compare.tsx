'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { compareElements, compareName, compareWeaponLabel, filterCompareCharacters, type CompareCatalog } from '../lib/compare';
import { text } from '../lib/i18n';
import { CompareResults } from './compare-results';

export function CharacterCompare({ catalog, locale }: { catalog: CompareCatalog; locale: SupportedLocale }) {
  const [ids, setIds] = useState<[string, string]>(['', '']);
  const [slot, setSlot] = useState<0 | 1 | null>(0);
  const [query, setQuery] = useState('');
  const [element, setElement] = useState('all');
  const search = useRef<HTMLInputElement>(null);
  const slots = useRef<(HTMLButtonElement | null)[]>([]);
  const characters = ids.map(id => catalog.characters.find(character => character.id === id));
  const filtered = filterCompareCharacters(catalog.characters, query, element);
  const chooseLabel = (index: number) => text(locale, { zh: `选择角色 ${index === 0 ? 'A' : 'B'}`, en: `Select Character ${index === 0 ? 'A' : 'B'}`, ja: `キャラ${index === 0 ? 'A' : 'B'}を選択` });
  const open = (index: 0 | 1) => { setSlot(index); setQuery(''); setElement('all'); requestAnimationFrame(() => search.current?.focus()); };
  const close = () => { const previous = slot; setSlot(null); if (previous !== null) requestAnimationFrame(() => slots.current[previous]?.focus()); };
  const choose = (id: string) => {
    if (slot === null || ids[slot === 0 ? 1 : 0] === id) return;
    setIds(current => slot === 0 ? [id, current[1]] : [current[0], id]); close(); setQuery(''); setElement('all');
  };
  const clear = text(locale, { zh: '清空对比', en: 'Clear comparison', ja: '比較をクリア' });
  return <section className="compare-tool" aria-label={text(locale, { zh: '双角色对比', en: 'Two-character comparison', ja: '2人のキャラ比較' })}>
    <div className="compare-tool__controls"><button type="button" disabled={!ids.some(Boolean)} onClick={() => { setIds(['', '']); open(0); }}>{clear}</button></div>
    <div className="compare-tool__slots">{([0, 1] as const).map(index => {
      const character = characters[index];
      return <article key={index} data-slot={index === 0 ? 'A' : 'B'}><span className="compare-tool__slot-label">{index === 0 ? 'A' : 'B'}</span>
        <div className="compare-tool__identity">{character ? <><img src={character.image} alt="" width={56} height={56} /><div><h2>{compareName(character, locale)}</h2><p className="meta">{character.rarity}★ · {compareElements[character.element]?.[locale] ?? character.element} · {compareWeaponLabel(character.weaponType, locale)}</p></div></> : <span className="meta">{chooseLabel(index)}</span>}</div>
        <div className="compare-tool__slot-actions"><button type="button" ref={node => { slots.current[index] = node; }} aria-label={chooseLabel(index)} aria-expanded={slot === index} aria-controls="compare-selector" onClick={() => slot === index ? close() : open(index)}>
          {character ? text(locale, { zh: '更换角色', en: 'Change character', ja: 'キャラを変更' }) : <><span aria-hidden="true">+</span> {chooseLabel(index)}</>}
        </button>{character && <button type="button" className="compare-tool__remove" title={text(locale, { zh: `移除角色 ${index === 0 ? 'A' : 'B'}`, en: `Remove Character ${index === 0 ? 'A' : 'B'}`, ja: `キャラ${index === 0 ? 'A' : 'B'}を外す` })} aria-label={text(locale, { zh: `移除角色 ${index === 0 ? 'A' : 'B'}`, en: `Remove Character ${index === 0 ? 'A' : 'B'}`, ja: `キャラ${index === 0 ? 'A' : 'B'}を外す` })} onClick={() => { setIds(current => index === 0 ? ['', current[1]] : [current[0], '']); open(index); }}><span aria-hidden="true">×</span></button>}</div>
      </article>;
    })}</div>
    {slot !== null && <div id="compare-selector" className="compare-tool__selector" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <header><h2>{chooseLabel(slot)}</h2><button type="button" title={text(locale, { zh: '关闭选择', en: 'Close selector', ja: '選択を閉じる' })} aria-label={text(locale, { zh: '关闭选择', en: 'Close selector', ja: '選択を閉じる' })} onClick={close}><span aria-hidden="true">×</span></button></header>
      <div className="compare-tool__filters"><label>{text(locale, { zh: '搜索角色', en: 'Search characters', ja: 'キャラを検索' })}<input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label>{text(locale, { zh: '元素', en: 'Element', ja: '元素' })}<select aria-label={text(locale, { zh: '元素', en: 'Element', ja: '元素' })} value={element} onChange={event => setElement(event.target.value)}><option value="all">{text(locale, { zh: '全部元素', en: 'All elements', ja: 'すべての元素' })}</option>{Object.entries(compareElements).map(([id, labels]) => <option key={id} value={id}>{text(locale, labels)}</option>)}</select></label></div>
      <div className="compare-tool__count"><span role="status">{filtered.length} / {catalog.characters.length}</span><button type="button" onClick={() => { setQuery(''); setElement('all'); }}>{text(locale, { zh: '清除筛选', en: 'Clear filters', ja: '絞り込みを解除' })}</button></div>
      <div className="compare-tool__roster">{filtered.map(character => <button type="button" key={character.id} data-roster-id={character.id} aria-pressed={ids[slot] === character.id} disabled={ids[slot === 0 ? 1 : 0] === character.id} onClick={() => choose(character.id)}>
        <img src={character.image} alt="" width={48} height={48} loading="lazy" /><span>{compareName(character, locale)}</span><small>{character.rarity}★</small>
      </button>)}</div>{filtered.length === 0 && <p role="status">{text(locale, { zh: '没有找到角色。', en: 'No characters found.', ja: 'キャラが見つかりません。' })}</p>}
    </div>}
    {characters[0] && characters[1] ? <CompareResults catalog={catalog} characters={[characters[0], characters[1]]} locale={locale} /> : <p className="compare-tool__empty" role="status">{text(locale, { zh: '尚未选齐两位角色。', en: 'Two characters have not been selected.', ja: '2人のキャラが未選択です。' })}</p>}
    <noscript><style>{'.compare-tool__slots, .compare-tool__controls, .compare-tool__selector, .compare-tool__empty { display: none; }'}</style><ul className="compare-tool__fallback">{catalog.characters.map(character => <li key={character.id}><Link href={`/${locale}/genshin/characters/${character.id}`}>{compareName(character, locale)}</Link></li>)}</ul></noscript>
  </section>;
}
