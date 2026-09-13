'use client';

import { useMemo, useState } from 'react';
import type { Kibo } from '@/lib/data';
import type { SupportedLocale } from '@gachia/core';
import { kiboLabel, kiboLifeSkills } from '@/lib/data';

export function KiboFilter({ entries, locale }: { entries: Kibo[]; locale: SupportedLocale }) {
  const [element, setElement] = useState('all');
  const [facility, setFacility] = useState('all');
  const [lifeSkill, setLifeSkill] = useState('all');
  const [battleTag, setBattleTag] = useState('all');
  const [catchable, setCatchable] = useState('all');
  const elements = [...new Set(entries.map((entry) => entry.element))].sort();
  const facilities = [...new Set(entries.flatMap((entry) => entry.facilities))].sort();
  const battleTags = [...new Set(entries.flatMap((entry) => entry.battleTags))].sort();
  const filtered = useMemo(() => entries.filter((entry) => (element === 'all' || entry.element === element) && (facility === 'all' || entry.facilities.includes(facility)) && (lifeSkill === 'all' || entry.lifeSkills.includes(lifeSkill)) && (battleTag === 'all' || entry.battleTags.includes(battleTag)) && (catchable === 'all' || String(entry.catchable) === catchable)), [entries, element, facility, lifeSkill, battleTag, catchable]);
  const text = { zh: { all: '全部', element: '元素', facility: '派遣设施', lifeSkill: '生活技能', battleTag: '战斗标签', catchable: '可捕捉', yes: '可捕捉', no: '待确认', count: '条结果', combat: '战斗', life: '生活技能', facilities: '设施' }, en: { all: 'All', element: 'Element', facility: 'Facility', lifeSkill: 'Life skill', battleTag: 'Battle tag', catchable: 'Catchable', yes: 'Catchable', no: 'Pending', count: ' results', combat: 'Combat', life: 'Life skills', facilities: 'Facilities' }, ja: { all: 'すべて', element: '属性', facility: '施設', lifeSkill: '生活技能', battleTag: '戦闘タグ', catchable: '捕獲可能', yes: '捕獲可能', no: '確認待ち', count: '件', combat: '戦闘', life: '生活技能', facilities: '施設' } }[locale];
  return <><div className="filter-bar kibo-filter"><label>{text.element}<select value={element} onChange={(event) => setElement(event.target.value)}><option value="all">{text.all}</option>{elements.map((value) => <option key={value}>{value}</option>)}</select></label><label>{text.facility}<select value={facility} onChange={(event) => setFacility(event.target.value)}><option value="all">{text.all}</option>{facilities.map((value) => <option key={value}>{kiboLabel(value, locale)}</option>)}</select></label><label>{text.lifeSkill}<select value={lifeSkill} onChange={(event) => setLifeSkill(event.target.value)}><option value="all">{text.all}</option>{kiboLifeSkills.map((value) => <option key={value.id} value={value.id}>{value.label[locale]}</option>)}</select></label><label>{text.battleTag}<select value={battleTag} onChange={(event) => setBattleTag(event.target.value)}><option value="all">{text.all}</option>{battleTags.map((value) => <option key={value}>{value}</option>)}</select></label><label>{text.catchable}<select value={catchable} onChange={(event) => setCatchable(event.target.value)}><option value="all">{text.all}</option><option value="true">{text.yes}</option><option value="false">{text.no}</option></select></label></div><p className="card__meta">{filtered.length}{text.count}</p><section className="grid">{filtered.map((entry) => <article className="card" key={entry.id}><div className="card__title">{entry.name[locale]}</div><div className="card__meta">{entry.species[locale]} · {entry.element} · {entry.mountType}</div><p>{entry.description[locale]}</p><p className="card__meta"><strong>{text.combat}:</strong> {entry.combatSkill[locale]} · {entry.battleTags.join(', ')}</p><p className="card__meta"><strong>{text.life}:</strong> {entry.lifeSkills.map((skill) => kiboLabel(skill, locale)).join(', ')}</p><p className="card__meta"><strong>{text.facilities}:</strong> {entry.facilities.map((value) => kiboLabel(value, locale)).join(', ')}</p></article>)}</section></>;
}
