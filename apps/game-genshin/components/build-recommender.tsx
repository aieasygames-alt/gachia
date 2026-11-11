'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { buildCharacterName, filterBuildCharacters, type BuildCatalog } from '../lib/build-catalog';
import { text } from '../lib/i18n';
import { BuildDetails } from './build-details';

export function BuildRecommender({ catalog, locale }: { catalog: BuildCatalog; locale: SupportedLocale }) {
  const [selectedId, setSelectedId] = useState('');
  const [selecting, setSelecting] = useState(true);
  const [query, setQuery] = useState('');
  const [element, setElement] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [copyStatus, setCopyStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const copyAttempt = useRef(0);
  const search = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = catalog.characters.find(character => character.id === selectedId);
  const filtered = filterBuildCharacters(catalog.characters, query, element, rarity);
  const elements = [
    ['pyro', { zh: '火', en: 'Pyro', ja: '炎' }], ['hydro', { zh: '水', en: 'Hydro', ja: '水' }],
    ['electro', { zh: '雷', en: 'Electro', ja: '雷' }], ['cryo', { zh: '冰', en: 'Cryo', ja: '氷' }],
    ['dendro', { zh: '草', en: 'Dendro', ja: '草' }], ['anemo', { zh: '风', en: 'Anemo', ja: '風' }],
    ['geo', { zh: '岩', en: 'Geo', ja: '岩' }],
  ] as const;
  const copyLabel = text(locale, { zh: '复制配装链接', en: 'Copy build link', ja: 'ビルドリンクをコピー' });
  const weaponTypes: Record<string, Record<SupportedLocale, string>> = {
    sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' }, claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
    polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' }, bow: { zh: '弓', en: 'Bow', ja: '弓' }, catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
  };
  useEffect(() => {
    const read = () => {
      let id = '';
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { /* Ignore malformed legacy fragments. */ }
      const valid = catalog.characters.some(character => character.id === id);
      copyAttempt.current++;
      setSelectedId(valid ? id : ''); setSelecting(!valid); setCopyStatus(''); setShareUrl('');
    };
    read(); window.addEventListener('hashchange', read);
    return () => { copyAttempt.current++; window.removeEventListener('hashchange', read); };
  }, [catalog]);
  const choose = (id: string) => {
    copyAttempt.current++; setSelectedId(id); setSelecting(false); setCopyStatus(''); setShareUrl('');
    setQuery(''); setElement('all'); setRarity('all');
    window.location.hash = id;
    requestAnimationFrame(() => heading.current?.focus());
  };
  const copy = async () => {
    if (!selected) return;
    const attempt = ++copyAttempt.current;
    const url = new URL(window.location.href); url.search = ''; url.hash = selected.id;
    setShareUrl(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      if (attempt === copyAttempt.current) setCopyStatus(text(locale, { zh: '链接已复制。', en: 'Link copied.', ja: 'リンクをコピーしました。' }));
    } catch {
      if (attempt === copyAttempt.current) setCopyStatus(text(locale, { zh: '无法复制，可选择下方链接。', en: 'Could not copy. Select the link below.', ja: 'コピーできません。下のリンクを選択してください。' }));
    }
  };
  return <section className="build-tool" aria-label={text(locale, { zh: '角色配装', en: 'Character builds', ja: 'キャラビルド' })}>
    {selected && <header className="build-tool__selected"><img src={selected.image} alt="" width={72} height={72} /><div>
      <h2 ref={heading} tabIndex={-1}>{buildCharacterName(selected, locale)}</h2><span className="meta">{selected.rarity}★ · {elements.find(([id]) => id === selected.element) ? text(locale, elements.find(([id]) => id === selected.element)![1]) : selected.element} · {weaponTypes[selected.weaponType]?.[locale] ?? selected.weaponType}</span>
      <Link href={`/${locale}/genshin/characters/${selected.id}`}>{text(locale, { zh: '角色资料', en: 'Character profile', ja: 'キャラ資料' })}</Link>
    </div><div className="build-tool__actions"><button type="button" aria-expanded={selecting} onClick={() => { setSelecting(value => !value); requestAnimationFrame(() => search.current?.focus()); }}>{text(locale, { zh: '更换角色', en: 'Change character', ja: 'キャラを変更' })}</button>
      <button type="button" className="build-tool__copy" title={copyLabel} aria-label={copyLabel} onClick={copy}><span aria-hidden="true">⧉</span></button></div></header>}
    <div role="status" className="build-tool__copy-status">{copyStatus}</div>
    {shareUrl && <label className="build-tool__share">{text(locale, { zh: '配装链接', en: 'Build link', ja: 'ビルドリンク' })}<input readOnly value={shareUrl} onFocus={event => event.target.select()} /></label>}
    {selecting && <div className="build-tool__selector" id="build-selector"><div className="build-tool__filters">
      <label>{text(locale, { zh: '搜索角色', en: 'Search characters', ja: 'キャラを検索' })}<input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>{text(locale, { zh: '元素', en: 'Element', ja: '元素' })}<select aria-label={text(locale, { zh: '元素', en: 'Element', ja: '元素' })} value={element} onChange={event => setElement(event.target.value)}><option value="all">{text(locale, { zh: '全部元素', en: 'All elements', ja: 'すべての元素' })}</option>{elements.map(([id, label]) => <option value={id} key={id}>{text(locale, label)}</option>)}</select></label>
      <label>{text(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' })}<select aria-label={text(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' })} value={rarity} onChange={event => setRarity(event.target.value)}><option value="all">{text(locale, { zh: '全部稀有度', en: 'All rarities', ja: 'すべてのレアリティ' })}</option><option value="4">4★</option><option value="5">5★</option></select></label>
    </div><div className="build-tool__result-count"><span role="status">{filtered.length} / {catalog.characters.length}</span><button type="button" onClick={() => { setQuery(''); setElement('all'); setRarity('all'); }}>{text(locale, { zh: '清除筛选', en: 'Clear filters', ja: '絞り込みを解除' })}</button></div>
      <div className="build-tool__roster">{filtered.map(character => <button type="button" key={character.id} aria-pressed={selectedId === character.id} onClick={() => choose(character.id)}>
        <img src={character.image} alt="" width={48} height={48} loading="lazy" /><span>{buildCharacterName(character, locale)}</span><small>{character.rarity}★</small>
      </button>)}</div>
      {filtered.length === 0 && <p role="status">{text(locale, { zh: '没有找到角色。', en: 'No characters found.', ja: 'キャラが見つかりません。' })}</p>}
    </div>}
    {selected && <BuildDetails catalog={catalog} character={selected} locale={locale} />}
    <noscript><style>{'.build-tool__selector, .build-tool__copy-status { display: none; }'}</style><ul className="build-tool__fallback">{catalog.characters.map(character => <li key={character.id}><a href={`/${locale}/genshin/characters/${character.id}#recommended-build`}>{buildCharacterName(character, locale)}</a></li>)}</ul></noscript>
  </section>;
}
