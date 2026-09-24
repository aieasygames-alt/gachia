'use client';



import { useState, useMemo, useEffect, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';
import { Link } from '@/lib/i18n/navigation';

import {
  zzzCharacters,
  getZzzCharacterName,
  getZzzCharacterImage,
} from '@gachia/data/games/zzz/characters';

import type { ZzzCharacter } from '@gachia/data/games/zzz/types';

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

// --- Endfield Constants ---

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
const ENDFIELD_PROFESSION_NAMES: Record<string, Record<string, string>> = {
  fighter: { zh: '战士', en: 'Fighter', ja: 'ファイター' },
  guardian: { zh: '守护', en: 'Guardian', ja: 'ガーディアン' },
  engineer: { zh: '工程师', en: 'Engineer', ja: 'エンジニア' },
  sniper: { zh: '狙击', en: 'Sniper', ja: 'スナイパー' },
  medic: { zh: '医疗', en: 'Medic', ja: 'メディック' },
  caster: { zh: '术师', en: 'Caster', ja: 'キャスター' },
  pioneer: { zh: '先锋', en: 'Pioneer', ja: 'パイオニア' },
  specialist: { zh: '特种', en: 'Specialist', ja: 'スペシャリスト' },
};




function BuildInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-game-text-muted">{label}</span>
      <p className="text-game-text">{value}</p>
    </div>
  );
}
export function ZzzBuildRecommender({ locale }: { locale: SupportedLocale }) {
  const [selectedChar, setSelectedChar] = useState<ZzzCharacter | null>(null);
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [progressionQueue, setProgressionQueue] = useState<string[]>([]);

  useEffect(() => {
    try { setProgressionQueue(JSON.parse(localStorage.getItem('gachia-zzz-progression-queue') ?? '[]')); } catch { /* local storage is optional */ }
  }, []);

  const filtered = useMemo(() => {
    if (elementFilter === 'all') return zzzCharacters;
    return zzzCharacters.filter((c) => c.attribute === elementFilter);
  }, [elementFilter]);
  const queuedAgents = progressionQueue
    .map((id) => zzzCharacters.find((character) => character.id === id))
    .filter((character): character is NonNullable<typeof character> => character !== undefined);

  return (
    <div>
      <section className="mb-6 border border-game-border bg-game-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-game-primary">{t(locale, '驱动盘决策规则', 'Drive Disc decision rules', 'ドライブディスク判断')}</p>
        <div className="mt-3 grid gap-4 text-sm leading-6 text-game-text-muted md:grid-cols-3">
          <p><strong className="text-game-text">{t(locale, '先看套装，再看盘位', 'Set before slot', 'セットを先に')}</strong><br />{t(locale, '先锁定角色的 4 件套或 2+2，再根据其定位选择 4/5/6 号位主属性。', 'Lock the 4-piece or 2+2 set first, then choose slots 4/5/6 by role.', '4セットまたは2+2を決めてから、役割で4/5/6番の主属性を選びます。')}</p>
          <p><strong className="text-game-text">{t(locale, '副词条只留有效项', 'Keep effective subs', '有効なサブだけ残す')}</strong><br />{t(locale, '双暴主 C 留双暴/攻击，异常位留异常精通/攻击，击破位优先冲击力；不合定位的多次强化通常不值得继续投。', 'Crit carries value CRIT/ATK, Anomaly values Mastery/ATK, and Stun values Impact. Repeated rolls outside role are usually not worth further investment.', '会心主力は会心/攻撃、異常は熟知/攻撃、撃破は衝撃力を優先。役割外への複数回強化は通常投資しません。')}</p>
          <p><strong className="text-game-text">{t(locale, '不要为了毕业词条停滞', 'Do not stall for perfect rolls', '理想厳選で止まらない')}</strong><br />{t(locale, '主词条正确、套装生效且有两条有效副词条时即可先升级；把资源优先给两队核心。', 'Upgrade once main stats and set are right with two useful subs; prioritize cores across two teams.', '主属性・セット・有効サブ2本が揃えば先に育成し、二編成の核を優先します。')}</p>
        </div>
      </section>
      {queuedAgents.length > 0 && <section className="mb-6 border border-game-border bg-game-surface p-4"><h2 className="text-sm font-semibold text-game-text">{t(locale, '从养成队列继续配装', 'Continue builds from progression queue', '育成キューからビルドを続ける')}</h2><p className="mt-1 text-xs text-game-text-muted">{t(locale, '先选择当前养成目标，再确认音擎、驱动盘和词条方向。', 'Pick your active progression target, then confirm W-Engine, Drive Disc, and stat direction.', '現在の育成目標を選び、Wエンジン、ディスク、ステータス方針を確認します。')}</p><div className="mt-3 flex flex-wrap gap-2">{queuedAgents.map((character) => <button key={character.id} type="button" onClick={() => setSelectedChar(character)} className={`border px-3 py-1.5 text-xs ${selectedChar?.id === character.id ? 'border-game-primary bg-game-primary/10 text-game-text' : 'border-game-border bg-game-surface-alt text-game-text-muted hover:border-game-primary'}`}>{getZzzCharacterName(character, locale)}</button>)}</div></section>}
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
              <div className="mt-4 flex flex-wrap gap-3 border-t border-game-border pt-3 text-sm"><Link href="/zzz/weapons" className="font-semibold text-game-primary hover:text-game-accent">{t(locale, '核对音擎替代方案', 'Check W-Engine alternatives', 'Wエンジン代替を確認')}</Link><Link href="/zzz/drive-discs" className="font-semibold text-game-primary hover:text-game-accent">{t(locale, '评估驱动盘词条', 'Evaluate Drive Disc stats', 'ディスク詞条を評価')}</Link></div>
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
