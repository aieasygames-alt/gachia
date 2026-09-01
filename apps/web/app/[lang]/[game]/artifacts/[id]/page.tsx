import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { getArtifactDetailData, getArtifactsForStaticParams } from '@/lib/game-data/artifacts';
import type { ArtifactDetailData } from '@/lib/game-data/artifacts';
import { ensureMetaLength } from '@/lib/seo-metadata';

const RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

const ARTIFACT_PIECE_NAMES = {
  zh: ['生之花', '死之羽', '时之沙', '空之杯', '理之冠'] as const,
  en: ['Flower of Life', 'Plume of Death', 'Sands of Eon', 'Goblet of Eonothem', 'Circlet of Logos'] as const,
  ja: ['生の花', '死の羽', '時の砂', '空の杯', '理の冠'] as const,
};

export async function generateStaticParams() {
  const gameIds: GameId[] = ['genshin', 'starrail'];
  const params = await Promise.all(gameIds.map(async (gameId) => {
    const sets = await getArtifactsForStaticParams(gameId);
    return LOCALES.flatMap((lang) => sets.map((set) => ({ lang, game: gameId, id: set.id })));
  }));
  return params.flat();
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
  const data = await getArtifactDetailData(gameId, id, locale);
  if (!data) return {};

  return {
    title: `${data.name} - ${gameName} Wiki`,
    description: buildArtifactDescription(data.name, data.bonus2pc, data.bestFor.map((char) => char.name), locale),
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/artifacts/${id}`,
      languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/artifacts/${id}`, en: `https://gachia.com/en/${gameId}/artifacts/${id}`, ja: `https://gachia.com/ja/${gameId}/artifacts/${id}`, 'x-default': `https://gachia.com/zh/${gameId}/artifacts/${id}` },
    },
  };
}

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const data = await getArtifactDetailData(gameId, id, locale);

  if (!data) notFound();

  return <ArtifactDetail data={data} locale={locale} />;
}

function ArtifactDetail({ data, locale }: { data: ArtifactDetailData; locale: SupportedLocale }) {
  const gameName = GAMES[data.gameId].name[locale];
  const artifactLabel = data.gameId === 'genshin'
    ? locale === 'zh' ? '圣遗物' : locale === 'ja' ? '聖遺物' : 'Artifacts'
    : locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics';

  return (
    <div>
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href={`/${data.gameId}` as '/'} className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href={`/${data.gameId}/artifacts` as '/'} className="hover:text-game-primary">
          {artifactLabel}
        </Link>
        <span>/</span>
        <span className="text-game-text">{data.name}</span>
      </nav>

      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-game-text">{data.name}</h1>
          {data.rarity && (
            <span className="text-sm font-bold" style={{ color: RARITY_COLORS[data.rarity] || '#888' }}>
              {data.rarity}★
            </span>
          )}
          {data.type && <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel(data.type, locale)}</span>}
        </div>
        {data.nameAlt && locale === 'zh' && (
          <p className="mt-1 text-sm text-game-text-muted">{nameEnLabel(locale)}: {data.nameAlt}</p>
        )}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '套装效果' : locale === 'ja' ? 'セット効果' : 'Set Bonuses'}
        </h2>
        <div className="space-y-3">
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">2{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{data.bonus2pc}</p>
          </div>
          {data.bonus4pc && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-1 text-sm font-medium text-game-primary">4{pcLabel(locale)}</div>
              <p className="text-sm text-game-text-muted">{data.bonus4pc}</p>
            </div>
          )}
        </div>
      </section>

      {data.gameId === 'genshin' && <ArtifactPieces locale={locale} />}
      {data.bestFor.length > 0 && <BestForSection data={data} locale={locale} />}
      {data.gameId === 'genshin' && data.characters.length > 0 && <AllCharactersSection data={data} locale={locale} />}
      <BreadcrumbJsonLd data={data} locale={locale} gameName={gameName} artifactLabel={artifactLabel} />
    </div>
  );
}

function ArtifactPieces({ locale }: { locale: SupportedLocale }) {
  const pieces = locale in ARTIFACT_PIECE_NAMES ? ARTIFACT_PIECE_NAMES[locale as keyof typeof ARTIFACT_PIECE_NAMES] : ARTIFACT_PIECE_NAMES.en;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {locale === 'zh' ? '圣遗物部件' : locale === 'ja' ? '聖遺物パーツ' : 'Artifact Pieces'}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {pieces.map((piece) => (
          <div key={piece} className="rounded-lg border border-game-border bg-game-surface p-3 text-center text-sm">
            <div className="text-xs text-game-text-muted">{piece}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BestForSection({ data, locale }: { data: ArtifactDetailData; locale: SupportedLocale }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {data.gameId === 'genshin'
          ? locale === 'zh' ? '最佳适配角色' : locale === 'ja' ? '最適キャラクター' : 'Best Characters'
          : locale === 'zh' ? '推荐角色' : locale === 'ja' ? 'おすすめキャラクター' : 'Recommended Characters'}
      </h2>
      <div className={data.gameId === 'genshin' ? 'grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-wrap gap-2'}>
        {data.bestFor.map((char) => (
          <Link
            key={char.id}
            href={char.href as '/'}
            className={data.gameId === 'genshin'
              ? 'flex items-center gap-3 rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary/50'
              : 'rounded bg-game-primary/20 px-3 py-1.5 text-sm font-medium text-game-primary transition-colors hover:bg-game-primary/30'}
          >
            <span className="font-medium text-game-text">{char.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AllCharactersSection({ data, locale }: { data: ArtifactDetailData; locale: SupportedLocale }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {locale === 'zh' ? '可使用角色' : locale === 'ja' ? '使用可能キャラクター' : 'All Characters'}
      </h2>
      <div className="flex flex-wrap gap-2">
        {data.characters.map((char) => (
          <Link
            key={char.id}
            href={char.href as '/'}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              char.isBest
                ? 'bg-game-primary/20 text-game-primary font-medium'
                : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'
            }`}
          >
            {char.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

function BreadcrumbJsonLd({ data, locale, gameName, artifactLabel }: { data: ArtifactDetailData; locale: SupportedLocale; gameName: string; artifactLabel: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/${data.gameId}` },
            { '@type': 'ListItem', position: 2, name: artifactLabel, item: `https://gachia.com/${locale}/${data.gameId}/artifacts` },
            { '@type': 'ListItem', position: 3, name: data.name },
          ],
        }),
      }}
    />
  );
}

function pcLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '件套' : locale === 'ja' ? 'セット' : '-Piece Set';
}

function nameEnLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '英文名' : locale === 'ja' ? '英語名' : 'English Name';
}

function typeLabel(type: string, locale: SupportedLocale) {
  if (type === 'cavern') return locale === 'zh' ? '洞窟遗器' : locale === 'ja' ? '洞窟遺物' : 'Cavern Relic';
  return locale === 'zh' ? '位面饰品' : locale === 'ja' ? '次元装飾品' : 'Planar Ornament';
}

function buildArtifactDescription(name: string, bonus2pc: string, bestForNames: string[], locale: SupportedLocale) {
  const parts = [name, bonus2pc];
  if (bestForNames.length > 0) {
    const label = locale === 'zh' ? '推荐' : locale === 'ja' ? 'おすすめ' : 'Best for';
    parts.push(`${label}: ${bestForNames.join(', ')}`);
  }
  return ensureMetaLength(parts.join('. '), locale);
}
