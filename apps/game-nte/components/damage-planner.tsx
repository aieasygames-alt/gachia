'use client';

import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';

type Copy = {
  baseAttack: string;
  scaling: string;
  bonus: string;
  critRate: string;
  critDamage: string;
  enemy: string;
  normal: string;
  critical: string;
  expected: string;
  reset: string;
  note: string;
  percent: string;
};

const copyByLocale: Record<SupportedLocale, Copy> = {
  zh: {
    baseAttack: '基础攻击', scaling: '技能倍率', bonus: '增伤', critRate: '暴击率', critDamage: '暴击伤害', enemy: '敌方修正',
    normal: '非暴击伤害', critical: '暴击伤害', expected: '期望单次伤害', reset: '重置参考值',
    note: '这是通用乘区参考，不包含未核验的角色技能、反应、穿透或防御公式。请以正式版本游戏内数据为准。', percent: '%',
  },
  en: {
    baseAttack: 'Base ATK', scaling: 'Skill scaling', bonus: 'Damage bonus', critRate: 'Crit rate', critDamage: 'Crit damage', enemy: 'Target modifier',
    normal: 'Non-crit damage', critical: 'Critical damage', expected: 'Expected hit damage', reset: 'Reset reference values',
    note: 'This is a generic multiplier reference. It excludes unverified character kits, reactions, penetration, and defense formulas. Confirm values in the released game.', percent: '%',
  },
  ja: {
    baseAttack: '基礎攻撃', scaling: 'スキル倍率', bonus: 'ダメージボーナス', critRate: '会心率', critDamage: '会心ダメージ', enemy: '敵補正',
    normal: '非会心ダメージ', critical: '会心ダメージ', expected: '期待一撃ダメージ', reset: '参考値に戻す',
    note: '汎用的な倍率参照です。未確認のキャラクタースキル、反応、貫通、防御計算は含みません。正式版ゲーム内の数値を確認してください。', percent: '%',
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

export function DamagePlanner({ locale }: { locale: SupportedLocale }) {
  const [baseAttack, setBaseAttack] = useState(1000);
  const [scaling, setScaling] = useState(100);
  const [bonus, setBonus] = useState(0);
  const [critRate, setCritRate] = useState(50);
  const [critDamage, setCritDamage] = useState(50);
  const [enemyModifier, setEnemyModifier] = useState(100);
  const copy = copyByLocale[locale];
  const values = useMemo(() => {
    const attack = clamp(baseAttack, 0, 999999);
    const multiplier = clamp(scaling, 0, 10000) / 100;
    const bonusMultiplier = 1 + clamp(bonus, -100, 10000) / 100;
    const targetMultiplier = clamp(enemyModifier, 0, 10000) / 100;
    const normal = attack * multiplier * bonusMultiplier * targetMultiplier;
    const critical = normal * (1 + clamp(critDamage, 0, 10000) / 100);
    const expected = normal * (1 + (clamp(critRate, 0, 100) / 100) * (clamp(critDamage, 0, 10000) / 100));
    return { normal, critical, expected };
  }, [baseAttack, bonus, critDamage, critRate, enemyModifier, scaling]);
  const format = (value: number) => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { maximumFractionDigits: 1 }).format(value);
  const reset = () => { setBaseAttack(1000); setScaling(100); setBonus(0); setCritRate(50); setCritDamage(50); setEnemyModifier(100); };
  const fields = [
    [copy.baseAttack, baseAttack, setBaseAttack, 0, 999999, 1, ''],
    [copy.scaling, scaling, setScaling, 0, 10000, 1, copy.percent],
    [copy.bonus, bonus, setBonus, -100, 10000, 1, copy.percent],
    [copy.critRate, critRate, setCritRate, 0, 100, 1, copy.percent],
    [copy.critDamage, critDamage, setCritDamage, 0, 10000, 1, copy.percent],
    [copy.enemy, enemyModifier, setEnemyModifier, 0, 10000, 1, copy.percent],
  ] as const;

  return <section className="damage-planner" aria-label={locale === 'zh' ? '伤害参考计算器' : locale === 'ja' ? 'ダメージ参照計算機' : 'Damage reference calculator'}>
    <div className="damage-planner__controls">
      {fields.map(([label, value, setValue, min, max, step, suffix]) => <label key={label}>{label}<span><input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => setValue(Number(event.target.value))} /><em>{suffix}</em></span></label>)}
    </div>
    <div className="damage-planner__results" aria-live="polite">
      <div><span>{copy.normal}</span><strong>{format(values.normal)}</strong></div>
      <div><span>{copy.critical}</span><strong>{format(values.critical)}</strong></div>
      <div><span>{copy.expected}</span><strong>{format(values.expected)}</strong></div>
    </div>
    <div className="damage-planner__foot"><p>{copy.note}</p><button type="button" onClick={reset}>{copy.reset}</button></div>
  </section>;
}
