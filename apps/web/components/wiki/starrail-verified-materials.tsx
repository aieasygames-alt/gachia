'use client';

import { useState } from 'react';
import { calculateCharacterMaterials, fullCharacterMaterialPlan, type VerifiedStarRailCharacter, type CharacterMaterialPlan } from '@gachia/data/cms/starrail-character';

function Range({ label, from, to, min, max, onChange, stage = false }: { label: string; from: number; to: number; min: number; max: number; onChange: (from: number, to: number) => void; stage?: boolean }) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const options = (n: number) => stage ? `${n}次晋阶${n ? `（${10 + n * 10}级已突破）` : '（未突破）'}` : `Lv${n}`;
  return <fieldset className="space-y-2"><legend className="text-sm font-medium">{label}</legend><div className="flex flex-wrap items-center gap-2">
    <label className="text-sm">当前 <select aria-label={`${label}当前`} className="rounded border border-game-border bg-game-bg p-2" value={from} onChange={e => onChange(Number(e.target.value), Math.max(Number(e.target.value), to))}>{values.map(n => <option key={n} value={n}>{options(n)}</option>)}</select></label>
    <span aria-hidden="true">→</span>
    <label className="text-sm">目标 <select aria-label={`${label}目标`} className="rounded border border-game-border bg-game-bg p-2" value={to} onChange={e => onChange(Math.min(from, Number(e.target.value)), Number(e.target.value))}>{values.map(n => <option key={n} value={n}>{options(n)}</option>)}</select></label>
  </div></fieldset>;
}

export function StarRailVerifiedMaterials({ character }: { character: VerifiedStarRailCharacter }) {
  const [plan, setPlan] = useState<CharacterMaterialPlan>(() => fullCharacterMaterialPlan(character));
  const totals = calculateCharacterMaterials(character, plan);
  return <section id="materials" className="space-y-5 rounded-xl border border-game-border bg-game-surface p-5 text-game-text">
    <h2 className="text-xl font-semibold">{character.name}材料计算器</h2>
    <p className="text-sm leading-7 text-game-text-muted">{character.materialNote}</p>
    <div className="grid gap-5 lg:grid-cols-2">
      <Range label="角色晋阶" min={0} max={6} from={plan.ascensionFrom} to={plan.ascensionTo} stage onChange={(from, to) => setPlan({ ...plan, ascensionFrom: from, ascensionTo: to })} />
      {character.skills.map(s => <Range key={s.key} label={`${s.label} · ${s.name}`} min={1} max={s.trainableMax} from={plan.skills[s.key]!.from} to={plan.skills[s.key]!.to} onChange={(from, to) => setPlan({ ...plan, skills: { ...plan.skills, [s.key]: { from, to } } })} />)}
    </div>
    <fieldset><legend className="mb-3 font-medium">本次需要解锁的额外能力与属性节点</legend><div className="grid gap-3 md:grid-cols-2">{character.nodes.map(n => <label key={n.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={plan.nodes.includes(n.id)} onChange={e => setPlan({ ...plan, nodes: e.target.checked ? [...plan.nodes, n.id] : plan.nodes.filter(id => id !== n.id) })} /><span>{n.name}</span></label>)}</div></fieldset>
    <div className="flex flex-wrap gap-3"><button type="button" className="rounded border border-game-border px-3 py-2 text-sm" onClick={() => setPlan(fullCharacterMaterialPlan(character))}>恢复晋阶与全行迹目标</button><button type="button" className="rounded border border-game-border px-3 py-2 text-sm" onClick={() => setPlan({ ...plan, nodes: [] })}>清空节点选择</button></div>
    <div aria-live="polite" aria-atomic="true"><h3 className="mb-3 font-semibold">所选目标材料合计（不含经验书喂养信用点）</h3>{totals ? totals.length ? <dl className="grid gap-2 sm:grid-cols-2">{totals.map(c => <div key={c.name} className="flex justify-between gap-4 rounded bg-game-bg p-3 text-sm"><dt>{c.name}</dt><dd className="font-mono font-semibold">{c.quantity.toLocaleString('en-US')}</dd></div>)}</dl> : <p>当前选择无需新增材料。</p> : <p role="alert">目标无效，请重新选择。</p>}</div>
  </section>;
}
