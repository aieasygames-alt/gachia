'use client';

import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import type { AzurPromiliaCharacter } from '@gachia/data/games/azur-promilia';

export function ProgressionPlanner({ characters, locale }: { characters: AzurPromiliaCharacter[]; locale: SupportedLocale }) {
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? '');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(20);
  const character = useMemo(() => characters.find((entry) => entry.id === characterId), [characters, characterId]);
  const levelGap = Math.max(0, targetLevel - currentLevel);
  const labels = {
    zh: { character: '角色', current: '当前等级', target: '目标等级', result: '规划结果', gap: '等级缺口', source: '材料数值尚未核验，当前仅提供目标规划骨架。', steps: '建议下一步', step1: '确认正式版本等级与突破规则', step2: '补充官方核验的材料与获取地点', step3: '再开启精确缺口计算' },
    en: { character: 'Character', current: 'Current level', target: 'Target level', result: 'Plan result', gap: 'Level gap', source: 'Material quantities are not verified yet; this is a planning scaffold.', steps: 'Next steps', step1: 'Confirm release level and ascension rules', step2: 'Add officially verified materials and sources', step3: 'Enable exact shortage calculations afterward' },
    ja: { character: 'キャラクター', current: '現在レベル', target: '目標レベル', result: '計画結果', gap: 'レベル差', source: '素材数量は未確認のため、現在は計画用の骨組みのみです。', steps: '次のステップ', step1: '正式版のレベルと突破仕様を確認', step2: '公式確認済み素材と入手先を追加', step3: 'その後に正確な不足数計算を有効化' },
  }[locale];
  return <section className="planner"><h2>{labels.result}</h2><div className="filter-bar"><label>{labels.character}<select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name[locale]}</option>)}</select></label><label>{labels.current}<input type="number" min={1} max={100} value={currentLevel} onChange={(event) => setCurrentLevel(Number(event.target.value))} /></label><label>{labels.target}<input type="number" min={1} max={100} value={targetLevel} onChange={(event) => setTargetLevel(Number(event.target.value))} /></label></div><div className="facts"><div><span>{labels.character}</span><strong>{character?.name[locale] ?? '-'}</strong></div><div><span>{labels.gap}</span><strong>{levelGap}</strong></div></div><p className="notice">{labels.source}</p><h3>{labels.steps}</h3><ol><li>{labels.step1}</li><li>{labels.step2}</li><li>{labels.step3}</li></ol></section>;
}
