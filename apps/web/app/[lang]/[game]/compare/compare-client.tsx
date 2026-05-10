'use client';

import { useState, useMemo } from 'react';
import { GAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import {
  genshinCharacters,
  getGenshinCharacterName,
  getGenshinCharacterImage,
} from '@gachia/data/games/genshin/characters';
import {
  genshinWeapons,
  getGenshinWeaponName,
} from '@gachia/data/games/genshin/weapons';
import {
  artifactSets,
  getArtifactSetName,
} from '@gachia/data/games/genshin/artifacts';
import type { GenshinCharacter, GenshinWeapon } from '@gachia/data/games/genshin/types';
import {
  starrailCharacters,
  getStarRailCharacterName,
  getStarRailCharacterImage,
} from '@gachia/data/games/starrail/characters';
import {
  starrailLightCones,
  getStarRailLightConeName,
} from '@gachia/data/games/starrail/weapons';
import {
  relicSets,
  getRelicSetName,
} from '@gachia/data/games/starrail/relics';
import type { StarRailCharacter, StarRailLightCone, StarRailRelicSet } from '@gachia/data/games/starrail/types';
import {
  wuwaCharacters,
  getWuWaCharacterName,
  getWuWaCharacterImage,
} from '@gachia/data/games/wuwa/characters';
import type { WuWaCharacter } from '@gachia/data/games/wuwa/types';
import {
  nteCharacters,
  getNteCharacterName,
  getNteCharacterImage,
  getNteCharacterTierReason,
} from '@gachia/data/games/nte/characters';
import type { NteCharacter } from '@gachia/data/games/nte/types';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

// --- Constants ---

const GENSHIN_ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'dendro', 'anemo', 'geo'] as const;
const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};
const GENSHIN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  pyro: { zh: '火', en: 'Pyro', ja: '炎' }, hydro: { zh: '水', en: 'Hydro', ja: '水' },
  electro: { zh: '雷', en: 'Electro', ja: '雷' }, cryo: { zh: '冰', en: 'Cryo', ja: '氷' },
  dendro: { zh: '草', en: 'Dendro', ja: '草' }, anemo: { zh: '风', en: 'Anemo', ja: '風' },
  geo: { zh: '岩', en: 'Geo', ja: '岩' },
};

const WEAPON_TYPE_NAMES: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const TIER_COLORS: Record<string, string> = {
  SS: '#ef4444', S: '#f97316', 'S+': '#f97316', 'A+': '#a855f7', A: '#eab308', B: '#22c55e', C: '#3b82f6', D: '#6b7280',
};

// --- Star Rail Constants ---
const SR_ELEMENTS = ['fire', 'ice', 'lightning', 'wind', 'physical', 'quantum', 'imaginary'] as const;
const SR_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};
const SR_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  fire: { zh: '火', en: 'Fire', ja: '炎' }, ice: { zh: '冰', en: 'Ice', ja: '氷' },
  lightning: { zh: '雷', en: 'Lightning', ja: '雷' }, wind: { zh: '风', en: 'Wind', ja: '風' },
  physical: { zh: '物理', en: 'Physical', ja: '物理' }, quantum: { zh: '量子', en: 'Quantum', ja: '量子' },
  imaginary: { zh: '虚数', en: 'Imaginary', ja: '虚数' },
};
const SR_PATH_NAMES: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' }, hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' }, harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' }, preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' }, remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
};

// --- WuWa Constants ---
const WUWA_ELEMENTS = ['glacio', 'fusion', 'electro', 'aero', 'spectro', 'havoc'] as const;
const WUWA_ELEMENT_COLORS: Record<string, string> = {
  glacio: '#67e8f9', fusion: '#ef4444', electro: '#8b5cf6',
  aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
};
const WUWA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  glacio: { zh: '冷凝', en: 'Glacio', ja: '氷凝' }, fusion: { zh: '热熔', en: 'Fusion', ja: '融合' },
  electro: { zh: '导电', en: 'Electro', ja: '導電' }, aero: { zh: '气动', en: 'Aero', ja: '気動' },
  spectro: { zh: '衍射', en: 'Spectro', ja: '回折' }, havoc: { zh: '湮灭', en: 'Havoc', ja: '壊滅' },
};

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

// --- Resolver helpers ---

function resolveWeapon(build: { bestWeaponEn: string }): GenshinWeapon | null {
  return genshinWeapons.find((w) => w.nameEn.toLowerCase() === build.bestWeaponEn.toLowerCase()) ?? null;
}

function resolveArtifact(build: { bestArtifactSetEn: string }) {
  return artifactSets.find((s) => s.nameEn.toLowerCase() === build.bestArtifactSetEn.toLowerCase()) ?? null;
}

// =====================================================================
// Client Component
// =====================================================================

