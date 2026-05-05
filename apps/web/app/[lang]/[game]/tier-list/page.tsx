import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage, genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
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
    return <GenshinTierListPage locale={locale} />;
  }

  if (gameId === 'nte') {
    return <NteTierListPage locale={locale} />;
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

// --- Genshin Tier List ---

function GenshinTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierGroups: Record<string, typeof genshinCharacters> = {};
  const tierOrder = ['SS', 'S', 'A+', 'A', 'B', 'C'];

  for (const char of genshinCharacters) {
    const tier = char.tierRank || 'B';
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(char);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.genshin.theme.primary }}>
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
                const imageUrl = getGenshinCharacterImage(char);
                return (
                  <Link key={char.id} href={`/genshin/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-game-text-muted">{char.nameEn.charAt(0)}</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getGenshinCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.weaponType}</span>
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
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-game-text-muted">{char.nameEn.charAt(0)}</div>
                      )}
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
