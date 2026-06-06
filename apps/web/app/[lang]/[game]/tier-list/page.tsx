import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data/games/nte/characters';
import { zzzCharacters, getZzzCharacterName, getZzzCharacterImage } from '@gachia/data/games/zzz/characters';
import { anantaCharacters, getAnantaCharacterName, getAnantaCharacterImage } from '@gachia/data/games/ananta/characters';
import { guihuanCharacters, getGuihuanCharacterName, getGuihuanCharacterImage } from '@gachia/data/games/guihuan/characters';
import { tierLists as zzzTierLists } from '@gachia/data/games/zzz';
import { tierLists as anantaTierLists } from '@gachia/data/games/ananta';
import { tierLists as guihuanTierLists } from '@gachia/data/games/guihuan';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

const BASE_URL = 'https://gachia.com';

const TIER_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神角色强度排行，包含深渊、大世界综合评级，SS/S/A/B分级', en: 'Genshin Impact character tier list with Abyss and overworld rankings, SS/S/A/B tiers', ja: '原神キャラクターTierリスト、深境螺旋・大世界総合評価' },
  starrail: { zh: '崩坏：星穹铁道角色强度排行，包含忘却之庭、虚构叙事综合评级', en: 'Honkai: Star Rail character tier list with Forgotten Hall and Pure Fiction rankings', ja: 'スターレイルキャラTierリスト、忘却の庭・虚構叙事総合評価' },
  wuwa: { zh: '鸣潮角色强度排行，包含全角色综合评级，SS/S/A/B分级', en: 'Wuthering Waves character tier list with overall rankings, SS/S/A/B tiers', ja: '鳴潮キャラTierリスト、全キャラ総合評価' },
  nte: { zh: '异环角色强度排行，包含SS/S+/A+/A/B分级', en: 'Neverness to Everness character tier list with SS/S+/A+/A/B rankings', ja: '異環キャラTierリスト、SS/S+/A+/A/B評価' },
  zzz: { zh: '绝区零代理人强度排行，包含SS/S/A/B分级', en: 'Zenless Zone Zero agent tier list with SS/S/A/B rankings', ja: 'ゼンレスゾーンゼロエージェントTierリスト、SS/S/A/B評価' },
  guihuan: { zh: '归环使灵强度排行，包含SS/S/A/B分级', en: 'Guihuan spirit tier list with SS/S/A/B rankings', ja: '帰環スピリットTierリスト、SS/S/A/B評価' },
  ananta: { zh: '无限大异能者强度排行，包含SS/S/A/B分级', en: 'Ananta esper tier list with SS/S/A/B rankings', ja: 'アナンタエスパーTierリスト、SS/S/A/B評価' },
};

import { GenshinTierListClient } from './genshin-tier-client';
import { StarRailTierListClient } from './starrail-tier-client';
import { WuWaTierListClient } from './wuwa-tier-client';

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SS: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30' },
  'S+': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  S: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30' },
  'A+': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/30' },
  A: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30' },
  B: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-500/30' },
  C: { bg: 'bg-gray-800/30', text: 'text-gray-500', border: 'border-gray-600/30' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List';
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/tier-list`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/tier-list`;

  const desc = TIER_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName} Wiki`;
  const title = locale === 'zh'
    ? `${gameName}角色强度排行 — SS/S/A/B分级 | 攻略`
    : locale === 'ja'
      ? `${gameName}キャラTierリスト — SS/S/A/B評価`
      : `${gameName} Character Tier List — SS/S/A/B Rankings`;

  return {
    title,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/tier-list`, languages },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/${locale}/${gameId}/tier-list`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.jpg`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function TierListPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    return <GenshinTierListClient locale={locale} />;
  }

  if (gameId === 'starrail') {
    return <StarRailTierListClient locale={locale} />;
  }

  if (gameId === 'nte') {
    return <NteTierListPage locale={locale} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaTierListClient locale={locale} />;
  }

  if (gameId === 'zzz') {
    return <ZzzTierListPage locale={locale} />;
  }

  if (gameId === 'ananta') {
    return <AnantaTierListPage locale={locale} />;
  }

  if (gameId === 'guihuan') {
    return <GuihuanTierListPage locale={locale} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">Coming Soon</div>
    </div>
  );
}

// --- NTE Tier List ---

function NteTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierGroups: Record<string, typeof nteCharacters> = {};
  const tierOrder = ['SS', 'S+', 'A+', 'A', 'B'];

  for (const char of nteCharacters) {
    const tier = char.tierRank || 'B';
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(char);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.nte.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const chars = tierGroups[tier];
        if (!chars || chars.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({chars.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {chars.map((char) => {
                const imageUrl = getNteCharacterImage(char);
                return (
                  <Link key={char.id} href={`/nte/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.attribute} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getNteCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: NTE_ELEMENT_COLORS[char.attribute] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- ZZZ Tier List ---

const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

const ANANTA_ELEMENT_COLORS: Record<string, string> = {
  chaos: '#8b5cf6', psyche: '#06b6d4', spark: '#f59e0b', surge: '#3b82f6', bloom: '#4ade80', void: '#ec4899',
};

function ZzzTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = zzzTierLists.find(
    (tl) => tl.gameId === 'zzz' && tl.category === 'overall' && tl.locale === locale,
  ) ?? zzzTierLists.find(
    (tl) => tl.gameId === 'zzz' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(zzzCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.zzz.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getZzzCharacterImage(char);
                return (
                  <Link key={char.id} href={`/zzz/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.attribute} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getZzzCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ZZZ_ELEMENT_COLORS[char.attribute] || '#888' }} />
                        <span>{char.specialtyEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ananta Tier List ---

function AnantaTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = anantaTierLists.find(
    (tl) => tl.gameId === 'ananta' && tl.category === 'overall' && tl.locale === locale,
  ) ?? anantaTierLists.find(
    (tl) => tl.gameId === 'ananta' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(anantaCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.ananta.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getAnantaCharacterImage(char);
                return (
                  <Link key={char.id} href={`/ananta/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getAnantaCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ANANTA_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Tier List ---

const GUIHUAN_ELEMENT_COLORS: Record<string, string> = {
  radiance: '#fbbf24', frost: '#67e8f9', flame: '#ef4444',
  void: '#a855f7', gale: '#6ee7b7', thunder: '#8b5cf6',
};

function GuihuanTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = guihuanTierLists.find(
    (tl) => tl.gameId === 'guihuan' && tl.category === 'overall' && tl.locale === locale,
  ) ?? guihuanTierLists.find(
    (tl) => tl.gameId === 'guihuan' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(guihuanCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.guihuan.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getGuihuanCharacterImage(char);
                return (
                  <Link key={char.id} href={`/guihuan/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getGuihuanCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GUIHUAN_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
