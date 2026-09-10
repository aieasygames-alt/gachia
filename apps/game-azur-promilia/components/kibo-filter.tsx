'use client';

import { useMemo, useState } from 'react';
import type { Kibo } from '@/lib/data';
import type { SupportedLocale } from '@gachia/core';

export function KiboFilter({ entries, locale }: { entries: Kibo[]; locale: SupportedLocale }) {
  const [element, setElement] = useState('all');
  const [facility, setFacility] = useState('all');
  const elements = [...new Set(entries.map((entry) => entry.element))].sort();
  const facilities = [...new Set(entries.flatMap((entry) => entry.facilities))].sort();
  const filtered = useMemo(() => entries.filter((entry) => (element === 'all' || entry.element === element) && (facility === 'all' || entry.facilities.includes(facility))), [entries, element, facility]);
  const text = { zh: { all: '全部', element: '元素', facility: '派遣设施', count: '条结果' }, en: { all: 'All', element: 'Element', facility: 'Facility', count: ' results' }, ja: { all: 'すべて', element: '属性', facility: '施設', count: '件' } }[locale];
  return <><div className="filter-bar kibo-filter"><label>{text.element}<select value={element} onChange={(event) => setElement(event.target.value)}><option value="all">{text.all}</option>{elements.map((value) => <option key={value}>{value}</option>)}</select></label><label>{text.facility}<select value={facility} onChange={(event) => setFacility(event.target.value)}><option value="all">{text.all}</option>{facilities.map((value) => <option key={value}>{value}</option>)}</select></label></div><p className="card__meta">{filtered.length}{text.count}</p><section className="grid">{filtered.map((entry) => <article className="card" key={entry.id}><div className="card__title">{entry.name[locale]}</div><div className="card__meta">{entry.species[locale]} · {entry.element}</div><p>{entry.description[locale]}</p><p className="card__meta"><strong>Combat:</strong> {entry.combatSkill[locale]}</p><p className="card__meta"><strong>Life:</strong> {entry.lifeSkills.join(', ')}</p><p className="card__meta"><strong>Facilities:</strong> {entry.facilities.join(', ')}</p></article>)}</section></>;
}
