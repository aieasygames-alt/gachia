'use client';



import { useState, useMemo, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';

import {
  guihuanCharacters,
  getGuihuanCharacterName,
  getGuihuanCharacterImage,
} from '@gachia/data/games/guihuan/characters';

import type { GuihuanCharacter } from '@gachia/data/games/guihuan/types';

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

// Element resonance data
const ELEMENT_RESONANCES: Record<string, { name: Record<string, string>; description: Record<string, string>; icon: string }> = {
  pyro2: {
    name: { zh: '热诚之火', en: 'Fervent Flames', ja: '熱誠の炎' },
    description: { zh: '冰元素附着的持续时间下降40%。攻击力提高25%。', en: 'Affected by Cryo for 40% less time. ATK increased by 25%.', ja: '氷元素付着時間-40%。攻撃力+25%。' },
    icon: '🔥',
  },
  hydro2: {
    name: { zh: '愈疗之水', en: 'Soothing Water', ja: '癒しの水' },
    description: { zh: '火元素附着的持续时间下降40%。受治疗加成提高20%。', en: 'Affected by Pyro for 40% less time. Incoming Healing Bonus increased by 20%.', ja: '炎元素付着時間-40%。受ける治療効果+20%。' },
    icon: '💧',
  },
  cryo2: {
    name: { zh: '粉碎之冰', en: 'Shattering Ice', ja: '砕氷' },
    description: { zh: '雷元素附着的持续时间下降40%。攻击附着冰元素或冻结状态下的敌人时，暴击率提高15%。', en: 'Affected by Electro for 40% less time. CRIT Rate against opponents Frozen or affected by Cryo increased by 15%.', ja: '雷元素付着時間-40%。氷元素付着/凍結状態の敵への会心率+15%。' },
    icon: '❄️',
  },
  electro2: {
    name: { zh: '激能之雷', en: 'High Voltage', ja: '高電圧' },
    description: { zh: '水元素附着的持续时间下降40%。超激蔓、超绽放、感电反应时，额外产生一个元素微粒。', en: 'Affected by Hydro for 40% less time. Superconduct, Hyperbloom, Electro-Charged generate 1 Elemental Particle.', ja: '水元素付着時間-40%。超伝導・ハイパーブルーム・感電反応時に元素粒子を1個追加生成。' },
    icon: '⚡',
  },
  anemo2: {
    name: { zh: '迅捷之风', en: 'Impetuous Winds', ja: '疾風' },
    description: { zh: '体力消耗降低15%。移动速度提升10%。技能冷却缩短5%。', en: 'Stamina Consumption decreased 15%. Movement SPD increased 10%. Skill CD decreased 5%.', ja: 'スタミナ消費-15%。移動速度+10%。スキルクールダウン-5%。' },
    icon: '🌪️',
  },
  geo2: {
    name: { zh: '坚定之岩', en: 'Enduring Rock', ja: '堅岩' },
    description: { zh: '护盾强效提升15%。角色处于护盾庇护下时，造成的伤害提升15%。', en: 'Shield Strength +15%. DMG dealt while protected by a shield increased by 15%.', ja: 'シールド強化+15%。シールド保護下での与ダメージ+15%。' },
    icon: '🪨',
  },
  dendro2: {
    name: { zh: '蔓生之草', en: 'Sprawling Greenery', ja: '蔓草' },
    description: { zh: '元素精通提升50。触发燃烧、绽放、超绽放反应后，队伍中附近的所有角色元素精通提升30，持续6秒。', en: 'Elemental Mastery +50. After triggering Burning, Bloom, Hyperbloom, nearby party members EM +30 for 6s.', ja: '元素熟知+50。燃焼・開花・ハイパーブルーム反応後、周囲のパーティメンバーの元素熟知+30（6秒間）。' },
    icon: '🌿',
  },
  quad: {
    name: { zh: '交错之护', en: 'Protective Canopy', ja: '交錯の護り' },
    description: { zh: '所有元素抗性提升15%，物理抗性提升15%。', en: 'All Elemental RES +15%, Physical RES +15%.', ja: '全元素耐性+15%、物理耐性+15%。' },
    icon: '🌈',
  },
};

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

function getTeamNextSteps(gameId: string, locale: SupportedLocale): NextStepLink[] {
  const titles = {
    characters: { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' },
    build: { zh: '看配装推荐', en: 'Open Build Recommender', ja: 'ビルドを見る' },
    guides: { zh: '看攻略专题', en: 'Open Guides', ja: '攻略を見る' },
  } as const;

  const descriptions = {
    characters: {
      zh: '先确认角色定位和技能，再回来搭队会更顺手。',
      en: 'Review roles and skills first, then come back and build teams faster.',
      ja: 'まず役割とスキルを確認すると編成しやすくなります。',
    },
    build: {
      zh: '如果你已经有主 C 或主坦，直接看配装会更快。',
      en: 'If your main carry or tank is already chosen, jump straight to builds.',
      ja: '主力が決まっているなら、ビルドから入るのが早いです。',
    },
    guides: {
      zh: '想看更完整的养成、站位和版本思路，可以继续往攻略页走。',
      en: 'For deeper setup, positioning, and patch notes, head to the guides hub.',
      ja: '育成、配置、更新方針まで見たいなら攻略ページへどうぞ。',
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
      href: `/${gameId}/guides`,
      title: titles.guides,
      description: descriptions.guides,
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

// --- Resonance calculator ---

function getResonances(team: ({ element: string } | null)[]) {
  const elements = team.filter(Boolean).map((c) => c!.element);
  const counts: Record<string, number> = {};
  for (const el of elements) counts[el] = (counts[el] || 0) + 1;

  const resKeys: string[] = [];
  const uniqueElements = new Set(elements);

  if (uniqueElements.size >= 4) {
    resKeys.push('quad');
  } else {
    for (const el of Object.keys(counts)) {
      if (counts[el]! >= 2) resKeys.push(`${el}2`);
    }
  }

  return resKeys;
}


// =====================================================================
// Guihun Teams
// =====================================================================

const GUIHUN_TEAM_ELEMENT_COLORS: Record<string, string> = {
  flame: '#ef4444', frost: '#67e8f9', thunder: '#8b5cf6',
  gale: '#6ee7b7', radiance: '#fbbf24', void: '#a855f7',
};


export function GuihuanTeams({ locale }: { locale: SupportedLocale }) {
  const teamsWithComps = guihuanCharacters.filter((c) => c.teamComps.length > 0);

  return (
    <div>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, `共 ${teamsWithComps.length} 位角色的推荐配队`, `${teamsWithComps.length} characters with recommended teams`, `${teamsWithComps.length}キャラのおすすめ編成`)}
      </p>

      <div className="space-y-4">
        {teamsWithComps.map((char) => (
          <div key={char.id} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <CharacterAvatar src={getGuihuanCharacterImage(char)} alt={getGuihuanCharacterName(char, locale)} element={char.element} className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <h3 className="font-semibold text-game-text">{getGuihuanCharacterName(char, locale)}</h3>
                <span className="text-xs rounded px-1" style={{ backgroundColor: GUIHUN_TEAM_ELEMENT_COLORS[char.element], color: '#fff' }}>
                  {char.elementEn}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {char.teamComps.map((team, i) => (
                <div key={i} className="rounded border border-game-border/50 bg-game-surface-alt p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-game-text">{locale === 'zh' ? team.name : team.nameEn}</span>
                  </div>
                  <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((memberId) => {
                      const member = guihuanCharacters.find((c) => c.id === memberId);
                      return member ? (
                        <span key={memberId} className="flex items-center gap-1 rounded bg-game-surface px-2 py-0.5 text-xs text-game-primary">
                          {getGuihuanCharacterName(member, locale)}
                        </span>
                      ) : (
                        <span key={memberId} className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
