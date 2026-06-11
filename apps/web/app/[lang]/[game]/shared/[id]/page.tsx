import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage } from '@gachia/data/games/genshin/characters';
import { starrailCharacters, getStarRailCharacterName, getStarRailCharacterImage } from '@gachia/data/games/starrail/characters';
import { wuwaCharacters, getWuWaCharacterName, getWuWaCharacterImage } from '@gachia/data/games/wuwa/characters';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data/games/nte/characters';
import { zzzCharacters, getZzzCharacterName, getZzzCharacterImage } from '@gachia/data/games/zzz/characters';
import { guihuanCharacters, getGuihuanCharacterName, getGuihuanCharacterImage } from '@gachia/data/games/guihuan/characters';
import { seaCharacters, getSeaCharacterName, getSeaCharacterImage } from '@gachia/data/games/sea/characters';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};

export async function generateStaticParams() {
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

  const baseUrl = process.env.BETTER_AUTH_URL || 'https://gachia.com';
  const res = await fetch(`${baseUrl}/api/shared-builds?id=${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    notFound();
  }

  const build = await res.json() as { buildData: string | Record<string, unknown>; [key: string]: unknown };
  const gameConfig = GAMES[gameId];
  const buildData = typeof build.buildData === 'string' ? JSON.parse(build.buildData) : build.buildData;

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-6 text-sm text-game-text-muted">
        <Link href={`/${gameId}`} className="hover:text-game-primary transition-colors">
          {gameConfig.name[locale]}
        </Link>
        {' / '}
        <Link href={`/${gameId}/teams`} className="hover:text-game-primary transition-colors">
          {locale === 'zh' ? '配队' : locale === 'ja' ? 'パーティ編成' : 'Teams'}
        </Link>
        {' / '}
        <span className="text-game-text">{locale === 'zh' ? '共享队伍' : locale === 'ja' ? '共有パーティ' : 'Shared Team'}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '共享队伍' : locale === 'ja' ? '共有パーティ' : 'Shared Team'}
      </h1>

      {buildData?.type === 'team' && Array.isArray(buildData.characters) ? (
        <SharedTeamView gameId={gameId} locale={locale} characterIds={buildData.characters} />
      ) : (
        <div className="rounded-xl border border-game-border bg-game-surface p-6">
          <pre className="overflow-auto rounded-lg bg-game-surface-alt p-4 text-sm">
            {JSON.stringify(build, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SharedTeamView({ gameId, locale, characterIds }: { gameId: GameId; locale: SupportedLocale; characterIds: string[] }) {
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = genshinCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getGenshinCharacterImage(char)} alt={char.nameEn} element={char.element}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getGenshinCharacterName(char, locale)}</span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[char.element] || '#888' }}>
                  {char.element}
                </span>
                <span className="text-[10px] text-yellow-500">{char.rarity}★</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (gameId === 'starrail') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = starrailCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getStarRailCharacterImage(char)} alt={char.nameEn} element={char.element}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getStarRailCharacterName(char, locale)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (gameId === 'wuwa') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = wuwaCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getWuWaCharacterImage(char)} alt={char.nameEn} element={char.element}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getWuWaCharacterName(char, locale)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (gameId === 'nte') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = nteCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getNteCharacterImage(char)} alt={char.nameEn} element={char.attribute}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getNteCharacterName(char, locale)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (gameId === 'zzz') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = zzzCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getZzzCharacterImage(char)} alt={char.nameEn} element={char.attribute}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getZzzCharacterName(char, locale)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (gameId === 'guihuan') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = guihuanCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getGuihuanCharacterImage(char)} alt={char.nameEn} element={char.element}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getGuihuanCharacterName(char, locale)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (gameId === 'sea') {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {characterIds.map((id) => {
          const char = seaCharacters.find((c) => c.id === id);
          if (!char) return null;
          return (
            <div key={id} className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
              <CharacterAvatar src={getSeaCharacterImage(char)} alt={char.nameEn} element={char.attribute}
                className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30" />
              <span className="mt-2 text-sm font-medium text-game-text">{getSeaCharacterName(char, locale)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-game-border bg-game-surface p-6 text-center text-game-text-muted">
      {locale === 'zh' ? '不支持的游戏类型' : 'Unsupported game type'}
    </div>
  );
}
