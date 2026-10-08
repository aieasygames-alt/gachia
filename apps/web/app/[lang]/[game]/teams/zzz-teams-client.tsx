'use client';



import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { GAMES } from '@gachia/core';

import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';
import { Link } from '@/lib/i18n/navigation';

import {
  zzzCharacters,
  getZzzCharacterName,
  getZzzCharacterImage,
  getZzzCharacterById,
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
// Coming Soon
// =====================================================================

// =====================================================================
// ZZZ Teams
// =====================================================================

const ZZZ_TEAM_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#a855f7',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};


export function ZzzTeams({ locale }: { locale: SupportedLocale }) {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const teamsWithComps = zzzCharacters.filter((c) => c.teamComps.length > 0);
  useEffect(() => {
    try { setOwned(new Set(JSON.parse(localStorage.getItem('gachia-zzz-owned-agents') ?? '[]'))); } catch { /* no stored roster */ }
  }, []);
  const toggleOwned = (id: string) => {
    setOwned((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('gachia-zzz-owned-agents', JSON.stringify([...next])); } catch { /* storage may be unavailable */ }
      return next;
    });
  };
  const teamRows = useMemo(() => teamsWithComps.flatMap((char) => char.teamComps.map((team) => ({ char, team, missing: team.members.filter((id) => !owned.has(id)) }))), [owned, teamsWithComps]);
  const displayedRows = showOwnedOnly ? teamRows.filter((row) => row.missing.length === 0) : teamRows;
  const rosterGapIds = useMemo(() => [...new Set(teamRows.flatMap((row) => row.missing))], [teamRows]);
  useEffect(() => {
    try { localStorage.setItem('gachia-zzz-roster-gaps', JSON.stringify(rosterGapIds)); } catch { /* local storage is optional */ }
  }, [rosterGapIds]);
  const zzzIntentLinks = [
    {
      href: '/zzz/guides/team-building-guide',
      title: t(locale, '配队基础指南', 'Team Building Guide', '編成基礎ガイド'),
      description: t(locale, '先理解强攻、击破、异常、支援和防护位怎么组合。', 'Start with Attack, Stun, Anomaly, Support, and Defense role logic.', '強攻、撃破、異常、支援、防護の組み方を確認。'),
    },
    {
      href: '/zzz/guides/v3-3-special-program-prep-guide',
      title: t(locale, '3.3 节目准备清单', 'v3.3 Program Checklist', 'v3.3番組準備リスト'),
      description: t(locale, '节目日前记录两队缺位；节目后只按官方角色和卡池更新配队。', 'Record two-team gaps before the program; update teams only from official post-program agents and banners.', '番組前に二編成の不足を記録し、番組後は公式キャラとバナーのみで編成を更新。'),
    },
    {
      href: '/zzz/guides/banner-schedule-guide',
      title: t(locale, '按卡池决定养谁', 'Plan Around Banners', 'バナーから育成判断'),
      description: t(locale, '先确认官方卡池、阶段时间与菲林预算，再决定是否抽取。', 'Verify official banners, phase timing, and Polychrome budget before pulling.', '公式バナー、期間、ポリクローム予算を確認してから引くか決める。'),
    },
  ];

  return (
    <div>
      <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-game-primary">
          {t(locale, 'ZZZ 配队入口', 'ZZZ Team Builder', 'ZZZ 編成入口')}
        </p>
        <h1 className="mb-2 text-2xl font-bold text-game-text">
          {t(locale, '绝区零最佳队伍与代理人搭配', 'Best ZZZ Teams and Agent Comps', 'ZZZ おすすめチームとエージェント編成')}
        </h1>
        <p className="mb-4 text-sm leading-relaxed text-game-text-muted">
          {t(
            locale,
            '用这个页面快速查看 ZZZ team builder、最佳队伍、代理人协同和当前版本配队。先确定主输出或异常核心，再补击破、支援、防护和邦布需求。',
            'Use this ZZZ team builder hub to compare best teams, agent comps, synergy, and current-version lineups. Pick your main DPS or Anomaly core first, then add Stun, Support, Defense, and Bangboo needs.',
            'このページでZZZのおすすめチーム、エージェント相性、現在版本の編成を確認。主力DPSまたは異常コアを決めてから撃破、支援、防護、ボンプを補います。'
          )}
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {zzzIntentLinks.map((link) => (
            <a key={link.href} href={`/${locale}${link.href}`} className="rounded-md border border-game-border bg-game-surface-alt p-3 transition-colors hover:border-game-primary">
              <span className="mb-1 block text-sm font-semibold text-game-text">{link.title}</span>
              <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description}</span>
            </a>
          ))}
        </div>
      </section>
      <section className="mb-6 border border-game-border bg-game-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-game-text">{t(locale, '我的角色池', 'My roster', '自分の手持ち')}</h2><p className="mt-1 text-xs text-game-text-muted">{t(locale, '选择已拥有的代理人，本机保存；用于筛出可以直接组出的推荐队。', 'Select agents you own. Saved on this device and used to surface teams you can build now.', '所持エージェントを選択すると、この端末に保存して今組める編成を絞り込みます。')}</p></div>
          <button type="button" onClick={() => setShowOwnedOnly((current) => !current)} className={`border px-3 py-2 text-sm ${showOwnedOnly ? 'border-game-primary bg-game-primary/10 text-game-primary' : 'border-game-border text-game-text-muted hover:border-game-primary'}`}>{showOwnedOnly ? t(locale, '显示全部推荐', 'Show all teams', 'すべて表示') : t(locale, '只看可直接组队', 'Only buildable teams', '今組める編成だけ')}</button>
        </div>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">{zzzCharacters.map((character) => <button key={character.id} type="button" onClick={() => toggleOwned(character.id)} className={`flex items-center gap-1.5 border px-2 py-1.5 text-xs ${owned.has(character.id) ? 'border-game-primary bg-game-primary/10 text-game-text' : 'border-game-border bg-game-surface-alt text-game-text-muted'}`}><CharacterAvatar src={getZzzCharacterImage(character)} alt="" element={character.attribute} className="h-5 w-5 object-cover" />{getZzzCharacterName(character, locale)}</button>)}</div>
        <p className="mt-3 text-xs text-game-text-muted">{t(locale, `已选 ${owned.size} 位代理人；${teamRows.filter((row) => row.missing.length === 0).length} 支推荐队可以直接组出。`, `${owned.size} agents selected; ${teamRows.filter((row) => row.missing.length === 0).length} recommended teams are buildable now.`, `${owned.size}人選択中。${teamRows.filter((row) => row.missing.length === 0).length}編成を今組めます。`)}</p>
        {rosterGapIds.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-game-border pt-3"><span className="text-xs text-game-text-muted">{t(locale, '候选补位已同步到抽卡规划器：', 'Roster-gap candidates are synced to Pull Planner:', '不足候補をガチャ計画へ同期しました:')}</span>{rosterGapIds.slice(0, 5).map((id) => { const character = getZzzCharacterById(id); return character ? <span key={id} className="border border-game-border bg-game-surface-alt px-2 py-1 text-xs text-game-primary">{getZzzCharacterName(character, locale)}</span> : null; })}<Link href="/zzz/gacha" className="text-xs font-semibold text-game-primary hover:text-game-accent">{t(locale, '规划抽卡 →', 'Plan pulls →', 'ガチャを計画 →')}</Link></div>}
      </section>

      <div className="space-y-4">
        {displayedRows.map(({ char, team, missing }) => (
          <div key={`${char.id}-${team.nameEn}`} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex items-center gap-3">
              <CharacterAvatar src={getZzzCharacterImage(char)} alt={getZzzCharacterName(char, locale)} element={char.attribute} className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <h3 className="font-semibold text-game-text">{getZzzCharacterName(char, locale)}</h3>
                <span className="text-xs rounded px-1" style={{ backgroundColor: ZZZ_TEAM_ELEMENT_COLORS[char.attribute], color: '#fff' }}>{char.attribute}</span>
              </div>
            </div>
            <div className="space-y-3">
                <div className="rounded border border-game-border/50 bg-game-surface-alt p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-game-text">{locale === 'zh' ? team.name : team.nameEn}</span>
                  </div>
                  <p className="mb-2 text-xs text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((memberId) => {
                      const member = getZzzCharacterById(memberId);
                      return member ? (
                        <span key={memberId} className={`flex items-center gap-1 rounded bg-game-surface px-2 py-0.5 text-xs ${owned.has(memberId) ? 'text-emerald-400' : 'text-game-primary'}`}>
                          {getZzzCharacterName(member, locale)}
                        </span>
                      ) : (
                        <span key={memberId} className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                      );
                    })}
                  </div>
                  <p className={`mt-3 text-xs ${missing.length ? 'text-amber-300' : 'text-emerald-400'}`}>{missing.length ? t(locale, `还缺：${missing.map((id) => getZzzCharacterName(getZzzCharacterById(id)!, locale)).join('、')}`, `Missing: ${missing.map((id) => getZzzCharacterName(getZzzCharacterById(id)!, locale)).join(', ')}`, `不足：${missing.map((id) => getZzzCharacterName(getZzzCharacterById(id)!, locale)).join('、')}`) : t(locale, '角色齐全，可直接按此队伍继续看配装。', 'Roster complete. Open builds for the next step.', '手持ちが揃っています。次はビルドを確認。')}</p>
                </div>
            </div>
          </div>
        ))}
        {displayedRows.length === 0 && <div className="border border-dashed border-game-border p-6 text-sm text-game-text-muted">{t(locale, '当前角色池还没有完整匹配的推荐队。可关闭筛选查看缺失位。', 'No listed team matches your roster yet. Turn off the filter to see missing slots.', '手持ちだけで組める掲載編成はまだありません。フィルターを外して不足枠を確認してください。')}</div>}
      </div>
    </div>
  );
}
