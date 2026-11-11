'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { text } from '../lib/i18n';
import { CHARACTER_LEVELS, TALENT_LEVELS, DEFAULT_RANGE, DEFAULT_DAMAGE, OWNED_MATERIALS_KEY, calculateMaterials, calculateDamage, ownedQuantity, parseOwnedMaterials } from '../lib/calculator';
import type { CalculatorCatalog, CalculatorCharacter, DamageStats, MaterialRange } from '../lib/calculator';
import { CalculatorResults } from './calculator-results';
import { MaterialPlanner } from './material-planner';

type Tab = 'ascension' | 'planner' | 'damage' | 'watchlist';
const TABS: Tab[] = ['ascension', 'planner', 'damage', 'watchlist'];
const ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'dendro', 'anemo', 'geo'];
const ELEMENT_NAMES: Record<string, [string, string, string]> = { pyro: ['火', 'Pyro', '炎'], hydro: ['水', 'Hydro', '水'], electro: ['雷', 'Electro', '雷'], cryo: ['冰', 'Cryo', '氷'], dendro: ['草', 'Dendro', '草'], anemo: ['风', 'Anemo', '風'], geo: ['岩', 'Geo', '岩'] };
const nameOf = (character: CalculatorCharacter, locale: SupportedLocale) => locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa || character.nameEn : character.nameEn;

export function GenshinCalculator({ catalog, locale }: { catalog: CalculatorCatalog; locale: SupportedLocale }) {
  const t = (zh: string, en: string, ja: string) => text(locale, { zh, en, ja });
  const [tab, setTab] = useState<Tab>('ascension');
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false), [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    try { setOwned(parseOwnedMaterials(localStorage.getItem(OWNED_MATERIALS_KEY))); }
    catch { setStorageFailed(true); }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => {
    if (!loaded || storageFailed) return;
    try { localStorage.setItem(OWNED_MATERIALS_KEY, JSON.stringify(owned)); }
    catch { setStorageFailed(true); }
  }, [loaded, owned, storageFailed]);
  const updateOwned = (id: string, quantity: number) => setOwned(current => ({ ...current, [id]: ownedQuantity(quantity) }));
  const tabName = (value: Tab) => value === 'ascension' ? t('养成材料', 'Ascension', '育成素材') : value === 'planner' ? t('多角色规划', 'Multi-character plan', '複数キャラ計画') : value === 'damage' ? t('伤害计算', 'Damage', 'ダメージ') : t('刷取清单', 'Farming list', '周回リスト');
  return <section className="calculator" aria-label={t('原神计算器', 'Genshin calculator', '原神計算機')}>
    <noscript><style>{'.calculator__interactive{display:none!important}'}</style><ul className="build-tool__fallback">{catalog.characters.map(character => <li key={character.id}><Link href={`/${locale}/genshin/characters/${character.id}`}>{nameOf(character, locale)}</Link></li>)}</ul></noscript>
    <div className="calculator__interactive">
      <div role="tablist" aria-label={t('计算模式', 'Calculation mode', '計算モード')} className="calculator__tabs">{TABS.map(value => <button type="button" key={value} id={`calc-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls={`calc-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
        const index = TABS.indexOf(value);
        const next = event.key === 'ArrowRight' ? TABS[(index + 1) % TABS.length] : event.key === 'ArrowLeft' ? TABS[(index + TABS.length - 1) % TABS.length] : event.key === 'Home' ? TABS[0] : event.key === 'End' ? TABS[TABS.length - 1] : undefined;
        if (next) { event.preventDefault(); setTab(next); document.getElementById(`calc-tab-${next}`)?.focus(); }
      }}>{tabName(value)}</button>)}</div>
      <div className="calculator__storage"><p role={storageFailed ? 'status' : undefined}>{storageFailed ? t('库存存储不可用或记录损坏，本次修改仅在当前页面保留。', 'Inventory storage is unavailable or invalid; changes remain on this page only.', '在庫の保存が利用できないかデータが無効です。変更はこのページ内のみ保持されます。') : t('库存仅保存在当前浏览器。', 'Inventory is saved only in this browser.', '在庫はこのブラウザにのみ保存されます。')}</p><button type="button" disabled={!loaded} onClick={() => setOwned({})}>{t('重置库存', 'Reset inventory', '在庫をリセット')}</button></div>
      {TABS.map(value => <div id={`calc-panel-${value}`} key={value} role="tabpanel" aria-labelledby={`calc-tab-${value}`} hidden={tab !== value}>
        {value === 'ascension' || value === 'planner' ? <MaterialCalculation catalog={catalog} locale={locale} multi={value === 'planner'} owned={owned} onOwned={updateOwned} /> : value === 'damage' ? <DamageCalculation locale={locale} /> : <MaterialPlanner materials={catalog.materials} locale={locale} />}
      </div>)}
    </div>
  </section>;
}

