import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { genshinArtifactSets, getArtifactSetName, getArtifactSetDesc2pc, getArtifactSetDesc4pc, getArtifactSetById, getGenshinCharacterName, getGenshinCharacterById, starrailRelicSets, getStarRailRelicSetName, getStarRailRelicSetDesc2pc, getStarRailRelicSetDesc4pc, getStarRailCavernRelics as getCavernRelics, getStarRailPlanarOrnaments as getPlanarOrnaments, getStarRailCharacterById, getStarRailCharacterName, wuwaEchoSets, getWuWaEchoSetName, getWuWaEchoSetDesc2pc, getWuWaEchoSetDesc5pc, getWuWaCharacterById, getWuWaCharacterName } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

const RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale] ?? '';

  if (gameId === 'starrail') {
    const label = locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics';
    return {
      title: `${label} - ${gameName} Wiki`,
      description: locale === 'zh'
        ? `崩坏：星穹铁道全遗器图鉴，包含洞窟遗器和位面饰品的2件套/4件套效果及推荐角色`
        : locale === 'ja'
        ? `崩壊：スターレイル遺物図鑑、洞窟遺物と次元装飾の2セット/4セット効果とおすすめキャラ`
        : `Complete Honkai: Star Rail Relic guide with 2pc/4pc set bonuses and recommended characters`,
      alternates: {
        canonical: `https://gachia.com/${locale}/${gameId}/artifacts`,
        languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/artifacts`, en: `https://gachia.com/en/${gameId}/artifacts`, ja: `https://gachia.com/ja/${gameId}/artifacts`, 'x-default': `https://gachia.com/zh/${gameId}/artifacts` },
      },
    };
  }

  const label = CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts';
  return {
    title: `${label} - ${gameName} Wiki`,
    description: locale === 'zh'
      ? `原神圣遗物图鉴大全，包含${genshinArtifactSets.length}套圣遗物的2件套/4件套效果及推荐角色`
      : locale === 'ja'
      ? `原神聖遺物図鑑、${genshinArtifactSets.length}セットの2セット/4セット効果とおすすめキャラ`
      : `Complete Genshin Impact Artifact guide with ${genshinArtifactSets.length} sets, 2pc/4pc bonuses and recommended characters`,
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/artifacts`,
      languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/artifacts`, en: `https://gachia.com/en/${gameId}/artifacts`, ja: `https://gachia.com/ja/${gameId}/artifacts`, 'x-default': `https://gachia.com/zh/${gameId}/artifacts` },
    },
  };
}

