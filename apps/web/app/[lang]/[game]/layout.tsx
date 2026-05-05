import { notFound } from 'next/navigation';
import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GameNav } from '@/components/layout/game-nav';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { GameDataSetter } from '@/components/layout/game-data-setter';

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    Object.keys(GAMES).map((game) => ({
      lang,
      game,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return {};

  return {
    title: `${gameConfig.name[locale]} Wiki | Gachia`,
    description: `${gameConfig.name[locale]} 角色图鉴、武器数据、攻略百科 — Gachia`,
  };
}

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;

  if (!GAMES[gameId]) {
    notFound();
  }

  return (
    <>
      <GameDataSetter gameId={gameId} />
      <GameNav gameId={gameId} locale={lang as SupportedLocale} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs lang={lang} game={gameId} />
        {children}
      </div>
    </>
  );
}
