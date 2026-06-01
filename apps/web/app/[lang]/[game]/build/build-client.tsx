'use client';

import { useState, useMemo, useEffect } from 'react';
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
  getGenshinWeaponEffect,
} from '@gachia/data/games/genshin/weapons';
import {
  artifactSets,
  getArtifactSetName,
  getArtifactSetDesc2pc,
  getArtifactSetDesc4pc,
} from '@gachia/data/games/genshin/artifacts';
import type { GenshinCharacter, GenshinWeapon, GenshinArtifactSet } from '@gachia/data/games/genshin/types';
import {
  starrailCharacters,
  getStarRailCharacterName,
  getStarRailCharacterImage,
} from '@gachia/data/games/starrail/characters';
import {
  starrailLightCones,
  getStarRailLightConeName,
  getStarRailLightConeEffect,
} from '@gachia/data/games/starrail/weapons';
import {
  relicSets,
  getRelicSetName,
  getRelicSetDesc2pc,
  getRelicSetDesc4pc,
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
import {
  zzzCharacters,
  getZzzCharacterName,
  getZzzCharacterImage,
} from '@gachia/data/games/zzz/characters';
import type { ZzzCharacter } from '@gachia/data/games/zzz/types';
import {
  guihuanCharacters,
  getGuihuanCharacterName,
  getGuihuanCharacterImage,
} from '@gachia/data/games/guihuan/characters';
import {
  guihuanWeapons,
  getGuihuanWeaponName,
  getGuihuanWeaponEffect,
} from '@gachia/data/games/guihuan/weapons';
import type { GuihuanCharacter, GuihuanWeapon } from '@gachia/data/games/guihuan/types';
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

const SLOT_LABELS: Record<string, Record<string, string>> = {
  Sands: { zh: '时之沙', en: 'Sands', ja: '時の砂' },
  Goblet: { zh: '空之杯', en: 'Goblet', ja: '空の杯' },
  Circlet: { zh: '理之冠', en: 'Circlet', ja: '理の冠' },
};

const WEAPON_TYPE_NAMES: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const RARITY_BG: Record<number, string> = { 3: 'bg-blue-900/40', 4: 'bg-purple-900/40', 5: 'bg-yellow-900/40' };
const RARITY_BORDER: Record<number, string> = { 3: 'border-blue-700', 4: 'border-purple-700', 5: 'border-yellow-600' };

// --- Star Rail Constants ---

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
const STARRAIL_PATH_NAMES: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' }, hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' }, harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' }, preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' }, remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
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

function resolveArtifactSet(build: { bestArtifactSetEn: string }): GenshinArtifactSet | null {
  return artifactSets.find((s) => s.nameEn.toLowerCase() === build.bestArtifactSetEn.toLowerCase()) ?? null;
}

function resolveAltArtifactSet(build: { alternativeArtifactSetEn?: string }): GenshinArtifactSet | null {
  if (!build.alternativeArtifactSetEn || !build.alternativeArtifactSetEn.trim()) return null;
  return artifactSets.find((s) => s.nameEn.toLowerCase() === build.alternativeArtifactSetEn!.toLowerCase()) ?? null;
}

// =====================================================================
// Client Component
// =====================================================================