function MaterialCalculation({ catalog, locale, multi, owned, onOwned }: {
  catalog: CalculatorCatalog; locale: SupportedLocale; multi: boolean; owned: Record<string, number>; onOwned: (id: string, value: number) => void;
}) {
  const t = (zh: string, en: string, ja: string) => text(locale, { zh, en, ja });
  const [selected, setSelected] = useState<string[]>([]), [showSelector, setShowSelector] = useState(true);
  const [query, setQuery] = useState(''), [element, setElement] = useState('all');
  const [range, setRange] = useState<MaterialRange>(DEFAULT_RANGE);
  const characters = catalog.characters.filter(character => (element === 'all' || character.element === element)
    && [character.id, character.name, character.nameEn, character.nameJa || ''].some(name => name.toLowerCase().includes(query.trim().toLowerCase())));
  const result = useMemo(() => calculateMaterials(catalog.requirements, selected, range), [catalog.requirements, selected, range]);
  const select = (id: string) => {
    setSelected(current => multi ? current.includes(id) ? current.filter(value => value !== id) : [...current, id] : [id]);
    if (!multi) { setShowSelector(false); setQuery(''); setElement('all'); }
  };
  const setBoundary = (key: keyof MaterialRange, value: number) => setRange(current => {
    const next = { ...current, [key]: value };
    if (key === 'from' && value > next.to) next.to = value;
    if (key === 'to' && value < next.from) next.from = value;
    if (key === 'talentFrom' && value > next.talentTo) next.talentTo = value;
    if (key === 'talentTo' && value < next.talentFrom) next.talentFrom = value;
    return next;
  });
  return <div>
    {selected.length > 0 && <div className="calculator__selected"><ul>{selected.map(id => {
      const character = catalog.characters.find(row => row.id === id)!;
      return <li key={id}><img src={character.image} alt="" width="40" height="40" /><Link href={`/${locale}/genshin/characters/${id}`}>{nameOf(character, locale)}</Link>{multi && <button type="button" aria-label={`${t('移除', 'Remove', '削除')}: ${nameOf(character, locale)}`} title={t('移除', 'Remove', '削除')} onClick={() => setSelected(current => current.filter(value => value !== id))}>×</button>}</li>;
    })}</ul><button type="button" onClick={() => { if (multi) setSelected([]); else { setShowSelector(true); setQuery(''); setElement('all'); } }}>{multi ? t('清空角色', 'Clear characters', 'キャラをクリア') : t('更换角色', 'Change character', 'キャラを変更')}</button></div>}
    {showSelector && <div className="calculator__selector"><div className="calculator__filters"><label>{t('搜索角色', 'Search characters', 'キャラを検索')}<input aria-label={t('搜索角色', 'Search characters', 'キャラを検索')} value={query} onChange={event => setQuery(event.target.value)} /></label><label>{t('元素', 'Element', '元素')}<select aria-label={t('元素', 'Element', '元素')} value={element} onChange={event => setElement(event.target.value)}><option value="all">{t('全部', 'All', 'すべて')}</option>{ELEMENTS.map(value => <option key={value} value={value}>{t(...ELEMENT_NAMES[value]!)}</option>)}</select></label></div>
      <div className="calculator__count"><span>{characters.length} / {catalog.characters.length}</span><button type="button" onClick={() => { setQuery(''); setElement('all'); }}>{t('清除筛选', 'Clear filters', '絞り込みを解除')}</button></div>
      {!characters.length && <p role="status">{t('没有找到角色。', 'No characters found.', '該当するキャラがいません。')}</p>}
      <div className="calculator__roster">{characters.map(character => <button type="button" key={character.id} data-character-id={character.id} aria-pressed={selected.includes(character.id)} onClick={() => select(character.id)}><img src={character.image} alt="" width="44" height="44" loading="lazy" /><span>{nameOf(character, locale)}</span><small>{character.rarity}★</small></button>)}</div>
    </div>}
    {selected.length > 0 && <>
      <div className="calculator__ranges">{(['character', 'talent'] as const).map(kind => {
        const title = kind === 'character' ? t('角色等级', 'Character level', 'キャラレベル') : t('天赋等级', 'Talent level', '天賦レベル');
        const keys: Array<keyof MaterialRange> = kind === 'character' ? ['from', 'to'] : ['talentFrom', 'talentTo'];
        return <fieldset key={kind}><legend>{title}</legend>{keys.map((key, index) => {
          const label = index === 0 ? t('起始', 'From', '開始') : t('目标', 'To', '目標');
          return <label key={key}>{label}<select aria-label={`${title}: ${label}`} value={range[key]} onChange={event => setBoundary(key, Number(event.target.value))}>{(kind === 'character' ? CHARACTER_LEVELS : TALENT_LEVELS).map(level => <option key={level} value={level}>{level}</option>)}</select></label>;
        })}</fieldset>;
      })}</div>
      <p className="calculator__scope">{t('仅汇总已收录的突破与单项天赋材料；不包含未收录的升级经验或其他消耗，缺资料角色会单独列出。', 'Totals cover recorded ascension and one talent only, not unrecorded level-up EXP or other costs. Characters without requirements are listed separately.', '登録済みの突破と天賦1項目の素材のみを集計します。未登録のレベル経験値などは含まれず、資料のないキャラは別に表示します。')}</p>
      <CalculatorResults catalog={catalog} result={result} owned={owned} onOwned={onOwned} locale={locale} />
    </>}
  </div>;
}

