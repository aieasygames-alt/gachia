import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';

export async function generateStaticParams() {
  // Shared builds are dynamic - no static params
  return [];
}

export default async function SharedBuildPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (!GAMES[gameId]) {
    notFound();
  }

  // Fetch the shared build
  const baseUrl = process.env.BETTER_AUTH_URL || 'https://gachia.com';
  const res = await fetch(`${baseUrl}/api/shared-builds?id=${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    notFound();
  }

  const build = await res.json();

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-6 text-sm text-game-text-muted">
        <Link href={`/${gameId}`} className="hover:text-game-primary transition-colors">
          {GAMES[gameId].name[locale]}
        </Link>
        {' / '}
        <Link href={`/${gameId}/build`} className="hover:text-game-primary transition-colors">
          {locale === 'zh' ? '配装' : locale === 'ja' ? 'ビルド' : 'Build'}
        </Link>
        {' / '}
        <span className="text-game-text">{locale === 'zh' ? '共享配装' : 'Shared Build'}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold" style={{ color: GAMES[gameId].theme.primary }}>
        {locale === 'zh' ? '共享配装' : locale === 'ja' ? '共有ビルド' : 'Shared Build'}
      </h1>

      <div className="rounded-xl border border-game-border bg-game-surface p-6">
        <pre className="overflow-auto rounded-lg bg-game-surface-alt p-4 text-sm">
          {JSON.stringify(build, null, 2)}
        </pre>
      </div>
    </div>
  );
}
