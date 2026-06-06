import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  artifactSets as genshinArtifactSets,
  getArtifactSetById,
  getArtifactSetName,
  getArtifactSetDesc2pc,
  getArtifactSetDesc4pc,
} from '@gachia/data/games/genshin/artifacts';
import {
  getGenshinCharacterById,
  getGenshinCharacterName,
} from '@gachia/data/games/genshin/characters';
import {
  relicSets,
  getRelicSetById as getStarRailRelicSetById,
  getRelicSetName as getStarRailRelicSetName,
  getRelicSetDesc2pc as getStarRailRelicSetDesc2pc,
  getRelicSetDesc4pc as getStarRailRelicSetDesc4pc,
} from '@gachia/data/games/starrail/relics';
import {
  getStarRailCharacterById,
  getStarRailCharacterName,
} from '@gachia/data/games/starrail/characters';
import { Link } from '@/lib/i18n/navigation';

const RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

const ARTIFACT_PIECE_NAMES = {
  zh: ['生之花', '死之羽', '时之沙', '空之杯', '理之冠'] as const,
  en: ['Flower of Life', 'Plume of Death', 'Sands of Eon', 'Goblet of Eonothem', 'Circlet of Logos'] as const,
  ja: ['生の花', '死の羽', '時の砂', '空の杯', '理の冠'] as const,
};

export async function generateStaticParams() {
  const genshinParams = LOCALES.flatMap((lang) =>
    genshinArtifactSets.map((set) => ({ lang, game: 'genshin', id: set.id }))
  );
  const starrailParams = LOCALES.flatMap((lang) =>
    relicSets.map((set) => ({ lang, game: 'starrail', id: set.id }))
  );
  return [...genshinParams, ...starrailParams];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale] ?? '';

  if (gameId === 'genshin') {
    const set = getArtifactSetById(id);
    if (!set) return {};
    const name = getArtifactSetName(set, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: buildArtifactDescription(name, getArtifactSetDesc2pc(set, locale), set.bestFor.map(cid => { const c = getGenshinCharacterById(cid); return c ? getGenshinCharacterName(c, locale) : null; }).filter((x): x is string => x !== null), locale),
      alternates: {
        canonical: `https://gachia.com/${locale}/${gameId}/artifacts/${id}`,
        languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/artifacts/${id}`, en: `https://gachia.com/en/${gameId}/artifacts/${id}`, ja: `https://gachia.com/ja/${gameId}/artifacts/${id}`, 'x-default': `https://gachia.com/zh/${gameId}/artifacts/${id}` },
      },
    };
  }

  if (gameId === 'starrail') {
    const set = getStarRailRelicSetById(id);
    if (!set) return {};
    const name = getStarRailRelicSetName(set, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: buildArtifactDescription(name, getStarRailRelicSetDesc2pc(set, locale), set.bestFor.map(cid => { const c = getStarRailCharacterById(cid); return c ? getStarRailCharacterName(c, locale) : null; }).filter((x): x is string => x !== null), locale),
      alternates: {
        canonical: `https://gachia.com/${locale}/${gameId}/artifacts/${id}`,
        languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/artifacts/${id}`, en: `https://gachia.com/en/${gameId}/artifacts/${id}`, ja: `https://gachia.com/ja/${gameId}/artifacts/${id}`, 'x-default': `https://gachia.com/zh/${gameId}/artifacts/${id}` },
      },
    };
  }

  return {};
}

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    const set = getArtifactSetById(id);
    if (!set) notFound();
    return <GenshinArtifactDetail set={set} locale={locale} />;
  }

  if (gameId === 'starrail') {
    const set = getStarRailRelicSetById(id);
    if (!set) notFound();
    return <StarRailRelicDetail set={set} locale={locale} />;
  }

  notFound();
}

// --- Genshin Artifact Detail ---

