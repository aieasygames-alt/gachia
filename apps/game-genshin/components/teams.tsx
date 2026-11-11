'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { emptyTeam, fillTeam, filterTeamCharacters, plannedResonances, recommendTeams, setTeamSlot, teamElements, teamName, teamResonances, type TeamCharacter, type TeamRecommendation } from '../lib/teams';
import { text } from '../lib/i18n';
import { TeamRecommendations } from './team-recommendations';

export function TeamBuilder({ characters, locale }: { characters: TeamCharacter[]; locale: SupportedLocale }) {
  const [team, setTeam] = useState(emptyTeam);
  const [slot, setSlot] = useState<number | null>(0);
  const [query, setQuery] = useState('');
  const [element, setElement] = useState('all');
  const [mode, setMode] = useState<'builder' | 'recommended'>('builder');
  const [notice, setNotice] = useState('');
  const search = useRef<HTMLInputElement>(null), slots = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const filtered = filterTeamCharacters(characters, query, element), recommendations = recommendTeams(characters, team);
  const quick = recommendTeams(characters, emptyTeam()).slice(0, 6), resonances = plannedResonances(characters, team);
  const chooseLabel = (index: number) => text(locale, { zh: `选择角色 ${index + 1}`, en: `Select character ${index + 1}`, ja: `キャラ${index + 1}を選択` });
  const close = () => { const previous = slot; setSlot(null); if (previous !== null) requestAnimationFrame(() => slots.current[previous]?.focus()); };
  const open = (index: number) => { setMode('builder'); setSlot(index); setQuery(''); setElement('all'); requestAnimationFrame(() => search.current?.focus()); };
  const useTeam = (recommendation: TeamRecommendation) => {
    const next = fillTeam(characters, recommendation.members); setTeam(next); setSlot(null); setMode('builder');
    setNotice(text(locale, { zh: `已填入 ${next.filter(Boolean).length}/4 个角色。`, en: `${next.filter(Boolean).length}/4 characters filled.`, ja: `${next.filter(Boolean).length}/4人を配置しました。` }));
    requestAnimationFrame(() => slots.current[0]?.focus());
  };
  return <section className="teams-tool" aria-label={text(locale, { zh: '配队模拟器', en: 'Team builder', ja: 'パーティ編成' })}>
    <div className="teams-tool__toolbar"><div role="tablist" aria-label={text(locale, { zh: '配队模式', en: 'Team mode', ja: '編成モード' })}>{(['builder', 'recommended'] as const).map((value, index) => <button key={value} type="button" role="tab" id={`teams-tab-${value}`} aria-selected={mode === value} tabIndex={mode === value ? 0 : -1} aria-controls="teams-panel" ref={node => { tabs.current[index] = node; }} onClick={() => { setMode(value); setSlot(null); }} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
      setMode(next === 0 ? 'builder' : 'recommended'); setSlot(null); tabs.current[next]?.focus();
    }}>{text(locale, value === 'builder' ? { zh: '自定义队伍', en: 'Custom team', ja: 'カスタム編成' } : { zh: '推荐队伍', en: 'Team references', ja: 'おすすめ編成' })}</button>)}</div>
      <button type="button" disabled={!team.some(Boolean)} onClick={() => { setTeam(emptyTeam()); setNotice(''); open(0); }}>{text(locale, { zh: '清空队伍', en: 'Clear team', ja: '編成をクリア' })}</button></div>
    <div className="teams-tool__slots">{team.map((id, index) => {
      const character = characters.find(row => row.id === id);
      const remove = text(locale, { zh: `移除角色 ${index + 1}`, en: `Remove character ${index + 1}`, ja: `キャラ${index + 1}を外す` });
      return <article key={index} data-slot={index + 1}><span className="teams-tool__slot-label">0{index + 1}</span><div className="teams-tool__identity">{character ? <><img src={character.image} alt="" width={64} height={64} /><h2>{teamName(character, locale)}</h2><span className="meta">{character.rarity}★ · {teamElements[character.element]?.[locale] ?? character.element}</span><Link href={`/${locale}/genshin/characters/${id}`}>{text(locale, { zh: '角色资料', en: 'Profile', ja: 'キャラ資料' })}</Link></> : <span className="meta">{text(locale, { zh: '空位', en: 'Empty slot', ja: '空き枠' })}</span>}</div>
        <div className="teams-tool__slot-actions"><button type="button" ref={node => { slots.current[index] = node; }} aria-label={chooseLabel(index)} aria-expanded={slot === index && mode === 'builder'} aria-controls="teams-selector" onClick={() => slot === index && mode === 'builder' ? close() : open(index)}>{character ? text(locale, { zh: '更换', en: 'Change', ja: '変更' }) : <><span aria-hidden="true">+</span> {text(locale, { zh: '选择', en: 'Select', ja: '選択' })}</>}</button>{character && <button className="teams-tool__icon" type="button" title={remove} aria-label={remove} onClick={() => { setTeam(current => setTeamSlot(current, index, '')); setNotice(''); open(index); }}><span aria-hidden="true">×</span></button>}</div>
      </article>;
    })}</div>
    <p role="status" className="teams-tool__notice">{notice || text(locale, { zh: `已选 ${team.filter(Boolean).length}/4 个角色`, en: `${team.filter(Boolean).length}/4 characters selected`, ja: `${team.filter(Boolean).length}/4人を選択中` })}</p>
    <div className="teams-tool__resonances"><h2>{text(locale, { zh: '共鸣组合预览', en: 'Planned resonance', ja: '共鳴の組み合わせ' })}</h2>{resonances.length ? <ul>{resonances.map(key => <li key={key} data-resonance={key}>{text(locale, teamResonances[key]!)}</li>)}</ul> : <p className="meta">{text(locale, { zh: '暂无共鸣组合', en: 'No resonance combination', ja: '共鳴の組み合わせはありません' })}</p>}
      {team.filter(Boolean).length < 4 && <p className="meta">{text(locale, { zh: '队伍尚未满员，共鸣需四人队伍。', en: 'The party is incomplete; resonance requires four members.', ja: '編成は未完成です。共鳴には4人が必要です。' })}</p>}</div>
    <div role="tabpanel" id="teams-panel" aria-labelledby={`teams-tab-${mode}`} tabIndex={0}>
      {mode === 'builder' && slot !== null && <div id="teams-selector" className="teams-tool__selector" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
        <header><h2>{chooseLabel(slot)}</h2><button type="button" className="teams-tool__icon" title={text(locale, { zh: '关闭选择', en: 'Close selector', ja: '選択を閉じる' })} aria-label={text(locale, { zh: '关闭选择', en: 'Close selector', ja: '選択を閉じる' })} onClick={close}><span aria-hidden="true">×</span></button></header>
        <div className="teams-tool__filters"><label>{text(locale, { zh: '搜索角色', en: 'Search characters', ja: 'キャラを検索' })}<input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><label>{text(locale, { zh: '元素', en: 'Element', ja: '元素' })}<select aria-label={text(locale, { zh: '元素', en: 'Element', ja: '元素' })} value={element} onChange={event => setElement(event.target.value)}><option value="all">{text(locale, { zh: '全部元素', en: 'All elements', ja: 'すべての元素' })}</option>{Object.entries(teamElements).map(([key, labels]) => <option key={key} value={key}>{text(locale, labels)}</option>)}</select></label></div>
        <div className="teams-tool__count"><span role="status">{filtered.length} / {characters.length}</span><button type="button" onClick={() => { setQuery(''); setElement('all'); }}>{text(locale, { zh: '清除筛选', en: 'Clear filters', ja: '絞り込みを解除' })}</button></div>
        <div className="teams-tool__roster">{filtered.map(character => <button type="button" key={character.id} data-roster-id={character.id} aria-pressed={team[slot] === character.id} disabled={team.some((id, index) => index !== slot && id === character.id)} onClick={() => { setTeam(current => setTeamSlot(current, slot, character.id)); setNotice(''); close(); }}><img src={character.image} alt="" width={48} height={48} loading="lazy" /><span>{teamName(character, locale)}</span><small>{character.rarity}★</small></button>)}</div>
        {!filtered.length && <p role="status">{text(locale, { zh: '没有找到角色。', en: 'No characters found.', ja: 'キャラが見つかりません。' })}</p>}
      </div>}
      <h2>{text(locale, mode === 'builder' ? { zh: '快速填入', en: 'Quick fill', ja: 'クイック編成' } : { zh: '推荐队伍', en: 'Team references', ja: 'おすすめ編成' })}</h2>
      <TeamRecommendations characters={characters} recommendations={mode === 'builder' ? quick : recommendations} locale={locale} onUse={useTeam} />
    </div>
    <noscript><style>{'.teams-tool__toolbar, .teams-tool__slots, .teams-tool__notice, .teams-tool__resonances, #teams-panel { display: none; }'}</style><ul className="teams-tool__fallback">{characters.map(character => <li key={character.id}><Link href={`/${locale}/genshin/characters/${character.id}`}>{teamName(character, locale)}</Link></li>)}</ul></noscript>
  </section>;
}
