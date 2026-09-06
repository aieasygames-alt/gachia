import type { GameId } from '@gachia/core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type DataManifest = {
  version: number;
  games: Partial<Record<GameId, { characters?: string[] }>>;
};

let manifestPromise: Promise<DataManifest> | undefined;

async function loadManifest(): Promise<DataManifest> {
  const cloudflareContext = (globalThis as Record<symbol, unknown>)[Symbol.for('__cloudflare-context__')];
  if (process.env.NODE_ENV !== 'production' || !cloudflareContext) {
    const file = join(process.cwd(), 'public/data-manifest/games.json');
    return JSON.parse(await readFile(file, 'utf8')) as DataManifest;
  }
  if (!manifestPromise) {
    manifestPromise = fetch('https://assets.internal/data-manifest/games.json').then(async (response) => {
      if (!response.ok) throw new Error(`Failed to load data manifest: ${response.status}`);
      return response.json() as Promise<DataManifest>;
    });
  }
  return manifestPromise;
}

export async function getCharacterIdsFromManifest(gameId: GameId): Promise<Array<{ id: string }>> {
  const manifest = await loadManifest();
  return (manifest.games[gameId]?.characters ?? []).map((id) => ({ id }));
}
