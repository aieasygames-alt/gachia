import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getZzzDriveDiscById, getZzzDriveDiscName, getZzzDriveDiscDesc2pc, getZzzDriveDiscDesc4pc, getZzzCharacterName } from '@gachia/data';
import { notFound } from 'next/navigation';

const ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
};

export function generateStaticParams() {
  return [
    { id: 'chaos-jazz' }, { id: 'polar-metal' }, { id: 'fanged-metal' },
    { id: 'shockstar-disco' }, { id: 'freedom-blues' }, { id: 'hormone-punk' },
    { id: 'woodpecker-electro' }, { id: 'swing-jazz' }, { id: 'soul-rock' },
    { id: 'inferno-metal' }, { id: 'thunder-metal' }, { id: 'puffer-electro' },
    { id: 'branch-blade-song' }, { id: 'chaotic-metal' }, { id: 'proto-punk' },
    { id: 'shadow-harmony' }, { id: 'astral-voice' }, { id: 'phaethon-melody' },
  ];
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
                const char = getZzzCharacterName as unknown as (id: string) => { name: string };
                return (
                  <span key={charId} className="rounded bg-game-surface-alt px-3 py-1 text-sm text-game-text-muted">
                    {charId}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
