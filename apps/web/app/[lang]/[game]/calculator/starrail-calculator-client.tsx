'use client';

import { useMemo, useState } from 'react';
import { GAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

import { starrailCharacters, getStarRailCharacterImage, getStarRailCharacterName } from '@gachia/data/games/starrail/characters';
import { getStarRailMaterialById } from '@gachia/data/games/starrail/items';
import { getMaterialsForCharacter as getStarRailMaterialsForCharacter } from '@gachia/data/games/starrail/extras';
import type { StarRailCharacter } from '@gachia/data/games/starrail/types';
import type { VerifiedStarRailCharacter } from '@gachia/data/cms/starrail-character';
import { StarRailVerifiedMaterials } from '@/components/wiki/starrail-verified-materials';
import { Link } from '@/lib/i18n/navigation';

const STARRAIL_ELEMENTS = ['fire', 'ice', 'lightning', 'wind', 'physical', 'quantum', 'imaginary'] as const;
const STARRAIL_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};
const STARRAIL_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  fire: { zh: '火', en: 'Fire', ja: '炎' }, ice: { zh: '冰', en: 'Ice', ja: '氷' },
  lightning: { zh: '雷', en: 'Lightning', ja: '雷' }, wind: { zh: '风', en: 'Wind', ja: '風' },
  physical: { zh: '物理', en: 'Physical', ja: '物理' }, quantum: { zh: '量子', en: 'Quantum', ja: '量子' },
  imaginary: { zh: '虚数', en: 'Imaginary', ja: '虚数' },
};
const SR_TYPE_ICONS: Record<string, string> = {
  'ascension': '💎', 'common': '⚔️', 'boss': '👹',
  'trace': '📖', 'special': '✨', 'currency': '💰',
};
const SR_TYPE_LABELS: Record<string, Record<string, string>> = {
  'ascension': { zh: '突破材料', en: 'Ascension', ja: '突破素材' },
  'common': { zh: '怪物掉落', en: 'Common Drop', ja: '雑魚素材' },
  'boss': { zh: 'Boss材料', en: 'Boss Material', ja: 'Boss素材' },
  'trace': { zh: '行迹材料', en: 'Trace Material', ja: '軌跡素材' },
  'special': { zh: '特殊材料', en: 'Special', ja: '特殊素材' },
  'currency': { zh: '货币', en: 'Currency', ja: '通貨' },
};

const RARITY_BG: Record<number, string> = { 1: 'bg-slate-700/50', 2: 'bg-green-900/40', 3: 'bg-blue-900/40', 4: 'bg-purple-900/40', 5: 'bg-yellow-900/40' };
const RARITY_BORDER: Record<number, string> = { 1: 'border-slate-600', 2: 'border-green-700', 3: 'border-blue-700', 4: 'border-purple-700', 5: 'border-yellow-600' };
const RARITY_TEXT: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

const LEVELS = [1, 20, 40, 50, 60, 70, 80, 90];
const TALENT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SR_LEVELS = [1, 20, 30, 40, 50, 60, 70, 80];
const SR_TRACE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

type Tab = 'ascension' | 'damage' | 'planner' | 'verified';