export default async function ArtifactsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'starrail') {
    return <StarRailRelicsPage locale={locale} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaEchoSetsPage locale={locale} />;
  }

  if (gameId !== 'genshin') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const sets = genshinArtifactSets;
  const fiveStar = sets.filter((s) => s.rarity === 5);
  const fourStar = sets.filter((s) => s.rarity === 4);
  const threeStar = sets.filter((s) => s.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${sets.length} 套圣遗物` : locale === 'ja' ? `${sets.length} セット` : `${sets.length} Artifact Sets`}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              <span style={{ color: RARITY_COLORS[rarity] || '#888' }}>{rarity}★</span> ({list.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((set) => (
                <ArtifactSetCard key={set.id} set={set} locale={locale} gameId={gameId} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ArtifactSetCard({ set, locale, gameId }: { set: typeof genshinArtifactSets[number]; locale: SupportedLocale; gameId: string }) {
  return (
    <Link href={`/${gameId}/artifacts/${set.id}` as '/'} className="block rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary/50">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">{getArtifactSetName(set, locale)}</h3>
        <span className="text-xs font-bold" style={{ color: RARITY_COLORS[set.rarity] || '#888' }}>{set.rarity}★</span>
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getArtifactSetDesc2pc(set, locale)}</span></p>
        <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{getArtifactSetDesc4pc(set, locale)}</span></p>
      </div>
      {set.characters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {set.characters.slice(0, 8).map((charId) => {
            const char = getGenshinCharacterById(charId);
            return char ? (
              <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                {getGenshinCharacterName(char, locale)}
              </span>
            ) : null;
          })}
          {set.characters.length > 8 && <span className="text-xs text-game-text-muted">+{set.characters.length - 8}</span>}
        </div>
      )}
    </Link>
  );
}

// --- Star Rail Relics ---

function StarRailRelicsPage({ locale }: { locale: SupportedLocale }) {
  const cavernRelics = getCavernRelics();
  const planarOrnaments = getPlanarOrnaments();
  const relicLabel = locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics';
  const cavernLabel = locale === 'zh' ? '洞窟遗器' : locale === 'ja' ? '洞窟遺物' : 'Cavern Relics';
  const planarLabel = locale === 'zh' ? '位面饰品' : locale === 'ja' ? '次元装飾品' : 'Planar Ornaments';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.starrail.theme.primary }}>
        {relicLabel}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${starrailRelicSets.length} 套遗器` : locale === 'ja' ? `${starrailRelicSets.length} セット` : `${starrailRelicSets.length} Relic Sets`}
      </p>

      {cavernRelics.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-game-text">{cavernLabel} ({cavernRelics.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cavernRelics.map((set) => (
              <Link key={set.id} href={`/starrail/artifacts/${set.id}` as '/'} className="group rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary/50">
                <div className="mb-2">
                  <h3 className="font-semibold text-game-text group-hover:text-game-primary">{getStarRailRelicSetName(set, locale)}</h3>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getStarRailRelicSetDesc2pc(set, locale)}</span></p>
                  <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{getStarRailRelicSetDesc4pc(set, locale)}</span></p>
                </div>
                {set.bestFor.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {set.bestFor.slice(0, 8).map((charId) => {
                      const char = getStarRailCharacterById(charId);
                      return (
                        <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                          {char ? getStarRailCharacterName(char, locale) : charId}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {planarOrnaments.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-game-text">{planarLabel} ({planarOrnaments.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {planarOrnaments.map((set) => (
              <Link key={set.id} href={`/starrail/artifacts/${set.id}` as '/'} className="group rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary/50">
                <div className="mb-2">
                  <h3 className="font-semibold text-game-text group-hover:text-game-primary">{getStarRailRelicSetName(set, locale)}</h3>
                </div>
                <div className="text-sm">
                  <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getStarRailRelicSetDesc2pc(set, locale)}</span></p>
                </div>
                {set.bestFor.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {set.bestFor.slice(0, 8).map((charId) => {
                      const char = getStarRailCharacterById(charId);
                      return (
                        <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                          {char ? getStarRailCharacterName(char, locale) : charId}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// --- WuWa Echo Sets ---

function WuWaEchoSetsPage({ locale }: { locale: SupportedLocale }) {
  const echoLabel = locale === 'zh' ? '声骸合鸣' : locale === 'ja' ? 'ソナタ効果' : 'Echo Sets (Sonata Effects)';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {echoLabel}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${wuwaEchoSets.length} 套合鸣效果` : locale === 'ja' ? `${wuwaEchoSets.length} セット` : `${wuwaEchoSets.length} Echo Sets`}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {wuwaEchoSets.map((set) => (
          <div key={set.id} className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-2">
              <h3 className="font-semibold text-game-text">{getWuWaEchoSetName(set, locale)}</h3>
            </div>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getWuWaEchoSetDesc2pc(set, locale)}</span></p>
              {set.bonus5pc && (
                <p><span className="text-game-primary font-medium">5pc:</span> <span className="text-game-text-muted">{getWuWaEchoSetDesc5pc(set, locale)}</span></p>
              )}
            </div>
            {set.bestFor.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {set.bestFor.slice(0, 8).map((charId) => {
                  const char = getWuWaCharacterById(charId);
                  return (
                    <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                      {char ? getWuWaCharacterName(char, locale) : charId}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}