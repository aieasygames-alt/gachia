'use client';



import { useState, useMemo, useEffect, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

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

import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { getUsableStarRailBuild } from '@gachia/data/games/starrail/build';
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


export function StarRailBuildRecommender({ locale }: { locale: SupportedLocale }) {
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

  const build = getUsableStarRailBuild(selectedChar?.recommendedBuild);
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

      {selectedChar && !build && (
        <p role="status" className="mb-6 rounded-xl border border-game-border bg-game-surface p-4 text-sm text-game-text-muted">
          {t(locale, '该角色的配装资料尚未补齐，暂不提供光锥、遗器和词条推荐。你可以更换角色或先查看角色资料。', 'Build data for this character is incomplete. Light cone, relic and stat recommendations are pending. Choose another character or browse the character details.', 'このキャラの装備データは準備中です。光円錐・遺物・ステータスの推奨は未掲載です。別のキャラを選ぶか、キャラ詳細をご覧ください。')}
        </p>
      )}

      {selectedChar && build && (
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
