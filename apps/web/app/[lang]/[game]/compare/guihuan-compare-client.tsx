'use client';



import { useState, useMemo, type ReactNode } from 'react';

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

// --- Endfield Constants ---
const ENDFIELD_ELEMENTS = ['physical', 'heat', 'cryo', 'nature', 'electric'] as const;
const ENDFIELD_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', heat: '#ef4444', cryo: '#67e8f9',
  nature: '#4ade80', electric: '#facc15',
};
const ENDFIELD_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  heat: { zh: '热能', en: 'Heat', ja: 'ヒート' },
  cryo: { zh: '冷冻', en: 'Cryo', ja: 'フロスト' },
  nature: { zh: '自然', en: 'Nature', ja: 'ネイチャー' },
  electric: { zh: '电击', en: 'Electric', ja: 'エレキ' },
};

// --- Sea Constants ---
const SEA_ATTRIBUTES = ['str', 'agi', 'con', 'int', 'per', 'cha'] as const;
const SEA_ATTRIBUTE_COLORS: Record<string, string> = {
  str: '#ef4444',
  agi: '#22c55e',
  con: '#f97316',
  int: '#8b5cf6',
  per: '#3b82f6',
  cha: '#ec4899',
};
const SEA_ATTRIBUTE_NAMES: Record<string, Record<string, string>> = {
  str: { zh: '力量', en: 'Strength', ja: '筋力' },
  agi: { zh: '敏捷', en: 'Agility', ja: '俊敏' },
  con: { zh: '体质', en: 'Constitution', ja: '体質' },
  int: { zh: '智力', en: 'Intelligence', ja: '知力' },
  per: { zh: '感知', en: 'Perception', ja: '感知' },
  cha: { zh: '魅力', en: 'Charisma', ja: '魅力' },
};

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

