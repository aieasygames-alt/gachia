import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage, zzzCharacters, getZzzCharacterName, getZzzCharacterImage, getGameData } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

const BASE_URL = 'https://gachia.com';
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

  return {
    title: `${categoryLabel} - ${gameName}`,
    description: `${categoryLabel} - ${gameName} Wiki`,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/tier-list`, languages },
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
};

function ZzzTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = getGameData('zzz').tierLists.find(
    (tl) => tl.gameId === 'zzz' && tl.category === 'overall' && tl.locale === locale,
  ) ?? getGameData('zzz').tierLists.find(
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
