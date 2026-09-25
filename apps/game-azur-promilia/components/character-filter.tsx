'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AzurPromiliaCharacter } from '@gachia/data/games/azur-promilia';
import type { SupportedLocale } from '@gachia/core';
import { sourceStatusLabel } from '@/lib/data';

export function CharacterFilter({ characters, locale }: { characters: AzurPromiliaCharacter[]; locale: SupportedLocale }) {
  const [element, setElement] = useState('all');
  const [profession, setProfession] = useState('all');
  const [weapon, setWeapon] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [battleType, setBattleType] = useState('all');
  const [region, setRegion] = useState('all');
  const filtered = useMemo(() => characters.filter((character) =>
    (element === 'all' || character.beta.element === element) &&
    (profession === 'all' || character.beta.profession === profession) &&
    (weapon === 'all' || character.beta.weaponType === weapon) &&
    (rarity === 'all' || String(character.beta.rarity) === rarity) &&
    (battleType === 'all' || character.beta.battleTypes.includes(battleType)) &&
    (region === 'all' || character.officialRegion === region),
  ), [characters, element, profession, weapon, rarity, battleType, region]);
  const options = (key: 'element' | 'profession' | 'weaponType') => [...new Set(characters.map((character) => character.beta[key]))].sort();
  const battleTypes = [...new Set(characters.flatMap((character) => character.beta.battleTypes))].sort();
  const regions = [...new Set(characters.flatMap((character) => character.officialRegion ? [character.officialRegion] : []))].sort();
  const labels = { zh: { all: '全部', element: '元素', profession: '职业', weapon: '武器', rarity: '稀有度', battle: '战斗类型', region: '官方关联地', results: '条结果', pending: '地区待确认' }, en: { all: 'All', element: 'Element', profession: 'Profession', weapon: 'Weapon', rarity: 'Rarity', battle: 'Battle type', region: 'Official region', results: ' results', pending: 'Region pending' }, ja: { all: 'すべて', element: '属性', profession: '職業', weapon: '武器', rarity: 'レアリティ', battle: '戦闘タイプ', region: '公式関連地域', results: '件', pending: '地域確認待ち' } }[locale];
  return <>
    <div className="filter-bar" aria-label="Character filters">
      {([[element, setElement, 'element', labels.element], [profession, setProfession, 'profession', labels.profession], [weapon, setWeapon, 'weaponType', labels.weapon]] as const).map(([value, setter, key, label]) => <label key={key}>{label}<select value={value} onChange={(event) => setter(event.target.value)}><option value="all">{labels.all}</option>{options(key).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
      <label>{labels.rarity}<select value={rarity} onChange={(event) => setRarity(event.target.value)}><option value="all">{labels.all}</option><option value="5">5★</option><option value="4">4★</option></select></label><label>{labels.battle}<select value={battleType} onChange={(event) => setBattleType(event.target.value)}><option value="all">{labels.all}</option>{battleTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>{labels.region}<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">{labels.all}</option>{regions.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
    </div>
    <p className="card__meta">{filtered.length}{labels.results}</p>
    <section className="grid">{filtered.map((character) => <Link className="card" href={`/${locale}/azur-promilia/characters/${character.id}`} key={character.id}><div className="card__title">{character.name[locale]}</div><div className="card__meta">{character.beta.element} · {character.beta.rarity}★ · {character.beta.profession} · {character.beta.weaponType}</div><div className="card__meta">{character.officialRegion ?? labels.pending}</div><div className="card__badge">{sourceStatusLabel(character.officialSource ? 'official' : 'reference', locale)}</div></Link>)}</section>
    {filtered.length === 0 && <p className="notice">No characters match the selected filters.</p>}
  </>;
}