function DamageCalculation({ locale }: { locale: SupportedLocale }) {
  const t = (zh: string, en: string, ja: string) => text(locale, { zh, en, ja });
  const [stats, setStats] = useState<Record<keyof DamageStats, string>>(() => Object.fromEntries(Object.entries(DEFAULT_DAMAGE).map(([key, value]) => [key, String(value)])) as Record<keyof DamageStats, string>);
  const numeric = Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, value.trim() === '' ? NaN : Number(value)])) as DamageStats;
  const result = calculateDamage(numeric);
  const fields: Array<[keyof DamageStats, string]> = [
    ['baseAtk', t('基础攻击力', 'Base ATK', '基礎攻撃力')], ['atkPercent', t('攻击力 %', 'ATK %', '攻撃力 %')], ['flatAtk', t('固定攻击力', 'Flat ATK', '固定攻撃力')],
    ['critRate', t('暴击率 %', 'CRIT rate %', '会心率 %')], ['critDmg', t('暴击伤害 %', 'CRIT damage %', '会心ダメージ %')], ['dmgBonus', t('伤害加成 %', 'DMG bonus %', 'ダメージ加算 %')], ['skillMult', t('技能倍率 %', 'Skill multiplier %', 'スキル倍率 %')],
  ];
  return <div className="calculator__damage"><div className="calculator__damage-inputs">{fields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max={key === 'critRate' ? 100 : undefined} step="any" value={stats[key]} onChange={event => setStats(current => ({ ...current, [key]: event.target.value }))} /></label>)}<button type="button" onClick={() => setStats(Object.fromEntries(Object.entries(DEFAULT_DAMAGE).map(([key, value]) => [key, String(value)])) as Record<keyof DamageStats, string>)}>{t('恢复默认', 'Reset stats', '初期値に戻す')}</button></div>
    <div aria-live="polite">{result ? <dl className="calculator__damage-results">{([
      ['totalAtk', t('总攻击力', 'Total ATK', '合計攻撃力')], ['average', t('期望伤害', 'Average damage', '期待ダメージ')],
      ['critical', t('暴击伤害', 'Critical damage', '会心ダメージ')], ['critValue', t('暴击期望', 'CRIT value', '会心価値')],
    ] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd data-damage-result={key}>{result[key].toFixed(key === 'critValue' ? 1 : 0)}</dd></div>)}</dl> : <p role="status">{t('请输入有限的非负数；暴击率须在 0–100% 之间。', 'Enter finite, non-negative numbers; CRIT rate must be between 0 and 100%.', '有限の非負数を入力してください。会心率の範囲は0〜100%です。')}</p>}
      <p className="calculator__scope">{t('简化公式，不含敌方防御、抗性、反应和特殊机制。', 'Simplified formula, excluding enemy DEF, resistance, reactions, and special mechanics.', '敵の防御、耐性、反応、特殊効果を含まない簡易計算です。')}</p><p className="calculator__formula">TotalATK × Skill% × (1 + DMG%) × (1 + CR% × CD%)</p>
    </div>
  </div>;
}
