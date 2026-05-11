'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

interface FavoriteButtonProps {
  gameId: string;
  characterId: string;
}

export function FavoriteButton({ gameId, characterId }: FavoriteButtonProps) {
  const { data: session } = useSession();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/favorites?gameId=${gameId}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve([])))
      .then((favs) => {
        const list = favs as { characterId: string }[];
        setIsFav(list.some((f) => f.characterId === characterId));
      })
      .catch(() => {});
  }, [session, gameId, characterId]);

  if (!session) return null;

  async function toggle() {
    setLoading(true);
    try {
      if (isFav) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, characterId }),
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, characterId }),
        });
      }
      setIsFav(!isFav);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-game-border bg-game-surface px-3 py-1.5 text-sm transition-colors hover:border-game-primary disabled:opacity-50"
      style={{ color: isFav ? 'var(--game-primary)' : undefined }}
    >
      <svg
        className="h-4 w-4"
        fill={isFav ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {isFav ? '已收藏' : '收藏'}
    </button>
  );
}
