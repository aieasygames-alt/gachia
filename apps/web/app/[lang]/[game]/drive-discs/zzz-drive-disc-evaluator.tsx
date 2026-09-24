'use client';

import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { zzzCharacters, getZzzCharacterName } from '@gachia/data/games/zzz/characters';
import { zzzDriveDiscs, getZzzDriveDiscName } from '@gachia/data/games/zzz/drive-discs';

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

const SUBSTAT_OPTIONS = ['critRate', 'critDmg', 'atkPercent', 'atkFlat', 'anomalyProficiency', 'anomalyMastery', 'impact', 'penRatio', 'energyRegen', 'hpPercent', 'defPercent'] as const;
type Substat = typeof SUBSTAT_OPTIONS[number];

const LABELS: Record<Substat, Record<SupportedLocale, string>> = {
  critRate: { zh: '暴击率', en: 'CRIT Rate', ja: '会心率' },
  critDmg: { zh: '暴击伤害', en: 'CRIT DMG', ja: '会心ダメージ' },
  atkPercent: { zh: '攻击力%', en: 'ATK%', ja: '攻撃力%' },
  atkFlat: { zh: '攻击力', en: 'Flat ATK', ja: '攻撃力' },
  anomalyProficiency: { zh: '异常掌控', en: 'Anomaly Proficiency', ja: '異常掌握' },
  anomalyMastery: { zh: '异常精通', en: 'Anomaly Mastery', ja: '異常マスタリー' },
  impact: { zh: '冲击力', en: 'Impact', ja: '衝撃力' },
  penRatio: { zh: '穿透率', en: 'PEN Ratio', ja: '貫通率' },
  energyRegen: { zh: '能量自动回复', en: 'Energy Regen', ja: 'エネルギー自動回復' },
  hpPercent: { zh: '生命%', en: 'HP%', ja: 'HP%' },
  defPercent: { zh: '防御%', en: 'DEF%', ja: '防御%' },
};

function desiredStats(specialty: string): Substat[] {
  if (specialty === 'Stun') return ['impact', 'energyRegen', 'atkPercent', 'penRatio'];
  if (specialty === 'Anomaly') return ['anomalyProficiency', 'anomalyMastery', 'atkPercent', 'penRatio'];
  if (specialty === 'Support') return ['energyRegen', 'atkPercent', 'anomalyMastery', 'penRatio'];
  if (specialty === 'Defense') return ['hpPercent', 'defPercent', 'impact', 'energyRegen'];
  return ['critRate', 'critDmg', 'atkPercent', 'penRatio', 'atkFlat'];
}

