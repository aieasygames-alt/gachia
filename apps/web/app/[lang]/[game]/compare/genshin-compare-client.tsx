'use client';



import { useState, useMemo, type ReactNode } from 'react';

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
} from '@gachia/data/games/genshin/weapons';

import {
  artifactSets,
  getArtifactSetName,
} from '@gachia/data/games/genshin/artifacts';

import type { GenshinCharacter, GenshinWeapon } from '@gachia/data/games/genshin/types';

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


// --- Resolver helpers ---

function resolveWeapon(build: { bestWeaponEn: string }): GenshinWeapon | null {
  return genshinWeapons.find((w) => w.nameEn.toLowerCase() === build.bestWeaponEn.toLowerCase()) ?? null;
}

function resolveArtifact(build: { bestArtifactSetEn: string }) {
  return artifactSets.find((s) => s.nameEn.toLowerCase() === build.bestArtifactSetEn.toLowerCase()) ?? null;
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
// Genshin Compare
// =====================================================================

export function GenshinCompare({ locale }: { locale: SupportedLocale }) {
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