export function BuildClient({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  if (gameId === 'genshin') return <GenshinBuildRecommender locale={locale} />;
  if (gameId === 'starrail') return <StarRailBuildRecommender locale={locale} />;
  if (gameId === 'wuwa') return <WuWaBuildRecommender locale={locale} />;
  if (gameId === 'nte') return <NteBuildRecommender locale={locale} />;
  if (gameId === 'zzz') return <ZzzBuildRecommender locale={locale} />;
  if (gameId === 'guihuan') return <GuihuanBuildRecommender locale={locale} />;
  return <ComingSoon locale={locale} />;
}

// =====================================================================
// Genshin Build Recommender
// =====================================================================

function GenshinBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<GenshinCharacter | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [shareCopied, setShareCopied] = useState(false);

  // Read character ID from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const char = genshinCharacters.find(c => c.id === hash);
      if (char) { setSelectedChar(char); setShowSelector(false); }
    }
  }, []);

  const filtered = useMemo(() => {
    let chars = genshinCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (filterRarity !== 'all') chars = chars.filter((c) => c.rarity === Number(filterRarity));
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement, filterRarity]);

  const build = selectedChar?.recommendedBuild;
  const weapon = build ? resolveWeapon(build) : null;
  const artifactSet = build ? resolveArtifactSet(build) : null;
  const altArtifactSet = build ? resolveAltArtifactSet(build) : null;
  const isGeneric = build ? build.bestWeaponEn.toLowerCase().includes('generic') : false;

  // Alternative weapons of same type
  const altWeapons = useMemo(() => {
    if (!selectedChar || !isGeneric) return [];
    return genshinWeapons
      .filter((w) => w.weaponType === selectedChar.weaponType && w.rarity >= 4)
      .sort((a, b) => b.rarity - a.rarity || b.baseAtk - a.baseAtk)
      .slice(0, 5);
  }, [selectedChar, isGeneric]);

  const gameConfig = GAMES.genshin;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配装推荐', 'Build Recommender', 'ビルドおすすめ')}
      </h1>

      {/* Selected Character Card */}
      {selectedChar && !showSelector ? (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <CharacterAvatar src={getGenshinCharacterImage(selectedChar)} alt={selectedChar.nameEn} element={selectedChar.element} className="h-16 w-16 rounded-xl object-cover ring-2 ring-game-primary/50" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-game-text">{getGenshinCharacterName(selectedChar, locale)}</h2>
              <span className="text-sm font-bold text-yellow-500">{selectedChar.rarity}★</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[selectedChar.element] }}>
                {GENSHIN_ELEMENT_NAMES[selectedChar.element]?.[locale] ?? selectedChar.element}
              </span>
              <span className="text-xs text-game-text-muted">{WEAPON_TYPE_NAMES[selectedChar.weaponType]?.[locale] ?? selectedChar.weaponType}</span>
            </div>
          </div>
          <button onClick={() => setShowSelector(true)} className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
            {t(locale, '更换角色', 'Change', '変更')}
          </button>
          <button onClick={() => {
            const url = window.location.origin + window.location.pathname + '#' + selectedChar.id;
            navigator.clipboard.writeText(url);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
          }} className="rounded-lg border border-game-primary/30 bg-game-primary/10 px-3 py-1.5 text-sm text-game-primary transition-colors hover:bg-game-primary/20">
            {shareCopied ? '✓' : t(locale, '分享', 'Share', '共有')}
          </button>
        </div>
      ) : null}

      {/* Character Selector */}
      {showSelector ? (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
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
          <div className="mb-4 flex gap-1.5">
            {['all', '4', '5'].map((r) => (
              <button key={r} onClick={() => setFilterRarity(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === r ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
                {r === 'all' ? t(locale, '全部稀有度', 'All Rarities', '全レアリティ') : `${r}★`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { setSelectedChar(c); setShowSelector(false); setSearch(''); setFilterElement('all'); setFilterRarity('all'); }}
                className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${selectedChar?.id === c.id ? 'border-game-primary bg-game-primary/10 ring-1 ring-game-primary/30' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                <CharacterAvatar src={getGenshinCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                <span className={`text-center text-[11px] leading-tight ${selectedChar?.id === c.id ? 'font-medium text-game-primary' : 'text-game-text-muted group-hover:text-game-text'}`}>
                  {getGenshinCharacterName(c, locale)}
                </span>
                <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-game-text-muted">
                {t(locale, '没有找到角色', 'No characters found', 'キャラが見つかりません')}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Build Content */}
      {build && (
        <div className="space-y-4">
          {/* Weapon Card */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '最佳武器', 'Best Weapon', '最佳武器')}
            </h3>
            {weapon ? (
              <div className={`rounded-lg border p-3 ${RARITY_BG[weapon.rarity] || ''} ${RARITY_BORDER[weapon.rarity] || 'border-game-border'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-game-text">{getGenshinWeaponName(weapon, locale)}</span>
                  <span className="text-xs text-yellow-500">{'★'.repeat(weapon.rarity)}</span>
                </div>
                <div className="flex gap-4 text-xs text-game-text-muted mb-2">
                  <span>{t(locale, '基础攻击', 'Base ATK', '基礎攻撃')}: <span className="font-medium text-game-text">{weapon.baseAtk}</span></span>
                  {weapon.subStat && <span>{weapon.subStat}: <span className="font-medium text-game-text">{weapon.subStatValue}</span></span>}
                </div>
                {weapon.effectNameEn && (
                  <div className="text-xs text-game-text-muted">
                    <span className="font-medium text-game-text">{getGenshinWeaponEffect(weapon, locale).name}</span>
                    <span className="ml-1">{getGenshinWeaponEffect(weapon, locale).description}</span>
                  </div>
                )}
              </div>
            ) : isGeneric && altWeapons.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-game-text-muted">{t(locale, '推荐使用以下武器', 'Recommended weapons', 'おすすめ武器')}</p>
                <div className="space-y-2">
                  {altWeapons.map((w) => (
                    <div key={w.id} className={`rounded-lg border p-2.5 ${RARITY_BG[w.rarity] || ''} ${RARITY_BORDER[w.rarity] || 'border-game-border'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-game-text">{getGenshinWeaponName(w, locale)}</span>
                        <span className="text-[10px] text-yellow-500">{'★'.repeat(w.rarity)}</span>
                        <span className="text-xs text-game-text-muted">ATK {w.baseAtk}</span>
                        {w.subStat && <span className="text-xs text-game-text-muted">{w.subStat} {w.subStatValue}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-game-text-muted">{build.bestWeapon}</p>
            )}
          </div>

          {/* Artifact Set Card */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '圣遗物套装', 'Artifact Set', '聖遺物セット')}
            </h3>
            {artifactSet ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/20 p-3">
                  <div className="mb-2 font-medium text-game-text">{getArtifactSetName(artifactSet, locale)}</div>
                  <div className="text-xs text-game-text-muted mb-1">
                    <span className="font-medium text-game-primary">2pc:</span> {getArtifactSetDesc2pc(artifactSet, locale)}
                  </div>
                  <div className="text-xs text-game-text-muted">
                    <span className="font-medium text-game-accent">4pc:</span> {getArtifactSetDesc4pc(artifactSet, locale)}
                  </div>
                </div>
                {altArtifactSet && (
                  <div className="rounded-lg border border-game-border bg-game-surface-alt p-3">
                    <div className="mb-1 text-xs text-game-text-muted">{t(locale, '备选', 'Alternative', '代替')}</div>
                    <div className="font-medium text-game-text text-sm">{getArtifactSetName(altArtifactSet, locale)}</div>
                    <div className="text-xs text-game-text-muted mt-1">
                      <span className="font-medium text-game-primary">2pc:</span> {getArtifactSetDesc2pc(altArtifactSet, locale)}
                    </div>
                    <div className="text-xs text-game-text-muted">
                      <span className="font-medium text-game-accent">4pc:</span> {getArtifactSetDesc4pc(altArtifactSet, locale)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-game-text-muted">{build.bestArtifactSet}</p>
            )}
          </div>

          {/* Main Stats */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '主属性', 'Main Stats', 'メインステータス')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(locale === 'zh' ? build.mainStats : build.mainStatsEn).map(([slot, stat]) => (
                <div key={slot} className="rounded-lg bg-game-surface-alt p-3 text-center">
                  <div className="text-xs text-game-text-muted mb-1">{SLOT_LABELS[slot]?.[locale] ?? slot}</div>
                  <div className="rounded-full bg-game-primary/20 px-2 py-0.5 text-xs font-medium text-game-primary inline-block">
                    {stat}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Substat Priority */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '副属性优先级', 'Substat Priority', 'サブステータス優先度')}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).map((stat, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    i === 0 ? 'bg-game-primary text-white' : i <= 2 ? 'bg-game-primary/20 text-game-primary' : 'bg-game-surface-alt text-game-text-muted'
                  }`}>
                    <span className="text-[10px] opacity-70">#{i + 1}</span> {stat}
                  </span>
                  {i < (locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).length - 1 && (
                    <span className="text-game-text-muted text-xs">&gt;</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Team Compositions */}
          {selectedChar.teamComps && selectedChar.teamComps.length > 0 && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {t(locale, '推荐配队', 'Team Compositions', 'おすすめパーティ')}
              </h3>
              <div className="space-y-3">
                {selectedChar.teamComps.map((comp, idx) => (
                  <div key={idx} className="rounded-lg bg-game-surface-alt p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-game-text">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</span>
                    </div>
                    <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? comp.description : comp.descriptionEn ?? comp.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.members.map((member) => {
                        const memberChar = genshinCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                        return (
                          <span key={member} className="rounded-full bg-game-surface px-2.5 py-0.5 text-xs text-game-text-muted border border-game-border">
                            {memberChar ? getGenshinCharacterName(memberChar, locale) : member}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Star Rail Build Recommender
// =====================================================================

function resolveLightCone(build: { bestLightConeEn: string }): StarRailLightCone | null {
  return starrailLightCones.find((lc) => lc.nameEn.toLowerCase() === build.bestLightConeEn.toLowerCase()) ?? null;
}

function resolveRelicSet(build: { bestRelicSetEn: string }): StarRailRelicSet | null {
  return relicSets.find((s) => s.nameEn.toLowerCase() === build.bestRelicSetEn.toLowerCase()) ?? null;
}

function resolvePlanar(build: { bestPlanarOrnamentEn: string }): StarRailRelicSet | null {
  return relicSets.find((s) => s.nameEn.toLowerCase() === build.bestPlanarOrnamentEn.toLowerCase()) ?? null;
}

function StarRailBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<StarRailCharacter | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const char = starrailCharacters.find(c => c.id === hash);
      if (char) { setSelectedChar(char); setShowSelector(false); }
    }
  }, []);
  const [filterRarity, setFilterRarity] = useState<string>('all');

  const filtered = useMemo(() => {
    let chars = starrailCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (filterRarity !== 'all') chars = chars.filter((c) => c.rarity === Number(filterRarity));
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement, filterRarity]);

  const build = selectedChar?.recommendedBuild;
  const lightCone = build ? resolveLightCone(build) : null;
  const relic = build ? resolveRelicSet(build) : null;
  const planar = build ? resolvePlanar(build) : null;

  // Alt light cones of same path
  const altLightCones = useMemo(() => {
    if (!selectedChar || !build) return [];
    return starrailLightCones
      .filter((lc) => lc.path === selectedChar.path && lc.rarity >= 4 && lc.nameEn.toLowerCase() !== build.bestLightConeEn.toLowerCase())
      .sort((a, b) => b.rarity - a.rarity || b.baseAtk - a.baseAtk)
      .slice(0, 4);
  }, [selectedChar, build]);

  const gameConfig = GAMES.starrail;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配装推荐', 'Build Recommender', 'ビルドおすすめ')}
      </h1>

      {selectedChar && !showSelector ? (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <CharacterAvatar src={getStarRailCharacterImage(selectedChar)} alt={selectedChar.nameEn} element={selectedChar.element} className="h-16 w-16 rounded-xl object-cover ring-2 ring-game-primary/50" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-game-text">{getStarRailCharacterName(selectedChar, locale)}</h2>
              <span className="text-sm font-bold text-yellow-500">{selectedChar.rarity}★</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: STARRAIL_ELEMENT_COLORS[selectedChar.element] }}>
                {STARRAIL_ELEMENT_NAMES[selectedChar.element]?.[locale] ?? selectedChar.element}
              </span>
              <span className="text-xs text-game-text-muted">{STARRAIL_PATH_NAMES[selectedChar.path]?.[locale] ?? selectedChar.path}</span>
            </div>
          </div>
          <button onClick={() => setShowSelector(true)} className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
            {t(locale, '更换角色', 'Change', '変更')}
          </button>
          <button onClick={() => {
            const url = window.location.origin + window.location.pathname + '#' + selectedChar.id;
            navigator.clipboard.writeText(url);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
          }} className="rounded-lg border border-game-primary/30 bg-game-primary/10 px-3 py-1.5 text-sm text-game-primary transition-colors hover:bg-game-primary/20">
            {shareCopied ? '✓' : t(locale, '分享', 'Share', '共有')}
          </button>
        </div>
      ) : null}

      {showSelector ? (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary" />
          <div className="mb-3 flex flex-wrap gap-1.5">
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
          <div className="mb-4 flex gap-1.5">
            {['all', '4', '5'].map((r) => (
              <button key={r} onClick={() => setFilterRarity(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterRarity === r ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
                {r === 'all' ? t(locale, '全部稀有度', 'All Rarities', '全レアリティ') : `${r}★`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { setSelectedChar(c); setShowSelector(false); setSearch(''); setFilterElement('all'); setFilterRarity('all'); }}
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

      {build && (
        <div className="space-y-4">
          {/* Light Cone */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '最佳光锥', 'Best Light Cone', '最佳光円錐')}
            </h3>
            {lightCone ? (
              <div className={`rounded-lg border p-3 ${RARITY_BG[lightCone.rarity] || ''} ${RARITY_BORDER[lightCone.rarity] || 'border-game-border'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-game-text">{getStarRailLightConeName(lightCone, locale)}</span>
                  <span className="text-xs text-yellow-500">{'★'.repeat(lightCone.rarity)}</span>
                </div>
                <div className="flex gap-4 text-xs text-game-text-muted mb-2">
                  <span>HP <span className="font-medium text-game-text">{lightCone.baseHp}</span></span>
                  <span>ATK <span className="font-medium text-game-text">{lightCone.baseAtk}</span></span>
                  <span>DEF <span className="font-medium text-game-text">{lightCone.baseDef}</span></span>
                </div>
                {lightCone.effectNameEn && (
                  <div className="text-xs text-game-text-muted">
                    <span className="font-medium text-game-text">{getStarRailLightConeEffect(lightCone, locale).name}</span>
                    <span className="ml-1">{getStarRailLightConeEffect(lightCone, locale).description}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-game-text-muted">{locale === 'zh' ? build.bestLightCone : build.bestLightConeEn}</p>
            )}
            {altLightCones.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-game-text-muted">{t(locale, '备选光锥', 'Alternative Light Cones', '代替光円錐')}</div>
                {altLightCones.map((lc) => (
                  <div key={lc.id} className={`rounded-lg border p-2 ${RARITY_BG[lc.rarity] || ''} ${RARITY_BORDER[lc.rarity] || 'border-game-border'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-game-text">{getStarRailLightConeName(lc, locale)}</span>
                      <span className="text-[10px] text-yellow-500">{'★'.repeat(lc.rarity)}</span>
                      <span className="text-xs text-game-text-muted">ATK {lc.baseAtk}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Relic Set */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '遗器套装', 'Relic Set', '遺物セット')}
            </h3>
            {relic ? (
              <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/20 p-3">
                <div className="mb-2 font-medium text-game-text">{getRelicSetName(relic, locale)}</div>
                <div className="text-xs text-game-text-muted mb-1">
                  <span className="font-medium text-game-primary">2pc:</span> {getRelicSetDesc2pc(relic, locale)}
                </div>
                {relic.bonus4pc && (
                  <div className="text-xs text-game-text-muted">
                    <span className="font-medium text-game-accent">4pc:</span> {getRelicSetDesc4pc(relic, locale)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-game-text-muted">{locale === 'zh' ? build.bestRelicSet : build.bestRelicSetEn}</p>
            )}
          </div>

          {/* Planar Ornament */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '位面饰品', 'Planar Ornament', '次元装飾')}
            </h3>
            {planar ? (
              <div className="rounded-lg border border-game-accent/30 bg-game-accent/10 p-3">
                <div className="mb-2 font-medium text-game-text">{getRelicSetName(planar, locale)}</div>
                <div className="text-xs text-game-text-muted">
                  <span className="font-medium text-game-accent">2pc:</span> {getRelicSetDesc2pc(planar, locale)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-game-text-muted">{locale === 'zh' ? build.bestPlanarOrnament : build.bestPlanarOrnamentEn}</p>
            )}
          </div>

          {/* Main Stats */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '主属性', 'Main Stats', 'メインステータス')}
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(locale === 'zh' ? build.mainStats : build.mainStatsEn).map(([slot, stat]) => (
                <div key={slot} className="rounded-lg bg-game-surface-alt p-3 text-center">
                  <div className="text-xs text-game-text-muted mb-1">{slot}</div>
                  <div className="rounded-full bg-game-primary/20 px-2 py-0.5 text-xs font-medium text-game-primary inline-block">{stat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Substat Priority */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '副属性优先级', 'Substat Priority', 'サブステータス優先度')}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).map((stat, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    i === 0 ? 'bg-game-primary text-white' : i <= 2 ? 'bg-game-primary/20 text-game-primary' : 'bg-game-surface-alt text-game-text-muted'
                  }`}>
                    <span className="text-[10px] opacity-70">#{i + 1}</span> {stat}
                  </span>
                  {i < (locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).length - 1 && (
                    <span className="text-game-text-muted text-xs">&gt;</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Team Comps */}
          {selectedChar.teamComps.length > 0 && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {t(locale, '推荐配队', 'Team Compositions', 'おすすめパーティ')}
              </h3>
              <div className="space-y-3">
                {selectedChar.teamComps.map((comp, idx) => (
                  <div key={idx} className="rounded-lg bg-game-surface-alt p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-game-text">{locale === 'zh' ? comp.name : comp.nameEn ?? comp.name}</span>
                    </div>
                    <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? comp.description : comp.descriptionEn ?? comp.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.members.map((member) => {
                        const mc = starrailCharacters.find((c) => c.id === member || c.name === member || c.nameEn === member);
                        return (
                          <span key={member} className="rounded-full bg-game-surface px-2.5 py-0.5 text-xs text-game-text-muted border border-game-border">
                            {mc ? getStarRailCharacterName(mc, locale) : member}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// WuWa Build Recommender
// =====================================================================

function WuWaBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<WuWaCharacter | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const char = wuwaCharacters.find(c => c.id === hash);
      if (char) { setSelectedChar(char); setShowSelector(false); }
    }
  }, []);

  const filtered = useMemo(() => {
    let chars = wuwaCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.element === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const gameConfig = GAMES.wuwa;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配装推荐', 'Build Recommender', 'ビルドおすすめ')}
      </h1>

      {selectedChar && !showSelector ? (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <CharacterAvatar src={getWuWaCharacterImage(selectedChar)} alt={selectedChar.nameEn} element={selectedChar.element} className="h-16 w-16 rounded-xl object-cover ring-2 ring-game-primary/50" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-game-text">{getWuWaCharacterName(selectedChar, locale)}</h2>
              <span className="text-sm font-bold text-yellow-500">{selectedChar.rarity}★</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: WUWA_ELEMENT_COLORS[selectedChar.element] }}>
                {WUWA_ELEMENT_NAMES[selectedChar.element]?.[locale] ?? selectedChar.element}
              </span>
            </div>
          </div>
          <button onClick={() => setShowSelector(true)} className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
            {t(locale, '更换角色', 'Change', '変更')}
          </button>
          <button onClick={() => {
            const url = window.location.origin + window.location.pathname + '#' + selectedChar.id;
            navigator.clipboard.writeText(url);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
          }} className="rounded-lg border border-game-primary/30 bg-game-primary/10 px-3 py-1.5 text-sm text-game-primary transition-colors hover:bg-game-primary/20">
            {shareCopied ? '✓' : t(locale, '分享', 'Share', '共有')}
          </button>
        </div>
      ) : null}

      {showSelector ? (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary" />
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { setSelectedChar(c); setShowSelector(false); setSearch(''); setFilterElement('all'); }}
                className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${selectedChar?.id === c.id ? 'border-game-primary bg-game-primary/10 ring-1 ring-game-primary/30' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                <CharacterAvatar src={getWuWaCharacterImage(c)} alt={c.nameEn} element={c.element} className="h-10 w-10 rounded-lg object-cover" />
                <span className={`text-center text-[11px] leading-tight ${selectedChar?.id === c.id ? 'font-medium text-game-primary' : 'text-game-text-muted group-hover:text-game-text'}`}>
                  {getWuWaCharacterName(c, locale)}
                </span>
                <span className="text-[10px] text-yellow-500">{c.rarity}★</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedChar && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '基础属性 (Lv.90)', 'Base Stats (Lv.90)', '基礎ステータス (Lv.90)')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatBlock label="HP" value={selectedChar.stats.hp} />
              <StatBlock label="ATK" value={selectedChar.stats.atk} />
              <StatBlock label="DEF" value={selectedChar.stats.def} />
              <StatBlock label={t(locale, '能量', 'Energy', 'エネルギー')} value={selectedChar.stats.energy} />
              <StatBlock label="CRIT Rate" value={`${(selectedChar.stats.critRate * 100).toFixed(1)}%`} />
              <StatBlock label="CRIT DMG" value={`${(selectedChar.stats.critDmg * 100).toFixed(1)}%`} />
            </div>
          </div>

          {/* Skills */}
          {selectedChar.skills && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {t(locale, '技能', 'Skills', 'スキル')}
              </h3>
              <div className="space-y-2">
                {[
                  { key: 'basicAtk', label: t(locale, '普攻', 'Basic ATK', '通常攻撃') },
                  { key: 'resonanceSkill', label: t(locale, '共鸣技能', 'Resonance Skill', '共鳴スキル') },
                  { key: 'resonanceLiberation', label: t(locale, '共鸣解放', 'Resonance Liberation', '共鳴解放') },
                  { key: 'forteCircuit', label: t(locale, '固有技能', 'Forte Circuit', '固有スキル') },
                  { key: 'introSkill', label: t(locale, '变奏技能', 'Intro Skill', '変奏スキル') },
                  { key: 'outroSkill', label: t(locale, '延奏技能', 'Outro Skill', '延奏スキル') },
                ].map(({ key, label }) => {
                  const skill = (selectedChar.skills as unknown as Record<string, { name: string; nameEn: string; description: string; descriptionEn: string }>)[key];
                  if (!skill) return null;
                  return (
                    <details key={key} className="group rounded-lg border border-game-border bg-game-surface-alt">
                      <summary className="cursor-pointer px-3 py-2 text-sm">
                        <span className="mr-2 text-xs text-game-primary">[{label}]</span>
                        <span className="font-medium text-game-text group-hover:text-game-primary">{locale === 'zh' ? skill.name : skill.nameEn}</span>
                      </summary>
                      <div className="border-t border-game-border px-3 py-2 text-xs leading-relaxed text-game-text-muted">
                        {locale === 'zh' ? skill.description : skill.descriptionEn}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sequences */}
          {selectedChar.sequences && selectedChar.sequences.length > 0 && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">
                {t(locale, '共鸣链', 'Resonance Chain', '共鳴鎖')}
              </h3>
              <div className="space-y-2">
                {selectedChar.sequences.map((seq) => (
                  <details key={seq.level} className="group rounded-lg border border-game-border bg-game-surface-alt">
                    <summary className="cursor-pointer px-3 py-2 text-sm">
                      <span className="mr-2 text-xs text-game-primary">[S{seq.level}]</span>
                      <span className="font-medium text-game-text group-hover:text-game-primary">{locale === 'zh' ? seq.name : seq.nameEn}</span>
                    </summary>
                    <div className="border-t border-game-border px-3 py-2 text-xs leading-relaxed text-game-text-muted">
                      {locale === 'zh' ? seq.description : seq.descriptionEn}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface-alt p-3 text-center">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className="text-lg font-bold text-game-text">{value}</div>
    </div>
  );
}

// =====================================================================
// NTE Build Recommender
// =====================================================================

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};
const NTE_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  anima: { zh: '创生', en: 'Anima', ja: '創生' },
  chaos: { zh: '混沌', en: 'Chaos', ja: '混沌' },
  cosmos: { zh: '宇宙', en: 'Cosmos', ja: '宇宙' },
  incantation: { zh: '咒术', en: 'Incantation', ja: '呪術' },
  lakshana: { zh: '相', en: 'Lakshana', ja: 'ラクシャナ' },
  psyche: { zh: '精神', en: 'Psyche', ja: 'サイキ' },
};

function NteBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<NteCharacter | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [search, setSearch] = useState('');
  const [filterElement, setFilterElement] = useState<string>('all');
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const char = nteCharacters.find(c => c.id === hash);
      if (char) { setSelectedChar(char); setShowSelector(false); }
    }
  }, []);

  const filtered = useMemo(() => {
    let chars = nteCharacters;
    if (filterElement !== 'all') chars = chars.filter((c) => c.attribute === filterElement);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter((c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.id.includes(q));
    }
    return chars;
  }, [search, filterElement]);

  const gameConfig = GAMES.nte;
  const build = selectedChar?.recommendedBuild;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {t(locale, '配装推荐', 'Build Recommender', 'ビルドおすすめ')}
      </h1>

      {selectedChar && !showSelector ? (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-game-primary/30 bg-game-surface p-4">
          <CharacterAvatar src={getNteCharacterImage(selectedChar)} alt={selectedChar.nameEn} element={selectedChar.attribute} className="h-16 w-16 rounded-xl object-cover ring-2 ring-game-primary/50" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-game-text">{getNteCharacterName(selectedChar, locale)}</h2>
              <span className="text-sm font-bold text-yellow-500">{selectedChar.rank}-Rank</span>
              <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: NTE_ELEMENT_COLORS[selectedChar.attribute] || '#888' }}>
                {NTE_ELEMENT_NAMES[selectedChar.attribute]?.[locale] ?? selectedChar.attribute}
              </span>
            </div>
            {selectedChar.tierRank && <span className="ml-2 text-sm font-bold text-red-400">{selectedChar.tierRank}</span>}
          </div>
          <button onClick={() => setShowSelector(true)} className="rounded-lg border border-game-border bg-game-surface-alt px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">
            {t(locale, '更换角色', 'Change', '変更')}
          </button>
          <button onClick={() => {
            const url = window.location.origin + window.location.pathname + '#' + selectedChar.id;
            navigator.clipboard.writeText(url);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
          }} className="rounded-lg border border-game-primary/30 bg-game-primary/10 px-3 py-1.5 text-sm text-game-primary transition-colors hover:bg-game-primary/20">
            {shareCopied ? '✓' : t(locale, '分享', 'Share', '共有')}
          </button>
        </div>
      ) : null}

      {showSelector ? (
        <div className="mb-6 rounded-xl border border-game-border bg-game-surface p-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(locale, '搜索角色名称...', 'Search character...', 'キャラを検索...')}
            className="mb-3 w-full rounded-lg border border-game-border bg-game-surface-alt px-4 py-2.5 text-sm text-game-text placeholder-game-text-muted/50 outline-none transition-colors focus:border-game-primary" />
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setFilterElement('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === 'all' ? 'bg-game-primary text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}>
              {t(locale, '全部', 'All', '全')}
            </button>
            {Object.keys(NTE_ELEMENT_COLORS).map((el) => (
              <button key={el} onClick={() => setFilterElement(el)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterElement === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'}`}
                style={filterElement === el ? { backgroundColor: NTE_ELEMENT_COLORS[el] } : {}}>
                {NTE_ELEMENT_NAMES[el]?.[locale] ?? el}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { setSelectedChar(c); setShowSelector(false); setSearch(''); setFilterElement('all'); }}
                className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${selectedChar?.id === c.id ? 'border-game-primary bg-game-primary/10 ring-1 ring-game-primary/30' : 'border-game-border bg-game-surface-alt hover:border-game-primary/50'}`}>
                <CharacterAvatar src={getNteCharacterImage(c)} alt={c.nameEn} element={c.attribute} className="h-10 w-10 rounded-lg object-cover" />
                <span className="text-center text-[11px] text-game-text">{locale === 'zh' ? c.name : c.nameEn}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedChar && build && (
        <div className="space-y-4">
          {selectedChar.tierReason && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <p className="text-sm text-game-primary">{getNteCharacterTierReason(selectedChar, locale)}</p>
            </div>
          )}

          {/* Build */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">
              {t(locale, '推荐配装', 'Recommended Build', 'おすすめビルド')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="w-28 shrink-0 text-game-text-muted">{t(locale, '最佳弧盘', 'Best Arc')}</span>
                <span className="text-game-text">{locale === 'zh' ? build.bestWeapon : build.bestWeaponEn}</span>
              </div>
              {build.alternativeWeapons.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 text-game-text-muted">{t(locale, '备选', 'Alternatives')}</span>
                  <span className="text-game-text">{build.alternativeWeapons.join(', ')}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="w-28 shrink-0 text-game-text-muted">{t(locale, '光盘套装', 'Disk Set')}</span>
                <span className="text-game-text">{locale === 'zh' ? build.bestDiskSet : build.bestDiskSetEn}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 shrink-0 text-game-text-muted">{t(locale, '主属性', 'Main Stats')}</span>
                <span className="text-game-text">{Object.values(locale === 'zh' ? build.mainStats : build.mainStatsEn).join(' / ')}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-28 shrink-0 text-game-text-muted">{t(locale, '副属性优先', 'Sub Stats')}</span>
                <span className="text-game-text">{(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).join(' > ')}</span>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-xl border border-game-border bg-game-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '技能', 'Skills', 'スキル')}</h3>
            <div className="space-y-2">
              <details className="group rounded-lg border border-game-border bg-game-surface-alt">
                <summary className="cursor-pointer px-3 py-2 text-sm">
                  <span className="mr-2 text-xs text-game-primary">[{t(locale, '普通攻击', 'Normal Attack', '通常攻撃')}]</span>
                  <span className="font-medium text-game-text">{locale === 'zh' ? selectedChar.skills.normalAttack.name : selectedChar.skills.normalAttack.nameEn}</span>
                </summary>
                <div className="border-t border-game-border px-3 py-2 text-xs text-game-text-muted">{locale === 'zh' ? selectedChar.skills.normalAttack.description : selectedChar.skills.normalAttack.descriptionEn}</div>
              </details>
              <details className="group rounded-lg border border-game-border bg-game-surface-alt">
                <summary className="cursor-pointer px-3 py-2 text-sm">
                  <span className="mr-2 text-xs text-game-primary">[{t(locale, '战技', 'Skill', '戦技')}]</span>
                  <span className="font-medium text-game-text">{locale === 'zh' ? selectedChar.skills.skill.name : selectedChar.skills.skill.nameEn}</span>
                </summary>
                <div className="border-t border-game-border px-3 py-2 text-xs text-game-text-muted">{locale === 'zh' ? selectedChar.skills.skill.description : selectedChar.skills.skill.descriptionEn}</div>
              </details>
              <details className="group rounded-lg border border-game-border bg-game-surface-alt">
                <summary className="cursor-pointer px-3 py-2 text-sm">
                  <span className="mr-2 text-xs text-game-primary">[{t(locale, '终结技', 'Ultimate', '必殺技')}]</span>
                  <span className="font-medium text-game-text">{locale === 'zh' ? selectedChar.skills.ultimate.name : selectedChar.skills.ultimate.nameEn}</span>
                </summary>
                <div className="border-t border-game-border px-3 py-2 text-xs text-game-text-muted">{locale === 'zh' ? selectedChar.skills.ultimate.description : selectedChar.skills.ultimate.descriptionEn}</div>
              </details>
            </div>
          </div>

          {/* Team Comps */}
          {selectedChar.teamComps.length > 0 && (
            <div className="rounded-xl border border-game-border bg-game-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-game-primary">{t(locale, '推荐配队', 'Team Comps', 'おすすめパーティ')}</h3>
              <div className="space-y-3">
                {selectedChar.teamComps.map((team, i) => (
                  <div key={i} className="rounded-lg border border-game-border bg-game-surface-alt p-3">
                    <h4 className="mb-1 text-sm font-semibold text-game-text">{locale === 'zh' ? team.name : team.nameEn}</h4>
                    <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {team.members.map((memberId) => {
                        const member = nteCharacters.find(c => c.id === memberId);
                        return member ? (
                          <button key={memberId} onClick={() => { setSelectedChar(member); setShowSelector(false); }}
                            className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-primary hover:text-game-accent">
                            {getNteCharacterName(member, locale)}
                          </button>
                        ) : (
                          <span key={memberId} className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Coming Soon
// =====================================================================

// =====================================================================
// ZZZ Build Recommender
// =====================================================================

const ZZZ_ELEMENTS = ['physical', 'fire', 'ice', 'electric', 'ether', 'auric-ink', 'honed-edge', 'wind'] as const;
const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#a855f7',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};
const ZZZ_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  fire: { zh: '火', en: 'Fire', ja: '炎' },
  ice: { zh: '冰', en: 'Ice', ja: '氷' },
  electric: { zh: '电', en: 'Electric', ja: '電気' },
  ether: { zh: '以太', en: 'Ether', ja: 'エーテル' },
  'auric-ink': { zh: '墨韵', en: 'Auric Ink', ja: '墨韻' },
  'honed-edge': { zh: '利刃', en: 'Honed Edge', ja: '切刃' },
  wind: { zh: '风', en: 'Wind', ja: '風' },
};
const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  support: { zh: '支援', en: 'Support', ja: '支援' },
  defense: { zh: '防护', en: 'Defense', ja: '防護' },
  rupture: { zh: '突击', en: 'Rupture', ja: '突撃' },
};

// --- Guihuan Constants ---

const GUIHUAN_ELEMENTS = ['flame', 'frost', 'thunder', 'gale', 'radiance', 'void'] as const;
const GUIHUAN_ELEMENT_COLORS: Record<string, string> = {
  flame: '#ef4444', frost: '#67e8f9', thunder: '#8b5cf6',
  gale: '#6ee7b7', radiance: '#fbbf24', void: '#a855f7',
};
const GUIHUAN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  flame: { zh: '烈焰', en: 'Flame', ja: '烈焔' },
  frost: { zh: '霜寒', en: 'Frost', ja: '霜寒' },
  thunder: { zh: '雷霆', en: 'Thunder', ja: '雷霆' },
  gale: { zh: '疾风', en: 'Gale', ja: '疾風' },
  radiance: { zh: '光辉', en: 'Radiance', ja: '光輝' },
  void: { zh: '虚空', en: 'Void', ja: '虚空' },
};

function ZzzBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<ZzzCharacter | null>(null);
  const [elementFilter, setElementFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (elementFilter === 'all') return zzzCharacters;
    return zzzCharacters.filter((c) => c.attribute === elementFilter);
  }, [elementFilter]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-game-primary">
          {t(locale, '选择代理人查看推荐配装', 'Select an agent to view recommended build', 'エージェントを選択してビルドを確認')}
        </h2>
        {/* Element filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setElementFilter('all')} className={`rounded-full px-3 py-1 text-sm border transition-colors ${elementFilter === 'all' ? 'border-game-primary text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary'}`}>
            {t(locale, '全部', 'All', '全て')}
          </button>
          {ZZZ_ELEMENTS.map((el) => (
            <button key={el} onClick={() => setElementFilter(el)} className={`rounded-full px-3 py-1 text-sm border transition-colors ${elementFilter === el ? 'border-game-primary text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary'}`}>
              {ZZZ_ELEMENT_NAMES[el]?.[locale] ?? el}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Character grid */}
        <div className="grid flex-1 grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4">
          {filtered.map((char) => (
            <button key={char.id} onClick={() => setSelectedChar(char)} className={`group flex flex-col items-center gap-1 rounded-lg border bg-game-surface p-2 transition-all hover:border-game-primary ${selectedChar?.id === char.id ? 'border-game-primary' : 'border-game-border'}`}>
              <CharacterAvatar src={getZzzCharacterImage(char)} alt={getZzzCharacterName(char, locale)} element={char.attribute} className="h-14 w-14 rounded-lg object-cover" />
              <span className="text-center text-xs font-medium text-game-text">{getZzzCharacterName(char, locale)}</span>
              <div className="flex gap-1">
                <span className="text-[10px] px-1 rounded" style={{ backgroundColor: ZZZ_ELEMENT_COLORS[char.attribute], color: '#fff' }}>{ZZZ_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attribute}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Build details */}
        <div className="lg:w-80">
          {selectedChar ? (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-3 flex items-center gap-3">
                <CharacterAvatar src={getZzzCharacterImage(selectedChar)} alt={getZzzCharacterName(selectedChar, locale)} element={selectedChar.attribute} className="h-12 w-12 rounded-lg object-cover" />
                <div>
                  <h3 className="font-semibold text-game-text">{getZzzCharacterName(selectedChar, locale)}</h3>
                  <div className="flex gap-1 text-xs text-game-text-muted">
                    <span>{selectedChar.rank}-Rank</span>
                    <span>·</span>
                    <span>{ZZZ_SPECIALTY_LABELS[selectedChar.specialtyEn]?.[locale] ?? selectedChar.specialtyEn}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <BuildInfoRow label={t(locale, '最佳音擎', 'Best W-Engine', 'ベストWエンジン')} value={locale === 'zh' ? selectedChar.recommendedBuild.bestWeapon : selectedChar.recommendedBuild.bestWeaponEn} />
                {selectedChar.recommendedBuild.alternativeWeapons.length > 0 && (
                  <BuildInfoRow label={t(locale, '备选', 'Alt', '代替')} value={selectedChar.recommendedBuild.alternativeWeapons.join(', ')} />
                )}
                <BuildInfoRow label={t(locale, '驱动盘', 'Drive Disc', 'ドライブディスク')} value={locale === 'zh' ? selectedChar.recommendedBuild.bestDriveDisc : selectedChar.recommendedBuild.bestDriveDiscEn} />
                <BuildInfoRow label={t(locale, '主属性', 'Main Stats', 'メインステータス')} value={Object.values(locale === 'zh' ? selectedChar.recommendedBuild.mainStats : selectedChar.recommendedBuild.mainStatsEn).join(' / ')} />
                <BuildInfoRow label={t(locale, '副属性', 'Sub Stats', 'サブステータス')} value={(locale === 'zh' ? selectedChar.recommendedBuild.subStatPriority : selectedChar.recommendedBuild.subStatPriorityEn).join(' > ')} />
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
              {t(locale, '请选择一个代理人', 'Select an agent', 'エージェントを選択してください')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-game-text-muted">{label}</span>
      <p className="text-game-text">{value}</p>
    </div>
  );
}

// =====================================================================
// Guihuan Build Recommender
// =====================================================================

function GuihuanBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<GuihuanCharacter | null>(null);
  const [elementFilter, setElementFilter] = useState<string>('all');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const char = guihuanCharacters.find(c => c.id === hash);
      if (char) setSelectedChar(char);
    }
  }, []);

  const filtered = useMemo(() => {
    if (elementFilter === 'all') return guihuanCharacters;
    return guihuanCharacters.filter((c) => c.element === elementFilter);
  }, [elementFilter]);

  const resolvedWeapon = selectedChar ? guihuanWeapons.find((w) => w.nameEn.toLowerCase() === selectedChar.recommendedBuild.bestWeaponEn.toLowerCase()) ?? null : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-game-primary">
          {t(locale, '选择角色查看推荐配装', 'Select a character to view recommended build', 'キャラを選択してビルドを確認')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setElementFilter('all')} className={`rounded-md px-3 py-1 text-xs font-medium ${elementFilter === 'all' ? 'bg-game-primary text-game-bg' : 'bg-game-surface-alt text-game-text-muted'}`}>{t(locale, '全部', 'All', '全部')}</button>
          {GUIHUAN_ELEMENTS.map((el) => (
            <button key={el} onClick={() => setElementFilter(el)} className={`rounded-md px-3 py-1 text-xs font-medium ${elementFilter === el ? 'text-white' : 'bg-game-surface-alt text-game-text-muted'}`} style={elementFilter === el ? { backgroundColor: GUIHUAN_ELEMENT_COLORS[el] } : {}}>{GUIHUAN_ELEMENT_NAMES[el]?.[locale] ?? el}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Character grid */}
        <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((char) => (
            <button key={char.id} onClick={() => setSelectedChar(char)} className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-colors ${selectedChar?.id === char.id ? 'border-game-primary bg-game-surface-alt' : 'border-transparent bg-game-surface hover:border-game-border'}`}>
              <CharacterAvatar src={getGuihuanCharacterImage(char)} alt={getGuihuanCharacterName(char, locale)} element={char.element} className="h-12 w-12 rounded-lg object-cover" />
              <span className="text-xs font-medium text-game-text truncate w-full text-center">{getGuihuanCharacterName(char, locale)}</span>
              <div className="flex gap-1">
                <span className={`text-[10px] px-1 rounded ${char.rarity === 5 ? 'bg-cyan-900/40 text-cyan-300' : 'bg-purple-900/40 text-purple-300'}`}>{char.rarity === 5 ? 'SSR' : 'SR'}</span>
                <span className="text-[10px] px-1 rounded" style={{ backgroundColor: GUIHUAN_ELEMENT_COLORS[char.element], color: '#fff' }}>{GUIHUAN_ELEMENT_NAMES[char.element]?.[locale] ?? char.element}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Build details */}
        <div className="lg:w-80">
          {selectedChar ? (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-3 flex items-center gap-3">
                <CharacterAvatar src={getGuihuanCharacterImage(selectedChar)} alt={getGuihuanCharacterName(selectedChar, locale)} element={selectedChar.element} className="h-12 w-12 rounded-lg object-cover" />
                <div>
                  <h3 className="font-semibold text-game-text">{getGuihuanCharacterName(selectedChar, locale)}</h3>
                  <div className="flex gap-1 text-xs text-game-text-muted">
                    <span>{selectedChar.rarity === 5 ? 'SSR' : 'SR'}</span>
                    <span>·</span>
                    <span>{GUIHUAN_ELEMENT_NAMES[selectedChar.element]?.[locale] ?? selectedChar.element}</span>
                    <span>·</span>
                    <span>{selectedChar.roleEn}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <BuildInfoRow label={t(locale, '最佳武器', 'Best Weapon', 'ベスト武器')} value={locale === 'zh' ? selectedChar.recommendedBuild.bestWeapon : selectedChar.recommendedBuild.bestWeaponEn} />
                {resolvedWeapon && (
                  <div>
                    <span className="text-xs text-game-text-muted">{t(locale, '武器效果', 'Weapon Effect', '武器効果')}</span>
                    <p className="text-xs text-game-text">{locale === 'zh' ? resolvedWeapon.effectDescription : resolvedWeapon.effectDescriptionEn}</p>
                  </div>
                )}
                {selectedChar.recommendedBuild.alternativeWeapons.length > 0 && (
                  <BuildInfoRow label={t(locale, '备选', 'Alt', '代替')} value={(locale === 'zh' ? selectedChar.recommendedBuild.alternativeWeapons : selectedChar.recommendedBuild.alternativeWeapons).join(', ')} />
                )}
                <BuildInfoRow label={t(locale, '主属性', 'Main Stats', 'メインステータス')} value={Object.values(locale === 'zh' ? selectedChar.recommendedBuild.mainStats : selectedChar.recommendedBuild.mainStatsEn).join(' / ')} />
                <BuildInfoRow label={t(locale, '副属性', 'Sub Stats', 'サブステータス')} value={(locale === 'zh' ? selectedChar.recommendedBuild.subStatPriority : selectedChar.recommendedBuild.subStatPriorityEn).join(' > ')} />
              </div>
              {selectedChar.teamComps.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold text-game-text">{t(locale, '推荐配队', 'Recommended Teams', 'おすすめパーティ')}</h4>
                  {selectedChar.teamComps.map((team, i) => (
                    <div key={i} className="mb-2 rounded border border-game-border bg-game-surface-alt p-2 text-xs">
                      <p className="font-medium text-game-text">{locale === 'zh' ? team.name : team.nameEn}</p>
                      <p className="text-game-text-muted">{team.members.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
              {t(locale, '请选择一个角色', 'Select a character', 'キャラを選択してください')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-game-text-muted">{t(locale, '敬请期待', 'Coming Soon', 'Coming Soon')}</h2>
        <p className="text-sm text-game-text-muted">{t(locale, '该游戏的配装功能正在开发中', 'Build tool for this game is under development', 'このゲームのビルド機能は開発中です')}</p>
      </div>
    </div>
  );
}
