'use client';



import { useState, useMemo, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import {
  nteCharacters,
  getNteCharacterName,
  getNteCharacterImage,
  getNteCharacterTierReason,
} from '@gachia/data/games/nte/characters';

import type { NteCharacter } from '@gachia/data/games/nte/types';

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


export function NteCompare({ locale }: { locale: SupportedLocale }) {
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
