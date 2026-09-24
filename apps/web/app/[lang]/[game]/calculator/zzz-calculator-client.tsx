'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { zzzCharacters, getZzzCharacterImage, getZzzCharacterName } from '@gachia/data/games/zzz/characters';
import { zzzWeapons, getZzzWeaponName } from '@gachia/data/games/zzz/weapons';
import { zzzMaterials, getZzzMaterialName } from '@gachia/data/games/zzz/items';

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

const LEVEL_COST = [
  { level: 20, scale: 0.16 }, { level: 30, scale: 0.32 }, { level: 40, scale: 0.50 },
  { level: 50, scale: 0.68 }, { level: 60, scale: 0.84 },
];
const SKILL_COST = [
  { level: 3, scale: 0.22 }, { level: 5, scale: 0.42 }, { level: 7, scale: 0.63 },
  { level: 9, scale: 0.82 }, { level: 11, scale: 1 },
];

export function ZzzCalculator({ locale }: { locale: SupportedLocale }) {
  const [selectedId, setSelectedId] = useState(zzzCharacters[0]?.id ?? '');
  const [targetLevel, setTargetLevel] = useState(60);
  const [targetSkill, setTargetSkill] = useState(11);
  const [targetCore, setTargetCore] = useState<'C' | 'E' | 'F'>('F');
  const [weaponId, setWeaponId] = useState('none');
  const [weaponLevel, setWeaponLevel] = useState(60);
  const [owned, setOwned] = useState<Record<string, number>>({});

  useEffect(() => {
    try { setOwned(JSON.parse(localStorage.getItem('gachia-zzz-owned-materials') ?? '{}')); } catch { /* ignore saved malformed data */ }
  }, []);

  const selected = zzzCharacters.find((character) => character.id === selectedId) ?? zzzCharacters[0];
  const weapon = zzzWeapons.find((item) => item.id === weaponId);
  const mats = useMemo(() => {
    const byType = (term: string) => zzzMaterials.find((item) => `${item.id} ${item.name} ${item.nameEn} ${item.type}`.toLowerCase().includes(term))?.id;
    const role = selected?.specialtyEn.toLowerCase() ?? 'attack';
    const attribute = selected?.attribute.toLowerCase() ?? 'physical';
    const levelScale = LEVEL_COST.find((entry) => entry.level === targetLevel)?.scale ?? 1;
    const skillScale = SKILL_COST.find((entry) => entry.level === targetSkill)?.scale ?? 1;
    const coreScale = targetCore === 'C' ? 0.55 : targetCore === 'E' ? 0.82 : 1;
    const definitions = [
      { id: byType('denny') ?? 'danny', qty: Math.round(400000 * levelScale + 300000 * skillScale + (weapon ? 120000 * (weaponLevel / 60) : 0)), group: 'currency' },
      { id: byType('investigator') ?? byType('exp') ?? 'investigator-log', qty: Math.round(300 * levelScale), group: 'level' },
      { id: byType(role) ?? byType('certification') ?? 'agent-certification-seal', qty: Math.round(60 * levelScale), group: 'promotion' },
      { id: byType(attribute) ?? byType('chip') ?? 'basic-chip', qty: Math.round(120 * skillScale), group: 'skills' },
      { id: byType('notorious') ?? byType('higher-dimensional') ?? 'core-skill-material', qty: Math.round(9 * coreScale), group: 'core' },
      ...(weapon ? [{ id: byType('w-engine') ?? byType('component') ?? 'w-engine-component', qty: Math.round(50 * (weaponLevel / 60)), group: 'weapon' }] : []),
    ];
    return definitions.map((entry) => {
      const item = zzzMaterials.find((material) => material.id === entry.id);
      const have = owned[entry.id] ?? 0;
      return { ...entry, item, have, missing: Math.max(0, entry.qty - have) };
    });
  }, [owned, selected?.attribute, selected?.specialtyEn, targetCore, targetLevel, targetSkill, weapon, weaponLevel]);

  const totalMissing = mats.reduce((sum, entry) => sum + entry.missing, 0);
  const updateOwned = (id: string, value: number) => {
    const next = { ...owned, [id]: Math.max(0, value) };
    setOwned(next);
    try { localStorage.setItem('gachia-zzz-owned-materials', JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  };

  return (
    <div className="space-y-6">
      <section className="border border-game-border bg-game-surface p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-game-primary">{t(locale, '代理人养成计划', 'Agent progression planner', 'エージェント育成計画')}</p>
        <h1 className="text-2xl font-bold text-game-text">{t(locale, '绝区零养成计划器', 'ZZZ Progression Planner', 'ZZZ 育成計画ツール')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-game-text-muted">{t(locale, '选择养成目标与库存，立即看到优先补齐的材料和建议刷取顺序。估算用于规划，实际消耗以游戏内为准。', 'Set targets and inventory to see material gaps and a farming order. Estimates are for planning; the client remains authoritative.', '目標と在庫から素材不足と周回順を確認できます。数値は計画用で、ゲーム内表示を基準にしてください。')}</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="border border-game-border bg-game-surface p-4">
          <label className="mb-2 block text-sm font-medium text-game-text">{t(locale, '代理人', 'Agent', 'エージェント')}</label>
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mb-5 w-full border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none focus:border-game-primary">
            {zzzCharacters.map((character) => <option key={character.id} value={character.id}>{getZzzCharacterName(character, locale)} · {character.specialtyEn}</option>)}
          </select>
          {selected && <div className="mb-5 flex items-center gap-3 border-l-2 border-game-primary bg-game-surface-alt p-3"><CharacterAvatar src={getZzzCharacterImage(selected)} alt={getZzzCharacterName(selected, locale)} element={selected.attribute} className="h-12 w-12 object-cover" /><div><p className="font-semibold text-game-text">{getZzzCharacterName(selected, locale)}</p><p className="text-xs text-game-text-muted">{selected.specialtyEn} · {selected.attribute}</p></div></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TargetSelect label={t(locale, '代理人等级', 'Agent level', 'エージェントLv.')} value={targetLevel} onChange={setTargetLevel} options={[20, 30, 40, 50, 60]} />
            <TargetSelect label={t(locale, '关键技能等级', 'Key skill level', '主要スキルLv.')} value={targetSkill} onChange={setTargetSkill} options={[3, 5, 7, 9, 11]} />
            <TargetSelect label={t(locale, '核心技目标', 'Core Skill target', 'コアスキル目標')} value={targetCore} onChange={(value) => setTargetCore(value as 'C' | 'E' | 'F')} options={['C', 'E', 'F']} />
            <TargetSelect label={t(locale, '音擎等级', 'W-Engine level', 'WエンジンLv.')} value={weaponLevel} onChange={setWeaponLevel} options={[20, 30, 40, 50, 60]} />
          </div>
          <label className="mt-4 mb-2 block text-sm font-medium text-game-text">{t(locale, '要一并培养的音擎', 'W-Engine to include', '一緒に育成するWエンジン')}</label>
          <select value={weaponId} onChange={(event) => setWeaponId(event.target.value)} className="w-full border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none focus:border-game-primary"><option value="none">{t(locale, '暂不计算音擎', 'Do not include a W-Engine', 'Wエンジンを含めない')}</option>{zzzWeapons.filter((item) => !selected || item.specialtyEn === selected.specialtyEn).map((item) => <option key={item.id} value={item.id}>{getZzzWeaponName(item, locale)}</option>)}</select>
        </section>

        <aside className="border border-game-primary/40 bg-game-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-game-primary">{t(locale, '本次缺口', 'Current gaps', '今回の不足')}</p>
          <p className="mt-2 text-4xl font-bold text-game-text">{totalMissing}</p>
          <p className="mt-1 text-sm text-game-text-muted">{t(locale, '件待补材料单位', 'material units to collect', '集める素材単位')}</p>
          <div className="mt-5 space-y-3 border-t border-game-border pt-4 text-sm">
            <p className="font-semibold text-game-text">{t(locale, '建议顺序', 'Suggested order', '推奨順')}</p>
            <ol className="space-y-2 text-game-text-muted"><li>1. {t(locale, '先补角色等级与突破，解锁关键技能上限。', 'Raise agent level and promotions first to unlock skill caps.', 'まずレベルと昇格を進め、スキル上限を解放。')}</li><li>2. {t(locale, '再投入核心技和主输出技能。', 'Then invest in Core Skill and primary damage skills.', '次にコアスキルと主力スキルへ。')}</li><li>3. {t(locale, '音擎最后和主角色同步补齐。', 'Finish the W-Engine alongside the main agent.', 'Wエンジンは主力と合わせて仕上げる。')}</li></ol>
          </div>
        </aside>
      </div>

      <section className="border border-game-border bg-game-surface">
        <div className="border-b border-game-border px-4 py-3"><h2 className="font-semibold text-game-text">{t(locale, '材料清单与库存', 'Materials and inventory', '素材一覧と在庫')}</h2></div>
        <div className="divide-y divide-game-border">{mats.map((entry) => <div key={`${entry.group}-${entry.id}`} className="grid grid-cols-[minmax(0,1fr)_4rem_5rem_5rem] items-center gap-3 px-4 py-3 text-sm"><div><p className="font-medium text-game-text">{entry.item ? getZzzMaterialName(entry.item, locale) : entry.id}</p><p className="text-xs text-game-text-muted">{entry.item?.source ?? t(locale, '按游戏内来源确认', 'Check in-game source', 'ゲーム内の入手先を確認')}</p></div><span className="text-right text-game-text-muted">{entry.qty}</span><input aria-label={`${entry.id} owned`} type="number" min="0" value={entry.have} onChange={(event) => updateOwned(entry.id, Number(event.target.value))} className="w-full border border-game-border bg-game-surface-alt px-2 py-1 text-right text-game-text outline-none focus:border-game-primary" /><span className={`text-right font-semibold ${entry.missing ? 'text-amber-300' : 'text-emerald-400'}`}>{entry.missing ? `-${entry.missing}` : t(locale, '足够', 'Ready', '十分')}</span></div>)}</div>
      </section>
    </div>
  );
}

function TargetSelect<T extends string | number>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: T[] }) {
  return <label className="block text-sm font-medium text-game-text">{label}<select value={value} onChange={(event) => onChange(event.target.value as T)} className="mt-2 w-full border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none focus:border-game-primary">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
