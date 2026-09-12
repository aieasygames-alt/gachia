'use client';

import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import type { AzurPromiliaCharacter } from '@gachia/data/games/azur-promilia';
import type { Kibo } from '@/lib/data';
import { kiboLabel } from '@/lib/data';

export function CharacterKiboMatch({ characters, kibo, locale }: { characters: AzurPromiliaCharacter[]; kibo: Kibo[]; locale: SupportedLocale }) {
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? '');
  const character = characters.find((entry) => entry.id === characterId);
  const matches = useMemo(() => character ? kibo.filter((entry) => entry.element === character.beta.element || entry.lifeSkills.some((skill) => character.beta.battleTypes.includes(skill))) : [], [character, kibo]);
  const labels = { zh: { title: '角色与 Kibo 参考', character: '选择角色', empty: '暂无按元素或战斗标签匹配的 Kibo。', note: '匹配仅依据 CBT 元素和公开标签，不代表正式配队或强度结论。', element: '元素匹配', life: '生活技能' }, en: { title: 'Character and Kibo Reference', character: 'Choose a character', empty: 'No Kibo matches the current element or battle tags.', note: 'Matches use CBT elements and public tags only; they are not final teams or power rankings.', element: 'Element match', life: 'Life skills' }, ja: { title: 'キャラクターとキボ参照', character: 'キャラクターを選択', empty: '現在の属性または戦闘タグに一致するキボはありません。', note: 'CBT属性と公開タグだけに基づく参照で、正式編成や強さの結論ではありません。', element: '属性一致', life: '生活技能' } }[locale];
  return <section className="compare"><h2>{labels.title}</h2><label className="compare__select">{labels.character}<select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name[locale]}</option>)}</select></label><p className="notice">{labels.note}</p>{matches.length ? <section className="grid">{matches.map((entry) => <article className="card" key={entry.id}><div className="card__title">{entry.name[locale]}</div><div className="card__meta">{entry.element === character?.beta.element ? labels.element : labels.life}</div><p>{entry.description[locale]}</p><p className="card__meta">{labels.life}: {entry.lifeSkills.map((skill) => kiboLabel(skill, locale)).join(', ')}</p></article>)}</section> : <p className="card__meta">{labels.empty}</p>}</section>;
}