export function CompareClient({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  if (gameId === 'genshin') return <GenshinCompare locale={locale} />;
  if (gameId === 'starrail') return <StarRailCompare locale={locale} />;
  if (gameId === 'wuwa') return <WuWaCompare locale={locale} />;
  if (gameId === 'nte') return <NteCompare locale={locale} />;
  return <ComingSoon locale={locale} />;
}

// =====================================================================
// Genshin Compare
// =====================================================================

function GenshinCompare({ locale }: { locale: SupportedLocale }) {
  const [charA, setCharA] = useState<GenshinCharacter | null>(null);
  const [charB, setCharB] = useState<GenshinCharacter | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<'A' | 'B' | null>(null);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');

  const filtered = useMemo(() => {
    let chars = genshinCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const gameConfig = GAMES.genshin;
  const weaponA = charA ? resolveWeapon(charA.recommendedBuild) : null;
  const weaponB = charB ? resolveWeapon(charB.recommendedBuild) : null;
  const artifactA = charA ? resolveArtifact(charA.recommendedBuild) : null;
  const artifactB = charB ? resolveArtifact(charB.recommendedBuild) : null;

  const bothSelected = charA && charB;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '角色对比', 'Character Compare', 'キャラ比較')}
      </h1>

      {/* Slot Selection Bar */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Slot A */}
        <div className="rounded-xl border border-game-border bg-game-surface p-4">
          {charA ? (
            <div className="flex items-center gap-3">
              <CharacterAvatar src={getGenshinCharacterImage(charA)} alt={charA.nameEn} element={charA.element} className="h-14 w-14 rounded-xl object-cover ring-2 ring-game-primary/50" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-game-text">{getGenshinCharacterName(charA, locale)}</span>
                  <span className="text-sm text-yellow-500">{charA.rarity}★</span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[charA.element] }}>
                    {GENSHIN_ELEMENT_NAMES[charA.element]?.[locale] ?? charA.element}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-game-text-muted">
                  {WEAPON_TYPE_NAMES[charA.weaponType]?.[locale]} · {charA.tierRank}
                </div>
              </div>
              <button onClick={() => { setCharA(null); setSelectingSlot('A'); }} className="rounded-lg border border-game-border px-2 py-1 text-xs text-game-text-muted hover:border-game-primary hover:text-game-primary transition-colors">
                {t(locale, '换', 'Swap', '変更')}
              </button>
            </div>
          ) : (
            <button onClick={() => setSelectingSlot(selectingSlot === 'A' ? null : 'A')}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${selectingSlot === 'A' ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary/50'}`}>
              <span className="text-lg">+</span>
              <span className="text-sm font-medium">{t(locale, '选择角色 A', 'Select Character A', 'キャラAを選択')}</span>
            </button>
          )}
        </div>

        {/* Slot B */}
        <div className="rounded-xl border border-game-border bg-game-surface p-4">
          {charB ? (
            <div className="flex items-center gap-3">
              <CharacterAvatar src={getGenshinCharacterImage(charB)} alt={charB.nameEn} element={charB.element} className="h-14 w-14 rounded-xl object-cover ring-2 ring-game-accent/50" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-game-text">{getGenshinCharacterName(charB, locale)}</span>
                  <span className="text-sm text-yellow-500">{charB.rarity}★</span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[charB.element] }}>
                    {GENSHIN_ELEMENT_NAMES[charB.element]?.[locale] ?? charB.element}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-game-text-muted">
                  {WEAPON_TYPE_NAMES[charB.weaponType]?.[locale]} · {charB.tierRank}
                </div>
              </div>
              <button onClick={() => { setCharB(null); setSelectingSlot('B'); }} className="rounded-lg border border-game-border px-2 py-1 text-xs text-game-text-muted hover:border-game-accent hover:text-game-accent transition-colors">
                {t(locale, '换', 'Swap', '変更')}
              </button>
            </div>
          ) : (
            <button onClick={() => setSelectingSlot(selectingSlot === 'B' ? null : 'B')}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${selectingSlot === 'B' ? 'border-game-accent bg-game-accent/10 text-game-accent' : 'border-game-border text-game-text-muted hover:border-game-accent/50'}`}>
              <span className="text-lg">+</span>
              <span className="text-sm font-medium">{t(locale, '选择角色 B', 'Select Character B', 'キャラBを選択')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Character Selector Modal */}
      {selectingSlot && (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-game-primary">
              {selectingSlot === 'A'
                ? t(locale, '选择角色 A', 'Select Character A', 'キャラAを選択')
                : t(locale, '选择角色 B', 'Select Character B', 'キャラBを選択')}
            </h3>
            <button onClick={() => setSelectingSlot(null)} className="text-xs text-game-text-muted hover:text-game-text">✕</button>
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, '搜索角色...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none focus:border-game-primary transition-colors" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {GENSHIN_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: GENSHIN_ELEMENT_COLORS[el] } : {}}>
                {GENSHIN_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 max-h-64 overflow-y-auto">
            {filtered.map((c) => {
              const isSelected = (selectingSlot === 'A' && charA?.id === c.id) || (selectingSlot === 'B' && charB?.id === c.id);
              const otherChar = selectingSlot === 'A' ? charB : charA;
              const isOther = otherChar?.id === c.id;
              return (
                <button key={c.id} disabled={isOther}
                  onClick={() => {
                    if (selectingSlot === 'A') setCharA(c);
                    else setCharB(c);
                    setSelectingSlot(null);
                    setSearch('');
                    setFilterElement('all');
                  }}
                  className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${
                    isSelected ? 'border-game-primary bg-game-primary/10 ring-1 ring-game-primary/30' :
                    isOther ? 'border-game-border bg-game-surface-alt opacity-30 cursor-not-allowed' :
                    'border-game-border bg-game-surface-alt hover:border-game-primary/50'
                  }`}>
                  <CharacterAvatar src={getGenshinCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                  <span className={`text-center text-[11px] leading-tight ${isSelected ? 'font-medium text-game-primary' : 'text-game-text-muted group-hover:text-game-text'}`}>
                    {getGenshinCharacterName(c, locale)}
                  </span>
                  <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Content */}
      {bothSelected && charA && charB && (
        <div className="space-y-4">
          {/* Tier Rank Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '强度评级', 'Tier Rating', 'ティア評価')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <TierCard char={charA} locale={locale} />
              <TierCard char={charB} locale={locale} />
            </div>
          </div>

          {/* Skills Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '技能对比', 'Skills Comparison', 'スキル比較')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <SkillList char={charA} locale={locale} />
              <SkillList char={charB} locale={locale} />
            </div>
          </div>

          {/* Build Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '配装对比', 'Build Comparison', 'ビルド比較')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <BuildCard char={charA} weapon={weaponA} artifact={artifactA} locale={locale} />
              <BuildCard char={charB} weapon={weaponB} artifact={artifactB} locale={locale} />
            </div>
          </div>

          {/* Team Comps Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '推荐配队对比', 'Team Comps', 'パーティ比較')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <TeamCompsCard char={charA} locale={locale} />
              <TeamCompsCard char={charB} locale={locale} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '基本信息', 'Basic Info', '基本情報')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-game-border">
                    <th className="py-2 px-3 text-left text-xs font-medium text-game-text-muted"></th>
                    <th className="py-2 px-3 text-center text-xs font-medium text-game-primary">{getGenshinCharacterName(charA, locale)}</th>
                    <th className="py-2 px-3 text-center text-xs font-medium text-game-accent">{getGenshinCharacterName(charB, locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  <StatRow label={t(locale, '稀有度', 'Rarity', 'レアリティ')} valueA={`${charA.rarity}★`} valueB={`${charB.rarity}★`} />
                  <StatRow label={t(locale, '元素', 'Element', '元素')} valueA={GENSHIN_ELEMENT_NAMES[charA.element]?.[locale] ?? charA.element} valueB={GENSHIN_ELEMENT_NAMES[charB.element]?.[locale] ?? charB.element} />
                  <StatRow label={t(locale, '武器类型', 'Weapon Type', '武器タイプ')} valueA={WEAPON_TYPE_NAMES[charA.weaponType]?.[locale] ?? charA.weaponType} valueB={WEAPON_TYPE_NAMES[charB.weaponType]?.[locale] ?? charB.weaponType} />
                  <StatRow label={t(locale, '地区', 'Region', '地域')} valueA={charA.region} valueB={charB.region} />
                  <StatRow label={t(locale, '版本', 'Version', 'バージョン')} valueA={charA.releaseVersion} valueB={charB.releaseVersion} />
                  <StatRow label={t(locale, '获取方式', 'Acquisition', '入手方法')} valueA={locale === 'zh' ? charA.acquisitionMethod : charA.status} valueB={locale === 'zh' ? charB.acquisitionMethod : charB.status} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Sub-components
// =====================================================================

function TierCard({ char, locale }: { char: GenshinCharacter; locale: SupportedLocale }) {
  return (
    <div className="rounded-lg bg-game-surface-alt p-3">
      <div className="mb-2 flex items-center gap-2">
        <CharacterAvatar src={getGenshinCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-10 w-10 rounded-lg object-cover" />
        <span className="font-medium text-game-text text-sm">{getGenshinCharacterName(char, locale)}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-xl font-bold text-white" style={{ backgroundColor: TIER_COLORS[char.tierRank] || '#6b7280' }}>
          {char.tierRank}
        </span>
      </div>
      <p className="text-xs text-game-text-muted leading-relaxed">
        {locale === 'zh' ? char.tierReasonZh : char.tierReason}
      </p>
    </div>
  );
}

function SkillList({ char, locale }: { char: GenshinCharacter; locale: SupportedLocale }) {
  const skillLabels: Record<string, Record<string, string>> = {
    normalAttack: { zh: '普通攻击', en: 'Normal Attack', ja: '通常攻撃' },
    elementalSkill: { zh: '元素战技', en: 'Elemental Skill', ja: '元素スキル' },
    elementalBurst: { zh: '元素爆发', en: 'Elemental Burst', ja: '元素爆発' },
  };

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center gap-2">
        <CharacterAvatar src={getGenshinCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-8 w-8 rounded-lg object-cover" />
        <span className="font-medium text-game-text text-sm">{getGenshinCharacterName(char, locale)}</span>
      </div>
      {(['normalAttack', 'elementalSkill', 'elementalBurst'] as const).map((key) => {
        const skill = char.skills[key];
        if (!skill) return null;
        const name = locale === 'zh' ? skill.name : skill.nameEn;
        const desc = locale === 'zh' ? skill.description : skill.descriptionEn;
        const cd = 'cooldown' in skill ? skill.cooldown : undefined;
        const cost = 'cost' in skill ? skill.cost : undefined;
        return (
          <div key={key} className="rounded-lg bg-game-surface-alt p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-game-primary">{skillLabels[key]?.[locale] ?? key}</span>
              <div className="flex gap-2">
                {cd && <span className="text-[10px] text-game-text-muted">CD: {cd}</span>}
                {cost !== undefined && <span className="text-[10px] text-blue-400">{t(locale as SupportedLocale, '能量', 'Energy', 'エネルギー')}: {cost}</span>}
              </div>
            </div>
            <div className="text-xs font-medium text-game-text mb-0.5">{name}</div>
            <p className="text-[11px] text-game-text-muted leading-relaxed line-clamp-3">{desc}</p>
          </div>
        );
      })}
    </div>
  );
}

function BuildCard({ char, weapon, artifact, locale }: {
  char: GenshinCharacter;
  weapon: GenshinWeapon | null;
  artifact: ReturnType<typeof resolveArtifact>;
  locale: SupportedLocale;
}) {
  const build = char.recommendedBuild;

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center gap-2">
        <CharacterAvatar src={getGenshinCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-8 w-8 rounded-lg object-cover" />
        <span className="font-medium text-game-text text-sm">{getGenshinCharacterName(char, locale)}</span>
      </div>
      {/* Weapon */}
      <div className="rounded-lg bg-game-surface-alt p-2.5">
        <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '武器', 'Weapon', '武器')}</div>
        {weapon ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-game-text">{getGenshinWeaponName(weapon, locale)}</span>
            <span className="text-[10px] text-yellow-500">{'★'.repeat(weapon.rarity)}</span>
            <span className="text-[10px] text-game-text-muted">ATK {weapon.baseAtk}</span>
          </div>
        ) : (
          <span className="text-xs text-game-text">{build.bestWeapon}</span>
        )}
      </div>
      {/* Artifact */}
      <div className="rounded-lg bg-game-surface-alt p-2.5">
        <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '圣遗物', 'Artifact', '聖遺物')}</div>
        {artifact ? (
          <span className="text-xs font-medium text-game-text">{getArtifactSetName(artifact, locale)}</span>
        ) : (
          <span className="text-xs text-game-text">{build.bestArtifactSet}</span>
        )}
      </div>
      {/* Main Stats */}
      <div className="rounded-lg bg-game-surface-alt p-2.5">
        <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '主属性', 'Main Stats', 'メイン')}</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(locale === 'zh' ? build.mainStats : build.mainStatsEn).map(([slot, stat]) => (
            <span key={slot} className="rounded-full bg-game-primary/20 px-2 py-0.5 text-[10px] font-medium text-game-primary">
              {stat}
            </span>
          ))}
        </div>
      </div>
      {/* Substat Priority */}
      <div className="rounded-lg bg-game-surface-alt p-2.5">
        <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '副属性优先级', 'Substats', 'サブステータス')}</div>
        <div className="flex flex-wrap gap-1">
          {(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).map((stat, i) => (
            <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${i === 0 ? 'bg-game-primary text-white' : 'bg-game-primary/15 text-game-primary'}`}>
              {stat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamCompsCard({ char, locale }: { char: GenshinCharacter; locale: SupportedLocale }) {
  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center gap-2">
        <CharacterAvatar src={getGenshinCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-8 w-8 rounded-lg object-cover" />
        <span className="font-medium text-game-text text-sm">{getGenshinCharacterName(char, locale)}</span>
      </div>
      {char.teamComps.slice(0, 3).map((comp, idx) => (
        <div key={idx} className="rounded-lg bg-game-surface-alt p-2.5">
          <div className="text-xs font-medium text-game-text mb-1">
            {locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}
          </div>
          <div className="flex flex-wrap gap-1">
            {comp.members.map((member) => {
              const memberChar = genshinCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
              return (
                <span key={member} className="rounded-full bg-game-surface px-2 py-0.5 text-[10px] text-game-text-muted border border-game-border">
                  {memberChar ? getGenshinCharacterName(memberChar, locale) : member}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <tr className="border-b border-game-border/50">
      <td className="py-2 px-3 text-xs text-game-text-muted">{label}</td>
      <td className="py-2 px-3 text-center text-xs text-game-text">{valueA}</td>
      <td className="py-2 px-3 text-center text-xs text-game-text">{valueB}</td>
    </tr>
  );
}

// =====================================================================
// Star Rail Compare
// =====================================================================

function resolveSRLightCone(build: { bestLightConeEn: string }): StarRailLightCone | null {
  return starrailLightCones.find((lc) => lc.nameEn.toLowerCase() === build.bestLightConeEn.toLowerCase()) ?? null;
}

function resolveSRRelic(build: { bestRelicSetEn: string }): StarRailRelicSet | null {
  return relicSets.find((s) => s.nameEn.toLowerCase() === build.bestRelicSetEn.toLowerCase()) ?? null;
}

function StarRailCompare({ locale }: { locale: SupportedLocale }) {
  const [charA, setCharA] = useState<StarRailCharacter | null>(null);
  const [charB, setCharB] = useState<StarRailCharacter | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<'A' | 'B' | null>(null);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');

  const filtered = useMemo(() => {
    let chars = starrailCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const bothSelected = charA && charB;
  const gameConfig = GAMES.starrail;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '角色对比', 'Character Compare', 'キャラ比較')}
      </h1>

      {/* Slot Selection Bar */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {(['A', 'B'] as const).map((slot) => {
          const char = slot === 'A' ? charA : charB;
          const setChar = slot === 'A' ? setCharA : setCharB;
          const ringClass = slot === 'A' ? 'ring-game-primary/50' : 'ring-game-accent/50';
          return (
            <div key={slot} className="rounded-xl border border-game-border bg-game-surface p-4">
              {char ? (
                <div className="flex items-center gap-3">
                  <CharacterAvatar src={getStarRailCharacterImage(char)} alt={char.nameEn} element={char.element} className={`h-14 w-14 rounded-xl object-cover ring-2 ${ringClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-game-text">{getStarRailCharacterName(char, locale)}</span>
                      <span className="text-sm text-yellow-500">{char.rarity}★</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: SR_ELEMENT_COLORS[char.element] }}>
                        {SR_ELEMENT_NAMES[char.element]?.[locale] ?? char.element}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-game-text-muted">
                      {SR_PATH_NAMES[char.path]?.[locale] ?? char.path} · {char.tierRank}
                    </div>
                  </div>
                  <button onClick={() => { setChar(null); setSelectingSlot(slot); }} className="rounded-lg border border-game-border px-2 py-1 text-xs text-game-text-muted hover:border-game-primary hover:text-game-primary transition-colors">
                    {t(locale, '换', 'Swap', '変更')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setSelectingSlot(selectingSlot === slot ? null : slot)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${selectingSlot === slot ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary/50'}`}>
                  <span className="text-lg">+</span>
                  <span className="text-sm font-medium">{t(locale, `选择角色 ${slot}`, `Select Character ${slot}`, `キャラ${slot}を選択`)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selector */}
      {selectingSlot && (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-game-primary">{t(locale, '选择角色', 'Select Character', 'キャラを選択')}</h3>
            <button onClick={() => setSelectingSlot(null)} className="text-xs text-game-text-muted hover:text-game-text">✕</button>
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, '搜索角色...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none focus:border-game-primary transition-colors" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {SR_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: SR_ELEMENT_COLORS[el] } : {}}>
                {SR_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 max-h-64 overflow-y-auto">
            {filtered.map((c) => {
              const otherChar = selectingSlot === 'A' ? charB : charA;
              const isOther = otherChar?.id === c.id;
              return (
                <button key={c.id} disabled={isOther}
                  onClick={() => { if (selectingSlot === 'A') setCharA(c); else setCharB(c); setSelectingSlot(null); setSearch(''); setFilterElement('all'); }}
                  className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${isOther ? 'border-game-border bg-game-surface-alt opacity-30 cursor-not-allowed' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                  <CharacterAvatar src={getStarRailCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                  <span className="text-center text-[11px] leading-tight text-game-text-muted group-hover:text-game-text">{getStarRailCharacterName(c, locale)}</span>
                  <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison */}
      {bothSelected && charA && charB && (
        <div className="space-y-4">
          {/* Tier */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '强度评级', 'Tier Rating', 'ティア評価')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[charA, charB].map((char, i) => (
                <div key={i} className="rounded-lg bg-game-surface-alt p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <CharacterAvatar src={getStarRailCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-10 w-10 rounded-lg object-cover" />
                    <span className="font-medium text-game-text text-sm">{getStarRailCharacterName(char, locale)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-xl font-bold text-white" style={{ backgroundColor: TIER_COLORS[char.tierRank] || '#6b7280' }}>{char.tierRank}</span>
                  </div>
                  <p className="text-xs text-game-text-muted leading-relaxed">{locale === 'zh' ? char.tierReasonZh : char.tierReason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Build */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '配装对比', 'Build Comparison', 'ビルド比較')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[charA, charB].map((char, i) => {
                const build = char.recommendedBuild;
                const lc = resolveSRLightCone(build);
                const relic = resolveSRRelic(build);
                return (
                  <div key={i} className="space-y-2">
                    <div className="mb-2 flex items-center gap-2">
                      <CharacterAvatar src={getStarRailCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-8 w-8 rounded-lg object-cover" />
                      <span className="font-medium text-game-text text-sm">{getStarRailCharacterName(char, locale)}</span>
                    </div>
                    <div className="rounded-lg bg-game-surface-alt p-2.5">
                      <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '光锥', 'Light Cone', '光円錐')}</div>
                      {lc ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-game-text">{getStarRailLightConeName(lc, locale)}</span>
                          <span className="text-[10px] text-yellow-500">{'★'.repeat(lc.rarity)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-game-text">{locale === 'zh' ? build.bestLightCone : build.bestLightConeEn}</span>
                      )}
                    </div>
                    <div className="rounded-lg bg-game-surface-alt p-2.5">
                      <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '遗器', 'Relic', '遺物')}</div>
                      {relic ? (
                        <span className="text-xs font-medium text-game-text">{getRelicSetName(relic, locale)}</span>
                      ) : (
                        <span className="text-xs text-game-text">{locale === 'zh' ? build.bestRelicSet : build.bestRelicSetEn}</span>
                      )}
                    </div>
                    <div className="rounded-lg bg-game-surface-alt p-2.5">
                      <div className="text-[10px] text-game-text-muted mb-1">{t(locale, '主属性', 'Main Stats', 'メイン')}</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(locale === 'zh' ? build.mainStats : build.mainStatsEn).map(([slot, stat]) => (
                          <span key={slot} className="rounded-full bg-game-primary/20 px-2 py-0.5 text-[10px] font-medium text-game-primary">{stat}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teams */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '推荐配队对比', 'Team Comps', 'パーティ比較')}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[charA, charB].map((char, i) => (
                <div key={i} className="space-y-2">
                  <div className="mb-2 flex items-center gap-2">
                    <CharacterAvatar src={getStarRailCharacterImage(char)} alt={char.nameEn} element={char.element} className="h-8 w-8 rounded-lg object-cover" />
                    <span className="font-medium text-game-text text-sm">{getStarRailCharacterName(char, locale)}</span>
                  </div>
                  {char.teamComps.slice(0, 3).map((comp, idx) => (
                    <div key={idx} className="rounded-lg bg-game-surface-alt p-2.5">
                      <div className="text-xs font-medium text-game-text mb-1">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {comp.members.map((member) => {
                          const mc = starrailCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                          return <span key={member} className="rounded-full bg-game-surface px-2 py-0.5 text-[10px] text-game-text-muted border border-game-border">{mc ? getStarRailCharacterName(mc, locale) : member}</span>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '基本信息', 'Basic Info', '基本情報')}</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-game-border">
                <th className="py-2 px-3 text-left text-xs font-medium text-game-text-muted"></th>
                <th className="py-2 px-3 text-center text-xs font-medium text-game-primary">{getStarRailCharacterName(charA, locale)}</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-game-accent">{getStarRailCharacterName(charB, locale)}</th>
              </tr></thead>
              <tbody>
                <StatRow label={t(locale, '稀有度', 'Rarity', 'レアリティ')} valueA={`${charA.rarity}★`} valueB={`${charB.rarity}★`} />
                <StatRow label={t(locale, '元素', 'Element', '元素')} valueA={SR_ELEMENT_NAMES[charA.element]?.[locale] ?? charA.element} valueB={SR_ELEMENT_NAMES[charB.element]?.[locale] ?? charB.element} />
                <StatRow label={t(locale, '命途', 'Path', '運命')} valueA={SR_PATH_NAMES[charA.path]?.[locale] ?? charA.path} valueB={SR_PATH_NAMES[charB.path]?.[locale] ?? charB.path} />
                <StatRow label={t(locale, '版本', 'Version', 'バージョン')} valueA={charA.releaseVersion} valueB={charB.releaseVersion} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// WuWa Compare
// =====================================================================

function WuWaCompare({ locale }: { locale: SupportedLocale }) {
  const [charA, setCharA] = useState<WuWaCharacter | null>(null);
  const [charB, setCharB] = useState<WuWaCharacter | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<'A' | 'B' | null>(null);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');

  const filtered = useMemo(() => {
    let chars = wuwaCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const bothSelected = charA && charB;
  const gameConfig = GAMES.wuwa;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '角色对比', 'Character Compare', 'キャラ比較')}
      </h1>

      <div className="mb-6 grid grid-cols-2 gap-4">
        {(['A', 'B'] as const).map((slot) => {
          const char = slot === 'A' ? charA : charB;
          const setChar = slot === 'A' ? setCharA : setCharB;
          const ringClass = slot === 'A' ? 'ring-game-primary/50' : 'ring-game-accent/50';
          return (
            <div key={slot} className="rounded-xl border border-game-border bg-game-surface p-4">
              {char ? (
                <div className="flex items-center gap-3">
                  <CharacterAvatar src={getWuWaCharacterImage(char)} alt={char.nameEn} element={char.element} className={`h-14 w-14 rounded-xl object-cover ring-2 ${ringClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-game-text">{getWuWaCharacterName(char, locale)}</span>
                      <span className="text-sm text-yellow-500">{char.rarity}★</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: WUWA_ELEMENT_COLORS[char.element] }}>
                        {WUWA_ELEMENT_NAMES[char.element]?.[locale] ?? char.element}
                      </span>
                    </div>
                    {char.tierRank && <div className="mt-0.5 text-xs text-game-text-muted">{char.tierRank}</div>}
                  </div>
                  <button onClick={() => { setChar(null); setSelectingSlot(slot); }} className="rounded-lg border border-game-border px-2 py-1 text-xs text-game-text-muted hover:border-game-primary hover:text-game-primary transition-colors">
                    {t(locale, '换', 'Swap', '変更')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setSelectingSlot(selectingSlot === slot ? null : slot)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${selectingSlot === slot ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary/50'}`}>
                  <span className="text-lg">+</span>
                  <span className="text-sm font-medium">{t(locale, `选择角色 ${slot}`, `Select Character ${slot}`, `キャラ${slot}を選択`)}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectingSlot && (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-game-primary">{t(locale, '选择角色', 'Select Character', 'キャラを選択')}</h3>
            <button onClick={() => setSelectingSlot(null)} className="text-xs text-game-text-muted hover:text-game-text">✕</button>
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, '搜索角色...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none focus:border-game-primary transition-colors" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {WUWA_ELEMENTS.map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: WUWA_ELEMENT_COLORS[el] } : {}}>
                {WUWA_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 max-h-64 overflow-y-auto">
            {filtered.map((c) => {
              const otherChar = selectingSlot === 'A' ? charB : charA;
              const isOther = otherChar?.id === c.id;
              return (
                <button key={c.id} disabled={isOther}
                  onClick={() => { if (selectingSlot === 'A') setCharA(c); else setCharB(c); setSelectingSlot(null); setSearch(''); setFilterElement('all'); }}
                  className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${isOther ? 'border-game-border bg-game-surface-alt opacity-30 cursor-not-allowed' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                  <CharacterAvatar src={getWuWaCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                  <span className="text-center text-[11px] leading-tight text-game-text-muted group-hover:text-game-text">{getWuWaCharacterName(c, locale)}</span>
                  <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {bothSelected && charA && charB && (
        <div className="space-y-4">
          {/* Stats Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '属性对比', 'Stats Comparison', 'ステータス比較')}</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-game-border">
                <th className="py-2 px-3 text-left text-xs font-medium text-game-text-muted"></th>
                <th className="py-2 px-3 text-center text-xs font-medium text-game-primary">{getWuWaCharacterName(charA, locale)}</th>
                <th className="py-2 px-3 text-center text-xs font-medium text-game-accent">{getWuWaCharacterName(charB, locale)}</th>
              </tr></thead>
              <tbody>
                <StatRow label="HP" valueA={String(charA.stats.hp)} valueB={String(charB.stats.hp)} />
                <StatRow label="ATK" valueA={String(charA.stats.atk)} valueB={String(charB.stats.atk)} />
                <StatRow label="DEF" valueA={String(charA.stats.def)} valueB={String(charB.stats.def)} />
                <StatRow label={t(locale, '能量', 'Energy', 'エネルギー')} valueA={String(charA.stats.energy)} valueB={String(charB.stats.energy)} />
                <StatRow label="CRIT Rate" valueA={`${(charA.stats.critRate * 100).toFixed(1)}%`} valueB={`${(charB.stats.critRate * 100).toFixed(1)}%`} />
                <StatRow label="CRIT DMG" valueA={`${(charA.stats.critDmg * 100).toFixed(1)}%`} valueB={`${(charB.stats.critDmg * 100).toFixed(1)}%`} />
                <StatRow label={t(locale, '稀有度', 'Rarity', 'レアリティ')} valueA={`${charA.rarity}★`} valueB={`${charB.rarity}★`} />
                <StatRow label={t(locale, '元素', 'Element', '元素')} valueA={WUWA_ELEMENT_NAMES[charA.element]?.[locale] ?? charA.element} valueB={WUWA_ELEMENT_NAMES[charB.element]?.[locale] ?? charB.element} />
                <StatRow label={t(locale, '版本', 'Version', 'バージョン')} valueA={charA.releaseVersion} valueB={charB.releaseVersion} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// NTE Compare
// =====================================================================

const NTE_CMP_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};
const NTE_CMP_NAMES: Record<string, Record<string, string>> = {
  anima: { zh: '创生', en: 'Anima' }, chaos: { zh: '混沌', en: 'Chaos' },
  cosmos: { zh: '宇宙', en: 'Cosmos' }, incantation: { zh: '咒术', en: 'Incantation' },
  lakshana: { zh: '相', en: 'Lakshana' }, psyche: { zh: '精神', en: 'Psyche' },
};

function NteCompare({ locale }: { locale: SupportedLocale }) {
  const [char1, setChar1] = useState<NteCharacter | null>(null);
  const [char2, setChar2] = useState<NteCharacter | null>(null);
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');

  const filtered1 = useMemo(() => {
    if (!search1.trim()) return nteCharacters;
    const q = search1.toLowerCase();
    return nteCharacters.filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q));
  }, [search1]);
  const filtered2 = useMemo(() => {
    if (!search2.trim()) return nteCharacters;
    const q = search2.toLowerCase();
    return nteCharacters.filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q));
  }, [search2]);

  const gameConfig = GAMES.nte;

  const CharSelector = ({ char, setChar, search, setSearch, filtered, label }: {
    char: NteCharacter | null; setChar: (c: NteCharacter) => void;
    search: string; setSearch: (s: string) => void;
    filtered: NteCharacter[]; label: string;
  }) => (
    <div className="flex-1 rounded-xl border border-game-border bg-game-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-game-primary">{label}</h3>
      {char ? (
        <div className="mb-3 flex items-center gap-3">
          <CharacterAvatar src={getNteCharacterImage(char)} alt={char.nameEn} element={char.attribute} className="h-12 w-12 rounded-lg object-cover" />
          <div>
            <p className="font-semibold text-game-text">{getNteCharacterName(char, locale)}</p>
            <div className="flex items-center gap-2 text-xs text-game-text-muted">
              <span style={{ color: NTE_CMP_COLORS[char.attribute] }}>{NTE_CMP_NAMES[char.attribute]?.[locale] ?? char.attribute}</span>
              <span>{char.rank}-Rank</span>
              {char.tierRank && <span className="font-bold text-red-400">{char.tierRank}</span>}
            </div>
          </div>
        </div>
      ) : (
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, '搜索角色...', 'Search...', '検索...')}
          className="mb-2 w-full rounded-lg border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none focus:border-game-primary" />
      )}
      {!char && (
        <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setChar(c)}
              className="flex items-center gap-2 rounded-lg border border-game-border bg-game-surface-alt p-2 text-left text-xs transition-colors hover:border-game-primary">
              <CharacterAvatar src={getNteCharacterImage(c)} alt="" element={c.attribute} className="h-8 w-8 rounded object-cover" />
              <span className="text-game-text">{getNteCharacterName(c, locale)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '角色对比', 'Character Compare', 'キャラ比較')}
      </h1>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <CharSelector char={char1} setChar={setChar1} search={search1} setSearch={setSearch1} filtered={filtered1} label={t(locale, '角色 A', 'Character A', 'キャラA')} />
        <CharSelector char={char2} setChar={setChar2} search={search2} setSearch={setSearch2} filtered={filtered2} label={t(locale, '角色 B', 'Character B', 'キャラB')} />
      </div>

      {char1 && char2 && (
        <div className="space-y-4">
          {/* Tier Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '等级对比', 'Tier Comparison', 'ティア比較')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{char1.tierRank || '-'}</p>
                <p className="text-xs text-game-text-muted">{getNteCharacterName(char1, locale)}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{char2.tierRank || '-'}</p>
                <p className="text-xs text-game-text-muted">{getNteCharacterName(char2, locale)}</p>
              </div>
            </div>
            {(char1.tierReason || char2.tierReason) && (
              <div className="mt-3 grid grid-cols-2 gap-4 border-t border-game-border pt-3">
                <p className="text-xs text-game-text-muted">{getNteCharacterTierReason(char1, locale)}</p>
                <p className="text-xs text-game-text-muted">{getNteCharacterTierReason(char2, locale)}</p>
              </div>
            )}
          </div>

          {/* Build Comparison */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '配装对比', 'Build Comparison', 'ビルド比較')}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[char1, char2].map((c, i) => (
                <div key={i}>
                  <p className="mb-1 font-medium text-game-text">{getNteCharacterName(c, locale)}</p>
                  <p className="text-xs text-game-text-muted">{t(locale, '弧盘', 'Arc')}: {locale === 'zh' ? c.recommendedBuild.bestWeapon : c.recommendedBuild.bestWeaponEn}</p>
                  <p className="text-xs text-game-text-muted">{t(locale, '光盘', 'Disk')}: {locale === 'zh' ? c.recommendedBuild.bestDiskSet : c.recommendedBuild.bestDiskSetEn}</p>
                  <p className="text-xs text-game-text-muted">{t(locale, '副属性', 'Subs')}: {(locale === 'zh' ? c.recommendedBuild.subStatPriority : c.recommendedBuild.subStatPriorityEn).slice(0, 3).join(' > ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Coming Soon
// =====================================================================

function ComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-game-text-muted">{t(locale, '敬请期待', 'Coming Soon', 'Coming Soon')}</h2>
        <p className="text-sm text-game-text-muted">{t(locale, '该游戏的对比功能正在开发中', 'Compare tool for this game is under development', 'このゲームの比較機能は開発中です')}</p>
      </div>
    </div>
  );
}