export function ZzzDriveDiscEvaluator({ locale }: { locale: SupportedLocale }) {
  const [characterId, setCharacterId] = useState(zzzCharacters[0]?.id ?? '');
  const [discId, setDiscId] = useState('none');
  const [slot, setSlot] = useState('4');
  const [mainStat, setMainStat] = useState<Substat>('critRate');
  const [subs, setSubs] = useState<Substat[]>(['critDmg', 'atkPercent']);
  const character = zzzCharacters.find((entry) => entry.id === characterId) ?? zzzCharacters[0];
  const targetSet = character?.recommendedBuild.bestDriveDiscEn;
  const preferred = desiredStats(character?.specialtyEn ?? 'Attack');
  const score = useMemo(() => {
    const main = preferred.includes(mainStat) ? 4 : 0;
    const sub = subs.reduce((sum, stat) => sum + (preferred.includes(stat) ? 2 : 0), 0);
    const selectedDisc = zzzDriveDiscs.find((entry) => entry.id === discId);
    const set = selectedDisc && (selectedDisc.nameEn === targetSet || selectedDisc.name === character?.recommendedBuild.bestDriveDisc) ? 3 : selectedDisc ? 1 : 0;
    return { total: main + sub + set, goodSubs: subs.filter((stat) => preferred.includes(stat)).length, selectedDisc };
  }, [character?.recommendedBuild.bestDriveDisc, discId, mainStat, preferred, subs, targetSet]);
  const verdict = score.total >= 9 ? t(locale, '建议保留并优先升级', 'Keep and prioritize upgrades', '残して優先強化') : score.total >= 6 ? t(locale, '可保留，等更好的主词条或副词条再替换', 'Keep for now; replace only with a stronger main-stat/substat piece', 'ひとまず保持。主属性・サブが上位なら更新') : t(locale, '不建议继续投入，除非只是临时过渡', 'Do not invest further unless it is a temporary bridge', '一時的な繋ぎ以外は投資しない');
  const toggleSub = (stat: Substat) => setSubs((current) => current.includes(stat) ? current.filter((item) => item !== stat) : current.length < 4 ? [...current, stat] : current);
  return <section className="mb-8 border border-game-primary/40 bg-game-surface p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-game-primary">{t(locale, '刷盘即时判断', 'Disc evaluation', 'ディスク評価')}</p><h2 className="mt-1 text-xl font-bold text-game-text">{t(locale, '驱动盘值得留吗？', 'Should you keep this Drive Disc?', 'このドライブディスクは残すべき？')}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-game-text-muted">{t(locale, '按角色定位、推荐套装、盘位主词条和副词条给出过渡判断。分数不替代实战，尤其是新版角色与特殊机制请以角色页和游戏内描述为准。', 'This scores a temporary keep/swap decision from role, recommended set, slot main stat, and substats. It does not replace live testing, especially for new agents and special mechanics.', '役割、推奨セット、部位主属性、サブから保持・更新の目安を出します。新エージェントや特殊ギミックは実戦・ゲーム内表記を優先してください。')}</p><div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Select label={t(locale, '代理人', 'Agent', 'エージェント')} value={characterId} onChange={setCharacterId} options={zzzCharacters.map((entry) => ({ value: entry.id, label: getZzzCharacterName(entry, locale) }))} /><Select label={t(locale, '驱动盘套装', 'Drive Disc set', 'ドライブディスクセット')} value={discId} onChange={setDiscId} options={[{ value: 'none', label: t(locale, '暂不选择', 'No set selected', '未選択') }, ...zzzDriveDiscs.map((entry) => ({ value: entry.id, label: getZzzDriveDiscName(entry, locale) }))]} /><Select label={t(locale, '盘位', 'Slot', '部位')} value={slot} onChange={setSlot} options={['4', '5', '6'].map((value) => ({ value, label: `${t(locale, '第', 'Slot ', '')}${value}${t(locale, '号位', '', '番')}` }))} /><Select label={t(locale, '主词条', 'Main stat', '主属性')} value={mainStat} onChange={(value) => setMainStat(value as Substat)} options={SUBSTAT_OPTIONS.map((value) => ({ value, label: LABELS[value][locale] }))} /></div><div className="mt-5"><p className="mb-2 text-sm font-medium text-game-text">{t(locale, '已有副词条（最多 4 条）', 'Current substats, up to four', '現在のサブステータス、最大4つ')}</p><div className="flex flex-wrap gap-2">{SUBSTAT_OPTIONS.map((stat) => <button type="button" key={stat} onClick={() => toggleSub(stat)} className={`border px-3 py-1.5 text-xs ${subs.includes(stat) ? 'border-game-primary bg-game-primary/10 text-game-text' : 'border-game-border bg-game-surface-alt text-game-text-muted'}`}>{LABELS[stat][locale]}</button>)}</div></div><div className="mt-5 grid gap-4 border-t border-game-border pt-4 md:grid-cols-[1fr_auto]"><div><p className="text-xs text-game-text-muted">{t(locale, '当前有效副词条', 'Effective substats', '有効なサブ')}</p><p className="mt-1 text-lg font-semibold text-game-text">{score.goodSubs}/{subs.length} · {character ? getZzzCharacterName(character, locale) : ''}</p><p className="mt-2 text-sm text-game-text-muted">{t(locale, '优先属性：', 'Priority stats: ', '優先ステータス：')}{preferred.map((stat) => LABELS[stat][locale]).join(' / ')}</p></div><div className="border-l-2 border-game-primary pl-4"><p className="text-xs text-game-text-muted">{t(locale, '评估结论', 'Verdict', '判定')}</p><p className="mt-1 max-w-xs font-semibold text-game-primary">{verdict}</p><p className="mt-1 text-xs text-game-text-muted">{score.selectedDisc ? `${t(locale, '套装评分', 'Set score', 'セット評価')}: ${score.selectedDisc.nameEn === targetSet ? '3/3' : '1/3'}` : t(locale, '未选择套装时不计套装分。', 'No set score until a set is selected.', 'セット未選択のためセット点なし。')}</p></div></div></section>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="block text-sm font-medium text-game-text">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none focus:border-game-primary">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