function getCompareNextSteps(gameId: string, locale: SupportedLocale): NextStepLink[] {
  if (gameId === 'sea') {
    return [
      {
        href: '/sea/characters',
        title: { zh: '看船员图鉴', en: 'Browse Crew', ja: '船員図鑑を見る' },
        description: {
          zh: '先看船员定位和技能，再回到对比页判断会更稳。',
          en: 'Review crew roles and skills first, then compare with more context.',
          ja: 'まず船員の役割とスキルを見てから比較すると判断しやすくなります。',
        },
      },
      {
        href: '/sea/guides/launch-day-guide',
        title: { zh: '看开服路线', en: 'Open launch guide', ja: '開服ガイドを見る' },
        description: {
          zh: '把角色选择放回首日路线和资源节奏里看，会更接近真实决策。',
          en: 'Place crew choices back into your day-one route and resource rhythm.',
          ja: 'キャラ選択を初日ルートと資源配分に戻して考えると現実的です。',
        },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        title: { zh: '看资源怎么花', en: 'Read spend plan', ja: '資源プランを見る' },
        description: {
          zh: '对比完角色后，继续解决首月抽角色还是追外观的问题。',
          en: 'After comparing crews, decide whether launch resources go to power or cosmetics.',
          ja: '比較の次は、初月の資源を戦力か外観かどちらに使うかを決めましょう。',
        },
      },
    ];
  }

  const titles = {
    characters: { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' },
    build: { zh: '看配装推荐', en: 'Open Build Recommender', ja: 'ビルドを見る' },
    version: { zh: '看版本更新', en: 'Check Version Updates', ja: '更新情報を見る' },
  } as const;

  const descriptions = {
    characters: {
      zh: '先确认角色定位和养成基础，再回来对比更容易看出差异。',
      en: 'Review character roles and basics first, then compare with more context.',
      ja: 'まず役割と基礎情報を確認すると、比較しやすくなります。',
    },
    build: {
      zh: '如果你已经选好角色，这里可以直接看对应配装和替代方案。',
      en: 'If you already picked a character, jump straight to the recommended build and backups.',
      ja: 'キャラが決まっているなら、推奨ビルドと代替案へ進めます。',
    },
    version: {
      zh: '想看当前版本更适合谁、谁被加强了，可以从这里继续。',
      en: 'For current patch winners, buffs, and meta shifts, this is the next stop.',
      ja: '現行バージョンの強化対象や環境変化を見るならここです。',
    },
  } as const;

  return [
    {
      href: `/${gameId}/characters`,
      title: titles.characters,
      description: descriptions.characters,
    },
    {
      href: `/${gameId}/build`,
      title: titles.build,
      description: descriptions.build,
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
// Guihun Compare
// =====================================================================

const GUIHUN_CMP_ELEMENT_COLORS: Record<string, string> = {
  flame: '#ef4444', frost: '#67e8f9', thunder: '#8b5cf6',
  gale: '#6ee7b7', radiance: '#fbbf24', void: '#a855f7',
};
const GUIHUN_CMP_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  flame: { zh: '焰', en: 'Flame', ja: '炎' }, frost: { zh: '霜', en: 'Frost', ja: '氷' },
  thunder: { zh: '雷', en: 'Thunder', ja: '雷' }, gale: { zh: '岚', en: 'Gale', ja: '嵐' },
  radiance: { zh: '光', en: 'Radiance', ja: '光' }, void: { zh: '虚', en: 'Void', ja: '虚' },
};

function StatRow({ label, valueA, valueB }: { label: string; valueA: string; valueB: string }) {
  return (
    <tr className="border-b border-game-border/50">
      <td className="py-2 px-3 text-xs text-game-text-muted">{label}</td>
      <td className="py-2 px-3 text-center text-xs text-game-text">{valueA}</td>
      <td className="py-2 px-3 text-center text-xs text-game-text">{valueB}</td>
    </tr>
  );
}


export function GuihunCompare({ locale }: { locale: SupportedLocale }) {
  const [char1, setChar1] = useState<GuihuanCharacter | null>(null);
  const [char2, setChar2] = useState<GuihuanCharacter | null>(null);
  const [selecting, setSelecting] = useState<1 | 2>(1);

  function selectChar(c: GuihuanCharacter) {
    if (selecting === 1) { setChar1(c); setSelecting(2); }
    else { setChar2(c); setSelecting(1); }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-game-text-muted">
        {t(locale, '选择两位角色进行对比', 'Select two characters to compare', '2人のキャラを選択して比較')}
        {selecting === 1 ? ` (${t(locale, '选择第一位', 'Select 1st', '1人目を選択')})` : ` (${t(locale, '选择第二位', 'Select 2nd', '2人目を選択')})`}
      </p>

      {/* Character grid */}
      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {guihuanCharacters.map((c) => (
          <button key={c.id} onClick={() => selectChar(c)} className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:border-game-primary ${char1?.id === c.id || char2?.id === c.id ? 'border-game-primary bg-game-surface' : 'border-game-border'}`}>
            <CharacterAvatar src={getGuihuanCharacterImage(c)} alt={getGuihuanCharacterName(c, locale)} element={c.element} className="h-10 w-10 rounded object-cover" />
            <span className="text-[10px] text-game-text text-center leading-tight">{getGuihuanCharacterName(c, locale)}</span>
          </button>
        ))}
      </div>

      {/* Comparison */}
      {char1 && char2 && (
        <div className="grid grid-cols-2 gap-4">
          {[char1, char2].map((ch) => {
            const build = ch.recommendedBuild;
            const weapon = guihuanWeapons.find((w) => w.nameEn.toLowerCase() === build.bestWeaponEn?.toLowerCase()) ?? null;
            return (
              <div key={ch.id} className="rounded-lg border border-game-border bg-game-surface p-4">
                <div className="mb-3 flex items-center gap-3">
                  <CharacterAvatar src={getGuihuanCharacterImage(ch)} alt={getGuihuanCharacterName(ch, locale)} element={ch.element} className="h-14 w-14 rounded-lg object-cover" />
                  <div>
                    <h3 className="font-semibold text-game-text">{getGuihuanCharacterName(ch, locale)}</h3>
                    <div className="flex gap-1 text-xs">
                      <span className="rounded px-1" style={{ backgroundColor: GUIHUN_CMP_ELEMENT_COLORS[ch.element], color: '#fff' }}>
                        {GUIHUN_CMP_ELEMENT_NAMES[ch.element]?.[locale] ?? ch.element}
                      </span>
                      <span className="text-yellow-500">{ch.rarity}★</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-game-text-muted">{t(locale, '定位', 'Role', '役割')}:</span> {locale === 'zh' ? ch.role : ch.roleEn}</p>
                  {weapon ? (
                    <p><span className="text-game-text-muted">{t(locale, '武器', 'Weapon', '武器')}:</span> {getGuihuanWeaponName(weapon, locale)} <span className="text-[10px] text-yellow-500">{'★'.repeat(weapon.rarity)}</span></p>
                  ) : (
                    <p><span className="text-game-text-muted">{t(locale, '武器', 'Weapon', '武器')}:</span> {locale === 'zh' ? build.bestWeapon : build.bestWeaponEn}</p>
                  )}
                  <p><span className="text-game-text-muted">{t(locale, '强度评级', 'Tier Rating', 'ティア評価')}:</span> <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: TIER_COLORS[ch.tierRank] || '#6b7280' }}>{ch.tierRank}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
