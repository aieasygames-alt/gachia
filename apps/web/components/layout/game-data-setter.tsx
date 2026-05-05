'use client';

import { useEffect } from 'react';

export function GameDataSetter({ gameId }: { gameId: string }) {
  useEffect(() => {
    document.documentElement.dataset.game = gameId;
  }, [gameId]);

  return null;
}