function LevelSelector({ levels, from, to, onFrom, onTo, locale }: {
  levels: number[];
  from: number;
  to: number;
  onFrom: (v: number) => void;
  onTo: (v: number) => void;
  locale: SupportedLocale;
}) {
  const fromIdx = levels.indexOf(from);
  const toIdx = levels.indexOf(to);

  return (
    <div>
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {levels.map((lvl, i) => {
          const isFrom = lvl === from;
          const isTo = lvl === to;
          const inRange = i > fromIdx && i < toIdx;
          const lineActive = i >= fromIdx && i < toIdx;
          return (
            <div key={lvl} className="flex items-center">
              <button
                onClick={() => {
                  if (lvl >= from && lvl !== from) {
                    onTo(lvl);
                  } else {
                    onFrom(lvl);
                    if (lvl > to) onTo(levels[levels.length - 1]!);
                  }
                }}
                className={`flex h-10 min-w-[2.8rem] items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  isFrom
                    ? 'bg-game-primary text-white ring-2 ring-game-primary/40'
                    : isTo
                      ? 'bg-game-accent text-white ring-2 ring-game-accent/40'
                      : inRange
                        ? 'bg-game-primary/20 text-game-primary border border-game-primary/30'
                        : 'bg-game-surface-alt text-game-text-muted hover:bg-game-surface-alt/80 border border-transparent'
                }`}
              >
                {lvl}
              </button>
              {i < levels.length - 1 && (
                <div className={`h-[2px] w-4 rounded-full transition-colors ${lineActive ? 'bg-game-primary/50' : 'bg-game-border'}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-game-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-game-primary" />
          {t(locale, '起始', 'From', '開始')}: {from}
        </span>
        <span className="text-game-border">→</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded bg-game-accent" />
          {t(locale, '目标', 'To', '目標')}: {to}
        </span>
      </div>
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-game-surface-alt p-4 text-center">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}


export function StarRailCalculator({ locale, verifiedCharacter, checkedAt }: { locale: SupportedLocale; verifiedCharacter?: VerifiedStarRailCharacter; checkedAt?: string }) {
  const [tab, setTab] = useState<Tab>(verifiedCharacter ? 'verified' : 'ascension');
  const gameConfig = GAMES.starrail;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '计算器', 'Calculator', '計算機')}
      </h1>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-game-surface p-1">
        {([...(verifiedCharacter ? ['verified'] : []), 'ascension', 'damage', 'planner'] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === tb
                ? 'bg-game-primary text-white shadow'
                : 'text-game-text-muted hover:text-game-text'
            }`}
          >
            {tb === 'verified' ? `${verifiedCharacter?.name}材料` : tb === 'ascension'
              ? t(locale, '养成材料计算', 'Ascension Calculator', '育成素材計算')
              : tb === 'damage'
                ? t(locale, '伤害计算', 'Damage Calculator', 'ダメージ計算')
                : t(locale, '材料规划', 'Material Planner', '素材計画')}
          </button>
        ))}
      </div>

      {tab === 'verified' && verifiedCharacter ? <><p className="mb-4 text-sm text-game-text-muted">来源核验 {checkedAt} · <Link className="text-game-primary underline" href="/starrail/characters/aha">角色倍率与来源</Link></p><StarRailVerifiedMaterials character={verifiedCharacter} /></> : tab === 'ascension' ? <SRAAscensionCalc locale={locale} /> : tab === 'damage' ? <SRDamageCalc locale={locale} /> : <SRMaterialPlanner locale={locale} />}
    </div>
  );
}

function SRAAscensionCalc({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<StarRailCharacter | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(80);
  const [traceFrom, setTraceFrom] = useState(1);
  const [traceTo, setTraceTo] = useState(10);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [owned, setOwned] = useState<Record<string, number>>({});

  useState(() => {
    try {
      const saved = localStorage.getItem('gachia-owned-materials');
      if (saved) setOwned(JSON.parse(saved));
    } catch {}
  });

  const updateOwned = (id: string, qty: number) => {
    const next = { ...owned, [id]: Math.max(0, qty) };
    setOwned(next);
    try { localStorage.setItem('gachia-owned-materials', JSON.stringify(next)); } catch {}
  };

  const filtered = useMemo(() => {
    let chars = starrailCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const result = useMemo(() => {
    if (!selectedChar) return null;
    const charMats = getStarRailMaterialsForCharacter(selectedChar.id);
    if (!charMats) return null;

    const aggregated: Record<string, number> = {};
    for (const row of charMats.ascensionMaterials) {
      const parts = row.levelRange.split('-').map(Number);
      const lo = parts[0] ?? 0;
      const hi = parts[1] ?? 0;
      if (hi > currentLevel && lo < targetLevel) {
        for (const m of row.materials) aggregated[m.id] = (aggregated[m.id] || 0) + m.quantity;
      }
    }
    for (const row of charMats.traceMaterials) {
      const lvl = parseInt(row.traceLevel.replace(/[^0-9]/g, '')) || 0;
      if (lvl >= traceFrom && lvl < traceTo) {
        for (const m of row.materials) aggregated[m.id] = (aggregated[m.id] || 0) + m.quantity;
      }
    }

    const groups: Record<string, Array<{ id: string; name: string; rarity: number; quantity: number }>> = {};
    for (const [id, qty] of Object.entries(aggregated)) {
      const mat = getStarRailMaterialById(id);
      const type = mat?.type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push({ id, name: mat ? (locale === 'en' ? mat.nameEn : mat.name) : id, rarity: mat?.rarity || 1, quantity: qty });
    }
    return groups;
  }, [selectedChar, currentLevel, targetLevel, traceFrom, traceTo, locale]);

  const typeOrder = ['ascension', 'common', 'boss', 'trace', 'special', 'currency', 'other'];
  const totalItems = result ? Object.values(result).flat().reduce((s, m) => s + m.quantity, 0) : 0;
  const totalTypes = result ? Object.values(result).flat().length : 0;
  const toggleGroup = (type: string) => setCollapsedGroups((p) => ({ ...p, [type]: !p[type] }));

  return (
    <div className="space-y-6">
      {selectedChar && !showSelector ? (
        <div className="flex items-center gap-4 rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <CharacterAvatar src={getStarRailCharacterImage(selectedChar)} alt={selectedChar.nameEn} element={selectedChar.element} className="h-16 w-16 rounded-xl object-cover ring-2 ring-game-primary/50" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-game-text">{getStarRailCharacterName(selectedChar, locale)}</h2>
              <span className="text-sm font-bold text-yellow-500">{selectedChar.rarity}★</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: STARRAIL_ELEMENT_COLORS[selectedChar.element] }}>
                {STARRAIL_ELEMENT_NAMES[selectedChar.element]?.[locale] ?? selectedChar.element}
              </span>
            </div>
          </div>
          <button onClick={() => setShowSelector(true)} className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
            {t(locale, '更换角色', 'Change', '変更')}
          </button>
        </div>
      ) : null}

      {showSelector ? (
        <div className="rounded-xl border border-game-border bg-game-surface p-4">
          <div className="mb-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
              className="w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary" />
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {STARRAIL_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: STARRAIL_ELEMENT_COLORS[el] } : {}}>
                {STARRAIL_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { setSelectedChar(c); setShowSelector(false); setSearch(''); setFilterElement('all'); }}
                className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${selectedChar?.id === c.id ? 'border-game-primary bg-game-primary/10 ring-1 ring-game-primary/30' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                <CharacterAvatar src={getStarRailCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                <span className={`text-center text-[11px] leading-tight ${selectedChar?.id === c.id ? 'font-medium text-game-primary' : 'text-game-text-muted group-hover:text-game-text'}`}>
                  {getStarRailCharacterName(c, locale)}
                </span>
                <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedChar && (
        <div className="space-y-4">
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">{t(locale, '角色等级', 'Character Level', 'キャラレベル')}</h3>
            <LevelSelector levels={SR_LEVELS} from={currentLevel} to={targetLevel} onFrom={setCurrentLevel} onTo={setTargetLevel} locale={locale} />
          </div>
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">{t(locale, '行迹等级', 'Trace Level', '軌跡レベル')}</h3>
            <LevelSelector levels={SR_TRACE_LEVELS} from={traceFrom} to={traceTo} onFrom={setTraceFrom} onTo={setTraceTo} locale={locale} />
          </div>
        </div>
      )}

      {selectedChar && !result && (
        <p role="status" className="rounded-xl border border-game-border bg-game-surface p-4 text-sm text-game-text-muted">
          {t(locale, '该角色的材料资料尚未补齐，暂时无法计算；这不代表所需材料为零。请选择其他角色，或先查看已发布的培养资料。', 'Material data for this character is incomplete, so a total cannot be calculated. This does not mean zero materials are required. Choose another character or consult the published progression notes.', 'このキャラの素材データは準備中のため計算できません。必要素材がゼロという意味ではありません。別のキャラか、公開済みの育成情報をご確認ください。')}
        </p>
      )}

      {result && (
        <div>
          <div className="mb-4 flex items-center gap-4 rounded-xl bg-game-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-game-primary">{t(locale, '所需材料', 'Materials', '必要素材')}</span>
            <span className="text-sm text-game-text-muted">{totalTypes} {t(locale, '种', 'types', '種類')} / {totalItems} {t(locale, '个', 'total', '個')}</span>
          </div>
          <div className="space-y-3">
            {typeOrder.filter((t) => result[t]).map((type) => {
              const items = result[type]!;
              const collapsed = collapsedGroups[type];
              return (
                <div key={type} className="rounded-xl border border-game-border bg-game-surface overflow-hidden">
                  <button onClick={() => toggleGroup(type)} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-game-surface-alt/50">
                    <span className="text-sm font-semibold text-game-primary">
                      {SR_TYPE_ICONS[type]} {SR_TYPE_LABELS[type]?.[locale] || type}
                      <span className="ml-2 text-xs text-game-text-muted">({items.length})</span>
                    </span>
                    <svg className={`h-4 w-4 text-game-text-muted transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {!collapsed && (
                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                      {items.sort((a, b) => b.rarity - a.rarity).map((m) => {
                        const have = owned[m.id] || 0;
                        const deficit = Math.max(0, m.quantity - have);
                        return (
                          <div key={m.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${RARITY_BG[m.rarity] || ''} ${RARITY_BORDER[m.rarity] || 'border-game-border'}`}>
                            <span style={{ color: RARITY_TEXT[m.rarity] || '#888' }}>{'★'.repeat(Math.min(m.rarity, 5))}</span>
                            <span className="text-game-text">{m.name}</span>
                            <span className="font-bold text-game-primary">×{m.quantity}</span>
                            <input type="number" min={0} value={have} onChange={(e) => updateOwned(m.id, parseInt(e.target.value) || 0)}
                              className="ml-1 w-12 rounded border border-game-border bg-game-surface-alt px-1 py-0.5 text-xs text-game-text text-center outline-none focus:border-game-primary"
                              title={t(locale, '已有', 'Owned', '所持')} />
                            {deficit > 0 ? <span className="text-xs font-bold text-red-400">-{deficit}</span> : <span className="text-xs font-bold text-green-400">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SRDamageCalc({ locale }: { locale: SupportedLocale }) {
  const [baseAtk, setBaseAtk] = useState(300);
  const [atkPercent, setAtkPercent] = useState(46.6);
  const [flatAtk, setFlatAtk] = useState(311);
  const [critRate, setCritRate] = useState(60);
  const [critDmg, setCritDmg] = useState(120);
  const [dmgBonus, setDmgBonus] = useState(46.6);
  const [skillMult, setSkillMult] = useState(300);

  const totalAtk = baseAtk * (1 + atkPercent / 100) + flatAtk;
  const avgDmg = totalAtk * (skillMult / 100) * (1 + dmgBonus / 100) * (1 + critRate / 100 * critDmg / 100);
  const maxDmg = totalAtk * (skillMult / 100) * (1 + dmgBonus / 100) * (1 + critDmg / 100);

  const inputClass = 'w-full rounded-lg border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none transition-colors focus:border-game-primary';
  const fields = [
    { label: t(locale, '基础攻击力', 'Base ATK', '基礎攻撃力'), value: baseAtk, set: setBaseAtk },
    { label: t(locale, '攻击力%', 'ATK%', '攻撃力%'), value: atkPercent, set: setAtkPercent },
    { label: t(locale, '固定攻击力', 'Flat ATK', '固定攻撃力'), value: flatAtk, set: setFlatAtk },
    { label: t(locale, '暴击率%', 'CRIT Rate%', '会心率%'), value: critRate, set: setCritRate },
    { label: t(locale, '暴击伤害%', 'CRIT DMG%', '会心ダメージ%'), value: critDmg, set: setCritDmg },
    { label: t(locale, '伤害加成%', 'DMG Bonus%', 'ダメージ加算%'), value: dmgBonus, set: setDmgBonus },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-game-border bg-game-surface p-4">
        <h3 className="mb-4 font-semibold text-game-text">{t(locale, '面板设置', 'Stats Input', 'ステータス入力')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.label}>
              <label className="mb-1 block text-xs text-game-text-muted">{f.label}</label>
              <input type="number" value={f.value} onChange={(e) => f.set(+e.target.value)} className={inputClass} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-game-text-muted">{t(locale, '技能倍率%', 'Skill Multiplier%', 'スキル倍率%')}</label>
            <input type="number" value={skillMult} onChange={(e) => setSkillMult(+e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-game-border bg-game-surface p-4">
        <h3 className="mb-4 font-semibold text-game-text">{t(locale, '伤害结果', 'Damage Results', 'ダメージ結果')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <ResultCard label={t(locale, '总攻击力', 'Total ATK', '合計攻撃力')} value={totalAtk.toFixed(0)} color="text-game-text" />
          <ResultCard label={t(locale, '期望伤害', 'Avg DMG', '期待ダメージ')} value={avgDmg.toFixed(0)} color="text-game-primary" />
          <ResultCard label={t(locale, '暴击伤害', 'CRIT DMG', '会心ダメージ')} value={maxDmg.toFixed(0)} color="text-red-400" />
          <ResultCard label={t(locale, '暴击期望', 'CRIT Value', '会心価値')} value={(critRate * critDmg / 100).toFixed(1)} color="text-game-text" />
        </div>
        <div className="mt-4 border-t border-game-border pt-3 text-xs text-game-text-muted">
          {t(locale, '公式', 'Formula', '計算式')}: TotalATK × Skill% × (1 + DMG%) × (1 + CR% × CD%)
        </div>
      </div>
    </div>
  );
}

function SRMaterialPlanner({ locale }: { locale: SupportedLocale }) {
  const [selectedChars, setSelectedChars] = useState<StarRailCharacter[]>([]);
  const [showSelector, setShowSelector] = useState(true);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(80);
  const [traceFrom, setTraceFrom] = useState(1);
  const [traceTo, setTraceTo] = useState(10);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [owned, setOwned] = useState<Record<string, number>>({});

  useState(() => {
    try {
      const saved = localStorage.getItem('gachia-owned-materials');
      if (saved) setOwned(JSON.parse(saved));
    } catch {}
  });

  const updateOwned = (id: string, qty: number) => {
    const next = { ...owned, [id]: Math.max(0, qty) };
    setOwned(next);
    try { localStorage.setItem('gachia-owned-materials', JSON.stringify(next)); } catch {}
  };

  const filtered = useMemo(() => {
    let chars = starrailCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const toggleChar = (c: StarRailCharacter) => {
    setSelectedChars((prev) => prev.some((p) => p.id === c.id) ? prev.filter((p) => p.id !== c.id) : [...prev, c]);
  };

  const result = useMemo(() => {
    if (selectedChars.length === 0 || selectedChars.some(char => !getStarRailMaterialsForCharacter(char.id))) return null;
    const aggregated: Record<string, number> = {};
    for (const char of selectedChars) {
      const charMats = getStarRailMaterialsForCharacter(char.id);
      if (!charMats) continue;
      for (const row of charMats.ascensionMaterials) {
        const parts = row.levelRange.split('-').map(Number);
        const lo = parts[0] ?? 0;
        const hi = parts[1] ?? 0;
        if (hi > currentLevel && lo < targetLevel) {
          for (const m of row.materials) aggregated[m.id] = (aggregated[m.id] || 0) + m.quantity;
        }
      }
      for (const row of charMats.traceMaterials) {
        const lvl = parseInt(row.traceLevel.replace(/[^0-9]/g, '')) || 0;
        if (lvl >= traceFrom && lvl < traceTo) {
          for (const m of row.materials) aggregated[m.id] = (aggregated[m.id] || 0) + m.quantity;
        }
      }
    }
    const groups: Record<string, Array<{ id: string; name: string; rarity: number; quantity: number }>> = {};
    for (const [id, qty] of Object.entries(aggregated)) {
      const mat = getStarRailMaterialById(id);
      const type = mat?.type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push({ id, name: mat ? (locale === 'en' ? mat.nameEn : mat.name) : id, rarity: mat?.rarity || 1, quantity: qty });
    }
    return groups;
  }, [selectedChars, currentLevel, targetLevel, traceFrom, traceTo, locale]);

  const typeOrder = ['ascension', 'common', 'boss', 'trace', 'special', 'currency', 'other'];
  const totalItems = result ? Object.values(result).flat().reduce((s, m) => s + m.quantity, 0) : 0;
  const totalTypes = result ? Object.values(result).flat().length : 0;
  const toggleGroup = (type: string) => setCollapsedGroups((p) => ({ ...p, [type]: !p[type] }));

  return (
    <div className="space-y-4">
      {selectedChars.length > 0 && (
        <div className="rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-game-primary">{t(locale, '已选角色', 'Selected Characters', '選択キャラ')} ({selectedChars.length})</h3>
            <button onClick={() => setSelectedChars([])} className="text-xs text-game-text-muted hover:text-red-400 transition-colors">{t(locale, '清空', 'Clear All', '全削除')}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedChars.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-game-primary/10 border border-game-primary/20 px-2.5 py-1">
                <CharacterAvatar src={getStarRailCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-5 w-5 rounded-full object-cover" />
                <span className="text-xs font-medium text-game-text">{getStarRailCharacterName(c, locale)}</span>
                <button onClick={() => setSelectedChars((prev) => prev.filter((p) => p.id !== c.id))} className="ml-0.5 text-game-text-muted hover:text-red-400 text-xs">✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {showSelector && (
        <div className="rounded-xl border border-game-border bg-game-surface p-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>{t(locale, '全部', 'All', '全')}</button>
            {STARRAIL_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: STARRAIL_ELEMENT_COLORS[el] } : {}}>
                {STARRAIL_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((c) => {
              const isSelected = selectedChars.some((s) => s.id === c.id);
              return (
                <button key={c.id} onClick={() => toggleChar(c)}
                  className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${isSelected ? 'border-game-primary bg-game-primary/10 ring-1 ring-game-primary/30' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                  <div className="relative">
                    <CharacterAvatar src={getStarRailCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                    {isSelected && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-game-primary text-[8px] text-white">✓</span>}
                  </div>
                  <span className={`text-center text-[11px] leading-tight ${isSelected ? 'font-medium text-game-primary' : 'text-game-text-muted group-hover:text-game-text'}`}>
                    {getStarRailCharacterName(c, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!showSelector && (
        <button onClick={() => setShowSelector(true)} className="w-full rounded-lg border border-dashed border-game-border bg-game-surface py-2 text-sm text-game-text-muted hover:border-game-primary hover:text-game-primary transition-colors">
          + {t(locale, '添加角色', 'Add Characters', 'キャラ追加')}
        </button>
      )}

      {selectedChars.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">{t(locale, '角色等级', 'Character Level', 'キャラレベル')}</h3>
            <LevelSelector levels={SR_LEVELS} from={currentLevel} to={targetLevel} onFrom={setCurrentLevel} onTo={setTargetLevel} locale={locale} />
          </div>
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-text">{t(locale, '行迹等级', 'Trace Level', '軌跡レベル')}</h3>
            <LevelSelector levels={SR_TRACE_LEVELS} from={traceFrom} to={traceTo} onFrom={setTraceFrom} onTo={setTraceTo} locale={locale} />
          </div>
        </div>
      )}

      {selectedChars.length > 0 && !result && (
        <p role="status" className="rounded-xl border border-game-border bg-game-surface p-4 text-sm text-game-text-muted">
          {t(locale, '以下角色缺少材料资料，暂不显示汇总，以免低估需求：', 'Totals are unavailable because material data is missing for: ', '次のキャラの素材データがないため合計を表示できません：')}
          {selectedChars.filter(char => !getStarRailMaterialsForCharacter(char.id)).map(char => getStarRailCharacterName(char, locale)).join('、')}
        </p>
      )}

      {result && (
        <div>
          <div className="mb-4 flex items-center gap-4 rounded-xl bg-game-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-game-primary">{t(locale, '汇总材料', 'Total Materials', '合計素材')}</span>
            <span className="text-sm text-game-text-muted">{totalTypes} {t(locale, '种', 'types', '種類')} / {totalItems} {t(locale, '个', 'total', '個')}</span>
            <span className="text-sm text-game-text-muted ml-auto">{selectedChars.length} {t(locale, '个角色', 'characters', 'キャラ')}</span>
            <button onClick={() => { setOwned({}); try { localStorage.removeItem('gachia-owned-materials'); } catch {} }}
              className="rounded px-2 py-1 text-xs text-game-text-muted hover:text-red-400 transition-colors border border-game-border">
              {t(locale, '重置库存', 'Reset Owned', 'リセット')}
            </button>
          </div>
          <div className="space-y-3">
            {typeOrder.filter((t) => result[t]).map((type) => {
              const items = result[type]!;
              const collapsed = collapsedGroups[type];
              return (
                <div key={type} className="rounded-xl border border-game-border bg-game-surface overflow-hidden">
                  <button onClick={() => toggleGroup(type)} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-game-surface-alt/50">
                    <span className="text-sm font-semibold text-game-primary">
                      {SR_TYPE_ICONS[type]} {SR_TYPE_LABELS[type]?.[locale] || type}
                      <span className="ml-2 text-xs text-game-text-muted">({items.length})</span>
                    </span>
                    <svg className={`h-4 w-4 text-game-text-muted transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {!collapsed && (
                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                      {items.sort((a, b) => b.rarity - a.rarity).map((m) => {
                        const have = owned[m.id] || 0;
                        const deficit = Math.max(0, m.quantity - have);
                        return (
                          <div key={m.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${RARITY_BG[m.rarity] || ''} ${RARITY_BORDER[m.rarity] || 'border-game-border'}`}>
                            <span style={{ color: RARITY_TEXT[m.rarity] || '#888' }}>{'★'.repeat(Math.min(m.rarity, 5))}</span>
                            <span className="text-game-text">{m.name}</span>
                            <span className="font-bold text-game-primary">×{m.quantity}</span>
                            <input type="number" min={0} value={have} onChange={(e) => updateOwned(m.id, parseInt(e.target.value) || 0)}
                              className="ml-1 w-12 rounded border border-game-border bg-game-surface-alt px-1 py-0.5 text-xs text-game-text text-center outline-none focus:border-game-primary"
                              title={t(locale, '已有', 'Owned', '所持')} />
                            {deficit > 0 ? <span className="text-xs font-bold text-red-400">-{deficit}</span> : <span className="text-xs font-bold text-green-400">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Coming Soon
// =====================================================================

