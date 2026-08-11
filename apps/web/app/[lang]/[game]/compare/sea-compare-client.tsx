'use client';



import { useState, useMemo, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import {
  seaCharacters,
  getSeaCharacterName,
  getSeaCharacterImage,
  getSeaCharacterTierReason,
} from '@gachia/data/games/sea/characters';

import type { SeaCharacter } from '@gachia/data/games/sea/types';

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
// Sea Compare
// =====================================================================

export function SeaCompare({ locale }: { locale: SupportedLocale }) {
  const [char1, setChar1] = useState<SeaCharacter | null>(null);
  const [char2, setChar2] = useState<SeaCharacter | null>(null);
  const [selecting, setSelecting] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [filterAttribute, setFilterAttribute] = useState<string>('all');

  function selectChar(c: SeaCharacter) {
    if (selecting === 1) {
      setChar1(c);
      setSelecting(2);
    } else {
      setChar2(c);
      setSelecting(1);
    }
  }

  const filtered = useMemo(() => {
    let chars = seaCharacters;
    if (filterAttribute !== 'all') chars = chars.filter((c) => c.attribute === filterAttribute);
    if (search.trim()) {
      const q = search.toLowerCase();
      chars = chars.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.nameEn.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.roleEn.toLowerCase().includes(q) ||
          c.id.includes(q)
      );
    }
    return chars;
  }, [filterAttribute, search]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: GAMES.sea.theme.primary }}>
        {t(locale, '船员对比', 'Crew Compare', '船員比較')}
      </h1>

      <p className="mb-4 text-sm text-game-text-muted">
        {t(
          locale,
          '先选两位船员，对比定位、船队、速度、强度理由和核心技能。',
          'Select two crew members to compare roles, fleet, speed, tier reason, and core skills.',
          '2人の船員を選び、役割、船隊、速度、評価理由、主要スキルを比較します。'
        )}
        {selecting === 1
          ? ` (${t(locale, '正在选第一位', 'Selecting 1st', '1人目を選択中')})`
          : ` (${t(locale, '正在选第二位', 'Selecting 2nd', '2人目を選択中')})`}
      </p>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-game-border bg-game-surface p-4 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, '搜索船员名 / 定位', 'Search crew or role', '船員名 / 役割で検索')}
          className="w-full rounded-lg border border-game-border bg-transparent px-3 py-2 text-sm text-game-text outline-none placeholder:text-game-text-muted"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterAttribute('all')}
            className={`rounded-full border px-3 py-1 text-xs ${filterAttribute === 'all' ? 'border-game-primary text-game-primary' : 'border-game-border text-game-text-muted'}`}
          >
            {t(locale, '全部属性', 'All Attributes', '全属性')}
          </button>
          {SEA_ATTRIBUTES.map((attribute) => (
            <button
              key={attribute}
              onClick={() => setFilterAttribute(attribute)}
              className={`rounded-full border px-3 py-1 text-xs ${filterAttribute === attribute ? 'border-game-primary text-game-primary' : 'border-game-border text-game-text-muted'}`}
            >
              {SEA_ATTRIBUTE_NAMES[attribute]?.[locale] ?? attribute}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => selectChar(c)}
            className={`group flex flex-col items-center gap-1 rounded-lg border p-2 transition-all hover:border-game-primary ${char1?.id === c.id || char2?.id === c.id ? 'border-game-primary bg-game-surface' : 'border-game-border'}`}
          >
            <CharacterAvatar src={getSeaCharacterImage(c)} alt={getSeaCharacterName(c, locale)} element={c.attribute} className="h-10 w-10 rounded object-cover" />
            <span className="text-center text-[10px] leading-tight text-game-text">{getSeaCharacterName(c, locale)}</span>
            <span className="text-[10px] text-game-text-muted">{locale === 'zh' ? c.role : c.roleEn}</span>
          </button>
        ))}
      </div>

      {char1 && char2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[char1, char2].map((ch) => (
            <div key={ch.id} className="rounded-xl border border-game-border bg-game-surface p-4">
              <div className="mb-4 flex items-start gap-3">
                <CharacterAvatar src={getSeaCharacterImage(ch)} alt={getSeaCharacterName(ch, locale)} element={ch.attribute} className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-game-text">{getSeaCharacterName(ch, locale)}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded px-2 py-0.5 text-white" style={{ backgroundColor: SEA_ATTRIBUTE_COLORS[ch.attribute] ?? '#6b7280' }}>
                      {SEA_ATTRIBUTE_NAMES[ch.attribute]?.[locale] ?? ch.attribute}
                    </span>
                    <span className="rounded border border-game-border px-2 py-0.5 text-game-text-muted">{locale === 'zh' ? ch.role : ch.roleEn}</span>
                    <span className="rounded border border-game-border px-2 py-0.5 text-game-text-muted">{ch.rarity === 5 ? t(locale, '黑券', 'Black Ticket', '黒券') : t(locale, '紫券', 'Purple Ticket', '紫券')}</span>
                    <span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-white" style={{ backgroundColor: TIER_COLORS[ch.tierRank] || '#6b7280' }}>{ch.tierRank}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p><span className="text-game-text-muted">{t(locale, '船队', 'Fleet', '船隊')}:</span> {locale === 'zh' ? ch.fleet : ch.fleetEn}</p>
                <p><span className="text-game-text-muted">{t(locale, '速度', 'Speed', '速度')}:</span> {ch.speed}</p>
                <p><span className="text-game-text-muted">{t(locale, '定位理由', 'Tier Reason', '評価理由')}:</span> {getSeaCharacterTierReason(ch, locale)}</p>
                <p><span className="text-game-text-muted">{t(locale, '角色简介', 'Overview', '概要')}:</span> {locale === 'zh' ? ch.description : ch.descriptionEn}</p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-game-border/70 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-game-primary">{locale === 'zh' ? ch.skills.signature.name : ch.skills.signature.nameEn}</h4>
                  <p className="text-sm text-game-text-muted">{locale === 'zh' ? ch.skills.signature.description : ch.skills.signature.descriptionEn}</p>
                </div>
                <div className="rounded-lg border border-game-border/70 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-game-primary">{locale === 'zh' ? ch.skills.personal.name : ch.skills.personal.nameEn}</h4>
                  <p className="text-sm text-game-text-muted">{locale === 'zh' ? ch.skills.personal.description : ch.skills.personal.descriptionEn}</p>
                </div>
                <div className="rounded-lg border border-game-border/70 p-3">
                  <h4 className="mb-1 text-sm font-semibold text-game-primary">{locale === 'zh' ? ch.skills.passive.name : ch.skills.passive.nameEn}</h4>
                  <p className="text-sm text-game-text-muted">{locale === 'zh' ? ch.skills.passive.description : ch.skills.passive.descriptionEn}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
