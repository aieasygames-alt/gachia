'use client';



import { useState, useMemo, useEffect, type ReactNode } from 'react';

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


export function NteBuildRecommender({ locale }: { locale: SupportedLocale }) {
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
