import Link from 'next/link';
import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getZzzDriveDiscById, getZzzDriveDiscName, getZzzDriveDiscDesc2pc, getZzzDriveDiscDesc4pc, zzzDriveDiscs } from '@gachia/data/games/zzz/drive-discs';
import { getZzzCharacterName, getZzzCharacterById } from '@gachia/data/games/zzz/characters';
import { notFound } from 'next/navigation';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

const ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    zzzDriveDiscs.map((d) => ({ lang, game: 'zzz', id: d.id }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (gameId !== 'zzz') return {};

  const disc = getZzzDriveDiscById(id);
  if (!disc) return {};

  const name = getZzzDriveDiscName(disc, locale);
  const desc = getZzzDriveDiscDesc2pc(disc, locale);
  const gameName = GAMES.zzz.name[locale];
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/zzz/drive-discs/${id}`, LOCALES);

  const desc4pc = getZzzDriveDiscDesc4pc(disc, locale);
  const bestForNames = disc.bestFor.slice(0, 3).map(cid => {
    const c = getZzzCharacterById(cid);
    return c ? getZzzCharacterName(c, locale) : null;
  }).filter(Boolean).join(', ');

  return {
    title: `${name} — ${gameName} Drive Disc: 2pc & 4pc Set Bonus${bestForNames ? `, Best for ${bestForNames}` : ''}`,
    description: locale === 'zh'
      ? `${name}驱动盘：2件套${desc}；4件套${desc4pc}。${bestForNames ? `推荐角色：${bestForNames}。` : ''}查看全部属性与搭配建议。`.slice(0, 160)
      : `${name} ZZZ drive disc: 2pc — ${desc}. 4pc — ${desc4pc}.${bestForNames ? ` Best for ${bestForNames}.` : ''} Full stats and build guide.`.slice(0, 160),
    alternates,
  };
}

export default async function DriveDiscDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId !== 'zzz') {
    notFound();
  }

  const disc = getZzzDriveDiscById(id);
  if (!disc) {
    notFound();
  }

  const elementColor = disc.element ? ELEMENT_COLORS[disc.element] : undefined;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getZzzDriveDiscName(disc, locale)}
      </h1>

      {disc.element && (
        <div className="mb-4">
          <span className="rounded px-2 py-1 text-sm text-white" style={{ backgroundColor: elementColor || '#888' }}>
            {disc.element}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-4">
          <h3 className="mb-2 text-game-primary font-medium">2pc {locale === 'zh' ? '套装效果' : locale === 'ja' ? 'セット効果' : 'Set Bonus'}</h3>
          <p className="text-sm text-game-text-muted">{getZzzDriveDiscDesc2pc(disc, locale)}</p>
        </div>

        <div className="rounded-lg border border-game-border bg-game-surface p-4">
          <h3 className="mb-2 text-game-primary font-medium">4pc {locale === 'zh' ? '套装效果' : locale === 'ja' ? 'セット効果' : 'Set Bonus'}</h3>
          <p className="text-sm text-game-text-muted">{getZzzDriveDiscDesc4pc(disc, locale)}</p>
        </div>

        {disc.bestFor.length > 0 && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <h3 className="mb-2 text-game-primary font-medium">
              {locale === 'zh' ? '推荐角色' : locale === 'ja' ? 'おすすめキャラ' : 'Best For'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {disc.bestFor.map((charId) => {
                const char = getZzzCharacterById(charId);
                const charName = char ? getZzzCharacterName(char, locale) : charId;
                return char ? (
                  <Link key={charId} href={`/${locale}/zzz/characters/${charId}`}
                    className="rounded bg-game-surface-alt px-3 py-1 text-sm text-game-primary transition-colors hover:text-game-accent">
                    {charName}
                  </Link>
                ) : (
                  <span key={charId} className="rounded bg-game-surface-alt px-3 py-1 text-sm text-game-text-muted">
                    {charName}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameConfig.name[locale], item: `https://gachia.com/${locale}/zzz` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '驱动盘' : locale === 'ja' ? 'ドライブディスク' : 'Drive Discs', item: `https://gachia.com/${locale}/zzz/drive-discs` },
              { '@type': 'ListItem', position: 3, name: getZzzDriveDiscName(disc, locale) },
            ],
          }),
        }}
      />
    </div>
  );
}
