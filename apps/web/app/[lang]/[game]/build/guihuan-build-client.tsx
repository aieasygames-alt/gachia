'use client';



import { useState, useMemo, useEffect, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

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

export function GuihuanBuildRecommender({ locale }: { locale: SupportedLocale }) {
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
