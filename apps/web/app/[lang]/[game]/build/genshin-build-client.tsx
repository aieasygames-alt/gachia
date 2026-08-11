'use client';



import { useState, useMemo, useEffect, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

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

import { CharacterAvatar } from '@/components/wiki/character-avatar';
import type { SupportedLocale } from '@gachia/core';


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

function getBuildNextSteps(gameId: string, locale: SupportedLocale): NextStepLink[] {
  const titles = {
    characters: { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' },
    weapons: { zh: '看武器图鉴', en: 'Browse Weapons', ja: '武器図鑑を見る' },
    version: { zh: '看版本更新', en: 'Check Version Updates', ja: '更新情報を見る' },
  } as const;

  const descriptions = {
    characters: {
      zh: '先把角色底池和定位看清，再回到配装页挑最合适的方案。',
      en: 'Review the roster and roles first, then come back to the build page for the best fit.',
      ja: 'まずキャラの役割を確認してから、最適なビルドに戻りましょう。',
    },
    weapons: {
      zh: '对照可用武器和替代方案，快速补齐主武器选择。',
      en: 'Compare available weapons and backups to lock in the best main option.',
      ja: '候補武器を見比べて、主武器の選択を絞り込みます。',
    },
    version: {
      zh: '如果想看当前版本的角色调整、活动和趋势，这里是下一站。',
      en: 'For current patch changes, events, and meta shifts, this is the next stop.',
      ja: '最新パッチの調整、イベント、環境変化を見るならここです。',
    },
  } as const;

  return [
    {
      href: `/${gameId}/characters`,
      title: titles.characters,
      description: descriptions.characters,
    },
    {
      href: `/${gameId}/weapons`,
      title: titles.weapons,
      description: descriptions.weapons,
    },
    {
      href: `/${gameId}/version`,
      title: titles.version,
      description: descriptions.version,
    },
  ];
}

function withNextSteps(content: ReactNode, locale: SupportedLocale, links: NextStepLink[]) {
  return (
    <>
      {content}
      <NextStepStrip locale={locale} links={links} />
    </>
  );
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
// Genshin Build Recommender
// =====================================================================

export function GenshinBuildRecommender({ locale }: { locale: SupportedLocale }) {
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
