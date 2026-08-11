import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getDb } from '@/lib/db';
import { sharedBuilds, eq } from '@gachia/db';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { getSharedBuildCharacters } from '@/lib/game-data/shared-builds';
import type { SharedBuildCharacterEntry } from '@/lib/game-data/shared-builds';

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

  const db = getDb();
  const builds = await db
    .select()
    .from(sharedBuilds)
    .where(eq(sharedBuilds.id, id))
    .limit(1);

  if (builds.length === 0) {
    notFound();
  }

  const build = builds[0] as { buildData: string | Record<string, unknown>; [key: string]: unknown };
  const gameConfig = GAMES[gameId];
  let buildData: Record<string, unknown> | null = null;
  try {
    buildData = typeof build.buildData === 'string' ? JSON.parse(build.buildData) : build.buildData;
  } catch {
    buildData = null;
  }

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

async function SharedTeamView({ gameId, locale, characterIds }: { gameId: GameId; locale: SupportedLocale; characterIds: string[] }) {
  const characters = await getSharedBuildCharacters(gameId, characterIds, locale);

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-game-border bg-game-surface p-6 text-center text-game-text-muted">
        {locale === 'zh' ? '不支持的游戏类型或角色不存在' : 'Unsupported game type or characters not found'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {characters.map((char) => (
        <SharedCharacterCard key={char.id} character={char} />
      ))}
    </div>
  );
}

function SharedCharacterCard({ character }: { character: SharedBuildCharacterEntry }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-game-border bg-game-surface p-4">
      <CharacterAvatar
        src={character.imageUrl}
        alt={character.imageAlt}
        element={character.element}
        className="h-20 w-20 rounded-xl object-cover ring-2 ring-game-primary/30"
      />
      <span className="mt-2 text-sm font-medium text-game-text">{character.name}</span>
      {character.rarity && (
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: GENSHIN_ELEMENT_COLORS[character.element] || '#888' }}
          >
            {character.element}
          </span>
          <span className="text-[10px] text-yellow-500">{character.rarity}★</span>
        </div>
      )}
    </div>
  );
}