function GenshinArtifactDetail({
  set,
  locale,
}: {
  set: NonNullable<ReturnType<typeof getArtifactSetById>>;
  locale: SupportedLocale;
}) {
  const gameName = GAMES.genshin.name[locale];
  const name = getArtifactSetName(set, locale);
  const pieces = locale in ARTIFACT_PIECE_NAMES ? ARTIFACT_PIECE_NAMES[locale as keyof typeof ARTIFACT_PIECE_NAMES] : ARTIFACT_PIECE_NAMES.en;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/genshin" className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href="/genshin/artifacts" className="hover:text-game-primary">
          {locale === 'zh' ? '圣遗物' : locale === 'ja' ? '聖遺物' : 'Artifacts'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-game-text">{name}</h1>
          <span className="text-sm font-bold" style={{ color: RARITY_COLORS[set.rarity] || '#888' }}>
            {set.rarity}★
          </span>
        </div>
        <p className="mt-1 text-sm text-game-text-muted">
          {locale === 'zh' ? `${nameEnLabel(locale)}: ${set.nameEn}` : ''}
        </p>
      </div>

      {/* Set Bonuses */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '套装效果' : locale === 'ja' ? 'セット効果' : 'Set Bonuses'}
        </h2>
        <div className="space-y-3">
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">2{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{getArtifactSetDesc2pc(set, locale)}</p>
          </div>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">4{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{getArtifactSetDesc4pc(set, locale)}</p>
          </div>
        </div>
      </section>

      {/* Artifact Pieces */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '圣遗物部件' : locale === 'ja' ? '聖遺物パーツ' : 'Artifact Pieces'}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {pieces.map((piece, i) => (
            <div key={i} className="rounded-lg border border-game-border bg-game-surface p-3 text-center text-sm">
              <div className="text-xs text-game-text-muted">{piece}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Best For */}
      {set.bestFor.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '最佳适配角色' : locale === 'ja' ? '最適キャラクター' : 'Best Characters'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {set.bestFor.map((charId) => {
              const char = getGenshinCharacterById(charId);
              if (!char) return null;
              return (
                <Link
                  key={charId}
                  href={`/genshin/characters/${charId}` as '/'}
                  className="flex items-center gap-3 rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary/50"
                >
                  <span className="font-medium text-game-text">{getGenshinCharacterName(char, locale)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Other Characters */}
      {set.characters.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '可使用角色' : locale === 'ja' ? '使用可能キャラクター' : 'All Characters'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {set.characters.map((charId) => {
              const char = getGenshinCharacterById(charId);
              if (!char) return null;
              const isBest = set.bestFor.includes(charId);
              return (
                <Link
                  key={charId}
                  href={`/genshin/characters/${charId}` as '/'}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${
                    isBest
                      ? 'bg-game-primary/20 text-game-primary font-medium'
                      : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'
                  }`}
                >
                  {getGenshinCharacterName(char, locale)}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/genshin` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '圣遗物' : locale === 'ja' ? '聖遺物' : 'Artifacts', item: `https://gachia.com/${locale}/genshin/artifacts` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

// --- Star Rail Relic Detail ---

function StarRailRelicDetail({
  set,
  locale,
}: {
  set: NonNullable<ReturnType<typeof getStarRailRelicSetById>>;
  locale: SupportedLocale;
}) {
  const gameName = GAMES.starrail.name[locale];
  const name = getStarRailRelicSetName(set, locale);
  const typeLabel = set.type === 'cavern'
    ? (locale === 'zh' ? '洞窟遗器' : locale === 'ja' ? '洞窟遺物' : 'Cavern Relic')
    : (locale === 'zh' ? '位面饰品' : locale === 'ja' ? '次元装飾品' : 'Planar Ornament');

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/starrail" className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href="/starrail/artifacts" className="hover:text-game-primary">
          {locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-game-text">{name}</h1>
          <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
        </div>
      </div>

      {/* Set Bonuses */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '套装效果' : locale === 'ja' ? 'セット効果' : 'Set Bonuses'}
        </h2>
        <div className="space-y-3">
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">2{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{getStarRailRelicSetDesc2pc(set, locale)}</p>
          </div>
          {set.bonus4pc && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-1 text-sm font-medium text-game-primary">4{pcLabel(locale)}</div>
              <p className="text-sm text-game-text-muted">{getStarRailRelicSetDesc4pc(set, locale)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Best For */}
      {set.bestFor.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '推荐角色' : locale === 'ja' ? 'おすすめキャラクター' : 'Recommended Characters'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {set.bestFor.map((charId) => {
              const char = getStarRailCharacterById(charId);
              const charName = char ? getStarRailCharacterName(char, locale) : charId;
              return (
                <Link
                  key={charId}
                  href={`/starrail/characters/${charId}` as '/'}
                  className="rounded bg-game-primary/20 px-3 py-1.5 text-sm font-medium text-game-primary transition-colors hover:bg-game-primary/30"
                >
                  {charName}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/starrail` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics', item: `https://gachia.com/${locale}/starrail/artifacts` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

// --- Helpers ---

function pcLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '件套' : locale === 'ja' ? 'セット' : '-Piece Set';
}

function nameEnLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '英文名' : locale === 'ja' ? '英語名' : 'English Name';
}

function buildArtifactDescription(name: string, bonus2pc: string, bestForNames: string[], locale: SupportedLocale) {
  const parts = [name, bonus2pc];
  if (bestForNames.length > 0) {
    const label = locale === 'zh' ? '推荐' : locale === 'ja' ? 'おすすめ' : 'Best for';
    parts.push(`${label}: ${bestForNames.join(', ')}`);
  }
  return parts.join('. ').slice(0, 160);
}
